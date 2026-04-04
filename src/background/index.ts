import { MSG_TOGGLE, MSG_EXECUTE, MSG_RESULT } from '../shared/constants'

// ── Toolbar icon click → toggle panel ────────────────────────────────────────
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return
  chrome.tabs.sendMessage(tab.id, { type: MSG_TOGGLE }).catch(() => {})
})

// ── Content script execution requests ────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== MSG_EXECUTE) return

  const tabId = sender.tab?.id
  if (!tabId) {
    sendResponse({ error: 'No tab ID — cannot inject script' })
    return true
  }

  chrome.scripting
    .executeScript({
      target: { tabId },
      world: 'MAIN',
      func: pageExecutor,
      args: [msg.code as string, msg.executionId as string, MSG_RESULT],
    })
    .then(() => sendResponse({}))
    .catch((err: Error) => {
      sendResponse({ error: `Cannot script this page: ${err.message}` })
    })

  return true
})

// ── pageExecutor (injected into page via chrome.scripting) ───────────────────
// Must be self-contained — no imports, no closure references.
function pageExecutor(code: string, execId: string, msgType: string): void {
  var captured: Array<{ type: string; values: string[] }> = []

  function serialize(v: unknown, depth: number): string {
    depth = depth || 0
    if (depth > 3) return '[...]'
    if (v === null) return 'null'
    if (v === undefined) return 'undefined'
    if (typeof v === 'function') return 'f ' + ((v as Function).name || 'anonymous') + '()'
    if (typeof v === 'symbol') return (v as symbol).toString()
    if (typeof v === 'bigint') return String(v) + 'n'
    if (typeof v === 'string') return depth === 0 ? v : JSON.stringify(v)
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    if (v instanceof Error) return v.name + ': ' + v.message
    if (v instanceof RegExp) return v.toString()
    if (v instanceof Date) return v.toISOString()
    if (Array.isArray(v)) {
      if (!v.length) return '[]'
      var items = v.slice(0, 20).map(function (x: unknown) { return serialize(x, depth + 1) })
      return '[' + items.join(', ') + (v.length > 20 ? ', ... ' + (v.length - 20) + ' more' : '') + ']'
    }
    if (typeof v === 'object') {
      try {
        var keys = Object.keys(v as object).slice(0, 20)
        if (!keys.length) return '{}'
        var pairs = keys.map(function (k: string) {
          return k + ': ' + serialize((v as Record<string, unknown>)[k], depth + 1)
        })
        return '{' + pairs.join(', ') + (Object.keys(v as object).length > 20 ? ', ...' : '') + '}'
      } catch (_) { return '[Object]' }
    }
    return String(v)
  }

  function makeCapture(type: string) {
    return function (...args: unknown[]) {
      captured.push({ type: type, values: args.map(function (a) { return serialize(a, 0) }) });
      (orig as Record<string, Function>)[type].apply(console, args)
    }
  }

  var orig = {
    log:   console.log.bind(console),
    warn:  console.warn.bind(console),
    error: console.error.bind(console),
    info:  console.info.bind(console),
  }
  console.log   = makeCapture('log') as typeof console.log
  console.warn  = makeCapture('warn') as typeof console.warn
  console.error = makeCapture('error') as typeof console.error
  console.info  = makeCapture('info') as typeof console.info

  // ── REPL: transform let/const → var so top-level declarations persist on window ──
  // Simple regex — best-effort, works for ~95% of real REPL usage.
  var replCode = code.replace(/\b(let|const)\b/g, 'var')

  // Snapshot window keys *before* any execution to detect newly declared vars.
  // Include already-tracked REPL vars so they are not double-counted.
  var _w = window as unknown as Record<string, unknown>
  var _existing: string[] = (_w.__qcReplVars as string[] | undefined) || []
  var _before = new Set(Object.keys(window).concat(_existing))

  var needsAsync = /\bawait\b/.test(replCode)
  var evalCode: string

  if (needsAsync) {
    // var inside an async IIFE is function-scoped → won't persist on window.
    // Fix: extract simple `var name` declarations, pre-declare them globally,
    // then strip `var` inside the IIFE so assignments target the global names.
    // Limitation: comma-separated and destructured declarations are not lifted.
    var lifted: string[] = []
    var liftRe = /\bvar\s+([\w$]+)/g
    var lm: RegExpExecArray | null
    while ((lm = liftRe.exec(replCode)) !== null) lifted.push(lm[1])

    var preDecls = lifted.length
      ? lifted.map(function (n) { return 'var ' + n }).join('; ') + ';\n'
      : ''
    var innerCode = replCode.replace(/\bvar\s+([\w$]+)\b/g, '$1')
    evalCode = preDecls + '(async function(){\n' + innerCode + '\n})()'
  } else {
    evalCode = replCode
  }

  // Unified finish — called by both sync and async paths.
  // Console must be restored here (not in a finally block) so that
  // async console.log calls during Promise execution are still captured.
  function finish(rv: string | undefined, err: { message: string; stack?: string } | undefined) {
    console.log   = orig.log
    console.warn  = orig.warn
    console.error = orig.error
    console.info  = orig.info

    // Detect vars added to window during this execution and accumulate them.
    var _newVars = Object.keys(window).filter(function (k) {
      return !_before.has(k) && k !== '__qcReplVars' && k.indexOf('__qc') !== 0
    })
    var _tracked: string[] = (_w.__qcReplVars as string[] | undefined) || []
    if (_newVars.length) {
      _w.__qcReplVars = _tracked.concat(
        _newVars.filter(function (k) { return _tracked.indexOf(k) === -1 })
      )
    }

    window.postMessage(
      {
        type: msgType, id: execId,
        result: {
          outputs: captured, returnValue: rv, error: err,
          replVars: (_w.__qcReplVars as string[] | undefined) || [],
        },
      },
      '*'
    )
  }

  try {
    var result = (0, eval)(evalCode)  // indirect eval → global scope

    // If the result is a Promise (async IIFE, or code that returns fetch/Promise directly)
    // stay alive until it settles — console capture remains active throughout.
    if (result !== null && result !== undefined && typeof (result as any).then === 'function') {
      ;(result as Promise<unknown>)
        .then(function (val: unknown) { finish(serialize(val, 0), undefined) })
        .catch(function (e: unknown) {
          var ex = e as Error
          finish(undefined, { message: ex.message, stack: ex.stack })
        })
      return  // postMessage will be sent from the Promise callbacks above
    }

    finish(serialize(result, 0), undefined)
  } catch (e: unknown) {
    var ex = e as Error
    finish(undefined, { message: ex.message, stack: ex.stack })
  }
}
