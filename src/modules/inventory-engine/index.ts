export type {
  InventoryChangeType,
  InventoryLedger,
  CurrentStockSnapshot,
  OrderLineInput,
  InventoryOrderInput,
  LedgerWriteError,
} from "./domain/types";

export {
  validateOrderInput,
  computeLedgerEntries,
  computeSnapshotUpdates,
  computeOrderLineDelta,
  computeRecalcOrder,
  reverseOrderSign,
} from "./domain/calculator";

export {
  applyPurchaseOrder,
  applySalesOrder,
  recalculateOrderDelta,
  getCurrentStock,
  getStockSnapshot,
  getStockHistory,
  getStockAlerts,
  removeDocumentLedger,
} from "./application/inventoryService";

export {
  ledgerRepository,
  snapshotRepository,
  getAllSnapshots,
  upsertSnapshots,
  getLedgerByProductId,
  getLedgerByDocumentId,
  removeLedgerByDocumentId,
} from "./infrastructure/inventoryRepository";
