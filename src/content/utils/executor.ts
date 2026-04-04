/**
 * Executes arbitrary JavaScript in the real page context.
 *
 * Previous approach (script-tag injection) was blocked by pages with a strict
 * Content Security Policy (CSP) — e.g. any local dev server or hardened web app.
 *
 * Current approach: ask the background service worker to call
 * chrome.scripting.executeScript(), which Chrome injects at the engine level and
 * is NOT subject to the page's CSP. The injected function posts results back via
 * window.postMessage, which the content script receives normally.
 */

import type { ExecutionResult } from '../../shared/types'
import { MSG_EXECUTE, MSG_RESULT, EXEC_PREFIX, EXECUTION_TIMEOUT_MS } from '../../shared/constants'

let counter = 0

/** Deletes all variables tracked in window.__qcReplVars, resetting REPL state. */
export function clearReplState(): Promise<ExecutionResult> {
  const clearScript = [
    ';(function(){',
    '  var vars = window.__qcReplVars || []',
    '  vars.forEach(function(k){ try { delete window[k] } catch(e){} })',
    '  window.__qcReplVars = []',
    '})()',
  ].join('\n')
  return executeCode(clearScript)
}

export function executeCode(code: string): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const id = `${EXEC_PREFIX}${Date.now()}_${counter++}`

    const timeout = setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new Error('Execution timed out after 10 seconds'))
    }, EXECUTION_TIMEOUT_MS)

    // Listen for the result posted back from the injected page-context function
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== MSG_RESULT || event.data.id !== id) return
      clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
      resolve(event.data.result as ExecutionResult)
    }
    window.addEventListener('message', onMessage)

    // Ask background to inject the executor via chrome.scripting (CSP-bypassing)
    chrome.runtime.sendMessage(
      { type: MSG_EXECUTE, code, executionId: id },
      (response: { error?: string } | undefined) => {
        if (chrome.runtime.lastError) return // background will handle via timeout
        if (response?.error) {
          clearTimeout(timeout)
          window.removeEventListener('message', onMessage)
          reject(new Error(response.error))
        }
      }
    )
  })
}
