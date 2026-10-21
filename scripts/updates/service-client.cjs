const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {loadCatalog}=require('../catalog.cjs');
const ROOT=path.join(__dirname,'../..');
const base=(process.env.UPDATE_ADMIN_API_URL||'').replace(/\/$/,'');
const secret=process.env.UPDATE_INTERNAL_HMAC_SECRET||'';
async function call(method,pathname,value){
 if(!base||!secret)throw new Error('缺少 UPDATE_ADMIN_API_URL 或 UPDATE_INTERNAL_HMAC_SECRET；服务端未配置时不能声称完成定时采集。');
 const body=value===undefined?'':JSON.stringify(value),timestamp=String(Date.now()),requestId=crypto.randomUUID(),bodyHash=crypto.createHash('sha256').update(body).digest('hex'),signature=crypto.createHmac('sha256',secret).update(`${timestamp}.${requestId}.${bodyHash}`).digest('hex');
 const response=await fetch(`${base}${pathname}`,{method,headers:{'content-type':'application/json','x-commddl-timestamp':timestamp,'x-commddl-request-id':requestId,'x-commddl-signature':signature},body:body||undefined});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`${data.error||response.status}: ${data.detail||'服务请求失败'}`);return data;
}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(key=>!['fetchedAt','sourceHash','extractorVersion','etag','lastModified'].includes(key)).sort().map(key=>[key,stable(value[key])]));return value;}
function writeOutput(values){if(!process.env.GITHUB_OUTPUT)return;const file=process.env.GITHUB_OUTPUT;for(const [key,value] of Object.entries(values))fs.appendFileSync(file,`${key}=${String(value??'').replace(/[\r\n]/g,' ')}\n`);}
async function notifySavedBatch(id,version,notify=call){try{const result=await notify('POST',`/internal/update-batches/${encodeURIComponent(id)}/notify`,{});const complete=Boolean(result.complete);if(!complete)console.warn(`候选已保存：${id} v${version}；邮件通知未完成（${result.sent||0}/${result.recipients||0}），请稍后在后台重试。`);return {complete,result};}catch(error){console.warn(`候选已保存：${id} v${version}；邮件通知请求失败（${error.message}），候选仍可在后台审阅并可重试通知。`);return {complete:false,error:error.message};}}
async function submitCandidate(candidate,{callFn=call,log=console.log,warn=console.warn}={}){
 if(!Array.isArray(candidate.items))throw new Error('采集候选必须包含 items 数组。');
 await callFn('POST','/internal/sources/snapshots',{items:candidate.items});
 const changes=candidate.items.filter(item=>item.changes?.length||item.sourceChanges?.length||item.failures?.length);
 if(!changes.length){log('本批没有实质变化；仅更新采集基线，不创建候选，也不发送邮件。');return {stored:false,notificationStatus:'not-needed'};}
 const contentHash=crypto.createHash('sha256').update(JSON.stringify(stable(changes))).digest('hex'),id=`updates-${new Date().toISOString().slice(0,10)}-${contentHash.slice(0,10)}`;const batch={...candidate,id,contentHash,items:changes};const stored=await callFn('POST','/internal/update-batches',batch);
 if(stored.duplicate){const result={stored:false,duplicate:true,id:stored.id||id,version:stored.version||1,notificationStatus:stored.notification_status||'unchanged'};writeOutput({batch_id:result.id,batch_version:result.version,batch_status:stored.status,notification_status:result.notificationStatus});log(`内容重复，未创建新候选：${result.id} v${result.version}。`);return result;}
 const batchId=stored.id||id,version=stored.version||1,notification=await notifySavedBatch(batchId,version,callFn);const notificationStatus=notification.complete?'complete':'incomplete';writeOutput({batch_id:batchId,batch_version:version,batch_status:stored.status||'awaiting-review',notification_status:notificationStatus});
 const message=`候选已保存：${batchId} v${version}，包含 ${changes.length} 个实体；通知状态：${notificationStatus==='complete'?'已发送':'未完成（可重试）'}。`;
 log(message);if(!notification.complete)warn(`::warning::${message}`);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n- ${message}\n`);
 return {stored:true,id:batchId,version,notificationStatus,notificationError:notification.error||null};
}
async function restructureBatch(id,expectedVersion,candidate,{callFn=call}={}){
 if(!id||!Number.isInteger(Number(expectedVersion))||!Array.isArray(candidate.items))throw new Error('重新结构化需要批次 ID、预期版本及 items 数组。');
 const result=await callFn('POST',`/internal/update-batches/${encodeURIComponent(id)}/restructured`,{expectedVersion:Number(expectedVersion),candidate});
 const notification=await notifySavedBatch(id,result.version||Number(expectedVersion)+1,callFn),status=notification.complete?'complete':'incomplete';
 writeOutput({batch_id:id,batch_version:result.version,batch_status:result.status||'awaiting-review',notification_status:status});
 const message=`原批次已创建审计版本：${id} v${result.version}；邮件通知：${status==='complete'?'已发送':'未完成（可重试）'}。`;
 console.log(message);if(!notification.complete)console.warn(`::warning::${message}`);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n- ${message}\n`);
 return result;
}
async function main(){const [command,...args]=process.argv.slice(2),data=loadCatalog(ROOT),inventory=[...data.venues,...data.calls].map(item=>({id:item.id}));
 if(command==='register-sources'){const result=await call('POST','/internal/sources',{sources:inventory});console.log(`已注册 ${result.registered} 个维护实体。`);return;}
 if(command==='get-due'){const out=args[args.indexOf('--output')+1];const result=await call('GET','/internal/sources/due?limit=20');if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),JSON.stringify(result,null,2)+'\n');}if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`ids=${result.ids.join(',')}\ncount=${result.ids.length}\n`);console.log(JSON.stringify({count:result.ids.length,ids:result.ids}));return;}
 if(command==='get-failed'){const out=args[args.indexOf('--output')+1];if(!out)throw new Error('get-failed 需要 --output <file>。');const result=await call('GET','/internal/sources/due?failed=1&limit=20');fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({count:result.ids.length,ids:result.ids}));return;}
 if(command==='get-baselines'){const ids=(args[args.indexOf('--ids')+1]||'').split(',').filter(Boolean),out=args[args.indexOf('--output')+1];if(!ids.length||!out)throw new Error('get-baselines 需要 --ids <id,...> --output <file>。');const result=await call('GET',`/internal/sources/baselines?ids=${encodeURIComponent(ids.join(','))}`);fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),JSON.stringify(result,null,2)+'\n');return;}
 if(command==='export-batch'){const id=args[args.indexOf('--id')+1],dir=args[args.indexOf('--directory')+1];if(!id||!dir)throw new Error('export-batch 需要 --id <batch> --directory <dir>。');const batch=await call('GET',`/internal/update-batches/${encodeURIComponent(id)}`);fs.mkdirSync(path.resolve(dir),{recursive:true});fs.writeFileSync(path.join(path.resolve(dir),'candidate.json'),JSON.stringify(batch.payload,null,2)+'\n');fs.writeFileSync(path.join(path.resolve(dir),'decisions.json'),JSON.stringify(batch.decisions,null,2)+'\n');fs.writeFileSync(path.join(path.resolve(dir),'metadata.json'),JSON.stringify({id:batch.id,version:batch.version,status:batch.status,notificationStatus:batch.notification_status,prNumber:batch.pr_number,prUrl:batch.pr_url,finalSha:batch.final_sha,baseSha:batch.base_sha},null,2)+'\n');return;}
 if(command==='record-pr'){const id=args[args.indexOf('--id')+1],version=Number(args[args.indexOf('--version')+1]),prNumber=Number(args[args.indexOf('--pr-number')+1]),prUrl=args[args.indexOf('--pr-url')+1],finalSha=args[args.indexOf('--final-sha')+1];if(!id||!version||!prNumber||!prUrl||!finalSha)throw new Error('record-pr 需要 --id、--version、--pr-number、--pr-url 和 --final-sha。');const result=await call('POST',`/internal/update-batches/${encodeURIComponent(id)}/pr`,{version,prNumber,prUrl,finalSha});console.log(JSON.stringify(result));return;}
 if(command==='fail-batch'){const id=args[args.indexOf('--id')+1],reason=args[args.indexOf('--reason')+1]||'workflow-failed';if(!id)throw new Error('fail-batch 需要 --id <batch>。');const result=await call('POST',`/internal/update-batches/${encodeURIComponent(id)}/failed`,{reason});console.log(JSON.stringify(result));return;}
 if(command==='mark-deployed'){const deployedSha=args[args.indexOf('--sha')+1],resultName=args[args.indexOf('--result')+1]||'success';if(!/^[0-9a-f]{40}$/i.test(deployedSha||'')||!['success','failed'].includes(resultName))throw new Error('mark-deployed 需要 --sha <40 位 commit SHA>，可选 --result success|failed。');const result=await call('POST','/internal/pull-requests/deployed',{deployedSha,result:resultName});console.log(JSON.stringify(result));return;}
 if(command==='submit'){const file=args[args.indexOf('--file')+1];if(!file)throw new Error('submit 需要 --file <candidate.json>。');await submitCandidate(JSON.parse(fs.readFileSync(path.resolve(file),'utf8')));return;}
 if(command==='restructure-batch'){const id=args[args.indexOf('--id')+1],version=args[args.indexOf('--expected-version')+1],file=args[args.indexOf('--file')+1];if(!id||!version||!file)throw new Error('restructure-batch 需要 --id、--expected-version 和 --file。');await restructureBatch(id,version,JSON.parse(fs.readFileSync(path.resolve(file),'utf8')));return;}
 throw new Error('用法：service-client.cjs register-sources | get-due/get-failed --output path | get-baselines --ids id,... --output path | submit --file path | export-batch --id id --directory path | record-pr ... | fail-batch --id id | mark-deployed --sha <sha>');
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={stable,submitCandidate,restructureBatch,notifySavedBatch,main};
