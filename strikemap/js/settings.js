// Bottom sheets: the shared open/close mechanics, and the settings form.

import { CONFIG, updateSettings, saveSettings } from "./config.js";
import { formatDistance } from "./geo.js";
import {
  notificationsSupported, notificationPermission, requestNotificationPermission
} from "./alerts.js";

let openSheetEl = null;
let lastFocus = null;
let scrim = null;

function ensureScrim() {
  scrim = scrim || document.getElementById("scrim");
  return scrim;
}

export function openSheet(sheet) {
  if (!sheet || openSheetEl === sheet) return;
  if (openSheetEl) closeSheet();
  lastFocus = document.activeElement;
  openSheetEl = sheet;

  const el = ensureScrim();
  el.removeAttribute("hidden");
  sheet.removeAttribute("hidden");
  // Two frames: let `hidden` clear before the transform transition starts.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.classList.add("is-visible");
    sheet.classList.add("is-open");
  }));

  const focusTarget = sheet.querySelector("input, button, [tabindex]");
  focusTarget?.focus({ preventScroll: true });
  document.addEventListener("keydown", onKeydown);
}

export function closeSheet() {
  if (!openSheetEl) return;
  const sheet = openSheetEl;
  openSheetEl = null;
  sheet.classList.remove("is-open");
  ensureScrim().classList.remove("is-visible");
  document.removeEventListener("keydown", onKeydown);

  const finish = () => {
    sheet.setAttribute("hidden", "");
    if (!openSheetEl) ensureScrim().setAttribute("hidden", "");
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) finish(); else setTimeout(finish, 300);

  lastFocus?.focus?.({ preventScroll: true });
  lastFocus = null;
}

function onKeydown(event) {
  if (event.key === "Escape") closeSheet();
}

/**
 * Wire the settings sheet.
 * @param {object} deps
 * @param {() => Promise<{lat:number, lon:number}>} deps.locate   geolocation helper
 * @param {() => Promise<number>} deps.historyCount               rows currently stored
 * @param {() => Promise<void>} deps.clearHistory
 * @param {() => void} [deps.onHomeChange]
 */
export function initSettings(deps) {
  const sheet = document.getElementById("settings-sheet");
  const latInput = document.getElementById("home-lat");
  const lonInput = document.getElementById("home-lon");
  const homeStatus = document.getElementById("home-status");
  const radius = document.getElementById("alert-radius");
  const radiusLabel = document.getElementById("alert-radius-label");
  const soundToggle = document.getElementById("alert-sound");
  const notifyToggle = document.getElementById("alert-notify");
  const notifyStatus = document.getElementById("notify-status");
  const trailChoices = document.getElementById("trail-choices");
  const unitChoices = document.getElementById("unit-choices");
  const historyCountEl = document.getElementById("history-count");
  const clearButton = document.getElementById("history-clear");

  function paint() {
    latInput.value = CONFIG.home.lat.toFixed(4);
    lonInput.value = CONFIG.home.lon.toFixed(4);
    radius.value = String(Math.round(CONFIG.alertRadiusMiles));
    radiusLabel.textContent = formatDistance(CONFIG.alertRadiusMiles, CONFIG.units);
    soundToggle.checked = CONFIG.alertSound;

    for (const button of trailChoices.querySelectorAll("[data-trail]")) {
      button.setAttribute("aria-checked", String(Number(button.dataset.trail) === CONFIG.trailMinutes));
    }
    for (const button of unitChoices.querySelectorAll("[data-units]")) {
      button.setAttribute("aria-checked", String(button.dataset.units === CONFIG.units));
    }
    paintNotify();
  }

  function paintNotify() {
    const permission = notificationPermission();
    notifyToggle.checked = permission === "granted";
    notifyToggle.disabled = permission === "denied" || permission === "unsupported";
    if (permission === "unsupported") {
      notifyStatus.textContent = "This browser does not support notifications. Banners and sound still work.";
    } else if (permission === "denied") {
      notifyStatus.textContent = "Notifications are blocked for this site in your browser settings.";
    } else if (permission === "granted") {
      notifyStatus.textContent = "Nearby strikes also raise a system notification while the app is open.";
    } else {
      notifyStatus.textContent = "Off. Turn on to also get a system notification for nearby strikes.";
    }
  }

  async function paintHistory() {
    try {
      const count = await deps.historyCount();
      historyCountEl.textContent = count
        ? `${count.toLocaleString()} strikes logged in the last ${CONFIG.hotspotDays} days.`
        : "No strikes logged yet.";
    } catch {
      historyCountEl.textContent = "History unavailable in this browser.";
    }
  }

  document.getElementById("btn-settings").addEventListener("click", () => {
    paint();
    paintHistory();
    openSheet(sheet);
  });

  for (const button of document.querySelectorAll("[data-close-sheet]")) {
    button.addEventListener("click", closeSheet);
  }
  ensureScrim().addEventListener("click", closeSheet);

  document.getElementById("home-save").addEventListener("click", () => {
    const lat = Number(latInput.value);
    const lon = Number(lonInput.value);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lon) || lon < -180 || lon > 180) {
      homeStatus.textContent = "Enter a latitude between -90 and 90 and a longitude between -180 and 180.";
      return;
    }
    updateSettings({ home: { lat, lon } });
    homeStatus.textContent = `Home saved: ${lat.toFixed(4)}, ${lon.toFixed(4)}.`;
    deps.onHomeChange?.();
  });

  document.getElementById("home-use-gps").addEventListener("click", async () => {
    homeStatus.textContent = "Getting your location…";
    try {
      const position = await deps.locate();
      latInput.value = position.lat.toFixed(4);
      lonInput.value = position.lon.toFixed(4);
      homeStatus.textContent = "Filled in from GPS. Tap “Save home location” to keep it.";
    } catch (err) {
      homeStatus.textContent = err?.code === 1
        ? "Location permission was denied."
        : "Could not get your location.";
    }
  });

  trailChoices.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trail]");
    if (!button) return;
    updateSettings({ trailMinutes: Number(button.dataset.trail) });
    paint();
  });

  unitChoices.addEventListener("click", (event) => {
    const button = event.target.closest("[data-units]");
    if (!button) return;
    updateSettings({ units: button.dataset.units });
    paint();
  });

  radius.addEventListener("input", () => {
    CONFIG.alertRadiusMiles = Number(radius.value);
    radiusLabel.textContent = formatDistance(CONFIG.alertRadiusMiles, CONFIG.units);
  });
  radius.addEventListener("change", () => {
    updateSettings({ alertRadiusMiles: Number(radius.value) });
  });

  soundToggle.addEventListener("change", () => {
    updateSettings({ alertSound: soundToggle.checked });
  });

  notifyToggle.addEventListener("change", async () => {
    if (!notifyToggle.checked) {
      // Permission cannot be revoked from script; explain where it lives.
      notifyStatus.textContent = notificationsSupported() && Notification.permission === "granted"
        ? "Turn notifications off for this site in your browser settings."
        : "Off.";
      paintNotify();
      return;
    }
    const permission = await requestNotificationPermission();
    paintNotify();
    if (permission === "denied") {
      notifyStatus.textContent = "Notifications are blocked for this site in your browser settings.";
    }
  });

  clearButton.addEventListener("click", async () => {
    clearButton.disabled = true;
    try {
      await deps.clearHistory();
      await paintHistory();
    } finally {
      clearButton.disabled = false;
    }
  });

  paint();
  saveSettings();
  return { paint, paintHistory };
}
