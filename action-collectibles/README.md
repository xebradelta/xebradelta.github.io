# Action Collectibles — redesign prototype

A local, responsive prototype of the **Collector's Field Guide** direction from
`Action-Collectibles-Claude-Design-Guide.md`.

> **This is not the live Action Collectibles website**, and it is not affiliated
> with, endorsed by, or operated by the business. It reproduces the business's
> name, address, phone and hours from the design brief so the layout can be
> judged against real content. The live site (`action-collectibles.com`) was not
> touched. Both pages carry `<meta name="robots" content="noindex, nofollow">`,
> a disclosure bar and a footer disclosure, because this build sits on a domain
> the business does not own.

- **Homepage:** `/action-collectibles/`
- **Collections:** `/action-collectibles/collections/?c=<slug>`

---

## Run it

No build step, no dependencies — it is static files, matching the rest of this
repo. Serve the repo root and open the folder:

```sh
python3 -m http.server 8765
# http://127.0.0.1:8765/action-collectibles/
```

Opening `index.html` from the filesystem also works, except that
`collections/?c=…` needs a server to resolve the directory index.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Homepage: masthead, cover, collections, on the shelves, visit, footer |
| `collections/index.html` | Collection destination; renders from `?c=<slug>` |
| `assets/content.js` | **Central content configuration** — the single source of truth |
| `assets/site.css` | The visual system |
| `assets/site.js` | Navigation, rendering, routing |
| `screenshots/` | Desktop, laptop, tablet, mobile and 320px captures |

The brief's "single self-contained `index.html`" convention used elsewhere in
this repo was set aside deliberately: the brief requires one central content
file shared by more than one page, and duplicating it per page would let the
two drift apart.

---

## What works

- **Navigation.** Masthead links scroll to real sections with anchor offsets
  that clear the sticky header. The mobile menu opens, closes on Escape (with
  focus returned to the toggle), closes when a link is chosen, and resets if the
  viewport widens past the breakpoint.
- **Collection destinations.** All six resolve. So do aliases (`?c=rubber-ducks`
  → Plushies & Gifts) and the legacy paths from the live-site audit — including
  the three that were mislabelled there, which resolve to what the link text
  actually promised. An unknown slug gets an honest not-found with the full list;
  a bare `/collections/` is the index, not an error.
- **Honest empty states.** No verified inventory exists, so "On the shelves"
  renders the shop-photo-and-Instagram fallback and every collection page says
  plainly that stock is not listed online. No invented products, prices, stock
  counts or "best seller" tags anywhere.
- **Discovery mode.** `commerceEnabled: false`. No cart, wishlist, account or
  checkout chrome. Search is absent rather than present-and-empty, because there
  is no catalogue to search.
- **Accessibility.** One `<h1>`, ordered headings, skip link, visible focus ring
  on all 21 focus stops, tap targets ≥44px, `prefers-reduced-motion` respected.
- **Responsive.** No horizontal scrolling at 1440, 1024, 768, 390 or 320px, nor
  at 200% text zoom on a 390px viewport.

All of the above is verified by two scripts run against Chromium — the
screenshot/measurement pass and a 24-assertion behaviour pass. Both were green
at the last run.

---

## Missing assets — needs the business

**Every photograph is missing.** The page shows a labelled "Photograph reserved"
plate wherever one belongs, carrying the subject, crop note and aspect ratio, so
the gap stays visible and specified rather than filled with decoration. Nine
plates are waiting:

| Where | Photograph needed | Ratio |
| --- | --- | --- |
| Cover | A shelf, or a small group of real products with space around them | 21:9 |
| On the shelves | Wide shop interior — the room as a customer first sees it | 3:2 |
| Visit | Storefront with the signage and Suite G5 legible | 4:3 |
| Collections ×6 | One per shelf; each brief is in `content.js` | 4:3 |

**The logo is missing.** A text wordmark ("Action **Collectibles**") stands in.
If a usable logo asset exists it should replace the wordmark; if it clashes with
the palette, give it a neutral surface rather than recolouring it.

Source-site asset inspection could **not** be completed: `action-collectibles.com`
is blocked by this environment's network egress policy, so the existing logo,
photography and policy-page URLs could not be inventoried. That audit still needs
doing before launch.

To install a photograph, set `image`, `alt` and `imageSource` on the relevant
entry in `content.js`. The plate is replaced automatically, with lazy loading
below the fold and priority loading on the cover.

## Unverified content — needs confirmation before launch

- **Hours.** Carried over as `Summer hours` with `confirmed: false`, because
  public directory listings disagree with the website. Nothing computes or
  displays "Open now". Confirm the real schedule, including whether the seasonal
  label still applies.
- **Policy links** were left out of the footer entirely rather than guessed. The
  live site's policy URLs could not be read (see above). Add them once known.
- **Category groupings.** The six collections cover every category named in the
  brief, but nobody has confirmed that these six match how the shop actually
  thinks about its shelves. Worth a five-minute conversation with the owner.

Nothing was invented to fill a gap: no purchase or trade-in services, reviews,
discounts, shipping promises, exclusive merchandise or stock counts appear
anywhere, because none were supplied.

## Before this could go live

1. Confirm hours and catalogue data; supply photography and the logo.
2. Complete the source-site audit — assets, policy URLs, and every legacy route.
3. Preserve or redirect legacy paths. `content.js` records the four observed
   defects (`/category/kids-tees`, `/category/tees`, `/category/pop-culture` and
   the Marvel CTA) with the destination each link's text actually promised.
4. Leave `commerceEnabled: false` until platform integration, inventory,
   fulfilment and checkout are verified end to end.
5. Remove the prototype disclosure bar, the footer disclosure and the `noindex`
   tags — all three are marked in the source.
6. Measure performance with the real images installed. No performance claim is
   made here, because nothing has been measured against real assets.

---

## Design decisions

**The direction.** A collector's catalogue: warm paper, condensed uppercase
display type, hairline rules, square frames, plate numbers, generous quiet
margins. No imitation distressing, fake price stickers or comic-book explosions
— the merchandise is meant to supply the colour, which is exactly why the
missing photography is the headline finding above.

**The reserved plate does double duty.** It is honest about a missing asset and
it reads as catalogue furniture, so the composition can be judged now instead of
waiting on a photo shoot.

**Structure over decoration.** The collections grid is ruled, not carded: thin
separators and paper showing through, rather than six identical floating
rounded boxes.

**Subtraction applied.** The footer's duplicate phone number was removed (the
Visit section owns contact detail); policy links were dropped rather than
guessed; search was left out rather than shipped empty; no cart or account
chrome exists.

**Two deliberate compromises**, both worth a second opinion:

- The prototype disclosure bar adds ~35px above the masthead. The masthead
  itself is 112px, inside the brief's 120px budget, but the bar pushes the real
  total higher. It is prototype-only chrome and comes out at launch.
- At two columns the collection plates have no room for the full photo brief, so
  only the "Photograph reserved" label shows below 900px. The full brief is on
  each collection page and in `content.js`.

**Review was self-review.** No independent reviewer was available in this
session, so the screenshots were critiqued against the brief's review questions
by the same process that produced them — which is a genuine weakness, not a
formality. Findings acted on: the headline was wrapping to four lines in an
over-constrained container; the cover pushed the next section to 1277px (now
776px, so "Browse by collection" is visible at a 900px viewport); the Visit
photograph preceded the address on mobile instead of following it; the
collection hero was an 888px-tall slab; a section heading made an unverifiable
claim about how often stock changes; and the plate captions were being hidden
entirely on narrow screens by an over-broad selector.
