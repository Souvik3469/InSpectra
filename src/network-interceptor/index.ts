/**
 * Network interceptor — runs in MAIN world (page context).
 * Wraps window.fetch and XMLHttpRequest to capture all network activity.
 *
 * Two key behaviours:
 *   1. BUFFER — events are queued until the content script signals it is ready
 *      (via IS_NET_READY). This means requests fired during page load — before
 *      the React panel has mounted — are never lost.
 *   2. INITIATOR — each request captures a trimmed stack-trace frame so the
 *      Network tab can show which file:line triggered the request.
 */

import { IS_NETWORK, IS_NET_READY } from '../shared/constants'

const MAX_BODY = 50_000

let _counter = 0
function genId() { return `isn_${Date.now()}_${_counter++}` }

// ── Buffer: hold events until content script is ready ────────────────────────
const _buf: Record<string, unknown>[] = []
let _ready = false

const _origin = window.location.origin !== 'null' ? window.location.origin : '*'

function post(data: Record<string, unknown>) {
  if (_ready) window.postMessage(data, _origin)
  else _buf.push(data)
}

window.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type === IS_NET_READY && !_ready) {
    _ready = true
    _buf.splice(0).forEach((d) => window.postMessage(d, _origin))
  }
})

// ── Initiator: extract file:line from call stack ─────────────────────────────
function getInitiator(): string {
  try {
    for (const line of (new Error().stack ?? '').split('\n')) {
      const t = line.trim()
      if (!t || t === 'Error' || t.includes('chrome-extension://')) continue
      // "at [func] (url:line:col)"  or  "at url:line:col"
      const m = t.match(/^at\s+(?:.+\s+\()?(.+?):(\d+):\d+\)?$/)
      if (!m) continue
      const [, rawUrl, lineNum] = m
      try {
        const filename = new URL(rawUrl).pathname.split('/').pop() || rawUrl
        return `${filename}:${lineNum}`
      } catch {
        return `${(rawUrl.split('/').pop() || rawUrl)}:${lineNum}`
      }
    }
  } catch { /* ignore */ }
  return ''
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function headersToRecord(h: Headers | HeadersInit | undefined): Record<string, string> {
  if (!h) return {}
  if (h instanceof Headers) {
    const obj: Record<string, string> = {}
    h.forEach((v, k) => { obj[k] = v })
    return obj
  }
  if (Array.isArray(h)) return Object.fromEntries(h as string[][])
  return h as Record<string, string>
}

function bodyToStr(b: BodyInit | null | undefined): string | undefined {
  if (b == null) return undefined
  if (typeof b === 'string') return b.slice(0, MAX_BODY)
  if (b instanceof URLSearchParams) return b.toString().slice(0, MAX_BODY)
  if (b instanceof FormData) return '[FormData]'
  if (b instanceof ArrayBuffer || ArrayBuffer.isView(b)) return '[Binary data]'
  if (b instanceof Blob) return `[Blob: ${(b as Blob).size} bytes]`
  if (b instanceof ReadableStream) return '[ReadableStream]'
  return String(b).slice(0, MAX_BODY)
}

// Guard: prevent double-wrapping on SPA navigations that re-inject the script
if (!(window as any).__isNetActive) {
  ;(window as any).__isNetActive = true

  // ── Intercept fetch ────────────────────────────────────────────────────────
  const _origFetch = window.fetch.bind(window)

  window.fetch = async function isFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const initiator = getInitiator()
    let url: string, method: string, reqHeaders: Record<string, string>, reqBody: string | undefined

    if (input instanceof Request) {
      url = input.url
      method = (init?.method ?? input.method ?? 'GET').toUpperCase()
      reqHeaders = headersToRecord(init?.headers ?? input.headers)
      reqBody = bodyToStr(init?.body)
    } else {
      url = input instanceof URL ? input.href : String(input)
      method = (init?.method ?? 'GET').toUpperCase()
      reqHeaders = headersToRecord(init?.headers)
      reqBody = bodyToStr(init?.body)
    }

    const id = genId()
    const t0 = Date.now()
    post({ type: IS_NETWORK, event: 'req', id, method, url, reqHeaders, reqBody, initiator, ts: t0 })

    try {
      const resp = await _origFetch(input, init)
      const duration = Date.now() - t0
      const resHeaders = headersToRecord(resp.headers)
      let resBody: string | undefined
      try { resBody = (await resp.clone().text()).slice(0, MAX_BODY) } catch { /* binary */ }
      post({ type: IS_NETWORK, event: 'res', id, status: resp.status, statusText: resp.statusText, resHeaders, resBody, duration })
      return resp
    } catch (err) {
      post({ type: IS_NETWORK, event: 'err', id, error: String(err), duration: Date.now() - t0 })
      throw err
    }
  }

  // ── Intercept XMLHttpRequest ───────────────────────────────────────────────
  const OrigXHR = window.XMLHttpRequest

  class ISXHR extends OrigXHR {
    private _id = genId()
    private _method = 'GET'
    private _url = ''
    private _reqH: Record<string, string> = {}
    private _t0 = 0
    private _initiator = ''

    open(method: string, url: string | URL, async = true, user?: string | null, pwd?: string | null) {
      this._method = method.toUpperCase()
      this._url = typeof url === 'string' ? url : url.href
      super.open(method, url as string, async, user as string, pwd as string)
    }

    setRequestHeader(name: string, value: string) {
      this._reqH[name.toLowerCase()] = value
      super.setRequestHeader(name, value)
    }

    send(body?: Document | XMLHttpRequestBodyInit | null) {
      this._id = genId()
      this._t0 = Date.now()
      this._initiator = getInitiator()
      const reqBody = body != null ? String(body).slice(0, MAX_BODY) : undefined

      post({ type: IS_NETWORK, event: 'req', id: this._id, method: this._method, url: this._url, reqHeaders: { ...this._reqH }, reqBody, initiator: this._initiator, ts: this._t0 })

      this.addEventListener('load', () => {
        const resHeaders: Record<string, string> = {}
        this.getAllResponseHeaders().trim().split(/[\r\n]+/).forEach((line) => {
          const i = line.indexOf(':')
          if (i > 0) resHeaders[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim()
        })
        let resBody: string | undefined
        try { if (typeof this.responseText === 'string') resBody = this.responseText.slice(0, MAX_BODY) } catch { /* ignore */ }
        post({ type: IS_NETWORK, event: 'res', id: this._id, status: this.status, statusText: this.statusText, resHeaders, resBody, duration: Date.now() - this._t0 })
      })

      const onFail = (kind: string) => () =>
        post({ type: IS_NETWORK, event: 'err', id: this._id, error: kind, duration: Date.now() - this._t0 })

      this.addEventListener('error', onFail('Network error'))
      this.addEventListener('abort', onFail('Request aborted'))
      this.addEventListener('timeout', onFail('Request timed out'))
      super.send(body)
    }
  }

  window.XMLHttpRequest = ISXHR as typeof XMLHttpRequest
}
