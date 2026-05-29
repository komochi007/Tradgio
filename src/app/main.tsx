import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryProvider } from "../shared/query";
import { ToastProvider } from "../shared/notification";
import { ToastContainer } from "../shared/notification";
import { AuthProvider } from "../modules/auth";
import App from "./App";
import "../shared/styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
            <ToastContainer />
          </AuthProvider>
        </ToastProvider>
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
