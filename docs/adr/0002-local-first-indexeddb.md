# ADR-0002：IndexedDB 本地优先生产方案

- 状态：已接受
- 决策日期：2026-06-12
- 对应任务：任务 34 决策修订
- 取代：ADR-0001
- 决策范围：认证、业务数据、合同附件、备份恢复、部署、离线运行与版本更新

## 1. 背景

Tradgio 的实际使用场景是单人主用、单台 Windows 电脑长期运行、业务量和数据量较小，Mac 仅用于持续开发和发布。原 ADR-0001 选择的托管 Auth、云数据库、对象存储和服务端运行时具有更强的在线协作与灾难恢复能力，但成本和运维复杂度明显超过当前需求。

本决策优先满足：

- 无固定后端成本，核心业务可离线运行。
- Mac 发布新版本后，Windows 可通过固定 Origin 更新程序且保留业务数据。
- 保留本地多账号及账号级数据隔离。
- 结构化数据、合同附件、备份和升级具备明确的一致性与恢复边界。
- Repository、File Adapter 和 Export Service 保持可替换，未来仍可迁移到云端。

## 2. 决策

| 能力 | 选定方案 | 约束 |
|---|---|---|
| 应用形态 | React SPA + PWA | Windows 安装使用；离线可打开上一稳定版本 |
| 结构化数据 | IndexedDB | schema 版本化；通过 Repository 访问；关键写入使用 transaction |
| 本地认证 | 多账号 Local Auth | PBKDF2-SHA-256 + 随机盐；不保存明文密码 |
| 活动会话 | 浏览器本地 session | 不进入备份；退出后不可访问业务页 |
| 合同附件 | IndexedDB Blob | 元数据与 Blob 分离；统一通过 File Adapter 访问 |
| 备份 | 整机加密备份 | 包含全部账号、业务数据、附件和必要元数据，不包含活动 session |
| 加密 | Web Crypto | 压缩后使用 AES-256-GCM；备份密码每次手动输入且不落盘 |
| 导出 | 浏览器端 Export Service | ExcelJS 和模板按需加载，离线可用 |
| 发布 | 平台无关静态托管 | 正式使用前固定 HTTPS Origin；具体平台在任务 44 实测决定 |
| 更新 | Service Worker 提示式更新 | 不强制刷新正在编辑的页面；数据库迁移前提示备份 |

## 3. 系统拓扑

```text
Mac development
  -> Git / CI quality gate
  -> platform-independent static hosting
  -> fixed HTTPS Origin

Windows Chrome / Edge installed PWA
  -> Local Auth Adapter
  -> Repository / File Adapter / Export Service
  -> IndexedDB
       -> accounts and password verifiers
       -> business records and inventory
       -> attachment metadata and Blob objects
       -> schema and migration metadata
  -> Backup Service
       -> validate and serialize full database
       -> compress
       -> PBKDF2-derived AES-256-GCM encryption
       -> .tradgio-backup file
```

程序文件来自静态托管，正式业务数据只保存在 Windows 浏览器当前 Origin 的 IndexedDB 中。Mac 开发环境、预览域名和正式域名的数据完全隔离。

## 4. IndexedDB 数据与事务约束

- 数据库名称和正式 Origin 投入使用后保持稳定。
- schema 使用单调递增整数版本，不允许通过删除数据库完成升级。
- 账号、基础资料、三类单据、库存流水、库存快照、合同、附件元数据、附件 Blob、迁移记录和应用设置使用明确 object store。
- 所有业务实体保留 `accountId`；Repository 强制使用当前有效 session 的账号上下文。
- 账号内编号使用复合唯一索引，至少覆盖 `(accountId, documentNo)` 或 `(accountId, contractNo)`。
- 单据主记录、库存流水和库存快照必须在同一个读写 transaction 中提交；任一步失败整体回滚。
- 合同记录、附件元数据和附件 Blob 必须在同一个读写 transaction 中提交或整体失败。
- schema 升级失败时保留旧数据库，应用阻止继续写入并提示恢复或升级程序。

## 5. 本地多账号安全

- 注册时生成随机盐，使用 Web Crypto PBKDF2-SHA-256 派生密码校验值。
- 迭代次数、盐、摘要和算法版本随账号保存；具体参数由任务 35/38 固化并支持未来升级。
- 不保存明文密码、可逆密码或用于恢复密码的密钥。
- 现有 `tradgio_passwords` 明文数据只允许在用户成功输入原密码后迁移；迁移成功立即删除对应明文。
- 密码只用于本机账号解锁，不提供邮件找回。忘记密码无法解锁该账号数据。
- 本地多账号是同一 Windows 用户内的逻辑隔离，不等同于操作系统级安全边界；敏感环境仍应使用 Windows 账号、磁盘加密和锁屏。

## 6. 合同附件与容量

- 附件 Blob 与合同元数据分离存储，通过稳定 `attachmentId` 关联。
- 默认单文件上限为 20 MB；超过上限时保存前拒绝并提示。
- 使用 Storage API 获取 `usage` 与 `quota`；达到 70% 显示持续提醒，达到 85% 阻止继续写入附件和大体积数据。
- 浏览器不支持可靠容量查询时，仍执行单文件限制并提示用户立即备份和清理。
- 删除附件必须同时删除元数据和 Blob；失败不得留下页面可见但无法下载的半成品。
- 正式支持的浏览器限定为 Windows 最新稳定版 Chrome 或 Edge，不在无痕模式中使用。

## 7. 备份格式与恢复

备份文件扩展名为 `.tradgio-backup`，逻辑内容至少包含：

- 格式版本、应用版本、IndexedDB schema 版本、生成时间。
- 全部账号及密码校验数据。
- 全部业务 object store 数据。
- 全部附件元数据和 Blob 内容。
- 各集合记录数、附件总数、总字节数和完整性摘要。
- 不包含活动 session、草稿中的临时文件句柄或浏览器缓存。

处理顺序固定为：序列化与校验 -> 压缩 -> 使用备份密码派生密钥 -> AES-256-GCM 加密 -> 下载文件。备份密码不保存，遗忘后无法恢复。

恢复流程固定为：选择文件 -> 输入密码 -> 解密与解压 -> 校验版本、摘要和容量 -> 展示恢复预览 -> 用户确认 -> 自动生成恢复前快照 -> 整机替换 transaction -> 重开应用并执行数据核对。校验失败、容量不足或写入失败时，不修改现有正式数据。

## 8. PWA、发布与更新

- 构建产物保持纯静态，可部署到任意支持 HTTPS、固定域名和 SPA fallback 的托管平台。
- 任务 44 才根据 Windows 实测选择免费静态托管平台，本 ADR 不绑定供应商。
- 正式 Origin 一旦投入业务使用不得随意更换；更换 Origin 必须通过备份导出和新 Origin 恢复迁移。
- Service Worker 缓存 App Shell 与必要模板，断网时继续使用上一稳定版本。
- 检测到新版本时只显示更新提示，不立即接管并刷新正在编辑的页面。
- schema 变化或高风险升级时，更新提示必须要求先生成备份；迁移成功后记录应用版本、schema 版本和迁移结果。
- 发布失败不得删除上一稳定静态版本，任务 44 必须演练回滚。

## 9. 风险与处置

| 风险 | 影响 | 处置 |
|---|---|---|
| Windows 损坏、重装或浏览器站点数据被清除 | 全部业务数据丢失 | 备份提醒、至少两处副本、定期恢复演练 |
| 用户忘记备份密码 | 备份永久无法恢复 | 导出时二次确认并明确不可找回，不保存密码 |
| 免费托管在中国大陆访问不稳定 | 首次加载或更新失败 | PWA 保留上一稳定版本；平台选择前在目标 Windows 网络实测 |
| Origin 改变 | 新地址无法访问旧 IndexedDB | 固定正式域名；变更前导出备份并在新 Origin 恢复 |
| IndexedDB 容量不足 | 附件或写入失败 | 20 MB 单文件限制、70% 提醒、85% 阻断、容量预检 |
| schema 迁移失败 | 新版无法正常读取数据 | 版本化迁移、升级前备份、失败阻止写入、不删除旧库 |
| 本地账号不具备服务端安全边界 | 同一系统用户可尝试读取浏览器数据 | Windows 独立账号、磁盘加密、锁屏；明确产品安全边界 |
| 浏览器或平台停止支持相关 API | 应用功能受限 | Adapter 隔离、标准数据备份、Chrome/Edge 双浏览器验收 |

## 10. 退出与升级方案

- IndexedDB 数据通过版本化备份包导出，未来可转换并导入标准 PostgreSQL。
- Auth Adapter 保持稳定接口，未来可将本地账号映射到托管身份。
- File Adapter 使用附件 ID 和 Blob，不向业务层暴露 IndexedDB 细节，未来可切换对象存储。
- 静态构建不绑定托管供应商，可迁移平台并通过备份完成 Origin 迁移。
- 当出现多设备同步、多人并发、远程访问、无人值守备份或更高安全要求时，应新增 ADR 评估云端后端。

## 11. 后续约束

- 任务 35-46 按本地优先路线执行，不实施 Authing、PostgreSQL、对象存储或服务端 API。
- 任务 35 先定义 IndexedDB schema、索引、事务与版本升级契约，不直接开始迁移实现。
- 任务 36 定义备份包和恢复状态机后，任务 42 才实现完整备份恢复。
- 任务 38-40 必须分别完成认证、结构化数据和附件迁移，并保留失败回滚与幂等性证据。
- 每次只推进一个任务，完成自动验收、文档同步和 Git 提交后再进入下一任务。
