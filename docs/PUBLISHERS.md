# 期刊出版商

已为 326 本期刊中的 319 本补入出版单位名称，逐刊来源、状态与未决问题见 [核查清单](PUBLISHER-AUDIT-2026-10-23.md) 和 [结构化记录](publisher-audit-2026-10-23.json)。本批次核对日期为 2026-10-23；资料来源年代另见 note。

卡片仅展示出版商名称；详情分别标明官方、Crossref、登记/书目、公开参考资料，并显示证据状态、原始出版项、核对日期及限制。未取得明确依据的 7 本仍显示待核实。出版商筛选、别名搜索、专题继承和可分享地址均适用于已录入记录；主办机构独立存储，不混入出版商筛选。

## 数据格式

期刊 YAML 使用可选 publishers / societies 列表，每项包含稳定小写 id、name、sourceUrl、verifiedAt。nameZh、aliases 可选；联合出版使用多个条目。unknown 为筛选保留值。

新增可选证据字段：

- status：verified（官方依据核实）或 reported（资料记载）；旧数据省略时保留原有含义。
- sourceType：official、crossref、registry、secondary。
- sourceTitle / sourcePublisher / issn：保留原始刊名、出版项及 ISSN，供逐项复核。
- note：证据限制、历史年代、名称规范化或不同资料之间的口径差异。reported 必须具有来源类型和非空说明。

verifiedAt 表示本批次核对来源的日期，不能解释为出版社从该日开始拥有期刊。reported 的日期只表示核对记录，不能提升为官方核实。

Crossref 的注册出版商字段可能过时，也不证明所有权；仅有主办、赞助、托管信息时不能直接推断出版单位。官方证据可覆盖注册记录，例如 IET 旗下期刊由 Wiley 出版、IET 拥有和管理，分别记入 publishers 和 societies；MDPI Photonics 已按官网补录。中文期刊编辑部或杂志社可作为出版单位，须有具体出处。

工程入口：assets/core.js 负责搜索筛选；assets/app.js 展示名称和证据；scripts/validate.cjs 校验字段；scripts/public-catalog.cjs 保留公开证据，排除内部字段。测试覆盖联合出版、缺省数据、专题继承、证据状态、公开字段以及本批次覆盖与已知例外。
