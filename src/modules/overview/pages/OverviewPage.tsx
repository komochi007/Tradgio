import { useEffect, useState, useCallback, useRef, type MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  formatCurrency,
  formatDate,
  formatNumber,
  SkeletonCard,
  SkeletonTable,
  EmptyState,
  Tag,
  Button,
  Input,
  Select,
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
import type {
  MonthlySalesMetric,
  OverviewData,
  ProductTypeSalesSeries,
  ProductTypeSkuItem,
} from "../application/overviewService"
import type { WeatherInfo } from "../application/weatherService"
import type { SearchResult } from "../../search/domain/types"

const ALL_PRODUCT_TYPES = "__all_product_types__"
const chartColors = ["#2563EB", "#16A34A", "#D97706", "#0891B2", "#64748B", "#DB2777"]

const quickActions = [
  { path: "/purchases/new", label: "新建进货单", desc: "记录进货并增加库存", Icon: PurchaseIcon },
  { path: "/sales/new", label: "新建出货单", desc: "记录出货并校验库存", Icon: SalesIcon },
  { path: "/quotes/new", label: "新建报价单", desc: "生成报价，不影响库存", Icon: QuoteIcon },
]

type ChartTooltip = {
  x: number
  y: number
  title: string
  value: string
  meta?: string
}

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

function WeatherGlyph({ description }: { description?: string }) {
  const isRain = description?.includes("雨")
  const isCloud = description?.includes("云") || description?.includes("阴")

  return (
    <svg className="overview__weather-glyph" viewBox="0 0 24 24" aria-hidden="true">
      {isRain ? (
        <>
          <path d="M7.4 15.2h8.9a4.1 4.1 0 0 0 .4-8.1 5.4 5.4 0 0 0-10.2 1.7 3.2 3.2 0 0 0 .9 6.4Z" />
          <path d="M8 19.4l1-1.8M12 20.2l1-1.8M16 19.4l1-1.8" />
        </>
      ) : isCloud ? (
        <path d="M7.4 16h9.1a4.2 4.2 0 0 0 .5-8.4 5.6 5.6 0 0 0-10.7 1.8A3.4 3.4 0 0 0 7.4 16Z" />
      ) : (
        <>
          <path d="M12 7.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Z" />
          <path d="M12 2.8v2M12 19.2v2M4.8 4.8l1.4 1.4M17.8 17.8l1.4 1.4M2.8 12h2M19.2 12h2M4.8 19.2l1.4-1.4M17.8 6.2l1.4-1.4" />
        </>
      )}
    </svg>
  )
}

function getTooltipPoint(e: MouseEvent<SVGElement>) {
  const svg = e.currentTarget.ownerSVGElement ?? e.currentTarget
  const rect = svg.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function ChartTooltipLayer({ tooltip }: { tooltip: ChartTooltip | null }) {
  if (!tooltip) return null

  return (
    <div
      className="overview-chart__tooltip"
      style={{ left: tooltip.x, top: tooltip.y }}
    >
      <span className="overview-chart__tooltip-title">{tooltip.title}</span>
      <span className="overview-chart__tooltip-value">{tooltip.value}</span>
      {tooltip.meta && <span className="overview-chart__tooltip-meta">{tooltip.meta}</span>}
    </div>
  )
}

function ProductTypeDonutChart({ items }: { items: ProductTypeSkuItem[] }) {
  const [tooltip, setTooltip] = useState<ChartTooltip | null>(null)
  const total = items.reduce((sum, item) => sum + item.skuCount, 0)
  const radius = 58
  const circumference = 2 * Math.PI * radius
  let offset = 0

  if (total === 0) {
    return (
      <EmptyState
        title="暂无货品类型数据"
        description="给货品补充产品类型后，这里会展示 SKU 分布。"
      />
    )
  }

  return (
    <div className="overview-chart overview-chart--donut">
      <svg className="overview-chart__donut" viewBox="0 0 180 180" role="img" aria-label="按产品类型展示 SKU 数量">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="#EEF2F7"
          strokeWidth="18"
        />
        {items.map((item, index) => {
          const dash = (item.skuCount / total) * circumference
          const dashOffset = -offset
          offset += dash
          return (
            <circle
              key={item.productType}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={chartColors[index % chartColors.length]}
              strokeWidth="18"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 90 90)"
              onMouseEnter={(e) => {
                const point = getTooltipPoint(e)
                setTooltip({
                  ...point,
                  title: item.productType,
                  value: `${formatNumber(item.skuCount)} 个 SKU`,
                  meta: `${Math.round((item.skuCount / total) * 100)}%`,
                })
              }}
              onMouseMove={(e) => {
                const point = getTooltipPoint(e)
                setTooltip((prev) => prev ? { ...prev, ...point } : prev)
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <title>{`${item.productType}: ${formatNumber(item.skuCount)} 个 SKU`}</title>
            </circle>
          )
        })}
        <text x="90" y="84" textAnchor="middle" className="overview-chart__center-value">
          {formatNumber(total)}
        </text>
        <text x="90" y="108" textAnchor="middle" className="overview-chart__center-label">
          SKU
        </text>
      </svg>
      <ChartTooltipLayer tooltip={tooltip} />
      <div className="overview-chart__legend">
        {items.map((item, index) => (
          <div className="overview-chart__legend-item" key={item.productType}>
            <span
              className="overview-chart__legend-dot"
              style={{ background: chartColors[index % chartColors.length] }}
            />
            <span className="overview-chart__legend-name">{item.productType}</span>
            <span className="overview-chart__legend-value">{formatNumber(item.skuCount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function getSelectedSalesSeries(
  salesSeries: ProductTypeSalesSeries[],
  selectedType: string
): MonthlySalesMetric[] {
  if (salesSeries.length === 0) return []

  if (selectedType !== ALL_PRODUCT_TYPES) {
    return salesSeries.find((series) => series.productType === selectedType)?.months ?? salesSeries[0].months.map((month) => ({ ...month, quantity: 0, amount: 0 }))
  }

  return salesSeries[0].months.map((month, index) => ({
    ...month,
    quantity: salesSeries.reduce((sum, series) => sum + series.months[index].quantity, 0),
    amount: Math.round(salesSeries.reduce((sum, series) => sum + series.months[index].amount, 0) * 100) / 100,
  }))
}

function MonthlyBarChart({
  data,
  metric,
}: {
  data: MonthlySalesMetric[]
  metric: "quantity" | "amount"
}) {
  const [tooltip, setTooltip] = useState<ChartTooltip | null>(null)
  const values = data.map((item) => item[metric])
  const maxValue = Math.max(...values, 0)
  const total = values.reduce((sum, value) => sum + value, 0)
  const width = 360
  const height = 220
  const padding = { top: 20, right: 12, bottom: 34, left: 36 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const barSlot = data.length > 0 ? chartWidth / data.length : chartWidth
  const barWidth = Math.min(18, barSlot * 0.48)
  const formatValue = metric === "amount" ? formatCurrency : formatNumber
  const emptyTitle = metric === "amount" ? "暂无出货金额数据" : "暂无出货数量数据"

  if (data.length === 0 || total === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description="完成出货单后，这里会按近 12 个月展示趋势。"
      />
    )
  }

  return (
    <div className="overview-chart overview-chart--bar">
      <svg className="overview-chart__bar" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={metric === "amount" ? "近 12 个月出货金额" : "近 12 个月出货数量"}>
        {[0, 0.5, 1].map((scale) => {
          const y = padding.top + chartHeight - chartHeight * scale
          return (
            <g key={scale}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                className="overview-chart__grid-line"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="overview-chart__axis-label"
              >
                {formatValue(maxValue * scale)}
              </text>
            </g>
          )
        })}
        {data.map((item, index) => {
          const value = item[metric]
          const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0
          const x = padding.left + index * barSlot + (barSlot - barWidth) / 2
          const y = padding.top + chartHeight - barHeight
          const tooltipPayload = {
            title: item.monthLabel,
            value: formatValue(value),
            meta: metric === "amount" ? `${formatNumber(item.quantity)} 件出货` : formatCurrency(item.amount),
          }

          return (
            <g key={item.monthKey}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="7"
                className="overview-chart__bar-rect"
              />
              <rect
                x={padding.left + index * barSlot}
                y={padding.top}
                width={barSlot}
                height={chartHeight}
                className="overview-chart__bar-hit"
                fill="transparent"
                onMouseEnter={(e) => {
                  const point = getTooltipPoint(e)
                  setTooltip({
                    ...point,
                    ...tooltipPayload,
                  })
                }}
                onMouseOver={(e) => {
                  const point = getTooltipPoint(e)
                  setTooltip({
                    ...point,
                    ...tooltipPayload,
                  })
                }}
                onMouseMove={(e) => {
                  const point = getTooltipPoint(e)
                  setTooltip((prev) => prev ? { ...prev, ...point } : prev)
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <title>{`${item.monthLabel}: ${formatValue(value)}`}</title>
              </rect>
              {(index % 2 === 0 && index !== data.length - 2) || index === data.length - 1 ? (
                <text
                  x={x + barWidth / 2}
                  y={height - 10}
                  textAnchor="middle"
                  className="overview-chart__axis-label"
                >
                  {item.monthLabel}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      <ChartTooltipLayer tooltip={tooltip} />
    </div>
  )
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
  const [quantityProductType, setQuantityProductType] = useState(ALL_PRODUCT_TYPES)
  const [amountProductType, setAmountProductType] = useState(ALL_PRODUCT_TYPES)

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
    if (!trimmed) {
      setSearchResults([])
      setSearchState("idle")
      return
    }
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

  function handleResultClick(item: SearchResult) {
    navigate(item.targetRoute)
    setSearchKeyword("")
    setSearchResults([])
    setSearchState("idle")
  }

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
        <section className="overview__page-header overview__page-header--loading">
          <SkeletonCard />
        </section>
        <div className="overview__quick-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="overview__bento-grid">
          <SkeletonTable rows={5} cols={3} />
          <SkeletonTable rows={5} cols={4} />
        </div>
        <div className="overview__dashboard-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  const hasAnyData =
    (data?.totalProductCount ?? 0) > 0 ||
    (data?.totalCounterpartyCount ?? 0) > 0 ||
    (data?.recentRecords.length ?? 0) > 0
  const chartFilterOptions = [
    { value: ALL_PRODUCT_TYPES, label: "全部类型" },
    ...data!.dashboard.productTypes.map((productType) => ({
      value: productType,
      label: productType,
    })),
  ]
  const quantitySeries = getSelectedSalesSeries(data!.dashboard.salesSeries, quantityProductType)
  const amountSeries = getSelectedSalesSeries(data!.dashboard.salesSeries, amountProductType)
  const totalSkuCount = data!.dashboard.productTypeSkuItems.reduce((sum, item) => sum + item.skuCount, 0)
  const totalSalesQuantity = quantitySeries.reduce((sum, item) => sum + item.quantity, 0)
  const totalSalesAmount = amountSeries.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="overview-page">
      <section className="overview__page-header">
        <div className="overview__header-copy">
          <h1 className="overview__greeting">
            {getGreeting()}, {account?.username ?? "User"}!
          </h1>
          <div className="overview__welcome-meta">
            <span className="overview__date">{getFormattedDate()}</span>
            {weather ? (
              <span className="overview__weather">
                <WeatherGlyph description={weather.description} />
                {weather.city} {weather.temperature}°C {weather.description}
              </span>
            ) : (
              <span className="overview__weather overview__weather--loading">
                <WeatherGlyph />
                天气加载中
              </span>
            )}
          </div>
        </div>

        <div className="overview__header-search">
          <div className="overview__search-control">
            <SearchIcon size={18} />
            <Input
              ref={searchInputRef}
              placeholder="搜索进货、出货、报价、合同"
              value={searchKeyword}
              disabled={searchState === "loading"}
              onChange={(e) => setSearchKeyword((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              variant="secondary"
              loading={searchState === "loading"}
              onClick={handleSearch}
            >
              搜索
            </Button>
          </div>

          {searchState !== "idle" && (
            <div className="overview__search-dropdown">
              {searchState === "loading" && (
                <div className="overview__search-message">正在搜索...</div>
              )}
              {searchState === "empty" && (
                <div className="overview__search-message">
                  未找到与「{searchKeyword}」相关的记录
                </div>
              )}
              {searchState === "error" && (
                <div className="overview__search-message overview__search-message--error">
                  {searchError}
                </div>
              )}
              {searchState === "results" && (
                <div className="overview__search-list">
                  {searchResults.slice(0, 8).map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      className="overview__search-item"
                      type="button"
                      onClick={() => handleResultClick(item)}
                    >
                      <Tag variant={typeVariant[item.type]}>
                        {typeLabel[item.type]}
                      </Tag>
                      <span className="overview__search-item-main">
                        <span className="overview__search-item-title">{item.title}</span>
                        <span className="overview__search-item-subtitle">
                          {item.subtitle} · {item.matchedField}
                        </span>
                      </span>
                      <span className="overview__search-item-date">
                        {formatDate(item.happenedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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

      <div className="overview__dashboard-grid">
        <section className="section-card overview__dashboard-card overview__dashboard-card--donut">
          <div className="overview__card-header">
            <div>
              <p className="section-eyebrow">产品类型分布</p>
              <h3 className="section-card__title">
                {totalSkuCount > 0 ? `共 ${formatNumber(totalSkuCount)} 个 SKU` : "暂无 SKU 数据"}
              </h3>
            </div>
          </div>
          <ProductTypeDonutChart items={data!.dashboard.productTypeSkuItems} />
        </section>

        <section className="section-card overview__dashboard-card">
          <div className="overview__card-header">
            <div>
              <p className="section-eyebrow">近 12 个月出货数量</p>
              <h3 className="section-card__title">
                {totalSalesQuantity > 0 ? `${formatNumber(totalSalesQuantity)} 件` : "暂无出货数量"}
              </h3>
            </div>
            <div className="overview__chart-filter">
              <Select
                value={quantityProductType}
                options={chartFilterOptions}
                onValueChange={(value) => setQuantityProductType(value)}
              />
            </div>
          </div>
          <MonthlyBarChart data={quantitySeries} metric="quantity" />
        </section>

        <section className="section-card overview__dashboard-card">
          <div className="overview__card-header">
            <div>
              <p className="section-eyebrow">近 12 个月出货金额</p>
              <h3 className="section-card__title">
                {totalSalesAmount > 0 ? formatCurrency(totalSalesAmount) : "暂无出货金额"}
              </h3>
            </div>
            <div className="overview__chart-filter">
              <Select
                value={amountProductType}
                options={chartFilterOptions}
                onValueChange={(value) => setAmountProductType(value)}
              />
            </div>
          </div>
          <MonthlyBarChart data={amountSeries} metric="amount" />
        </section>
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
    </div>
  )
}
