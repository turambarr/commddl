const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const crypto=require('node:crypto');

const workerPromise=import('../services/admin/src/worker.js');
const migrations=path.join(__dirname,'../services/admin/migrations');
const owner='turambarr',repo='commddl',project='turambarr/commddl',origin='https://admin.test';
function d1(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of fs.readdirSync(migrations).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(path.join(migrations,file),'utf8'));
 return {sqlite,prepare(sql){let values=[];return {bind(...args){values=args;return this},run(){return sqlite.prepare(sql).run(...values)},first(){return sqlite.prepare(sql).get(...values)||null},all(){return {results:sqlite.prepare(sql).all(...values)}},sql,values}},async batch(statements){return statements.map(statement=>statement.run())}};
}
function candidate(){return {items:[{entity:{id:'test-call',kind:'conference'},changes:[{sectionId:'sec-1',type:'content-changed',old:{heading:'Scope'},next:{sectionId:'sec-1',heading:'Scope',sourceUrl:'https://example.org',blocks:[{type:'paragraph',text:'Official text'}]}}]}]};}
async function setup(t,{status='awaiting-review',publish=false,final=false,login='test-maintainer',permission='write',maintainers='test-maintainer',reviewOverride=null}={}){
 const DB=d1(),time=new Date().toISOString(),payload=candidate(),sha='a'.repeat(40),calls=[];
 DB.prepare('INSERT INTO projects(id,github_owner,github_repo,created_at) VALUES(?,?,?,?)').bind(project,owner,repo,time).run();
 DB.prepare('INSERT INTO update_batches(id,project_id,version,status,base_sha,content_hash,payload_json,decisions_json,final_sha,pr_number,pr_url,notification_version,notification_status,notification_sha,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('batch-1',project,1,status,'b'.repeat(40),'hash',JSON.stringify(payload),'{}',final?sha:null,final?17:null,final?'https://github.com/turambarr/commddl/pull/17':null,1,'complete',final?sha:null,time,time).run();
 DB.prepare('INSERT INTO source_snapshots(project_id,entity_id,pending_batch_id,updated_at) VALUES(?,?,?,?)').bind(project,'test-call','batch-1',time).run();
 const env={DB,GITHUB_OWNER:owner,GITHUB_REPO:repo,AUTHORIZED_MAINTAINERS:maintainers,ADMIN_ORIGIN:origin,GITHUB_CLIENT_ID:'fake-client',GITHUB_CLIENT_SECRET:'fake-secret',SESSION_SECRET:'test-session-secret',INTERNAL_HMAC_SECRET:'test-internal-secret',PUBLISH_ENABLED:publish?'true':'false'};
 let currentPermission=permission;
 const originalFetch=global.fetch;
 global.fetch=async(input,options={})=>{const url=String(input);calls.push({url,options});if(url==='https://github.com/login/oauth/access_token')return Response.json({access_token:'test-token'});if(url==='https://api.github.com/user')return Response.json({login});if(url.includes('/collaborators/')&&url.endsWith('/permission'))return Response.json({permission:currentPermission});if(url.endsWith('/dispatches'))return new Response(null,{status:204});if(url.endsWith('/pulls/17'))return Response.json({head:{sha:'a'.repeat(40)},state:'open'});if(url.endsWith('/check-runs'))return Response.json({check_runs:[{name:'catalog, tests, and generated site',status:'completed',conclusion:'success'}]});if(url.endsWith('/reviews'))return Response.json(reviewOverride||{id:123,user:{login},commit_id:'a'.repeat(40),state:'APPROVED'});if(url.endsWith('/merge'))return Response.json({merged:true,sha:'a'.repeat(40)});throw new Error(`Unexpected network call ${url}`)};
 t.after(()=>{global.fetch=originalFetch;DB.sqlite.close()});
 const worker=(await workerPromise).default;
 const start=await worker.fetch(new Request(`${origin}/auth/github`),env),stateCookie=start.headers.get('set-cookie').split(';')[0],state=stateCookie.split('=')[1];
 const callback=await worker.fetch(new Request(`${origin}/auth/callback?state=${state}&code=fake`,{headers:{cookie:stateCookie}}),env),sessionCookie=callback.headers.get('set-cookie').split(';')[0];
 async function api(method,pathname,body){return worker.fetch(new Request(`${origin}${pathname}`,{method,headers:{origin,cookie:sessionCookie,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),env)}
 return {api,DB,calls,env,sha,worker,setPermission(value){currentPermission=value}};
}
async function internal({worker,env},pathname,value){const body=JSON.stringify(value),timestamp=String(Date.now()),requestId=crypto.randomUUID(),bodyHash=crypto.createHash('sha256').update(body).digest('hex'),signature=crypto.createHmac('sha256',env.INTERNAL_HMAC_SECRET).update(`${timestamp}.${requestId}.${bodyHash}`).digest('hex');return worker.fetch(new Request(`https://internal.test${pathname}`,{method:'POST',headers:{'content-type':'application/json','x-commddl-timestamp':timestamp,'x-commddl-request-id':requestId,'x-commddl-signature':signature},body}),env);}

test('review API stores an accepted choice and dispatches its version',async t=>{
 const {api,DB,calls}=await setup(t),response=await api('PUT','/api/batches/batch-1/decisions',{decisions:{'test-call':{'sec-1':{action:'accept'}}}}),body=await response.json();
 assert.equal(response.status,201);assert.equal(body.status,'building-pr');
 const row=DB.prepare('SELECT decisions_json,status FROM update_batches WHERE id=? AND version=2').bind('batch-1').first();assert.equal(row.status,'building-pr');assert.deepEqual(JSON.parse(row.decisions_json),{'test-call':{'sec-1':{action:'accept'}}});assert(calls.some(call=>call.url.endsWith('/dispatches')));
});

test('explicitly authorized collaborator with live write permission can use the API',async t=>{
 const {api,calls}=await setup(t),response=await api('GET','/api/session');assert.equal(response.status,200);assert(calls.some(call=>call.url.endsWith('/collaborators/test-maintainer/permission')));
});

test('a write collaborator outside the owner-maintained list is denied',async t=>{
 const {api}=await setup(t,{login:'outsider',permission:'write',maintainers:'test-maintainer'}),response=await api('GET','/api/session');assert.equal(response.status,403);assert.equal((await response.json()).error,'maintainer-not-authorized');
});

test('revoked repository write access takes effect on the next request',async t=>{
 const context=await setup(t),first=await context.api('GET','/api/session');assert.equal(first.status,200);context.setPermission('read');const second=await context.api('GET','/api/session');assert.equal(second.status,403);assert.equal((await second.json()).error,'repository-write-access-required');
});

test('removing a login from the owner-managed list immediately revokes application access',async t=>{
 const context=await setup(t),first=await context.api('GET','/api/session');assert.equal(first.status,200);context.env.AUTHORIZED_MAINTAINERS='';const second=await context.api('GET','/api/session');assert.equal(second.status,403);assert.equal((await second.json()).error,'maintainer-not-authorized');
});

test('repository owner retains access through verified GitHub admin permission',async t=>{
 const {api}=await setup(t,{login:owner,permission:'admin',maintainers:''}),response=await api('GET','/api/session');assert.equal(response.status,200);
});

test('review API stores a structured correction and dispatches it',async t=>{
 const {api,DB}=await setup(t),section={sectionId:'sec-1',heading:'Scope',sourceUrl:'https://example.org',blocks:[{type:'paragraph',text:'Corrected official text'}]},response=await api('PUT','/api/batches/batch-1/decisions',{decisions:{'test-call':{'sec-1':{action:'edit',section}}}});
 assert.equal(response.status,201);const row=DB.prepare('SELECT decisions_json FROM update_batches WHERE id=? AND version=2').bind('batch-1').first();assert.equal(JSON.parse(row.decisions_json)['test-call']['sec-1'].section.blocks[0].text,'Corrected official text');
});

test('review API accepts a corrected calendar date and rejects impossible dates',async t=>{
 const {api,DB}=await setup(t),payload={items:[{entity:{id:'test-call',kind:'conference'},changes:[{sectionId:'date:test-call:paper',type:'node-date-changed',nodeId:'paper',oldDate:'2027-09-15',nextDate:'2027-09-22',sourceUrl:'https://example.org'}]}]};
 DB.prepare('UPDATE update_batches SET payload_json=? WHERE id=? AND version=1').bind(JSON.stringify(payload),'batch-1').run();
 const invalid=await api('PUT','/api/batches/batch-1/decisions',{decisions:{'test-call':{'date:test-call:paper':{action:'edit',date:'2027-02-31'}}}});assert.equal(invalid.status,400);
 const valid=await api('PUT','/api/batches/batch-1/decisions',{decisions:{'test-call':{'date:test-call:paper':{action:'edit',date:'2027-09-25'}}}});assert.equal(valid.status,201);const row=DB.prepare('SELECT decisions_json FROM update_batches WHERE id=? AND version=2').bind('batch-1').first();assert.equal(JSON.parse(row.decisions_json)['test-call']['date:test-call:paper'].date,'2027-09-25');
});

test('review API records an individual rejection alongside accepted choices',async t=>{
 const {api,DB}=await setup(t);const payload=candidate();payload.items[0].changes.push({...payload.items[0].changes[0],sectionId:'sec-2'});DB.prepare('UPDATE update_batches SET payload_json=? WHERE id=? AND version=1').bind(JSON.stringify(payload),'batch-1').run();
 const response=await api('PUT','/api/batches/batch-1/decisions',{decisions:{'test-call':{'sec-1':{action:'accept'},'sec-2':{action:'reject'}}}});assert.equal(response.status,201);const row=DB.prepare('SELECT decisions_json FROM update_batches WHERE id=? AND version=2').bind('batch-1').first();assert.equal(JSON.parse(row.decisions_json)['test-call']['sec-2'].action,'reject');
});

test('all-rejected review is recorded, unlocks its source, and does not dispatch a PR',async t=>{
 const {api,DB,calls}=await setup(t),response=await api('PUT','/api/batches/batch-1/decisions',{decisions:{'test-call':{'sec-1':{action:'reject'}}}}),body=await response.json();
 assert.equal(response.status,201);assert.equal(body.status,'rejected');assert(!calls.some(call=>call.url.endsWith('/dispatches')));
 assert.equal(DB.prepare('SELECT status FROM update_batches WHERE id=? AND version=2').bind('batch-1').first().status,'rejected');assert.equal(DB.prepare('SELECT pending_batch_id FROM source_snapshots WHERE entity_id=?').bind('test-call').first().pending_batch_id,null);
});

test('failed PR build releases the source, resets its stale baseline, and allows the same candidate as a new version',async t=>{
 const context=await setup(t,{status:'building-pr'}),{DB}=context;
 DB.prepare('UPDATE source_snapshots SET last_fetched_json=?,last_fetched_hash=? WHERE entity_id=?').bind('{"pages":[{"sections":[]}]}','stale-hash','test-call').run();
 const failed=await internal(context,'/internal/update-batches/batch-1/failed',{reason:'base-sha-changed'});assert.equal(failed.status,200);
 const snapshot=DB.prepare('SELECT pending_batch_id,last_fetched_json,failure_message FROM source_snapshots WHERE entity_id=?').bind('test-call').first();assert.equal(snapshot.pending_batch_id,null);assert.equal(snapshot.last_fetched_json,null);assert.equal(snapshot.failure_message,'review-batch-build-failed');
 const payload=candidate(),resubmitted=await internal(context,'/internal/update-batches',{id:'batch-1',contentHash:'hash',baseRevision:'c'.repeat(40),status:'fetched',items:payload.items.map(item=>({...item,status:'fetched',pages:[]}))}),body=await resubmitted.json();assert.equal(resubmitted.status,201);assert.equal(body.status,'notice-incomplete');assert.equal(body.version,2);
});

test('publish API is closed by default and requires the configured required check when enabled',async t=>{
 const closed=await setup(t,{publish:false,final:true}),blocked=await closed.api('POST','/api/batches/batch-1/approve-publish',{finalSha:'a'.repeat(40)});assert.equal(blocked.status,423);assert.equal((await blocked.json()).error,'publishing-disabled');
 const enabled=await setup(t,{publish:true,final:true}),approved=await enabled.api('POST','/api/batches/batch-1/approve-publish',{finalSha:'a'.repeat(40)});assert.equal(approved.status,200);const row=enabled.DB.prepare('SELECT status,reviewer_login,approved_sha FROM update_batches WHERE id=? AND version=1').bind('batch-1').first();assert.equal(row.status,'published');assert.equal(row.reviewer_login,'test-maintainer');assert.equal(row.approved_sha,'a'.repeat(40));
});


test('GitHub reviewer identity, approval state, and commit SHA must match before merge',async t=>{
 for(const reviewOverride of [
  {id:124,user:{login:'someone-else'},commit_id:'a'.repeat(40),state:'APPROVED'},
  {id:125,user:{login:'test-maintainer'},commit_id:'c'.repeat(40),state:'APPROVED'},
  {id:126,user:{login:'test-maintainer'},commit_id:'a'.repeat(40),state:'COMMENTED'},
 ]){
  const context=await setup(t,{publish:true,final:true,reviewOverride}),response=await context.api('POST','/api/batches/batch-1/approve-publish',{finalSha:'a'.repeat(40)});
  assert.equal(response.status,409);assert.equal((await response.json()).error,'approval-identity-or-sha-mismatch');assert(!context.calls.some(call=>call.url.endsWith('/merge')));
  const row=context.DB.prepare('SELECT status,reviewer_login,approved_sha FROM update_batches WHERE id=? AND version=1').bind('batch-1').first();assert.equal(row.status,'awaiting-review');assert.equal(row.reviewer_login,null);assert.equal(row.approved_sha,null);
 }
});

test('publish approval is bound to the final page SHA and notification SHA',async t=>{
 const stale=await setup(t,{publish:true,final:true}),staleResponse=await stale.api('POST','/api/batches/batch-1/approve-publish',{finalSha:'c'.repeat(40)});
 assert.equal(staleResponse.status,409);assert.equal((await staleResponse.json()).error,'stale-final-version');assert(!stale.calls.some(call=>call.url.endsWith('/reviews')||call.url.endsWith('/merge')));
 const unnotified=await setup(t,{publish:true,final:true});unnotified.DB.prepare('UPDATE update_batches SET notification_sha=? WHERE id=? AND version=1').bind('c'.repeat(40),'batch-1').run();
 const unnotifiedResponse=await unnotified.api('POST','/api/batches/batch-1/approve-publish',{finalSha:'a'.repeat(40)});assert.equal(unnotifiedResponse.status,409);assert.equal((await unnotifiedResponse.json()).error,'notification-incomplete');assert(!unnotified.calls.some(call=>call.url.endsWith('/reviews')||call.url.endsWith('/merge')));
});
