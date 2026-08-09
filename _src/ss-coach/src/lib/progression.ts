import type {
  PlannedSwingSet,
  SessionLog,
  SwingTrack,
  Track,
} from "./types";
import { GETUP_REPS, SWING_SETS } from "./program";
import { nextBell } from "./weights";

/**
 * Step loading, as S&S applies it: once a weight is owned, the next bell
 * enters a little at a time. The heavy units come first in the session,
 * while you are fresh; everything after stays at the old weight. Over weeks
 * the heavy share grows until the new bell takes all ten, and the cycle
 * restarts.
 */

export const OWNERSHIP_CHECKLIST = [
  {
    key: "crisp",
    label: "Every rep of every set is powerful and crisp — first rep to last",
  },
  {
    key: "talk-test",
    label: "Rests are comfortable: you pass the talk test without long waits",
  },
  {
    key: "consistent",
    label: "It has felt this way for several sessions in a row, not just one",
  },
] as const;

export function checklistComplete(t: Track): boolean {
  return OWNERSHIP_CHECKLIST.every((c) => t.checklist[c.key]);
}

/** The 10 swing sets prescribed for the next session. Heavy sets first. */
export function prescribeSwings(t: SwingTrack): PlannedSwingSet[] {
  const sets: PlannedSwingSet[] = [];
  for (let i = 0; i < SWING_SETS; i++) {
    const heavy = t.next !== null && i < t.heavyCount;
    sets.push({ weight: heavy ? (t.next as number) : t.base, style: t.style });
  }
  return sets;
}

/** Weight for each of the 10 get-up reps (alternating sides). Heavy first. */
export function prescribeGetups(t: Track): number[] {
  const reps: number[] = [];
  for (let i = 0; i < GETUP_REPS; i++) {
    const heavy = t.next !== null && i < t.heavyCount;
    reps.push(heavy ? (t.next as number) : t.base);
  }
  return reps;
}

export type Advice =
  | { kind: "hold"; reason: string }
  | { kind: "start-step"; to: number; reason: string }
  | { kind: "add-heavy"; count: number; reason: string }
  | { kind: "complete-step"; to: number; reason: string };

/**
 * What the engine would do next for a track. Purely advisory — the user can
 * apply it with one tap or override everything by hand. The ladder climbed
 * is the user's own bell inventory (standard sizes if they have none).
 */
export function advise(
  t: Track,
  lift: "swings" | "getups",
  ownedBells: number[] = [],
  fmt: (kg: number) => string = (kg) => `${kg} kg`
): Advice {
  const unit = lift === "swings" ? "sets" : "reps";
  if (t.next === null) {
    const up = nextBell(t.base, ownedBells);
    if (up === null) {
      return {
        kind: "hold",
        reason:
          ownedBells.length > 0
            ? `The ${fmt(t.base)} is the heaviest bell you've added. Own it, enjoy it — and add the next bell in Settings when you find one.`
            : "You are at the top of the standard sizes. Own it and enjoy it.",
      };
    }
    if (!checklistComplete(t)) {
      return {
        kind: "hold",
        reason: `Keep practicing at ${fmt(t.base)}. When every ${unit.slice(0, -1)} is crisp across several sessions, tick off the ownership checklist and the ${fmt(up)} can start coming in.`,
      };
    }
    if (t.qualityStreak < 2) {
      return {
        kind: "hold",
        reason: `Checklist done — bank a couple more crisp sessions at ${fmt(t.base)}, then bring in the ${fmt(up)}.`,
      };
    }
    const bigJump = t.base > 0 && (up - t.base) / t.base > 0.34;
    return {
      kind: "start-step",
      to: up,
      reason: bigJump
        ? `You own the ${fmt(t.base)}. The ${fmt(up)} is a sizeable jump, so start it with just the first two ${unit} of the day, while you are fresh — and be patient growing from there.`
        : `You own the ${fmt(t.base)}. Start the ${fmt(up)} with the first two ${unit} of the day, while you are fresh.`,
    };
  }
  // Mid-step: grow the heavy share once the current mix feels crisp.
  const cap = lift === "swings" ? SWING_SETS : GETUP_REPS;
  if (t.heavyCount >= cap) {
    return {
      kind: "complete-step",
      to: t.next,
      reason: `All ${cap} ${unit} are at ${fmt(t.next)} — the step is complete. ${fmt(t.next)} is your new working weight.`,
    };
  }
  if (t.qualityStreak >= 2) {
    return {
      kind: "add-heavy",
      count: Math.min(cap, t.heavyCount + 2),
      reason: `The current mix has been crisp for ${t.qualityStreak} sessions. Add two more heavy ${unit} (one per side).`,
    };
  }
  return {
    kind: "hold",
    reason: `Stay with ${t.heavyCount} heavy ${unit} until it feels crisp for a couple of sessions in a row.`,
  };
}

/** Apply an advice action to a track, returning the updated track. */
export function applyAdvice<T extends Track>(t: T, a: Advice): T {
  switch (a.kind) {
    case "hold":
      return t;
    case "start-step":
      return { ...t, next: a.to, heavyCount: 2, qualityStreak: 0 };
    case "add-heavy":
      return { ...t, heavyCount: a.count, qualityStreak: 0 };
    case "complete-step":
      return {
        ...t,
        base: a.to,
        next: null,
        heavyCount: 0,
        qualityStreak: 0,
        owned: t.owned.includes(t.base) ? t.owned : [...t.owned, t.base],
        checklist: {},
      };
  }
}

/**
 * Update quality streaks after a finished practice session. A session only
 * counts toward a track's streak if it was performed as prescribed (same
 * weights) and the user called it crisp.
 */
export function registerSession<T extends Track>(
  t: T,
  session: SessionLog,
  lift: "swings" | "getups"
): T {
  if (session.kind !== "practice" || session.crisp !== true) {
    return session.crisp === false ? { ...t, qualityStreak: 0 } : t;
  }
  const weights =
    lift === "swings"
      ? session.swings.map((s) => s.weight)
      : session.getups.map((g) => g.weight);
  if (weights.length === 0) return t;
  const expected =
    lift === "swings"
      ? prescribeSwings(t as unknown as SwingTrack).map((s) => s.weight)
      : prescribeGetups(t);
  const matches =
    weights.length === expected.length &&
    weights.every((w, i) => w === expected[i]);
  return matches ? { ...t, qualityStreak: t.qualityStreak + 1 } : t;
}
