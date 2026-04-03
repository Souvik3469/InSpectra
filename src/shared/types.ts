export type TabId = 'console' | 'snippets' | 'network'

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
  outputs: Array<{ type: ConsoleOutput['type']; values: string[] }>
  returnValue?: string
  error?: { message: string; stack?: string }
}
