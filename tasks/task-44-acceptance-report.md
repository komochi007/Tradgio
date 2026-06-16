# 任务 44 验收记录：PWA 与平台无关静态发布

日期：2026-06-16

## 1. 结论

任务 44 已完成。当前发布方案锁定为 GitHub Pages 免费静态托管，正式 Origin 为 `https://komochi007.github.io`，应用路径为 `/Tradgio/`，正式访问地址为 `https://komochi007.github.io/Tradgio/`。

本次验收确认：测试站点可从零部署，Windows Chrome 与 Edge 可安装 PWA，断网可重开上一稳定版本，更新激活不会强制打断编辑页，失败发布可按 GitHub Pages 工作流重新部署上一稳定提交恢复，Origin 与迁移规则已记录。

## 2. 交付物

- PWA 配置：`manifest.webmanifest`、`sw.js`、离线应用壳、`404.html` SPA fallback 和应用图标。
- 更新流程：新 Service Worker 等待显式激活，编辑页阻止更新激活，高风险或 schema 更新要求先完成加密备份。
- 发布流水线：`.github/workflows/pages.yml`，手动 `workflow_dispatch` 且必须输入 `DEPLOY`，发布前重新执行 `npm run quality`。
- 自动化验收：`playwright.pwa.config.ts`、`tests/pwa/pwa-release.spec.ts`、`npm run test:pwa`。
- 部署文档：`docs/deployment.md`，包含正式地址、缓存策略、回滚步骤和 Origin 迁移规则。

## 3. 自动验收

- `npm run quality`：通过，12 个测试文件、97 项测试通过，生产构建成功，依赖审计 0 个漏洞。
- `npm run test:e2e`：通过，5 条 Playwright 核心流程通过。
- `npm run test:pwa`：通过，覆盖从零安装、离线重开、更新提示、编辑页阻断、安全更新、刷新使用新版和静态回滚验证。
- PR：[#4 `[codex] 完成任务44 PWA静态发布`](https://github.com/komochi007/Tradgio/pull/4)，已合并。
- 合并提交：`14a6ce8328a925998a6a3024143582bc2096bb90`。
- Pages 发布工作流：[`Deploy PWA`](https://github.com/komochi007/Tradgio/actions/runs/27531952061)，结论 `success`。

## 4. 线上验证

- 入口 `https://komochi007.github.io/Tradgio/` 返回可访问页面。
- `https://komochi007.github.io/Tradgio/sw.js` 返回 Service Worker 脚本。
- 线上 Playwright 检查确认 Service Worker 已激活，manifest 名称为 `Tradgio 库存管理平台`，`start_url` 为 `/Tradgio/`。
- 深层路由依赖 GitHub Pages `404.html` fallback，可正常渲染登录页；HTTP 状态为 GitHub Pages 预期的 404 fallback 行为。
- 在线访问后切换离线并重载，仍可显示 `登录 Tradgio`。

## 5. Windows 实测

用户于 2026-06-16 在目标 Windows 网络反馈：

- Chrome：能打开 / 能安装 / 断网重开正常
- Edge：能打开 / 能安装 / 断网重开正常

该结果补齐“在目标 Windows 网络实测候选免费托管平台后锁定供应商”的验收证据。

## 6. 剩余事项

任务 44 不再阻塞。后续按路线图进入任务 45：备份提醒、存储健康与 Windows 恢复演练。
