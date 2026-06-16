# 任务 46 验收记录：Windows 迁移、升级与正式上线验收

日期：2026-06-16

## 1. 结论

任务 46 已完成一次上线门禁评估，并补齐目标 Windows 恢复与人工核对证据；用户已确认正式 Origin、首版 schema 策略和上线窗口，当前进入上线前最终复验。

本次自动化验收确认质量门禁、核心 E2E、备份恢复 E2E、localStorage 到 IndexedDB 迁移 E2E、PWA 更新和静态回滚均通过；并补充验证 PWA 更新与回滚后 IndexedDB 业务数据仍可读取。

目标 Windows Chrome/Edge 全新浏览器配置恢复、关键业务核对和导出人工确认已于 2026-06-16 补证通过。正式地址继续使用 `https://komochi007.github.io/Tradgio/`，本次不发生 Origin 变更；首版上线继续使用 IndexedDB schema `1`，同 schema 更新不破坏数据已通过 PWA 自动化复验。正式上线窗口为 2026-06-17 10:00（Asia/Shanghai）。

## 2. 本次交付物

- PWA 发布回滚测试已增加业务数据保持断言：创建货品后，安全更新和静态回滚激活后仍能在货品列表读取同一条 IndexedDB 数据。
- 生产就绪清单已记录任务 46 进入上线前最终复验，Origin 变更项本次标记为不适用。
- 开发进度、生产路线图、README 和部署文档已同步当前运行状态。
- 目标 Windows Chrome/Edge 恢复演练记录已补充到任务 45 和生产就绪清单。

## 3. 自动验收

- `npm run test:pwa`：通过，1 条 PWA 发布流程通过；覆盖离线启动、安全更新、编辑页阻断、静态回滚，以及更新/回滚后业务数据保持。
- `npm run quality`：通过，12 个测试文件、99 项测试通过，生产构建成功，依赖审计 0 个漏洞。
- `npm run test:e2e`：通过，5 条 Playwright 流程通过；覆盖核心业务链路、整机加密备份恢复、两次本地生产迁移演练和离线模板错误提示。
- Windows 手动补证落档后复验：`npm run quality`、`npm run test:e2e`、`npm run test:pwa` 均通过。
- 2026-06-16 同 schema 更新复验：`npm run test:pwa` 通过，确认 schema `1` 下安全更新和静态回滚后 IndexedDB 货品数据仍可读取。

## 4. 版本与回滚记录

- 应用版本：`0.1.0`
- IndexedDB schema 版本：`1`
- 本次评估基线：本次任务 46 提交
- 当前线上 Pages 发布基线：`14a6ce8328a925998a6a3024143582bc2096bb90`
- 回滚策略：继续使用同一固定 Origin `https://komochi007.github.io/Tradgio/` 发布上一稳定兼容提交；若未来 schema 降级不兼容，必须发布兼容修复版，不能清除用户 IndexedDB。

## 5. 上线前最终待办

1. 在上线窗口前基于最终提交重新执行 `npm run quality`、`npm run test:e2e` 和 `npm run test:pwa`。
2. 发布前生成并留存最终 `.tradgio-backup`，记录备份文件名、SHA-256、应用版本、IndexedDB schema 版本和回滚版本。
3. 通过 `Deploy PWA` 手动发布正式版本，发布后记录最终提交号和 Pages 工作流结果。
4. 未来出现 schema `2` 生产候选版本时，必须补做真实跨 schema 升级验收；该项不阻塞首版 schema `1` 上线。

## 6. 已补证记录

- 目标 Windows Chrome `149.0.7827.115` 全新配置路径 `TEMP\tradgio-chrome-recovery` 于 2026-06-16 16:04 完成恢复，恢复报告 `tradgio-restore-report-2026-06-16`，核对结论通过。
- 目标 Windows Edge `149.0.4022.69` 全新配置路径 `TEMP\tradgio-edge-recovery` 于 2026-06-16 16:10 完成恢复，恢复报告 `tradgio-restore-report-2026-06-16`，核对结论通过。
- 备份文件 SHA-256：`45E7EC7D7978745F4349203D7A2B51C7A8FBDF656F337CF8DC5A4C97A728FD2B`。
- 应用版本按当前发布版本 `0.1.0` 记录；IndexedDB schema 按当前发布版本 `1` 记录。用户原始手动记录曾填 `2`，已备注为待复核的手填差异。
- 用户确认账号、货品、往来单位、进货、出货、报价、合同、附件、库存、搜索和导出均已人工核对通过。

## 7. 当前风险

当前不发生 Origin 变更，Origin 迁移演练本次不适用。正式发布前仍必须完成最终质量门禁、最终备份、发布提交号和回滚版本记录；在这些发布记录落档前，不得宣称已完成正式上线。
