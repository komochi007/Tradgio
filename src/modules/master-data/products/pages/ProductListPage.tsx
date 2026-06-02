import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Input, Tag, EmptyState, SkeletonTable, useToast, formatCurrency } from "../../../../shared"
import { productRepository } from "../infrastructure/productRepository"
import type { Product } from "../domain/types"

export function ProductListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadProducts() {
    setLoading(true)
    setError(null)
    try {
      const all = await productRepository.getAll()
      setProducts(all)
    } catch {
      setError("加载货品列表失败，请刷新重试")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  async function handleToggleStatus(product: Product) {
    try {
      const newStatus: "active" | "inactive" = product.status === "active" ? "inactive" : "active"
      await productRepository.update(product.id, { status: newStatus, updatedAt: new Date().toISOString() })
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      )
      toast.success(newStatus === "active" ? "货品已启用" : "货品已停用")
    } catch {
      toast.error("操作失败，请重试")
    }
  }

  function handleSearch() {
    setAppliedSearch(search.trim())
  }

  function handleClearSearch() {
    setSearch("")
    setAppliedSearch("")
  }

  const filtered = products.filter((p) => {
    const matchSearch =
      !appliedSearch || p.name.toLowerCase().includes(appliedSearch.toLowerCase())
    const matchStatus =
      statusFilter === "all" || p.status === statusFilter
    return matchSearch && matchStatus
  })

  if (loading) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">货品</h1>
        </div>
        <SkeletonTable rows={6} cols={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="list-page">
        <div className="page-header">
          <h1 className="page-title">货品</h1>
        </div>
        <EmptyState
          title="加载失败"
          variant="error"
          description={error}
          primaryAction={{ label: "重新加载", onClick: loadProducts }}
        />
      </div>
    )
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">货品</h1>
          <p className="page-subtitle">管理货品信息，供进货、出货、报价流程引用</p>
        </div>
        <Button variant="primary" onClick={() => navigate("/products/new")}>
          新建货品
        </Button>
      </div>

      <div className="filter-toolbar">
        <div className="filter-toolbar__search">
          <Input
            placeholder="搜索货品名称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch}>搜索</Button>
        </div>
        <div className="filter-toolbar__tabs">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`filter-tab ${statusFilter === s ? "filter-tab--active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "全部" : s === "active" ? "启用" : "停用"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={products.length === 0 ? "还没有货品" : "没有匹配的货品"}
          description={
            products.length === 0
              ? "先新建第一个货品，后续录单时可直接引用"
              : "尝试修改搜索条件或清空筛选"
          }
          primaryAction={
            products.length === 0
              ? { label: "新建货品", onClick: () => navigate("/products/new") }
              : appliedSearch ? { label: "清除搜索", onClick: handleClearSearch } : undefined
          }
        />
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>货品名称</th>
                <th>规格型号</th>
                <th>单位</th>
                <th className="data-table__num">默认进价</th>
                <th className="data-table__num">默认售价</th>
                <th>状态</th>
                <th className="data-table__actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="data-table__name">{p.name}</td>
                  <td className="data-table__muted">{p.spec || "-"}</td>
                  <td>{p.unit}</td>
                  <td className="data-table__num">
                    {p.defaultPurchasePrice != null ? formatCurrency(p.defaultPurchasePrice) : "-"}
                  </td>
                  <td className="data-table__num">
                    {p.defaultSalesPrice != null ? formatCurrency(p.defaultSalesPrice) : "-"}
                  </td>
                  <td>
                    <Tag
                      variant={p.status === "active" ? "success" : "default"}
                      size="small"
                    >
                      {p.status === "active" ? "启用" : "停用"}
                    </Tag>
                  </td>
                  <td className="data-table__actions">
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => navigate(`/products/${p.id}`)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleToggleStatus(p)}
                    >
                      {p.status === "active" ? "停用" : "启用"}
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
