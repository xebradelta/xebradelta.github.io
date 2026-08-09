import type { AppState } from "./types";
import { migrate, SCHEMA_VERSION } from "./storage";

export interface BackupFile {
  app: "ss-coach";
  exportedAt: string;
  schemaVersion: number;
  state: AppState;
}

export function exportBackup(state: AppState): string {
  const file: BackupFile = {
    app: "ss-coach",
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    state,
  };
  return JSON.stringify(file, null, 2);
}

export type ImportResult =
  | { ok: true; state: AppState; sessionCount: number }
  | { ok: false; error: string };

/**
 * Parse and validate an imported backup. Accepts both wrapped backup files
 * and a bare state object (belt and braces for hand-edited files). Anything
 * unparseable or structurally wrong is rejected with a readable message —
 * a bad import must never clobber good data.
 */
export function parseBackup(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON. Nothing was changed." };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "That file doesn't look like an S&S Coach backup. Nothing was changed." };
  }
  const obj = parsed as Record<string, unknown>;
  const candidate =
    obj.app === "ss-coach" && typeof obj.state === "object" && obj.state !== null
      ? (obj.state as Record<string, unknown>)
      : obj;
  // A plausible state has at least one of these branches.
  if (
    !("sessions" in candidate) &&
    !("profile" in candidate) &&
    !("swings" in candidate)
  ) {
    return { ok: false, error: "That file doesn't look like an S&S Coach backup. Nothing was changed." };
  }
  try {
    const state = migrate(candidate);
    // Drop malformed session entries instead of failing the whole import.
    state.sessions = state.sessions.filter(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.dateISO === "string" &&
        Array.isArray(s.swings) &&
        Array.isArray(s.getups)
    );
    return { ok: true, state, sessionCount: state.sessions.length };
  } catch {
    return { ok: false, error: "The backup couldn't be read safely. Nothing was changed." };
  }
}

export function downloadBackup(state: AppState): void {
  const blob = new Blob([exportBackup(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ss-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
