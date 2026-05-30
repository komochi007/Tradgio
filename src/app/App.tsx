import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "./AppShell"
import { OverviewPage } from "../modules/overview/pages/OverviewPage"
import { PlaceholderPage } from "../shared/components/PlaceholderPage"
import { LoginPage } from "../modules/auth/pages/LoginPage"
import { RegisterPage } from "../modules/auth/pages/RegisterPage"
import { RequireAuth, GuestOnly } from "../modules/auth/application/RouteGuards"
import { ProductListPage, ProductFormPage } from "../modules/master-data/products"
import { CounterpartyListPage, CounterpartyFormPage } from "../modules/master-data/counterparties"
import {
  PurchaseListPage,
  PurchaseFormPage,
  PurchaseDetailPage,
  SalesListPage,
  SalesFormPage,
  SalesDetailPage,
} from "../modules/document-core"

const navigationItems = [
  { path: "/overview", label: "总览", description: "最近记录、快捷入口和库存摘要" },
  { path: "/products", label: "货品", description: "货品资料与库存管理" },
  { path: "/counterparties", label: "往来单位", description: "客户与供应商名单" },
  { path: "/purchases", label: "进货", description: "进货单列表与新建入口" },
  { path: "/sales", label: "出货", description: "出货单列表与新建入口" },
  { path: "/quotes", label: "报价", description: "报价单列表与导出入口" },
  { path: "/contracts", label: "合同", description: "合同记录与附件管理" },
  { path: "/search", label: "查询", description: "跨模块统一搜索" },
]

const PLACEHOLDER_ROUTES = ["/quotes", "/contracts", "/search"]

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell navigationItems={navigationItems} />}>
          <Route
            path="/"
            element={<Navigate to="/overview" replace />}
          />
          <Route path="/overview" element={<OverviewPage />} />

          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id" element={<ProductFormPage />} />

          <Route path="/counterparties" element={<CounterpartyListPage />} />
          <Route path="/counterparties/new" element={<CounterpartyFormPage />} />
          <Route path="/counterparties/:id" element={<CounterpartyFormPage />} />

          <Route path="/purchases" element={<PurchaseListPage />} />
          <Route path="/purchases/new" element={<PurchaseFormPage />} />
          <Route path="/purchases/:id" element={<PurchaseDetailPage />} />
          <Route path="/purchases/:id/edit" element={<PurchaseFormPage />} />

          <Route path="/sales" element={<SalesListPage />} />
          <Route path="/sales/new" element={<SalesFormPage />} />
          <Route path="/sales/:id" element={<SalesDetailPage />} />
          <Route path="/sales/:id/edit" element={<SalesFormPage />} />

          {PLACEHOLDER_ROUTES.map((path) => {
            const item = navigationItems.find((n) => n.path === path)
            return (
              <Route
                key={path}
                path={path}
                element={
                  <PlaceholderPage
                    title={item?.label ?? ""}
                    description={item?.description ?? ""}
                  />
                }
              />
            )
          })}
        </Route>
      </Route>
    </Routes>
  )
}
