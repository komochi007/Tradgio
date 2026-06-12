# 本地 Platform Adapter 与 PWA 更新契约

## 1. 目标与范围

本规格对应任务 37，锁定页面、应用用例与浏览器本地能力之间的稳定接口。任务 38-42 分别实现安全认证、IndexedDB Repository、附件 Blob、离线导出和备份恢复；任务 44 才接入真实 PWA 构建、缓存和部署。

本任务只定义接口、运行配置、错误映射、更新状态机和测试替身，不注册 Service Worker，不安装 PWA 插件，不迁移真实数据。

## 2. 依赖边界

```text
Page / Component
-> Application Use Case
-> PlatformAdapterRegistry
   -> AccountContextAdapter
   -> LocalAuthAdapter
   -> DataAdapterFactory / TransactionRunner
   -> LocalFileAdapter / StorageAdapter
   -> CryptoAdapter / BackupAdapter
   -> LocalExportAdapter
   -> MigrationAdapter
   -> PwaUpdateAdapter
-> Browser APIs
   -> IndexedDB / Web Crypto / Storage API / Service Worker
```

页面和领域层禁止直接引用：

- `indexedDB`、`IDBDatabase`、`IDBTransaction` 或 object store。
- `crypto.subtle`、备份密码派生密钥或原始加密参数。
- `navigator.storage`、容量阈值和持久化请求。
- `navigator.serviceWorker`、`ServiceWorkerRegistration`、waiting worker 或 `skipWaiting` 消息。
- 附件 Blob store、Cache Storage 或模板缓存。

## 3. 通用调用契约

所有可能等待浏览器 I/O 的 Adapter 方法接收 `AdapterOperationOptions`：

```ts
type AdapterOperationOptions = {
  signal?: AbortSignal;
  transaction?: PersistenceTransaction;
};

type TransactionalOperationOptions = AdapterOperationOptions & {
  transaction: PersistenceTransaction;
};
```

规则：

- 调用前若 `signal.aborted`，必须在任何写入、副作用或下载前抛出 `AbortError`。
- 操作期间收到 abort 时，应停止尚未开始的工作；已打开的 IndexedDB 写 transaction 必须 `abort()`。
- 取消不等于失败重试，不显示“保存失败”类 Toast；统一映射为 `OPERATION_ABORTED`。
- transaction 由应用 use case 创建并传给参与 Adapter；参与者不得自行另开写 transaction。
- `LocalFileAdapter.save/remove` 在类型层强制接收 `TransactionalOperationOptions`，不能脱离合同事务写 Blob。
- transaction 回调内禁止等待网络、用户确认或与本次事务无关的异步任务。
- Adapter 不在日志中记录密码、派生密钥、Blob 内容、完整业务记录或活动 session。

## 4. Adapter 接口矩阵

代码契约位于 `src/shared/platform/types.ts`。

| Adapter | 职责 | 账号边界 | 事务边界 |
|---|---|---|---|
| `AccountContextAdapter` | 从有效 session 获取当前账号 | 唯一账号来源 | 无 session 时在打开业务事务前失败 |
| `LocalAuthAdapter` | 注册、登录、退出、会话恢复、旧明文凭据迁移 | 管理账号与 session | 密码校验数据写入独立 Auth transaction |
| `DataAdapterFactory` | 按 store 创建 Repository | 所有 CRUD 强制当前账号 | 支持接收 use case 提供的 transaction |
| `TransactionRunner` | 统一创建 readonly/readwrite transaction | 不接受页面指定账号 | 单据库存、合同附件和整库恢复按契约组合 store |
| `LocalFileAdapter` | 附件元数据和 Blob 保存、读取、删除 | 下载/删除同时校验当前账号 | 合同保存和删除必须使用调用方 transaction |
| `StorageAdapter` | 查询 usage/quota/persisted 并请求持久化 | 整机能力 | 只做写入前预检，不替代 transaction 回滚 |
| `CryptoAdapter` | 随机数、SHA-256、备份加解密 | 不处理账号授权 | 密钥不导出、不落盘 |
| `BackupAdapter` | 整机备份、预览和恢复编排 | 备份覆盖全部账号，不含 session | 恢复使用全 store 替换 transaction |
| `LocalExportAdapter` | 打印/表格文件生成 | payload 必须来自当前账号 Repository | 导出失败不改变业务 transaction |
| `MigrationAdapter` | 查看和执行版本化迁移 | 迁移记录覆盖整库 | 失败保留旧数据，完成后才写幂等标记 |
| `PwaUpdateAdapter` | 注册、检查、订阅 waiting 更新、显式激活 | 无业务账号数据 | 不在更新回调中迁移数据库 |

Adapter 注册表由应用 composition root 创建。页面只依赖应用用例；测试可通过 `replacePlatformAdapter` 替换单个能力，或通过 `createPlatformAdapterTestRegistry` 只配置当前测试所需能力。

## 5. 运行配置

运行配置必须包含：

| 配置 | 规则 |
|---|---|
| `environment` | `development`、`test` 或 `production` |
| `appVersion` | 每次发布的可追踪版本，不得为空 |
| `schemaVersion` | 与代码支持的 IndexedDB schema 正整数一致 |
| `expectedOrigin` | 生产环境固定 HTTPS Origin，任务 44 实测后写入 |
| `currentOrigin` | 来自 `window.location.origin`，用于启动兼容检查 |
| `serviceWorkerPath` | 同源绝对路径，例如 `/sw.js`；拒绝 `//host/path` 协议相对地址 |

生产环境缺少固定 Origin、当前 Origin 不匹配、数据库版本缺失、低于待迁移版本或高于应用支持版本时，应用必须进入写入阻断状态。数据库缺失可由受控初始化/迁移流程创建，不能让普通页面绕过检查直接写入。

构建变量只允许非敏感配置：

```text
VITE_APP_ENV
VITE_APP_VERSION
VITE_EXPECTED_ORIGIN
VITE_SERVICE_WORKER_PATH
```

密码、备份密码、盐、密钥、session 和业务数据不得进入 `.env` 或构建产物。

## 6. 错误模型

代码契约位于 `src/shared/platform/errors.ts`。原生异常只能在 infrastructure 层判断，应用层消费稳定错误码。

| 错误码 | 来源与处理 |
|---|---|
| `OPERATION_ABORTED` | 用户取消或 AbortSignal；不显示失败警告，不重试副作用 |
| `AUTH_REQUIRED` | session 缺失；终止业务操作并回登录页 |
| `STORAGE_UNAVAILABLE` | IndexedDB/Storage API 不可用；阻止业务写入 |
| `QUOTA_EXCEEDED` | 容量不足；transaction 回滚并提示备份清理 |
| `DATABASE_VERSION_MISSING` | 未初始化；只允许受控初始化或迁移 |
| `DATABASE_MIGRATION_REQUIRED` | 数据库低于代码 schema；只允许受控迁移，普通页面禁止写入 |
| `DATABASE_VERSION_TOO_NEW` | 旧程序打开新库；阻止写入并提示更新 |
| `SCHEMA_UPGRADE_FAILED` | schema 升级失败；保留旧库并阻止写入 |
| `TRANSACTION_ABORTED` | 写事务失败；整体失败，不展示部分成功 |
| `CRYPTO_UNAVAILABLE` | Web Crypto 不可用；阻止安全认证或备份 |
| `BACKUP_INVALID` | 包结构、摘要或引用不合法；恢复前失败 |
| `BACKUP_PASSWORD_OR_INTEGRITY_FAILED` | 错误密码或 GCM 校验失败；不区分具体原因 |
| `BACKUP_VERSION_UNSUPPORTED` | 格式或 schema 不兼容；提示更新程序 |
| `UPDATE_UNAVAILABLE` | 注册/检查更新失败；继续使用当前稳定版本 |
| `UPDATE_ACTIVATION_FAILED` | waiting worker 激活失败；不刷新页面 |

`AbortError`、`QuotaExceededError`、`VersionError` 等 DOMException 通过 `mapPlatformError` 映射。错误上下文不得携带敏感参数。

## 7. PWA 更新状态机

Service Worker 官方生命周期允许新 worker 安装后进入 waiting。Tradgio 不自动调用 `skipWaiting`，不自动刷新打开页面。

```text
idle
-> checking
-> installing
-> update-ready
-> activating
-> reload-ready
```

其他状态：

- `unsupported`：浏览器不支持 Service Worker，正式环境阻止 PWA 发布验收。
- `activation-blocked`：存在未保存内容，或高风险/schema 更新尚未完成备份。
- `deferred`：用户选择稍后更新，保留 waiting 候选和当前页面状态。
- `error`：注册、检查或激活失败，当前稳定版本继续运行。

规则：

1. `updatefound` 只进入 `installing`；worker 成为 waiting 后才进入 `update-ready`。
2. 更新提示展示当前/下一应用版本、schema 版本和风险级别。
3. 任一录单/表单存在未保存内容时，不允许激活 waiting worker。
4. schema 变化或 `risk=high` 时，必须先完成任务 36 格式的加密备份。
5. schema 降级视为不兼容更新，禁止激活。
6. 用户明确点击更新后，Adapter 才向 waiting worker 发送激活请求。
7. `controllerchange` 后进入 `reload-ready`，只提示用户手动刷新；`shouldReloadAutomatically()` 固定为 `false`。
8. 用户取消更新时保留 waiting worker 和当前页面状态，后续可再次提示。
9. 更新检查失败不卸载当前 Service Worker，不清理当前缓存，不影响业务数据。
10. 数据库迁移在新页面启动兼容检查后执行，不在 Service Worker install/activate 事件中执行。

## 8. 缓存与离线边界

任务 37 只锁定方向，任务 41/44 实现：

- App Shell、字体、图标和必要静态资源进入版本化 precache。
- HTML 导航采用网络优先并回退上一稳定 App Shell。
- 固定 Excel 模板进入可控缓存；ExcelJS 和模板按需加载，不进入首屏必要 chunk。
- IndexedDB 业务数据和附件 Blob 不进入 Cache Storage。
- Service Worker 不缓存备份文件、用户导出文件、密码或 session。
- 激活新缓存前保留当前稳定缓存；发布失败可恢复上一静态版本。

## 9. 模拟 Adapter 演练

自动化测试覆盖：

- 生产环境必须配置固定 HTTPS Origin。
- Origin 不匹配、数据库缺失、待迁移和数据库版本过新时阻止写入。
- 未保存表单阻止激活更新。
- schema/高风险更新要求先备份，schema 降级被拒绝。
- waiting worker 只能经显式操作激活，controller 改变后仍不自动刷新。
- Adapter 订阅可取消，AbortSignal 在副作用前终止操作。
- DOMException 映射为稳定错误码。
- 注册表中的 Adapter 可替换为测试替身。

## 10. 标准依据

- [W3C Service Workers](https://www.w3.org/TR/service-workers/)
- [MDN Service Worker 生命周期](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [W3C Web Cryptography Level 2](https://www.w3.org/TR/webcrypto-2/)
- [Storage Standard](https://storage.spec.whatwg.org/)
