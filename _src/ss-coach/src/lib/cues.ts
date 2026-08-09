/** Audio, vibration, and wake-lock helpers. All fail silently: cues are
 *  nice-to-have and must never break a workout. */

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a user gesture (e.g. session start) so iOS lets audio play. */
export function unlockAudio(): void {
  audioCtx();
}

function tone(freq: number, at: number, dur: number, gainValue = 0.25): void {
  const c = audioCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, c.currentTime + at);
    gain.gain.linearRampToValueAtTime(gainValue, c.currentTime + at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + at + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(c.currentTime + at);
    osc.stop(c.currentTime + at + dur + 0.05);
  } catch {
    /* ignore */
  }
}

export type Cue = "tick" | "go" | "warn" | "done" | "celebrate";

export function playCue(cue: Cue, enabled: boolean): void {
  if (!enabled) return;
  switch (cue) {
    case "tick":
      tone(880, 0, 0.08, 0.15);
      break;
    case "go":
      tone(660, 0, 0.12);
      tone(990, 0.14, 0.2);
      break;
    case "warn":
      tone(440, 0, 0.15);
      tone(440, 0.25, 0.15);
      break;
    case "done":
      tone(523, 0, 0.12);
      tone(659, 0.13, 0.12);
      tone(784, 0.26, 0.25);
      break;
    case "celebrate":
      tone(523, 0, 0.12);
      tone(659, 0.12, 0.12);
      tone(784, 0.24, 0.12);
      tone(1047, 0.36, 0.4);
      break;
  }
}

export function vibrate(pattern: number | number[], enabled: boolean): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

let wakeLock: WakeLockSentinel | null = null;
let wantLock = false;

async function requestLock(): Promise<void> {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    }
  } catch {
    /* not supported or denied — fine */
  }
}

/** Keep the screen on during a session. Re-acquires after tab switches. */
export function acquireWakeLock(): void {
  wantLock = true;
  void requestLock();
}

export function releaseWakeLock(): void {
  wantLock = false;
  try {
    void wakeLock?.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wantLock && !wakeLock) {
    void requestLock();
  }
});
