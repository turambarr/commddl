const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const YAML=require('yaml');
const {loadCatalog,sourcePath}=require('../catalog.cjs');
const {validateCatalog}=require('../validate.cjs');
const ROOT=path.join(__dirname,'../..');
const keys=['sectionId','parentId','heading','displayHeadingZh','headingLevel','order','category','categoryLabelZh','sourceUrl','sourceAnchor','blocks','structuredValue','evidence','uncertainty','sourceHeadingPath'];
function applyNodeDateChange(call,change,decision,recordedAt=new Date().toISOString()){
 const nodeId=change.nodeId;if(!nodeId)throw new Error('日期候选缺少稳定 nodeId。');
 const node=(call.nodes||[]).find(item=>item.id===nodeId);if(!node)throw new Error(`${call.id}: 找不到日期节点 ${nodeId}。`);
 const date=decision.date||change.nextDate;if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(`${date}T00:00:00Z`))||new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)!==date)throw new Error(`${call.id}/${nodeId}: 日期必须是有效的 YYYY-MM-DD。`);
 const nextPrecision=change.precision||'date',nextInstant=change.instant||null,nextTimezone=change.timezone||null;
 if(nextPrecision==='instant'){
  if(!nextInstant||!nextTimezone||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(nextInstant)||!Number.isFinite(Date.parse(nextInstant)))throw new Error(`${call.id}/${nodeId}: 精确时刻变更必须同时提供有效 instant 与明确 timezone。`);
  if(node.precision==='instant'&&decision.action==='edit'&&decision.date&&decision.date!==change.nextDate)throw new Error(`${call.id}/${nodeId}: 仅修改日期会丢失已知时刻；请提供新的精确时刻和时区证据。`);
 }else if(node.precision==='instant'||node.instant){throw new Error(`${call.id}/${nodeId}: 当前记录含精确时刻；官网仅有日期不足以安全覆盖，需补充明确时刻及时区。`);}
 if(node.precision==='date'&&nextPrecision==='date'&&node.date===date)return false;
 const previous=node.instant||node.date||null,previousPrecision=node.precision||'unknown';
 if(nextPrecision==='instant'){node.date=null;node.precision='instant';node.instant=nextInstant;node.timezone=nextTimezone;}else{node.date=date;node.precision=nextPrecision;node.instant=null;node.timezone=nextTimezone||node.timezone||null;}
 if(change.excerpt)node.original=change.excerpt;node.revision=(Number(node.revision)||0)+1;node.updatedAt=recordedAt;
 const next=node.instant||node.date;call.history=Array.isArray(call.history)?call.history:[];call.history.push({type:'deadline-revised',nodeId,revision:node.revision,from:previous,to:next,fromPrecision:previousPrecision,toPrecision:node.precision,sourceUrl:change.sourceUrl||change.next?.sourceUrl||call.sourceUrl,recordedAt});call.updatedAt=recordedAt;return true;
}
function stableSection(section,verifiedAt){
 const result=Object.fromEntries(keys.filter(key=>section[key]!==undefined).map(key=>[key,section[key]]));
 if(!result.sectionId||!result.heading||!result.sourceUrl)throw new Error('候选分段缺少稳定编号、官网标题或来源地址。');
 if(!/^https:\/\//i.test(result.sourceUrl))throw new Error(`${result.heading}: 来源必须使用 HTTPS。`);
 result.verifiedAt=verifiedAt;return result;
}
function readArgs(args){const value={};for(let i=0;i<args.length;i++){if(args[i]==='--batch')value.batch=args[++i];else if(args[i]==='--decisions')value.decisions=args[++i];}if(!value.batch||!value.decisions)throw new Error('用法：npm run update:apply -- --batch <candidate.json> --decisions <decisions.json>');return value;}
function main(){
 const args=readArgs(process.argv.slice(2)),batch=JSON.parse(fs.readFileSync(path.resolve(args.batch),'utf8')),decisions=JSON.parse(fs.readFileSync(path.resolve(args.decisions),'utf8'));
 if(!batch.baseRevision)throw new Error('候选未绑定基线 SHA，拒绝生成源数据补丁。');
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();if(head!==batch.baseRevision)throw new Error(`基线已变化：候选 ${batch.baseRevision}，当前 ${head}。请重新采集并审阅。`);
 const catalog=loadCatalog(ROOT),entities=new Map([...catalog.venues,...catalog.calls].map(item=>[item.id,item])),updates=new Map(),verifiedAt=new Date().toISOString().slice(0,10);
 for(const item of batch.items||[]){const id=item.entity?.id,entity=entities.get(id);if(!entity)throw new Error(`未知维护实体：${id}`);const decisionMap=decisions[id]||decisions;
  for(const change of item.changes||[]){const decision=decisionMap[change.sectionId];if(!decision||decision.action==='pending'||decision.action==='reject')continue;if(!['accept','edit'].includes(decision.action))throw new Error(`${change.sectionId}: 决策状态无效。`);
   const source=decision.action==='edit'?decision.section:change.next;if(!source&&change.type!=='possibly-removed'&&change.type!=='node-date-changed')throw new Error(`${change.sectionId}: 缺少可应用的官网分段。`);
   const file=path.join(ROOT,sourcePath(entity));if(!updates.has(file)){const doc=YAML.parseDocument(fs.readFileSync(file,'utf8'),{version:'1.2',schema:'core',uniqueKeys:true,stringKeys:true,merge:false});if(doc.errors.length)throw new Error(`${id}: YAML 解析失败：${doc.errors.map(error=>error.message).join('; ')}`);const data=doc.toJS({maxAliasCount:0});updates.set(file,{doc,data,sections:Array.isArray(data.officialSections)?data.officialSections:[],sectionsChanged:false});}
   const entry=updates.get(file);if(change.type==='node-date-changed'){
    const dateChange=decision.action==='edit'?{...change,nextDate:decision.date||decision.nextDate}:change;
    if(!applyNodeDateChange(entry.data,dateChange,decision,new Date().toISOString()))continue;
    entry.doc.set('nodes',entry.data.nodes);entry.doc.set('history',entry.data.history);entry.doc.set('updatedAt',entry.data.updatedAt);continue;
   }
   const index=entry.sections.findIndex(section=>section.sectionId===change.sectionId||(!section.sectionId&&section.sourceUrl===source?.sourceUrl&&section.heading===source?.heading));
   if(change.type==='possibly-removed'){if(index>=0){entry.sections.splice(index,1);entry.sectionsChanged=true;}continue;}
   const section=stableSection(source,verifiedAt);if(index>=0)entry.sections[index]=section;else entry.sections.push(section);entry.sectionsChanged=true;
  }
 }
 if(!updates.size){console.log('没有已接受的有效分段；没有修改 YAML。');return;}
 for(const [file,entry] of updates){if(entry.sectionsChanged)entry.doc.set('officialSections',entry.sections);entry.content=entry.doc.toString();}
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'commddl-apply-'));try{
  fs.cpSync(path.join(ROOT,'data'),path.join(temporary,'data'),{recursive:true});
  for(const [file,entry] of updates){const relative=path.relative(ROOT,file);const tempFile=path.join(temporary,relative);fs.mkdirSync(path.dirname(tempFile),{recursive:true});fs.writeFileSync(tempFile,entry.content);}
  const next=loadCatalog(temporary);validateCatalog(next);
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
 const staged=[];try{
  for(const [file,entry] of updates){const temp=`${file}.apply-${process.pid}.tmp`;fs.writeFileSync(temp,entry.content);staged.push({file,temp,backup:fs.readFileSync(file)});}
  for(const item of staged)fs.renameSync(item.temp,item.file);
 }catch(error){for(const item of staged){if(fs.existsSync(item.temp))fs.rmSync(item.temp,{force:true});if(fs.existsSync(item.file))fs.writeFileSync(item.file,item.backup);}throw error;}
 console.log(`已应用 ${updates.size} 个 YAML 文件；完整目录结构检查通过。请运行 check、test 和 build 后创建 PR。`);
}
if(require.main===module){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={applyNodeDateChange};
