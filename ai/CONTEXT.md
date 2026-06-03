# CONTEXT.md

本文件用于让 AI Coding Agents 以最少读取成本快速建立项目上下文。

原则：
- 这是入口层，不是完整知识库
- 只保留高价值事实、约束、导航
- 细节以 `docs/` 下原始文档为准

## 1. 项目定义

项目名：Tradgio / 库存管理平台

项目目标：
- 为国内贸易个体经营者和小公司老板提供单人高频使用的业务系统
- 把分散在表格和文件中的业务记录收敛到一个平台
- 支持货品、往来单位、进货、出货、报价、合同、查询的统一管理
- 稳定导出固定格式的业务单据

目标用户：
- 国内贸易小公司老板
- 个体供应商经营者
- 通常只有 1 人高频使用系统

当前定位：
- 桌面端优先
- 登录后使用的业务台
- 非营销站点
- 非协作平台

## 2. 当前仓库状态

当前仓库已完成 MVP 前端实现，可通过 Vite 本地启动和验收。

已存在：
- React / Vite 前端应用代码
- App Shell、Auth、本地 repository、库存引擎、搜索聚合、导出服务占位实现
- 产品文档、架构文档、用户流程文档、设计规范、前端落地规范
- 用户提供的出货单、报价单模板原件
- 已转换的标准 `.xlsx` 模板资产：`public/templates/`

当前仍未完成：
- 自动化测试体系
- 部署配置
- 真实后端 / 对象存储 / 服务端导出运行时
- 固定模板 Excel 导出的字段映射与填充实现

结论：
- 不要把当前仓库当成空项目
- 代码实现应优先沿用 `src/modules` 与 `src/shared` 的现有分层
- 文档中如仍出现“没有代码/没有模板资产”的旧描述，应以当前代码和本文件为准

## 3. 业务范围

MVP 包含：
- 注册与登录
- 总览页
- 货品管理
- 往来单位管理
- 进货单管理
- 出货单管理
- 报价单管理
- 合同管理
- 综合查询

MVP 不包含：
- 多人协作
- 复杂权限
- 财务对账、收付款跟踪、利润核算
- 库存预警和自动提醒
- 多套单据模板管理
- 平台内生成合同正文
- 手机端优先体验

## 4. 核心业务对象

关键实体：
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

对象关系：
- 进货、出货、报价都采用主表 + 明细行
- 库存由进货单、出货单驱动
- 合同元数据入库，合同文件进对象存储
- 搜索结果来自统一投影，不直接暴露底层多表结构

## 5. 核心业务规则

必须记住：
- 进货单增加库存
- 出货单减少库存
- 报价单不影响库存
- 库存允许为负，但负库存只能来自出货保存
- 所有库存变更必须经过 `Inventory Engine`
- 所有导出必须经过 `Export Service`
- 单据保存应整单提交，不做零散字段写入
- 所有业务数据必须账号隔离

编辑改单规则：
- 修改进货单或出货单时，库存必须按差额回算
- 不允许直接覆盖库存快照来“修正库存”

导出规则：
- 导出失败不影响已保存单据
- 页面层不负责模板字段映射

合同规则：
- 附件二进制进入对象存储
- 合同记录和附件元数据进入数据库
- 上传失败不能留下半成品记录

搜索规则：
- 查询页消费统一搜索结果
- 不让页面层自行拼装跨模块查询

## 6. 产品结构

一级导航：
- 总览
- 货品
- 往来单位
- 进货
- 出货
- 报价
- 合同
- 查询

推荐路由：

```text
/login
/register
/overview
/products
/products/new
/products/:id
/counterparties
/counterparties/new
/counterparties/:id
/purchases
/purchases/new
/purchases/:id
/sales
/sales/new
/sales/:id
/quotes
/quotes/new
/quotes/:id
/contracts
/contracts/new
/contracts/:id
/search
```

## 7. 架构摘要

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

依赖原则：
- `Presentation -> Application`
- `Application -> Domain + Infrastructure`
- `Domain` 不依赖页面和厂商 SDK
- `Infrastructure` 不承载业务决策

禁止依赖：
- `Page -> DB SDK`
- `Page -> Object Storage SDK`
- `Page -> Export Template Adapter`
- 业务模块直接写其他模块内部 store

## 8. 页面与状态共识

每个页面至少要处理：
- 初始状态
- 加载状态
- 空状态
- 错误状态
- 正常状态

单据页额外要处理：
- 明细为空
- 自动带出字段成功
- 库存不足警告
- 导出处理中
- 导出失败

界面风格方向：
- 浅色主题
- 冷静、稳定、专业
- 中性色为主，蓝色为少量强调
- 总览页可有 Bento 风格
- 列表页、表单页优先效率，不做营销化视觉

## 9. 目标技术方向

当前实际实现：
- 前端：`React` + `Vite` SPA
- 路由：`react-router-dom`
- 数据：当前通过 localStorage adapter 模拟 repository
- 表单：结构化表单 + 领域层校验函数
- 认证：本地 localStorage auth adapter
- 导出：`Export Service` 占位实现，后续升级模板 Excel 导出

未来生产方向仍保留托管 Auth / PostgreSQL / Object Storage / Serverless Function。

## 10. 当前目录结构

```text
.
├── README.md
├── ai/
│   ├── AGENT.md
│   └── CONTEXT.md
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
├── src/
│   ├── app/
│   ├── modules/
│   └── shared/
├── specs/
└── tasks/
```

目录职责：
- `docs/`: 权威业务与架构来源
- `public/templates/`: 固定导出模板资产
- `src/`: 当前前端应用代码
- `ai/`: AI 入口层与执行约束
- `specs/`: 细化规格与契约
- `tasks/`: 任务拆解与执行记录

## 11. 推荐实现顺序

如果要从零开始落地代码，建议顺序如下：

1. 工程脚手架
2. App Shell
3. Auth 骨架
4. Master Data
5. Document Core
6. Inventory Engine
7. Contract Center
8. Search
9. Export Service
10. 测试与部署配置

如果任务较小，先判断它落在哪个模块和分层里，再决定是否可局部实施。

## 12. 任务路由提示

需求判断可用下面的方式：

- 与登录、会话恢复相关：`Auth`
- 与布局、导航、路由相关：`App Shell`
- 与货品、客户、供应商相关：`Master Data`
- 与进货、出货、报价单相关：`Document Core`
- 与库存增减、回算、库存历史相关：`Inventory Engine`
- 与合同上传、下载、附件相关：`Contract Center`
- 与统一查询相关：`Search`
- 与打印版 / 表格版导出相关：`Export Service`
- 与通用 repository、adapter、validator 相关：`Shared Platform`

## 13. 文档导航

AI 首次进入项目时，建议阅读顺序：

1. `README.md`
2. `ai/CONTEXT.md`
3. `docs/brief.md`
4. `docs/PRD.md`
5. `docs/architecture.md`

按任务追加：

- 做页面流程：`docs/USER-FLOW.md`
- 做前端结构：`docs/frontend-spec.md`
- 做视觉实现：`docs/design.md`
- 做本轮优化：`docs/optimization-plan.md`

各文档用途：
- `docs/brief.md`: 最短项目边界说明
- `docs/PRD.md`: 功能、字段、状态、异常
- `docs/architecture.md`: 模块边界、数据流、技术约束
- `docs/USER-FLOW.md`: 用户从入口到结果的流程
- `docs/frontend-spec.md`: 路由、页面模板、组件落地
- `docs/design.md`: token、布局、视觉方向
- `docs/optimization-plan.md`: 本轮 UI、草稿、看板、模板导出的任务边界

## 14. 实施风险与注意事项

当前实现风险：
- 当前数据仍是本地 localStorage，尚未接入真实数据库
- 当前附件仍是本地持久化，尚未接入对象存储
- 模板 Excel 导出尚未完成字段映射与填充实现
- 若 AI 不先读文档和现有代码，容易产生架构漂移

实现时要明确区分：
- 已存在事实：仓库内文件、明确文档约束
- 计划方向：推荐技术栈、建议目录、后续实现顺序

任何时候都不要：
- 把规划写成已实现状态
- 直接绕过库存引擎更新库存
- 在页面层散落外部平台 SDK 调用

## 15. 给 AI 的最小决策流程

开始做事前，先完成：

1. 这是文档问题、架构问题，还是代码实现问题？
2. 当前仓库是否已有相关代码？如果没有，是否应该先搭脚手架？
3. 此需求属于哪个模块？
4. 此改动应落在哪个分层？
5. 是否触发库存、导出、合同附件、统一搜索等全局约束？
6. 是否需要同步更新文档？

如果以上问题没有回答清楚，不要直接进入实现。
