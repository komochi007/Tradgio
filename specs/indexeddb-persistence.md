# IndexedDB 持久化契约

## 1. 目标与范围

本规格由任务 35 定义契约，任务 39 已实现结构化业务数据 Adapter 与迁移：

- 数据库、object store、主键与索引
- Repository、File Adapter 与账号上下文
- 单据库存和合同附件的事务边界
- schema 升级、迁移记录与错误模型
- 时间、日期、金额、数量和 Blob 的存储表示

结构化业务数据、库存和草稿已切换运行时 IndexedDB Adapter；真实附件 Blob 仍由任务 40 实现。

## 2. 固定标识

| 项目             | 值                 | 规则                               |
| ---------------- | ------------------ | ---------------------------------- |
| 数据库名         | `tradgio`          | 正式 Origin 投入使用后保持不变     |
| 初始 schema 版本 | `1`                | 只允许单调递增整数                 |
| 主键             | 业务记录使用 `id`  | 由应用生成稳定 ID，不使用自增键    |
| 当前账号         | Local Auth session | 页面和调用方不能传入或覆盖数据归属 |

代码声明位于 `src/shared/persistence/indexeddbSchema.ts`。

## 3. 数据表示

| 类型     | IndexedDB 表示      | 约束                                                                                                     |
| -------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| 时间点   | ISO 8601 UTC 字符串 | `createdAt`、`updatedAt`、`uploadedAt`、`completedAt` 使用 `new Date().toISOString()` 形态               |
| 业务日期 | `YYYY-MM-DD` 字符串 | `happenedAt`、`signDate` 不做时区换算                                                                    |
| 金额     | 整数分              | 存储字段使用 `*AmountMinor` / `*PriceMinor`；Repository Adapter 在边界与当前元模型的元单位 `number` 转换 |
| 数量     | 有限 `number`       | 禁止 `NaN`、`Infinity`；保留业务输入所需小数，不做金额式缩放                                             |
| 文件大小 | 整数 byte           | 非负且不得超过安全整数范围                                                                               |
| Blob     | 原生 `Blob`         | 只进入 `attachmentBlobs`，不进入合同记录或附件元数据                                                     |
| 枚举     | 稳定字符串          | 未知值由 Adapter 映射为数据损坏错误，不静默改写                                                          |

金额转换必须统一使用十进制边界函数并四舍五入到分，禁止直接依赖浮点乘法结果作为持久化真相。任务 39 实现迁移时需核对转换前后合计金额。

## 4. Object Store 与索引

### 4.1 Store 矩阵

| Store                | 主键        | 账号隔离 | 主要内容                                         |
| -------------------- | ----------- | -------- | ------------------------------------------------ |
| `accounts`           | `id`        | 否       | 用户名、规范化用户名、创建时间                   |
| `accountCredentials` | `accountId` | 否       | PBKDF2 算法、参数版本、迭代次数、盐和摘要        |
| `products`           | `id`        | 是       | 货品资料与默认价格分值                           |
| `counterparties`     | `id`        | 是       | 客户/供应商资料                                  |
| `purchaseOrders`     | `id`        | 是       | 进货单主记录及内嵌明细行                         |
| `salesOrders`        | `id`        | 是       | 出货单主记录及内嵌明细行                         |
| `quoteOrders`        | `id`        | 是       | 报价单主记录及内嵌明细行                         |
| `inventoryLedger`    | `id`        | 是       | 不可变库存流水                                   |
| `inventorySnapshots` | `id`        | 是       | 货品当前库存快照                                 |
| `contracts`          | `id`        | 是       | 合同元数据，不含 Blob 与 Base64                  |
| `attachmentMetadata` | `id`        | 是       | `contractId`、文件名、MIME、大小、上传时间、摘要 |
| `attachmentBlobs`    | `id`        | 是       | `attachmentId` 对应的原生 Blob                   |
| `migrationRecords`   | `id`        | 否       | 迁移版本、状态、校验统计与完成时间               |
| `appSettings`        | `key`       | 否       | schema 兼容标记、备份提醒等整机设置              |
| `drafts`             | `id`        | 是       | 按账号和表单类型隔离的草稿数据，不含临时文件句柄 |

单据明细继续内嵌在整单记录中，符合“整单提交”规则，避免主从表分步写入。搜索结果由现有 Search 聚合层按需投影，不建立独立真相 store。

### 4.2 唯一索引

| Store                | 索引                      | 唯一 | 用途                                 |
| -------------------- | ------------------------- | ---- | ------------------------------------ |
| `accounts`           | `normalizedUsername`      | 是   | 阻止大小写或空白规范化后的重复用户名 |
| `purchaseOrders`     | `[accountId, documentNo]` | 是   | 账号内进货单编号唯一                 |
| `salesOrders`        | `[accountId, documentNo]` | 是   | 账号内出货单编号唯一                 |
| `quoteOrders`        | `[accountId, documentNo]` | 是   | 账号内报价单编号唯一                 |
| `contracts`          | `[accountId, contractNo]` | 是   | 账号内合同编号唯一                   |
| `inventorySnapshots` | `[accountId, productId]`  | 是   | 每个账号每个货品只存在一个快照       |
| `drafts`             | `[accountId, formKey]`    | 是   | 每类新建表单只保留一份草稿           |

唯一索引冲突统一映射为 `CONFLICT`。编号生成必须在同一个读写 transaction 中读取当前账号最大号并写入，最终仍以唯一索引为准。

### 4.3 查询索引

- 所有账号业务 store 提供 `accountId` 索引。
- 产品、往来单位、单据和合同提供 `[accountId, updatedAt]` 或相应日期索引。
- 往来单位提供 `[accountId, type]`，产品提供 `[accountId, status]`。
- 库存流水提供 `[accountId, productId]`、`[accountId, documentType, documentId]` 和 `[accountId, createdAt]`。
- 合同提供 `[accountId, customerId]`，附件元数据提供 `[accountId, contractId]`。
- 不为自由文本搜索建立多值索引；当前低数据量场景在账号切片内聚合过滤。

## 5. Repository 契约

Repository 必须满足：

1. 每次操作通过 `AccountContextProvider.requireAccountId()` 获取当前账号。
2. `create` 强制写入当前账号，忽略并覆盖调用方提供的 `accountId`。
3. `getById`、`update`、`remove` 必须同时匹配主键和当前账号；其他账号记录表现为 `NOT_FOUND`。
4. 列表和查询必须使用账号索引限定范围，不能先读取全库再由页面过滤。
5. 无有效 session 时在打开读写 transaction 前抛出 `AUTH_REQUIRED`。
6. 单据和合同写入前重新校验引用的货品、客户或供应商属于当前账号。
7. Repository 不暴露 `IDBDatabase`、`IDBTransaction`、object store 或原生 request 给页面和领域层。
8. 应用 use case 可通过 `TransactionRunner` 共享抽象 transaction；参与的 Repository 不得自行另开 transaction。

账号、凭据、迁移记录和整机设置不是账号业务 Repository，但必须通过专用 Auth/Platform Adapter 访问。

## 6. File Adapter 契约

File Adapter 接收稳定 `attachmentId`、`contractId`、文件元数据和 Blob，并且：

- 从当前 session 获取 `accountId`，不接受调用方指定归属。
- 元数据写入 `attachmentMetadata`，二进制写入 `attachmentBlobs`。
- 下载和删除同时校验 `attachmentId` 与当前账号。
- 合同保存、附件元数据和 Blob 共用调用方提供的 transaction。
- 删除合同或附件时，元数据与 Blob 同 transaction 删除。
- 失败时不得留下孤儿 Blob、空元数据或页面可见但不可下载的附件。
- 单文件 20 MB、Storage API 70% 提醒和 85% 阻断由任务 40 实现，写入前完成检查。

`contracts` 只保留附件 ID 或可展示的元数据引用，不再保存 `dataUrl`。

## 7. Transaction 矩阵

| 操作              | 模式                     | Store                                                     | 原子性要求                             |
| ----------------- | ------------------------ | --------------------------------------------------------- | -------------------------------------- |
| 新建/编辑进货单   | `readwrite`              | `purchaseOrders`、`inventoryLedger`、`inventorySnapshots` | 单据、流水、快照全部成功或全部回滚     |
| 新建/编辑出货单   | `readwrite`              | `salesOrders`、`inventoryLedger`、`inventorySnapshots`    | 差额回算与负库存流水全部成功或全部回滚 |
| 新建/编辑报价单   | `readwrite`              | `quoteOrders`                                             | 整单提交，禁止分行持久化               |
| 新建/编辑合同     | `readwrite`              | `contracts`、`attachmentMetadata`、`attachmentBlobs`      | 合同和全部新增/删除附件一致提交        |
| 删除合同          | `readwrite`              | `contracts`、`attachmentMetadata`、`attachmentBlobs`      | 不留孤儿附件                           |
| localStorage 迁移 | `readwrite`              | 业务 store、草稿、附件 store、`migrationRecords`          | 完整校验后才写完成标记，失败保留旧数据 |
| 普通单 store CRUD | `readonly` / `readwrite` | 对应 store                                                | Repository 仍强制账号上下文            |

事务回调中禁止等待网络请求、用户交互或与事务无关的异步任务，避免 transaction 自动失活。重试必须重新打开 transaction，并依赖稳定 ID、迁移幂等键和唯一索引阻止重复写入。

## 8. Schema 升级与迁移

1. 使用单调递增整数版本调用 `indexedDB.open("tradgio", version)`。
2. 只在 `onupgradeneeded` 的 `versionchange` transaction 中创建/调整 store 和索引。
3. 每个版本升级函数必须可从明确的上一版本执行，不允许跳过中间数据转换规则。
4. 升级 transaction 任一步失败必须 `abort`；浏览器会保留升级前版本。
5. 禁止以 `deleteDatabase` 作为升级、修复或重试手段。
6. `blocked` 时停止写入并提示关闭其他标签页；不得强制刷新正在编辑的页面。
7. 程序版本低于数据库版本时映射 `SCHEMA_TOO_NEW`，阻止写入并提示更新程序。
8. 升级失败映射 `SCHEMA_UPGRADE_FAILED`，应用进入只读阻断页；旧库不删除、不覆盖。
9. 高风险升级前由后续任务接入备份提示；升级成功后记录 migration ID、旧/新版本、记录统计、开始和完成时间。
10. 明文密码和结构化 localStorage 数据迁移已由任务 38-39 实现；Base64 附件迁移由任务 40 实现，成功前不得删除旧数据。

## 9. 错误模型

| 错误码                  | 典型来源                     | 处理                               |
| ----------------------- | ---------------------------- | ---------------------------------- |
| `AUTH_REQUIRED`         | session 缺失或损坏           | 终止操作并返回登录页               |
| `NOT_FOUND`             | ID 不存在或属于其他账号      | 不泄露其他账号记录是否存在         |
| `CONFLICT`              | 唯一索引冲突                 | 提示编号或用户名已存在，可安全重试 |
| `QUOTA_EXCEEDED`        | 浏览器容量不足               | transaction 回滚，提示备份和清理   |
| `SCHEMA_UPGRADE_FAILED` | versionchange 失败           | 保留旧库，阻止继续写入             |
| `SCHEMA_TOO_NEW`        | 旧程序打开新 schema          | 阻止写入并要求更新程序             |
| `TRANSACTION_ABORTED`   | request 失败、显式 abort     | 整体失败，不展示部分成功           |
| `STORAGE_UNAVAILABLE`   | IndexedDB 不可用或被策略禁用 | 阻止进入业务写入流程               |

原生 `ConstraintError`、`QuotaExceededError`、`VersionError`、`AbortError` 和打开失败只能在 infrastructure 层映射，页面不直接判断 DOMException 名称。

## 10. 账号隔离矩阵

| 能力                             | 账号来源                  | 隔离方式                                         |
| -------------------------------- | ------------------------- | ------------------------------------------------ |
| 基础资料、单据、库存、合同、草稿 | 当前 session              | Repository 强制 `accountId` + 账号索引           |
| 附件元数据与 Blob                | 当前 session              | File Adapter 强制 `accountId`，下载/删除双重校验 |
| 编号唯一性                       | 当前 session              | `[accountId, documentNo/contractNo]` 唯一索引    |
| 库存快照                         | 当前 session              | `[accountId, productId]` 唯一索引                |
| 搜索与总览                       | Repository 返回的账号切片 | 页面不跨 store 自行拼全库数据                    |
| 账号与密码校验数据               | Auth Adapter              | 不属于业务账号切片，不暴露给业务 Repository      |
| 备份                             | Backup Service            | 覆盖全部账号，但不包含活动 session               |

## 11. 关键场景走查

### 11.1 创建进货单

获取当前账号 -> 打开三个 store 的读写 transaction -> 校验供应商与货品归属 -> 生成账号内编号 -> 写整单 -> 写库存流水 -> 更新快照 -> transaction complete 后返回成功。任一步失败均不得存在单据或库存半成品。

### 11.2 编辑出货单

同一 transaction 读取旧单 -> 校验账号归属 -> 计算新旧差额 -> 更新整单 -> 追加差额流水 -> 更新快照。库存可为负，但必须与流水和单据同时提交。

### 11.3 保存合同与附件

获取当前账号 -> 容量与文件校验 -> 打开三个 store 的读写 transaction -> 写合同 -> 写附件元数据 -> 写 Blob -> transaction complete。失败时三个 store 均不产生新记录。

### 11.4 Schema 升级失败

打开新版本 -> `onupgradeneeded` 执行升级 -> 任一转换失败 -> abort versionchange transaction -> 映射升级错误 -> 阻止写入并保留旧版本数据库，绝不调用删除数据库。

## 12. 验收标准

- schema 声明覆盖全部约定 object store，名称无重复。
- 三类单据和合同具有账号内复合唯一索引。
- 库存快照具有账号与货品复合唯一索引。
- 单据库存、合同附件事务范围由自动化测试锁定。
- 所有业务与附件 store 标记为账号作用域。
- Repository/File Adapter、升级和错误边界可由后续任务直接实现，无需重新做平台决策。

## 13. 任务 39 实现记录

- `src/shared/query/indexedDbAdapter.ts` 实现账号隔离 CRUD，并使用 `byAccount` 索引读取当前账号切片。
- 进货、出货和报价保存使用真实 IndexedDB transaction；进货、出货将单据、流水和快照整批提交。
- 三类单据和合同编号由账号内复合唯一索引兜底，应用层保留可读冲突提示。
- `local-storage-business-data-v1` 在首次业务访问时迁移基础资料、单据、库存、合同记录和草稿，完成后写入记录统计。
- 迁移失败不写完成标记、不留下半迁移数据、不删除 localStorage 源数据；重复执行直接返回既有报告。
- 合同记录中的旧 Base64 附件已由任务 40 迁移到独立 Blob store，迁移失败时保留旧附件来源。

## 14. 任务 40 实现记录

- IndexedDB File Adapter 提供保存、元数据读取、下载和删除，并同时校验元数据与 Blob 的账号归属。
- 合同创建、追加附件、删除附件和删除合同覆盖 `contracts`、`attachmentMetadata`、`attachmentBlobs` 三个 store。
- 合同引用使用稳定 `attachmentId`，Blob 不进入合同 JSON 或附件元数据。
- Base64 迁移记录包含合同数、附件数和总字节数，重复执行不复制附件。
