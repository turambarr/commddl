const {test}=require('node:test');
const assert=require('node:assert/strict');
const {extractDocument}=require('../scripts/updates/extract.cjs');
const {compareSections}=require('../scripts/updates/compare.cjs');
const {makePublicCatalog}=require('../scripts/public-catalog.cjs');
const {summarizeRun}=require('../scripts/updates/collector.cjs');
const maintenance=require('../scripts/catalog.cjs').loadCatalog();

const html=`<!doctype html><html><body><nav><h2>Topics of interest</h2><p>navigation noise</p></nav><main><h1 id="journal">Journal</h1><h2 id="general">GENERAL INFORMATION</h2><p>Official summary for this journal. <a href="/scope">Scope details</a></p><h3>Scope</h3><p>Detailed scope.</p><h3>Scope</h3><ol><li>First topic<ul><li>Nested topic<ul><li>Third-level topic</li></ul></li></ul></li><li>Second topic</li></ol><h2>Submission Guidelines</h2><p>Submit papers through the official portal.</p><table><tr><th>Type</th><th>Length</th></tr><tr><td>Regular</td><td>10 pages</td></tr></table><a href="/submit">Submission portal</a></main></body></html>`;

test('extractor keeps heading tree, repeated headings and typed content while dropping navigation',()=>{
 const result=extractDocument(html.replace('<body>','<body><header><h1>Navigation title</h1><nav><a href="/menu">Menu</a></nav></header>'),'https://example.org/journal');
 assert.equal(result.sections.length,4);
 const [general,scope1,scope2,submission]=result.sections;
 assert.equal(general.heading,'GENERAL INFORMATION');assert.equal(general.category,'general-information');
 assert.equal(scope1.parentId,general.sectionId);assert.equal(scope2.heading,'Scope');assert.notEqual(scope1.sectionId,scope2.sectionId);
 assert(scope2.blocks.some(block=>block.type==='list'&&block.items[0].items[0].items[0].text==='Third-level topic'));
 assert(general.blocks.some(block=>block.type==='links'&&block.items[0].href==='https://example.org/scope'));
 assert.equal(submission.heading,'Submission Guidelines');assert(submission.blocks.some(block=>block.type==='table'));
 assert(!JSON.stringify(result.sections).includes('navigation noise'));
});

test('stable anchors tolerate body edits and diff meaningful changes only',()=>{
 const old=extractDocument(html,'https://example.org/journal').sections;
 const changed=extractDocument(html.replace('Official summary for this journal.','Updated official summary.'),'https://example.org/journal').sections;
 const changes=compareSections({published:old,lastFetched:old,candidate:changed});
 assert.equal(changes.length,1);assert.equal(changes[0].type,'content-changed');assert.equal(changes[0].conflict,false);
 const conflict=compareSections({published:old.map((s,i)=>i===0?{...s,blocks:[{type:'paragraph',text:'Human edited copy.'}]}:s),lastFetched:old,candidate:changed});
 assert.equal(conflict[0].conflict,true);
});

test('empty or incomplete candidate never produces automatic removals',()=>{
 const old=extractDocument(html,'https://example.org/journal').sections;
 assert.equal(compareSections({published:old,lastFetched:old,candidate:[],allowRemovals:false}).length,0);
 assert(compareSections({published:old,lastFetched:old,candidate:[],allowRemovals:true}).every(change=>change.type==='possibly-removed'&&change.requiresReview));
});

test('an unchanged published fact is not duplicated when its translated heading changes',()=>{
 const published=[{sectionId:'old-heading-id',heading:'Research Topics',displayHeadingZh:'研究主题',category:'topics',sourceUrl:'https://example.org/topics',blocks:[{type:'paragraph',text:'Official topic list: optical networks and photonics.'}],evidence:[{sourceUrl:'https://example.org/topics',quote:'Official topic list: optical networks and photonics.'}]}];
 const candidate=[{...published[0],sectionId:'new-heading-id',heading:'Related Topics',displayHeadingZh:'相关主题'}];
 assert.deepEqual(compareSections({published,lastFetched:[],candidate}),[]);
});

test('conflicting content is retained as a candidate instead of silently deduplicated',()=>{
 const published=[{sectionId:'published-id',heading:'Important Dates',sourceUrl:'https://example.org/dates',blocks:[{type:'paragraph',text:'Paper deadline: 2027-09-01.'}]}];
 const baseline=[{sectionId:'candidate-id',heading:'Submission Deadline',sourceUrl:'https://example.org/dates',blocks:[{type:'paragraph',text:'Paper deadline: 2027-09-08.'}]}];
 const changes=compareSections({published,lastFetched:[],candidate:baseline});assert.equal(changes.length,1);assert.equal(changes[0].type,'added');
});

test('run coverage labels a manual sample without implying whole-catalog coverage',()=>{
 const run=summarizeRun([{entity:{id:'ofc-2027-main'},status:'fetched',changes:[],reusedEvidencePages:0}],{mode:'manual-sample',requestedCount:1,requestedIds:['ofc-2027-main']});
 assert.equal(run.coverageScope,'explicitly requested sample only');assert.deepEqual(run.counts,{requested:1,checked:1,changed:0,noChange:1,failed:0,partial:0,notChecked:0,reusedEvidence:0});
});

test('run coverage separates failures, partial results, reuse, and uncollected scope',()=>{
 const run=summarizeRun([{status:'partial',changes:[{type:'content-changed'}],reusedEvidencePages:2},{status:'failed',changes:[]}],{mode:'due-source-scan',requestedCount:4,requestedIds:['a','b','c','d']});
 assert.equal(run.coverageScope,'currently due registered sources only');assert.deepEqual(run.counts,{requested:4,checked:1,changed:1,noChange:0,failed:1,partial:1,notChecked:2,reusedEvidence:1});
});

test('published official sections keep only reviewed content and omit collector metadata',()=>{
 const data=structuredClone(maintenance),venue=data.venues[0];
 venue.officialSections=[{sectionId:'stable-1',heading:'Aims and Scope',headingLevel:2,order:0,category:'aims-and-scope',sourceUrl:'https://example.org/about',sourceAnchor:'scope',verifiedAt:'2026-10-20',fetchedAt:'PRIVATE_FETCH_TIME',sourceHash:'PRIVATE_HASH',extractorVersion:'PRIVATE_VERSION',blocks:[{type:'paragraph',text:'Reviewed text.'}]}];
 const pub=makePublicCatalog(data),section=pub.venues.find(item=>item.id===venue.id).officialSections[0],serialized=JSON.stringify(pub);
 assert.equal(section.blocks[0].text,'Reviewed text.');assert(!serialized.includes('PRIVATE_'));assert.equal(section.verifiedAt,undefined);
});
