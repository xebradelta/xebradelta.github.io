// Strike history: an IndexedDB log of every in-bounds strike, drawn as a heatmap.
//
// Writes are buffered and flushed in one transaction so a busy storm does not
// open hundreds of them. History is pruned to CONFIG.hotspotDays and hard-capped
// at MAX_ROWS, oldest first.

import { CONFIG } from "./config.js";
import { LAYER, isReady, onceReady } from "./map.js";

const DB_NAME = "strikemap";
const DB_VERSION = 1;
const STORE = "strikes";
const MAX_ROWS = 100000;
const FLUSH_MS = 3000;
const FLUSH_SIZE = 200;
const PRUNE_KEY = "strikemap.lastPrune";
const PRUNE_EVERY_MS = 24 * 60 * 60 * 1000;
const HEAT_LAYER = "hotspots-heat";

let dbPromise = null;
let buffer = [];
let flushTimer = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { autoIncrement: true });
        store.createIndex("t", "t", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((err) => {
    console.warn("hotspots: IndexedDB unavailable, history disabled", err);
    return null;
  });
  return dbPromise;
}

/** Queue a strike for the history log. */
export function logStrike(strike) {
  buffer.push({ t: strike.t, lat: strike.lat, lon: strike.lon });
  if (buffer.length >= FLUSH_SIZE) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flush, FLUSH_MS);
  }
}

export async function flush() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (!buffer.length) return;
  const batch = buffer;
  buffer = [];
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const row of batch) store.add(row);
    tx.oncomplete = resolve;
    tx.onerror = () => { console.warn("hotspots: write failed", tx.error); resolve(); };
    tx.onabort = () => resolve();
  });
}

export async function readAll() {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const rows = [];
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).index("t").openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { resolve(rows); return; }
      rows.push(cursor.value);
      cursor.continue();
    };
    request.onerror = () => resolve(rows);
  });
}

export async function countRows() {
  const db = await openDb();
  if (!db) return 0;
  return new Promise((resolve) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(0);
  });
}

/** Drop rows past the lookback window, then trim oldest-first to MAX_ROWS. */
export async function prune({ force = false } = {}) {
  let last = 0;
  try { last = Number(localStorage.getItem(PRUNE_KEY)) || 0; } catch { /* ignore */ }
  if (!force && Date.now() - last < PRUNE_EVERY_MS) return { removed: 0, skipped: true };

  const db = await openDb();
  if (!db) return { removed: 0 };
  const cutoff = Date.now() - CONFIG.hotspotDays * 24 * 60 * 60 * 1000;
  let removed = 0;

  await new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const index = tx.objectStore(STORE).index("t");
    const request = index.openCursor(IDBKeyRange.upperBound(cutoff, true));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      cursor.delete();
      removed++;
      cursor.continue();
    };
    tx.oncomplete = resolve;
    tx.onerror = resolve;
    tx.onabort = resolve;
  });

  const total = await countRows();
  if (total > MAX_ROWS) {
    let excess = total - MAX_ROWS;
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const request = tx.objectStore(STORE).index("t").openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || excess <= 0) return;
        cursor.delete();
        removed++;
        excess--;
        cursor.continue();
      };
      tx.oncomplete = resolve;
      tx.onerror = resolve;
      tx.onabort = resolve;
    });
  }

  try { localStorage.setItem(PRUNE_KEY, String(Date.now())); } catch { /* ignore */ }
  return { removed };
}

let publishedBins = null;   // fetched at most once per page load

/** Optional pre-binned history published by the collector workflow. */
async function fetchPublishedBins() {
  if (publishedBins) return publishedBins;
  try {
    const response = await fetch("./data/hotspots.json", { cache: "no-cache" });
    // A 404 is the normal case: the optional collector is not set up.
    publishedBins = [];
    if (!response.ok) return publishedBins;
    const json = await response.json();
    if (!Array.isArray(json?.bins)) return publishedBins;
    publishedBins = json.bins
      .filter((bin) => Array.isArray(bin) && bin.length >= 3)
      .map(([lat, lon, count]) => ({ lat, lon, w: Math.max(1, count) }));
    return publishedBins;
  } catch {
    publishedBins = [];
    return publishedBins;
  }
}

export function createHotspots(map, { onCount } = {}) {
  let built = false;

  function build() {
    if (built || !isReady()) return;
    if (!map.getSource("hotspots")) {
      map.addSource("hotspots", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }
    if (!map.getLayer(HEAT_LAYER)) {
      const before = map.getLayer(LAYER.strikeGlow) ? LAYER.strikeGlow : undefined;
      map.addLayer({
        id: HEAT_LAYER,
        type: "heatmap",
        source: "hotspots",
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": ["number", ["get", "w"], 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 9, 1.2, 12, 2.2],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 9, 12, 12, 26],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.15, "rgba(255,214,10,0.35)",
            0.4, "#FFD60A",
            0.7, "#FF9500",
            1, "#FF3B30"
          ],
          "heatmap-opacity": 0.75
        }
      }, before);
    }
    built = true;
  }

  async function load() {
    build();
    if (!built) return 0;
    await flush();
    const [rows, bins] = await Promise.all([readAll(), fetchPublishedBins()]);
    const features = [];
    for (const row of rows) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [row.lon, row.lat] },
        properties: { w: 1 }
      });
    }
    for (const bin of bins) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [bin.lon, bin.lat] },
        properties: { w: bin.w }
      });
    }
    map.getSource("hotspots")?.setData({ type: "FeatureCollection", features });
    onCount?.(features.length, { local: rows.length, published: bins.length });
    return features.length;
  }

  return {
    async activate() {
      build();
      if (!built) {
        await new Promise((resolve) => onceReady(resolve));
        build();
      }
      const count = await load();
      if (map.getLayer(HEAT_LAYER)) {
        map.setLayoutProperty(HEAT_LAYER, "visibility", count > 0 ? "visible" : "none");
      }
      return count;
    },
    deactivate() {
      if (map.getLayer(HEAT_LAYER)) map.setLayoutProperty(HEAT_LAYER, "visibility", "none");
    },
    reload: load
  };
}

/** Startup housekeeping: prune once now, then check again every six hours. */
export function startMaintenance() {
  prune().then((result) => {
    if (result.removed) console.debug(`[hotspots] pruned ${result.removed} rows`);
  });
  setInterval(() => { prune(); }, 6 * 60 * 60 * 1000);
  window.addEventListener("pagehide", () => { flush(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

/** Wipe the local history store (settings sheet). */
export async function clearHistory() {
  buffer = [];
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = resolve;
    tx.onabort = resolve;
  });
}
