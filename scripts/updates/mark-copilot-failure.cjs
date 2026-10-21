const fs=require('node:fs');
const path=require('node:path');
const values={};
for(let i=2;i<process.argv.length;i++){if(['--source','--out'].includes(process.argv[i]))values[process.argv[i].slice(2)]=process.argv[++i];}
if(!values.source||!values.out)throw new Error('usage: mark-copilot-failure.cjs --source <collector.json> --out <candidate.json>');
const batch=JSON.parse(fs.readFileSync(path.resolve(values.source),'utf8'));
batch.copilot={provider:'github-copilot-cli',status:'failed',reason:'Copilot structuring did not complete; official source collection is preserved.'};
for(const item of batch.items||[])item.structuredCandidate={schemaVersion:'commddl.copilot-structure.v1',status:'insufficient-evidence',summary:'官方页面已采集，Copilot 结构化步骤未完成；请人工检查来源页面。',observations:[],limitations:['Copilot unavailable or returned unvalidated output.']};
fs.mkdirSync(path.dirname(path.resolve(values.out)),{recursive:true});fs.writeFileSync(path.resolve(values.out),JSON.stringify(batch,null,2)+'\n');
