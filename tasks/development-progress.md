# 开发进度

本文件用于维护当前实际开发状态。

---

## 1. 总体状态

当前阶段：第二阶段优化进行中 🔧

当前已完成（MVP 20 个 + 优化 4 个）：
- 任务 01-20：MVP 全部完成
- 任务 21：App Shell 视觉重构与导航收紧
- 任务 22：Overview 重做与查询并入
- 任务 23：表单控件与搜索交互统一升级
- 任务 24：货品字段扩展与单据编号规则调整

当前未完成：任务 25

---

## 2. 第二阶段优化任务验收记录

### 任务 21-23
（已完成，见前版本记录）

### 任务 24：货品字段扩展与单据编号规则调整
- 完成时间：2026-06-02
- 改动文件：
  - `src/modules/master-data/products/domain/types.ts` — Product/ProductFormData 新增 productType，ProductUnits 收敛为 5 项
  - `src/modules/master-data/products/pages/ProductFormPage.tsx` — 表单新增产品类型字段
  - `src/modules/master-data/products/pages/ProductListPage.tsx` — 表格新增产品类型列
  - `src/modules/document-core/purchases/infrastructure/purchaseRepository.ts` — 编号流水 2 位
  - `src/modules/document-core/sales/infrastructure/salesRepository.ts` — 编号流水 2 位
  - `src/modules/document-core/quotes/infrastructure/quoteRepository.ts` — 编号流水 2 位
  - `src/modules/contract-center/infrastructure/contractRepository.ts` — 编号流水 2 位
  - `src/shared/styles/global.css` — 新增 form-page、form-card 样式
- 验收结果：
  - ✅ 货品新增/编辑支持 `产品类型`（自由输入，最长 30 字）
  - ✅ 货品列表展示 `产品类型` 列
  - ✅ 单位仅保留：个、件、箱、卷、码（5 项）
  - ✅ 进货/出货/报价/合同编号均改为月份后两位流水号（01-99）
  - ✅ `npm run build` 通过
