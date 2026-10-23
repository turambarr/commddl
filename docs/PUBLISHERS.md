# 期刊出版商

期刊卡片显示出版商，详情列出出版商和主办学会／机构的独立来源、核验日期。未录入出版商的旧数据保持兼容，显示“待核实”；该标签表示资料尚未补齐。

展开属性筛选可选择出版商，与主题、方向、索引、分区、日期范围同时生效。联合出版期刊匹配任一出版商。搜索支持记录中的英文名、中文名和别名；期刊专题继承母刊的出版关系。筛选地址使用 `publisher` 参数，例如 `#journals?publisher=ieee`，支持分享、刷新、单项清除及清除全部。切换会议目录会移除出版商条件。

## 数据格式

在期刊 YAML 增加可选列表 `publishers`；主办学会／机构写入独立的 `societies` 列表。每项格式相同：

```yaml
publishers:
  - id: elsevier
    name: Elsevier
    nameZh: 爱思唯尔
    aliases: [爱斯维尔]
    sourceUrl: https://shop.elsevier.com/journals/computer-networks/1389-1286
    verifiedAt: 2026-10-23
societies: []
```

`id` 为稳定小写编号（如 `ieee`、`elsevier`、`mdpi`），同一机构跨期刊使用相同编号与名称；`unknown` 是界面保留值。`name`、官方 `sourceUrl` 和有效日期 `verifiedAt` 必填；`nameZh`、`aliases` 可选。联合出版逐项填写。没有官方依据时省略或留空，不从刊名、平台域名、分区、赞助关系推断。主办机构不会自动加入出版商搜索或筛选。

本次为已有 TWC 和 Computer Networks 补录官方出版关系，未批量推断其余期刊。MDPI 可按相同格式录入；当前目录没有经本次核实的 MDPI 条目，因此筛选器仅列出实际已录入的机构。

工程入口：`assets/core.js` 处理搜索和筛选；`assets/app.js` 处理卡片、详情和地址状态；`scripts/validate.cjs` 校验关系证据；`scripts/public-catalog.cjs` 输出公开字段；`tests/publishers.test.cjs` 验证联合出版、缺省数据、专题继承及隐私字段边界。
