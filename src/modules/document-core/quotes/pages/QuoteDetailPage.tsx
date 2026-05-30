import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button, SectionCard, EmptyState, SkeletonCard } from "../../../../shared"
import { formatCurrency, formatDate } from "../../../../shared"
import { useToast } from "../../../../shared"
import { getQuoteOrder } from "../application/quoteService"
import type { QuoteOrder } from "../domain/types"
import { buildQuoteExportPayload } from "../../../export-service/application/buildExportPayload"
import { exportPrint, exportSheet } from "../../../export-service/application/exportService"

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [order, setOrder] = useState<QuoteOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<"print" | "sheet" | null>(null)

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const result = await getQuoteOrder(id)
        if (result) {
          setOrder(result)
        } else {
          setError("报价单不存在")
        }
      } catch {
        setError("加载报价单失败，请刷新重试")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleExport = useCallback(
    async (format: "print" | "sheet") => {
      if (!order) return
      setExporting(format)
      try {
        const payload = buildQuoteExportPayload(order)
        const result =
          format === "print"
            ? await exportPrint(payload)
            : await exportSheet(payload)
        if (result.success) {
          addToast("success", result.message)
        } else {
          addToast("error", result.message)
        }
      } catch {
        addToast("error", "导出失败，请重试")
      } finally {
        setExporting(null)
      }
    },
    [order, addToast]
  )

  if (loading) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">报价单详情</h1>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">报价单详情</h1>
        </div>
        <EmptyState
          title="加载失败"
          variant="error"
          description={error ?? "报价单不存在"}
          primaryAction={{ label: "返回列表", onClick: () => navigate("/quotes") }}
        />
      </div>
    )
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">报价单详情</h1>
          <p className="page-subtitle">单据编号：{order.documentNo}</p>
        </div>
        <div className="topbar__actions">
          <Button variant="ghost" onClick={() => navigate("/quotes")}>
            返回列表
          </Button>
          <Button
            variant="ghost"
            loading={exporting === "print"}
            onClick={() => handleExport("print")}
          >
            导出打印版
          </Button>
          <Button
            variant="ghost"
            loading={exporting === "sheet"}
            onClick={() => handleExport("sheet")}
          >
            导出表格版
          </Button>
          <Button variant="primary" onClick={() => navigate(`/quotes/${order.id}/edit`)}>
            编辑
          </Button>
        </div>
      </div>

      <SectionCard eyebrow="基本信息" title="客户与日期">
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-item__label">单据编号</span>
            <span className="detail-item__value">{order.documentNo}</span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">客户</span>
            <span className="detail-item__value">{order.customerName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">日期</span>
            <span className="detail-item__value">{formatDate(order.happenedAt)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-item__label">创建时间</span>
            <span className="detail-item__value">{formatDate(order.createdAt)}</span>
          </div>
        </div>
        {order.remark && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <div className="detail-item">
              <span className="detail-item__label">备注</span>
              <span className="detail-item__value">{order.remark}</span>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="货品明细"
        title={`共 ${order.lines.length} 种货品，合计 ${formatCurrency(order.totalAmount)}`}
      >
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>货品</th>
                <th>规格</th>
                <th>单位</th>
                <th className="data-table__num">数量</th>
                <th className="data-table__num">单价</th>
                <th className="data-table__num">金额</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td className="data-table__name">{line.productName}</td>
                  <td className="data-table__muted">{line.spec || "-"}</td>
                  <td className="data-table__muted">{line.unit || "-"}</td>
                  <td className="data-table__num">{line.quantity}</td>
                  <td className="data-table__num">{formatCurrency(line.unitPrice)}</td>
                  <td className="data-table__num">{formatCurrency(line.lineAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
