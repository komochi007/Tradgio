import type { ReactNode } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../modules/auth"
import { AppIcon, AccountIcon, LogoutIcon } from "../shared/icons"

type NavigationItem = {
  path: string
  label: string
  icon: ReactNode
}

type AppShellProps = {
  navigationItems: NavigationItem[]
}

const pageMeta: Record<string, { title: string; description: string }> = {
  "/overview": {
    title: "Tradgio / 库存管理平台",
    description: "单人高频使用的库存与单据业务台，当前为项目初始化骨架。",
  },
  "/products": {
    title: "货品",
    description: "维护货品信息、价格基线与后续库存引用关系。",
  },
  "/counterparties": {
    title: "往来单位",
    description: "管理客户与供应商，供进货、出货、报价流程引用。",
  },
  "/purchases": {
    title: "进货",
    description: "进货单入口，后续将负责新增库存与导出固定模板。",
  },
  "/sales": {
    title: "出货",
    description: "出货单入口，后续将负责减少库存与库存不足警告。",
  },
  "/quotes": {
    title: "报价",
    description: "报价单入口，后续可复用货品默认销售价，不影响库存。",
  },
  "/contracts": {
    title: "合同",
    description: "合同记录、附件上传与按客户查询的统一入口。",
  },
}

export function AppShell({ navigationItems }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { account, logout } = useAuth()
  const meta = pageMeta[location.pathname]
  const isOverview = location.pathname === "/overview"

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <AppIcon width={40} height={40} />
          <div>
            <p className="sidebar__brand-name">Tradgio</p>
            <p className="sidebar__brand-subtitle">库存管理平台</p>
          </div>
        </div>
        <nav className="sidebar__nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
              }
            >
              <span className="sidebar__link-icon">{item.icon}</span>
              <span className="sidebar__link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__footer-account">
            <AccountIcon size={18} />
            <span className="sidebar__footer-username">{account?.username ?? "未知"}</span>
          </div>
          <button className="sidebar__footer-logout" type="button" onClick={handleLogout}>
            <LogoutIcon size={16} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <div className="app-shell__main">
        {isOverview && meta ? (
          <header className="topbar">
            <div>
              <p className="topbar__eyebrow">Tradgio</p>
              <h1 className="topbar__title">{meta.title}</h1>
              <p className="topbar__description">{meta.description}</p>
            </div>
          </header>
        ) : meta ? (
          <header className="topbar topbar--compact">
            <h1 className="topbar__title topbar__title--compact">{meta.title}</h1>
          </header>
        ) : (
          <header className="topbar topbar--compact">
            <h1 className="topbar__title topbar__title--compact">Tradgio</h1>
          </header>
        )}
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
