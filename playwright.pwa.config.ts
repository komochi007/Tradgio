import { defineConfig } from "@playwright/test"

const noProxyHosts = [process.env.NO_PROXY, "127.0.0.1", "localhost"].filter(Boolean).join(",")
process.env.NO_PROXY = noProxyHosts
process.env.no_proxy = noProxyHosts

export default defineConfig({
  testDir: "./tests/pwa",
  timeout: 120_000,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    viewport: { width: 1440, height: 960 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174/login",
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
