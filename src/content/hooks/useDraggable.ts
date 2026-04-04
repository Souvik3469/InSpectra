import { useRef, useCallback, useEffect } from 'react'
import type React from 'react'
import type { Position } from '../../shared/types'

interface UseDraggableOptions {
  position: Position
  onPositionChange: (pos: Position) => void
  panelWidth: number
}

/**
 * Provides drag-to-reposition behaviour for a fixed/absolute-positioned panel.
 *
 * Returns a `startDrag` handler to attach to the drag handle's `onMouseDown`.
 * Registers global mousemove/mouseup listeners to track the drag across the
 * entire viewport, then removes them on drop.
 */
export function useDraggable({ position, onPositionChange, panelWidth }: UseDraggableOptions) {
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return
      const x = Math.max(0, Math.min(window.innerWidth - panelWidth, e.clientX - dragOffset.current.x))
      const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y))
      onPositionChange({ x, y })
    },
    [onPositionChange, panelWidth],
  )

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true
      dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }
      document.body.style.userSelect = 'none'
    },
    [position],
  )

  return { startDrag }
}
