import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Input, EmptyState, SkeletonTable } from "../../../../shared"
import { formatCurrency, formatDate } from "../../../../shared"
import { listQuoteOrders } from "../application/quoteService"
import type { QuoteOrder } from "../domain/types"

export function QuoteListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<QuoteOrder[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const all = await listQuoteOrders()
      setItems(all)
    } catch {
      setError("加载报价单列表失败，请刷新重试")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = items.filter((o) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      o.documentNo.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.lines.some((l) => l.productName.toLowerCase().includes(q))
    )
  })

  if (loading) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">报价单</h1>
        </div>
        <SkeletonTable rows={6} cols={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">报价单</h1>
        </div>
        <EmptyState
          title="加载失败"
          description={error}
          primaryAction={{ label: "重新加载", onClick: load }}
        />
      </div>
    )
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">报价单</h1>
          <p className="page-subtitle">管理报价记录，保存不影响库存</p>
        </div>
        <Button variant="primary" onClick={() => navigate("/quotes/new")}>
          新建报价单
        </Button>
      </div>

      <div className="filter-toolbar">
        <div className="filter-toolbar__search">
          <Input
            placeholder="搜索单据编号、客户或货品名称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? "未找到匹配的报价单" : "还没有报价单"}
          description={search ? "请尝试其他关键词" : "创建第一张报价单"}
          primaryAction={
            search
              ? { label: "清除搜索", onClick: () => setSearch("") }
              : { label: "新建报价单", onClick: () => navigate("/quotes/new") }
          }
        />
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>单据编号</th>
                <th>客户</th>
                <th>日期</th>
                <th>货品数</th>
                <th className="data-table__num">合计金额</th>
                <th className="data-table__actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="data-table__name">{o.documentNo}</td>
                  <td>{o.customerName}</td>
                  <td className="data-table__muted">{formatDate(o.happenedAt)}</td>
                  <td className="data-table__muted">{o.lines.length} 种</td>
                  <td className="data-table__num">{formatCurrency(o.totalAmount)}</td>
                  <td className="data-table__actions">
                    <Button variant="ghost" size="small" onClick={() => navigate(`/quotes/${o.id}`)}>
                      查看
                    </Button>
                    <Button variant="ghost" size="small" onClick={() => navigate(`/quotes/${o.id}/edit`)}>
                      编辑
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
