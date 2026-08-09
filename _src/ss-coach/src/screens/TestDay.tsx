import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { navigate } from "../router";
import { WeightPicker } from "../components/ui";
import {
  evaluateTest,
  standardWeights,
  STANDARD_LABELS,
  TEST_GETUP_LIMIT,
  TEST_REST,
  TEST_SWING_LIMIT,
} from "../lib/program";
import { acquireWakeLock, playCue, releaseWakeLock, unlockAudio, vibrate } from "../lib/cues";
import { formatClock, localDateISO, safeElapsedSec } from "../lib/time";
import { formatWeight } from "../lib/weights";
import type { SessionLog, Standard, TestResult } from "../lib/types";

type Stage = "setup" | "swings" | "rest" | "getups" | "result";

export default function TestDay() {
  const { state, update } = useStore();
  const { settings, profile } = state;
  const sex = profile?.sex ?? "male";
  const simple = standardWeights(sex, "simple");

  const [stage, setStage] = useState<Stage>("setup");
  const [swingWeight, setSwingWeight] = useState(state.swings.next ?? state.swings.base);
  const [getupWeight, setGetupWeight] = useState(
    Math.max(8, state.getups.next ?? state.getups.base)
  );
  const [swingReps, setSwingReps] = useState(0);
  const [getupReps, setGetupReps] = useState(0);
  const [stageStart, setStageStart] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [swingTime, setSwingTime] = useState(0);
  const [getupTime, setGetupTime] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const startedAtRef = useRef(0);
  const lastCueSecRef = useRef(-1);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => releaseWakeLock(), []);

  const elapsed = stage === "setup" || stage === "result" ? 0 : safeElapsedSec(stageStart, now);
  const limit =
    stage === "swings" ? TEST_SWING_LIMIT : stage === "rest" ? TEST_REST : TEST_GETUP_LIMIT;
  const remaining = Math.max(0, limit - elapsed);

  // countdown cues: warn at 30s, tick the last 5 seconds
  useEffect(() => {
    if (stage === "setup" || stage === "result") return;
    const whole = Math.ceil(remaining);
    if (whole !== lastCueSecRef.current) {
      lastCueSecRef.current = whole;
      if (whole === 30 && stage !== "rest") playCue("warn", settings.sound);
      if (whole <= 5 && whole > 0) playCue("tick", settings.sound);
    }
  }, [remaining, stage, settings.sound]);

  // stage transitions on expiry
  useEffect(() => {
    if (stage === "swings" && remaining <= 0) {
      setSwingTime(TEST_SWING_LIMIT);
      enterRest();
    } else if (stage === "rest" && remaining <= 0) {
      enterGetups();
    } else if (stage === "getups" && remaining <= 0) {
      finish(getupReps, TEST_GETUP_LIMIT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0, stage]);

  function begin() {
    unlockAudio();
    acquireWakeLock();
    startedAtRef.current = Date.now();
    setSwingReps(0);
    setGetupReps(0);
    setStage("swings");
    setStageStart(Date.now());
    playCue("go", settings.sound);
    vibrate(80, settings.vibration);
  }

  function enterRest() {
    playCue("done", settings.sound);
    vibrate([60, 60, 60], settings.vibration);
    setStage("rest");
    setStageStart(Date.now());
  }

  function enterGetups() {
    playCue("go", settings.sound);
    vibrate(80, settings.vibration);
    setStage("getups");
    setStageStart(Date.now());
  }

  function addSwings(n: number) {
    vibrate(30, settings.vibration);
    const next = Math.min(100, swingReps + n);
    setSwingReps(next);
    if (next >= 100) {
      setSwingTime(safeElapsedSec(stageStart, Date.now()));
      enterRest();
    }
  }

  function addGetup() {
    vibrate(30, settings.vibration);
    const next = getupReps + 1;
    setGetupReps(next);
    if (next >= 10) {
      finish(next, safeElapsedSec(stageStart, Date.now()));
    }
  }

  function finish(finalGetups: number, finalGetupTime: number) {
    releaseWakeLock();
    const r = evaluateTest(sex, {
      swingWeight,
      getupWeight,
      swingReps,
      swingTimeSec: Math.round(swingTime || TEST_SWING_LIMIT),
      getupReps: finalGetups,
      getupTimeSec: Math.round(finalGetupTime),
      restHeld: true,
    });
    setGetupTime(finalGetupTime);
    setResult(r);
    setStage("result");
    playCue(r.passed ? "celebrate" : "done", settings.sound);

    const log: SessionLog = {
      id: `t-${Date.now().toString(36)}`,
      dateISO: localDateISO(),
      startedAt: startedAtRef.current,
      finishedAt: Date.now(),
      kind: "test",
      swings:
        swingReps > 0
          ? [{ weight: swingWeight, reps: swingReps, style: "one-arm", side: "B" as const }]
          : [],
      getups: Array.from({ length: finalGetups }, (_, i) => ({
        weight: getupWeight,
        side: i % 2 === 0 ? ("L" as const) : ("R" as const),
      })),
      warmupDone: false,
      cooldownDone: false,
      crisp: null,
      rpe: null,
      notes: "",
      test: r,
    };
    const newStandards = r.achieved.filter((s: Standard) => !state.celebrated.includes(s));
    update((s) => ({
      ...s,
      sessions: [...s.sessions, log],
      celebrated: [...s.celebrated, ...newStandards.filter((x) => !s.celebrated.includes(x))],
    }));
  }

  function abort() {
    releaseWakeLock();
    navigate("today");
  }

  /* ————— render ————— */

  if (stage === "setup") {
    return (
      <div className="stack" style={{ paddingTop: "1rem" }}>
        <span className="kicker">Test day</span>
        <h1>The timed test</h1>
        <p className="dim">
          100 one-arm swings in 5:00, exactly one minute of rest, then 10
          get-ups in 10:00. Same weights throughout. This is an occasional
          check, not the daily practice — most days, leave the clock alone.
        </p>
        <div className="card stack">
          <div className="field">
            <label>Swing bell</label>
            <WeightPicker
              label="Swing test weight"
              units={settings.units}
              value={swingWeight}
              onChange={setSwingWeight}
              highlight={profile?.bells ?? []}
            />
          </div>
          <div className="field">
            <label>Get-up bell</label>
            <WeightPicker
              label="Get-up test weight"
              units={settings.units}
              value={getupWeight}
              onChange={setGetupWeight}
              highlight={profile?.bells ?? []}
            />
          </div>
          <p className="faint small">
            {STANDARD_LABELS["simple"]} for you:{" "}
            {formatWeight(simple.swings, settings.units)} swings /{" "}
            {formatWeight(simple.getups, settings.units)} get-ups.{" "}
            {STANDARD_LABELS["sinister"]}:{" "}
            {formatWeight(standardWeights(sex, "sinister").swings, settings.units)} /{" "}
            {formatWeight(standardWeights(sex, "sinister").getups, settings.units)}.
          </p>
        </div>
        <button className="btn primary big" onClick={begin}>
          Start the clock
        </button>
        <button className="btn subtle" onClick={abort}>
          Back
        </button>
      </div>
    );
  }

  if (stage === "result" && result) {
    return (
      <div className="stack" style={{ paddingTop: "1rem" }}>
        <span className="kicker">Test result</span>
        <h1>{result.passed ? STANDARD_LABELS[result.achieved[result.achieved.length - 1]] + " — passed" : "Not this time"}</h1>
        <div className="card stack">
          <div className="row between">
            <span className="dim">Swings</span>
            <strong className="num">
              {result.swingReps}/100 · {formatClock(result.swingTimeSec)} ·{" "}
              {formatWeight(result.swingWeight, settings.units)}
            </strong>
          </div>
          <div className="row between">
            <span className="dim">Get-ups</span>
            <strong className="num">
              {result.getupReps}/10 · {formatClock(getupTime)} ·{" "}
              {formatWeight(result.getupWeight, settings.units)}
            </strong>
          </div>
        </div>
        <p className="dim">
          {result.passed
            ? "Earned, not given. Log it, rest tomorrow, and keep practicing like it never happened."
            : "The test only measures what practice already built. Back to quiet, near-daily sessions — the numbers will come."}
        </p>
        <button className="btn primary big" onClick={() => navigate("today")}>
          Done
        </button>
      </div>
    );
  }

  // live stages
  const stageInfo =
    stage === "swings"
      ? { label: "Swings", sub: `${swingReps} / 100 reps` }
      : stage === "rest"
        ? { label: "Rest", sub: "One minute. Breathe." }
        : { label: "Get-ups", sub: `${getupReps} / 10 reps` };

  return (
    <div className="session-screen">
      <div className="session-top">
        <span className="phase-label">Test · {stageInfo.label}</span>
        <button className="btn subtle small" onClick={abort}>
          Abandon
        </button>
      </div>
      <div className="giant-stage">
        <span className="giant-sub">{stageInfo.sub}</span>
        <div
          className="giant-number num"
          role="timer"
          aria-label={`${stageInfo.label} time remaining`}
          style={remaining <= 30 && stage !== "rest" ? { color: "var(--warn)" } : undefined}
        >
          {formatClock(remaining)}
        </div>
        {stage === "swings" && (
          <>
            <button className="tap-big" onClick={() => addSwings(10)}>
              +10 swings
            </button>
            <button className="btn" onClick={() => addSwings(5)}>
              +5
            </button>
          </>
        )}
        {stage === "rest" && (
          <p className="dim small">Get-ups start automatically when the minute is up.</p>
        )}
        {stage === "getups" && (
          <>
            <p className="dim small">
              {getupReps % 2 === 0 ? "Left" : "Right"} side next.
            </p>
            <button className="tap-big" onClick={addGetup}>
              Get-up done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
