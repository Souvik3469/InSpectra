/** Shared formatting utilities for network request display. */

export function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':    return 'text-insp-accent'
    case 'POST':   return 'text-insp-success'
    case 'PUT':    return 'text-insp-warn'
    case 'DELETE': return 'text-insp-error'
    case 'PATCH':  return 'text-insp-return'
    default:       return 'text-insp-text-muted'
  }
}

export function statusColor(status?: number): string {
  if (!status) return ''
  if (status < 300) return 'text-insp-success'
  if (status < 400) return 'text-insp-info'
  if (status < 500) return 'text-insp-warn'
  return 'text-insp-error'
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
