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
  const rows=C.filterVenues(data.venues,{venueKind:'conference',catalogStatus:'historical-only',query:'NIPS'});
  assert(rows.some(v=>v.id==='neurips'));assert(rows.every(v=>v.catalogStatus==='historical-only'));
});
