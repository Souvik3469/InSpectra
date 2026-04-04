import React, { useState } from 'react'
import type { TreeNode } from '../../shared/types'

// One Dark-aligned palette
const C = {
  prim:    '#79c0ff', // numbers, booleans — blue
  special: '#c678dd', // null, undefined — purple
  fn:      '#61afef', // functions — light blue
  str:     '#98c379', // strings — green
  key:     '#e5c07b', // object keys — yellow
  idx:     '#8b949e', // array indices — muted
  bracket: '#abb2bf', // [] {} — gray
  arrow:   '#636e7b', // ▶ ▼
  dim:     '#636e7b', // ellipsis, truncated
  text:    '#e6edf3', // plain text (root strings)
}

function primColor(v: string): string {
  if (v === 'null' || v === 'undefined') return C.special
  if (v === 'true' || v === 'false') return C.prim
  if (v.startsWith('f ')) return C.fn
  if (/^-?\d|^\d/.test(v) || v.endsWith('n')) return C.prim
  return C.dim
}

interface NodeProps { node: TreeNode; depth: number; rootStr?: boolean }

function Node({ node, depth, rootStr = false }: NodeProps) {
  const autoOpen = depth === 0 && (node.k === 'arr' || node.k === 'obj')
  const [open, setOpen] = useState(autoOpen)

  if (node.k === 'prim') return <span style={{ color: primColor(node.v) }}>{node.v}</span>
  if (node.k === 'str')  return rootStr
    ? <span style={{ color: C.text }}>{node.v}</span>
    : <span style={{ color: C.str }}>{node.q}</span>
  if (node.k === 'cut')  return <span style={{ color: C.dim }}>[…]</span>
  if (node.k === 'err')  return <span style={{ color: '#f85149' }}>{node.msg}</span>

  // arr or obj
  const empty = node.k === 'arr'
    ? node.items.length === 0 && node.extra === 0
    : node.entries.length === 0 && node.extra === 0
  const ob = node.k === 'arr' ? '[' : '{'
  const cb = node.k === 'arr' ? ']' : '}'

  if (empty) return <span style={{ color: C.bracket }}>{ob}{cb}</span>

  if (!open) {
    return (
      <span onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ color: C.arrow, fontSize: 9, marginRight: 3 }}>▶</span>
        <span style={{ color: C.bracket }}>{node.preview}</span>
      </span>
    )
  }

  const rows = node.k === 'arr'
    ? node.items.map((item, i) => (
        <div key={i} style={{ paddingLeft: 14 }}>
          <span style={{ color: C.idx }}>{i}: </span>
          <Node node={item} depth={depth + 1} />
        </div>
      ))
    : node.entries.map(([key, val]) => (
        <div key={key} style={{ paddingLeft: 14 }}>
          <span style={{ color: C.key }}>{key}</span>
          <span style={{ color: C.bracket }}>: </span>
          <Node node={val} depth={depth + 1} />
        </div>
      ))

  return (
    <span>
      <span onClick={(e) => { e.stopPropagation(); setOpen(false) }}
        style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ color: C.arrow, fontSize: 9, marginRight: 3 }}>▼</span>
      </span>
      <span style={{ color: C.bracket }}>{ob}</span>
      <div>
        {rows}
        {node.extra > 0 && <div style={{ paddingLeft: 14, color: C.dim }}>… {node.extra} more</div>}
      </div>
      <span style={{ color: C.bracket }}>{cb}</span>
    </span>
  )
}

/** Renders an array of TreeNodes (one console.log argument per node). */
export function ObjectTree({ nodes }: { nodes: TreeNode[] }) {
  const single = nodes.length === 1
  return (
    <>
      {nodes.map((node, i) => (
        <React.Fragment key={i}>
          {i > 0 && ' '}
          <Node node={node} depth={0} rootStr={single && node.k === 'str'} />
        </React.Fragment>
      ))}
    </>
  )
}
