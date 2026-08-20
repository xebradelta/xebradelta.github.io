// ZIP code lookup for the home location.
//
// Nobody knows their latitude. data/zipcodes.json holds ZIP centroids for the
// area this app tracks (CONFIG.logBounds plus a 1 degree margin) — small enough
// to precache, so lookups work offline and need no geocoding service.

const DATA_URL = "./data/zipcodes.json";

let loadPromise = null;
let table = null;

/** Strip ZIP+4 and whitespace: "85234-1234" -> "85234". */
export function normalizeZip(input) {
  const digits = String(input ?? "").trim().replace(/\D/g, "");
  return digits.length >= 5 ? digits.slice(0, 5) : "";
}

async function loadTable() {
  if (table) return table;
  if (!loadPromise) {
    loadPromise = fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`zip data ${response.status}`);
        return response.json();
      })
      .then((json) => {
        table = json?.zips || {};
        return table;
      })
      .catch((err) => {
        loadPromise = null;         // let a later attempt retry
        throw err;
      });
  }
  return loadPromise;
}

/**
 * @param {string} input a 5-digit ZIP, with or without the +4
 * @returns {Promise<null | {zip:string, lat:number, lon:number, city:string, state:string, label:string}>}
 *          null when the ZIP is outside the covered area
 * @throws when the data file cannot be loaded
 */
export async function lookupZip(input) {
  const zip = normalizeZip(input);
  if (!zip) return null;
  const zips = await loadTable();
  const row = zips[zip];
  if (!Array.isArray(row)) return null;
  const [lat, lon, city, state] = row;
  return { zip, lat, lon, city, state, label: `${zip} · ${city}, ${state}` };
}

/** Warm the table so the first lookup feels instant. Failures are ignored. */
export function preloadZips() {
  loadTable().catch(() => { /* offline or missing: lookup reports it later */ });
}
