const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../assets/core.js');
const data=require('../data/catalog.json');
const NOW=Date.parse('2026-10-17T08:00:00Z');
const venue={id:'sample',short:'测试刊',areas:['wireless']};
const base={id:'sample-call',venueId:'sample',title:'无线通信',verification:'verified',status:'announced',sourceUrl:'https://example.org/cfp',updatedAt:'2026-10-17T08:00:00Z',nodes:[{id:'paper',label:'全文提交',type:'paper',primary:true,precision:'date',date:'2026-10-30',revision:0}]};
test('only a real date is accepted',()=>{assert(C.validDate('2028-02-29'));assert(!C.validDate('2027-02-29'));assert(!C.validDate('2026-13-01'));});
test('date-only data remains date-only and never enters precise export',()=>{assert.equal(C.stateOf(base,NOW).code,'date');assert.equal(C.stateOf(base,NOW).days,13);assert.equal(C.eligibleNodes([base],false).length,0);assert.equal(C.eligibleNodes([base],true).length,1);});
test('AoE correctly crosses into the next Beijing calendar day',()=>{const instant='2026-10-30T23:59:59-12:00';assert.equal(C.dateInZone(C.parseInstant(instant),'Asia/Shanghai'),'2026-10-31');});
test('Pacific daylight saving offsets represent different instants',()=>{assert.equal(C.parseInstant('2026-11-01T01:30:00-08:00')-C.parseInstant('2026-11-01T01:30:00-07:00'),3600000);assert.equal(C.parseInstant('2026-10-30T23:59:59'),null);assert.equal(C.parseInstant('2026-10-30T25:00:00Z'),null);});
test('abstract registration can close before the final paper deadline',()=>{const call=structuredClone(base);call.nodes.unshift({id:'abstract',label:'摘要注册',type:'abstract',precision:'date',date:'2026-10-16'});call.nodes[1].requires=['abstract'];assert.equal(C.stateOf(call,NOW).code,'restricted');});
test('unknown prerequisite is a conflict instead of an open call',()=>{const call=structuredClone(base);call.nodes[0].requires=['missing'];assert.equal(C.stateOf(call,NOW).code,'conflict');});
test('unknown and unverified activity dates do not generate calendar events',()=>{const call={...base,verification:'pending'};assert.equal(C.stateOf(call,NOW).code,'pending');assert.equal(C.eligibleNodes([call],true).length,0);});
test('a main-conference selection never includes workshops',()=>{const calls=[base,{...base,id:'workshop',kind:'workshop'}].map((c,i)=>({...c,kind:i?'workshop':'conference'}));assert.equal(C.filterCalls(calls,[venue],{kind:'conference',zone:'Asia/Shanghai'},NOW).length,1);});
test('direction and search filters work together',()=>{const results=C.filterCalls(data.calls,data.venues,{kind:'special',area:'space',query:'在轨',zone:'Asia/Shanghai'},NOW);assert.deepEqual(results.map(c=>c.id),['wcm-orbit-2026']);});
test('a journal can be followed by its stable venue ID',()=>{const results=C.filterCalls(data.calls,data.venues,{favoriteOnly:true,favorites:['venue:jsac'],zone:'Asia/Shanghai'},NOW);assert(results.length>=3);assert(results.every(c=>c.venueId==='jsac'));});
test('calendar date export is all-day with an explicit precision warning',()=>{const ics=C.createICS([base],[venue],{includeDateOnly:true,generatedAt:'2026-10-17T08:00:00Z'});const unfolded=ics.replace(/\r\n /g,'');assert.match(ics,/DTSTART;VALUE=DATE:20261030/);assert.match(ics,/DTEND;VALUE=DATE:20261031/);assert.match(unfolded,/官网未明确具体钟点或时区/);assert(!ics.includes('DTSTART:20261030T'));});
test('postponement and inserted timeline nodes preserve stable event identity',()=>{const old=C.createICS([base],[venue],{includeDateOnly:true});const call=structuredClone(base);call.nodes[0].date='2026-11-07';call.nodes[0].revision=1;call.nodes.unshift({id:'abstract',label:'摘要',type:'abstract',precision:'date',date:'2026-11-01',revision:0});const next=C.createICS([call],[venue],{includeDateOnly:true});assert.match(old,/UID:sample-call-paper@commddl/);assert.match(next,/UID:sample-call-paper@commddl/);assert.match(next,/SEQUENCE:1/);});
test('UTF-8 calendar folding obeys the 75-octet limit and preserves content',()=>{const text='SUMMARY:'+('无线通信与网络，专题征稿；\n'.repeat(20));const escaped=C.escapeICS(text);const folded=C.foldLine(escaped);assert(folded.split('\r\n').every(line=>Buffer.byteLength(line,'utf8')<=75));assert.equal(folded.replace(/\r\n /g,''),escaped);});
test('favorite imports cannot introduce arbitrary HTML, URLs, or unknown IDs',()=>{assert.deepEqual(C.cleanFavorites({version:1,items:['call:jsac-flexible-2026','call:jsac-flexible-2026','<img src=x onerror=alert(1)>','venue:not-real']},data),['call:jsac-flexible-2026']);assert.throws(()=>C.cleanFavorites({items:[]},data));});
test('expired calls are hidden by default and available in history',()=>{const vtc=data.calls.find(c=>c.id==='vtc-2027-spring-main');assert.equal(C.stateOf(vtc,NOW).code,'past-date');assert.equal(C.filterCalls([vtc],data.venues,{zone:'Asia/Shanghai'},NOW).length,0);assert.equal(C.filterCalls([vtc],data.venues,{showPast:true,zone:'Asia/Shanghai'},NOW).length,1);});
test('regular journals never become deadline activities automatically',()=>{assert(!data.calls.some(c=>c.venueId==='twc'));assert(data.venues.some(v=>v.id==='twc'&&v.kind==='journal'));});
test('cancelled events retain their stable identity and publish cancellation',()=>{const call={...base,status:'cancelled'};const ics=C.createICS([call],[venue],{includeDateOnly:true});assert.match(ics,/UID:sample-call-paper@commddl/);assert.match(ics,/STATUS:CANCELLED/);});
test('only fully specified instants produce a live countdown',()=>{assert.equal(C.countdown('2026-10-18T09:02:03Z',NOW),'1天 01:02:03');assert.equal(C.countdown('2026-10-18',NOW),null);assert.equal(C.countdown('2026-10-17T07:59:59Z',NOW),'已截止');});
test('multiple subjects use OR, combined with the primary direction using AND',()=>{
  const filters={venueKind:'journal',area:'wireless',topics:['mimo','channel-coding']};
  const results=C.filterVenues(data.venues,filters);
  assert(results.some(v=>v.id==='twc'));assert(results.some(v=>v.id==='tcom'));
  assert(results.every(v=>v.areas.includes('wireless')&&v.topics.some(t=>filters.topics.includes(t))));
  assert(!results.some(v=>v.id==='tap'));
});
test('specific special issues do not inherit unrelated parent-journal subjects or directions',()=>{
  const call=data.calls.find(c=>c.id==='jsac-flexible-2026');
  assert.equal(C.filterCalls([call],data.venues,{topics:['optical-networks']},NOW).length,0);
  assert.equal(C.filterCalls([call],data.venues,{area:'optical'},NOW).length,0);
  assert.equal(C.filterCalls([call],data.venues,{topics:['isac']},NOW).length,1);
});
test('topic URL selections reject unknown IDs, remove duplicates and respect direction changes',()=>{
  assert.deepEqual(C.cleanTopics(['isac','isac','unknown','fiber'],data.topics),['isac','fiber']);
  assert.deepEqual(C.cleanTopics(['isac','fiber'],data.topics,'optical'),['fiber']);
});
test('all venues and calls use known subjects, every subject has a directory entry',()=>{
  const ids=new Set(data.topics.map(t=>t.id));
  for(const item of [...data.venues,...data.calls])assert(item.topics.length&&item.topics.every(t=>ids.has(t)),item.id);
  for(const t of data.topics)assert(data.venues.some(v=>v.topics.includes(t.id)),t.id);
});
test('Chinese subjects and historical names are searchable across directories',()=>{
  assert(C.filterVenues(data.venues,{query:'相干光通信',taxonomy:data.topics}).some(v=>v.id==='jlt'));
  assert.deepEqual(C.filterVenues(data.venues,{query:'MWCL'}).map(v=>v.id),['mwtl']);
  assert.deepEqual(C.filterVenues(data.venues,{query:'IPSN'}).map(v=>v.id),['sensys']);
});
test('favorites remain filterable by subjects after directory expansion',()=>{
  assert.deepEqual(C.filterVenues(data.venues,{favoriteOnly:true,favorites:['venue:twc','venue:jlt'],topics:['fiber']}).map(v=>v.id),['jlt']);
  assert(C.cleanFavorites({version:1,items:['venue:twc','venue:tap','venue:sensys']},data).length===3);
});

test('grade filters combine independently with direction and topic filters',()=>{
  const result=C.filterVenues(data.venues,{venueKind:'journal',grade:'jcr:Q1',area:'wireless',topics:['mimo']});
  assert(result.some(v=>v.id==='twc'));assert(!result.some(v=>v.id==='cl'));assert(result.every(v=>v.kind==='journal'&&v.areas.includes('wireless')&&v.topics.includes('mimo')));
});
test('unknown and non-ranked evaluations never become a lower grade',()=>{
  const sample={evaluations:[{system:'core',status:'non-ranked',value:'Unranked'},{system:'ccf',status:'pending',value:null}]};
  assert(!C.evaluationMatches(sample,'core:C'));assert(!C.evaluationMatches(sample,'ccf:C'));assert(C.evaluationMatches(sample,'pending'));
});
test('identical acronyms cannot silently assign unrelated publication grades',()=>{
  const by=new Map(data.venues.map(v=>[v.id,v]));
  assert(!C.evaluationMatches(by.get('cl'),'ccf:C')); // Computer Languages is a different CL.
  assert(!C.evaluationMatches(by.get('ctw'),'core:C')); // Cologne-Twente is a different CTW.
  assert(!C.evaluationMatches(by.get('iccc'),'core:C')); // Computational Creativity is a different ICCC.
  assert(!C.evaluationMatches(by.get('sensys'),'ccf:B')); // Merger scope needs a separate ruling.
});
test('master discovery includes conferences outside the historical doctoral list',()=>{
  const all=C.filterVenues(data.venues,{venueKind:'conference'}),old=C.filterVenues(data.venues,{venueKind:'conference',historical:true});
  assert(all.length>old.length);assert(all.some(v=>v.id==='apcc'));assert(!old.some(v=>v.id==='apcc'));
  assert.equal(data.legacyMappings.length,89);assert.equal(new Set(data.legacyMappings.map(m=>m.number)).size,89);
});
test('an attached workshop cannot inherit a main-conference school tag',()=>{
  const parent={...venue,assessments:[{system:'bupt-ict-2018'}]};
  const calls=[{...base,kind:'conference'},{...base,id:'workshop',kind:'workshop'}];
  assert.deepEqual(C.filterCalls(calls,[parent],{historical:true},NOW).map(c=>c.id),['sample-call']);
});
test('catalog state is separate from grades and keeps old identities discoverable',()=>{
  const rows=C.filterVenues(data.venues,{venueKind:'conference',includeArchived:true,query:'NIPS'});
  assert(rows.some(v=>v.id==='neurips'));assert(rows.every(v=>v.catalogScope==='archive'||v.catalogStatus==='historical-only'));
});

test('SCI indexing is based on explicit evidence, never a quartile or journal name',()=>{
 const journal={kind:'journal',evaluations:[{system:'jcr',value:'Q1',status:'verified'}]};
 assert.equal(C.indexingStatus(journal),'pending');
 assert.equal(C.indexingStatus({...journal,indexing:{value:'SCIE',status:'pending'}}),'pending');
 assert.equal(C.indexingStatus({...journal,indexing:{value:'ESCI',status:'verified'}}),'ESCI');
 assert.equal(C.indexingStatus({kind:'conference',indexing:{value:'SCIE',status:'verified'}}),'not-applicable');
});
test('SCI-only selection excludes ESCI and pending journals and combines with topics',()=>{
 const results=C.filterVenues(data.venues,{venueKind:'journal',index:'SCIE',topics:['mimo'],grade:'jcr:Q1'});
 assert(results.some(v=>v.id==='twc'));assert(!results.some(v=>v.id==='ojcoms'));assert(results.every(v=>C.indexingStatus(v)==='SCIE'));
 const pending=C.filterVenues(data.venues,{venueKind:'journal',index:'pending'});
 assert(pending.every(v=>['pending','unresolved'].includes(v.indexing.status)));
});

test('CCFDDL style rank selection uses OR within a system and AND across systems',()=>{
 const sample={evaluations:[{system:'ccf',status:'verified',value:'A'},{system:'core',status:'verified',value:'B'}]};
 assert(C.evaluationMatches(sample,['ccf:A','ccf:B','core:B']));
 assert(!C.evaluationMatches(sample,['ccf:A','core:A','core:C']));
 assert(C.evaluationMatches(sample,[]));
 assert.deepEqual(C.cleanGrades(['ccf:A','ccf:A','core:B','jcr:Q1','ccf:X','ccf:A:extra'],'conference'),['ccf:A','core:B']);
});
test('reviewed absence is distinct from uncertainty and never becomes a low rank',()=>{
 const sample={evaluations:[{system:'ccf',status:'unlisted',value:null},{system:'core',status:'unresolved',value:null}]};
 assert(C.evaluationMatches(sample,['ccf:N']));assert(!C.evaluationMatches(sample,['core:N']));
 assert(!C.evaluationMatches(sample,['ccf:C']));assert(C.evaluationMatches(sample,'pending'));
});
test('historical reference entries are opt in while existing favorites remain accessible',()=>{
 const sample={id:'old',kind:'conference',short:'Old',nameEn:'Old',areas:['wireless'],catalogScope:'archive'};
 assert.equal(C.filterVenues([sample],{}).length,0);
 assert.equal(C.filterVenues([sample],{includeArchived:true}).length,1);
 assert.equal(C.filterVenues([sample],{favoriteOnly:true,favorites:['venue:old']}).length,1);
 const call={...base,venueId:'old'};
 assert.equal(C.filterCalls([call],[sample],{},NOW).length,0);
 assert.equal(C.filterCalls([call],[sample],{favoriteOnly:true,favorites:['call:sample-call']},NOW).length,1);
});
test('dated indexing transcripts preserve provenance without inferring SCI from JCR',()=>{
 assert.equal(C.indexingStatus({kind:'journal',indexing:{status:'reported',value:'SCIE'}}),'SCIE');
 assert.equal(C.indexingStatus({kind:'journal',indexing:{status:'unlisted',value:null}}),'unlisted');
 assert.equal(C.indexingStatus({kind:'journal',indexing:{status:'unresolved',value:null}}),'pending');
});

test('series cards select the next actual main-conference deadline and exclude workshops',()=>{
 const v={id:'sample',kind:'conference'};
 const make=(id,date,kind='conference')=>({...base,id,kind,nodes:[{...base.nodes[0],date}]});
 const calls=[make('old','2026-10-10'),make('next','2026-11-10'),make('workshop','2026-10-20','workshop'),make('later','2026-12-10')];
 assert.equal(C.venueActivity(v,calls,NOW).id,'next');
 assert.equal(C.venueActivity(v,[calls[0]],NOW).id,'old');
 assert.equal(C.venueActivity(v,[],NOW),null);
});
test('an available later round precedes an earlier round whose abstract registration has closed',()=>{
 const v={id:'sample',kind:'conference'};
 const restricted={...base,id:'restricted',kind:'conference',nodes:[{id:'abstract',type:'abstract',precision:'date',date:'2026-10-10'},{...base.nodes[0],requires:['abstract']}]};
 const open={...base,id:'open',kind:'conference',nodes:[{...base.nodes[0],date:'2026-11-10'}]};
 assert.equal(C.venueActivity(v,[restricted,open],NOW).id,'open');
});
test('undated placeholders can be hidden without hiding followed entries or dated calls',()=>{
 const pending={...base,id:'pending',kind:'conference',verification:'pending',nodes:[]};
 assert.deepEqual(C.filterCalls([base,pending],[venue],{showUndated:false},NOW).map(c=>c.id),['sample-call']);
 assert.equal(C.filterCalls([pending],[venue],{showUndated:false,favoriteOnly:true,favorites:['call:pending']},NOW).length,1);
});
test('placeholder favorites migrate to a stable year-specific edition without accepting arbitrary aliases',()=>{
 const d={calls:[{id:'sample-2027'}],venues:[],callAliases:{'sample-latest':'sample-2027','unsafe':'not-present'}};
 assert.deepEqual(C.cleanFavorites({version:1,items:['call:sample-latest','call:sample-2027','call:unsafe']},d),['call:sample-2027']);
});

test('SCI attribute searches equal explicit SCIE filters and never match ESCI by substring',()=>{
  const expected=C.filterVenues(data.venues,{venueKind:'journal',index:'SCIE'}).map(v=>v.id).sort();
  assert.deepEqual(C.filterVenues(data.venues,{venueKind:'journal',query:'SCI论文'}).map(v=>v.id).sort(),expected);
  assert.deepEqual(C.parseVenueQuery('ESCI').indexes,['ESCI']);
  assert(C.filterVenues(data.venues,{query:'SCI'}).every(v=>C.indexingStatus(v)==='SCIE'));
});
test('Chinese quartiles and JCR quartiles are parsed into separate evidence-backed systems',()=>{
  const parsed=C.parseVenueQuery('SCI一区 无线');
  assert.deepEqual(parsed.indexes,['SCIE']);assert.deepEqual(parsed.grades,['cas:1']);assert.equal(parsed.text,'无线');
  assert.deepEqual(C.parseVenueQuery('SCI JCR Q1').grades,['jcr:Q1']);
  const explicit=C.filterVenues(data.venues,{index:'SCIE',grades:['cas:1'],query:'无线',taxonomy:data.topics}).map(v=>v.id).sort();
  assert(explicit.length);assert.deepEqual(C.filterVenues(data.venues,{query:'SCI一区 无线',taxonomy:data.topics}).map(v=>v.id).sort(),explicit);
});
test('index keywords cannot corrupt ordinary publication names or CCF rating values',()=>{
  assert.equal(C.parseVenueQuery('IEEE Transactions on Communications').text,'IEEE Transactions on Communications');
  assert.deepEqual(C.parseVenueQuery('ICORE A*').grades,['core:A*']);
  assert.deepEqual(C.parseVenueQuery('CCF A').grades,['ccf:A']);
  assert(C.filterVenues(data.venues,{query:'IEEE Transactions on Communications'}).some(v=>v.id==='tcom'));
});
test('other index filters require an explicit verified index record',()=>{
  const rows=[{id:'good',kind:'journal',short:'good',areas:[],otherIndexes:[{value:'EI',status:'verified'}]},{id:'unknown',kind:'journal',short:'unknown',areas:[],otherIndexes:[{value:'EI',status:'pending'}]}];
  assert.deepEqual(C.filterVenues(rows,{index:'EI'}).map(v=>v.id),['good']);
  assert.deepEqual(C.filterVenues(rows,{query:'EI'}).map(v=>v.id),['good']);
});
test('deadline index filters select journal calls and preserve their precise subject filters',()=>{
  const rows=C.filterCalls(data.calls,data.venues,{index:'SCIE',grades:['cas:1'],showPast:true,taxonomy:data.topics},NOW);
  assert(rows.length);assert(rows.every(c=>{const v=data.venues.find(v=>v.id===c.venueId);return v.kind==='journal'&&C.indexMatches(v,'SCIE')&&C.evaluationMatches(v,'cas:1');}));
  assert.deepEqual(C.filterCalls(data.calls,data.venues,{query:'SCI 一区',showPast:true},NOW).map(c=>c.id),rows.map(c=>c.id));
});
test('conference grade searches and filters do not assign parent ranks to attached workshops or demos',()=>{
  const ranked={...venue,kind:'conference',evaluations:[{system:'ccf',value:'A',status:'verified'}]};
  const rows=[{...base,kind:'conference'},{...base,id:'workshop',kind:'workshop'},{...base,id:'demo',kind:'conference',submissionCategory:'demo'}];
  assert.deepEqual(C.filterCalls(rows,[ranked],{query:'CCF A'},NOW).map(c=>c.id),['sample-call']);
  assert.deepEqual(C.filterCalls(rows,[ranked],{grades:['ccf:A']},NOW).map(c=>c.id),['sample-call']);
});

test('Chinese core indexes remain independent overlapping evidence-backed attributes',()=>{
  const indexed={id:'cn-core',kind:'journal',short:'测试中文刊',areas:[],indexing:{value:'SCIE',status:'verified'},otherIndexes:[{value:'北大核心',status:'verified'},{value:'CSTPCD',status:'verified'},{value:'CSCD',status:'verified'}]};
  const unknown={id:'unknown-cn-core',kind:'journal',short:'未知',areas:[],otherIndexes:[{value:'北大核心',status:'pending'}]};
  assert(C.indexMatches(indexed,'SCIE'));assert(C.indexMatches(indexed,'北大核心'));assert(C.indexMatches(indexed,'CSTPCD'));assert(C.indexMatches(indexed,'CSCD'));
  assert(!C.indexMatches(unknown,'北大核心'));
  assert.deepEqual(C.filterVenues([indexed,unknown],{query:'中文核心'}).map(v=>v.id),['cn-core']);
  assert.deepEqual(C.parseVenueQuery('科技核心').indexes,['CSTPCD']);
});
