# 给管理员端会话的执行提示词

使用时间：现在交给拥有 `turambarr/commddl` 所有者或实际管理权限的会话。下方正文可整体作为提示词；如果该会话能访问此文件，直接让它读取并执行即可。

本文记录截至 2026-10-20 的交接状态。它本身不表示外部配置已完成，也不表示管理员已批准任何数据变更。

---

请接续 CommDDL 原有的定时更新、邮箱通知、网页审阅和批准后发布计划，完成管理员侧配置及后续接入。**我已取消 fork 决定：目标始终是 `turambarr/commddl`，不 fork、不迁移所有权、不改成 `arofish/commddl`。**

我可以操作管理员账号。请先核对当前 GitHub 登录身份和目标仓库的实际权限，再使用具备权限的账号完成配置。日常维护者 GitHub login 是 `arofish`，不是邮箱地址。不要继续尝试把个人仓库 collaborator 提升为一个不存在的独立 admin 角色；沿用已经实现的“所有者授权名单 + GitHub 实时写权限核验”。

本轮允许完成原方案所需的平台配置、代码分支及 PR、D1 迁移、Worker 部署和单来源联调；向我在管理页主动添加的邮箱发送验证邮件，向已验证且启用的邮箱发送必要测试和审阅通知。系统代码合入 `main` 和真实数据发布仍需对具体差异进行人工审阅。**不要直接推送 `main`，不要替人提交内容批准，不要自动开启无人值守采集。**

## 1. 接续已有成果，不重新开发一遍

原工作目录是 `/Users/fish/codework/commddl`。先阅读以下文件，以最新代码、本文以及实际平台状态为准：

- `docs/SCHEDULED-UPDATES-PLAN-2026-10-20.md`：原始需求和最终验收目标。
- `docs/UPDATES-SETUP-CHECKLIST.md`：最新变量、Secrets、权限及检查名称。
- `docs/CLOUDFLARE-RESOURCE-HANDOFF-2026-10-20.md`：已创建资源的真实标识。
- `docs/BACKEND-SETUP-AND-HANDOFF-2026-10-20.md`：部署和分阶段验收教程。
- `docs/INITIAL-COLLECTION-STATUS-2026-10-20.md`：首批候选的证据限制。
- `services/admin/wrangler.toml`、`services/admin/src/worker.js`、三个更新工作流以及 Pages 工作流。

工作区包含大量未提交、未跟踪的新功能，包括 `services/`、`scripts/updates/`、更新工作流和测试。普通 clone 不能取得这些本地成果。先清点并保留全部已有改动；不能 reset、clean、覆盖现有详情卡，不能把缺少未提交代码误判为功能尚未实现。如果当前管理员会话在另一台电脑或另一个 checkout，先确认最新代码的安全交接方式，再继续部署；不要只拿旧 `main` 部署。

截至交接时，执行会话已报告：本地 97 项测试、目录检查、构建和 `git diff --check` 通过。已实现网页审阅状态保存、按实体分组决策、全拒绝后解锁、日期增量与稳定 ICS UID、失败恢复、最终 SHA/通知/审核身份门禁，以及明确维护者名单。真实 OAuth、GitHub App、远程数据库、邮件和发布链路尚未验收。请针对后续改动运行必要验证，不把历史本地测试当作线上证据。

## 2. 固定目标与可复用资源

| 项目 | 交接时的实际值/状态 |
|---|---|
| GitHub 仓库 | `turambarr/commddl`，默认发布分支 `main` |
| 公网站点 | `https://turambarr.github.io/commddl/`，执行时核对实际 Pages 地址 |
| 日常维护者 | `arofish`，需保有该仓库的实际写权限 |
| Cloudflare Account ID | `fd94f5977d17917ab2768500b103d649` |
| Worker | `commddl-admin` |
| ADMIN_ORIGIN | `https://commddl-admin.1319630151.workers.dev` |
| D1 名称 | `commddl-admin` |
| D1 UUID | `1f9c42d3-4148-4ade-92e4-c76dcb77f689` |
| 正式环境绑定 | `DB` → 上述 D1，已由用户批准并保存 |
| 预览环境 | Previews Base 无绑定，不共享正式数据库 |
| Worker 代码 | 上次核对仍为 Hello World，占位服务，不是已部署后台 |
| 远程数据库 | 上次核对为空，尚未应用迁移；执行前复核是否已有变化 |

不要重复创建 Worker 或数据库，不购买额外资源。保留以上 origin、数据库及正式环境绑定；不要给预览分支连接正式库。任何现场差异先查明，不用示例值覆盖真实配置。

## 3. 先完成管理员权限范围内的 GitHub 配置

按下面清单检查已有配置，只补缺项；不要因本教程列出一项就创建重复应用。

### 3.1 确认维护者授权

由所有者确认 `arofish` 可使用后台。授权规则保持：

- 所有者 `turambarr`：GitHub 实时返回该仓库 `admin` 权限才可访问。
- 其他账号：必须同时出现在服务端 `AUTHORIZED_MAINTAINERS` 中，且 GitHub 实时返回该仓库 `write`、`maintain` 或 `admin` 权限。
- 每次受保护请求重新检查；移除名单或撤销仓库写权限应立即阻断后续访问。

本地 TOML 已有 `AUTHORIZED_MAINTAINERS="arofish"`，**线上 Worker 尚未据此完成授权配置**。由具备 Cloudflare 编辑权限的人在 Production 设置同名普通变量；GitHub 所有者身份本身不自动拥有 Cloudflare 权限。后台名单不提升 GitHub 仓库角色，邮箱验证也不授予审核权。

### 3.2 OAuth App

创建或复用由项目方控制的 OAuth App，核对：

- Homepage URL：`https://commddl-admin.1319630151.workers.dev`
- Authorization callback URL：`https://commddl-admin.1319630151.workers.dev/auth/callback`
- 使用现有代码所需的 `read:user public_repo`，不为了公开仓库扩大到全部私有仓库权限。
- Client ID 放到 Worker `GITHUB_CLIENT_ID`；Client Secret 放到 Worker Secret `GITHUB_CLIENT_SECRET`。

OAuth App 的管理权、仓库管理权和 Cloudflare 编辑权分别核对，不假定是同一个账号。

### 3.3 创建更新 PR 的 GitHub App

由有权安装应用的所有者完成安装；目标仅为 `turambarr/commddl`。按现有工作流需要授予 Contents 读写、Pull requests 读写和 Metadata 读取。不安装到全部仓库，不授予分支保护绕过权。

将该 App 的 ID 和私钥分别存为目标仓库的 Actions Secrets：

- `UPDATE_GITHUB_APP_ID`
- `UPDATE_GITHUB_APP_PRIVATE_KEY`

PR 由 App 创建，维护者用自己的 GitHub 身份审阅，避免机器人自审。确认 App 创建或更新 PR 后，所需检查确实运行。

### 3.4 Actions 配置与分支保护

在 `turambarr/commddl` 设置仓库级 Variables：

| 名称 | 值 |
|---|---|
| `UPDATE_ADMIN_API_URL` | `https://commddl-admin.1319630151.workers.dev` |
| `UPDATE_AUTOMATION_ENABLED` | `false` |

另设仓库级 Secret `UPDATE_INTERNAL_HMAC_SECRET`，与 Worker 的 `INTERNAL_HMAC_SECRET` 为同一个值。

现有更新 job 没有引用名为 `production` 的 GitHub Environment，因此先按现有实现使用仓库级 Secrets/Variables。不要把凭据仅放进一个工作流没有引用的环境，造成运行时读不到；不额外添加会造成审批循环的环境门禁。Pages 现有的 `github-pages` 环境保留，并将正式部署分支限制为 `main`。

为 `main` 配置 PR 合并要求、至少一名合格审核者批准、必要检查通过、新提交撤销旧批准，禁止机器人和管理员绕过。允许当前 API 使用的 squash merge。

现有 Worker 查询的必要检查精确名称是 **`catalog, tests, and generated site`**，对应 `.github/workflows/review-gate.yml` 的 job。先让受控 PR 实际运行，再选择平台显示的准确检查和来源，不使用旧文档中的拼接名称，也不把“测试全绿”当作已经有人批准数据。

首次系统代码 PR 也要有人审阅。PR 作者不能自行给自己的 PR 留下有效批准；需要另一位合格审核者。不要用关闭现有保护或管理员绕过来解决。若新检查尚未在目标仓库运行，明确安排首次 PR 运行、人工审阅、保护配置的先后顺序，避免选中永远不会产生的 required check。

## 4. Cloudflare 与邮件接入

### 4.1 配置清单

Worker Production 普通变量：

| 名称 | 值 |
|---|---|
| `GITHUB_OWNER` | `turambarr` |
| `GITHUB_REPO` | `commddl` |
| `AUTHORIZED_MAINTAINERS` | 所有者批准后的 `arofish` |
| `ADMIN_ORIGIN` | `https://commddl-admin.1319630151.workers.dev` |
| `GITHUB_CLIENT_ID` | 已核对的 OAuth Client ID |
| `MAIL_FROM` | 已验证发信域名下的实际发件地址 |
| `PUBLISH_ENABLED` | `false` |

Worker Secrets：`SESSION_SECRET`、`GITHUB_CLIENT_SECRET`、`RESEND_API_KEY`、`INTERNAL_HMAC_SECRET`。HMAC 两端保持一致；会话密钥使用足够随机的值。

新密钥由有权限的人直接填写在平台或安全输入界面，不经聊天中转，不写入 TOML、文档、公开构建或日志，不输出真实值。检查配置是否存在及调用是否成功即可。如果生成私钥或本地调试文件，提交前补充必要忽略规则并检查暂存区，避免 `.dev.vars`、`.env`、PEM 等被提交。

邮件适配器目前使用 Resend。先确认项目已有发信域名和通道；配置域名验证、API key 和 `MAIL_FROM`。`1319630151@qq.com` 是可由用户添加的收件地址，不能当作项目拥有的发信域名，也不写死为唯一收件人。没有可用发信资源时，一次列清域名/DNS/通道所缺事项，继续完成不依赖它的工作；不以模拟发送声称邮件闭环通过，不擅自购买域名或改成尚未实现的 SMTP 通道。

### 4.2 数据库和部署

核对 Cloudflare 身份、账号、目标 Worker 和数据库后，使用 Wrangler 迁移账本按顺序应用：

1. `0001_initial.sql`
2. `0002_review_decisions_and_publish_binding.sql`

在原目录可从 `services/admin` 执行 `npx wrangler d1 migrations apply commddl-admin --remote`；已有迁移不能手工重复执行。若数据库不再为空，先盘点并保留数据，必要时备份；不删除数据库、不重建以跳过错误。

系统代码先形成独立 PR，经审阅合入 `main` 后，再部署与该已审阅版本一致的 Worker 和管理静态资源；核对 `npx wrangler deploy` 的目标。部署后验证真实页面、API、D1 和 OAuth，不把 URL 可打开或 Hello World 当作服务验收。

在系统代码 PR 中将 `data/meta.yml` 的 `adminPortalUrl` 设为上述已确认的管理服务 URL，发布后验证主站管理入口。改数据文件前读取 `data/README.md` 和适用的 `data/AGENTS.md`，只维护源文件，不手改生成物。

首次配置与部署阶段保持 `UPDATE_AUTOMATION_ENABLED=false`、`PUBLISH_ENABLED=false`，包括本地 TOML 和线上配置。受控发布仅在第 5 节第 7 项取得明确同意后启用；无人值守采集仍保持关闭。显式小写字符串 `true` 才会启用对应功能，不能依赖“变量没有填应该没事”的猜测。

## 5. 单来源真实联调，保持人工批准边界

按以下顺序执行，尽量让程序完成日常流程；本地 Agent 整理不算自动采集通过：

1. **登录与授权**：所有者和已授权 `arofish` 可以进入后台；普通访客、未列入名单的写权限账号被拒绝。权限撤销和名单移除用可恢复的受控验证证明，不撤销用户日常访问来凑测试。
2. **邮箱持久化与真实发信**：由我在管理页选择并添加收件地址，收到验证邮件，完成验证后发送测试邮件；重新登录仍有记录。未验证/停用地址不接收更新。服务商接受发送的回执与实际收件分别记录。
3. **单来源 dry-run**：从 `main` 手动运行采集工作流，显式指定一个真实来源 ID，`dry_run=true`、`retry_failed=false`。验证部署环境采集器实际读到的内容、来源及必要日期证据；本次不创建候选、不发送更新提醒。按代码需要初始化来源登记或读取该 ID 的 baselines。
4. **创建候选并通知**：dry-run 通过后，对同一个来源运行受控的非 dry-run，保存候选并向已验证收件人通知。无变化时如实报告，不伪造变化；可使用有来源证据的缺失官网分段补齐来验收。
5. **网页取舍与 App PR**：由我在网页接受、纠正或拒绝，程序保存决策、生成确定性的 YAML 修改和数据 PR。检查目标仍是 `turambarr/commddl`，系统代码 PR 与数据 PR 分开。若程序失败先修复程序，不代替程序手工整理 YAML 或上传。
6. **最终版本审阅**：展示准确 PR 链接、最终 head SHA、差异和检查结果，并完成对应最终版本通知。通知不完整、SHA 变化或必要检查未过应阻断发布。此时 `PUBLISH_ENABLED=false`，发布 API 被阻断是预期行为。
7. **批准后的受控发布**：等我查看最终差异并明确同意后，再启用本次发布所需的 `PUBLISH_ENABLED`，由我通过网页批准。系统以当前人的 GitHub 身份记录最终 SHA 的真实 review，核验审核者/状态/SHA，按保护规则 squash 合并并触发 Pages。不得由执行会话替我点击内容批准。
8. **发布与恢复验证**：核对网页和日历；日期修改保持 call/node ID、revision/history 和 ICS UID 正确。再次运行，无变化不重复提交/通知；验证全拒绝可继续采集、邮件失败可重试、PR 构建失败释放来源、旧版本批准失效。真实官网没有日期变化时，用测试夹具验证日期场景，不能更改真实截止日期来演示。

前期的 `artifacts/initial-official-review-batch.json` 是 8 个实体、26 个分段的手工官网渲染读取候选，不是 HTTP 采集器成功的证据，不能直接作为已核验内容发布。动态页面/PDF 等未适配来源保留明确缺口，不扩大本轮到全目录。

## 6. 何时停下等待，何时继续

不依赖缺失凭据的检查、代码修正、PR 准备和文档工作继续完成。只在必须由人登录、填写 Secret、操作邮箱验证、批准具体代码/数据差异或新增安全授权的节点，请对应有权限的人完成最小动作；已经完成和已授权的配置不要反复要求确认。不要索要账号密码，也不要让用户重复抄写已知资源标识。

**无人值守采集另行启用。** 本轮始终保持 `UPDATE_AUTOMATION_ENABLED=false`；不要因为手动联调通过就打开 schedule。真实闭环通过后，提交已验收来源的小名单和启用方案，等我明确下达启用指令。既定频率为北京时间 01:17、07:17、13:17、19:17，对应 UTC `17 5,11,17,23 * * *`；每次只处理到期来源。

部署后的日常采集、差异、提醒、数据生成和上传必须由 Actions/Worker 自行完成。不要新建依赖 Codex 会话唤醒或本地电脑常开的替代定时任务。开启定时后再验证一次独立运行记录，不能用开发会话手动代跑冒充。

## 7. 交付结果

请交付一份简明接入报告，包含：

- 当前实际登录身份及目标仓库；所有者/`arofish` 后台授权结果。
- 系统代码 PR、数据 PR、Actions 运行、管理服务和 Pages 的真实链接。
- GitHub App 安装范围、OAuth callback、required check 和保护规则的核对结果。
- 每项变量/Secret 的“已设置/待设置”，不包含 Secret 值。
- D1 已应用版本、部署版本，以及邮箱验证、测试、候选和最终通知的实际证据。
- 本地检查与真实外部验收分别通过哪些；缺项准确写明，不能宣称全部完成。
- 两个开关的实际最终值、已验收来源名单、仍需我完成的最少动作。
- 更新后的接入文档，消除旧说明中重复建库、只迁移 0001、仅 admin 可登录、错误检查名称和未接入环境等过时内容。

最终目标保持原计划：管理员自己添加邮箱；程序按需采集官网信息，生成增量候选并发邮件；管理员只用网页取舍和批准，程序完成数据 PR、检查及批准后的发布。常规更新不依赖开发 Agent 整理和上传。
