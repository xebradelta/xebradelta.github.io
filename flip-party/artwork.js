(function () {
  "use strict";
  const F = globalThis.FP;
  // Original, lightweight vector drawings. No fonts, images, or network requests.
  const drawings = [
    // Nature: a friendly lion and leaves.
    '<path d="M14 130Q-8 55 43 45Q50 96 14 130M158 141Q198 59 146 44Q128 89 158 141" fill="#9be770"/><path d="M15 130 34 73M158 140 150 70" stroke="#248c78" stroke-width="4"/><circle cx="90" cy="96" r="57" fill="#ed6937"/><circle cx="55" cy="58" r="16" fill="#ffd57b"/><circle cx="125" cy="58" r="16" fill="#ffd57b"/><circle cx="90" cy="95" r="40" fill="#ffd57b"/><ellipse cx="76" cy="91" rx="4" ry="6" fill="#27355c"/><ellipse cx="104" cy="91" rx="4" ry="6" fill="#27355c"/><path d="m82 104 8 8 8-8Z" fill="#27355c"/><path d="M75 116q15 14 30 0" stroke="#27355c" stroke-width="4" fill="none" stroke-linecap="round"/>',
    // Family films: popcorn, with an original shooting star.
    '<path d="m49 82 9 69h64l9-69Z" fill="#fff8db"/><path d="m64 84 6 67h11l-2-67m21 0-2 67h11l6-67" fill="#ef5275"/><path d="M48 84q-20-23 5-31-2-26 27-21 19-25 37-3 28-2 22 24 24 16-4 31Z" fill="#ffde70"/><path d="m20 30 48-14-32 29" fill="#8eebdd"/><path d="m144 17 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" fill="#fff8db"/>',
    // Superheroes: a lightning shield.
    '<path d="M90 20 149 43v52q-8 42-59 62-51-20-59-62V43Z" fill="#8ff3df" stroke="#fff3cf" stroke-width="6"/><path d="m96 34-34 64h29l-9 45 38-69H91Z" fill="#813ef2"/><path d="M18 67 3 60m162 6 13-9M27 141l-12 11m139-12 12 9" stroke="#ffde70" stroke-width="6" stroke-linecap="round"/>',
    // Kids: bright balloons and a smiling star.
    '<path d="M38 69q-5 67 29 86m72-86q11 49-24 86" fill="none" stroke="#fff5d1" stroke-width="3"/><ellipse cx="37" cy="47" rx="25" ry="32" fill="#fd779a"/><ellipse cx="142" cy="48" rx="25" ry="32" fill="#7a51eb"/><path d="m90 47 15 30 34 5-24 24 5 34-30-16-30 16 5-34-24-24 34-5Z" fill="#fff0ab"/><circle cx="79" cy="95" r="4" fill="#32426b"/><circle cx="102" cy="95" r="4" fill="#32426b"/><path d="M80 107q10 12 20 0" fill="none" stroke="#32426b" stroke-width="4" stroke-linecap="round"/>',
    // Television: a retro TV.
    '<path d="m70 36-22-20m60 20 22-20" stroke="#ffd47a" stroke-width="6" stroke-linecap="round"/><rect x="19" y="37" width="142" height="104" rx="20" fill="#ffd47a"/><rect x="30" y="48" width="101" height="80" rx="12" fill="#402977"/><path d="m70 68 30 20-30 20Z" fill="#8be9dc"/><circle cx="146" cy="68" r="6" fill="#402977"/><circle cx="146" cy="92" r="6" fill="#402977"/><path d="M45 143v12m91-12v12" stroke="#ffd47a" stroke-width="7" stroke-linecap="round"/>',
    // Movies & books: a clapperboard and cinematic stars.
    '<rect x="28" y="69" width="124" height="77" rx="9" fill="#fff8dc"/><path d="m25 50 117-25 7 32L31 83Z" fill="#273559"/><path d="m40 47 18-4 15 30-18 4m30-39 18-4 15 30-18 4m30-39 15-3 7 32-8 2" fill="#fff8dc"/><path d="m79 91 29 18-29 18Z" fill="#ef5275"/><path d="m19 15 4 9 10 2-8 6 2 10-8-5-9 5 2-10-7-6 10-2Z" fill="#ffd464"/><circle cx="160" cy="108" r="7" fill="#ffd464"/>',
    // Places: a globe and orbit.
    '<circle cx="90" cy="87" r="56" fill="#8debd6"/><path d="m64 34-4 18 16 13-11 17 12 18 14-5 5-23-10-15 8-23m26 12-3 23 14 14-14 14-4 28-15 15 21 4q46-38 15-85" fill="#238c77"/><ellipse cx="90" cy="91" rx="81" ry="25" transform="rotate(-27 90 91)" fill="none" stroke="#fff0ad" stroke-width="5"/><path d="m143 16 5 11 13 2-10 9 2 13-10-6-12 6 3-13-10-9 13-2Z" fill="#fff0ad"/>',
    // Everyday: a very cheerful burger.
    '<path d="M29 83q2-51 61-51t61 51Z" fill="#ffcf6f"/><path d="M24 93q16-16 33 0 16-16 33 0 16-16 33 0 16-16 33 0" stroke="#84e89c" stroke-width="12" fill="none" stroke-linecap="round"/><rect x="29" y="103" width="122" height="17" rx="8" fill="#b64857"/><path d="m34 102 48 23 35-23" fill="#ffde70"/><path d="M29 126h122q-2 26-27 26H56q-25 0-27-26" fill="#ffcf6f"/><path d="m60 56 3 5m28-12 3 5m28 3 3 5" stroke="#fff5d7" stroke-width="4" stroke-linecap="round"/>',
    // Sports: a ball, track, and winner's pennant.
    '<path d="M6 142q69-76 169-26" stroke="#8cecd8" stroke-width="11" fill="none"/><circle cx="90" cy="85" r="53" fill="#fff5db"/><path d="m90 63 21 16-8 25H77l-8-25Z" fill="#384178"/><path d="m90 32 1 30m50-4-30 21m11 47-19-22m-47 21 21-21M40 57l29 22" stroke="#384178" stroke-width="5"/><path d="M22 54V14l42 14-42 15" fill="#ffd469" stroke="#ffd469" stroke-width="4"/>',
    // Party: two expressive masks.
    '<g transform="rotate(-15 59 85)"><path d="M18 46h81v48q-6 45-41 57-35-12-40-57Z" fill="#ffda78"/><path d="M33 72q10-12 20 0m15 0q10-12 20 0" stroke="#653ca9" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M39 102q20 24 40 0Z" fill="#653ca9"/></g><g transform="rotate(16 125 79)"><path d="M86 30h75v45q-5 42-37 54-33-12-38-54Z" fill="#8cecd8"/><circle cx="104" cy="58" r="5" fill="#384178"/><circle cx="142" cy="58" r="5" fill="#384178"/><ellipse cx="124" cy="86" rx="11" ry="14" fill="#384178"/></g>',
    // Personal packs: a pencil, a card, and your own idea.
    '<rect x="36" y="26" width="106" height="129" rx="15" transform="rotate(-9 89 90)" fill="#fff5db"/><path d="M57 66h56m-56 18h46m-46 18h33" stroke="#8c6be0" stroke-width="6" stroke-linecap="round"/><path d="m128 48 15 10-42 63-21 12 4-23Z" fill="#ffd265"/><path d="m128 48 8-12q4-6 11-1l5 4q5 5 1 11l-10 8Z" fill="#f77598"/><path d="m84 110 17 11-21 12Z" fill="#384178"/>',
    // Books: an open book with a storybook star.
    '<path d="M90 50Q45 25 13 47v94q40-20 77 1 37-21 77-1V47q-32-22-77 3Z" fill="#fff3d4"/><path d="M90 53v88M28 70q23-7 47 4m-47 14q23-7 47 4m-47 14q23-7 47 4m34-37q23-7 42-3m-42 20q23-7 42-3" stroke="#9970cf" stroke-width="5" stroke-linecap="round" fill="none"/><path d="m97 8 6 12 13 2-10 10 2 14-12-7-12 7 3-14-10-10 14-2Z" fill="#ffdc76"/>',
    // Science & space: a little rocket.
    '<path d="m78 113-13 39 25-13 22 13-11-39" fill="#ffcf63"/><path d="M63 80 35 116l28 5m54-41 28 36-28 5" fill="#f3779c"/><path d="M90 17q40 33 30 100H60Q50 50 90 17Z" fill="#fff3dc"/><circle cx="90" cy="70" r="18" fill="#88e4d7" stroke="#7651b5" stroke-width="6"/><path d="M76 112h28" stroke="#7651b5" stroke-width="6"/><circle cx="30" cy="32" r="4" fill="#ffcf63"/><path d="m151 37 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z" fill="#ffcf63"/>',
    // Retro: a colourful cassette.
    '<rect x="18" y="40" width="144" height="102" rx="13" fill="#ff8cae"/><rect x="30" y="52" width="120" height="48" rx="8" fill="#ffe78e"/><circle cx="61" cy="76" r="16" fill="#514081"/><circle cx="119" cy="76" r="16" fill="#514081"/><circle cx="61" cy="76" r="6" fill="#ffe78e"/><circle cx="119" cy="76" r="6" fill="#ffe78e"/><path d="M77 76h26m-46 59 10-24h49l10 24" stroke="#514081" stroke-width="5" fill="none"/><path d="m26 22 18-9m87 145 19-10" stroke="#88e7d9" stroke-width="6" stroke-linecap="round"/>',
    // Weather: sunshine peeking over a cloud.
    '<circle cx="107" cy="58" r="31" fill="#ffdc76"/><path d="M107 9V0m40 28 9-8M153 59h14M70 26l-8-9" stroke="#ffdc76" stroke-width="5" stroke-linecap="round"/><path d="M38 118q-34-3-21-30 5-18 25-14 7-38 44-23 21-7 31 20 35-5 45 24 4 25-28 23Z" fill="#fff4db"/><path d="m76 124-17 26h19l-10 21 32-32H81l15-15" fill="#ffdc76"/>',
    // Plants: an original flower with big green leaves.
    '<path d="M90 88v72m0-10q-53-7-53-46 44 2 53 46m0-14q48-5 51-38-43 2-51 38" fill="#91e5ab" stroke="#91e5ab" stroke-width="5"/><g fill="#f792b3"><ellipse cx="90" cy="36" rx="20" ry="25"/><ellipse cx="90" cy="93" rx="20" ry="25"/><ellipse cx="61" cy="64" rx="25" ry="20"/><ellipse cx="119" cy="64" rx="25" ry="20"/></g><circle cx="90" cy="64" r="22" fill="#ffdc76"/><circle cx="83" cy="61" r="3" fill="#514081"/><circle cx="98" cy="61" r="3" fill="#514081"/><path d="M83 72q7 6 15 0" stroke="#514081" stroke-width="3" fill="none"/>',
    // Pets: a curious cat.
    '<path d="M41 101 31 40l36 16q23-9 46 0l36-16-10 61q-3 44-49 44t-49-44" fill="#ffcf8c"/><path d="m41 57 18 10-15 14m94-24-18 10 15 14" fill="#f88e9e"/><ellipse cx="71" cy="93" rx="4" ry="6" fill="#384178"/><ellipse cx="109" cy="93" rx="4" ry="6" fill="#384178"/><path d="m83 108 7 7 7-7Z" fill="#b25a7a"/><path d="M77 121q13 12 26 0m-48-13-29-7m28 16-30 4m102-13 29-7m-28 16 30 4" stroke="#8c5870" stroke-width="3" fill="none" stroke-linecap="round"/>',
    // Farm animals: a friendly cow.
    '<path d="m53 53-18-20q-5 25 12 30m80-10 18-20q5 25-12 30" fill="#ffcd80"/><ellipse cx="38" cy="73" rx="22" ry="12" fill="#fff4dd"/><ellipse cx="142" cy="73" rx="22" ry="12" fill="#fff4dd"/><path d="M47 76q3-39 43-39t43 39v36q-5 41-43 41t-43-41Z" fill="#fff4dd"/><path d="M63 42q-20 11-16 46 39 10 37-19-1-18-21-27m57 60q22 10 8 29l-18-5Z" fill="#384178"/><ellipse cx="90" cy="124" rx="34" ry="23" fill="#f696ab"/><circle cx="73" cy="89" r="5" fill="#384178"/><circle cx="107" cy="89" r="5" fill="#384178"/><ellipse cx="77" cy="122" rx="4" ry="6" fill="#9b496b"/><ellipse cx="103" cy="122" rx="4" ry="6" fill="#9b496b"/>',
    // Ocean animals: a tropical fish and bubbles.
    '<path d="m120 85 44-37v78Z" fill="#fd8fae"/><path d="M22 84q38-68 106 0-61 73-106 0" fill="#ffdb75"/><path d="M78 51q20 27 0 65m21-56q17 22 0 45" stroke="#f18e55" stroke-width="13" fill="none"/><circle cx="49" cy="81" r="7" fill="#384178"/><path d="M31 97q12 9 23-1" stroke="#384178" stroke-width="3" fill="none"/><circle cx="28" cy="31" r="10" fill="none" stroke="#91e8e0" stroke-width="3"/><circle cx="14" cy="53" r="5" fill="none" stroke="#91e8e0" stroke-width="3"/><path d="M130 165q-17-27-1-39m17 39q-2-24 18-41" stroke="#91e8c0" stroke-width="6" fill="none" stroke-linecap="round"/>',
    // Birds: a colourful bird on a branch.
    '<path d="M39 67q-5-40 37-40 45 4 45 51v39q-11 34-48 32l-30-15 5-42" fill="#ffe78e"/><path d="M105 42q39-3 54 28-27 13-48 1" fill="#f57c77"/><path d="M95 45q27-15 22 31" fill="#f57c77"/><circle cx="83" cy="51" r="6" fill="#384178"/><path d="M49 83q-18 46 37 54l20-41q-26 15-43-13" fill="#87e3ca"/><path d="m37 129-13 28 36-14m7 7v13m28-14v13M12 164h148" stroke="#f7c077" stroke-width="6" stroke-linecap="round" fill="none"/>',
    // Bugs: a cheerful butterfly.
    '<path d="M80 76q-12-66-47-48-43 32 6 67-46 45-7 59 39 8 52-44m16-34q12-66 47-48 43 32-6 67 46 45 7 59-39 8-52-44" fill="#f58bb1"/><path d="M72 79q-17-34-29-23-20 18 16 34m48-11q17-34 29-23 20 18-16 34" fill="#ffd875"/><ellipse cx="90" cy="101" rx="10" ry="44" fill="#fff1d3"/><circle cx="90" cy="57" r="14" fill="#fff1d3"/><path d="m85 45-7-17m17 17 7-17" stroke="#fff1d3" stroke-width="4" stroke-linecap="round"/><circle cx="85" cy="55" r="2" fill="#384178"/><circle cx="95" cy="55" r="2" fill="#384178"/>',
    // Dinosaurs: a very friendly long-neck.
    '<path d="M142 132q-41 35-83 10-25-7-43-37l32 10q-9-28 14-40 20-11 40 8V46q-1-24 24-24 33 2 28 24l-7 37q-8 34-5 49" fill="#9ae4ae"/><path d="m99 92-13-17-12 8-12-14-13 15m57-24 15 8-15 9" fill="#ffce73"/><circle cx="133" cy="42" r="4" fill="#384178"/><path d="M133 53q10 7 20-1" stroke="#384178" stroke-width="3" fill="none"/><path d="m58 134-4 23m35-15-3 15m45-25 2 25" stroke="#9ae4ae" stroke-width="17" stroke-linecap="round"/>',
    // Reptiles: a little lizard.
    '<path d="M73 98q-39 47-51 22-18-40 31-38M83 66 65 42l-9-4m67 28 19-24 9-4m-64 78-22 23-11 1m67-25 20 24 11 1" stroke="#a2e79f" stroke-width="10" stroke-linecap="round" fill="none"/><ellipse cx="103" cy="90" rx="25" ry="43" fill="#a2e79f"/><ellipse cx="103" cy="48" rx="31" ry="23" fill="#a2e79f"/><circle cx="86" cy="37" r="10" fill="#fff4d5"/><circle cx="120" cy="37" r="10" fill="#fff4d5"/><circle cx="86" cy="37" r="4" fill="#384178"/><circle cx="120" cy="37" r="4" fill="#384178"/><path d="M91 56q12 10 24 0" stroke="#384178" stroke-width="3" fill="none"/><circle cx="103" cy="83" r="5" fill="#ffe07b"/><circle cx="103" cy="105" r="5" fill="#ffe07b"/>',
    // Animal sounds: a hooting owl.
    '<path d="M40 70V28l29 21q20-9 42 0l29-21v42q20 77-50 83-70-6-50-83" fill="#cca0e9"/><path d="M41 81q-30 25 4 55m94-55q30 25-4 55" fill="#f393b4"/><circle cx="67" cy="81" r="25" fill="#fff4d8"/><circle cx="113" cy="81" r="25" fill="#fff4d8"/><circle cx="67" cy="81" r="10" fill="#384178"/><circle cx="113" cy="81" r="10" fill="#384178"/><path d="m82 96 8 17 8-17Z" fill="#ffd576"/><path d="m67 124 6 7m14-7 6 7m14-7 6 7" stroke="#fff4d8" stroke-width="4" stroke-linecap="round"/>'

  ];
  F.coverGroup = (pack) => {
    if (!pack.number) return 10;
    if (pack.number >= 2 && pack.number <= 8) return pack.number + 14;
    if (pack.number === 10) return 23;
    if (pack.number >= 69 && pack.number <= 72) return 11;
    if (pack.number === 113 || pack.number === 114) return 12;
    if (pack.number === 119) return 13;
    if (pack.number === 11) return 14;
    if (pack.number === 12) return 15;
    return Math.floor((pack.number - 1) / 12);
  };
  F.illustration = (kind) => {
    const svg = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">' +
      '<g fill="#fff" opacity=".35"><circle cx="16" cy="95" r="3"/><circle cx="158" cy="22" r="3"/><path d="m16 22 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/></g>' +
      drawings[kind] + '</svg>', "image/svg+xml").documentElement;
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    return svg;
  };
  F.partyIllustration = () => {
    const svg = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300">' +
      '<ellipse cx="222" cy="270" rx="170" ry="17" fill="#351888" opacity=".3"/>' +
      '<g stroke="#ffce62" stroke-width="7" stroke-linecap="round"><path d="m36 37 10 13m317-5 14-10M357 160l15 9M35 165l-9 14"/></g>' +
      '<g fill="#9aeedb"><path d="m286 17 5 11 13 2-9 9 2 13-11-6-12 6 3-13-10-9 13-2Z"/><circle cx="66" cy="107" r="6"/><circle cx="343" cy="104" r="5"/></g>' +
      '<path d="M77 180q-34-61 5-112 24-28 50-12 36 9 18 75l-12 62Z" fill="#e95c57"/>' +
      '<path d="M50 269v-75q1-40 46-43 46 1 52 48l7 70Z" fill="#81e8d2"/><path d="M94 136v24q14 14 29 0v-26" fill="#ffc1a0"/>' +
      '<ellipse cx="106" cy="109" rx="33" ry="43" fill="#ffd3b4"/><path d="M72 100q9-47 43-38l24 28q-45 2-58-15Z" fill="#e95c57"/>' +
      '<path d="M91 116q14 18 26 0" fill="#fff8dd"/><path d="M84 101q5-6 10 0m21 0q5-6 10 0" stroke="#603442" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M149 215 192 166m-118 38-30-28" stroke="#ffd3b4" stroke-width="18" stroke-linecap="round"/>' +
      '<path d="M259 268v-69q5-42 45-46 41 4 45 46v69" fill="#ffce62"/><path d="M291 133v27q15 14 29 0v-29" fill="#ae6957"/>' +
      '<ellipse cx="305" cy="103" rx="33" ry="45" fill="#c78969"/><path d="M272 97q-17-55 17-55 33-25 48 13 28 28-3 46l-5-27q-29 1-39-14Z" fill="#352850"/>' +
      '<path d="M291 111q13 20 27 0" fill="#fff8dd"/><path d="M281 96q5-6 10 0m22 0q5-6 10 0" stroke="#352850" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="m276 190-36-50m88 51 35-43" stroke="#c78969" stroke-width="18" stroke-linecap="round"/>' +
      '<path d="M163 268v-71q3-43 47-46 40 3 46 46v71Z" fill="#f47aa9"/><path d="M198 137v25q13 11 26 0v-25" fill="#b97b5a"/>' +
      '<ellipse cx="211" cy="113" rx="32" ry="41" fill="#d49b73"/><path d="M179 100q-13-51 27-46 44-11 37 39l-14-19q-23 15-50 11" fill="#3d2c53"/>' +
      '<path d="M199 122q12 17 25 0" fill="#fff8dd"/><path d="M190 110q5-5 10 0m20 0q5-5 10 0" stroke="#3d2c53" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M184 201 159 114m73 86 29-84" stroke="#d49b73" stroke-width="17" stroke-linecap="round"/>' +
      '<g transform="rotate(-7 211 64)"><rect x="167" y="29" width="88" height="52" rx="9" fill="#fff5db"/><rect x="173" y="35" width="76" height="40" rx="5" fill="#1675dc"/><path d="m190 57 9 9 21-20" stroke="#fff5db" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></svg>', "image/svg+xml").documentElement;
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    return svg;
  };
})();
