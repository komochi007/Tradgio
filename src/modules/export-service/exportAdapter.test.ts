import { afterEach, describe, expect, it, vi } from "vitest"
import { buildSalesExportPayload } from "./application/buildExportPayload"
import { exportPrint } from "./application/exportService"
import {
  createLocalExportAdapter,
  EXPORT_TEMPLATE_CACHE_NAME,
  EXPORT_TEMPLATE_DEFINITIONS,
  loadExportTemplate,
  resolveTemplatePath,
} from "./infrastructure/localExportAdapter"
import type { ExportPayload } from "./domain/types"
import type { SalesOrder } from "../document-core/sales/domain/types"

class MemoryStorage implements Storage {
  private data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

class MemoryCache {
  private responses = new Map<string, Response>()

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    return this.responses.get(String(request))?.clone()
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    this.responses.set(String(request), response.clone())
  }

  async delete(request: RequestInfo | URL): Promise<boolean> {
    return this.responses.delete(String(request))
  }
}

class MemoryCacheStorage {
  private caches = new Map<string, MemoryCache>()

  async open(cacheName: string): Promise<MemoryCache> {
    const cache = this.caches.get(cacheName) ?? new MemoryCache()
    this.caches.set(cacheName, cache)
    return cache
  }

  async keys(): Promise<string[]> {
    return [...this.caches.keys()]
  }

  async delete(cacheName: string): Promise<boolean> {
    return this.caches.delete(cacheName)
  }
}

const storage = new MemoryStorage()
const originalFetch = globalThis.fetch
const originalCaches = globalThis.caches
const originalSalesTemplateSha256 = EXPORT_TEMPLATE_DEFINITIONS.sales.sha256
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document")

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: storage,
})

function switchAccount(accountId: string): void {
  storage.setItem(
    "tradgio_session",
    JSON.stringify({
      account: { id: accountId },
      token: `${accountId}-token`,
      issuedAt: "2026-06-15T00:00:00.000Z",
    })
  )
}

function createPayload(documentType: "sales" | "quote" = "sales"): ExportPayload {
  return {
    documentType,
    documentNo: documentType === "sales" ? "CH2026061501" : "BJ2026061501",
    header: {
      documentNo: documentType === "sales" ? "CH2026061501" : "BJ2026061501",
      customerOrderNo: documentType === "sales" ? "SO2026061501" : undefined,
      date: "2026-06-15",
      counterpartyLabel: "客户",
      counterpartyName: "测试客户",
      remark: "测试备注",
    },
    lineItems: [
      {
        productCode: "P001",
        productName: "测试货品",
        spec: "A1",
        composition: "棉",
        color: "蓝色",
        bulkMoq: "100件",
        unit: "件",
        quantity: 2,
        taxExcludedUnitPrice: 10,
        unitPrice: 20,
        lineAmount: 40,
        dyeingFee: "2",
        leadTime: "7天",
        lineRemark: "按样品",
      },
    ],
    totals: { totalAmount: 40, lineCount: 1 },
    meta: { exportedAt: "2026-06-15T00:00:00.000Z", exportedBy: "测试用户" },
  }
}

async function createSalesTemplate(): Promise<ArrayBuffer> {
  const excelJs = await import("exceljs")
  const workbook = new excelJs.Workbook()
  const worksheet = workbook.addWorksheet("出货单")
  worksheet.getCell("A4").value = "送货单"
  worksheet.getCell("A5").value = "收货单位"
  worksheet.getCell("A6").value = "产品编号"
  worksheet.getCell("B6").value = "产品名称"
  worksheet.getCell("C6").value = "尺寸"
  worksheet.getCell("D6").value = "颜色"
  worksheet.getCell("E6").value = "单位"
  worksheet.getCell("F6").value = "数量"
  worksheet.getCell("G6").value = "单价"
  worksheet.getCell("H6").value = "金额"
  worksheet.getCell("I6").value = "备注"
  worksheet.getRow(8).height = 24
  worksheet.getCell("B7").alignment = { horizontal: "left", wrapText: true }
  worksheet.mergeCells("F9:G9")
  worksheet.getCell("H9").value = "合计"
  worksheet.mergeCells("A11:I11")
  worksheet.getCell("A11").value =
    "送货人（盖章）陈秋霞                                     收货人（盖章）"
  worksheet.mergeCells("A12:I12")
  worksheet.getCell("A12").value =
    "注：上列货品请核对后如有不符，请于五日内通知本司退换，逾期不负责。"
  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer).buffer
}

function createSalesPayloadWithLines(lineCount: number): ExportPayload {
  const payload = createPayload("sales")
  const lineItems = Array.from({ length: lineCount }, (_, index) => ({
    productCode: "",
    productName: `测试货品${index + 1}`,
    spec: "",
    color: "",
    unit: "件",
    quantity: index + 1,
    unitPrice: 10,
    lineAmount: (index + 1) * 10,
    lineRemark: "",
  }))
  return {
    ...payload,
    lineItems,
    totals: {
      totalAmount: lineItems.reduce((sum, item) => sum + item.lineAmount, 0),
      lineCount: lineItems.length,
    },
  }
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

afterEach(() => {
  storage.clear()
  vi.restoreAllMocks()
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch })
  Object.defineProperty(globalThis, "caches", { configurable: true, value: originalCaches })
  EXPORT_TEMPLATE_DEFINITIONS.sales.sha256 = originalSalesTemplateSha256
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow)
  } else {
    Reflect.deleteProperty(globalThis, "window")
  }
  if (originalDocument) {
    Object.defineProperty(globalThis, "document", originalDocument)
  } else {
    Reflect.deleteProperty(globalThis, "document")
  }
})

describe("客户端离线导出适配器", () => {
  it("模板地址跟随部署 base path", () => {
    expect(resolveTemplatePath("/templates/sales-order-template.xlsx", "/Tradgio/")).toBe(
      "http://localhost/Tradgio/templates/sales-order-template.xlsx"
    )
  })

  it("打印版不加载 ExcelJS 或模板", async () => {
    const loadExcelJs = vi.fn(() => import("exceljs"))
    const loadTemplate = vi.fn(createSalesTemplate)
    const adapter = createLocalExportAdapter({ loadExcelJs, loadTemplate })

    const blob = await adapter.export({ payload: createPayload(), format: "print" })

    expect(await blob.text()).toContain("测试货品")
    expect(loadExcelJs).not.toHaveBeenCalled()
    expect(loadTemplate).not.toHaveBeenCalled()
  })

  it("使用真实模板生成字段、样式和货币格式保持基线的 Excel", async () => {
    const adapter = createLocalExportAdapter({ loadTemplate: createSalesTemplate })
    const blob = await adapter.export({ payload: createPayload(), format: "sheet" })
    const excelJs = await import("exceljs")
    const workbook = new excelJs.Workbook()
    await workbook.xlsx.load(await blob.arrayBuffer())
    const worksheet = workbook.getWorksheet(1)

    expect(worksheet?.getCell("A4").value).toBe("送货单  NO: SO2026061501")
    expect(worksheet?.getCell("A5").value).toContain("订单号：SO2026061501")
    expect(worksheet?.getCell("B7").value).toBe("测试货品")
    expect(worksheet?.getCell("H7").value).toBe(40)
    expect(worksheet?.getCell("H7").numFmt).toBe("¥#,##0.00")
    expect(worksheet?.getCell("H9").value).toBe(40)
    expect(worksheet?.getCell("B7").alignment).toMatchObject({
      horizontal: "center",
      vertical: "middle",
    })
  })

  it("出货模板动态明细行重新合并底部区域并关闭表格文字自动换行", async () => {
    const adapter = createLocalExportAdapter({ loadTemplate: createSalesTemplate })
    const blob = await adapter.export({
      payload: createSalesPayloadWithLines(6),
      format: "sheet",
    })
    const excelJs = await import("exceljs")
    const workbook = new excelJs.Workbook()
    await workbook.xlsx.load(await blob.arrayBuffer())
    const worksheet = workbook.getWorksheet(1)

    expect(worksheet?.model.merges).toEqual(
      expect.arrayContaining(["F13:G13", "A15:I15", "A16:I16"])
    )
    expect(worksheet?.model.merges).not.toEqual(
      expect.arrayContaining(["F9:G9", "A11:I11", "A12:I12"])
    )
    expect(worksheet?.getCell("B7").alignment?.wrapText).not.toBe(true)
    expect(worksheet?.getCell("C7").alignment?.wrapText).not.toBe(true)
  })

  it("出货模板隐藏整列全空的可选货品字段且保留备注列", async () => {
    const adapter = createLocalExportAdapter({ loadTemplate: createSalesTemplate })
    const blob = await adapter.export({
      payload: createSalesPayloadWithLines(3),
      format: "sheet",
    })
    const excelJs = await import("exceljs")
    const workbook = new excelJs.Workbook()
    await workbook.xlsx.load(await blob.arrayBuffer())
    const worksheet = workbook.getWorksheet(1)

    expect(worksheet?.getColumn(1).hidden).toBe(true)
    expect(worksheet?.getColumn(3).hidden).toBe(true)
    expect(worksheet?.getColumn(4).hidden).toBe(true)
    expect(worksheet?.getColumn(2).hidden).not.toBe(true)
    expect(worksheet?.getColumn(5).hidden).not.toBe(true)
    expect(worksheet?.getColumn(9).hidden).not.toBe(true)
  })

  it("在线读取后缓存模板，断网时继续从版本化缓存读取", async () => {
    const cacheStorage = new MemoryCacheStorage()
    const template = await createSalesTemplate()
    EXPORT_TEMPLATE_DEFINITIONS.sales.sha256 = await sha256(template)
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(template, { status: 200 }))
    Object.defineProperty(globalThis, "caches", { configurable: true, value: cacheStorage })
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: fetchMock })

    const online = await loadExportTemplate("sales")
    fetchMock.mockRejectedValueOnce(new TypeError("offline"))
    const offline = await loadExportTemplate("sales")

    expect(new Uint8Array(online)).toEqual(new Uint8Array(template))
    expect(new Uint8Array(offline)).toEqual(new Uint8Array(template))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await cacheStorage.keys()).toEqual([EXPORT_TEMPLATE_CACHE_NAME])
  })

  it("断网且缓存缺失时返回明确错误", async () => {
    Object.defineProperty(globalThis, "caches", {
      configurable: true,
      value: new MemoryCacheStorage(),
    })
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new TypeError("offline")),
    })

    await expect(loadExportTemplate("sales")).rejects.toMatchObject({
      code: "EXPORT_TEMPLATE_UNAVAILABLE",
      message: "导出模板尚未缓存，请联网后重试",
    })
  })

  it("动态导出组件未缓存时返回明确联网提示", async () => {
    const adapter = createLocalExportAdapter({
      loadExcelJs: async () => {
        throw new TypeError("Failed to fetch dynamically imported module")
      },
      loadTemplate: createSalesTemplate,
    })

    await expect(
      adapter.export({ payload: createPayload(), format: "sheet" })
    ).rejects.toMatchObject({
      code: "EXPORT_TEMPLATE_UNAVAILABLE",
      message: "导出组件尚未缓存，请联网后重试",
    })
  })

  it("缓存模板版本不匹配且断网时拒绝生成文件", async () => {
    const cacheStorage = new MemoryCacheStorage()
    const cache = await cacheStorage.open(EXPORT_TEMPLATE_CACHE_NAME)
    await cache.put(
      resolveTemplatePath(EXPORT_TEMPLATE_DEFINITIONS.sales.path),
      new Response(new Uint8Array([1, 2, 3]))
    )
    Object.defineProperty(globalThis, "caches", { configurable: true, value: cacheStorage })
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new TypeError("offline")),
    })

    await expect(loadExportTemplate("sales")).rejects.toMatchObject({
      code: "EXPORT_TEMPLATE_VERSION_MISMATCH",
    })
  })

  it("内存不足时返回稳定错误且不产生下载文件", async () => {
    const adapter = createLocalExportAdapter({
      loadExcelJs: () => Promise.reject(new RangeError("allocation failed")),
      loadTemplate: createSalesTemplate,
    })

    await expect(
      adapter.export({ payload: createPayload(), format: "sheet" })
    ).rejects.toMatchObject({
      code: "EXPORT_MEMORY_EXHAUSTED",
      message: "可用内存不足，无法生成导出文件",
    })
  })

  it("浏览器下载失败时返回失败结果", async () => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} })
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { createElement: vi.fn() },
    })
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
      throw new Error("download blocked")
    })

    await expect(exportPrint(createPayload())).resolves.toMatchObject({
      success: false,
      message: "导出失败: 浏览器下载失败，请重试",
    })
  })

  it("构建导出 payload 时拒绝其他账号的单据", () => {
    switchAccount("account-a")
    const order = {
      accountId: "account-b",
      documentNo: "CH2026061501",
    } as SalesOrder

    expect(() => buildSalesExportPayload(order)).toThrow("不能导出其他账号的单据")
  })

  it("构建出货导出 payload 时使用手动订单号且不回退到系统单据编号", () => {
    switchAccount("account-a")
    const order = {
      id: "sales-1",
      accountId: "account-a",
      type: "sales",
      documentNo: "CH2026061501",
      customerOrderNo: "SO-MANUAL-001",
      customerId: "customer-1",
      customerName: "测试客户",
      happenedAt: "2026-06-15",
      remark: "",
      totalAmount: 0,
      lines: [],
      createdAt: "2026-06-15T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z",
    } as SalesOrder

    expect(buildSalesExportPayload(order).header.customerOrderNo).toBe("SO-MANUAL-001")
    expect(
      buildSalesExportPayload({
        ...order,
        customerOrderNo: undefined,
      }).header.customerOrderNo
    ).toBe("")
  })
})
