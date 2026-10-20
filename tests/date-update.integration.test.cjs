const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../assets/core.js');
const catalog=require('../scripts/catalog.cjs').loadCatalog();
const {applyNodeDateChange}=require('../scripts/updates/apply.cjs');
const {dateChanges,normalizeBaselines,retryDelayHours}=require('../scripts/updates/collector.cjs');
const {compareSections}=require('../scripts/updates/compare.cjs');

test('official deadline candidate updates an existing call node, revision, history and stable calendar UID',()=>{
 const call=structuredClone(catalog.calls.find(item=>item.id==='mobicom-2027-winter'));
 const node=call.nodes.find(item=>item.id==='paper');node.date='2027-09-15';node.precision='date';node.revision=0;
 const candidate=dateChanges(call,[{heading:'Important Dates',category:'important-dates',sourceUrl:call.sourceUrl,blocks:[{type:'paragraph',text:'Paper submission deadline: Sep 22, 2027'}]}]);
 assert.equal(candidate.length,1);assert.equal(candidate[0].type,'node-date-changed');assert.equal(candidate[0].nextDate,'2027-09-22');
 const uidBefore=C.createICS([call],catalog.venues,{includeDateOnly:true});
 assert.equal(applyNodeDateChange(call,candidate[0],{action:'edit',date:'2027-09-25'},'2026-10-20T12:00:00.000Z'),true);
 const uidAfter=C.createICS([call],catalog.venues,{includeDateOnly:true});
 assert.equal(call.nodes.find(item=>item.id==='paper').date,'2027-09-25');assert.equal(call.nodes.find(item=>item.id==='paper').revision,1);assert.equal(call.history.at(-1).from,'2027-09-15');assert.equal(call.history.at(-1).to,'2027-09-25');assert.equal(call.updatedAt,'2026-10-20T12:00:00.000Z');
 assert.match(uidBefore,/UID:mobicom-2027-winter-paper@commddl/);assert.match(uidAfter,/UID:mobicom-2027-winter-paper@commddl/);assert.match(uidAfter,/SEQUENCE:1/);
 assert.throws(()=>applyNodeDateChange(call,candidate[0],{action:'edit',date:'2027-02-31'}),/有效的 YYYY-MM-DD/);
});

test('manual collector accepts API-wrapped baselines and legacy flat baseline maps',()=>{
 const stored={pages:[{requestedUrl:'https://example.org',sections:[{sectionId:'stable'}]}]};
 assert.deepEqual(normalizeBaselines({ids:['mobicom-2027-winter'],baselines:{'mobicom-2027-winter':stored},snapshots:[]}),{'mobicom-2027-winter':stored});
 assert.deepEqual(normalizeBaselines({'mobicom-2027-winter':stored}),{'mobicom-2027-winter':stored});
});

test('failure retry delay backs off to 48 hours and honors Retry-After',()=>{
 assert.equal(retryDelayHours(0),1);assert.equal(retryDelayHours(1),2);assert.equal(retryDelayHours(5),32);assert.equal(retryDelayHours(9),48);assert.equal(retryDelayHours(1,6*3600),6);
});

test('missing or stale baselines never turn an incomplete fetch into automatic removals',()=>{
 const published=[{sectionId:'old-1',heading:'A'},{sectionId:'old-2',heading:'B'}];
 assert.deepEqual(compareSections({published,lastFetched:[],candidate:[],allowRemovals:false}),[]);
 assert.deepEqual(compareSections({published,lastFetched:published,candidate:[],allowRemovals:false}),[]);
});
