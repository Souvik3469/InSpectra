import { build } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  existsSync,
} from "fs";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");
const distDir = resolve(__dirname, "dist");

console.log(`\n🔨 Building InSpectra${isWatch ? " (watch mode)" : ""}...\n`);

if (!isWatch && existsSync(distDir)) rmSync(distDir, { recursive: true });
mkdirSync(distDir, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Chrome extension loader requires pure ASCII (bytes 0-127) for content scripts. */
function asciiEscape(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const escaped = raw.replace(
    /[^\x00-\x7F]/gu,
    (ch) => "\\u" + ch.codePointAt(0).toString(16).padStart(4, "0"),
  );
  writeFileSync(filePath, escaped, "utf-8");
}

/** Process panel.css through PostCSS (Tailwind + Autoprefixer) and write to dist. */
async function processCss() {
  const src = resolve(__dirname, "src/content/styles/panel.css");
  const dest = resolve(distDir, "panel.css");
  const input = readFileSync(src, "utf-8");
  const result = await postcss([
    tailwindcss(resolve(__dirname, "tailwind.config.js")),
    autoprefixer,
  ]).process(input, { from: src, to: dest });
  writeFileSync(dest, result.css, "utf-8");
}

/** Copy static assets that don't go through Vite. */
async function copyAssets() {
  cpSync(resolve(__dirname, "public"), distDir, { recursive: true });
  await processCss();
}

/**
 * Run after every content script build.
 * In watch mode also bumps version.txt so the background service worker
 * detects the rebuild and calls chrome.runtime.reload() automatically.
 */
function postProcess() {
  asciiEscape(resolve(distDir, "content.js"));
  asciiEscape(resolve(distDir, "network-interceptor.js"));
  if (isWatch) {
    writeFileSync(
      resolve(distDir, "version.txt"),
      Date.now().toString(),
      "utf-8",
    );
  }
}

// ── Shared build options ──────────────────────────────────────────────────────
const sharedBuild = {
  outDir: distDir,
  emptyOutDir: false,
  minify: !isWatch,
  sourcemap: isWatch ? true : false,
  rollupOptions: { output: { inlineDynamicImports: true } },
};

// ── Build 1: Background service worker ───────────────────────────────────────
const bgResult = await build({
  configFile: false,
  define: { __DEV__: String(isWatch) },
  build: {
    ...sharedBuild,
    watch: isWatch ? {} : null,
    lib: {
      entry: resolve(__dirname, "src/background/index.ts"),
      formats: ["iife"],
      name: "QCBackground",
      fileName: () => "background.js",
    },
  },
});

// ── Build 2: Content script (React panel) ────────────────────────────────────
const contentResult = await build({
  configFile: false,
  plugins: [react()],
  define: {
    __DEV__: String(isWatch),
    "process.env.NODE_ENV": JSON.stringify(
      isWatch ? "development" : "production",
    ),
  },
  build: {
    ...sharedBuild,
    watch: isWatch ? {} : null,
    lib: {
      entry: resolve(__dirname, "src/content/index.tsx"),
      formats: ["iife"],
      name: "InSpectra",
      fileName: () => "content.js",
    },
  },
});

// ── Build 3: Network interceptor (MAIN world) ─────────────────────────────────
const netResult = await build({
  configFile: false,
  define: { __DEV__: String(isWatch) },
  build: {
    ...sharedBuild,
    watch: isWatch ? {} : null,
    lib: {
      entry: resolve(__dirname, "src/network-interceptor/index.ts"),
      formats: ["iife"],
      name: "QCNetworkInterceptor",
      fileName: () => "network-interceptor.js",
    },
  },
});

// ── Static assets (run once after initial builds) ────────────────────────────
await copyAssets();

// ── Production: one-shot post-process + done ─────────────────────────────────
if (!isWatch) {
  postProcess();
  console.log("\n✅ Build complete!");
  console.log("📁 Output: dist/");
  console.log(
    "🧩 chrome://extensions  →  Developer mode  →  Load unpacked → dist/\n",
  );
}

// ── Watch mode: hook into rebuild events ─────────────────────────────────────
if (isWatch) {
  const time = () => new Date().toLocaleTimeString();

  // Re-run post-processing after every content script rebuild
  contentResult.on("event", async (event) => {
    if (event.code === "BUNDLE_END") {
      // Re-process CSS through Tailwind in case new utility classes were added
      await processCss();
      postProcess(); // ASCII-escape + bump version.txt
      console.log(`[${time()}] Content rebuilt → extension reloading…`);
    }
    if (event.code === "ERROR") {
      console.error(`[${time()}] Build error:`, event.error.message);
    }
  });

  bgResult.on("event", (event) => {
    if (event.code === "BUNDLE_END") {
      console.log(`[${time()}] Background rebuilt`);
    }
  });

  netResult.on("event", (event) => {
    if (event.code === "BUNDLE_END") {
      asciiEscape(resolve(distDir, "network-interceptor.js"));
      console.log(`[${time()}] Network interceptor rebuilt`);
    }
  });

  console.log("👀 Watching for changes…");
  console.log("💡 Extension auto-reloads after each rebuild.");
  console.log("   Refresh your test tab after the extension reloads.\n");
}
