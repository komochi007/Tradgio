import { expect, test } from "@playwright/test"
import {
  createCoreFlowSeed,
  createProduct,
  registerAndLogin,
  resetBrowserData,
} from "./helpers/coreFlow"

test("整机加密备份可预览、生成恢复前快照并完整恢复", async ({ page }) => {
  const seed = createCoreFlowSeed()
  const backupPassword = "backup passphrase 2026"
  const runtimeErrors: string[] = []
  await page.addInitScript(() => {
    Object.defineProperty(window, "showSaveFilePicker", { value: undefined })
  })
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text())
  })

  await resetBrowserData(page)
  await registerAndLogin(page, seed)
  await createProduct(page, seed)
  await page.goto("/backup")

  const createCard = page.locator("article").filter({ hasText: "创建整机加密备份" })
  await createCard.getByLabel("备份密码").fill(backupPassword)
  await createCard.getByLabel("再次输入密码").fill(backupPassword)
  await createCard.getByRole("checkbox").check()
  const backupDownloadPromise = page.waitForEvent("download")
  await createCard.getByRole("button", { name: "生成并保存备份" }).click()
  const backupDownload = await backupDownloadPromise
  expect(await backupDownload.failure()).toBeNull()
  expect(backupDownload.suggestedFilename()).toMatch(/\.tradgio-backup$/)
  const backupStream = await backupDownload.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of backupStream) chunks.push(Buffer.from(chunk))
  const backupBytes = Buffer.concat(chunks)

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("tradgio")
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction("products", "readwrite")
    const store = transaction.objectStore("products")
    const records = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    store.put({ ...records[0], name: "恢复前临时货品名" })
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
  })

  const restoreCard = page.locator("article").filter({ hasText: "从备份整机恢复" })
  await restoreCard.locator('input[type="file"]').setInputFiles({
    name: backupDownload.suggestedFilename(),
    mimeType: "application/octet-stream",
    buffer: backupBytes,
  })
  await restoreCard.getByLabel("备份密码").fill(backupPassword)
  await restoreCard.getByRole("button", { name: "检查备份并预览" }).click()
  await expect(restoreCard.getByText("账号", { exact: true })).toBeVisible()
  await expect(restoreCard.getByText("1 个", { exact: true })).toBeVisible()
  await restoreCard.getByRole("checkbox").check()

  const restoreDownloads: string[] = []
  page.on("download", (download) => restoreDownloads.push(download.suggestedFilename()))
  await restoreCard.getByRole("button", { name: "保存恢复前快照并恢复" }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect.poll(() => restoreDownloads.length).toBe(2)
  expect(restoreDownloads.some((name) => name.includes(".pre-restore.tradgio-backup"))).toBe(true)
  expect(restoreDownloads.some((name) => name.startsWith("tradgio-restore-report-"))).toBe(true)

  await page.getByLabel("用户名", { exact: true }).fill(seed.username)
  await page.getByLabel("密码", { exact: true }).fill(seed.password)
  await page.getByRole("button", { name: "登录" }).click()
  await expect(page).toHaveURL(/\/overview$/)
  await page.goto("/products")
  await expect(page.getByText(seed.productName)).toBeVisible()
  await expect(page.getByText("恢复前临时货品名")).toHaveCount(0)
  expect(runtimeErrors).toEqual([])
})
