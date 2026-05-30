import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Input, Tag, EmptyState, SkeletonTable, useToast } from "../../../../shared"
import { counterpartyRepository } from "../infrastructure/counterpartyRepository"
import type { Counterparty, CounterpartyType } from "../domain/types"

const typeLabel: Record<CounterpartyType, string> = {
  customer: "客户",
  supplier: "供应商",
}

export function CounterpartyListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [items, setItems] = useState<Counterparty[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | CounterpartyType>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const all = await counterpartyRepository.getAll()
      setItems(all)
    } catch {
      setError("加载往来单位列表失败，请刷新重试")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleToggleStatus(c: Counterparty) {
    try {
      const newStatus: "active" | "inactive" = c.status === "active" ? "inactive" : "active"
      await counterpartyRepository.update(c.id, { status: newStatus, updatedAt: new Date().toISOString() })
      setItems((prev) => prev.map((p) => (p.id === c.id ? { ...p, status: newStatus } : p)))
      toast.success(newStatus === "active" ? "单位已启用" : "单位已停用")
    } catch {
      toast.error("操作失败，请重试")
    }
  }

  const filtered = items.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "all" || c.type === typeFilter
    return matchSearch && matchType
  })

  if (loading) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">往来单位</h1>
        </div>
        <SkeletonTable rows={6} cols={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">往来单位</h1>
        </div>
        <EmptyState
          title="加载失败"
          variant="error"
          description={error}
          primaryAction={{ label: "重新加载", onClick: load }}
        />
      </div>
    )
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">往来单位</h1>
          <p className="page-subtitle">管理客户与供应商，供进货、出货、报价流程引用</p>
        </div>
        <Button variant="primary" onClick={() => navigate("/counterparties/new")}>
          新建单位
        </Button>
      </div>

      <div className="filter-toolbar">
        <div className="filter-toolbar__search">
          <Input
            placeholder="搜索单位名称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-toolbar__tabs">
          {(["all", "customer", "supplier"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`filter-tab ${typeFilter === t ? "filter-tab--active" : ""}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === "all" ? "全部" : typeLabel[t]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? "还没有往来单位" : "没有匹配的单位"}
          description={
            items.length === 0
              ? "先新建客户或供应商，后续录单时可直接引用"
              : "尝试修改搜索条件或清空筛选"
          }
          primaryAction={
            items.length === 0
              ? { label: "新建单位", onClick: () => navigate("/counterparties/new") }
              : undefined
          }
        />
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>单位名称</th>
                <th>类型</th>
                <th>联系人</th>
                <th>联系电话</th>
                <th>状态</th>
                <th className="data-table__actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="data-table__name">{c.name}</td>
                  <td>
                    <Tag
                      variant={c.type === "customer" ? "info" : "warning"}
                      size="small"
                    >
                      {typeLabel[c.type]}
                    </Tag>
                  </td>
                  <td className="data-table__muted">{c.contactPerson || "-"}</td>
                  <td className="data-table__muted">{c.phone || "-"}</td>
                  <td>
                    <Tag
                      variant={c.status === "active" ? "success" : "default"}
                      size="small"
                    >
                      {c.status === "active" ? "启用" : "停用"}
                    </Tag>
                  </td>
                  <td className="data-table__actions">
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => navigate(`/counterparties/${c.id}`)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleToggleStatus(c)}
                    >
                      {c.status === "active" ? "停用" : "启用"}
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
