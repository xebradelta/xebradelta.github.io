import { useRef, useState } from "react";
import { useStore } from "../store";
import { parseBackup } from "../lib/backup";
import { navigate } from "../router";
import { BellManager, KettlebellIcon, Segmented } from "../components/ui";
import type { AgeRange, Condition, Sex } from "../lib/types";
import { fitToOwnedBells, recommendStart } from "../lib/program";
import { formatWeight } from "../lib/weights";
import { defaultGetupTrack, defaultSwingTrack } from "../lib/storage";

const PAIN_OPTIONS = [
  { key: "back", label: "Lower back" },
  { key: "shoulder", label: "Shoulder" },
  { key: "knee", label: "Knee" },
  { key: "wrist", label: "Wrist / elbow" },
];

export default function Onboarding() {
  const { state, update, replace } = useStore();
  const [step, setStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [sex, setSex] = useState<Sex>("male");
  const [ageRange, setAgeRange] = useState<AgeRange>("under40");
  const [condition, setCondition] = useState<Condition>("average");
  const [bells, setBells] = useState<number[]>([]);
  const [pain, setPain] = useState<string[]>([]);

  const rec = recommendStart(sex, ageRange, condition);
  const swingStart = bells.length ? fitToOwnedBells(rec.swings, bells) : rec.swings;
  const getupStart = rec.getupsUnweightedFirst
    ? 0
    : bells.length
      ? fitToOwnedBells(rec.getups, bells)
      : rec.getups;

  function finish() {
    update((s) => ({
      ...s,
      profile: {
        sex,
        ageRange,
        condition,
        bells,
        painFlags: pain,
        createdAt: Date.now(),
      },
      swings: { ...defaultSwingTrack(swingStart), style: rec.swingStyle },
      getups: defaultGetupTrack(getupStart),
    }));
    navigate("today");
  }

  const steps = [
    // 0 — welcome
    <div className="stack" key="welcome">
      <div className="logo-mark" style={{ color: "var(--accent)" }}>
        <KettlebellIcon size={30} />
        <span style={{ fontSize: "1.2rem", color: "var(--ink)" }}>S&S Coach</span>
      </div>
      <h1>One bell. Two lifts. Nearly every day.</h1>
      <p className="dim">
        This app coaches the Simple &amp; Sinister kettlebell program: a short
        daily practice of one-arm swings and Turkish get-ups that builds
        strength and conditioning without wrecking you for the rest of your
        day.
      </p>
      <p className="dim">
        Every session has the same shape — a brief warm-up, 100 swings, 10
        get-ups — and progress comes from patiently owning each bell before
        the next one enters. No clock, except on occasional test days.
      </p>
      <p className="faint small">
        Everything you enter stays on this device. No account, no server, no
        tracking.
      </p>
      <button className="btn primary big" onClick={() => setStep(1)}>
        Set me up
      </button>
      <button className="btn subtle" onClick={() => fileRef.current?.click()}>
        Restore from a backup file
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Choose backup file"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const result = parseBackup(await f.text());
          if (result.ok) {
            replace(result.state);
            navigate(result.state.profile ? "today" : "onboarding");
          } else {
            setImportError(result.error);
          }
        }}
      />
      {importError && (
        <div className="banner warn small" role="alert">
          {importError}
        </div>
      )}
    </div>,

    // 1 — about you
    <div className="stack" key="you">
      <span className="kicker">Step 1 of 4</span>
      <h1>About you</h1>
      <p className="dim small">
        Used only to suggest starting weights and the right test standards.
      </p>
      <div className="field">
        <label id="lbl-sex">Standards &amp; starting weights basis</label>
        <Segmented
          label="Sex"
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
          value={sex}
          onChange={setSex}
        />
      </div>
      <div className="field">
        <label>Age</label>
        <Segmented
          label="Age range"
          options={[
            { value: "under40", label: "<40" },
            { value: "40s", label: "40s" },
            { value: "50s", label: "50s" },
            { value: "60plus", label: "60+" },
          ]}
          value={ageRange}
          onChange={setAgeRange}
        />
      </div>
      <div className="field">
        <label>How would you rate your current condition?</label>
        <Segmented
          label="Condition"
          options={[
            { value: "deconditioned", label: "Out of shape" },
            { value: "average", label: "Average" },
            { value: "trained", label: "I lift" },
          ]}
          value={condition}
          onChange={setCondition}
        />
      </div>
      <button className="btn primary big" onClick={() => setStep(2)}>
        Continue
      </button>
    </div>,

    // 2 — equipment & pain flags
    <div className="stack" key="gear">
      <span className="kicker">Step 2 of 4</span>
      <h1>Your gear &amp; your body</h1>
      <div className="field">
        <label>Which bells can you get your hands on? (skip if none yet)</label>
        <BellManager
          bells={bells}
          units={state.settings.units}
          onChange={setBells}
          presetsOpen
        />
        <p className="faint small">
          Any weight works — add your gym's exact bells in kg or lb. You can
          change this list any time in Settings.
        </p>
      </div>
      <div className="field">
        <label>Any current aches worth respecting?</label>
        <div className="chips" role="group" aria-label="Pain flags">
          {PAIN_OPTIONS.map((p) => (
            <button
              key={p.key}
              type="button"
              className="chip"
              aria-pressed={pain.includes(p.key)}
              onClick={() =>
                setPain((f) =>
                  f.includes(p.key) ? f.filter((x) => x !== p.key) : [...f, p.key]
                )
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {pain.length > 0 && (
        <div className="banner warn small">
          Noted. Train around pain, never through it — and get a professional
          opinion before loading a joint that already hurts.
        </div>
      )}
      <button className="btn primary big" onClick={() => setStep(3)}>
        Continue
      </button>
    </div>,

    // 3 — recommendation
    <div className="stack" key="rec">
      <span className="kicker">Step 3 of 4</span>
      <h1>Your starting point</h1>
      <div className="card stack">
        <div className="row between">
          <div>
            <div className="faint small">Swings</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }} className="num">
              {formatWeight(swingStart, state.settings.units)}
            </div>
            <div className="dim small">
              {rec.swingStyle === "two-arm"
                ? "Two-arm swings until your one-arm form is ready"
                : "One-arm swings"}
            </div>
          </div>
          <div>
            <div className="faint small">Get-ups</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }} className="num">
              {getupStart === 0 ? "No bell" : formatWeight(getupStart, state.settings.units)}
            </div>
            {getupStart === 0 && (
              <div className="dim small">Or balance a shoe on your fist</div>
            )}
          </div>
        </div>
        <hr className="divider" />
        <p className="dim small">{rec.note}</p>
      </div>
      <p className="dim small">
        You can change either weight any time in Plan — and log a different
        bell on any single set mid-session.
      </p>
      <button className="btn primary big" onClick={() => setStep(4)}>
        Looks right
      </button>
      <button className="btn subtle" onClick={() => setStep(1)}>
        Back
      </button>
    </div>,

    // 4 — tour + disclaimer
    <div className="stack" key="tour">
      <span className="kicker">Step 4 of 4</span>
      <h1>How a session works</h1>
      <div className="card stack">
        <p>
          <strong>1 · Warm-up.</strong> Three easy rounds: prying goblet
          squats, hip bridges, halos. A few minutes to wake up the hips and
          shoulders.
        </p>
        <p>
          <strong>2 · Swings.</strong> 100 one-arm swings as 10×10, switching
          arms each set. Rest between sets until you could speak a full
          sentence without gasping — the talk test. No clock.
        </p>
        <p>
          <strong>3 · Get-ups.</strong> After about a minute, 10 slow Turkish
          get-ups, alternating sides, roughly one per minute. Crisp and
          deliberate, never rushed.
        </p>
        <p>
          <strong>4 · Optional cooldown.</strong> Two stretches and you're
          done. Aim for 5–6 days a week. Most days this takes about half an
          hour.
        </p>
      </div>
      <div className="banner warn small">
        <strong>Before you start:</strong> this app is a practice log, not
        medical advice. Check with a doctor before beginning any training
        program, especially with existing conditions. If something hurts —
        sharp pain, not honest effort — stop the session. For hands-on
        technique coaching, the book <em>Kettlebell Simple &amp; Sinister</em>{" "}
        and a StrongFirst-certified instructor are worth every penny.
      </div>
      <button className="btn primary big" onClick={finish}>
        Start practicing
      </button>
    </div>,
  ];

  return <div style={{ paddingTop: "1.5rem" }}>{steps[step]}</div>;
}
