import { useState } from 'react'
import { ChevronLeft, FileJson, FileCode2, Check } from 'lucide-react'
import { CopyBtn } from '../ui/CopyBtn'
import { HeadersTable } from './HeadersTable'
import { reportToJson, harToJson } from '../../utils/reportGenerator'
import type { NetworkRequest } from '../../../shared/types'

type DetailTab = 'request' | 'response' | 'curl'

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortUrl(url: string) {
  try {
    const u = new URL(url)
    return u.pathname + (u.search || '')
  } catch {
    return url
  }
}

function fmtMs(ms?: number) {
  if (ms == null) return ''
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function methodColor(method: string) {
  switch (method.toUpperCase()) {
    case 'GET':    return 'text-qc-accent'
    case 'POST':   return 'text-qc-success'
    case 'PUT':    return 'text-qc-warn'
    case 'DELETE': return 'text-qc-error'
    case 'PATCH':  return 'text-qc-return'
    default:       return 'text-qc-text-muted'
  }
}

function statusColor(status?: number) {
  if (!status) return ''
  if (status < 300) return 'text-qc-success'
  if (status < 400) return 'text-qc-info'
  if (status < 500) return 'text-qc-warn'
  return 'text-qc-error'
}

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

// ── Reusable body preview block ───────────────────────────────────────────────

function BodyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-3 pb-2.5">
      <div className="flex items-center justify-between py-1.5">
        <h4 className="text-[10.5px] font-semibold text-qc-text-muted uppercase tracking-[0.06em]">
          {title}
        </h4>
        <CopyBtn text={text} />
      </div>
      <pre className="font-mono text-[11px] text-qc-text whitespace-pre-wrap break-all leading-[1.55] max-h-[180px] overflow-y-auto bg-qc-surface-2 border border-qc-border rounded-qc-sm px-2.5 py-2 mt-1 qc-scrollbar">
        {text}
      </pre>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  req: NetworkRequest
  onClose: () => void
}

export function DetailView({ req, onClose }: Props) {
  const [tab, setTab]             = useState<DetailTab>('response')
  const [copiedJson, setCopiedJson] = useState(false)
  const [copiedHar, setCopiedHar]   = useState(false)

  function copyReport() {
    navigator.clipboard.writeText(reportToJson([req])).then(() => {
      setCopiedJson(true)
      setTimeout(() => setCopiedJson(false), 1500)
    })
  }

  function copyHar() {
    navigator.clipboard.writeText(harToJson([req])).then(() => {
      setCopiedHar(true)
      setTimeout(() => setCopiedHar(false), 1500)
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Back header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-qc-surface border-b border-qc-border shrink-0 min-h-[40px]">
        <button
          className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-qc-sm text-qc-text-muted hover:text-qc-text hover:bg-qc-surface-2 transition-colors duration-[120ms]"
          onClick={onClose}
          title="Back"
        >
          <ChevronLeft size={14} />
        </button>

        <span className={`font-mono text-[11px] font-bold shrink-0 ${methodColor(req.method)}`}>
          {req.method}
        </span>

        <span
          className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-qc-text"
          title={req.url}
        >
          {shortUrl(req.url)}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {req.error ? (
            <span className="font-mono text-[11px] font-semibold text-qc-error">ERR</span>
          ) : req.pending ? (
            <span className="font-mono text-[11px] font-semibold text-qc-text-subtle">…</span>
          ) : (
            <span className={`font-mono text-[11px] font-semibold ${statusColor(req.status)}`}>
              {req.status}
            </span>
          )}
          {req.duration != null && (
            <span className="font-mono text-[11px] text-qc-text-muted">{fmtMs(req.duration)}</span>
          )}

          {/* Copy QC JSON report */}
          <button
            className="inline-flex items-center gap-1 px-[7px] py-[2px] rounded-qc-sm border border-qc-border text-qc-text-muted text-[11px] font-medium hover:text-qc-text hover:bg-qc-surface-2 transition-colors duration-[120ms]"
            onClick={copyReport}
            title="Copy as QC JSON report (full metadata for developer handoff)"
          >
            {copiedJson ? <Check size={11} /> : <FileJson size={11} />}
            {copiedJson ? 'Copied!' : 'JSON'}
          </button>

          {/* Copy as HAR (importable by Postman / Insomnia / DevTools) */}
          <button
            className="inline-flex items-center gap-1 px-[7px] py-[2px] rounded-qc-sm border border-qc-border text-qc-text-muted text-[11px] font-medium hover:text-qc-text hover:bg-qc-surface-2 transition-colors duration-[120ms]"
            onClick={copyHar}
            title="Copy as HAR — import directly into Postman, Insomnia, or Chrome DevTools"
          >
            {copiedHar ? <Check size={11} /> : <FileCode2 size={11} />}
            {copiedHar ? 'Copied!' : 'HAR'}
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex px-2 bg-qc-surface border-b border-qc-border shrink-0">
        {(['request', 'response', 'curl'] as DetailTab[]).map((t) => (
          <button
            key={t}
            className={`px-5 py-2.5 text-[12px] font-medium border-b-2 transition-colors duration-[120ms] ${
              tab === t
                ? 'text-qc-accent border-qc-accent'
                : 'text-qc-text-muted border-transparent hover:text-qc-text'
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'curl' ? 'cURL' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2 qc-scrollbar">

        {tab === 'request' && (
          <>
            <div className="px-3 pb-2.5 border-b border-qc-border">
              <h4 className="text-[10.5px] font-semibold text-qc-text-muted uppercase tracking-[0.06em] py-1.5">
                Request Headers
              </h4>
              <HeadersTable headers={req.requestHeaders} />
            </div>
            {req.requestBody && <BodyBlock title="Body" text={req.requestBody} />}
          </>
        )}

        {tab === 'response' && (
          req.error ? (
            <p className="px-3 py-3 text-[12px] text-qc-error font-mono">{req.error}</p>
          ) : req.pending ? (
            <p className="px-3 py-4 text-[12px] text-qc-text-subtle italic">Request in progress…</p>
          ) : (
            <>
              <div className="px-3 pb-2.5 border-b border-qc-border">
                <h4 className="text-[10.5px] font-semibold text-qc-text-muted uppercase tracking-[0.06em] py-1.5">
                  Response Headers
                </h4>
                <HeadersTable headers={req.responseHeaders} />
              </div>
              {req.responseBody && <BodyBlock title="Body" text={req.responseBody} />}
            </>
          )
        )}

        {tab === 'curl' && (
          <BodyBlock title="cURL Command" text={toCurl(req)} />
        )}
      </div>
    </div>
  )
}
