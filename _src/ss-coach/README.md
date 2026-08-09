# S&S Coach

A production-quality Progressive Web App for practicing the **Simple &
Sinister** kettlebell program (Pavel Tsatsouline, 2019 revised edition).
Fully static, no backend, no accounts — all data lives in the device's
`localStorage`.

**Live:** https://xebradelta.github.io/ss/

- Vite + React + TypeScript, hash-based routing (deep links work on GitHub
  Pages with no 404 tricks)
- Offline-first PWA: manifest, 192/512/maskable icons, hand-rolled
  precaching service worker — installs on iOS and Android and works fully
  offline after the first visit
- Dark-by-default, one-handed, sweaty-thumb UI: giant tap targets, WCAG AA
  contrast, visible focus, reduced-motion support
- Screen Wake Lock during sessions, Web Audio timer cues, vibration where
  supported

## Repo layout (this repo is unusual)

The umbrella repo `xebradelta.github.io` serves GitHub Pages **from the
main branch root with no build step**, so this app deviates from the usual
"Actions builds to Pages" recipe:

| Path             | Role                                                    |
| ---------------- | ------------------------------------------------------- |
| `_src/ss-coach/` | Vite source (underscore prefix = excluded by Jekyll)    |
| `ss/`            | committed build output, served at `/ss/`                |

`vite.config.ts` sets `base: "./"` and the service worker resolves every
path against its own scope, so the built app works at any mount point.

## Local development

```bash
cd _src/ss-coach
npm install
npm run dev        # Vite dev server (no SW in dev)
npm run build      # regenerates icons, type-checks, builds into ../../ss/
npm run preview    # serve the production build (SW active)
npm run journey    # full simulated user journey (see below)
```

The journey script drives the real built app in headless Chromium through:
onboarding → three practice sessions at different weights → an interrupted
and resumed session → a timed test → JSON export → guarded wipe → import
restoring everything → corrupt-import rejection → an airplane-mode reload.

## Deployment

Pushing to `main` publishes whatever is in `ss/` (Pages deploys the branch
root; allow a minute). The workflow `.github/workflows/ss-coach.yml` builds
from source on every push/PR touching `_src/ss-coach/`; if the committed
`ss/` doesn't match the source it fails the PR (or, on `main`, commits the
fresh build itself). Day-to-day: run `npm run build` and commit both
directories together.

Enabling Pages on a fork/new repo: **Settings → Pages → Deploy from a
branch → `main` / root**. That's all this repo uses.

## Data model

One versioned document under the `localStorage` key `ss-coach:state`:

```
{
  schemaVersion: 2,
  profile:   { sex, ageRange, condition, bells[], painFlags[], createdAt },
  settings:  { units, sound, vibration, theme, trainingDays[] },
  swings:    Track & { style },     // see below
  getups:    Track,
  sessions:  SessionLog[],          // completed practice + test sessions
  active:    ActiveSession | null,  // in-flight session, autosaved each tap
  celebrated: Standard[]            // milestones already congratulated
}
```

- `profile.bells` is the user's **bell library**: arbitrary weights stored
  in kg (entered in kg or lb, e.g. a 30 lb gym bell is 13.608), editable in
  onboarding and Settings. Every weight picker and the progression ladder
  offer exactly these bells; the standard kg sizes are one-tap presets and
  the fallback ladder for users who haven't added any.
- Sessions carry `workSec` — working time from the session's first tap to
  its last rep (cooldown and the summary form excluded). Older v1 payloads
  are migrated by approximating it from start/finish timestamps.
- `loadState()` migrates any older/unknown payload up through
  `migrations[n]` steps, then merges over defaults so missing branches never
  crash. Unparseable data is set aside under `ss-coach:corrupt-backup` and
  the app starts fresh with a visible warning instead of destroying it.
- Saves go through one choke point that catches `QuotaExceededError` and
  surfaces a persistent banner rather than failing silently.
- `active` is written on every interaction, so killing the app mid-set
  resumes exactly where it stopped — including across a day rollover, where
  the UI flags that the session will log on its original date.
- Export wraps the state in `{ app: "ss-coach", exportedAt, schemaVersion,
  state }`; import accepts wrapped or bare state, migrates it, drops
  malformed session entries, and refuses anything else without touching
  existing data.

## Progression logic (step loading)

Swings and get-ups progress on **independent tracks**, each:

```
{ base, next, heavyCount, qualityStreak, owned[], checklist }
```

- **Prescription.** Each session is 10 swing sets and 10 get-up reps. If
  `next` is set, the first `heavyCount` units use the heavier bell (heavy
  work first, while fresh); the rest stay at `base`. Otherwise all units at
  `base`. The user can override any single set's weight mid-session, or the
  whole plan in **Plan → Override**.
- **Owning a weight.** A three-item checklist (every rep crisp; comfortable
  talk-test rests; consistent across sessions) gates stepping up. After
  each session the user answers "was every rep powerful and crisp?" — a yes
  *at the prescribed weights* increments `qualityStreak`, a no resets it.
- **The step.** Once the checklist is complete and the streak reaches 2,
  the engine proposes bringing in the next-heavier bell **from the user's
  own library** (standard 8→12→…→48 kg ladder if they have none) at
  `heavyCount = 2` (one heavy set/rep per side); jumps over ~34% get an
  extra be-patient nudge. Every 2 further crisp sessions it proposes +2
  more heavy units. At 10/10 the step completes: `base = next`, the old
  bell joins `owned[]`, and the cycle restarts.
- Everything is advisory: one tap applies a proposal, and manual override
  can set any base/next/heavyCount at any time.

**Standards** (auto-detected): *Timeless Simple* — a full untimed session
at 32 kg (men) or 24/16 kg (women), detected from any qualifying practice
session; *Simple* / *Sinister* — the timed test (100 swings in 5:00, 1:00
rest, 10 get-ups in 10:00) at 32/32 resp. 48/48 kg for men, 24/16 resp.
32/24 kg for women, evaluated automatically at the end of test-day mode.

## A note on sources

All instructional text in the app is paraphrased in this project's own
words. For the program's reasoning and real technique instruction, buy
*Kettlebell Simple & Sinister* and consider a session with a
StrongFirst-certified instructor (strongfirst.com).
