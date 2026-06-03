import type { ReactNode } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
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

export function AppShell({ navigationItems }: AppShellProps) {
  const navigate = useNavigate()
  const { account, logout } = useAuth()

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
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
