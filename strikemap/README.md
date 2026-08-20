# Strike Map

Live lightning strikes, strike-density hotspots and an animated NEXRAD radar
loop for the Phoenix East Valley — a static, installable web app with no
backend and no build step.

**Live at:** https://xebradelta.github.io/strikemap/

Personal, non-commercial project. **Not a warning system** — never use it to
make safety decisions.

---

## What it does

Three tabs over one satellite map:

| Tab | What it shows |
| --- | --- |
| **Latest** | Live strikes from the Blitzortung.org network, coloured by age: red under 5 min, orange 5–20 min, yellow beyond that, fading out and disappearing at the end of the trail duration. Tap a dot for its time, distance and bearing from home. |
| **Hotspots** | A heatmap of every in-bounds strike the app has logged locally (IndexedDB), over a 30-day window. |
| **Radar** | An 11-frame NEXRAD composite loop, 50 minutes ago to now, with a timestamp chip and play/pause. Live strikes stay drawn on top. |

While the app is open, a strike inside the alert radius raises a banner, a
thunder crack (Web Audio, no audio files) and — if you granted permission from
Settings — a local notification, rate-limited to one per 30 seconds. There is
no server, so there is **no background push**: alerts only fire while the app
is on screen.

Settings (gear, top left): home location, trail duration, alert radius, alert
sound, notifications, units, and a strike-history counter with a delete button.
Everything persists to `localStorage`.

**Setting home** — three ways, in the order most people will want them:

1. **ZIP code.** Type a ZIP, tap *Set from ZIP*, and home moves to that ZIP's
   centroid: "Home set to 85297 · Gilbert, AZ."
2. **Use my current location** — one tap, from GPS.
3. **Enter coordinates instead** — a disclosure holding latitude/longitude for
   anyone who wants an exact spot.

ZIP lookup is offline and needs no geocoding service: `data/zipcodes.json`
holds the centroids, precached with the app shell.

---

## Files

```
strikemap/
├── index.html
├── manifest.webmanifest
├── sw.js
├── css/style.css
├── data/zipcodes.json ZIP centroids for the covered area
├── js/config.js      configuration + persisted settings
├── js/geo.js         haversine, bearings, formatting
├── js/zipcodes.js    offline ZIP lookup
├── js/lzw.js         the feed's dictionary-LZW decoder
├── js/feed.js        Blitzortung WebSocket client
├── js/map.js         MapLibre setup, basemap, strike layers
├── js/radar.js       IEM radar frames + animation
├── js/hotspots.js    IndexedDB store + heatmap layer
├── js/alerts.js      proximity alerts while the app is open
├── js/settings.js    settings sheet, localStorage persistence
├── js/app.js         entry point, tab switching, wiring
├── icons/            192, 512 and a 180 apple-touch-icon
└── README.md
```

Vanilla HTML/CSS/ES modules. The only dependency is MapLibre GL JS, pinned and
loaded from a CDN:

```
https://cdn.jsdelivr.net/npm/maplibre-gl@6.4.1/dist/maplibre-gl.mjs
```

MapLibre 6 is ESM-only and has no default export, so `js/map.js` imports the
named `Map` and `Popup` bindings. Bump that version in **both** `index.html`
(the stylesheet) and `js/map.js` (the module) if you upgrade.

Every internal path is relative (`./js/app.js`), so the app runs from any
subdirectory — here it lives at `/strikemap/`, but it would work unchanged at
the root of its own repo.

---

## Deploying

This app is a folder in the [xebradelta.github.io](../) Pages site, so it is
already deployed: push to `main` and GitHub Pages rebuilds within a minute.

To run it as its own repo instead:

1. Create a public GitHub repo and push these files to `main`.
2. Repo **Settings → Pages → Source:** deploy from branch, `main`, `/ (root)`.
3. Open `https://USERNAME.github.io/REPO/` on the iPhone, confirm strikes appear
   during activity, then **Share → Add to Home Screen**.
4. Local dev: `python3 -m http.server 8000`, then open
   `http://localhost:8000/strikemap/`. Service workers and geolocation both
   work on localhost.

### Bump the cache version on every deploy

`sw.js` starts with `const CACHE = "strikemap-v2"`. The worker is cache-first
for the app shell, so **installed phones will keep running old code until that
string changes**. Bump it (`-v3`, `-v4`, …) in the same commit as any change to
the HTML, CSS, JS or `data/zipcodes.json`.

The worker caches the shell and nothing else: map tiles, radar frames and the
lightning socket are cross-origin and pass straight through, untouched.

---

## ZIP code data

`data/zipcodes.json` covers **`CONFIG.logBounds` plus a 1 degree margin** — 935
ZIPs across Arizona and the border strips of NV, UT, CO, NM and CA. That is
41 KB raw, ~13 KB gzipped, small enough to precache; the full US table would be
1.85 MB. A ZIP outside the box reports that it is out of area and points the
user at the coordinate fields — home outside the tracked box would never see a
strike anyway.

Schema: `{ "zips": { "85234": [lat, lon, city, state], ... } }`.

To regenerate it — a one-off, not a build step:

```bash
pip install zipcodes
python3 - <<'EOF'
import zipcodes, json
rows = [z for z in zipcodes.list_all()
        if z.get('lat') and z.get('long') and z.get('active', True)]
sel = sorted((z for z in rows
              if 30.0 <= float(z['lat']) <= 38.5
              and -116.5 <= float(z['long']) <= -107.0),
             key=lambda z: z['zip_code'])
zips = {z['zip_code']: [round(float(z['lat']), 4), round(float(z['long']), 4),
                        z['city'], z['state']] for z in sel}
json.dump({"count": len(zips), "zips": zips},
          open("data/zipcodes.json", "w"), separators=(",", ":"))
EOF
```

Widen the latitude/longitude filter to cover more of the country, and widen
`CONFIG.logBounds` to match — the two are meant to agree.

## How the feed works

Blitzortung.org runs public WebSocket servers (`ws1`, `ws3`, `ws7`, `ws8`) that
carry worldwide strikes in near real time.

- The server sends nothing until it receives the handshake `{"a":111}`.
- Every frame is a JSON string packed with a dictionary-LZW variant. `js/lzw.js`
  holds the known-good decoder for this feed — it is not interchangeable with a
  generic LZW library.
- `time` is a Unix epoch in **nanoseconds**; divide by 1e6 for milliseconds.
- The stream is global and can exceed tens of strikes a second. Every frame is
  decoded, but only strikes inside `CONFIG.logBounds` (roughly Arizona) reach
  the map, the history log or the alert checker. Everything else is dropped on
  arrival.
- Reconnects use 2/4/8/16/30-second backoff and rotate to the next server on
  each attempt. A 60-second watchdog reconnects a socket that has gone quiet,
  and returning to the foreground reconnects immediately — iOS Safari suspends
  WebSockets in background tabs.

Basemap tiles are Esri and use `{z}/{y}/{x}` (row before column). The IEM radar
tiles use standard `{z}/{x}/{y}`. Copying one template onto the other scrambles
the map.

---

## Attribution

Required, and shown in the map corner and the info sheet:

- Lightning data: **Blitzortung.org and contributors** (non-commercial use)
- Radar: **NOAA NEXRAD** via **Iowa Environmental Mesonet**
- Imagery: **Esri, Maxar, Earthstar Geographics**

Blitzortung data may not be used commercially.

---

## Optional: a 24/7 strike collector (not built)

The Hotspots tab only logs strikes while the app is open. A GitHub Actions job
could sample the feed around the clock and publish `data/hotspots.json` — a
rolling 30-day aggregation binned to a 0.02° grid, schema
`{ "updated": <iso>, "bins": [[lat, lon, count], ...] }`. The app already
fetches that file and merges its bins into the heatmap with `count` as the
weight; a 404 is expected and handled silently (it is requested at most once
per page load, the first time the Hotspots tab opens, so devtools logs one
harmless 404 until the file exists), and the file can appear later with no code
change.

Worth knowing before building it: Actions cron is best-effort and often runs
late, so coverage would be sampled rather than continuous; public repos get
Actions minutes free; and each push to the Pages branch triggers a Pages
rebuild, which stays within limits at roughly two per hour. Committing to a
fixed data commit (`git commit --amend` + `push --force`) or a dedicated `data`
branch keeps history from growing by ~1,400 commits a month.
