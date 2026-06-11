import { expect, type Locator, type Page } from "@playwright/test"

export type CoreFlowSeed = ReturnType<typeof createCoreFlowSeed>

export function createCoreFlowSeed() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    keyword: suffix,
    username: `e2e_${suffix}`.slice(0, 30),
    password: "pass1234",
    productName: `E2E货品-${suffix}`,
    productCode: `E2E-${suffix}`.slice(0, 30),
    supplierName: `E2E供应商-${suffix}`,
    customerName: `E2E客户-${suffix}`,
    contractTitle: `E2E合同-${suffix}`,
  }
}

export async function resetBrowserData(page: Page) {
  await page.goto("/login")
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole("heading", { name: "登录 Tradgio" })).toBeVisible()
}

export async function registerAndLogin(page: Page, seed: CoreFlowSeed) {
  await page.goto("/register")
  await page.getByLabel("用户名", { exact: true }).fill(seed.username)
  await page.getByLabel("密码", { exact: true }).fill(seed.password)
  await page.getByLabel("确认密码", { exact: true }).fill(seed.password)
  await page.getByRole("button", { name: "注册" }).click()
  await expect(page.getByRole("heading", { name: "登录 Tradgio" })).toBeVisible()

  await page.getByLabel("用户名", { exact: true }).fill(seed.username)
  await page.getByLabel("密码", { exact: true }).fill(seed.password)
  await page.getByRole("button", { name: "登录" }).click()
  await expect(page).toHaveURL(/\/overview$/)
  await expect(page.getByText(seed.username, { exact: true })).toBeVisible()
}

async function selectOption(page: Page, label: string, option: string) {
  await page.getByLabel(label).click()
  await page.getByRole("option", { name: option, exact: true }).click()
}

async function selectProduct(row: Locator, page: Page, productName: string) {
  await row.getByPlaceholder("搜索或选择货品").fill(productName)
  await page
    .locator(".product-search-select__option")
    .filter({ hasText: productName })
    .first()
    .click()
}

export async function createProduct(page: Page, seed: CoreFlowSeed) {
  await page.goto("/products/new")
  await page.getByLabel("货品名称").fill(seed.productName)
  await page.getByLabel("产品编号").fill(seed.productCode)
  await page.getByLabel("规格型号").fill("90cm")
  await selectOption(page, "单位", "件")
  await page.getByLabel("产品类型").fill("面料")
  await page.getByLabel("材质").fill("棉")
  await page.getByLabel("默认进价").fill("12")
  await page.getByLabel("默认售价").fill("18")
  await page.getByRole("button", { name: "创建货品" }).click()
  await expect(page).toHaveURL(/\/products$/)
  await expect(page.getByText(seed.productName)).toBeVisible()
}

export async function createCounterparty(page: Page, name: string, type: "customer" | "supplier") {
  await page.goto("/counterparties/new")
  await page.getByLabel("单位名称").fill(name)
  await selectOption(page, "类型", type === "customer" ? "客户" : "供应商")
  await page.getByLabel("联系人").fill("E2E测试联系人")
  await page.getByLabel("联系电话").fill("13800000000")
  await page.getByRole("button", { name: "创建单位" }).click()
  await expect(page).toHaveURL(/\/counterparties$/)
  await expect(page.getByText(name)).toBeVisible()
}

export async function createPurchase(page: Page, seed: CoreFlowSeed) {
  await page.goto("/purchases/new")
  await selectOption(page, "供应商", seed.supplierName)
  const row = page.locator("tbody tr").first()
  await selectProduct(row, page, seed.productName)
  await row.getByPlaceholder("0", { exact: true }).fill("10")
  await page.getByRole("button", { name: "保存进货单" }).click()
  await expect(page).toHaveURL(/\/purchases\/.+/)
  await expect(page.getByText("进货单详情")).toBeVisible()
}

export async function createSales(page: Page, seed: CoreFlowSeed) {
  await page.goto("/sales/new")
  await selectOption(page, "客户", seed.customerName)
  const row = page.locator("tbody tr").first()
  await selectProduct(row, page, seed.productName)
  await row.getByPlaceholder("颜色").fill("象牙白")
  await row.getByPlaceholder("0", { exact: true }).fill("3")
  await page.getByRole("button", { name: "保存出货单" }).click()
  await expect(page).toHaveURL(/\/sales\/.+/)
  await expect(page.getByText("出货单详情")).toBeVisible()
}

export async function createQuote(page: Page, seed: CoreFlowSeed) {
  await page.goto("/quotes/new")
  await selectOption(page, "客户", seed.customerName)
  const row = page.locator("tbody tr").first()
  await selectProduct(row, page, seed.productName)
  await row.getByPlaceholder("颜色").fill("雾蓝")
  await row.getByPlaceholder("起订量").fill("20")
  await row.getByPlaceholder("0", { exact: true }).fill("5")
  await row.getByPlaceholder("选填").fill("免版费")
  await row.getByPlaceholder("货期").fill("7天")
  await page.getByRole("button", { name: "保存报价单" }).click()
  await expect(page).toHaveURL(/\/quotes\/.+/)
  await expect(page.getByText("报价单详情")).toBeVisible()
}

export async function createContract(page: Page, seed: CoreFlowSeed) {
  await page.goto("/contracts/new")
  await selectOption(page, "客户", seed.customerName)
  await page.getByLabel("合同标题").fill(seed.contractTitle)
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-contract.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTradgio E2E contract\n%%EOF"),
  })
  await expect(page.getByText("e2e-contract.pdf")).toBeVisible()
  await page.getByRole("button", { name: "保存合同" }).click()
  await expect(page).toHaveURL(/\/contracts$/)
  await expect(page.getByText(seed.contractTitle)).toBeVisible()
}

export async function downloadTemplate(page: Page) {
  const documentNo = (await page.getByText(/^单据编号：/).textContent())
    ?.replace("单据编号：", "")
    .trim()
  expect(documentNo).toBeTruthy()

  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "导出模板Excel" }).click()
  const download = await downloadPromise
  expect(await download.failure()).toBeNull()
  expect(download.suggestedFilename()).toBe(`${documentNo}-模板Excel.xlsx`)
}
