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

Content sourced from her tri-fold brochure and her Canva site
(untilmourningcomes.my.canva.site): story hook, themes, character dossiers
(Cassian Thorne, Vaela Blackwell, Mordren Varric, Cawsanova), Ebonhallow
map place names, her full first-person author bio, and contact email.

## Customizing for handoff (sale checklist)

1. **⚠ Preorder date conflict** — her brochure says preorders begin
   **July 26, 2026**; her Canva site says **July 24, 2026**. This site
   currently uses July 26 (the brochure). Confirm with Morgan and update the
   date lines plus the countdown constants at the bottom of `index.html`.
2. **Preorder link** — point the hero + release CTAs at the retailer page
   (Amazon/B&N/etc.) once it exists.
3. **Facebook** — swap the search link for the direct URL of
   "The Region of Ebonhallow by Morgan Johnson" page.
4. **Cover art & map** — she has finished cover art and a painted Region of
   Ebonhallow map on her Canva site; with her files, drop the cover into the
   hero and the map into the Enter Ebonhallow section (place names are
   already listed there as a text gazetteer).
5. **Domain** — suggest `untilmourningcomes.com` or `morganjohnsonwrites.com`;
   the page has OG meta tags ready for link previews.
6. **Contact** — Questions & Comments buttons use her real address,
   `untilmourningcomes2026@gmail.com`.
