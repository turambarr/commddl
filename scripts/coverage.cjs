// Regenerate the public directory audit from the canonical catalog.
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const D=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json'),'utf8'));
const status={current:'有官方身份来源','needs-review':'当前待核验','historical-only':'仅历史记录'};
const state={verified:'已核验',reported:'转录待复核',pending:'待核验','not-matched':'未匹配','scope-review':'范围待认定','non-ranked':'非等级状态'};
const text=s=>String(s||'').replaceAll('|','／').replaceAll('\n',' ');
const journal=D.venues.filter(v=>v.kind==='journal'),conference=D.venues.filter(v=>v.kind==='conference');
const n=s=>D.venues.filter(v=>v.evaluations?.some(e=>e.system===s&&['verified','reported'].includes(e.status))).length;
let out=`# v${D.meta.version} 目录与证据覆盖\n\n整理日期：${D.meta.updatedAt}。${journal.length} 本期刊、${conference.length} 个会议系列记录（含历史条目），${D.areas.length} 个方向、${D.topics.length} 个主题。目录不宣称通信领域全集，也不把历史文件出现过的会议视为仍在举办。\n\n## 评价覆盖\n\n`;
out+='| 体系 | 有明确数值 | 版本与证据 |\n|---|---:|---|\n';
for(const s of D.ratingSystems)out+=`| ${s.label} | ${n(s.id)} | ${s.year}；${s.note} [来源](${s.sourceUrl}) |\n`;
out+='\n不同口径不能互换。JCR 使用 IEEE 原表的期刊影响因子分区列，不使用 CiteScore（引文评分）或 SJR（SCImago期刊排名）替代。CCF 公开副本尚待官网原件逐项复核，不能将未匹配项归为 C 类。ICORE 的非等级状态照原库保留。中科院分区为第三方转录，未核验原库。\n\n## 方向覆盖\n\n| 代码 | 研究方向 | 期刊 | 会议记录 |\n|---|---|---:|---:|\n';
for(const a of D.areas)out+=`| ${a.code} | ${a.label} | ${journal.filter(v=>v.areas.includes(a.id)).length} | ${conference.filter(v=>v.areas.includes(a.id)).length} |\n`;
out+='\n交叉归类会重复计数；主题是导航标签，不能替代具体征稿范围。\n';
for(const [title,rows] of [['期刊',journal],['会议',conference]]){
 out+=`\n## ${title}逐项记录\n\n| 简称 | 中文名称 | 正式名称 | 目录状态 | 评价及版本 | 身份来源 |\n|---|---|---|---|---|---|\n`;
 for(const v of rows){
  const ratings=v.evaluations.map(e=>`${{jcr:'JCR',cas:'中科院',ccf:'CCF',core:'ICORE'}[e.system]} ${e.year} ${e.value||'—'}（${state[e.status]}）`).join('；');
  out+=`| ${text(v.short)} | ${text(v.nameZh)} | ${text(v.nameEn)} | ${status[v.catalogStatus]} | ${text(ratings)} | [${v.sourceType==='community'?'社区线索':v.sourceType==='historical-document'?'历史原文':'来源'}](${v.sourceUrl})${v.verifiedAt?' · '+v.verifiedAt:''} |\n`;
 }
}
out+='\n## 2018 原表的 89 项映射\n\n重复项保留原编号，但不重复建立系列。身份不明确的缩写单独保留，不能直接套用同缩写会议的现行等级。SenSys 合并后的新会议不自动继承旧系列认定；IM 历史记录保留并说明其与 NOMS 的关系。\n\n| 原编号 | 原简称 | 目录编号 | PDF页码 | 备注 |\n|---:|---|---|---:|---|\n';
for(const m of D.legacyMappings)out+=`| ${m.number} | ${text(m.originalShort)} | ${m.venueId} | ${m.page} | ${text(m.note)} |\n`;
fs.writeFileSync(path.join(root,'docs/CATALOG.md'),out);
console.log(`已生成目录审计：${journal.length} 期刊、${conference.length} 会议记录、89 原表映射。`);
