import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface Props {
  text: string
}

/** Clipboard copy button with brief "Copied!" feedback. */
export function CopyBtn({ text }: Props) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      className="inline-flex items-center gap-1 px-[7px] py-[2px] rounded-insp-sm border border-insp-border text-insp-text-muted text-[11px] font-medium hover:text-insp-text hover:bg-insp-surface-2 transition-colors duration-[120ms]"
      onClick={() =>
        navigator.clipboard.writeText(text)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
          .catch(() => { /* clipboard access denied — no-op */ })
      }
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
