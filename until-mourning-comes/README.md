# Until Mourning Comes — turnkey author site

A single-file promotional website for **Morgan Johnson**'s gothic dark fantasy
*Until Mourning Comes* (Region of Ebonhallow), built to match her tri-fold
brochure: near-black palette, bone/parchment serif type, pale-gold ornaments,
haunted-green and dusty-rose accents, cathedral/raven/wrought-iron imagery.

Everything lives in `index.html` — no build step, no dependencies beyond
Google Fonts. It can be hosted anywhere (GitHub Pages, Netlify, or her own
domain) as-is.

## Live preview

Served from this repo at `/until-mourning-comes/`.

## What's included

- Hero with title treatment, tagline, preorder/release dates, CTAs
- "Enter Ebonhallow" region intro + genre tag row
- The Story Hook with pull quote and raven illustration
- Genre / Tone / Setting panels
- Core Themes + "Best for Readers Who Like" lists
- Character dossiers (Cassian Thorne, Vaela Blackwell) + Cawsanova parchment card
- Release section with live countdown (auto-switches preorder → release → "out now")
- About the Author with the "Your pain is not weakness." pull quote
- Follow section (Facebook + mailing-list placeholder), wrought-iron-fence footer
- Responsive (mobile single-column), reduced-motion friendly, no tracking

## Customizing for handoff (sale checklist)

1. **Preorder link** — point the hero + release CTAs at the retailer page
   (Amazon/B&N/etc.) once it exists.
2. **Mailing list** — replace the `mailto:hello@example.com` placeholder in the
   Follow section (marked with a `TURNKEY:` comment) with her signup form or email.
3. **Facebook** — swap the search link for the direct URL of
   "The Region of Ebonhallow by Morgan Johnson" page.
4. **Cover art** — when the final cover is available, drop it into the hero
   (the moon/skyline SVG backdrop is a stand-in that already matches her brochure art).
5. **Domain** — suggest `untilmourningcomes.com` or `morganjohnsonwrites.com`;
   the page has OG meta tags ready for link previews.
6. **Dates** — preorder (2026-07-26) and release (2026-09-04) appear in the
   date lines and in the countdown script constants at the bottom of `index.html`.
