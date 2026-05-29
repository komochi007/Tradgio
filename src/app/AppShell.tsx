import { NavLink, Outlet, useLocation } from "react-router-dom";

type NavigationItem = {
  path: string;
  label: string;
  description: string;
};

type AppShellProps = {
  navigationItems: NavigationItem[];
};

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
  "/search": {
    title: "查询",
    description: "跨进货、出货、报价、合同的统一搜索入口。",
  },
};

export function AppShell({ navigationItems }: AppShellProps) {
  const location = useLocation();
  const meta = pageMeta[location.pathname] ?? pageMeta["/overview"];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark">T</div>
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
              <span className="sidebar__link-label">{item.label}</span>
              <span className="sidebar__link-description">{item.description}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <p className="sidebar__footer-label">当前状态</p>
          <p className="sidebar__footer-value">文档驱动初始化阶段</p>
        </div>
      </aside>

      <div className="app-shell__main">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">Project Bootstrap</p>
            <h1 className="topbar__title">{meta.title}</h1>
            <p className="topbar__description">{meta.description}</p>
          </div>
          <div className="topbar__actions">
            <button className="button button--ghost" type="button">
              查看文档
            </button>
            <button className="button button--primary" type="button">
              初始化完成
            </button>
          </div>
        </header>
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

