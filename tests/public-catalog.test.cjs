const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../assets/core.js');
const {makePublicCatalog}=require('../scripts/public-catalog.cjs');
const maintenance=require('../scripts/catalog.cjs').loadCatalog();
const grade=(year,value,status='reported')=>({system:'ccf',year,value,status,sourceUrl:'https://example.org/ranks',sourceType:'document-copy'});

test('historical evidence remains usable when a newer list has no positive record',()=>{
 const v={evaluations:[grade(2026,null,'unlisted'),grade(2022,'C'),grade(2019,'B')]};
 assert.deepEqual(C.displayEvaluations(v).map(e=>[e.year,e.value]),[[2022,'C']]);
 assert(C.evaluationMatches(v,'ccf:C'));assert(!C.evaluationMatches(v,'ccf:B'));
 v.evaluations.push(grade(2025,'A'));
 assert(C.evaluationMatches(v,'ccf:A'));assert(!C.evaluationMatches(v,'ccf:C'));
});

test('public catalog contains positive properties while preserving the full maintenance record',()=>{
 const raw=structuredClone(maintenance),v=raw.venues.find(v=>v.kind==='journal');
 v.indexing={status:'unresolved',value:null,note:'PRIVATE_INDEX_REVIEW'};
 v.evaluations=[grade(2026,null,'unlisted'),{...grade(2022,'B'),note:'PRIVATE_RANK_REVIEW',attempts:['PRIVATE_ATTEMPT']}];
 v.identityNote='PRIVATE_IDENTITY_REVIEW';v.metricNote='PRIVATE_METRIC_REVIEW';
 const publicData=makePublicCatalog(raw),published=publicData.venues.find(x=>x.id===v.id),text=JSON.stringify(publicData);
 assert(!published.indexing);assert.deepEqual(published.evaluations.map(e=>[e.year,e.value]),[[2022,'B']]);
 assert(!text.includes('PRIVATE_'));assert(!text.includes('"unlisted"'));assert(!text.includes('"unresolved"'));
 assert.equal(raw.venues.find(x=>x.id===v.id).indexing.note,'PRIVATE_INDEX_REVIEW');
 assert.equal(publicData.venues.length,raw.venues.length);
});

test('unpublished calls migrate favorites to the parent and unknown secondary nodes stay in maintenance',()=>{
 const raw=structuredClone(maintenance),v=raw.venues[0];
 const primary={id:'paper',label:'全文提交',type:'paper',primary:true,precision:'date',date:'2027-01-01',original:'Jan 1',revision:2};
 raw.calls=[{id:'known',year:2027,venueId:v.id,verification:'verified',status:'announced',nodes:[primary,{id:'final',label:'终稿',type:'final',precision:'unknown',original:'PRIVATE_UNKNOWN_NODE'}]},
 {id:'undated',venueId:v.id,verification:'verified',status:'announced',nodes:[]}];
 raw.callAliases={'old-undated':'undated'};
 const pub=makePublicCatalog(raw);
 assert.deepEqual(pub.calls.map(c=>c.id),['known']);assert.equal(pub.calls[0].nodes.length,1);
 assert.deepEqual(pub.calls[0].nodes[0],primary);
 assert.deepEqual(C.cleanFavorites({version:1,items:['call:undated','call:old-undated']},pub),['venue:'+v.id]);
 assert(!JSON.stringify(pub).includes('PRIVATE_UNKNOWN_NODE'));
});

test('unresolved registration prerequisites never become an open published round',()=>{
 const raw=structuredClone(maintenance),v=raw.venues[0];
 raw.calls=[{id:'restricted-round',venueId:v.id,verification:'verified',status:'announced',nodes:[
 {id:'paper',type:'paper',primary:true,precision:'date',date:'2027-01-01',requires:['abstract']},
 {id:'abstract',type:'abstract',precision:'unknown'}]}];raw.callAliases={};
 assert.equal(makePublicCatalog(raw).calls.length,0);
});

test('primary direction can narrow a secondary-direction match without changing CFP subjects',()=>{
 const v={id:'v',kind:'journal',primaryArea:'wireless',areas:['wireless','signal'],topics:['mimo'],short:'V',nameEn:'Venue',nameZh:'期刊',evaluations:[],catalogStatus:'current'};
 const filters={kind:'journal',area:'signal',topics:[],query:'',taxonomy:[]};
 assert.equal(C.filterVenues([v],filters).length,1);
 assert.equal(C.filterVenues([v],{...filters,primaryOnly:true}).length,0);
 const call={id:'call',venueId:'v',kind:'special',areas:['signal'],topics:['mimo'],verification:'verified',status:'announced',nodes:[{id:'paper',type:'paper',primary:true,precision:'date',date:'2099-01-01'}]};
 assert.equal(C.filterCalls([call],[v],{...filters,kind:'all',primaryOnly:true}).length,1);
});

test('electronics and communications society tiers stay independent in searches and filters',()=>{
 const v={evaluations:[{system:'cie',year:2023,status:'verified',value:'T2'},{system:'cic',year:2021,status:'reported',value:'T1'}]};
 assert.deepEqual(C.parseVenueQuery('CIE T2 通信学会 T1').grades,['cic:T1','cie:T2']);
 assert(C.evaluationMatches(v,['cie:T2','cic:T1']));
 assert(!C.evaluationMatches(v,['cie:T1','cic:T1']));
 assert.deepEqual(C.cleanGrades(['cie:T2','cic:T1'],'conference'),[]);
});

test('historical source recovery preserves true years and publisher index identity',()=>{
 const by=new Map(maintenance.venues.map(v=>[v.id,v]));
 assert(C.displayEvaluations(by.get('icc')).some(e=>e.system==='core'&&e.year===2018&&e.value==='B'));
 assert(C.displayEvaluations(by.get('proceedings-ieee')).some(e=>e.system==='ccf'&&e.year===2026&&e.value==='A'));
 assert.equal(by.get('tqe').indexing.value,'ESCI');assert.equal(by.get('tqe').indexing.sourceType,'publisher');
 assert.equal(by.get('wcmc').catalogScope,'archive');assert(by.get('aop').invitationOnly);
});

test('publication preserves primary directions while stripping editorial fields from every format',()=>{
 const pub=makePublicCatalog(maintenance);
 for(const v of pub.venues){
  assert.equal(v.primaryArea,v.areas[0]);assert(v.secondaryAreas.length<=2);
  assert.equal(v.contributionUrl,maintenance.meta.repository+'/blob/main/data/venues/'+v.primaryArea+'/'+v.id+'.yml');
  assert(v.evaluations.every(C.isRankEvidence));
  for(const k of ['identityNote','metricNote','candidateSource','submissionStatus'])assert(!Object.hasOwn(v,k));
 }
 assert(pub.venues.some(v=>v.evaluations.some(e=>e.system==='cic')));
 assert(!pub.calls.some(c=>c.nodes.some(n=>n.precision==='unknown')));
});
