# CommDDL 当前部署

核对日期：2026-10-20，v0.9.0。

网站：[https://turambarr.github.io/commddl/](https://turambarr.github.io/commddl/)。公开代码仓库：[turambarr/commddl](https://github.com/turambarr/commddl)。

## 发布方式

当前使用 GitHub Pages（静态网页托管），Pages设置的构建类型为workflow（自动化流程），公开访问、强制HTTPS（加密网页访问），使用github.io域名。

1. 贡献者修改对应 YAML，提交合并请求；维护者审核后合并至 main（主分支）。
2. GitHub Actions（自动化工作流）运行`.github/workflows/pages.yml`，使用Node.js 22（JavaScript构建运行环境）。
3. 使用 `npm ci` 安装锁定依赖，检查 YAML、运行业务测试，再编译合并目录并生成网页；结果保存在当次工作流日志。
4. 将`dist/`（生成的静态网站目录）上传并发布至GitHub Pages，通过后更新公开网页，检查失败时保留此前已发布版本。

合并请求执行检查，main（主分支）及手动触发的工作流执行发布。

## 数据和页面在哪里

- `data/venues/<primaryArea>/<id>.yml`、`data/calls/<year>/<id>.yml`：独立的期刊、会议和征稿源文件。
- `data/README.md`、`data/AGENTS.md`：数据维护和 Agent 指引。
- `data/catalog.json`：构建生成的完整目录，排除出 Git 版本跟踪。
- `maintenance/`：核对队列与文件映射，不复制到发布目录。
- `dist/data/catalog.json`：构建生成的公开目录，只含读者所需字段与明确属性。
- `assets/app.js`、`assets/core.js`、`assets/styles.css`、`index.html`：浏览器交互、筛选与日历逻辑、页面样式。
- `assets/data.js`、`calendars/`、`dist/`：构建生成的网页数据、可订阅日历和发布目录。
- `release/CommDDL.html`：构建生成的可离线查目录的单文件网页。

目录数据随发布更新。维护者核对来源、提交数据后，工作流更新网页。日历订阅接收已发布数据的变化，具体刷新频率由用户的日历客户端决定。

## 是否需要一直开电脑

公开网站由GitHub托管，本机用于编辑和预览，关闭电脑后仍可访问。当前采用纯静态页面，收藏保存在用户浏览器，换设备需要导入备份。

## 日常费用

当前采用公开仓库的免费Pages托管，没有购买域名或服务器的固定费用；实际用量仍受GitHub平台限额约束。后续如果加入账号同步、自动通知或收费服务，再单独配置相应服务，并检查平台的商业使用限制。

官方说明：[GitHub Pages介绍](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。实际工作流见[仓库配置](https://github.com/turambarr/commddl/blob/main/.github/workflows/pages.yml)。

维护区是仓库内的编辑记录，并非独立服务器后台。当前公开仓库中的维护文件可供贡献者查看；GitHub Pages只部署`dist/`，不会把维护疑点嵌入网页数据或离线HTML。

生成的 `assets/data.js`、`calendars/*.ics`、`maintenance/review-queue.json` 同样排除出版本跟踪，避免独立数据提交碰到共享生成文件。新克隆后先运行 `npm ci` 和 `npm run build`，再预览根目录网页。网页和在线订阅地址保持不变。
