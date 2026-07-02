# AGENTS.md

## 沟通方式

- 全程使用中文沟通。
- 需求模糊时先提问弄清楚，不要猜。
- 发现更优路径时主动提出建议，不只是按照指令执行。

## 当前项目状态

- Tradgio 已完成 MVP、生产化任务 26-46 和首版正式上线。
- 正式地址：`https://komochi007.github.io/Tradgio/`
- 首版 IndexedDB schema：`1`
- 首版发布提交号：`877cef4702eaf9617675ced17b019c8aebfbbcf4`
- `tasks/production-roadmap.md` 作为上线前历史依据保留，不再承载日常小修。

## 上线后迭代入口

后续功能优化、Bug、运维和发布事项默认按以下文档执行：

- `docs/release-management.md`：版本、分级、门禁和回滚规则。
- `tasks/post-launch-backlog.md`：上线后需求池和当前版本候选。
- `tasks/release-checklist.md`：发布前后检查清单。
- `tasks/release-log.md`：发布历史、提交号、验证结果和回滚点。

默认流程：

1. 新反馈或新想法先登记到 `tasks/post-launch-backlog.md`。
2. 进入开发前补齐目标、影响用户、所属模块、优先级、风险等级、验收标准和验证命令。
3. 修改超过 3 个文件时先拆成小任务。
4. 发布前更新 `tasks/release-checklist.md`。
5. 发布后更新 `tasks/release-log.md`。

## 高风险变更

涉及以下内容时，必须按高风险发布处理：

- IndexedDB schema、Repository、迁移器
- 备份恢复、容量策略、合同附件 Blob
- 账号隔离、登录认证、密码迁移
- 库存计算、库存流水、库存快照
- 导出模板、Export Service、模板缓存
- Service Worker、PWA 更新、发布和回滚

高风险发布必须先确认备份、回滚点和验证门禁。未来 schema `2` 生产候选版本发布前必须做真实跨 schema 升级验收。

## 编码与验证

- 保持原有目录、命名和代码风格。
- 不用加注释，除非逻辑不清晰。
- 不绕过 `Inventory Engine`、`Export Service` 或账号隔离 Repository。
- 页面层不能直接访问 IndexedDB 或附件 Blob store。
- 低风险文案/样式/文档改动可只做文档或格式检查。
- 表单、路由、核心流程、搜索、导出相关改动至少执行 `npm run quality`，必要时执行 `npm run test:e2e`。
- PWA、发布、缓存、更新或回滚相关改动还要执行 `npm run test:pwa`。
