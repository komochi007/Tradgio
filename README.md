# Tradgio / 库存管理平台
面向 AI Coding Agents 与开发者的项目入口文档。

用途：
- 快速建立项目认知
- 明确当前仓库状态
- 提供上下文导航入口
- 降低首次接手成本

注意：当前仓库已完成 MVP 前端实现，可本地启动并进行验收；部分能力仍为本地适配或占位实现。

## 1. Project Overview
Tradgio 是一个面向国内贸易个体经营者和小公司老板的单人业务系统，统一管理：
- 货品
- 往来单位（客户 / 供应商）
- 进货单
- 出货单
- 报价单
- 合同记录与附件
- 综合查询

目标：
- 替代分散表格与文件
- 提升录单、查单、找货、找合同效率
- 稳定导出固定格式业务单据
- 支持账号登录后继续使用历史记录

非目标：
- [ ] 多人协作
- [ ] 复杂权限
- [ ] 财务对账 / 利润核算
- [ ] 库存预警
- [ ] 多模板管理
- [ ] 平台内生成合同正文
- [ ] 手机端优先体验

## 2. Core Features
MVP 核心能力：
- [x] 注册与登录
- [x] 总览页与快捷新建入口
- [x] 货品管理
- [x] 往来单位管理
- [x] 进货单创建 / 编辑 / 详情 / 导出
- [x] 出货单创建 / 编辑 / 详情 / 导出
- [x] 报价单创建 / 编辑 / 详情 / 导出
- [x] 合同上传 / 查看 / 查询
- [x] 综合搜索

关键业务规则：
- 进货单增加库存
- 出货单减少库存
- 报价单不影响库存
- 库存允许为负，但只能由出货保存产生
- 库存变更必须经过 `Inventory Engine`
- 导出必须经过 `Export Service`

## 3. Tech Stack
当前仓库已落地前端代码，生产方向已锁定为 IndexedDB 本地优先 PWA：

| 层级 | 计划方案 |
|---|---|
| Frontend | `React` SPA |
| Routing | 客户端路由 |
| Persistent State | IndexedDB + `Query` 缓存模型 |
| Forms | 结构化表单 + Schema 校验 |
| Global State | 轻量 Store |
| Auth | 本地多账号 + Web Crypto PBKDF2 |
| Database | IndexedDB |
| Storage | IndexedDB Blob |
| Backup | 压缩 + AES-256-GCM 整机备份 |
| Export | 浏览器端 Export Service |
| Deployment | PWA + 平台无关静态托管 |

技术约束：
- 页面层不能直接访问 IndexedDB 或附件 Blob store
- 所有持久化能力通过 adapter 封装
- 当前架构采用“本地优先 PWA”
- 不引入微服务和复杂事件总线

## 4. Project Structure
当前目录结构：

```text
.
├── README.md
├── ai/
├── docs/
│   ├── PRD.md
│   ├── USER-FLOW.md
│   ├── architecture.md
│   ├── brief.md
│   ├── design.md
│   ├── optimization-plan.md
│   └── frontend-spec.md
├── public/
│   └── templates/
├── specs/
└── tasks/
```

目录职责：
- `docs/`: 当前最核心的上下文来源
- `public/templates/`: 固定导出模板资产，当前包含出货单和报价单 `.xlsx` 标准模板
- `ai/`: 预留给 AI 执行记录、上下文索引、草稿
- `specs/`: 预留给细化规格、接口契约、数据结构
- `tasks/`: 预留给任务拆解、迭代计划、验收清单

当前代码目录：

```text
src/
├── app
├── modules
└── shared
```

## 5. Architecture Overview
目标系统形态：

```text
Browser
-> Tradgio SPA
-> Local Auth / Repository / File / Backup / Export Adapters
-> IndexedDB / Web Crypto / Storage API / Service Worker
```

顶层模块：
- `App Shell`
- `Auth`
- `Overview`
- `Master Data`
- `Document Core`
- `Inventory Engine`
- `Contract Center`
- `Search`
- `Export Service`
- `Shared Platform`

技术分层：

```text
Presentation -> Application -> Domain -> Infrastructure
```

关键约束：
- `Presentation -> Application`
- `Application -> Domain + Infrastructure`
- `Domain` 不依赖页面与厂商 SDK
- `Infrastructure` 不承载业务决策

关键领域模型：
- `Account`
- `Product`
- `Counterparty`
- `PurchaseOrder` / `PurchaseLine`
- `SalesOrder` / `SalesLine`
- `QuoteOrder` / `QuoteLine`
- `ContractRecord` / `ContractAttachment`
- `InventoryLedger`
- `CurrentStockSnapshot`
- `SearchDocument`

## 6. Development Workflow
推荐阅读顺序：
1. `docs/brief.md`
2. `docs/PRD.md`
3. `docs/architecture.md`
4. `docs/USER-FLOW.md`
5. `docs/frontend-spec.md`
6. `docs/design.md`
7. `tasks/development-tasks.md`

推荐实现顺序：
1. 工程脚手架 + 路由骨架
2. Auth + App Shell
3. Master Data
4. Document Core
5. Inventory Engine
6. Contract Center
7. Search
8. Export Service

AI Agent 约束：
- [ ] 不在页面组件中直连 IndexedDB
- [ ] 不在页面组件中直接读写附件 Blob store
- [ ] 不绕过 `Inventory Engine` 更新库存
- [ ] 不把导出逻辑散落到页面
- [ ] 不把整张单据放入全局 store 作为唯一真相

已完成优化入口：
- 视觉与交互优化方案：`docs/frontend-spec.md` §16
- 优化开发任务：`tasks/development-tasks.md`（任务 21-25）
- 第三轮优化与验收：`docs/optimization-plan.md`（`OPT3-01` 至 `OPT3-09`）

生产化推进入口：
- 详细路线图：`tasks/production-roadmap.md`（任务 26-46）
- 上线检查清单：`tasks/production-readiness-checklist.md`
- 当前进度：`tasks/development-progress.md`
- 贡献与质量门禁：`CONTRIBUTING.md`

## 7. Local Development Setup
当前可直接本地启动，当前脚本：
- `npm run dev`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run typecheck`
- `npm run test`
- `npm run test:watch`
- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:install`
- `npm run build`
- `npm run audit`
- `npm run quality`
- `npm run preview`

当前仍建议后续补齐：
- [ ] `.env.example`

推荐目标命令：

```bash
npm install
npm run dev
npm run quality
npm run preview
```

`npm run quality` 与 CI 使用相同命令，依次执行 lint、格式检查、类型检查、测试、生产构建和依赖审计。依赖风险处置记录位于 `docs/dependency-audit.md`。

核心流程 E2E 使用 Playwright + Chromium，运行方式和测试数据策略见 `docs/e2e-testing.md`。

## 8. Environment Variables
当前状态：
- [ ] 仓库内暂无环境变量文件
- [x] 本地优先方案不依赖服务端密钥
- [ ] PWA 应用版本、正式 Origin 和发布配置待任务 37、44 定义

预期变量类别：

| 类别 | 用途 |
|---|---|
| App Version | 当前应用版本和 IndexedDB schema 兼容范围 |
| Origin | 正式 HTTPS Origin 与环境标识 |
| PWA | 缓存版本和更新策略 |
| Export | 浏览器端 Export Service 开关与模板基础路径 |
| Diagnostics | 非敏感调试与日志开关 |

建议后续提供：
- 平台无关构建配置
- 测试与生产 Origin 配置
- 不包含密码、备份密钥或其他敏感信息的 `.env.example`（如任务 37 评估确有需要）

生产方案见 `docs/adr/0002-local-first-indexeddb.md`。密码、备份密码、派生密钥和活动 session 不得进入环境变量或构建产物。

## 9. Important Directories
- `docs/`: 项目当前最重要目录，所有实现前优先阅读
- `ai/`: 适合放 Agent 计划、上下文索引、执行日志
- `specs/`: 适合放功能级规格与接口约束
- `tasks/`: 适合放任务拆解、里程碑、验收记录

## 10. AI Context Files
核心上下文文件：

| 文件 | 作用 | 何时使用 |
|---|---|---|
| `docs/brief.md` | 项目定义、目标、非目标 | 建立边界时 |
| `docs/PRD.md` | 功能、页面、字段、状态、异常 | 做需求实现前 |
| `docs/architecture.md` | 模块边界、分层、数据流、约束 | 做技术设计前 |
| `docs/USER-FLOW.md` | 关键用户流程 | 做路由 / 表单流转时 |
| `docs/frontend-spec.md` | 页面结构、组件与前端落地规范 | 做前端实现时 |
| `docs/design.md` | 视觉 token、布局、样式方向 | 做 UI 实现时 |

最小阅读集：
- [x] `docs/brief.md`
- [x] `docs/PRD.md`
- [x] `docs/architecture.md`

前端实现追加：
- [x] `docs/frontend-spec.md`
- [x] `docs/design.md`

## 11. Build & Deployment
当前状态：
- [x] 已有构建脚本（`npm run build`）
- [x] 已有 GitHub Actions 质量与 E2E 门禁
- [ ] 无容器配置
- [ ] 无部署平台配置

目标部署形态：
- Web SPA：平台无关免费静态托管
- 运行形态：Windows Chrome / Edge 安装 PWA
- Auth：本地多账号安全认证
- Database：IndexedDB
- Attachment Storage：IndexedDB Blob
- Backup：加密 `.tradgio-backup`
- Export Service：浏览器端按需加载并支持离线

部署前最低验收：
- [x] 登录后可恢复会话
- [x] 新建进货单后库存正确增加
- [x] 编辑单据能按差额回算库存
- [x] 出货库存不足有提醒但允许保存
- [x] 报价单不影响库存
- [x] 合同上传后可查看附件
- [x] 综合搜索返回统一结果
- [x] 导出失败不影响已保存单据

## 12. Coding Principles
核心原则：
- 简单优先，避免过度设计
- 模块边界优先于局部复用
- 业务规则收敛在领域层
- 基础设施能力通过 adapter 隔离
- 持久化真相以 IndexedDB 为准，Query 仅作为可重建缓存
- 页面只负责展示与交互

明确规则：
- 库存变更只能通过 `Inventory Engine`
- 导出只能通过 `Export Service`
- 合同附件必须“元数据与 Blob 分离 + File Adapter 统一访问”
- 搜索应返回统一结构
- 单据保存应整单提交

不应做的事：
- [ ] 在页面中直接操作 IndexedDB
- [ ] 在页面中直接读写附件 Blob store
- [ ] 直接修改库存快照作为业务真相
- [ ] 在页面散落模板字段映射

## 13. Current Status
已完成：
- [x] 项目简报
- [x] PRD
- [x] 架构文档
- [x] 用户流程文档
- [x] 设计规范
- [x] 前端落地规范
- [x] 前端工程初始化
- [x] UI / 页面实现
- [x] Auth 本地适配
- [x] 库存引擎实现
- [x] 合同上传链路（本地持久化）
- [x] 导出服务（打印版 + 出货单/报价单模板 Excel）
- [x] 搜索聚合层
- [x] 生产化任务 26-46 路线图与上线检查清单
- [x] P0 业务正确性修复与自动化回归
- [x] Lint、Format、CI 与依赖审计门禁
- [x] 核心流程 E2E 基线

未完成：
- [ ] 自动化测试体系
- [ ] 部署配置
- [ ] IndexedDB、Blob 附件、加密备份和 PWA 生产化

注意事项：
- 出货单、报价单模板 Excel 已完成字段映射、填充导出和真实下载内容验收
- 模板 Excel 的字段内容、表格样式、边框、对齐和货币格式已于 2026-06-10 手动验收通过
- 当前认证、数据和附件仍基于本地 `localStorage` / Base64，尚未迁移到 IndexedDB
- 任何后续交付都应区分“本地 MVP 已落地”与“IndexedDB 本地生产能力已接入”
- 截至 2026-06-01，MVP 功能已完成手动验收，可作为当前阶段交付基线
- 当前下一任务为任务 35，生产化实施顺序以 `tasks/production-roadmap.md` 为准

## 14. Roadmap Summary
### Phase 0: Foundation
- [x] 初始化前端工程
- [x] 建立 App Shell、路由、状态管理基础设施
- [x] 建立 Auth / DB / Storage / Export adapter 层

### Phase 1: Master Data
- [x] 货品管理
- [x] 往来单位管理
- [x] 基础资料可在录单中被引用

### Phase 2: Document Core
- [x] 进货单
- [x] 出货单
- [x] 报价单
- [x] 列表 / 详情 / 编辑 / 导出入口

### Phase 3: Inventory & Contract
- [x] Inventory Ledger
- [x] Current Stock Snapshot
- [x] 合同记录与附件上传下载

### Phase 4: Search & Export
- [x] 统一搜索聚合层
- [x] 固定模板导出服务（出货单 / 报价单）

### Phase 5: Hardening
- [ ] 自动化测试体系
- [x] 空状态 / 错误状态补齐
- [ ] 部署与运行文档

### Phase 6: Business Correctness
- [x] 库存差额回算与本地写入一致性
- [x] 账号业务数据隔离
- [x] 单据编号生成加固
- [x] P0 综合回归验收

### Phase 7: Local Production
- [x] 生产平台 ADR
- [ ] IndexedDB 数据模型、索引与事务契约
- [ ] 本地安全 Auth、结构化数据和 Blob 附件迁移
- [ ] 离线导出与整机加密备份恢复

### Phase 8: Release Readiness
- [ ] 本地适配层回归与 PWA 发布流水线
- [ ] 存储健康、备份提醒和 Windows 恢复演练
- [ ] Windows 迁移、升级与正式上线验收

## Quick Start For Agents
开始任何实现前，先完成这份 checklist：
- [x] 确认仓库当前已进入可运行代码阶段
- [ ] 先读 `docs/brief.md`、`docs/PRD.md`、`docs/architecture.md`
- [ ] 判断需求属于哪个顶层模块
- [ ] 判断代码应落在哪个技术分层
- [ ] 检查是否涉及库存、导出、附件、搜索等跨模块规则
- [ ] 若要突破架构约束，先更新文档再修改实现
- [ ] 生产化任务先读 `tasks/production-roadmap.md` 和上线检查清单

如果你接手后续迭代，当前从任务 35 开始推进；实施必须遵循 ADR-0002，且每次只完成一个任务。
