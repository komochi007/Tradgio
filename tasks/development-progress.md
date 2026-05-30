# 开发进度

本文件用于维护当前实际开发状态。

更新规则：
- 每完成一个任务，更新状态、完成时间和结果摘要
- 若任务被拆分或重排，同步引用 `tasks/development-tasks.md`
- 只记录"已发生事实"，不要写成计划

---

## 1. 总体状态

当前阶段：收尾阶段（全局完善 & 验证）

当前已完成：
- 工程目录与模块骨架重组（任务 01）
- Shared Platform 基础能力初始化（任务 02）
- Auth 适配层与登录态模型（任务 03）
- 登录页、注册页与受保护路由（任务 04）
- 基础组件层第一批落地（任务 05）
- 货品管理页面（任务 06）
- 往来单位管理页面（任务 07）
- 库存引擎数据模型与计算内核（任务 08）
- 进货单管理（任务 09、任务 10）
- 出货单管理（任务 11、任务 12）
- 报价单管理（任务 13）
- 总览页聚合（任务 14）
- 合同管理（任务 15）
- Search 统一搜索（任务 16）
- Export Service 导出服务（任务 17）

当前未完成：
- 全局状态完善与异常反馈收口（任务 18）
- 本地数据持久化适配点整理（任务 19）
- MVP 验证用例与交付自检（任务 20）

---

## 2. 当前任务状态

| 任务编号 | 任务名称 | 状态 | 说明 |
|---|---|---|---|
| 01 | 工程目录与模块骨架重组 | 已完成 | 2026-05-29：按 architecture.md 完成 10 模块目录骨架与文件迁移 |
| 02 | Shared Platform 基础能力初始化 | 已完成 | 2026-05-29：QueryClient、localStorage 适配器、错误映射、Toast 通知、格式化、校验占位 |
| 03 | Auth 适配层与登录态模型 | 已完成 | 2026-05-29：AuthService 接口 + localStorage 适配器 + AuthContext + useAuth，已接入 Provider 链 |
| 04 | 登录页、注册页与受保护路由 | 已完成 | 2026-05-29：LoginPage + RegisterPage + RequireAuth + GuestOnly 守卫，路由结构调整 |
| 05 | 基础组件层第一批落地 | 已完成 | 2026-05-29：Button、Input、Select、Tag、EmptyState、Skeleton、SectionCard 七个基础组件 |
| 06 | 货品管理页面 | 已完成 | 2026-05-29：Product 领域模型、列表页（搜索/筛选/启停）、表单页（新建/编辑/校验）、路由接入 |
| 07 | 往来单位管理页面 | 已完成 | 2026-05-29：Counterparty 领域模型、列表页（搜索/类型筛选/启停）、表单页（新建/编辑/校验）、路由接入 |
| 08 | Inventory Engine 数据模型与库存计算内核 | 已完成 | 2026-05-29：InventoryLedger / CurrentStockSnapshot 领域模型、纯函数计算内核、localStorage 仓储层、库存服务（apply/recalc/query/alert） |
| 09 | 进货单创建与列表 | 已完成 | 2026-05-29：PurchaseOrder 领域模型、localStorage 仓储、整单保存服务（库存联动+改单回算）、列表页（搜索/空状态）、表单页（明细行增删+金额计算）、详情页、路由接入 |
| 10 | 进货库存联动与改单回算 | 已完成 | 2026-05-29：已随任务 09 一并实现，purchaseService 在 create/update 时联动 InventoryEngine |
| 11 | 出货单创建与库存不足警告 | 已完成 | 2026-05-30：SalesOrder 领域模型、localStorage 仓储、整单保存服务（库存联动+改单回算）、列表页（搜索/空状态）、表单页（明细行增删+金额计算+库存警告）、详情页、路由接入 |
| 12 | 出货库存联动与改单回算 | 已完成 | 2026-05-30：已随任务 11 一并实现，salesService 在 create/update 时联动 InventoryEngine |
| 13 | 报价单创建与详情 | 已完成 | 2026-05-30：QuoteOrder 领域模型、localStorage 仓储、整单保存服务（不影响库存）、列表页（搜索/空状态）、表单页（明细行增删+金额计算+默认销售价带出+手动改价）、详情页、路由接入 |
| 14 | Overview 总览页聚合 | 已完成 | 2026-05-30：overviewService 聚合层 + Bento Grid 布局总览页，含库存摘要、最近单据、快捷入口 |
| 15 | 合同列表、上传、详情 | 已完成 | 2026-05-30：ContractRecord/ContractAttachment 领域模型、contractService（CRUD+文件上传）、列表/表单/详情页、路由接入 |
| 16 | Search 统一搜索结果模型与查询页 | 已完成 | 2026-05-30：SearchResult 统一结构、searchDocuments 跨模块聚合、SearchPage（初始/加载/结果/空/错误五态）、自动聚焦 |
| 17 | Export Service 接口边界与导出占位实现 | 已完成 | 2026-05-30：ExportPayload 统一结构、buildExportPayload 三文档类型适配、exportPrint/exportSheet 入口（TXT/CSV 占位实现）、三详情页导出按钮+loading+Toast 反馈 |
| 18 | 全局状态完善与异常反馈收口 | 未开始 | 缺少统一空态、错误态、通知和骨架屏体系 |
| 19 | 本地数据持久化与真实后端适配点整理 | 未开始 | 尚无统一持久化 adapter 出口 |
| 20 | MVP 验证用例与交付自检 | 未开始 | 尚未建立自检与回归清单 |

---

## 3. 已完成事项明细

### 已完成事项 P：Search 统一搜索（任务 16）
- 状态：已完成
- 完成时间：2026-05-30
- 结果：
  - **领域模型**（`src/modules/search/domain/types.ts`）：`SearchResult` / `SearchResultType` 统一结构，`typeLabel` / `typeVariant` 映射
  - **应用服务**（`src/modules/search/application/searchService.ts`）：`searchDocuments(keyword)` 跨模块聚合进货/出货/报价/合同四类记录，按关键词匹配单据编号、客户/供应商名称、货品名称、合同标题，返回统一 `SearchResult[]`
  - **查询页**（`src/modules/search/pages/SearchPage.tsx`）：搜索框自动聚焦、类型标签（进货=成功绿/出货=警告黄/报价=信息蓝/合同=信息蓝）、搜索结果点击跳转详情页
  - **状态覆盖**：搜索前（初始提示）、搜索中（加载提示）、有结果（结果列表+匹配字段+日期）、无结果（空状态）、搜索失败（错误恢复）
  - **路由接入**：`/search` 替换原 PlaceholderPage
  - **共享层补充**：Input 组件改为 `forwardRef` 支持 ref 转发
- 验收检查清单：
  - [x] `npm run build` 无错误
  - [x] 可按货品、客户、供应商、单据编号搜索
  - [x] 合同能被统一搜索结果命中（按合同编号、标题、客户名称）
  - [x] 返回结果结构统一（SearchResult[]）
  - [x] 点击结果可跳到对应详情页
  - [x] 查询页具备搜索前、搜索中、无结果、异常、有结果五类状态
  - [x] 页面层只消费 SearchResult[]，不做多表拼接
  - [x] 搜索输入区是视觉焦点（初始状态居中放大）

### 已完成事项 Q：Export Service 导出服务（任务 17）
- 状态：已完成
- 完成时间：2026-05-30
- 结果：
  - **领域模型**（`src/modules/export-service/domain/types.ts`）：`ExportPayload` / `ExportHeader` / `ExportLineItem` / `ExportTotals` / `ExportMeta` / `ExportFormat` / `ExportResult` 统一结构
  - **Payload 构建**（`src/modules/export-service/application/buildExportPayload.ts`）：`buildPurchaseExportPayload` / `buildSalesExportPayload` / `buildQuoteExportPayload` 三个适配函数，将业务单据映射为统一导出 payload
  - **导出服务**（`src/modules/export-service/application/exportService.ts`）：`exportPrint` / `exportSheet` / `exportDocument` 导出入口，打印版生成 TXT 下载，表格版生成 CSV 下载（UTF-8 BOM），带 600ms 模拟延迟
  - **详情页接入**：PurchaseDetailPage / SalesDetailPage / QuoteDetailPage 各新增"导出打印版"和"导出表格版"按钮，带 loading 状态和 Toast 成功/失败反馈
  - **模块导出**（`src/modules/export-service/index.ts`）：统一导出所有公开接口
- 验收检查清单：
  - [x] `npm run build` 无错误
  - [x] 进货、出货、报价单详情页都有统一导出入口
  - [x] 导出 payload 结构统一（ExportPayload）
  - [x] 导出失败不影响已保存数据（导出与保存解耦）
  - [x] 打印版导出为 TXT 文件下载
  - [x] 表格版导出为 CSV 文件下载
  - [x] 导出按钮有 loading 状态
  - [x] 导出结果通过 Toast 通知反馈
  - [x] 页面层不直接拼模板字段映射（通过 buildExportPayload 适配）

## 4. 当前代码基线

当前前端代码能力：
- Vite 启动 + 基础路由 + App Shell
- 全局 token 与基础视觉基线
- 目录已按模块和分层重组
- QueryClient + localStorage 仓储层
- Toast 通知系统 + 错误类型映射 + 格式化 + 校验基础设施
- Auth 登录态、登录页、注册页、路由守卫
- 基础组件体系（Button（loading态） / Input（forwardRef） / Select / Tag / EmptyState / Skeleton / SectionCard）
- 货品管理（Product 领域模型、列表页、表单页）
- 往来单位管理（Counterparty 领域模型、列表页、表单页）
- 库存引擎（InventoryLedger / CurrentStockSnapshot 领域模型、纯函数计算内核、库存服务）
- 进货单管理（PurchaseOrder CRUD + 库存联动 + 改单回算 + 导出，编码 JH）
- 出货单管理（SalesOrder CRUD + 库存联动 + 库存不足警告 + 导出，编码 CH）
- 报价单管理（QuoteOrder CRUD + 不影响库存 + 手动改价 + 导出，编码 BJ）
- 合同管理（ContractRecord CRUD + 附件上传/下载，编码 HT）
- 统一搜索（SearchResult 跨模块聚合，五态查询页）
- 导出服务（ExportPayload 统一结构，打印版 TXT / 表格版 CSV 下载）

当前明显缺口：
- 全局状态完善（骨架屏、空状态、错误态统一规范）
- 持久化适配点整理
- MVP 验证与自检

---

## 5. 下一步建议

按依赖顺序，建议优先推进：

1. **任务 18**：全局状态完善与异常反馈收口
2. **任务 19**：本地数据持久化与真实后端适配点整理
3. **任务 20**：MVP 验证用例与交付自检

---

## 6. 维护建议

后续每次开发完成后，至少同步更新：
- 本文件中的"当前任务状态"
- 若任务边界变化，更新 `tasks/development-tasks.md`
- 若新增高复杂度模块规则，更新对应 `specs/*.md`
