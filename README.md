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
当前仓库已落地前端代码，以下为当前采用或预留的技术方向：

| 层级 | 计划方案 |
|---|---|
| Frontend | `React` SPA |
| Routing | 客户端路由 |
| Server State | `Query` 缓存模型 |
| Forms | 结构化表单 + Schema 校验 |
| Global State | 轻量 Store |
| Auth | 托管 Auth |
| Database | 托管 `PostgreSQL` |
| Storage | 对象存储 |
| Export | Serverless Function / 轻量服务端 |

技术约束：
- 页面层不能直接访问 DB / Storage SDK
- 所有外部能力通过 adapter 封装
- 当前架构偏向“单体前端 + 平台服务”
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
-> Auth / Repository / Storage / Export Adapters
-> Managed Auth / PostgreSQL / Object Storage / Export Runtime
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
- [ ] 不在页面组件中直连数据库
- [ ] 不在页面组件中直连对象存储
- [ ] 不绕过 `Inventory Engine` 更新库存
- [ ] 不把导出逻辑散落到页面
- [ ] 不把整张单据放入全局 store 作为唯一真相

第二阶段优化入口：
- 视觉与交互优化方案：`docs/frontend-spec.md` §16
- 优化开发任务：`tasks/development-tasks.md`（任务 21-25）
- 优化阶段状态：`tasks/development-progress.md` §6

## 7. Local Development Setup
当前可直接本地启动，当前脚本：
- `npm run dev`
- `npm run build`
- `npm run preview`

当前仍建议后续补齐：
- [ ] `lint` / `format` / `test` 命令
- [ ] `.env.example`
- [ ] CI 配置

推荐目标命令：

```bash
npm install
npm run dev
npm run build
npm run preview
```

## 8. Environment Variables
当前状态：
- [ ] 仓库内暂无环境变量文件
- [ ] 暂无正式变量清单

预期变量类别：

| 类别 | 用途 |
|---|---|
| Auth | 登录、会话恢复、账号隔离 |
| Database | PostgreSQL 连接 |
| Storage | 合同附件、货品图片 |
| Export | 单据导出服务访问 |
| App Config | 站点地址、环境标识、调试开关 |

建议后续提供：
- `.env.example`
- `.env.local`
- 平台侧生产环境变量注入

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
- [ ] 无 CI 配置
- [ ] 无容器配置
- [ ] 无部署平台配置

目标部署形态：
- Web SPA：前端托管平台
- Auth：托管服务
- PostgreSQL：托管数据库
- Object Storage：合同与图片存储
- Export Service：Serverless / 轻量服务端

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
- 服务端状态以 Query 缓存为准
- 页面只负责展示与交互

明确规则：
- 库存变更只能通过 `Inventory Engine`
- 导出只能通过 `Export Service`
- 合同附件必须“元数据入库 + 二进制入对象存储”
- 搜索应返回统一结构
- 单据保存应整单提交

不应做的事：
- [ ] 在页面中写数据库访问
- [ ] 在页面中直接上传对象存储
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

未完成：
- [ ] 自动化测试体系
- [ ] 部署配置
- [ ] 真实后端 / 对象存储 / 导出服务接入

注意事项：
- 出货单、报价单模板 Excel 已完成字段映射、填充导出和真实下载内容验收
- 模板 Excel 的字段内容、表格样式、边框、对齐和货币格式已于 2026-06-10 手动验收通过
- 当前认证、数据和附件基于本地 `localStorage`
- 任何后续交付都应区分“本地 MVP 已落地”与“生产能力已接入”
- 截至 2026-06-01，MVP 功能已完成手动验收，可作为当前阶段交付基线

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

## Quick Start For Agents
开始任何实现前，先完成这份 checklist：
- [x] 确认仓库当前已进入可运行代码阶段
- [ ] 先读 `docs/brief.md`、`docs/PRD.md`、`docs/architecture.md`
- [ ] 判断需求属于哪个顶层模块
- [ ] 判断代码应落在哪个技术分层
- [ ] 检查是否涉及库存、导出、附件、搜索等跨模块规则
- [ ] 若要突破架构约束，先更新文档再修改实现

如果你接手后续迭代，优先补自动化测试、生产适配器和部署链路，不要再把仓库按“纯文档项目”处理。
