# CommDDL 更新系统实施状态（2026-10-21）

本文记录当前可复核的代码与外部验收状态。用户工作区基线为 `73d48cadc4d5f0649abb89e087cbdba791055a09`；远端 `main` 为 `cab3294337eaa088693c264ae0916ea331df5815`。本 PR 以远端协作规范提交为基线；共享工作区原有文档改动保留，不从旧本地 `main` 覆盖远端新增规范。

## 本轮完成范围

| 能力 | 状态 | 证据与限制 |
|---|---|---|
| 正式 call 数据 PR 的最终差异分类 | 已完成且验证 | Worker 从 GitHub PR files API 读取完整最终文件列表；任何 `data/calls/*.yml`、其他 `data/` 路径、差异过大、空差异或 API 失败均转人工 GitHub 合并。分类不读候选类型、标签或 UI 布尔值。 |
| 日期 PR 人工审批与合并 | 已完成且验证 | Worker 对数据差异不调用 GitHub `reviews` 或 `merge` API。UI展示 PR 链接、最终 SHA、通知状态和人工合并指引。纯非数据 PR 仍需用户在网页明确批准且开关、身份、通知、SHA 和检查全部通过。 |
| 最终通知门禁 | 已实现但外部未验证 | 可信 `build-update-pr.yml` 在 Worker 记录通知成功后，以最终 PR SHA 创建 `CommDDL final notice` 检查。此项仍需所有者加入 `main` branch protection；当前 PR 不改仓库保护设置。 |
| 手动合并状态回收 | 已完成本地集成验证 | `reconcile-manual-data-pr.yml` 向 GitHub 查询真实闭 PR、最终 head、merge commit、人类 review 和 `build`、`catalog, tests, and generated site`、`CommDDL final notice` 成功状态，再通过 HMAC 回调。Worker 比对通知版本及 SHA 后解锁来源并记录合并 commit。回调重放可幂等处理。 |
| 未合并关闭与重试 | 已完成本地集成验证 | PR 未合并关闭会解锁来源并清空旧抓取基线，使同一批次可以新建下一版本；不会记为已发布。 |
| Pages 合并/部署状态 | 已实现但外部未验证 | 合并先记 `merged-awaiting-deploy`；Pages workflow 成功回调后记 `deployed`。失败记可重试 `deployment_status=failed`，不把失败部署误标为成功。线上迁移和 workflow 尚未应用。 |
| 多节点日期映射 | 部分完成 | 冻结测试覆盖摘要、全文、通知和终稿分别映射到既有节点。出现多日期冲突时不选择第一个日期；含时间/时区文本尚无可靠解析器时不降级成纯日期。 |
| 日期版本、历史与日历 UID | 已完成针对既有征稿验证 | 现有 MobiCom call 更新测试核验 node revision/history/updatedAt 与稳定 ICS UID；精确 instant 缺少新时刻证据时拒绝覆盖；提供明确 instant 和 timezone 时保留精度。 |
| OAuth、App PR、通知真实闭环 | 未完成外部验证 | Chrome 曾显示 OAuth callback，但页面状态读取超时，未确认会话/API 身份；`UPDATE_GITHUB_APP_PRIVATE_KEY` 仍待所有者直接保存；邮件投递、App 创建 PR 和真实回调未复测。 |
| 受控来源管理、更多适配器、新会议届次/Special Issue | 部分完成 | 当前目录与采集器基础能力保留，但新来源自助登记/解析策略维护、新实体完整候选工作流，以及针对更多官方页面的受控适配器仍需后续开发。 |
| 可选 Copilot | 未实现；默认关闭 | 没有开启 Copilot 工作流或引入 AI 调用。本 PR 不申请额外 AI 权限、配额或付费。 |
| 定时采集和正式发布 | 已保持关闭 | `UPDATE_AUTOMATION_ENABLED=false`、`PUBLISH_ENABLED=false`。本轮未触发 schedule、未部署、未发送真实邮件、未合并任何业务变更。 |

## 复用的外部证据

- OFC 单来源 dry-run：[Actions run 39434674078](https://github.com/turambarr/commddl/actions/runs/39434674078)。运行成功，`ids=ofc-2027-main`、`dry_run=true`、`retry_failed=false`；官方页面结构化标题层级、段落、链接及 baselines API 记录成功。保存候选、通知和正式 YAML 更新均跳过。
- D1 只读核验：`0001_initial.sql` 与 `0002_review_decisions_and_publish_binding.sql` 在迁移账本各一条；`update_batches`、`audit_log`、`source_snapshots`、`notification_outbox` 当前均为 0 行。没有重复运行旧迁移；本 PR 新增的 `0003` 仅在本地现有数据库升级测试中执行。
- Cloudflare Worker 已部署版本与配置状态见 [更新系统接入清单](UPDATES-SETUP-CHECKLIST.md)。本轮不调用 Cloudflare API、不重部署、不改线上开关。

## 本地验证

在隔离副本中执行：

```text
npm run check   通过，706 个载体、93 项活动
npm test        通过，108 项
npm run build   通过
git diff --check 通过
node --check scripts/updates/reconcile-closed-pr.cjs
node --check scripts/updates/report-final-notice-check.cjs
node --check scripts/updates/service-client.cjs
```

测试使用 SQLite 内存库和模拟 GitHub API，不代表真实 OAuth、邮件、Actions token、分支保护、D1 或 Pages 已联调。

## 真实联调前必须完成

1. 所有者在 GitHub App `CommDDL Updates → Private keys` 生成私钥，并直接保存到 `turambarr/commddl` Actions Secret `UPDATE_GITHUB_APP_PRIVATE_KEY`；不把 PEM 放进聊天或终端日志。
2. 在已打开的 Worker 管理页确认 OAuth callback 已建立会话，并确认 `/api/session` 返回预期 GitHub login。若授权未完成，由所有者在 GitHub 授权页亲自确认。
3. 所有者把 `CommDDL final notice` 加入 `main` required status checks，同时保留既有 `build`、`catalog, tests, and generated site` 和审批规则。
4. 审阅并人工合并本 PR 后，由所有者另行批准 Cloudflare D1 `0003` 迁移和 Worker 部署；确认 Pages 环境提供 `UPDATE_ADMIN_API_URL` 与 `UPDATE_INTERNAL_HMAC_SECRET`。
5. 核对 Resend、收件人验证、OAuth/Worker会话、App 创建 PR、最终通知检查、手动合并回收、Pages 发布状态。任何真实邮件或具体发布须先经维护者审阅并获用户明确授权。
6. Copilot 如需接入，后置为单独 PR；采集定时启用也需另行验收与授权。

## 当前维护操作

- **查看候选与取舍：** 登录 Worker 管理页，打开批次，逐项接受、修正或拒绝。全拒绝会写入拒绝版本并解锁来源，不创建 PR。
- **日期/正式数据 PR：** 在后台打开关联 GitHub PR，查看最终 SHA、YAML 及全部检查；由具备仓库审阅资格的人按 `main` 规则批准并手动合并。系统不代批、不代合并。
- **检查手动合并：** `Reconcile manually merged CommDDL data PR` 工作流应在 PR closed 后验证审批、final SHA、通知检查和合并 commit。状态未回收时查看该工作流失败原因并重跑可信工作流；不要手动写 D1。
- **恢复 Pages 状态：** 页面部署失败时，批次应保持 `merged-awaiting-deploy` 且 `deployment_status=failed`；在 Actions 重跑 `Validate and deploy CommDDL`，成功后状态更新为 `deployed`。
- **来源失败重试：** 保持自动调度关闭，在 workflow_dispatch 指定已验收来源或 retry_failed；先使用 dry-run 检查候选，再按授权流程提交给审阅。
- **开关与密钥：** 变量/Secrets 的准确保存位置见 [接入清单](UPDATES-SETUP-CHECKLIST.md)。不要将 Secrets 写进 Wrangler TOML、日志、YAML、公开产物或 PR 描述。
