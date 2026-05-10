import React from 'react'

interface State { hasError: boolean; error: string }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: '' }

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, error: String(err) }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <div className="inline-block bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-left">
            <h2 className="text-red-700 font-semibold mb-2">เกิดข้อผิดพลาด</h2>
            <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">{this.state.error}</pre>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              onClick={() => this.setState({ hasError: false, error: '' })}
            >
              ลองใหม่
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
