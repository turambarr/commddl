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

test('date extraction keeps abstract, paper, notification, and final nodes distinct',()=>{
 const call={id:'multi-round',venueId:'venue',nodes:[{id:'abstract',type:'abstract',date:'2027-01-01'},{id:'paper',type:'paper',primary:true,date:'2027-01-15'},{id:'decision',type:'decision',date:'2027-02-01'},{id:'final',type:'final',date:'2027-03-01'}]};
 const result=dateChanges(call,[{heading:'Important Dates',category:'important-dates',sourceUrl:'https://example.org/cfp',blocks:[{type:'list',items:[{text:'Abstract submission deadline: Jan 8, 2027'},{text:'Full paper submission deadline: Jan 22, 2027'},{text:'Notification of acceptance: Feb 8, 2027'},{text:'Camera-ready deadline: Mar 8, 2027'}]}]}]);
 assert.deepEqual(result.map(change=>[change.nodeId,change.nextDate]),[['abstract','2027-01-08'],['paper','2027-01-22'],['decision','2027-02-08'],['final','2027-03-08']]);
});

test('conflicting extension dates do not select the first displayed date',()=>{
 const call={id:'multi-round',venueId:'venue',nodes:[{id:'paper',type:'paper',primary:true,date:'2027-01-15'}]};
 const result=dateChanges(call,[{heading:'Important Dates',category:'important-dates',sourceUrl:'https://example.org/cfp',blocks:[{type:'paragraph',text:'Paper submission was Jan 10, 2027 and has been extended to Jan 22, 2027.'}]}]);assert.deepEqual(result,[]);
});

test('time-bearing source text is not silently reduced to date precision',()=>{
 const call={id:'instant-call',venueId:'venue',nodes:[{id:'paper',type:'paper',primary:true,precision:'instant',instant:'2027-01-15T23:59:00-12:00',date:null,timezone:'UTC-12'}]};
 assert.deepEqual(dateChanges(call,[{heading:'Important Dates',category:'important-dates',sourceUrl:'https://example.org/cfp',blocks:[{type:'paragraph',text:'Full paper deadline: Jan 22, 2027 at 23:59 AoE'}]}]),[]);
});

test('date-only evidence cannot erase a previously known exact instant',()=>{
 const call={id:'instant-call',sourceUrl:'https://example.org',nodes:[{id:'paper',type:'paper',precision:'instant',date:null,instant:'2027-01-15T23:59:00-12:00',timezone:'UTC-12',revision:2}]};
 assert.throws(()=>applyNodeDateChange(call,{nodeId:'paper',nextDate:'2027-01-22',precision:'date'},{action:'accept'},'2026-10-20T12:00:00.000Z'),/含精确时刻/);
 assert.equal(call.nodes[0].instant,'2027-01-15T23:59:00-12:00');assert.equal(call.nodes[0].revision,2);
});

test('an explicitly evidenced exact instant retains its precision and timezone in history',()=>{
 const call={id:'instant-call',sourceUrl:'https://example.org',nodes:[{id:'paper',type:'paper',precision:'instant',date:null,instant:'2027-01-15T23:59:00-12:00',timezone:'UTC-12',revision:2}],history:[]};
 applyNodeDateChange(call,{nodeId:'paper',nextDate:'2027-01-22',precision:'instant',instant:'2027-01-22T23:59:00-12:00',timezone:'UTC-12',excerpt:'Paper deadline Jan 22, 2027, 23:59 AoE'},{action:'accept'},'2026-10-20T12:00:00.000Z');
 assert.equal(call.nodes[0].precision,'instant');assert.equal(call.nodes[0].date,null);assert.equal(call.nodes[0].timezone,'UTC-12');assert.equal(call.history[0].toPrecision,'instant');assert.equal(call.history[0].to,'2027-01-22T23:59:00-12:00');
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
