/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],

  // Scope every generated utility to #inspectra-root so they only apply
  // inside the panel and never leak into / conflict with the host page.
  important: "#inspectra-root",

  theme: {
    extend: {
      colors: {
        "insp-bg": "#0d1117",
        "insp-surface": "#161b22",
        "insp-surface-2": "#21262d",
        "insp-border": "#30363d",
        "insp-border-light": "#3d444d",
        "insp-text": "#e6edf3",
        "insp-text-muted": "#8b949e",
        "insp-text-subtle": "#484f58",
        "insp-accent": "#58a6ff",
        "insp-accent-hover": "#79c0ff",
        "insp-error": "#f85149",
        "insp-warn": "#d29922",
        "insp-success": "#3fb950",
        "insp-info": "#79c0ff",
        "insp-return": "#d2a8ff",
      },
      fontFamily: {
        // Used wherever font-mono is applied in components
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"Cascadia Code"',
          "Consolas",
          '"Courier New"',
          "monospace",
        ],
      },
      borderRadius: {
        insp: "8px",
        "insp-sm": "5px",
      },
    },
  },

  corePlugins: {
    // We supply our own reset in panel.css via `all: initial` on the root
    preflight: false,
  },
};
