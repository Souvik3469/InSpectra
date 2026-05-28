import React, { useEffect } from 'react'
import { usePanelStore } from './store'
import Panel from './components/Panel'
import { useNetworkMessages } from './hooks/useNetworkMessages'
import { MSG_TOGGLE, IS_NET_READY } from '../shared/constants'
import type { NetworkRequest } from '../shared/types'

// Per-tab session storage key.
// window.sessionStorage is scoped to the current tab AND the current origin,
// so requests from github.com never bleed into reddit.com, and two separate
// tabs on github.com each have their own independent history.
const SESSION_KEY = 'is_session_v1'

function stripBodies(r: NetworkRequest) {
  return {
    id: r.id, method: r.method, url: r.url,
    status: r.status, statusText: r.statusText,
    requestHeaders: r.requestHeaders, responseHeaders: r.responseHeaders,
    duration: r.duration, timestamp: r.timestamp,
    pending: false, error: r.error, initiator: r.initiator,
  }
}

export default function App() {
  const toggle = usePanelStore((s) => s.toggle)
  useNetworkMessages()

  // ── Per-tab session: restore → flush interceptor buffer → save on unload ──
  useEffect(() => {
    // sessionStorage reads are synchronous — no async/hydration wait needed
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const saved: { isVisible?: boolean; networkRequests?: NetworkRequest[] } = JSON.parse(raw)
        if (saved.isVisible) usePanelStore.getState().setVisible(true)
        saved.networkRequests?.forEach((r) => usePanelStore.getState().addNetworkRequest(r))
      }
    } catch { /* corrupt data — ignore */ }

    // Signal the MAIN-world interceptor to flush its pre-mount buffer.
    // The interceptor queues every fetch/XHR event that fired before this
    // signal so nothing is lost during the document_start → document_idle gap.
    const _origin = window.location.origin !== 'null' ? window.location.origin : '*'
    window.postMessage({ type: IS_NET_READY }, _origin)

    // Save per-tab state on navigation away from this page
    const handleUnload = () => {
      const s = usePanelStore.getState()
      try {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          isVisible: s.isVisible,
          networkRequests: s.networkRequests.filter((r) => !r.pending).slice(-200).map(stripBodies),
        }))
      } catch { /* storage full */ }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  // ── Toolbar icon click ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (message: { type: string }) => {
      if (message.type === MSG_TOGGLE) toggle()
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [toggle])

  return <Panel />
}
