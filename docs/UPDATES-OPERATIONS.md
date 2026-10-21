# 更新采集与审阅运行说明

状态核对日期：2026-10-21。本文区分代码、线上配置和实测结果；本地测试不能证明外部服务已联通。

## 当前运行状态

- 正式仓库：`turambarr/commddl`；后台 Worker：`commddl-admin`；生产发布开关 `PUBLISH_ENABLED=false`。
- Cloudflare D1 的 `0001`、`0002`、`0003_manual_merge_reconciliation.sql` 已由维护者执行。0003 之前曾部署 Worker 版本 `01b97ec2-875a-4a19-958e-2f40d8addaf1`，之后又部署 `1a590082-32a5-4f37-b6e4-1d9add2cb6ae`。这两个版本早于当前 `main` 的部分修复；本轮修改尚未部署。Worker 当前线上版本仍需在 Cloudflare Versions 页面核对。
- OAuth 与维护者授权此前已完成配置；实际 `/api/session` 身份、当前 Cloudflare Worker 的 OAuth 行为仍要重新核验。不要在文档、日志或聊天中记录凭据。
- `UPDATE_AUTOMATION_ENABLED=false`、`COPILOT_COLLECTION_ENABLED=false`、`PUBLISH_ENABLED=false`。半月 schedule 和网页发布继续关闭。
- 已授权的唯一一次 Copilot workflow 调用失败在模型请求前：GitHub Copilot CLI 将 JSON 作为 `--attachment` 参数时拒绝该文件类型。官方 OFC 页面采集成功，并保存了原始候选 `updates-2026-10-21-23f4b82855` v1。Copilot 没有生成经验证的结构化结果。
- 当时邮件提供商未配置、启用收件邮箱数为 0。邮件失败不能阻止候选入库、后台查看、保存决定或重试提醒。真实邮件闭环尚未完成。
- 运行记录：[失败的 Copilot workflow #5](https://github.com/turambarr/commddl/actions/runs/39588240304)。2026-10-21 在 Chrome 对生产后台进行只读核验：`turambarr` 会话有效，启用收件人 0、邮件待配置；OFC 候选仍为 v1 `notice-incomplete`。展开内容出现登录/账户帮助与营销段落，说明旧批次不能直接作为正式差异接受。PR #9 加入服务端和 YAML 应用层门禁；合并部署后可对该批次复用原官网证据重新整理为同 ID 新版本。

## 数据流

1. `.github/workflows/collect-updates.yml` 采集已注册的官网来源及结构标题、正文、链接和日期基线。schedule 每月 1 日和 15 日 UTC 05:17 运行，但两个 schedule 开关必须都精确为 `true` 才会运行。
2. Copilot 只整理输入中的官方页面证据。输入为有大小上限的纯文本 JSON，网页内容视为不可信。结果必须是简体中文摘要，保留英文原题、结构化类别、逐字引文、来源 URL、标题层级和不确定性。验证器复核引文确实存在于同一来源、同一标题分段。
3. 只把日期节点变化及经过证据校验的结构化观察作为正式候选；原始未结构化差异保留作追溯，不直接发布。Copilot 失败时，系统保存明确标注为“未结构化”的候选，不把原始差异冒充 Copilot 输出。
4. 候选先保存到 Worker/D1，再尝试发送邮件提醒。邮件未配置、收件人未启用或投递失败时，候选仍可在后台审阅，提醒状态可重试。
5. 管理员接受、修正或拒绝每项候选。全部拒绝时不生成数据 PR，来源锁释放。接受或修正后，App workflow 生成包含正式 YAML 变化的 PR；GitHub 仓库保护仍要求人工审核和最终 SHA 检查。
6. 管理员在后台看到并核验 GitHub 返回的最终差异后，可明确点击“批准并按仓库规则上线”。Worker 以该管理员实际 GitHub 身份为最终 SHA 提交批准，并调用标准 merge API。分支保护、required checks 和审批人数仍由 GitHub 执行。Worker 不使用机器人身份代批或绕过保护。
7. 合并与 Pages 部署分别记录。只有核验部署成功后才更新已发布基线并释放来源锁；合并成功但 Pages 失败时可重跑 Pages 部署并回报同一 merge SHA。

## 重新整理已保存候选

手动 dispatch `Copilot structured official updates`，填写 `retry_batch_id`，将 `run_copilot=true`、`dry_run=false`，不填写 `ids`。工作流只接受当前仍待审、尚无决定、无 PR/最终 SHA 的批次，重新读取已保存页面，不重采官网、不改变批次 ID，并通过新版本保留旧版本与审计记录。版本号不匹配或状态已变化时，Worker 拒绝操作。重新整理后仍需管理员重新查看并作出决定。

## 失败处理

- 页面采集失败：查看 Actions artifact 与 Worker source snapshot；按失败队列重试，不用失败结果覆盖上一条成功基线。
- Copilot 失败或输出校验不通过：查看 workflow 日志和保留的 artifact；原始差异只用于追溯，API 和正式数据应用器都会拒绝直接接受未经结构化校验的内容。确认解决问题后按上节重新整理原批次。
- 通知失败：后台重试邮件；不重跑来源采集，也不把邮件状态当作审批结果。
- PR 构建失败：workflow 将可恢复的构建批次标记失败并释放来源锁；确认后可重采。
- PR SHA 或 diff 改变：旧审核不再适用。重新加载最终 PR 差异，并对最新 SHA 审阅。
- GitHub 拒绝合并：检查分支保护、required checks 和审批身份；修复后重新由管理员审阅并批准。不要通过绕过规则解决。
- 合并后 Pages 失败：在 GitHub Actions 重跑失败的 Pages job；部署回调以同一 merge SHA 更新状态。回调重复执行应保持幂等。

## 需要外部核验的项目

1. Cloudflare 确认当前 Worker 版本、D1 绑定和 `PUBLISH_ENABLED=false`；核对 `UPDATE_AUTOMATION_ENABLED`、`COPILOT_COLLECTION_ENABLED`、`COMMDDL_FINAL_NOTICE_CHECK_ENABLED`、`COMMDDL_RECONCILIATION_ENABLED` 的实际 GitHub Variables 值。
2. 以 `turambarr` 和获授权的 `arofish` 登录，分别确认 Worker `/api/session` 身份、目标仓库实时权限及后台候选访问；确认未授权账号会被拒绝。
3. 新代码经审核并合并、部署后，授权人再决定是否重新执行一次 Copilot CLI 真实请求。此前的一次请求在 CLI 参数校验阶段失败，没有可声称成功的 Copilot 输出；任何再次调用都需要明确授权。
4. 邮件服务目前未完成真实配置/投递验收。邮件配置不作为候选采集与后台展示的前置条件。
5. final notice 与 reconciliation 接入开关及分支保护需按 [`UPDATES-SETUP-CHECKLIST.md`](UPDATES-SETUP-CHECKLIST.md) 顺序验证。无人值守 schedule 需单独授权后再启用。

## 本地检查

代码变更在独立分支完成后，应按仓库规范运行 `npm run check`、`npm test`、`npm run build`。这些检查只验证本地实现，不代表真实 Copilot、GitHub App、邮件或 Cloudflare Worker 已完成联调。
