const fs=require('node:fs');
const path=require('node:path');
const values={};
for(let i=2;i<process.argv.length;i++){if(['--source','--out'].includes(process.argv[i]))values[process.argv[i].slice(2)]=process.argv[++i];}
if(!values.source||!values.out)throw new Error('usage: mark-copilot-failure.cjs --source <collector.json> --out <candidate.json>');
const batch=JSON.parse(fs.readFileSync(path.resolve(values.source),'utf8'));
batch.copilot={provider:'github-copilot-cli',status:'failed',reason:'Copilot 结构化步骤未完成；已保留官网采集证据，不能视为 Copilot 结果。'};
for(const item of batch.items||[]){item.sourceChanges=item.sourceChanges||item.changes||[];item.changes=(item.changes||[]).filter(change=>change.type==='node-date-changed');item.structuredCandidate={schemaVersion:'commddl.copilot-structure.v1',status:'insufficient-evidence',summary:'官网内容已采集，但 Copilot 结构化未完成；此批次是原始采集结果，不是中文结构化结论。',observations:[],limitations:['Copilot 未成功返回并通过证据校验；原始候选不得据此直接发布。']};}
fs.mkdirSync(path.dirname(path.resolve(values.out)),{recursive:true});fs.writeFileSync(path.resolve(values.out),JSON.stringify(batch,null,2)+'\n');
