# E2E 测试说明

任务 33、42、43 使用 Playwright + Chromium 自动验证核心业务、整机恢复和本地生产适配层边界。

## 覆盖范围

- 注册、登录和刷新恢复会话
- 货品、供应商和客户创建
- 进货保存并增加库存
- 出货保存并减少库存
- 报价保存且不影响库存
- 合同元数据和附件上传
- 总览库存及统一搜索
- 出货单、报价单模板 Excel 下载
- 出货模板在线缓存后断网再次导出
- 整机加密备份、恢复前快照和完整恢复
- 两次独立脱敏双账号 localStorage 到 IndexedDB 迁移演练
- 迁移前后实体、金额、库存和附件摘要核对
- 模板缓存缺失时的离线错误反馈

## 本地运行

首次运行安装浏览器：

```bash
npm run test:e2e:install
```

执行无头测试：

```bash
npm run test:e2e
```

需要观察交互时执行：

```bash
npm run test:e2e:headed
```

## 测试数据策略

- 每次测试使用新的浏览器上下文，不读取开发者浏览器状态。
- 测试开始时清空当前上下文的 localStorage、IndexedDB 和 Cache Storage。
- 账号、货品、单位和合同名称均带随机后缀，避免重复编号或名称冲突。
- 测试结束后浏览器上下文销毁，测试数据随 localStorage 一起清除。
- 每条测试使用独立浏览器上下文，测试之间不共享可变业务数据。

## 失败证据

- 失败时保留截图、视频和 trace 到 `test-results/`。
- HTML 报告输出到 `playwright-report/`。
- 两个目录均不进入 Git；CI 会通过 `playwright-report` artifact 上传。
