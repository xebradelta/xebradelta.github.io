import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { navigate } from "../router";
import { Sheet, WeightPicker } from "../components/ui";
import type {
  ActiveSession,
  GetupRepLog,
  SessionLog,
  Side,
  Standard,
  SwingSetLog,
} from "../lib/types";
import {
  COOLDOWN_MOVES,
  GETUP_REPS,
  SWING_REPS,
  SWING_SETS,
  WARMUP_MOVES,
  WARMUP_ROUNDS,
  detectTimelessSimple,
  STANDARD_LABELS,
} from "../lib/program";
import { prescribeGetups, prescribeSwings, registerSession } from "../lib/progression";
import { acquireWakeLock, playCue, releaseWakeLock, unlockAudio, vibrate } from "../lib/cues";
import { formatClock, localDateISO, safeElapsedSec, formatDateHuman } from "../lib/time";
import { formatWeightShort } from "../lib/weights";

/** Relaxed get-up pace: roughly one rep per minute. */
const GETUP_PACE_SEC = 60;

function newActiveSession(
  plannedSwings: ActiveSession["plannedSwings"],
  plannedGetups: number[]
): ActiveSession {
  return {
    id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "practice",
    dateISO: localDateISO(),
    startedAt: Date.now(),
    touchedAt: Date.now(),
    phase: "warmup",
    warmupRound: 1,
    warmupMove: 0,
    warmupSkipped: false,
    plannedSwings,
    plannedGetups,
    swingsDone: [],
    getupsDone: [],
    restStartedAt: null,
    getupRepStartedAt: null,
    lastRepAt: null,
    cooldownDone: false,
  };
}

export default function Session() {
  const { state, update } = useStore();
  const { settings } = state;
  const active = state.active;
  const [now, setNow] = useState(Date.now());
  const [showQuit, setShowQuit] = useState(false);
  const [showWeightPick, setShowWeightPick] = useState(false);
  // summary form
  const [crisp, setCrisp] = useState<boolean | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [justEarned, setJustEarned] = useState<Standard | null>(null);
  const [saved, setSaved] = useState(false);

  // Create the session on first visit; keep the screen wake-locked while here.
  useEffect(() => {
    unlockAudio();
    acquireWakeLock();
    if (!state.active) {
      const swings = prescribeSwings(state.swings);
      const getups = prescribeGetups(state.getups);
      update((s) => ({ ...s, active: newActiveSession(swings, getups) }));
    }
    return () => releaseWakeLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick for rest timers.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const touch = (fn: (a: ActiveSession) => ActiveSession) =>
    update((s) =>
      s.active ? { ...s, active: { ...fn(s.active), touchedAt: Date.now() } } : s
    );

  const restSec = active?.restStartedAt
    ? safeElapsedSec(active.restStartedAt, now, 3600)
    : 0;

  // Rest-cue: gentle tone as rests reach a minute, once.
  const [cuedRestFor, setCuedRestFor] = useState<number | null>(null);
  useEffect(() => {
    if (!active?.restStartedAt) {
      setCuedRestFor(null);
      return;
    }
    if (restSec >= 60 && cuedRestFor !== active.restStartedAt) {
      setCuedRestFor(active.restStartedAt);
      playCue("tick", settings.sound);
    }
  }, [restSec, active?.restStartedAt, cuedRestFor, settings.sound]);

  // Get-up pacer: ~one rep a minute. Subtle cue when the minute elapses.
  const paceStartedAt = active?.getupRepStartedAt ?? null;
  const paceSec = paceStartedAt ? safeElapsedSec(paceStartedAt, now, 3600) : 0;
  const [cuedPaceFor, setCuedPaceFor] = useState<number | null>(null);
  useEffect(() => {
    if (!paceStartedAt) {
      setCuedPaceFor(null);
      return;
    }
    if (paceSec >= GETUP_PACE_SEC && cuedPaceFor !== paceStartedAt) {
      setCuedPaceFor(paceStartedAt);
      playCue("tick", settings.sound);
      vibrate(50, settings.vibration);
    }
  }, [paceSec, paceStartedAt, cuedPaceFor, settings.sound, settings.vibration]);

  // Working time: first tap (session start) to most recent rep.
  const elapsedWorkSec = active
    ? safeElapsedSec(active.startedAt, active.phase === "cooldown" || active.phase === "summary" ? (active.lastRepAt ?? now) : now)
    : 0;

  const swingSide: Side | "B" = useMemo(() => {
    if (!active) return "B";
    const i = active.swingsDone.length;
    const style = active.plannedSwings[Math.min(i, SWING_SETS - 1)]?.style ?? "two-arm";
    return style === "two-arm" ? "B" : i % 2 === 0 ? "L" : "R";
  }, [active]);

  if (!active) {
    return <p className="dim" style={{ padding: "2rem 0" }}>Setting up…</p>;
  }

  const today = localDateISO();
  const rolledOver = active.dateISO !== today && active.phase !== "summary";

  /* ————— phase handlers ————— */

  function warmupAdvance() {
    vibrate(30, settings.vibration);
    touch((a) => {
      if (a.warmupMove < WARMUP_MOVES.length - 1) {
        return { ...a, warmupMove: a.warmupMove + 1 };
      }
      if (a.warmupRound < WARMUP_ROUNDS) {
        return { ...a, warmupRound: a.warmupRound + 1, warmupMove: 0 };
      }
      playCue("go", settings.sound);
      return { ...a, phase: "swings", restStartedAt: null };
    });
  }

  function logSwingSet(reps: number, weightOverride?: number) {
    const i = active!.swingsDone.length;
    if (i >= SWING_SETS) return;
    const plan = active!.plannedSwings[i];
    const entry: SwingSetLog = {
      weight: weightOverride ?? plan.weight,
      reps,
      style: plan.style,
      side: plan.style === "two-arm" ? "B" : i % 2 === 0 ? "L" : "R",
    };
    vibrate([40, 60, 40], settings.vibration);
    touch((a) => {
      const done = [...a.swingsDone, entry];
      if (done.length >= SWING_SETS) {
        playCue("done", settings.sound);
        return {
          ...a,
          swingsDone: done,
          phase: "transition",
          restStartedAt: Date.now(),
          lastRepAt: Date.now(),
        };
      }
      return { ...a, swingsDone: done, restStartedAt: Date.now(), lastRepAt: Date.now() };
    });
  }

  function nextSwingSet() {
    playCue("go", settings.sound);
    vibrate(40, settings.vibration);
    touch((a) => ({ ...a, restStartedAt: null }));
  }

  function startGetups() {
    playCue("go", settings.sound);
    touch((a) => ({
      ...a,
      phase: "getups",
      restStartedAt: null,
      getupRepStartedAt: Date.now(),
    }));
  }

  function logGetup(weightOverride?: number) {
    const i = active!.getupsDone.length;
    if (i >= GETUP_REPS) return;
    const entry: GetupRepLog = {
      weight: weightOverride ?? active!.plannedGetups[i],
      side: i % 2 === 0 ? "L" : "R",
    };
    vibrate([40, 60, 40], settings.vibration);
    touch((a) => {
      const done = [...a.getupsDone, entry];
      if (done.length >= GETUP_REPS) {
        playCue("done", settings.sound);
        return {
          ...a,
          getupsDone: done,
          phase: "cooldown",
          getupRepStartedAt: null,
          lastRepAt: Date.now(),
        };
      }
      return { ...a, getupsDone: done, getupRepStartedAt: Date.now(), lastRepAt: Date.now() };
    });
  }

  function toSummary(cooldownDone: boolean) {
    touch((a) => ({ ...a, cooldownDone, phase: "summary" }));
  }

  function saveSession() {
    if (!active || saved) return;
    setSaved(true);
    const log: SessionLog = {
      id: active.id,
      dateISO: active.dateISO,
      startedAt: active.startedAt,
      finishedAt: Date.now(),
      kind: "practice",
      swings: active.swingsDone,
      getups: active.getupsDone,
      warmupDone: !active.warmupSkipped,
      cooldownDone: active.cooldownDone,
      crisp,
      rpe,
      notes: notes.trim(),
      workSec: Math.round(
        safeElapsedSec(active.startedAt, active.lastRepAt ?? Date.now(), 3 * 3600)
      ),
    };
    // Detect milestones against the current render state, then apply the
    // update as a pure function (side effects don't belong in updaters).
    const earned: Standard | null =
      state.profile &&
      !state.celebrated.includes("timeless-simple") &&
      detectTimelessSimple(state.profile, log.swings, log.getups)
        ? "timeless-simple"
        : null;
    update((s) => ({
      ...s,
      swings: registerSession(s.swings, log, "swings"),
      getups: registerSession(s.getups, log, "getups"),
      sessions: [...s.sessions, log],
      active: null,
      celebrated:
        earned && !s.celebrated.includes(earned) ? [...s.celebrated, earned] : s.celebrated,
    }));
    if (earned) {
      playCue("celebrate", settings.sound);
      vibrate([80, 60, 80, 60, 160], settings.vibration);
      setJustEarned(earned);
    } else {
      navigate("today");
    }
  }

  function discardSession() {
    update((s) => ({ ...s, active: null }));
    navigate("today");
  }

  /* ————— render ————— */

  const phaseTitle: Record<string, string> = {
    warmup: "Warm-up",
    swings: "Swings",
    transition: "Breathe",
    getups: "Get-ups",
    cooldown: "Cooldown",
    summary: "Done",
  };

  if (justEarned) {
    return (
      <div className="giant-stage">
        <span className="kicker">Milestone</span>
        <h1 style={{ fontSize: "2.2rem" }}>{STANDARD_LABELS[justEarned]}</h1>
        <p className="dim">
          A full session at the standard weights, no clock, every rep yours.
          That is the goal most people never reach. Quietly impressive.
        </p>
        <button className="btn primary big" onClick={() => navigate("today")}>
          Carry on
        </button>
      </div>
    );
  }

  return (
    <div className="session-screen">
      <div className="session-top">
        <span className="phase-label">{phaseTitle[active.phase]}</span>
        <span className="phase-label num" aria-label="Session time">
          {formatClock(elapsedWorkSec)}
        </span>
        <button className="btn subtle small" onClick={() => setShowQuit(true)}>
          End
        </button>
      </div>

      {rolledOver && (
        <div className="banner warn small" role="alert">
          This session started {formatDateHuman(active.dateISO)}. Finishing it
          will log it on that date — or end it and start fresh.
        </div>
      )}

      {active.phase === "warmup" && (
        <WarmupStage
          round={active.warmupRound}
          move={active.warmupMove}
          onDone={warmupAdvance}
          onSkip={() => {
            touch((a) => ({ ...a, warmupSkipped: true, phase: "swings" }));
            playCue("go", settings.sound);
          }}
        />
      )}

      {active.phase === "swings" && active.restStartedAt === null && (
        <div className="giant-stage">
          <span className="giant-sub">
            Set {active.swingsDone.length + 1} of {SWING_SETS}
            {swingSide !== "B" ? ` · ${swingSide === "L" ? "Left" : "Right"} arm` : " · Two-arm"}
          </span>
          <div className="giant-number num">
            {formatWeightShort(
              active.plannedSwings[active.swingsDone.length]?.weight ?? 0,
              settings.units
            )}
            <span style={{ fontSize: "0.35em", color: "var(--ink-dim)" }}>
              {" "}
              {settings.units}
            </span>
          </div>
          <button
            className="btn subtle small"
            onClick={() => setShowWeightPick(true)}
            aria-label="Change weight for this set"
          >
            change bell
          </button>
          <SetDots
            total={SWING_SETS}
            done={active.swingsDone.length}
            heavyCount={
              state.swings.next !== null
                ? active.plannedSwings.filter((p) => p.weight !== state.swings.base).length
                : 0
            }
          />
          <button className="tap-big" onClick={() => logSwingSet(SWING_REPS)}>
            {SWING_REPS} swings done
          </button>
          <PartialSetControl onLog={(n) => logSwingSet(n)} />
        </div>
      )}

      {active.phase === "swings" && active.restStartedAt !== null && (
        <RestStage
          seconds={restSec}
          title={`Rest · then set ${active.swingsDone.length + 1} of ${SWING_SETS}`}
          onNext={nextSwingSet}
          nextLabel="I can talk — swing"
        />
      )}

      {active.phase === "transition" && (
        <RestStage
          seconds={restSec}
          title="Swings done. Breathe for about a minute."
          onNext={startGetups}
          nextLabel="Start get-ups"
        />
      )}

      {active.phase === "getups" && (
        <div className="giant-stage">
          <span className="giant-sub">
            Get-up {active.getupsDone.length + 1} of {GETUP_REPS} ·{" "}
            {active.getupsDone.length % 2 === 0 ? "Left" : "Right"} side
          </span>
          <div className="giant-number num">
            {active.plannedGetups[active.getupsDone.length] === 0
              ? "—"
              : formatWeightShort(
                  active.plannedGetups[active.getupsDone.length] ?? 0,
                  settings.units
                )}
            <span style={{ fontSize: "0.35em", color: "var(--ink-dim)" }}>
              {" "}
              {active.plannedGetups[active.getupsDone.length] === 0 ? "no bell" : settings.units}
            </span>
          </div>
          <button
            className="btn subtle small"
            onClick={() => setShowWeightPick(true)}
            aria-label="Change weight for this rep"
          >
            change bell
          </button>
          <SetDots total={GETUP_REPS} done={active.getupsDone.length} heavyCount={0} />
          <GetupPacer seconds={paceSec} />
          <p className="dim small">Slow is smooth. About one rep a minute.</p>
          <button className="tap-big" onClick={() => logGetup()}>
            Rep done
          </button>
        </div>
      )}

      {active.phase === "cooldown" && (
        <div className="giant-stage" style={{ justifyContent: "center" }}>
          <span className="giant-sub">Optional cooldown</span>
          <div className="stack" style={{ textAlign: "left", width: "100%" }}>
            {COOLDOWN_MOVES.map((mv) => (
              <div className="card" key={mv.key}>
                <strong>{mv.name}</strong>
                <p className="dim small">{mv.cue}</p>
              </div>
            ))}
          </div>
          <button className="tap-big" onClick={() => toSummary(true)}>
            Stretched — wrap up
          </button>
          <button className="tap-big secondary" onClick={() => toSummary(false)}>
            Skip cooldown
          </button>
        </div>
      )}

      {active.phase === "summary" && (
        <div className="stack" style={{ paddingTop: "0.5rem" }}>
          <h1>Session summary</h1>
          <div className="card stack">
            <div className="row between">
              <span className="dim">Swings</span>
              <strong className="num">
                {active.swingsDone.reduce((n, s) => n + s.reps, 0)} reps ·{" "}
                {summarizeWeights(active.swingsDone.map((s) => s.weight), settings.units)}
              </strong>
            </div>
            <div className="row between">
              <span className="dim">Get-ups</span>
              <strong className="num">
                {active.getupsDone.length} reps ·{" "}
                {summarizeWeights(active.getupsDone.map((g) => g.weight), settings.units)}
              </strong>
            </div>
            <div className="row between">
              <span className="dim">Working time</span>
              <strong className="num">{formatClock(elapsedWorkSec)}</strong>
            </div>
          </div>
          <div className="field">
            <label>Was every rep powerful and crisp, with comfortable rests?</label>
            <div className="seg" role="group" aria-label="Session quality">
              <button aria-pressed={crisp === true} onClick={() => setCrisp(true)}>
                Yes, all crisp
              </button>
              <button aria-pressed={crisp === false} onClick={() => setCrisp(false)}>
                Not quite
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="rpe">Effort (RPE 1–10, optional)</label>
            <input
              id="rpe"
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              value={rpe ?? ""}
              onChange={(e) =>
                setRpe(e.target.value === "" ? null : Math.max(1, Math.min(10, +e.target.value)))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Grip felt strong. Left side get-up smoother than last week."
            />
          </div>
          <button className="btn primary big" onClick={saveSession} disabled={saved}>
            Save session
          </button>
        </div>
      )}

      {/* weight override sheet */}
      <Sheet
        open={showWeightPick}
        onClose={() => setShowWeightPick(false)}
        label="Change bell for this set"
      >
        <div className="stack">
          <h2>Log a different bell</h2>
          <p className="dim small">
            Only this {active.phase === "getups" ? "rep" : "set"} — the plan is
            unchanged.
          </p>
          <WeightPicker
            label="Bell weight"
            units={settings.units}
            allowNone={active.phase === "getups"}
            value={
              active.phase === "getups"
                ? active.plannedGetups[active.getupsDone.length] ?? 0
                : active.plannedSwings[active.swingsDone.length]?.weight ?? 16
            }
            bells={state.profile?.bells ?? []}
            onChange={(kg) => {
              setShowWeightPick(false);
              if (active.phase === "getups") logGetup(kg);
              else logSwingSet(SWING_REPS, kg);
            }}
          />
          <button className="btn subtle" onClick={() => setShowWeightPick(false)}>
            Cancel
          </button>
        </div>
      </Sheet>

      {/* quit sheet */}
      <Sheet open={showQuit} onClose={() => setShowQuit(false)} label="End session">
        <div className="stack">
          <h2>End this session?</h2>
          <p className="dim small">
            {active.swingsDone.length + active.getupsDone.length > 0
              ? "You can save what you've done so far, or discard the whole session."
              : "Nothing logged yet — discarding loses nothing."}
          </p>
          {active.swingsDone.length + active.getupsDone.length > 0 && (
            <button
              className="btn primary"
              onClick={() => {
                setShowQuit(false);
                touch((a) => ({ ...a, phase: "summary" }));
              }}
            >
              Save partial session
            </button>
          )}
          <button
            className="btn danger"
            onClick={() => {
              setShowQuit(false);
              discardSession();
            }}
          >
            Discard session
          </button>
          <button className="btn subtle" onClick={() => setShowQuit(false)}>
            Keep going
          </button>
        </div>
      </Sheet>
    </div>
  );
}

/* ————— sub-components ————— */

function WarmupStage({
  round,
  move,
  onDone,
  onSkip,
}: {
  round: number;
  move: number;
  onDone: () => void;
  onSkip: () => void;
}) {
  const mv = WARMUP_MOVES[move];
  return (
    <div className="giant-stage">
      <span className="giant-sub">
        Round {round} of {WARMUP_ROUNDS}
      </span>
      <h1 style={{ fontSize: "2rem" }}>{mv.name}</h1>
      <p className="dim" style={{ fontWeight: 700 }}>
        {mv.reps}
      </p>
      <p className="dim small" style={{ maxWidth: "28rem" }}>
        {mv.cue}
      </p>
      <button className="tap-big" onClick={onDone}>
        Done
      </button>
      <button className="btn subtle" onClick={onSkip}>
        Skip warm-up
      </button>
    </div>
  );
}

function RestStage({
  seconds,
  title,
  onNext,
  nextLabel,
}: {
  seconds: number;
  title: string;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div className="giant-stage">
      <span className="giant-sub">{title}</span>
      <div className="giant-number rest-ring" aria-live="off">
        {formatClock(seconds)}
      </div>
      <p className="dim small" style={{ maxWidth: "26rem" }}>
        Talk test: when you can say a full sentence out loud without gasping,
        you're ready. No rushing, no dawdling.
      </p>
      <button className="tap-big" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

function SetDots({
  total,
  done,
  heavyCount,
}: {
  total: number;
  done: number;
  heavyCount: number;
}) {
  return (
    <div className="set-dots" aria-label={`${done} of ${total} complete`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={`${i < done ? "done" : ""} ${i < heavyCount ? "heavy" : ""}`} />
      ))}
    </div>
  );
}

function PartialSetControl({ onLog }: { onLog: (reps: number) => void }) {
  const [open, setOpen] = useState(false);
  const [reps, setReps] = useState(5);
  if (!open) {
    return (
      <button className="btn subtle small" onClick={() => setOpen(true)}>
        log fewer reps
      </button>
    );
  }
  return (
    <div className="row" aria-label="Log a partial set">
      <button
        className="btn"
        aria-label="Fewer reps"
        onClick={() => setReps((r) => Math.max(1, r - 1))}
      >
        −
      </button>
      <strong className="num" style={{ minWidth: "3ch", textAlign: "center" }}>
        {reps}
      </strong>
      <button
        className="btn"
        aria-label="More reps"
        onClick={() => setReps((r) => Math.min(9, r + 1))}
      >
        +
      </button>
      <button
        className="btn primary"
        onClick={() => {
          setOpen(false);
          onLog(reps);
        }}
      >
        Log {reps}
      </button>
    </div>
  );
}

function summarizeWeights(ws: number[], units: "kg" | "lb"): string {
  if (ws.length === 0) return "—";
  const uniq = [...new Set(ws)];
  if (uniq.length === 1) {
    return uniq[0] === 0 ? "no bell" : `${formatWeightShort(uniq[0], units)} ${units}`;
  }
  return `${formatWeightShort(Math.min(...uniq), units)}–${formatWeightShort(Math.max(...uniq), units)} ${units}`;
}

/**
 * The get-up pacer: a bar that drains over the relaxed one-rep minute.
 * Guidance, not a deadline — it just sits empty once the minute is gone.
 */
function GetupPacer({ seconds }: { seconds: number }) {
  const remaining = Math.max(0, 1 - seconds / GETUP_PACE_SEC);
  return (
    <div
      className="pacer"
      role="img"
      aria-label={`About ${Math.max(0, Math.round(GETUP_PACE_SEC - seconds))} seconds left in this rep's minute`}
    >
      <i style={{ width: `${remaining * 100}%` }} />
    </div>
  );
}
