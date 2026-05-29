# 开发进度

本文件用于维护当前实际开发状态。

更新规则：
- 每完成一个任务，更新状态、完成时间和结果摘要
- 若任务被拆分或重排，同步引用 `tasks/development-tasks.md`
- 只记录"已发生事实"，不要写成计划

---

## 1. 总体状态

当前阶段：基础启动阶段

当前已完成：
- 项目文档体系建立
- README 项目入口整理
- AI 上下文与行为约束整理
- 前端工程初始化
- 浏览器可运行的基础页面骨架
- 模块级规格文件第一批
- Git 仓库初始化
- Auth 适配层与登录态模型（任务 03）- 工程目录与模块骨架重组（任务 01）
- Shared Platform 基础能力初始化（任务 02）

当前未完成：

- Master Data
- Document Core
- Inventory Engine
- Contract Center
- Search
- Export Service
- 测试与自检体系

---

## 2. 当前任务状态

| 任务编号 | 任务名称 | 状态 | 说明 |
|---|---|---|---|
| 01 | 工程目录与模块骨架重组 | 已完成 | 2026-05-29：按 architecture.md 完成 10 模块目录骨架与文件迁移 |
| 02 | Shared Platform 基础能力初始化 | 已完成 | 2026-05-29：QueryClient、localStorage 适配器、错误映射、Toast 通知、格式化、校验占位 |
| 03 | Auth 适配层与登录态模型 | 已完成 | 2026-05-29：AuthService 接口 + localStorage 适配器 + AuthContext + useAuth，已接入 Provider 链 |
| 04 | 登录页、注册页与受保护路由 | 未开始 | 当前无 `/login`、`/register`，也无路由守卫 |
| 05 | 基础组件层第一批落地 | 未开始 | 当前只有页面级样式，尚未抽离正式基础组件 |
| 06 | 货品管理页面 | 未开始 | 无业务数据与页面实现 |
| 07 | 往来单位管理页面 | 未开始 | 无业务数据与页面实现 |
| 08 | Inventory Engine 数据模型与库存计算内核 | 未开始 | 尚无库存领域模型与计算逻辑 |
| 09 | 进货单创建与列表 | 未开始 | 无页面与单据保存逻辑 |
| 10 | 进货库存联动与改单回算 | 未开始 | 依赖进货单与库存引擎 |
| 11 | 出货单创建与库存不足警告 | 未开始 | 无页面与库存警告逻辑 |
| 12 | 出货库存联动与改单回算 | 未开始 | 依赖出货单与库存引擎 |
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
- 说明：为后续高复杂度模块的实现提供稳定规格依据

### 已完成事项 E：工程目录与模块骨架重组（任务 01）
- 状态：已完成
- 完成时间：2026-05-29
- 结果：按 architecture.md 的 10 个顶层模块重组 `src/` 目录
- 验收检查清单：
  - [x] 10 个模块目录均存在且含 `index.ts`
  - [x] 6 个源码文件已迁移到新位置
  - [x] `npm run build` 无错误
  - [x] 旧目录已清理
  - [x] 路由、导航、样式与重组前行为一致

### 已完成事项 F：Shared Platform 基础能力初始化（任务 02）
- 状态：已完成
- 完成时间：2026-05-29
- 新增依赖：`@tanstack/react-query`、`zod`
- 结果：
  - **config**（`src/shared/config/`）：应用环境配置
  - **query**（`src/shared/query/`）：`QueryClient` + `QueryProvider` + `localStorage` 通用仓储适配器
  - **errors**（`src/shared/errors/`）：`AppError` 类型 + `mapError` + `getUserFacingMessage` 错误映射
  - **notification**（`src/shared/notification/`）：`ToastProvider` + `useToast` + `ToastContainer` 通知系统
  - **utils**（`src/shared/utils/`）：`formatCurrency` / `formatDate` / `formatDateTime` / `formatNumber` / `generateId`
  - **validation**（`src/shared/validation/`）：`validate` 通用校验 + `paginationSchema` / `searchQuerySchema` 占位
  - **统一导出**（`src/shared/index.ts`）：所有共享能力从单一入口导出
  - **Provider 接入**：`main.tsx` 已接入 `QueryProvider` + `ToastProvider` + `ToastContainer`
- 验收检查清单：
  - [x] `npm run build` 无错误
  - [x] 全局 Provider 已接入 `main.tsx`（QueryClient + Toast）
  - [x] `src/shared/index.ts` 为统一导出入口
  - [x] localStorage 适配器遵循 Repository 接口，可替换为真实 API
  - [x] 错误映射区分 NOT_FOUND / VALIDATION_ERROR / UNAUTHORIZED / CONFLICT / NETWORK_ERROR / UNKNOWN
  - [x] Toast 通知支持 success / error / warning / info 四种类型，含自动消失
  - [x] 格式化工具覆盖金额、数字、日期、ID 生成
  - [x] 校验模块基于 zod，含通用 validate 包装函数

---

## 4. 当前代码基线

当前前端代码能力：
- Vite 启动 + 基础路由 + App Shell + 总览页占位
- 全局 token 与基础视觉基线
- 目录已按模块和分层重组
- **新增**：QueryClient + localStorage 仓储层
- **新增**：Toast 通知系统
- **新增**：错误类型映射
- **新增**：格式化 + 校验基础设施

当前明显缺口：
- 没有 Auth
- 没有业务数据模型
- 没有真实业务页面

---

## 5. 下一步建议

按依赖顺序，建议优先推进：

1. **任务 04**：登录页、注册页与受保护路由（依赖任务 03 已完成）
2. 任务 05：基础组件层第一批落地


---

## 6. 维护建议

后续每次开发完成后，至少同步更新：
- 本文件中的"当前任务状态"
- 若任务边界变化，更新 `tasks/development-tasks.md`
- 若新增高复杂度模块规则，更新对应 `specs/*.md`

### 已完成事项 G：Auth 适配层与登录态模型（任务 03）
- 状态：已完成
- 完成时间：2026-05-29
- 结果：
  - **domain**（`src/modules/auth/domain/`）：`Account` / `AuthSession` / `AuthState` 类型 + `AuthService` 接口
  - **infrastructure**（`src/modules/auth/infrastructure/`）：`localStorageAuthAdapter` 完整实现
  - **application**（`src/modules/auth/application/`）：`AuthProvider` + `useAuth` hook，含会话恢复
  - **Provider 链**：`main.tsx` 已接入 `AuthProvider`（位于 QueryProvider/ToastProvider 之内）
- 验收检查清单：
  - [x] `npm run build` 无错误
  - [x] `AuthService` 接口包含 `register` / `login` / `logout` / `restoreSession` / `getCurrentAccount`
  - [x] localStorage 适配器实现账户列表 + session 分离存储
  - [x] `AuthContext` 暴露 `status` / `account` / `login` / `register` / `logout` / `error`
  - [x] `useAuth` hook 可被任何页面消费
  - [x] 启动时自动 `restoreSession`，失败时静默退回 guest 状态
  - [x] 后续可替换为真实托管 Auth，无需修改页面层
