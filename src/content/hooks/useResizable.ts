import { useRef, useCallback, useEffect } from 'react'

export type ResizeHandle = 'e' | 's' | 'se'

interface Size { width: number; height: number }
interface Position { x: number; y: number }

interface UseResizableOptions {
  size: Size
  position: Position
  onSizeChange: (size: Size) => void
  minWidth?: number
  minHeight?: number
}

const MIN_W = 320
const MIN_H = 260

export function useResizable({
  size,
  position,
  onSizeChange,
  minWidth = MIN_W,
  minHeight = MIN_H,
}: UseResizableOptions) {
  const isResizing = useRef(false)
  const handle = useRef<ResizeHandle>('se')
  const startState = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 })

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing.current) return
      const { mouseX, mouseY, width, height } = startState.current
      const dx = e.clientX - mouseX
      const dy = e.clientY - mouseY

      let newWidth = width
      let newHeight = height

      if (handle.current === 'e' || handle.current === 'se') {
        newWidth = Math.max(minWidth, Math.min(width + dx, window.innerWidth - position.x))
      }
      if (handle.current === 's' || handle.current === 'se') {
        newHeight = Math.max(minHeight, Math.min(height + dy, window.innerHeight - position.y))
      }

      onSizeChange({ width: newWidth, height: newHeight })
    },
    [onSizeChange, position, minWidth, minHeight],
  )

  const handleMouseUp = useCallback(() => {
    if (!isResizing.current) return
    isResizing.current = false
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const startResize = useCallback(
    (h: ResizeHandle) => (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      isResizing.current = true
      handle.current = h
      startState.current = { mouseX: e.clientX, mouseY: e.clientY, width: size.width, height: size.height }
      document.body.style.userSelect = 'none'
      document.body.style.cursor = h === 'e' ? 'ew-resize' : h === 's' ? 'ns-resize' : 'nwse-resize'
    },
    [size],
  )

  return { startResize }
}
