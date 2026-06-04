import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button, Input, Select, SkeletonCard, EmptyState, FormErrorSummary, useToast, generateId } from "../../../../shared"
import { productRepository } from "../infrastructure/productRepository"
import {
  ProductUnits,
  validateProductForm,
  emptyProductForm,
  productToFormData,
} from "../domain/types"
import type { ProductFormData } from "../domain/types"

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState<ProductFormData>(emptyProductForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const product = await productRepository.getById(id)
        if (!product) {
          setNotFound(true)
          return
        }
        setForm(productToFormData(product))
      } catch {
        setLoadError("加载货品信息失败")
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  function updateField(field: keyof ProductFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validateProductForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      if (isEdit && id) {
        await productRepository.update(id, {
          name: form.name.trim(),
          spec: form.spec.trim(),
          unit: form.unit,
          productType: form.productType.trim(),
          defaultPurchasePrice: form.defaultPurchasePrice ? Number(form.defaultPurchasePrice) : null,
          defaultSalesPrice: form.defaultSalesPrice ? Number(form.defaultSalesPrice) : null,
          notes: form.notes.trim(),
          updatedAt: new Date().toISOString(),
        })
        toast.success("货品已更新")
      } else {
        const now = new Date().toISOString()
        await productRepository.create({
          id: generateId(),
          name: form.name.trim(),
          spec: form.spec.trim(),
          unit: form.unit,
          productType: form.productType.trim(),
          defaultPurchasePrice: form.defaultPurchasePrice ? Number(form.defaultPurchasePrice) : null,
          defaultSalesPrice: form.defaultSalesPrice ? Number(form.defaultSalesPrice) : null,
          notes: form.notes.trim(),
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
        toast.success("货品已创建")
      }
      navigate("/products", { replace: true })
    } catch {
      toast.error(isEdit ? "更新失败，请重试" : "创建失败，请重试")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="form-page">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? "编辑货品" : "新建货品"}</h1>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="form-page">
        <EmptyState
          title="货品不存在"
          description="该货品可能已被删除"
          primaryAction={{ label: "返回列表", onClick: () => navigate("/products", { replace: true }) }}
        />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="form-page">
        <EmptyState
          title="加载失败"
          variant="error"
          description={loadError}
          primaryAction={{ label: "返回列表", onClick: () => navigate("/products", { replace: true }) }}
        />
      </div>
    )
  }

  const unitOptions = ProductUnits.map((u) => ({ value: u, label: u }))

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? "编辑货品" : "新建货品"}</h1>
          <p className="page-subtitle">
            {isEdit ? "修改货品信息，保存后立即生效" : "创建新的货品，供后续录单流程引用"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-card__body">
          <FormErrorSummary errors={errors} />

          <Input
            label="货品名称"
            placeholder="请输入货品名称"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            error={errors.name}
          />

          <div className="form-row">
            <Input
              label="规格型号"
              placeholder="选填"
              value={form.spec}
              onChange={(e) => updateField("spec", e.target.value)}
              error={errors.spec}
            />
            <Select
              label="单位"
              options={unitOptions}
              placeholder="请选择单位"
              value={form.unit}
              onValueChange={(value) => updateField("unit", value)}
              error={errors.unit}
            />
          </div>

          <Input
            label="产品类型"
            placeholder="选填，如：面料、辅料、成品"
            value={form.productType}
            onChange={(e) => updateField("productType", e.target.value)}
            error={errors.productType}
          />

          <div className="form-row">
            <Input
              label="默认进价"
              placeholder="选填"
              inputMode="decimal"
              value={form.defaultPurchasePrice}
              onChange={(e) => updateField("defaultPurchasePrice", e.target.value)}
              error={errors.defaultPurchasePrice}
            />
            <Input
              label="默认售价"
              placeholder="选填"
              inputMode="decimal"
              value={form.defaultSalesPrice}
              onChange={(e) => updateField("defaultSalesPrice", e.target.value)}
              error={errors.defaultSalesPrice}
            />
          </div>

          <Input
            label="备注"
            placeholder="选填，最多 200 个字"
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            error={errors.notes}
          />
        </div>

        <div className="form-card__footer">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate("/products", { replace: true })}
          >
            取消
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {isEdit ? "保存修改" : "创建货品"}
          </Button>
        </div>
      </form>
    </div>
  )
}
