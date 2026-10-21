const test=require('node:test');
const assert=require('node:assert/strict');
const {main}=require('../scripts/updates/report-final-notice-check.cjs');

const sha='a'.repeat(40),baseEnv={GITHUB_REPOSITORY_OWNER:'turambarr',GITHUB_REPOSITORY_NAME:'commddl',GITHUB_TOKEN:'test-token',FINAL_SHA:sha,PR_NUMBER:'17',UPDATE_ADMIN_API_URL:'https://admin.test',UPDATE_INTERNAL_HMAC_SECRET:'test-hmac'};
function response(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});}

test('ordinary non-candidate PR receives a neutral required check',async()=>{
 const calls=[],result=await main({env:{...baseEnv,CHECK_MODE:'neutral-if-non-data',PR_HEAD_REF:'feature/repair-catalog'},fetchImpl:async(url,options={})=>{calls.push({url:String(url),options});return calls.length===1?response({candidate:false,notified:false}):response({id:55});},log:()=>{}});
 assert.equal(result.conclusion,'neutral');assert.match(calls[0].url,/internal\/pull-requests\/notice-status$/);assert.equal(calls[0].options.method,'POST');assert.match(calls[1].url,/check-runs$/);assert.equal(JSON.parse(calls[1].options.body).conclusion,'neutral');assert.equal(JSON.parse(calls[1].options.body).head_sha,sha);
});

test('candidate PR without a notice at this SHA remains pending rather than receiving neutral',async()=>{
 let calls=0;const result=await main({env:{...baseEnv,CHECK_MODE:'neutral-if-non-data'},fetchImpl:async()=>{calls++;return response({candidate:true,notified:false,finalSha:'b'.repeat(40)});},log:()=>{}});
 assert.deepEqual(result,{created:false,reason:'candidate-not-notified'});assert.equal(calls,1);
});

test('candidate PR with a notice leaves success-check creation to the trusted candidate workflow',async()=>{
 let calls=0;const result=await main({env:{...baseEnv,CHECK_MODE:'neutral-if-non-data'},fetchImpl:async()=>{calls++;return response({candidate:true,notified:true,finalSha:sha});},log:()=>{}});
 assert.deepEqual(result,{created:false,reason:'candidate-notice-check-owned-by-candidate-workflow'});assert.equal(calls,1);
});

test('reserved candidate branch remains pending while Worker batch binding is racing',async()=>{
 let calls=0;const result=await main({env:{...baseEnv,CHECK_MODE:'neutral-if-non-data',PR_HEAD_REF:'codex/official-updates-batch-1-v2'},fetchImpl:async()=>{calls++;return response({candidate:false,notified:false});},log:()=>{}});
 assert.deepEqual(result,{created:false,reason:'candidate-binding-pending'});assert.equal(calls,1);
});

test('candidate final notice check succeeds only after the trusted caller invokes it',async()=>{
 let payload;const result=await main({env:baseEnv,fetchImpl:async(_url,options)=>{payload=JSON.parse(options.body);return response({id:99});},log:()=>{}});
 assert.equal(result.conclusion,'success');assert.equal(payload.conclusion,'success');assert.equal(payload.head_sha,sha);
});

test('failed Worker classification fails closed without creating a neutral check',async()=>{
 let calls=0;await assert.rejects(main({env:{...baseEnv,CHECK_MODE:'neutral-if-non-data'},fetchImpl:async()=>{calls++;return response({error:'denied'},403);},log:()=>{}}),/Could not classify candidate binding/);assert.equal(calls,1);
});
