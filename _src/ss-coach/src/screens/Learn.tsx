export default function Learn() {
  return (
    <div className="stack" style={{ gap: "1.1rem" }}>
      <header>
        <span className="kicker">Learn</span>
        <h1>Technique, briefly</h1>
        <p className="dim small">
          Written cues only get you so far. For the real thing, read{" "}
          <em>Kettlebell Simple &amp; Sinister</em> (Pavel Tsatsouline, 2019
          revised edition) and, if you can, book a session with a
          StrongFirst-certified instructor — an hour of coaching is worth a
          year of guessing.
        </p>
      </header>

      <details className="learn-item">
        <summary>The one-arm swing</summary>
        <div className="learn-body stack small dim">
          <p>
            The swing is a <strong>hip hinge</strong>, not a squat: push your
            hips back, keep the spine long and the back flat, and let the bell
            hike behind you like snapping a football. Then stand up hard — the
            hips throw the bell forward, the arm is just a rope.
          </p>
          <p>
            At the top the body forms a tall plank: glutes tight, abs braced,
            knees locked, bell floating to about chest height. Don't lift with
            the shoulder and don't lean back. At the bottom, keep the neck
            neutral and the forearm close to the groin.
          </p>
          <p>
            Breathe sharply out on each snap. Grip the ground with your feet.
            Every rep should be a jump that doesn't leave the floor.
          </p>
          <p>
            <strong>Common mistakes:</strong> squatting the swing, rounding the
            lower back, letting the bell drop below the knees at speed,
            sagging at the top, and turning ten crisp reps into ten mushy ones
            by rushing rest.
          </p>
        </div>
      </details>

      <details className="learn-item">
        <summary>The Turkish get-up</summary>
        <div className="learn-body stack small dim">
          <p>
            One slow trip from lying down to standing and back, bell locked
            out overhead the whole way. The sequence: roll to the elbow, up to
            the hand, sweep the leg through to a lunge, stand — then reverse
            it exactly.
          </p>
          <p>
            Keep the <strong>shoulder packed</strong> — pulled down into its
            socket, never shrugged — and the elbow locked. Keep{" "}
            <strong>eyes on the bell</strong> until you're standing (on the way
            up, watch it through the sweep; standing tall, eyes forward). Move
            like you're carrying a full cup of coffee: no hurry, no wobble.
          </p>
          <p>
            Learning it? Practice with no bell, or balance a shoe on your
            fist — if the shoe falls, the arm wasn't vertical.
          </p>
          <p>
            <strong>Common mistakes:</strong> a bent elbow, a shrugged
            shoulder, losing sight of the bell, skipping the low sweep by
            lurching, and treating it as a race. One rep a minute is the pace.
          </p>
        </div>
      </details>

      <details className="learn-item">
        <summary>Warm-up moves</summary>
        <div className="learn-body stack small dim">
          <p>
            <strong>Prying goblet squat:</strong> hold a light bell at the
            chest, sit deep, and use the elbows to pry the knees apart. Shift
            gently side to side and let the hips open up.
          </p>
          <p>
            <strong>Hip bridge:</strong> lying on your back, drive through the
            heels and squeeze the glutes to full extension. Wake up the muscles
            the swing depends on.
          </p>
          <p>
            <strong>Halo:</strong> circle a light bell slowly around your head,
            ribs down, elbows tucked. Both directions. Frees up the shoulders
            for the get-up.
          </p>
        </div>
      </details>

      <details className="learn-item">
        <summary>Rest and the talk test</summary>
        <div className="learn-body stack small dim">
          <p>
            Between swing sets, rest until you could speak a full sentence out
            loud without gasping. Walk around, shake out your grip, breathe
            through the nose. Fresher sets mean more power, and power is the
            point.
          </p>
          <p>
            The program is untimed on purpose. Racing the clock every day
            trades quality for fatigue. The clock appears only on occasional
            test days, when you're ready to check a standard.
          </p>
        </div>
      </details>

      <details className="learn-item">
        <summary>How progress works</summary>
        <div className="learn-body stack small dim">
          <p>
            <strong>Own the weight, then step.</strong> A bell is yours when
            every rep of every set is powerful and crisp, with comfortable
            rests, for several sessions running — not one good day.
          </p>
          <p>
            The next bell enters gradually: the first couple of sets of the
            day go heavy while you're fresh, everything else stays at the old
            weight. Over weeks the heavy share grows until all ten sets use
            the new bell. Swings and get-ups progress on separate schedules.
          </p>
          <p>
            When in doubt, go lighter and stay longer. Nearly-daily easy
            practice beats occasional heroics, every time.
          </p>
        </div>
      </details>

      <details className="learn-item">
        <summary>Safety</summary>
        <div className="learn-body stack small dim">
          <p>
            Train barefoot or in flat shoes on a surface that won't let the
            bell bounce into your shins. Keep pets, kids, and furniture out of
            the arc. If a rep goes wrong, <strong>let the bell go</strong> —
            guide it away and step clear rather than fighting to save it.
          </p>
          <p>
            Sharp pain is a stop sign, not a challenge. Soreness and effort
            are normal; pain in a joint or your back is not. When something
            hurts, end the session and figure out why before the next one.
          </p>
          <p>
            This app is a logbook with opinions, not a medical professional.
            If you have a condition or an injury history, clear this kind of
            training with your doctor first.
          </p>
        </div>
      </details>

      <div className="card stack">
        <h2>Go deeper</h2>
        <p className="dim small">
          Everything this app schedules comes from{" "}
          <em>Kettlebell Simple &amp; Sinister</em>. The book explains the why
          behind every rule here, in Pavel's own words — buy it. For in-person
          coaching, find a StrongFirst-certified instructor at strongfirst.com.
        </p>
      </div>
    </div>
  );
}
