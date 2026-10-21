# 更新服务接入与发布清单

状态核对日期：2026-10-21。本文记录目标配置、已知外部状态与还需人工核验的项目。文档中的密钥名不是密钥值。不要把 Secret 粘贴到聊天、提交、终端日志或普通 Actions Variables。

## 1. 已知资源与实测边界

| 项目 | 已知状态 | 需要如何确认 |
|---|---|---|
| GitHub 仓库 | `turambarr/commddl` | GitHub 仓库主页 |
| Worker | `commddl-admin`，地址 `https://commddl-admin.1319630151.workers.dev` | Cloudflare → Workers & Pages → `commddl-admin` → Deployments，核对最新版本是否与已审阅 `main` 一致 |
| D1 | `commddl-admin`，ID `1f9c42d3-4148-4ade-92e4-c76dcb77f689` | Cloudflare D1 → 数据库 → Migrations，核对 `0001`、`0002`、`0003` 各一条；不要重跑旧迁移 |
| 既往 Worker 部署记录 | 用户提供过版本 `01b97ec2-875a-4a19-958e-2f40d8addaf1` 与 `1a590082-32a5-4f37-b6e4-1d9add2cb6ae` | 两个版本均早于当前 `main` 的部分代码；不能据此称当前功能已部署 |
| App 私钥 | 所有者报告已保存为 `UPDATE_GITHUB_APP_PRIVATE_KEY` | 不读取、不复制、不重新生成。仅检查成功的 App-token workflow 结果 |
| OFC 来源 | 曾成功抓取官网结构并保存原始候选 `updates-2026-10-21-23f4b82855` v1；Chrome 只读核验为 `notice-incomplete` | 旧 v1 含登录/账户提示与营销内容；PR #9 合并部署后，先用 `retry_batch_id` 复用证据生成 v2，再由管理员审阅 |
| Copilot 真实调用 | 曾有一次 workflow 运行，但 CLI 在发起模型请求前因 JSON attachment 类型拒绝而失败 | [Actions run #5](https://github.com/turambarr/commddl/actions/runs/39588240304)。此次不能记为 Copilot 成功；再次真实调用需单独授权 |
| 邮件 | 2026-10-21 Chrome 生产后台只读状态为邮件待配置、启用收件邮箱 0 | 后台 `/api/session` 显示 `mailReady=false`、`enabledRecipients=0`；保持候选采集与审阅可用 |
| 运行开关 | schedule 与发布按交接要求保持关闭 | 实际值须在下表指定平台逐项核对；不能用本地默认值推断线上值 |

身份权限目标：所有者 `turambarr` 必须实时拥有仓库 `admin`；维护者 `arofish` 必须由所有者明确列入名单，且 GitHub 实时权限至少为 `write`。有写权限本身不会自动成为后台管理员。撤销仓库权限或移出名单后，下次受保护请求应立即拒绝。

## 2. 开关与保存位置

所有布尔开关仅精确值 `true` 开启。完成小范围闭环前，维持关闭。

| 名称 | 保存位置 | 当前要求值 | 用途 |
|---|---|---:|---|
| `UPDATE_AUTOMATION_ENABLED` | 仓库 `Settings → Secrets and variables → Actions → Variables` | `false` | 每月 1 日、15 日 schedule 总开关 |
| `COPILOT_COLLECTION_ENABLED` | 同上 | `false` | 半月 Copilot schedule 开关 |
| `PUBLISH_ENABLED` | Cloudflare → Workers & Pages → `commddl-admin` → Settings → Variables and Secrets → Variables | `false` | 管理后台正式批准/上线功能总开关 |
| `COMMDDL_FINAL_NOTICE_CHECK_ENABLED` | GitHub Actions Variables | `false` 或 unset，直到专用检查测试通过 | 最终 PR SHA 通知检查 |
| `COMMDDL_RECONCILIATION_ENABLED` | GitHub Actions Variables | `false` 或 unset，直到 final notice required check 验收后 | 人工合并和 Pages 部署回调 |

核验人：所有者。不要为了做手动 workflow_dispatch 真实 Copilot 运行而打开 schedule 开关；二者分别控制。

## 3. Worker Variables 与 Secrets

普通 Variables 位于 Cloudflare Worker Production 环境；对应可公开的固定值同步在 [`services/admin/wrangler.toml`](../services/admin/wrangler.toml)。

| Variable | 目标值/来源 |
|---|---|
| `GITHUB_OWNER` | `turambarr` |
| `GITHUB_REPO` | `commddl` |
| `AUTHORIZED_MAINTAINERS` | 所有者批准的 GitHub login 列表；当前目标为 `arofish` |
| `ADMIN_ORIGIN` | Worker HTTPS 根地址，不带路径或末尾斜杠 |
| `GITHUB_CLIENT_ID` | OAuth App Client ID |
| `PUBLISH_ENABLED` | `false`，直至独立验收 |
| `MAIL_PROVIDER` | 配好免域名通道后填 `ses` |
| `MAIL_FROM` | Amazon SES 已验证的单个发件邮箱地址 |

Cloudflare Worker Secrets（Settings → Variables and Secrets → Secrets）：

| Secret | 负责人/说明 |
|---|---|
| `SESSION_SECRET` | 所有者填写独立的高熵随机值，仅供 Worker 会话加密 |
| `GITHUB_CLIENT_SECRET` | 所有者从目标 OAuth App 保存 |
| `INTERNAL_HMAC_SECRET` | 所有者填写高熵随机值；同一值另存为 Actions Secret `UPDATE_INTERNAL_HMAC_SECRET` |
| `AWS_SES_REGION` | 发件身份所在 AWS 区域 |
| `AWS_SES_ACCESS_KEY_ID` | 所有者创建仅限 SES 发送的 IAM 凭据 |
| `AWS_SES_SECRET_ACCESS_KEY` | 上述 IAM Secret，仅存 Worker Secret |
| `RESEND_API_KEY` | 可选备用；不需要自有域名的方案优先 SES |

Cloudflare Token 只在所有者本机隐藏输入，用于核验或部署。其权限限定当前账号中的此 Worker 脚本编辑及此 D1 编辑；旧 Token 已撤销。新代码的部署由明确授权的部署轮次执行，不在本轮进行。

## 4. GitHub App、OAuth 与 Actions

### GitHub App

- 由仓库所有者在个人账号设置的 GitHub Apps 页面确认 App 仅安装到 `turambarr/commddl`。
- 保持既有最小权限：Contents 与 Pull requests 读写、Metadata 读取；不授予绕过保护的权限。
- Actions Secrets：`UPDATE_GITHUB_APP_ID`、`UPDATE_GITHUB_APP_PRIVATE_KEY`。私钥已由所有者报告保存；不要读取或重新生成。
- 只以真实成功的 `actions/create-github-app-token` 和 PR workflow 验证安装令牌与目标仓库权限。

### GitHub OAuth App

所有者核对：

- Homepage URL：`https://commddl-admin.1319630151.workers.dev`
- Authorization callback URL：`https://commddl-admin.1319630151.workers.dev/auth/callback`
- OAuth Scope 由应用使用 `read:user public_repo`；不要扩大到全仓库 `repo`。
- 登录后访问 `https://commddl-admin.1319630151.workers.dev/api/session`，确认 `login`、`project`、`mailReady` 与 `enabledRecipients`。分别核验 `turambarr` 和 `arofish`；不要把 session token 或 OAuth Secret 输出到日志。

### Actions Variables 与 Secrets

位置：仓库 `Settings → Secrets and variables → Actions`。

Variables：

- `UPDATE_ADMIN_API_URL=https://commddl-admin.1319630151.workers.dev`
- 五个运行开关按第 2 节填写；本阶段保持关闭。

Secrets：

- `UPDATE_INTERNAL_HMAC_SECRET`：与 Worker 的 `INTERNAL_HMAC_SECRET` 完全相同。
- `UPDATE_GITHUB_APP_ID`、`UPDATE_GITHUB_APP_PRIVATE_KEY`：现有 GitHub App 凭据。
- `COPILOT_GITHUB_TOKEN`：由 arofish 账号创建的 fine-grained PAT，仅勾选 `Copilot Requests`，Repository access 可选 public repositories/read-only；令牌只用于 Copilot 请求。不得启用超额计费。当前用户表示额度限额已配置，但不得据此推定本次真实 Copilot workflow 已成功。

### 受保护环境与权限

所有者在 `Settings → Environments` 核对生产环境审批人和发布分支限制。Actions workflow 只获取构建 PR 所需的 Contents/Pull requests 权限。最终批准使用登录管理员的 GitHub 身份和标准 GitHub merge API；required checks、人工审批与分支保护继续由 GitHub 强制执行。

## 5. 不要求自有域名的邮件方案

采用 Amazon SES 的已验证单邮箱身份，不购买或验证自有域名：

1. 所有者在 AWS SES 选择一个区域，添加并验证自己能收信的发件邮箱。
2. 在 Cloudflare Worker 保存 `MAIL_PROVIDER=ses`、`MAIL_FROM`（与已验证邮箱完全一致）及 SES 区域/最小权限 IAM Secrets。
3. 新 SES 账号可能处于 sandbox；sandbox 中收件地址也必须先验证。先用 SES mailbox simulator 或已验证测试邮箱测试。
4. 若之后要发给后台用户自助验证的任意地址，由 AWS 账号所有者向 SES 申请 production access。此权限由 AWS 控制台授予，与域名购买无关。
5. 管理员登录后台，添加自己的收件邮箱，点验证邮件链接，再从后台发送测试邮件。之后退出并重新登录核对收件人持久化及启用状态。

邮件服务缺失或投递失败仅影响提醒，不得阻止官网采集、候选保存、后台展示和审阅。发送真实邮件需按本轮用户授权范围操作。

## 6. 兼容顺序、检查名称与分支保护

### 必需检查名称

- `build`
- `catalog, tests, and generated site`
- `CommDDL final notice`

### 启用顺序

1. 先审核并合并包含 Worker 接口、final notice workflow、reconciliation workflow 和 Pages 回报依赖的代码；此时相关接入变量仍关闭。
2. 应用尚未执行的迁移（目前维护者报告 `0003_manual_merge_reconciliation.sql` 已成功；再执行前只读核对 migration ledger，已完成则跳过）。部署已合并 `main` 对应 Worker 后验证接口与 D1 绑定。
3. 打开 `COMMDDL_FINAL_NOTICE_CHECK_ENABLED=true`，实测普通非候选 PR 当前 SHA 得到 neutral；候选 PR 的最终 SHA 只有通知/批次绑定成功才得到 success。邮件缺失不能伪造通知成功。
4. 验收后所有者才将 `CommDDL final notice` 加入 `main` required status checks，同时保留原有两项检查、人工审批人数和禁止绕过设置。
5. 最后才打开 `COMMDDL_RECONCILIATION_ENABLED=true`，实测已合并 PR 和 Pages 回调；部署失败必须可恢复。关闭到启用之间产生的变更须由可信工作流补核。
6. 半月 schedule 继续关闭，直至小范围真实闭环完成且用户另行授权。

Pages 部署 runner 独立，必须自行执行 `npm ci` 后使用所需 Node/YAML 依赖；不能依赖 build job 的 `node_modules`。GitHub 托管 Ubuntu runner 提供工作树所需 Git。候选数据 PR workflow 浅检出 main 单提交是有效完整 git 工作树；不得改为纯 REST 文件下载。

## 7. 本地检查、外部验证和已知缺口

本轮代码 PR 应运行：`npm ci`、`npm run check`、`npm test`、`npm run build`、`git diff --check`。这些验证不调用真实 Copilot、不发真实邮件、不证明 Cloudflare 部署或 GitHub 分支规则设置。

外部仍待验证：

- 当前线上 Worker 是否已升级至最新经审阅 main SHA；
- OAuth 回调及两个授权账号的 `/api/session` 实际结果；
- App token、`repository_dispatch` 与新数据 PR 工作流的成功记录；
- 新输入格式下的 Copilot 真实请求。此前一次授权已用在失败尝试；再次发起需用户重新授权；
- SES 发件地址、投递与收件人跨会话持久化；
- 普通 PR neutral、候选最终 SHA success、required check 及分支保护实际设置；
- 管理员对真实官网候选进行审阅并明确批准后的标准合并和 Pages 回调。

真实数据差异必须由用户逐项审阅；最终批准与合并由用户本人在后台/仓库规则内完成。不得由 Agent 或 Worker 代替用户确认数据内容。
