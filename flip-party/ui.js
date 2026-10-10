(function () {
  "use strict";
  const F = globalThis.FP,
    app = document.getElementById("app"),
    live = document.getElementById("status");
  let page = "home",
    mixing = false,
    selected = new Set(),
    query = "",
    theme = "all",
    favoriteOnly = false,
    control = "buttons",
    sensorLive = false,
    lastSample = 0,
    sensorTimeout = null,
    sensorAttached = false,
    practice = false,
    practiced = new Set(),
    countdownTask = 0,
    countdownValue = 3,
    viewResult = null,
    editor = null,
    importPreview = null,
    match = null,
    matchSettings = null,
    interrupted = null,
    wake = null,
    audio = null,
    historyFilter = "all",
    pendingResume = false,
    toastTimer = null,
    seen = new Set(),
    lastSnapshot = 0;
  const store = (F.store = new F.Store(toast)),
    round = (F.round = new F.Round({ onChange: onRound }));
  const registry = { ...F.DATA.cards },
    builtins = F.DATA.packs;
  const h = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "on")
        for (const [event, fn] of Object.entries(value))
          node.addEventListener(event, fn);
      else if (key === "checked") node.checked = !!value;
      else if (key === "value") node.value = value;
      else node.setAttribute(key, String(value));
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      node.append(
        child instanceof Node ? child : document.createTextNode(String(child)),
      );
    }
    return node;
  };
  const btn = (label, fn, cls = "", attrs = {}) =>
    h(
      "button",
      { type: "button", class: cls, on: { click: fn }, ...attrs },
      label,
    );
  const title = (heading, description) => [
    h("h1", { class: "page-title" }, heading),
    description && h("p", { class: "lede" }, description),
  ];
  const notice = (text, good = false) =>
    h("div", { class: "notice" + (good ? " good" : "") }, text);
  const field = (label, node) => {
    const id = node.id || "field-" + F.uid();
    node.id = id;
    return h("div", { class: "field" }, h("label", { for: id }, label), node);
  };
  function input(label, value, fn, attrs = {}) {
    const node = h("input", {
      value,
      ...attrs,
      on: { change: (e) => fn(e.target.value) },
    });
    return field(label, node);
  }
  function select(label, choices, value, fn) {
    const node = h(
      "select",
      { on: { change: (e) => fn(e.target.value) } },
      choices.map(([key, text]) =>
        h(
          "option",
          { value: key, selected: String(key) === String(value) },
          text,
        ),
      ),
    );
    node.value = value;
    return field(label, node);
  }
  function toggle(label, value, fn) {
    const node = h("input", {
      type: "checkbox",
      checked: value,
      on: { change: (e) => fn(e.target.checked) },
    });
    return h("label", { class: "toggle" }, node, label);
  }
  function toast(message) {
    const node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("visible"), 5500);
  }
  function announce(text) {
    live.textContent = text;
  }
  const packs = () => [...builtins, ...store.memory.packs.map((p) => p.pack)];
  const getPack = (id) => packs().find((p) => p.id === id);
  function reloadPersonal() {
    for (const key of Object.keys(registry))
      if (key.startsWith("personal-card-")) delete registry[key];
    for (const item of store.memory.packs) {
      if (!item?.pack || !Array.isArray(item.cards)) continue;
      for (const c of item.cards)
        if (c?.id && typeof c.answer === "string") registry[c.id] = c;
    }
  }
  const filters = () => ({
    family: store.settings.family,
    age: Number(store.settings.age),
    difficulty: store.settings.difficulty,
    mode: store.settings.mode,
  });
  const available = (ps, excludeSeen = false) =>
    F.makeDeck(ps, registry, filters(), excludeSeen ? seen : new Set());
  function go(next) {
    page = next;
    render();
    window.scrollTo(0, 0);
  }
  function prefs(changes, rerender = true) {
    store.prefs(changes);
    if (rerender) render();
  }
  function shell(content) {
    return h(
      "div",
      { class: "shell page-" + page },
      h(
        "header",
        { class: "header" },
        btn(
          [
            h("span", { class: "brandmark", "aria-hidden": true }, "↕"),
            "Flip Party",
          ],
          () => go("home"),
          "brand",
          { "aria-label": "Flip Party home" },
        ),
        h("span", { class: "sr-only" }, "Flip Party"),
        h(
          "nav",
          { "aria-label": "Main navigation" },
          [
            ["home", "Pack library"],
            ["custom", "My packs"],
            ["history", "History"],
            ["settings", "Settings"],
            ["help", "How to play"],
          ].map(([key, label]) =>
            btn(label, () => go(key), page === key ? "active" : "", {
              "aria-current": page === key ? "page" : null,
            }),
          ),
        ),
      ),
      content,
      h(
        "footer",
        { class: "footer" },
        "Flip Party · v" + F.VERSION + " · Free play, happy people.",
        h("br"),
        h("span", { id: "offline-foot" }, F.offline.status),
        h("br"),
        "No ads. No accounts. No recording. Saved on this device.",
      ),
    );
  }
  function filterFields() {
    return h(
      "div",
      { class: "filters" },
      field(
        "Find a pack",
        h("input", {
          type: "search",
          value: query,
          placeholder: "Animals, movies, food…",
          on: {
            input: (e) => {
              query = e.target.value;
              renderGrid();
            },
          },
        }),
      ),
      select(
        "Theme",
        [["all", "All themes"], ...new Set(packs().map((p) => p.theme))].map(
          (x) => (Array.isArray(x) ? x : [x, x]),
        ),
        theme,
        (x) => {
          theme = x;
          renderGrid();
        },
      ),
      select(
        "Age familiarity",
        [
          ["0", "All ages"],
          ["6", "Ages 6–8"],
          ["9", "Ages 9–12"],
          ["13", "Ages 13+"],
          ["18", "All teen/general"],
        ],
        store.settings.age,
        (x) => prefs({ age: Number(x) }),
      ),
      select(
        "Difficulty",
        [
          ["all", "All difficulties"],
          ["easy", "Easy"],
          ["medium", "Medium"],
          ["hard", "Hard"],
        ],
        store.settings.difficulty,
        (x) => prefs({ difficulty: x }),
      ),
    );
  }
  function deckCover(p, compact = false) {
    const group = F.coverGroup(p), variant = (p.number || 0) % 4;
    return h(
      "div",
      { class: "deck-cover cover-group-" + group + " cover-variant-" + variant +
          (p.name.length > 28 || p.name.split(" ").some(w => w.length > 10) ? " long-title" : "") + (compact ? " compact-cover" : "") },
      h("span", { class: "cover-category" }, p.number
        ? "FLIP PARTY · " + String(p.number).padStart(3, "0") : "MADE BY YOU"),
      h("h3", {}, p.name),
      h("div", { class: "cover-art" }, F.illustration(group)),
      h("span", { class: "cover-rule" },
        ({ charades: "ACT IT OUT", sounds: "MAKE SOME NOISE", impressions: "TAKE THE SPOTLIGHT" })[p.modes[0]] || "GIVE A LITTLE CLUE"),
    );
  }
  function collections() {
    const features = [
      { cls: "family", heading: "Family night, sorted.", description: "A little of everything. A laugh for everyone.", numbers: [120, 37, 85], target: 120, label: "Play the family mix" },
      { cls: "spotlight", heading: "Your time to shine.", description: "Big gestures. Silly sounds. Zero stage fright.", numbers: [109, 111, 112], target: 109, label: "Explore Act It Out" },
    ];
    return h("section", { class: "collections", "aria-label": "Featured collections" },
      features.map(f => h("article", { class: "collection collection-" + f.cls },
        h("div", { class: "collection-copy" },
          h("span", { class: "eyebrow" }, f.cls === "family" ? "THE EVERYONE COLLECTION" : "THE SHOWTIME COLLECTION"),
          h("h2", {}, f.heading),
          h("p", {}, f.description),
          btn(f.label + " →", () => {
            const p = builtins.find(p => p.number === f.target);
            prefs({ mode: p.modes[0] }, false);
            openPack(p);
          }, "collection-action")),
        h("div", { class: "collection-decks", "aria-hidden": true },
          f.numbers.map(n => deckCover(builtins.find(p => p.number === n), true))))));
  }
  function scrapbookPreview() {
    const recent = store.memory.history.slice(0, 3);
    return h("section", { class: "scrapbook" },
      h("div", { class: "section-title" },
        h("div", {}, h("h2", {}, "Good times, saved."), h("p", {}, "Your party scrapbook, right on this device.")),
        btn("View history →", () => go("history"), "small outline")),
      h("div", { class: "memory-grid" }, recent.length ? recent.map(r =>
        btn([h("span", { class: "memory-points" }, F.score(r.attempts, r.settings.challenge) + " pts"),
          h("strong", {}, r.settings.teamLabel || r.settings.packNames?.join(" + ") || "Party round"),
          h("small", {}, new Date(r.date || r.startedAt || r.endedAt).toLocaleDateString() +
            (r.settings.practice ? " · Practice" : r.abandoned ? " · Abandoned" : " · Timed round"))],
          () => { viewResult = r; go("results"); }, "memory-card")) :
        h("div", { class: "memory-empty" }, h("span", { "aria-hidden": true }, "✦"),
          h("div", {}, h("strong", {}, "The first laugh is just a round away."),
            h("p", {}, "Play a pack and your scores will appear here.")))));
  }
  function home() {
    return [
      h("section", { class: "hero" },
        h("div", { class: "hero-copy" },
          h("div", { class: "eyebrow" }, "YOUR PEOPLE. ONE PHONE. ALL THE FUN."),
          h("h1", {}, "Little clues.", h("br"), "Big laughs."),
          h("p", {}, "Pick a deck. Hold it to your forehead. Let your favourite people do the explaining."),
          h("div", { class: "actions" },
            btn("Quick play →", quick, "primary", { "aria-label": "Quick play  ↗" }),
            btn("Mix packs  ＋", () => { mixing = !mixing; selected.clear(); render(); }, "white"))),
        h("div", { class: "hero-art", "aria-hidden": true }, F.partyIllustration())),
      h("div", { class: "ribbon" },
        h("span", {}, "↕ Tilt or tap"),
        h("span", {}, builtins.length + " free decks"),
        h("span", {}, "✦ No ads, just laughs"),
        h("span", {}, "✈ Play offline")),
      collections(),
      interrupted &&
        notice(
          "An interrupted round is saved. Resume it from an explicit pause, or discard it.",
        ),
      interrupted &&
        h(
          "div",
          { class: "actions" },
          btn("Resume interrupted round", restore, "dark"),
          btn(
            "Discard",
            () => {
              interrupted = null;
              store.set("interrupted", null);
              render();
            },
            "outline",
          ),
        ),
      h(
        "div",
        { class: "section-title" },
        h("div", {}, h("h2", {}, "Pick your party deck"),
          h("p", {}, "Find a new favourite. There’s something for every clue crew.")),
        h(
          "div",
          { class: "actions" },
          btn(
            mixing ? "Cancel mix" : "＋ Mix packs",
            () => {
              mixing = !mixing;
              selected.clear();
              render();
            },
            "small outline",
          ),
          btn(
            "Kids preset",
            () => {
              prefs(
                {
                  family: true,
                  age: 6,
                  difficulty: "easy",
                  duration: 90,
                  mode: "classic",
                },
                false,
              );
              quick();
            },
            "small outline",
          ),
        ),
      ),
      filterFields(),
      h(
        "div",
        { class: "tabs" },
        btn(
          "All packs",
          () => {
            favoriteOnly = false;
            renderGrid();
          },
          "small",
          { "aria-pressed": !favoriteOnly },
        ),
        btn(
          "★ Favorites",
          () => {
            favoriteOnly = true;
            renderGrid();
          },
          "small",
          { "aria-pressed": favoriteOnly },
        ),
        btn(
          store.settings.family ? "✓ Family mode" : "Teen/general enabled",
          () => prefs({ family: !store.settings.family }),
          "small",
          { "aria-pressed": store.settings.family },
        ),
        store.settings.favoriteMix?.length
          ? btn(
              "Play favorite mix",
              () => {
                selected = new Set(
                  store.settings.favoriteMix.filter((id) => getPack(id)),
                );
                go("setup");
              },
              "small outline",
            )
          : null,
      ),
      h("div", { id: "pack-grid", class: "grid" }),
      h("div", { id: "mix-area" }),
      scrapbookPreview(),
      h(
        "p",
        { class: "footer" },
        "Age guidance reflects familiarity and editorial judgment, not official ratings. Family mode removes prompts tagged as mature. Some narrow packs are naturally smaller.",
      ),
    ];
  }
  function renderGrid() {
    const grid = document.getElementById("pack-grid");
    if (!grid) return;
    const search = F.normalize(query);
    const ps = packs().filter(
      (p) =>
        (theme === "all" || p.theme === theme) &&
        (!favoriteOnly || store.settings.favorites.includes(p.id)) &&
        (!search || F.normalize(p.name + " " + p.description).includes(search)),
    );
    grid.replaceChildren(
      ...ps.map((p) => {
        const count = available([p]).length;
        return h(
          "article",
          { class: "pack" + (selected.has(p.id) ? " selected" : "") },
          btn(
            [deckCover(p), h("div", { class: "meta" },
              h("strong", {}, count + " cards"), " · " + p.ageGuidance,
              h("br"), modeLabels[p.modes[0]] || "Classic clues")],
            () => openPack(p),
            "pack-open",
            {
              "aria-label":
                p.name +
                ", " +
                count +
                " cards" +
                (mixing
                  ? ", " + (selected.has(p.id) ? "selected" : "select")
                  : ""),
              "aria-pressed": mixing ? selected.has(p.id) : null,
            },
          ),
          btn(
            store.settings.favorites.includes(p.id) ? "★" : "☆",
            () => {
              const f = new Set(store.settings.favorites);
              f.has(p.id) ? f.delete(p.id) : f.add(p.id);
              prefs({ favorites: [...f] }, false);
              renderGrid();
            },
            "favorite",
            {
              "aria-label": "Favorite " + p.name,
              "aria-pressed": store.settings.favorites.includes(p.id),
            },
          ),
        );
      }),
    );
    if (!ps.length)
      grid.append(
        h(
          "p",
          { class: "empty" },
          "No packs match. Try a different search or theme.",
        ),
      );
    const area = document.getElementById("mix-area");
    area.replaceChildren();
    if (mixing)
      area.append(
        h(
          "div",
          { class: "mixbar" },
          h(
            "strong",
            {},
            selected.size +
              " packs selected · " +
              available([...selected].map(getPack).filter(Boolean)).length +
              " cards",
          ),
          btn("Set up mix →", () => go("setup"), "white", {
            disabled: !selected.size,
          }),
        ),
      );
    document.querySelectorAll(".tabs button").forEach((b, i) => {
      if (i < 2)
        b.setAttribute(
          "aria-pressed",
          String(i === 0 ? !favoriteOnly : favoriteOnly),
        );
    });
  }
  function openPack(p) {
    if (mixing) {
      selected.has(p.id) ? selected.delete(p.id) : selected.add(p.id);
      renderGrid();
    } else {
      selected = new Set([p.id]);
      match = null;
      matchSettings = null;
      go("setup");
    }
  }
  function quick() {
    selected = new Set([builtins.find((p) => p.number === 120).id]);
    match = null;
    matchSettings = null;
    go("setup");
  }
  const modeLabels = {
    classic: "Classic verbal clues",
    charades: "Charades only",
    sounds: "Sounds only",
    impressions: "Impressions",
  };
  const modeRules = {
    classic:
      "Describe the answer without saying it or obvious parts of it. Humans decide whether a guess is correct.",
    charades: "Act it out. No speaking, spelling, or lip-reading the answer.",
    sounds:
      "Make sounds, but use no words. The answer is still the card shown.",
    impressions:
      "Act or sound like the prompt. Avoid saying the answer; no ethnic-accent prompts.",
  };
  function setup() {
    const ps = [...selected].map(getPack).filter(Boolean),
      deck = available(ps),
      s = store.settings,
      small = deck.length < 12;
    return h(
      "div",
      { class: "narrow" },
      btn("← Pack library", () => go("home"), "outline small"),
      ...title(
        ps.length === 1 ? ps[0].name : "Your party mix",
        ps.length === 1
          ? ps[0].description
          : ps.length +
              " packs, shuffled evenly with shared answers deduplicated.",
      ),
      h(
        "div",
        { class: "chips" },
        ps.map((p) => h("span", { class: "chip" }, p.icon + " " + p.name)),
      ),
      h(
        "div",
        { class: "panel" },
        h("div", { class: "count" }, deck.length),
        h("span", { class: "muted" }, "cards with your current filters"),
        h(
          "div",
          { class: "chips" },
          deck.slice(0, 4).map((c) => h("span", { class: "chip" }, c.answer)),
        ),
        small &&
          notice(
            deck.length
              ? "Small deck: the round ends when all cards are played."
              : "No cards match. Change difficulty, age, clue mode, or family filtering.",
          ),
        h(
          "div",
          { class: "settings-grid" },
          select(
            "Round length",
            [
              ["30", "30 seconds"],
              ["60", "60 seconds"],
              ["90", "90 seconds"],
              ["120", "120 seconds"],
              ["custom", "Custom length"],
            ],
            ["30", "60", "90", "120"].includes(String(s.duration))
              ? String(s.duration)
              : "custom",
            (x) =>
              x === "custom"
                ? prefs({ duration: 75 })
                : prefs({ duration: Number(x) }),
          ),
          input(
            "Seconds (15–300)",
            s.duration,
            (x) =>
              prefs({
                duration: Math.max(
                  15,
                  Math.min(300, Math.round(Number(x) || 60)),
                ),
              }),
            { type: "number", min: 15, max: 300 },
          ),
          select(
            "Difficulty",
            [
              ["all", "All difficulties"],
              ["easy", "Easy"],
              ["medium", "Medium"],
              ["hard", "Hard"],
            ],
            s.difficulty,
            (x) => prefs({ difficulty: x }),
          ),
          select(
            "Age familiarity",
            [
              ["0", "All ages"],
              ["6", "Ages 6–8"],
              ["9", "Ages 9–12"],
              ["13", "Ages 13+"],
              ["18", "All teen/general"],
            ],
            s.age,
            (x) => prefs({ age: Number(x) }),
          ),
          select("Clue rules", Object.entries(modeLabels), s.mode, (x) =>
            prefs({ mode: x }),
          ),
        ),
        toggle("Family mode", s.family, (x) => prefs({ family: x })),
        toggle(
          "Challenge: −1 per pass (score cannot go below 0)",
          s.challenge,
          (x) => prefs({ challenge: x }),
        ),
        notice(modeRules[s.mode]),
        h(
          "div",
          { class: "actions" },
          btn("Get ready →", () => prepare(false), "dark", {
            disabled: !deck.length,
          }),
          btn("Team game", () => go("teams"), "outline", {
            disabled: !deck.length,
          }),
          btn("Untimed practice", () => prepare(true), "outline", {
            disabled: !deck.length,
          }),
          ps.length > 1 &&
            btn(
              "★ Save favorite mix",
              () => {
                prefs({ favoriteMix: [...selected] }, false);
                toast("Favorite mix saved.");
              },
              "outline",
            ),
        ),
      ),
    );
  }
  function makeSettings(isPractice = false) {
    return {
      ...filters(),
      duration: store.settings.duration,
      challenge: store.settings.challenge,
      packIds: [...selected],
      practice: isPractice,
      packNames: [...selected].map((id) => getPack(id)?.name || id),
      teamLabel: match?.next?.label || null,
    };
  }
  function prepare(isPractice = false) {
    const ps = [...selected].map(getPack).filter(Boolean);
    const settings = matchSettings
      ? { ...matchSettings, teamLabel: match.next?.label }
      : makeSettings(isPractice);
    const deck = F.makeDeck(ps, registry, settings, seen);
    if (!deck.length) {
      const full = F.makeDeck(ps, registry, settings);
      if (!full.length) {
        toast("No cards match these filters.");
        return go("setup");
      }
      if (
        !confirm(
          "You have seen all matching cards this session. Reshuffle and allow them again?",
        )
      )
        return;
      full.forEach((c) => seen.delete(c.id));
      return prepare(isPractice);
    }
    initAudio();
    viewResult = null;
    pendingResume = false;
    warnedTen = false;
    lastSeconds = -1;
    control =
      store.settings.preferredControl === "tilt" && sensorAttached
        ? "tilt"
        : "buttons";
    practiced.clear();
    practice = false;
    gesture.calibrate();
    round.setup(deck, settings);
    page = "ready";
    if (control === "tilt") {
      round.state = "calibration";
      sensorLive = false;
      lastSample = 0;
      clearTimeout(sensorTimeout);
      sensorTimeout = setTimeout(() => {
        if (page === "ready" && !gesture.neutral) {
          control = "buttons";
          round.state = "setup";
          toast("Tilt readings are unavailable. Buttons are ready.");
          render();
        }
      }, 3000);
    }
    render();
  }
  function ready() {
    const calibrated = !!gesture.neutral;
    return h(
      "div",
      { class: "narrow" },
      btn(
        "← Round setup",
        () => {
          if (match) return go("scoreboard");
          go("setup");
        },
        "outline small",
      ),
      ...title(
        match?.next?.label || "Forehead. Friends. Flip.",
        "Hold the phone sideways at your forehead, with the screen facing your clue crew.",
      ),
      h(
        "div",
        { class: "phone-diagram", "aria-hidden": true },
        h("div", { class: "phone-face" }, "☺"),
        h("div", { class: "phone" }, "CLUE CREW ↗"),
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Choose your controls"),
        h(
          "p",
          {},
          "Tip the screen toward the floor for Correct. Tip it toward the ceiling to Pass. Return to your forehead between flips.",
        ),
        h(
          "div",
          { class: "actions" },
          btn(
            "Enable tilt",
            enableTilt,
            control === "tilt" ? "dark" : "outline",
          ),
          btn(
            "Use buttons",
            () => {
              sensorRequest++;
              clearTimeout(sensorTimeout);
              store.prefs({ preferredControl: "buttons" });
              control = "buttons";
              round.state = "setup";
              render();
            },
            control === "buttons" ? "dark" : "outline",
          ),
          btn(
            "Practice flips",
            () => {
              practice = true;
              practiced.clear();
              gesture.calibrate();
              if (control !== "tilt") enableTilt();
              else render();
            },
            "outline",
          ),
          btn(
            "Recalibrate",
            () => {
              gesture.calibrate();
              practiced.clear();
              practice = true;
              render();
            },
            "outline",
            { disabled: control !== "tilt" },
          ),
        ),
        h(
          "p",
          { id: "sensor-message", class: "muted" },
          control === "tilt"
            ? calibrated
              ? "Neutral calibrated. " +
                (practice
                  ? "Practice one down and one up flip."
                  : "You can practice both directions before starting.")
              : "Hold steady at your forehead for half a second…"
            : "Buttons are ready. A companion can tap; keyboard C/Down and P/Up also work.",
        ),
        control === "tilt" &&
          toggle("Invert tilt directions", store.settings.invert, (x) => {
            prefs({ invert: x }, false);
            gesture.invert = x;
            gesture.calibrate();
            practiced.clear();
            render();
          }),
        control === "tilt" &&
          h(
            "div",
            {},
            h("meter", {
              id: "pitch-meter",
              class: "practice-meter",
              min: -90,
              max: 90,
              value: gesture.pitch,
              "aria-label": "Tilt degrees",
            }),
            h(
              "p",
              { id: "practice-status" },
              "Correct " +
                (practiced.has("correct") ? "✓" : "○") +
                " · Pass " +
                (practiced.has("pass") ? "✓" : "○"),
            ),
          ),
        notice(modeRules[round.settings.mode]),
        h(
          "div",
          { class: "actions" },
          btn(
            "Start · 3, 2, 1 →",
            () => beginCountdown(pendingResume),
            "primary",
            {
              disabled:
                control === "tilt" &&
                (!calibrated || (practice && practiced.size < 2)),
            },
          ),
          btn(
            "Back to packs",
            () => {
              round.abandon();
              go("home");
            },
            "outline",
          ),
        ),
      ),
    );
  }
  let sensorRequest = 0;
  function enableTilt() {
    const token = ++sensorRequest;
    const api = globalThis.DeviceOrientationEvent;
    if (!isSecureContext || !api) {
      toast("Tilt needs a supported browser and HTTPS. Buttons are ready.");
      control = "buttons";
      return render();
    }
    // requestPermission is invoked synchronously inside this click handler.
    let permission;
    try {
      permission =
        typeof api.requestPermission === "function"
          ? api.requestPermission()
          : Promise.resolve("granted");
    } catch {
      permission = Promise.resolve("denied");
    }
    round.state = "permission";
    initAudio();
    render();
    Promise.resolve(permission)
      .then((result) => {
        if (token !== sensorRequest || page !== "ready") return;
        if (result !== "granted") {
          control = "buttons";
          round.state = "setup";
          toast(
            "Motion permission was denied. Continue with buttons, or allow motion in browser settings.",
          );
          render();
          return;
        }
        control = "tilt";
        round.state = "calibration";
        gesture.calibrate();
        sensorLive = false;
        lastSample = 0;
        if (!sensorAttached) {
          window.addEventListener("deviceorientation", onSensor);
          sensorAttached = true;
        }
        clearTimeout(sensorTimeout);
        sensorTimeout = setTimeout(() => {
          if (token !== sensorRequest || page !== "ready") return;
          if (!sensorLive || !gesture.neutral) {
            control = "buttons";
            round.state = "setup";
            toast("No usable sensor readings arrived. Manual play is ready.");
            render();
          }
        }, 3000);
        render();
      })
      .catch(() => {
        control = "buttons";
        round.state = "setup";
        toast("Tilt permission could not be enabled. Use buttons.");
        render();
      });
  }
  function displayAngle() {
    return screen.orientation?.angle ?? window.orientation ?? 0;
  }
  const gesture = (F.gesture = new F.Gesture({
    emit: (semantic) => {
      if (page === "ready") {
        if (semantic !== "neutral") {
          practiced.add(semantic);
          announce(
            semantic === "correct"
              ? "Correct practice flip"
              : "Pass practice flip",
          );
          sound(semantic);
        }
        render();
      } else if (
        round.state === "playing" &&
        control === "tilt" &&
        semantic !== "neutral"
      )
        action(semantic);
    },
    rotation: () => {
      if (round.state === "playing") round.pause("Screen orientation changed");
      if (page === "ready") {
        practiced.clear();
        render();
      }
      toast("Screen rotated. Hold at your forehead and recalibrate.");
    },
  }));
  function onSensor(e) {
    if (control !== "tilt") return;
    const was = !!gesture.neutral,
      previous = gesture.lastTime;
    const usable = gesture.sample({
      beta: e.beta,
      gamma: e.gamma,
      angle: displayAngle(),
      t: performance.now(),
    });
    if (gesture.lastTime > previous) {
      sensorLive = true;
      lastSample = performance.now();
    }
    if (usable && page === "ready") {
      const meter = document.getElementById("pitch-meter");
      if (meter) meter.value = gesture.pitch;
      if (!was && gesture.neutral) {
        store.prefs({ preferredControl: "tilt" });
        render();
      }
    }
    if (round.state === "playing" && gesture.neutral) {
      const node = document.getElementById("sensor-cue");
      if (node)
        node.textContent = gesture.armed
          ? "Tilt down ✓ · Tilt up ↷"
          : "Return to forehead";
    }
  }
  function initAudio() {
    if (!store.settings.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
    } catch {}
  }
  function sound(kind) {
    if (store.settings.sound && audio) {
      try {
        const notes =
          kind === "correct"
            ? [523, 659, 784]
            : kind === "pass"
              ? [440, 330]
              : kind === "end"
                ? [784, 659, 523]
                : [660];
        notes.forEach((hz, i) => {
          const o = audio.createOscillator(),
            g = audio.createGain(),
            t = audio.currentTime + i * 0.07;
          o.type = "sine";
          o.frequency.value = hz;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
          o.connect(g);
          g.connect(audio.destination);
          o.start(t);
          o.stop(t + 0.15);
        });
      } catch {}
    }
    if (store.settings.vibration && navigator.vibrate)
      try {
        navigator.vibrate(
          kind === "correct" ? 60 : kind === "pass" ? [25, 30, 25] : 30,
        );
      } catch {}
  }
  async function lock() {
    try {
      if ("wakeLock" in navigator && !document.hidden) {
        wake = await navigator.wakeLock.request("screen");
        wake.addEventListener("release", () => (wake = null));
      }
    } catch {}
  }
  function unlock() {
    wake?.release().catch(() => {});
    wake = null;
  }
  function beginCountdown(resume) {
    resume = resume || pendingResume;
    if (resume && pendingResume) round.state = "paused";
    pendingResume = false;
    if (control === "tilt" && !gesture.neutral) {
      toast("Hold steady to recalibrate, or use buttons.");
      page = "ready";
      pendingResume = resume;
      return render();
    }
    initAudio();
    gesture.disarm();
    countdownValue = 3;
    if (resume) round.resume();
    else round.countdown();
    page = "play";
    render();
    const token = ++countdownTask;
    let step = () => {
      if (token !== countdownTask || round.state !== "countdown") return;
      announce(String(countdownValue));
      sound("tick");
      renderPlay();
      if (countdownValue === 0) {
        resume ? round.resumeStart() : round.start();
        lock();
        return;
      }
      setTimeout(() => {
        countdownValue--;
        step();
      }, 1000);
    };
    step();
  }
  function action(outcome) {
    if (
      round.dispatch({
        roundId: round.id,
        cardId: round.active?.instanceId,
        outcome,
      })
    ) {
      gesture.disarm();
      sound(outcome);
      announce(outcome === "correct" ? "Correct" : "Passed");
    }
  }
  function onRound() {
    if (round.state === "playing") {
      if (round.active) seen.add(round.active.id);
      page = "play";
      saveInterrupted();
      renderPlay();
    } else if (round.state === "paused") {
      countdownTask++;
      gesture.disarm();
      unlock();
      page = "play";
      saveInterrupted();
      renderPlay();
      announce("Round paused");
    } else if (round.state === "results") {
      countdownTask++;
      unlock();
      gesture.disarm();
      store.set("interrupted", null);
      interrupted = null;
      const result = round.result();
      if (match) match.record(result);
      store.saveRound(result);
      viewResult = result;
      page = "results";
      sound("end");
      announce(result.reason);
      render();
      F.offline.activate();
    }
  }
  function saveInterrupted() {
    if (!["playing", "paused", "countdown"].includes(round.state)) return;
    store.set("interrupted", {
      round: round.snapshot(),
      control,
      seen: [...seen],
      match: match
        ? { names: match.names, rounds: match.rounds, turns: match.turns }
        : null,
      matchSettings,
    });
  }
  function restore() {
    const saved = interrupted;
    pendingResume = false;
    try {
      selected = new Set(saved.round.settings.packIds);
      seen = new Set(saved.seen || []);
      control = "buttons";
      match = saved.match
        ? Object.assign(
            new F.TeamMatch(saved.match.names, Math.min(5, saved.match.rounds)),
            { rounds: saved.match.rounds, turns: saved.match.turns },
          )
        : null;
      matchSettings = saved.matchSettings;
      round.restore(saved.round);
      interrupted = null;
    } catch {
      toast(
        "Interrupted data could not be restored. Saved personal packs are unaffected.",
      );
      store.set("interrupted", null);
      interrupted = null;
      render();
    }
  }
  function exitRound() {
    if (
      confirm(
        "End this round? It will be saved as abandoned and excluded from best scores.",
      )
    ) {
      round.abandon();
      match = null;
      matchSettings = null;
      page = "home";
      render();
    }
  }
  function playView() {
    const s = round.settings || {},
      name = s.teamLabel || s.packNames?.join(" + ") || "Flip Party";
    if (round.state === "countdown")
      return h(
        "main",
        { class: "play", style: "--play-color:#6750d8" },
        h(
          "div",
          { class: "play-top" },
          "Get ready · screen facing friends",
          btn("Exit", exitRound, "white small"),
        ),
        h(
          "div",
          { class: "answer-area" },
          h(
            "div",
            { class: "countdown-number", "aria-hidden": true },
            countdownValue || "GO!",
          ),
        ),
        h("p", { class: "sensor-status" }, modeRules[s.mode]),
      );
    if (round.state === "paused")
      return h(
        "main",
        { class: "play" },
        h(
          "div",
          { class: "answer-area" },
          h(
            "div",
            { class: "paused-card" },
            h("div", { class: "eyebrow" }, name),
            h("h1", {}, "Party on pause"),
            h(
              "p",
              {},
              (s.practice
                ? "Untimed practice"
                : Math.ceil(round.remaining / 1000) + " seconds remaining") +
                " · " +
                (round.pauses.at(-1)?.reason || "Paused"),
            ),
            h(
              "p",
              {},
              "Hold the phone at your forehead. Resume starts a fresh countdown.",
            ),
            h(
              "div",
              { class: "actions" },
              btn(
                "Resume",
                () => {
                  gesture.disarm();
                  if (control === "tilt" && !gesture.neutral) {
                    page = "ready";
                    pendingResume = true;
                    practice = false;
                    return render();
                  }
                  beginCountdown(true);
                },
                "primary",
              ),
              btn(
                "Use buttons & resume",
                () => {
                  control = "buttons";
                  beginCountdown(true);
                },
                "outline",
              ),
              btn("Exit round", exitRound, "outline"),
            ),
          ),
        ),
      );
    const feedback = !!round.feedbackUntil,
      answer = feedback
        ? round.lastOutcome === "correct"
          ? "Correct!"
          : "Passed"
        : round.active?.answer || "",
      len = answer.length,
      card = h(
        "h1",
        {
          class: "answer" + (len > 60 ? " very-long" : len > 28 ? " long" : ""),
          "aria-hidden": store.settings.accessible ? null : "true",
          "aria-live": store.settings.accessible ? "polite" : null,
        },
        feedback
          ? h(
              "span",
              { class: "feedback-symbol" },
              round.lastOutcome === "correct" ? "✓" : "↷",
            )
          : null,
        answer,
      );
    return h(
      "main",
      {
        class: "play" + (feedback ? " feedback-" + round.lastOutcome : ""),
        style: "--play-color:" + (getPack(s.packIds?.[0])?.color || "#6750d8"),
      },
      h(
        "div",
        { class: "play-top" },
        h(
          "strong",
          { id: "timer", class: "timer" },
          s.practice ? "∞" : Math.ceil(round.time() / 1000) + "s",
        ),
        h("span", { class: "pack-label" }, name),
        h("span", {}, F.score(round.attempts, s.challenge) + " pts"),
        btn("Pause", () => round.pause(), "white small", {
          "aria-label": "Pause round",
        }),
        s.practice &&
          btn("Finish", () => round.finish("Practice finished"), "white small"),
      ),
      h("div", { class: "answer-area" }, card),
      h(
        "div",
        { class: "play-bottom" },
        btn("✓ Correct", () => action("correct"), "correct-button", {
          disabled: feedback,
        }),
        h(
          "span",
          { id: "sensor-cue", class: "sensor-status" },
          control === "tilt"
            ? gesture.armed
              ? "Tilt down ✓ · Tilt up ↷"
              : "Return to forehead"
            : "Companion controls · C/Down, P/Up",
        ),
        btn("↷ Pass", () => action("pass"), "pass-button", {
          disabled: feedback,
        }),
      ),
    );
  }
  function renderPlay() {
    if (page !== "play") return;
    app.replaceChildren(playView());
    document.body.classList.toggle("reduced", store.settings.reduced);
    fitCard();
  }
  function fitCard() {
    requestAnimationFrame(() => {
      const el = app.querySelector(".answer"),
        area = app.querySelector(".answer-area");
      if (!el || !area) return;
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (
        (el.scrollHeight > area.clientHeight ||
          el.scrollWidth > area.clientWidth) &&
        size > 18
      ) {
        size -= 2;
        el.style.fontSize = size + "px";
      }
    });
  }
  let warnedTen = false,
    lastSeconds = -1;
  function frame() {
    if (round.state === "playing") {
      round.tick();
      if (round.state === "playing") {
        const seconds = Math.ceil(round.time() / 1000),
          timer = document.getElementById("timer");
        if (timer && !round.settings.practice)
          timer.textContent = seconds + "s";
        if (seconds !== lastSeconds) {
          lastSeconds = seconds;
          if (seconds === 10 && !warnedTen) {
            warnedTen = true;
            if (store.settings.alerts) sound("tick");
            announce("10 seconds remaining");
          } else if (seconds > 0 && seconds <= 3 && store.settings.alerts)
            sound("tick");
        }
        if (control === "tilt" && performance.now() - lastSample > 3000) {
          const cue = document.getElementById("sensor-cue");
          if (cue) cue.textContent = "Sensor unavailable · use buttons";
          gesture.disarm();
        }
        if (performance.now() - lastSnapshot > 2000) {
          lastSnapshot = performance.now();
          saveInterrupted();
        }
      }
    }
    requestAnimationFrame(frame);
  }
  function updateResult(r) {
    r.points = F.score(r.attempts, r.settings.challenge);
    store.saveRound(r);
    if (match?.turns.some((t) => t.result.id === r.id)) match.record(r);
    if (round.id === r.id) {
      round.attempts = r.attempts;
      round.unanswered = r.unanswered;
    }
    render();
  }
  function results() {
    const r = viewResult;
    if (!r) return h("p", {}, "No round yet.");
    const correct = r.attempts.filter((a) => a.outcome === "correct").length,
      passed = r.attempts.filter((a) => a.outcome === "pass").length,
      unanswered =
        (r.unanswered ? 1 : 0) +
        r.attempts.filter((a) => a.outcome === "unanswered").length;
    return h(
      "div",
      { class: "narrow" },
      ...title(
        r.abandoned
          ? "Round abandoned"
          : r.reason === "All cards played"
            ? "You played the whole deck!"
            : "That’s a wrap!",
        r.settings.teamLabel || r.settings.packNames?.join(" + "),
      ),
      h(
        "div",
        { class: "score-grid" },
        [
          ["Points", F.score(r.attempts, r.settings.challenge)],
          ["Correct", correct],
          ["Passed", passed],
          ["Unanswered", unanswered],
        ].map(([label, value]) =>
          h(
            "div",
            { class: "score-stat" },
            h("strong", {}, value),
            h("span", {}, label),
          ),
        ),
      ),
      r.settings.challenge &&
        notice("Challenge rule: max(0, correct − passed)."),
      r.settings.practice &&
        notice("Untimed practice · saved separately from competitive scores."),
      r.pauses.length > 0 &&
        notice(
          "Paused " +
            r.pauses.length +
            " time(s): " +
            r.pauses.map((p) => p.reason).join(" · "),
        ),
      h(
        "div",
        { class: "actions" },
        match
          ? btn(
              match.next ? "Next player →" : "See scoreboard →",
              () => (match.next ? prepare(false) : go("scoreboard")),
              "primary",
            )
          : btn(
              "Play again ↗",
              () => {
                warnedTen = false;
                selected = new Set(r.settings.packIds);
                prepare(r.settings.practice);
              },
              "primary",
            ),
        btn(
          "Choose another pack",
          () => {
            match = null;
            matchSettings = null;
            go("home");
          },
          "outline",
        ),
        match && btn("Team scoreboard", () => go("scoreboard"), "outline"),
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Your round, card by card"),
        h(
          "p",
          { class: "muted" },
          "Tap an outcome to fix a human input mistake. Edited cards are marked.",
        ),
        h(
          "div",
          { class: "results-list" },
          [...r.attempts, ...(r.unanswered ? [r.unanswered] : [])].map((a) => {
            const outcome = h(
              "select",
              {
                "aria-label": "Outcome for " + a.answer,
                on: {
                  change: (e) => {
                    if (a === r.unanswered) {
                      r.unanswered = null;
                      r.attempts.push(a);
                    }
                    a.outcome = e.target.value;
                    a.edited = true;
                    updateResult(r);
                  },
                },
              },
              [
                ["correct", "✓ Correct"],
                ["pass", "↷ Passed"],
                ["unanswered", "— Unanswered"],
              ].map(([v, l]) =>
                h("option", { value: v, selected: a.outcome === v }, l),
              ),
            );
            outcome.value = a.outcome;
            return h(
              "div",
              { class: "result-row" },
              h(
                "div",
                {},
                a.answer,
                a.edited && h("span", { class: "edited" }, "Edited"),
              ),
              outcome,
            );
          }),
        ),
        !r.attempts.length &&
          !r.unanswered &&
          h("p", {}, "No cards were attempted."),
      ),
    );
  }
  function teams() {
    let names = ["Team Blue", "Team Orange"],
      rounds = 3;
    const box = h("div", {});
    function namesFields() {
      box.replaceChildren(
        ...names.map((name, i) =>
          input(
            "Team " + (i + 1),
            name,
            (x) => (names[i] = x.trim().slice(0, 40) || "Team " + (i + 1)),
            { maxlength: 40 },
          ),
        ),
      );
    }
    namesFields();
    return h(
      "div",
      { class: "narrow" },
      ...title(
        "Friendly rivalry, anyone?",
        "Each team gets one turn per round, in this order. Pack mix, timer, filters, and scoring stay locked for the whole match.",
      ),
      h(
        "div",
        { class: "panel" },
        select(
          "Number of teams",
          [2, 3, 4, 5, 6].map((n) => [String(n), String(n)]),
          2,
          (x) => {
            names = Array.from(
              { length: Number(x) },
              (_, i) => names[i] || "Team " + (i + 1),
            );
            namesFields();
          },
        ),
        box,
        select(
          "Rounds per team",
          [1, 2, 3, 4, 5].map((n) => [String(n), String(n)]),
          3,
          (x) => (rounds = Number(x)),
        ),
        notice(
          store.settings.duration +
            " seconds · " +
            store.settings.difficulty +
            " difficulty · " +
            modeLabels[store.settings.mode] +
            " · " +
            (store.settings.challenge
              ? "Challenge scoring"
              : "1 point per correct"),
        ),
        h(
          "div",
          { class: "actions" },
          btn(
            "Start team match",
            () => {
              if (new Set(names.map(F.normalize)).size !== names.length)
                return toast("Give every team a different name.");
              match = new F.TeamMatch(names, rounds);
              matchSettings = makeSettings(false);
              prepare(false);
            },
            "primary",
          ),
          btn("Back", () => go("setup"), "outline"),
        ),
      ),
    );
  }
  function scoreboard() {
    if (!match)
      return h(
        "div",
        {},
        ...title("No match in progress"),
        btn("Choose packs", () => go("home"), "primary"),
      );
    const totals = match.totals;
    return h(
      "div",
      { class: "narrow" },
      ...title(
        match.next ? "Team scoreboard" : "All turns complete",
        match.next
          ? match.next.label
          : "Winner" +
              (match.winners.length > 1 ? "s" : "") +
              ": " +
              match.winners.join(" & "),
      ),
      h(
        "table",
        { class: "table" },
        h(
          "thead",
          {},
          h(
            "tr",
            {},
            h("th", {}, "Team"),
            h("th", {}, "Points"),
            h("th", {}, "Turns"),
          ),
        ),
        h(
          "tbody",
          {},
          totals.map((t, i) =>
            h(
              "tr",
              {},
              h("td", {}, t.name),
              h("td", { class: "team-score" }, t.points),
              h(
                "td",
                {},
                match.turns.filter((x) => x.team === i).length +
                  "/" +
                  match.rounds,
              ),
            ),
          ),
        ),
      ),
      h(
        "div",
        { class: "actions" },
        match.next
          ? btn("Next player →", () => prepare(false), "primary")
          : match.winners.length > 1 &&
              btn(
                "Equal-turn tiebreaker",
                () => {
                  match.extend();
                  prepare(false);
                },
                "primary",
              ),
        btn(
          "New game",
          () => {
            match = null;
            matchSettings = null;
            go("home");
          },
          "outline",
        ),
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Review completed turns"),
        match.turns.map((t) =>
          h(
            "div",
            { class: "history-row" },
            h(
              "div",
              {},
              t.label,
              h("br"),
              F.score(t.result.attempts, t.result.settings.challenge) +
                " points",
            ),
            btn(
              "Review / correct",
              () => {
                viewResult = t.result;
                go("results");
              },
              "outline small",
            ),
          ),
        ),
      ),
    );
  }
  function custom() {
    return h(
      "div",
      { class: "narrow" },
      ...title(
        "Your people. Your prompts.",
        "Inside jokes, family favorites, or a pack for your next gathering. Personal packs stay on this device.",
      ),
      h(
        "div",
        { class: "actions" },
        btn(
          "＋ Create a pack",
          () => {
            editor = null;
            importPreview = null;
            go("editor");
          },
          "primary",
        ),
        btn(
          "Import JSON or text",
          () => {
            editor = null;
            importPreview = null;
            go("import");
          },
          "outline",
        ),
      ),
      store.memory.packs.length
        ? store.memory.packs.map((item) =>
            h(
              "div",
              { class: "panel" },
              h("h2", {}, item.pack.name),
              h("p", { class: "muted" }, item.cards.length + " cards"),
              h(
                "div",
                { class: "actions" },
                btn("Play", () => openPack(item.pack), "dark"),
                btn(
                  "Edit",
                  () => {
                    editor = item;
                    importPreview = null;
                    go("editor");
                  },
                  "outline small",
                ),
                btn(
                  "Duplicate",
                  () => {
                    editor = {
                      ...item,
                      pack: {
                        ...item.pack,
                        name: (item.pack.name + " copy").slice(0, 80),
                        id: null,
                      },
                    };
                    importPreview = null;
                    go("editor");
                  },
                  "outline small",
                ),
                btn(
                  "Export JSON",
                  () =>
                    download(
                      item.pack.name + ".json",
                      JSON.stringify(F.exportPack(item), null, 2),
                      "application/json",
                    ),
                  "outline small",
                ),
                btn(
                  "Export text",
                  () =>
                    download(
                      item.pack.name + ".txt",
                      item.cards.map((c) => c.answer).join("\n"),
                      "text/plain;charset=utf-8",
                    ),
                  "outline small",
                ),
                btn(
                  "Delete",
                  async () => {
                    if (
                      !confirm(
                        "Delete personal pack “" +
                          item.pack.name +
                          "”? Export it first if you want a backup.",
                      )
                    )
                      return;
                    await store.set(
                      "packs",
                      store.memory.packs.filter(
                        (p) => p.pack.id !== item.pack.id,
                      ),
                    );
                    reloadPersonal();
                    render();
                  },
                  "outline small",
                ),
              ),
            ),
          )
        : h(
            "div",
            { class: "empty" },
            "Your first pack starts with one good idea.",
          ),
      notice(
        "Export a backup. Browser data removal or storage eviction can remove packs and history.",
      ),
    );
  }
  function editorView() {
    let name = editor?.pack.name || "My party pack",
      difficulty = editor?.cards[0]?.difficulty || "easy",
      minAge = editor?.cards[0]?.minAge || 6;
    const area = h(
      "textarea",
      { placeholder: "One answer per line", maxlength: 1700000 },
      editor?.cards.map((c) => c.answer).join("\n") || "",
    );
    return h(
      "div",
      { class: "narrow" },
      ...title(
        editor?.pack.id ? "Edit your pack" : "Create your pack",
        "Use short, readable prompts. Preview checks empty answers, duplicates, and length before saving.",
      ),
      h(
        "div",
        { class: "panel" },
        input("Pack name", name, (x) => (name = x), { maxlength: 80 }),
        h(
          "div",
          { class: "settings-grid" },
          select(
            "Difficulty for this list",
            [
              ["easy", "Easy"],
              ["medium", "Medium"],
              ["hard", "Hard"],
            ],
            difficulty,
            (x) => (difficulty = x),
          ),
          input("Age guidance (3–18)", minAge, (x) => (minAge = Number(x)), {
            type: "number",
            min: 3,
            max: 18,
          }),
        ),
        field("Cards · one per line", area),
        h(
          "div",
          { class: "actions" },
          btn(
            "Preview pack",
            () => {
              try {
                importPreview = F.validateImport(area.value, {
                  format: "text",
                  name,
                  difficulty,
                  minAge,
                });
                go("preview");
              } catch (e) {
                toast(e.message);
              }
            },
            "primary",
          ),
          btn("Cancel", () => go("custom"), "outline"),
        ),
      ),
    );
  }
  function importView() {
    let format = "json",
      name = "Imported pack";
    const area = h("textarea", {
      placeholder: "Paste a schemaVersion 1 export, or choose plain text.",
    });
    const file = h("input", {
      type: "file",
      accept: ".json,.txt,application/json,text/plain",
      on: {
        change: async (e) => {
          const picked = e.target.files[0];
          if (!picked) return;
          if (picked.size > 5 * 1024 * 1024)
            return toast("Maximum import size is 5 MB.");
          try {
            area.value = await picked.text();
            format = picked.name.toLowerCase().endsWith(".txt")
              ? "text"
              : "json";
            document.getElementById("import-format").value = format;
          } catch {
            toast("Could not read that file.");
          }
        },
      },
    });
    const formatField = select(
      "Format",
      [
        ["json", "Flip Party JSON"],
        ["text", "UTF-8 text · one answer per line"],
      ],
      format,
      (x) => (format = x),
    );
    formatField.querySelector("select").id = "import-format";
    return h(
      "div",
      { class: "narrow" },
      ...title(
        "Bring your own cards",
        "Imports are validated before anything is saved. Built-in cards are never replaced.",
      ),
      h(
        "div",
        { class: "panel" },
        field("Choose a file (maximum 5 MB / 10,000 cards)", file),
        formatField,
        input("Name for a text pack", name, (x) => (name = x), {
          maxlength: 80,
        }),
        field("Or paste content", area),
        h(
          "div",
          { class: "actions" },
          btn(
            "Validate & preview",
            () => {
              try {
                importPreview = F.validateImport(area.value, { format, name });
                go("preview");
              } catch (e) {
                toast("Import rejected: " + e.message);
              }
            },
            "primary",
          ),
          btn("Cancel", () => go("custom"), "outline"),
        ),
      ),
    );
  }
  function previewView() {
    if (!importPreview) return editorView();
    const p = importPreview,
      conflicts = store.memory.packs.filter(
        (x) => F.normalize(x.pack.name) === F.normalize(p.pack.name),
      ),
      editing = !!editor?.pack.id;
    let choice = editing ? "replace" : "separate";
    return h(
      "div",
      { class: "narrow" },
      ...title("Looks like a party.", p.pack.name),
      h(
        "div",
        { class: "panel" },
        notice(
          p.accepted +
            " accepted · " +
            p.duplicates +
            " duplicates · " +
            p.rejected +
            " rejected",
          !!p.accepted,
        ),
        h(
          "ol",
          { class: "import-preview" },
          p.cards.slice(0, 50).map((c) => h("li", {}, c.answer)),
        ),
        p.accepted > 50 &&
          h("p", {}, "Showing first 50 of " + p.accepted + " prompts."),
        editing || conflicts.length > 0
          ? select(
              "Save conflict choice",
              [
                ["separate", "Create a separate personal pack"],
                ...(editing
                  ? [["replace", "Replace the personal pack being edited"]]
                  : []),
              ],
              choice,
              (x) => (choice = x),
            )
          : notice(
              "Will create a new personal pack. Built-in packs are never overwritten.",
            ),
        h(
          "div",
          { class: "actions" },
          btn(
            "Save personal pack",
            async () => {
              if (!p.accepted) return;
              if (choice === "replace" && editor?.pack.id)
                p.pack.id = editor.pack.id;
              else if (
                conflicts.length ||
                builtins.some(
                  (x) => F.normalize(x.name) === F.normalize(p.pack.name),
                )
              )
                p.pack.name = (
                  p.pack.name +
                  " (personal " +
                  new Date().toLocaleTimeString() +
                  ")"
                ).slice(0, 80);
              const items = store.memory.packs.filter(
                (x) => x.pack.id !== p.pack.id,
              );
              items.push({ pack: p.pack, cards: p.cards });
              await store.set("packs", items);
              reloadPersonal();
              editor = null;
              importPreview = null;
              go("custom");
              toast("Personal pack saved.");
            },
            "primary",
            { disabled: !p.accepted },
          ),
          btn(
            "Back to editing",
            () => go(page === "preview" && editor ? "editor" : "import"),
            "outline",
          ),
        ),
      ),
    );
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type }),
      url = URL.createObjectURL(blob),
      a = h("a", { href: url, download: name.replace(/[/\\]/g, "-") });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  function settings() {
    const s = store.settings;
    return h(
      "div",
      { class: "narrow" },
      ...title(
        "Make it your kind of party.",
        "Preferences, local data, and offline files.",
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Play preferences"),
        toggle("Sound effects", s.sound, (x) => {
          prefs({ sound: x });
          if (x) {
            initAudio();
            sound("correct");
          }
        }),
        toggle("Vibration (when supported)", s.vibration, (x) =>
          prefs({ vibration: x }),
        ),
        toggle(
          "Timer alerts at 10 seconds and final 3 seconds",
          s.alerts,
          (x) => prefs({ alerts: x }),
        ),
        toggle("Invert tilt controls", s.invert, (x) => {
          gesture.invert = x;
          prefs({ invert: x });
        }),
        toggle("Reduce motion", s.reduced, (x) => prefs({ reduced: x })),
        toggle(
          "Clue-giver screen reader mode (announces answers)",
          s.accessible,
          (x) => prefs({ accessible: x }),
        ),
        notice(
          "Standard forehead mode never announces the answer. Enable clue-giver mode only when the person operating the phone should hear it.",
        ),
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Offline & version"),
        h("p", {}, "App version " + F.VERSION),
        h("p", { id: "offline-detail" }, F.offline.status),
        h(
          "div",
          { class: "actions" },
          btn(
            "Refresh offline files",
            async () => {
              await F.offline.refresh();
              render();
            },
            "outline",
          ),
          btn("Installation guide", () => go("help"), "outline"),
        ),
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Local data"),
        notice(
          store.persistent
            ? "Saved on this browser/device. Data removal or OS storage eviction can remove offline files and saved content."
            : "Storage is unavailable. Current play works in memory; export before closing.",
          store.persistent,
        ),
        h(
          "div",
          { class: "actions" },
          store.recovery.length &&
            btn(
              "Export damaged data for recovery",
              () =>
                download(
                  "flip-party-recovery.json",
                  JSON.stringify(store.recovery, null, 2),
                  "application/json",
                ),
              "outline",
            ),
          btn(
            "Export settings",
            () =>
              download(
                "flip-party-settings.json",
                JSON.stringify({ schemaVersion: 1, settings: s }, null, 2),
                "application/json",
              ),
            "outline",
          ),
          btn(
            "Export history",
            () =>
              download(
                "flip-party-history.json",
                JSON.stringify(
                  { schemaVersion: 1, history: store.memory.history },
                  null,
                  2,
                ),
                "application/json",
              ),
            "outline",
          ),
          btn(
            "Reset scores only",
            async () => {
              if (
                confirm(
                  "Delete round history and best scores? Personal packs remain.",
                )
              ) {
                await store.set("history", []);
                toast("Scores reset.");
              }
            },
            "outline",
          ),
          btn(
            "Clear personal packs",
            async () => {
              if (confirm("Delete all personal packs? Export backups first.")) {
                await store.set("packs", []);
                reloadPersonal();
                render();
              }
            },
            "outline",
          ),
          btn(
            "Clear all saved data",
            async () => {
              if (
                !confirm(
                  "Delete personal packs, settings, history, and interrupted round? Export first.",
                )
              )
                return;
              await store.set("packs", []);
              await store.set("history", []);
              await store.set("interrupted", null);
              store.prefs({ ...F.defaults });
              seen.clear();
              reloadPersonal();
              interrupted = null;
              render();
              toast("Saved data reset.");
            },
            "outline",
          ),
          btn(
            "Clear session seen cards",
            () => {
              if (confirm("Allow all cards to be drawn again this session?")) {
                seen.clear();
                toast("Session deck reset.");
              }
            },
            "outline",
          ),
        ),
      ),
    );
  }
  function history() {
    const rounds = store.memory.history.filter(
        (r) =>
          historyFilter === "all" ||
          (historyFilter === "practice"
            ? r.settings.practice
            : !r.settings.practice),
      ),
      best = new Map();
    for (const r of store.memory.history) {
      if (r.abandoned || r.settings.practice) continue;
      const key = F.bestKey(r.settings),
        points = F.score(r.attempts, r.settings.challenge);
      if (!best.has(key) || points > best.get(key).points)
        best.set(key, { r, points });
    }
    return h(
      "div",
      { class: "narrow" },
      ...title(
        "The party scrapbook",
        "Last 100 rounds, saved once per round. Practice and abandoned rounds do not count toward best scores.",
      ),
      select(
        "Show",
        [
          ["all", "All rounds"],
          ["competitive", "Timed rounds"],
          ["practice", "Practice rounds"],
        ],
        historyFilter,
        (x) => {
          historyFilter = x;
          render();
        },
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Best scores by rules"),
        [...best.values()]
          .slice(0, 20)
          .map(({ r, points }) =>
            h(
              "div",
              { class: "history-row" },
              h(
                "div",
                {},
                r.settings.packNames?.join(" + "),
                h("br"),
                h(
                  "small",
                  { class: "muted" },
                  r.settings.duration +
                    "s · " +
                    r.settings.difficulty +
                    " · " +
                    modeLabels[r.settings.mode] +
                    " · " +
                    (r.settings.challenge ? "challenge" : "classic scoring") +
                    " · age " +
                    (r.settings.age || "all"),
                ),
              ),
              h("strong", {}, points + " pts"),
            ),
          ),
        !best.size &&
          h("p", { class: "muted" }, "Your first best score is waiting."),
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Recent rounds"),
        rounds.map((r) =>
          h(
            "div",
            { class: "history-row" },
            h(
              "div",
              {},
              r.settings.teamLabel ||
                r.settings.packNames?.join(" + ") ||
                "Round",
              h("br"),
              h(
                "small",
                { class: "muted" },
                new Date(r.date).toLocaleString() +
                  " · " +
                  (r.abandoned
                    ? "Abandoned"
                    : r.settings.practice
                      ? "Practice"
                      : F.score(r.attempts, r.settings.challenge) + " pts") +
                  (r.pauses.length ? " · paused" : ""),
              ),
            ),
            btn(
              "Review",
              () => {
                viewResult = r;
                go("results");
              },
              "outline small",
            ),
          ),
        ),
        !rounds.length && h("p", { class: "muted" }, "No rounds yet."),
      ),
    );
  }
  function help() {
    return h(
      "div",
      { class: "narrow" },
      ...title(
        "Good clues. Great company.",
        "One player guesses. Everyone else gives clues. The app does not listen, record, or judge answers.",
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "How to play"),
        h(
          "ol",
          {},
          h("li", {}, "Choose a pack or mix. Set a timer and clue rules."),
          h(
            "li",
            {},
            "Hold your phone sideways against your forehead, screen outward.",
          ),
          h(
            "li",
            {},
            "Enable tilt from a tap, hold steady to calibrate, and practice both flips.",
          ),
          h(
            "li",
            {},
            "Tip the screen toward the floor for Correct. Tip toward the ceiling to Pass.",
          ),
          h(
            "li",
            {},
            "Return to your forehead between flips. A new card appears while the gesture stays disarmed.",
          ),
          h("li", {}, "Review results and fix any human input mistakes."),
        ),
        notice(
          "One point per correct guess. Passes cost zero by default. Challenge scoring is optional and subtracts one per pass, with a zero floor.",
        ),
        notice(
          "Younger readers may need an adult clue-giver. The Kids preset uses easy, age-6 prompts and 90 seconds.",
        ),
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Install once. Play offline."),
        h(
          "p",
          {},
          "Serve the PWA directory on a static HTTPS host. Open it online and wait for “Ready offline” in Settings before disconnecting.",
        ),
        h(
          "details",
          {},
          h("summary", {}, "iPhone · Safari and Home Screen"),
          h(
            "ol",
            {},
            h(
              "li",
              {},
              "Open the HTTPS address in Safari. Wait for Ready offline.",
            ),
            h("li", {}, "Tap Share, then Add to Home Screen, then Add."),
            h(
              "li",
              {},
              "Launch from the icon while online once, then close, enable airplane mode, and relaunch.",
            ),
            h(
              "li",
              {},
              "Tap Enable tilt and allow orientation access if prompted.",
            ),
          ),
          h(
            "p",
            {},
            "A local HTML attachment in iOS Files or Quick Look may not run JavaScript or expose sensors. Use the installed HTTPS app. Guaranteed never-online iPhone installation with sensors would require a separate native wrapper/distribution project.",
          ),
        ),
        h(
          "details",
          {},
          h("summary", {}, "Android / desktop / portable file"),
          h(
            "p",
            {},
            "Chrome: use the Install app menu when available. The single HTML file runs manually offline wherever local HTML execution is allowed. Tilt depends on browser permission and secure context. No network requests are needed by the portable edition.",
          ),
        ),
        notice(
          "Verify airplane-mode relaunch, three different packs, a custom pack, and saved settings/history. Browser data deletion and OS storage eviction can remove both cached files and saved data. Export your personal packs.",
        ),
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "If tilt feels off"),
        h(
          "p",
          {},
          "Use either landscape grip, calibrate at your forehead, and practice a down and up flip. Try Invert controls if your grip reverses the expected direction. Rotation pauses play and requires recalibration.",
        ),
        h(
          "p",
          {},
          "If permission is denied, change Safari/browser motion settings and retry. If readings stop or no sensor is available, a companion can use the labeled buttons.",
        ),
        h(
          "p",
          {},
          "Keyboard: C or Down = Correct; P or Up = Pass; Space = pause/resume; Escape = confirm exit. Shortcuts are ignored while typing and repeated key presses cannot score.",
        ),
        btn(
          "Open sensor practice",
          () => {
            if (!selected.size)
              selected = new Set([builtins.find((p) => p.number === 120).id]);
            prepare(true);
            practice = true;
            render();
          },
          "outline",
        ),
        h(
          "details",
          {},
          h("summary", {}, "Sensor diagnostics"),
          h(
            "pre",
            { id: "diagnostics" },
            "Enable tilt on the Ready screen to inspect calibration.",
          ),
        ),
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Casual-game pause policy"),
        h(
          "p",
          {},
          "If the page becomes hidden, focus is interrupted, or the screen locks, the round pauses with time preserved. Resume requires a tap and countdown. Screen wake lock is requested when supported, and failure is harmless.",
        ),
        h(
          "p",
          {},
          "An interrupted reload offers a paused recovery with buttons; it never restarts a scoring timer automatically. Exiting records an abandoned round.",
        ),
      ),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Content & device validation"),
        h(
          "p",
          {},
          "Content review: " + F.DATA.reviewDate + ". " + F.DATA.contentNote,
        ),
        notice(
          "Physical phone tilt and direct local-file launch were verified by the project owner before this visual update. This build rechecks the sensor workflow with synthetic readings. Device models, browser versions, and installed airplane-mode acceptance still need to be recorded in the included checklist.",
        ),
      ),
    );
  }
  function render() {
    if (page === "play") return renderPlay();
    const views = {
      home,
      setup,
      ready,
      results,
      teams,
      scoreboard,
      custom,
      editor: editorView,
      import: importView,
      preview: previewView,
      settings,
      history,
      help,
    };
    app.replaceChildren(shell((views[page] || home)()));
    document.body.classList.toggle("reduced", store.settings.reduced);
    if (page === "home") renderGrid();
  }
  document.addEventListener("keydown", (e) => {
    if (
      e.repeat ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) ||
      e.target.isContentEditable
    )
      return;
    const key = e.key.toLowerCase();
    if (
      ["playing", "paused"].includes(round.state) &&
      ["c", "arrowdown", "p", "arrowup", " ", "escape"].includes(key)
    ) {
      e.preventDefault();
      if (key === "escape") exitRound();
      else if (key === " ")
        round.state === "playing" ? round.pause() : beginCountdown(true);
      else if (round.state === "playing")
        action(["c", "arrowdown"].includes(key) ? "correct" : "pass");
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (round.state === "playing") round.pause("Page hidden / phone locked");
      else if (round.state === "countdown") {
        countdownTask++;
        round.state = "paused";
        round.pauses.push({
          reason: "Countdown interrupted",
          at: new Date().toISOString(),
        });
        page = "play";
        saveInterrupted();
        renderPlay();
      }
      unlock();
    }
  });
  window.addEventListener("blur", () => {
    if (round.state === "playing") round.pause("Focus interrupted");
    else if (round.state === "countdown") {
      countdownTask++;
      round.state = "paused";
      round.pauses.push({
        reason: "Focus interrupted during countdown",
        at: new Date().toISOString(),
      });
      page = "play";
      saveInterrupted();
      renderPlay();
    }
  });
  let lastOrientation = displayAngle();
  function orientationChanged() {
    const angle = displayAngle();
    if (angle === lastOrientation) return;
    lastOrientation = angle;
    if (round.state === "playing") round.pause("Screen orientation changed");
    gesture.calibrate();
    practiced.clear();
    if (page === "ready") render();
  }
  screen.orientation?.addEventListener("change", orientationChanged);
  window.addEventListener("orientationchange", orientationChanged);
  window.addEventListener("resize", fitCard);
  window.addEventListener("pagehide", () => {
    if (round.state === "playing") round.pause("Page closed");
    saveInterrupted();
  });
  F.offline.listeners.push((status) => {
    for (const id of ["offline-foot", "offline-detail"]) {
      const node = document.getElementById(id);
      if (node) node.textContent = status;
    }
  });
  store.init().then(() => {
    reloadPersonal();
    interrupted = store.memory.interrupted;
    gesture.invert = store.settings.invert;
    render();
    F.offline.init();
    requestAnimationFrame(frame);
  });
})();
