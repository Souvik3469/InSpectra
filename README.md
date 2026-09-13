# InSpectra

A floating DevTools panel that lives on top of any webpage. Open it with one click, run JavaScript in the real page context, inspect network requests, and save reusable code snippets — all without leaving the tab or opening Chrome DevTools.

---

## Documentation

| Doc | What's in it |
|---|---|
| [`docs/deep-dive.html`](docs/deep-dive.html) | Architecture and internals — the four execution contexts, why `chrome.scripting` replaced script-tag injection, how REPL persistence and top-level `await` actually work, the double serialiser, and the network buffer. Open in a browser. |
| [`docs/message-protocol.md`](docs/message-protocol.md) | Every message type crossing the four contexts, and the three flows that use them. |

This README covers *what* InSpectra does. Those cover *how*, including where the implementation is
weak.

---

## The Problem

Developers constantly context-switch while working on live sites:

- Open DevTools, go to Console, type a quick test, close it, repeat
- Copy-paste the same fetch snippets or DOM queries over and over
- Lose your console history the moment the page reloads
- Switch between DevTools Network tab and your terminal to correlate requests

InSpectra keeps a persistent, draggable panel on screen so the workflow becomes: **open panel → write code → run → done**. No keyboard shortcut to open DevTools, no tab switching, no lost state.

---

<!-- ## Screenshots

> _(Screenshots coming soon — add yours here)_

--- -->

## Features

### Console

The core of InSpectra. A full code editor powered by CodeMirror 6, running code in the actual page context — meaning you have access to `window`, page globals, jQuery, React internals, or anything else that lives on the page.

- **Real page execution** — code runs in the `MAIN` world, not an isolated extension context
- **Syntax highlighting + autocomplete** — JavaScript/TypeScript via CodeMirror 6 with the One Dark theme
- **Keyboard shortcut** — `Ctrl+Enter` (or `Cmd+Enter` on Mac) to run without reaching for the mouse
- **Rich output** — objects and arrays render as an interactive tree, not a flat string
- **Multiple output types** — `console.log`, `warn`, `error`, `info`, return values, and eval errors each styled distinctly
- **Auto-scroll** — output always scrolls to the latest entry

### Expandable Object Tree

When you log or return an object or array, InSpectra renders it as an interactive inspector instead of `[object Object]`.

- Click ▶ to expand any object or array inline
- Nested objects expand independently — drill as deep as you need
- Color-coded by type: numbers/booleans in blue, strings in green, keys in yellow, `null`/`undefined` in purple
- Handles circular references and deep nesting gracefully
- Arrays and objects show a compact preview in the collapsed state: `(3) [1, 2, 3]` or `{name: "Alice", …}`

### REPL State

Variables you declare in one execution persist to the next, just like a real REPL or browser console session.

- `let`/`const` declarations are automatically promoted to `var` so they survive between runs
- Top-level `await` is supported — wrap async calls directly without an IIFE
- A badge in the toolbar shows how many variables are currently alive (`3 vars`)
- Click the badge to wipe the REPL state when you want a clean slate

### Execution History

Press **↑** on the first line of the editor (or **↓** on the last line) to navigate through everything you've run this session — like a terminal.

- Navigates through up to 50 entries, newest first
- Saves a draft of whatever you were typing before navigating, restores it when you come back down
- The toolbar shows `↑ N` as a hint when history is available
- Deduplicates consecutive identical entries

### Snippets Library

Save any code you find yourself running repeatedly. Snippets persist across page reloads and browser restarts.

- **Save** the current editor content as a named snippet from the toolbar
- **Search** snippets by name or code content in real time
- **Rename** snippets inline by clicking the name or the pencil icon
- **Load** a snippet into the editor with one click
- **Export** your entire snippet library as a JSON file to back up or share
- **Import** a JSON file to restore or merge snippets from another machine

### Network Inspector

Monitor all XHR and Fetch requests made by the page without opening DevTools.

- **Live recording** with a record/pause toggle — dot pulses red while active
- **Method filter** — show only GET, POST, PUT, DELETE, PATCH, or everything else
- **URL filter** — type any substring to narrow the list in real time
- **Status colors** — green for 2xx, yellow for 3xx, orange for 4xx, red for 5xx and errors
- **Request detail view** — click any request to see full URL, headers, request body, response body, and timing
- **Pretty-print** — JSON request/response bodies are automatically formatted for readability
- **Multi-select + export** — check any requests and download them as:
  - **JSON** — a structured report you can read or diff
  - **HAR** — import directly into Postman, Insomnia, or Chrome DevTools

### Panel UX

- **Draggable** — grab the header and move the panel anywhere on screen
- **Resizable** — drag the right edge, bottom edge, or corner handle to resize
- **Minimize** — collapse to just the header bar; position and size are remembered
- **Persistent** — position, size, and all state survive page reloads via `chrome.storage.local`

---

## How People Use This Every Day

### Debugging a live site

You're looking at a production page and something's off. Click the InSpectra icon, type `document.querySelectorAll('.product-card').length` and hit `Ctrl+Enter`. Expand the result tree to inspect any object in place — no opening DevTools, no copy-pasting to the console.

### Testing an API during development

You're building a feature that calls an API. Open InSpectra, write a `fetch()` call with `await`, run it, and the response expands inline. Tweak the payload, hit ↑ to get the last run back, change one value, run again. The whole iteration loop stays on the page you're testing.

### Saving repetitive tasks

You always run the same snippet to dump `localStorage`, clear cookies, or simulate a user action. Write it once, hit **Save**, give it a name. It's in your Snippets tab from now on — on every site, every session.

### Investigating a bug from a report

A user reports that a request is failing. Switch to the Network tab, reproduce the steps, find the failing request in the list (red ERR, or a 4xx status). Click it to see the full request and response. Check the exact headers and body that were sent. Export as HAR to share with the backend team or replay in Postman.

### Onboarding to a new codebase

Use the Console tab to poke around — explore what's on `window`, inspect the store of a Redux or Zustand app, call utility functions to see their output. The expandable tree makes exploring large objects much faster than reading flat DevTools output.

---

## Installation

### Quick Install (no build step)

1. Go to the [Releases](https://github.com/Souvik3469/QuickConsole/releases/latest) page and download `inspectra.zip`
2. Unzip it — you'll get a `dist/` folder
3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked** and select the `dist/` folder
6. Pin the InSpectra icon in your toolbar

### From Source

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Open Chrome and go to `chrome://extensions`
5. Enable **Developer mode** (toggle in the top-right corner)
6. Click **Load unpacked** and select the `dist/` folder
7. Pin the InSpectra icon in your toolbar

### Development (watch mode)

```bash
npm run dev
```

After each rebuild, go to `chrome://extensions` and click the reload icon on the InSpectra card, then refresh the page you're testing on.

---

## Usage

| Action                     | How                                                  |
| -------------------------- | ---------------------------------------------------- |
| Open / close panel         | Click the InSpectra icon in the Chrome toolbar       |
| Run code                   | `Ctrl+Enter` or `Cmd+Enter`, or the **Run** button   |
| Navigate execution history | `↑` on the first editor line / `↓` on the last       |
| Save snippet               | Click **Save** in the toolbar, enter a name          |
| Load snippet               | Go to Snippets tab, click the ▶ icon on any snippet  |
| Rename snippet             | Click the snippet name or the pencil icon            |
| Export snippets            | Snippets tab → **Export** button                     |
| Import snippets            | Snippets tab → **Import** button, select a JSON file |
| Expand an object           | Click ▶ next to any object or array in the output    |
| Inspect a network request  | Network tab → click any row                          |
| Export network requests    | Check rows → **JSON** or **HAR** button              |
| Clear REPL variables       | Click the `N vars` badge in the console toolbar      |
| Resize the panel           | Drag the right edge, bottom edge, or corner          |
| Move the panel             | Drag the header bar                                  |

---

## Tech Stack

| Layer   | Choice                                   |
| ------- | ---------------------------------------- |
| Runtime | Chrome MV3 extension                     |
| UI      | React 18 + TypeScript                    |
| Build   | Vite                                     |
| State   | Zustand v5 + `chrome.storage.local`      |
| Editor  | CodeMirror 6 via `@uiw/react-codemirror` |
| Icons   | lucide-react                             |
| Styling | Custom CSS with CSS variables            |

---

## Planned Features

### High Priority

- **Storage viewer** — browse and edit `localStorage`, `sessionStorage`, and cookies directly from the panel
- **Request replay** — resend any captured network request, optionally editing headers or body first
- **CSS injection** — write and apply CSS to the page live without going to the Styles pane in DevTools
- **Global keyboard shortcut** — open/close the panel from any page without clicking the toolbar icon (`chrome.commands`)
- **Page-context autocomplete** — CodeMirror suggestions drawn from the actual `window` object of the current page

### Medium Priority

- **Resizable editor** — drag the divider between editor and output to give more space to either
- **Snippet categories / tags** — organize a growing library
- **Execution timing** — show how long each run took next to the output
- **Dock mode** — pin the panel to the bottom or side of the viewport instead of floating
- **Clear-on-navigate** — automatically clear network requests when the page navigates

### Future

- **Light theme**
- **Editor font size setting**
- **Firefox support** via `webextension-polyfill`
- **Publish to Chrome Web Store**

---

<!--
## Contributing

Contributions are welcome. The codebase is straightforward TypeScript + React — see `src/` for the structure and `.claude/CLAUDE.md` for architecture notes and design decisions.

```
src/
├── background/     # Service worker
├── content/        # React panel injected into every page
│   ├── components/
│   ├── hooks/
│   ├── store/
│   └── utils/
└── shared/         # Types and constants shared between contexts
```

---
-->

## License

MIT
