/**
 * Generates placeholder PNG icons for the extension.
 * Creates simple solid-color squares as valid PNGs using raw bytes.
 * Replace the output files with proper artwork before publishing.
 *
 * Usage: node scripts/gen-icons.js
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, "../public/icons");
mkdirSync(iconsDir, { recursive: true });

// Minimal PNG builder — creates an NxN solid-color PNG
function makePNG(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk("IHDR", ihdrData);

  // IDAT chunk — raw image data (filtered)
  // Each row: filter byte (0) + RGB pixels
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    const offset = y * rowSize;
    raw[offset] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      raw[offset + 1 + x * 3] = r;
      raw[offset + 1 + x * 3 + 1] = g;
      raw[offset + 1 + x * 3 + 2] = b;
    }
  }
  const compressed = deflateRaw(raw);
  const idat = chunk("IDAT", compressed);

  // IEND chunk
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBytes = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcVal = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal >>> 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

// Minimal zlib DEFLATE wrapper (store method — no compression)
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
  // zlib header (CMF=0x78, FLG=0x01) + adler32
  const body = Buffer.concat(blocks);
  const adler = adler32(data);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(adler >>> 0);
  return Buffer.concat([Buffer.from([0x78, 0x01]), body, check]);
}

function adler32(buf) {
  let s1 = 1,
    s2 = 0;
  for (const b of buf) {
    s1 = (s1 + b) % 65521;
    s2 = (s2 + s1) % 65521;
  }
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

// InSpectra brand color: #1a6fd4 (blue)
const [R, G, B] = [0x1a, 0x6f, 0xd4];

for (const size of [16, 48, 128]) {
  const png = makePNG(size, R, G, B);
  const path = resolve(iconsDir, `icon${size}.png`);
  writeFileSync(path, png);
  console.log(`✅ Created ${path}`);
}

console.log(
  "\nPlaceholder icons generated. Replace with proper artwork before publishing.",
);
