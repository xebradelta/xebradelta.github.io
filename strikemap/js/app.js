// Strike Map — entry point. Wires the feed to the map, the history store and
// the alert checker, and drives the three tabs.

import { CONFIG, loadSettings, inBounds, onSettingsChange } from "./config.js";
import { createFeed } from "./feed.js";
import {
  createMap, getMap, onceReady, addStrike, rebuild, strikeCount,
  locateUser, setDistanceOrigin, setOnRebuild
} from "./map.js";
import { createRadar } from "./radar.js";
import {
  createHotspots, logStrike, startMaintenance, countRows, clearHistory, flush
} from "./hotspots.js";
import { createAlerts, unlockAudio } from "./alerts.js";
import { initSettings, openSheet } from "./settings.js";

loadSettings();

const statusChip = document.getElementById("status-chip");
const emptyCard = document.getElementById("empty-hotspots");
const radarControls = document.getElementById("radar-controls");
const radarPlay = document.getElementById("radar-play");
const radarTime = document.getElementById("radar-time");
const segPill = document.querySelector(".seg-pill");
const tabs = Array.from(document.querySelectorAll(".seg"));

let activeTab = "latest";
let localStrikes = 0;
let userPosition = null;      // set once the user taps locate

const map = createMap("map");
const radar = createRadar(map, onRadarFrame);
const hotspots = createHotspots(map);

const alerts = createAlerts({
  banner: document.getElementById("alert-banner"),
  getOrigin: () => userPosition
    ? { lat: userPosition.lat, lon: userPosition.lon, label: "you" }
    : { lat: CONFIG.home.lat, lon: CONFIG.home.lon, label: "home" }
});

const feed = createFeed({
  onStrike: (strike) => {
    // The feed is worldwide. Everything outside the box is dropped right here.
    if (!inBounds(strike.lat, strike.lon)) return;
    localStrikes++;
    addStrike(strike);
    logStrike(strike);
    alerts.check(strike);
    paintStatus();
  },
  onStatus: paintStatus
});

/* ───────── status chip ───────── */

function paintStatus() {
  const state = feed.state;
  statusChip.dataset.state = state;
  const count = strikeCount();
  if (state === "live") {
    statusChip.textContent = count
      ? `Live · ${count} strike${count === 1 ? "" : "s"}`
      : "Live · waiting for strikes";
  } else if (state === "connecting") {
    statusChip.textContent = "Connecting…";
  } else if (state === "offline") {
    statusChip.textContent = "Reconnecting…";
  } else {
    statusChip.textContent = "Idle";
  }
}

/* ───────── tabs ───────── */

function movePill(index) {
  if (segPill) segPill.style.transform = `translateX(${index * 100}%)`;
}

async function selectTab(name) {
  const index = tabs.findIndex((tab) => tab.dataset.tab === name);
  if (index < 0) return;
  activeTab = name;
  tabs.forEach((tab, i) => {
    const on = i === index;
    tab.classList.toggle("is-active", on);
    tab.setAttribute("aria-selected", String(on));
  });
  movePill(index);

  if (name === "radar") {
    hotspots.deactivate();
    emptyCard.hidden = true;
    radarControls.hidden = false;
    radar.activate();
  } else {
    radar.deactivate();
    radarControls.hidden = true;
  }

  if (name === "hotspots") {
    const count = await hotspots.activate();
    emptyCard.hidden = count > 0;
  } else if (name !== "radar") {
    hotspots.deactivate();
    emptyCard.hidden = true;
  }
}

for (const tab of tabs) {
  tab.addEventListener("click", () => selectTab(tab.dataset.tab));
}

/* ───────── radar transport ───────── */

function onRadarFrame(frame) {
  radarTime.textContent = frame.minutesAgo === 0 ? `${frame.label} · now` : frame.label;
  radarPlay.dataset.playing = String(frame.playing);
  radarPlay.setAttribute("aria-label", frame.playing ? "Pause radar loop" : "Play radar loop");
}

radarPlay.addEventListener("click", () => radar.toggle());

/* ───────── header buttons ───────── */

document.getElementById("btn-locate").addEventListener("click", async () => {
  const button = document.getElementById("btn-locate");
  button.disabled = true;
  try {
    const position = await locateUser();
    userPosition = position;
    setDistanceOrigin({ lat: position.lat, lon: position.lon, label: "you" });
  } catch (err) {
    alerts.show(err?.code === 1
      ? "Location permission denied. Set home in Settings instead."
      : "Could not get your location.");
  } finally {
    button.disabled = false;
  }
});

document.getElementById("btn-info").addEventListener("click", () => {
  openSheet(document.getElementById("info-sheet"));
});

/* ───────── settings ───────── */

initSettings({
  locate: async () => {
    const position = await locateUser({ fly: false });
    userPosition = position;
    return position;
  },
  historyCount: countRows,
  clearHistory: async () => {
    await clearHistory();
    if (activeTab === "hotspots") {
      const count = await hotspots.activate();
      emptyCard.hidden = count > 0;
    }
  },
  onHomeChange: () => {
    if (!userPosition) setDistanceOrigin(null);
    getMap()?.flyTo({ center: [CONFIG.home.lon, CONFIG.home.lat] });
  }
});

onSettingsChange((_config, changed) => {
  if (changed.includes("trailMinutes")) rebuild();
});

/* ───────── lifecycle ───────── */

// iOS needs one gesture before any audio will play.
window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("touchstart", unlockAudio, { once: true });

onceReady(() => {
  paintStatus();
  if (activeTab === "radar") radar.activate();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  // Timers were suspended in the background: re-age the dots right away.
  rebuild();
  paintStatus();
});

// The chip counts what is actually drawn, so repaint after every rebuild.
setOnRebuild(paintStatus);
setInterval(paintStatus, 10000);

startMaintenance();
feed.start();
selectTab("latest");
paintStatus();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.debug("service worker registration failed", err);
    });
  });
}

window.addEventListener("pagehide", () => { flush(); });

// Handy in the console during a storm.
window.strikemap = { CONFIG, feed, radar, hotspots, map, get localStrikes() { return localStrikes; } };
