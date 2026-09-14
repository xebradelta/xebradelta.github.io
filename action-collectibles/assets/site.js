/* ---------------------------------------------------------------------------
   Action Collectibles — shared behaviour
   Reads everything from window.AC (assets/content.js). Renders nothing it
   cannot source from there.
--------------------------------------------------------------------------- */

(function () {
  'use strict';

  var AC = window.AC;
  if (!AC) return;

  var B = AC.business;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function byId(id) { return document.getElementById(id); }

  /* -- Photograph slots ---------------------------------------------------- */

  var RATIO_CLASS = { '21 / 9': 'r-21x9', '3 / 2': 'r-3x2', '4 / 3': 'r-4x3' };

  /* Renders a real photograph when one is supplied, and a labelled reserved
     plate when one is not. `opts.eager` skips lazy-loading for above-the-fold
     imagery. */
  function figure(slot, opts) {
    opts = opts || {};
    var extra = opts.className ? ' ' + opts.className : '';

    if (slot && slot.image) {
      var dims = '';
      if (slot.width && slot.height) {
        dims = ' width="' + esc(slot.width) + '" height="' + esc(slot.height) + '"';
      }
      return '<img src="' + esc(slot.image) + '" alt="' + esc(slot.alt || '') + '"' + dims +
        ' loading="' + (opts.eager ? 'eager' : 'lazy') + '"' +
        ' decoding="' + (opts.eager ? 'sync' : 'async') + '"' +
        (opts.eager ? ' fetchpriority="high"' : '') +
        (opts.sizes ? ' sizes="' + esc(opts.sizes) + '"' : '') + '>';
    }

    var brief = (slot && slot.imageBrief) || {};
    var ratioClass = opts.noRatio ? '' : ' ' + (RATIO_CLASS[brief.ratio] || 'r-4x3');
    return '' +
      '<div class="plate' + ratioClass + extra + '" role="img" aria-label="' +
        esc('Photograph not yet supplied: ' + (brief.subject || 'image')) + '">' +
        '<div class="plate-inner">' +
          '<p class="plate-label">Photograph reserved</p>' +
          '<p class="plate-subject">' + esc(brief.subject || 'Image to be supplied') + '</p>' +
          (brief.crop || brief.ratio
            ? '<p class="plate-meta">' + esc([brief.crop, brief.ratio].filter(Boolean).join(' · ')) + '</p>'
            : '') +
        '</div>' +
      '</div>';
  }

  /* -- Masthead navigation ------------------------------------------------- */

  function initNav() {
    var toggle = byId('nav-toggle');
    var nav = byId('nav');
    if (!toggle || !nav) return;

    function open() {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
    function close(refocus) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (refocus) toggle.focus();
    }

    toggle.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) close(false); else open();
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) close(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) close(true);
    });

    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      close(false);
    });

    // Leaving the narrow breakpoint must not strand the panel open.
    var mq = window.matchMedia('(min-width: 761px)');
    var onChange = function (e) { if (e.matches) close(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* -- Collections grid ---------------------------------------------------- */

  function renderCollections(host) {
    if (!host) return;
    host.innerHTML = AC.collections.map(function (c) {
      return '' +
        '<a class="collection-cell" href="collections/?c=' + esc(c.slug) + '">' +
          '<span class="shot">' + figure(c, { className: 'is-compact' }) + '</span>' +
          '<span class="row">' +
            '<span class="plate-no">' + esc(c.plate) + '</span>' +
            '<span class="arrow" aria-hidden="true">&rarr;</span>' +
          '</span>' +
          '<h3>' + esc(c.title) + '</h3>' +
          '<p>' + esc(c.blurb) + '</p>' +
        '</a>';
    }).join('');
  }

  /* -- On the shelves ------------------------------------------------------ */

  function itemCard(f) {
    var facts = [];
    if (f.price) facts.push('<span>' + esc(f.price) + '</span>');
    if (f.condition) facts.push('<span>' + esc(f.condition) + '</span>');
    if (f.availability) facts.push('<span>' + esc(f.availability) + '</span>');

    var meta = [f.brand, f.category].filter(Boolean).join(' · ');
    var subject = 'Ask about ' + f.title;

    return '' +
      '<article class="item">' +
        '<span class="shot">' + figure(f, { sizes: '(max-width: 520px) 100vw, (max-width: 900px) 50vw, 33vw' }) + '</span>' +
        '<h3>' + esc(f.title) + '</h3>' +
        (meta ? '<p class="meta">' + esc(meta) + '</p>' : '') +
        (facts.length ? '<p class="facts">' + facts.join('') + '</p>' : '') +
        '<a class="link-arrow ask" href="mailto:' + esc(B.email) +
          '?subject=' + encodeURIComponent(subject) + '">Ask about this item ' +
          '<span aria-hidden="true">&rarr;</span></a>' +
      '</article>';
  }

  function renderShelves(host) {
    if (!host) return;

    // No verified inventory: show the shop itself and point at the one place
    // that genuinely carries current finds. No invented product cards.
    if (!AC.featured.length) {
      host.innerHTML = '' +
        '<div class="shelves-fallback">' +
          '<span class="shot">' + figure(AC.sectionImages.shelves) + '</span>' +
          '<div class="say">' +
            '<h3>See what&rsquo;s in this week</h3>' +
            '<p>We don&rsquo;t publish a live catalogue here yet, so nothing on this page ' +
              'claims to be on the shelf right now. For a current look at what&rsquo;s in, ' +
              'check Instagram or call the shop.</p>' +
            '<a class="btn" href="' + esc(B.instagram) + '" target="_blank" rel="noopener noreferrer">' +
              'See the latest finds on Instagram</a>' +
          '</div>' +
        '</div>';
      return;
    }

    host.innerHTML = '<div class="item-grid">' + AC.featured.map(itemCard).join('') + '</div>';
  }

  /* -- Visit --------------------------------------------------------------- */

  function hoursHTML() {
    var h = AC.hours;
    return '' +
      (h.seasonalLabel ? '<span class="seasonal">' + esc(h.seasonalLabel) + '</span>' : '') +
      h.days.map(function (d) {
        return '<span class="hours-row' + (d.closed ? ' closed' : '') + '">' +
          '<span>' + esc(d.days) + '</span><span>' + esc(d.time) + '</span></span>';
      }).join('') +
      (h.note ? '<p class="note">' + esc(h.note) + '</p>' : '');
  }

  function renderVisitDetails(host) {
    if (!host) return;
    host.innerHTML = '' +
      '<dt>Address</dt>' +
      '<dd><address class="addr">' +
        esc(B.street) + '<span class="suite">' + esc(B.suite) + '</span>' +
        esc(B.city + ', ' + B.state + ' ' + B.zip) +
      '</address></dd>' +
      '<dt>Phone</dt>' +
      '<dd><a href="' + esc(B.phoneHref) + '">' + esc(B.phone) + '</a></dd>' +
      '<dt>Hours</dt>' +
      '<dd>' + hoursHTML() + '</dd>';
  }

  /* -- Collection page ----------------------------------------------------- */

  function renderCollectionPage() {
    var host = byId('coll');
    if (!host) return;

    var params = new URLSearchParams(window.location.search);
    var requested = params.get('c') || '';
    var c = AC.collectionBySlug(requested);

    var others = AC.collections.filter(function (x) { return !c || x.slug !== c.slug; });
    var othersHTML = '<div class="other-collections">' + others.map(function (x) {
      return '<a class="link-arrow" href="?c=' + esc(x.slug) + '">' + esc(x.title) +
        ' <span aria-hidden="true">&rarr;</span></a>';
    }).join('') + '</div>';

    // No collection named: this is the index of all of them, not an error.
    if (!requested) {
      document.title = 'Collections — ' + B.name;
      host.innerHTML = '' +
        '<div class="coll-head">' +
          '<p class="eyebrow">Collections</p>' +
          '<h1>Browse by collection</h1>' +
          '<p class="blurb">Six shelves worth knowing. Pick one to see what it covers.</p>' +
        '</div>' +
        '<div class="collection-grid" id="collection-grid"></div>';
      renderCollections(byId('collection-grid'));
      // The grid is authored for the homepage, one directory up.
      host.querySelectorAll('.collection-cell').forEach(function (a) {
        a.setAttribute('href', a.getAttribute('href').replace(/^collections\//, ''));
      });
      return;
    }

    if (!c) {
      document.title = 'Collection not found — ' + B.name;
      host.innerHTML = '' +
        '<div class="coll-head">' +
          '<p class="eyebrow">Collections</p>' +
          '<h1>Not one of ours</h1>' +
          '<p class="blurb">There is no collection called &ldquo;' + esc(requested) +
            '&rdquo;. Everything we group by is listed below.</p>' +
        '</div>' +
        '<div class="empty-state"><h2>Browse instead</h2>' + othersHTML + '</div>';
      return;
    }

    document.title = c.title + ' — ' + B.name;

    var items = AC.featuredFor(c.slug);
    var body;

    if (items.length) {
      body = '<div class="item-grid">' + items.map(itemCard).join('') + '</div>';
    } else {
      body = '' +
        '<div class="empty-state">' +
          '<div class="say">' +
            '<h2>Ask us what&rsquo;s in</h2>' +
            '<p>We don&rsquo;t list stock online yet, so nothing here claims to be on the ' +
              'shelf right now. Call the shop or look at Instagram for what&rsquo;s in this ' +
              'week — or come and dig through it in person.</p>' +
          '</div>' +
          '<div class="actions">' +
            '<a class="btn" href="' + esc(B.phoneHref) + '">Call ' + esc(B.phone) + '</a>' +
            '<a class="btn btn-quiet" href="' + esc(B.instagram) + '" target="_blank" rel="noopener noreferrer">' +
              'Latest finds on Instagram</a>' +
          '</div>' +
        '</div>';
    }

    host.innerHTML = '' +
      '<div class="coll-head">' +
        '<p class="eyebrow"><span class="plate-no">' + esc(c.plate) + '</span> &nbsp;Collections</p>' +
        '<h1>' + esc(c.title) + '</h1>' +
        '<p class="blurb">' + esc(c.blurb) + '</p>' +
        (c.includes && c.includes.length
          ? '<p class="eyebrow" style="margin-top:24px">' + esc(c.includesLabel || 'What you will find') + '</p>' +
            '<div class="tag-row">' + c.includes.map(function (t) {
              return '<span class="tag">' + esc(t) + '</span>';
            }).join('') + '</div>'
          : '') +
      '</div>' +
      figure(c, { eager: true, className: 'coll-figure' }) +
      '<div style="margin-top:48px">' + body + '</div>' +
      '<div style="margin-top:72px;padding-top:24px;border-top:1px solid var(--rule)">' +
        '<p class="eyebrow" style="margin-bottom:16px">Other collections</p>' +
        othersHTML +
      '</div>';
  }

  /* -- Boot ---------------------------------------------------------------- */

  function boot() {
    initNav();
    renderCollections(byId('collection-grid'));
    renderShelves(byId('shelves-body'));
    renderVisitDetails(byId('visit-details'));
    renderCollectionPage();

    // Commerce chrome only ever appears once checkout is real.
    if (!AC.commerceEnabled) {
      document.querySelectorAll('[data-commerce-only]').forEach(function (n) { n.remove(); });
    }
    // Search needs a catalogue to search.
    if (!AC.searchEnabled) {
      document.querySelectorAll('[data-search-only]').forEach(function (n) { n.remove(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
