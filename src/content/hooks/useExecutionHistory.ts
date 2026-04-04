import { useRef, useCallback, useMemo } from 'react'
import { keymap } from '@codemirror/view'
import { usePanelStore } from '../store'

/**
 * Provides terminal-style execution history navigation for the console editor.
 *
 * - ArrowUp on the first line → load previous command
 * - ArrowDown on the last line → load next command (or restore draft)
 * - Any manual edit while navigating resets back to the draft
 */
export function useExecutionHistory() {
  const execHistory   = usePanelStore((s) => s.execHistory)
  const setEditorCode = usePanelStore((s) => s.setEditorCode)
  const editorCodeRef = useRef(usePanelStore.getState().editorCode)

  // Keep editorCodeRef in sync without causing re-renders
  usePanelStore.subscribe((s) => { editorCodeRef.current = s.editorCode })

  // -1 = not navigating (showing draft); 0 = most recent; N = N-th most recent
  const indexRef          = useRef(-1)
  const draftRef          = useRef('')
  const skipNextChangeRef = useRef(false)

  const navigate = useCallback(
    (dir: 1 | -1): boolean => {
      const history = usePanelStore.getState().execHistory
      if (history.length === 0) return false

      const newIndex = indexRef.current + dir
      if (newIndex < -1 || newIndex >= history.length) return false

      // Save draft when we first leave it
      if (indexRef.current === -1) draftRef.current = editorCodeRef.current

      indexRef.current = newIndex
      skipNextChangeRef.current = true
      setEditorCode(newIndex === -1 ? draftRef.current : history[newIndex])
      return true
    },
    [setEditorCode],
  )

  // Called by CodeMirror's onChange — resets navigation index on manual edits
  const handleChange = useCallback(
    (value: string) => {
      if (skipNextChangeRef.current) {
        skipNextChangeRef.current = false
        return
      }
      indexRef.current = -1
      setEditorCode(value)
    },
    [setEditorCode],
  )

  // Reset index whenever the user runs code (so next Up starts from latest)
  const resetIndex = useCallback(() => { indexRef.current = -1 }, [])

  const historyExtension = useMemo(
    () =>
      keymap.of([
        {
          key: 'ArrowUp',
          run: (view) => {
            const line = view.state.doc.lineAt(view.state.selection.main.head).number
            if (line !== 1) return false
            return navigate(1)
          },
        },
        {
          key: 'ArrowDown',
          run: (view) => {
            const line = view.state.doc.lineAt(view.state.selection.main.head).number
            if (line !== view.state.doc.lines) return false
            return navigate(-1)
          },
        },
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // extension is stable; navigate reads store directly via getState()
  )

  return { historyExtension, handleChange, resetIndex, historyLength: execHistory.length }
}
