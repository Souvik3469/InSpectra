interface Props {
  headers?: Record<string, string>
}

/** Two-column key/value table for HTTP request or response headers. */
export function HeadersTable({ headers }: Props) {
  const entries = Object.entries(headers ?? {})

  if (!entries.length) {
    return <p className="px-3 py-3 text-[12px] text-qc-text-subtle italic">No headers</p>
  }

  return (
    <div className="flex flex-col gap-px">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2 py-[2px] text-[11px] font-mono leading-relaxed">
          <span className="shrink-0 w-[140px] text-qc-text-muted overflow-hidden text-ellipsis whitespace-nowrap">
            {k}
          </span>
          <span className="flex-1 text-qc-text break-all">{v}</span>
        </div>
      ))}
    </div>
  )
}
