import { useEffect, useState, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  formatCurrency,
  formatDate,
  SkeletonCard,
  SkeletonTable,
  EmptyState,
  Tag,
  Button,
  Input,
} from "../../../shared"
import { useAuth } from "../../auth"
import {
  PurchaseIcon,
  SalesIcon,
  QuoteIcon,
  SearchIcon,
} from "../../../shared/icons"
import { fetchOverviewData } from "../application/overviewService"
import { getWeather } from "../application/weatherService"
import { searchDocuments } from "../../search/application/searchService"
import { typeLabel, typeVariant } from "../../search/domain/types"
import type { OverviewData } from "../application/overviewService"
import type { WeatherInfo } from "../application/weatherService"
import type { SearchResult } from "../../search/domain/types"

const quickActions = [
  { path: "/purchases/new", label: "新建进货单", desc: "记录进货并增加库存", Icon: PurchaseIcon },
  { path: "/sales/new", label: "新建出货单", desc: "记录出货并校验库存", Icon: SalesIcon },
  { path: "/quotes/new", label: "新建报价单", desc: "生成报价，不影响库存", Icon: QuoteIcon },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function getFormattedDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return `${y}-${m}-${d} ${weekdays[now.getDay()]}`
}

export function OverviewPage() {
  const navigate = useNavigate()
  const { account } = useAuth()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [weather, setWeather] = useState<WeatherInfo | null>(null)

  const [searchKeyword, setSearchKeyword] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchState, setSearchState] = useState<"idle" | "loading" | "results" | "empty" | "error">("idle")
  const [searchError, setSearchError] = useState("")

  useEffect(() => {
    let cancelled = false
    fetchOverviewData()
      .then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setError(e instanceof Error ? e.message : "加载失败"); setLoading(false) } })
    getWeather()
      .then((w) => { if (!cancelled) setWeather(w) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleSearch = useCallback(async () => {
    const trimmed = searchKeyword.trim()
    if (!trimmed) return
    setSearchState("loading")
    setSearchError("")
    try {
      const results = await searchDocuments(trimmed)
      setSearchResults(results)
      setSearchState(results.length === 0 ? "empty" : "results")
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "搜索失败")
      setSearchState("error")
    }
  }, [searchKeyword])

  if (error) {
    return (
      <div className="overview-page">
        <section className="section-card">
          <EmptyState
            title="页面加载失败"
            description={error}
            primaryAction={{
              label: "重新加载",
              onClick: () => {
                setLoading(true)
                setError(null)
                fetchOverviewData()
                  .then((d) => { setData(d); setLoading(false) })
                  .catch((e) => { setError(e instanceof Error ? e.message : "加载失败"); setLoading(false) })
              },
            }}
          />
        </section>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="overview-page">
        <SkeletonCard />
        <div className="overview__quick-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="overview__bento-grid">
          <SkeletonTable rows={5} cols={3} />
          <SkeletonTable rows={5} cols={4} />
        </div>
      </div>
    )
  }

  const hasAnyData =
    (data?.totalProductCount ?? 0) > 0 ||
    (data?.totalCounterpartyCount ?? 0) > 0 ||
    (data?.recentRecords.length ?? 0) > 0

  return (
    <div className="overview-page">
      {/* Welcome Card */}
      <section className="hero-card overview__welcome">
        <p className="overview__greeting">
          {getGreeting()}, {account?.username ?? "User"}
        </p>
        <div className="overview__welcome-meta">
          <span className="overview__date">{getFormattedDate()}</span>
          {weather && (
            <span className="overview__weather">
              {weather.icon} {weather.city} {weather.temperature}°C {weather.description}
            </span>
          )}
          {!weather && <span className="overview__weather overview__weather--loading">加载天气中...</span>}
        </div>
      </section>

      {/* Quick Actions */}
      <div className="overview__quick-grid">
        {quickActions.map(({ path, label, desc, Icon }) => (
          <article
            key={path}
            className="section-card section-card--interactive"
            onClick={() => navigate(path)}
          >
            <div className="overview__quick-icon">
              <Icon size={24} />
            </div>
            <h3 className="section-card__title">{label}</h3>
            <p className="section-card__description">{desc}</p>
          </article>
        ))}
      </div>

      {/* Bento Grid: Stock + Recent */}
      {hasAnyData ? (
        <div className="overview__bento-grid">
          <section className="section-card overview__bento-card">
            <p className="section-eyebrow">库存概览</p>
            <h3 className="section-card__title">
              {data!.stockItems.length > 0
                ? `共 ${data!.stockItems.length} 种货品有库存记录`
                : "暂无库存记录"}
            </h3>
            {data!.stockItems.length > 0 ? (
              <div className="overview__stock-list">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>货品</th>
                      <th>规格</th>
                      <th className="data-table__num">当前库存</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.stockItems.slice(0, 10).map((item) => {
                      const isLow = item.quantity < 10
                      return (
                        <tr key={item.productId}>
                          <td className="data-table__name">{item.productName}</td>
                          <td className="data-table__muted">{item.spec || "-"}</td>
                          <td className="data-table__num">
                            {isLow ? (
                              <span className="overview__stock-low">{item.quantity} {item.unit}</span>
                            ) : (
                              <span>{item.quantity} {item.unit}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="section-card__description">完成进货或出货后，库存记录会在这里展示。</p>
            )}
          </section>

          <section className="section-card overview__bento-card">
            <p className="section-eyebrow">最近单据</p>
            <h3 className="section-card__title">
              {data!.recentRecords.length > 0
                ? `最近 ${data!.recentRecords.length} 条记录`
                : "暂无单据"}
            </h3>
            {data!.recentRecords.length > 0 ? (
              <div className="overview__recent-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>类型</th>
                      <th>编号</th>
                      <th>往来单位</th>
                      <th>日期</th>
                      <th className="data-table__num">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.recentRecords.map((record) => {
                      const recType = record.type as "purchase" | "sales" | "quote"
                      return (
                        <tr
                          key={record.id}
                          className="overview__recent-row"
                          onClick={() => navigate(record.route)}
                        >
                          <td>
                            <Tag variant={typeVariant[recType]}>
                              {typeLabel[recType]}
                            </Tag>
                          </td>
                          <td className="data-table__name">{record.documentNo}</td>
                          <td>{record.counterpartyName}</td>
                          <td className="data-table__muted">{formatDate(record.happenedAt)}</td>
                          <td className="data-table__num">{formatCurrency(record.totalAmount)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="还没有单据记录"
                description="新建进货单、出货单或报价单后，这里会展示最近的操作。"
              />
            )}
          </section>
        </div>
      ) : (
        <section className="section-card">
          <EmptyState
            title="还没有单据记录"
            description="新建进货单、出货单或报价单后，这里会展示最近的操作和库存摘要。"
          />
        </section>
      )}

      {/* Inline Search Card */}
      <section className="section-card overview__search-card">
        <p className="section-eyebrow">跨模块搜索</p>
        <h3 className="section-card__title">查找单据与合同</h3>
        <div className="overview__search-bar">
          <Input
            ref={searchInputRef}
            placeholder="搜索货品、客户、供应商、单据编号、合同标题"
            value={searchKeyword}
            disabled={searchState === "loading"}
            onChange={(e) => setSearchKeyword((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button
            variant="primary"
            loading={searchState === "loading"}
            onClick={handleSearch}
          >
            <SearchIcon size={18} />
            搜索
          </Button>
        </div>

        {searchState === "loading" && (
          <div className="overview__search-status">正在搜索...</div>
        )}

        {searchState === "empty" && (
          <div className="overview__search-status">
            未找到与「{searchKeyword}」相关的记录，请尝试其他关键词。
          </div>
        )}

        {searchState === "error" && (
          <div className="overview__search-status overview__search-status--error">
            {searchError}
          </div>
        )}

        {searchState === "results" && (
          <div className="overview__search-results">
            <div className="overview__search-summary">
              找到 {searchResults.length} 条与「{searchKeyword}」相关的结果
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>类型</th>
                  <th>编号 / 标题</th>
                  <th>关联方</th>
                  <th>匹配字段</th>
                  <th style={{ width: 120 }}>日期</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((item) => (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className="overview__recent-row"
                    onClick={() => navigate(item.targetRoute)}
                  >
                    <td>
                      <Tag variant={typeVariant[item.type]}>
                        {typeLabel[item.type]}
                      </Tag>
                    </td>
                    <td className="data-table__name">{item.title}</td>
                    <td>{item.subtitle}</td>
                    <td className="data-table__muted">{item.matchedField}</td>
                    <td className="data-table__muted">{formatDate(item.happenedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
