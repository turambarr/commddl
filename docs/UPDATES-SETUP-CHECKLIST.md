# 更新服务接入清单

状态基准：2026-10-21。本清单描述当前代码需要的配置及外部操作；本地测试通过不等于 Cloudflare、GitHub 或邮件服务已配置。本轮只准备可审核 PR，不部署、不发送真实邮件、不启用定时任务；定时采集与发布开关都继续关闭。

## 默认开关

| 开关 | 保存位置 | 本轮及首次配置值 | 关闭时行为 |
|---|---|---:|---|
| `UPDATE_AUTOMATION_ENABLED` | GitHub 仓库 `Settings → Secrets and variables → Actions → Variables` | `false`，也可暂不创建 | 定时采集 job 跳过；`workflow_dispatch` 仍可用，默认 `dry_run=true` |
| `PUBLISH_ENABLED` | Cloudflare Worker `commddl-admin → Settings → Variables and Secrets → Variables`；同步到 `services/admin/wrangler.toml` | `false` | 可登录、收邮件和保存审阅决定；非数据发布入口返回 `423 publishing-disabled`，数据 PR 始终由人到 GitHub 审阅并合并 |
| `COMMDDL_FINAL_NOTICE_CHECK_ENABLED` | GitHub 仓库 Actions Variables | unset / `false` | 跳过普通 PR 通知检查创建；迁移与 Worker 接口上线后单独启用并验收 |
| `COMMDDL_RECONCILIATION_ENABLED` | GitHub 仓库 Actions Variables | unset / `false` | 跳过人工合并与 Pages 回调，避免 Worker API 和 0003 尚未上线时新工作流调用新接口 |

表中四个开关只有精确等于小写字符串 `true` 才开启。不要在首次部署或首次验收时开启；通知检查与合并/Pages 回调分开启用，避免新工作流早于 Worker 和 0003。

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
| `MAIL_FROM` | 已验证发信域名下的发件地址 |
| `PUBLISH_ENABLED` | `false` |

Worker Secrets（Cloudflare 设置页面或 `wrangler secret put`）：

| Secret 名称 | 来源/用途 |
|---|---|
| `SESSION_SECRET` | Worker 会话加密随机值 |
| `GITHUB_CLIENT_SECRET` | OAuth App Client Secret |
| `RESEND_API_KEY` | Resend 发信 API key |
| `INTERNAL_HMAC_SECRET` | Worker 与 GitHub Actions 之间共享的 HMAC 随机值；在 Actions 端另存同值为 `UPDATE_INTERNAL_HMAC_SECRET` |

不要把密钥发到聊天、提交进仓库、贴入普通变量或写入文档；本次执行不读取或显示密钥值。

### GitHub Actions 仓库变量与 Secrets

位置：`turambarr/commddl → Settings → Secrets and variables → Actions`。

仓库 Variables：

| 名称 | 值 |
|---|---|
| `UPDATE_ADMIN_API_URL` | Worker 的 `ADMIN_ORIGIN`，例如 `https://commddl-admin.<account>.workers.dev` |
| `UPDATE_AUTOMATION_ENABLED` | `false` |
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

### Resend

邮件发件域名需要先在 Resend 验证；`MAIL_FROM` 必须属于该已验证域名。收件人由已授权维护者添加并验证，只有已启用地址会收到候选提醒。测试只会在外部接入阶段发送到管理员明确添加并验证的地址。

## 发布门禁与 GitHub 分支规则

分支保护设置在 `turambarr/commddl → Settings → Branches` 的 `main` 规则中。合并更新 PR 前要求：

- 至少一名合格维护者审阅；通过后台批准时，Worker 以当前登录并实时核验仓库权限的 GitHub 身份，对记录的最终 SHA 提交 `APPROVE` review，并核对 GitHub 返回的 reviewer login、`APPROVED` 状态和 commit SHA 后才请求合并。
- Required status checks 精确名称：`build`、`catalog, tests, and generated site`、`CommDDL final notice`。`CommDDL final notice` 对 Worker 确认未绑定候选批次的普通 PR 报告 `neutral`；GitHub 将 `neutral` 视为满足 required check。对已绑定候选批次的 PR，只有可信候选工作流在 Worker 确认最终 SHA 通知后才创建 `success`。为避免候选 PR 创建与 Worker 记录之间的竞态，保留的 `codex/official-updates-*` 分支在 Worker 尚未识别时不创建 neutral。所有检查须对应最终 PR head SHA。先合并含有检查工作流的代码 PR，确认该检查已实际出现，再由所有者加入分支规则；不要在工作流进入 `main` 前要求这个新检查。
- 禁止管理员绕过该分支规则；合并方式应允许 squash merge（当前 API 使用 `squash`）。

Worker 读取 GitHub 最终 PR 文件列表分类：任何 `data/calls/*.yml`、其他正式目录变更或无法完整读取的差异都要求人工合并；分类不依赖候选类型、标签或前端标记。纯非数据 PR 才可能进入网页明确批准流程，并受开关、登录身份、最终 SHA、通知与 `catalog, tests, and generated site` / `CommDDL final notice` 检查约束。日期和征稿 PR 不调用 GitHub review 或 merge API。PR 更新后必须重新发送最终版本通知并重新检查。

手动合并的数据 PR 由 `.github/workflows/reconcile-manual-data-pr.yml` 再次向 GitHub 查询闭合状态、合并提交、最终 head SHA、对应人类 review 和三项成功检查；只有 HMAC 回调完整匹配批次与已通知 SHA 后才解锁来源并记录 `merged-awaiting-deploy`。Pages 部署成功后另记为 `deployed`。未合并关闭记为 `closed-unmerged` 并释放来源锁；通知、SHA 或检查不匹配时不会更新发布基线。上述回调工作流和 Pages 回报步骤均受默认关闭的 `COMMDDL_RECONCILIATION_ENABLED` 保护。迁移 `0003_manual_merge_reconciliation.sql` 只扩展批次状态和合并/部署字段。

## 当前代码中的实际检查项

| 检查/门禁 | 名称或行为 |
|---|---|
| `.github/workflows/review-gate.yml` job / required check | `catalog, tests, and generated site` |
| Pages build required check | `build` |
| 最终通知 required check | `CommDDL final notice`，绑定 PR head SHA；非候选 PR 为 neutral，绑定候选的 PR 仅在通知成功后 success |
| 普通 PR 的最终通知检查 | `.github/workflows/final-notice-check.yml` 用 HMAC 查询 Worker 是否绑定候选；非候选 PR 报告 `neutral`，候选 PR 保持 pending 等待最终通知成功；只检出 main 信任代码 |
| 人工合并后核对 | `.github/workflows/reconcile-manual-data-pr.yml`，验证人类 review、PR head、合并提交、通知和 required checks |
| Pages 状态 | `merged-awaiting-deploy` 与 `deployed` 分开记录；部署失败可重跑 Pages workflow |
| `npm run check` | 目录结构与数据验证 |
| `npm test` | Node 测试集；包含实际 Worker API + SQLite 集成测试 |
| `npm run build` | 生成站点与日历 |
| 后台身份 | 所有者需有 GitHub 实际 `admin` permission；其他账号需在 `AUTHORIZED_MAINTAINERS` 名单中且实时核验为 `write`/`maintain`/`admin`。名单不授予 GitHub 权限 |
| 最终通知 | 每个批次版本 outbox 邮件完成；最终 SHA 和 PR 链接会纳入通知；未完成不可保存审阅或发布 |
| 人工日期发布 | 正式 call 数据 PR 必须在 GitHub 人工审阅及手动合并；自动化不写 review、不请求 merge |
| 合并与部署 | 手动合并状态和 Pages 部署状态分别记录；只在真实闭 PR 与匹配 merge commit 核验后回收来源锁 |
| 发布开关 | Worker `PUBLISH_ENABLED` 必须精确为 `true` |
| 定时采集开关 | GitHub Actions Variable `UPDATE_AUTOMATION_ENABLED` 必须精确为 `true`；未设置时 schedule job 跳过 |

## 所有者必须完成的 GitHub 配置

- **GitHub OAuth App：** 由所有者创建或核对 App，并将 callback 精确设为 `<ADMIN_ORIGIN>/auth/callback`。
- **维护者名单：** 所有者在 Cloudflare Worker Production Variables 设置 `AUTHORIZED_MAINTAINERS=arofish`；新增或移除账号都由所有者明确操作。当前代码和 TOML 有 `arofish` 的本地待配置值，线上 Worker 尚未更新。
- **GitHub App：** 所有者安装到 `turambarr/commddl` 单一目标仓库，保留已有最小权限，不扩大机器人权限。
- **App 私钥：** 所有者报告已直接保存到仓库 Actions Secret `UPDATE_GITHUB_APP_PRIVATE_KEY`；未读取或展示私钥。尚需通过实际 App token 生成和候选 PR 工作流确认可用性。
- **OAuth 会话：** Chrome 曾显示 Worker OAuth callback，但当前自动化无法读取回调后的登录 UI。所有者/维护者仍需打开管理员主页确认会话和 `/api/session` 真实身份；不要重放 callback URL。
- **分支保护：** 所有者为 `main` 保留现有检查与审批规则；本 PR 合并、普通 PR 与数据 PR 的新检查行为验证后，再加入 `CommDDL final notice`，并保留至少一项独立协作者批准及禁止绕过规则（包含管理员）。启用 squash merge。
- **Actions Environment：** 所有者配置受保护环境及审批人，并将发布 workflow 所需的变量和 Secrets 存入正确的 repository/environment 范围。

## 部署步骤（供资源就绪后的后续轮次使用）

以下是准备好的命令，本轮没有执行：

1. 仓库所有者（`turambarr`）核对并在 Cloudflare Worker Production Variables 中填写 `AUTHORIZED_MAINTAINERS=arofish`；按需逐个添加经所有者明确授权的人。不得将 GitHub 所有 write 用户批量加入。同步 `services/admin/wrangler.toml` 中名单值；保持 `PUBLISH_ENABLED = "false"`。
2. 仓库所有者创建/核对 OAuth App callback，将 GitHub App 安装到且仅安装到 `turambarr/commddl`，设置所需最小仓库权限，并配置 Actions Environment（建议 `production` 环境保护规则：required reviewers 与禁止自助批准，Secrets 仅保存该环境需要的凭据）。
3. 仓库所有者先保留 `main` 已生效的分支保护和 required checks；`CommDDL final notice` 工作流进入 `main` 且已验证普通 PR 为 neutral、正式数据 PR 等待可信通知成功后，再追加此项检查。继续要求至少一项独立批准、分支最新并限制绕过（包含管理员）；确认 squash merge 已启用。required check 和环境保护设置须使用所有者账号或 GitHub 实际授予的管理权限。
4. Cloudflare 资源标识已同步在 `services/admin/wrangler.toml`；核对 Worker Production 的资源绑定仍与交接记录一致，不要替换有效 account/database 标识。
5. **先审阅并合并本 PR（由另一位合格协作者批准，作者不能自批）。** 合并后不要设置 `COMMDDL_RECONCILIATION_ENABLED=true`，也先不把 `CommDDL final notice` 加入分支规则。此时新回调仍关闭。

6. 在所有者批准部署后，在本地终端进入 `services/admin` 并完成 Cloudflare 登录。先检查账号和目标数据库，再只应用新迁移 `0003`：

   ```sh
   cd /Users/fish/codework/commddl/services/admin
   npx wrangler whoami
   npx wrangler d1 migrations apply commddl-admin --remote
   ```

   已部署环境预期仅应用 `0003_manual_merge_reconciliation.sql`；全新库按顺序应用 `0001`、`0002`、`0003`。远端 D1 已在 2026-10-20 核验 `0001`、`0002` 各一条，四张业务表均为空，不要重复运行旧迁移。

7. 部署 Worker 新版本，再检查 OAuth 登录会话、管理员身份和新增 API。此时仓库回调变量仍保持关闭。
8. 先设置 `COMMDDL_FINAL_NOTICE_CHECK_ENABLED=true`，用普通非候选 PR 验证 neutral；通过受控候选流程验证通知成功后 final-SHA success。只有这两种行为都确认后，才把 `CommDDL final notice` 加入 `main` required checks（保留原有检查）。随后设置 `COMMDDL_RECONCILIATION_ENABLED=true`，启用人工合并与 Pages 回调。两个变量分开设置，避免回收 workflow 早于分支门禁。

9. 通过 Cloudflare Worker Secrets 界面或逐项执行 `npx wrangler secret put SESSION_SECRET`、`GITHUB_CLIENT_SECRET`、`RESEND_API_KEY`、`INTERNAL_HMAC_SECRET` 写入 Secret；终端输入过程不要复制到日志。Actions 仓库中设置对应变量和 Secrets。
10. 代码先通过仓库 PR 审阅与 `main` required check，再由仓库维护者合并；然后从 `services/admin` 执行 `npx wrangler deploy`。这会更新后台 Worker，不会修改 GitHub Pages。
11. 部署后再接通邮件：先核对 Resend 域名和 `MAIL_FROM`，对管理员测试地址验证投递，再进行单来源通知、UI 取舍、候选 PR、最终 SHA 检查及邮件失败重试的闭环验收。
12. 首轮验收完成前保持 `UPDATE_AUTOMATION_ENABLED=false`、`PUBLISH_ENABLED=false`。自动采集和自动发布的启用另行授权、另行验收。

### Git 与 Pages job 兼容性

Pages 部署使用独立 runner；部署前需 `npm ci`，为 `service-client.cjs` 安装 `yaml` 解析依赖，不能依赖 build job 的 `node_modules`。工作流使用 `actions/checkout@v4` 并浅克隆单一提交；此仓库不要求完整 Git 历史。自托管 runner 应提供 Git 2.18 或更新版本，低于该版本时 checkout 可能改用 REST 下载而不是创建完整的 `.git` 工作树；候选 PR 创建需要真实 Git 工作树。GitHub 托管的 Ubuntu runner 已包含受支持的 Git。普通本地校验依赖 Node.js 20+；日常浏览静态站点无需 Git 运行时。

## 本地已验证与外部待验证

远端已完成并可复用的验收证据：OFC `main/cab3294` dry-run [Actions run 39434674078](https://github.com/turambarr/commddl/actions/runs/39434674078)，输入 `ids=ofc-2027-main`、`dry_run=true`、`retry_failed=false`；运行成功，日志记录官方页面结构化标题层级、段落和链接及 baselines API 成功，保存候选/通知步骤被跳过，未发邮件、未改正式 YAML。Cloudflare D1 最后只读核对：迁移账本中 `0001`、`0002` 各一条；`update_batches`、`audit_log`、`source_snapshots`、`notification_outbox` 均 0 行。之后未重复迁移或采集。

本地代码可验证：审阅 UI/API 的接受、纠正、拒绝、全拒绝；明确名单授权、实时核验、权限撤销和名单移除拒绝、所有者保留访问；最终 SHA/通知/检查绑定；call 文件最终 PR diff 强制人工合并、伪造候选类型不能绕过；手动合并/未合并关闭回收来源锁、重复回调与 Pages 部署分态；多节点日期映射、冲突日期拒绝、含时刻的来源文本不降为 date-only、已知精确 instant 不被日期证据清空；MobiCom 节点 revision/history 和 ICS 稳定 UID；API 包装和旧式手动 baselines 形状；失败重试退避、构建失败基线重置；目录校验、测试和构建。

仍须验证：OAuth callback 是否建立可用会话；实际 App token 是否能触发 `repository_dispatch` 并创建数据 PR（所有者已报告 App 私钥 Secret 配置完成，未读取 Secret）；Worker 邮件与 Resend 投递；所有者为 `main` 增加 `CommDDL final notice`；新 `0003` 经审阅后迁移及 Worker 部署；真实人工合并回调与 Pages 部署回调。D1 的 `0001`/`0002` 与 OFC dry-run 均复用，不重复执行。此轮不部署、不发邮件、不改远端配置、不发布、不开 schedule。
