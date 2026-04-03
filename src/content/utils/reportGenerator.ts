import type { NetworkRequest } from '../../shared/types'

// ── cURL builder (duplicated from DetailView to keep this util framework-free) ─

function toCurl(req: NetworkRequest): string {
  const parts = [`curl -X ${req.method} '${req.url}'`]
  Object.entries(req.requestHeaders ?? {}).forEach(([k, v]) => {
    parts.push(`  -H '${k}: ${v}'`)
  })
  if (req.requestBody) {
    parts.push(`  --data-raw '${req.requestBody.replace(/'/g, "\\'")}'`)
  }
  return parts.join(' \\\n')
}

// ── Report shape ──────────────────────────────────────────────────────────────

export interface QCReport {
  qcVersion: '1.0'
  exportedAt: string        // ISO timestamp when the report was generated
  pageUrl: string           // URL of the page where the extension was running
  userAgent: string
  requestCount: number
  requests: QCRequestEntry[]
}

export interface QCRequestEntry {
  seq: number               // 1-based position in the report
  id: string
  timestamp: string         // ISO timestamp when the request fired
  method: string
  url: string
  status: number | null
  statusText: string | null
  duration: number | null   // milliseconds
  pending: boolean
  error: string | null
  initiator: string | null
  request: {
    headers: Record<string, string>
    body: string | null
  }
  response: {
    headers: Record<string, string>
    body: string | null
  }
  curl: string
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildReport(reqs: NetworkRequest[]): QCReport {
  const sorted = [...reqs].sort((a, b) => a.timestamp - b.timestamp)
  return {
    qcVersion: '1.0',
    exportedAt: new Date().toISOString(),
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    requestCount: sorted.length,
    requests: sorted.map((req, i) => ({
      seq: i + 1,
      id: req.id,
      timestamp: new Date(req.timestamp).toISOString(),
      method: req.method,
      url: req.url,
      status: req.status ?? null,
      statusText: req.statusText ?? null,
      duration: req.duration ?? null,
      pending: req.pending,
      error: req.error ?? null,
      initiator: req.initiator ?? null,
      request: {
        headers: req.requestHeaders ?? {},
        body: req.requestBody ?? null,
      },
      response: {
        headers: req.responseHeaders ?? {},
        body: req.responseBody ?? null,
      },
      curl: toCurl(req),
    })),
  }
}

export function reportToJson(reqs: NetworkRequest[]): string {
  return JSON.stringify(buildReport(reqs), null, 2)
}

// ── HAR (HTTP Archive 1.2) builder ────────────────────────────────────────────

function toHarHeaders(headers: Record<string, string> = {}): Array<{ name: string; value: string }> {
  return Object.entries(headers).map(([name, value]) => ({ name, value }))
}

function getQueryString(url: string): Array<{ name: string; value: string }> {
  try {
    return Array.from(new URL(url).searchParams.entries()).map(([name, value]) => ({ name, value }))
  } catch {
    return []
  }
}

function getMimeType(headers: Record<string, string> = {}): string {
  const entry = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')
  return entry ? entry[1].split(';')[0].trim() : 'application/octet-stream'
}

export function buildHar(reqs: NetworkRequest[]): object {
  const sorted = [...reqs].sort((a, b) => a.timestamp - b.timestamp)
  return {
    log: {
      version: '1.2',
      creator: { name: 'QuickConsole', version: '1.0' },
      pages: [],
      entries: sorted.map((req) => {
        const entry: Record<string, unknown> = {
          startedDateTime: new Date(req.timestamp).toISOString(),
          time: req.duration ?? -1,
          request: {
            method: req.method,
            url: req.url,
            httpVersion: 'HTTP/1.1',
            headers: toHarHeaders(req.requestHeaders),
            queryString: getQueryString(req.url),
            cookies: [],
            headersSize: -1,
            bodySize: req.requestBody ? req.requestBody.length : -1,
            ...(req.requestBody
              ? { postData: { mimeType: getMimeType(req.requestHeaders), text: req.requestBody } }
              : {}),
          },
          response: {
            status: req.status ?? 0,
            statusText: req.statusText ?? '',
            httpVersion: 'HTTP/1.1',
            headers: toHarHeaders(req.responseHeaders),
            cookies: [],
            content: {
              size: req.responseBody ? req.responseBody.length : -1,
              mimeType: getMimeType(req.responseHeaders),
              ...(req.responseBody ? { text: req.responseBody } : {}),
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: req.responseBody ? req.responseBody.length : -1,
          },
          cache: {},
          timings: { send: -1, wait: req.duration ?? -1, receive: -1 },
        }
        // Non-standard extension fields (prefixed with _)
        if (req.initiator) entry['_initiator'] = req.initiator
        if (req.error)     entry['_error']     = req.error
        return entry
      }),
    },
  }
}

export function harToJson(reqs: NetworkRequest[]): string {
  return JSON.stringify(buildHar(reqs), null, 2)
}

// ── File download helper ──────────────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function stem(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
}

/** Downloads selected requests as a QC JSON report. */
export function downloadReport(reqs: NetworkRequest[], filename?: string): void {
  triggerDownload(reportToJson(reqs), filename ?? `qc-report-${stem()}.json`, 'application/json')
}

/** Downloads selected requests as a standard HAR file (importable by Postman, Insomnia, Chrome DevTools). */
export function downloadHar(reqs: NetworkRequest[], filename?: string): void {
  triggerDownload(harToJson(reqs), filename ?? `qc-report-${stem()}.har`, 'application/json')
}
