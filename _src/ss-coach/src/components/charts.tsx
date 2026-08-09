import type { SessionLog, Units } from "../lib/types";
import { sessionTonnage } from "../lib/stats";
import { addDays, formatDateHuman, localDateISO } from "../lib/time";
import { formatWeightShort, kgToLb } from "../lib/weights";

/** GitHub-style calendar heatmap of the last `weeks` weeks. */
export function Heatmap({ sessions, weeks = 20 }: { sessions: SessionLog[]; weeks?: number }) {
  const today = localDateISO();
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(s.dateISO, (byDay.get(s.dateISO) ?? 0) + 1);

  // Grid ends on today's week (columns = weeks, rows = Mon..Sun).
  const [y, m, d] = today.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0=Mon
  const cells: { date: string; count: number; future: boolean }[] = [];
  const start = addDays(today, -(dow + (weeks - 1) * 7));
  for (let w = 0; w < weeks; w++) {
    for (let r = 0; r < 7; r++) {
      const date = addDays(start, w * 7 + r);
      cells.push({
        date,
        count: byDay.get(date) ?? 0,
        future: date > today,
      });
    }
  }
  return (
    <div
      className="heatmap"
      role="img"
      aria-label={`Practice calendar, last ${weeks} weeks`}
    >
      {cells.map((c) => (
        <i
          key={c.date}
          className={c.count >= 2 ? "l2" : c.count === 1 ? "l1" : ""}
          style={c.future ? { opacity: 0.25 } : undefined}
          title={`${formatDateHuman(c.date)}: ${c.count} session${c.count === 1 ? "" : "s"}`}
        />
      ))}
    </div>
  );
}

/** Weekly tonnage bars, most recent `weeks` weeks. */
export function TonnageChart({
  sessions,
  units,
  weeks = 12,
}: {
  sessions: SessionLog[];
  units: Units;
  weeks?: number;
}) {
  const today = localDateISO();
  const [y, m, d] = today.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const thisMonday = addDays(today, -dow);
  const buckets: { monday: string; tonnage: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({ monday: addDays(thisMonday, -7 * i), tonnage: 0 });
  }
  for (const s of sessions) {
    for (const b of buckets) {
      if (s.dateISO >= b.monday && s.dateISO < addDays(b.monday, 7)) {
        b.tonnage += sessionTonnage(s);
      }
    }
  }
  const max = Math.max(1, ...buckets.map((b) => b.tonnage));
  const W = 320;
  const H = 120;
  const bw = W / weeks;
  const toDisplay = (kg: number) => (units === "lb" ? kgToLb(kg) : kg);
  return (
    <div className="chart" aria-label="Weekly tonnage chart" role="img">
      <svg viewBox={`0 0 ${W} ${H + 18}`}>
        {buckets.map((b, i) => {
          const h = Math.round((b.tonnage / max) * (H - 8));
          return (
            <rect
              key={b.monday}
              x={i * bw + 3}
              y={H - h}
              width={bw - 6}
              height={Math.max(h, b.tonnage > 0 ? 3 : 0)}
              rx="3"
              fill="var(--accent)"
              opacity={0.55 + 0.45 * (b.tonnage / max)}
            />
          );
        })}
        <text x="0" y={H + 14} fontSize="10" fill="var(--ink-faint)">
          {formatDateHuman(buckets[0].monday)}
        </text>
        <text x={W} y={H + 14} fontSize="10" fill="var(--ink-faint)" textAnchor="end">
          this week · peak {Math.round(toDisplay(max)).toLocaleString()} {units}
        </text>
      </svg>
    </div>
  );
}

/** Step-line of working weight over time for one lift. */
export function WeightOverTime({
  sessions,
  lift,
  units,
}: {
  sessions: SessionLog[];
  lift: "swings" | "getups";
  units: Units;
}) {
  const points = sessions
    .filter((s) => (lift === "swings" ? s.swings.length : s.getups.length) > 0)
    .map((s) => ({
      date: s.dateISO,
      top: Math.max(
        ...(lift === "swings"
          ? s.swings.map((x) => x.weight)
          : s.getups.map((x) => x.weight))
      ),
    }));
  if (points.length === 0) {
    return <p className="faint small">No {lift === "swings" ? "swing" : "get-up"} data yet.</p>;
  }
  const W = 320;
  const H = 110;
  const maxW = Math.max(...points.map((p) => p.top), 8);
  const minW = Math.min(...points.map((p) => p.top), maxW - 4);
  const x = (i: number) =>
    points.length === 1 ? W / 2 : 8 + (i / (points.length - 1)) * (W - 16);
  const yPos = (w: number) =>
    H - 12 - ((w - minW) / Math.max(1, maxW - minW)) * (H - 30);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yPos(p.top).toFixed(1)}`)
    .join(" ");
  return (
    <div className="chart" role="img" aria-label={`Heaviest ${lift} weight per session over time`}>
      <svg viewBox={`0 0 ${W} ${H}`}>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={yPos(p.top)} r="3" fill="var(--accent)" />
        ))}
        <text x="8" y="12" fontSize="10" fill="var(--ink-faint)">
          {formatWeightShort(maxW, units)} {units} top
        </text>
      </svg>
    </div>
  );
}
