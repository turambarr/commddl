const fs=require('node:fs');
const {execFileSync}=require('node:child_process');

function verify(root=process.cwd()){
 const untracked=execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 if(untracked.length)throw new Error(`发现未跟踪文件，不允许夹带进数据 PR：${untracked[0]}`);
 const changes=execFileSync('git',['diff','--name-status','--no-renames','HEAD'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 if(!changes.length)throw new Error('没有可提交的正式数据变更。');
 if(changes.length>20)throw new Error('一次最多修改 20 个数据文件。');
 const paths=[];
 for(const line of changes){
  const [status,file]=line.split('\t');
  if(status!=='M'||!/^data\/(?:venues\/[^/]+|calls\/(?:20\d{2}|21\d{2}|rolling))\/[a-z0-9-]+\.yml$/.test(file))throw new Error(`发现白名单外或非修改操作：${line}`);
  const stat=fs.lstatSync(`${root}/${file}`);if(!stat.isFile()||stat.isSymbolicLink())throw new Error(`仅允许既有普通 YAML 文件：${file}`);
  if(stat.size>256*1024)throw new Error(`单文件超出 256 KiB 上限：${file}`);
  paths.push(file);
 }
 const total=paths.reduce((sum,file)=>sum+fs.statSync(`${root}/${file}`).size,0);if(total>1024*1024)throw new Error('数据变更总大小超出 1 MiB 上限。');
 return paths;
}
if(require.main===module){try{console.log(`数据 PR 路径检查通过：${verify().length} 个既有 YAML 文件。`);}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={verify};
