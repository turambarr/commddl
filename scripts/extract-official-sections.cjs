// Compatibility entry point: extraction now produces review candidates only.
const {spawnSync}=require('node:child_process');
const args=process.argv.slice(2),ids=args.filter(arg=>!arg.startsWith('--')).flatMap(arg=>arg.split(',')).filter(Boolean);
if(!ids.length){console.error('用法：npm run extract:official -- <venue-id[,id...]>（只生成候选，不写入正式 YAML）');process.exit(2);}
if(args.includes('--apply')){console.error('直接写入正式数据已停用。请通过受审阅批次的 update:apply 流程应用决策。');process.exit(2);}
const result=spawnSync(process.execPath,['scripts/updates/collector.cjs','--ids',ids.join(','),'--dry-run'],{stdio:'inherit',env:process.env});process.exit(result.status??1);
