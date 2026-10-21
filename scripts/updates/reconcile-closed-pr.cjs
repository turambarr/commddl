const crypto=require('node:crypto');
const owner=process.env.GITHUB_REPOSITORY_OWNER,repo=process.env.GITHUB_REPOSITORY_NAME,token=process.env.GITHUB_TOKEN,base=(process.env.UPDATE_ADMIN_API_URL||'').replace(/\/$/,''),secret=process.env.UPDATE_INTERNAL_HMAC_SECRET,prNumber=Number(process.env.PR_NUMBER);
async function github(path){const response=await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`,{headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`GitHub ${response.status}: ${body.message||'API request failed'}`);return body;}
async function post(value){const body=JSON.stringify(value),timestamp=String(Date.now()),requestId=crypto.randomUUID(),hash=crypto.createHash('sha256').update(body).digest('hex'),signature=crypto.createHmac('sha256',secret).update(`${timestamp}.${requestId}.${hash}`).digest('hex'),response=await fetch(`${base}/internal/pull-requests/closed`,{method:'POST',headers:{'content-type':'application/json','x-commddl-timestamp':timestamp,'x-commddl-request-id':requestId,'x-commddl-signature':signature},body});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`Worker ${response.status}: ${result.detail||result.error||'callback failed'}`);console.log(JSON.stringify(result));}
async function main(){if(!owner||!repo||!token||!base||!secret||!prNumber)throw new Error('PR reconciliation inputs are incomplete');
 const pr=await github(`/pulls/${prNumber}`);if(pr.number!==prNumber||pr.base?.ref!=='main'||pr.state!=='closed')throw new Error('Pull request is not a closed PR targeting main');
 const files=[];for(let page=1;page<=10;page++){const current=await github(`/pulls/${prNumber}/files?per_page=100&page=${page}`);if(!Array.isArray(current))throw new Error('Pull request file list is incomplete');files.push(...current);if(current.length<100)break;}
 const dataFiles=files.map(file=>file.filename).filter(name=>/^data\//.test(name));if(!dataFiles.length){console.log('No published catalog data changed; no batch reconciliation is needed.');return;}
 const payload={prNumber,manualMergeRequired:true,dataFiles,state:pr.state,baseRef:pr.base.ref,merged:Boolean(pr.merged)};
 if(pr.merged){
  if(!pr.merged_at||!pr.merge_commit_sha||!pr.head?.sha)throw new Error('Merged PR lacks immutable merge metadata');
  const reviews=await github(`/pulls/${prNumber}/reviews?per_page=100`),checks=await github(`/commits/${pr.head.sha}/check-runs?per_page=100`);
  if(!Array.isArray(reviews)||!Array.isArray(checks.check_runs))throw new Error('Approval or check evidence is unavailable');
  const approval=reviews.filter(review=>review.state==='APPROVED'&&review.commit_id?.toLowerCase()===pr.head.sha.toLowerCase()&&review.submitted_at&&review.submitted_at<=pr.merged_at&&!String(review.user?.login||'').endsWith('[bot]')).sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at))[0];
  if(!approval)throw new Error('No human approval is bound to the merged head SHA');
  const required=['build','catalog, tests, and generated site','CommDDL final notice'];
  const successfulChecks=required.filter(name=>checks.check_runs.some(check=>check.name===name&&check.status==='completed'&&check.conclusion==='success'));
  if(successfulChecks.length!==required.length)throw new Error('A required check is missing or unsuccessful on the final PR SHA');
  Object.assign(payload,{headSha:pr.head.sha,mergeCommitSha:pr.merge_commit_sha,mergedAt:pr.merged_at,reviewerLogin:approval.user.login,approvedSha:approval.commit_id,successfulChecks});
 }else if(!pr.closed_at)throw new Error('Closed PR lacks closed_at timestamp');
 await post(payload);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
