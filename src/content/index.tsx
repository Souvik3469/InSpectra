import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { IS_ROOT_ID } from '../shared/constants'
import './utils/devReload'

function mount() {
  // Prevent double-mount on hot-reload or duplicate injection
  if (document.getElementById(IS_ROOT_ID)) return

  // Root element — attaches to <html> (not <body>) so it survives body replacements.
  // Panel CSS is injected separately via manifest content_scripts.css (no inline needed).
  const host = document.createElement('div')
  host.id = IS_ROOT_ID
  document.documentElement.appendChild(host)

  createRoot(host).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
}

// Guard against edge cases where DOMContentLoaded already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
