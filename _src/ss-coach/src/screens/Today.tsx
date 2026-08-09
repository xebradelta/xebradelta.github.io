import { useStore } from "../store";
import { navigate } from "../router";
import { KettlebellIcon } from "../components/ui";
import { prescribeGetups, prescribeSwings } from "../lib/progression";
import { computeStreaks } from "../lib/stats";
import { formatWeight } from "../lib/weights";
import { localDateISO, formatDateHuman } from "../lib/time";
import { STANDARD_LABELS, standardWeights } from "../lib/program";

export default function Today() {
  const { state } = useStore();
  const { settings, profile } = state;
  const today = localDateISO();
  const streaks = computeStreaks(state.sessions, today);
  const swings = prescribeSwings(state.swings);
  const getups = prescribeGetups(state.getups);
  const doneToday = state.sessions.some((s) => s.dateISO === today);
  const active = state.active;

  // Group consecutive equal weights for compact display: "2×24 + 8×20".
  const groupWeights = (ws: number[]) => {
    const parts: { w: number; n: number }[] = [];
    for (const w of ws) {
      const last = parts[parts.length - 1];
      if (last && last.w === w) last.n++;
      else parts.push({ w, n: 1 });
    }
    return parts;
  };
  const swingGroups = groupWeights(swings.map((s) => s.weight));
  const getupGroups = groupWeights(getups);

  const encouragement = doneToday
    ? "Done for today. The bell will still be there tomorrow."
    : streaks.current >= 3
      ? `Day ${streaks.current + 1} awaits. Consistency is the whole trick.`
      : "The session takes about half an hour. Mostly rest, honestly.";

  const nextStandard = profile
    ? (["timeless-simple", "simple", "sinister"] as const).find(
        (s) => !state.celebrated.includes(s)
      )
    : undefined;

  return (
    <div className="stack" style={{ gap: "1.1rem" }}>
      <header className="row between">
        <div className="logo-mark" style={{ color: "var(--accent)" }}>
          <KettlebellIcon size={24} />
          <span style={{ color: "var(--ink)" }}>S&amp;S Coach</span>
        </div>
        <span className="faint small">{formatDateHuman(today)}</span>
      </header>

      {active && (
        <button
          className="card row between"
          style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
          onClick={() => navigate("session")}
        >
          <div>
            <strong>Session in progress</strong>
            <div className="dim small">
              {active.dateISO !== today
                ? `Started ${formatDateHuman(active.dateISO)} — pick it up or wrap it in-session.`
                : "Tap to resume where you left off."}
            </div>
          </div>
          <span aria-hidden="true" style={{ color: "var(--accent)", fontSize: "1.4rem" }}>
            →
          </span>
        </button>
      )}

      <section className="card stack" aria-label="Today's session">
        <div className="row between">
          <h2>Today's practice</h2>
          {doneToday && <span className="small" style={{ color: "var(--good)" }}>✓ trained</span>}
        </div>
        <div className="stack" style={{ gap: "0.5rem" }}>
          <div className="row between">
            <span className="dim">Swings · 10×10 {state.swings.style === "two-arm" ? "two-arm" : "one-arm"}</span>
            <strong className="num">
              {swingGroups
                .map((g) => `${g.n}×${formatWeight(g.w, settings.units)}`)
                .join(" + ")}
            </strong>
          </div>
          <div className="row between">
            <span className="dim">Get-ups · 5 per side</span>
            <strong className="num">
              {getupGroups
                .map((g) => `${g.n}×${g.w === 0 ? "no bell" : formatWeight(g.w, settings.units)}`)
                .join(" + ")}
            </strong>
          </div>
        </div>
        {!active && (
          <button className="btn primary big" onClick={() => navigate("session")}>
            Start session
          </button>
        )}
        <p className="faint small" style={{ textAlign: "center" }}>
          {encouragement}
        </p>
      </section>

      <section className="row" style={{ gap: "0.75rem" }} aria-label="Stats">
        <div className="card" style={{ flex: 1, textAlign: "center" }}>
          <div className="num" style={{ fontSize: "1.7rem", fontWeight: 800 }}>
            {streaks.current}
          </div>
          <div className="faint small">day streak</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: "center" }}>
          <div className="num" style={{ fontSize: "1.7rem", fontWeight: 800 }}>
            {streaks.thisWeekCount}
          </div>
          <div className="faint small">this week</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: "center" }}>
          <div className="num" style={{ fontSize: "1.7rem", fontWeight: 800 }}>
            {state.sessions.length}
          </div>
          <div className="faint small">total</div>
        </div>
      </section>

      {profile && nextStandard && (
        <section className="card stack" aria-label="Next goal">
          <div className="row between">
            <h2>Next goal · {STANDARD_LABELS[nextStandard]}</h2>
          </div>
          <p className="dim small">
            {nextStandard === "timeless-simple" ? (
              <>
                A full untimed session with{" "}
                {formatWeight(standardWeights(profile.sex, "timeless-simple").swings, settings.units)}{" "}
                swings and{" "}
                {formatWeight(standardWeights(profile.sex, "timeless-simple").getups, settings.units)}{" "}
                get-ups — every rep crisp. It will detect itself when you do it.
              </>
            ) : (
              <>
                The timed test: 100 swings in 5:00, one minute's rest, 10
                get-ups in 10:00 at{" "}
                {formatWeight(standardWeights(profile.sex, nextStandard).swings, settings.units)} /{" "}
                {formatWeight(standardWeights(profile.sex, nextStandard).getups, settings.units)}.
              </>
            )}
          </p>
          <button className="btn" onClick={() => navigate("test")}>
            Test day mode
          </button>
        </section>
      )}
      {state.celebrated.length > 0 && (
        <p className="small" style={{ color: "var(--good)", textAlign: "center" }}>
          Earned: {state.celebrated.map((s) => STANDARD_LABELS[s]).join(" · ")}
        </p>
      )}
    </div>
  );
}
