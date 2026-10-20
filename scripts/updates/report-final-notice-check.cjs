async function main(){
 const [owner,repo,sha,prNumber]=['GITHUB_REPOSITORY_OWNER','GITHUB_REPOSITORY_NAME','FINAL_SHA','PR_NUMBER'].map(key=>process.env[key]);
 const token=process.env.GITHUB_TOKEN;if(!owner||!repo||!token||!/^([0-9a-f]{40})$/i.test(sha||'')||!Number(prNumber))throw new Error('final-notice check inputs are incomplete');
 const response=await fetch(`https://api.github.com/repos/${owner}/${repo}/check-runs`,{method:'POST',headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','content-type':'application/json'},body:JSON.stringify({name:'CommDDL final notice',head_sha:sha,status:'completed',conclusion:'success',external_id:`commddl:${prNumber}:${sha}`,output:{title:'Final revision notice delivered',summary:`The trusted CommDDL Worker recorded complete notification for PR #${prNumber} at ${sha}.`}})});
 const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`Could not create final notice check (${response.status}): ${body.message||'GitHub API error'}`);
 console.log(`Created CommDDL final notice check ${body.id} for PR #${prNumber} at ${sha.slice(0,12)}.`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
