import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Button,
  Input,
  Select,
  EmptyState,
  SkeletonCard,
  Tag,
  formatFileSize,
} from "../../../shared"
import type { SelectOption } from "../../../shared"
import {
  createContractRecord,
  updateContractRecord,
  removeAttachment,
  getContractRecord,
} from "../application/contractService"
import {
  emptyContractForm,
  validateContractForm,
  validateFile,
  contractToFormData,
  type ContractFormData,
  type ContractAttachment,
} from "../domain/types"
import { counterpartyRepository } from "../../master-data/counterparties/infrastructure/counterpartyRepository"

export function ContractFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState<ContractFormData>(emptyContractForm())
  const [customerOptions, setCustomerOptions] = useState<SelectOption[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [existingAttachments, setExistingAttachments] = useState<ContractAttachment[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingInit, setLoadingInit] = useState(Boolean(id))
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const counterparties = await counterpartyRepository.getAll()
        setCustomerOptions(
          counterparties
            .filter((c) => c.type === "customer" && c.status === "active")
            .map((c) => ({ value: c.id, label: c.name }))
        )

        if (id) {
          const record = await getContractRecord(id)
          if (!record) {
            setLoadError("合同记录不存在")
            return
          }
          setFormData(contractToFormData(record))
          setExistingAttachments(record.attachments)
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "加载失败")
      } finally {
        setLoadingInit(false)
      }
    }
    init()
  }, [id])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const newErrors: string[] = []
    const valid: File[] = []

    for (const file of files) {
      const err = validateFile(file)
      if (err) {
        newErrors.push(`${file.name}: ${err}`)
      } else {
        valid.push(file)
      }
    }

    setSelectedFiles((prev) => [...prev, ...valid])
    setFileErrors(newErrors)
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleRemoveExisting(attachmentId: string) {
    if (!id) return
    try {
      const updated = await removeAttachment(id, attachmentId)
      setExistingAttachments(updated.attachments)
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除附件失败")
    }
  }

  async function handleSubmit() {
    const validationErrors = validateContractForm(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateContractRecord(id, formData, selectedFiles)
      } else {
        await createContractRecord(formData, selectedFiles)
      }
      navigate("/contracts")
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string; details?: Record<string, string> }
      if (err.code === "VALIDATION_ERROR" && err.details) {
        setErrors(err.details)
      } else {
        alert(err.message ?? "保存失败")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInit) {
    return (
      <div className="form-page">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="list-page">
        <section className="section-card">
          <EmptyState
            title="加载失败"
            description={loadError}
            primaryAction={{ label: "返回列表", onClick: () => navigate("/contracts") }}
          />
        </section>
      </div>
    )
  }

  const totalAttachments = existingAttachments.length + selectedFiles.length

  return (
    <div className="form-page">
      <div className="page-header">
        <h2 className="page-header__title">{isEdit ? "编辑合同" : "上传合同"}</h2>
        <div className="page-header__actions">
          <Button
            variant="ghost"
            onClick={() => navigate("/contracts")}
          >
            返回列表
          </Button>
        </div>
      </div>

      <div className="form-card">
        <div className="form-card__body">
          <div className="form-row">
            <div className="form-field">
              <label className="form-field__label">合同标题 *</label>
              <Input
                placeholder="请输入合同标题"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    title: (e.target as HTMLInputElement).value,
                  }))
                }
                error={errors.title}
              />
            </div>
            <div className="form-field">
              <label className="form-field__label">客户 *</label>
              <Select
                value={formData.customerId}
                onChange={(e) => {
                  const cId = e.target.value
                  const option = customerOptions.find((o) => o.value === cId)
                  setFormData((prev) => ({
                    ...prev,
                    customerId: cId,
                    customerName: option?.label ?? "",
                  }))
                }}
                options={[{ value: "", label: "请选择客户" }, ...customerOptions]}
              />
              {errors.customerId && (
                <p className="form-error-text">{errors.customerId}</p>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-field__label">签订日期 *</label>
              <Input
                type="date"
                value={formData.signDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    signDate: (e.target as HTMLInputElement).value,
                  }))
                }
                error={errors.signDate}
              />
            </div>
            <div className="form-field" />
          </div>

          <div className="form-field">
            <label className="form-field__label">备注</label>
            <Input
              placeholder="备注信息（选填）"
              value={formData.remark}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  remark: (e.target as HTMLInputElement).value,
                }))
              }
              error={errors.remark}
            />
          </div>
        </div>
      </div>

      <div className="form-card">
        <div className="form-card__body">
          <h3 className="section-card__title">
            合同附件
            {totalAttachments > 0 && (
              <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 8 }}>
                ({totalAttachments} 个文件)
              </span>
            )}
          </h3>
          <p className="section-card__description">
            支持 PDF、图片（JPG/PNG/GIF）、Word、Excel 格式，单个文件不超过 20MB
          </p>

          {existingAttachments.length > 0 && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>文件名</th>
                    <th>大小</th>
                    <th className="data-table__actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {existingAttachments.map((att) => (
                    <tr key={att.id}>
                      <td className="data-table__name">{att.fileName}</td>
                      <td className="data-table__muted">
                        {formatFileSize(att.fileSize)}
                      </td>
                      <td className="data-table__actions">
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => {
                            const link = document.createElement("a")
                            link.href = att.dataUrl
                            link.download = att.fileName
                            link.click()
                          }}
                        >
                          下载
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => handleRemoveExisting(att.id)}
                        >
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>待上传文件</th>
                    <th>大小</th>
                    <th className="data-table__actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFiles.map((file, i) => (
                    <tr key={`${file.name}-${i}`}>
                      <td className="data-table__name">
                        <Tag variant="info">新</Tag>{" "}
                        {file.name}
                      </td>
                      <td className="data-table__muted">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="data-table__actions">
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => removeSelectedFile(i)}
                        >
                          移除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {fileErrors.length > 0 && (
            <div style={{ marginTop: "var(--space-3)" }}>
              {fileErrors.map((err, i) => (
                <p key={i} className="form-error-text">{err}</p>
              ))}
            </div>
          )}

          <div style={{ marginTop: "var(--space-4)" }}>
            <label className="button button--secondary" style={{ cursor: "pointer" }}>
              选择文件
              <input
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
              />
            </label>
          </div>
        </div>

        <div className="form-card__footer">
          <Button
            variant="ghost"
            onClick={() => navigate("/contracts")}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? "保存中..." : isEdit ? "保存修改" : "保存合同"}
          </Button>
        </div>
      </div>
    </div>
  )
}
