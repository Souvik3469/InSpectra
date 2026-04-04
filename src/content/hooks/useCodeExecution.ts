import { useCallback } from 'react'
import { usePanelStore } from '../store'
import { executeCode, clearReplState } from '../utils/executor'
import { uid } from '../utils/uid'
import type { ConsoleOutput } from '../../shared/types'

/**
 * Encapsulates JS code execution and result routing.
 *
 * Reads `editorCode` from the store, sends it to the background
 * service worker, then fans out the captured console outputs and
 * return value / error into the store's output list.
 */
export function useCodeExecution() {
  const editorCode      = usePanelStore((s) => s.editorCode)
  const isExecuting     = usePanelStore((s) => s.isExecuting)
  const setExecuting    = usePanelStore((s) => s.setExecuting)
  const addOutput       = usePanelStore((s) => s.addOutput)
  const setReplVarCount = usePanelStore((s) => s.setReplVarCount)
  const addToHistory    = usePanelStore((s) => s.addToHistory)

  const applyResult = useCallback(
    (result: Awaited<ReturnType<typeof executeCode>>) => {
      for (const entry of result.outputs) {
        addOutput({ id: uid(), type: entry.type, values: entry.values, tree: entry.tree, timestamp: Date.now() } as ConsoleOutput)
      }
      if (result.error) {
        addOutput({ id: uid(), type: 'eval-error', values: [result.error.message, result.error.stack ?? ''].filter(Boolean), timestamp: Date.now() })
      } else if (result.returnValue !== undefined && result.returnValue !== 'undefined') {
        addOutput({ id: uid(), type: 'return', values: [result.returnValue], tree: result.returnTree ? [result.returnTree] : undefined, timestamp: Date.now() })
      }
      if (result.replVars !== undefined) setReplVarCount(result.replVars.length)
    },
    [addOutput, setReplVarCount],
  )

  const run = useCallback(async (onRun?: () => void) => {
    if (isExecuting || !editorCode.trim()) return
    addToHistory(editorCode)
    onRun?.()
    setExecuting(true)
    try {
      applyResult(await executeCode(editorCode))
    } catch (err: unknown) {
      addOutput({ id: uid(), type: 'eval-error', values: [err instanceof Error ? err.message : 'Execution failed'], timestamp: Date.now() })
    } finally {
      setExecuting(false)
    }
  }, [editorCode, isExecuting, addOutput, setExecuting, applyResult, addToHistory])

  const clearRepl = useCallback(async () => {
    if (isExecuting) return
    setExecuting(true)
    try {
      applyResult(await clearReplState())
    } catch { /* ignore */ } finally {
      setExecuting(false)
    }
  }, [isExecuting, setExecuting, applyResult])

  return { run, isExecuting, clearRepl }
}
