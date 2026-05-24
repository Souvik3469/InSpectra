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
  var captured: Array<{ type: string; values: string[]; tree: unknown[] }> = []

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

  // ── Structured tree serialiser (for interactive object inspector) ─────────
  function shortVal(v: unknown): string {
    if (v === null) return 'null'
    if (v === undefined) return 'undefined'
    if (typeof v === 'string') {
      var s = JSON.stringify(v); return s.length > 16 ? s.slice(0, 15) + '…"' : s
    }
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v)
    if (Array.isArray(v)) return 'Array(' + v.length + ')'
    if (typeof v === 'object') return '{…}'
    return String(v)
  }

  function toTree(v: unknown, depth: number, seen: unknown[]): unknown {
    if (v === null)      return { k: 'prim', v: 'null' }
    if (v === undefined) return { k: 'prim', v: 'undefined' }
    if (typeof v === 'function') return { k: 'prim', v: 'f ' + ((v as Function).name || 'anonymous') + '()' }
    if (typeof v === 'symbol')  return { k: 'prim', v: (v as symbol).toString() }
    if (typeof v === 'bigint')  return { k: 'prim', v: String(v) + 'n' }
    if (typeof v === 'number' || typeof v === 'boolean') return { k: 'prim', v: String(v) }
    if (typeof v === 'string')  return { k: 'str', v: v, q: JSON.stringify(v) }
    if (v instanceof Error) return { k: 'err', msg: v.message, stack: v.stack }
    if (v instanceof RegExp) return { k: 'prim', v: v.toString() }
    if (v instanceof Date)   return { k: 'prim', v: v.toISOString() }

    for (var si = 0; si < seen.length; si++) if (seen[si] === v) return { k: 'cut' }
    if (depth >= 5) return { k: 'cut' }
    seen.push(v)

    var node: unknown
    if (Array.isArray(v)) {
      var CAP = 100
      var its: unknown[] = []
      for (var ai = 0; ai < Math.min(v.length, CAP); ai++) its.push(toTree(v[ai], depth + 1, seen))
      var n = Math.min(3, v.length)
      var pp: string[] = []; for (var pi = 0; pi < n; pi++) pp.push(shortVal(v[pi]))
      var arrPrev = '(' + v.length + ') [' + pp.join(', ') + (v.length > n ? ', …' : '') + ']'
      node = { k: 'arr', preview: arrPrev, items: its, extra: Math.max(0, v.length - CAP) }
    } else {
      try {
        var CAP2 = 50, allKeys = Object.keys(v as object)
        var okeys = allKeys.slice(0, CAP2)
        var ents: [string, unknown][] = []
        for (var oi = 0; oi < okeys.length; oi++) {
          try { ents.push([okeys[oi], toTree((v as Record<string,unknown>)[okeys[oi]], depth + 1, seen)]) }
          catch (_) { ents.push([okeys[oi], { k: 'prim', v: '[Error]' }]) }
        }
        var on = Math.min(3, okeys.length), op: string[] = []
        for (var opi = 0; opi < on; opi++) op.push(okeys[opi] + ': ' + shortVal((v as Record<string,unknown>)[okeys[opi]]))
        var objPrev = '{' + op.join(', ') + (okeys.length > on ? ', …' : '') + '}'
        node = { k: 'obj', preview: objPrev, entries: ents, extra: Math.max(0, allKeys.length - CAP2) }
      } catch (_) { node = { k: 'prim', v: '[Object]' } }
    }
    seen.pop()
    return node
  }

  function makeCapture(type: string) {
    return function (...args: unknown[]) {
      captured.push({
        type: type,
        values: args.map(function (a) { return serialize(a, 0) }),
        tree: args.map(function (a) { return toTree(a, 0, []) }),
      });
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
  function finish(rv: string | undefined, rvTree: unknown, err: { message: string; stack?: string } | undefined) {
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

    // Scope to current origin so execution results (which may contain sensitive
    // page data) are not readable by cross-origin iframes on the same page.
    // Falls back to '*' only on origins where window.location.origin is 'null'
    // (e.g. file:// pages), where scoping is not possible.
    var targetOrigin = window.location.origin !== 'null' ? window.location.origin : '*'
    window.postMessage(
      {
        type: msgType, id: execId,
        result: {
          outputs: captured, returnValue: rv, returnTree: rvTree, error: err,
          replVars: (_w.__qcReplVars as string[] | undefined) || [],
        },
      },
      targetOrigin
    )
  }

  try {
    var result = (0, eval)(evalCode)  // indirect eval → global scope

    // If the result is a Promise (async IIFE, or code that returns fetch/Promise directly)
    // stay alive until it settles — console capture remains active throughout.
    if (result !== null && result !== undefined && typeof (result as Record<string, unknown>)['then'] === 'function') {
      ;(result as Promise<unknown>)
        .then(function (val: unknown) { finish(serialize(val, 0), toTree(val, 0, []), undefined) })
        .catch(function (e: unknown) {
          var ex = e as Error
          finish(undefined, undefined, { message: ex.message, stack: ex.stack })
        })
      return  // postMessage will be sent from the Promise callbacks above
    }

    finish(serialize(result, 0), toTree(result, 0, []), undefined)
  } catch (e: unknown) {
    var ex = e as Error
    finish(undefined, undefined, { message: ex.message, stack: ex.stack })
  }
}
