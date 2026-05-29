# Search 规格

## 1. 目标

定义统一搜索结果结构、搜索入口和聚合范围，保证：

- 查询页不需要理解底层多模块差异
- 能跨进货、出货、报价、合同返回统一结果
- 结果可直接跳到目标详情页

## 2. 模块归属

- 顶层模块：`Search`
- 上游消费方：`App Shell`、`Overview`
- 下游依赖：`Document Core`、`Contract Center`、`Shared Platform`

## 3. 搜索范围

MVP 聚合以下记录类型：
- 进货单
- 出货单
- 报价单
- 合同记录

MVP 支持以下关键词来源：
- 货品名称
- 客户名称
- 供应商名称
- 单据编号
- 合同编号
- 合同标题

## 4. 统一结果结构

建议统一结果类型：

```ts
type SearchResultType = "purchase" | "sales" | "quote" | "contract";

type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  matchedField: string;
  happenedAt: string;
  targetRoute: string;
};
```

要求：
- 页面层只消费 `SearchResult[]`
- 页面层不做多表拼接

## 5. 对外接口

```ts
searchDocuments(keyword, filters?)
buildSearchDocument(sourceRecord)
refreshSearchProjection(triggerInput)
```

MVP 可先不实现复杂异步索引刷新，但接口边界要保留。

## 6. 查询页结构

建议结构：
- `PageHeader`
- `SearchHero`
- `SearchFilters`
- `SearchResults`
- `EmptyOrErrorState`

要求：
- 搜索输入区是视觉焦点
- 结果项有类型标签
- 搜索前、搜索中、无结果、异常状态要区分

## 7. 行为规则

搜索前：
- 提示用户输入货品、客户、供应商或单据编号

搜索中：
- 展示骨架或局部加载态

搜索成功：
- 返回统一结构结果列表

搜索无结果：
- 提供明确无结果状态

搜索失败：
- 提供重试入口

## 8. 投影构建规则

进货 / 出货 / 报价：
- 从单据主信息和明细中提取可搜索字段

合同：
- 从合同编号、标题、客户名称中提取可搜索字段

要求：
- `SearchDocument` 是搜索投影，不是原始业务表
- 后续新增业务类型时应新增投影构建规则，而不是改查询页逻辑

## 9. 跳转规则

每条结果必须包含：
- 结果类型
- 目标详情页路由

建议路由：
- 进货：`/purchases/:id`
- 出货：`/sales/:id`
- 报价：`/quotes/:id`
- 合同：`/contracts/:id`

## 10. 校验与约束

- 搜索词允许模糊匹配
- 空搜索词不直接打全量重查询时，页面应保持搜索前状态
- 页面层不应直接查询多个业务模块并手动 merge

## 11. 验收标准

- 可按货品、客户、供应商、单据编号搜索
- 合同能被统一搜索结果命中
- 返回结果结构统一
- 点击结果可跳到对应详情页
- 查询页具备搜索前、搜索中、无结果、异常四类状态
