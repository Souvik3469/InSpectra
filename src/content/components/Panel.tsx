import React from 'react'
import { usePanelStore } from '../store'
import { useDraggable } from '../hooks/useDraggable'
import { useResizable } from '../hooks/useResizable'
import Header from './Header'
import ConsoleTab from './ConsoleTab'
import SnippetsTab from './SnippetsTab'
import NetworkTab from './NetworkTab'
import { ResizeHandles } from './ResizeHandles'

export default function Panel() {
  const { isVisible, isMinimized, position, setPosition, size, setSize, activeTab } = usePanelStore()

  const { startDrag } = useDraggable({
    position,
    onPositionChange: setPosition,
    panelWidth: size.width,
  })

  const { startResize } = useResizable({
    size,
    position,
    onSizeChange: setSize,
  })

  if (!isVisible) return null

  return (
    <div
      className="absolute flex flex-col overflow-hidden"
      style={{
        width:        size.width,
        left:         position.x,
        top:          position.y,
        height:       isMinimized ? 40 : size.height,
        background:   '#0d1117',
        border:       '1px solid #30363d',
        borderRadius: 8,
        boxShadow:    '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)',
        transition:   isMinimized ? 'height 0.18s cubic-bezier(0.4,0,0.2,1)' : undefined,
      }}
    >
      <Header onStartDrag={startDrag} />

      {!isMinimized && (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          {activeTab === 'console'  && <ConsoleTab  />}
          {activeTab === 'snippets' && <SnippetsTab />}
          {activeTab === 'network'  && <NetworkTab  />}
        </div>
      )}

      {!isMinimized && <ResizeHandles startResize={startResize} />}
    </div>
  )
}
