# 开发进度

本文件用于维护当前实际开发状态。

更新规则：
- 每完成一个任务，更新状态、完成时间和结果摘要
- 若任务被拆分或重排，同步引用 `tasks/development-tasks.md`
- 只记录"已发生事实"，不要写成计划

---

## 1. 总体状态

当前阶段：Document Core 阶段

当前已完成：
- 库存引擎数据模型与计算内核（任务 08）
- 项目文档体系建立
- README 项目入口整理
- AI 上下文与行为约束整理
- 前端工程初始化
- 浏览器可运行的基础页面骨架
- 模块级规格文件第一批
- Git 仓库初始化
- 工程目录与模块骨架重组（任务 01）
- Shared Platform 基础能力初始化（任务 02）
- Auth 适配层与登录态模型（任务 03）
- 登录页、注册页与受保护路由（任务 04）
- 基础组件层第一批落地（任务 05）
- 货品管理页面（任务 06）
- 往来单位管理页面（任务 07）
- 进货单管理（任务 09、任务 10）
- 出货单管理（任务 11、任务 12）

当前未完成：

- 报价单管理
- Contract Center
- Search
- Export Service
- 总览页聚合
- 测试与自检体系

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
| 13 | 报价单创建与详情 | 未开始 | 无页面与业务逻辑 |
| 14 | Overview 总览页聚合 | 未开始 | 当前为占位概览页，不是真实聚合页 |
| 15 | 合同列表、上传、详情 | 未开始 | 无合同页面与附件逻辑 |
| 16 | Search 统一搜索结果模型与查询页 | 未开始 | 无统一搜索结构与查询页 |
| 17 | Export Service 接口边界与导出占位实现 | 未开始 | 尚未实现导出 payload 与导出服务边界 |
| 18 | 全局状态完善与异常反馈收口 | 未开始 | 缺少统一空态、错误态、通知和骨架屏体系 |
| 19 | 本地数据持久化与真实后端适配点整理 | 未开始 | 尚无统一持久化 adapter 出口 |
| 20 | MVP 验证用例与交付自检 | 未开始 | 尚未建立自检与回归清单 |

---

## 3. 已完成事项明细

### 已完成事项 A：项目入口文档
- 状态：已完成
- 结果：创建 [`README.md`](../README.md)
- 说明：形成了面向开发者和 AI Agent 的项目入口层

### 已完成事项 B：AI 辅助文档
- 状态：已完成
- 结果：
  - [`ai/CONTEXT.md`](../ai/CONTEXT.md)
  - [`ai/AGENT.md`](../ai/AGENT.md)
- 说明：分别沉淀项目上下文压缩层与 AI 行为约束层

### 已完成事项 C：前端工程初始化
- 状态：已完成
- 结果：
  - `React + TypeScript + Vite` 工程可运行
  - 浏览器已验证本地页面可打开
  - Git 仓库已初始化

### 已完成事项 D：模块级规格文件第一批
- 状态：已完成
- 结果：
  - [`specs/auth.md`](../specs/auth.md)
  - [`specs/document-core.md`](../specs/document-core.md)
  - [`specs/inventory-engine.md`](../specs/inventory-engine.md)
  - [`specs/contract-center.md`](../specs/contract-center.md)
  - [`specs/search.md`](../specs/search.md)
- 说明：为后续高复杂度模块的实现提供稳定规格

### 已完成事项 E：工程目录与模块骨架重组（任务 01）
- 状态：已完成
- 完成时间：2026-05-29
- 结果：
  - 按 `architecture.md` 模块边界完成目录骨架重组
  - 10 个模块均在 `src/modules/` 下拥有独立目录和入口
  - 路由入口、页面入口、共享样式与基础工具位置稳定
- 验收检查清单：
  - [x] `npm run build` 无错误
  - [x] 浏览器 `http://localhost:5173` 可正常打开
  - [x] 10 个模块目录均存在且含 `index.ts` 入口
  - [x] 路由注册逻辑已在 `App.tsx` 中收敛

### 已完成事项 F：Shared Platform 基础能力初始化（任务 02）
- 状态：已完成
- 完成时间：2026-05-29
- 结果：
  - **Query 层**（`src/shared/query/`）：`QueryProvider` + `queryClient` + `createLocalStorageRepository` 泛型仓储工厂
  - **错误层**（`src/shared/errors/`）：`AppError` 类 + `mapError` 映射 + `getUserFacingMessage` 中文提示
  - **通知层**（`src/shared/notification/`）：`ToastProvider` + `useToast` + `ToastContainer`（自动消失 + 手动关闭）
  - **工具层**（`src/shared/utils/`）：`formatCurrency` / `formatNumber` / `formatDate` / `formatDateTime` / `generateId`
  - **校验层**（`src/shared/validation/`）：`zod` + `validate` 适配器 + `paginationSchema` / `searchQuerySchema`
  - **配置层**（`src/shared/config/`）：`appConfig` 入口
- 验收检查清单：
  - [x] `npm run build` 无错误

### 已完成事项 G：Auth 适配层与登录态模型（任务 03）
- 状态：已完成
- 完成时间：2026-05-29
- 结果：
  - **领域类型**（`src/modules/auth/domain/types.ts`）：`Account` / `AuthStatus` / `LoginInput` / `RegisterInput` / `AuthError`
  - **AuthService 接口**（`src/modules/auth/domain/AuthService.ts`）：`register` / `login` / `logout` / `restoreSession` / `getCurrentAccount`
  - **localStorage 适配器**（`src/modules/auth/infrastructure/localStorageAuthAdapter.ts`）：完整 mock 实现，注册校验重复用户名/邮箱，登录校验密码，会话 token 持久化
  - **AuthContext**（`src/modules/auth/application/AuthContext.tsx`）：`AuthProvider` + `useAuth` hook，提供 `account` / `status` / `login` / `register` / `logout`
- 验收检查清单：
  - [x] `npm run build` 无错误
  - [x] 注册 + 登录 + 退出 + 会话恢复流程可走通

### 已完成事项 H：登录页、注册页与受保护路由（任务 04）
- 状态：已完成
- 完成时间：2026-05-29
- 结果：
  - **LoginPage**（`src/modules/auth/pages/LoginPage.tsx`）：用户名+密码表单、表单校验、loading 状态、错误提示
  - **RegisterPage**（`src/modules/auth/pages/RegisterPage.tsx`）：用户名+邮箱+密码+确认密码、密码强度提示、注册成功引导跳转
  - **路由守卫**（`src/modules/auth/application/RouteGuards.tsx`）：`RequireAuth`（未登录跳转到 /login）、`GuestOnly`（已登录跳转到 /overview）
  - **路由结构**：顶层分 guest 路由和 auth 路由两个 Route group
- 验收检查清单：
  - [x] `npm run build` 无错误

### 已完成事项 I：基础组件层第一批落地（任务 05）
- 状态：已完成
- 完成时间：2026-05-29
- 结果：
  - `Button`：primary / secondary / ghost / danger 变体，small / medium 尺寸，loading 状态
  - `Input`：text / number / date / email / password 类型，label + error 支持
  - `Select`：label + error + placeholder，options 支持 value/label/disabled
  - `Tag`：default / blue（客户） / orange（供应商）/ green（启用） / red（停用）/ neutral 颜色
  - `EmptyState`：icon + title + description + primaryAction + secondaryAction
  - `SkeletonText` / `SkeletonCard` / `SkeletonTable`：基础骨架屏
  - `SectionCard`：eyebrow + title + children + actions
- 验收检查清单：
  - [x] `npm run build` 无错误
  - [x] 各组件支持完整 TypeScript 类型
  - [x] 已在 `src/shared/components/index.ts` 统一导出

### 已完成事项 J：货品管理页面（任务 06）
- 状态：已完成
- 完成时间：2026-05-29
- 结果：
  - **领域模型**（`src/modules/master-data/products/domain/types.ts`）：`Product` / `ProductUnit` / `ProductStatus` / `ProductFormData` 类型，`validateProductForm` 校验函数
  - **仓储层**（`src/modules/master-data/products/infrastructure/productRepository.ts`）：基于 `createLocalStorageRepository` 的 localStorage 适配器
  - **列表页**（`src/modules/master-data/products/pages/ProductListPage.tsx`）：搜索、状态筛选（全部/启用/停用）、表格、空状态、启停操作
  - **表单页**（`src/modules/master-data/products/pages/ProductFormPage.tsx`）：新建/编辑双模式、字段校验、单位下拉选择、提交状态
  - **路由接入**：`/products` → 列表页、`/products/new` → 新建页、`/products/:id` → 编辑页
  - **全局样式**：新增 list-page、filter-toolbar、data-table、form-page、form-card、form-row 样式
- 验收检查清单：
  - [x] `npm run build` 无错误
  - [x] 货品列表页支持搜索、状态筛选、空状态、骨架屏
  - [x] 货品表单页支持新建与编辑双模式
  - [x] 表单校验覆盖必填、长度、价格有效性
  - [x] 单位使用 Select 下拉，含预定义列表（个/箱/盒/袋/kg 等 20 种）
  - [x] 启用/停用操作含 Toast 反馈
  - [x] 页面具备加载/空/错误/正常四态
  - [x] 货品数据通过 localStorage 持久化，后续录单可直接引用

### 已完成事项 K：往来单位管理页面（任务 07）
- 状态：已完成
- 完成时间：2026-05-29
- 结果：
  - **领域模型**（`src/modules/master-data/counterparties/domain/types.ts`）：`Counterparty` / `CounterpartyType`(customer/supplier) / `CounterpartyStatus` / `CounterpartyFormData` 类型，`validateCounterpartyForm` 校验函数
  - **仓储层**（`src/modules/master-data/counterparties/infrastructure/counterpartyRepository.ts`）：基于 `createLocalStorageRepository` 的 localStorage 适配器
  - **列表页**（`src/modules/master-data/counterparties/pages/CounterpartyListPage.tsx`）：搜索、类型筛选（全部/客户/供应商）、表格、启停操作
  - **表单页**（`src/modules/master-data/counterparties/pages/CounterpartyFormPage.tsx`）：新建/编辑双模式、字段校验、类型 Select
  - **路由接入**：`/counterparties` → 列表页、`/counterparties/new` → 新建页、`/counterparties/:id` → 编辑页
- 验收检查清单：
  - [x] `npm run build` 无错误
  - [x] 列表页支持搜索、类型筛选（全部/客户/供应商）、空状态、骨架屏
  - [x] 表单页支持新建与编辑双模式
  - [x] 表单校验覆盖必填、长度限制
  - [x] 类型使用 Select 下拉（客户/供应商）
  - [x] 启用/停用操作含 Toast 反馈
  - [x] 页面具备加载/空/错误/正常四态
  - [x] 数据通过 localStorage 持久化，后续录单可直接引用
  - [x] 客户用蓝色 Tag，供应商用橙色 Tag 区分

### 已完成事项 L：出货单管理（任务 11 + 任务 12）
- 状态：已完成
- 完成时间：2026-05-30
- 结果：
  - **领域模型**（`src/modules/document-core/sales/domain/types.ts`）：`SalesOrder` / `SalesLine` / `SalesFormData` / `SalesFormLine` 类型，`validateSalesForm` / `emptySalesLine` / `emptySalesForm` / `orderToFormData` / `formDataToOrder` 辅助函数
  - **仓储层**（`src/modules/document-core/sales/infrastructure/salesRepository.ts`）：基于 `createLocalStorageRepository` 的 localStorage 适配器，编码前缀 CH
  - **应用服务**（`src/modules/document-core/sales/application/salesService.ts`）：`createSalesOrder` / `updateSalesOrder` / `getSalesOrder` / `listSalesOrders` / `deleteSalesOrder` / `checkStockShortage`，完整库存联动与改单回算
  - **列表页**（`src/modules/document-core/sales/pages/SalesListPage.tsx`）：搜索（单据编号/客户/货品）、空状态、骨架屏
  - **表单页**（`src/modules/document-core/sales/pages/SalesFormPage.tsx`）：新建/编辑双模式、客户选择、货品选择（自动带出规格/单位/默认销售价）、明细行增删、金额自动计算、**当前库存展示**、**库存不足实时警告**、保存确认弹窗
  - **详情页**（`src/modules/document-core/sales/pages/SalesDetailPage.tsx`）：基本信息卡片 + 货品明细表格
  - **路由接入**：`/sales` → 列表页、`/sales/new` → 新建页、`/sales/:id` → 详情页、`/sales/:id/edit` → 编辑页
- 验收检查清单：
  - [x] `npm run build` 无错误
  - [x] 出货单列表页支持搜索、空状态、骨架屏
  - [x] 出货单表单页支持新建与编辑双模式
  - [x] 表单校验覆盖必填（客户/日期/货品/数量/单价）
  - [x] 选择货品后自动带出规格、单位、默认销售价
  - [x] 明细行金额自动计算（数量×单价）
  - [x] 合计金额自动汇总
  - [x] 明细行支持增删（至少保留一行）
  - [x] 明细行实时展示当前库存数量
  - [x] 出货数量超出当前库存时出现库存不足警告（黄色警告框）
  - [x] 库存不足时提交有二次确认弹窗
  - [x] 保存后生成 CH+年月+序号 格式单据编号
  - [x] 保存时联动 Inventory Engine 写入库存（扣减）
  - [x] 编辑出货单时按差额回算库存（负库存保留规则）
  - [x] 详情页展示完整单据信息
  - [x] 页面状态覆盖加载/空/错误/正常四态
  - [x] 表单错误就近展示在对应字段下方

## 4. 当前代码基线

当前前端代码能力：
- Vite 启动 + 基础路由 + App Shell + 总览页占位
- 全局 token 与基础视觉基线
- 目录已按模块和分层重组
- QueryClient + localStorage 仓储层
- Toast 通知系统
- 错误类型映射
- 格式化 + 校验基础设施
- Auth 登录态、登录页、注册页、路由守卫
- 基础组件体系（Button / Input / Select / Tag / EmptyState / Skeleton / SectionCard）
- 货品管理（Product 领域模型、列表页、表单页、localStorage 持久化）
- 往来单位管理（Counterparty 领域模型、列表页、表单页、localStorage 持久化）
- 库存引擎（InventoryLedger / CurrentStockSnapshot 领域模型、纯函数计算内核、localStorage 仓储、库存服务）
- 进货单管理（PurchaseOrder 列表/新建/编辑/详情，库存联动+改单回算）
- 出货单管理（SalesOrder 列表/新建/编辑/详情，库存联动+改单回算+库存不足警告）

当前明显缺口：
- 报价单管理
- Contract Center 合同管理
- Search 搜索页面
- Export Service 导出功能
- Overview 总览页聚合

---

## 5. 下一步建议

按依赖顺序，建议优先推进：

1. **任务 13**：Document Core - 报价单创建与详情（依赖任务 06、任务 07 已完成，参考进货单/出货单实现模式）

---

## 6. 维护建议

后续每次开发完成后，至少同步更新：
- 本文件中的"当前任务状态"
- 若任务边界变化，更新 `tasks/development-tasks.md`
- 若新增高复杂度模块规则，更新对应 `specs/*.md`
