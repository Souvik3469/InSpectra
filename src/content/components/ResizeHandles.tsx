import type React from 'react'
import type { ResizeHandle } from '../hooks/useResizable'

interface Props {
  startResize: (h: ResizeHandle) => (e: React.MouseEvent) => void
}

/** Invisible hit-area divs for right-edge, bottom-edge, and corner resize. */
export function ResizeHandles({ startResize }: Props) {
  return (
    <>
      <div
        onMouseDown={startResize('e')}
        style={{ position: 'absolute', top: 0, right: 0, width: 5, height: '100%', cursor: 'ew-resize' }}
      />
      <div
        onMouseDown={startResize('s')}
        style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 5, cursor: 'ns-resize' }}
      />
      <div
        onMouseDown={startResize('se')}
        style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, cursor: 'nwse-resize' }}
      />
    </>
  )
}
