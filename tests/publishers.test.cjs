const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../assets/core.js');
const {loadCatalog}=require('../scripts/catalog.cjs');
const {validateCatalog}=require('../scripts/validate.cjs');
const {makePublicCatalog}=require('../scripts/public-catalog.cjs');
const org=(id,name)=>({id,name,nameZh:id==='elsevier'?'爱思唯尔':'出版机构',aliases:id==='elsevier'?['爱斯维尔']:[],sourceUrl:'https://example.org/journal',verifiedAt:'2026-10-23'});
test('publisher aliases, joint publication and unknown filters compose with existing conditions',()=>{
 const d=loadCatalog(),v=structuredClone(d.venues.find(v=>v.id==='twc'));
 v.publishers=[org('elsevier','Elsevier'),org('mdpi','MDPI')];v.societies=[org('society','学会')];
 const find=f=>C.filterVenues([v],{taxonomy:d.topics,...f});
 for(const query of ['Elsevier','爱思唯尔','爱斯维尔','MDPI'])assert.equal(find({query}).length,1,query);
 assert.equal(find({publisher:'mdpi',area:'wireless'}).length,1);
 assert.equal(find({publisher:'ieee'}).length,0);
 assert.equal(find({publisher:'society'}).length,0);
 assert.equal(find({publisher:'unknown'}).length,0);
 delete v.publishers;
 assert.equal(find({publisher:'unknown'}).length,1);
 assert.equal(find({publisher:'mdpi'}).length,0);
});
test('journal calls use parent publisher and preserve date and topic constraints',()=>{
 const d=loadCatalog(),call=structuredClone(d.calls.find(c=>c.kind==='special'));
 const v=structuredClone(d.venues.find(v=>v.id===call.venueId));v.publishers=[org('mdpi','MDPI')];
 const find=f=>C.filterCalls([call],[v],{showPast:true,taxonomy:d.topics,...f});
 assert.equal(find({publisher:'mdpi'}).length,1);
 assert.equal(find({publisher:'ieee'}).length,0);
 assert.equal(find({query:'MDPI'}).length,1);
 assert.equal(find({publisher:'mdpi',daysFrom:'36500',window:'custom'}).length,0);
});
test('public organizations expose evidence but exclude maintenance-only metadata',()=>{
 const d=loadCatalog(),v=d.venues.find(v=>v.id==='twc');
 v.publishers=[{...org('ieee','IEEE'),status:'reported',sourceType:'crossref',sourcePublisher:'IEEE original',sourceTitle:'Journal title',issn:['1234-5678'],note:'Historical registration',privateNote:'PRIVATE'}];v.societies=[org('comsoc','IEEE ComSoc')];
 const p=makePublicCatalog(d).venues.find(x=>x.id===v.id);
 assert.equal(p.publishers[0].sourceUrl,v.publishers[0].sourceUrl);
 assert.equal(p.publishers[0].status,'reported');assert.equal(p.publishers[0].note,'Historical registration');
 assert.equal(p.publishers[0].sourcePublisher,'IEEE original');assert.deepEqual(p.publishers[0].issn,['1234-5678']);
 assert.equal(p.societies[0].id,'comsoc');assert(!JSON.stringify(p).includes('PRIVATE'));
});
test('publisher evidence status rejects ambiguous or unqualified records',()=>{
 for(const extra of [{status:'guessed'},{sourceType:'search'},{status:'reported'},{status:'reported',sourceType:'crossref',note:''},{issn:['wrong']}]){
  const d=loadCatalog();d.venues.find(v=>v.id==='twc').publishers=[{...org('ieee','IEEE'),...extra}];
  assert.throws(()=>validateCatalog(d),/organization|publishers/);
 }
});
test('catalog publisher research covers 319 journals and preserves known exceptions',()=>{
 const d=loadCatalog(),journals=d.venues.filter(v=>v.kind==='journal'),by=new Map(journals.map(v=>[v.id,v]));
 assert.equal(journals.length,326);assert(journals.filter(v=>v.publishers?.length).length>=319);
 assert.equal(by.get('photonics-mdpi').publishers[0].id,'mdpi');
 assert.equal(by.get('ieice-com').publishers[0].id,'ieice');
 for(const v of journals.filter(v=>v.id.startsWith('iet-')||v.id==='electronics-letters')){
  assert.equal(v.publishers[0].id,'wiley');assert.equal(v.societies[0].id,'iet');
 }
 for(const v of journals)for(const p of v.publishers||[]){
  if(p.status==='reported')assert(p.sourceType&&p.note, v.id);
 }
 assert(!JSON.stringify(by.get('cn-xidian').publishers).includes('Engineering Skill Development'));
});
test('organization schema rejects missing evidence, duplicates and invalid lists',()=>{
 for(const value of ['IEEE',[null],[{id:'ieee',name:'IEEE'}],[org('ieee','IEEE'),org('ieee','IEEE')],[{...org('mdpi','MDPI'),verifiedAt:'2026-02-30'}]]){
  const d=loadCatalog();d.venues.find(v=>v.id==='twc').publishers=value;
  assert.throws(()=>validateCatalog(d),/publishers/);
 }
 const d=loadCatalog();d.venues.find(v=>v.id==='twc').publishers=[org('ieee','IEEE'),org('mdpi','MDPI')];assert.doesNotThrow(()=>validateCatalog(d));
});
