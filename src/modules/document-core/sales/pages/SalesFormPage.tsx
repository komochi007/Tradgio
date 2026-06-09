import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Button,
  Input,
  Select,
  ProductSearchSelect,
  SectionCard,
  EmptyState, FormErrorSummary,
  DraftRestoreBanner,
  useFormDraft,
  useToast,
} from "../../../../shared"
import { formatCurrency } from "../../../../shared"
import { useAuth } from "../../../auth"
import { productRepository } from "../../../master-data/products"
import { counterpartyRepository } from "../../../master-data/counterparties"
import { getCurrentStock } from "../../../inventory-engine"
import type { Product } from "../../../master-data/products"
import type { Counterparty } from "../../../master-data/counterparties"
import {
  createSalesOrder,
  updateSalesOrder,
  getSalesOrder,
  checkStockShortage,
} from "../application/salesService"
import type { SalesFormData, SalesFormLine } from "../domain/types"
import {
  emptySalesForm,
  emptySalesLine,
  orderToFormData,
  validateSalesForm,
} from "../domain/types"

type StockMap = Record<string, number>

function isSalesLineEmpty(line: SalesFormLine): boolean {
  return (
    !line.productId &&
    !line.productCode.trim() &&
    !line.productName.trim() &&
    !line.spec.trim() &&
    !line.color.trim() &&
    !line.unit.trim() &&
    !line.quantity.trim() &&
    !line.unitPrice.trim() &&
    !line.lineRemark.trim()
  )
}

function isSalesFormEmpty(form: SalesFormData): boolean {
  return (
    !form.customerId &&
    !form.customerName.trim() &&
    !form.remark.trim() &&
    form.lines.every(isSalesLineEmpty)
  )
}

export function SalesFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { account } = useAuth()

  const [form, setForm] = useState<SalesFormData>(emptySalesForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Counterparty[]>([])
  const [stockMap, setStockMap] = useState<StockMap>({})
  const [stockWarnings, setStockWarnings] = useState<Array<{
    productId: string
    productName: string
    currentStock: number
    shortage: number
  }>>([])
  const draft = useFormDraft<SalesFormData>({
    accountId: account?.id,
    formKey: "sales-new",
    data: form,
    enabled: !isEdit,
    isEmpty: isSalesFormEmpty,
    onRestore: (data) => {
      setForm(data)
      setErrors({})
    },
  })

  useEffect(() => {
    async function init() {
      try {
        const [prods, allCP] = await Promise.all([
          productRepository.query((p) => p.status === "active"),
          counterpartyRepository.query((c) => c.type === "customer" && c.status === "active"),
        ])
        setProducts(prods)
        setCustomers(allCP)

        const stock: StockMap = {}
        for (const p of prods) {
          stock[p.id] = await getCurrentStock(p.id)
        }
        setStockMap(stock)

        if (id) {
          const order = await getSalesOrder(id)
          if (order) {
            setForm(orderToFormData(order))
          } else {
            setLoadError("出货单不存在")
          }
        }
      } catch {
        setLoadError("加载数据失败，请刷新重试")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  useEffect(() => {
    const lines = form.lines
      .filter((l) => l.productId && l.quantity)
      .map((l) => ({
        productId: l.productId,
        productName: l.productName,
        quantity: Number(l.quantity),
      }))

    if (lines.length === 0) {
      setStockWarnings([])
      return
    }

    checkStockShortage(lines).then((warnings) => {
      setStockWarnings(warnings)
    }).catch(() => {
      setStockWarnings([])
    })
  }, [form.lines])

  function updateField(field: keyof SalesFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function updateLine(index: number, field: keyof SalesFormLine, value: string) {
    setForm((prev) => {
      const lines = [...prev.lines]
      lines[index] = { ...lines[index], [field]: value }

      if (field === "productId" && value) {
        const product = products.find((p) => p.id === value)
        if (product) {
          lines[index].productCode = product.productCode ?? ""
          lines[index].productName = product.name
          lines[index].spec = product.spec
          lines[index].unit = product.unit
          if (!lines[index].unitPrice || lines[index].unitPrice === "") {
            lines[index].unitPrice =
              product.defaultSalesPrice != null
                ? String(product.defaultSalesPrice)
                : ""
          }
        }
      }

      return { ...prev, lines }
    })
    setErrors((prev) => {
      const next = { ...prev }
      delete next[`line_${index}_${field}`]
      return next
    })
  }

  function addLine() {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, emptySalesLine()],
    }))
  }

  function removeLine(index: number) {
    setForm((prev) => {
      if (prev.lines.length <= 1) return prev
      const lines = prev.lines.filter((_, i) => i !== index)
      return { ...prev, lines }
    })
  }

  function computeTotal(): number {
    return form.lines.reduce((sum, l) => {
      const qty = Number(l.quantity) || 0
      const price = Number(l.unitPrice) || 0
      return sum + Math.round(qty * price * 100) / 100
    }, 0)
  }

  function computeLineAmount(line: SalesFormLine): number {
    const qty = Number(line.quantity) || 0
    const price = Number(line.unitPrice) || 0
    return Math.round(qty * price * 100) / 100
  }

  function getStockWarning(productId: string) {
    return stockWarnings.find((w) => w.productId === productId)
  }

  async function handleSubmit() {
    const validationErrors = validateSalesForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    if (stockWarnings.length > 0 && !isEdit) {
      const productNames = stockWarnings.map((w) => w.productName).join("、")
      const confirmed = window.confirm(
        `以下货品库存不足：${productNames}。\n\n超出库存部分将产生负库存记录，确认保存吗？`
      )
      if (!confirmed) return
    }

    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateSalesOrder(id, form)
        toast.success("出货单已更新")
      } else {
        const created = await createSalesOrder(form)
        draft.clearDraft()
        toast.success("出货单已保存")
        navigate(`/sales/${created.id}`, { replace: true })
        return
      }
      navigate("/sales", { replace: true })
    } catch (e: any) {
      toast.error(e?.message ?? "保存失败，请重试")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? "编辑出货单" : "新建出货单"}</h1>
        </div>
        <SectionCard eyebrow="基本信息" title="客户与日期">
          <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
            加载中…
          </div>
        </SectionCard>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? "编辑出货单" : "新建出货单"}</h1>
        </div>
        <EmptyState
          title="加载失败"
          variant="error"
          description={loadError}
          primaryAction={{ label: "返回列表", onClick: () => navigate("/sales") }}
        />
      </div>
    )
  }

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }))


  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? "编辑出货单" : "新建出货单"}</h1>
          <p className="page-subtitle">选择客户与货品，保存后自动扣减库存</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/sales")}>
          返回列表
        </Button>
      </div>

      {draft.pendingDraft && (
        <DraftRestoreBanner
          updatedAt={draft.pendingDraft.updatedAt}
          onRestore={draft.restoreDraft}
          onDiscard={draft.discardDraft}
        />
      )}

      <FormErrorSummary errors={errors} />
      <SectionCard eyebrow="基本信息" title="客户与日期">
        <div className="form-row">
          <Select
            label="客户"
            placeholder="选择客户"
            options={customerOptions}
            value={form.customerId}
            onValueChange={(value) => {
              updateField("customerId", value)
              const customer = customers.find((s) => s.id === value)
              updateField("customerName", customer?.name ?? "")
            }}
            error={errors.customerId}
          />
          <Input
            label="日期"
            type="date"
            value={form.happenedAt}
            onChange={(e) => updateField("happenedAt", e.target.value)}
            error={errors.happenedAt}
          />
        </div>
        <div style={{ marginTop: "var(--space-4)" }}>
          <Input
            label="备注"
            placeholder="选填"
            value={form.remark}
            onChange={(e) => updateField("remark", e.target.value)}
          />
        </div>
      </SectionCard>

      <SectionCard eyebrow="货品明细" title={`共 ${form.lines.length} 种货品`}>
        {errors.lines && (
          <p className="form-error-text" style={{ margin: "0 0 var(--space-4)" }}>
            {errors.lines}
          </p>
        )}

        <div className="line-items-table-wrapper">
          <table className="line-items-table line-items-table--sales">
            <thead>
              <tr>
                <th style={{ width: "20%" }}>货品</th>
                <th style={{ width: "11%" }}>产品编号</th>
                <th style={{ width: "10%" }}>尺寸</th>
                <th style={{ width: "10%" }}>颜色</th>
                <th style={{ width: "7%" }}>单位</th>
                <th style={{ width: "9%" }}>当前库存</th>
                <th style={{ width: "9%" }}>出货数量</th>
                <th style={{ width: "10%" }}>单价</th>
                <th style={{ width: "10%" }}>金额</th>
                <th style={{ width: "12%" }}>备注</th>
                <th style={{ width: "8%" }}></th>
              </tr>
            </thead>
            <tbody>
              {form.lines.map((line, i) => {
                const warning = getStockWarning(line.productId)
                const currentStock = line.productId ? (stockMap[line.productId] ?? 0) : null

                return (
                  <tr key={line.key}>
                    <td>
                      <ProductSearchSelect
                        products={products}
                        value={line.productId}
                        placeholder="搜索或选择货品"
                        onChange={(productId: string) => updateLine(i, "productId", productId)}
                        error={errors[`line_${i}_productId`]}
                      />
                    </td>
                    <td>
                      <Input
                        placeholder="编号"
                        value={line.productCode}
                        onChange={(e) => updateLine(i, "productCode", e.target.value)}
                        error={errors[`line_${i}_productCode`]}
                      />
                    </td>
                    <td>
                      <Input
                        value={line.spec}
                        onChange={(e) => updateLine(i, "spec", e.target.value)}
                        disabled
                      />
                    </td>
                    <td>
                      <Input
                        placeholder="颜色"
                        value={line.color}
                        onChange={(e) => updateLine(i, "color", e.target.value)}
                        error={errors[`line_${i}_color`]}
                      />
                    </td>
                    <td>
                      <Input value={line.unit} disabled />
                    </td>
                    <td>
                      <Input
                        value={currentStock != null ? String(currentStock) : "-"}
                        disabled
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        placeholder="0"
                        value={line.quantity}
                        onChange={(e) => updateLine(i, "quantity", e.target.value)}
                        error={errors[`line_${i}_quantity`]}
                      />
                      {warning && (
                        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--state-warning)", marginTop: 4 }}>
                          缺 {warning.shortage}
                        </p>
                      )}
                    </td>
                    <td>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                        error={errors[`line_${i}_unitPrice`]}
                      />
                    </td>
                    <td className="line-items-table__amount">
                      {formatCurrency(computeLineAmount(line))}
                    </td>
                    <td>
                      <Input
                        placeholder="选填"
                        value={line.lineRemark}
                        onChange={(e) => updateLine(i, "lineRemark", e.target.value)}
                        error={errors[`line_${i}_lineRemark`]}
                      />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => removeLine(i)}
                        disabled={form.lines.length <= 1}
                        style={{ color: "var(--state-error)" }}
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {stockWarnings.length > 0 && (
          <div style={{
            marginTop: "var(--space-4)",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-warning-bg, #fef3c7)",
            border: "1px solid var(--color-warning-border, #f59e0b)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text)",
          }}>
            <strong>库存不足警告：</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
              {stockWarnings.map((w) => (
                <li key={w.productId}>
                  {w.productName}：当前库存 {w.currentStock}，本单出货 {w.currentStock + w.shortage}，超出 {w.shortage}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 4, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              保存后超出库存部分将产生负库存记录
            </p>
          </div>
        )}

        <div style={{ marginTop: "var(--space-4)" }}>
          <Button variant="ghost" size="small" onClick={addLine}>
            + 添加货品
          </Button>
        </div>
      </SectionCard>

      <div className="sticky-action-bar">
        <div className="sticky-action-bar__total">
          <span className="sticky-action-bar__label">合计</span>
          <span className="sticky-action-bar__value">{formatCurrency(computeTotal())}</span>
        </div>
        <div className="sticky-action-bar__actions">
          {!isEdit && (
            <Button
              variant="secondary"
              onClick={() => {
                if (draft.saveDraftNow()) {
                  toast.success("草稿已保存")
                } else {
                  toast.warning("暂无可保存的草稿内容")
                }
              }}
            >
              保存草稿
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate("/sales")}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            {isEdit ? "保存修改" : "保存出货单"}
          </Button>
        </div>
      </div>
    </div>
  )
}
