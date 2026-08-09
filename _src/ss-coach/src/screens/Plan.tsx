import { useState, type ReactNode } from "react";
import { useStore } from "../store";
import { Segmented, Sheet, WeightPicker } from "../components/ui";
import type { SwingTrack, Track } from "../lib/types";
import {
  advise,
  applyAdvice,
  OWNERSHIP_CHECKLIST,
  prescribeGetups,
  prescribeSwings,
} from "../lib/progression";
import { formatWeight, nextBell } from "../lib/weights";
import { GETUP_REPS, SWING_SETS } from "../lib/program";

export default function Plan() {
  const { state, update } = useStore();
  const { settings } = state;
  const [editing, setEditing] = useState<"swings" | "getups" | null>(null);

  const setTrack = (lift: "swings" | "getups", fn: (t: Track) => Track) =>
    update((s) =>
      lift === "swings"
        ? { ...s, swings: fn(s.swings) as SwingTrack }
        : { ...s, getups: fn(s.getups) }
    );

  return (
    <div className="stack" style={{ gap: "1.1rem" }}>
      <header>
        <span className="kicker">Plan</span>
        <h1>Progression</h1>
        <p className="dim small">
          Step loading: own a bell completely, then let the next one in a
          couple of sets at a time — heavy work first, while you're fresh.
          Swings and get-ups move at their own pace.
        </p>
      </header>

      <TrackCard
        lift="swings"
        title={`Swings · ${state.swings.style === "one-arm" ? "one-arm" : "two-arm"}`}
        track={state.swings}
        unitsWord="sets"
        capacity={SWING_SETS}
        onEdit={() => setEditing("swings")}
        onChecklist={(key, v) =>
          setTrack("swings", (t) => ({ ...t, checklist: { ...t.checklist, [key]: v } }))
        }
        onApply={(a) => setTrack("swings", (t) => applyAdvice(t, a))}
        extra={
          <div className="field">
            <label>Swing style</label>
            <Segmented
              label="Swing style"
              options={[
                { value: "two-arm", label: "Two-arm" },
                { value: "one-arm", label: "One-arm" },
              ]}
              value={state.swings.style}
              onChange={(v) => update((s) => ({ ...s, swings: { ...s.swings, style: v } }))}
            />
            {state.swings.style === "two-arm" && (
              <p className="faint small">
                Two-arm is the right start. Switch when your hinge is crisp and
                the bell floats at the top.
              </p>
            )}
          </div>
        }
      />

      <TrackCard
        lift="getups"
        title="Get-ups"
        track={state.getups}
        unitsWord="reps"
        capacity={GETUP_REPS}
        onEdit={() => setEditing("getups")}
        onChecklist={(key, v) =>
          setTrack("getups", (t) => ({ ...t, checklist: { ...t.checklist, [key]: v } }))
        }
        onApply={(a) => setTrack("getups", (t) => applyAdvice(t, a))}
      />

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        label="Override progression"
      >
        {editing && (
          <ManualOverride
            lift={editing}
            track={editing === "swings" ? state.swings : state.getups}
            unitsLabel={settings.units}
            capacity={editing === "swings" ? SWING_SETS : GETUP_REPS}
            onSave={(t) => {
              setTrack(editing, () => t);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function TrackCard({
  lift,
  title,
  track,
  unitsWord,
  capacity,
  onEdit,
  onChecklist,
  onApply,
  extra,
}: {
  lift: "swings" | "getups";
  title: string;
  track: Track;
  unitsWord: string;
  capacity: number;
  onEdit: () => void;
  onChecklist: (key: string, v: boolean) => void;
  onApply: (a: ReturnType<typeof advise>) => void;
  extra?: ReactNode;
}) {
  const { state } = useStore();
  const units = state.settings.units;
  const advice = advise(track, lift);
  const plan =
    lift === "swings"
      ? prescribeSwings(track as SwingTrack).map((p) => p.weight)
      : prescribeGetups(track);

  return (
    <section className="card stack" aria-label={title}>
      <div className="row between">
        <h2>{title}</h2>
        <button className="btn subtle small" onClick={onEdit}>
          Override
        </button>
      </div>
      <div className="row between">
        <div>
          <div className="faint small">Working weight</div>
          <div className="num" style={{ fontSize: "1.5rem", fontWeight: 800 }}>
            {track.base === 0 ? "No bell" : formatWeight(track.base, units)}
          </div>
        </div>
        {track.next !== null && (
          <div style={{ textAlign: "right" }}>
            <div className="faint small">Stepping to</div>
            <div className="num" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-ink)" }}>
              {formatWeight(track.next, units)}
            </div>
          </div>
        )}
      </div>

      {track.next !== null && (
        <>
          <div className="meter" aria-label={`${track.heavyCount} of ${capacity} heavy ${unitsWord}`}>
            <i style={{ width: `${(track.heavyCount / capacity) * 100}%` }} />
          </div>
          <p className="dim small num">
            {track.heavyCount} of {capacity} {unitsWord} at {formatWeight(track.next, units)} —
            today: {compactPlan(plan)}
          </p>
        </>
      )}

      {track.next === null && (
        <fieldset style={{ border: "none" }} className="stack">
          <legend className="faint small" style={{ marginBottom: "0.4rem" }}>
            Own the {track.base === 0 ? "movement" : formatWeight(track.base, units)} — then{" "}
            {nextBell(track.base) !== null
              ? `the ${formatWeight(nextBell(track.base)!, units)} comes in`
              : "stay and enjoy it"}
          </legend>
          {OWNERSHIP_CHECKLIST.map((c) => (
            <label
              key={c.key}
              className="row small"
              style={{ alignItems: "flex-start", minHeight: "44px", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={!!track.checklist[c.key]}
                onChange={(e) => onChecklist(c.key, e.target.checked)}
                style={{ minHeight: "24px", width: "24px", marginTop: "2px" }}
              />
              <span className="dim">{c.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="banner good small" role="status">
        {advice.reason}
        {advice.kind !== "hold" && (
          <div style={{ marginTop: "0.6rem" }}>
            <button className="btn primary" onClick={() => onApply(advice)}>
              {advice.kind === "start-step"
                ? `Bring in the ${formatWeight(advice.to, units)}`
                : advice.kind === "add-heavy"
                  ? "Add heavy work"
                  : "Complete the step"}
            </button>
          </div>
        )}
      </div>
      {extra}
    </section>
  );
}

function compactPlan(plan: number[]): string {
  const parts: { w: number; n: number }[] = [];
  for (const w of plan) {
    const last = parts[parts.length - 1];
    if (last && last.w === w) last.n++;
    else parts.push({ w, n: 1 });
  }
  return parts.map((p) => `${p.n}×${p.w}`).join(" + ");
}

function ManualOverride({
  lift,
  track,
  unitsLabel,
  capacity,
  onSave,
  onCancel,
}: {
  lift: "swings" | "getups";
  track: Track;
  unitsLabel: "kg" | "lb";
  capacity: number;
  onSave: (t: Track) => void;
  onCancel: () => void;
}) {
  const [base, setBase] = useState(track.base);
  const [next, setNext] = useState<number | null>(track.next);
  const [heavy, setHeavy] = useState(track.heavyCount);
  return (
    <div className="stack">
      <h2>Override {lift === "swings" ? "swing" : "get-up"} plan</h2>
      <div className="field">
        <label>Working weight</label>
        <WeightPicker
          label="Working weight"
          units={unitsLabel}
          value={base}
          onChange={setBase}
          allowNone={lift === "getups"}
        />
      </div>
      <div className="field">
        <label>Stepping to (optional)</label>
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={next === null}
            onClick={() => setNext(null)}
          >
            not stepping
          </button>
        </div>
        <WeightPicker
          label="Next weight"
          units={unitsLabel}
          value={next ?? -1}
          onChange={(kg) => setNext(kg)}
        />
      </div>
      {next !== null && (
        <div className="field">
          <label className="num">
            Heavy {lift === "swings" ? "sets" : "reps"} first: {heavy} of {capacity}
          </label>
          <input
            type="range"
            min={0}
            max={capacity}
            step={1}
            value={heavy}
            onChange={(e) => setHeavy(+e.target.value)}
            aria-label={`Heavy ${lift === "swings" ? "sets" : "reps"}`}
          />
        </div>
      )}
      <button
        className="btn primary big"
        onClick={() =>
          onSave({
            ...track,
            base,
            next: next === base ? null : next,
            heavyCount: next === null || next === base ? 0 : heavy,
            qualityStreak: 0,
          })
        }
      >
        Save plan
      </button>
      <button className="btn subtle" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
