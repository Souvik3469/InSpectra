import { useEffect } from 'react'
import { usePanelStore } from '../store'
import { IS_NETWORK } from '../../shared/constants'
import type { NetworkRequest } from '../../shared/types'

// Narrowed shape for messages coming from the MAIN-world network interceptor.
// Using unknown fields and a type guard avoids trusting arbitrary postMessage
// payloads — any script on the page can post to window.
interface RawNetworkEvent {
  type: string
  event: 'req' | 'res' | 'err'
  id: string
  [key: string]: unknown
}

function isNetworkEvent(data: unknown): data is RawNetworkEvent {
  if (data === null || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return d['type'] === IS_NETWORK &&
    (d['event'] === 'req' || d['event'] === 'res' || d['event'] === 'err') &&
    typeof d['id'] === 'string'
}

/**
 * Listens for network events posted by the MAIN-world interceptor and routes
 * them into the panel store. Respects the `isRecording` toggle.
 */
export function useNetworkMessages(): void {
  const isRecording          = usePanelStore((s) => s.isRecording)
  const addNetworkRequest    = usePanelStore((s) => s.addNetworkRequest)
  const updateNetworkRequest = usePanelStore((s) => s.updateNetworkRequest)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!isRecording || !isNetworkEvent(e.data)) return

      const d = e.data
      if (d.event === 'req') {
        addNetworkRequest({
          id: d.id, method: d['method'] as string, url: d['url'] as string,
          requestHeaders: (d['reqHeaders'] as Record<string, string>) ?? {},
          requestBody:    d['reqBody'] as string | undefined,
          initiator:      d['initiator'] as string | undefined,
          timestamp:      d['ts'] as number,
          pending:        true,
        } as NetworkRequest)
      } else if (d.event === 'res') {
        updateNetworkRequest(d.id, {
          status:          d['status'] as number,
          statusText:      d['statusText'] as string,
          responseHeaders: d['resHeaders'] as Record<string, string>,
          responseBody:    d['resBody'] as string | undefined,
          duration:        d['duration'] as number,
          pending:         false,
        })
      } else if (d.event === 'err') {
        updateNetworkRequest(d.id, {
          error:    d['error'] as string,
          duration: d['duration'] as number | undefined,
          pending:  false,
        })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [isRecording, addNetworkRequest, updateNetworkRequest])
}
