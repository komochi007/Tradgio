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
import type { Product } from "../../../master-data/products"
import type { Counterparty } from "../../../master-data/counterparties"
import {
  createQuoteOrder,
  updateQuoteOrder,
  getQuoteOrder,
} from "../application/quoteService"
import type { QuoteFormData, QuoteFormLine } from "../domain/types"
import {
  emptyQuoteForm,
  emptyQuoteLine,
  orderToFormData,
  validateQuoteForm,
} from "../domain/types"

function isQuoteLineEmpty(line: QuoteFormLine): boolean {
  return (
    !line.productId &&
    !line.productName.trim() &&
    !line.spec.trim() &&
    !line.unit.trim() &&
    !line.quantity.trim() &&
    !line.unitPrice.trim()
  )
}

function isQuoteFormEmpty(form: QuoteFormData): boolean {
  return (
    !form.customerId &&
    !form.customerName.trim() &&
    !form.remark.trim() &&
    form.lines.every(isQuoteLineEmpty)
  )
}

export function QuoteFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { account } = useAuth()

  const [form, setForm] = useState<QuoteFormData>(emptyQuoteForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Counterparty[]>([])
  const draft = useFormDraft<QuoteFormData>({
    accountId: account?.id,
    formKey: "quote-new",
    data: form,
    enabled: !isEdit,
    isEmpty: isQuoteFormEmpty,
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

        if (id) {
          const order = await getQuoteOrder(id)
          if (order) {
            setForm(orderToFormData(order))
          } else {
            setLoadError("报价单不存在")
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

  function updateField(field: keyof QuoteFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function updateLine(index: number, field: keyof QuoteFormLine, value: string) {
    setForm((prev) => {
      const lines = [...prev.lines]
      lines[index] = { ...lines[index], [field]: value }

      if (field === "productId" && value) {
        const product = products.find((p) => p.id === value)
        if (product) {
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
      lines: [...prev.lines, emptyQuoteLine()],
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

  function computeLineAmount(line: QuoteFormLine): number {
    const qty = Number(line.quantity) || 0
    const price = Number(line.unitPrice) || 0
    return Math.round(qty * price * 100) / 100
  }

  async function handleSubmit() {
    const validationErrors = validateQuoteForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateQuoteOrder(id, form)
        toast.success("报价单已更新")
      } else {
        const created = await createQuoteOrder(form)
        draft.clearDraft()
        toast.success("报价单已保存")
        navigate(`/quotes/${created.id}`, { replace: true })
        return
      }
      navigate("/quotes", { replace: true })
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
          <h1 className="page-title">{isEdit ? "编辑报价单" : "新建报价单"}</h1>
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
          <h1 className="page-title">{isEdit ? "编辑报价单" : "新建报价单"}</h1>
        </div>
        <EmptyState
          title="加载失败"
          variant="error"
          description={loadError}
          primaryAction={{ label: "返回列表", onClick: () => navigate("/quotes") }}
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
          <h1 className="page-title">{isEdit ? "编辑报价单" : "新建报价单"}</h1>
          <p className="page-subtitle">选择客户与货品，保存不影响库存，支持手动改价</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/quotes")}>
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
          <table className="line-items-table">
            <thead>
              <tr>
                <th style={{ width: "28%" }}>货品</th>
                <th style={{ width: "12%" }}>规格</th>
                <th style={{ width: "10%" }}>单位</th>
                <th style={{ width: "12%" }}>数量</th>
                <th style={{ width: "14%" }}>单价</th>
                <th style={{ width: "14%" }}>金额</th>
                <th style={{ width: "10%" }}></th>
              </tr>
            </thead>
            <tbody>
              {form.lines.map((line, i) => (
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
                      value={line.spec}
                      onChange={(e) => updateLine(i, "spec", e.target.value)}
                      disabled
                    />
                  </td>
                  <td>
                    <Input value={line.unit} disabled />
                  </td>
                  <td>
                    <Input
                      type="number"
                      placeholder="0"
                      value={line.quantity}
                      onChange={(e) => updateLine(i, "quantity", e.target.value)}
                      error={errors[`line_${i}_quantity`]}
                    />
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
              ))}
            </tbody>
          </table>
        </div>

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
          <Button variant="ghost" onClick={() => navigate("/quotes")}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            {isEdit ? "保存修改" : "保存报价单"}
          </Button>
        </div>
      </div>
    </div>
  )
}
