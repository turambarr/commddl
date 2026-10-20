CommDDL 后端接入教程与下一轮执行提示词
====================================

日期：2026-10-20，时间均按 Asia/Shanghai。对应执行会话：**commddl-执行**。

目标是让部署后的程序完成采集、整理、提交和发布，管理员只通过网页审阅。本教程是接入步骤与交接材料，不表示已经开通服务。当前代码仍有已发现的功能断点，应先执行提示词 A，再按执行者确认的配置清单接入。

一、提示词分别在什么时候输入
----------------------------

| 节点 | 输入条件 | 你输入什么 | 执行者应交付什么 |
|---|---|---|---|
| A：现在 | 不需要任何新服务已经开通 | 本文末尾提示词 A | 修复阻断问题、最小日期更新链路、真实门禁设计、默认关闭的运行开关、确定的部署配置清单 |
| B：资源配置后 | A 完成；Worker、D1、邮件通道、GitHub 应用和权限已就绪，凭据填在平台上 | 本文末尾提示词 B，并填入非敏感地址和状态 | 部署与真实联调、一个官方来源的闭环、失败/拒绝/旧版本场景验证；定时运行仍关闭 |
| C：真实验收通过后 | 你收到测试邮件、实际审阅过最终差异、检查与仓库保护已验证 | 本文末尾提示词 C | 开启约定范围的定时任务，核验一次无人值守运行并给出停用方法 |

输入条件是完成状态，不是某个钟点。现在可以先给 A；不要一次把 A、B、C 全部交给执行者。你可在 A 执行期间注册账号、确认仓库管理权限和准备发信域名；GitHub 应用权限等易变化项等 A 的清单确定后再填。

二、先确认你有哪一类权限
------------------------

当前目标仓库是 [turambarr/commddl](https://github.com/turambarr/commddl)。现有管理服务只允许该仓库的 admin 身份登录。收件邮箱和 GitHub 管理权限是不同设置。

如果你只有贡献者权限，需要仓库所有者协助：安装 GitHub App、设置仓库凭据、配置分支保护、审核合入系统代码，并确认谁可以使用后台。若确实需要你以维护者身份管理收件人，应在 A 中落实明确的维护者名单及权限规则；不能只因为填了邮箱就获得发布权。

最省事的归属方式是：Cloudflare 与邮件服务由项目指定的管理账号持有；GitHub OAuth App 与 GitHub App 由仓库所有者或项目组织持有。私人 GitHub App 默认只能安装到它所属账户；由贡献者自建再安装到另一个所有者的仓库时，需要确认安装可见性和所有者授权。[GitHub App 注册说明](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app)

三、需要准备的资源
------------------

| 项目 | 数量 | 本轮用途 |
|---|---:|---|
| Cloudflare 账号 | 1 | 容纳 Worker 和 D1 |
| Worker | 1，建议名 commddl-admin | 管理页面、邮箱验证、审阅 API、发布协调 |
| D1 数据库 | 1，建议名 commddl-admin | 收件配置、来源状态、候选、通知记录 |
| Resend 账号/邮件通道 | 1 | 当前代码实际实现的邮件服务是 Resend |
| 可控制 DNS 的发信域名 | 1，可复用已有域名/子域名 | 为 Resend 验证发信身份 |
| GitHub OAuth App | 1 | 当前实现的管理员登录 |
| GitHub App | 1 | 自动创建数据分支、PR，以及 A 确定的门禁能力 |

主站继续使用 GitHub Pages；抓取与构建继续使用 GitHub Actions。本轮不要求另租服务器、另购数据库、接入对象存储或开通大模型 API。Worker 可先使用平台提供的 workers.dev 地址，不需要为管理网站另买域名。[Worker 地址说明](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)

Resend 的发信域名与收件邮箱不同：1319630151@qq.com 可以收件，但不能把 qq.com 或 turambarr.github.io 填成你拥有的发信域名。若没有可用域名，可先完成代码与 Cloudflare 准备，再让执行者单独接入你已有的邮件通道；当前代码没有 SMTP 适配器，填写 SMTP 密码不会自动启用它。[Resend 域名要求](https://resend.com/docs/dashboard/domains/introduction)

四、先给执行者提示词 A
----------------------

A 要先修复审阅页面取舍无法保存的问题，并增加真正覆盖 UI/API 的测试。目前 79 项测试通过，不代表邮件与发布链路已经可用。

A 还要把日期更新做成一个可验证的最小实现：官网日期候选经审阅后，能修改现有 call 的 nodes、revision、history、updatedAt，保持日历 UID 稳定。全量新届次发现、所有站点动态渲染和 PDF 适配可继续排期，不作为这次联调前无限扩张的任务。

要求 A 生成 docs/UPDATES-SETUP-CHECKLIST.md，确定所有变量、回调地址格式、GitHub 权限、实际 required check 名称和部署命令。以下给出的是当前代码的配置基线；若修复后变动，以该清单为准，并要求执行者解释变动用途。

**A 需要新增两个默认关闭的控制项：**

| 建议名称 | 放置位置 | 关闭时的行为 |
|---|---|---|
| UPDATE_AUTOMATION_ENABLED=false | GitHub Actions 仓库 Variable | 不自动按时采集；仍允许受控的手动 dry-run |
| PUBLISH_ENABLED=false | Worker 普通变量 | 可以管理邮箱、审阅和准备 PR；实际合并/发布请求被明确阻断 |

这两个开关目前还没有实现。不能现在只填写变量就以为它们会生效；必须先让 A 加入代码并验证。代码进入 main 前，确认定时路径确实受关闭开关控制。

五、创建 Cloudflare Worker 和取得管理地址
---------------------------------------

1. 注册或登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 进入 Workers & Pages，创建一个 Worker，名称用 commddl-admin。若名称已存在，复用项目原有服务。
3. 可以先使用最简模板部署，仅用于取得地址；随后会用项目代码更新同一个 Worker，不要另建第二个。
4. 记录平台给出的完整 HTTPS 地址，例如 https://commddl-admin.你的账户子域名.workers.dev。
5. 后续 ADMIN_ORIGIN、OAuth Homepage、OAuth callback、GitHub 的 UPDATE_ADMIN_API_URL 均以这个实际地址为准。ADMIN_ORIGIN 不带尾部斜杠，也不带 /api 或 /auth/callback。

使用最简模板只是取得地址，尚未接入 CommDDL 管理服务。[Cloudflare 控制台创建步骤](https://developers.cloudflare.com/workers/get-started/dashboard/)

六、创建数据库并准备项目配置
----------------------------

打开终端，以下命令都在后端目录执行。也可以在 B 时交给执行者操作；浏览器登录由你完成。

~~~sh
cd /Users/fish/codework/commddl/services/admin
npx wrangler login
npx wrangler whoami
npx wrangler d1 create commddl-admin
~~~

如果数据库已经存在，不再重复创建。记录数据库 UUID，执行者会将它填入 services/admin/wrangler.toml 的 database_id，替换全零占位。binding 保持 DB，database_name 与真实数据库名称一致，migrations_dir 保持 migrations。若账号包含多个 Cloudflare account，确认选择持有该 Worker 和数据库的那个 account。

同一配置文件的普通变量应包含：

| 名称 | 填写内容 |
|---|---|
| GITHUB_OWNER | turambarr，除非项目明确迁移目标 |
| GITHUB_REPO | commddl |
| ADMIN_ORIGIN | 第五步的实际管理地址 |
| GITHUB_CLIENT_ID | 下一步创建的 OAuth App Client ID |
| MAIL_FROM | 已验证域名下的发信地址，例如 CommDDL <notify@updates.你的域名> |
| PUBLISH_ENABLED | false；必须先完成 A 的代码支持 |

普通变量可由执行者写入配置文件；Secret 单独保存，不能放进该文件。面板上改了普通变量，也要同步项目配置，避免后续部署覆盖。

A 的数据库迁移文件确定后，对新建数据库执行：

~~~sh
npx wrangler d1 migrations apply commddl-admin --remote
~~~

这里创建的是项目的远程表结构，不是把本地临时数据上传。预期能在 D1 面板看到 projects、recipients、source_snapshots、update_batches、notification_outbox 等表；迁移修复后也可能增加必要的状态表。[D1 迁移说明](https://developers.cloudflare.com/d1/reference/migrations/)

七、注册 GitHub OAuth App：负责管理员登录
---------------------------------------

打开 [GitHub OAuth Apps 设置](https://github.com/settings/developers)，选择 New OAuth App。项目所有者也可以在其组织设置中创建。

| 字段 | 建议填写 |
|---|---|
| Application name | CommDDL Admin |
| Homepage URL | 实际 Worker 管理地址 |
| Description | CommDDL 管理员邮箱与官方数据审阅 |
| Authorization callback URL | 实际管理地址后加 /auth/callback |
| Device flow | 本功能不使用，无需勾选 |

注册后取得 Client ID，并生成 Client Secret。Client ID 放 Worker 普通变量 GITHUB_CLIENT_ID，Client Secret 放 Worker Secret GITHUB_CLIENT_SECRET。它们来自 **OAuth App**，不是后面机器人 GitHub App 的同名字段。保持服务端支持的短期令牌设置；遇到到期后应重新登录，不用关闭令牌到期来掩盖实现问题。[OAuth App 创建说明](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)

当前代码请求的 OAuth scope 包含 repo，范围较宽。A 应检查公开仓库所需权限并尽量收敛，明确实际授权页面上会出现什么。不要在代码尚未确认时为解决 403 反复扩大权限。

八、配置 Resend 发信
-------------------

1. 注册或登录 [Resend](https://resend.com/)，进入 Domains，添加自己控制的域名或发信子域名。
2. 将 Resend 面板显示的 DNS 记录按原样添加到该域名的 DNS 服务商。记录名称、值和类型以面板为准，不采用猜测的 SPF/DKIM 内容，也不覆盖已有邮箱配置。
3. 等待状态变为 Verified。DNS 验证耗时由实际传播情况决定。
4. 在 API Keys 中创建一枚专供 CommDDL 使用的发送密钥，优先选择 Sending access 并限制到该发信域名。
5. 将完整密钥填入 Worker Secret RESEND_API_KEY，将该域名下的发信地址填入 MAIL_FROM。

无需向聊天粘贴 API Key，也无需提供 QQ 邮箱登录密码。执行者只需要知道“相应 Secret 已设置”，之后通过实际发送结果判断配置是否正确。[Resend 域名说明](https://resend.com/docs/dashboard/domains/introduction)、[API Key 权限](https://resend.com/changelog/new-api-key-permissions)

九、生成并填写 Worker Secrets
----------------------------

进入 Cloudflare 的 Worker → Settings → Variables and Secrets → Add，类型选择 Secret。名称与下表一致；保存后按面板提示部署生效。[Cloudflare Secrets 设置说明](https://developers.cloudflare.com/workers/configuration/secrets/)

| Worker Secret | 来源 | 同一个值还要放在哪里 |
|---|---|---|
| GITHUB_CLIENT_SECRET | 第七步 OAuth App 生成 | 不需要放 GitHub Actions |
| RESEND_API_KEY | 第八步邮件发送密钥 | 不需要放 GitHub Actions |
| SESSION_SECRET | 新生成的随机值，用于登录会话 | 不放其他位置 |
| INTERNAL_HMAC_SECRET | 另生成的随机值，用于内部调用签名 | GitHub Secret UPDATE_INTERNAL_HMAC_SECRET 必须与它完全一致 |

在这台 Mac 上可用以下命令生成一个随机值并直接复制到剪贴板，不打印到终端：

~~~sh
openssl rand -hex 32 | pbcopy
~~~

执行一次，将值保存为 SESSION_SECRET。再执行一次，将新值同时保存到 INTERNAL_HMAC_SECRET 和后面的 UPDATE_INTERNAL_HMAC_SECRET。二者是不同用途，不要复用会话密钥作为内部调用密钥。内部签名的两个存储位置必须使用同一次生成的值。

也可以用交互命令逐项填写，提示输入时再粘贴值：

~~~sh
cd /Users/fish/codework/commddl/services/admin
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SESSION_SECRET
npx wrangler secret put INTERNAL_HMAC_SECRET
~~~

不要把密钥直接写在命令参数里。若使用本地环境文件辅助调试，先确认该文件已经被 Git 忽略。当前只是手动部署 Worker，不需要为了本教程再向 GitHub 提供一个 Cloudflare 全账户 API Key。

十、注册并安装机器人 GitHub App
------------------------------

等 A 交付固定权限清单后，打开 [GitHub App 创建页](https://github.com/settings/apps/new)。优先由仓库所有者创建，名称需满足 GitHub 的唯一性要求，例如 commddl-updates-加项目后缀。

Homepage URL 填实际管理地址。当前架构用独立 OAuth App 做用户登录，因此这个机器人 App 无需重复启用用户登录流程。当前代码没有 GitHub Webhook 接收器，先不要启用一个指向不存在接口的 Webhook；若 A 为真正门禁新增了 Webhook，须给出准确 URL、事件及 Secret 再配置。

基础仓库权限如下：

| 权限 | 等级 | 用途 |
|---|---|---|
| Metadata | Read-only | 仓库元信息 |
| Contents | Read and write | 创建候选数据分支和提交 |
| Pull requests | Read and write | 创建/更新 PR |
| Checks | 仅当 A 的门禁方案需要时 Read and write | 提交绑定最终版本的可信门禁检查 |

其余权限按 A 的逐项说明设置，不直接授予全部权限。安装时选择 Only select repositories，只选 turambarr/commddl。权限增加后，安装账户通常还需要批准新权限，不是改完注册页面就自动生效。[GitHub 权限说明](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)

记录 App ID（不要与 OAuth Client ID 或 Installation ID 混淆）。在应用的 Credentials / Key pairs 或 Private keys 区域生成私钥，下载 PEM 文件。私钥全文后面填入 GitHub Actions Secret，包含开头、结尾和原有换行；不放仓库、不粘贴到聊天。[GitHub App 私钥说明](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps)

十一、填写 GitHub Actions 配置
----------------------------

进入 [仓库设置](https://github.com/turambarr/commddl/settings) → Secrets and variables → Actions。若看不到设置入口或无法更改，请由仓库所有者完成相应项。

在 Secrets 中新增：

| 名称 | 填写内容 |
|---|---|
| UPDATE_GITHUB_APP_ID | 上一步 App ID |
| UPDATE_GITHUB_APP_PRIVATE_KEY | 上一步下载的完整 PEM 私钥 |
| UPDATE_INTERNAL_HMAC_SECRET | 与 Worker INTERNAL_HMAC_SECRET 完全相同的值 |

在 Variables 中新增：

| 名称 | 填写内容 |
|---|---|
| UPDATE_ADMIN_API_URL | 实际 Worker 管理地址，建议不带尾部斜杠 |
| UPDATE_AUTOMATION_ENABLED | false，先保持定时采集关闭；前提是 A 已实现该开关 |

不能把 Secret 放在 Variables 中；也不能把它填成带引号的说明文字。A 如新增了必要配置，应逐项给出保存位置与用途。[GitHub Actions Secret 设置说明](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)

十二、部署修复后的管理服务并先验证邮箱
------------------------------------

执行者确认代码、数据库迁移和配置一致后，再用项目代码更新已有的 commddl-admin Worker：

~~~sh
cd /Users/fish/codework/commddl/services/admin
npx wrangler deploy
~~~

确认部署结果的实际地址与 ADMIN_ORIGIN、OAuth callback 相同。若域名或 Worker 名称发生变化，需要一起更新所有引用，而不是只改前端入口。

打开管理地址，检查这些结果：使用正确 GitHub 身份能登录；邮箱列表初始为空；添加你选定的收件邮箱后收到验证邮件；确认验证后变为已启用；“发送测试邮件”实际到达邮箱。1319630151@qq.com 可以由你在此步骤自行添加，也可以换成其他地址。

验证后可关闭浏览器再重新登录，确认邮箱记录仍存在。若只在浏览器内看起来保存成功、D1 没有记录，不算完成。主站管理入口由执行者将实际地址写入 data/meta.yml 的 adminPortalUrl；不填写猜测 URL。

十三、配置仓库发布保护并准备手动试跑
------------------------------------

先让修复后的系统代码形成独立 PR，由有权限的人审阅合入 main；不要把系统代码和首批官网数据变更混在一个难以核查的提交里。合入前确认定时开关为 false，发布开关也为 false。

仓库所有者在 Settings 的 Rules / Rulesets 或 Branches 里保护 main：要求 PR、要求指定维护者批准、要求必要检查通过、新提交使旧批准失效，机器人没有绕过权。github-pages 环境的部署分支限制为 main。[分支保护说明](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)、[Pages 环境说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

required checks 要选择 A 修复后实际运行过的检查名称和可信来源，不能只照旧教程把一个名称叫 review-gate、实际只跑测试的工作流当作审批门禁。GitHub 要求所选检查近期在该仓库运行成功；首个受控测试 PR 运行后再选择准确名称。配置完成前，PUBLISH_ENABLED 保持 false。[检查故障说明](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)

先手动触发 Collect official CommDDL updates：分支 main，ids 只填写 A/B 选定的一个真实官方来源 ID，dry_run=true，retry_failed=false。第一次只验证抓取输出，不创建待审批次，也不发送更新邮件。

如果 dry-run 成功且输出能与官网对上，再在 B 中创建真实候选批次进行审阅联调。首次不选择全目录；在本机抓不到而 Actions 可以抓到时，以部署环境采集器的实际结果验收，不用 Agent 手工整理页面作为替代。

十四、此时给执行者提示词 B
-------------------------

你向执行者报告下列非敏感信息即可。未完成项写“未完成”，不要填入 Secret 的真实值：

| 信息 | 你填写 |
|---|---|
| 管理服务 URL | 实际 HTTPS 地址 |
| D1 名称与 UUID | 实际值，UUID 是资源标识而非密码 |
| 仓库 | turambarr/commddl，或经确认后的目标 |
| OAuth App | 已创建/未创建；回调已核对/未核对 |
| GitHub App | 已安装/未安装；App ID；安装目标仓库 |
| Worker Secrets | 名称列表及“已填/未填”，不提供值 |
| GitHub Secrets/Variables | 名称列表及“已填/未填”，不提供 Secret 值 |
| 发信域名与 MAIL_FROM | 实际发信域名与地址；验证状态 |
| 邮箱测试 | 是否真实收到；无须提供邮箱登录密码 |
| 仓库保护 | 已配置项及仍需所有者协助的项 |

B 可以继续完成部署、只读检查配置是否就绪、生成测试所需分支和 PR，以及向你已验证的邮箱发送必要联调邮件。正式数据合并仍由你在页面审阅后明确批准；无人值守定时开关不在 B 自动开启。

十五、真实验收顺序
------------------

| 顺序 | 谁操作 | 通过标准 |
|---|---|---|
| 1 | 程序 | 一个真实官网由部署采集器读取，输出来源、正文与必要日期证据 |
| 2 | 程序 | 与正式源和已存快照比较，产生真实新增/变化；官网无变化也应正确报告无变化 |
| 3 | 邮件服务 | 将批次提醒送到你已验证的邮箱，并在后台保留回执 |
| 4 | 你在网页 | 查看旧值/新值，接受、纠正或拒绝；选择实际能保存 |
| 5 | 程序 | 按所选决策生成准确 YAML 和数据 PR，测试与检查通过 |
| 6 | 你在网页 | 查看最终差异后明确批准；保护规则和门禁限制的是这个最终版本 |
| 7 | 程序 | 仅合并已批准版本，构建并更新网页；日期变化时同步更新日历且 UID 稳定 |
| 8 | 程序 | 再运行一次，无变化不重复提交/发信；全拒绝、失败、重试和过期批次不会锁死来源 |

不能为演示而把真实截止日期改成错误值。若官网当前没有日期变化，日期修改链路用冻结的测试夹具验证，真实闭环可以采用有证据的缺失官网分段补齐；报告分别写清“真实来源采集验证”和“日期变更场景测试”。

PUBLISH_ENABLED 在正式合并试验前由你明确启用，前提是维护者身份、通知与检查已核对；首次由你主动操作批准。B 可以在此处把准确的待发布差异交给你审阅，而不能根据“资源已配好”自动代替你批准。

十六、全部通过后再给提示词 C
---------------------------

C 的授权范围是开启已经验收的来源和约定频率，不意味着之后每次候选都可以跳过管理员审阅。

预期定时调度为北京时间 01:17、07:17、13:17、19:17；对应 UTC 表达式 17 5,11,17,23 * * *。每次只处理到期来源，首期保留单来源或小名单。GitHub 调度可能延迟，因此验收关注是否实际触发、处理与留痕，而非把它当作精确报时服务。[GitHub schedule 说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

停用办法也要确认：关闭 UPDATE_AUTOMATION_ENABLED 停止后续定时采集；关闭 PUBLISH_ENABLED 停止新的合并发布；二者不应撤销已经在线的上一个合格版本。停用按钮/变量必须在 A/B 中实测，不以文档存在为准。

十七、常见卡点与处理位置
------------------------

| 现象 | 优先检查 |
|---|---|
| GitHub 登录后 403 | 登录账号对目标仓库的实际角色；当前后台默认要求 admin；组织应用限制 |
| OAuth callback 错误或登录循环 | ADMIN_ORIGIN、Homepage、callback 完整一致；HTTPS；浏览器会话与令牌到期处理 |
| 数据库表不存在 | 是否迁移了远程数据库、是否绑定 DB、database_id 是否仍为占位 |
| 邮件服务显示未配置 | Worker Secret 是否填在正确服务；MAIL_FROM 是否存在 |
| Resend 拒绝发送 | 发信域名是否 Verified、密钥是否有该域名发送权、MAIL_FROM 是否属于它 |
| 内部请求 401 | 两端 HMAC 值是否相同、变量名是否正确、签名/时间戳实现；不要靠关闭认证解决 |
| 保存审阅后不生成 PR | UI/API 测试是否真通过、workflow 是否已在 main、App 安装权限、dispatch 失败状态是否可重试 |
| 批次提示基线变化 | 程序应安全重算或生成待重审的新版本，不让你手改 SHA 来绕过 |
| 所有项目都拒绝后以后不更新 | 批次结束/来源解锁逻辑，这是代码问题，不是缺少云资源 |
| 检查全绿却批准按钮一直失败 | 检查与审批之间是否互相等待、是否查询了错误版本、保护规则是否尚未满足 |
| Actions 抓取失败但网页可打开 | DNS、TLS、访问限制、静态/动态差异；保留失败记录并在受支持来源先验收 |

十八、可复制的三段提示词
-----------------------

**提示词 A：现在输入到 commddl-执行**

> 请先阅读 docs/BACKEND-SETUP-AND-HANDOFF-2026-10-20.md、原执行计划和现有代码，接续未提交改动。此轮先修复和验证本地实现，不部署、不推送 main、不发送真实邮件，也不开启定时任务。
>
> 优先修复：审阅页面选择状态写在卡片却从按钮读取，导致保存 decisions 为空；为接受、纠正、拒绝、全部拒绝补真正经过 UI/API 的测试。补齐一个既有 call 的日期候选→nodes/revision/history/updatedAt→ICS 稳定 UID 链路。把 review-gate 落实成绑定通知、管理员身份和最终 SHA 的可信合并门禁，避免审批按钮与 required check 相互等待，不能向不可信 PR 代码暴露密钥。
>
> 同时核查并修复全拒绝后来源解锁、旧基线批次重算/重试、失败任务恢复、手动指定 ID 读取 baselines 的数据形状。加入默认关闭的 UPDATE_AUTOMATION_ENABLED 与 PUBLISH_ENABLED，并验证关闭时的实际行为。先聚焦一个真实来源，不扩展所有动态站点或 PDF。
>
> 完成检查、测试和构建，生成 docs/UPDATES-SETUP-CHECKLIST.md，逐项固定服务资源、环境变量保存位置、回调地址、GitHub 应用权限、真实检查名称和部署命令；说明本地已验证与外部待验证的边界。不要索要或打印密钥，缺外部配置不妨碍完成上述本地工作。

**提示词 B：A 完成且资源配置就绪后输入**

> 本地修复已完成，接下来按后端接入教程进行真实部署和单来源联调。我会在下面提供管理服务 URL、D1 标识、应用安装与配置状态；密钥已直接填在平台，请只检查名称、存在性和调用结果，不读取或打印它们的值。
>
> 请先核对实际资源与配置清单，部署修复后的 Worker/迁移并验证登录、邮箱持久化、验证邮件和测试邮件。允许向我在管理页已验证的邮箱发送本轮必要联调通知，允许创建和推送测试所需的代码分支及候选 PR。需要进入 main 的系统代码先提供独立、可审阅的 PR；不能直接推送 main 或替我批准数据。
>
> 选择一个部署环境可实际读取的官方来源，先 dry-run，再跑候选、邮件、网页取舍、自动生成数据 PR、最终版本检查。正式数据合并等我在网页查看差异后明确批准；定时开关保持关闭。真实无变化时如实报告，不制造错误日期，也不用 Agent 手工整理页面来冒充采集器成功。
>
> 验证全拒绝、邮件失败重试、基线变化、审批后新提交失效、无变化不重复通知和部署分支限制。结果附真实运行/PR/来源链接，单独标明尚未通过的环节。我的非敏感配置状态如下：【按教程第十四节填写】。

**提示词 C：你确认真实验收通过后输入**

> 我已确认后台登录和邮箱功能、单来源真实采集、网页审阅、最终版本批准、自动提交与发布、日历一致性，以及无变化/拒绝/失败重试验证均通过。请按已核验的配置清单开启定时采集，首期仅覆盖已验收来源名单，保持管理员审阅后才允许发布。
>
> 采用北京时间 01:17、07:17、13:17、19:17 的调度；只处理到期来源，不扩大到尚未适配的全目录。核验一次部署环境独立触发与持久状态，给出运行记录、当前来源名单、下次计划时间及关闭采集/关闭发布的方法。无需保持 Codex 会话或本地电脑开启，也不要创建依赖聊天会话唤醒的替代定时任务。
