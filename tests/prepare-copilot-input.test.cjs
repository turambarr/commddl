const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {prepare}=require('../scripts/updates/prepare-copilot-input.cjs');

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
