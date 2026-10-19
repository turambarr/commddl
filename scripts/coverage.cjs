// Generate directory and verification reports from the canonical records.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),D=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json'),'utf8'));
const labels={verified:'一手来源',reported:'副本／转录',unlisted:'所查版本未列入',unresolved:'已复查，证据不足',pending:'待核验','not-matched':'未匹配','scope-review':'对应范围未明确','non-ranked':'非等级状态','not-applicable':'不适用'};
const systems={jcr:'JCR',cas:'中科院',ccf:'CCF',core:'CORE / ICORE',cie:'电子学会',cic:'通信学会'};
const txt=s=>String(s??'').replaceAll('|','／').replaceAll('\n',' ');
const active=D.venues.filter(v=>v.catalogScope!=='archive'),archived=D.venues.filter(v=>v.catalogScope==='archive');
let out=`# v${D.meta.version} 目录与证据覆盖\n\n整理日期：${D.meta.updatedAt}。通信目录 ${active.filter(v=>v.kind==='journal').length} 本期刊、${active.filter(v=>v.kind==='conference').length} 个会议系列；历史参考库 ${archived.length} 项。${D.areas.length} 个方向、${D.topics.length} 个主题。具体活动另计 ${D.calls.length} 项。\n\n## 评级版本\n\n`;
for(const r of D.ratingSystems)out+=`- ${r.label} ${r.year}：${r.note||'按条目所载原始年份记录。'} [来源](${r.sourceUrl})\n`;
out+='\n同一体系多选为或，不同体系为且；主题分类与评级属性独立。未列入对应已检查版本，转录注明原始年份和来源。\n\n## 方向覆盖\n\n| 代码 | 方向 | 期刊 | 会议 |\n|---|---|---:|---:|\n';
for(const a of D.areas)out+=`| ${a.code} | ${a.label} | ${active.filter(v=>v.kind==='journal'&&v.areas.includes(a.id)).length} | ${active.filter(v=>v.kind==='conference'&&v.areas.includes(a.id)).length} |\n`;
for(const [title,rows] of [['通信期刊',active.filter(v=>v.kind==='journal')],['通信会议',active.filter(v=>v.kind==='conference')],['历史参考库',archived]]){
 out+=`\n## ${title}\n\n| 简称 | 正式名称 | 索引与评级 | 身份来源 |\n|---|---|---|---|\n`;
 for(const v of rows){const attrs=[...(v.kind==='journal'?[`${v.indexing.value||'WoS'} ${v.indexing.year||v.indexing.snapshotDate||''}（${labels[v.indexing.status]}）`]:[]),...(v.otherIndexes||[]).map(e=>(e.value==='CSTPCD'?'科技核心':e.value)+(e.edition||e.year?' '+(e.edition||e.year):'')+(e.coverage?' · '+e.coverage:'')),...v.evaluations.map(e=>`${systems[e.system]} ${e.year} ${e.value||'—'}（${labels[e.status]}）`)];out+=`| ${txt(v.short)} | ${txt(v.nameEn)} | ${txt(attrs.join('；'))} | [${v.sourceType==='historical-document'?'历史原文':'身份来源'}](${v.sourceUrl}) · ${v.verifiedAt||v.identityReviewedAt||'日期见原始记录'} |\n`;}
}
out+='\n## 2018 原表映射\n\n仅保留原始身份追溯；与主目录的主题、现行评级和截止日期分开。全部 89 个原编号保持可追溯，重复项不重复建立载体。\n\n| 原编号 | 原简称 | 目录编号 | PDF页码 | 备注 |\n|---:|---|---|---:|---|\n';
for(const m of D.legacyMappings)out+=`| ${m.number} | ${txt(m.originalShort)} | ${m.venueId} | ${m.page} | ${txt(m.note)} |\n`;
fs.writeFileSync(path.join(root,'docs/CATALOG.md'),out);
let audit=`# v${D.meta.version} 核验记录\n\n复查日期：${D.meta.updatedAt}。完整字段及正面证据保存在 data/catalog.json，以下列出尚无明确数值的记录及处理依据。\n\n“未列入”对应所查版本的完整目录；“证据不足”列明已查来源中的信息缺口。等级、索引与来源版本分别记录。\n\n| 载体 | 属性 | 年份 | 复查结果 | 复查日期 | 依据及说明 |\n|---|---|---|---|---|---|\n`;
for(const v of D.venues){for(const e of [...(v.kind==='journal'?[{...v.indexing,system:'索引'}]:[]),...(v.evaluations||[])]){if(['verified','reported'].includes(e.status))continue;audit+=`| ${txt(v.short)}${v.catalogScope==='archive'?'（档案）':''} | ${systems[e.system]||e.system} | ${e.year||'来源年份见说明'} | ${labels[e.status]} | ${e.reviewedAt||e.verifiedAt||v.reviewedAt||'未记录'} | ${txt(e.note)}${e.sourceUrl?` [来源](${e.sourceUrl})`:''} |\n`;}}
fs.writeFileSync(path.join(root,'docs/VERIFICATION.md'),audit);
console.log(`目录报告已生成：${active.length} 主目录、${archived.length} 历史参考。`);
