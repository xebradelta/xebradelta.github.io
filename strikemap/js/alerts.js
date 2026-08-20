// Proximity alerts, foreground only.
//
// There is no server here, so there is no push. While the app is open every
// in-bounds strike is measured against home (or the located position) and a
// close one raises a banner, a thunder crack, and — if permission was granted
// from settings — a local notification.

import { CONFIG } from "./config.js";
import { haversineMiles, bearingDeg, compassPoint, formatDistance } from "./geo.js";

const RATE_LIMIT_MS = 30000;
const BANNER_MS = 8000;

let audioContext = null;
let audioUnlocked = false;

/** iOS will not play anything until an audio context is resumed inside a gesture. */
export function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    audioContext = audioContext || new Ctor();
    if (audioContext.state === "suspended") audioContext.resume();
    // A silent tick completes the unlock on iOS.
    const gain = audioContext.createGain();
    gain.gain.value = 0.0001;
    const osc = audioContext.createOscillator();
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.02);
    audioUnlocked = true;
  } catch (err) {
    console.debug("audio unlock failed", err);
  }
}

/** A short filtered noise burst — a thunder crack, no audio files needed. */
export function playThunder() {
  if (!audioContext || audioContext.state === "suspended") {
    try { audioContext?.resume(); } catch { /* ignore */ }
  }
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const duration = 0.9;

  const frames = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(1, frames, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  // Crack: a bright 150ms transient.
  const crackFilter = audioContext.createBiquadFilter();
  crackFilter.type = "bandpass";
  crackFilter.frequency.setValueAtTime(1800, now);
  crackFilter.frequency.exponentialRampToValueAtTime(500, now + 0.15);
  crackFilter.Q.value = 0.7;

  const crackGain = audioContext.createGain();
  crackGain.gain.setValueAtTime(0.0001, now);
  crackGain.gain.exponentialRampToValueAtTime(0.6, now + 0.01);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  // Rumble: the same noise, low-passed, decaying under the crack.
  const rumbleFilter = audioContext.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.setValueAtTime(220, now);
  rumbleFilter.frequency.exponentialRampToValueAtTime(90, now + duration);

  const rumbleGain = audioContext.createGain();
  rumbleGain.gain.setValueAtTime(0.0001, now);
  rumbleGain.gain.exponentialRampToValueAtTime(0.35, now + 0.06);
  rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(crackFilter).connect(crackGain).connect(audioContext.destination);
  source.connect(rumbleFilter).connect(rumbleGain).connect(audioContext.destination);
  source.start(now);
  source.stop(now + duration);
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

/** Called from the settings toggle only — never on load. */
export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.banner  the banner element under the header
 * @param {() => {lat:number, lon:number, label?:string}} opts.getOrigin
 */
export function createAlerts({ banner, getOrigin }) {
  let lastAlertAt = 0;
  let hideTimer = null;

  function show(text) {
    if (!banner) return;
    banner.textContent = text;
    banner.classList.add("is-visible");
    banner.removeAttribute("hidden");
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(dismiss, BANNER_MS);
  }

  function dismiss() {
    if (!banner) return;
    banner.classList.remove("is-visible");
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  /**
   * @returns {null | {miles:number, direction:string, text:string}} the alert
   * raised, or null when the strike was far away or the rate limit held.
   */
  function check(strike) {
    const origin = getOrigin();
    if (!origin) return null;
    const miles = haversineMiles(origin.lat, origin.lon, strike.lat, strike.lon);
    if (miles > CONFIG.alertRadiusMiles) return null;

    const now = Date.now();
    if (now - lastAlertAt < RATE_LIMIT_MS) return null;
    lastAlertAt = now;

    const direction = compassPoint(bearingDeg(origin.lat, origin.lon, strike.lat, strike.lon));
    const clock = new Date(strike.t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const where = origin.label || "home";
    const text = `Strike ${formatDistance(miles, CONFIG.units)} ${direction} of ${where}, ${clock}`;

    show(text);
    if (CONFIG.alertSound) playThunder();
    if (notificationsSupported() && Notification.permission === "granted") {
      try {
        new Notification("Lightning nearby", {
          body: text,
          icon: "./icons/icon-192.png",
          tag: "strikemap-proximity"
        });
      } catch (err) {
        console.debug("notification failed", err);
      }
    }
    return { miles, direction, text };
  }

  banner?.addEventListener("click", dismiss);

  return { check, dismiss, show };
}
