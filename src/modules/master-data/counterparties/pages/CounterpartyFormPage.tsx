import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button, Input, Select, SkeletonCard, EmptyState, FormErrorSummary, useToast, generateId } from "../../../../shared"
import { counterpartyRepository } from "../infrastructure/counterpartyRepository"
import {
  validateCounterpartyForm,
  emptyCounterpartyForm,
  counterpartyToFormData,
} from "../domain/types"
import type { CounterpartyFormData, CounterpartyType } from "../domain/types"

const typeOptions = [
  { value: "customer", label: "客户" },
  { value: "supplier", label: "供应商" },
]

export function CounterpartyFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState<CounterpartyFormData>(emptyCounterpartyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const item = await counterpartyRepository.getById(id)
        if (!item) {
          setNotFound(true)
          return
        }
        setForm(counterpartyToFormData(item))
      } catch {
        setLoadError("加载单位信息失败")
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  function updateField(field: keyof CounterpartyFormData, value: string) {
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
    const validationErrors = validateCounterpartyForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      if (isEdit && id) {
        await counterpartyRepository.update(id, {
          name: form.name.trim(),
          type: form.type as CounterpartyType,
          contactPerson: form.contactPerson.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          notes: form.notes.trim(),
          updatedAt: new Date().toISOString(),
        })
        toast.success("单位信息已更新")
      } else {
        const now = new Date().toISOString()
        await counterpartyRepository.create({
          id: generateId(),
          name: form.name.trim(),
          type: form.type as CounterpartyType,
          contactPerson: form.contactPerson.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          notes: form.notes.trim(),
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
        toast.success("单位已创建")
      }
      navigate("/counterparties", { replace: true })
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
          <h1 className="page-title">{isEdit ? "编辑往来单位" : "新建往来单位"}</h1>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="form-page">
        <EmptyState
          title="单位不存在"
          description="该往来单位可能已被删除"
          primaryAction={{ label: "返回列表", onClick: () => navigate("/counterparties", { replace: true }) }}
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
          primaryAction={{ label: "返回列表", onClick: () => navigate("/counterparties", { replace: true }) }}
        />
      </div>
    )
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? "编辑往来单位" : "新建往来单位"}</h1>
          <p className="page-subtitle">
            {isEdit ? "修改单位信息，保存后立即生效" : "创建客户或供应商，供后续录单流程引用"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-card__body">
          <FormErrorSummary errors={errors} />

          <div className="form-row">
            <Input
              label="单位名称"
              placeholder="请输入单位名称"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              error={errors.name}
            />
            <Select
              label="类型"
              options={typeOptions}
              placeholder="请选择类型"
              value={form.type}
              onChange={(e) => updateField("type", e.target.value)}
              error={errors.type}
            />
          </div>

          <div className="form-row">
            <Input
              label="联系人"
              placeholder="选填"
              value={form.contactPerson}
              onChange={(e) => updateField("contactPerson", e.target.value)}
              error={errors.contactPerson}
            />
            <Input
              label="联系电话"
              placeholder="选填"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              error={errors.phone}
            />
          </div>

          <Input
            label="地址"
            placeholder="选填，最多 100 个字"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            error={errors.address}
          />

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
            onClick={() => navigate("/counterparties", { replace: true })}
          >
            取消
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {isEdit ? "保存修改" : "创建单位"}
          </Button>
        </div>
      </form>
    </div>
  )
}
