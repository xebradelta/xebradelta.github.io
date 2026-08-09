import type {
  AgeRange,
  Condition,
  Profile,
  Sex,
  Standard,
  SwingStyle,
  TestResult,
} from "./types";
import { nextBell, snapToBell } from "./weights";

/** The fixed shape of every S&S practice session. */
export const WARMUP_MOVES = [
  {
    key: "goblet-squat",
    name: "Prying goblet squat",
    reps: "5 reps",
    cue: "Hold a light bell at the chest, sit deep between the heels, and use the elbows to gently pry the knees out. Stay tall through the chest and let the hips loosen a little more each rep.",
  },
  {
    key: "hip-bridge",
    name: "Hip bridge",
    reps: "5 reps",
    cue: "On your back, feet flat, drive through the heels and squeeze the glutes to lift the hips. Finish tall at the top without arching the lower back.",
  },
  {
    key: "halo",
    name: "Halo",
    reps: "5 each direction",
    cue: "Circle a light bell slowly around your head at collar height, keeping the ribs down and the elbows close. Switch direction halfway.",
  },
] as const;

export const WARMUP_ROUNDS = 3;

export const COOLDOWN_MOVES = [
  {
    key: "ql-straddle",
    name: "QL straddle stretch",
    cue: "Sit with legs wide, reach one arm overhead and lean sideways toward the opposite foot. Breathe slowly into the stretched side, then switch.",
  },
  {
    key: "90-90",
    name: "90/90 stretch",
    cue: "Sit with the front shin and rear shin each at right angles. Keep the chest tall and hinge slightly forward over the front leg until the hip releases. Switch sides.",
  },
] as const;

export const SWING_SETS = 10;
export const SWING_REPS = 10;
export const GETUP_REPS = 10;

/** Timed-test limits, seconds. */
export const TEST_SWING_LIMIT = 5 * 60;
export const TEST_REST = 60;
export const TEST_GETUP_LIMIT = 10 * 60;

export interface StandardWeights {
  swings: number;
  getups: number;
}

export function standardWeights(sex: Sex, standard: Standard): StandardWeights {
  if (standard === "sinister") {
    return sex === "male" ? { swings: 48, getups: 48 } : { swings: 32, getups: 24 };
  }
  // timeless-simple and simple share weights
  return sex === "male" ? { swings: 32, getups: 32 } : { swings: 24, getups: 16 };
}

export interface StartRecommendation {
  swings: number;
  getups: number;
  swingStyle: SwingStyle;
  /** getups may start unweighted for some users */
  getupsUnweightedFirst: boolean;
  note: string;
}

/**
 * Starting-weight guidance. Deliberately conservative: the program rewards
 * patient near-daily practice, not straining, so ties go to the lighter bell.
 */
export function recommendStart(
  sex: Sex,
  ageRange: AgeRange,
  condition: Condition
): StartRecommendation {
  const older = ageRange === "50s" || ageRange === "60plus";
  const decon = condition === "deconditioned";

  let rec: StartRecommendation;
  if (sex === "male") {
    if (decon || older) {
      rec = {
        swings: 16,
        getups: decon && older ? 8 : 12,
        swingStyle: "two-arm",
        getupsUnweightedFirst: false,
        note: "Start easy and groove the patterns. There is no prize for rushing the first month.",
      };
    } else {
      rec = {
        swings: 24,
        getups: 16,
        swingStyle: "two-arm",
        getupsUnweightedFirst: false,
        note: "A typical starting pair for a man in average shape. Two-arm swings first; go one-arm when your form is solid.",
      };
    }
  } else {
    if (decon || older) {
      rec = {
        swings: decon && older ? 8 : 12,
        getups: 8,
        swingStyle: "two-arm",
        getupsUnweightedFirst: true,
        note: "Practice the get-up with no bell first — or balance a shoe on your fist to learn a vertical arm — then pick up the 8 kg.",
      };
    } else {
      rec = {
        swings: 16,
        getups: 8,
        swingStyle: "two-arm",
        getupsUnweightedFirst: false,
        note: "A typical starting pair for a woman in average shape. Two-arm swings first; go one-arm when your form is solid.",
      };
    }
  }

  if (condition === "trained" && !older) {
    rec = {
      ...rec,
      swings: nextBell(rec.swings) ?? rec.swings,
      getups: nextBell(rec.getups) ?? rec.getups,
      swingStyle: "one-arm",
      note: "You lift already, so one size up is reasonable — but when in doubt, take the lighter bell. This program is won by showing up, not by grinding.",
    };
  }
  return rec;
}

/**
 * Snap a recommendation to bells the user actually owns: nearest owned size
 * at or below the recommendation, else the lightest owned bell.
 */
export function fitToOwnedBells(recKg: number, owned: number[]): number {
  if (owned.length === 0) return snapToBell(recKg);
  const sorted = [...owned].sort((a, b) => a - b);
  let best = sorted[0];
  for (const b of sorted) if (b <= recKg) best = b;
  return best;
}

export function evaluateTest(
  sex: Sex,
  r: Omit<TestResult, "achieved" | "passed">
): TestResult {
  const achieved: Standard[] = [];
  const simple = standardWeights(sex, "simple");
  const sinister = standardWeights(sex, "sinister");

  const completed =
    r.swingReps >= 100 &&
    r.getupReps >= 10 &&
    r.swingTimeSec <= TEST_SWING_LIMIT &&
    r.getupTimeSec <= TEST_GETUP_LIMIT &&
    r.restHeld;

  if (completed && r.swingWeight >= simple.swings && r.getupWeight >= simple.getups) {
    achieved.push("simple");
  }
  if (completed && r.swingWeight >= sinister.swings && r.getupWeight >= sinister.getups) {
    achieved.push("sinister");
  }
  return { ...r, achieved, passed: achieved.length > 0 };
}

/**
 * Detect Timeless Simple from an ordinary practice session: a complete
 * session — 100 swings, 10 get-ups — with every unit at or above the
 * standard weights for the user's sex. No clock involved.
 */
export function detectTimelessSimple(
  profile: Profile,
  swings: { weight: number; reps: number; style: SwingStyle }[],
  getups: { weight: number }[]
): boolean {
  const w = standardWeights(profile.sex, "timeless-simple");
  const swingReps = swings.reduce((n, s) => n + s.reps, 0);
  return (
    swingReps >= 100 &&
    getups.length >= 10 &&
    swings.every((s) => s.weight >= w.swings && s.style === "one-arm") &&
    getups.every((g) => g.weight >= w.getups)
  );
}

export const STANDARD_LABELS: Record<Standard, string> = {
  "timeless-simple": "Timeless Simple",
  simple: "Simple",
  sinister: "Sinister",
};
