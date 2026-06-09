import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button, Input, Select, SkeletonCard, EmptyState, FormErrorSummary, DraftRestoreBanner, useFormDraft, useToast, generateId } from "../../../../shared"
import { useAuth } from "../../../auth"
import { productRepository } from "../infrastructure/productRepository"
import {
  ProductUnits,
  validateProductForm,
  emptyProductForm,
  productToFormData,
} from "../domain/types"
import type { ProductFormData } from "../domain/types"

function isProductFormEmpty(form: ProductFormData): boolean {
  return (
    !form.productCode.trim() &&
    !form.name.trim() &&
    !form.spec.trim() &&
    !form.unit &&
    !form.productType.trim() &&
    !form.material.trim() &&
    !form.defaultPurchasePrice.trim() &&
    !form.defaultSalesPrice.trim() &&
    !form.notes.trim()
  )
}

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()
  const { account } = useAuth()

  const [form, setForm] = useState<ProductFormData>(emptyProductForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const draft = useFormDraft<ProductFormData>({
    accountId: account?.id,
    formKey: "product-new",
    data: form,
    enabled: !isEdit,
    isEmpty: isProductFormEmpty,
    onRestore: (data) => {
      setForm(data)
      setErrors({})
    },
  })

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
          productCode: form.productCode.trim(),
          name: form.name.trim(),
          spec: form.spec.trim(),
          unit: form.unit,
          productType: form.productType.trim(),
          material: form.material.trim(),
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
          productCode: form.productCode.trim(),
          name: form.name.trim(),
          spec: form.spec.trim(),
          unit: form.unit,
          productType: form.productType.trim(),
          material: form.material.trim(),
          defaultPurchasePrice: form.defaultPurchasePrice ? Number(form.defaultPurchasePrice) : null,
          defaultSalesPrice: form.defaultSalesPrice ? Number(form.defaultSalesPrice) : null,
          notes: form.notes.trim(),
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
        draft.clearDraft()
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

      {draft.pendingDraft && (
        <DraftRestoreBanner
          updatedAt={draft.pendingDraft.updatedAt}
          onRestore={draft.restoreDraft}
          onDiscard={draft.discardDraft}
        />
      )}

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-card__body">
          <FormErrorSummary errors={errors} />

          <div className="form-row">
            <Input
              label="货品名称"
              placeholder="请输入货品名称"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              error={errors.name}
            />
            <Input
              label="产品编号"
              placeholder="选填"
              value={form.productCode}
              onChange={(e) => updateField("productCode", e.target.value)}
              error={errors.productCode}
            />
          </div>

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

          <Input
            label="材质"
            placeholder="选填，如：涤纶、棉、尼龙"
            value={form.material}
            onChange={(e) => updateField("material", e.target.value)}
            error={errors.material}
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
          {!isEdit && (
            <Button
              variant="secondary"
              type="button"
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
