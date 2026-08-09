import type { AppState, Settings, SwingTrack, Track } from "./types";

export const STORAGE_KEY = "ss-coach:state";
export const CORRUPT_BACKUP_KEY = "ss-coach:corrupt-backup";
export const SCHEMA_VERSION = 2;

export function defaultSettings(): Settings {
  return {
    units: "kg",
    sound: true,
    vibration: true,
    theme: "dark",
    trainingDays: [1, 2, 3, 4, 6], // Mon–Thu + Sat: 5 days/week default
  };
}

export function defaultSwingTrack(base = 16): SwingTrack {
  return {
    base,
    next: null,
    heavyCount: 0,
    qualityStreak: 0,
    owned: [],
    checklist: {},
    style: "two-arm",
  };
}

export function defaultGetupTrack(base = 8): Track {
  return {
    base,
    next: null,
    heavyCount: 0,
    qualityStreak: 0,
    owned: [],
    checklist: {},
  };
}

export function defaultState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: null,
    settings: defaultSettings(),
    swings: defaultSwingTrack(),
    getups: defaultGetupTrack(),
    sessions: [],
    active: null,
    celebrated: [],
  };
}

/**
 * Migrations run in order from the stored version up to SCHEMA_VERSION.
 * migrations[n] upgrades version n to n+1. Version 0 covers any pre-release
 * or unknown payload: keep what parses, fill the rest with defaults.
 */
const migrations: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {
  0: (s) => ({ ...defaultState(), ...s, schemaVersion: 1 }),
  // v2: sessions gain workSec (time from first tap to last rep). Older logs
  // approximate it from start/finish, capped at 3 hours to defuse any
  // clock-jump artifacts baked into old data.
  1: (s) => {
    const sessions = Array.isArray(s.sessions) ? (s.sessions as Record<string, unknown>[]) : [];
    return {
      ...s,
      sessions: sessions.map((sess) => {
        if (typeof sess.workSec === "number") return sess;
        const started = typeof sess.startedAt === "number" ? sess.startedAt : 0;
        const finished = typeof sess.finishedAt === "number" ? sess.finishedAt : started;
        const sec = Math.round((finished - started) / 1000);
        return { ...sess, workSec: Math.min(Math.max(sec, 0), 3 * 3600) };
      }),
      schemaVersion: 2,
    };
  },
};

export function migrate(raw: Record<string, unknown>): AppState {
  let v = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
  let s = raw;
  while (v < SCHEMA_VERSION) {
    const step = migrations[v];
    if (!step) break;
    s = step(s);
    v = typeof s.schemaVersion === "number" ? (s.schemaVersion as number) : v + 1;
  }
  // Merge over defaults so missing branches never crash the app.
  const d = defaultState();
  const out = { ...d, ...(s as Partial<AppState>) };
  out.schemaVersion = SCHEMA_VERSION;
  out.settings = { ...d.settings, ...(out.settings ?? {}) };
  out.swings = { ...d.swings, ...(out.swings ?? {}) };
  out.getups = { ...d.getups, ...(out.getups ?? {}) };
  if (!Array.isArray(out.sessions)) out.sessions = [];
  if (!Array.isArray(out.celebrated)) out.celebrated = [];
  return out as AppState;
}

export interface LoadResult {
  state: AppState;
  /** set when stored data existed but could not be parsed */
  recoveredFromCorruption: boolean;
}

export function loadState(): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: defaultState(), recoveredFromCorruption: false };
  }
  if (raw === null) return { state: defaultState(), recoveredFromCorruption: false };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
    return { state: migrate(parsed), recoveredFromCorruption: false };
  } catch {
    // Preserve the bad payload for manual rescue rather than destroying it.
    try {
      localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      /* if even that fails there is nothing more we can do */
    }
    return { state: defaultState(), recoveredFromCorruption: true };
  }
}

export type SaveOutcome = "ok" | "quota" | "error";

export function saveState(state: AppState): SaveOutcome {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return "ok";
  } catch (e) {
    if (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      return "quota";
    }
    return "error";
  }
}

export function wipeAll(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CORRUPT_BACKUP_KEY);
  } catch {
    /* ignore */
  }
}
