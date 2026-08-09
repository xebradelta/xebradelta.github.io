import type { Units } from "./types";

/**
 * Standard kettlebell sizes, kg — offered as quick presets when building a
 * bell library, and used as the fallback picker list for users who haven't
 * added any bells. 0 stands in for "no bell" on get-ups.
 */
export const BELL_SIZES = [8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48] as const;

export const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/**
 * All weights are stored internally in kg, rounded to 3 decimals so bells
 * entered in pounds round-trip exactly (5 lb → 2.268 kg → "5 lb").
 */
export function normalizeKg(kg: number): number {
  return Math.round(kg * 1000) / 1000;
}

/** Sorted, deduped bell inventory. */
export function normalizeBells(bells: number[]): number[] {
  return [...new Set(bells.map(normalizeKg).filter((b) => b > 0))].sort((a, b) => a - b);
}

/**
 * The picker/progression ladder: the user's own bells, or the standard kg
 * sizes when they haven't added any yet.
 */
export function bellLadder(owned: number[]): number[] {
  const inv = normalizeBells(owned);
  return inv.length > 0 ? inv : [...BELL_SIZES];
}

/** Snap an arbitrary kg value to the nearest bell on the ladder. */
export function snapToBell(kg: number, owned: number[] = []): number {
  if (kg <= 0) return 0;
  const ladder = bellLadder(owned);
  let best = ladder[0];
  for (const size of ladder) {
    if (Math.abs(size - kg) < Math.abs(best - kg)) best = size;
  }
  return best;
}

/** Next heavier bell on the user's ladder, or null at the top. */
export function nextBell(kg: number, owned: number[] = []): number | null {
  const ladder = bellLadder(owned);
  for (const size of ladder) {
    if (size > kg + 1e-9) return size;
  }
  return null;
}

/** Next lighter bell on the user's ladder, or null at the bottom. */
export function prevBell(kg: number, owned: number[] = []): number | null {
  const ladder = bellLadder(owned);
  let best: number | null = null;
  for (const size of ladder) {
    if (size < kg - 1e-9) best = size;
  }
  return best;
}

function trimNumber(n: number, decimals: number): string {
  return String(Number(n.toFixed(decimals)));
}

/**
 * "24 kg" or "53 lb" (or "no bell" for 0). Pounds render as whole numbers
 * when they are whole (the common case for lb-native bells); kg shows up to
 * one decimal so a 5 lb bell reads "2.3 kg", not "2.26796185 kg".
 */
export function formatWeight(kg: number, units: Units): string {
  if (kg === 0) return "no bell";
  if (units === "lb") {
    const lb = kgToLb(kg);
    const rounded = Math.round(lb);
    // show one decimal only when the value is meaningfully non-whole
    return Math.abs(lb - rounded) < 0.05 ? `${rounded} lb` : `${trimNumber(lb, 1)} lb`;
  }
  return `${trimNumber(kg, 1)} kg`;
}

/** Short numeric form for tight UI spots: "24" or "53". */
export function formatWeightShort(kg: number, units: Units): string {
  if (kg === 0) return "—";
  if (units === "lb") {
    const lb = kgToLb(kg);
    const rounded = Math.round(lb);
    return Math.abs(lb - rounded) < 0.05 ? String(rounded) : trimNumber(lb, 1);
  }
  return trimNumber(kg, 1);
}
