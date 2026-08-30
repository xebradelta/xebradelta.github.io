# Archetype MVP

A static, Jung-inspired self-reflection app that can be hosted entirely on GitHub Pages.

## What is included

- 25 scenario-based assessment questions
- 12 archetypes: Explorer, Sage, Hero, Caregiver, Creator, Rebel, Ruler, Magician, Lover, Jester, Innocent, Everyperson
- deterministic scoring (no API key required)
- primary + secondary archetype stack
- central-tension and shadow interpretation
- downloadable SVG poster generated in the browser
- daily practices tied to the user's strongest archetypes
- suggested readings
- local reflection journal
- local browser persistence
- responsive design
- fully static build, no server and no API key

## Important positioning

This is a **Jung-inspired self-reflection product**, not a clinical, diagnostic, or scientifically validated psychological assessment. Keep that language in the product and marketing unless/until the instrument is professionally validated.

## Run locally

```bash
cd _src/archetype
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Build

```bash
cd _src/archetype
npm install
npm run build
```

## How this is deployed

`xebradelta.github.io` publishes GitHub Pages **straight from the root of
`main`** — there is no Pages build step. So the build output is committed to
the repository rather than produced by a Pages workflow:

- source lives in `_src/archetype/`
- `npm run build` writes to `../../archetype/` (the repo root `archetype/`)
- that committed output is what is served at
  <https://xebradelta.github.io/archetype/>

`.github/workflows/archetype.yml` keeps the two in sync: on a pull request it
fails if the committed `archetype/` is stale, and on a push to `main` it
rebuilds and commits fresh output. After changing anything in
`_src/archetype/`, run `npm run build` and commit `archetype/` alongside the
source change.

Vite is configured with `base: './'`, so the same build works at any mount
path without knowing it in advance.

## Privacy in this MVP

Assessment results, completed practices, and journal entries are stored in `localStorage` in the user's browser. They are **not uploaded anywhere**.

That is intentional for the first validation build.

## Recommended next steps

### 0.2 — Better assessment quality

- author 75–150 total question scenarios
- tag questions by psychological dimensions, not only archetypes
- support ranking / forced-choice questions
- calculate confidence intervals or score separation
- add discriminator questions when two archetypes are close
- version the scoring model

### 0.3 — Better poster system

- create multiple poster templates
- export PNG/PDF in addition to SVG
- separate illustration generation from text rendering
- use a server-generated background illustration if AI art is added

Never place an LLM/image API key in the GitHub Pages client.

### 0.4 — Accounts + cloud sync

Add a backend such as Supabase for:

- authentication
- saved profiles
- journal sync
- assessment history
- practice history
- group/couple comparison

### 0.5 — AI interpretation

Put model calls behind a server-side function (Supabase Edge Function, Cloudflare Worker, Vercel Function, etc.). Suggested architecture:

1. deterministic assessment returns structured scores
2. server sends only the structured profile + relevant responses to the model
3. model generates narrative interpretation, discriminating follow-up questions, and reflections
4. server validates output against a schema
5. client renders it

Do **not** allow the model to be the only scorer. Stable deterministic scoring makes results reproducible and debuggable.

## Product thesis

> Most personality tests tell you who you are. This one helps you decide who you're becoming.

## Development notes

The current archetype ontology and scoring weights are intentionally simple enough to inspect. They are product scaffolding, not claims of psychometric validity.
