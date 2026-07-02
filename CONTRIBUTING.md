# 贡献流程

## 开发前

1. 阅读 `ai/AGENT.md`、`ai/CONTEXT.md` 和当前任务对应的规格文档。
2. 上线后新增需求、Bug、优化和运维事项先查或登记 `tasks/post-launch-backlog.md`。
3. 确认任务模块、技术分层、跨模块约束和风险等级。
4. 安装依赖：`npm ci`。

## 开发中

- 保持现有目录、命名和代码风格。
- 不绕过 Inventory Engine、Export Service 或账号隔离 Repository。
- 修改超过 3 个文件时先拆分实施步骤。
- 涉及 IndexedDB schema、备份恢复、账号隔离、库存、导出模板或 PWA 更新时，按 `docs/release-management.md` 的高风险发布规则处理。
- 使用 `npm run format` 格式化 TypeScript、TSX、CSS 和工程配置。

## 提交前

执行与 CI 相同的完整质量门禁：

```bash
npm run quality
```

该命令依次执行：

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run audit`

任一命令失败时不得合并。新增或升级依赖后，应同步更新 `docs/dependency-audit.md` 中的风险记录。

涉及核心用户流程、路由、表单或导出行为时，还应执行：

```bash
npm run test:e2e
```

涉及 PWA、发布、缓存、更新或回滚时，还应执行：

```bash
npm run test:pwa
```

发布前应按 `tasks/release-checklist.md` 填写对应版本检查；发布后将提交号、验证结果、备份要求、schema 情况和发布后最小验证结果记录到 `tasks/release-log.md`。

## CI

GitHub Actions 会在推送到 `main` 和针对 `main` 的拉取请求上执行 `npm run quality`，通过后继续执行 `npm run test:e2e`。E2E 失败证据会作为 Playwright artifact 上传，任一工作流失败时不得合并或发布。

## 上线后版本管理

- 当前正式版基线为 `0.1.0`。
- `0.1.x` 用于 Bug 修复、小体验优化和无数据结构变化的补丁。
- `0.2.0+` 用于用户可感知的新功能组合。
- 生产化路线图 `tasks/production-roadmap.md` 作为上线前历史依据保留，日常迭代不再追加到该文件。
- 上线后管理入口为 `docs/release-management.md`、`tasks/post-launch-backlog.md`、`tasks/release-checklist.md` 和 `tasks/release-log.md`。
