// Blitzortung.org live lightning feed.
//
// The servers say nothing until they receive the {"a":111} handshake. Every
// frame after that is a JSON string packed with the dictionary-LZW variant in
// lzw.js. Strike times arrive as Unix epoch *nanoseconds*.
//
// Data: Blitzortung.org and contributors — non-commercial use only.

import { lzwDecode } from "./lzw.js";

const SERVERS = [
  "wss://ws1.blitzortung.org/",
  "wss://ws3.blitzortung.org/",
  "wss://ws7.blitzortung.org/",
  "wss://ws8.blitzortung.org/"
];

const HANDSHAKE = JSON.stringify({ a: 111 });
const BACKOFF_MS = [2000, 4000, 8000, 16000, 30000];
const WATCHDOG_MS = 60000;      // no frames for this long => the socket is dead
const WATCHDOG_TICK_MS = 5000;
const DEBUG_SAMPLES = 2;        // log this many decoded objects, once, for field checks

/**
 * @param {object} opts
 * @param {(strike: {t:number, lat:number, lon:number}) => void} opts.onStrike
 *        called for every decoded strike worldwide — the caller filters
 * @param {(status: {state:string, server:string, since:number}) => void} [opts.onStatus]
 */
export function createFeed({ onStrike, onStatus }) {
  let ws = null;
  let serverIndex = Math.floor(Math.random() * SERVERS.length);
  let attempt = 0;
  let retryTimer = null;
  let watchdogTimer = null;
  let lastMessageAt = 0;
  let debugLeft = DEBUG_SAMPLES;
  let stopped = true;
  let state = "idle";
  let totalStrikes = 0;

  function setState(next) {
    if (state === next) return;
    state = next;
    onStatus?.({ state, server: SERVERS[serverIndex], since: Date.now(), total: totalStrikes });
  }

  function clearTimers() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (watchdogTimer) { clearInterval(watchdogTimer); watchdogTimer = null; }
  }

  function teardownSocket() {
    if (!ws) return;
    // Drop the handlers first so a close we caused does not schedule a retry.
    ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
    try { ws.close(); } catch { /* already closing */ }
    ws = null;
  }

  function scheduleReconnect(immediate = false) {
    if (stopped) return;
    if (retryTimer) {
      // An immediate request (foreground, network back, watchdog) preempts a
      // pending backoff — otherwise the app sits out the rest of the wait.
      if (!immediate) return;
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    const delay = immediate ? 0 : BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
    attempt = immediate ? 0 : attempt + 1;
    setState("connecting");
    retryTimer = setTimeout(() => {
      retryTimer = null;
      serverIndex = (serverIndex + 1) % SERVERS.length;   // rotate on every attempt
      connect();
    }, delay);
  }

  function connect() {
    if (stopped) return;
    teardownSocket();
    setState("connecting");
    const url = SERVERS[serverIndex];
    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.warn("feed: could not open", url, err);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      attempt = 0;
      lastMessageAt = Date.now();
      try { ws.send(HANDSHAKE); } catch (err) { console.warn("feed: handshake failed", err); }
      setState("live");
      startWatchdog();
    };

    ws.onmessage = (event) => {
      lastMessageAt = Date.now();
      if (state !== "live") setState("live");
      const data = event.data;
      if (typeof data === "string") {
        handleFrame(data);
      } else if (data instanceof Blob) {
        data.text().then(handleFrame).catch(() => { /* skip */ });
      } else if (data instanceof ArrayBuffer) {
        handleFrame(new TextDecoder().decode(data));
      }
    };

    ws.onerror = () => {
      // onclose always follows; reconnect is handled there.
    };

    ws.onclose = () => {
      ws = null;
      if (stopped) return;
      setState("offline");
      scheduleReconnect();
    };
  }

  function handleFrame(raw) {
    let strike;
    try {
      const json = lzwDecode(raw);
      const obj = JSON.parse(json);
      if (debugLeft > 0) {
        debugLeft--;
        const { sig, ...rest } = obj;
        console.debug("[feed] decoded strike sample", rest, "sig entries:", Array.isArray(sig) ? sig.length : 0);
      }
      if (obj && Array.isArray(obj.sig)) obj.sig = null;   // drop the heavy part immediately
      const t = Math.floor(obj.time / 1e6);                // nanoseconds -> milliseconds
      const lat = obj.lat;
      const lon = obj.lon;
      if (!Number.isFinite(t) || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
      strike = { t, lat, lon };
    } catch {
      return;   // a malformed frame must never break the stream
    }
    totalStrikes++;
    try {
      onStrike(strike);
    } catch (err) {
      console.warn("feed: strike handler threw", err);
    }
  }

  function startWatchdog() {
    if (watchdogTimer) clearInterval(watchdogTimer);
    watchdogTimer = setInterval(() => {
      if (stopped || !ws) return;
      if (Date.now() - lastMessageAt > WATCHDOG_MS) {
        console.debug("[feed] watchdog: no data for 60s, reconnecting");
        teardownSocket();
        setState("offline");
        scheduleReconnect(true);
      }
    }, WATCHDOG_TICK_MS);
  }

  // iOS Safari suspends sockets in background tabs; rebuild on the way back.
  function onVisible() {
    if (stopped || document.visibilityState !== "visible") return;
    if (!ws || ws.readyState > WebSocket.OPEN) {
      attempt = 0;
      scheduleReconnect(true);
    } else if (Date.now() - lastMessageAt > WATCHDOG_MS) {
      teardownSocket();
      scheduleReconnect(true);
    }
  }

  function onOnline() {
    if (stopped) return;
    attempt = 0;
    teardownSocket();
    scheduleReconnect(true);
  }

  function onOffline() {
    if (stopped) return;
    setState("offline");
  }

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      connect();
    },
    stop() {
      stopped = true;
      clearTimers();
      teardownSocket();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      setState("idle");
    },
    get state() { return state; },
    get server() { return SERVERS[serverIndex]; },
    get total() { return totalStrikes; }
  };
}
