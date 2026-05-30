import { useEffect, useState, type ChangeEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Button,
  Input,
  Select,
  SectionCard,
  EmptyState, FormErrorSummary,
  useToast,
} from "../../../../shared"
import { formatCurrency } from "../../../../shared"
import { productRepository } from "../../../master-data/products"
import { counterpartyRepository } from "../../../master-data/counterparties"
import type { Product } from "../../../master-data/products"
import type { Counterparty } from "../../../master-data/counterparties"
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrder,
} from "../application/purchaseService"
import type { PurchaseFormData, PurchaseFormLine } from "../domain/types"
import {
  emptyPurchaseForm,
  emptyPurchaseLine,
  orderToFormData,
  validatePurchaseForm,
} from "../domain/types"

export function PurchaseFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState<PurchaseFormData>(emptyPurchaseForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Counterparty[]>([])

  useEffect(() => {
    async function init() {
      try {
        const [prods, allCP] = await Promise.all([
          productRepository.query((p) => p.status === "active"),
          counterpartyRepository.query((c) => c.type === "supplier" && c.status === "active"),
        ])
        setProducts(prods)
        setSuppliers(allCP)

        if (id) {
          const order = await getPurchaseOrder(id)
          if (order) {
            setForm(orderToFormData(order))
          } else {
            setLoadError("进货单不存在")
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

  function updateField(field: keyof PurchaseFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function updateLine(index: number, field: keyof PurchaseFormLine, value: string) {
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
              product.defaultPurchasePrice != null
                ? String(product.defaultPurchasePrice)
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
      lines: [...prev.lines, emptyPurchaseLine()],
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

  function computeLineAmount(line: PurchaseFormLine): number {
    const qty = Number(line.quantity) || 0
    const price = Number(line.unitPrice) || 0
    return Math.round(qty * price * 100) / 100
  }

  async function handleSubmit() {
    const validationErrors = validatePurchaseForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updatePurchaseOrder(id, form)
        toast.success("进货单已更新")
      } else {
        const created = await createPurchaseOrder(form)
        toast.success("进货单已保存")
        navigate(`/purchases/${created.id}`, { replace: true })
        return
      }
      navigate("/purchases", { replace: true })
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
          <h1 className="page-title">{isEdit ? "编辑进货单" : "新建进货单"}</h1>
        </div>
        <div className="form-card">
          <div className="form-card__body" style={{ minHeight: 300 }} />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? "编辑进货单" : "新建进货单"}</h1>
        </div>
        <EmptyState
          title="加载失败"
          variant="error"
          description={loadError}
          primaryAction={{ label: "返回列表", onClick: () => navigate("/purchases") }}
        />
      </div>
    )
  }

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }))

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name}${p.spec ? ` (${p.spec})` : ""}`,
  }))

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? "编辑进货单" : "新建进货单"}</h1>
          <p className="page-subtitle">填写供应商和货品明细，保存后自动入库</p>
        </div>
      </div>


      <FormErrorSummary errors={errors} />
      <SectionCard eyebrow="基本信息" title="供应商与日期">
        <div className="form-row">
          <Select
            label="供应商"
            placeholder="选择供应商"
            options={supplierOptions}
            value={form.supplierId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              updateField("supplierId", e.target.value)
              const supplier = suppliers.find((s) => s.id === e.target.value)
              updateField("supplierName", supplier?.name ?? "")
            }}
            error={errors.supplierId}
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
                    <Select
                      placeholder="选择货品"
                      options={productOptions}
                      value={line.productId}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => updateLine(i, "productId", e.target.value)}
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
          <Button variant="ghost" onClick={() => navigate("/purchases")}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            {isEdit ? "保存修改" : "保存进货单"}
          </Button>
        </div>
      </div>
    </div>
  )
}
