// Strike Map — configuration and persisted settings.
//
// CONFIG is a single live object. Anything marked (user) below is editable in
// the settings sheet and written to localStorage; everything else is a build
// constant. Import CONFIG anywhere and read the current value — do not copy
// fields out at module load, they change while the app runs.

const STORAGE_KEY = "strikemap.settings.v1";

const DEFAULTS = {
  // (user) — set by ZIP code, by GPS, or by typing coordinates. zip and label
  // are display only; lat/lon are what the app measures from.
  home: { lat: 33.3528, lon: -111.7890, zip: "", label: "Gilbert, AZ" },
  mapCenter: [-111.789, 33.3528],
  mapZoom: 9.3,
  // Bounding box for logging and alert checks (roughly Arizona)
  logBounds: { latMin: 31.0, latMax: 37.5, lonMin: -115.5, lonMax: -108.0 },
  trailMinutes: 60,        // strikes older than this disappear (user: 15/30/60/120)
  alertRadiusMiles: 25,    // (user)
  alertSound: true,        // (user)
  units: "mi",             // "mi" or "km" (user)
  hotspotDays: 30          // heatmap lookback window
};

// Only these keys round-trip through localStorage.
const PERSISTED = ["home", "trailMinutes", "alertRadiusMiles", "alertSound", "units"];

export const CONFIG = JSON.parse(JSON.stringify(DEFAULTS));

const listeners = new Set();

/** Subscribe to settings changes. Returns an unsubscribe function. */
export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(changed) {
  for (const fn of listeners) {
    try { fn(CONFIG, changed); } catch (err) { console.warn("settings listener failed", err); }
  }
}

export function loadSettings() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return CONFIG;   // private mode / storage disabled: run on defaults
  }
  if (!raw) return CONFIG;
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return CONFIG;
  }
  if (!saved || typeof saved !== "object") return CONFIG;

  if (saved.home && Number.isFinite(saved.home.lat) && Number.isFinite(saved.home.lon)) {
    CONFIG.home = {
      lat: saved.home.lat,
      lon: saved.home.lon,
      zip: typeof saved.home.zip === "string" ? saved.home.zip.slice(0, 5) : "",
      label: typeof saved.home.label === "string" ? saved.home.label.slice(0, 60) : ""
    };
  }
  if ([15, 30, 60, 120].includes(saved.trailMinutes)) CONFIG.trailMinutes = saved.trailMinutes;
  if (Number.isFinite(saved.alertRadiusMiles)) {
    CONFIG.alertRadiusMiles = Math.min(150, Math.max(1, saved.alertRadiusMiles));
  }
  if (typeof saved.alertSound === "boolean") CONFIG.alertSound = saved.alertSound;
  if (saved.units === "mi" || saved.units === "km") CONFIG.units = saved.units;
  return CONFIG;
}

/**
 * Apply a partial update, persist it, and notify listeners.
 * @param {object} patch subset of the (user) keys
 */
export function updateSettings(patch) {
  Object.assign(CONFIG, patch);
  saveSettings();
  emit(Object.keys(patch));
  return CONFIG;
}

export function saveSettings() {
  const out = {};
  for (const key of PERSISTED) out[key] = CONFIG[key];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch (err) {
    console.warn("could not persist settings", err);
  }
}

export function resetSettings() {
  const fresh = JSON.parse(JSON.stringify(DEFAULTS));
  for (const key of PERSISTED) CONFIG[key] = fresh[key];
  saveSettings();
  emit(PERSISTED.slice());
  return CONFIG;
}

/** True when the point is inside the logging / alerting box. */
export function inBounds(lat, lon) {
  const b = CONFIG.logBounds;
  return lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax;
}
