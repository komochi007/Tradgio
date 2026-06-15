import { execFileSync } from "node:child_process"
import { expect, test, type Page } from "@playwright/test"
import { createCoreFlowSeed, registerAndLogin, resetBrowserData } from "../e2e/helpers/coreFlow"

test.afterAll(() => generateServiceWorker("0.1.0"))

test("PWA 支持离线启动、安全更新和静态版本回滚", async ({ page, context }) => {
  const seed = createCoreFlowSeed()
  await page.goto("/login")
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await resetBrowserData(page)
  await registerAndLogin(page, seed)

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)
  await expect(page.getByText(seed.username, { exact: true })).toBeVisible()
  const cachedResources = await page.evaluate(async () => {
    const scripts = Array.from(document.scripts)
      .map((script) => script.src)
      .filter(Boolean)
    const styles = Array.from(document.styleSheets)
      .map((sheet) => sheet.href)
      .filter((href): href is string => Boolean(href))
    return Promise.all(
      [...scripts, ...styles].map(async (url) => ({
        url,
        cached: Boolean(await caches.match(url)),
      }))
    )
  })
  expect(cachedResources.every((resource) => resource.cached)).toBe(true)
  expect(await checkControllerCache(page, cachedResources[0].url)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText(seed.username, { exact: true })).toBeVisible()
  await context.setOffline(false)

  generateServiceWorker("0.1.1")
  await checkForUpdate(page)
  const banner = page.getByTestId("pwa-update-banner")
  await expect(banner).toContainText("0.1.0 → 0.1.1")

  await page.goto("/products/new")
  await banner.getByRole("button", { name: "安全更新" }).click()
  await expect(banner).toContainText("当前正在编辑")

  await page.goto("/overview")
  await banner.getByRole("button", { name: "安全更新" }).click()
  await expect(banner.getByRole("button", { name: "刷新使用新版" })).toBeVisible()
  await banner.getByRole("button", { name: "刷新使用新版" }).click()
  await expect(page.getByText(seed.username, { exact: true })).toBeVisible()

  generateServiceWorker("0.1.0")
  await checkForUpdate(page)
  await expect(banner).toContainText("0.1.0 → 0.1.0")
  await banner.getByRole("button", { name: "安全更新" }).click()
  await expect(banner.getByRole("button", { name: "刷新使用新版" })).toBeVisible()
})

async function checkForUpdate(page: Page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) throw new Error("Service Worker 未注册")
    await registration.update()
  })
}

function generateServiceWorker(version: string) {
  execFileSync("node", ["scripts/generate-pwa-assets.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, VITE_APP_VERSION: version },
  })
}

async function checkControllerCache(page: Page, url: string) {
  return page.evaluate(
    ({ resourceUrl }) =>
      new Promise<boolean>((resolve, reject) => {
        const controller = navigator.serviceWorker.controller
        if (!controller) return reject(new Error("页面未被 Service Worker 控制"))
        const channel = new MessageChannel()
        channel.port1.onmessage = (event) => resolve(Boolean(event.data))
        controller.postMessage({ type: "CHECK_CACHE", url: resourceUrl }, [channel.port2])
      }),
    { resourceUrl: url }
  )
}
