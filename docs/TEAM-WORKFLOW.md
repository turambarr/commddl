# CommDDL 团队协作说明

每名开发者使用自己的 GitHub 账号和 Agent（智能体）。任务分支汇集修改，Pull Request（合并请求，简称 PR）完成检查与审核，`main`（主分支）保存正式版本。Agent 执行规则见根目录 [AGENTS.md](../AGENTS.md)。

## 从领取任务到上线

1. 在 Issue（任务条目）中认领范围，写明负责人、主要目录和验收标准；较小修订可直接写在草稿 PR 中。
2. 阅读规范，检查本地状态，获取最新主分支，为任务建立独立分支。
3. 完成修改并做相应验证。尽早推送草稿 PR，让其他成员知道哪些文件正在修改。
4. 开发者检查最终差异后，将 PR 标为可审核，指定另一位有写权限的协作者审核。
5. 自动检查通过、讨论处理完毕、人工批准后，由维护者合并。
6. 合并触发 GitHub Actions（自动化工作流），生成静态网页并发布到 [CommDDL 正式网站](https://turambarr.github.io/commddl/)。在仓库 [Actions 页面](https://github.com/turambarr/commddl/actions)核对结果。

创建 PR 不会更新正式网站。Agent 默认完成到 PR 阶段；合并及手动发布需另有明确授权。已经获准的自动化采集可创建候选或 PR，最终合并仍遵循团队审核。

## 每个人怎么开始

有仓库写权限的协作者可以直接在本仓库建立任务分支；外部贡献者先 Fork（派生仓库），再向本仓库提交 PR。使用各自的账号，不共享仓库所有者的令牌或生产凭据。

分支名称示例：`feature/deadline-reminder`、`fix/timezone-boundary`、`refactor/filter-logic`、`docs/contribution-guide`。这些是新分支的命名约定，旧分支和自动化分支无需改名。

在自己的干净工作目录中，可按以下方式开始新任务。`feature/example-task` 仅为示例，请换成具体任务名：

```sh
git status --short
git fetch origin
git switch -c feature/example-task origin/main
```

如果有未提交修改，先确认归属。多人或多个 Agent 共用一台机器时，每个任务使用独立工作目录或 Git worktree（独立工作树）；**仅有不同分支还不能隔离同一目录中的未提交文件**。

依赖变化或新克隆后执行 `npm ci`（按锁文件安装依赖），代码与数据任务执行校验、测试和构建。只改说明文字时检查路径、链接和差异，在 PR 中如实记录验证范围。

```sh
npm run check
npm test
npm run build
git diff --check
```

新增或修订期刊、会议和截止日期时，优先只修改对应 YAML 文件。共享分类、接口、依赖、工作流和后台服务应在任务中明确协调负责人。

## GitHub 应执行哪些保护

`AGENTS.md` 提供 Agent 的默认行为约定；以下要求需要仓库管理员在 GitHub 上实际设置。**文件写有规则不等于平台已经启用规则。**

在仓库 **Settings → Branches（设置 → 分支）** 为 `main` 设置保护，或使用 **Settings → Rules → Rulesets（设置 → 规则 → 规则集）**建立等效规则；选择一种方式维护，避免重复配置。

| 设置 | 建议 |
|---|---|
| Require a pull request before merging（合并前必须提交 PR） | 开启 |
| Required approving reviews（所需批准数） | 已有协作者时设为 1；作者不能批准自己的 PR |
| Dismiss stale approvals（新修改使旧审批失效） | 开启，修改后重新审核 |
| Require status checks（必须通过检查） | 要求下表两项检查通过 |
| Require branches to be up to date（分支必须与主分支保持最新） | 开启；其他 PR 合并后，同步更新再检查 |
| Require conversation resolution（讨论必须处理完毕） | 开启 |
| Do not allow bypassing（不允许绕过） | 包括管理员；不要给 Agent 或发布应用设置绕过权限 |
| Allow force pushes / deletions（允许强推／删除） | 均关闭 |

实际检查名称以 PR 的 Checks（检查）页面为准。当前源码中两项校验工作如下，不要把只在合并后运行的 `deploy`（部署）设为合并前必需检查：

| 工作流 | 检查名称 |
|---|---|
| Validate and deploy CommDDL（校验并部署 CommDDL） | `build` |
| CommDDL review gate（CommDDL 审核检查） | `catalog, tests, and generated site` |

如果暂时只有一名有写权限的维护者，可先要求 PR 和检查通过，加入第二人后再设一人审批。已有多人协作时，优先开启一人审批，成员互相审核。

再确认以下设置：

- **Settings → Pages（设置 → 网页托管）**：使用 GitHub Actions 发布。
- **Settings → Environments → github-pages（设置 → 环境 → 网页发布环境）**：只允许 `main` 发布，不允许任务分支或 PR 直接发布正式页面。
- **Settings → Collaborators（设置 → 协作者）**：普通开发者使用写权限，管理员权限按实际职责授予。
- Actions 中的访问令牌、邮件及后台服务凭据由维护者配置；需要使用时提供测试环境或最小权限凭据，不在文档中填写真实值。

GitHub 官方说明：[分支保护](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)。未来需要按目录自动分配审核任务时，可以通过 PR 引入 `CODEOWNERS`（代码负责人清单）；当前不要求指定代码负责人的专属批准。

## 当前审核方式

2026-10-20 按维护者最新选择，`main` 要求任意一名具有 write（写入）、maintain（维护）或 admin（管理）权限的协作者批准，不要求由仓库所有者或指定代码负责人单独批准。两项检查均限定由 GitHub Actions 提供，要求分支与主分支保持最新；新修改使旧审批失效，审核讨论需处理完毕，禁止强推和删除，管理员同样受约束。该段是当日设置记录，后续以仓库实际保护规则为准。

这里的协作者按仓库权限判断；GitHub Contributors（贡献者列表）中的提交记录本身不授予写入或有效审批权限。普通外部贡献者仍可评论或提交审核意见，但不替代要求的一人批准。新增可信成员由管理员授予合适权限，不共享账号或令牌。

PR 的作者不能批准自己的 PR；包括仓库所有者和 Agent 使用的登录账号。作者提交后，由另一位有写权限的协作者选择 Approve（批准），再由有权限的维护者合并。Agent 默认不代替人工批准或合并。临时准备的所有者审核例外已撤销，不保留管理员单独绕过审批的规则。

## 给 Agent 的任务开场

> 请先阅读仓库根目录 AGENTS.md 和相关模块文档，检查分支与工作区状态。确认本任务范围，从最新主分支创建独立任务分支；保留其他任务的修改，完成验证后提交 PR 给人工审核。不要自行合并或触发正式部署。

如果当前工具不会自动识别 `AGENTS.md`，由开发者把这段要求放入工具的项目指引，并明确要求读取仓库文件，不假定不同工具都自动加载。

## 日常验收

首次启用保护后，打开一个普通文档 PR：确认所需检查出现，未获批准时不能合并，取得另一人批准后由维护者合并，再核对网站发布。不要通过向 `main` 推送试验提交来验证保护，也不要为了测试绕过规则。

发生问题时由维护者准备修复或 revert（回退变更）PR，沿用检查和审核流程；未明确授权的 Agent 不直接修改线上服务或强制重写历史。
