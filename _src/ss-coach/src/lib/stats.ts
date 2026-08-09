import type { SessionLog } from "./types";
import { addDays, daysBetween, localDateISO } from "./time";

export function sessionTonnage(s: SessionLog): number {
  const swings = s.swings.reduce((t, set) => t + set.weight * set.reps, 0);
  const getups = s.getups.reduce((t, g) => t + g.weight, 0);
  return swings + getups;
}

export interface Streaks {
  current: number;
  best: number;
  thisWeekCount: number;
}

/**
 * Streak = consecutive calendar days with a completed session, ending today
 * or yesterday (a rest day doesn't kill it until a second day passes —
 * near-daily practice allows a breather).
 */
export function computeStreaks(sessions: SessionLog[], today = localDateISO()): Streaks {
  const days = [...new Set(sessions.map((s) => s.dateISO))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev !== null && daysBetween(prev, d) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  let current = 0;
  if (days.length > 0) {
    const last = days[days.length - 1];
    const gap = daysBetween(last, today);
    if (gap <= 1) {
      current = 1;
      let i = days.length - 1;
      while (i > 0 && daysBetween(days[i - 1], days[i]) === 1) {
        current++;
        i--;
      }
    }
  }
  // Sessions this week (week starts Monday).
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0=Sun
  const monday = addDays(today, -((dow + 6) % 7));
  const thisWeekCount = sessions.filter(
    (s) => s.dateISO >= monday && s.dateISO <= today
  ).length;
  return { current, best, thisWeekCount };
}

export interface PersonalRecords {
  heaviestSwing: number;
  heaviestGetup: number;
  bestWeekSessions: number;
  totalSessions: number;
  totalSwingReps: number;
  totalGetupReps: number;
  totalTonnage: number;
}

export function computePRs(sessions: SessionLog[]): PersonalRecords {
  let heaviestSwing = 0;
  let heaviestGetup = 0;
  let totalSwingReps = 0;
  let totalGetupReps = 0;
  let totalTonnage = 0;
  const weekCounts = new Map<string, number>();
  for (const s of sessions) {
    for (const set of s.swings) {
      if (set.weight > heaviestSwing) heaviestSwing = set.weight;
      totalSwingReps += set.reps;
    }
    for (const g of s.getups) {
      if (g.weight > heaviestGetup) heaviestGetup = g.weight;
      totalGetupReps++;
    }
    totalTonnage += sessionTonnage(s);
    const wk = isoWeekKey(s.dateISO);
    weekCounts.set(wk, (weekCounts.get(wk) ?? 0) + 1);
  }
  let bestWeekSessions = 0;
  for (const n of weekCounts.values()) if (n > bestWeekSessions) bestWeekSessions = n;
  return {
    heaviestSwing,
    heaviestGetup,
    bestWeekSessions,
    totalSessions: sessions.length,
    totalSwingReps,
    totalGetupReps,
    totalTonnage,
  };
}

export function sessionWorkSec(s: SessionLog): number {
  if (typeof s.workSec === "number" && s.workSec > 0) return s.workSec;
  return Math.min(Math.max(Math.round((s.finishedAt - s.startedAt) / 1000), 0), 3 * 3600);
}

export interface TimeTotals {
  weekSec: number;
  monthSec: number;
  allSec: number;
}

/** Accumulated working time: current week (Mon-based), calendar month, ever. */
export function computeTimeTotals(sessions: SessionLog[], today = localDateISO()): TimeTotals {
  const [y, m, d] = today.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0=Mon
  const monday = addDays(today, -dow);
  const monthPrefix = today.slice(0, 7); // "YYYY-MM"
  let weekSec = 0;
  let monthSec = 0;
  let allSec = 0;
  for (const s of sessions) {
    const sec = sessionWorkSec(s);
    allSec += sec;
    if (s.dateISO >= monday && s.dateISO <= today) weekSec += sec;
    if (s.dateISO.startsWith(monthPrefix)) monthSec += sec;
  }
  return { weekSec, monthSec, allSec };
}

/** "47 min" under an hour, then "3 h 20 min". */
export function formatDuration(totalSec: number): string {
  const min = Math.round(totalSec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

/** Monday-based week key like "2026-W32" (approximate ISO week, stable). */
export function isoWeekKey(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = (date.getUTCDay() + 6) % 7; // 0=Mon
  date.setUTCDate(date.getUTCDate() - dow + 3); // Thursday of this week
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
