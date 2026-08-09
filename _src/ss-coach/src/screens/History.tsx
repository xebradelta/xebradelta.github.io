import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Heatmap, TonnageChart, WeightOverTime } from "../components/charts";
import {
  computePRs,
  computeStreaks,
  computeTimeTotals,
  formatDuration,
  sessionTonnage,
  sessionWorkSec,
} from "../lib/stats";
import { formatClock, formatDateHuman } from "../lib/time";
import { formatWeight, kgToLb } from "../lib/weights";
import { STANDARD_LABELS } from "../lib/program";
import { navigate } from "../router";

export default function History() {
  const { state } = useStore();
  const { settings } = state;
  const [query, setQuery] = useState("");
  const sessions = state.sessions;
  const streaks = computeStreaks(sessions);
  const prs = useMemo(() => computePRs(sessions), [sessions]);
  const time = useMemo(() => computeTimeTotals(sessions), [sessions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
    if (!q) return sorted;
    return sorted.filter(
      (s) =>
        s.notes.toLowerCase().includes(q) ||
        s.dateISO.includes(q) ||
        s.kind.includes(q) ||
        s.swings.some((x) => String(x.weight).includes(q)) ||
        s.getups.some((x) => String(x.weight).includes(q))
    );
  }, [sessions, query]);

  const displayTonnage = (kg: number) =>
    `${Math.round(settings.units === "lb" ? kgToLb(kg) : kg).toLocaleString()} ${settings.units}`;

  if (sessions.length === 0) {
    return (
      <div className="stack" style={{ paddingTop: "1rem" }}>
        <span className="kicker">History</span>
        <h1>Nothing here yet</h1>
        <p className="dim">
          Your first session will start the record: calendar, streaks, tonnage,
          and the slow satisfying climb of the weights.
        </p>
        <button className="btn primary big" onClick={() => navigate("today")}>
          Go train
        </button>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "1.1rem" }}>
      <header>
        <span className="kicker">History</span>
        <h1>Progress</h1>
      </header>

      <section className="card stack" aria-label="Practice calendar">
        <h2>Last 20 weeks</h2>
        <Heatmap sessions={sessions} />
        <div className="row between small faint">
          <span className="num">streak {streaks.current} · best {streaks.best}</span>
          <span className="num">{streaks.thisWeekCount} this week</span>
        </div>
      </section>

      <section className="row" style={{ gap: "0.75rem" }} aria-label="Time trained">
        <div className="card" style={{ flex: 1, textAlign: "center" }}>
          <div className="num" style={{ fontSize: "1.25rem", fontWeight: 800 }}>
            {formatDuration(time.weekSec)}
          </div>
          <div className="faint small">this week</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: "center" }}>
          <div className="num" style={{ fontSize: "1.25rem", fontWeight: 800 }}>
            {formatDuration(time.monthSec)}
          </div>
          <div className="faint small">this month</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: "center" }}>
          <div className="num" style={{ fontSize: "1.25rem", fontWeight: 800 }}>
            {formatDuration(time.allSec)}
          </div>
          <div className="faint small">all time</div>
        </div>
      </section>

      <section className="card stack" aria-label="Weekly tonnage">
        <h2>Weekly tonnage</h2>
        <TonnageChart sessions={sessions} units={settings.units} />
      </section>

      <section className="card stack" aria-label="Weight over time">
        <h2>Heaviest bell per session</h2>
        <div className="faint small">Swings</div>
        <WeightOverTime sessions={sessions} lift="swings" units={settings.units} />
        <div className="faint small">Get-ups</div>
        <WeightOverTime sessions={sessions} lift="getups" units={settings.units} />
      </section>

      <section className="card stack" aria-label="Personal records">
        <h2>Records</h2>
        <div className="stack small" style={{ gap: "0.45rem" }}>
          <div className="row between">
            <span className="dim">Heaviest swing bell</span>
            <strong className="num">{formatWeight(prs.heaviestSwing, settings.units)}</strong>
          </div>
          <div className="row between">
            <span className="dim">Heaviest get-up bell</span>
            <strong className="num">{formatWeight(prs.heaviestGetup, settings.units)}</strong>
          </div>
          <div className="row between">
            <span className="dim">Total swings</span>
            <strong className="num">{prs.totalSwingReps.toLocaleString()}</strong>
          </div>
          <div className="row between">
            <span className="dim">Total get-ups</span>
            <strong className="num">{prs.totalGetupReps.toLocaleString()}</strong>
          </div>
          <div className="row between">
            <span className="dim">Lifetime tonnage</span>
            <strong className="num">{displayTonnage(prs.totalTonnage)}</strong>
          </div>
          <div className="row between">
            <span className="dim">Best week</span>
            <strong className="num">{prs.bestWeekSessions} sessions</strong>
          </div>
        </div>
        {state.celebrated.length > 0 && (
          <p className="small" style={{ color: "var(--good)" }}>
            Standards earned: {state.celebrated.map((s) => STANDARD_LABELS[s]).join(" · ")}
          </p>
        )}
      </section>

      <section className="stack" aria-label="Session log">
        <h2>Session log</h2>
        <input
          type="search"
          placeholder="Search notes, dates, weights…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search sessions"
        />
        {filtered.length === 0 && <p className="faint small">No sessions match.</p>}
        {filtered.map((s) => {
          const swingReps = s.swings.reduce((n, x) => n + x.reps, 0);
          return (
            <details className="learn-item" key={s.id}>
              <summary>
                <span>
                  {formatDateHuman(s.dateISO)}
                  {s.kind === "test" && (
                    <span style={{ color: s.test?.passed ? "var(--good)" : "var(--warn)" }}>
                      {" "}
                      · test {s.test?.passed ? "✓" : "✗"}
                    </span>
                  )}
                </span>
                <span className="num small dim" style={{ marginRight: "0.6rem" }}>
                  {swingReps}sw · {s.getups.length}gu
                </span>
              </summary>
              <div className="learn-body stack small" style={{ gap: "0.4rem" }}>
                <div className="row between">
                  <span className="dim">Swings</span>
                  <span className="num">
                    {s.swings.length === 0
                      ? "—"
                      : `${swingReps} reps @ ${[...new Set(s.swings.map((x) => x.weight))]
                          .map((w) => formatWeight(w, settings.units))
                          .join(", ")}`}
                  </span>
                </div>
                <div className="row between">
                  <span className="dim">Get-ups</span>
                  <span className="num">
                    {s.getups.length === 0
                      ? "—"
                      : `${s.getups.length} reps @ ${[...new Set(s.getups.map((x) => x.weight))]
                          .map((w) => (w === 0 ? "no bell" : formatWeight(w, settings.units)))
                          .join(", ")}`}
                  </span>
                </div>
                <div className="row between">
                  <span className="dim">Tonnage</span>
                  <span className="num">{displayTonnage(sessionTonnage(s))}</span>
                </div>
                <div className="row between">
                  <span className="dim">Time</span>
                  <span className="num">{formatDuration(sessionWorkSec(s))}</span>
                </div>
                {s.test && (
                  <div className="row between">
                    <span className="dim">Test times</span>
                    <span className="num">
                      swings {formatClock(s.test.swingTimeSec)} · get-ups{" "}
                      {formatClock(s.test.getupTimeSec)}
                    </span>
                  </div>
                )}
                {s.rpe !== null && (
                  <div className="row between">
                    <span className="dim">RPE</span>
                    <span className="num">{s.rpe}</span>
                  </div>
                )}
                {s.crisp !== null && (
                  <div className="row between">
                    <span className="dim">Quality</span>
                    <span>{s.crisp ? "all crisp" : "not quite"}</span>
                  </div>
                )}
                {s.notes && <p className="dim">“{s.notes}”</p>}
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
