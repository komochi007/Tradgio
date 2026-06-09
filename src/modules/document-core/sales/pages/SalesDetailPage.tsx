import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button, SectionCard, EmptyState, SkeletonCard } from "../../../../shared"
import { formatCurrency, formatDate } from "../../../../shared"
import { useToast } from "../../../../shared"
import { getSalesOrder } from "../application/salesService"
import type { SalesOrder } from "../domain/types"
import { buildSalesExportPayload } from "../../../export-service/application/buildExportPayload"
import { exportPrint, exportSheet } from "../../../export-service/application/exportService"

export function SalesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<"print" | "sheet" | null>(null)

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const result = await getSalesOrder(id)
        if (result) {
          setOrder(result)
        } else {
          setError("出货单不存在")
        }
      } catch {
        setError("加载出货单失败，请刷新重试")
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
        const payload = buildSalesExportPayload(order)
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
          <h1 className="page-title">出货单详情</h1>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">出货单详情</h1>
        </div>
        <EmptyState
          title="加载失败"
          variant="error"
          description={error ?? "出货单不存在"}
          primaryAction={{ label: "返回列表", onClick: () => navigate("/sales") }}
        />
      </div>
    )
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">出货单详情</h1>
          <p className="page-subtitle">单据编号：{order.documentNo}</p>
        </div>
        <div className="topbar__actions">
          <Button variant="ghost" onClick={() => navigate("/sales")}>
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
            导出模板Excel
          </Button>
          <Button variant="primary" onClick={() => navigate(`/sales/${order.id}/edit`)}>
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
                <th>产品编号</th>
                <th>货品</th>
                <th>尺寸</th>
                <th>颜色</th>
                <th>单位</th>
                <th className="data-table__num">数量</th>
                <th className="data-table__num">单价</th>
                <th className="data-table__num">金额</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td className="data-table__muted">{line.productCode || "-"}</td>
                  <td className="data-table__name">{line.productName}</td>
                  <td className="data-table__muted">{line.spec || "-"}</td>
                  <td className="data-table__muted">{line.color || "-"}</td>
                  <td className="data-table__muted">{line.unit || "-"}</td>
                  <td className="data-table__num">{line.quantity}</td>
                  <td className="data-table__num">{formatCurrency(line.unitPrice)}</td>
                  <td className="data-table__num">{formatCurrency(line.lineAmount)}</td>
                  <td className="data-table__muted">{line.lineRemark || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
