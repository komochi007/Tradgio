import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Button,
  Tag,
  EmptyState,
  SkeletonCard,
  formatDate,
  formatFileSize,
  useToast,
} from "../../../shared"
import { downloadAttachment, getContractRecord } from "../application/contractService"
import type { ContractRecord } from "../domain/types"

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [record, setRecord] = useState<ContractRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getContractRecord(id)
      .then((r) => {
        if (r) {
          setRecord(r)
        } else {
          setError("合同记录不存在")
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="form-page">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="list-page">
        <section className="section-card">
          <EmptyState
            title={error ?? "合同记录不存在"}
            primaryAction={{
              label: "返回列表",
              onClick: () => navigate("/contracts"),
            }}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <h2 className="page-header__title">{record.title}</h2>
        <div className="page-header__actions">
          <Button variant="secondary" onClick={() => navigate(`/contracts/${record.id}/edit`)}>
            编辑
          </Button>
          <Button variant="ghost" onClick={() => navigate("/contracts")}>
            返回列表
          </Button>
        </div>
      </div>

      <div className="form-card">
        <div className="form-card__body">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-item__label">合同编号</span>
              <span className="detail-item__value">{record.contractNo}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">合同标题</span>
              <span className="detail-item__value">{record.title}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">客户</span>
              <span className="detail-item__value">{record.customerName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">签订日期</span>
              <span className="detail-item__value">{formatDate(record.signDate)}</span>
            </div>
            {record.remark && (
              <div className="detail-item">
                <span className="detail-item__label">备注</span>
                <span className="detail-item__value">{record.remark}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="form-card">
        <div className="form-card__body">
          <h3 className="section-card__title">
            合同附件
            {record.attachments.length > 0 && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: "var(--text-tertiary)",
                  marginLeft: 8,
                }}
              >
                ({record.attachments.length} 个文件)
              </span>
            )}
          </h3>

          {record.attachments.length > 0 ? (
            <div style={{ marginTop: "var(--space-4)" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>文件名</th>
                    <th>类型</th>
                    <th>大小</th>
                    <th>上传时间</th>
                    <th className="data-table__actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {record.attachments.map((att) => (
                    <tr key={att.attachmentId}>
                      <td className="data-table__name">{att.fileName}</td>
                      <td>
                        <Tag variant="info">
                          {att.mimeType.split("/")[1]?.toUpperCase() ?? "FILE"}
                        </Tag>
                      </td>
                      <td className="data-table__muted">{formatFileSize(att.fileSize)}</td>
                      <td className="data-table__muted">{formatDate(att.uploadedAt)}</td>
                      <td className="data-table__actions">
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={async () => {
                            try {
                              const blob = await downloadAttachment(att.attachmentId)
                              const url = URL.createObjectURL(blob)
                              const link = document.createElement("a")
                              link.href = url
                              link.download = att.fileName
                              link.click()
                              URL.revokeObjectURL(url)
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "附件下载失败")
                            }
                          }}
                        >
                          下载
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="section-card__description">暂无附件，可编辑合同并上传文件。</p>
          )}
        </div>
      </div>
    </div>
  )
}
