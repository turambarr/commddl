const {test}=require('node:test');
const assert=require('node:assert/strict');
const {submitCandidate,restructureBatch}=require('../scripts/updates/service-client.cjs');

function candidate(){return {items:[{entity:{id:'ofc-2027-main',kind:'conference'},status:'fetched',sourceHash:'abc',pages:[],changes:[{type:'content-added',sectionId:'scope'}]}]};}
test('saved candidate remains successful and exposes retryable email status when notification fails',async()=>{
 const calls=[],logs=[],warnings=[];const result=await submitCandidate(candidate(),{callFn:async(method,path,value)=>{calls.push({method,path,value});if(path==='/internal/sources/snapshots')return {saved:1};if(path==='/internal/update-batches')return {id:'saved-batch',version:1,status:'awaiting-review'};if(path.endsWith('/notify'))throw new Error('mail unavailable');throw new Error(path);},log:value=>logs.push(value),warn:value=>warnings.push(value)});
 assert.equal(result.stored,true);assert.equal(result.notificationStatus,'incomplete');assert(calls.some(call=>call.path==='/internal/update-batches'));assert(logs.some(value=>value.includes('候选已保存')));assert(warnings.some(value=>value.includes('可重试')));
});
test('saved batch restructuring creates a version even when reminder delivery fails',async()=>{
 const calls=[];const result=await restructureBatch('saved-batch',1,{...candidate(),id:'saved-batch',copilot:{status:'validated'}},{callFn:async(method,path,value)=>{calls.push({method,path,value});if(path.endsWith('/restructured'))return {id:'saved-batch',version:2,status:'awaiting-review'};if(path.endsWith('/notify'))throw new Error('mail unavailable');throw new Error(path);}});
 assert.equal(result.version,2);assert.equal(calls[0].path,'/internal/update-batches/saved-batch/restructured');assert.equal(calls[0].value.expectedVersion,1);
});

test('duplicate content does not create another candidate or send another reminder',async()=>{let notifyCalls=0;const result=await submitCandidate(candidate(),{callFn:async(method,path)=>{if(path==='/internal/sources/snapshots')return {saved:1};if(path==='/internal/update-batches')return {id:'existing',version:3,status:'awaiting-review',duplicate:true,notification_status:'incomplete'};if(path.endsWith('/notify'))notifyCalls++;throw new Error(path);},log:()=>{},warn:()=>{}});assert.equal(result.duplicate,true);assert.equal(result.id,'existing');assert.equal(notifyCalls,0);});

test('Copilot failure fallback keeps raw differences audit-only and retains date nodes',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'commddl-copilot-fallback-'));
 try{const source=path.join(dir,'source.json'),out=path.join(dir,'out.json');fs.writeFileSync(source,JSON.stringify({items:[{changes:[{type:'content-changed',sectionId:'nav',heading:'Login'},{type:'node-date-changed',nodeId:'deadline'}]}]}));const result=spawnSync(process.execPath,['scripts/updates/mark-copilot-failure.cjs','--source',source,'--out',out],{cwd:path.join(__dirname,'..')});assert.equal(result.status,0);const item=JSON.parse(fs.readFileSync(out,'utf8')).items[0];assert.equal(item.structuredCandidate.status,'insufficient-evidence');assert.equal(item.sourceChanges.length,2);assert.deepEqual(item.changes,[{type:'node-date-changed',nodeId:'deadline'}]);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
