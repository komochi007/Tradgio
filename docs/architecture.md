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

生产形态采用“本地优先 PWA”模型：
- Web SPA / PWA：负责 UI、路由、表单、离线运行和版本更新
- Local Auth：负责本地多账号注册、登录、会话恢复和账号隔离
- IndexedDB：负责业务数据、库存、附件元数据和 Blob 持久化
- Backup Service：负责整机数据序列化、校验、压缩、加密和恢复
- 浏览器端 Export Service：负责固定模板导出打印版 / 表格版

默认技术方向：
- 前端：`React SPA`
- 路由：客户端路由
- 持久化状态：IndexedDB Repository + Query 缓存模型
- 表单：结构化表单管理 + schema 校验
- 全局状态：轻量 store
- 平台能力：IndexedDB / Web Crypto / Storage API / Service Worker
- 导出运行时：浏览器端 Export Service，ExcelJS 与模板按需加载
- 部署方向：平台无关免费静态托管 + 固定 HTTPS Origin

### 1.5 ASCII 架构图

```text
+---------------------------+
| Windows Chrome / Edge PWA |
| fixed HTTPS Origin        |
+-------------+-------------+
              |
              v
+---------------------------+
|        Tradgio SPA        |
| App Shell / Routes / UI   |
| Forms / Tables / Queries  |
+------+------+------+------+
       |      |      |
       v      v      v
+----------+ +----------------+ +------------------+
| Local    | | Repository /   | | Export Service   |
| Auth     | | File Adapters  | | print / xlsx     |
+----+-----+ +-------+--------+ +------------------+
     |               |
     +-------+-------+
             v
+---------------------------+
| IndexedDB                 |
| records / stock / Blob    |
| schema / migration meta   |
+-------------+-------------+
              |
              v
+---------------------------+
| Backup Service            |
| validate / compress       |
| AES-256-GCM encrypt       |
+---------------------------+

Mac development -> CI -> platform-independent static hosting
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
Infrastructure Layer  IndexedDB repository、auth/file/backup/export adapter、PWA runtime
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
| `Contract Center` | 合同记录、附件上传下载、附件元数据、按客户查询 | `createContractRecord`、`updateContractRecord`、`listContractRecords`、`getContractRecord`、`downloadAttachment` | `Shared Platform`、文件存储 adapter | 合同元数据与 Blob 分离存入 IndexedDB |
| `Search` | 聚合进货、出货、报价、合同，提供统一搜索结果 | `searchDocuments`、`buildSearchDocument`、`refreshSearchProjection` | `Document Core`、`Contract Center`、`Shared Platform` | 页面层只消费统一结果，不拼多表查询 |
| `Export Service` | 接收导出 payload，选择固定模板，生成打印版 / 表格版 | `exportPurchasePrint`、`exportPurchaseSheet`、`exportSalesPrint`、`exportSalesSheet`、`exportQuotePrint`、`exportQuoteSheet` | `Shared Platform`、模板 adapter | 模板映射和文件渲染都收敛在导出服务中 |
| `Shared Platform` | 数据访问、备份恢复、表单校验、格式化、错误映射、通知、日志 | `repositories`、`backupService`、`validators`、`formatters`、`errorMapper`、`notificationBus` | IndexedDB、Web Crypto、Storage API、Query 客户端 | 只放通用能力，不放单一业务规则 |

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
- 页面层不能直接操作 IndexedDB
- 页面层不能直接读写附件 Blob store
- 关键写操作必须有明确 use case 入口

### 3.2 场景一：新建进货单

```text
用户填写进货单
-> createPurchaseOrder(input)
-> 校验日期、供应商、明细
-> Local Atomic Save 保存单据、流水和快照前态
-> 持久化 PurchaseOrder + PurchaseLine
-> Inventory Engine.applyPurchaseOrder(order)
-> 写入 InventoryLedger
-> 更新 CurrentStockSnapshot
-> 任一步失败则恢复单据、流水和快照前态
-> 刷新 Overview 最近记录
-> 刷新 SearchDocument 投影
-> Query 失效重取
-> UI 显示“进货单已保存”
```

规则：
- 单据必须整单提交
- 库存更新必须跟随单据保存成功
- 本地适配器通过集合快照和逆序恢复保证单次保存不留下半成品
- 相同保存请求并发触发时复用进行中的结果，不重复应用库存
- 不同本地保存请求必须串行执行，避免失败回滚覆盖其他成功提交
- IndexedDB 生产适配器必须把单据、流水和快照放在同一个读写 transaction 中提交

### 3.3 场景二：编辑出货单并触发库存不足提醒

```text
用户编辑出货单
-> 页面根据当前库存实时给出警告
-> 若库存不足，弹出确认
-> 用户确认
-> updateSalesOrder(id, input)
-> 读取 previousOrder
-> 校验 nextOrder
-> Local Atomic Save 保存单据、流水和快照前态
-> 更新 SalesOrder + SalesLine
-> 反算 previousOrder 库存影响
-> 应用 nextOrder 库存影响
-> 写入 InventoryLedger
-> 更新 CurrentStockSnapshot
-> 任一步失败则恢复单据、流水和快照前态
-> 刷新详情、列表、库存摘要、搜索投影
-> UI 显示“出货单已更新，部分货品库存不足”
```

规则：
- 库存不足是警告，不是硬阻断
- 允许负库存，但只能来自出货保存
- 改单必须做差额回算，不能直接覆盖库存快照
- 进货单和出货单删除暂不开放，除非同步实现库存冲销并纳入同一事务

### 3.3.1 单据与库存事务契约

本地适配器：
- 事务参与集合固定包含当前单据、`InventoryLedger` 和 `CurrentStockSnapshot`
- 提交前读取三类完整前态，失败时按快照、流水、单据的逆序恢复
- 所有本地单据保存串行执行，相同请求在进行中时复用同一结果

IndexedDB 生产适配器：
- 创建和编辑必须由应用 use case 统一编排
- 单据主从记录、库存流水和库存快照必须使用同一个读写 transaction
- 任一写入或约束校验失败必须整体回滚，不允许分步提交后再依赖页面补偿
- 重试必须使用稳定幂等键或复合唯一索引，不能重复建单或重复应用库存

### 3.4 场景三：合同上传

```text
用户填写合同表单并选文件
-> createContractRecord(input, files)
-> 校验字段和文件数量
-> 通过 File Adapter 写入 IndexedDB Blob store
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
| 全局状态 | 登录态、当前账号、全局筛选上下文、全局提示条、跨页上传/导出提示 | 轻量全局 store | 只放跨页面共享状态，不作为业务数据真相 |
| 持久化状态 | 货品、往来单位、单据、合同、附件、搜索数据和库存 | IndexedDB + Query 缓存层 | IndexedDB 为本机业务真相，缓存必须可重新读取 |
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

### 4.3 账号上下文与数据隔离

- 所有持久化业务实体必须包含 `accountId`
- 本地 Repository 每次读写都从 Auth session 获取当前账号，不接受页面自行传入账号过滤条件
- 列表、详情、查询、修改、删除和事务恢复都只能作用于当前账号的数据切片
- 创建时强制覆盖为当前账号，禁止调用方伪造其他账号归属
- 库存、搜索、总览、编号生成和基础资料引用通过同一 Repository 边界自动隔离
- 单据和合同保存时必须重新校验货品、客户或供应商属于当前账号
- 无有效账号上下文时禁止业务数据读写

本地旧数据迁移：
- 使用 `tradgio_migration_account_scope_v1` 记录迁移版本和归属账号
- 首次迁移时，没有 `accountId` 的旧记录统一归属当前账号
- 迁移标记只在全部集合处理完成后写入，重复执行不得复制记录或改变既有归属

生产环境由 Local Auth session 派生 `accountId`，所有 Repository 和 File Adapter 必须强制过滤。该隔离是同一 Windows 用户内的逻辑边界，不替代操作系统账号、磁盘加密和锁屏。

编号一致性：
- 统一编号生成器按账号隔离后的集合、业务类型和当前月份读取合法编号的最大两位流水号
- 进货、出货、报价使用 `JH/CH/BJ + YYYYMM + 01-99`，合同使用 `HT + YYMM + 01-99`
- 四类创建都必须在串行保存边界内完成编号生成和写入，Repository 在最终写入时再次校验唯一性
- 本地唯一性仅用于 MVP 正确性保护；生产数据表必须建立 `(account_id, document_no)` 或 `(account_id, contract_no)` 联合唯一约束，冲突统一映射为 `CONFLICT`
- 当月最大流水为 `99` 时明确拒绝创建，不允许扩展为三位后破坏既有格式

### 4.4 状态流规则

```text
用户输入
-> 局部状态更新
-> 提交 use case
-> IndexedDB 持久化状态变化
-> Query 失效
-> 页面基于新持久化状态重渲染
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
- IndexedDB 浏览器 API
- Web Crypto API
- Storage API
- Service Worker / PWA 能力
- 平台无关静态托管
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
- 合同附件必须“元数据与 Blob 分离 + File Adapter 统一访问”
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

### 6.2 采用本地优先持久化，而不是先建设云端后端

原因：
- 当前是单人、单台 Windows、低数据量场景，本地持久化成本和运维负担更低
- IndexedDB、Web Crypto 和 PWA 可覆盖离线录单、附件、备份和更新需求
- Adapter 边界继续保留，未来出现多设备或协作需求时可迁移云端

### 6.3 采用 Inventory Ledger + Current Stock Snapshot

原因：
- 支持改单回算
- 支持库存不足提醒
- 支持查询追溯
- 单一可变库存数字无法满足可审计性

### 6.4 固定模板导出收敛在 Export Service

原因：
- 固定模板稳定性优先
- 当前浏览器端模板 Excel 已完成真实下载验收
- 客户端按需加载 ExcelJS 与模板可避免低频导出增加首屏负担

生产环境继续由浏览器端 `Export Service` 读取固定模板并生成打印版 / 表格版。导出数据必须从当前账号隔离的 Repository 获取，ExcelJS 和模板不得进入首屏必要资源；页面层不得直接维护模板字段和单元格映射。

### 6.5 合同附件使用独立 IndexedDB Blob store

原因：
- Blob 不与合同 JSON 记录内嵌，避免 Base64 体积膨胀
- 元数据与二进制解耦后更利于查询、容量控制、备份和未来迁移

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

### 6.8 保留多账号隔离，但不扩展团队协作

原因：
- 当前主要由一人使用，但保留本机多账号和账号级数据隔离
- 本地账号不提供组织、成员、RBAC 或远程协作能力
- 未来扩展应建立在当前稳定 Adapter 边界上，而不是提前引入团队复杂度

### 6.9 生产平台采用 IndexedDB 本地优先方案

任务 34 的修订决策锁定以下生产方向：

- Local Auth + Web Crypto 负责本地多账号认证。
- IndexedDB 保存结构化业务数据和库存真相。
- 合同附件以 Blob 独立存储，通过 File Adapter 访问。
- Backup Service 负责整机加密备份、预览和恢复。
- PWA 提供离线运行和提示式更新。
- 构建产物使用平台无关静态托管，Windows 通过固定 HTTPS Origin 长期使用。

完整数据、备份、容量、更新和退出方案见 `docs/adr/0002-local-first-indexeddb.md`。ADR-0001 仅保留为已被取代的历史决策。

### 6.10 整机加密备份与提示式更新

- 备份覆盖全部账号、业务数据、附件和必要元数据，不包含活动 session。
- 数据压缩后使用备份密码派生的 AES-256-GCM 密钥加密，密码和派生密钥不落盘。
- 恢复必须先完成密码、格式、摘要、版本和容量预检，再展示预览并执行整机替换。
- Service Worker 只提示新版本，不强制刷新编辑中的页面；高风险升级先完成备份。
- 正式 HTTPS Origin 投入使用后保持稳定，变更 Origin 必须通过备份恢复迁移数据。

## 7. 实施约束与验收清单

### 7.1 AI Agent 实现约束

- 不直接在页面组件里调用 IndexedDB API
- 不直接在页面组件里读写附件 Blob store
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

- 当前产品为单人主用、保留本地多账号隔离的业务系统
- 桌面端优先，移动端仅保底可用
- 默认实现路线是 `React SPA + Router + Query + 表单校验 + 轻量全局状态`
- 生产平台采用 IndexedDB 本地优先方案，具体能力边界以 `docs/adr/0002-local-first-indexeddb.md` 为准
- 当前已有出货单、报价单标准 `.xlsx` 模板资产进入 `public/templates/`
- 模板字段映射仍需在后续实现阶段补齐，且必须收敛在 `Export Service`
- 库存允许为负，但负库存只能来自出货保存且必须留下流水

### 7.4 使用方式

实现任何需求时，按以下顺序套用本文档：
- 先判断需求属于哪个顶层模块
- 再判断代码应该落在哪个技术分层
- 再检查是否触发库存、导出、附件、搜索等跨模块规则
- 最后决定目录位置和接口边界

如果某次实现需要突破本文档约束，应先更新本文档，再调整实现。
