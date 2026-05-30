import { Component, type ReactNode } from "react"
import { PageError } from "./PageError"

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="app-shell__main">
          <div className="page-container">
            <PageError
              title="应用发生异常"
              message={this.state.error.message || "渲染时出现未知错误"}
              onRetry={this.handleRetry}
              primaryAction={{
                label: "返回首页",
                onClick: () => {
                  window.location.href = "/overview"
                },
              }}
            />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
