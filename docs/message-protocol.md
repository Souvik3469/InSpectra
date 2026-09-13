# Message Protocol — InSpectra

InSpectra spans **four execution contexts** that cannot share memory. Everything they do together
happens by message passing, and getting that wiring right is most of the engineering in this
extension.

```
┌──────────────────────────────────────────────────────────────────┐
│ BACKGROUND (service worker)                                      │
│   • toolbar click  → MSG_TOGGLE                                  │
│   • MSG_EXECUTE    → chrome.scripting.executeScript(MAIN)        │
└───────────────▲──────────────────────────────┬───────────────────┘
   chrome.runtime│                             │ chrome.scripting
                │                              ▼
┌───────────────┴──────────────┐   ┌───────────────────────────────┐
│ CONTENT SCRIPT (isolated)    │   │ pageExecutor  (MAIN, ephemeral)│
│   React panel, Zustand store │◄──┤   eval + console capture       │
└───────────────▲──────────────┘   └───────────────────────────────┘
   window.postMessage│
┌───────────────┴──────────────────────────────────────────────────┐
│ NETWORK INTERCEPTOR (MAIN, document_start, persistent)           │
│   patches window.fetch + XMLHttpRequest                          │
└──────────────────────────────────────────────────────────────────┘
```

**Why four.** The React UI must be isolated — it cannot risk colliding with page globals. But
executing user code and intercepting `fetch` both *require* the page's own realm. So the UI lives
in the isolated world and anything touching page internals lives in MAIN, with `postMessage` as
the only bridge.

---

## Constants — `src/shared/constants.ts`

| Constant | Value | Direction |
|---|---|---|
| `MSG_TOGGLE` | `__IS_TOGGLE__` | background → content |
| `MSG_EXECUTE` | `__IS_EXECUTE__` | content → background |
| `MSG_RESULT` | `__IS_RESULT__` | pageExecutor → content (`window.postMessage`) |
| `IS_NETWORK` | `__IS_NETWORK__` | interceptor → content |
| `IS_NET_READY` | `__IS_NET_READY__` | content → interceptor |
| `EXEC_PREFIX` | `__is_exec_` | execution id namespace |

Limits: `EXECUTION_TIMEOUT_MS` 10s · `MAX_OUTPUTS` 200 · `MAX_NETWORK_REQUESTS` 500 · interceptor
body cap 50,000 chars.

---

## Flow 1 — Toggling the panel

```
toolbar click → chrome.action.onClicked (background)
             → chrome.tabs.sendMessage(tabId, MSG_TOGGLE)
             → content script toggles Zustand `isVisible`
```

`.catch(() => {})` on the send is deliberate: on pages where no content script is running
(`chrome://`, the Web Store), the message has no receiver and would otherwise reject.

## Flow 2 — Executing code

The important one, and the reason the architecture looks the way it does.

```
1. content   executeCode(src)
             ├─ mint id  __is_exec_<ts>_<n>
             ├─ register a window 'message' listener filtered on that id
             ├─ arm a 10s timeout
             └─ chrome.runtime.sendMessage({ MSG_EXECUTE, code, executionId })

2. background chrome.scripting.executeScript({ target: {tabId}, world: 'MAIN',
                                               func: pageExecutor, args: [...] })

3. page      pageExecutor runs in the page's own realm:
             ├─ swap console.{log,warn,error,info} for capturing versions
             ├─ rewrite let/const → var          (REPL persistence)
             ├─ snapshot Object.keys(window)     (to detect new declarations)
             ├─ (0, eval)(code)                  (indirect eval → global scope)
             ├─ if the result is thenable, wait for it to settle
             └─ finish(): restore console, diff window keys, postMessage(MSG_RESULT,
                          targetOrigin = window.location.origin)

4. content   listener matches on id → resolve({ outputs, returnValue, returnTree,
                                                error, replVars })
```

### Why `chrome.scripting` instead of injecting a `<script>` tag

The original implementation appended a `<script>` element to the page. That is the standard trick
and it **fails on any page with a strict Content-Security-Policy** — which includes most local dev
servers and most hardened production apps.

`chrome.scripting.executeScript` with `world: 'MAIN'` is injected by Chrome at the engine level and
is **not subject to the page's CSP**. Same result, no CSP dependency. The tradeoff is that
`pageExecutor` must be entirely self-contained — no imports, no closure references — because it is
serialised across a process boundary. That constraint is why it's a single large function written
in ES5-ish style with its own serialisers inlined.

### Why the result comes back by `postMessage`, not a return value

`executeScript` resolves with the function's return value, but `pageExecutor` may need to wait for a
Promise to settle while continuing to capture console output. `postMessage` decouples completion
from injection, so async execution reports whenever it actually finishes.

⚠️ `targetOrigin` is set to `window.location.origin` rather than `'*'`, so execution results — which
can contain page data — are not readable by cross-origin iframes on the same page. `'*'` is used
only where `origin` is `'null'` (e.g. `file://`), where scoping isn't possible.

## Flow 3 — Network capture

```
document_start  interceptor (MAIN) patches window.fetch + XMLHttpRequest
                guarded by window.__isNetActive against double-wrapping on SPA re-injection

any request     post({ IS_NETWORK, event:'req', id, method, url, headers, body, initiator, ts })
                ├─ if content script not ready yet → push to _buf
                └─ else → window.postMessage(..., origin)

response/error  post({ event:'res'| 'err', id, status, headers, body, duration })

panel mounts    content → window.postMessage(IS_NET_READY)
                interceptor flushes _buf in order, then streams live
```

**The buffer is the point.** Requests fire during page load, long before a React panel can mount.
Without buffering, the Network tab would be empty for exactly the requests a developer most wants
to see. `_ready` flips once, `_buf` drains in order, and everything after streams live.

**Initiator** is recovered by throwing an `Error` at call time and walking the stack for the first
frame that isn't `chrome-extension://`, reduced to `filename:line`.

---

## Reading the code

| File | Role |
|---|---|
| `src/background/index.ts` | Service worker; owns `pageExecutor` — the self-contained function injected into MAIN |
| `src/content/utils/executor.ts` | Content-side half: id minting, listener, timeout, reject paths |
| `src/network-interceptor/index.ts` | MAIN-world `fetch`/XHR patching, buffering, initiator capture |
| `src/content/hooks/useNetworkMessages.ts` | Consumes `IS_NETWORK` events into the store |
| `src/content/store/index.ts` | Zustand store, persisted to `chrome.storage.local` |
| `src/shared/constants.ts` | Every message type and limit in one place |
