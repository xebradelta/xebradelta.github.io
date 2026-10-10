(function (root) {
  "use strict";
  const FP = (root.FP = root.FP || {});
  FP.normalize = (s) =>
    s
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}]/gu, "");
  FP.uid = () =>
    root.crypto?.randomUUID?.() ||
    "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  FP.shuffle = (items, rng = Math.random) => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  FP.score = (attempts, challenge = false) =>
    Math.max(
      0,
      attempts.filter((a) => a.outcome === "correct").length -
        (challenge ? attempts.filter((a) => a.outcome === "pass").length : 0),
    );
  FP.bestKey = (s) =>
    JSON.stringify([
      s.packIds.slice().sort(),
      s.duration,
      s.difficulty,
      s.age,
      s.family,
      s.mode,
      s.challenge,
    ]);
  FP.makeDeck = (
    packs,
    registry,
    filters = {},
    seen = new Set(),
    rng = Math.random,
  ) => {
    const fits = (c) =>
      (!filters.family || c.familySafe) &&
      (!filters.age || c.minAge <= filters.age) &&
      (!filters.difficulty ||
        filters.difficulty === "all" ||
        c.difficulty === filters.difficulty) &&
      (!filters.mode || c.modes.includes(filters.mode));
    const lanes = packs.map((p) =>
      FP.shuffle(
        p.cardIds
          .map((id) => registry[id])
          .filter((c) => c && fits(c) && !seen.has(c.id)),
        rng,
      ),
    );
    const output = [],
      ids = new Set(),
      answers = new Set();
    let live = true;
    while (live) {
      live = false;
      for (const lane of lanes) {
        while (lane.length) {
          live = true;
          const c = lane.pop(),
            key =
              FP.normalize(c.answer) +
              (c.disambiguator ? "|" + FP.normalize(c.disambiguator) : "");
          if (ids.has(c.id) || answers.has(key)) continue;
          ids.add(c.id);
          answers.add(key);
          output.push(c);
          break;
        }
      }
    }
    return output;
  };
  class Round {
    constructor({ now = () => performance.now(), onChange = () => {} } = {}) {
      this.now = now;
      this.onChange = onChange;
      this.state = "browsing";
      this.active = null;
    }
    setup(cards, settings) {
      if (!cards.length)
        throw new Error("Choose filters with at least one card.");
      this.cards = cards.slice();
      this.settings = { ...settings };
      this.id = FP.uid();
      this.index = 0;
      this.attempts = [];
      this.pauses = [];
      this.active = null;
      this.remaining = settings.duration * 1000;
      this.state = "setup";
      this.saved = false;
      this.onChange(this);
    }
    countdown() {
      this.state = "countdown";
      this.active = null;
      this.onChange(this);
    }
    start() {
      if (this.state !== "countdown") return false;
      this.state = "playing";
      this.deadline = this.now() + this.remaining;
      this.next();
      return true;
    }
    next() {
      if (this.index >= this.cards.length) {
        this.finish("All cards played");
        return;
      }
      this.active = { ...this.cards[this.index++], instanceId: FP.uid() };
      this.feedbackUntil = 0;
      this.onChange(this);
    }
    time() {
      return this.settings?.practice
        ? Infinity
        : this.state === "playing"
          ? Math.max(0, this.deadline - this.now())
          : this.remaining;
    }
    tick() {
      if (this.state !== "playing") return;
      if (!this.settings.practice && this.now() >= this.deadline) {
        this.finish("Time’s up");
        return;
      }
      if (this.feedbackUntil && this.now() >= this.feedbackUntil) {
        this.feedbackUntil = 0;
        this.next();
      }
    }
    dispatch({ roundId, cardId, outcome }) {
      if (this.state !== "playing") return false;
      if (!this.settings.practice && this.now() >= this.deadline) {
        this.finish("Time’s up");
        return false;
      }
      if (
        !this.active ||
        this.feedbackUntil ||
        roundId !== this.id ||
        cardId !== this.active.instanceId ||
        !["correct", "pass"].includes(outcome)
      )
        return false;
      this.attempts.push({ ...this.active, outcome, edited: false });
      this.active = null;
      this.feedbackUntil = this.now() + 420;
      this.lastOutcome = outcome;
      this.onChange(this);
      return true;
    }
    pause(reason = "Manual pause") {
      if (this.state !== "playing") return false;
      if (!this.settings.practice && this.now() >= this.deadline) {
        this.finish("Time’s up");
        return false;
      }
      this.remaining = this.time();
      this.pauses.push({ reason, at: new Date().toISOString() });
      if (this.feedbackUntil) {
        this.feedbackUntil = 0;
        if (this.index >= this.cards.length) {
          this.finish("All cards played");
          return true;
        }
        this.active = null;
      }
      this.state = "paused";
      this.onChange(this);
      return true;
    }
    resume() {
      if (this.state !== "paused") return false;
      this.state = "countdown";
      this.onChange(this);
      return true;
    }
    resumeStart() {
      if (this.state !== "countdown") return false;
      this.deadline = this.now() + this.remaining;
      this.state = "playing";
      if (!this.active) this.next();
      else this.onChange(this);
      return true;
    }
    finish(reason = "Finished") {
      if (this.state === "results") return;
      this.remaining = 0;
      this.reason = reason;
      this.unanswered = this.active
        ? { ...this.active, outcome: "unanswered", edited: false }
        : null;
      this.active = null;
      this.feedbackUntil = 0;
      this.state = "results";
      this.onChange(this);
    }
    abandon() {
      if (
        ![
          "playing",
          "paused",
          "countdown",
          "setup",
          "calibration",
          "permission",
        ].includes(this.state)
      )
        return;
      this.finish("Abandoned");
    }
    result() {
      return {
        id: this.id,
        date: new Date().toISOString(),
        settings: this.settings,
        attempts: this.attempts.slice(),
        unanswered: this.unanswered,
        pauses: this.pauses.slice(),
        reason: this.reason,
        abandoned: this.reason === "Abandoned",
        points: FP.score(this.attempts, this.settings.challenge),
      };
    }
    snapshot() {
      return {
        id: this.id,
        cards: this.cards,
        index: this.index,
        active: this.active,
        attempts: this.attempts,
        settings: this.settings,
        remaining: this.time(),
        pauses: this.pauses,
      };
    }
    restore(s) {
      if (
        !s ||
        !Array.isArray(s.cards) ||
        !s.cards.length ||
        !s.settings ||
        (!s.settings.practice &&
          (!Number.isFinite(s.remaining) || s.remaining <= 0)) ||
        !Array.isArray(s.attempts) ||
        !Array.isArray(s.pauses)
      )
        throw new Error("Interrupted round cannot be restored.");
      Object.assign(this, s);
      this.remaining = s.settings.practice
        ? s.settings.duration * 1000
        : s.remaining;
      this.state = "paused";
      this.feedbackUntil = 0;
      this.pauses.push({
        reason: "Reload interrupted play",
        at: new Date().toISOString(),
      });
      this.onChange(this);
    }
  }
  FP.Round = Round;
  class TeamMatch {
    constructor(names, rounds = 3) {
      if (names.length < 2 || names.length > 6 || rounds < 1 || rounds > 5)
        throw new Error("Use 2–6 teams and 1–5 rounds.");
      this.names = names;
      this.rounds = rounds;
      this.turns = [];
      this.tieBreak = false;
    }
    get next() {
      const i = this.turns.length;
      return i >= this.names.length * this.rounds
        ? null
        : {
            team: i % this.names.length,
            round: Math.floor(i / this.names.length) + 1,
            label: `Round ${Math.floor(i / this.names.length) + 1} of ${this.rounds} · ${this.names[i % this.names.length]}`,
          };
    }
    record(result) {
      const existing = this.turns.find((t) => t.result.id === result.id);
      if (existing) {
        existing.result = result;
        return;
      }
      const turn = this.next;
      if (!turn || result.abandoned) return;
      this.turns.push({ ...turn, result });
    }
    get totals() {
      return this.names.map((name, i) => ({
        name,
        points: this.turns
          .filter((t) => t.team === i)
          .reduce(
            (n, t) =>
              n + FP.score(t.result.attempts, t.result.settings.challenge),
            0,
          ),
      }));
    }
    get winners() {
      const totals = this.totals,
        max = Math.max(...totals.map((t) => t.points));
      return totals.filter((t) => t.points === max).map((t) => t.name);
    }
    extend() {
      if (this.next) throw new Error("Finish equal turns first.");
      this.rounds++;
      this.tieBreak = true;
    }
  }
  FP.TeamMatch = TeamMatch;
})(globalThis);
