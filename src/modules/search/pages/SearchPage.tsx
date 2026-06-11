import { useState, useCallback, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Input, Tag, EmptyState } from "../../../shared"
import { formatDate } from "../../../shared"
import { searchDocuments } from "../application/searchService"
import { typeLabel, typeVariant } from "../domain/types"
import type { SearchResult } from "../domain/types"

type PageState = "initial" | "loading" | "results" | "empty" | "error"

export function SearchPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState("")
  const [currentSearch, setCurrentSearch] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [state, setState] = useState<PageState>("initial")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSearch = useCallback(async () => {
    const trimmed = keyword.trim()
    if (!trimmed) return

    setCurrentSearch(trimmed)
    setState("loading")
    setErrorMessage("")

    try {
      const data = await searchDocuments(trimmed)
      setResults(data)
      setState(data.length === 0 ? "empty" : "results")
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "搜索失败，请重试")
      setState("error")
    }
  }, [keyword])

  function handleResultClick(route: string) {
    navigate(route)
  }

  if (state === "error") {
    return (
      <div className="list-page">
        <div className="page-header">
          <h2 className="page-header__title">查询</h2>
        </div>
        <section className="section-card">
          <EmptyState
            title="搜索失败"
            description={errorMessage}
            primaryAction={{
              label: "重新搜索",
              onClick: () => {
                setState("initial")
                setKeyword(currentSearch)
                inputRef.current?.focus()
              },
            }}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <h2 className="page-header__title">查询</h2>
      </div>

      <div
        style={{
          maxWidth: 640,
          margin: state === "initial" ? "120px auto 0" : "0 auto var(--space-6)",
          transition: "margin 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="filter-toolbar" style={{ justifyContent: "center" }}>
          <div className="filter-toolbar__search" style={{ maxWidth: 480, width: "100%" }}>
            <Input
              ref={inputRef}
              placeholder="搜索货品、客户、供应商、单据编号、合同标题"
              value={keyword}
              disabled={state === "loading"}
              onChange={(e) => setKeyword((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button variant="primary" loading={state === "loading"} onClick={handleSearch}>
            搜索
          </Button>
        </div>
      </div>

      {state === "initial" && (
        <div style={{ textAlign: "center", marginTop: "var(--space-6)" }}>
          <p style={{ color: "var(--text-tertiary)", fontSize: 14, lineHeight: "22px" }}>
            输入货品名称、客户名称、供应商名称、单据编号或合同标题开始搜索
          </p>
        </div>
      )}

      {state === "loading" && (
        <section className="section-card">
          <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: "22px" }}>
              正在搜索「{currentSearch}」...
            </p>
          </div>
        </section>
      )}

      {state === "empty" && (
        <section className="section-card">
          <EmptyState
            title="未找到匹配结果"
            description={`没有找到与「${currentSearch}」相关的记录，请尝试其他关键词。`}
          />
        </section>
      )}

      {state === "results" && (
        <>
          <div
            style={{
              marginBottom: "var(--space-4)",
              color: "var(--text-secondary)",
              fontSize: 14,
              lineHeight: "22px",
              textAlign: "center",
            }}
          >
            找到 {results.length} 条与「{currentSearch}」相关的结果
          </div>
          <div className="data-table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>类型</th>
                  <th>编号 / 标题</th>
                  <th>关联方</th>
                  <th>匹配字段</th>
                  <th style={{ width: 120 }}>日期</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className="overview__recent-row"
                    onClick={() => handleResultClick(item.targetRoute)}
                  >
                    <td>
                      <Tag variant={typeVariant[item.type]} size="small">
                        {typeLabel[item.type]}
                      </Tag>
                    </td>
                    <td className="data-table__name">{item.title}</td>
                    <td>{item.subtitle}</td>
                    <td className="data-table__muted">{item.matchedField}</td>
                    <td className="data-table__muted">{formatDate(item.happenedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
