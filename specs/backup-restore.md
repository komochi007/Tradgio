# 整机加密备份与恢复契约

## 1. 目标与范围

本规格对应任务 36，锁定 `.tradgio-backup` v1 的文件结构、序列化、压缩、加密、完整性、兼容性、恢复状态机和核对规则。任务 42 按本契约实现 Backup Service 与恢复界面，本任务不读取或替换真实 IndexedDB 数据。

备份目标：

- 覆盖全部本地账号、密码校验数据、业务数据、库存、合同、附件和必要平台元数据。
- 不包含活动 session、浏览器缓存、派生密钥、备份密码和临时文件句柄。
- 能在固定 Origin 变更、电脑迁移、浏览器重装或数据损坏后整机恢复。
- 错误密码、篡改、不兼容版本、容量不足和恢复写入失败均不能破坏现有数据。

## 2. 文件与容器格式

文件扩展名固定为 `.tradgio-backup`，v1 使用二进制容器：

```text
4 bytes  headerLength（无符号大端整数）
N bytes  UTF-8 canonical JSON header
剩余     AES-256-GCM ciphertext（包含 128-bit authentication tag）
```

包头不包含业务数据，可用于选择算法和做初步版本判断。包头规范化后的 UTF-8 字节必须作为 AES-GCM `additionalData`，因此修改版本、时间、盐、IV 或算法参数都会导致解密失败。

canonical JSON 规则：对象键按 Unicode code point 升序排列；数组保持原顺序；数字使用 JSON 有限数值表示；禁止 `undefined`、`NaN`、`Infinity` 和重复键；UTF-8 编码不带 BOM。

### 2.1 明文包头

```ts
type BackupEnvelopeHeader = {
  magic: "TRADGIO_BACKUP";
  formatVersion: 1;
  applicationVersion: string;
  schemaVersion: number;
  createdAt: string;
  serialization: "json-utf8";
  compression: "gzip";
  kdf: {
    name: "PBKDF2";
    hash: "SHA-256";
    iterations: 600000;
    saltBase64: string;
  };
  cipher: {
    name: "AES-GCM";
    keyLength: 256;
    ivBase64: string;
    tagLength: 128;
  };
};
```

盐必须由 `crypto.getRandomValues` 每次生成 16 bytes，IV 每次生成 12 bytes，同一密钥下绝不复用 IV。盐和 IV 可以明文保存；密码、派生后的 `CryptoKey` 和任何可逆恢复密钥不得落盘或写日志。

### 2.2 加密负载

解密并 gzip 解压后得到 UTF-8 JSON：

```ts
type BackupArchive = {
  manifest: BackupManifest;
  stores: BackupStoreData;
};
```

`stores` 必须覆盖任务 35 定义的全部 15 个 object store。普通记录使用 JSON 数据；`attachmentBlobs` 的每项包含 `id`、`accountId`、MIME、原始 byte 长度、SHA-256 和 Base64 字节。Blob 的 Base64 开销会被整体 gzip 部分抵消，v1 优先保证标准 API 可实现和格式可审计。

记录必须按 store 名升序输出；每个 store 内按主键稳定排序。这样相同数据可以产生稳定摘要，便于恢复前后核对。

## 3. Manifest 与完整性

Manifest 至少包含：

- 备份格式版本、应用版本、IndexedDB schema 版本、生成时间。
- 每个 store 的记录数、序列化 byte 数和 SHA-256。
- 附件数量和原始总 byte 数。
- 进货、出货、报价合计金额（整数分）和库存快照数量合计。
- 对规范化 `stores` 整体计算的 SHA-256。

生成顺序：

1. 在一致性只读快照中读取全部 store。
2. 校验记录可序列化、账号引用和附件元数据/Blob 一一对应。
3. 稳定排序并生成逐 store 统计与摘要。
4. 对完整 `stores` 计算 `contentSha256`。
5. 组成 archive、canonical JSON 序列化、gzip 压缩。
6. 使用包头作为 `additionalData` 执行 AES-256-GCM 加密。
7. 组装二进制容器并触发下载。

AES-GCM authentication tag 用于验证密文和包头未被篡改；Manifest 摘要用于解密后核对逻辑内容、附件和恢复结果。两者缺一不可。

## 4. 密钥派生与密码规则

v1 固定参数：

| 项目 | 参数 |
|---|---|
| KDF | PBKDF2 |
| PRF | HMAC-SHA-256 |
| 迭代次数 | 600,000 |
| 盐 | 16 bytes 随机值 |
| 输出密钥 | AES 256-bit，不可导出 `CryptoKey` |
| 加密 | AES-GCM |
| IV | 12 bytes 随机值 |
| Tag | 128 bit |

备份密码规则：

- 最少 12 个 Unicode 字符，允许并鼓励使用长密码短语。
- 创建备份时输入两次，内存中仅保留本次操作所需时间。
- 不写入 IndexedDB、localStorage、sessionStorage、日志、错误上下文或恢复报告。
- 忘记密码无法找回，界面必须在下载前明确提示并要求确认。
- 参数随包保存。未来提高迭代次数时新增参数版本，旧包继续按自身参数解密，禁止静默重写旧备份。
- 正式实现需在目标 Windows Chrome/Edge 校准性能；如 600,000 次超过可接受时必须新增 ADR，不得私自降低 v1 参数。

参数依据：NIST SP 800-132 规定密码派生主密钥的 PBKDF2 模型；Web Crypto 规范提供 PBKDF2 与 AES-GCM；OWASP 当前对 PBKDF2-HMAC-SHA-256 给出 600,000 次基线。

## 5. 兼容策略

恢复前按以下顺序判断：

1. 文件扩展名和容器长度合法。
2. `magic` 必须为 `TRADGIO_BACKUP`。
3. `formatVersion` 必须等于当前支持版本 1；更低或更高均拒绝，不猜测格式。
4. 包头算法和参数必须属于 v1 允许集合。
5. 输入密码后执行 AES-GCM 解密；错误密码或任何篡改统一表现为“密码错误或文件已损坏”。
6. 解压和 JSON 解析成功。
7. Manifest 与包头的格式、应用、schema 和时间信息一致。
8. 备份 schema 不得高于当前应用支持版本；低版本只能通过已登记的迁移链升级。
9. 所有 store、主键、账号引用、记录统计和摘要校验成功。
10. 容量预检通过后才展示恢复预览。

不允许旧程序写入更高 schema 的数据。无法识别的未来备份必须提示升级应用。

## 6. 容量预检

使用 `navigator.storage.estimate()` 获取 `usage` 和 `quota`。v1 采用保守工作空间估算：

```text
requiredWorkingBytes =
  incomingArchiveUncompressedBytes
  + max(currentDatabaseBytes, incomingArchiveUncompressedBytes) * 20%
  + 16 MiB

projectedUsageRatio = (usage + requiredWorkingBytes) / quota
```

- `quota` 不可用或为 0 时禁止自动恢复，提示清理空间并更换受支持浏览器重试。
- 预计使用率达到或超过 85% 时，在写入前阻断恢复。
- 容量通过只是预检；实际 transaction 的 `QuotaExceededError` 仍必须整体回滚。

## 7. 恢复状态机

```text
selecting-file
-> entering-password
-> decrypting
-> validating
-> previewing
-> confirming
-> creating-snapshot
-> restoring
-> verifying
-> completed
```

任一阶段可进入 `failed`。只有 `restoring` 阶段允许修改正式 IndexedDB。

阶段要求：

- `decrypting`：错误密码和篡改在此失败，不访问正式数据库写事务。
- `validating`：完成格式、schema、摘要、引用和容量检查。
- `previewing`：展示来源版本、生成时间、账号数、逐 store 记录数、金额、库存、附件数和大小。
- `confirming`：明确提示“整机替换全部本地账号和数据”，要求二次确认。
- `creating-snapshot`：用本次恢复密码生成当前数据库的加密备份，文件名追加 `.pre-restore`；确认下载成功后才能继续。
- `restoring`：在覆盖全部 store 的单个读写 transaction 中先清空再写入；任一步失败自动 abort。
- `verifying`：重新读取数据库，核对记录数、金额、库存、附件数、附件 byte 数和摘要。
- `completed`：写恢复报告，清除活动 session，要求重新登录并重开应用。

恢复前快照同样遵循本规格，使用新的随机盐和 IV。它不得只存在内存或 IndexedDB 中，必须成功下载到用户选择的文件位置。

## 8. 失败与回滚

| 失败 | 正式数据处理 |
|---|---|
| 文件损坏、错误密码、GCM tag 失败 | 不打开写 transaction |
| 格式/schema 不兼容 | 不打开写 transaction |
| 摘要、统计、引用或附件不一致 | 不打开写 transaction |
| 容量不足或容量未知 | 不打开写 transaction |
| 用户取消或恢复前快照下载失败 | 不打开写 transaction |
| 整机替换 request 失败 | abort transaction，保持恢复前数据库 |
| transaction 完成后核对失败 | 立即阻止业务写入，提示使用已下载的恢复前快照执行恢复 |

IndexedDB transaction 完成后无法跨 transaction 自动回滚，因此恢复后核对失败属于严重错误。实现必须在同一替换 transaction 内完成所有可执行结构校验，并保留恢复前快照作为最终恢复手段。

## 9. 恢复报告

报告不得包含密码、盐以外的密钥材料、附件内容或完整业务记录。至少记录：

- 恢复开始/完成时间、应用版本、来源格式和 schema 版本。
- 来源备份文件名与整体 SHA-256。
- 恢复前快照文件名与下载确认结果。
- 各 store 恢复记录数、附件数量/大小、金额和库存核对结果。
- 成功或失败阶段、无敏感信息的错误码。

## 10. 脱敏迁移演练设计评审

任务 36 使用双账号脱敏样本走查：2 个账号、3 个货品、进货/出货/报价金额、库存合计 42、1 个 1 KiB PDF 附件。

| 场景 | 预期 |
|---|---|
| 正确包头与支持版本 | 可进入解密和预览 |
| 旧/未来格式版本 | 写入前拒绝 |
| 高于当前的 schema | 写入前拒绝并提示升级应用 |
| 错误密码或篡改 | GCM 解密失败，正式数据不变 |
| 预计容量达到 85% | 预检阻断，正式数据不变 |
| 正常预览 | 显示 2 个账号、记录统计、金额、库存 42、1 个附件/1024 bytes |
| 跳过预览或快照 | 状态机拒绝进入 restoring |
| 替换 transaction 失败 | transaction abort，正式数据保持原状 |
| 恢复成功 | 记录数、金额、库存和附件摘要全部一致，活动 session 不恢复 |

自动化契约测试用于锁定这些设计条件；真实加解密、下载、IndexedDB transaction 和 Windows 恢复演练由任务 42、43、46 完成。

## 11. 标准依据

- [NIST SP 800-132](https://csrc.nist.gov/pubs/sp/800/132/final)
- [W3C Web Cryptography Level 2](https://www.w3.org/TR/webcrypto-2/)
- [MDN SubtleCrypto.deriveKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
