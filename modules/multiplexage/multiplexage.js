/*
 * TELECOM CONNECT LAB 2.0 — Multiplexage et accès multiple.
 * Modèle : ALOHA théorique, codes orthogonaux synchrones sans bruit, OFDM idéal.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  var WALSH = [[1, 1, 1, 1], [1, -1, 1, -1], [1, 1, -1, -1], [1, -1, -1, 1]];

  function aloha(kind, G) { return kind === 'slotted' ? G * Math.exp(-G) : G * Math.exp(-2 * G); }
  function correlate(sig, code) { return sig.reduce(function (s, x, i) { return s + x * code[i]; }, 0) / code.length; }
  function cdma(bits, codes) { var chips = [0, 0, 0, 0]; bits.forEach(function (b, u) { codes[u].forEach(function (c, i) { chips[i] += b * c; }); }); return chips; }
  function ofdm(N, df, cp) { var Tu = 1 / df, Ts = Tu * (1 + cp); return { B: N * df, Tu: Tu, Ts: Ts, rate: N / Ts }; }
  function tdm(n, bits, frame) { return n * bits / frame; }
  var math = { WALSH: WALSH, aloha: aloha, correlate: correlate, cdma: cdma, ofdm: ofdm, tdm: tdm };

  var lesson = K.lesson({ id: 'multiplexage', title: 'Multiplexage et accès multiple',
    intro: 'Une ressource radio ou un câble se partage entre plusieurs utilisateurs, en séparant leurs signaux dans le temps, la fréquence, le code ou la longueur d’onde.',
    objectives: ['Distinguer FDM, TDM, WDM, OFDM et CDMA.', 'Calculer le débit d’un multiplexage temporel.', 'Expliquer l’orthogonalité des sous-porteuses OFDM.', 'Prévoir le débit utile d’un accès aléatoire ALOHA.'],
    prerequisites: 'Modulation.',
    sources: ['Pages « ALOHAnet », « Orthogonal frequency-division multiplexing », « Code-division multiple access ».'],
    figures: {
      plan: { caption: 'Quatre façons de partager une ressource.', svg: function () { return S.blocks({ w: 520, h: 150, label: 'FDM, TDM, CDMA et WDM.', boxes: [{ id: 'a', x: 15, y: 40, w: 115, h: 70, t: 'FDM', sub: 'par fréquence' }, { id: 'b', x: 140, y: 40, w: 115, h: 70, t: 'TDM', sub: 'par temps' }, { id: 'c', x: 265, y: 40, w: 115, h: 70, t: 'CDMA', sub: 'par code' }, { id: 'd', x: 390, y: 40, w: 115, h: 70, t: 'WDM', sub: 'par longueur d’onde' }], links: [] }); } },
      al: { caption: 'Débit utile en fonction de la charge offerte : ALOHA à créneaux atteint 36,8 %, ALOHA pur 18,4 %.', options: function () { return { kind: 'xy', title: 'ALOHA', desc: 'Débit utile selon la charge offerte.', x: { min: 0, max: 4, label: 'charge offerte G' }, y: { min: 0, max: 0.45, label: 'débit utile S' }, series: [{ samples: 200, fn: function (g) { return aloha('slotted', g); } }, { samples: 200, cls: 'scope__trace--alt', fn: function (g) { return aloha('pure', g); } }], points: [{ x: 1, y: Math.exp(-1), label: '36,8 %' }, { x: 0.5, y: 0.5 / Math.E, label: '18,4 %' }] }; } } },
    chapters: [
      { title: 'Temps, fréquence, longueur d’onde', summary: 'FDM, TDM et WDM.', html: [
        '<p class="lead">Le partage le plus simple attribue à chaque usager une tranche de fréquence ou de temps.</p>',
        '<div data-fig="plan"></div>',
        K.defs([['FDM', 'Chaque voie occupe une bande de fréquences, séparée par des bandes de garde.'], ['TDM', 'Chaque voie transmet à tour de rôle dans des intervalles de temps.'], ['WDM', 'FDM optique : plusieurs longueurs d’onde sur une même fibre.']]),
        K.formula('D = ' + v('N') + ' · ' + v('b') + ' / T<sub>trame</sub>', 'TDM : N voies de b bits dans une trame de durée T.'),
        K.example('le E1', '<p>32 intervalles de 8 bits toutes les 125 µs : D = 32 × 8/125·10⁻⁶ = ' + si(tdm(32, 8, 125e-6), 'bit/s') + '. C’est le débit des anciens liens téléphoniques E1.</p>')] },
      { title: 'OFDM', summary: 'Sous-porteuses orthogonales et préfixe cyclique.', html: [
        '<p class="lead">L’OFDM transmet en parallèle sur un grand nombre de sous-porteuses étroites, ce qui protège contre les trajets multiples.</p>',
        K.formula('Δ' + v('f') + ' = 1/T<sub>u</sub>, B ≈ N Δ' + v('f'), 'Sous-porteuses orthogonales : leurs spectres se chevauchent sans interférer au point de décision.'),
        K.defs([['Préfixe cyclique', 'Copie de la fin du symbole placée au début ; il absorbe l’étalement des trajets multiples.'], ['Sous-porteuse', 'Porteuse étroite transportant une partie du flux.']]),
        K.example('symbole OFDM', '<p>Pour Δf = 15 kHz, T<sub>u</sub> = ' + si(1 / 15000, 's') + '. 1 200 sous-porteuses occupent ' + si(1200 * 15000, 'Hz') + ' : c’est le cas d’une porteuse de 20 MHz.</p>')] },
      { title: 'Accès multiple par codes et accès aléatoire', summary: 'CDMA, ALOHA.', html: [
        '<p class="lead">Quand les stations partagent le même canal au même moment, un code orthogonal ou une règle de reprise après collision les sépare.</p>',
        K.formula('b̂ = (1/L) ∑ r<sub>i</sub> c<sub>i</sub>', 'Corrélation du signal reçu avec le code de longueur L. Les autres utilisateurs s’annulent si les codes sont orthogonaux et synchrones.'),
        '<div data-fig="al"></div>',
        K.formula(v('S') + ' = ' + v('G') + 'e<sup>−2G</sup> (ALOHA pur), ' + v('S') + ' = ' + v('G') + 'e<sup>−G</sup> (à créneaux)', 'Arrivées de Poisson, collisions destructrices. Maxima à G = 0,5 et G = 1.'),
        K.example('une trame CDMA', '<p>Deux utilisateurs émettent +1 et −1 avec les codes (1,1,1,1) et (1,−1,1,−1). Les chips reçus sont ' + cdma([1, -1], [WALSH[0], WALSH[1]]).join(', ') + '. La corrélation avec le premier code redonne ' + correlate(cdma([1, -1], [WALSH[0], WALSH[1]]), WALSH[0]) + '.</p>'),
        K.pitfalls(['<strong>Croire que des sous-porteuses qui se chevauchent interfèrent toujours.</strong> L’orthogonalité l’évite.', '<strong>Augmenter la charge d’ALOHA au-delà de l’optimum</strong> : le débit utile s’effondre.', '<strong>Oublier que le CDMA demande une synchronisation et un contrôle de puissance.</strong>']),
        K.summary(['FDM sépare en fréquence, TDM en temps, WDM en longueur d’onde.', 'OFDM : Δf = 1/T<sub>u</sub>, avec un préfixe cyclique.', 'CDMA : la corrélation extrait le bon utilisateur.', 'ALOHA plafonne à 18,4 % ou 36,8 %.']),
        K.toLab('multiplexage', 'Faites varier la charge d’un canal ALOHA, puis séparez deux utilisateurs par leurs codes.')] }
    ] });

  var D = { kind: 'pure', G: 0.1, N: 600, df: 15, cp: 7, b1: 1, b2: -1, c1: 0, c2: 1 };
  function M(s) { var S0 = aloha(s.kind, s.G), o = ofdm(s.N, s.df * 1000, s.cp / 100), codes = [WALSH[s.c1], WALSH[s.c2]], chips = cdma([s.b1, s.b2], codes), r1 = correlate(chips, codes[0]), r2 = correlate(chips, codes[1]); return { S: S0, peak: s.kind === 'slotted' ? 1 : 0.5, o: o, chips: chips, r1: r1, r2: r2, sep: Math.sign(r1) === s.b1 && Math.sign(r2) === s.b2 && Math.abs(r1) === 1 && Math.abs(r2) === 1 }; }
  var lab = { id: 'multiplexage', title: 'ALOHA, OFDM et codes orthogonaux', short: 'Multiplexage', icon: 'network', badge: 'Modèles théoriques, utilisateurs synchronisés',
    text: 'Faites varier la charge d’un canal à accès aléatoire, dimensionnez une porteuse OFDM, puis partagez un canal avec des codes.',
    summary: 'Comparez ALOHA pur et à créneaux, dimensionnez une porteuse OFDM, séparez deux utilisateurs par leurs codes.',
    params: [{ group: 'Accès aléatoire' }, { k: 'kind', label: 'Protocole', opts: [['pure', 'ALOHA pur'], ['slotted', 'À créneaux']] }, { k: 'G', label: 'Charge offerte G', min: 0.01, max: 4, step: 0.01, unit: '', dec: 2 }, { group: 'OFDM' }, { k: 'N', label: 'Sous-porteuses', min: 12, max: 3300, step: 12, unit: '', dec: 0 }, { k: 'df', label: 'Espacement', opts: [[15, '15 kHz'], [30, '30 kHz'], [60, '60 kHz']] }, { k: 'cp', label: 'Préfixe cyclique', min: 0, max: 25, step: 1, unit: '%', dec: 0 }, { group: 'Codes' }, { k: 'b1', label: 'Bit utilisateur 1', opts: [[1, '+1'], [-1, '−1']] }, { k: 'b2', label: 'Bit utilisateur 2', opts: [[1, '+1'], [-1, '−1']] }, { k: 'c1', label: 'Code utilisateur 1', opts: [[0, 'W0'], [1, 'W1'], [2, 'W2'], [3, 'W3']] }, { k: 'c2', label: 'Code utilisateur 2', opts: [[0, 'W0'], [1, 'W1'], [2, 'W2'], [3, 'W3']] }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Débit utile S = ' + fN(m.S * 100) + ' %'; },
    verdict: function (s, m) { return m.sep ? { ok: true, text: 'Utilisateurs séparés' } : { ok: false, text: 'Codes non orthogonaux' }; },
    widget: function (s, m) { return '<h3>Signal CDMA</h3><p>Chips reçus : <strong>' + m.chips.join(', ') + '</strong></p><p>Corrélation utilisateur 1 : <strong>' + fN(m.r1) + '</strong> (bit émis ' + s.b1 + ') · utilisateur 2 : <strong>' + fN(m.r2) + '</strong> (bit émis ' + s.b2 + ')</p>'; },
    readouts: [['Débit utile', function (s, m) { return fN(m.S * 100) + ' %'; }], ['Charge optimale', function (s, m) { return fN(m.peak); }], ['Bande OFDM', function (s, m) { return si(m.o.B, 'Hz'); }], ['Durée utile T_u', function (s, m) { return si(m.o.Tu, 's'); }], ['Symbole avec préfixe', function (s, m) { return si(m.o.Ts, 's'); }], ['Symboles complexes/s', function (s, m) { return si(m.o.rate, 'sym/s'); }]],
    plots: [{ options: function (s, m) { return { title: 'Débit utile', desc: 'Débit utile selon la charge.', x: { min: 0, max: 4, label: 'G' }, y: { min: 0, max: 0.45, label: 'S' }, series: [{ samples: 200, fn: function (g) { return aloha(s.kind, g); } }], points: [{ x: s.G, y: m.S, label: 'réglage' }] }; } }],
    explain: function (s, m) { return '<p>À G = ' + fN(s.G) + ', ' + fN(m.S * 100) + ' % du canal transporte des données utiles. L’OFDM occupe ' + si(m.o.B, 'Hz') + ', avec un préfixe qui allonge le symbole à ' + si(m.o.Ts, 's') + '. Les corrélations retrouvent ' + fN(m.r1) + ' et ' + fN(m.r2) + '.</p>'; },
    missions: [
      { id: 'm1', title: 'Charge optimale', text: 'En ALOHA à créneaux, réglez G à 5 % près de l’optimum.', solution: { kind: 'slotted', G: 1 }, check: function (s, m) { if (s.kind !== 'slotted') return { ok: false, msg: 'Choisissez ALOHA à créneaux.' }; return Math.abs(s.G - 1) <= 0.05 ? { ok: true, msg: 'Réussi : S = ' + fN(m.S * 100) + ' %, proche de 1/e.' } : { ok: false, msg: 'G = ' + fN(s.G) + '. Visez 1.' }; } },
      { id: 'm2', title: 'Saturer le canal', text: 'Augmentez la charge au-delà de l’optimum jusqu’à passer sous 5 % de débit utile en ALOHA pur.', solution: { kind: 'pure', G: 2.2 }, check: function (s, m) { if (s.kind !== 'pure') return { ok: false, msg: 'Choisissez ALOHA pur.' }; return m.S < 0.05 && s.G > 0.5 ? { ok: true, msg: 'Réussi : au-delà de l’optimum, les collisions dominent (S = ' + fN(m.S * 100) + ' %).' } : { ok: false, msg: 'S = ' + fN(m.S * 100) + ' %. Augmentez G.' }; } },
      { id: 'm3', title: 'Une porteuse de 20 MHz', text: 'Dimensionnez une porteuse occupant environ 18 MHz (entre 17,8 et 18,2 MHz) avec un espacement de 15 kHz.', solution: { N: 1200, df: 15 }, check: function (s, m) { if (s.df !== 15) return { ok: false, msg: 'Utilisez 15 kHz.' }; return m.o.B >= 17.8e6 && m.o.B <= 18.2e6 ? { ok: true, msg: 'Réussi : ' + s.N + ' sous-porteuses occupent ' + si(m.o.B, 'Hz') + '.' } : { ok: false, msg: 'Bande : ' + si(m.o.B, 'Hz') + '.' }; } },
      { id: 'm4', title: 'Conflit de codes', text: 'Attribuez le même code aux deux utilisateurs et observez l’impossibilité de les séparer.', solution: { c1: 2, c2: 2 }, check: function (s, m) { return s.c1 === s.c2 ? { ok: true, msg: 'Réussi : un même code ne permet pas de séparer deux émissions.' } : { ok: false, msg: 'Choisissez le même code pour les deux utilisateurs.' }; } }],
    limits: '<p>Le modèle ALOHA suppose un nombre infini de stations et des arrivées de Poisson. Les codes sont parfaitement synchronisés et sans bruit. L’OFDM est représenté sans bandes de garde ni interférence entre cellules.</p>' };

  var list = [
    K.num('e1', 'Débit E1', 'TDM', '<p>32 voies de 8 bits, trame de 125 µs. Calculez le débit, en Mbit/s.</p>', 2.048, 'Mbit/s', { rel: 0.01 }, '<p>32 × 8 / 125·10⁻⁶ = 2,048 Mbit/s.</p>'),
    K.num('e2', 'Durée utile OFDM', 'OFDM', '<p>Espacement 30 kHz. Calculez T<sub>u</sub>, en µs.</p>', 1e6 / 30000, 'µs', { rel: 0.02 }, '<p>T<sub>u</sub> = 1/Δf = ' + fN(1e6 / 30000, 4) + ' µs.</p>'),
    K.num('e3', 'Bande occupée', 'OFDM', '<p>3 276 sous-porteuses espacées de 30 kHz. Calculez la bande occupée, en MHz.</p>', 98.28, 'MHz', { rel: 0.01 }, '<p>3276 × 30 kHz = 98,28 MHz.</p>'),
    K.num('e4', 'ALOHA pur', 'Accès aléatoire', '<p>Calculez le débit utile maximal d’ALOHA pur, en %.</p>', 50 / Math.E, '%', { rel: 0.02 }, '<p>1/(2e) = ' + fN(50 / Math.E, 4) + ' %.</p>'),
    K.num('e5', 'ALOHA à créneaux', 'Accès aléatoire', '<p>G = 0,5 en ALOHA à créneaux. Calculez S.</p>', 0.5 * Math.exp(-0.5), '', { rel: 0.02 }, '<p>S = G·e<sup>−G</sup> = ' + fN(0.5 * Math.exp(-0.5), 4) + '.</p>'),
    K.num('e6', 'Corrélation', 'CDMA', '<p>Chips reçus 0, 2, 0, 2 ; code (1, 1, 1, 1). Calculez la corrélation normalisée.</p>', 1, '', { abs: 0.05 }, '<p>(0 + 2 + 0 + 2)/4 = 1.</p>'),
    K.pick('e7', 'Préfixe cyclique', 'OFDM', '<p>À quoi sert le préfixe cyclique ?</p>', 'À absorber l’étalement dû aux trajets multiples', ['À augmenter le débit', 'À chiffrer les données', 'À réduire la bande occupée'], '<p>Le symbole utile est ainsi protégé des échos.</p>'),
    K.pick('e8', 'WDM', 'Fréquence', '<p>Le WDM multiplexe :</p>', 'des longueurs d’onde sur une fibre', ['des codes sur une antenne', 'des bits dans un seul créneau', 'des signaux par polarisation électrique'], '<p>C’est l’équivalent optique du multiplexage en fréquence.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('multiplexage', list) };
});
