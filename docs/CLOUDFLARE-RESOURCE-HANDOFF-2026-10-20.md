CommDDL Cloudflare 资源交接记录
============================

日期：2026-10-20（Asia/Shanghai）。本记录来自用户当前已登录的 Chrome Cloudflare 控制台，已逐项核对创建及保存结果。

已完成的资源准备
----------------

| 配置项 | 实际值/状态 |
|---|---|
| Cloudflare Account ID | fd94f5977d17917ab2768500b103d649 |
| Worker 名称 | commddl-admin |
| Worker 地址 / ADMIN_ORIGIN | https://commddl-admin.1319630151.workers.dev |
| Worker 当前代码 | Cloudflare Hello World 占位程序，尚未上传 CommDDL 后台代码 |
| D1 数据库名称 | commddl-admin |
| D1 UUID | 1f9c42d3-4148-4ade-92e4-c76dcb77f689 |
| 正式环境数据库绑定 | DB → 上述 commddl-admin 数据库，已保存并在控制台核对 |
| Previews Base 绑定 | No connected bindings；未共享正式数据库 |
| 付费计划 | 本次未升级套餐、未购买任何附加产品 |

Worker Production 的以下普通变量已保存并核对：

    GITHUB_OWNER=turambarr
    GITHUB_REPO=commddl
    ADMIN_ORIGIN=https://commddl-admin.1319630151.workers.dev
    PUBLISH_ENABLED=false

数据库绑定前已由用户明确确认授予该 Worker 对该项目数据库的访问权限；范围仅为正式服务配置。后续部署要保留预览环境不共享正式数据库的边界。

本地部署配置 services/admin/wrangler.toml 已同步 account_id、ADMIN_ORIGIN、database_id；保留原有 PUBLISH_ENABLED=false，没有写入任何 Secret。

控制台入口：

- [Worker 设置](https://dash.cloudflare.com/fd94f5977d17917ab2768500b103d649/workers/services/view/commddl-admin/production/settings)
- [D1 数据库](https://dash.cloudflare.com/fd94f5977d17917ab2768500b103d649/workers/d1/databases/1f9c42d3-4148-4ade-92e4-c76dcb77f689/metrics)

仍待完成
--------

数据库目前为空，本轮未执行迁移。部署接入时使用 Wrangler 按顺序应用 0001_initial.sql 和 0002_review_decisions_and_publish_binding.sql，保留迁移记录，不在控制台手工拼接或跳过版本。

本轮尚未配置或生成 SESSION_SECRET、INTERNAL_HMAC_SECRET、GITHUB_CLIENT_SECRET、RESEND_API_KEY；GITHUB_CLIENT_ID 和 MAIL_FROM 也待相关服务就绪后填写。新密钥由用户直接填入平台，不通过聊天传递。

本轮未注册 GitHub OAuth App、未安装机器人 GitHub App、未配置 GitHub Actions Secrets/Variables 或分支保护；未配置邮件发信域名；未上传完整后台/静态管理界面；未启用定时任务；未向正式仓库推送修改。

因此，当前 Worker 地址存在且资源配置已准备，但不能作为“后台已上线”或“真实邮件与审阅发布闭环通过”的证据。后续仍按 BACKEND-SETUP-AND-HANDOFF-2026-10-20.md 和最新 UPDATES-SETUP-CHECKLIST.md 接入。

collaborator 身份对接入的影响
---------------------------

用户明确说明：自己在 turambarr/commddl 中是 collaborator。尚未通过 GitHub 核对其具体 permission/role，不能默认拥有 admin 或分支规则管理权限。

后台访问采用两层规则：仓库所有者 `turambarr` 只有在 GitHub 实时返回 `admin` 时保留所有者管理能力；其他账号必须同时出现在 Worker 的 `AUTHORIZED_MAINTAINERS` 明确名单中，并由 GitHub 实时确认对 `turambarr/commddl` 具有 `write`、`maintain` 或 `admin` 权限。仅有仓库写权限不会自动获得后台权限，名单移除或写权限撤销会在下一次受保护 API 请求时生效。当前已知日常登录名为 `arofish`；所有者需在 Cloudflare Worker Production 变量中明确设置名单后才授权生效。

获授权维护者可管理通知收件人、审阅候选并按仓库保护规则请求发布。发布路径以当前登录人的 GitHub OAuth 身份提交 review，并校验 GitHub 返回的 reviewer、APPROVED 状态及目标 commit SHA；分支保护仍由 GitHub 执行。该应用名单不会授予 GitHub admin，也不能代替所有者安装 App、配置 Actions 环境或分支保护。

Cloudflare 资源已经在用户账号中创建，无需重复创建第二个 Worker 或数据库。GitHub 所有者配合事项与 Cloudflare 的资源所有权分开处理。
