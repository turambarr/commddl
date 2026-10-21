# 更新服务接入清单

状态基准：2026-10-21。本清单描述当前代码需要的配置及外部操作；本地测试通过不等于 Cloudflare、GitHub 或邮件服务已配置。本轮只准备可审核 PR，不部署、不发送真实邮件、不启用定时任务；定时采集与发布开关都继续关闭。

## 默认开关

| 开关 | 保存位置 | 本轮及首次配置值 | 关闭时行为 |
|---|---|---:|---|
| `UPDATE_AUTOMATION_ENABLED` | GitHub 仓库 `Settings → Secrets and variables → Actions → Variables` | `false` | 半月 schedule 不运行 |
| `PUBLISH_ENABLED` | Cloudflare Worker `commddl-admin → Settings → Variables and Secrets → Variables`；同步到 `services/admin/wrangler.toml` | `false` | 可登录、保存和审阅候选；后台发布按钮关闭，直到完成联调 |
| `COMMDDL_FINAL_NOTICE_CHECK_ENABLED` | GitHub 仓库 Actions Variables | unset / `false` | 暂停最终 SHA 检查；启用前需完成普通 PR neutral 与候选 SHA 验收 |
| `COPILOT_COLLECTION_ENABLED` | GitHub 仓库 Actions Variables | `false` | 半月采集总开关之一；未开时 schedule job 跳过 |
| `COMMDDL_RECONCILIATION_ENABLED` | GitHub 仓库 Actions Variables | unset / `false` | 暂停合并和 Pages 回调 |

表中五个开关只有精确等于小写字符串 `true` 才开启。定时采集和正式发布保持关闭；通知检查与合并/Pages 回调分开启用，避免新工作流早于 Worker 和 0003。

## 资源及变量位置

### Cloudflare Worker 与 D1

Worker 名称：`commddl-admin`。绑定名称：`DB`，D1 数据库名称：`commddl-admin`。配置文件为 [`services/admin/wrangler.toml`](../services/admin/wrangler.toml)。当前 `ADMIN_ORIGIN` 和 D1 `database_id` 已与 Cloudflare 资源同步；部署前复核目标环境，不要以示例值覆盖。不要把 Secret 放入 TOML。

Worker Production 普通变量（实际资源标识已经由 Cloudflare 交接记录核对，并已同步到 `wrangler.toml`；不要替换成示例值）：

| 名称 | 用途 |
|---|---|
| `GITHUB_OWNER` | `turambarr` |
| `GITHUB_REPO` | `commddl` |
| `AUTHORIZED_MAINTAINERS` | 所有者明确批准的 GitHub login，逗号分隔；当前待授权登录名为 `arofish`。由仓库所有者在 Worker Production 设置中核对并填写；名单移除即撤销后台权限。 |
| `ADMIN_ORIGIN` | 实际 Worker HTTPS origin，不带路径或末尾斜杠 |
| `GITHUB_CLIENT_ID` | OAuth App 的 Client ID |
| `MAIL_PROVIDER` | `ses`（可用独立邮箱地址作为发件身份，无须购买或验证自有域名） |
| `MAIL_FROM` | AWS SES 中已验证的发件邮箱地址 |
| `PUBLISH_ENABLED` | `false` |

Worker Secrets（Cloudflare 设置页面或 `wrangler secret put`）：

| Secret 名称 | 来源/用途 |
|---|---|
| `SESSION_SECRET` | Worker 会话加密随机值 |
| `GITHUB_CLIENT_SECRET` | OAuth App Client Secret |
| `AWS_SES_REGION` | SES 所在区域，例如 `us-east-1`；与已验证邮箱身份所在区域一致 |
| `AWS_SES_ACCESS_KEY_ID` | 仅限 SES 发送权限的 AWS IAM 用户访问密钥 |
| `AWS_SES_SECRET_ACCESS_KEY` | 上述 IAM 用户私钥；只存 Cloudflare Worker Secret |
| `RESEND_API_KEY` | 可选替代通道；Resend 通常要求已验证域名，不作为免域名前置方案 |
| `INTERNAL_HMAC_SECRET` | Worker 与 GitHub Actions 之间共享的 HMAC 随机值；在 Actions 端另存同值为 `UPDATE_INTERNAL_HMAC_SECRET` |

不要把密钥发到聊天、提交进仓库、贴入普通变量或写入文档；本次执行不读取或显示密钥值。

### GitHub Actions 仓库变量与 Secrets

位置：`turambarr/commddl → Settings → Secrets and variables → Actions`。

仓库 Variables：

| 名称 | 值 |
|---|---|
| `UPDATE_ADMIN_API_URL` | Worker 的 `ADMIN_ORIGIN`，例如 `https://commddl-admin.<account>.workers.dev` |
| `UPDATE_AUTOMATION_ENABLED` | `false` |
| `COPILOT_COLLECTION_ENABLED` | `false` |
| `COMMDDL_FINAL_NOTICE_CHECK_ENABLED` | unset / `false`，待 0003 与 Worker 新接口上线后先单独启用并验收 |
| `COMMDDL_RECONCILIATION_ENABLED` | unset / `false`，待必需检查已启用且人工合并回收联调准备完成后再设为 `true` |

仓库 Secrets：

| 名称 | 用途 |
|---|---|
| `UPDATE_INTERNAL_HMAC_SECRET` | 与 Worker 的 `INTERNAL_HMAC_SECRET` 相同；仅供 `scripts/updates/service-client.cjs` 签署内部 API 请求 |
| `UPDATE_GITHUB_APP_ID` | 仓库 GitHub App 的 App ID |
| `UPDATE_GITHUB_APP_PRIVATE_KEY` | 同一个 GitHub App 的私钥 PEM |

收集 workflow 使用 `contents: read`。更新 PR workflow 用 GitHub App token，限定仓库 `commddl`，需要 `Contents: read/write`、`Pull requests: read/write`；不需要安装到其他仓库。该 workflow 只在 `main` 上处理 `repository_dispatch`，并且通过 HMAC 内部 API 读取候选和记录 PR 最终 SHA。`final-notice-check.yml` 由 `pull_request_target` 触发，但只 checkout `main` 的可信代码；不 checkout 或执行 PR 内容，使用 `checks:write` 和已配置的 HMAC Secret 查询 Worker 的批次绑定。

### GitHub OAuth App

由仓库所有者或获授权的项目组织创建。Homepage URL 填实际 `ADMIN_ORIGIN`；Authorization callback URL 必须精确为：

```text
<ADMIN_ORIGIN>/auth/callback
```

例如：`https://commddl-admin.<account>.workers.dev/auth/callback`。当前登录只请求 `read:user public_repo`；项目仓库是公开仓库，`public_repo` 用于向该目标发出 `repository_dispatch`，不请求包含私有仓库的 `repo` scope。每个受保护 API 请求都会调用 GitHub 的 collaborator permission API 实时确认目标仓库权限：所有者 `turambarr` 必须是 GitHub 返回的 `admin`；其他人须同时在 `AUTHORIZED_MAINTAINERS` 中且实际权限为 `write`、`maintain` 或 `admin`。所有写权限用户不会自动成为后台维护者，应用名单也不会伪造或提升 GitHub 权限。

### 免自有域名的发信通道：Amazon SES

采用 Amazon SES 的单个邮箱身份：在 SES 控制台选择一个区域，验证管理员可控制的发件邮箱地址，Worker 设置 `MAIL_PROVIDER=ses`、`MAIL_FROM` 为同一地址，并填入该区域与最小权限 IAM 凭据。无需购买或验证自有域名，也不需要配置 DNS。Worker 通过 SES HTTPS API 发送并使用 SigV4 签名。

SES 新账户通常处于 sandbox；sandbox 下收件人也必须在 SES 中验证。先用 SES mailbox simulator 或已在 SES 验证的测试邮箱验证投递。若希望发送给后台中自行验证的任意地址，AWS 账户所有者需要为对应区域申请 SES production access；这是外部待办。SES 投递未配置或失败不会阻止来源采集、候选入库、后台展示和人工审阅；后台只显示通知状态并允许重试。Resend 可作为备用，但若不愿验证自有域名则不作为本流程的前置通道。

## 发布门禁与 GitHub 分支规则

分支保护设置在 `turambarr/commddl → Settings → Branches` 的 `main` 规则中。合并更新 PR 前要求：

- 至少一名合格维护者审阅；通过后台批准时，Worker 以当前登录并实时核验仓库权限的 GitHub 身份，对记录的最终 SHA 提交 `APPROVE` review，并核对 GitHub 返回的 reviewer login、`APPROVED` 状态和 commit SHA 后才请求合并。
- Required status checks 精确名称：`build`、`catalog, tests, and generated site`、`CommDDL final notice`。`CommDDL final notice` 对 Worker 确认未绑定候选批次的普通 PR 报告 `neutral`；GitHub 将 `neutral` 视为满足 required check。对已绑定候选批次的 PR，只有可信候选工作流在 Worker 确认最终 SHA 通知后才创建 `success`。为避免候选 PR 创建与 Worker 记录之间的竞态，保留的 `codex/official-updates-*` 分支在 Worker 尚未识别时不创建 neutral。所有检查须对应最终 PR head SHA。先合并含有检查工作流的代码 PR，确认该检查已实际出现，再由所有者加入分支规则；不要在工作流进入 `main` 前要求这个新检查。
- 禁止管理员绕过该分支规则；合并方式应允许 squash merge（当前 API 使用 `squash`）。

管理员在后台看到 GitHub API 返回的最终文件补丁后，可点击“批准并按仓库规则上线”。Worker 重新读取文件清单并核对 diff digest、最终 head SHA、当前 GitHub 登录身份、三项最终 SHA 检查，然后以该登录账号提交绑定 SHA 的 APPROVE review 并使用标准 GitHub merge API 请求 squash 合并。GitHub 分支保护仍负责审批数、required checks 与合并策略；Worker 不使用 App token、不忽略保护、不代替管理员确认。通知邮件仅提醒有待审批，不是审阅或发布门禁。合并与 Pages 成功分别记录，失败保留来源锁供恢复。PR 更新后，前端 diff digest 与最终 SHA 不匹配，必须重新审阅。

后台发起的合并和旧版手动合并都会由 `.github/workflows/reconcile-manual-data-pr.yml` 再次向 GitHub 查询闭合状态、合并提交、最终 head SHA、对应人类 review 和三项成功检查；只有 HMAC 回调完整匹配批次、最终 SHA 和审批身份后才记录 `merged-awaiting-deploy`。来源锁在 Pages 成功回调后才释放；部署失败保留锁和恢复状态。未合并关闭记为 `closed-unmerged` 并释放来源锁。邮件状态不参与合并与校验。上述回调工作流和 Pages 回报步骤均受默认关闭的 `COMMDDL_RECONCILIATION_ENABLED` 保护。

## 当前代码中的实际检查项

| 检查/门禁 | 名称或行为 |
|---|---|
| `.github/workflows/review-gate.yml` job / required check | `catalog, tests, and generated site` |
| Pages build required check | `build` |
| 最终 SHA check | `CommDDL final notice`，绑定候选 PR head SHA；普通非候选 PR 为 neutral；候选 PR 只有 Worker 已记录该最终 SHA 后 success。它验证版本绑定，不代表邮件送达 |
| 普通 PR 的最终通知检查 | `.github/workflows/final-notice-check.yml` 用 HMAC 查询 Worker 是否绑定候选；非候选 PR 报告 `neutral`，候选 PR 的成功检查只说明最终 SHA 已绑定，与邮件送达分开；只检出 main 信任代码 |
| 人工合并后核对 | `.github/workflows/reconcile-manual-data-pr.yml`，验证人类 review 身份、PR head、合并提交及 required checks |
| Pages 状态 | `merged-awaiting-deploy` 与 `deployed` 分开记录；部署失败可重跑 Pages workflow |
| `npm run check` | 目录结构与数据验证 |
| `npm test` | Node 测试集；包含实际 Worker API + SQLite 集成测试 |
| `npm run build` | 生成站点与日历 |
| 后台身份 | 所有者需有 GitHub 实际 `admin` permission；其他账号需在 `AUTHORIZED_MAINTAINERS` 名单中且实时核验为 `write`/`maintain`/`admin`。名单不授予 GitHub 权限 |
| 邮件通知 | 只提醒待审批内容；可缺省或投递失败，不阻止候选入库、展示、决定保存或人工审批 |
| 后台一键批准发布 | 管理员明确点击后，Worker 以当前登录 GitHub 身份对最终 SHA 提交 review 并调用正常 merge API；仓库保护照常执行 |
| 合并与部署 | 合并与 Pages 部署状态分别记录；仅 Pages 成功后回收来源锁 |
| 发布开关 | Worker `PUBLISH_ENABLED` 必须精确为 `true`，且最终 SHA、完整 diff、reviewer 身份与所有 required checks 均通过 |
| 定时采集开关 | `UPDATE_AUTOMATION_ENABLED` 和 `COPILOT_COLLECTION_ENABLED` 都必须精确为 `true`；本轮两者均关闭 |

## 所有者必须完成的 GitHub 配置

- **GitHub OAuth App：** 由所有者创建或核对 App，并将 callback 精确设为 `<ADMIN_ORIGIN>/auth/callback`。
- **维护者名单：** 所有者在 Cloudflare Worker Production Variables 设置 `AUTHORIZED_MAINTAINERS=arofish`；新增或移除账号都由所有者明确操作。
- **GitHub App：** 所有者安装到 `turambarr/commddl` 单一目标仓库，保留已有最小权限，不扩大机器人权限。
- **App 私钥：** 所有者报告已直接保存到仓库 Actions Secret `UPDATE_GITHUB_APP_PRIVATE_KEY`；未读取或展示私钥。尚需通过实际 App token 生成和候选 PR 工作流确认可用性。
- **OAuth 会话：** Chrome 曾显示 Worker OAuth callback，但当前自动化无法读取回调后的登录 UI。所有者/维护者仍需打开管理员主页确认会话和 `/api/session` 真实身份；不要重放 callback URL。
- **分支保护：** 所有者为 `main` 保留现有检查与审批规则；确认检查 workflow 已部署且普通 PR `neutral`、候选最终 SHA `success` 行为通过后，再将 `CommDDL final notice` 加入 required checks，并保留原有审批数量与禁止绕过规则。启用 squash merge。
- **Actions Environment：** 所有者配置受保护环境及审批人，并将发布 workflow 所需的变量和 Secrets 存入正确的 repository/environment 范围。

## 部署步骤（供资源就绪后的后续轮次使用）

以下步骤按依赖顺序执行；本轮未部署、未迁移线上 D1、未启用变量。

1. 所有者核对 Worker Production 普通变量及 D1 绑定。保持 `PUBLISH_ENABLED=false`；OAuth callback 仍需在管理员页面确认实际会话和身份。
2. GitHub App 私钥 Secret 已由所有者报告配置完成；不读取或复制其值。核对 Actions 中 `UPDATE_GITHUB_APP_ID`、`UPDATE_GITHUB_APP_PRIVATE_KEY`、`UPDATE_ADMIN_API_URL`、`UPDATE_INTERNAL_HMAC_SECRET` 的名称与保存范围。SES 发信配置按上面的无自有域名方案补齐；在发件邮箱身份验证、sandbox 测试收件人和 AWS production access 未核验前不要启用投递。邮件可选，不影响候选链路。Copilot 所需 Actions Secret `COPILOT_GITHUB_TOKEN` 尚待所有者以个人账号 fine-grained PAT (Copilot Requests) 配置；只授权公开仓库读取并限 Copilot Requests。
3. 保留 `main` 当前有效分支保护。此时不要要求 `CommDDL final notice`，也不要打开 `COMMDDL_FINAL_NOTICE_CHECK_ENABLED` 或 `COMMDDL_RECONCILIATION_ENABLED`。
4. 先由另一位合格协作者审阅并批准本 PR（PR 作者 `arofish` 不能自批），再由有权限的维护者按仓库规则手动合并。Agent 不代批、不代合并。
5. 合并且所有者明确批准数据库变更后，在本地终端进入 `services/admin`，核验账号后只应用新迁移 `0003`：

   ```sh
   cd /Users/fish/codework/commddl/services/admin
   npx wrangler whoami
   npx wrangler d1 migrations apply commddl-admin --remote
   ```

   已部署环境预期仅应用 `0003_manual_merge_reconciliation.sql`；全新库按顺序应用 `0001`、`0002`、`0003`。远端 D1 已在 2026-10-20 核验 `0001`、`0002` 各一条，四张业务表均为空，不要重复运行旧迁移。

6. 确认 Worker Secrets `SESSION_SECRET`、`GITHUB_CLIENT_SECRET`、`INTERNAL_HMAC_SECRET` 已按需保存；如使用 SES，再配 SES 密钥，并确认 GitHub Actions 使用同一 HMAC 的 `UPDATE_INTERNAL_HMAC_SECRET`。然后从 `services/admin` 部署 Worker 新版本；先做 dry-run/目标复核，不替换已核验的 Account/D1 标识。Worker 部署必须在 migration 0003 成功之后。
7. 验证 OAuth 登录、`/api/session` 中的真实 GitHub login 与实际仓库权限；再通过受控流程验证 GitHub App token 与 `repository_dispatch`。不要把测试批次连接到正式日期发布。
8. 连接免域名邮件：设置 SES 邮箱 identity、`MAIL_PROVIDER=ses`、`MAIL_FROM` 与 Worker Secrets；sandbox 阶段使用 SES 已验证收件邮箱或 mailbox simulator 发一次测试邮件，之后视需要申请 production access。无论邮件是否配置，采集和后台候选均可继续。
9. 设置 `COMMDDL_FINAL_NOTICE_CHECK_ENABLED=true`。先验证普通非候选 PR 对当前 head SHA 得到 `neutral`；再验证一个受控候选 PR 只有在 Worker 绑定最终 SHA 后得到 `success`，即使邮件尚未配置也可验证。验收成功后，所有者把 `CommDDL final notice` 加入 `main` required checks，同时保留原有检查和独立人工审批。
10. 仅在必需检查生效后设置 `COMMDDL_RECONCILIATION_ENABLED=true`，打开 PR close/Pages 回调。若关闭至启用之间已有合并或 Pages 部署，先人工核对并补跑可信 reconciliation，避免漏记状态。
11. 首轮验收完成前保持 `UPDATE_AUTOMATION_ENABLED=false`、`PUBLISH_ENABLED=false`。定时采集、网页发布和 Copilot 分别等待单独授权与验收。

### Git 与 Pages job 兼容性

Pages 部署使用独立 runner；部署前需 `npm ci`，为 `service-client.cjs` 安装 `yaml` 解析依赖，不能依赖 build job 的 `node_modules`。工作流使用 `actions/checkout@v4` 并浅克隆单一提交；此仓库不要求完整 Git 历史。自托管 runner 应提供 Git 2.18 或更新版本，低于该版本时 checkout 可能改用 REST 下载而不是创建完整的 `.git` 工作树；候选 PR 创建需要真实 Git 工作树。GitHub 托管的 Ubuntu runner 已包含受支持的 Git。普通本地校验依赖 Node.js 20+；日常浏览静态站点无需 Git 运行时。

## 本地已验证与外部待验证

远端已完成并可复用的验收证据：OFC `main/cab3294` dry-run [Actions run 39434674078](https://github.com/turambarr/commddl/actions/runs/39434674078)，输入 `ids=ofc-2027-main`、`dry_run=true`、`retry_failed=false`；运行成功，日志记录官方页面结构化标题层级、段落和链接及 baselines API 成功，保存候选/通知步骤被跳过，未发邮件、未改正式 YAML。Cloudflare D1 最后只读核对：迁移账本中 `0001`、`0002` 各一条；`update_batches`、`audit_log`、`source_snapshots`、`notification_outbox` 均 0 行。之后未重复迁移或采集。

本地代码可验证：Copilot 输出 schema、来源引文逐字校验、不确定性与可扩展结构值保留；SES SigV4 签名构造（mock，不代表服务商真实投递）；邮件失败不会阻止候选入库、后台展示或审阅；审阅 UI/API 的接受、纠正、拒绝、全拒绝；明确名单授权、实时核验、权限撤销和名单移除拒绝、所有者保留访问；最终 SHA/通知/检查绑定；call 文件最终 PR diff 强制人工合并、伪造候选类型不能绕过；手动合并/未合并关闭回收来源锁、重复回调与 Pages 部署分态；多节点日期映射、冲突日期拒绝、含时刻的来源文本不降为 date-only、已知精确 instant 不被日期证据清空；MobiCom 节点 revision/history 和 ICS 稳定 UID；API 包装和旧式手动 baselines 形状；失败重试退避、构建失败基线重置；目录校验、测试和构建。

仍须验证：Copilot Requests PAT 配置、实际额度/禁止超额计费状态、一次真实 Copilot CLI 自动化调用；OAuth callback 与真实身份；App token、`repository_dispatch` 和数据 PR；SES 发件身份、sandbox/production access 与真实投递；final notice required check 分支规则；真实后台审批、GitHub 按分支规则合并以及 Pages 部署回调。D1 的 `0001`/`0002` 与 OFC dry-run 均复用，不重复执行。此轮不部署、不发邮件、不改远端配置、不发布、不开 schedule。
