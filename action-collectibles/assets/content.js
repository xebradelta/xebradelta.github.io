/* ---------------------------------------------------------------------------
   Action Collectibles — central content configuration
   ---------------------------------------------------------------------------
   Single source of truth for the prototype. Every page reads from window.AC.

   RULES FOR EDITING THIS FILE
   - Only add a field when the value is verified. Omit unknowns; do NOT fill
     them with plausible guesses. An omitted field renders nothing.
   - `commerceEnabled` stays false until platform integration, inventory,
     fulfilment and checkout are all verified end to end. Flipping it true
     without that is a broken promise to a customer, not a feature flag.
   - Photography: a collection or section shows a real photograph only when
     `image` is set. Otherwise its `imageBrief` renders a labelled reserved
     plate so the missing asset stays visible instead of being papered over.
--------------------------------------------------------------------------- */

window.AC = (function () {
  'use strict';

  /* -- Capability flags ---------------------------------------------------- */

  // Online ordering. Keep false: no verified platform integration, inventory,
  // fulfilment or checkout exists. A static cart that appears to take orders
  // is not a deliverable.
  var commerceEnabled = false;

  // This build is an unaffiliated design prototype, not the live business
  // site. Set false only for a build that the business itself is publishing.
  var isPrototype = true;

  /* -- Business facts ------------------------------------------------------ */
  // Supplied in the design brief and treated as verified.

  var business = {
    name: 'Action Collectibles',
    street: '1230 S Gilbert Rd',
    suite: 'Suite G5',
    city: 'Mesa',
    state: 'AZ',
    stateLong: 'Arizona',
    zip: '85204',
    phone: '602-856-7841',
    phoneHref: 'tel:+16028567841',
    email: 'azactioncollectibles@gmail.com',
    instagram: 'https://www.instagram.com/azactioncollectibles/',
    instagramHandle: '@azactioncollectibles',
    directionsUrl: 'https://maps.app.goo.gl/QG6UQcyyXAePn3Jx9',
    // The live Wix site this redesign replaces. Recorded for the migration
    // audit; nothing in the prototype links to it.
    sourceSite: 'https://action-collectibles.com'
  };

  /* -- Hours --------------------------------------------------------------- */
  // UNCONFIRMED. Public directory listings disagree with the website. The
  // seasonal qualifier is preserved verbatim and `confirmed` gates any
  // open/closed indicator: nothing computes "Open now" from this data.

  var hours = {
    seasonalLabel: 'Summer hours',
    confirmed: false,
    note: 'Hours can change \u2014 call ahead if you\u2019re making a special trip.',
    days: [
      { days: 'Wednesday – Friday', time: '12:30 – 6:30 p.m.' },
      { days: 'Saturday – Sunday', time: '11:30 a.m. – 6:30 p.m.' },
      { days: 'Monday – Tuesday', time: 'Closed', closed: true }
    ]
  };

  /* -- Collections --------------------------------------------------------- */
  // Six groupings covering every category named in the brief. `includes` lists
  // only what was actually supplied — these are the shelves a visitor can
  // expect to find, not a claim about stock on any given day.

  var collections = [
    {
      slug: 'action-figures',
      plate: '01',
      title: 'Action Figures',
      blurb: 'The main wall — modern import lines, mass-retail waves and the older figures that turn up in trade.',
      includes: ['Marvel', 'DC', 'TMNT', 'Predator & Alien', 'NECA', 'Super7', 'Power Rangers'],
      includesLabel: 'Lines on the wall',
      imageBrief: {
        subject: 'The figure wall, shot straight on',
        crop: 'Wide, camera level with the middle shelf',
        ratio: '4 / 3'
      }
    },
    {
      slug: 'cards-pokemon',
      plate: '02',
      title: 'Cards & Pokémon',
      blurb: 'Trading cards and Pokémon, from sealed product to singles in the case.',
      includes: ['Pokémon', 'Trading cards'],
      includesLabel: 'What you\u2019ll find',
      imageBrief: {
        subject: 'Card case from above, a few packs and singles fanned out',
        crop: 'Overhead, tight enough to read the packaging',
        ratio: '4 / 3'
      }
    },
    {
      slug: 'statues-funko',
      plate: '03',
      title: 'Statues & Funko',
      blurb: 'Display pieces and Funko Pops, boxed and loose.',
      includes: ['Statues', 'Funko Pops'],
      includesLabel: 'What you\u2019ll find',
      imageBrief: {
        subject: 'A statue with clear space around it, Funko boxes racked behind',
        crop: 'Slight three-quarter angle, shallow depth',
        ratio: '4 / 3'
      }
    },
    {
      slug: 'comics',
      plate: '04',
      title: 'Comics',
      blurb: 'Back issues in the boxes and recent books on the rack.',
      includes: ['Comics'],
      includesLabel: 'What you\u2019ll find',
      imageBrief: {
        subject: 'Longboxes mid-flip, or the comic rack face-out',
        crop: 'Eye level, angled down the row',
        ratio: '4 / 3'
      }
    },
    {
      slug: 'plushies-gifts',
      plate: '05',
      title: 'Plushies & Gifts',
      blurb: 'Soft toys and the small things that make good gifts — rubber ducks included.',
      includes: ['Plushies', 'Rubber ducks'],
      includesLabel: 'What you\u2019ll find',
      // Rubber Ducks stays reachable as its own name without becoming a
      // seventh top-level grouping.
      aliases: ['rubber-ducks', 'plushies', 'gifts'],
      imageBrief: {
        subject: 'Plush shelf with the rubber ducks in frame',
        crop: 'Straight on, warm and uncluttered',
        ratio: '4 / 3'
      }
    },
    {
      slug: 'sports',
      plate: '06',
      title: 'Sports',
      blurb: 'Sports cards and memorabilia.',
      includes: ['Sports'],
      includesLabel: 'What you\u2019ll find',
      imageBrief: {
        subject: 'Sports case or a shelf of memorabilia',
        crop: 'Straight on, camera level with the case',
        ratio: '4 / 3'
      }
    }
  ];

  /* -- Featured items ------------------------------------------------------ */
  // EMPTY ON PURPOSE. No verified inventory has been supplied, so the
  // "On the shelves" section renders its honest fallback (one shop photo and
  // a pointer to Instagram) rather than invented product cards.
  //
  // Supplying records here lights the grid up automatically. Record shape:
  //
  //   {
  //     id:          'unique-slug',          // required
  //     title:       'Item name',            // required
  //     category:    'action-figures',       // required, a collection slug
  //     brand:       'NECA',                 // optional
  //     image:       'photos/item.jpg',      // required for a photo
  //     alt:         'Describe the item',    // required with image
  //     imageSource: 'Photographed in store',// provenance, required with image
  //     sourceUrl:   'https://…',            // optional
  //     checkedAt:   '2026-09-14',           // when the facts were verified
  //     price:       '$24.99',               // ONLY if verified
  //     availability:'In store',             // ONLY if verified
  //     condition:   'Sealed'                // ONLY if verified
  //   }
  //
  // Omit price, availability and condition unless each is sourced. The card
  // renders whatever is present and nothing more.

  var featured = [];

  /* -- Photography slots for whole-page sections --------------------------- */

  var sectionImages = {
    cover: {
      // image: 'photos/cover.jpg', alt: '…', imageSource: '…', checkedAt: '…'
      imageBrief: {
        subject: 'A shelf, or a small group of real products with space around them',
        crop: 'Wide, centred, generous margin — this sits under the headline',
        ratio: '21 / 9',
        priority: true
      }
    },
    shelves: {
      imageBrief: {
        subject: 'Wide shop interior — the room as a customer first sees it',
        crop: 'Wide, taken from the door looking in',
        ratio: '3 / 2'
      }
    },
    visit: {
      imageBrief: {
        subject: 'Storefront with the signage and Suite G5 legible',
        crop: 'Straight on from the parking lot, daylight',
        ratio: '4 / 3'
      }
    }
  };

  /* -- Legacy route audit -------------------------------------------------- */
  // Paths observed on the live site. Two of the three point somewhere that
  // does not match their label — recorded so the mislabelling is fixed rather
  // than carried forward. `intended` is what the link text promised the
  // visitor; that is what the prototype resolves these paths to.

  var legacyPaths = [
    { path: '/category/kids-tees', label: 'Pokémon', intended: 'cards-pokemon', defect: 'Label and destination disagree' },
    { path: '/category/tees', label: 'Plushies', intended: 'plushies-gifts', defect: 'Label and destination disagree' },
    { path: '/category/pop-culture', label: 'Sports', intended: 'sports', defect: 'Label and destination disagree' },
    { path: '/', label: 'Marvel collection', intended: 'action-figures', defect: 'CTA pointed back at the homepage' }
  ];

  /* -- Derived ------------------------------------------------------------- */

  // Search needs something to search. With no catalog supplied there is no
  // search UI at all, rather than a box that always returns nothing.
  var searchEnabled = featured.length > 0;

  function collectionBySlug(slug) {
    if (!slug) return null;
    var key = String(slug).toLowerCase().replace(/^\/+|\/+$/g, '');
    for (var i = 0; i < collections.length; i++) {
      var c = collections[i];
      if (c.slug === key) return c;
      if (c.aliases && c.aliases.indexOf(key) !== -1) return c;
    }
    // Fall back to the legacy route audit so old paths still land correctly.
    for (var j = 0; j < legacyPaths.length; j++) {
      var lp = legacyPaths[j];
      if (lp.path.replace(/^\/category\//, '') === key) {
        return collectionBySlug(lp.intended);
      }
    }
    return null;
  }

  function featuredFor(slug) {
    return featured.filter(function (f) { return f.category === slug; });
  }

  return {
    commerceEnabled: commerceEnabled,
    isPrototype: isPrototype,
    searchEnabled: searchEnabled,
    business: business,
    hours: hours,
    collections: collections,
    featured: featured,
    sectionImages: sectionImages,
    legacyPaths: legacyPaths,
    collectionBySlug: collectionBySlug,
    featuredFor: featuredFor
  };
})();
