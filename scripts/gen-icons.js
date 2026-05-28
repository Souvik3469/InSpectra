/**
 * Generates PNG icons for the InSpectra extension.
 * Draws a magnifying glass with a code bracket symbol on a dark rounded background.
 * Uses raw PNG bytes — zero external dependencies.
 *
 * Usage: node scripts/gen-icons.js
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, "../public/icons");
mkdirSync(iconsDir, { recursive: true });

// Brand colors
const BG    = { r: 0x0d, g: 0x11, b: 0x17, a: 255 }; // #0d1117
const BLUE  = { r: 0x58, g: 0xa6, b: 0xff, a: 255 }; // #58a6ff
const WHITE = { r: 0xe6, g: 0xed, b: 0xf3, a: 255 }; // #e6edf3

// ── RGBA PNG builder ──────────────────────────────────────────────────────────

function makePNG(pixels, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  const ihdr = chunk("IHDR", ihdrData);

  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    const base = y * rowSize;
    raw[base] = 0;
    for (let x = 0; x < size; x++) {
      const p = pixels[y * size + x];
      raw[base + 1 + x * 4]     = p.r;
      raw[base + 1 + x * 4 + 1] = p.g;
      raw[base + 1 + x * 4 + 2] = p.b;
      raw[base + 1 + x * 4 + 3] = p.a;
    }
  }

  const idat = chunk("IDAT", deflateRaw(raw));
  const iend = chunk("IEND", Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBytes = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput) >>> 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function deflateRaw(data) {
  const CHUNK = 65535;
  const blocks = [];
  for (let i = 0; i < data.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, data.length);
    const block = data.slice(i, end);
    const isLast = end >= data.length;
    const header = Buffer.alloc(5);
    header[0] = isLast ? 1 : 0;
    header.writeUInt16LE(block.length, 1);
    header.writeUInt16LE(~block.length & 0xffff, 3);
    blocks.push(header, block);
  }
  const body = Buffer.concat(blocks);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(adler32(data) >>> 0);
  return Buffer.concat([Buffer.from([0x78, 0x01]), body, check]);
}

function adler32(buf) {
  let s1 = 1, s2 = 0;
  for (const b of buf) { s1 = (s1 + b) % 65521; s2 = (s2 + s1) % 65521; }
  return (s2 << 16) | s1;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return crc ^ 0xffffffff;
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function blendOver(src, dst) {
  const sa = src.a / 255, da = dst.a / 255;
  const oa = sa + da * (1 - sa);
  if (oa === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: Math.round((src.r * sa + dst.r * da * (1 - sa)) / oa),
    g: Math.round((src.g * sa + dst.g * da * (1 - sa)) / oa),
    b: Math.round((src.b * sa + dst.b * da * (1 - sa)) / oa),
    a: Math.round(oa * 255),
  };
}

function sdfRoundRect(px, py, cx, cy, hw, hh, r) {
  const dx = Math.abs(px - cx) - hw + r;
  const dy = Math.abs(py - cy) - hh + r;
  return Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) +
    Math.min(Math.max(dx, dy), 0) - r;
}

function sdfCircle(px, py, cx, cy, radius) {
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) - radius;
}

function sdfCapsule(px, py, ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.sqrt((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2) - r;
}

function paintSDF(pixels, size, sdfFn, color, aa = 1.2) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = sdfFn(x + 0.5, y + 0.5);
      const alpha = Math.max(0, Math.min(1, -d / aa + 0.5));
      if (alpha <= 0) continue;
      const c = { ...color, a: Math.round(color.a * alpha) };
      pixels[y * size + x] = blendOver(c, pixels[y * size + x]);
    }
  }
}

// ── Icon renderer (designed at 128px, scales via `s`) ────────────────────────

function renderIcon(size) {
  const pixels = Array.from({ length: size * size }, () => ({ r: 0, g: 0, b: 0, a: 0 }));
  const s = size / 128;

  // Background: dark rounded square
  paintSDF(pixels, size,
    (x, y) => sdfRoundRect(x, y, size / 2, size / 2, size / 2, size / 2, 22 * s),
    BG, 1.2
  );

  // Lens circle (outline)
  const lensX = 50 * s, lensY = 52 * s, lensR = 32 * s, stroke = 7 * s;
  paintSDF(pixels, size,
    (x, y) => Math.abs(sdfCircle(x, y, lensX, lensY, lensR)) - stroke / 2,
    BLUE, 1.2
  );

  // Handle
  const hAx = lensX + lensR * 0.68, hAy = lensY + lensR * 0.68;
  paintSDF(pixels, size,
    (x, y) => sdfCapsule(x, y, hAx, hAy, hAx + 22 * s, hAy + 22 * s, stroke / 2),
    BLUE, 1.2
  );

  // "</ >" code symbol inside lens
  const bx = lensX - 1 * s, by = lensY, bs = 11 * s, bw = Math.max(1.5, 2.2 * s);

  paintSDF(pixels, size, (x, y) => Math.min(
    sdfCapsule(x, y, bx - bs * 0.55, by, bx - bs * 0.15, by - bs * 0.7, bw / 2),
    sdfCapsule(x, y, bx - bs * 0.55, by, bx - bs * 0.15, by + bs * 0.7, bw / 2)
  ), WHITE, 1.0);

  paintSDF(pixels, size,
    (x, y) => sdfCapsule(x, y, bx + bs * 0.05, by + bs * 0.75, bx + bs * 0.35, by - bs * 0.75, bw / 2),
    WHITE, 1.0
  );

  paintSDF(pixels, size, (x, y) => Math.min(
    sdfCapsule(x, y, bx + bs * 0.7, by, bx + bs * 0.3, by - bs * 0.7, bw / 2),
    sdfCapsule(x, y, bx + bs * 0.7, by, bx + bs * 0.3, by + bs * 0.7, bw / 2)
  ), WHITE, 1.0);

  return pixels;
}

// ── Generate all sizes ────────────────────────────────────────────────────────

for (const size of [16, 48, 128]) {
  const pixels = renderIcon(size);
  const png = makePNG(pixels, size);
  const path = resolve(iconsDir, `icon${size}.png`);
  writeFileSync(path, png);
  console.log(`✅  icon${size}.png`);
}

console.log("\nIcons generated at public/icons/");
