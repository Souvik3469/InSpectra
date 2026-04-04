import React, { useRef, useEffect, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { Play, Trash2, Save, RotateCcw } from 'lucide-react'
import { usePanelStore } from '../store'
import { useCodeExecution } from '../hooks/useCodeExecution'
import { uid } from '../utils/uid'
import OutputLine from './OutputLine'

export default function ConsoleTab() {
  const { outputs, clearOutputs, addSnippet, editorCode, setEditorCode, replVarCount } = usePanelStore()
  const { run, isExecuting, clearRepl } = useCodeExecution()
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll output to bottom on new entries
  useEffect(() => {
    const el = outputRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [outputs])

  const saveSnippet = useCallback(() => {
    if (!editorCode.trim()) return
    const name = window.prompt('Name your snippet:')?.trim()
    if (!name) return
    addSnippet({ id: uid(), name, code: editorCode, createdAt: Date.now(), updatedAt: Date.now() })
  }, [editorCode, addSnippet])

  // Ctrl/Cmd+Enter to run
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        run()
      }
    },
    [run],
  )

  return (
    <div className="flex flex-col h-full overflow-hidden" onKeyDown={handleKeyDown}>

      {/* Editor */}
      <div className="qc-editor shrink-0 border-b border-qc-border">
        <CodeMirror
          value={editorCode}
          onChange={setEditorCode}
          extensions={[javascript({ jsx: true, typescript: true })]}
          theme={oneDark}
          height="200px"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: false,
            crosshairCursor: false,
            highlightSelectionMatches: false,
          }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-qc-surface border-b border-qc-border shrink-0">
        <button
          className="inline-flex items-center gap-[5px] px-3 py-[5px] bg-qc-accent text-qc-bg rounded-qc-sm text-[12px] font-semibold border border-qc-accent hover:bg-qc-accent-hover hover:border-qc-accent-hover disabled:opacity-55 disabled:cursor-not-allowed transition-colors duration-[120ms]"
          onClick={run}
          disabled={isExecuting}
          title="Run (Ctrl+Enter)"
        >
          <Play size={12} />
          {isExecuting ? 'Running…' : 'Run'}
        </button>

        <button
          className="inline-flex items-center gap-[5px] px-3 py-[5px] bg-qc-surface-2 border border-qc-border rounded-qc-sm text-qc-text text-[12px] font-medium hover:bg-[#2d333b] hover:border-qc-border-light transition-colors duration-[120ms]"
          onClick={saveSnippet}
          title="Save current code as a snippet"
        >
          <Save size={12} />
          Save
        </button>

        <span className="flex-1" />

        {replVarCount > 0 && (
          <button
            className="inline-flex items-center gap-1 px-2 py-[3px] rounded-qc-sm text-[11px] text-qc-text-subtle border border-qc-border hover:text-qc-text hover:border-qc-border-light transition-colors duration-[120ms]"
            onClick={clearRepl}
            title="Clear REPL state — delete all persisted variables"
          >
            <RotateCcw size={10} />
            {replVarCount} var{replVarCount !== 1 ? 's' : ''}
          </button>
        )}

        <button
          className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-qc-sm text-qc-text-muted hover:text-qc-text hover:bg-qc-surface-2 transition-colors duration-[120ms]"
          onClick={clearOutputs}
          title="Clear output"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Output */}
      <div ref={outputRef} className="flex-1 overflow-y-auto min-h-0 py-1 font-mono text-[12px] qc-scrollbar">
        {outputs.length === 0 ? (
          <div className="px-3.5 py-6 text-qc-text-subtle italic text-[12px]">
            Run some code to see output here
          </div>
        ) : (
          outputs.map((output) => <OutputLine key={output.id} output={output} />)
        )}
      </div>
    </div>
  )
}
