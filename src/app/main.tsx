import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryProvider } from "../shared/query"
import { ToastProvider } from "../shared/notification"
import { ToastContainer } from "../shared/notification"
import { ErrorBoundary } from "../shared/components/ErrorBoundary"
import { AuthProvider } from "../modules/auth"
import { PwaUpdateProvider } from "../shared/platform/pwaUpdateContext"
import App from "./App"
import "../shared/styles/global.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <QueryProvider>
        <ToastProvider>
          <AuthProvider>
            <PwaUpdateProvider>
              <ErrorBoundary>
                <App />
                <ToastContainer />
              </ErrorBoundary>
            </PwaUpdateProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>
)
