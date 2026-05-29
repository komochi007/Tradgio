# Tradgio MVP 技术架构

## 1. 系统概述

### 1.1 文档定位

本文档定义 Tradgio 在 MVP 阶段的目标架构与实现约束，服务 AI Coding Agents 和后续开发者，目标是统一系统结构、模块边界、数据流、状态流和关键决策，减少实现过程中的架构漂移。

本文档不包含：
- 字段级数据库设计
- 完整 API 清单
- 部署手册

### 1.2 产品边界

Tradgio 是一个面向国内贸易个体经营者和小公司老板的单人业务系统，用于统一管理：
- 货品
- 往来单位
- 进货单
- 出货单
- 报价单
- 合同记录与附件
- 综合查询

MVP 不包含：
- 多人协作
- 复杂权限
- 财务对账与利润核算
- 库存预警
- 多模板管理
- 平台内生成合同正文

### 1.3 架构风格

前端架构采用 `SPA`，桌面端优先。

原因：
- 系统是登录后高频使用的业务台，不依赖 SEO
- 页面以表格、表单、详情页为主，交互状态复杂
- SPA 更适合固定 App Shell、连续会话和复杂录单流程

### 1.4 目标系统形态

MVP 采用“单体前端 + 平台服务”模型：
- Web SPA：负责 UI、路由、表单、局部状态
- 托管 Auth：负责注册、登录、会话恢复、账号隔离
- 托管 PostgreSQL：负责业务数据持久化
- 对象存储：负责合同附件和货品图片
- 轻量服务端导出能力：负责固定模板导出打印版 / 表格版

默认技术方向：
- 前端：`React SPA`
- 路由：客户端路由
- 服务端状态：`Query` 缓存模型
- 表单：结构化表单管理 + schema 校验
- 全局状态：轻量 store
- 平台能力：大陆可稳定访问的托管 Auth / PostgreSQL / Object Storage / Serverless Function

### 1.5 ASCII 架构图

```text
+---------------------------+
|         Browser           |
|   desktop-first client    |
+-------------+-------------+
              |
              v
+---------------------------+
|        Tradgio SPA        |
| App Shell / Routes / UI   |
| Forms / Tables / Queries  |
+------+------+------+------+
       |      |      |
       |      |      +-------------------------------+
       |      |                                      |
       v      v                                      v
+-------------+----+                    +---------------------------+
|   Auth Adapter   |                    |   Export Service API      |
| login/session    |                    | print/xlsx by templates   |
+-------------+----+                    +-------------+-------------+
              |                                       |
              v                                       v
+---------------------------+             +--------------------------+
|       Managed Auth        |             | Serverless Function /    |
| current account/session   |             | lightweight backend      |
+---------------------------+             +-------------+------------+
                                                        |
                                                        v
                                              +----------------------+
                                              | Template Adapters    |
                                              | purchase/sales/quote |
                                              +----------------------+

+---------------------------+     +-------------------------------+
|      Data Repositories    |---->| Managed PostgreSQL            |
| orders / stock / search   |     | business records / snapshots  |
+---------------------------+     +-------------------------------+

+---------------------------+     +-------------------------------+
|       File Adapter        |---->| Object Storage                |
| upload / download         |     | contracts / product images    |
+---------------------------+     +-------------------------------+
```

### 1.6 核心原则

- MVP 优先速度与稳定性，不做过度设计
- 所有业务数据必须账号隔离
- 所有库存变化只能经过 `Inventory Engine`
- 所有导出必须经过 `Export Service`
- 页面层不能直接访问 DB / Storage SDK
- 模块依赖必须单向，禁止跨模块写内部状态

## 2. 模块划分

### 2.1 顶层模块

系统顶层模块：
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

这些模块是逻辑边界，不等于独立部署单元。

### 2.2 技术分层

```text
Presentation Layer    页面、路由、组件、交互状态
Application Layer     use cases、命令编排、提交流程
Domain Layer          业务规则、领域对象、库存回算、导出 payload 规则
Infrastructure Layer  repository、BaaS adapter、storage adapter、export adapter
```

约束：
- `Presentation -> Application`
- `Application -> Domain + Infrastructure`
- `Domain` 不依赖页面与具体厂商 SDK
- `Infrastructure` 不包含业务决策

### 2.3 模块说明

| 模块 | 职责 | 对外接口 | 依赖 | 边界 |
|------|------|----------|------|------|
| `App Shell` | 路由、导航、页面骨架、错误边界 | 路由注册、页面容器插槽、导航状态 | `Auth`、`Shared Platform` | 只管页面承载，不管库存、导出、录单规则 |
| `Auth` | 注册、登录、退出、会话恢复、当前账号上下文 | `register`、`login`、`logout`、`restoreSession`、`getCurrentAccount` | `Shared Platform`、Auth adapter | 只解决身份和会话，不实现复杂 RBAC |
| `Overview` | 最近记录、快捷入口、库存摘要、近期业务摘要 | `getOverviewSnapshot`、`getRecentRecords`、`getQuickActionTargets` | `Document Core`、`Inventory Engine`、`Search`、`Shared Platform` | 只读聚合，不直接修改业务数据 |
| `Master Data` | 货品、客户、供应商管理，可选项供录单引用 | `listProducts`、`saveProduct`、`toggleProductStatus`、`deleteProduct`、`listCounterparties`、`saveCounterparty`、`toggleCounterpartyStatus`、`deleteCounterparty`、`getSelectableProducts`、`getSelectableCustomers`、`getSelectableSuppliers` | `Shared Platform` | 管基础资料，不管库存增减和导出文件 |
| `Document Core` | 进货单、出货单、报价单的创建、编辑、详情、列表与导出 payload | `createPurchaseOrder`、`updatePurchaseOrder`、`listPurchaseOrders`、`getPurchaseOrder`、`createSalesOrder`、`updateSalesOrder`、`listSalesOrders`、`getSalesOrder`、`createQuoteOrder`、`updateQuoteOrder`、`listQuoteOrders`、`getQuoteOrder`、`buildExportPayload` | `Master Data`、`Inventory Engine`、`Export Service`、`Shared Platform` | 管单据，不直接改库存快照，不直接渲染导出文件 |
| `Inventory Engine` | 库存流水、库存快照、改单差额回算、库存不足判断 | `applyPurchaseOrder`、`applySalesOrder`、`recalculateOrderDelta`、`getCurrentStock`、`getStockSnapshot`、`getStockHistory` | `Shared Platform` | 是唯一允许写库存的模块 |
| `Contract Center` | 合同记录、附件上传下载、附件元数据、按客户查询 | `createContractRecord`、`updateContractRecord`、`listContractRecords`、`getContractRecord`、`downloadAttachment` | `Shared Platform`、文件存储 adapter | 合同信息入库，合同二进制入对象存储 |
| `Search` | 聚合进货、出货、报价、合同，提供统一搜索结果 | `searchDocuments`、`buildSearchDocument`、`refreshSearchProjection` | `Document Core`、`Contract Center`、`Shared Platform` | 页面层只消费统一结果，不拼多表查询 |
| `Export Service` | 接收导出 payload，选择固定模板，生成打印版 / 表格版 | `exportPurchasePrint`、`exportPurchaseSheet`、`exportSalesPrint`、`exportSalesSheet`、`exportQuotePrint`、`exportQuoteSheet` | `Shared Platform`、模板 adapter | 模板映射和文件渲染都收敛在导出服务中 |
| `Shared Platform` | 数据访问、表单校验、格式化、上传、错误映射、通知、日志 | `repositories`、`validators`、`formatters`、`uploadClient`、`errorMapper`、`notificationBus` | BaaS SDK、Query 客户端 | 只放通用能力，不放单一业务规则 |

### 2.4 模块依赖

```text
App Shell -> Auth / Overview / Master Data / Document Core / Contract Center / Search
Overview -> Document Core / Inventory Engine / Search
Document Core -> Master Data / Inventory Engine / Export Service
Contract Center -> Shared Platform
Search -> Document Core / Contract Center
Auth -> Shared Platform
Master Data -> Shared Platform
Inventory Engine -> Shared Platform
Export Service -> Shared Platform
```

依赖规则：
- 允许上层依赖下层
- 不允许页面反向依赖底层 SDK
- 不允许业务模块直接引用别的模块内部 store

## 3. 数据流

### 3.1 通用规则

所有用户操作统一走以下路径：

```text
用户操作
-> 页面层收集输入
-> Application Use Case 校验和编排
-> Domain Service 执行业务规则
-> Repository / Adapter 持久化
-> Query 缓存失效与重取
-> UI 刷新
```

约束：
- 页面层不能直接写数据库
- 页面层不能直接调用对象存储 SDK
- 关键写操作必须有明确 use case 入口

### 3.2 场景一：新建进货单

```text
用户填写进货单
-> createPurchaseOrder(input)
-> 校验日期、供应商、明细
-> 持久化 PurchaseOrder + PurchaseLine
-> Inventory Engine.applyPurchaseOrder(order)
-> 写入 InventoryLedger
-> 更新 CurrentStockSnapshot
-> 刷新 Overview 最近记录
-> 刷新 SearchDocument 投影
-> Query 失效重取
-> UI 显示“进货单已保存”
```

规则：
- 单据必须整单提交
- 库存更新必须跟随单据保存成功
- 库存流水失败时应整体失败或回滚

### 3.3 场景二：编辑出货单并触发库存不足提醒

```text
用户编辑出货单
-> 页面根据当前库存实时给出警告
-> 若库存不足，弹出确认
-> 用户确认
-> updateSalesOrder(id, input)
-> 读取 previousOrder
-> 校验 nextOrder
-> 反算 previousOrder 库存影响
-> 应用 nextOrder 库存影响
-> 写入 InventoryLedger
-> 更新 CurrentStockSnapshot
-> 刷新详情、列表、库存摘要、搜索投影
-> UI 显示“出货单已更新，部分货品库存不足”
```

规则：
- 库存不足是警告，不是硬阻断
- 允许负库存，但只能来自出货保存
- 改单必须做差额回算，不能直接覆盖库存快照

### 3.4 场景三：合同上传

```text
用户填写合同表单并选文件
-> createContractRecord(input, files)
-> 校验字段和文件数量
-> 上传文件到对象存储
-> 返回文件元数据
-> 写入 ContractRecord
-> 写入 ContractAttachment
-> 刷新合同列表、详情、搜索投影
-> UI 显示“合同已保存”
```

规则：
- 文件二进制和元数据分开存储
- 文件上传失败时不能留下半成品记录

### 3.5 场景四：导出单据

```text
用户点击导出
-> Document Core.buildExportPayload(documentType, id)
-> Export Service 接收 payload
-> 选择模板 adapter
-> 生成打印版或表格版文件
-> 返回下载地址或文件流
-> UI 提示导出成功
```

规则：
- 导出失败不影响已保存单据
- 页面层不拼模板字段映射

## 4. 状态管理

### 4.1 状态分类与存放位置

| 状态类型 | 内容 | 存放位置 | 规则 |
|----------|------|----------|------|
| 全局状态 | 登录态、当前账号、全局筛选上下文、全局提示条、跨页上传/导出提示 | 轻量全局 store | 只放跨页面共享且不适合走服务端缓存的状态 |
| 服务端状态 | 货品列表、往来单位列表、单据列表与详情、合同列表与详情、最近记录、搜索结果、库存快照 | Query 缓存层 | 所有服务端状态必须可重取，真相以服务端为准 |
| 局部状态 | 表单输入值、明细行编辑、弹窗开关、库存不足确认、分页/排序/筛选暂存值 | 页面组件 / 表单控制器 | 页面关闭可丢失的状态不进入全局 store |

### 4.2 页面状态约束

每个页面必须处理：
- 初始状态
- 加载状态
- 空状态
- 错误状态
- 正常状态

单据页额外必须处理：
- 明细为空
- 自动带出字段成功
- 库存不足警告
- 导出处理中
- 导出失败

### 4.3 状态流规则

```text
用户输入
-> 局部状态更新
-> 提交 use case
-> 服务端状态变化
-> Query 失效
-> 页面基于新服务端状态重渲染
```

禁止：
- 直接改 Query 缓存伪造保存成功
- 用全局 store 保存整张单据作为唯一真相

## 5. 依赖关系

### 5.1 核心依赖方向

```text
Page
-> Application Use Case
-> Domain Service
-> Repository / Adapter
```

禁止依赖：
- `Page -> DB SDK`
- `Page -> Object Storage SDK`
- `Page -> Export Template Adapter`
- `业务模块 A -> 业务模块 B 的内部 store`

### 5.2 外部依赖

外部依赖类型：
- 托管 Auth
- 托管 PostgreSQL
- 对象存储
- Serverless Function 或轻量服务端运行时
- Query / 表单 / 校验类前端库

约束：
- 所有外部能力必须通过 adapter 封装
- 业务层不散落厂商 SDK 调用

### 5.3 关键领域模型

核心实体：
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

关系：
- 进货单、出货单、报价单都采用“主表 + 明细行”
- `InventoryLedger` 由进货单和出货单驱动
- `CurrentStockSnapshot` 由库存流水聚合得到
- `SearchDocument` 是统一查询投影，不是原始业务表

### 5.4 接口契约

必须遵守：
- 单据保存接口必须整单提交
- 库存变更只能通过 `Inventory Engine`
- 合同附件必须“元数据入库 + 二进制入对象存储”
- 导出必须通过 `Export Service`
- 搜索必须返回统一结果类型

统一搜索结果结构建议：

```text
SearchResult {
  id
  type
  title
  subtitle
  matchedField
  happenedAt
  targetRoute
}
```

统一导出 payload 结构建议：

```text
ExportPayload {
  documentType
  documentNo
  header
  lineItems
  totals
  meta
}
```

## 6. 技术决策记录

### 6.1 采用 SPA，不采用 SSR / SSG

原因：
- 系统是登录后业务台，不是内容站
- 表单、列表、详情页交互重
- 更适合固定 App Shell 和持续会话体验

### 6.2 采用托管型 BaaS，而不是先自建完整后端

原因：
- MVP 更看重速度和低运维
- 当前业务规模不需要重型服务拆分
- 先验证录单、导出、查询是否高频可用

### 6.3 采用 Inventory Ledger + Current Stock Snapshot

原因：
- 支持改单回算
- 支持库存不足提醒
- 支持查询追溯
- 单一可变库存数字无法满足可审计性

### 6.4 采用服务端模板导出，而不是纯前端导出

原因：
- 固定模板稳定性优先
- 打印版对字体、分页、格式一致性要求更高
- 表格版也适合服务端统一模板映射

### 6.5 合同附件使用对象存储，而不是数据库二进制字段

原因：
- 文件体积、下载、扩展性更适合对象存储
- 元数据与二进制解耦后更利于查询和管理

### 6.6 采用统一搜索聚合层，而不是前端分别查多模块

原因：
- 页面层不需要理解各模块差异
- 降低查询页复杂度
- 便于后续新增更多业务记录类型

### 6.7 MVP 不引入微服务、消息队列和复杂事件总线

原因：
- 当前业务规模不需要分布式拆分
- 库存、导出、合同、查询都可在单系统边界内完成
- 过早拆分只会增加实现成本和漂移风险

### 6.8 预留团队版扩展点，但本期不提前实现

预留能力：
- `Organization`
- `Membership`
- `RBAC`
- `Audit Log`

原因：
- 当前明确是单账号隔离的单人系统
- 未来扩展应建立在当前稳定边界上，而不是提前引入复杂度

## 7. 实施约束与验收清单

### 7.1 AI Agent 实现约束

- 不直接在页面组件里调用数据库 SDK
- 不直接在页面组件里调用对象存储 SDK
- 不绕过 `Inventory Engine` 更新库存
- 不让导出逻辑散落在进货、出货、报价页面
- 不把合同文件内容作为普通文本字段入库
- 不在全局 store 保存整张单据作为唯一真相

### 7.2 MVP 验证场景

- 登录成功后可进入总览页
- 刷新页面后可恢复登录会话
- 登录失效时自动跳回登录页
- 新建货品和往来单位后可在录单页被引用
- 新建进货单后库存增加
- 修改进货单后库存按差额回算
- 新建出货单时库存不足出现警告，但允许确认保存
- 新建报价单不会影响库存
- 上传合同后可在详情页查看附件
- 按客户名称可以搜索到合同
- 综合查询能返回跨进货、出货、报价、合同的统一结果
- 导出失败不影响已保存业务数据
- 无法绕过库存引擎直接改库存快照

### 7.3 默认假设

- 当前产品为单账号隔离的单人业务系统
- 桌面端优先，移动端仅保底可用
- 默认实现路线是 `React SPA + Router + Query + 表单校验 + 轻量全局状态`
- 平台能力默认是大陆可稳定访问的托管 PostgreSQL / Auth / Object Storage / Serverless Function
- 当前没有现成模板资产进入仓库，因此本期只定义导出边界，不定义模板细节
- 库存允许为负，但负库存只能来自出货保存且必须留下流水

### 7.4 使用方式

实现任何需求时，按以下顺序套用本文档：
- 先判断需求属于哪个顶层模块
- 再判断代码应该落在哪个技术分层
- 再检查是否触发库存、导出、附件、搜索等跨模块规则
- 最后决定目录位置和接口边界

如果某次实现需要突破本文档约束，应先更新本文档，再调整实现。
