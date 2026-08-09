// Generates the PWA icon set without any image dependencies: draws a
// kettlebell mark into an RGBA buffer and encodes PNGs with node:zlib.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const BG = [0x12, 0x10, 0x0d];
const BELL = [0xff, 0x6a, 0x3c];
const BELL_DEEP = [0xd9, 0x4f, 0x26];

// Signed-ish coverage test for the kettlebell mark at unit coordinates.
// body: circle; handle: annulus clipped to its upper half, blended where it
// meets the body so the silhouette reads as one piece.
function bellCoverage(u, v, scale) {
  const x = (u - 0.5) / scale + 0.5;
  const y = (v - 0.5) / scale + 0.5;
  const bodyR = 0.285;
  const bodyD = Math.hypot(x - 0.5, y - 0.665) - bodyR;
  const hx = x - 0.5;
  const hy = y - 0.40;
  const hr = Math.hypot(hx, hy);
  const inHandleBand = hr < 0.26 && hr > 0.16;
  const handleD = inHandleBand && y < 0.44 ? -1 : 1;
  // carve the handle window out of everything so the opening stays visible
  const inWindow = hr <= 0.16 && y < 0.44;
  return !inWindow && (bodyD < 0 || handleD < 0);
}

function render(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const scale = maskable ? 0.62 : 0.78;
  const SS = 3; // supersampling grid per axis
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / size;
          const v = (py + (sy + 0.5) / SS) / size;
          if (bellCoverage(u, v, scale)) hits++;
        }
      }
      const a = hits / (SS * SS);
      const i = (py * size + px) * 4;
      // vertical tint: slightly deeper color toward the bottom of the bell
      const t = Math.min(1, Math.max(0, (py / size - 0.35) * 1.4));
      const fg = [
        BELL[0] + (BELL_DEEP[0] - BELL[0]) * t,
        BELL[1] + (BELL_DEEP[1] - BELL[1]) * t,
        BELL[2] + (BELL_DEEP[2] - BELL[2]) * t,
      ];
      rgba[i] = Math.round(BG[0] * (1 - a) + fg[0] * a);
      rgba[i + 1] = Math.round(BG[1] * (1 - a) + fg[1] * a);
      rgba[i + 2] = Math.round(BG[2] * (1 - a) + fg[2] * a);
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

writeFileSync(join(outDir, "icon-192.png"), render(192));
writeFileSync(join(outDir, "icon-512.png"), render(512));
writeFileSync(join(outDir, "icon-maskable-512.png"), render(512, { maskable: true }));
writeFileSync(join(outDir, "apple-touch-icon.png"), render(180));
console.log("icons written to", outDir);
