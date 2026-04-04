/** Shared formatting utilities for network request display. */

export function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':    return 'text-qc-accent'
    case 'POST':   return 'text-qc-success'
    case 'PUT':    return 'text-qc-warn'
    case 'DELETE': return 'text-qc-error'
    case 'PATCH':  return 'text-qc-return'
    default:       return 'text-qc-text-muted'
  }
}

export function statusColor(status?: number): string {
  if (!status) return ''
  if (status < 300) return 'text-qc-success'
  if (status < 400) return 'text-qc-info'
  if (status < 500) return 'text-qc-warn'
  return 'text-qc-error'
}

export function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + (u.search || '')
  } catch {
    return url
  }
}

export function fmtMs(ms?: number): string {
  if (ms == null) return ''
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}
