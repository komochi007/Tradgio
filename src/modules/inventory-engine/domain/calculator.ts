import type {
  InventoryLedger,
  CurrentStockSnapshot,
  InventoryOrderDelta,
  InventoryOrderInput,
  OrderLineInput,
  LedgerWriteError,
} from "./types";
import { generateId } from "../../../shared";

export function validateOrderInput(
  input: InventoryOrderInput
): LedgerWriteError | null {
  if (!input.lines || input.lines.length === 0) {
    return { type: "EMPTY_ORDER", message: "单据明细不能为空" };
  }

  for (const line of input.lines) {
    if (!line.productId) {
      return { type: "MISSING_PRODUCT", message: "明细缺少货品 ID" };
    }
    if (typeof line.quantity !== "number" || isNaN(line.quantity) || line.quantity <= 0) {
      return { type: "INVALID_QUANTITY", message: `货品 ${line.productId} 数量非法` };
    }
  }

  return null;
}

export function computeLedgerEntries(
  order: InventoryOrderInput,
  currentSnapshots: Map<string, number>
): InventoryLedger[] {
  const sign = order.documentType === "purchase" ? 1 : -1;
  const now = new Date().toISOString();
  const entries: InventoryLedger[] = [];

  const runningBalance = new Map(currentSnapshots);

  for (const line of order.lines) {
    const prevBalance = runningBalance.get(line.productId) ?? 0;
    const delta = line.quantity * sign;
    const balanceAfter = prevBalance + delta;

    entries.push({
      id: generateId(),
      productId: line.productId,
      documentType: order.documentType,
      documentId: order.documentId,
      quantityDelta: delta,
      balanceAfter,
      happenedAt: order.happenedAt,
      createdAt: now,
    });

    runningBalance.set(line.productId, balanceAfter);
  }

  return entries;
}

export function computeSnapshotUpdates(
  entries: InventoryLedger[],
  currentSnapshots: Map<string, number>
): CurrentStockSnapshot[] {
  const productMap = new Map<string, number>();

  for (const [productId, qty] of currentSnapshots) {
    productMap.set(productId, qty);
  }

  for (const entry of entries) {
    const current = productMap.get(entry.productId) ?? 0;
    productMap.set(entry.productId, current + entry.quantityDelta);
  }

  const now = new Date().toISOString();
  const snapshots: CurrentStockSnapshot[] = [];

  for (const [productId, quantity] of productMap) {
    snapshots.push({
      id: productId,
      productId,
      quantity,
      updatedAt: now,
    });
  }

  return snapshots;
}

export function computeOrderLineDelta(
  prevLines: OrderLineInput[],
  nextLines: OrderLineInput[]
): InventoryOrderDelta["lines"] {
  const prevMap = new Map<string, number>();
  for (const line of prevLines) {
    prevMap.set(line.productId, (prevMap.get(line.productId) ?? 0) + line.quantity);
  }

  const nextMap = new Map<string, number>();
  for (const line of nextLines) {
    nextMap.set(line.productId, (nextMap.get(line.productId) ?? 0) + line.quantity);
  }

  const allProductIds = new Set([...prevMap.keys(), ...nextMap.keys()]);
  const deltas: InventoryOrderDelta["lines"] = [];

  for (const productId of allProductIds) {
    const prevQty = prevMap.get(productId) ?? 0;
    const nextQty = nextMap.get(productId) ?? 0;
    const diff = nextQty - prevQty;
    if (diff !== 0) {
      deltas.push({ productId, quantityDelta: diff });
    }
  }

  return deltas;
}

export function computeRecalcOrder(
  previousOrder: InventoryOrderInput,
  nextOrder: InventoryOrderInput
): InventoryOrderDelta | null {
  const deltas = computeOrderLineDelta(previousOrder.lines, nextOrder.lines);

  if (deltas.length === 0) return null;

  const sign = nextOrder.documentType === "purchase" ? 1 : -1;

  return {
    documentId: nextOrder.documentId,
    documentType: nextOrder.documentType,
    happenedAt: nextOrder.happenedAt,
    lines: deltas.map((line) => ({
      productId: line.productId,
      quantityDelta: line.quantityDelta * sign,
    })),
  };
}

export function computeRecalcLedgerEntries(
  orderDelta: InventoryOrderDelta,
  currentSnapshots: Map<string, number>
): InventoryLedger[] {
  const now = new Date().toISOString();
  const entries: InventoryLedger[] = [];
  const runningBalance = new Map(currentSnapshots);

  for (const line of orderDelta.lines) {
    const prevBalance = runningBalance.get(line.productId) ?? 0;
    const balanceAfter = prevBalance + line.quantityDelta;

    entries.push({
      id: generateId(),
      productId: line.productId,
      documentType: orderDelta.documentType,
      documentId: orderDelta.documentId,
      quantityDelta: line.quantityDelta,
      balanceAfter,
      happenedAt: orderDelta.happenedAt,
      createdAt: now,
    });

    runningBalance.set(line.productId, balanceAfter);
  }

  return entries;
}

export function reverseOrderSign(order: InventoryOrderInput): InventoryOrderInput {
  const reversedType = order.documentType === "purchase" ? "sales" : "purchase";
  return {
    documentId: order.documentId,
    documentType: reversedType,
    happenedAt: order.happenedAt,
    lines: order.lines,
  };
}
