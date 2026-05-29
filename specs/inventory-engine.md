# Inventory Engine 规格

## 1. 目标

定义库存流水、库存快照、改单差额回算和库存查询规则，保证：

- 库存变化只有一个写入口
- 支持历史追溯
- 支持改单回算
- 支持负库存规则

## 2. 模块归属

- 顶层模块：`Inventory Engine`
- 上游消费方：`Document Core`、`Overview`
- 下游依赖：`Shared Platform`

## 3. 核心原则

- 所有库存变更必须经过 `Inventory Engine`
- 不允许页面直接改库存
- 不允许业务模块直接覆盖库存快照
- 快照只是聚合结果，不是唯一事实来源

## 4. 领域对象

```ts
type InventoryChangeType = "purchase" | "sales" | "adjustment";

type InventoryLedger = {
  id: string;
  productId: string;
  documentType: "purchase" | "sales";
  documentId: string;
  quantityDelta: number;
  balanceAfter: number | null;
  happenedAt: string;
  createdAt: string;
};

type CurrentStockSnapshot = {
  productId: string;
  quantity: number;
  updatedAt: string;
};
```

MVP 中：
- 不开放手工调整库存
- `adjustment` 仅作为未来预留，不实现页面入口

## 5. 对外接口

```ts
applyPurchaseOrder(order)
applySalesOrder(order)
recalculateOrderDelta(previousOrder, nextOrder)
getCurrentStock(productId)
getStockSnapshot()
getStockHistory(productId)
```

## 6. 计算规则

进货：
- 每条明细按正数增量写入 ledger
- 聚合后更新 snapshot

出货：
- 每条明细按负数增量写入 ledger
- 聚合后更新 snapshot

改单：
- 不能直接覆盖旧结果
- 必须基于 `previousOrder` 与 `nextOrder` 的差额进行回算

## 7. 负库存规则

- 允许负库存
- 负库存只能来自出货保存
- 出货前页面可展示警告
- 警告不阻断保存
- 一旦保存，必须留下库存流水

## 8. 查询规则

`getCurrentStock(productId)`：
- 返回单个货品当前库存

`getStockSnapshot()`：
- 返回所有货品当前库存聚合结果

`getStockHistory(productId)`：
- 返回按时间排序的库存流水

## 9. 输入输出约束

输入单据应至少包含：
- `documentId`
- `documentType`
- `happenedAt`
- `lines[]`
- `productId`
- `quantity`

输出必须可支持：
- 总览页库存摘要
- 出货页当前库存显示
- 库存历史追溯

## 10. 错误与异常

需要覆盖：
- 单据明细为空
- 数量非法
- 缺失产品 ID
- 回算时找不到旧单据
- ledger 写入失败
- snapshot 聚合失败

处理原则：
- 库存写入失败则整次业务保存失败
- 不允许出现“单据成功但库存没更新”的中间态

## 11. 页面协作规则

页面层只能：
- 读取当前库存
- 展示库存不足警告

页面层不能：
- 直接写库存
- 自己推导库存最终值作为持久化结果

## 12. 验收标准

- 新建进货单后库存增加
- 修改进货单后库存按差额回算
- 新建出货单后库存减少
- 修改出货单后库存按差额回算
- 库存不足时允许保存，但有明确警告
- 无法绕过库存引擎直接改库存快照
