# PWA 发布与运行

## 发布目标

- 候选平台：GitHub Pages
- 固定 Origin：`https://komochi007.github.io`
- 应用路径：`/Tradgio/`
- 正式地址：`https://komochi007.github.io/Tradgio/`
- IndexedDB 数据按 Origin 隔离，不能通过复制网址迁移到其他 Origin。

平台最终锁定需要在目标 Windows 网络完成 Chrome 和 Edge 访问、安装及离线复验。若访问不稳定，应保持构建产物平台无关并更换静态托管，不迁移现有 Origin 前必须先导出加密备份。

## 手动发布

发布工作流位于 `.github/workflows/pages.yml`，仅允许从 GitHub Actions 手动触发：

1. 确认 `main` 的质量与 E2E 检查通过。
2. 打开 `Deploy PWA` 工作流，输入 `DEPLOY`。
3. 工作流重新执行 `npm run quality`，以提交 SHA 作为应用版本构建。
4. GitHub Pages 部署完成后检查工作流给出的站点地址。

主分支推送不会自动发布，避免未确认的静态版本直接接管现有 Service Worker。

## 缓存与更新

- manifest、应用图标、主应用资源和固定模板进入版本化应用缓存。
- ExcelJS 保持按需 chunk，不进入首屏预缓存。
- 导航在线时网络优先；网络失败时返回构建生成的离线应用壳。
- 新 Worker 安装后保持 waiting，不自动 `skipWaiting`，不自动刷新页面。
- 录单和编辑页面阻止激活更新；schema 变化或高风险更新要求先保存加密备份。
- 用户点击“安全更新”后才激活，接管完成后仍需点击“刷新使用新版”。

## SPA 回退

构建会生成 `404.html`，内容与入口页一致，用于 GitHub Pages 深层路由回退。其他静态平台必须配置所有非文件路由回退到 `index.html`。

## 回滚

1. 在 Git 历史中找到上一稳定发布提交。
2. 从该提交创建临时回滚分支，执行 `npm ci`、`npm run quality` 和 `npm run test:pwa`。
3. 使用同一固定 Origin 和 `/Tradgio/` base path 构建该提交。
4. 通过 Pages 工作流发布回滚提交，不能清除用户 IndexedDB。
5. 用户收到版本提示后显式激活；若回滚版本的 schema 低于现有数据库，应用会拒绝激活，应改为发布兼容修复版。

## Origin 迁移

Origin 变化等同于新安装，旧 Origin 的 IndexedDB、Cache Storage 和 Service Worker 不会自动出现于新地址。迁移前必须：

1. 在旧 Origin 导出完整加密 `.tradgio-backup`。
2. 至少保留两处备份副本并验证密码。
3. 在新 Origin 安装应用并导入备份。
4. 核对账号、实体数量、金额、库存和附件后，才停止使用旧 Origin。
