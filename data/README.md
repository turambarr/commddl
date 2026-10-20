# CommDDL 数据维护说明

给准备补录、核对和修改数据的维护者及 Agent（智能体）使用。**先读本文件，再编辑对应 YAML，通过 Pull Request（合并请求，简称 PR）提交。** 网站提供查询与 GitHub 文件入口，数据经过自动检查、维护者审核和合并后发布。

## 1. 找到要改的文件

```text
data/
  venues/<primaryArea>/<id>.yml   # 一个期刊或会议系列一个文件
  calls/<year>/<id>.yml          # 一个届次、轮次或专题征稿一个文件
  calls/rolling/<id>.yml         # 没有固定年度的持续征稿栏目
  meta.yml                      # 发布版本等公共配置
  areas.yml                     # 主辅方向
  topics.yml                    # 细分主题及检索别名
  rating-systems.yml             # 评级体系与参考版本
  sources.yml                   # 公共来源索引
  legacy-mappings.yml            # 学校旧表的 89 条身份映射
  policy.yml                    # 学校文件版本与适用范围
  call-aliases.yml               # 旧活动编号到正式届次的兼容映射
  catalog.json                  # 自动生成；不提交
```

例如：

- 修改 ICC（国际通信会议）的名称、分类或评级：[`venues/wireless/icc.yml`](venues/wireless/icc.yml)。
- 修改 ICC 2027 主会截止：[`calls/2027/icc-2027-main.yml`](calls/2027/icc-2027-main.yml)。
- 修改 TWC（无线通信汇刊）的期刊属性：[`venues/wireless/twc.yml`](venues/wireless/twc.yml)。
- 修改 JSAC（通信领域选刊）的可移动天线专题：[`calls/2026/jsac-flexible-2026.yml`](calls/2026/jsac-flexible-2026.yml)。

目录中的 `<primaryArea>` 使用稳定方向编号：`wireless`、`signal`、`theory`、`network`、`optical`、`rf`、`space`、`iot`、`ai`。载体文件放在主方向目录，辅方向放在文件字段中。

会议的 `<year>` 是届次年份。例如 2027 年会议即使在 2026 年截稿，也放在 `calls/2027/`。已有专题未显式设置 `year` 时，编译器采用稳定编号中的年度；持续栏目使用 `rolling/`。

## 2. Agent 的工作顺序

1. 用 `rg` 搜索正式全名、简称、旧名和 ISSN（国际标准连续出版物号），先确认是否已有条目。
2. 阅读原文件、相关届次与官方来源。第三方日历用于发现线索，日期取自当届官方征稿。
3. 修改对应文件；新条目可以从 [`templates/`](../templates/) 复制模板。只添加一个文件即可参与编译，无需修改公共条目清单。
4. 保留已有 `id`、时间节点 `id`、别名与来源记录。更名或分类调整不会改变稳定编号。
5. 运行本地检查，检查修改差异，再发起 PR。普通数据 PR 只提交对应的源文件。

可直接交给 Agent 的任务示例：

> 请先阅读 data/README.md，按会议官方来源核对 ICC 2027 的截稿日期，修改对应 YAML。保留稳定编号、日期精度、前置步骤和修改历史；完成本地检查后，通过合并请求提交源文件。

## 3. 修改截止日期

具体日期保存在 `calls/`，期刊或会议系列属性保存在 `venues/`。一个主会、附属研讨会、独立轮次或专题征稿分别建档。

```yaml
nodes:
  - id: paper
    label: 全文提交
    type: paper
    primary: true
    precision: date
    date: '2026-10-30'
    instant: null
    timezone: null
    original: 'Paper Submission Deadline: October 30, 2026'
    revision: 0
```

上例说明字段格式；实际修改必须使用所查官网的真实日期和原文。

| 字段 | 填写规则 |
|---|---|
| `precision: date` | 官网只给日期；填写 `date`，`instant` 与 `timezone` 保持 `null` |
| `precision: instant` | 官网明确时刻和时区；`instant` 包含 UTC（协调世界时）偏移，同时保存原时区 |
| `precision: unknown` | 日期没有取得明确证据；留在维护源，不生成公开截止事件 |
| `original` | 必要的官方日期短原文，保留延期标记和时区说明 |
| `requires` | 前置节点编号，例如全文投稿需要先完成摘要注册 |
| `revision` | 节点修订序号；延期、取消或修改原节点日期时加一 |
| `verifiedAt` | 本次实际读取并核对来源的日期 |
| `updatedAt` | 活动此次修改的时间，使用含时区的时间字符串 |

改期时还要：

- 核对摘要、全文、终稿等相关节点，保留已关闭的摘要前置条件。
- 保留原活动和节点编号，避免用户日历重复创建事件。
- 在 `history` 追加原日期、新日期、核对日期及官方依据；不要覆盖旧历史。
- 需要为不同投稿轮次建新记录时，使用新的活动编号。

官网只给日期时不补造午夜钟点。明确使用 AoE（全球任何地方当天结束）时按 UTC−12；美国太平洋时间按截止当天的夏令时确定偏移。日期算法的测试位于 [`tests/core.test.cjs`](../tests/core.test.cjs)。

## 4. 新增期刊或会议系列

模板：[`venue-journal.yml`](../templates/venue-journal.yml)、[`venue-conference.yml`](../templates/venue-conference.yml)。模板中的占位日期、名称和网址需要替换，核对结果按实际证据填写。

- `id`：小写英文、数字与单个连字符组成；必须与文件名一致，不能与其他载体或活动重名。
- `kind`：`journal`（期刊）或 `conference`（会议系列）。
- `primaryArea`：一个主方向；`secondaryAreas` 最多两个辅方向；`areas` 依次列出主方向和辅方向。
- `topics`：使用 `topics.yml` 中已有的主题编号。新增主题属于分类调整，另行说明依据。
- `nameEn`、`nameZh`、`short`、`aliases`：保存全称、中文名称、简称和已核实旧名。
- `url`：官网或刊物资料入口；注册资料入口使用 `urlKind: registry`。
- `sourceUrl`、`sourceType`、`verification`、`verifiedAt`：记录身份来源及核对状态。核实过的身份使用 `verified`，尚未读取的身份使用 `pending`。
- `catalogScope`：`communications` 为通信目录，`archive` 为历史参考；停刊信息进入档案。
- `catalogStatus`：编辑状态与学术等级独立，按已有数据约定填写。

**学术属性按独立体系填写：**

- `indexing` 保存明确的 WoS（科学网）索引列；SCIE（科学引文索引扩展版）与 ESCI（新兴来源引文索引）分别记录。
- `otherIndexes` 保存 EI（工程索引）、CSCD（中国科学引文数据库）、Scopus（摘要与引文数据库）等独立证据。
- `evaluations` 保存 JCR（期刊引证报告）、中科院、新锐分区、CCF（中国计算机学会）、CORE/ICORE（会议评级）、CIE（中国电子学会）、CIC（中国通信学会）等。
- 每项评级按 `system + year` 唯一，填写明确数值、原始年份、来源类型、来源网址和核对说明。已有历年证据继续保留。
- 转录或公开副本使用 `reported` 并注明 `secondary` 或 `document-copy`；一手明确证据使用 `verified`。
- 期刊保留 JCR、中科院、CCF 的覆盖记录；会议保留 CCF、CORE 的覆盖记录。没有明确等级时保留 `value: null` 及实际编辑状态，模板提供了结构。
- 新增条目不要求修改公共 `sources.yml`；每项自己的来源字段必须完整。公共来源索引由维护者整理。

同缩写不等于同一载体，等级不能通过简称强行匹配。SCI 收录取自明确索引证据，不能从分区或学会 T 等级推断。历史等级保留原年份。学校历史身份、毕业条款、学会评级分别维护。

新锐分区使用 `system: xinrui`、原始年份和字符串 `value: "1"` 至 `"4"`，大类记录在 `category`。高校公开副本使用 `status: reported`、`sourceType: document-copy`，保存源页、下载地址、工作表与行号；独立于 `cas` 和 `jcr`。按有效刊号匹配；英文名相似但刊号不同的期刊不赋级。未匹配记录进入维护区。

“BUPT重要”来自 `assessments.system: bupt-ict-2018`，必须与 `legacy-mappings.yml` 的89条原始记录对应（去重87个会议）。新增会议不能因为主题相近继承学校标记；附属研讨会、短文、演示和独立轨道不继承。

## 5. 新增具体征稿

从 [`call.yml`](../templates/call.yml) 开始，先确认对应 `venueId` 已存在。

- 文件名等于活动 `id`，目录与 `year` 一致。
- `kind` 使用 `conference`（主会）、`workshop`（附属研讨会）、`special`（期刊专题）、`series`（持续栏目）。
- `special` 的母载体必须是期刊；会议刊名与具体届次分别建档。
- `areas` 和 `topics` 按本次征稿内容填写，避免把母刊全部主题继承给专题。
- 附属研讨会、演示、短文或独立分会的评级适用范围分别核对，不能自动沿用主会等级。
- 仅有会议举办日期时，不将其填成截稿。未知截止、冲突和不完整的前置条件保留维护源。

## 6. 本地检查与提交

```sh
npm ci
npm run check
npm test
npm run build
```

首次安装或依赖变化时运行 `npm ci`。`check` 直接读取 YAML，不依赖本机已有的 JSON。错误会尽量指向对应源文件。构建合并生成 `data/catalog.json`，随后生成网页、公开 JSON、日历及离线版本。

以下文件由构建生成并已排除出 Git 版本跟踪：

- `data/catalog.json`
- `assets/data.js`
- `calendars/*.ics`
- `maintenance/review-queue.json`
- `dist/`、`release/`

普通数据 PR 无需修改 `meta.yml`、版本号、公共来源索引或生成报告；目录更新时间会根据各条目的核对和修改日期自动汇总。`node scripts/coverage.cjs` 供维护者生成发布时的目录报告。

在 GitHub 网页上编辑 YAML 后，选择新分支并发起 PR，即可查看自动检查结果。贡献者提交修改，维护者审核后合并；网站不提供在线数据编辑器。

多个贡献者修改不同文件时可独立提交。同一条目被并行修改时，仍需按 Git 的正常流程协调合并。

更多规则：[完整数据约定](../docs/DATA.md) · [部署流程](../docs/DEPLOYMENT.md) · [贡献说明](../CONTRIBUTING.md)。
