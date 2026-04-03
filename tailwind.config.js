/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],

  // Scope every generated utility to #quickconsole-root so they only apply
  // inside the panel and never leak into / conflict with the host page.
  important: '#quickconsole-root',

  theme: {
    extend: {
      colors: {
        'qc-bg':           '#0d1117',
        'qc-surface':      '#161b22',
        'qc-surface-2':    '#21262d',
        'qc-border':       '#30363d',
        'qc-border-light': '#3d444d',
        'qc-text':         '#e6edf3',
        'qc-text-muted':   '#8b949e',
        'qc-text-subtle':  '#484f58',
        'qc-accent':       '#58a6ff',
        'qc-accent-hover': '#79c0ff',
        'qc-error':        '#f85149',
        'qc-warn':         '#d29922',
        'qc-success':      '#3fb950',
        'qc-info':         '#79c0ff',
        'qc-return':       '#d2a8ff',
      },
      fontFamily: {
        // Used wherever font-mono is applied in components
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'Consolas', '"Courier New"', 'monospace'],
      },
      borderRadius: {
        'qc':    '8px',
        'qc-sm': '5px',
      },
    },
  },

  corePlugins: {
    // We supply our own reset in panel.css via `all: initial` on the root
    preflight: false,
  },
}
