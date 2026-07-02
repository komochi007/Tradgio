# 上线后发布检查清单

本文档用于每次正式发布前后检查。上线前完整生产就绪门槛保留在 `tasks/production-readiness-checklist.md`；本文件用于日常补丁和后续小版本。

发布策略见 `docs/release-management.md`。发布历史见 `tasks/release-log.md`。

## 1. 使用规则

- 每次发布前复制“发布检查模板”，填入目标版本并逐项确认。
- 不适用项必须写明原因，不能留空。
- 高风险发布必须先完成加密备份和回滚点评估。
- 发布完成后，把结果同步到 `tasks/release-log.md`。

## 2. 风险分级门禁

| 风险 | 适用变更 | 最低验证 |
|---|---|---|
| 低 | 文案、样式、文档、无业务行为变化 | Markdown 检查或 `npm run quality` |
| 中 | 表单、列表、路由、核心交互、搜索、导出入口 | `npm run quality`，必要时手动浏览器验证 |
| 高 | 库存、账号隔离、IndexedDB、附件、备份恢复、schema、导出模板、Service Worker | `npm run quality` + `npm run test:e2e`，涉及 PWA 时加 `npm run test:pwa` |

## 3. 发布前检查模板

### 版本：X.Y.Z

基础信息：

- 目标版本：
- 目标发布日期：
- 发布类型：补丁版 / 小版本 / 热修 / 回滚 / 兼容修复版
- 风险等级：低 / 中 / 高
- 目标提交号：
- 回滚提交号：
- 是否涉及 schema：是 / 否
- 当前 IndexedDB schema：
- 目标 IndexedDB schema：
- 是否需要发布前备份：是 / 否

范围确认：

- [ ] 本次发布事项已登记在 `tasks/post-launch-backlog.md`。
- [ ] 每个事项都有问题或目标、影响用户、所属模块、优先级、风险等级、验收标准和验证命令。
- [ ] 修改超过 3 个文件的事项已拆分实施步骤。
- [ ] 本次没有夹带未登记的功能或重构。
- [ ] 文档已同步更新，且没有把规划写成已完成。

数据与备份：

- [ ] 不涉及 IndexedDB schema、迁移、备份恢复或账号隔离。
- [ ] 如涉及高风险数据变更，已导出完整加密 `.tradgio-backup`。
- [ ] 如需要备份，已确认至少两处副本。
- [ ] 如涉及 schema 升级，已记录迁移方案、升级验证和回滚限制。
- [ ] 如低版本无法兼容新 schema，已改用兼容修复版策略。

验证：

- [ ] 已执行约定的验证命令。
- [ ] `npm run quality` 结果：
- [ ] `npm run test:e2e` 结果：
- [ ] `npm run test:pwa` 结果：
- [ ] 手动浏览器验证结果：
- [ ] 未验证项及原因：

发布：

- [ ] `main` 分支质量检查通过。
- [ ] 已手动触发 `Deploy PWA` 工作流。
- [ ] GitHub Pages 部署成功。
- [ ] 正式地址为 `https://komochi007.github.io/Tradgio/`。
- [ ] 发布提交号已记录。

发布后最小验证：

- [ ] 正式地址可打开。
- [ ] 可登录。
- [ ] 核心数据可见。
- [ ] 数据备份页可打开。
- [ ] 刷新后仍正常。
- [ ] 如涉及核心流程，已验证对应流程。
- [ ] 如涉及导出，已验证对应导出。
- [ ] 如涉及 PWA 更新，已验证安全更新提示和刷新后版本。

发布结论：

- 结论：通过 / 暂缓 / 回滚 / 发布兼容修复版
- 记录人：
- 完成时间：
- 对应 release log 条目：

## 4. 0.1.1 发布检查

本节记录 `0.1.1` 补丁发布检查结果。

基础信息：

- 目标版本：`0.1.1`
- 目标发布日期：2026-07-02
- 发布类型：补丁版
- 风险等级：中
- 目标提交号：`9b377ed4fbaea82020029b2594b7a73eca66a43e`
- 回滚提交号：`877cef4702eaf9617675ced17b019c8aebfbbcf4`
- 是否涉及 schema：否
- 当前 IndexedDB schema：`1`
- 目标 IndexedDB schema：`1`
- 是否需要发布前备份：否

范围确认：

- [x] `PL-001` 上线后版本与迭代管理文档已登记。
- [x] `PL-002` 出货单订单号与模板 Excel 导出修复已登记。
- [x] 新增 `docs/release-management.md`。
- [x] 新增 `tasks/post-launch-backlog.md`。
- [x] 新增 `tasks/release-checklist.md`。
- [x] 新增 `tasks/release-log.md`。
- [x] 新增根目录 `AGENTS.md`。
- [x] 更新 `README.md`、`CONTRIBUTING.md`、`ai/AGENT.md` 和 `ai/CONTEXT.md` 的上线后迭代入口。
- [x] 出货单新增手动订单号，且与系统单据编号分开展示和导出。
- [x] 出货单模板 Excel 修复动态明细行后的合并单元格重复、表格换行和空字段列保留问题。
- [x] 文档之间互相引用准确。

验证：

- [x] Markdown 内容检查通过。
- [x] `npm run test -- src/modules/export-service/exportAdapter.test.ts src/modules/document-core/documentTransaction.test.ts` 结果：通过，2 个测试文件、26 个用例通过。
- [x] `npm run quality` 结果：通过，lint、format check、typecheck、105 个单元测试、生产构建和 audit 均通过。
- [x] `npm run test:e2e` 结果：通过，5 个 E2E 用例通过。
- [x] `npm run test:pwa` 结果：通过，1 个 PWA 发布/更新/回滚用例通过。
- [x] 未验证项及原因：无。

发布：

- [x] `main` 分支质量检查通过：PR #12 的 `quality` 和 `e2e` 检查通过。
- [x] 已手动触发 `Deploy PWA` 工作流：run `28594359547`。
- [x] GitHub Pages 部署成功。
- [x] 正式地址为 `https://komochi007.github.io/Tradgio/`。
- [x] 发布提交号已记录：`9b377ed4fbaea82020029b2594b7a73eca66a43e`。

发布后最小验证：

- [x] 正式地址可打开：HTTP 200。
- [x] 可登录：线上冒烟账号注册并登录通过。
- [x] 核心数据可见：登录态与核心页面加载正常。
- [x] 数据备份页可打开。
- [x] 刷新后仍正常。
- [x] 如涉及核心流程，已验证对应流程：出货流程由自动化用例覆盖。
- [x] 如涉及导出，已验证对应导出：导出服务单元测试覆盖订单号、合并区域、单行文本与空列隐藏。
- [x] 如涉及 PWA 更新，已验证安全更新提示和刷新后版本：`npm run test:pwa` 通过；线上 `sw.js` 指向发布提交号。

发布结论：

- 结论：通过
- 记录人：Codex
- 完成时间：2026-07-02 21:41（Asia/Shanghai）
- 对应 release log 条目：`0.1.1：上线后管理与出货导出修复补丁`
