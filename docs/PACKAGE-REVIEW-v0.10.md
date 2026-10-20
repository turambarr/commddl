# v0.10.0 用户目录包评估与加入记录

日期：2026-10-20。基线：`v0.9.0`，提交 `7c1c076`。

本次把用户目录包作为补录线索，逐条对应现有载体，再从会议、学会、出版社和独立评级目录补证。文档里的 Agent 操作模板没有作为项目指令执行，现有 YAML 源目录和构建流程继续使用。

## 评估结果

| 项目 | 材料中的说法 | 实际检查 |
|---|---|---|
| 总量 | Markdown正文930，JSON汇总940 | JSON实际685条，另有Markdown期刊263条；合计948行候选记录，尚未跨组去重 |
| JSON编号 | 468 + 155 + 62条 | 685行、682个不同编号；`iceiec`、`aict`、`iccsnt`跨组重复 |
| 期刊 | 汇总255本 | 表格263本；263/263按现有编号和ISSN对应，目录已覆盖 |
| 北邮原编号 | 732条原始记录 | 732个来源编号齐全；身份错配、附属专题与委员会名称另行清理 |
| 分类 | 9大方向、37主题 | 复用现有9方向、46主题；不把程序语言、软件工程等条目因AI/NET标签划入通信 |
| 等级 | 自制COMM_TIER和若干CCF/CORE推断 | 采用独立来源中的明确数值，保留体系、年份与证据类型 |
| 学校认定 | 按会议品牌给出“发表即可毕业” | 沿用2018文件的原文条款、作者和正式发表条件；不新增逐会毕业资格标签 |

原学校文件第三条使用“EI收录刊源”及本学科指定重要会议等原文表述，第四条列出硕士发表渠道；会议品牌、计划提交数据库、推荐期刊与具体成果认定分开记录。[学校原文件](https://xxgk.bupt.edu.cn/__local/F/65/92/3A361334F005A224CD3C6C215B7_43DF8061_C1241.pdf?e=.pdf)

## 本次加入

- 新增124个独立会议载体：123个进入主目录，ISPLC作为历史会议保留。
- 目录达到325本主目录期刊、339个主目录会议、41项历史参考。
- 新增载体中46项有CCF明确等级，59项有CORE明确等级；其中7项采用有明确数值的历史CORE版本。两组有重叠，不相加作为会议总数。
- CCF2026来自独立公开副本，标为副本证据；CORE使用本项目2026-10-19保存的官方完整库快照，本次重新读取、按全称及核实旧名匹配，保留快照日期和原始年份。
- 已有期刊的SCI/SCIE索引、分区、历年等级和来源保持原记录。材料中的未注明依据数值没有覆盖原证据。
- GFP对应已有SiPhotonics，IEEE 5G World Forum对应已有FNWF；补充搜索别名，保持稳定编号。

身份来源包括[中国电子学会2022原始会议目录](https://www.cie.org.cn/static/upload/file/20221202/1669968111348411.pdf)、[URSI论文集记录](https://www.ursi.org/proceedings.php)、[Optica会议列表](https://www.optica.org/events/meeting_archives/2026/photonic_networks_and_devices_networks/)、[IEEE工业电子学会](https://www.ieee-ies.org/conferences?highlight=WyJzaWkiXQ%3D%3D)、会议官方页面及出版社系列页。每个YAML保存自身来源；历史目录只按原年份使用。

## 日期

| 新增活动 | 论文截止 | 来源 |
|---|---|---|
| RFID2027会议论文Option A | 2027-01-14 | [当届作者页](https://2027.ieee-rfid.org/authors/) |
| WFCS2027常规与专题论文 | 2027-01-11 | [当届日期页](https://wfcs2027.ieee-ies.org/calls_and_dates/index.html) |

两项均只明确到日期，保留日期精度。录用和终稿节点分别记录。RFID的期刊双轨日期冲突留在维护记录，WFCS的短篇研究进展和演示稿另有截止，均未混入上述正式论文活动。

## 逐项处置

685条JSON候选和263条期刊逐行保存在[维护审计](../maintenance/catalog-package-v0.10.json)。同一新增载体可能被多个候选记录引用，因此“added”行数与124个新增载体不同。

- `existing`：201行。
- `outside-communications`：216行。
- `identity-review`：7行。
- `source-review`：110行。
- `added`：133行。
- `activity-group`：11行。
- `publication-form-review`：7行。

- `existing`：对齐已有记录，保持编号。
- `added`：已有独立来源，加入对应YAML；跨组重复指向同一载体。
- `outside-communications`：本次通信目录之外的计算机基础、软件等记录。
- `identity-review`、`source-review`：身份、旧名、主办或正式出版资料继续核对。
- `activity-group`：附属研讨会总称或主会内部专题，取得当届征稿后进入calls。
- `publication-form-review`：平台、刊物或综合大会按出版形式分别整理。

后四类的核对事项保存在维护区，不进入网页提示。委员会不当作会议，平台不当作期刊，计划索引不当作已收录。ITC、ICCE、FSE、SEC、DASC、ENC和CCC等同缩写记录逐一区分。

## 新增文件

| 方向 | 新增载体 |
|---|---|
| 无线通信 | [africon](../data/venues/wireless/africon.yml)、[balkancom](../data/venues/wireless/balkancom.yml)、[cic-ac](../data/venues/wireless/cic-ac.yml)、[cic-ctts](../data/venues/wireless/cic-ctts.yml)、[eurocon](../data/venues/wireless/eurocon.yml)、[ictc](../data/venues/wireless/ictc.yml)、[icumt](../data/venues/wireless/icumt.yml)、[isplc](../data/venues/wireless/isplc.yml)、[softcom](../data/venues/wireless/softcom.yml)、[tencon](../data/venues/wireless/tencon.yml)、[wasa](../data/venues/wireless/wasa.yml)、[wd](../data/venues/wireless/wd.yml)、[wimob](../data/venues/wireless/wimob.yml)、[wwic](../data/venues/wireless/wwic.yml) |
| 信号处理与通感 | [apsar](../data/venues/signal/apsar.yml)、[ccf-ncmmsc](../data/venues/signal/ccf-ncmmsc.yml)、[cie-radar](../data/venues/signal/cie-radar.yml)、[icsp](../data/venues/signal/icsp.yml)、[irs](../data/venues/signal/irs.yml) |
| 信息论与编码 | [ches](../data/venues/theory/ches.yml)、[ctrsa](../data/venues/theory/ctrsa.yml)、[cwit](../data/venues/theory/cwit.yml)、[fse-crypto](../data/venues/theory/fse-crypto.yml)、[icisc](../data/venues/theory/icisc.yml)、[inscrypt](../data/venues/theory/inscrypt.yml)、[iwsda](../data/venues/theory/iwsda.yml)、[izs](../data/venues/theory/izs.yml)、[pkc](../data/venues/theory/pkc.yml)、[provsec](../data/venues/theory/provsec.yml)、[sac](../data/venues/theory/sac.yml)、[seta](../data/venues/theory/seta.yml)、[wcc](../data/venues/theory/wcc.yml) |
| 网络与移动系统 | [acisp](../data/venues/network/acisp.yml)、[acns](../data/venues/network/acns.yml)、[acsac](../data/venues/network/acsac.yml)、[aina](../data/venues/network/aina.yml)、[asiaccs](../data/venues/network/asiaccs.yml)、[cloud](../data/venues/network/cloud.yml)、[drcn](../data/venues/network/drcn.yml)、[esorics](../data/venues/network/esorics.yml)、[giis](../data/venues/network/giis.yml)、[hpcc](../data/venues/network/hpcc.yml)、[icdcs](../data/venues/network/icdcs.yml)、[icics](../data/venues/network/icics.yml)、[icpads](../data/venues/network/icpads.yml)、[isc](../data/venues/network/isc.yml)、[itc-teletraffic](../data/venues/network/itc-teletraffic.yml)、[mascots](../data/venues/network/mascots.yml)、[nocs](../data/venues/network/nocs.yml)、[npc](../data/venues/network/npc.yml)、[pam](../data/venues/network/pam.yml)、[pets](../data/venues/network/pets.yml)、[raid](../data/venues/network/raid.yml)、[sec](../data/venues/network/sec.yml)、[socc-cloud](../data/venues/network/socc-cloud.yml)、[sosr](../data/venues/network/sosr.yml)、[srds](../data/venues/network/srds.yml)、[tma](../data/venues/network/tma.yml)、[trustcom](../data/venues/network/trustcom.yml) |
| 光通信与光网络 | [apos](../data/venues/optical/apos.yml)、[ciop](../data/venues/optical/ciop.yml)、[cos-annual](../data/venues/optical/cos-annual.yml)、[ecio](../data/venues/optical/ecio.yml)、[iprsn](../data/venues/optical/iprsn.yml)、[moc](../data/venues/optical/moc.yml)、[networks-optica](../data/venues/optical/networks-optica.yml)、[pgc](../data/venues/optical/pgc.yml)、[pw](../data/venues/optical/pw.yml)、[sppcom](../data/venues/optical/sppcom.yml) |
| 天线射频与电磁 | [aces](../data/venues/rf/aces.yml)、[apemc](../data/venues/rf/apemc.yml)、[asscc](../data/venues/rf/asscc.yml)、[cie-emc](../data/venues/rf/cie-emc.yml)、[cie-ncap](../data/venues/rf/cie-ncap.yml)、[cie-ncmmw](../data/venues/rf/cie-ncmmw.yml)、[cie-radio](../data/venues/rf/cie-radio.yml)、[edaps](../data/venues/rf/edaps.yml)、[emceurope](../data/venues/rf/emceurope.yml)、[glsvlsi](../data/venues/rf/glsvlsi.yml)、[iceaa](../data/venues/rf/iceaa.yml)、[iedm](../data/venues/rf/iedm.yml)、[imbioc](../data/venues/rf/imbioc.yml)、[iscas](../data/venues/rf/iscas.yml)、[isvlsi](../data/venues/rf/isvlsi.yml)、[iwem](../data/venues/rf/iwem.yml)、[ursi-aprasc](../data/venues/rf/ursi-aprasc.yml)、[ursi-atrasc](../data/venues/rf/ursi-atrasc.yml)、[ursi-gass](../data/venues/rf/ursi-gass.yml) |
| 卫星与空天地通信 | [dasc](../data/venues/space/dasc.yml)、[enc](../data/venues/space/enc.yml)、[iac](../data/venues/space/iac.yml) |
| 物联网与车联网 | [ccc-cn](../data/venues/iot/ccc-cn.yml)、[ccdc](../data/venues/iot/ccdc.yml)、[ccf-hhme](../data/venues/iot/ccf-hhme.yml)、[cic-iot](../data/venues/iot/cic-iot.yml)、[coins](../data/venues/iot/coins.yml)、[dcoss](../data/venues/iot/dcoss.yml)、[etfa](../data/venues/iot/etfa.yml)、[ewsn](../data/venues/iot/ewsn.yml)、[icce](../data/venues/iot/icce.yml)、[iecon](../data/venues/iot/iecon.yml)、[ieee-sensors](../data/venues/iot/ieee-sensors.yml)、[indin](../data/venues/iot/indin.yml)、[iv](../data/venues/iot/iv.yml)、[mobiquitous](../data/venues/iot/mobiquitous.yml)、[rfid](../data/venues/iot/rfid.yml)、[smartcomp](../data/venues/iot/smartcomp.yml)、[uic](../data/venues/iot/uic.yml)、[wfcs](../data/venues/iot/wfcs.yml) |
| 智能通信与网络 | [acml](../data/venues/ai/acml.yml)、[aistats](../data/venues/ai/aistats.yml)、[ecai](../data/venues/ai/ecai.yml)、[ecmlpkdd](../data/venues/ai/ecmlpkdd.yml)、[emnlp](../data/venues/ai/emnlp.yml)、[icann](../data/venues/ai/icann.yml)、[iclr](../data/venues/ai/iclr.yml)、[iconip](../data/venues/ai/iconip.yml)、[ictai](../data/venues/ai/ictai.yml)、[ijcnn](../data/venues/ai/ijcnn.yml)、[kr](../data/venues/ai/kr.yml)、[mmm](../data/venues/ai/mmm.yml)、[pcm](../data/venues/ai/pcm.yml)、[pricai](../data/venues/ai/pricai.yml)、[uai](../data/venues/ai/uai.yml) |
