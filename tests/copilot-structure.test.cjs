const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {loadCatalog}=require('../scripts/catalog.cjs');
const root=path.join(__dirname,'..'),script=path.join(root,'scripts/updates/merge-copilot-structure.cjs');
function run({quote='Official scope supports communication networks.',heading='Aims and Scope'}={}){
 const id=loadCatalog(root).venues[0].id,dir=fs.mkdtempSync(path.join(os.tmpdir(),'commddl-copilot-test-'));
 const source=path.join(dir,'source.json'),copilot=path.join(dir,'copilot.json'),out=path.join(dir,'out.json');
 fs.writeFileSync(source,JSON.stringify({items:[{entity:{id},changes:[],pages:[{url:'https://example.org/about',sections:[{sectionId:'parent',heading:'General Information',headingLevel:1,blocks:[{type:'paragraph',text:'Publisher information.'}]},{sectionId:'scope',parentId:'parent',heading:'Aims and Scope',headingLevel:2,sourceAnchor:'scope',blocks:[{type:'paragraph',text:'Official scope supports communication networks.'}]}]}]}]}));
 fs.writeFileSync(copilot,JSON.stringify({schemaVersion:'commddl.copilot-structure.v1',items:[{entityId:id,status:'ready',summary:'The page states the aims.',limitations:[],observations:[{category:'aims-and-scope',title:'Aims and Scope',summary:'It covers communication networks.',value:{topic:'communications'},evidence:[{sourceUrl:'https://example.org/about',heading,quote}],uncertainty:{level:'low',reason:'The text is directly stated.'}}]}]}));
 try{execFileSync(process.execPath,[script,'--source',source,'--copilot',copilot,'--out',out],{cwd:root,stdio:'pipe'});return JSON.parse(fs.readFileSync(out,'utf8'));}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('Copilot structured candidate requires exact official evidence and preserves extensible fields',()=>{
 const result=run(),item=result.items[0],change=item.changes[0];assert.equal(result.copilot.status,'validated');assert.equal(item.structuredCandidate.observations[0].value.topic,'communications');assert.equal(change.next.structuredValue.topic,'communications');assert.equal(change.next.evidence[0].quote,'Official scope supports communication networks.');assert.equal(change.next.headingLevel,2);assert.deepEqual(change.next.sourceHeadingPath,['General Information','Aims and Scope']);assert.deepEqual(change.next.uncertainty,{level:'low',reason:'The text is directly stated.'});
});
test('Copilot structure rejects fabricated quotes or headings',()=>{assert.throws(()=>run({quote:'Invented claim.'}),/引句不匹配/);assert.throws(()=>run({heading:'Invented heading'}),/引句与所列官网标题不属于同一结构分段/);});
