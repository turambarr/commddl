const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync,execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');

test('formal YAML apply rejects accepted legacy raw differences',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'commddl-raw-apply-'));
 try{
  const baseRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const batchPath=path.join(temp,'batch.json'),decisionsPath=path.join(temp,'decisions.json');
  fs.writeFileSync(batchPath,JSON.stringify({baseRevision,items:[{entity:{id:'aaai',kind:'conference'},changes:[{sectionId:'raw-login-promo',type:'content-added',heading:'Log in with Link',sourceUrl:'https://example.org',next:{sectionId:'raw-login-promo',heading:'Log in with Link',sourceUrl:'https://example.org',blocks:[{type:'paragraph',text:'Create account or sign in.'}]}}]}]}));
  fs.writeFileSync(decisionsPath,JSON.stringify({aaai:{'raw-login-promo':{action:'accept'}}}));
  const result=spawnSync(process.execPath,['scripts/updates/apply.cjs','--batch',batchPath,'--decisions',decisionsPath],{cwd:root,encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/未经 Copilot 证据校验的原始差异不能应用/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
