import React from 'react'

interface State {
  hasError: boolean
}

/**
 * Catches render errors anywhere in the panel tree so an unexpected crash
 * doesn't leave the user with a blank, unresponsive overlay.
 */
export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4 text-qc-error text-[12px] text-center leading-relaxed">
          Panel encountered an error.
          <br />
          Reload the page to reset.
        </div>
      )
    }
    return this.props.children
  }
}
