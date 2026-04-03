import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { TabId, Snippet, ConsoleOutput, NetworkRequest } from '../../shared/types'
import { MAX_OUTPUTS, MAX_NETWORK_REQUESTS, STORAGE_KEY } from '../../shared/constants'

interface Position {
  x: number
  y: number
}

interface PanelStore {
  // ── Panel state ────────────────────────────────────────────────────────────
  isVisible: boolean
  isMinimized: boolean
  activeTab: TabId
  position: Position

  // ── Console ────────────────────────────────────────────────────────────────
  editorCode: string
  outputs: ConsoleOutput[]
  isExecuting: boolean

  // ── Snippets ───────────────────────────────────────────────────────────────
  snippets: Snippet[]

  // ── Network ────────────────────────────────────────────────────────────────
  networkRequests: NetworkRequest[]
  isRecording: boolean

  // ── Actions ────────────────────────────────────────────────────────────────
  toggle: () => void
  setVisible: (v: boolean) => void
  setMinimized: (v: boolean) => void
  setActiveTab: (tab: TabId) => void
  setPosition: (pos: Position) => void

  setEditorCode: (code: string) => void
  addOutput: (output: ConsoleOutput) => void
  clearOutputs: () => void
  setExecuting: (v: boolean) => void

  addSnippet: (snippet: Snippet) => void
  updateSnippet: (id: string, updates: Partial<Omit<Snippet, 'id' | 'createdAt'>>) => void
  deleteSnippet: (id: string) => void
  loadSnippetToEditor: (snippet: Snippet) => void

  addNetworkRequest: (req: NetworkRequest) => void
  updateNetworkRequest: (id: string, updates: Partial<NetworkRequest>) => void
  clearNetworkRequests: () => void
  toggleRecording: () => void
}

// chrome.storage.local adapter for Zustand's persist middleware
const chromeStorage = createJSONStorage<PanelStore>(() => ({
  getItem: (name: string): Promise<string | null> =>
    new Promise((resolve) => chrome.storage.local.get(name, (r) => resolve(r[name] ?? null))),
  setItem: (name: string, value: string): Promise<void> =>
    chrome.storage.local.set({ [name]: value }),
  removeItem: (name: string): Promise<void> =>
    chrome.storage.local.remove(name),
}))

const INITIAL_CODE = `// Type JavaScript here and press Ctrl+Enter (or ⌘+Enter) to run
// Code executes in the real page context — you have full access to window, DOM, etc.

console.log('Hello from QuickConsole! 🚀')
document.title`

export const usePanelStore = create<PanelStore>()(
  persist(
    (set) => ({
      isVisible: false,
      isMinimized: false,
      activeTab: 'console',
      position: { x: 20, y: 20 },

      editorCode: INITIAL_CODE,
      outputs: [],
      isExecuting: false,

      snippets: [],
      networkRequests: [],
      isRecording: true,

      toggle: () => set((s) => ({ isVisible: !s.isVisible })),
      setVisible: (isVisible) => set({ isVisible }),
      setMinimized: (isMinimized) => set({ isMinimized }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setPosition: (position) => set({ position }),

      setEditorCode: (editorCode) => set({ editorCode }),
      addOutput: (output) =>
        set((s) => ({ outputs: [...s.outputs.slice(-(MAX_OUTPUTS - 1)), output] })),
      clearOutputs: () => set({ outputs: [] }),
      setExecuting: (isExecuting) => set({ isExecuting }),

      addSnippet: (snippet) => set((s) => ({ snippets: [...s.snippets, snippet] })),
      updateSnippet: (id, updates) =>
        set((s) => ({
          snippets: s.snippets.map((sn) =>
            sn.id === id ? { ...sn, ...updates, updatedAt: Date.now() } : sn
          ),
        })),
      deleteSnippet: (id) =>
        set((s) => ({ snippets: s.snippets.filter((sn) => sn.id !== id) })),
      loadSnippetToEditor: (snippet) =>
        set({ editorCode: snippet.code, activeTab: 'console' }),

      addNetworkRequest: (req) =>
        set((s) => ({
          networkRequests: [...s.networkRequests.slice(-(MAX_NETWORK_REQUESTS - 1)), req],
        })),
      updateNetworkRequest: (id, updates) =>
        set((s) => ({
          networkRequests: s.networkRequests.map((r) => r.id === id ? { ...r, ...updates } : r),
        })),
      clearNetworkRequests: () => set({ networkRequests: [] }),
      toggleRecording: () => set((s) => ({ isRecording: !s.isRecording })),
    }),
    {
      name: STORAGE_KEY,
      storage: chromeStorage,
      // isVisible and networkRequests are per-tab — stored in sessionStorage by App.tsx
      // Everything here is global across tabs/sites (preferences + saved work)
      partialize: (state) => ({
        position: state.position,
        isRecording: state.isRecording,
        editorCode: state.editorCode,
        snippets: state.snippets,
        activeTab: state.activeTab,
      }) as PanelStore,
    }
  )
)
