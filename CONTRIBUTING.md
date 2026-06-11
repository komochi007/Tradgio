# 贡献流程

## 开发前

1. 阅读 `ai/AGENT.md`、`ai/CONTEXT.md` 和当前任务对应的规格文档。
2. 确认任务模块、技术分层和跨模块约束。
3. 安装依赖：`npm ci`。

## 开发中

- 保持现有目录、命名和代码风格。
- 不绕过 Inventory Engine、Export Service 或账号隔离 Repository。
- 修改超过 3 个文件时先拆分实施步骤。
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

## CI

GitHub Actions 会在推送到 `main` 和针对 `main` 的拉取请求上执行 `npm ci` 与 `npm run quality`。工作流失败时，拉取请求或发布不得继续。
