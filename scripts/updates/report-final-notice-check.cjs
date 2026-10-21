async function main({env=process.env,fetchImpl=fetch,log=console.log}={}){
 const [owner,repo,sha,prNumber]=['GITHUB_REPOSITORY_OWNER','GITHUB_REPOSITORY_NAME','FINAL_SHA','PR_NUMBER'].map(key=>env[key]);
 const token=env.GITHUB_TOKEN,mode=env.CHECK_MODE||'candidate-notified';if(!owner||!repo||!token||!/^([0-9a-f]{40})$/i.test(sha||'')||!Number(prNumber))throw new Error('final-notice check inputs are incomplete');
 let conclusion='success',title='最终提交版本绑定已确认',summary=`CommDDL Worker 已确认候选批次绑定到 PR #${prNumber} 的最终提交 ${sha}。此检查只验证版本绑定，不代表提醒邮件已送达。`;
 if(mode==='neutral-if-non-data'){
  const api=(env.UPDATE_ADMIN_API_URL||'').replace(/\/$/,'');const secret=env.UPDATE_INTERNAL_HMAC_SECRET;if(!api||!secret)throw new Error('final-notice classification requires the configured Worker URL and HMAC secret');
  const body=JSON.stringify({prNumber:Number(prNumber),headSha:sha}),timestamp=String(Date.now()),requestId=require('node:crypto').randomUUID(),bodyHash=require('node:crypto').createHash('sha256').update(body).digest('hex'),signature=require('node:crypto').createHmac('sha256',secret).update(`${timestamp}.${requestId}.${bodyHash}`).digest('hex');
  const statusResponse=await fetchImpl(`${api}/internal/pull-requests/notice-status`,{method:'POST',headers:{'content-type':'application/json','x-commddl-timestamp':timestamp,'x-commddl-request-id':requestId,'x-commddl-signature':signature},body});const status=await statusResponse.json().catch(()=>({}));if(!statusResponse.ok)throw new Error(`Could not classify candidate binding (${statusResponse.status}): ${status.detail||status.error||'Worker API error'}`);
  if(status.candidate){if(status.notified){log(`候选 PR #${prNumber} 已在此提交完成通知；成功检查由可信候选工作流创建。`);return {created:false,reason:'candidate-notice-check-owned-by-candidate-workflow'};}log(`候选 PR #${prNumber} 尚未在此提交完成通知；最终通知检查暂不完成。`);return {created:false,reason:'candidate-not-notified'};}
  if(String(env.PR_HEAD_REF||'').startsWith('codex/official-updates-')){log(`候选 PR #${prNumber} 尚未绑定到批次；最终通知检查暂不完成，以等待候选工作流完成绑定。`);return {created:false,reason:'candidate-binding-pending'};}
  conclusion='neutral';title='此 PR 无候选版本绑定要求';summary=`Worker 确认 PR #${prNumber} 未绑定更新候选。此 neutral 结果仅适用于提交 ${sha}。`;
 }else if(mode!=='candidate-notified')throw new Error(`unsupported final-notice check mode: ${mode}`);
 const response=await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/check-runs`,{method:'POST',headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','content-type':'application/json'},body:JSON.stringify({name:'CommDDL final notice',head_sha:sha,status:'completed',conclusion,external_id:`commddl:${mode}:${prNumber}:${sha}`,output:{title,summary}})});
 const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`Could not create final notice check (${response.status}): ${body.message||'GitHub API error'}`);
 log(`已创建 ${conclusion} CommDDL 最终通知检查 ${body.id} for PR #${prNumber} at ${sha.slice(0,12)}.`);return {created:true,conclusion,id:body.id};
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main};
