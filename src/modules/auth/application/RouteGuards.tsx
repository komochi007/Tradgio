import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "./AuthContext"

export function RequireAuth() {
  const { status } = useAuth()

  if (status === "idle" || status === "restoring") {
    return null
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function GuestOnly() {
  const { status } = useAuth()

  if (status === "idle" || status === "restoring") {
    return null
  }

  if (status === "authenticated") {
    return <Navigate to="/overview" replace />
  }

  return <Outlet />
}
