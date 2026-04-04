export type TabId = 'console' | 'snippets' | 'network'

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/**
 * A JSON-serializable tree node used for interactive object inspection.
 * Passed from pageExecutor → content script via window.postMessage.
 */
export type TreeNode =
  | { k: 'prim'; v: string }
  | { k: 'str';  v: string; q: string }                                   // v = raw, q = JSON.stringify'd
  | { k: 'arr';  preview: string; items: TreeNode[];  extra: number }
  | { k: 'obj';  preview: string; entries: [string, TreeNode][]; extra: number }
  | { k: 'err';  msg: string; stack?: string }
  | { k: 'cut' }                                                           // depth/circular limit

export interface Snippet {
  id: string
  name: string
  code: string
  description?: string
  createdAt: number
  updatedAt: number
}

export interface ConsoleOutput {
  id: string
  /** log/warn/error/info = captured console calls; return = eval return value; eval-error = thrown error */
  type: 'log' | 'warn' | 'error' | 'info' | 'return' | 'eval-error'
  values: string[]
  tree?: TreeNode[]
  timestamp: number
}

export interface NetworkRequest {
  id: string
  method: string
  url: string
  status?: number
  statusText?: string
  requestHeaders: Record<string, string>
  requestBody?: string
  responseHeaders?: Record<string, string>
  responseBody?: string
  duration?: number
  timestamp: number
  pending: boolean
  error?: string
  initiator?: string
}

export interface ExecutionResult {
  outputs: Array<{ type: ConsoleOutput['type']; values: string[]; tree?: TreeNode[] }>
  returnValue?: string
  returnTree?: TreeNode
  error?: { message: string; stack?: string }
  /** Names of variables currently live in the REPL scope (window.__qcReplVars) */
  replVars?: string[]
}
