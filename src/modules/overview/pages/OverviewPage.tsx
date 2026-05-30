import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  formatCurrency,
  formatDate,
  SkeletonCard,
  SkeletonTable,
  EmptyState,
  Tag,
} from "../../../shared"
import { fetchOverviewData } from "../application/overviewService"
import type { OverviewData } from "../application/overviewService"

const quickActions = [
  { path: "/purchases/new", label: "新建进货单", desc: "记录进货并增加库存", icon: "📥" },
  { path: "/sales/new", label: "新建出货单", desc: "记录出货并校验库存", icon: "📤" },
  { path: "/quotes/new", label: "新建报价单", desc: "生成报价，不影响库存", icon: "📋" },
]

const typeLabel: Record<string, string> = {
  purchase: "进货",
  sales: "出货",
  quote: "报价",
}

const typeVariant: Record<string, "success" | "warning" | "info"> = {
  purchase: "success",
  sales: "warning",
  quote: "info",
}

export function OverviewPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchOverviewData()
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载失败")
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

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
                  .then((d) => {
                    setData(d)
                    setLoading(false)
                  })
                  .catch((e) => {
                    setError(e instanceof Error ? e.message : "加载失败")
                    setLoading(false)
                  })
              },
            }}
          />
        </section>
      </div>
    )
  }

  const hasAnyData =
    (data?.totalProductCount ?? 0) > 0 ||
    (data?.totalCounterpartyCount ?? 0) > 0 ||
    (data?.recentRecords.length ?? 0) > 0

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

  if (!hasAnyData && data) {
    return (
      <div className="overview-page">
        <section className="hero-card">
          <div className="hero-card__content">
            <p className="section-eyebrow">Tradgio</p>
            <h2 className="section-title">欢迎使用库存管理平台</h2>
            <p className="section-description">
              当前还没有任何业务数据，从下面三个入口开始建立您的资料与单据。
            </p>
          </div>
        </section>

        <div className="overview__quick-grid">
          {quickActions.map((action) => (
            <article
              key={action.path}
              className="section-card section-card--interactive"
              onClick={() => navigate(action.path)}
            >
              <div className="overview__quick-icon">{action.icon}</div>
              <h3 className="section-card__title">{action.label}</h3>
              <p className="section-card__description">{action.desc}</p>
            </article>
          ))}
        </div>

        <section className="section-card">
          <EmptyState
            title="还没有单据记录"
            description="新建进货单、出货单或报价单后，这里会展示最近的操作和库存摘要。"
          />
        </section>
      </div>
    )
  }

  return (
    <div className="overview-page">
      <section className="hero-card">
        <div className="hero-card__content">
          <p className="section-eyebrow">Tradgio</p>
          <h2 className="section-title">今日概览</h2>
        </div>
        <div className="overview__stat-pills">
          <div className="overview__stat-pill">
            <span className="overview__stat-value">{data!.activeProductCount}</span>
            <span className="overview__stat-label">在用货品</span>
          </div>
          <div className="overview__stat-pill">
            <span className="overview__stat-value">{data!.activeCounterpartyCount}</span>
            <span className="overview__stat-label">活跃往来单位</span>
          </div>
          <div className="overview__stat-pill">
            <span className="overview__stat-value">{data!.recentRecords.length}</span>
            <span className="overview__stat-label">最近单据</span>
          </div>
          {data!.lowStockCount > 0 && (
            <div className="overview__stat-pill overview__stat-pill--warn">
              <span className="overview__stat-value">{data!.lowStockCount}</span>
              <span className="overview__stat-label">库存偏低</span>
            </div>
          )}
        </div>
      </section>

      <div className="overview__quick-grid">
        {quickActions.map((action) => (
          <article
            key={action.path}
            className="section-card section-card--interactive"
            onClick={() => navigate(action.path)}
          >
            <div className="overview__quick-icon">{action.icon}</div>
            <h3 className="section-card__title">{action.label}</h3>
            <p className="section-card__description">{action.desc}</p>
          </article>
        ))}
      </div>

      <div className="overview__bento-grid">
        <section className="section-card">
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
                        <td className="data-table__muted">
                          {item.spec ? `${item.spec}` : "-"}
                        </td>
                        <td className="data-table__num">
                          {isLow ? (
                            <span className="overview__stock-low">
                              {item.quantity} {item.unit}
                            </span>
                          ) : (
                            <span>
                              {item.quantity} {item.unit}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="section-card__description">
              完成进货或出货后，库存记录会在这里展示。
            </p>
          )}
        </section>

        <section className="section-card">
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
                  {data!.recentRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="overview__recent-row"
                      onClick={() => navigate(record.route)}
                    >
                      <td>
                        <Tag variant={typeVariant[record.type]}>
                          {typeLabel[record.type]}
                        </Tag>
                      </td>
                      <td className="data-table__name">{record.documentNo}</td>
                      <td>{record.counterpartyName}</td>
                      <td className="data-table__muted">
                        {formatDate(record.happenedAt)}
                      </td>
                      <td className="data-table__num">
                        {formatCurrency(record.totalAmount)}
                      </td>
                    </tr>
                  ))}
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
    </div>
  )
}
