# 期刊会议分类审计 · 2026-10-21

工作分支：`fix/official-topic-audit`；基线：`fa0d316339affffab26d7762510f6283dd20c1bf`。本地修改，尚未推送、创建合并请求或发布。

## 范围和实际进度

全量扫描 **706 个期刊/会议系列、93 项具体征稿**的方向、主题和来源入口。针对模板化错配及明显漏项，深入核对 **116 个载体、10 项征稿**所需的官方范围依据。

这两个数字口径不同：全量扫描包括结构和风险筛查；深入核对包括实际读取的官网、出版方、主办学会介绍与官方页面的搜索渲染。取得网页响应不等于完成范围判断，评级表和刊号登记资料不作主题证明。部分范围依据是往届官方征稿，记录其原年份，不据此填写当届日期。

**已修改 117 条：57 本期刊、52 个会议系列、8 项征稿；另有 9 条核对后保留原分类。**

其余 **673 条尚未完成逐项官网范围核对**，其中 92 条命中模板化风险线索，应优先复查；线索不等于已确认错误。本报告不把它们计入“审核通过”。完整状态、访问结果及疑点保存在[维护审计表](../maintenance/taxonomy-audit-2026-10-21.json)，不进入网页卡片。

## 对应方法

1. **主方向**按载体持续研究的对象选择一个；**辅方向**只保留主要交叉研究对象，最多两个，不要求填满。
2. **细分主题**按期刊常设范围、编辑分类或会议正式征稿逐项对应。它们是检索标签，不是按评级或可能应用推导的标签，也不宣称穷尽全部可接收内容。
3. 通用机器学习、语言处理、知识推理分别有自己的主题。一般学习不等于智能通信，语言语义不等于语义通信；大规模、协同或多智能体也不直接等于联邦/分布式学习。
4. 密码学与信道纠错编码分开；光纤传感与光纤传输分开；仪器计量与网络性能测量分开；电路器件与射频微波分开。
5. 具体专题和届次独立核对，不能全量继承母刊/母会标签。官网明确的交叉内容可同时赋标，例如ICTAI官方征稿确有AI用于通信，保留该标签并补上通用AI主题。
6. 未取得范围证据的疑点不批量猜改；维护表区分直接读取、官方搜索渲染、登记/评级资料、访问受限和未完成审阅。

## 修改量

| 项目 | 数量 |
|---|---:|
| 主方向调整 | 10 个载体 |
| 辅方向调整 | 53 个载体 |
| 主题集合调整 | 112 条记录 |
| 增加主题对应关系 | 272 条 |
| 移除主题对应关系 | 122 条 |
| 官方入口替换 | 31 个载体 |
| 主题数量 | 46 → 61 |

同一条目可以同时调整方向、主题、简介和入口，上表不可相加当作条目数。期刊、会议、征稿总数和稳定编号均保留。

## 代表性对应

| 条目 | 原问题 | 本轮对应 | 官方依据 |
|---|---|---|---|
| TDSC（可信与安全计算汇刊） | 理论主方向，仅信息论主题 | 网络与系统安全、可信计算 | [官方期刊介绍](https://www.computer.org/digital-library/journals/tq/cfp-dependable-secure-computing) |
| EMNLP（自然语言处理经验方法会议） | 语义通信 | 自然语言、学习、语言检索及语音理解 | [2026主会征稿](https://2026.emnlp.org/calls/main_conference_papers/) |
| JSSC（固态电路杂志） | 唯一微波标签 | 电路、电子器件与微纳系统 | [学会范围](https://sscs.ieee.org/publications/ieee-journal-of-solid-state-circuits-jssc/) |
| TSIPN（网络上的信号与信息处理汇刊） | 网络协议与阵列概括 | 图结构数据、分布式信号估计与学习 | [官方范围](https://signalprocessingsociety.org/publications-resources/ieee-transactions-signal-and-information-processing-over-networks) |
| Photonic Sensors（光子传感） | 光纤通信、通感一体化 | 光学传感、光子器件与测量；更新出版入口 | [SciOpen刊物页](https://www.sciopen.com/journal/1674-9251) |
| J-ISPIN（室内与无缝定位导航期刊） | 卫星主方向 | 信号处理主方向，无线和物联网辅方向 | [官方刊物页](https://ieee-jispin.org/) |
| WOCC（无线与光通信会议） | 只有无线主题，遗漏光通信 | 无线、光通信及面向通信的AI；补光纤和光网络 | [2026官方征稿](http://www.wocc.org/wocc2026/CallforPaper.html) |
| TCOM（通信汇刊） | 漏掉明确的量子、太赫兹主题 | 补入量子通信及太赫兹 | [官方期刊范围](https://www.comsoc.org/publications/journals/ieee-transactions-communications) |

## 分类表调整与兼容

仍为9个方向，保留全部方向编号、原46个主题编号和收藏编号；新增15个基础主题。方向名称改为更能容纳原有内容的表述：

| 方向编号 | 原名称 | 本地新名称 |
|---|---|---|
| `signal` | 信号处理与通感 | 信号处理、感知与控制 |
| `optical` | 光通信与光网络 | 光通信与光子学 |
| `rf` | 天线射频与电磁 | 电磁、射频与电子技术 |
| `space` | 卫星与空天地通信 | 空天地通信与导航 |
| `ai` | 智能通信与网络 | 人工智能与信息处理 |

新增主题：机器学习与模式识别、自然语言处理与语言技术、知识表示、推理与智能体、信息检索、数据管理与信息系统、人机交互与用户体验、并行分布式计算与计算系统、电路、电子器件与微纳系统、电子与光电材料、电力电子与能量变换、磁学、磁性材料与器件、信号处理理论与实现、控制、自动化与系统工程、测量、仪器与频率控制、光学传感与测量、生物医学信号、器件与系统。

保留跨方向检索；新增分类由现有动态筛选组件读取，无需迁移收藏。移除三组过宽检索别名：多天线不再自动等同RIS，卫星不再自动等同无人机，一般AI/ML放入通用学习主题。

## 修改后的主方向分布

仅统计主目录；历史参考41项保留。辅方向不重复计数。

| 方向 | 修改前 | 修改后 |
|---|---:|---:|
| 无线通信 | 100 | 99 |
| 信号处理、感知与控制 | 81 | 86 |
| 信息论与编码 | 49 | 47 |
| 网络与移动系统 | 111 | 112 |
| 光通信与光子学 | 85 | 85 |
| 电磁、射频与电子技术 | 128 | 129 |
| 空天地通信与导航 | 26 | 24 |
| 物联网与车联网 | 52 | 51 |
| 人工智能与信息处理 | 33 | 32 |

## 验证与未改动项

- `npm run check`：通过，706个载体、93项征稿的源数据校验。
- `npm test`：119项通过，0项失败；包含新增的分类混淆、属性组合与检索别名回归检查。
- `npm run build`：通过，生成公开目录、网页、日历和离线版；生成文件不进入版本提交。
- 与基线逐字段比对：只改方向、主题、简介、官方入口及主题核对日期。**收录、各体系等级及其年份、87个BUPT重要标记、具体日期、时间精度、修订历史均保留。**
- 审计状态和访问日志保存在维护文件，不复制到公开数据。没有更改后台服务、依赖、工作流或部署配置。

## 逐条修改清单

下列分类是根据所列官方材料作出的目录编辑判断；理由和旧值完整保存在维护审计表。

| 条目 | 方向：修改前 → 修改后 | 主题：修改前 → 修改后 | 依据 |
|---|---|---|---|
| [ACML](../data/venues/ai/acml.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别 | [官方材料](https://www.acml-conf.org/2026/) |
| [ACM MM](../data/venues/signal/acmmm.yml) | 人工智能与信息处理 / 网络与移动系统 / 信号处理、感知与控制 → 信号处理、感知与控制 / 人工智能与信息处理 / 网络与移动系统 | 图像、视频与计算成像；信源编码与压缩 → 图像、视频与计算成像；语音、音频与声学；机器学习与模式识别；人机交互与用户体验 | [官方材料](https://2026.acmmm.org/) |
| [Analog Integr. Circuits Signal Process.](../data/venues/rf/aicsp.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 / 信号处理、感知与控制 | 射频、微波与电路 → 电路、电子器件与微纳系统；信号处理理论与实现；射频、微波与电路 | [官方材料](https://link.springer.com/journal/10470) |
| [Adv. Intell. Syst.](../data/venues/ai/ais.yml) | 人工智能与信息处理 / 物联网与车联网 → 人工智能与信息处理 / 信号处理、感知与控制 / 物联网与车联网 | 机器学习与智能通信 → 机器学习与模式识别；控制、自动化与系统工程；传感器与物联网；人机交互与用户体验；生物医学信号、器件与系统 | [官方材料](https://onlinelibrary.wiley.com/page/journal/26404567/homepage/productinformation.html) |
| [AISTATS](../data/venues/ai/aistats.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 / 信号处理、感知与控制 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别；检测、估计与同步 | [官方材料](https://virtual.aistats.org/Conferences/2026/CallForPapers) |
| [Allerton](../data/venues/theory/allerton.yml) | 信息论与编码 / 无线通信 / 网络与移动系统 → 信息论与编码 / 信号处理、感知与控制 / 网络与移动系统 | 信息论与容量；信道编码与译码；工业通信与控制网络 → 信息论与容量；信道编码与译码；控制、自动化与系统工程；并行分布式计算与计算系统 | [官方材料](https://allerton.csl.illinois.edu/) |
| [ANTS](../data/venues/wireless/ants.yml) | 无线通信 / 信息论与编码 / 网络与移动系统 → 无线通信 / 网络与移动系统 / 物联网与车联网 | 调制、波形与物理层；网络协议与体系结构；传感器与物联网 → 调制、波形与物理层；网络协议与体系结构；传感器与物联网 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [APNet](../data/venues/network/apnet.yml) | 网络与移动系统 → 网络与移动系统 | 网络协议与体系结构；网络测量与性能分析；网络管理与虚拟化 → 网络协议与体系结构；网络测量与性能分析；网络管理与虚拟化；边缘计算与云网络；机器学习与智能通信；通信与网络安全 | [官方材料](https://conferences.sigcomm.org/events/apnet2026/cfp.php) |
| [APOS](../data/venues/optical/apos.yml) | 光通信与光子学 / 网络与移动系统 → 光通信与光子学 / 物联网与车联网 | 光子器件与集成光学；传感器与物联网 → 光学传感与测量；光子器件与集成光学；传感器与物联网 | [官方材料](https://www.apos2026.com/static/Callforpaper.pdf) |
| [ASIACRYPT](../data/venues/theory/asiacrypt.yml) | 信息论与编码 / 网络与移动系统 → 信息论与编码 / 网络与移动系统 | 信息论与容量；信道编码与译码；通信与网络安全；密码学与信息安全理论 → 密码学与信息安全理论；通信与网络安全 | [官方材料](https://asiacrypt.iacr.org/2026/callforpapers.php) |
| [ASMS/SPSC](../data/venues/space/asms-spsc.yml) | 空天地通信与导航 → 空天地通信与导航 / 无线通信 / 信号处理、感知与控制 | 卫星通信与非地面网络；定位、导航与授时；航空航天电子与系统 → 卫星通信与非地面网络；调制、波形与物理层；检测、估计与同步 | [官方材料](https://www.asmsconference.org/) |
| [ATC](../data/venues/wireless/atc.yml) | 无线通信 / 网络与移动系统 / 信号处理、感知与控制 → 无线通信 / 网络与移动系统 / 信号处理、感知与控制 | 调制、波形与物理层；网络协议与体系结构；阵列与多通道处理；天线、超表面与电磁计算 → 调制、波形与物理层；网络协议与体系结构；阵列与多通道处理；天线、超表面与电磁计算；电路、电子器件与微纳系统；射频、微波与电路；机器学习与智能通信；信息论与容量 | [官方材料](https://atc-conf.org/call-for-papers/call-for-papers) |
| [BCICTS](../data/venues/rf/bcicts.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路；毫米波与太赫兹 → 电路、电子器件与微纳系统；射频、微波与电路；毫米波与太赫兹；电子与光电材料 | [官方材料](https://bcicts.org/) |
| [Behav. Inf. Technol.](../data/venues/ai/bit.yml) | 人工智能与信息处理 → 人工智能与信息处理 | 机器学习与智能通信 → 人机交互与用户体验；信息检索、数据管理与信息系统 | [官方材料](https://www.tandfonline.com/journals/tbit20) |
| [BlackSeaCom](../data/venues/wireless/blackseacom.yml) | 无线通信 / 信息论与编码 / 网络与移动系统 → 无线通信 / 网络与移动系统 / 物联网与车联网 | 调制、波形与物理层；网络协议与体系结构 → 调制、波形与物理层；网络协议与体系结构；移动计算与无线系统；机器学习与智能通信；边缘计算与云网络；通信与网络安全 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [HHME](../data/venues/iot/ccf-hhme.yml) | 物联网与车联网 / 网络与移动系统 → 物联网与车联网 / 网络与移动系统 | 传感器与物联网；移动计算与无线系统 → 传感器与物联网；移动计算与无线系统；人机交互与用户体验 | [官方材料](https://hhme.ccf.org.cn/history/2023/ZGTZ.html) |
| [CHES](../data/venues/theory/ches.yml) | 信息论与编码 / 无线通信 → 信息论与编码 / 电磁、射频与电子技术 | 密码学与信息安全理论；通信与网络安全 → 密码学与信息安全理论；通信与网络安全；电路、电子器件与微纳系统 | [官方材料](https://ches.iacr.org/2026/) |
| [CloudNet](../data/venues/network/cloudnet.yml) | 网络与移动系统 / 人工智能与信息处理 → 网络与移动系统 / 人工智能与信息处理 | 边缘计算与云网络；网络管理与虚拟化 → 边缘计算与云网络；网络管理与虚拟化；网络协议与体系结构；机器学习与智能通信 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [CNSM](../data/venues/network/cnsm.yml) | 网络与移动系统 / 人工智能与信息处理 → 网络与移动系统 / 人工智能与信息处理 | 网络协议与体系结构；网络管理与虚拟化 → 网络管理与虚拟化；网络协议与体系结构；边缘计算与云网络；机器学习与智能通信 | [官方材料](https://cnsm-conf.org/2026/index.html) |
| [CRYPTO](../data/venues/theory/crypto.yml) | 信息论与编码 / 网络与移动系统 → 信息论与编码 / 网络与移动系统 | 信息论与容量；信道编码与译码；通信与网络安全；密码学与信息安全理论 → 密码学与信息安全理论；通信与网络安全 | [官方材料](https://crypto.iacr.org/2026/callforpapers.php) |
| [CSCN](../data/venues/wireless/cscn.yml) | 无线通信 / 信息论与编码 / 网络与移动系统 → 无线通信 / 网络与移动系统 | 调制、波形与物理层；网络协议与体系结构；工业通信与控制网络 → 网络协议与体系结构；移动计算与无线系统；边缘计算与云网络 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [Circuits, Systems, and Signal Processing](../data/venues/signal/cssp.yml) | 信号处理、感知与控制 / 电磁、射频与电子技术 → 信号处理、感知与控制 / 电磁、射频与电子技术 | 检测、估计与同步；阵列与多通道处理；射频、微波与电路 → 信号处理理论与实现；电路、电子器件与微纳系统；检测、估计与同步；机器学习与模式识别 | [官方材料](https://link.springer.com/journal/34/aims-and-scope) |
| [IEEE/AIAA DASC](../data/venues/space/dasc.yml) | 空天地通信与导航 / 无线通信 → 空天地通信与导航 / 网络与移动系统 / 信号处理、感知与控制 | 航空航天电子与系统；卫星通信与非地面网络 → 航空航天电子与系统；定位、导航与授时；卫星通信与非地面网络；网络协议与体系结构；控制、自动化与系统工程 | [官方材料](https://dasconline.org/2026/authors/call-for-papers) |
| [DSN](../data/venues/network/dsn.yml) | 网络与移动系统 → 网络与移动系统 | 网络协议与体系结构；移动计算与无线系统；通信与网络安全 → 通信与网络安全；并行分布式计算与计算系统 | [官方材料](https://dsn2026.github.io/) |
| [DySPAN](../data/venues/wireless/dyspan.yml) | 无线通信 / 网络与移动系统 / 人工智能与信息处理 → 无线通信 / 网络与移动系统 / 人工智能与信息处理 | 频谱与无线资源管理；调制、波形与物理层 → 频谱与无线资源管理；机器学习与智能通信 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [ECAI](../data/venues/ai/ecai.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别；知识表示、推理与智能体；自然语言处理与语言技术；图像、视频与计算成像 | [官方材料](https://ecai2025.org/call-for-papers/) |
| [ECML-PKDD](../data/venues/ai/ecmlpkdd.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别；信息检索、数据管理与信息系统 | [官方材料](https://ecmlpkdd.org/2026/submissions-research-track/) |
| [IEEE EDL](../data/venues/rf/edl.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 电路、电子器件与微纳系统；电子与光电材料 | [官方材料](https://eds.ieee.org/publications/electron-device-letters) |
| [EITEE](../data/venues/wireless/eitee.yml) | 无线通信 / 人工智能与信息处理 / 电磁、射频与电子技术 → 无线通信 / 人工智能与信息处理 / 电磁、射频与电子技术 | 机器学习与智能通信；边缘计算与云网络；语义与任务导向通信 → 调制、波形与物理层；并行分布式计算与计算系统；控制、自动化与系统工程；电路、电子器件与微纳系统；机器学习与模式识别 | [官方材料](https://jzus.zju.edu.cn/current_c.php) |
| [EMC Europe](../data/venues/rf/emceurope.yml) | 电磁、射频与电子技术 / 无线通信 → 电磁、射频与电子技术 | 电磁兼容与信号完整性；天线、超表面与电磁计算 → 电磁兼容与信号完整性；测量、仪器与频率控制；电路、电子器件与微纳系统 | [官方材料](https://www.emceurope2026.org/About/) |
| [EMNLP](../data/venues/ai/emnlp.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 / 信号处理、感知与控制 | 语音、音频与声学；语义与任务导向通信 → 自然语言处理与语言技术；机器学习与模式识别；语音、音频与声学；信息检索、数据管理与信息系统 | [官方材料](https://2026.emnlp.org/calls/main_conference_papers/) |
| [EPEPS](../data/venues/rf/epeps.yml) | 电磁、射频与电子技术 / 网络与移动系统 → 电磁、射频与电子技术 | 射频、微波与电路；调制、波形与物理层；电磁兼容与信号完整性 → 电磁兼容与信号完整性；电路、电子器件与微纳系统；射频、微波与电路 | [官方材料](https://www.epeps.org/papers.html) |
| [EUROCRYPT](../data/venues/theory/eurocrypt.yml) | 信息论与编码 / 网络与移动系统 → 信息论与编码 / 网络与移动系统 | 信息论与容量；信道编码与译码；通信与网络安全；密码学与信息安全理论 → 密码学与信息安全理论；通信与网络安全 | [官方材料](https://eurocrypt.iacr.org/2026/callforpapers.php) |
| [Frontiers in Signal Processing](../data/venues/signal/frontiers-sp.yml) | 信号处理、感知与控制 / 人工智能与信息处理 / 无线通信 → 信号处理、感知与控制 / 无线通信 | 检测、估计与同步；图像、视频与计算成像；语音、音频与声学；通感一体化 → 信号处理理论与实现；检测、估计与同步；图像、视频与计算成像；语音、音频与声学；雷达、声呐与目标跟踪；生物医学信号、器件与系统 | [官方材料](https://www.frontiersin.org/journals/signal-processing/about) |
| [FSE](../data/venues/theory/fse-crypto.yml) | 信息论与编码 / 无线通信 → 信息论与编码 | 密码学与信息安全理论；通信与网络安全 → 密码学与信息安全理论；通信与网络安全 | [官方材料](https://fse.iacr.org/2026/callforpapers.php) |
| [HealthCom](../data/venues/iot/healthcom.yml) | 物联网与车联网 / 网络与移动系统 → 物联网与车联网 / 网络与移动系统 | 传感器与物联网；网络协议与体系结构 → 生物医学信号、器件与系统；传感器与物联网；移动计算与无线系统；通信与网络安全 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [ICANN](../data/venues/ai/icann.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别 | [官方材料](https://e-nns.org/icann2026/) |
| [ICBC](../data/venues/network/icbc.yml) | 网络与移动系统 → 网络与移动系统 | 通信与网络安全；网络协议与体系结构 → 通信与网络安全；并行分布式计算与计算系统 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [ICLR](../data/venues/ai/iclr.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 / 信号处理、感知与控制 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别；图像、视频与计算成像；自然语言处理与语言技术；语音、音频与声学 | [官方材料](https://iclr.cc/Conferences/2026/CallForPapers) |
| [ICONIP](../data/venues/ai/iconip.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 / 信号处理、感知与控制 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别；自然语言处理与语言技术；控制、自动化与系统工程；生物医学信号、器件与系统 | [官方材料](https://iconip2025.apnns.org/submission/call-for-papers/) |
| [ICTAI](../data/venues/ai/ictai.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 / 网络与移动系统 / 信号处理、感知与控制 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别；知识表示、推理与智能体；自然语言处理与语言技术；图像、视频与计算成像；信息检索、数据管理与信息系统；机器学习与智能通信 | [官方材料](https://ictai.computer.org/2025/) |
| [IET Information Security](../data/venues/network/iet-security.yml) | 信息论与编码 / 网络与移动系统 → 网络与移动系统 / 信息论与编码 | 通信与网络安全；信道编码与译码 → 通信与网络安全；密码学与信息安全理论 | [官方材料](https://ietresearch.onlinelibrary.wiley.com/page/journal/ietis/homepage/productinformation.html) |
| [IJCNN](../data/venues/ai/ijcnn.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别 | [官方材料](https://2025.ijcnn.org/) |
| [IPC](../data/venues/optical/ipc.yml) | 光通信与光子学 / 电磁、射频与电子技术 → 光通信与光子学 | 光纤通信与相干处理；光网络与光互连 → 光子器件与集成光学；光纤通信与相干处理；光网络与光互连 | [官方材料](https://ieeephotonics.org/event/2026-ieee-photonics-conference-ipc/) |
| [IPIN](../data/venues/signal/ipin.yml) | 物联网与车联网 / 信号处理、感知与控制 / 无线通信 → 信号处理、感知与控制 / 无线通信 / 物联网与车联网 | 定位、导航与授时；检测、估计与同步 → 定位、导航与授时；检测、估计与同步 | [官方材料](https://ipin-conference.org/2026/) |
| [Inf. Syst. J.](../data/venues/ai/isj.yml) | 人工智能与信息处理 → 人工智能与信息处理 | 机器学习与智能通信 → 信息检索、数据管理与信息系统 | [官方材料](https://onlinelibrary.wiley.com/page/journal/13652575/homepage/homepagec.html) |
| [ISLC](../data/venues/optical/islc.yml) | 光通信与光子学 → 光通信与光子学 | 光子器件与集成光学；光纤通信与相干处理 → 光子器件与集成光学；电路、电子器件与微纳系统 | [官方材料](https://ieeephotonics.org/conferences/) |
| [ISPCS](../data/venues/signal/ispcs.yml) | 信号处理、感知与控制 / 网络与移动系统 / 物联网与车联网 → 信号处理、感知与控制 / 网络与移动系统 / 物联网与车联网 | 检测、估计与同步；网络测量与性能分析；工业通信与控制网络；定位、导航与授时 → 检测、估计与同步；测量、仪器与频率控制；工业通信与控制网络；定位、导航与授时 | [官方材料](https://ispcs.org/2026/authors/call-for-papers) |
| [J-ISPIN](../data/venues/signal/j-ispin.yml) | 空天地通信与导航 / 信号处理、感知与控制 / 无线通信 → 信号处理、感知与控制 / 无线通信 / 物联网与车联网 | 定位、导航与授时；检测、估计与同步 → 定位、导航与授时；检测、估计与同步；传感器与物联网 | [官方材料](https://ieee-jispin.org/) |
| [JASIST](../data/venues/ai/jasist.yml) | 人工智能与信息处理 → 人工智能与信息处理 | 机器学习与智能通信 → 信息检索、数据管理与信息系统 | [官方材料](https://asistdl.onlinelibrary.wiley.com/journal/23301643) |
| [JASP](../data/venues/signal/jasp.yml) | 信号处理、感知与控制 / 无线通信 → 信号处理、感知与控制 | 检测、估计与同步；阵列与多通道处理；雷达、声呐与目标跟踪；调制、波形与物理层 → 信号处理理论与实现；检测、估计与同步 | [官方材料](https://link.springer.com/journal/13634/aims-and-scope) |
| [J. Electron. Mater.](../data/venues/rf/jem.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 电子与光电材料；电路、电子器件与微纳系统 | [官方材料](https://link.springer.com/journal/11664) |
| [J. Electron. Packag.](../data/venues/rf/jep.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 电路、电子器件与微纳系统；电子与光电材料 | [官方材料](https://www.asme.org/getmedia/b624ae24-6208-4a85-bae5-8d4462f65d6c/2024_ASMEDC_Catalog.pdf) |
| [IEEE JESTPE](../data/venues/rf/jestpe.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 电力电子与能量变换；电路、电子器件与微纳系统 | [官方材料](https://www.ieee-pels.org/publications/journal-of-emerging-and-selected-topics-in-power-electronics/) |
| [JETCAS](../data/venues/rf/jetcas.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 / 信号处理、感知与控制 | 射频、微波与电路；机器学习与智能通信 → 电路、电子器件与微纳系统；信号处理理论与实现 | [官方材料](https://ieee-cas.org/publication/JETCAS) |
| [JMEMS](../data/venues/rf/jmems.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 / 物联网与车联网 | 射频、微波与电路 → 电路、电子器件与微纳系统；测量、仪器与频率控制 | [官方材料](https://eds.ieee.org/publications/journal-of-microelectromechanical-systems) |
| [Journal of the Optical Society of America A-Optics Image Science and Vision](../data/venues/optical/josaa.yml) | 光通信与光子学 / 信号处理、感知与控制 → 光通信与光子学 / 信号处理、感知与控制 | 图像、视频与计算成像；检测、估计与同步；无线光与可见光通信 → 图像、视频与计算成像；光子器件与集成光学；光学传感与测量 | [官方材料](https://opg.optica.org/journal/josaa/pdfs/JOSAA-ReviewCriteria.pdf) |
| [JQE](../data/venues/optical/jqe.yml) | 光通信与光子学 / 电磁、射频与电子技术 → 光通信与光子学 / 电磁、射频与电子技术 | 光子器件与集成光学 → 光子器件与集成光学；量子通信与量子信息 | [官方材料](https://ieeephotonics.org/publications/journal-of-quantum-electronics/) |
| [JSEE](../data/venues/signal/jsee.yml) | 空天地通信与导航 / 信号处理、感知与控制 / 电磁、射频与电子技术 → 信号处理、感知与控制 / 无线通信 / 网络与移动系统 | 卫星通信与非地面网络 → 控制、自动化与系统工程；雷达、声呐与目标跟踪；调制、波形与物理层；网络协议与体系结构；信号处理理论与实现 | [官方材料](https://www.jseepub.com/EN/column/column13.shtml) |
| [Journal of Signal Processing Systems](../data/venues/signal/jsps.yml) | 信号处理、感知与控制 / 电磁、射频与电子技术 → 信号处理、感知与控制 / 电磁、射频与电子技术 / 人工智能与信息处理 | 检测、估计与同步；图像、视频与计算成像；阵列与多通道处理 → 信号处理理论与实现；电路、电子器件与微纳系统；机器学习与模式识别；图像、视频与计算成像 | [官方材料](https://link.springer.com/journal/11265/aims-and-scope) |
| [IEEE JSSC](../data/venues/rf/jssc.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 电路、电子器件与微纳系统 | [官方材料](https://sscs.ieee.org/publications/ieee-journal-of-solid-state-circuits-jssc/) |
| [JSTSP](../data/venues/signal/jstsp.yml) | 信号处理、感知与控制 / 无线通信 / 人工智能与信息处理 → 信号处理、感知与控制 / 无线通信 / 人工智能与信息处理 | 检测、估计与同步；阵列与多通道处理；图像、视频与计算成像；机器学习与智能通信；通感一体化；语音、音频与声学；稀疏处理与压缩感知 → 信号处理理论与实现；检测、估计与同步；阵列与多通道处理；图像、视频与计算成像；语音、音频与声学；雷达、声呐与目标跟踪；机器学习与模式识别 | [官方材料](https://signalprocessingsociety.org/publications-resources/ieee-journal-selected-topics-signal-processing) |
| [KR](../data/venues/ai/kr.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 | 机器学习与智能通信；语义与任务导向通信 → 知识表示、推理与智能体；机器学习与模式识别；信息检索、数据管理与信息系统 | [官方材料](https://kr.org/KR2026/) |
| [LATINCOM](../data/venues/wireless/latincom.yml) | 无线通信 / 信息论与编码 / 网络与移动系统 → 无线通信 / 网络与移动系统 / 物联网与车联网 | 调制、波形与物理层；网络协议与体系结构 → 调制、波形与物理层；网络协议与体系结构；移动计算与无线系统；机器学习与智能通信；边缘计算与云网络；通信与网络安全 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [LNET](../data/venues/network/lnet.yml) | 网络与移动系统 / 无线通信 → 网络与移动系统 / 无线通信 | 网络协议与体系结构；网络测量与性能分析 → 网络协议与体系结构；网络测量与性能分析；网络管理与虚拟化；通信与网络安全；移动计算与无线系统；边缘计算与云网络 | [官方材料](https://www.comsoc.org/publications/journals/ieee-lnet) |
| [IEEE Magn. Lett.](../data/venues/rf/maglett.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 磁学、磁性材料与器件；电子与光电材料 | [官方材料](https://ieeemagnetics.org/publication/ieee-magnetics-letters) |
| [MECOM](../data/venues/wireless/mecom.yml) | 无线通信 / 信息论与编码 / 网络与移动系统 → 无线通信 / 网络与移动系统 / 物联网与车联网 | 调制、波形与物理层；网络协议与体系结构 → 调制、波形与物理层；网络协议与体系结构；传感器与物联网；通信与网络安全 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [MeditCom](../data/venues/wireless/meditcom.yml) | 无线通信 / 信息论与编码 / 网络与移动系统 → 无线通信 / 网络与移动系统 / 物联网与车联网 | 调制、波形与物理层；网络协议与体系结构；机器学习与智能通信 → 调制、波形与物理层；网络协议与体系结构；移动计算与无线系统；机器学习与智能通信；边缘计算与云网络；通信与网络安全 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [Nanotechnology](../data/venues/rf/nanotech.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 电子与光电材料；电路、电子器件与微纳系统 | [官方材料](https://publishingsupport.iopscience.iop.org/journals/nanotechnology/) |
| [Nat. Electron.](../data/venues/rf/nat-electron.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 电路、电子器件与微纳系统；电子与光电材料；传感器与物联网 | [官方材料](https://www.nature.com/natelectron/aims) |
| [npj Flex. Electron.](../data/venues/rf/npj-flex.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 / 物联网与车联网 | 射频、微波与电路 → 电路、电子器件与微纳系统；电子与光电材料；传感器与物联网 | [官方材料](https://www.nature.com/npjflexelectron/aims) |
| [OFS](../data/venues/optical/ofs.yml) | 光通信与光子学 / 物联网与车联网 → 光通信与光子学 / 物联网与车联网 / 信号处理、感知与控制 | 光子器件与集成光学；光纤通信与相干处理；光网络与光互连 → 光学传感与测量；光子器件与集成光学；传感器与物联网；测量、仪器与频率控制 | [官方材料](https://ofs30.org/scope-topics/) |
| [OJSP](../data/venues/signal/ojsp.yml) | 信号处理、感知与控制 → 信号处理、感知与控制 | 检测、估计与同步；阵列与多通道处理；语音、音频与声学；图像、视频与计算成像 → 检测、估计与同步；阵列与多通道处理；语音、音频与声学；图像、视频与计算成像；信号处理理论与实现；机器学习与模式识别 | [官方材料](https://signalprocessingsociety.org/publications-resources/ieee-open-journal-signal-processing) |
| [Optical Materials Express](../data/venues/optical/ome.yml) | 光通信与光子学 → 光通信与光子学 | 光子器件与集成光学；光纤通信与相干处理 → 光子器件与集成光学；电子与光电材料 | [官方材料](https://opg.optica.org/content/journal/about/item/ome/) |
| [Photonic Sensors](../data/venues/optical/photonic-sensors.yml) | 光通信与光子学 / 物联网与车联网 → 光通信与光子学 / 物联网与车联网 | 光子器件与集成光学；光纤通信与相干处理；通感一体化 → 光学传感与测量；光子器件与集成光学；传感器与物联网；测量、仪器与频率控制 | [官方材料](https://www.sciopen.com/journal/1674-9251) |
| [PKC](../data/venues/theory/pkc.yml) | 信息论与编码 / 无线通信 → 信息论与编码 | 密码学与信息安全理论；通信与网络安全 → 密码学与信息安全理论；通信与网络安全 | [官方材料](https://pkc.iacr.org/2026/callforpapers.php) |
| [PRICAI](../data/venues/ai/pricai.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 / 信号处理、感知与控制 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别；知识表示、推理与智能体；自然语言处理与语言技术；图像、视频与计算成像；信息检索、数据管理与信息系统 | [官方材料](https://2026.pricai.org/calls/call-for-papers) |
| [SmartGridComm](../data/venues/iot/smartgridcomm.yml) | 物联网与车联网 / 网络与移动系统 / 信号处理、感知与控制 → 物联网与车联网 / 网络与移动系统 / 信号处理、感知与控制 | 工业通信与控制网络；传感器与物联网；网络协议与体系结构 → 工业通信与控制网络；传感器与物联网；网络协议与体系结构；通信与网络安全；控制、自动化与系统工程 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [SPL](../data/venues/signal/spl.yml) | 信号处理、感知与控制 / 无线通信 / 人工智能与信息处理 → 信号处理、感知与控制 / 无线通信 / 人工智能与信息处理 | 检测、估计与同步；阵列与多通道处理；语音、音频与声学；图像、视频与计算成像；稀疏处理与压缩感知 → 检测、估计与同步；阵列与多通道处理；语音、音频与声学；图像、视频与计算成像；稀疏处理与压缩感知；信号处理理论与实现；自然语言处理与语言技术 | [官方材料](https://signalprocessingsociety.org/publications-resources/ieee-signal-processing-letters) |
| [IEEE SysJ](../data/venues/signal/sysj.yml) | 网络与移动系统 / 物联网与车联网 / 无线通信 → 信号处理、感知与控制 / 网络与移动系统 / 物联网与车联网 | 卫星通信与非地面网络；传感器与物联网；网络管理与虚拟化；通信与网络安全 → 控制、自动化与系统工程；并行分布式计算与计算系统；工业通信与控制网络 | [官方材料](https://ieeesystemscouncil.org/publication/ieee-systems-journal) |
| [TAES](../data/venues/space/taes.yml) | 空天地通信与导航 / 信号处理、感知与控制 / 无线通信 → 空天地通信与导航 / 信号处理、感知与控制 / 电磁、射频与电子技术 | 航空航天电子与系统；雷达、声呐与目标跟踪；定位、导航与授时；卫星通信与非地面网络；通感一体化；无人机通信与低空网络 → 航空航天电子与系统；雷达、声呐与目标跟踪；定位、导航与授时；控制、自动化与系统工程 | [官方材料](https://ieee-aess.org/publications/taes) |
| [TASLP](../data/venues/signal/taslp.yml) | 信号处理、感知与控制 / 人工智能与信息处理 → 信号处理、感知与控制 / 人工智能与信息处理 | 语音、音频与声学；机器学习与智能通信 → 语音、音频与声学；自然语言处理与语言技术；机器学习与模式识别 | [官方材料](https://signalprocessingsociety.org/publications-resources/ieee-transactions-audio-speech-and-language-processing) |
| [IEEE TBCAS](../data/venues/rf/tbcas.yml) | 信号处理、感知与控制 → 电磁、射频与电子技术 / 信号处理、感知与控制 / 物联网与车联网 | 检测、估计与同步 → 生物医学信号、器件与系统；电路、电子器件与微纳系统；传感器与物联网 | [官方材料](https://ieee-cas.org/tbiocas-current-issue) |
| [IEEE TCAD](../data/venues/rf/tcad.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 / 网络与移动系统 | 射频、微波与电路 → 电路、电子器件与微纳系统；并行分布式计算与计算系统 | [官方材料](https://ieee-ceda.org/publications/tcad) |
| [TCAS-I](../data/venues/rf/tcas1.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 / 信号处理、感知与控制 | 射频、微波与电路 → 电路、电子器件与微纳系统；信号处理理论与实现；控制、自动化与系统工程 | [官方材料](https://ieee-cas.org/publication/TCAS-I) |
| [TCAS-II](../data/venues/rf/tcas2.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 / 信号处理、感知与控制 | 射频、微波与电路 → 电路、电子器件与微纳系统；信号处理理论与实现 | [官方材料](https://ieee-cas.org/publication/TCAS-II) |
| [IEEE TCC](../data/venues/network/tcc.yml) | 网络与移动系统 / 人工智能与信息处理 → 网络与移动系统 | 网络协议与体系结构 → 边缘计算与云网络；并行分布式计算与计算系统；网络管理与虚拟化；通信与网络安全 | [官方材料](https://ieeecs-media.computer.org/media/marketing/brand/IEEE_Computer_Society_Publications.pdf) |
| [TCOM](../data/venues/wireless/tcom.yml) | 无线通信 / 信号处理、感知与控制 / 信息论与编码 → 无线通信 / 信号处理、感知与控制 / 信息论与编码 | 调制、波形与物理层；信道编码与译码；信源编码与压缩；检测、估计与同步；多天线与波束成形；多址接入与短包通信；信道建模与传播；卫星通信与非地面网络；无线光与可见光通信；光纤通信与相干处理；全双工与自干扰消除；物理层安全与隐蔽通信 → 调制、波形与物理层；信道编码与译码；信源编码与压缩；检测、估计与同步；多天线与波束成形；多址接入与短包通信；信道建模与传播；卫星通信与非地面网络；无线光与可见光通信；光纤通信与相干处理；全双工与自干扰消除；物理层安全与隐蔽通信；量子通信与量子信息；毫米波与太赫兹 | [官方材料](https://www.comsoc.org/publications/journals/ieee-transactions-communications) |
| [IEEE TDSC](../data/venues/network/tdsc.yml) | 信息论与编码 / 网络与移动系统 → 网络与移动系统 | 信息论与容量 → 通信与网络安全；并行分布式计算与计算系统 | [官方材料](https://www.computer.org/digital-library/journals/tq/cfp-dependable-secure-computing) |
| [IEEE TED](../data/venues/rf/ted.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 电路、电子器件与微纳系统；电子与光电材料 | [官方材料](https://eds.ieee.org/publications/transactions-on-electron-devices) |
| [IEEE TII](../data/venues/iot/tii.yml) | 物联网与车联网 / 网络与移动系统 / 人工智能与信息处理 → 物联网与车联网 / 网络与移动系统 / 人工智能与信息处理 | 传感器与物联网 → 工业通信与控制网络；控制、自动化与系统工程；传感器与物联网；并行分布式计算与计算系统；通信与网络安全 | [官方材料](https://www.ieee-ies.org/pubs?highlight=WyJpIiwiaSdkIiwiaW4iXQ%3D%3D) |
| [IEEE TIM](../data/venues/signal/tim.yml) | 信号处理、感知与控制 / 电磁、射频与电子技术 / 物联网与车联网 → 信号处理、感知与控制 / 电磁、射频与电子技术 / 物联网与车联网 | 检测、估计与同步 → 测量、仪器与频率控制；传感器与物联网；信号处理理论与实现 | [官方材料](https://ieee-ims.org/publication/ieee-tim) |
| [IEEE TKDE](../data/venues/ai/tkde.yml) | 人工智能与信息处理 / 网络与移动系统 → 人工智能与信息处理 / 网络与移动系统 | 机器学习与智能通信 → 信息检索、数据管理与信息系统；知识表示、推理与智能体；并行分布式计算与计算系统 | [官方材料](https://www.computer.org/digital-library/journals/tk/cfp-ieee-transactions-on-knowledge-data-engineering) |
| [IEEE TMAG](../data/venues/rf/tmag.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 磁学、磁性材料与器件；电子与光电材料 | [官方材料](https://ieeemagnetics.org/publication/ieee-transactions-magnetics) |
| [TMM](../data/venues/signal/tmm.yml) | 信号处理、感知与控制 / 人工智能与信息处理 / 网络与移动系统 → 信号处理、感知与控制 / 人工智能与信息处理 / 网络与移动系统 | 图像、视频与计算成像；信源编码与压缩；边缘计算与云网络 → 图像、视频与计算成像；信源编码与压缩；语音、音频与声学；信号处理理论与实现 | [官方材料](https://signalprocessingsociety.org/publications-resources/ieee-transactions-multimedia) |
| [ACM TOMM](../data/venues/signal/tomm.yml) | 网络与移动系统 / 信号处理、感知与控制 / 人工智能与信息处理 → 信号处理、感知与控制 / 人工智能与信息处理 / 网络与移动系统 | 网络协议与体系结构 → 图像、视频与计算成像；语音、音频与声学；信源编码与压缩 | [官方材料](https://tomccap.hosting.acm.org/guide.html) |
| [IEEE TPAMI](../data/venues/ai/tpami.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 / 信号处理、感知与控制 | 机器学习与智能通信 → 图像、视频与计算成像；机器学习与模式识别 | [官方材料](https://www.computer.org/digital-library/journals/tp/cfp-ieee-pattern-analysis-machine-intelligence) |
| [IEEE TPDS](../data/venues/network/tpds.yml) | 网络与移动系统 / 人工智能与信息处理 → 网络与移动系统 | 网络协议与体系结构 → 并行分布式计算与计算系统；边缘计算与云网络 | [官方材料](https://www.computer.org/digital-library/journals/td/cfp-parallel-distributed-systems) |
| [IEEE TPEL](../data/venues/rf/tpel.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 电力电子与能量变换；电路、电子器件与微纳系统 | [官方材料](https://tpel.ieee.org/special-sections/) |
| [TSIPN](../data/venues/signal/tsipn.yml) | 信号处理、感知与控制 / 网络与移动系统 / 信息论与编码 → 信号处理、感知与控制 / 网络与移动系统 / 人工智能与信息处理 | 网络协议与体系结构；阵列与多通道处理；分布式学习与协同推理 → 信号处理理论与实现；检测、估计与同步；分布式学习与协同推理 | [官方材料](https://signalprocessingsociety.org/publications-resources/ieee-transactions-signal-and-information-processing-over-networks) |
| [IEEE TSM](../data/venues/rf/tsm.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 | 射频、微波与电路 → 电路、电子器件与微纳系统；电子与光电材料；测量、仪器与频率控制 | [官方材料](https://eds.ieee.org/publications/transactions-on-semiconductor-manufacturing) |
| [TSP](../data/venues/signal/tsp.yml) | 信号处理、感知与控制 / 无线通信 / 信息论与编码 → 信号处理、感知与控制 / 无线通信 / 信息论与编码 | 检测、估计与同步；阵列与多通道处理；雷达、声呐与目标跟踪；机器学习与智能通信；通感一体化；多天线与波束成形；调制、波形与物理层；稀疏处理与压缩感知 → 信号处理理论与实现；检测、估计与同步；阵列与多通道处理；雷达、声呐与目标跟踪；图像、视频与计算成像；语音、音频与声学；稀疏处理与压缩感知；机器学习与模式识别 | [官方材料](https://signalprocessingsociety.org/publications-resources/ieee-transactions-signal-processing) |
| [IEEE TUFFC](../data/venues/signal/tuffc.yml) | 信号处理、感知与控制 / 电磁、射频与电子技术 → 信号处理、感知与控制 / 电磁、射频与电子技术 | 检测、估计与同步 → 测量、仪器与频率控制；电路、电子器件与微纳系统；生物医学信号、器件与系统 | [官方材料](https://ieee-uffc.org/t-uffc/ieee-transactions-ultrasonics-ferroelectrics-and-frequency-control-home) |
| [IEEE TVLSI](../data/venues/rf/tvlsi.yml) | 电磁、射频与电子技术 → 电磁、射频与电子技术 / 网络与移动系统 | 射频、微波与电路 → 电路、电子器件与微纳系统；并行分布式计算与计算系统 | [官方材料](https://ieee-cas.org/publication/tvlsi) |
| [UAI](../data/venues/ai/uai.yml) | 人工智能与信息处理 / 信号处理、感知与控制 → 人工智能与信息处理 | 机器学习与智能通信；分布式学习与协同推理 → 机器学习与模式识别；检测、估计与同步 | [官方材料](https://www.auai.org/uai2026/call_for_papers) |
| [VNC](../data/venues/iot/vnc.yml) | 物联网与车联网 / 无线通信 / 网络与移动系统 → 物联网与车联网 / 无线通信 / 网络与移动系统 | 车联网与移动载体；网络协议与体系结构 → 车联网与移动载体；网络协议与体系结构；通信与网络安全；网络管理与虚拟化；机器学习与智能通信；通感一体化 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [WF-IoT](../data/venues/iot/wf-iot.yml) | 物联网与车联网 / 网络与移动系统 / 信号处理、感知与控制 → 物联网与车联网 / 网络与移动系统 / 人工智能与信息处理 | 传感器与物联网；工业通信与控制网络；边缘计算与云网络；反向散射与无线能量传输 → 传感器与物联网；边缘计算与云网络；机器学习与智能通信；通信与网络安全 | [官方材料](https://www.comsoc.org/conferences-events/portfolio-conferences-events) |
| [WOCC](../data/venues/wireless/wocc.yml) | 无线通信 → 无线通信 / 光通信与光子学 / 人工智能与信息处理 | 调制、波形与物理层；多天线与波束成形；频谱与无线资源管理 → 调制、波形与物理层；多天线与波束成形；频谱与无线资源管理；光纤通信与相干处理；光网络与光互连；机器学习与智能通信；分布式学习与协同推理；智能超表面与可重构传播；无人机通信与低空网络 | [官方材料](http://www.wocc.org/wocc2026/CallforPaper.html) |
| [WONS](../data/venues/network/wons.yml) | 无线通信 / 网络与移动系统 → 网络与移动系统 / 无线通信 / 物联网与车联网 | 调制、波形与物理层；多天线与波束成形；频谱与无线资源管理 → 网络协议与体系结构；移动计算与无线系统；边缘计算与云网络；网络管理与虚拟化；机器学习与智能通信；分布式学习与协同推理；通感一体化；通信与网络安全 | [官方材料](https://2026.wons-conference.org/) |
| [APNet 2026](../data/calls/2026/apnet-2026.yml) | 网络与移动系统 → 网络与移动系统 | 网络协议与体系结构；网络测量与性能分析；网络管理与虚拟化 → 网络协议与体系结构；网络测量与性能分析；网络管理与虚拟化；边缘计算与云网络；机器学习与智能通信；通信与网络安全 | [官方材料](https://conferences.sigcomm.org/events/apnet2026/cfp.php) |
| [ATC 2026 · 主会论文](../data/calls/2026/atc-2026-main.yml) | 无线通信 / 网络与移动系统 / 信号处理、感知与控制 / 电磁、射频与电子技术 → 无线通信 / 网络与移动系统 / 信号处理、感知与控制 / 电磁、射频与电子技术 | 调制、波形与物理层；网络协议与体系结构；阵列与多通道处理；天线、超表面与电磁计算 → 调制、波形与物理层；网络协议与体系结构；阵列与多通道处理；天线、超表面与电磁计算；电路、电子器件与微纳系统；射频、微波与电路；机器学习与智能通信；信息论与容量 | [官方材料](https://atc-conf.org/call-for-papers/call-for-papers) |
| [IEEE IPC 2026 · 晚稿论文](../data/calls/2026/ipc-2026-postdeadline.yml) | 光通信与光子学 / 信号处理、感知与控制 / 网络与移动系统 → 光通信与光子学 | 光纤通信与相干处理；光网络与光互连 → 光子器件与集成光学；光纤通信与相干处理；光网络与光互连 | [官方材料](https://ieee-ipc.org/paper-submission/submission-guidelines/) |
| [IPIN 2026 · 主会论文](../data/calls/2026/ipin-2026-main.yml) | 空天地通信与导航 / 信号处理、感知与控制 / 无线通信 → 信号处理、感知与控制 / 无线通信 / 物联网与车联网 | 定位、导航与授时；检测、估计与同步 → 定位、导航与授时；检测、估计与同步 | [官方材料](https://ipin-conference.org/2026/) |
| [ISPCS 2026 · 主会论文](../data/calls/2026/ispcs-2026-main.yml) | 信号处理、感知与控制 / 网络与移动系统 / 物联网与车联网 → 信号处理、感知与控制 / 网络与移动系统 / 物联网与车联网 | 检测、估计与同步；网络测量与性能分析；工业通信与控制网络；定位、导航与授时 → 检测、估计与同步；测量、仪器与频率控制；工业通信与控制网络；定位、导航与授时 | [官方材料](https://ispcs.org/2026/) |
| [三维超表面辅助无线通信：从模型到智能方法](../data/calls/2027/wcm-metasurface-2027.yml) | 无线通信 / 电磁、射频与电子技术 / 人工智能与信息处理 / 信号处理、感知与控制 → 无线通信 / 电磁、射频与电子技术 / 人工智能与信息处理 / 信号处理、感知与控制 | 天线、超表面与电磁计算；多天线与波束成形 → 天线、超表面与电磁计算；智能超表面与可重构传播；多天线与波束成形；机器学习与智能通信；通感一体化；频谱与无线资源管理；信道建模与传播；物理层安全与隐蔽通信 | [官方材料](https://www.comsoc.org/publications/magazines/ieee-wireless-communications/cfp/3d-metasurface-assisted-wireless-communications-model-based-designs-ai-driven-approaches) |
| [在轨计算：迈向空间智能时代](../data/calls/2026/wcm-orbit-2026.yml) | 空天地通信与导航 / 网络与移动系统 / 人工智能与信息处理 → 空天地通信与导航 / 网络与移动系统 / 人工智能与信息处理 | 卫星通信与非地面网络 → 卫星通信与非地面网络；并行分布式计算与计算系统；分布式学习与协同推理；机器学习与智能通信；通感一体化 | [官方材料](https://www.comsoc.org/publications/magazines/ieee-wireless-communications/cfp/orbit-computing-striding-era-space-centric-intelligence) |
| [人工智能赋能水下无线光通信](../data/calls/2026/wcm-underwater-optical-2026.yml) | 光通信与光子学 / 人工智能与信息处理 / 无线通信 → 光通信与光子学 / 人工智能与信息处理 / 无线通信 | 无线光与可见光通信 → 无线光与可见光通信；机器学习与智能通信 | [官方材料](https://www.comsoc.org/publications/magazines/ieee-wireless-communications/cfp/ai-empowered-underwater-wireless-optical-communications-science-exploration-and-defense-applications) |

## 后续维护队列

本轮深核优先处理高影响的语义错配。剩余队列按“模板化风险 → 缺少独立官方入口 → 已取到页面但尚未完成范围审阅 → 历史参考”继续核对。尤其需要补读其余电子材料/微电子刊物、通用计算会议的无线辅方向，以及历史AI会议；不根据一次抓取响应自动判定其主题。
