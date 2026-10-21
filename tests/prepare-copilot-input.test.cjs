const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {prepare}=require('../scripts/updates/prepare-copilot-input.cjs');
const {discoveredLinks}=require('../scripts/updates/collector.cjs');

test('Copilot input embeds collected JSON as bounded plain text',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'commddl-copilot-input-'));
 try{
  const prompt=path.join(dir,'prompt.md'),source=path.join(dir,'source.json'),out=path.join(dir,'input.txt');
  fs.writeFileSync(prompt,'Use evidence only.\n'.repeat(300));fs.writeFileSync(source,JSON.stringify({items:[{entity:{id:'ofc-main'},pages:[]}]}));
  const result=prepare(['--prompt',prompt,'--source',source,'--out',out,'--max-bytes','8192']),text=fs.readFileSync(out,'utf8');
  assert.equal(result.entities,1);assert.match(text,/Use evidence only/);assert.match(text,/<UNTRUSTED_OFFICIAL_SOURCE_JSON>/);assert.match(text,/ofc-main/);
  assert.throws(()=>prepare(['--prompt',prompt,'--source',source,'--out',out,'--max-bytes','1024']),/超出限制/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Copilot receives topical official sections only, with ancestor headings as context',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'commddl-copilot-focus-'));
 try{
  const prompt=path.join(dir,'prompt.md'),source=path.join(dir,'source.json'),out=path.join(dir,'input.txt');
  const sections=[
   {sectionId:'root',heading:'General Information',headingLevel:1,blocks:[{type:'paragraph',text:'Welcome to the conference and enjoy our media program.'}]},
   {sectionId:'topic',parentId:'root',heading:'Topic Categories',headingLevel:2,blocks:[{type:'list',items:[{text:'Optical communications and networking.'}]}]},
   {sectionId:'press',parentId:'root',heading:'Present Your Research',headingLevel:2,blocks:[{type:'paragraph',text:'Receive worldwide exposure at the event.'}]},
   {sectionId:'metadata',heading:'General Information',headingLevel:1,blocks:[{type:'paragraph',text:'The journal is published by Example Society. ISSN 1234-5678.'}]}
  ];
  fs.writeFileSync(prompt,'Use focused official evidence.');fs.writeFileSync(source,JSON.stringify({items:[{entity:{id:'ofc-main'},pages:[{url:'https://example.org/submit',sections,headings:sections.map(section=>({heading:section.heading,level:section.headingLevel}))}]}]}));
  prepare(['--prompt',prompt,'--source',source,'--out',out]);const input=fs.readFileSync(out,'utf8'),json=JSON.parse(input.match(/<UNTRUSTED_OFFICIAL_SOURCE_JSON>\n([\s\S]*?)\n<\/UNTRUSTED_OFFICIAL_SOURCE_JSON>/)[1]),kept=json.items[0].pages[0].sections;
  assert.deepEqual(kept.map(section=>section.sectionId),['root','topic','metadata']);assert.equal(kept[0].contextOnly,true);assert.deepEqual(kept[0].blocks,[]);assert.equal(kept[1].blocks[0].items[0].text,'Optical communications and networking.');assert.equal(kept[2].blocks[0].text,'The journal is published by Example Society. ISSN 1234-5678.');assert(!input.includes('Receive worldwide exposure'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('collector follows focused submission and topic links but ignores generic about, login, news, and contact pages',()=>{
 const html='<a href="/about/">About</a><a href="/submit-a-paper/topic-categories/">Topic Categories</a><a href="/account/login?returnUrl=%2Ftopics">Topics login</a><a href="/news/cfp-update">CFP news</a><a href="/contact/">Contact</a><a href="/author-timeline/">Author Timeline</a>';
 assert.deepEqual(discoveredLinks(html,'https://example.org/submit/').map(link=>link.url),['https://example.org/submit-a-paper/topic-categories/','https://example.org/author-timeline/']);
});
