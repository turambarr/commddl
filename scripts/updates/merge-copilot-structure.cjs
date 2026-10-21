const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {loadCatalog}=require('../catalog.cjs');
const ROOT=path.join(__dirname,'../..');
const noiseHeading=/^(?:home|menu|navigation|login|log in|sign in|sign up|register|create account|forgot password|reset password|account|contact us|cookie policy|privacy policy|terms of use)$/i;
function args(argv){const result={};for(let i=0;i<argv.length;i++){if(['--source','--copilot','--out'].includes(argv[i]))result[argv[i].slice(2)]=argv[++i];}if(!result.source||!result.copilot||!result.out)throw new Error('用法：merge-copilot-structure.cjs --source <collector.json> --copilot <copilot.json> --out <candidate.json>');return result;}
function strings(value,out=[]){if(typeof value==='string')out.push(value);else if(Array.isArray(value))for(const item of value)strings(item,out);else if(value&&typeof value==='object')for(const item of Object.values(value))strings(item,out);return out;}
function hasChinese(value){return typeof value==='string'&&/\p{Script=Han}/u.test(value);}
function pageEvidence(item){
 const sources=new Map();
 for(const page of item.pages||[]){
  if(typeof page.url!=='string'||!page.url.startsWith('https://'))continue;
  const sections=page.sections||[],byId=new Map(sections.map(section=>[section.sectionId,section]));
  const pathFor=section=>{const chain=[],seen=new Set();let current=section;while(current&&!seen.has(current.sectionId)){seen.add(current.sectionId);chain.unshift(current.heading);current=byId.get(current.parentId);}return chain;};
  const values=[];
  for(const section of sections){if(section.heading)values.push(section.heading);for(const block of section.blocks||[])values.push(...strings(block));}
  sources.set(page.url,{text:values.join('\n'),sections:sections.map(section=>({heading:section.heading,headingLevel:section.headingLevel,sourceAnchor:section.sourceAnchor,sourceHeadingPath:pathFor(section),text:[section.heading,...(section.blocks||[]).flatMap(block=>strings(block))].join('\n')}))});
 }
 return sources;
}
function slug(value){const clean=String(value||'info').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'info';return clean;}
function main(){
 const input=args(process.argv.slice(2)),candidate=JSON.parse(fs.readFileSync(path.resolve(input.source),'utf8')),ai=JSON.parse(fs.readFileSync(path.resolve(input.copilot),'utf8'));
 if(ai.schemaVersion!=='commddl.copilot-structure.v1'||!Array.isArray(ai.items))throw new Error('Copilot 输出 schemaVersion 或 items 不符合要求。');
 const baseById=new Map((candidate.items||[]).map(item=>[item.entity?.id,item])),aiById=new Map(ai.items.map(item=>[item.entityId,item.entityId&&item]));
 if(!baseById.size||aiById.size!==baseById.size||[...baseById.keys()].some(id=>!aiById.has(id)))throw new Error('Copilot 必须逐一返回每个采集实体，不能遗漏或增加 ID。');
 const catalog=loadCatalog(ROOT),entities=new Map([...catalog.venues,...catalog.calls].map(entity=>[entity.id,entity]));
 for(const [entityId,item] of baseById){
  const sourceMap=pageEvidence(item),result=aiById.get(entityId),observations=Array.isArray(result.observations)?result.observations:[];
  if(!['ready','uncertain','insufficient-evidence'].includes(result.status)||!hasChinese(result.summary)||!Array.isArray(result.limitations||[])||(result.limitations||[]).some(value=>!hasChinese(String(value))))throw new Error(`${entityId}: 状态、简体中文摘要或 limitations 无效。`);
  const checked=[];
  for(const observation of observations){
   if(!observation||typeof observation.category!=='string'||!observation.category.trim()||typeof observation.title!=='string'||!observation.title.trim()||!hasChinese(observation.categoryLabelZh)||!hasChinese(observation.titleZh)||!hasChinese(observation.summary)||!observation.uncertainty||!['low','medium','high'].includes(observation.uncertainty.level)||!hasChinese(observation.uncertainty.reason)||!Array.isArray(observation.evidence)||!observation.evidence.length)throw new Error(`${entityId}: 结构化观察必须包含简体中文类别、标题、摘要、不确定性和来源证据。`);
   const evidence=observation.evidence.map(entry=>{
    if(!entry||typeof entry.sourceUrl!=='string'||typeof entry.quote!=='string'||!entry.quote.trim()||entry.quote.length>1200)throw new Error(`${entityId}/${observation.title}: 证据必须包含来源 URL 和不超过 1200 字的原文引句。`);
    const source=sourceMap.get(entry.sourceUrl);if(!source||!source.text.includes(entry.quote))throw new Error(`${entityId}/${observation.title}: 引句不匹配已采集的官网正文或来源链接。`);
    const sourceSection=source.sections.find(section=>(!entry.heading||section.heading===entry.heading)&&section.text.includes(entry.quote));if(!sourceSection)throw new Error(`${entityId}/${observation.title}: 引句与所列官网标题不属于同一结构分段。`);
    const pathText=sourceSection.sourceHeadingPath.join(' / ');if(sourceSection.sourceHeadingPath.some(heading=>noiseHeading.test(String(heading||'').trim()))||noiseHeading.test(String(observation.title||'').trim()))throw new Error(`${entityId}/${observation.title}: 登录、导航或账户辅助内容不能作为正式候选。`);
    return {sourceUrl:entry.sourceUrl,heading:sourceSection.heading,headingLevel:sourceSection.headingLevel||null,sourceAnchor:sourceSection.sourceAnchor||null,sourceHeadingPath:sourceSection.sourceHeadingPath,quote:entry.quote};
   });
   const serialized=JSON.stringify(observation.value===undefined?null:observation.value);if(serialized.length>12000)throw new Error(`${entityId}/${observation.title}: structured value 超过 12 KB。`);
   checked.push({...observation,evidence});
  }
  if(result.status==='ready'&&observations.length===0)throw new Error(`${entityId}: ready 状态至少应含一条有证据的观察。`);
  if(result.status==='insufficient-evidence'&&observations.length)throw new Error(`${entityId}: 证据不足时 observations 必须为空。`);
  item.structuredCandidate={schemaVersion:ai.schemaVersion,status:result.status,summary:result.summary,observations:checked,limitations:(result.limitations||[]).map(String)};
  const entity=entities.get(entityId);if(!entity)throw new Error(`未知目录实体：${entityId}`);
  const sourceChanges=item.changes||[];item.sourceChanges=sourceChanges;
  // Date nodes keep their established parser and stable IDs. General page
  // changes are rebuilt only from evidence-validated Copilot observations.
  item.changes=sourceChanges.filter(change=>change.type==='node-date-changed');
  for(const observation of checked){
   const sectionId=`copilot-${slug(observation.category)}-${crypto.createHash('sha256').update(`${observation.category}\n${observation.title}`).digest('hex').slice(0,10)}`;
   const primaryEvidence=observation.evidence[0],section={sectionId,heading:observation.title,displayHeadingZh:observation.titleZh,category:observation.category,categoryLabelZh:observation.categoryLabelZh,sourceUrl:primaryEvidence.sourceUrl,headingLevel:primaryEvidence.headingLevel||undefined,sourceAnchor:primaryEvidence.sourceAnchor||undefined,sourceHeadingPath:primaryEvidence.sourceHeadingPath,blocks:[{type:'paragraph',text:observation.summary}],...(observation.value===undefined?{}:{structuredValue:observation.value}),evidence:observation.evidence,uncertainty:observation.uncertainty};
   const old=(entity.officialSections||[]).find(entry=>entry.sectionId===sectionId);
   if(old&&JSON.stringify({...old,verifiedAt:undefined})===JSON.stringify(section))continue;
   if(item.changes.some(change=>change.sectionId===sectionId))continue;
   item.changes.push({type:old?'content-changed':'content-added',sectionId,heading:section.heading,displayHeadingZh:section.displayHeadingZh,categoryLabelZh:section.categoryLabelZh,sourceUrl:section.sourceUrl,...(old?{old}:{}),next:section});
  }
 }
 candidate.copilot={provider:'github-copilot-cli',schemaVersion:ai.schemaVersion,status:'validated'};
 fs.mkdirSync(path.dirname(path.resolve(input.out)),{recursive:true});fs.writeFileSync(path.resolve(input.out),JSON.stringify(candidate,null,2)+'\n');console.log(`已验证 ${ai.items.length} 个实体的简体中文结构化结果和官网原文引句。`);
}
if(require.main===module){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={pageEvidence,hasChinese,main};
