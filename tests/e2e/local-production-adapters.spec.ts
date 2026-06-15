import { expect, test, type Page } from "@playwright/test"
import {
  createCoreFlowSeed,
  createCounterparty,
  createProduct,
  createPurchase,
  createSales,
  downloadTemplate,
  registerAndLogin,
  resetBrowserData,
} from "./helpers/coreFlow"

type MigrationSeed = {
  label: string
  primary: { id: string; username: string; password: string; productName: string }
  secondary: { id: string; username: string; password: string; productName: string }
}

function createMigrationSeed(label: string): MigrationSeed {
  return {
    label,
    primary: {
      id: `${label}-account-a`,
      username: `${label}_user_a`,
      password: "pass1234",
      productName: `${label}主账号货品`,
    },
    secondary: {
      id: `${label}-account-b`,
      username: `${label}_user_b`,
      password: "pass5678",
      productName: `${label}副账号货品`,
    },
  }
}

async function seedLegacyData(page: Page, seed: MigrationSeed) {
  await page.evaluate((input) => {
    const now = "2026-06-15T00:00:00.000Z"
    const accounts = [input.primary, input.secondary]
    localStorage.setItem(
      "tradgio_accounts",
      JSON.stringify(
        accounts.map((account) => ({ id: account.id, username: account.username, createdAt: now }))
      )
    )
    localStorage.setItem(
      "tradgio_passwords",
      JSON.stringify(Object.fromEntries(accounts.map((account) => [account.id, account.password])))
    )

    const products = accounts.map((account, index) => ({
      id: `${account.id}-product`,
      accountId: account.id,
      productCode: `${input.label.toUpperCase()}-P${index + 1}`,
      name: account.productName,
      spec: "A1",
      unit: "件",
      productType: "测试",
      material: "棉",
      defaultPurchasePrice: 10,
      defaultSalesPrice: 20,
      notes: "",
      status: "active",
      createdAt: now,
      updatedAt: now,
    }))
    const counterparties = accounts.flatMap((account) => [
      {
        id: `${account.id}-supplier`,
        accountId: account.id,
        name: `${account.username}供应商`,
        type: "supplier",
        contactPerson: "",
        phone: "",
        address: "",
        notes: "",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `${account.id}-customer`,
        accountId: account.id,
        name: `${account.username}客户`,
        type: "customer",
        contactPerson: "",
        phone: "",
        address: "",
        notes: "",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ])
    const purchases = accounts.map((account) => ({
      id: `${account.id}-purchase`,
      accountId: account.id,
      type: "purchase",
      documentNo: "JH20260601",
      supplierId: `${account.id}-supplier`,
      supplierName: `${account.username}供应商`,
      happenedAt: "2026-06-15",
      remark: "",
      totalAmount: 100,
      lines: [
        {
          id: `${account.id}-purchase-line`,
          productId: `${account.id}-product`,
          productName: account.productName,
          spec: "A1",
          unit: "件",
          quantity: 10,
          unitPrice: 10,
          lineAmount: 100,
        },
      ],
      createdAt: now,
      updatedAt: now,
    }))
    const sales = accounts.map((account) => ({
      id: `${account.id}-sales`,
      accountId: account.id,
      type: "sales",
      documentNo: "CH20260601",
      customerId: `${account.id}-customer`,
      customerName: `${account.username}客户`,
      happenedAt: "2026-06-15",
      remark: "",
      totalAmount: 60,
      lines: [
        {
          id: `${account.id}-sales-line`,
          productId: `${account.id}-product`,
          productCode: `${input.label.toUpperCase()}-P1`,
          productName: account.productName,
          spec: "A1",
          color: "蓝色",
          unit: "件",
          quantity: 3,
          unitPrice: 20,
          lineAmount: 60,
          lineRemark: "",
        },
      ],
      createdAt: now,
      updatedAt: now,
    }))
    const quotes = accounts.map((account) => ({
      id: `${account.id}-quote`,
      accountId: account.id,
      type: "quote",
      documentNo: "BJ20260601",
      customerId: `${account.id}-customer`,
      customerName: `${account.username}客户`,
      happenedAt: "2026-06-15",
      remark: "",
      totalAmount: 40,
      lines: [],
      createdAt: now,
      updatedAt: now,
    }))
    const contracts = accounts.map((account) => ({
      id: `${account.id}-contract`,
      accountId: account.id,
      contractNo: "HT260601",
      title: `${account.username}迁移合同`,
      customerId: `${account.id}-customer`,
      customerName: `${account.username}客户`,
      signDate: "2026-06-15",
      remark: "",
      attachments: [
        {
          id: `${account.id}-attachment`,
          fileName: `${account.username}.pdf`,
          mimeType: "application/pdf",
          fileSize: 5,
          dataUrl: "data:application/pdf;base64,aGVsbG8=",
          uploadedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    }))
    const inventoryLedger = accounts.map((account) => ({
      id: `${account.id}-ledger`,
      accountId: account.id,
      productId: `${account.id}-product`,
      documentType: "purchase",
      documentId: `${account.id}-purchase`,
      quantityDelta: 7,
      createdAt: now,
    }))
    const inventorySnapshots = accounts.map((account) => ({
      id: `${account.id}:${account.id}-product`,
      accountId: account.id,
      productId: `${account.id}-product`,
      quantity: 7,
      updatedAt: now,
    }))

    localStorage.setItem("tradgio_products", JSON.stringify(products))
    localStorage.setItem("tradgio_counterparties", JSON.stringify(counterparties))
    localStorage.setItem("tradgio_purchase_orders", JSON.stringify(purchases))
    localStorage.setItem("tradgio_sales_orders", JSON.stringify(sales))
    localStorage.setItem("tradgio_quote_orders", JSON.stringify(quotes))
    localStorage.setItem("tradgio_contracts", JSON.stringify(contracts))
    localStorage.setItem("tradgio_inventory_ledger", JSON.stringify(inventoryLedger))
    localStorage.setItem("tradgio_inventory_snapshots", JSON.stringify(inventorySnapshots))
  }, seed)
}

async function login(page: Page, username: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("用户名", { exact: true }).fill(username)
  await page.getByLabel("密码", { exact: true }).fill(password)
  await page.getByRole("button", { name: "登录" }).click()
  await expect(page).toHaveURL(/\/overview$/)
}

for (const label of ["migration-one", "migration-two"]) {
  test(`${label} 多账号本地生产数据迁移前后联合摘要一致`, async ({ page }) => {
    const seed = createMigrationSeed(label)
    await resetBrowserData(page)
    await seedLegacyData(page, seed)

    await login(page, seed.primary.username, seed.primary.password)
    await page.goto("/products")
    await expect(page.getByText(seed.primary.productName)).toBeVisible()
    await expect(page.getByText(seed.secondary.productName)).toHaveCount(0)
    await page.goto("/contracts")
    await expect(page.getByText(`${seed.primary.username}迁移合同`)).toBeVisible()

    await page.getByRole("button", { name: "退出登录" }).click()
    await login(page, seed.secondary.username, seed.secondary.password)
    await page.goto("/products")
    await expect(page.getByText(seed.secondary.productName)).toBeVisible()
    await expect(page.getByText(seed.primary.productName)).toHaveCount(0)

    const summary = await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("tradgio")
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const storeNames = [
        "accounts",
        "accountCredentials",
        "products",
        "counterparties",
        "purchaseOrders",
        "salesOrders",
        "quoteOrders",
        "inventoryLedger",
        "inventorySnapshots",
        "contracts",
        "attachmentMetadata",
        "attachmentBlobs",
        "migrationRecords",
      ]
      const transaction = database.transaction(storeNames, "readonly")
      const readAll = (storeName: string) =>
        new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
          const request = transaction.objectStore(storeName).getAll()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
      const entries = await Promise.all(storeNames.map(async (name) => [name, await readAll(name)]))
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
      database.close()
      const stores = Object.fromEntries(entries) as Record<string, Array<Record<string, unknown>>>
      const attachmentTexts = await Promise.all(
        stores.attachmentBlobs.map((record) => (record.blob as Blob).text())
      )
      return {
        counts: Object.fromEntries(storeNames.map((name) => [name, stores[name].length])),
        purchaseAmount: stores.purchaseOrders.reduce(
          (sum, record) => sum + Number(record.totalAmount),
          0
        ),
        salesAmount: stores.salesOrders.reduce(
          (sum, record) => sum + Number(record.totalAmount),
          0
        ),
        quoteAmount: stores.quoteOrders.reduce(
          (sum, record) => sum + Number(record.totalAmount),
          0
        ),
        stock: stores.inventorySnapshots.reduce((sum, record) => sum + Number(record.quantity), 0),
        attachmentBytes: stores.attachmentMetadata.reduce(
          (sum, record) => sum + Number(record.fileSize),
          0
        ),
        attachmentTexts,
        credentials: JSON.stringify(stores.accountCredentials),
        migrationIds: stores.migrationRecords.map((record) => record.id).sort(),
        legacyPasswords: localStorage.getItem("tradgio_passwords"),
        legacyProductsPresent: localStorage.getItem("tradgio_products") !== null,
      }
    })

    expect(summary.counts).toMatchObject({
      accounts: 2,
      accountCredentials: 2,
      products: 2,
      counterparties: 4,
      purchaseOrders: 2,
      salesOrders: 2,
      quoteOrders: 2,
      inventoryLedger: 2,
      inventorySnapshots: 2,
      contracts: 2,
      attachmentMetadata: 2,
      attachmentBlobs: 2,
    })
    expect(summary.purchaseAmount).toBe(200)
    expect(summary.salesAmount).toBe(120)
    expect(summary.quoteAmount).toBe(80)
    expect(summary.stock).toBe(14)
    expect(summary.attachmentBytes).toBe(10)
    expect(summary.attachmentTexts).toEqual(["hello", "hello"])
    expect(summary.credentials).not.toContain(seed.primary.password)
    expect(summary.credentials).not.toContain(seed.secondary.password)
    expect(summary.migrationIds).toEqual([
      "contract-attachments-base64-v1",
      "local-storage-business-data-v1",
    ])
    expect(summary.legacyPasswords).toBeNull()
    expect(summary.legacyProductsPresent).toBe(true)
  })
}

test("模板未缓存且离线时显示可理解的恢复提示", async ({ page }) => {
  const seed = createCoreFlowSeed()
  await resetBrowserData(page)
  await registerAndLogin(page, seed)
  await createProduct(page, seed)
  await createCounterparty(page, seed.supplierName, "supplier")
  await createCounterparty(page, seed.customerName, "customer")
  await createPurchase(page, seed)
  await createSales(page, seed)
  await downloadTemplate(page)

  await page.evaluate(async () => {
    await Promise.all((await caches.keys()).map((cacheName) => caches.delete(cacheName)))
  })
  await page.route("**/templates/sales-order-template.xlsx", (route) =>
    route.abort("internetdisconnected")
  )
  await page.context().setOffline(true)
  await page.getByRole("button", { name: "导出模板Excel" }).click()
  const alert = page.getByRole("alert").filter({ hasText: "导出失败" })
  await expect(alert).toBeVisible()
  await expect(alert).toContainText("导出模板尚未缓存，请联网后重试")
  await page.context().setOffline(false)
})
