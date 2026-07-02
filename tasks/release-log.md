# 上线后发布记录

本文档记录 Tradgio 正式上线后的版本发布历史。上线前生产化验收记录保留在 `tasks/task-46-acceptance-report.md` 和 `tasks/production-readiness-checklist.md`。

发布策略见 `docs/release-management.md`。发布检查见 `tasks/release-checklist.md`。

## 1. 记录规则

每次正式发布必须记录：

- 版本号
- 发布日期
- 发布提交号
- 变更摘要
- 验证命令
- 是否需要备份
- 是否涉及 schema
- 回滚点
- 发布后最小验证结果

涉及高风险变更时，还必须记录备份文件、备份副本确认、schema 迁移验证和回滚限制。

## 2. 当前正式基线

### 0.1.0：首个正式上线版本

- 发布状态：已发布
- 正式地址：`https://komochi007.github.io/Tradgio/`
- 上线窗口：2026-06-17 10:00（Asia/Shanghai）
- 发布提交号：`877cef4702eaf9617675ced17b019c8aebfbbcf4`
- IndexedDB schema：`1`
- 发布方式：手动触发 `Deploy PWA`
- 发布前基线：任务 46 已完成正式发布验收，结论为允许上线
- 回滚版本：见 `tasks/production-readiness-checklist.md` Gate 7 记录

变更摘要：

- 完成本地优先 PWA 首版上线。
- IndexedDB、本地多账号、合同附件 Blob、离线导出、加密备份恢复、PWA 更新和 GitHub Pages 发布流程均完成验收。

验证记录：

- `npm run quality` 通过。
- `npm run test:e2e` 通过。
- `npm run test:pwa` 通过。
- Windows Chrome/Edge 全新配置恢复和关键业务核对通过。
- 发布后最小验证通过：页面可打开、可登录、货品列表可见数据、数据备份页可打开、刷新后仍正常。

备份与回滚：

- 发布前已记录加密备份文件、SHA-256、两处副本确认和回滚版本。
- 首版继续使用 schema `1`；未来 schema `2` 生产候选版本必须重新执行跨 schema 升级验收。

## 3. 后续发布

### 0.1.1：上线后管理与出货导出修复补丁

- 发布状态：计划中
- 目标日期：待定
- 发布提交号：待发布后填写
- IndexedDB schema：`1`
- 是否需要备份：否
- 是否涉及 schema：否
- 回滚点：待发布前填写

变更摘要：

- 新增上线后需求池、发布记录、发布检查清单和版本管理说明。
- 新增根目录 `AGENTS.md`，并更新 README、贡献流程和 AI 上下文入口。
- 出货单新增手动订单号，订单号与系统单据编号分开展示、保存和导出。
- 修复出货单模板 Excel 动态明细行后的底部合并单元格重复显示问题。
- 出货单模板 Excel 表格区域保持单行显示，并在产品编号、尺寸、颜色整列为空时隐藏对应列；备注列始终保留。

关联事项：

- `PL-001`
- `PL-002`

验证计划：

- 检查 Markdown 文档完整性与互相引用。
- `npm run test -- src/modules/export-service/exportAdapter.test.ts src/modules/document-core/documentTransaction.test.ts`：开发阶段通过，2 个测试文件、26 个用例通过。
- `npm run quality`：开发阶段通过，lint、format check、typecheck、105 个单元测试、生产构建和 audit 均通过。
- `npm run test:e2e`：开发阶段通过，5 个 E2E 用例通过。
- `npm run test:pwa`：发布前通过，1 个 PWA 发布/更新/回滚用例通过。

发布后最小验证：

- 待发布后填写。

## 4. 发布记录模板

### X.Y.Z：标题

- 发布状态：计划中 / 已发布 / 已回滚 / 已跳过
- 发布日期：YYYY-MM-DD
- 发布提交号：
- IndexedDB schema：
- 是否需要备份：是 / 否
- 是否涉及 schema：是 / 否
- 回滚点：

变更摘要：

- 待补充。

关联事项：

- `PL-XXX`

验证记录：

- `npm run quality`：
- `npm run test:e2e`：
- `npm run test:pwa`：
- 手动验证：
- 未验证项及原因：

备份与回滚：

- 备份文件：
- 备份 SHA-256：
- 副本确认：
- 回滚限制：

发布后最小验证：

- 正式地址可打开：
- 可登录：
- 核心数据可见：
- 数据备份页可打开：
- 刷新后仍正常：
- 其他专项验证：

结论：

- 待补充。
