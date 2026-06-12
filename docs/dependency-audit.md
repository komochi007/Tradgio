# 依赖审计记录

## 2026-06-11

审计命令：`npm audit --audit-level=moderate`

### 初始结果

- 高危：0
- 严重：0
- 中危：2
- 根因：`exceljs@4.4.0` 间接依赖 `uuid@8.3.2`，命中 `GHSA-w5hq-g745-h8pq`。

### 处置

- 保留当前已完成模板验收的 `exceljs@4.4.0`，避免按 npm 建议降级到 `exceljs@3.4.0`。
- 通过 npm `overrides` 将 ExcelJS 的 `uuid` 固定为已修复的 `11.1.1`。
- 使用完整自动化测试、生产构建和 ExcelJS `uuid.v4()` 加载冒烟验证兼容性。

### 结论

- 处置后 `npm audit --audit-level=moderate` 报告 0 个漏洞。
- 当前无未处置的中危、高危或严重依赖漏洞。
- `npm ci` 仍会提示 ExcelJS 依赖链中的 `inflight`、`rimraf@2`、`glob@7`、`fstream` 和 `lodash.isequal` 已停止维护；当前没有对应审计漏洞，暂按维护性风险接受。
- ExcelJS 的替换或运行时调整归入任务 41，实施时必须重新执行模板内容和样式回归。
- 后续升级 ExcelJS 时应优先移除覆盖，并重新执行模板导出验收。

## 2026-06-12

审计命令：`npm audit --audit-level=moderate`

### 变更

- 新增开发依赖 `fake-indexeddb@6.2.5`，仅用于在 Vitest 中执行真实 IndexedDB Auth Adapter 测试。
- 该依赖不进入生产运行时构建，不处理生产数据。

### 结论

- `npm run quality` 通过，`npm audit --audit-level=moderate` 报告 0 个漏洞。
- 当前无未处置的中危、高危或严重依赖漏洞。
