import { cp, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const distDir = path.join(root, "dist")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const schemaSource = await readFile(
  path.join(root, "src/shared/persistence/indexeddbSchema.ts"),
  "utf8"
)
const schemaVersion = Number(schemaSource.match(/INDEXED_DB_SCHEMA_VERSION\s*=\s*(\d+)/)?.[1])

if (!Number.isInteger(schemaVersion)) throw new Error("无法读取 IndexedDB schema 版本")

const appVersion = process.env.VITE_APP_VERSION || packageJson.version
const updateRisk = process.env.VITE_UPDATE_RISK === "high" ? "high" : "normal"
const basePath = normalizeBasePath(process.env.VITE_BASE_PATH || "/")

const manifest = {
  id: basePath,
  name: "Tradgio 库存管理平台",
  short_name: "Tradgio",
  description: "本地优先、支持离线运行的库存管理平台",
  lang: "zh-CN",
  start_url: basePath,
  scope: basePath,
  display: "standalone",
  background_color: "#f6f8fb",
  theme_color: "#2563eb",
  icons: [
    {
      src: `${basePath}icons/app-icon.svg`,
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any maskable",
    },
  ],
}

await writeFile(path.join(distDir, "manifest.webmanifest"), JSON.stringify(manifest, null, 2))
await writeFile(path.join(distDir, "offline.html"), await createOfflineShell())
const offlineShell = await readFile(path.join(distDir, "offline.html"), "utf8")

const files = await listFiles(distDir)
const precacheUrls = files
  .filter(
    (file) =>
      !file.endsWith(".map") &&
      file !== "sw.js" &&
      file !== "404.html" &&
      file !== "offline.html" &&
      !file.includes("exceljs")
  )
  .map((file) => `${basePath}${file}`)

const swSource = `const APP_VERSION = ${JSON.stringify(appVersion)}
const SCHEMA_VERSION = ${schemaVersion}
const UPDATE_RISK = ${JSON.stringify(updateRisk)}
const BASE_PATH = ${JSON.stringify(basePath)}
const CACHE_PREFIX = "tradgio-app-"
const CACHE_NAME = CACHE_PREFIX + APP_VERSION
const OFFLINE_SHELL = ${JSON.stringify(offlineShell)}
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting()
  if (event.data?.type === "GET_VERSION") {
    event.ports[0]?.postMessage({ appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION, risk: UPDATE_RISK })
  }
  if (event.data?.type === "CHECK_CACHE") {
    matchAppCache(event.data.url).then((cached) => event.ports[0]?.postMessage(Boolean(cached)))
  }
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE_PATH)) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => new Response(OFFLINE_SHELL, { headers: { "Content-Type": "text/html; charset=utf-8" } }))
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
        }
        return response
      })
      .catch(() => matchAppCache(request))
  )
})

async function matchAppCache(request) {
  const keys = await caches.keys()
  const appCaches = [CACHE_NAME, ...keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)]
  const cacheKey = typeof request === "string" ? request : new URL(request.url).pathname
  for (const cacheName of appCaches) {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(cacheKey, { ignoreVary: true })
    if (cached) return cached
    const cachedRequest = (await cache.keys()).find((item) => new URL(item.url).pathname === cacheKey)
    if (cachedRequest) return cache.match(cachedRequest, { ignoreVary: true })
  }
}
`

await writeFile(path.join(distDir, "sw.js"), swSource)
await cp(path.join(distDir, "index.html"), path.join(distDir, "404.html"))

function normalizeBasePath(value) {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), relativePath)))
    } else {
      files.push(relativePath)
    }
  }
  return files.sort()
}

async function createOfflineShell() {
  let html = await readFile(path.join(distDir, "index.html"), "utf8")
  const scriptPath = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)?.[1]
  const stylePath = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/)?.[1]
  if (!scriptPath || !stylePath) throw new Error("无法识别生产构建主资源")

  const script = (await readFile(resolveOutputPath(scriptPath), "utf8")).replaceAll(
    "</script",
    "<\\/script"
  )
  const style = (await readFile(resolveOutputPath(stylePath), "utf8")).replaceAll(
    "</style",
    "<\\/style"
  )
  html = html.replace(
    /<script type="module" crossorigin src="[^"]+"><\/script>/,
    () => `<script type="module">${script}</script>`
  )
  return html.replace(
    /<link rel="stylesheet" crossorigin href="[^"]+">/,
    () => `<style>${style}</style>`
  )
}

function resolveOutputPath(urlPath) {
  const relativePath = urlPath.startsWith(basePath)
    ? urlPath.slice(basePath.length)
    : urlPath.slice(1)
  return path.join(distDir, relativePath)
}
