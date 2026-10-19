# CommDDL 当前部署

核对日期：2026-10-19。

网站：[https://turambarr.github.io/commddl/](https://turambarr.github.io/commddl/)。公开代码仓库：[turambarr/commddl](https://github.com/turambarr/commddl)。

## 发布方式

当前使用 GitHub Pages（静态网页托管），Pages设置的构建类型为workflow（自动化流程），公开访问、强制HTTPS（加密网页访问），使用github.io域名。

1. 维护者修改目录或页面，提交并推送到main（主分支）。
2. GitHub Actions（自动化工作流）运行`.github/workflows/pages.yml`，使用Node.js 22（JavaScript构建运行环境）。
3. 自动运行现有业务测试，再执行数据校验与构建；结果保存在当次工作流日志。
4. 将`dist/`（生成的静态网站目录）上传并发布至GitHub Pages，通过后更新公开网页，检查失败时保留此前已发布版本。

合并请求执行检查，main（主分支）及手动触发的工作流执行发布。

## 数据和页面在哪里

- `data/catalog.json`：期刊、会议、截止时间、分类、索引和评级证据的维护源。
- `assets/app.js`、`assets/core.js`、`assets/styles.css`、`index.html`：浏览器交互、筛选与日历逻辑、页面样式。
- `assets/data.js`、`calendars/`、`dist/`：构建生成的网页数据、可订阅日历和发布目录。
- `release/CommDDL.html`：构建生成的可离线查目录的单文件网页。

目录数据随发布更新。维护者核对来源、提交数据后，工作流更新网页。日历订阅接收已发布数据的变化，具体刷新频率由用户的日历客户端决定。

## 是否需要一直开电脑

公开网站由GitHub托管，本机用于编辑和预览，关闭电脑后仍可访问。当前采用纯静态页面，收藏保存在用户浏览器，换设备需要导入备份。

## 日常费用

当前采用公开仓库的免费Pages托管，没有购买域名或服务器的固定费用；实际用量仍受GitHub平台限额约束。后续如果加入账号同步、自动通知或收费服务，再单独配置相应服务，并检查平台的商业使用限制。

官方说明：[GitHub Pages介绍](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。实际工作流见[仓库配置](https://github.com/turambarr/commddl/blob/main/.github/workflows/pages.yml)。
