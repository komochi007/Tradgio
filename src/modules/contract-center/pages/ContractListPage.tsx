import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Button,
  Input,
  Tag,
  EmptyState,
  SkeletonTable,
  formatDate,
  useToast,
} from "../../../shared"
import { listContractRecords, deleteContractRecord } from "../application/contractService"
import type { ContractRecord } from "../domain/types"

export function ContractListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [records, setRecords] = useState<ContractRecord[]>([])
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const allRecords = await listContractRecords()
      setRecords(allRecords)
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleSearch() {
    setAppliedSearch(search.trim())
    setLoading(true)
    setError(null)
    listContractRecords({ search: search.trim() || undefined })
      .then((result) => {
        setRecords(result)
        setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "搜索失败")
        setLoading(false)
      })
  }

  function handleClearSearch() {
    setSearch("")
    setAppliedSearch("")
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!window.confirm("确定要删除这份合同记录吗？附件也将一并删除。")) return
    try {
      await deleteContractRecord(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      toast.success("合同已删除")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败")
    }
  }

  if (error && !loading) {
    return (
      <div className="list-page">
        <section className="section-card">
          <EmptyState
            title="加载失败"
            variant="error"
            description={error}
            primaryAction={{ label: "重新加载", onClick: fetchData }}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <h2 className="page-header__title">合同</h2>
        <div className="page-header__actions">
          <Button variant="primary" onClick={() => navigate("/contracts/new")}>
            上传合同
          </Button>
        </div>
      </div>

      <div className="filter-toolbar">
        <div className="filter-toolbar__search">
          <Input
            placeholder="搜索合同编号、标题、客户名称"
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch}>搜索</Button>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : records.length === 0 ? (
        <section className="section-card">
          <EmptyState
            title={appliedSearch ? "未找到匹配的合同" : "还没有合同记录"}
            description={
              appliedSearch
                ? "请尝试其他关键词"
                : "上传第一份合同，开始集中管理合同信息和附件。"
            }
            primaryAction={
              appliedSearch
                ? { label: "清除搜索", onClick: handleClearSearch }
                : { label: "上传合同", onClick: () => navigate("/contracts/new") }
            }
          />
        </section>
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>合同编号</th>
                <th>合同标题</th>
                <th>客户</th>
                <th>签订日期</th>
                <th>附件</th>
                <th className="data-table__actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="data-table__name">{record.contractNo}</td>
                  <td>{record.title}</td>
                  <td>{record.customerName}</td>
                  <td className="data-table__muted">
                    {formatDate(record.signDate)}
                  </td>
                  <td>
                    {record.attachments.length > 0 ? (
                      <Tag variant="info">{record.attachments.length} 个文件</Tag>
                    ) : (
                      <span className="data-table__muted">无</span>
                    )}
                  </td>
                  <td className="data-table__actions">
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/contracts/${record.id}`)
                      }}
                    >
                      查看
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(record.id)
                      }}
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
    </div>
  )
}
