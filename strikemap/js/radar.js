// NEXRAD radar loop from the Iowa Environmental Mesonet tile cache.
//
// Eleven frames: the current composite plus ten 5-minute steps back to 50
// minutes ago. All eleven layers stay in the style once built, so switching
// back to the Radar tab is instant — only raster-opacity moves.
//
// Radar: NOAA NEXRAD via Iowa Environmental Mesonet. Standard XYZ order here
// ({z}/{x}/{y}) — unlike the Esri basemap tiles.

import { LAYER, isReady, onceReady } from "./map.js";
import { formatClock } from "./geo.js";

const IEM = "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0";
const PRODUCT = "nexrad-n0q-900913";

// Oldest first, so the loop plays forward in time.
const OFFSETS = [50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0];

const VISIBLE_OPACITY = 0.7;
const STEP_MS = 450;
const HOLD_NEWEST_MS = 1200;
const SLOT_MS = 5 * 60 * 1000;      // the product updates on 5-minute boundaries
const REFRESH_CHECK_MS = 30000;

const layerId = (offset) => `radar-m${String(offset).padStart(2, "0")}`;
const sourceId = layerId;

function tileUrl(offset, stamp) {
  const product = offset === 0 ? PRODUCT : `${PRODUCT}-m${String(offset).padStart(2, "0")}m`;
  return `${IEM}/${product}/{z}/{x}/{y}.png?t=${stamp}`;
}

/** Epoch seconds floored to the current 5-minute slot — the cache-buster. */
function currentStamp() {
  return Math.floor(Date.now() / SLOT_MS) * (SLOT_MS / 1000);
}

/**
 * @param {import("./map.js").MapLibreMap} map
 * @param {(frame:{index:number,total:number,minutesAgo:number,label:string,playing:boolean})=>void} onFrame
 */
export function createRadar(map, onFrame) {
  let built = false;
  let active = false;
  let playing = false;
  let index = OFFSETS.length - 1;   // start on the newest frame
  let timer = null;
  let refreshTimer = null;
  let stamp = currentStamp();

  function build() {
    if (built || !isReady()) return;
    // Radar sits above the imagery but below roads, labels and the strikes,
    // so place names stay readable and dots stay on top.
    const before = map.getLayer(LAYER.roads) ? LAYER.roads : undefined;
    for (const offset of OFFSETS) {
      const id = layerId(offset);
      if (map.getSource(id)) continue;
      map.addSource(id, {
        type: "raster",
        tiles: [tileUrl(offset, stamp)],
        tileSize: 256,
        maxzoom: 12,
        attribution: "NOAA NEXRAD via Iowa Environmental Mesonet"
      });
      map.addLayer({
        id,
        type: "raster",
        source: id,
        paint: { "raster-opacity": 0, "raster-fade-duration": 0 }
      }, before);
    }
    built = true;
  }

  function showOnly(i) {
    if (!built) return;
    OFFSETS.forEach((offset, n) => {
      const id = layerId(offset);
      if (!map.getLayer(id)) return;
      map.setPaintProperty(id, "raster-opacity", n === i && active ? VISIBLE_OPACITY : 0);
    });
    index = i;
    emit();
  }

  function hideAll() {
    if (!built) return;
    for (const offset of OFFSETS) {
      if (map.getLayer(layerId(offset))) map.setPaintProperty(layerId(offset), "raster-opacity", 0);
    }
  }

  function emit() {
    const minutesAgo = OFFSETS[index];
    onFrame?.({
      index,
      total: OFFSETS.length,
      minutesAgo,
      label: formatClock(stamp * 1000 - minutesAgo * 60000),
      playing
    });
  }

  function tick() {
    const next = (index + 1) % OFFSETS.length;
    showOnly(next);
    const isNewest = OFFSETS[next] === 0;
    timer = setTimeout(tick, isNewest ? HOLD_NEWEST_MS : STEP_MS);
  }

  function play() {
    if (!active || playing) return;
    playing = true;
    emit();
    const isNewest = OFFSETS[index] === 0;
    timer = setTimeout(tick, isNewest ? HOLD_NEWEST_MS : STEP_MS);
  }

  function pause() {
    playing = false;
    if (timer) { clearTimeout(timer); timer = null; }
    emit();
  }

  /** Re-point every source at a fresh 5-minute slot so the loop stays current. */
  function refresh() {
    const next = currentStamp();
    if (next === stamp || !built) return;
    stamp = next;
    for (const offset of OFFSETS) {
      const source = map.getSource(sourceId(offset));
      if (!source) continue;
      const url = tileUrl(offset, stamp);
      if (typeof source.setTiles === "function") {
        source.setTiles([url]);
      } else {
        source.tiles = [url];
        map.style?.sourceCaches?.[sourceId(offset)]?.clearTiles?.();
        map.triggerRepaint();
      }
    }
    emit();
  }

  function activate() {
    active = true;
    build();
    if (!built) {
      // Style still loading: come back once it is ready.
      onceReady(() => { if (active) activate(); });
      return;
    }
    showOnly(index);
    play();
    if (!refreshTimer) refreshTimer = setInterval(refresh, REFRESH_CHECK_MS);
    refresh();
  }

  function deactivate() {
    active = false;
    pause();
    hideAll();
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  return {
    activate,
    deactivate,
    toggle() {
      if (playing) pause(); else play();
      return playing;
    },
    get playing() { return playing; },
    get frame() { return { index, minutesAgo: OFFSETS[index] }; },
    refresh
  };
}
