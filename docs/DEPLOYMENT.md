# CommDDL 当前部署

核对日期：2026-10-19。

网站：[https://turambarr.github.io/commddl/](https://turambarr.github.io/commddl/)。公开代码仓库：[turambarr/commddl](https://github.com/turambarr/commddl)。

## 发布方式

当前使用 GitHub Pages（静态网页托管），Pages设置的构建类型为workflow（自动化流程），公开访问、强制HTTPS（加密网页访问），未配置独立域名。

1. 维护者修改目录或页面，提交并推送到main（主分支）。
2. GitHub Actions（自动化工作流）运行`.github/workflows/pages.yml`，使用Node.js 22（JavaScript构建运行环境）。
3. 自动运行现有业务测试，再执行数据校验与构建。准确测试数量以当次日志为准。
4. 将`dist/`（生成的静态网站目录）上传并发布至GitHub Pages，成功后更新公开网页。失败时不发布这次构建。

提出合并请求也会执行检查，但不会发布。仓库管理者还可以手动触发工作流。

## 数据和页面在哪里

- `data/catalog.json`：期刊、会议、截止时间、分类、索引和评级证据的维护源。
- `assets/app.js`、`assets/core.js`、`assets/styles.css`、`index.html`：浏览器交互、筛选与日历逻辑、页面样式。
- `assets/data.js`、`calendars/`、`dist/`：构建生成的网页数据、可订阅日历和发布目录。
- `release/CommDDL.html`：构建生成的可离线查目录的单文件网页，不是额外的服务器。

目录数据随每次发布一起提供，页面不会在访问时自动查询出版社数据库。日历订阅接收已发布数据的变化，具体刷新频率由用户的日历客户端决定。

## 是否需要一直开电脑

不需要。本机只用于编辑和预览；公开网站由GitHub托管。当前没有自购云服务器、独立后端、服务端账号系统或数据库。收藏保存在用户浏览器，换设备需要导入备份。

## 日常费用

当前采用公开仓库的免费Pages托管，没有购买域名或服务器的固定费用；实际用量仍受GitHub平台限额约束。后续如果加入账号同步、自动通知或收费服务，再单独配置相应服务，并检查平台的商业使用限制。

官方说明：[GitHub Pages介绍](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。实际工作流见[仓库配置](https://github.com/turambarr/commddl/blob/main/.github/workflows/pages.yml)。
