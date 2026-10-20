const {test}=require('node:test');
const assert=require('node:assert/strict');
const {extractDocument}=require('../scripts/updates/extract.cjs');
const {compareSections}=require('../scripts/updates/compare.cjs');
const {makePublicCatalog}=require('../scripts/public-catalog.cjs');
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

test('published official sections keep only reviewed content and omit collector metadata',()=>{
 const data=structuredClone(maintenance),venue=data.venues[0];
 venue.officialSections=[{sectionId:'stable-1',heading:'Aims and Scope',headingLevel:2,order:0,category:'aims-and-scope',sourceUrl:'https://example.org/about',sourceAnchor:'scope',verifiedAt:'2026-10-20',fetchedAt:'PRIVATE_FETCH_TIME',sourceHash:'PRIVATE_HASH',extractorVersion:'PRIVATE_VERSION',blocks:[{type:'paragraph',text:'Reviewed text.'}]}];
 const pub=makePublicCatalog(data),section=pub.venues.find(item=>item.id===venue.id).officialSections[0],serialized=JSON.stringify(pub);
 assert.equal(section.blocks[0].text,'Reviewed text.');assert(!serialized.includes('PRIVATE_'));assert.equal(section.verifiedAt,undefined);
});
