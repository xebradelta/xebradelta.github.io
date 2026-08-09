export type Sex = "male" | "female";
export type AgeRange = "under40" | "40s" | "50s" | "60plus";
export type Condition = "deconditioned" | "average" | "trained";
export type SwingStyle = "two-arm" | "one-arm";
export type Units = "kg" | "lb";
export type Theme = "dark" | "light";
export type Side = "L" | "R";

export interface Profile {
  sex: Sex;
  ageRange: AgeRange;
  condition: Condition;
  /** bells the user actually owns, kg */
  bells: number[];
  painFlags: string[];
  createdAt: number;
}

export interface Settings {
  units: Units;
  sound: boolean;
  vibration: boolean;
  theme: Theme;
  /** days of week the user plans to train, 0=Sunday */
  trainingDays: number[];
}

export interface SwingSetLog {
  weight: number;
  reps: number;
  style: SwingStyle;
  /** which arm for one-arm sets; "B" = both (two-arm) */
  side: Side | "B";
}

export interface GetupRepLog {
  /** 0 = no bell (or shoe balance practice) */
  weight: number;
  side: Side;
}

export type Standard = "timeless-simple" | "simple" | "sinister";

export interface TestResult {
  swingWeight: number;
  getupWeight: number;
  swingReps: number;
  swingTimeSec: number;
  getupReps: number;
  getupTimeSec: number;
  /** rest between events held to one minute */
  restHeld: boolean;
  achieved: Standard[];
  passed: boolean;
}

export interface SessionLog {
  id: string;
  /** local calendar date the session started, YYYY-MM-DD */
  dateISO: string;
  startedAt: number;
  finishedAt: number;
  kind: "practice" | "test";
  swings: SwingSetLog[];
  getups: GetupRepLog[];
  warmupDone: boolean;
  cooldownDone: boolean;
  /** user's own call: every rep powerful and crisp, rests comfortable */
  crisp: boolean | null;
  rpe: number | null;
  notes: string;
  test?: TestResult;
}

/** One progression track. Swings and get-ups progress independently. */
export interface Track {
  /** current working weight, kg */
  base: number;
  /** heavier bell being introduced via step loading, or null */
  next: number | null;
  /**
   * How many of the day's 10 units (swing sets / get-up reps) use the
   * heavier bell. Heavy work comes first, while fresh.
   */
  heavyCount: number;
  /** consecutive crisp sessions at the current base/next/heavyCount config */
  qualityStreak: number;
  /** weights fully owned (every unit crisp for several sessions) */
  owned: number[];
  /** own-the-weight checklist state for the current base weight */
  checklist: Record<string, boolean>;
}

export interface SwingTrack extends Track {
  style: SwingStyle;
}

export type Phase =
  | "warmup"
  | "swings"
  | "transition"
  | "getups"
  | "cooldown"
  | "summary";

export interface PlannedSwingSet {
  weight: number;
  style: SwingStyle;
}

export interface ActiveSession {
  id: string;
  kind: "practice";
  dateISO: string;
  startedAt: number;
  /** last time the session was touched; used to detect stale resumes */
  touchedAt: number;
  phase: Phase;
  /** warm-up: 3 rounds x 3 movements */
  warmupRound: number;
  warmupMove: number;
  warmupSkipped: boolean;
  plannedSwings: PlannedSwingSet[];
  plannedGetups: number[]; // weight per rep, 10 entries
  swingsDone: SwingSetLog[];
  getupsDone: GetupRepLog[];
  /** wall-clock ms when the current rest began, or null when not resting */
  restStartedAt: number | null;
  cooldownDone: boolean;
}

export interface AppState {
  schemaVersion: number;
  profile: Profile | null;
  settings: Settings;
  swings: SwingTrack;
  getups: Track;
  sessions: SessionLog[];
  active: ActiveSession | null;
  /** standards already celebrated, so we congratulate once */
  celebrated: Standard[];
}
