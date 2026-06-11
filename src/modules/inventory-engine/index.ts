export type {
  InventoryChangeType,
  InventoryLedger,
  CurrentStockSnapshot,
  OrderLineInput,
  InventoryOrderInput,
  InventoryOrderDelta,
  LedgerWriteError,
} from "./domain/types"

export {
  validateOrderInput,
  computeLedgerEntries,
  computeSnapshotUpdates,
  computeOrderLineDelta,
  computeRecalcOrder,
  computeRecalcLedgerEntries,
  reverseOrderSign,
} from "./domain/calculator"

export {
  applyPurchaseOrder,
  applySalesOrder,
  recalculateOrderDelta,
  getCurrentStock,
  getStockSnapshot,
  getStockHistory,
  getStockAlerts,
  removeDocumentLedger,
} from "./application/inventoryService"

export {
  ledgerRepository,
  snapshotRepository,
  getAllSnapshots,
  upsertSnapshots,
  getLedgerByProductId,
  getLedgerByDocumentId,
  removeLedgerByDocumentId,
} from "./infrastructure/inventoryRepository"
