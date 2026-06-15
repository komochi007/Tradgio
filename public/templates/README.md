# Export Templates

本目录存放浏览器端可读取的固定单据模板资产。

当前标准模板：

| 业务类型 | 标准模板 | 来源 |
|---|---|---|
| 出货单 | `sales-order-template.xlsx` | 由用户提供的原始模板转换 |
| 报价单 | `quote-template.xlsx` | 由用户提供的原始模板转换 |

使用规则：

- 业务代码只引用 `.xlsx` 标准模板。
- 仓库仅保留 `.xlsx` 标准模板，不保留原始 `.xls` 备份。
- 模板字段映射必须在 `Export Service` 内维护，页面层不得直接写单元格映射。
- 如用户后续替换模板，应保持本目录英文文件名稳定，避免影响代码引用。
- 替换模板后必须同步更新 `specs/offline-export.md` 和 `EXPORT_TEMPLATE_DEFINITIONS` 中的 SHA-256，并提升模板缓存版本。
