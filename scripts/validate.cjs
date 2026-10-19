const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/core.js');
const data = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/catalog.json'),'utf8'));
const errors=[];
const requireThat=(condition,message)=>{if(!condition)errors.push(message);};
const url=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!/[\r\n]/.test(value);}catch{return false;}};
const ids=new Set(), venueIds=new Set(data.venues.map(v=>v.id)), areas=new Set(data.areas.map(a=>a.id));
const topicIds=new Set();
for(const area of data.areas)requireThat(area.code&&area.label,`${area.id}: missing category code or label`);
for(const topic of data.topics || []){
  requireThat(/^[a-z0-9-]+$/.test(topic.id)&&!topicIds.has(topic.id),`Duplicate/invalid topic: ${topic.id}`);topicIds.add(topic.id);
  requireThat(topic.label&&topic.areas?.length&&topic.areas.every(a=>areas.has(a)),`${topic.id}: invalid topic parent areas`);
  requireThat(Array.isArray(topic.aliases),`${topic.id}: missing search aliases`);
}
requireThat(topicIds.size>0,'Missing topic taxonomy');
for(const item of [...data.venues,...data.calls]){
  requireThat(/^[a-z0-9-]+$/.test(item.id),`Invalid ID: ${item.id}`);
  requireThat(!ids.has(item.id),`Duplicate ID: ${item.id}`);ids.add(item.id);
  requireThat(url(item.url)&&url(item.sourceUrl),`${item.id}: invalid official/source URL`);
  requireThat(item.areas?.length>0&&item.areas.every(a=>areas.has(a)),`${item.id}: unknown research area`);
  requireThat(item.topics?.length>0&&new Set(item.topics).size===item.topics.length&&item.topics.every(t=>topicIds.has(t)),`${item.id}: missing/duplicate/unknown research topic`);
  requireThat(['verified','pending'].includes(item.verification),`${item.id}: missing verification status`);
  if(item.verification==='verified') requireThat(C.validDate(item.verifiedAt),`${item.id}: missing verification date`);
}
for(const v of data.venues){
  requireThat(['journal','conference'].includes(v.kind),`${v.id}: invalid venue kind`);
  requireThat(v.short&&v.nameZh&&v.nameEn,`${v.id}: missing identity fields`);
  requireThat(Array.isArray(v.articleTypes)&&v.articleTypes.length,`${v.id}: missing article types`);
  requireThat(['current','needs-review','historical-only'].includes(v.catalogStatus),`${v.id}: invalid catalog status`);
  requireThat(!v.catalogScope||['communications','archive'].includes(v.catalogScope),`${v.id}: invalid catalog scope`);
  if(v.kind==='journal'){
    const ix=v.indexing;
    requireThat(ix&&['verified','reported','unlisted','unresolved','pending'].includes(ix.status)&&C.validDate(ix.verifiedAt)&&ix.note,`${v.id}: every journal needs an explicit indexing status`);
    if(['verified','reported'].includes(ix?.status))requireThat(['SCIE','ESCI','SSCI','AHCI'].includes(ix.value)&&url(ix.sourceUrl)&&ix.sourceTitle&&ix.sourceType,`${v.id}: indexing claim needs explicit index and attributed evidence`);
    else requireThat(ix?.value===null,`${v.id}: unknown indexing cannot be inferred from quartiles`);
    if(ix?.status==='reported')requireThat(['secondary','document-copy'].includes(ix.sourceType),`${v.id}: indexing transcript needs secondary provenance`);
    if(ix?.snapshotDate)requireThat(C.validDate(ix.snapshotDate)||/^\d{4}-(0[1-9]|1[0-2])$/.test(ix.snapshotDate),`${v.id}: invalid indexing snapshot date`);
  }
  for(const ix of v.otherIndexes||[])requireThat(ix.value&&['verified','reported'].includes(ix.status)&&url(ix.sourceUrl)&&C.validDate(ix.verifiedAt)&&ix.note,`${v.id}: other indexes need independent evidence`);
  const systems=new Set();
  for(const e of v.evaluations||[]){
    requireThat(['jcr','cas','ccf','core'].includes(e.system)&&!systems.has(e.system),`${v.id}: duplicate/invalid rating system`);systems.add(e.system);
    requireThat(Number.isInteger(e.year)&&e.year>=2018&&e.note,`${v.id}: rating needs dated scope`);
    requireThat(['verified','reported','pending','not-matched','scope-review','non-ranked','unlisted','unresolved','not-applicable'].includes(e.status),`${v.id}: invalid rating status`);
    if(['verified','reported','non-ranked'].includes(e.status))requireThat(e.value&&url(e.sourceUrl)&&e.sourceTitle&&C.validDate(e.verifiedAt)&&e.sourceType,`${v.id}: published evaluation needs value, source and verification date`);
    else requireThat(e.value===null,`${v.id}: unknown evaluation must not carry an inferred grade`);
    if(['unlisted','unresolved'].includes(e.status))requireThat(C.validDate(e.reviewedAt||e.verifiedAt)&&e.note,`${v.id}: reviewed status needs evidence date`);
    if(e.system==='jcr')requireThat(v.kind==='journal'&&(!e.value||/^Q[1-4]$/.test(e.value)),`${v.id}: JCR applies to journals only`);
    if(e.system==='cas')requireThat(v.kind==='journal'&&(!e.value||/^[1-4]$/.test(e.value))&&e.year<=2025,`${v.id}: invalid CAS edition/grade`);
    if(e.system==='core')requireThat(v.kind==='conference',`${v.id}: ICORE applies to conferences`);
    if(e.system==='ccf'&&e.value)requireThat(/^[ABC]$/.test(e.value),`${v.id}: invalid CCF category`);
    if(e.status==='reported')requireThat(['secondary','document-copy'].includes(e.sourceType),`${v.id}: reported evaluation needs provenance`);
  }
  requireThat(systems.has('ccf')&&(v.kind==='journal'?systems.has('jcr')&&systems.has('cas'):systems.has('core')),`${v.id}: missing explicit evaluation coverage status`);
  for(const key of ['authorGuideUrl','cfpUrl'])if(v[key])requireThat(url(v[key]),`${v.id}: invalid ${key}`);
  for(const a of v.assessments||[]){requireThat(a.year&&url(a.sourceUrl)&&a.note,`${v.id}: assessment needs year, source and scope`);}
}
for(const [oldId,newId] of Object.entries(data.callAliases||{}))requireThat(/^[a-z0-9-]+$/.test(oldId)&&data.calls.some(c=>c.id===newId)&&oldId!==newId,`Invalid call alias: ${oldId}`);
const identities=new Set();
for(const v of data.venues){
  const identity=v.kind+':'+v.nameEn.normalize('NFKC').toLowerCase();
  requireThat(!identities.has(identity),`${v.id}: duplicate venue identity`);identities.add(identity);
}
for(const call of data.calls){
  requireThat(venueIds.has(call.venueId),`${call.id}: missing parent venue`);
  requireThat(['conference','workshop','special','series'].includes(call.kind),`${call.id}: invalid activity kind`);
  if(call.eventStart||call.eventEnd)requireThat(C.validDate(call.eventStart)&&C.validDate(call.eventEnd)&&call.eventStart<=call.eventEnd,`${call.id}: invalid conference dates`);
  requireThat(call.title&&call.titleEn,`${call.id}: missing title`);
  requireThat(Array.isArray(call.nodes),`${call.id}: missing timeline`);
  requireThat((call.nodes||[]).filter(n=>n.primary).length<=1,`${call.id}: multiple primary nodes`);
  const nodeIds=new Set();
  for(const node of call.nodes||[]){
    requireThat(/^[a-z0-9-]+$/.test(node.id)&&!nodeIds.has(node.id),`${call.id}: duplicate/invalid stable node ID`);nodeIds.add(node.id);
    requireThat(node.label&&node.original,`${call.id}/${node.id}: missing label or source wording`);
    requireThat(['instant','date','unknown'].includes(node.precision),`${call.id}/${node.id}: invalid precision`);
    if(node.precision==='date')requireThat(C.validDate(node.date)&&!node.instant&&!node.timezone,`${call.id}/${node.id}: date-only node must not invent a timezone/instant`);
    if(node.precision==='instant')requireThat(C.parseInstant(node.instant)!==null&&node.timezone,`${call.id}/${node.id}: exact instant needs explicit offset and source timezone`);
    requireThat(Number.isInteger(node.revision)&&node.revision>=0,`${call.id}/${node.id}: invalid revision`);
    if(node.precision!=='unknown')requireThat(call.verification==='verified',`${call.id}/${node.id}: unverified date must not be published as a verified node`);
  }
  for(const node of call.nodes||[]) for(const id of node.requires||[])requireThat(nodeIds.has(id)&&id!==node.id,`${call.id}/${node.id}: invalid prerequisite`);
  if(call.kind==='special')requireThat(data.venues.find(v=>v.id===call.venueId)?.kind==='journal',`${call.id}: special issue parent must be a journal`);
}
requireThat(data.legacyMappings?.length===89&&new Set(data.legacyMappings.map(m=>m.number)).size===89&&data.legacyMappings.every(m=>venueIds.has(m.venueId)&&Number.isInteger(m.page)), '2018 legacy mapping must account for all 89 numbered entries');
requireThat(data.policy?.masterArticle===4&&url(data.policy.sourceUrl), 'Missing selected master policy source');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`目录结构校验通过：${data.venues.length} 个载体，${data.calls.length} 项活动。`);
