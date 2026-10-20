# 更新服务接入清单

状态基准：2026-10-20。本清单描述当前代码需要的配置及外部操作；本地测试通过不等于 Cloudflare、GitHub 或邮件服务已配置。本轮只准备接入，不部署、不推送、不发送真实邮件、不启用定时任务。

## 默认开关

| 开关 | 保存位置 | 本轮及首次配置值 | 关闭时行为 |
|---|---|---:|---|
| `UPDATE_AUTOMATION_ENABLED` | GitHub 仓库 `Settings → Secrets and variables → Actions → Variables` | `false`，也可暂不创建 | 定时采集 job 跳过；`workflow_dispatch` 仍可用，默认 `dry_run=true` |
| `PUBLISH_ENABLED` | Cloudflare Worker `commddl-admin → Settings → Variables and Secrets → Variables`；同步到 `services/admin/wrangler.toml` | `false` | 可以登录、收邮件和保存审阅决定；发布 API 返回 `423 publishing-disabled`，不会提交批准或合并 PR |

两个值只有精确等于小写字符串 `true` 才开启。不要在首次部署或首次验收时开启它们。

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

仓库 Secrets：

| 名称 | 用途 |
|---|---|
| `UPDATE_INTERNAL_HMAC_SECRET` | 与 Worker 的 `INTERNAL_HMAC_SECRET` 相同；仅供 `scripts/updates/service-client.cjs` 签署内部 API 请求 |
| `UPDATE_GITHUB_APP_ID` | 仓库 GitHub App 的 App ID |
| `UPDATE_GITHUB_APP_PRIVATE_KEY` | 同一个 GitHub App 的私钥 PEM |

收集 workflow 使用 `contents: read`。更新 PR workflow 用 GitHub App token，限定仓库 `commddl`，需要 `Contents: read/write`、`Pull requests: read/write`；不需要安装到其他仓库。该 workflow 只在 `main` 上处理 `repository_dispatch`，并且通过 HMAC 内部 API 读取候选和记录 PR 最终 SHA。

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
- Required status check 精确名称：`catalog, tests, and generated site`。它是 `.github/workflows/review-gate.yml` 中 job 的名称。工作流执行目录校验、测试、站点构建；不要误填 workflow 的显示标题 `CommDDL review gate`。
- 禁止管理员绕过该分支规则；合并方式应允许 squash merge（当前 API 使用 `squash`）。

发布 API 会重新读取 PR head SHA 和状态，只接受与页面提交的 `final_sha` 一致的 PR；还要求最终版本通知完成、`notification_version` 和 `notification_sha` 均匹配。它只查询上述命名检查，不因无关 check run 失败而阻塞。GitHub 的 squash merge 以相同 SHA 作乐观锁；PR 更新后必须重新通知并重新审阅。

## 当前代码中的实际检查项

| 检查/门禁 | 名称或行为 |
|---|---|
| `.github/workflows/review-gate.yml` job / required check | `catalog, tests, and generated site` |
| `npm run check` | 目录结构与数据验证 |
| `npm test` | Node 测试集；包含实际 Worker API + SQLite 集成测试 |
| `npm run build` | 生成站点与日历 |
| 后台身份 | 所有者需有 GitHub 实际 `admin` permission；其他账号需在 `AUTHORIZED_MAINTAINERS` 名单中且实时核验为 `write`/`maintain`/`admin`。名单不授予 GitHub 权限 |
| 最终通知 | 每个批次版本 outbox 邮件完成；最终 SHA 和 PR 链接会纳入通知；未完成不可保存审阅或发布 |
| 发布开关 | Worker `PUBLISH_ENABLED` 必须精确为 `true` |
| 定时采集开关 | GitHub Actions Variable `UPDATE_AUTOMATION_ENABLED` 必须精确为 `true`；未设置时 schedule job 跳过 |

## 所有者必须完成的 GitHub 配置

- **GitHub OAuth App：** 由所有者创建或核对 App，并将 callback 精确设为 `<ADMIN_ORIGIN>/auth/callback`。
- **维护者名单：** 所有者在 Cloudflare Worker Production Variables 设置 `AUTHORIZED_MAINTAINERS=arofish`；新增或移除账号都由所有者明确操作。当前代码和 TOML 有 `arofish` 的本地待配置值，线上 Worker 尚未更新。
- **GitHub App：** 所有者安装到 `turambarr/commddl` 单一目标仓库，保留已有最小权限，不扩大机器人权限。
- **分支保护：** 所有者为 `main` 要求 `catalog, tests, and generated site`、至少一项批准审阅，并禁止绕过规则（包含管理员）；启用 squash merge。
- **Actions Environment：** 所有者配置受保护环境及审批人，并将发布 workflow 所需的变量和 Secrets 存入正确的 repository/environment 范围。

## 部署步骤（供资源就绪后的后续轮次使用）

以下是准备好的命令，本轮没有执行：

1. 仓库所有者（`turambarr`）核对并在 Cloudflare Worker Production Variables 中填写 `AUTHORIZED_MAINTAINERS=arofish`；按需逐个添加经所有者明确授权的人。不得将 GitHub 所有 write 用户批量加入。同步 `services/admin/wrangler.toml` 中名单值；保持 `PUBLISH_ENABLED = "false"`。
2. 仓库所有者创建/核对 OAuth App callback，将 GitHub App 安装到且仅安装到 `turambarr/commddl`，设置所需最小仓库权限，并配置 Actions Environment（建议 `production` 环境保护规则：required reviewers 与禁止自助批准，Secrets 仅保存该环境需要的凭据）。
3. 仓库所有者在 `main` 配置分支保护或 ruleset：要求 `catalog, tests, and generated site` 检查成功、至少一项批准审阅、要求分支最新，并限制绕过规则（包含管理员）。确认 squash merge 已启用。required check 和环境保护设置须使用所有者账号或 GitHub 实际授予的管理权限。
4. Cloudflare 资源标识已同步在 `services/admin/wrangler.toml`；核对 Worker Production 的资源绑定仍与交接记录一致，不要替换有效 account/database 标识。
5. 在后续获准迁移/部署的轮次中，在本地终端进入 `services/admin` 并完成 Cloudflare 登录。先检查账号和目标数据库，再按版本顺序运行迁移：

   ```sh
   cd /Users/fish/codework/commddl/services/admin
   npx wrangler whoami
   npx wrangler d1 migrations apply commddl-admin --remote
   ```

   全新库会依次应用 `0001_initial.sql`、`0002_review_decisions_and_publish_binding.sql`；现有 `0001` 库只应用新的 `0002`。`0002` 将批次表重建以增加全拒绝状态及最终通知 SHA、审核身份与已批准 SHA 字段。

6. 通过 Cloudflare Worker Secrets 界面或逐项执行 `npx wrangler secret put SESSION_SECRET`、`GITHUB_CLIENT_SECRET`、`RESEND_API_KEY`、`INTERNAL_HMAC_SECRET` 写入 Secret；终端输入过程不要复制到日志。Actions 仓库中设置对应变量和 Secrets。
7. 代码先通过仓库 PR 审阅与 `main` required check，再由仓库维护者合并；然后从 `services/admin` 执行 `npx wrangler deploy`。这会更新后台 Worker，不会修改 GitHub Pages。
8. 保持两个自动开关关闭。登录后先检查所有者/维护者身份和服务状态；在外部验收阶段再验证一个已配置收件人的验证/测试邮件、单来源 dry-run、候选邮件、UI 取舍、PR 最终 SHA 通知、required check 与拒绝/重试路径。不要用真实数据批准合并，除非维护者已审阅完整差异并明确批准。
9. 首轮验收完成前保持 `UPDATE_AUTOMATION_ENABLED=false`、`PUBLISH_ENABLED=false`。自动采集和自动发布的启用另行授权、另行验收。

## 本地已验证与外部待验证

本地代码可验证：审阅 UI 对选择状态的读取与保存；明确名单授权、每次请求实时核验、权限撤销和名单移除拒绝、所有者保留访问、审核身份和最终 SHA 绑定；Worker API 对接受、纠正、拒绝、全拒绝的处理及来源解锁；OAuth 登录后的维护者鉴权逻辑（使用测试 GitHub 响应）；最终 SHA/通知/required check/审核身份发布门禁；一个现有 MobiCom call 的日期候选、`nodes`、`revision`、`history`、`updatedAt` 与 ICS 稳定 UID；API 包装和旧式手动 baselines 形状；失败重试退避；构建工作流失败后释放来源锁、重置旧抓取基线并允许相同候选创建新版本；缺失旧基线不会误报删除；目录校验、测试和构建。

仍须在真实外部资源就绪后验证：所有者在 Cloudflare 设置 `AUTHORIZED_MAINTAINERS=arofish` 并确认授权、GitHub OAuth 授权屏、实际 App 安装及仓库权限、Cloudflare 远程 D1 迁移与 Worker 部署、Resend 域名和投递、GitHub 对 `repository_dispatch` 的实际授权、PR 工作流创建 PR、实际 branch protection required check 名称与合并结果。由于本轮按要求不部署、不推送、不发送真实邮件、不开启 schedule，这些状态不宣称已通过。
