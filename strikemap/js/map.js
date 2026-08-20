// MapLibre setup: hybrid satellite basemap, strike layers, user location.
//
// Strikes, pulses and the user's position each render from a GeoJSON source.
// There are no DOM markers — a busy storm would put hundreds of them on the page.

// MapLibre v6 is ESM-only and exports named bindings — there is no default export.
import { Map as MapLibreMap, Popup } from "https://cdn.jsdelivr.net/npm/maplibre-gl@6.4.1/dist/maplibre-gl.mjs";
import { CONFIG } from "./config.js";
import {
  haversineMiles, bearingDeg, compassPoint, formatDistance, formatAge, circlePolygon
} from "./geo.js";

export { MapLibreMap, Popup };

// Esri tiles are {z}/{y}/{x} — row before column. Reversing these scrambles the map.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const IMAGERY_URL = `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`;
const ROADS_URL = `${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`;
const LABELS_URL = `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`;

const EMPTY = { type: "FeatureCollection", features: [] };

// Layer ids other modules insert against.
export const LAYER = {
  imagery: "imagery",
  roads: "roads",
  labels: "labels",
  strikeGlow: "strikes-glow",
  strikeDots: "strikes-dots",
  strikePulse: "strikes-pulse"
};

const PULSE_MS = 1200;
const REBUILD_INTERVAL_MS = 10000;
const REBUILD_THROTTLE_MS = 500;
const MAX_FEATURES = 5000;      // renderer guard for extreme activity

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let map = null;
let ready = false;              // the style's initial load has finished
let renderedCount = 0;          // features in the last rebuild
let onRebuild = null;
let strikes = [];               // {t, lat, lon} newest last
let pulses = [];                // {birth, lat, lon}
let rebuildTimer = null;
let intervalTimer = null;
let pulseFrame = null;
let popup = null;
let distanceOrigin = null;      // {lat, lon, label} — home unless the user located themselves

function baseStyle() {
  return {
    version: 8,
    sources: {
      imagery: {
        type: "raster", tiles: [IMAGERY_URL], tileSize: 256, maxzoom: 19,
        attribution: "Esri, Maxar, Earthstar Geographics"
      },
      roads: { type: "raster", tiles: [ROADS_URL], tileSize: 256, maxzoom: 19 },
      labels: { type: "raster", tiles: [LABELS_URL], tileSize: 256, maxzoom: 19 },
      strikes: { type: "geojson", data: EMPTY },
      pulses: { type: "geojson", data: EMPTY },
      me: { type: "geojson", data: EMPTY }
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#0b0d10" } },
      { id: LAYER.imagery, type: "raster", source: "imagery",
        paint: { "raster-opacity": 1 } },
      { id: LAYER.roads, type: "raster", source: "roads",
        paint: { "raster-opacity": 0.9, "raster-fade-duration": 0 } },
      { id: LAYER.labels, type: "raster", source: "labels",
        paint: { "raster-opacity": 0.95, "raster-fade-duration": 0 } },

      // Dark halo so a yellow dot still reads over bright desert imagery.
      { id: LAYER.strikeGlow, type: "circle", source: "strikes",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 11, 12, 16],
          "circle-color": "#000000",
          "circle-blur": 0.9,
          "circle-opacity": ["interpolate", ["linear"], ["get", "ageFrac"], 0, 0.4, 1, 0.2]
        } },
      { id: LAYER.strikeDots, type: "circle", source: "strikes",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5, 12, 7],
          "circle-color": ["step", ["get", "ageMin"], "#FF3B30", 5, "#FF9500", 20, "#FFD60A"],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": ["interpolate", ["linear"], ["get", "ageFrac"], 0, 1, 1, 0.55],
          "circle-stroke-opacity": ["interpolate", ["linear"], ["get", "ageFrac"], 0, 1, 1, 0.55]
        } },
      // One expanding ring per fresh strike, driven from requestAnimationFrame.
      { id: LAYER.strikePulse, type: "circle", source: "pulses",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "p"], 0, 6, 1, 34],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-width": ["interpolate", ["linear"], ["get", "p"], 0, 3, 1, 0.5],
          "circle-stroke-color": "#FF3B30",
          "circle-stroke-opacity": ["interpolate", ["linear"], ["get", "p"], 0, 0.85, 1, 0]
        } },

      { id: "me-accuracy", type: "fill", source: "me",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#0A84FF", "fill-opacity": 0.15 } },
      { id: "me-accuracy-line", type: "line", source: "me",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "line-color": "#0A84FF", "line-width": 1, "line-opacity": 0.5 } },
      { id: "me-dot", type: "circle", source: "me",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 7,
          "circle-color": "#0A84FF",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff"
        } }
    ]
  };
}

export function createMap(container) {
  map = new MapLibreMap({
    container,
    style: baseStyle(),
    center: CONFIG.mapCenter,
    zoom: CONFIG.mapZoom,
    minZoom: 3,
    maxZoom: 17,
    attributionControl: false,   // the app draws its own, always-visible credits
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    renderWorldCopies: false,
    fadeDuration: 0
  });

  map.on("load", () => { ready = true; });
  map.touchZoomRotate?.disableRotation();
  map.on("click", LAYER.strikeDots, onStrikeClick);
  map.on("mouseenter", LAYER.strikeDots, () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", LAYER.strikeDots, () => { map.getCanvas().style.cursor = ""; });
  map.on("error", (e) => {
    // Tile 404s during a pan are normal; log once instead of throwing.
    if (e?.error?.status === 404) return;
    console.warn("map error", e?.error || e);
  });

  intervalTimer = setInterval(() => rebuild(), REBUILD_INTERVAL_MS);
  return map;
}

export function getMap() {
  return map;
}

/**
 * True once the style's initial load has finished. Do not use
 * map.isStyleLoaded() for this — it also goes false whenever a source is
 * mid-load, which happens constantly while strikes stream in.
 */
export function isReady() {
  return ready;
}

export function onceReady(fn) {
  if (!map) return;
  if (ready) fn();
  else map.once("load", fn);
}

/** Called after every strike rebuild, so the caller can repaint counters. */
export function setOnRebuild(fn) {
  onRebuild = fn;
}

/** Where popup distances are measured from. */
export function setDistanceOrigin(origin) {
  distanceOrigin = origin;
}

function originPoint() {
  return distanceOrigin || { lat: CONFIG.home.lat, lon: CONFIG.home.lon, label: "home" };
}

/** Add a strike (already filtered to logBounds by the caller). */
export function addStrike(strike) {
  strikes.push(strike);
  if (strikes.length > MAX_FEATURES) strikes = strikes.slice(-MAX_FEATURES);
  if (!reduceMotion.matches && Date.now() - strike.t < 60000) {
    pulses.push({ birth: Date.now(), lat: strike.lat, lon: strike.lon });
    startPulseLoop();
  }
  scheduleRebuild();
}

/** Strikes currently drawn (expired ones are dropped on rebuild). */
export function strikeCount() {
  return renderedCount;
}

export function clearStrikes() {
  strikes = [];
  rebuild();
}

function scheduleRebuild() {
  if (rebuildTimer) return;
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    rebuild();
  }, REBUILD_THROTTLE_MS);
}

/** Rebuild the strike FeatureCollection: drop expired, re-age the rest. */
export function rebuild() {
  if (!map) return;
  const source = map.getSource("strikes");
  if (!source) return;
  const now = Date.now();
  const trailMs = CONFIG.trailMinutes * 60000;
  const cutoff = now - trailMs;

  const kept = [];
  const features = [];
  for (const s of strikes) {
    if (s.t < cutoff) continue;
    kept.push(s);
    const ageMin = (now - s.t) / 60000;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: {
        t: s.t,
        ageMin: Math.max(0, ageMin),
        ageFrac: Math.min(1, Math.max(0, (now - s.t) / trailMs))
      }
    });
  }
  strikes = kept;
  renderedCount = features.length;
  source.setData({ type: "FeatureCollection", features });
  onRebuild?.(renderedCount);
}

function startPulseLoop() {
  if (pulseFrame !== null) return;
  const step = () => {
    const source = map?.getSource("pulses");
    if (!source) { pulseFrame = null; return; }
    const now = Date.now();
    const features = [];
    pulses = pulses.filter((pulse) => {
      const p = (now - pulse.birth) / PULSE_MS;
      if (p >= 1) return false;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pulse.lon, pulse.lat] },
        properties: { p }
      });
      return true;
    });
    source.setData({ type: "FeatureCollection", features });
    if (features.length) {
      pulseFrame = requestAnimationFrame(step);
    } else {
      pulseFrame = null;
    }
  };
  pulseFrame = requestAnimationFrame(step);
}

function onStrikeClick(event) {
  const feature = event.features?.[0];
  if (!feature) return;
  const [lon, lat] = feature.geometry.coordinates;
  const t = feature.properties.t;
  const origin = originPoint();
  const miles = haversineMiles(origin.lat, origin.lon, lat, lon);
  const dir = compassPoint(bearingDeg(origin.lat, origin.lon, lat, lon));
  const when = formatAge(t);
  const clock = new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  popup?.remove();
  popup = new Popup({ closeButton: false, offset: 12, className: "strike-popup" })
    .setLngLat([lon, lat])
    .setHTML(
      `<div class="pop-when">${when}</div>` +
      `<div class="pop-where">${formatDistance(miles, CONFIG.units)} ${dir} of ${origin.label || "home"}</div>` +
      `<div class="pop-clock">${clock}</div>`
    )
    .addTo(map);
}

/** Blue dot + accuracy halo, and fly there. Resolves with the position. */
export function locateUser({ fly = true } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        showUserLocation(latitude, longitude, accuracy);
        if (fly) {
          map?.flyTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 10), speed: 1.2 });
        }
        resolve({ lat: latitude, lon: longitude, accuracy });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

export function showUserLocation(lat, lon, accuracy = 0) {
  const source = map?.getSource("me");
  if (!source) return;
  const features = [{
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: {}
  }];
  if (accuracy > 0) {
    features.unshift({
      type: "Feature",
      geometry: circlePolygon(lat, lon, accuracy),
      properties: {}
    });
  }
  source.setData({ type: "FeatureCollection", features });
}

export function flyHome() {
  map?.flyTo({ center: [CONFIG.home.lon, CONFIG.home.lat], zoom: Math.max(map.getZoom(), 9.3) });
}

export function destroyMap() {
  clearInterval(intervalTimer);
  if (pulseFrame !== null) cancelAnimationFrame(pulseFrame);
  map?.remove();
  map = null;
}
