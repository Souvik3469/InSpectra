import { useEffect } from 'react'
import { usePanelStore } from '../store'
import { QC_NETWORK } from '../../shared/constants'
import type { NetworkRequest } from '../../shared/types'

/**
 * Listens for network events posted by the MAIN-world interceptor and routes
 * them into the panel store. Respects the `isRecording` toggle.
 */
export function useNetworkMessages(): void {
  const isRecording        = usePanelStore((s) => s.isRecording)
  const addNetworkRequest    = usePanelStore((s) => s.addNetworkRequest)
  const updateNetworkRequest = usePanelStore((s) => s.updateNetworkRequest)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== QC_NETWORK || !isRecording) return

      const d = e.data
      if (d.event === 'req') {
        addNetworkRequest({
          id: d.id, method: d.method, url: d.url,
          requestHeaders: d.reqHeaders ?? {},
          requestBody:    d.reqBody,
          initiator:      d.initiator,
          timestamp:      d.ts,
          pending:        true,
        } as NetworkRequest)
      } else if (d.event === 'res') {
        updateNetworkRequest(d.id, {
          status: d.status, statusText: d.statusText,
          responseHeaders: d.resHeaders, responseBody: d.resBody,
          duration: d.duration, pending: false,
        })
      } else if (d.event === 'err') {
        updateNetworkRequest(d.id, { error: d.error, duration: d.duration, pending: false })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [isRecording, addNetworkRequest, updateNetworkRequest])
}
