/**
 * Dev-only hot reload utility (tree-shaken out of production builds).
 *
 * Why here and not in the background service worker?
 * Background SWs in MV3 go to sleep after a few seconds of inactivity —
 * setTimeout stops firing. Content scripts run in the tab's JS context
 * and stay alive as long as the tab is open.
 *
 * Flow:
 *   build.js writes dist/version.txt after every rebuild
 *   → content script polls it every 1.5s
 *   → version changed → send MSG_DEV_RELOAD to background
 *   → background calls chrome.runtime.reload() (restarts extension)
 *   → content script reloads the tab 600ms later (picks up new content.js + panel.css)
 */

import { MSG_DEV_RELOAD } from '../../shared/constants'

if (__DEV__) {
  let knownVersion = ''

  async function poll() {
    try {
      const res = await fetch(chrome.runtime.getURL('version.txt'), { cache: 'no-store' })
      const version = (await res.text()).trim()

      if (knownVersion && version !== knownVersion) {
        chrome.runtime.sendMessage({ type: MSG_DEV_RELOAD }).catch(() => {})
        setTimeout(() => location.reload(), 600)
        return // stop polling — page is about to reload anyway
      }
      knownVersion = version
    } catch (_) {
      // version.txt not yet written on the very first dev build — ignore
    }
    setTimeout(poll, 1500)
  }

  // Delay start slightly so the extension has time to fully initialise
  setTimeout(poll, 2000)
}
