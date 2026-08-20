// Small geodesy helpers shared by the map, the alert checker and the popups.

const EARTH_RADIUS_MI = 3958.7613;
const MI_PER_KM = 0.621371;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/** Great-circle distance in statute miles. */
export function haversineMiles(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing in degrees, 0 = north. */
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const dl = toRad(lon2 - lon1);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

/** Compass point ("NE") for a bearing in degrees. */
export function compassPoint(deg) {
  return POINTS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export function milesToKm(mi) {
  return mi / MI_PER_KM;
}

/** Format a mile distance in the user's units, e.g. "14 mi" or "22.5 km". */
export function formatDistance(miles, units) {
  const value = units === "km" ? milesToKm(miles) : miles;
  const label = units === "km" ? "km" : "mi";
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded} ${label}`;
}

/** "just now" / "2 min ago" / "1 hr 5 min ago" for a millisecond timestamp. */
export function formatAge(ms, now = Date.now()) {
  const sec = Math.max(0, Math.round((now - ms) / 1000));
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  return rem ? `${hr} hr ${rem} min ago` : `${hr} hr ago`;
}

/** Clock label like "8:05 PM". */
export function formatClock(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * GeoJSON polygon approximating a circle of `meters` around a point —
 * used for the geolocation accuracy halo so it scales with the map.
 */
export function circlePolygon(lat, lon, meters, steps = 64) {
  const coords = [];
  const latRad = toRad(lat);
  const dLat = (meters / 111320);
  const dLon = meters / (111320 * Math.max(0.01, Math.cos(latRad)));
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([lon + dLon * Math.cos(theta), lat + dLat * Math.sin(theta)]);
  }
  return { type: "Polygon", coordinates: [coords] };
}
