export type InventoryChangeType = "purchase" | "sales" | "adjustment";

export type InventoryLedger = {
  id: string;
  productId: string;
  documentType: "purchase" | "sales";
  documentId: string;
  quantityDelta: number;
  balanceAfter: number;
  happenedAt: string;
  createdAt: string;
};

export type CurrentStockSnapshot = {
  id: string;
  productId: string;
  quantity: number;
  updatedAt: string;
};

export type OrderLineInput = {
  productId: string;
  quantity: number;
};

export type InventoryOrderInput = {
  documentId: string;
  documentType: "purchase" | "sales";
  happenedAt: string;
  lines: OrderLineInput[];
};

export type LedgerWriteError = {
  type: "EMPTY_ORDER" | "INVALID_QUANTITY" | "MISSING_PRODUCT" | "LEDGER_WRITE_FAILED" | "SNAPSHOT_FAILED" | "ORDER_NOT_FOUND";
  message: string;
};
