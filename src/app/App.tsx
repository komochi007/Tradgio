import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "./AppShell"
import { OverviewPage } from "../modules/overview/pages/OverviewPage"
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
  QuoteListPage,
  QuoteFormPage,
  QuoteDetailPage,
} from "../modules/document-core"
import { ContractListPage, ContractFormPage, ContractDetailPage } from "../modules/contract-center"
import {
  OverviewIcon,
  ProductIcon,
  CounterpartyIcon,
  PurchaseIcon,
  SalesIcon,
  QuoteIcon,
  ContractIcon,
} from "../shared/icons"

const navigationItems = [
  { path: "/overview", label: "总览", icon: <OverviewIcon size={20} /> },
  { path: "/products", label: "货品", icon: <ProductIcon size={20} /> },
  { path: "/counterparties", label: "往来单位", icon: <CounterpartyIcon size={20} /> },
  { path: "/purchases", label: "进货", icon: <PurchaseIcon size={20} /> },
  { path: "/sales", label: "出货", icon: <SalesIcon size={20} /> },
  { path: "/quotes", label: "报价", icon: <QuoteIcon size={20} /> },
  { path: "/contracts", label: "合同", icon: <ContractIcon size={20} /> },
]

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell navigationItems={navigationItems} />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
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

          <Route path="/quotes" element={<QuoteListPage />} />
          <Route path="/quotes/new" element={<QuoteFormPage />} />
          <Route path="/quotes/:id" element={<QuoteDetailPage />} />
          <Route path="/quotes/:id/edit" element={<QuoteFormPage />} />

          <Route path="/contracts" element={<ContractListPage />} />
          <Route path="/contracts/new" element={<ContractFormPage />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
          <Route path="/contracts/:id/edit" element={<ContractFormPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
