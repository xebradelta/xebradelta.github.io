(function (root) {
  "use strict";
  const FP = (root.FP = root.FP || {});
  const defaults = {
    family: true,
    age: 0,
    difficulty: "all",
    duration: 60,
    mode: "classic",
    challenge: false,
    sound: true,
    vibration: true,
    invert: false,
    reduced: false,
    accessible: false,
    alerts: true,
    preferredControl: "buttons",
    favorites: [],
    favoriteMix: [],
  };
  FP.defaults = defaults;
  class Store {
    constructor(warn = () => {}) {
      this.warn = warn;
      this.memory = { packs: [], history: [], interrupted: null };
      this.settings = { ...defaults };
      this.db = null;
      this.persistent = true;
      this.recovery = [];
    }
    fail() {
      if (this.persistent)
        this.warn(
          "Storage unavailable. You can keep playing; export personal packs before closing.",
        );
      this.persistent = false;
    }
    async init() {
      try {
        const raw = localStorage.getItem("flip-party-settings");
        if (raw) {
          const value = JSON.parse(raw);
          if (!value || typeof value !== "object" || Array.isArray(value))
            throw new Error("Corrupt settings");
          for (const key of Object.keys(defaults)) {
            const v = value[key];
            if (
              typeof v === typeof defaults[key] &&
              (!Array.isArray(defaults[key]) || Array.isArray(v))
            )
              this.settings[key] = v;
          }
          if (
            !["all", "easy", "medium", "hard"].includes(
              this.settings.difficulty,
            )
          )
            this.settings.difficulty = "all";
          if (
            !["classic", "charades", "sounds", "impressions"].includes(
              this.settings.mode,
            )
          )
            this.settings.mode = "classic";
          this.settings.duration = Math.max(
            15,
            Math.min(300, Number(this.settings.duration) || 60),
          );
          this.settings.age = Number(this.settings.age) || 0;
        }
      } catch {
        this.fail();
      }
      try {
        this.db = await new Promise((resolve, reject) => {
          const r = indexedDB.open("flip-party", 1);
          r.onupgradeneeded = () => r.result.createObjectStore("data");
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
          r.onblocked = () => reject(new Error("Database blocked"));
        });
        for (const key of Object.keys(this.memory)) {
          const value = await this.read(key);
          if (value === undefined) continue;
          let valid = true;
          if (key === "packs")
            valid =
              Array.isArray(value) &&
              value.every(
                (p) =>
                  p?.pack?.personal === true &&
                  typeof p.pack.name === "string" &&
                  p.pack.id?.startsWith("personal-") &&
                  Array.isArray(p.pack.cardIds) &&
                  Array.isArray(p.cards) &&
                  p.cards.every(
                    (c) =>
                      c?.id?.startsWith("personal-card-") &&
                      typeof c.answer === "string" &&
                      Array.isArray(c.modes),
                  ),
              );
          if (key === "history")
            valid =
              Array.isArray(value) &&
              value.every(
                (r) =>
                  typeof r?.id === "string" &&
                  r.settings &&
                  Array.isArray(r.settings.packIds) &&
                  Array.isArray(r.attempts) &&
                  Array.isArray(r.pauses),
              );
          if (valid) this.memory[key] = value;
          else {
            this.recovery.push({ key, value });
            this.warn(
              "Some saved data is damaged. Recovery export is available in Settings.",
            );
          }
        }
      } catch {
        this.fail();
      }
      return this;
    }
    read(key) {
      return new Promise((res, rej) => {
        const r = this.db.transaction("data").objectStore("data").get(key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    async set(key, value) {
      this.memory[key] = value;
      if (!this.db) return this.fail();
      try {
        await new Promise((res, rej) => {
          const t = this.db.transaction("data", "readwrite");
          t.objectStore("data").put(value, key);
          t.oncomplete = res;
          t.onerror = () => rej(t.error);
          t.onabort = () => rej(t.error);
        });
      } catch {
        this.fail();
      }
    }
    prefs(changes) {
      Object.assign(this.settings, changes);
      try {
        localStorage.setItem(
          "flip-party-settings",
          JSON.stringify(this.settings),
        );
      } catch {
        this.fail();
      }
    }
    saveRound(result) {
      const history = this.memory.history.filter((r) => r.id !== result.id);
      history.unshift(result);
      return this.set("history", history.slice(0, 100));
    }
  }
  FP.Store = Store;
  FP.validateImport = (
    text,
    {
      format = "json",
      name = "Imported pack",
      difficulty = "easy",
      minAge = 6,
    } = {},
  ) => {
    if (new TextEncoder().encode(text).length > 5 * 1024 * 1024)
      throw new Error("Import must be no larger than 5 MB.");
    let entries,
      metadata = { name };
    if (format === "text") {
      entries = text
        .split(/\r?\n/)
        .map((answer) => ({ answer, difficulty, minAge }));
    } else {
      const data = JSON.parse(text);
      if (data.schemaVersion !== 1 || !data.pack || !Array.isArray(data.cards))
        throw new Error("Expected schemaVersion 1, pack metadata, and cards.");
      metadata = data.pack;
      if (data.cards.length > 10000)
        throw new Error("Maximum 10,000 cards per import.");
      if (!Array.isArray(metadata.cardIds)) throw new Error("Missing cardIds.");
      const wanted = new Set(metadata.cardIds);
      entries = data.cards.filter((c) => c && wanted.has(c.id));
      if (wanted.size !== entries.length)
        throw new Error("Missing or duplicate card records.");
    }
    if (entries.length > 10000)
      throw new Error("Maximum 10,000 cards per import.");
    const cards = [],
      seen = new Set();
    let duplicates = 0,
      rejected = 0;
    for (const entry of entries) {
      const answer =
        typeof entry.answer === "string" ? entry.answer.trim() : "";
      const age = Number(entry.minAge ?? minAge),
        diff = entry.difficulty ?? difficulty;
      if (
        !answer ||
        answer.length > 160 ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(answer) ||
        !["easy", "medium", "hard"].includes(diff) ||
        !Number.isInteger(age) ||
        age < 3 ||
        age > 18
      ) {
        rejected++;
        continue;
      }
      const normalized = FP.normalize(answer);
      if (seen.has(normalized)) {
        duplicates++;
        continue;
      }
      seen.add(normalized);
      cards.push({
        id: "personal-card-" + FP.uid(),
        answer,
        aliases: [],
        difficulty: diff,
        minAge: age,
        familySafe: entry.familySafe !== false,
        contentType: "custom",
        tags: ["personal"],
        modes: ["classic", "charades", "sounds", "impressions"],
      });
    }
    if (
      typeof metadata.name !== "string" ||
      !metadata.name.trim() ||
      metadata.name.length > 80
    )
      throw new Error("Pack name must be 1–80 characters.");
    return {
      schemaVersion: 1,
      pack: {
        id: "personal-" + FP.uid(),
        name: metadata.name.trim(),
        description:
          typeof metadata.description === "string"
            ? metadata.description.slice(0, 240)
            : "Your personal prompts.",
        icon: "✏️",
        color: "#6750db",
        theme: "Personal",
        modes: ["classic", "charades", "sounds", "impressions"],
        cardIds: cards.map((c) => c.id),
        personal: true,
      },
      cards,
      accepted: cards.length,
      duplicates,
      rejected,
    };
  };
  FP.exportPack = (p) => ({ schemaVersion: 1, pack: p.pack, cards: p.cards });
})(globalThis);
