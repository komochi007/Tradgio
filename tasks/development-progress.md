# 开发进度

本文件用于维护当前实际开发状态。

更新规则：
- 每完成一个任务，更新状态、完成时间和结果摘要
- 若任务被拆分或重排，同步引用 `tasks/development-tasks.md`
- 只记录"已发生事实"，不要写成计划

---

## 1. 总体状态

当前阶段：MVP 收尾完成 🎉

当前已完成（全部 20 个任务）：
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
- 全局状态完善与异常反馈收口（任务 18）
- 本地数据持久化适配点整理（任务 19）
- MVP 验证用例与交付自检（任务 20）

当前未完成：无

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
| 18 | 全局状态完善与异常反馈收口 | 已完成 | 2026-05-30：ErrorBoundary 全局异常捕获、PageError 专用错误页组件、FormErrorSummary 表单错误汇总、EmptyState error 变体、合同模块 alert() 替换为 Toast |
| 19 | 本地数据持久化适配点整理 | 已完成 | 2026-05-30：新建 src/shared/persistence/ 模块，定义适配器接口、集中注册 localStorage 键名、编写迁移文档 |
| 20 | MVP 验证用例与交付自检 | 已完成 | 2026-05-30：tasks/mvp-checklist.md 包含 94 项自检清单，覆盖 11 个验证分组 |

---

## 3. 当前代码基线

当前前端代码能力：
- Vite 启动 + 基础路由 + App Shell
- 全局 token 与基础视觉基线
- 目录已按模块和分层重组（10 模块 + 4 分层）
- QueryClient + localStorage 仓储层（10 个数据集）
- 统一持久化模块（`src/shared/persistence/`）含键名注册和迁移文档
- Toast 通知系统 + 错误类型映射 + 格式化 + 校验基础设施
- ErrorBoundary 全局异常捕获 + PageError 统一错误页 + FormErrorSummary 错误汇总 + EmptyState 双变体
- Auth 登录态、登录页、注册页、路由守卫
- 基础组件体系（Button / Input / Select / Tag / EmptyState / Skeleton / SectionCard / PageError / ErrorBoundary / FormErrorSummary）
- 货品管理（Product CRUD + 搜索/筛选/启停 + 表单校验）
- 往来单位管理（Counterparty CRUD + 类型筛选 + 表单校验）
- 库存引擎（Ledger + Snapshot + 纯函数计算 + 库存联动）
- 进货单管理（PurchaseOrder CRUD + 库存联动 + 改单回算 + 导出）
- 出货单管理（SalesOrder CRUD + 库存联动 + 库存不足警告 + 导出）
- 报价单管理（QuoteOrder CRUD + 不影响库存 + 手动改价 + 导出）
- 合同管理（ContractRecord CRUD + 附件上传/下载）
- 统一搜索（SearchResult 跨模块聚合 + 五态查询页）
- 导出服务（ExportPayload 统一结构 + 打印版 TXT / 表格版 CSV）
- MVP 交付自检清单（`tasks/mvp-checklist.md`，94 项）

---

## 4. 维护建议

后续每次开发完成后，至少同步更新：
- 本文件中的"当前任务状态"
- 若任务边界变化，更新 `tasks/development-tasks.md`
- 若新增高复杂度模块规则，更新对应 `specs/*.md`
