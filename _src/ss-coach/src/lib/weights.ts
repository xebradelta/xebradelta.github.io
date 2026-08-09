import type { Units } from "./types";

/** Standard kettlebell sizes, kg. 0 stands in for "no bell" on get-ups. */
export const BELL_SIZES = [8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48] as const;

export const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

/** Snap an arbitrary kg value to the nearest standard bell size. */
export function snapToBell(kg: number): number {
  if (kg <= 0) return 0;
  let best: number = BELL_SIZES[0];
  for (const size of BELL_SIZES) {
    if (Math.abs(size - kg) < Math.abs(best - kg)) best = size;
  }
  return best;
}

/** Next standard size up, or null at the top of the range. */
export function nextBell(kg: number): number | null {
  if (kg <= 0) return BELL_SIZES[0];
  const i = BELL_SIZES.indexOf(snapToBell(kg) as (typeof BELL_SIZES)[number]);
  return i >= 0 && i < BELL_SIZES.length - 1 ? BELL_SIZES[i + 1] : null;
}

/** Previous standard size down, or null at the bottom. */
export function prevBell(kg: number): number | null {
  const i = BELL_SIZES.indexOf(snapToBell(kg) as (typeof BELL_SIZES)[number]);
  return i > 0 ? BELL_SIZES[i - 1] : null;
}

/** "24 kg" or "53 lb" (or "no bell" for 0). */
export function formatWeight(kg: number, units: Units): string {
  if (kg === 0) return "no bell";
  if (units === "lb") return `${Math.round(kgToLb(kg))} lb`;
  return `${kg} kg`;
}

/** Short numeric form for tight UI spots: "24" or "53". */
export function formatWeightShort(kg: number, units: Units): string {
  if (kg === 0) return "—";
  return units === "lb" ? String(Math.round(kgToLb(kg))) : String(kg);
}
