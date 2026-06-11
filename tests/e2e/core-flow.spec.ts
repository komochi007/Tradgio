import { expect, test } from "@playwright/test"
import {
  createContract,
  createCoreFlowSeed,
  createCounterparty,
  createProduct,
  createPurchase,
  createQuote,
  createSales,
  downloadTemplate,
  registerAndLogin,
  resetBrowserData,
} from "./helpers/coreFlow"

test("核心业务链路和模板导出可在干净环境重复通过", async ({ page }) => {
  const seed = createCoreFlowSeed()
  const runtimeErrors: string[] = []
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ current: { temperature_2m: 25, weather_code: 0 } }),
    })
  )
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text())
  })

  await resetBrowserData(page)
  await registerAndLogin(page, seed)
  await createProduct(page, seed)
  await createCounterparty(page, seed.supplierName, "supplier")
  await createCounterparty(page, seed.customerName, "customer")
  await createPurchase(page, seed)
  await createSales(page, seed)
  await downloadTemplate(page)
  await createQuote(page, seed)
  await downloadTemplate(page)
  await createContract(page, seed)

  await page.goto("/overview")
  await expect(page.getByText("库存概览")).toBeVisible()
  await expect(page.getByRole("cell", { name: seed.productName })).toBeVisible()
  await expect(page.getByText("7 件")).toBeVisible()

  await page.getByPlaceholder("搜索进货、出货、报价、合同").fill(seed.keyword)
  await page.getByRole("button", { name: "搜索" }).click()
  await expect(page.getByRole("button", { name: /进货单/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /出货单/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /报价单/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /合同/ })).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/overview$/)
  await expect(page.getByText(seed.username, { exact: true })).toBeVisible()
  expect(runtimeErrors).toEqual([])
})
