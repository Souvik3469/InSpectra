import type { ConsoleOutput, TreeNode } from '../../shared/types'
import { ObjectTree } from './ObjectTree'

const TYPE_PREFIX: Record<ConsoleOutput['type'], string> = {
  log:          '',
  warn:         '⚠',
  error:        '✖',
  info:         'ℹ',
  return:       '←',
  'eval-error': '✖',
}

// Full Tailwind class strings — must be complete so JIT includes them all
const TYPE_STYLES: Record<ConsoleOutput['type'], string> = {
  log:          'text-qc-text',
  warn:         'text-qc-warn bg-[rgba(210,153,34,0.06)] border-b border-[rgba(210,153,34,0.12)]',
  error:        'text-qc-error bg-[rgba(248,81,73,0.06)] border-b border-[rgba(248,81,73,0.12)]',
  info:         'text-qc-info',
  return:       'text-qc-return bg-[rgba(210,168,255,0.05)]',
  'eval-error': 'text-qc-error bg-[rgba(248,81,73,0.06)] border-b border-[rgba(248,81,73,0.12)]',
}

interface Props {
  output: ConsoleOutput
}

export default function OutputLine({ output }: Props) {
  const prefix     = TYPE_PREFIX[output.type]
  const isEvalError = output.type === 'eval-error'

  return (
    <div
      className={`flex items-start gap-1.5 px-3 py-[2px] border-b border-transparent hover:bg-white/[0.025] leading-relaxed break-all ${TYPE_STYLES[output.type]}`}
    >
      {prefix && <span className="shrink-0 opacity-75">{prefix}</span>}

      <div className="flex-1 whitespace-pre-wrap min-w-0">
        {output.tree && !isEvalError
          ? <ObjectTree nodes={output.tree as TreeNode[]} />
          : output.values.map((v, i) => (
              <span
                key={i}
                className={isEvalError && i === 1 ? 'block text-[11px] text-qc-text-muted mt-[3px] opacity-70' : ''}
              >
                {i > 0 && !isEvalError && ' '}
                {v}
              </span>
            ))
        }
      </div>
    </div>
  )
}
