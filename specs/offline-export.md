# 客户端离线导出规格

## 1. 范围

本规格对应任务 41。打印版和固定模板 Excel 继续通过浏览器端 `Export Service` 生成；页面只提交已通过当前账号校验的 `ExportPayload`，不接触 ExcelJS、模板单元格映射或 Cache Storage。

任务 41 实现导出适配器和模板缓存，任务 44 再将应用壳、动态 chunk 和模板纳入正式 Service Worker 发布策略。

## 2. 加载与缓存

- 打印版直接生成文本 Blob，不加载 ExcelJS 或 Excel 模板。
- 模板 Excel 首次使用时并行动态加载 ExcelJS chunk 和对应模板。
- 模板缓存名为 `tradgio-export-templates-v1`，只保存出货单和报价单固定模板。
- 模板读取顺序为当前版本缓存优先、网络回源、校验成功后写入缓存。
- 每个模板使用固定 SHA-256 摘要校验。替换模板时必须同步更新摘要并提升缓存版本。
- 当前版本模板成功缓存后删除旧的 `tradgio-export-templates-*` 缓存。
- 用户导出文件、账号数据、附件、密码和 session 不进入 Cache Storage。

当前模板基线：

| 模板 | SHA-256 |
|---|---|
| `sales-order-template.xlsx` | `597b8a8d9db7bfef2b989dabb855c1e026b2ad8a0c6c038f3ba4d1e91007494d` |
| `quote-template.xlsx` | `f82082da0495626988564b133a4581bc6ea4622e28dc6c7481ed7c1942d0bcf3` |

## 3. 离线行为

- 已缓存当前版本模板时，断网后仍可生成模板 Excel。
- 缓存缺失时提示用户联网完成首次模板加载。
- 缓存摘要不匹配时删除损坏缓存；无法联网获取正确版本时拒绝导出。
- 导出失败只返回失败结果，不修改单据、库存、附件或其他业务数据。

## 4. 错误契约

| 错误码 | 含义 |
|---|---|
| `EXPORT_TEMPLATE_UNAVAILABLE` | 模板未缓存、网络读取失败或浏览器无法校验模板 |
| `EXPORT_TEMPLATE_VERSION_MISMATCH` | 模板摘要与当前应用基线不一致 |
| `EXPORT_MEMORY_EXHAUSTED` | ExcelJS 加载或工作簿生成时可用内存不足 |
| `EXPORT_GENERATION_FAILED` | 模板解析或文件生成失败 |
| `EXPORT_DOWNLOAD_FAILED` | 浏览器创建下载失败 |
| `QUOTA_EXCEEDED` | Cache Storage 空间不足，模板无法可靠缓存 |

## 5. 性能与验收

- 生产构建必须生成独立 ExcelJS chunk，主入口不得静态包含 ExcelJS。
- 任务 41 基线：主入口从 `1,435.59 kB` 降至 `507.45 kB`，ExcelJS 独立 chunk 为 `929.91 kB`。
- 自动化测试覆盖打印版不加载 ExcelJS、模板字段与样式、在线缓存后离线读取、缓存缺失、版本不匹配、内存不足和账号越权。
- Playwright 使用真实出货单和报价单模板下载，并验证出货模板在线缓存后断网仍可再次导出。
