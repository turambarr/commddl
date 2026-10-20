# 向 CommDDL 提交修改

数据通过 GitHub 的 Pull Request（合并请求，简称 PR）提交，维护者审核、合并后自动发布。

开发者和 Agent（智能体）先阅读根目录 [AGENTS.md](AGENTS.md)；多人分工、任务分支、人工审核和 GitHub 分支保护设置见 [团队协作说明](docs/TEAM-WORKFLOW.md)。每个任务使用独立分支；共享一台机器时使用独立工作目录，保留其他任务的修改。

代码、文档和数据修改均通过 PR 提交。Agent 默认完成到等待审核阶段，创建 PR 的授权不包含合并或手动发布授权。

## 改一条截止日期

1. 在 [`data/calls/`](data/calls/) 找到对应年份和届次；例如 [`icc-2027-main.yml`](data/calls/2027/icc-2027-main.yml)。
2. 核对当届官方征稿，点击 GitHub 文件页的铅笔编辑按钮。
3. 更新日期、原文和核对时间；延期时增加节点修订序号，保留原日期历史。
4. 选择新分支，发起 PR，写明修改内容与官方依据。
5. 自动流程检查格式、引用、日期和业务规则；维护者审核后合并发布。

网页没有在线编辑器，网站条目中的“GitHub 提交修改”会打开对应源文件。

## 让 Agent 协助补录

先让 Agent 阅读 [`data/README.md`](data/README.md)。那里列出了目录、字段、身份核对、改期、模板和检查要求。

新增载体放在 `data/venues/<主方向>/<编号>.yml`；具体届次或专题放在 `data/calls/<年份>/<编号>.yml`。无需修改公共条目清单，也无需提交编译后的 JSON 或日历。

```sh
npm ci
npm run check
npm test
npm run build
```

本地工具自动合并生成目录，GitHub 会运行同样的检查。不同条目各自提交文件；共享分类和评级体系调整请在 PR 中说明。

还没有完整修改方案时，可以通过[数据问题入口](https://github.com/turambarr/commddl/issues/new?template=data.yml)提供官方来源与更正线索。
