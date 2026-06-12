# ADR-0001：生产平台技术选型

- 状态：已被 ADR-0002 取代
- 决策日期：2026-06-11
- 取代日期：2026-06-12
- 取代记录：`docs/adr/0002-local-first-indexeddb.md`
- 对应任务：任务 34
- 决策范围：Auth、PostgreSQL、对象存储、部署平台、服务端运行时、导出运行时

## 1. 背景

Tradgio 是面向中国大陆用户的桌面优先 SPA。当前认证、业务数据和合同附件仍使用本地适配器，生产化需要在不破坏现有模块与 Adapter 边界的前提下，提供真实身份、事务数据库、私有附件存储和可部署的业务 API。

本决策必须满足：

- 中国大陆可稳定访问。
- 单据、库存流水和库存快照可在同一 PostgreSQL 事务中提交。
- 服务端从认证身份派生账号归属，客户端不能伪造 `accountId`。
- 合同附件使用私有对象存储和短时授权，不公开 Bucket。
- 页面层、领域层不直接依赖供应商 SDK。
- 开发、测试、生产环境相互隔离。
- 供应商故障时不伪造保存成功，不以客户端补偿替代数据库事务。

## 2. 决策

生产平台锁定为以下组合：

| 能力 | 选定方案 | 边界 |
|---|---|---|
| Auth | Authing 公有云，OIDC Authorization Code + PKCE | 浏览器只通过 Auth Adapter 使用公开客户端配置；FC 校验令牌并映射内部账号 |
| PostgreSQL | 阿里云 RDS PostgreSQL | 仅 FC 经同地域 VPC 内网访问；生产使用高可用系列 |
| 对象存储 | 阿里云 OSS 私有 Bucket | FC 校验账号归属后签发短时上传/下载 URL；数据库只保存元数据和存储键 |
| 业务 API | 阿里云函数计算 FC Web 函数 | 承载认证校验、Repository、事务、搜索、附件授权和迁移接口 |
| SPA 托管 | 阿里云 OSS 静态托管 + CDN | 中国内地节点启用前必须完成域名 ICP 备案 |
| 密钥管理 | 阿里云 KMS 凭据管家 + FC RAM 角色 | 服务端密钥不进入浏览器、仓库、构建产物或普通 CI 变量 |
| 导出运行时 | 浏览器端 Export Service | ExcelJS 与模板延迟加载；导出数据必须先经已鉴权 API 获取 |
| CI | 继续使用 GitHub Actions | 只负责质量门禁和部署编排，不保存长期阿里云主账号密钥 |

主地域使用阿里云中国内地同一地域，默认 `cn-hangzhou`。创建资源前若业务主体、备案接入或目标用户网络更适合其他内地地域，可整体改为同一候选地域，但 FC、RDS、OSS 必须同地域，不能分散部署。

## 3. 方案比较

评分为 1-5 分，5 分最佳。中国大陆访问稳定性是阻断项，低于 4 分的方案即使总分较高也不入选。

| 评估项 | 权重 | Authing + 阿里云 | Authing + 腾讯云 | Supabase + Vercel |
|---|---:|---:|---:|---:|
| 中国大陆访问稳定性 | 25% | 5 | 5 | 2 |
| 成本 | 15% | 4 | 3 | 4 |
| 开发复杂度 | 15% | 4 | 3 | 5 |
| PostgreSQL 事务能力 | 15% | 5 | 5 | 5 |
| 备份恢复 | 10% | 5 | 5 | 4 |
| 供应商锁定 | 10% | 3 | 3 | 4 |
| 运维负担 | 10% | 4 | 3 | 5 |
| 加权总分 | 100% | 88 | 80 | 78 |
| 结论 | - | 选定 | 可替代但不选 | 大陆稳定性不达标 |

### 3.1 选定原因

- 阿里云可在同一中国内地区域提供 RDS PostgreSQL、OSS、FC、CDN、KMS 和 VPC，减少跨云网络与权限编排。
- FC 官方支持经 VPC 访问 RDS PostgreSQL，符合业务 API 与数据库私网连接要求。
- OSS 默认私有对象可通过短时预签名 URL 上传下载，适合合同附件的授权模型。
- RDS PostgreSQL 提供自动备份、手动备份、逻辑备份和跨地域备份能力，后续可按任务 45 落实恢复演练。
- 当前导出已经在浏览器内完成模板 Excel 验收，继续客户端运行可避免引入不必要的服务端文件生成链路，并保持页面只依赖 Export Service。

### 3.2 弃选原因

Authing + 腾讯云具备同类能力，但本项目没有腾讯云既有资产；在当前公开资料下，阿里云的 FC 访问 RDS PostgreSQL、OSS 预签名 URL 和低用量资源包路径更直接。腾讯云保留为同架构替代供应商，不混用两家云资源。

Supabase + Vercel 的开发效率和一体化体验更好，PostgreSQL 兼容性也较强，但默认运行区域和函数节点不在中国大陆，中国大陆网络稳定性不可作为生产承诺，因此不满足本项目的阻断条件。它可用于海外版本，不用于当前生产环境。

不选择自建 PostgreSQL、MinIO、身份服务或常驻服务器。当前是单人业务系统，自建方案会显著增加补丁、备份、监控和安全运维负担。

## 4. 环境拓扑

```text
Browser
  -> Authing OIDC
  -> OSS + CDN hosted SPA
  -> FC Web API
       -> Authing JWKS validation
       -> RDS PostgreSQL through VPC
       -> OSS private bucket through RAM role
       -> KMS Secrets Manager

Browser Export Service
  -> authenticated API data
  -> lazily loaded public template asset
  -> local print/xlsx generation
```

| 环境 | Auth | SPA / API | 数据库 | 对象存储 | 约束 |
|---|---|---|---|---|---|
| 开发 | 独立 Authing 开发应用；默认仍可使用本地 Auth Adapter | 本地 Vite；需要集成时连接开发 FC | 独立开发实例或数据库 | 独立开发 Bucket | 可清空，不含生产数据 |
| 测试 | 独立 Authing 测试应用与用户池 | 独立测试域名、OSS/CDN、FC | 独立测试 RDS | 独立测试 Bucket | CI/E2E 使用脱敏和可清理数据 |
| 生产 | 独立 Authing 生产应用与用户池 | 备案生产域名、OSS/CDN、FC | 高可用 RDS | 独立生产 Bucket | 禁止与开发、测试共享身份、数据或密钥 |

环境隔离至少落实到独立 Authing 应用、独立数据库、独立 Bucket、独立 FC 服务和独立 KMS 凭据。生产资源使用单独 RAM 角色与最小权限策略。

## 5. 成本估算

以下为 2026-06-11 的预算区间，不是采购报价。实际费用受地域、活动价格、实例系列、流量、短信和备份保留策略影响，创建资源前必须通过官方价格计算器复核。

假设：单人低频业务、数据库小于 20 GB、附件小于 50 GB、每月公网流量小于 20 GB、无短信登录、无高并发。

| 环境 | 月度预算 | 主要构成 |
|---|---:|---|
| 开发 | ¥0-100 | 本地运行；少量开发 FC、OSS 和共享开发数据库成本 |
| 测试 | ¥100-350 | 基础 RDS、FC、OSS/CDN，Authing 开发或基础额度 |
| 生产 | ¥450-800 | Authing 基础版约 ¥139/月、高可用 RDS、FC、OSS/CDN、KMS 与备份余量 |
| 合计 | ¥550-1,250/月 | 不含域名、ICP 服务、短信、人工运维和异常流量 |

成本控制规则：

- 不以免费额度作为生产可用性承诺。
- RDS 优先购买满足高可用与备份要求的最小规格，不因促销直接锁定长期规格。
- OSS 按实际容量与流量计费，附件设置生命周期前必须确认业务保留要求。
- FC 设置预算告警、并发上限、超时和日志保留期。
- 导出保留在客户端，避免为低频模板导出长期持有额外计算资源。

## 6. 安全与密钥管理

- 浏览器使用 OIDC Authorization Code + PKCE，不包含 Authing 客户端密钥、RDS 密码、OSS AccessKey 或 KMS 凭据。
- FC 必须校验令牌签发方、受众、签名和有效期，并通过稳定的 Authing subject 映射内部 `accountId`。
- RDS 关闭公网访问，仅允许同 VPC 的 FC 网段访问。
- FC 使用 RAM 角色访问 OSS 和 KMS，不使用代码内 AccessKey。
- OSS Bucket 保持私有，上传和下载 URL 必须短时有效、限制对象键，并在签发前校验账号归属。
- 敏感服务端配置进入 KMS；普通非敏感运行配置可使用 FC 加密环境变量。
- GitHub Actions 后续部署优先使用短期身份或受限部署凭据，不保存主账号长期密钥。
- 日志禁止记录密码、完整令牌、附件内容、预签名 URL 和不必要的业务明细。

## 7. 备份与恢复方向

- 生产 RDS 开启自动备份，基线保留不少于 7 天；任务 45 再确定最终 RPO、RTO、跨地域备份和恢复演练频率。
- 每次生产数据库迁移前创建可恢复备份，并验证回滚路径。
- 定期生成标准 PostgreSQL 逻辑备份，保证可迁出到其他 PostgreSQL 服务。
- 生产 OSS 开启版本控制；删除操作保留可追踪元数据，生命周期策略不得自动删除仍被合同引用的对象。
- Authing 身份与内部账号只通过稳定外部 subject 关联，业务数据不依赖供应商私有用户表结构。

## 8. 服务降级

| 故障 | 系统行为 |
|---|---|
| Authing 不可用 | 已有未过期会话可在服务端缓存 JWKS 有效期内继续校验；禁止新登录，令牌过期后安全退出 |
| FC 或 RDS 不可用 | 页面显示服务不可用；禁止本地伪造保存成功或排队写入生产数据 |
| OSS 上传不可用 | 合同创建不落半成品记录；保留用户表单状态并允许重试 |
| OSS 下载不可用 | 合同元数据仍可查看，附件区域显示可重试错误 |
| CDN 不可用 | 通过已备案的 OSS 源站应急域名或上一稳定静态版本恢复，具体切换在任务 44 演练 |
| 客户端导出失败 | 不影响已保存单据；显示导出错误并允许重试 |

## 9. 退出方案

- Auth：Auth Adapter 只依赖 OIDC 语义；迁移时导出身份映射，以新供应商 subject 更新映射，不改变业务表账号主键。
- Database：坚持标准 PostgreSQL、SQL migration 和 `pg_dump`，不依赖无法迁移的专有数据模型。
- Storage：File Adapter 保存逻辑存储键而非永久公开 URL；可批量复制对象并重写存储提供方配置。
- API：FC 入口保持标准 HTTP Node.js 服务形态，避免把业务规则写入厂商触发器，可迁移到容器或其他函数平台。
- SPA：Vite 静态产物可部署到任意静态托管平台。
- Export：浏览器端 Export Service 与云供应商无关，模板资产可随 SPA 迁移。

触发迁移评估的条件包括：中国大陆访问连续不达标、年度成本超出同等方案 30%、关键能力停服、备份恢复无法满足目标或供应商合规条件变化。

## 10. 风险清单

| 风险 | 影响 | 处置 |
|---|---|---|
| 中国内地域名未备案 | CDN 和自定义域名无法按计划上线 | 任务 44 前完成主体、域名和 ICP 备案 |
| Authing 与阿里云双供应商故障面 | 登录与业务 API 可能分别故障 | 保持 OIDC Adapter、JWKS 缓存和明确降级，不跨云直连数据库 |
| FC 冷启动或数据库连接耗尽 | API 延迟、事务失败 | 使用连接池/代理评估、并发上限、超时和压测，在任务 39 验证 |
| 浏览器端 ExcelJS 包体较大 | 首屏变慢 | 动态导入 ExcelJS 和模板，仅在用户触发导出时加载 |
| 预签名 URL 泄露 | 有效期内附件可被访问 | 短有效期、对象键随机化、日志脱敏、签发前校验归属 |
| 促销价失效 | 预算上升 | 采购前按正式价复核，设置月度预算告警 |
| 客户端持有令牌 | XSS 后令牌风险 | CSP、依赖审计、避免持久化长期令牌、缩短有效期，后续任务落实 |

## 11. 后续约束

- 任务 35 必须基于标准 PostgreSQL 定义 schema、事务、唯一约束和账号权限，不直接使用客户端数据库 SDK。
- 任务 37 才定义环境变量和远程 Adapter 契约；本任务不引入 SDK 或 `.env` 文件。
- 任务 38-41 的实现必须遵循本 ADR，变更供应商或导出运行时需新增 ADR，不得直接改写本记录。
- 任务 44 必须验证中国内地测试域名、备案、部署和回滚流程。
- 任务 45 必须完成 RDS 与 OSS 的真实备份恢复演练。

## 12. 官方资料

- Authing 价格：<https://www.authing.cn/pricing>
- Authing OIDC / 使用指南：<https://docs.authing.cn/v2/guides/>
- 阿里云 RDS PostgreSQL：<https://www.aliyun.com/product/rds/postgresql>
- RDS PostgreSQL 自动与手动备份：<https://help.aliyun.com/zh/rds/apsaradb-rds-for-postgresql/back-up-an-apsaradb-rds-for-postgresql-instance>
- RDS PostgreSQL 跨地域备份：<https://help.aliyun.com/zh/rds/apsaradb-rds-for-postgresql/use-the-cross-region-backup-feature-for-an-apsaradb-rds-for-postgresql-instance>
- FC 访问 RDS PostgreSQL：<https://help.aliyun.com/zh/functioncompute/fc/user-guide/access-the-rds-postgresql-database>
- FC 计费：<https://help.aliyun.com/zh/functioncompute/fc/product-overview/billing-fc/>
- FC 环境变量加密：<https://help.aliyun.com/zh/functioncompute/fc/user-guide/environment-variables>
- OSS 计费：<https://help.aliyun.com/zh/oss/billing/>
- OSS 预签名上传：<https://help.aliyun.com/zh/oss/user-guide/upload-files-using-presigned-urls>
- OSS 预签名下载：<https://help.aliyun.com/zh/oss/developer-reference/download-using-a-presigned-url>
- 中国内地网站 ICP 备案：<https://help.aliyun.com/zh/icp-filing/basic-icp-service/product-overview/icp-filing-application-for-enterprises-outside-the-chinese-mainland>
- Supabase 价格：<https://supabase.com/pricing>
- Supabase 备份：<https://supabase.com/docs/guides/platform/backups>
- Vercel 区域：<https://vercel.com/docs/regions>
- 腾讯云 PostgreSQL 计费：<https://cloud.tencent.com/document/product/409/49577>
- 腾讯云 PostgreSQL 备份：<https://cloud.tencent.com/document/product/409/33945>
- 腾讯云 COS 计费：<https://cloud.tencent.com/document/product/436/16871>
- 腾讯云 SCF 计费额度：<https://cloud.tencent.com/document/product/583/12282>
