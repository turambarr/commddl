# 关注清单结果展示样例（模拟）

以下对象、网址、证据和结果全部为**模拟资料**，用于确认后台展示结构；不是本轮官网采集，也没有写入生产后台。正式巡检使用后台已确认的稳定对象 ID 和真实官网证据。

## 轮次摘要

- 清单版本：`simulated-list-v1`
- 本轮对象：8
- 已检查：8；有变化：4；无变化：3；失败：1；未检查：0
- 候选保存：模拟 3 个对象的待审差异；相同事实只保留 1 份候选
- 邮件：关闭

## 按对象查看

| 对象 | 巡检结果 | 官方证据/来源路径 | 后台建议 |
|---|---|---|---|
| `sample-conf-2027-main` · SampleConf 主会 2027 | 截止日期更新 | `https://conference.example.org/2027/cfp` · `Important Dates › Paper submission`；原文：“The paper submission deadline is extended to 22 January 2027.” | 建立日期差异，管理员核对旧日期与新日期后决定 |
| `sample-journal-call-2026` · Sample Journal 专题征稿 | 已过期节点发现官方延期 | `https://journal.example.org/special-issue` · `Call for Papers › Submission deadline`；原文：“Submissions will be accepted until 18 December 2026.” | 只修正对应专题征稿节点，不改动期刊其他内容 |
| `sample-conf-2025-main` · SampleConf 主会 2025 | 活动已结束，官方暂未公布下一届 | `https://conference.example.org/2025` · `News › Next edition`；页面明确写明尚未发布下一届征稿 | 记录已核查结论；不创建日期 PR，不猜测下一届时间 |
| `sample-conf-2028-main` · SampleConf 主会 2028 | 发现新届次 | `https://conference.example.org/2028/cfp` · `Call for Papers › Important Dates` | 作为新对象发现候选，关联现有会议载体；待审核新建数据能力，不覆盖 2027 |
| `sample-journal-a` · Sample Journal A | 与上次核验内容一致 | `https://journal-a.example.org/about` · `Aims and Scope`；本轮服务器返回 304，复用原正文 | 更新检查时间；保留原文抓取时间，不建待审批项 |
| `sample-conf-2027-workshop` · SampleConf Workshop | 获取失败 | `https://workshop.example.org/2027` · 模拟 503 | 显示错误与可重试状态；保留上次成功基线 |
| `sample-journal-b` · Sample Journal B | 本轮证据与已有候选相同 | `https://journal-b.example.org/author-guide` · `Submission` | 记录本轮检查，不重复建立同一候选或邮件 |
| `sample-conf-2026-main` · SampleConf 主会 2026 | 来源页面出现两种投稿截止时间 | `https://conference.example.org/2026/cfp` · `Important Dates` 与 `FAQ` | 标为来源冲突，保留两处原文，等待管理员核实；不自动选择一个日期 |

## 每个候选对象的固定结构

```json
{
  "entityId": "sample-conf-2027-main",
  "status": "changed",
  "changeType": "deadline-updated",
  "sourceUrl": "https://conference.example.org/2027/cfp",
  "headingPath": ["Important Dates", "Paper submission"],
  "evidenceQuote": "The paper submission deadline is extended to 22 January 2027.",
  "currentValue": "2027-01-15",
  "proposedValue": "2027-01-22",
  "reviewAction": "核对证据后接受、修正或拒绝"
}
```

实际页面还会展示对象名称、所属载体、届次/分支、变化摘要、完整证据链接、检查时间、原文抓取时间、采集缺口及管理员保存的决定。对新届次使用独立稳定 ID；正式 YAML 写入能力若未支持，会明确显示为待建档候选。
