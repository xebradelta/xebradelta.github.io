# Xebra Delta

The umbrella site for Xebra Delta — small tools, pages, and things built as
needed and published openly. This repo *is* the website: it's a
[GitHub Pages](https://pages.github.com/) site served straight from the files
here, no build step.

- **Live at:** https://xebradelta.github.io/
- **Published from:** the `main` branch, repo root.

---

## How URLs work here

GitHub Pages serves this repo at the domain root, and treats any folder's
`index.html` as that folder's page. So the path *is* the folder name:

| File in this repo        | Lives at                              |
| ------------------------ | ------------------------------------- |
| `index.html`             | `https://xebradelta.github.io/`       |
| `dare/index.html`        | `https://xebradelta.github.io/dare/`  |
| `<name>/index.html`      | `https://xebradelta.github.io/<name>/`|

This is the same "folder + index.html = a clean URL" convention used on the
Fastmail-hosted `xebradelta.com` site, so the two stay easy to reason about.

---

## Adding a new tool (the common case)

For a small, self-contained HTML tool or page:

1. Create a folder named after the URL you want, e.g. `pushups/`.
2. Put the file inside it as `index.html`.
3. Add it to the homepage index (see below).
4. Commit and push to `main`. Pages rebuilds automatically, usually within a
   minute.

```
xebradelta.github.io/
├── index.html          → /          (this homepage / hub)
├── dare/index.html     → /dare/
└── pushups/index.html  → /pushups/  (example of a new one)
```

### Listing it on the homepage

The homepage (`index.html`) has an **"The index — what's here"** section that
lists every tool. To add an entry, copy the marked block inside
`<div class="tools-list">` and edit the four fields:

```html
<!-- TOOL ENTRY — copy this block to add a new one -->
<a class="tool-row" href="/pushups/">
  <div class="tool-path">/pushups</div>
  <div class="tool-body">
    <h3>Tool Name</h3>
    <p>One line on what it does.</p>
  </div>
  <div class="tool-tag">Category · Source</div>
  <div class="tool-arrow">→</div>
</a>
<!-- /TOOL ENTRY -->
```

---

## Folder here, or its own repo? (the rule)

Draw the line on **how big and standalone** the thing is:

| The thing is…                                                        | Put it…                              | Lives at                              |
| -------------------------------------------------------------------- | ------------------------------------ | ------------------------------------- |
| A small, self-contained HTML tool or page                            | a **folder** in this repo            | `…github.io/<name>/`                  |
| A real app, multi-file project, or anything you'd version, get issues on, or give its own domain | its **own repo** under `xebradelta`  | `…github.io/<repo>/` or a custom domain |

Default to a folder here. Promote something to its own repo only once it earns
it — its own history, its own issue tracker, its own domain.

A separate repo `xebradelta/<repo>` with Pages enabled publishes to
`https://xebradelta.github.io/<repo>/`, so per-tool URLs stay consistent
either way.

---

## Notes on bundled (Claude Design) files

Some tools here are **bundled single-file exports** (e.g. `dare/index.html`).
These are self-contained — the app, fonts, and assets are packed into one HTML
file — so they need no build step and just work as static files. They also
require JavaScript to render and aren't meant to be hand-edited; to change one,
re-export it from the source and replace the file.

---

## Domains

- `xebradelta.github.io` — this repo, hosted on GitHub Pages.
- `xebradelta.com` — hosted separately on Fastmail.

These are two independent sites. They can host the same or different things;
neither is automatically a mirror of the other.
