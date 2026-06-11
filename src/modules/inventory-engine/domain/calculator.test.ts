import { describe, expect, it } from "vitest"
import type { InventoryOrderInput } from "./types"
import {
  computeLedgerEntries,
  computeRecalcLedgerEntries,
  computeRecalcOrder,
  computeSnapshotUpdates,
} from "./calculator"

const happenedAt = "2026-06-10T00:00:00.000Z"

function createOrder(
  documentType: InventoryOrderInput["documentType"],
  lines: InventoryOrderInput["lines"]
): InventoryOrderInput {
  return {
    documentId: `${documentType}-001`,
    accountId: "account-test",
    documentType,
    happenedAt,
    lines,
  }
}

function computeRecalcEntries(
  previousOrder: InventoryOrderInput,
  nextOrder: InventoryOrderInput,
  currentSnapshots = new Map<string, number>()
) {
  const deltaOrder = computeRecalcOrder(previousOrder, nextOrder)
  expect(deltaOrder).not.toBeNull()
  return computeRecalcLedgerEntries(deltaOrder!, currentSnapshots)
}

describe("库存创建计算", () => {
  it("进货创建增加库存", () => {
    const entries = computeLedgerEntries(
      createOrder("purchase", [{ productId: "product-a", quantity: 5 }]),
      new Map([["product-a", 2]])
    )

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      productId: "product-a",
      quantityDelta: 5,
      balanceAfter: 7,
    })
  })

  it("出货创建减少库存并允许产生负库存", () => {
    const entries = computeLedgerEntries(
      createOrder("sales", [{ productId: "product-a", quantity: 5 }]),
      new Map([["product-a", 2]])
    )

    expect(entries[0]).toMatchObject({
      quantityDelta: -5,
      balanceAfter: -3,
    })
  })

  it("同一货品多条明细按顺序累计并更新快照", () => {
    const currentSnapshots = new Map([["product-a", 10]])
    const entries = computeLedgerEntries(
      createOrder("purchase", [
        { productId: "product-a", quantity: 2 },
        { productId: "product-a", quantity: 3 },
      ]),
      currentSnapshots
    )

    expect(entries.map((entry) => entry.balanceAfter)).toEqual([12, 15])
    expect(computeSnapshotUpdates(entries, currentSnapshots)).toEqual([
      expect.objectContaining({ productId: "product-a", quantity: 15 }),
    ])
  })
})

describe("库存改单差额计算", () => {
  it("进货数量增加只增加差额", () => {
    const entries = computeRecalcEntries(
      createOrder("purchase", [{ productId: "product-a", quantity: 5 }]),
      createOrder("purchase", [{ productId: "product-a", quantity: 8 }])
    )

    expect(entries.map((entry) => entry.quantityDelta)).toEqual([3])
  })

  it("出货数量增加只减少差额", () => {
    const entries = computeRecalcEntries(
      createOrder("sales", [{ productId: "product-a", quantity: 5 }]),
      createOrder("sales", [{ productId: "product-a", quantity: 8 }])
    )

    expect(entries.map((entry) => entry.quantityDelta)).toEqual([-3])
  })

  it("重复货品明细改单前先聚合数量", () => {
    const entries = computeRecalcEntries(
      createOrder("purchase", [
        { productId: "product-a", quantity: 2 },
        { productId: "product-a", quantity: 3 },
      ]),
      createOrder("purchase", [
        { productId: "product-a", quantity: 4 },
        { productId: "product-a", quantity: 3 },
      ])
    )

    expect(entries.map((entry) => entry.quantityDelta)).toEqual([2])
  })

  it("进货数量减少会扣减差额", () => {
    const entries = computeRecalcEntries(
      createOrder("purchase", [{ productId: "product-a", quantity: 8 }]),
      createOrder("purchase", [{ productId: "product-a", quantity: 5 }]),
      new Map([["product-a", 10]])
    )

    expect(entries[0]).toMatchObject({ quantityDelta: -3, balanceAfter: 7 })
  })

  it("出货数量减少会恢复差额", () => {
    const entries = computeRecalcEntries(
      createOrder("sales", [{ productId: "product-a", quantity: 8 }]),
      createOrder("sales", [{ productId: "product-a", quantity: 5 }]),
      new Map([["product-a", 2]])
    )

    expect(entries[0]).toMatchObject({ quantityDelta: 3, balanceAfter: 5 })
  })

  it("删除进货明细会撤销原库存影响", () => {
    const entries = computeRecalcEntries(
      createOrder("purchase", [
        { productId: "product-a", quantity: 4 },
        { productId: "product-b", quantity: 2 },
      ]),
      createOrder("purchase", [{ productId: "product-b", quantity: 2 }])
    )

    expect(entries.map((entry) => entry.quantityDelta)).toEqual([-4])
  })

  it("增加出货明细会扣减新增货品库存", () => {
    const entries = computeRecalcEntries(
      createOrder("sales", [{ productId: "product-a", quantity: 2 }]),
      createOrder("sales", [
        { productId: "product-a", quantity: 2 },
        { productId: "product-b", quantity: 3 },
      ])
    )

    expect(entries.map((entry) => entry.quantityDelta)).toEqual([-3])
  })

  it("删除出货明细会恢复原库存影响", () => {
    const entries = computeRecalcEntries(
      createOrder("sales", [
        { productId: "product-a", quantity: 4 },
        { productId: "product-b", quantity: 2 },
      ]),
      createOrder("sales", [{ productId: "product-b", quantity: 2 }])
    )

    expect(entries.map((entry) => entry.quantityDelta)).toEqual([4])
  })

  it("替换进货货品会撤销旧货品并增加新货品", () => {
    const entries = computeRecalcEntries(
      createOrder("purchase", [{ productId: "product-a", quantity: 4 }]),
      createOrder("purchase", [{ productId: "product-b", quantity: 4 }])
    )
    const deltas = Object.fromEntries(
      entries.map((entry) => [entry.productId, entry.quantityDelta])
    )

    expect(deltas).toEqual({ "product-a": -4, "product-b": 4 })
  })

  it("替换出货货品会恢复旧货品并扣减新货品", () => {
    const entries = computeRecalcEntries(
      createOrder("sales", [{ productId: "product-a", quantity: 4 }]),
      createOrder("sales", [{ productId: "product-b", quantity: 4 }])
    )
    const deltas = Object.fromEntries(
      entries.map((entry) => [entry.productId, entry.quantityDelta])
    )

    expect(deltas).toEqual({ "product-a": 4, "product-b": -4 })
  })
})
