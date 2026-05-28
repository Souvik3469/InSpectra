import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Braces, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { CopyBtn } from '../ui/CopyBtn'

interface Props {
  title: string
  text: string
}

/**
 * Displays a text body (request/response/cURL) with optional JSON pretty-print
 * and an in-place search bar (Cmd/Ctrl+F to open, Escape to close).
 */
export function BodyBlock({ title, text }: Props) {
  const [isPretty,    setIsPretty]    = useState(false)
  const [showSearch,  setShowSearch]  = useState(false)
  const [query,       setQuery]       = useState('')
  const [matchIdx,    setMatchIdx]    = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const markRefs  = useRef<(HTMLElement | null)[]>([])

  const isJson = useMemo(() => {
    try { JSON.parse(text); return true } catch { return false }
  }, [text])

  const displayText = isPretty && isJson
    ? JSON.stringify(JSON.parse(text), null, 2)
    : text

  const matches = useMemo(() => {
    if (!query) return [] as number[]
    const lower = displayText.toLowerCase()
    const q     = query.toLowerCase()
    const result: number[] = []
    let idx = 0
    while ((idx = lower.indexOf(q, idx)) !== -1) { result.push(idx); idx += q.length }
    return result
  }, [displayText, query])

  // Cmd/Ctrl+F opens search; Escape closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        const active = document.activeElement
        if (active && !active.closest('#inspectra-root')) return
        e.preventDefault()
        setShowSearch(true)
        setTimeout(() => searchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape' && showSearch) { setShowSearch(false); setQuery('') }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showSearch])

  // Scroll active match into view
  useEffect(() => {
    markRefs.current[matchIdx]?.scrollIntoView({ block: 'nearest' })
  }, [matchIdx, matches.length])

  function openSearch() {
    setShowSearch(true)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function renderHighlighted(): React.ReactNode {
    if (!query || !matches.length) return displayText
    const parts: React.ReactNode[] = []
    let last = 0
    markRefs.current = []
    matches.forEach((pos, i) => {
      if (pos > last) parts.push(displayText.slice(last, pos))
      parts.push(
        <mark
          key={i}
          ref={(el) => { markRefs.current[i] = el }}
          className={i === matchIdx
            ? 'bg-insp-accent text-insp-bg rounded-[2px] not-italic'
            : 'bg-[rgba(88,166,255,0.28)] text-insp-text rounded-[2px] not-italic'}
        >
          {displayText.slice(pos, pos + query.length)}
        </mark>,
      )
      last = pos + query.length
    })
    if (last < displayText.length) parts.push(displayText.slice(last))
    return parts
  }

  return (
    <div className="px-3 pb-2.5">
      {/* Title row */}
      <div className="flex items-center justify-between py-1.5">
        <h4 className="text-[10.5px] font-semibold text-insp-text-muted uppercase tracking-[0.06em]">
          {title}
        </h4>
        <div className="flex items-center gap-1">
          {isJson && (
            <button
              className={`inline-flex items-center gap-[5px] px-[7px] py-[2px] rounded-insp-sm border text-[11px] font-medium transition-colors duration-[120ms] ${
                isPretty
                  ? 'border-insp-accent text-insp-accent bg-[rgba(88,166,255,0.08)]'
                  : 'border-insp-border text-insp-text-muted hover:text-insp-text hover:bg-insp-surface-2'
              }`}
              onClick={() => setIsPretty((p) => !p)}
              title="Pretty-print JSON"
            >
              <Braces size={10} />
              Pretty
            </button>
          )}
          <button
            className={`inline-flex items-center gap-[5px] px-[7px] py-[2px] rounded-insp-sm border text-[11px] font-medium transition-colors duration-[120ms] ${
              showSearch
                ? 'border-insp-accent text-insp-accent bg-[rgba(88,166,255,0.08)]'
                : 'border-insp-border text-insp-text-muted hover:text-insp-text hover:bg-insp-surface-2'
            }`}
            onClick={() => showSearch ? (setShowSearch(false), setQuery('')) : openSearch()}
            title="Find in body (Cmd/Ctrl+F)"
          >
            <Search size={10} />
          </button>
          <CopyBtn text={displayText} />
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-1 mb-2">
          <div className="relative flex-1">
            <input
              ref={searchRef}
              className="w-full px-2 py-[3px] pr-[52px] bg-insp-surface-2 border border-insp-border rounded-insp-sm text-insp-text text-[11.5px] focus:border-insp-accent transition-colors duration-[120ms] placeholder:text-insp-text-subtle"
              placeholder="Find…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setMatchIdx(0) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  setMatchIdx((i) => matches.length ? (i + 1) % matches.length : 0)
                }
                if (e.key === 'Escape') { setShowSearch(false); setQuery('') }
              }}
            />
            {query && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-insp-text-subtle font-mono pointer-events-none">
                {matches.length ? `${matchIdx + 1}/${matches.length}` : '0/0'}
              </span>
            )}
          </div>
          {matches.length > 1 && (
            <>
              <button
                className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-insp-sm text-insp-text-muted hover:text-insp-text hover:bg-insp-surface-2 transition-colors duration-[120ms]"
                onClick={() => setMatchIdx((i) => (i - 1 + matches.length) % matches.length)}
                title="Previous (Shift+Enter)"
              >
                <ChevronUp size={11} />
              </button>
              <button
                className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-insp-sm text-insp-text-muted hover:text-insp-text hover:bg-insp-surface-2 transition-colors duration-[120ms]"
                onClick={() => setMatchIdx((i) => (i + 1) % matches.length)}
                title="Next (Enter)"
              >
                <ChevronDown size={11} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Body text */}
      <pre className="font-mono text-[11px] text-insp-text whitespace-pre-wrap break-all leading-[1.55] max-h-[200px] overflow-y-auto bg-insp-surface-2 border border-insp-border rounded-insp-sm px-2.5 py-2 insp-scrollbar">
        {renderHighlighted()}
      </pre>
    </div>
  )
}
