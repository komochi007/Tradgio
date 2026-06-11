export type { SalesOrder, SalesLine, SalesFormData, SalesFormLine } from "./domain/types"
export {
  validateSalesForm,
  emptySalesForm,
  emptySalesLine,
  orderToFormData,
  formDataToOrder,
} from "./domain/types"
export { salesRepository, generateDocumentNo } from "./infrastructure/salesRepository"
export {
  createSalesOrder,
  updateSalesOrder,
  getSalesOrder,
  listSalesOrders,
  deleteSalesOrder,
  checkStockShortage,
} from "./application/salesService"
export { SalesListPage } from "./pages/SalesListPage"
export { SalesFormPage } from "./pages/SalesFormPage"
export { SalesDetailPage } from "./pages/SalesDetailPage"
