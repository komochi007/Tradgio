# Document Core 规格

## 1. 目标

定义进货单、出货单、报价单的创建、编辑、详情、列表与导出 payload 边界，保证：

- 单据结构统一
- 单据保存整单提交
- 进货 / 出货可与库存引擎联动
- 报价不影响库存
- 页面不直接承担库存与导出规则

## 2. 模块归属

- 顶层模块：`Document Core`
- 上游消费方：`Overview`、`Search`、`App Shell`
- 下游依赖：`Master Data`、`Inventory Engine`、`Export Service`、`Shared Platform`

## 3. 领域对象

建议统一主表 + 明细结构：

```ts
type DocumentType = "purchase" | "sales" | "quote";

type DocumentLine = {
  id: string;
  productId: string;
  productName: string;
  spec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
};

type BaseDocument = {
  id: string;
  accountId: string;
  type: DocumentType;
  documentNo: string;
  happenedAt: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
  totalAmount: number;
  lines: DocumentLine[];
};

type PurchaseOrder = BaseDocument & {
  type: "purchase";
  supplierId: string;
  supplierName: string;
};

type SalesOrder = BaseDocument & {
  type: "sales";
  customerId: string;
  customerName: string;
};

type QuoteOrder = BaseDocument & {
  type: "quote";
  customerId: string;
  customerName: string;
};
```

账号约束：
- 列表、详情、创建、编辑和编号生成只能作用于当前账号
- 保存时必须校验客户、供应商和货品引用属于当前账号
- 页面传入的名称不能替代账号归属校验
- 导出 payload 必须再次校验单据属于当前账号

## 4. 对外接口

```ts
createPurchaseOrder(input)
updatePurchaseOrder(id, input)
listPurchaseOrders(query?)
getPurchaseOrder(id)

createSalesOrder(input)
updateSalesOrder(id, input)
listSalesOrders(query?)
getSalesOrder(id)

createQuoteOrder(input)
updateQuoteOrder(id, input)
listQuoteOrders(query?)
getQuoteOrder(id)

buildExportPayload(documentType, id)
```

## 5. 通用规则

所有单据共同规则：
- 保存必须整单提交
- 至少一条明细
- 明细数量必须大于 `0`
- 单价不能小于 `0`
- 合计金额由明细自动汇总
- 页面不应直接改写已保存记录结构

编号规则：
- 进货：`JH + YYYYMM + 两位流水号`
- 出货：`CH + YYYYMM + 两位流水号`
- 报价：`BJ + YYYYMM + 两位流水号`
- 编号按当前账号、单据类型和月份分别计算
- 生成时读取当月合法编号中的最大流水号后递增，不按记录数量计算，不复用删除或缺失的流水号
- 保存时 Repository 再次校验当前账号内编号唯一；并发创建必须串行完成编号生成与写入
- 当月流水达到 `99` 后阻止创建，并提示升级编号规则
- 生产数据库必须分别建立账号与单据编号的联合唯一约束

## 6. 进货单规则

字段：
- 日期
- 供应商
- 备注
- 货品明细

行为：
- 保存成功后触发 `Inventory Engine.applyPurchaseOrder`
- 编辑已保存进货单时触发差额回算
- 可导出打印版 / 表格版

校验：
- 供应商必选
- 明细不能为空
- 数量和单价合法

## 7. 出货单规则

字段：
- 日期
- 客户
- 备注
- 货品明细
- 当前库存展示

行为：
- 保存成功后触发 `Inventory Engine.applySalesOrder`
- 编辑已保存出货单时触发差额回算
- 库存不足时给警告，但不阻断保存

校验：
- 客户必选
- 明细不能为空
- 数量和单价合法

## 8. 报价单规则

字段：
- 日期
- 客户
- 备注
- 货品明细

行为：
- 货品选择后可带出默认销售价
- 用户允许手动改价
- 保存不影响库存

校验：
- 客户必选
- 明细不能为空
- 数量和单价合法

## 9. 页面结构建议

列表页：
- `PageHeader`
- `FilterToolbar`
- `Table`
- `Pagination`

详情 / 录单页：
- `MetaSection`
- `LineItemsSection`
- `SummarySection`
- `StickyActionBar`

## 10. 页面状态

列表页：
- 初始态
- 加载态
- 空态
- 搜索无结果
- 错误态
- 正常态

录单页：
- 默认编辑态
- 字段错误态
- 提交中
- 提交失败
- 提交成功
- 导出中
- 导出失败

出货单额外：
- 库存不足警告态

## 11. 与其他模块的依赖约束

必须遵守：
- 货品、客户、供应商从 `Master Data` 引用
- 库存写入只能通过 `Inventory Engine`
- 导出只能通过 `Export Service`
- 页面层不能直接构造最终导出文件

## 12. 验收标准

- 可创建、查看、编辑进货单
- 可创建、查看、编辑出货单
- 可创建、查看、编辑报价单
- 进货 / 出货单至少一条明细才能保存
- 报价单不会影响库存
- 出货库存不足只警告，不阻断保存
- 导出失败不影响已保存单据
