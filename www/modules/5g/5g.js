/*
 * TELECOM CONNECT LAB 2.0 — 4G, 5G et technologies émergentes.
 * Numérologie : ETSI TS 138 211 ; débit : TS 138 306 §4.1.2 ; N_RB : TS 138 101-1, table 5.3.2-1.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  var NRB = { 0: { 5: 25, 10: 52, 15: 79, 20: 106, 25: 133, 30: 160, 40: 216, 50: 270 }, 1: { 5: 11, 10: 24, 15: 38, 20: 51, 25: 65, 30: 78, 40: 106, 50: 133, 60: 162, 70: 189, 80: 217, 90: 245, 100: 273 }, 2: { 10: 11, 15: 18, 20: 24, 25: 31, 30: 38, 40: 51, 50: 65, 60: 79, 70: 93, 80: 107, 90: 121, 100: 135 } };
  var OH = { dl: 0.14, ul: 0.08 };
  function scs(mu) { return 15 * Math.pow(2, mu); }
  function slot(mu) { return 1e-3 / Math.pow(2, mu); }
  function ts(mu) { return 1e-3 / (14 * Math.pow(2, mu)); }
  function peak(p) { var n = (NRB[p.mu] || {})[p.bw]; if (!n) return null; return 1e-6 * p.layers * p.qm * p.scale * (948 / 1024) * (n * 12 / ts(p.mu)) * (1 - OH[p.dir]); }
  /** Facteur de réseau d'un alignement linéaire uniforme espacé d'une demi-longueur d'onde. */
  function arrayFactor(N, thDeg, steerDeg) { var psi = Math.PI * (Math.sin(thDeg * Math.PI / 180) - Math.sin(steerDeg * Math.PI / 180)); if (Math.abs(Math.sin(psi / 2)) < 1e-9) return 1; return Math.abs(Math.sin(N * psi / 2) / (N * Math.sin(psi / 2))); }
  function arrayGainDb(N) { return 10 * K.log10(N); }
  var math = { NRB: NRB, OH: OH, scs: scs, slot: slot, ts: ts, peak: peak, arrayFactor: arrayFactor, arrayGainDb: arrayGainDb };

  var lesson = K.lesson({ id: '5g', title: '4G, 5G et technologies émergentes',
    intro: 'La 5G reprend les principes de l’OFDM en les rendant flexibles, ajoute des antennes actives et sépare le réseau en tranches adaptées aux usages.',
    objectives: ['Expliquer la numérologie de la 5G NR.', 'Calculer un débit maximal selon la méthode 3GPP.', 'Expliquer le MIMO et la formation de faisceau.', 'Décrire les usages et le découpage en tranches.'],
    prerequisites: 'Réseaux mobiles ; multiplexage et OFDM.',
    sources: ['ETSI TS 138 211 V16.2.0 (numérologie).', 'ETSI TS 138 306 V16.1.0 §4.1.2 (débit).', 'ETSI TS 138 101-1 V16.5.0, table 5.3.2-1 (blocs de ressources).', 'Pages « MIMO », « Beamforming », « 5G network slicing ».'],
    figures: { arch: { caption: 'Une architecture 5G sépare l’accès radio, le réseau cœur et les services.', svg: function () { return S.blocks({ w: 520, h: 120, label: 'Terminal, station gNB, cœur 5GC, réseau de données.', boxes: [{ id: 'a', x: 20, y: 35, w: 90, h: 50, t: 'Terminal' }, { id: 'b', x: 150, y: 35, w: 90, h: 50, t: 'gNB' }, { id: 'c', x: 280, y: 35, w: 90, h: 50, t: 'Cœur 5GC' }, { id: 'd', x: 410, y: 35, w: 90, h: 50, t: 'Internet' }], links: [{ a: 'a', b: 'b', both: true }, { a: 'b', b: 'c', both: true }, { a: 'c', b: 'd', both: true }] }); } },
      af: { caption: 'Diagramme d’un réseau de 8 antennes : plus d’éléments donnent un faisceau plus étroit.', options: function () { return { kind: 'xy', title: 'Facteur de réseau', desc: 'Amplitude rayonnée en fonction de l’angle.', x: { min: -90, max: 90, ticks: [-90, -45, 0, 45, 90], label: 'angle (°)' }, y: { min: 0, max: 1.1, label: 'amplitude relative' }, series: [{ samples: 400, fn: function (t) { return arrayFactor(8, t, 0); } }] }; } } },
    chapters: [
      { title: 'De la 4G à la 5G', summary: 'OFDM, numérologie flexible, usages.', html: [
        '<p class="lead">La 5G NR utilise des espacements de sous-porteuses multiples de 15 kHz, pour s’adapter à des fréquences et à des usages très différents.</p>',
        K.formula('Δ' + v('f') + ' = 2<sup>µ</sup> · 15 kHz, 14 symboles par créneau, 2<sup>µ</sup> créneaux par sous-trame de 1 ms', 'Préfixe cyclique normal (TS 38.211).'),
        K.defs([['Numérologie µ', 'Paramètre qui fixe l’espacement et la durée des créneaux.'], ['Bloc de ressources', '12 sous-porteuses consécutives.'], ['eMBB, URLLC, mMTC', 'Haut débit mobile, faible latence fiable, très grand nombre d’objets.']]),
        '<div data-fig="arch"></div>',
        K.example('durée d’un créneau', '<p>µ = 1 : 30 kHz, créneau de ' + si(slot(1), 's') + '. µ = 3 : 120 kHz, créneau de ' + si(slot(3), 's') + ', mieux adapté aux ondes millimétriques.</p>')] },
      { title: 'Calculer un débit', summary: 'La formule 3GPP de débit maximal.', html: [
        '<p class="lead">Le débit maximal d’un terminal se calcule à partir de ses capacités et de la bande utilisée.</p>',
        K.formula('D<sub>Mbit/s</sub> = 10⁻⁶ · v · Q<sub>m</sub> · f · R<sub>max</sub> · (N<sub>PRB</sub> · 12 / T<sub>s</sub>) · (1 − OH)', 'TS 38.306 §4.1.2. R<sub>max</sub> = 948/1024, T<sub>s</sub> = 10⁻³/(14 · 2<sup>µ</sup>) s, OH = 0,14 (DL FR1) ou 0,08 (UL FR1). Valeur maximale théorique, non garantie.'),
        K.example('100 MHz à 30 kHz', '<p>N<sub>PRB</sub> = 273, 4 couches, 256-QAM (Q<sub>m</sub> = 8), f = 1 : D = ' + fN(peak({ mu: 1, bw: 100, layers: 4, qm: 8, scale: 1, dir: 'dl' }), 4) + ' Mbit/s en descendant.</p>'),
        K.apply('<p>Ce chiffre est un plafond : le débit réel dépend de la couverture, de la charge de la cellule et du nombre de terminaux servis.</p>')] },
      { title: 'MIMO, faisceaux et tranches', summary: 'MIMO, beamforming, slicing.', html: [
        '<p class="lead">Les antennes multiples transportent plusieurs flux ou concentrent l’énergie vers l’utilisateur.</p>',
        '<div data-fig="af"></div>',
        K.formula('G ≈ 10 log₁₀ N', 'Gain maximal de formation de faisceau d’un réseau de N éléments identiques, en dB.'),
        K.defs([['MIMO', 'Plusieurs flux parallèles sur le même canal, limités par min(N<sub>t</sub>, N<sub>r</sub>).'], ['Formation de faisceau', 'Déphasage des éléments pour diriger l’énergie.'], ['Tranche de réseau', 'Réseau logique isolé sur une infrastructure commune.']]),
        K.example('gain d’un réseau', '<p>64 éléments donnent environ ' + fN(arrayGainDb(64)) + ' dB de gain de réseau.</p>'),
        K.pitfalls(['<strong>Confondre débit maximal et débit réel.</strong>', '<strong>Croire que la 5G remplace l’OFDM.</strong> Elle l’utilise.', '<strong>Ignorer que les hautes fréquences portent moins loin</strong> et traversent moins bien les obstacles.']),
        K.summary(['Δf = 2<sup>µ</sup>·15 kHz.', 'Le débit maximal se calcule selon TS 38.306.', 'MIMO : jusqu’à min(N<sub>t</sub>, N<sub>r</sub>) flux.', 'Une tranche est un réseau logique isolé.']),
        K.toLab('5g', 'Calculez un débit 3GPP et orientez un faisceau.')] }
    ] });

  var D = { mu: 1, bw: 20, layers: 2, qm: 6, scale: 1, dir: 'dl', N: 8, steer: 0 };
  function M(s) { var r = peak(s); return { r: r, df: scs(s.mu), slot: slot(s.mu), nrb: (NRB[s.mu] || {})[s.bw] || null, ag: arrayGainDb(s.N) }; }
  var lab = { id: '5g', title: 'Débit 5G NR et formation de faisceau', short: '4G et 5G', icon: 'mobile', badge: 'Formule TS 38.306, réseau d’antennes idéal',
    text: 'Calculez le débit maximal d’une porteuse NR, puis dirigez le faisceau d’un réseau d’antennes.',
    summary: 'Calculez un débit NR selon TS 38.306 et orientez un faisceau d’antennes.',
    params: [{ group: 'Porteuse NR' }, { k: 'mu', label: 'Numérologie µ', opts: [[0, '15 kHz'], [1, '30 kHz'], [2, '60 kHz']] }, { k: 'bw', label: 'Largeur de bande', select: true, opts: [[5, '5 MHz'], [10, '10 MHz'], [20, '20 MHz'], [40, '40 MHz'], [50, '50 MHz'], [100, '100 MHz']], hint: 'Certaines combinaisons ne sont pas définies pour FR1.' }, { k: 'layers', label: 'Couches MIMO', opts: [[1, '1'], [2, '2'], [4, '4']] }, { k: 'qm', label: 'Modulation', opts: [[2, 'QPSK'], [4, '16-QAM'], [6, '64-QAM'], [8, '256-QAM']] }, { k: 'scale', label: 'Facteur d’échelle f', opts: [[1, '1'], [0.75, '0,75'], [0.4, '0,4']] }, { k: 'dir', label: 'Sens', opts: [['dl', 'Descendant'], ['ul', 'Montant']] }, { group: 'Réseau d’antennes' }, { k: 'N', label: 'Éléments', min: 2, max: 64, step: 1, unit: '', dec: 0 }, { k: 'steer', label: 'Direction', min: -60, max: 60, step: 1, unit: '°', dec: 0 }],
    defaults: D, model: M,
    expr: function (s, m) { return m.r ? 'Débit maximal : ' + fN(m.r, 4) + ' Mbit/s' : 'Combinaison non définie'; },
    verdict: function (s, m) { return m.r ? { ok: true, text: 'Configuration définie' } : { ok: false, text: 'Non définie dans la table 5.3.2-1' }; },
    readouts: [['Espacement', function (s, m) { return m.df + ' kHz'; }], ['Durée du créneau', function (s, m) { return si(m.slot, 's'); }], ['N_RB', function (s, m) { return m.nrb ? String(m.nrb) : 'non défini'; }], ['Débit maximal', function (s, m) { return m.r ? fN(m.r, 4) + ' Mbit/s' : 'non défini'; }], ['Gain du réseau', function (s, m) { return fN(m.ag) + ' dB'; }]],
    plots: [{ options: function (s) { return { title: 'Faisceau', desc: 'Diagramme du réseau d’antennes.', x: { min: -90, max: 90, ticks: [-90, -45, 0, 45, 90], label: 'angle (°)' }, y: { min: 0, max: 1.1, label: 'amplitude' }, series: [{ samples: 500, fn: function (t) { return arrayFactor(s.N, t, s.steer); } }], vlines: [{ x: s.steer, label: 'visée' }] }; } }],
    explain: function (s, m) { return m.r ? '<p>' + m.nrb + ' blocs de ressources à ' + m.df + ' kHz, ' + s.layers + ' couches et Q<sub>m</sub> = ' + s.qm + ' donnent au plus ' + fN(m.r, 4) + ' Mbit/s. Le réseau de ' + s.N + ' éléments apporte ' + fN(m.ag) + ' dB.</p>' : '<p>Cette largeur n’est pas définie pour cette numérologie dans TS 38.101-1.</p>'; },
    missions: [
      { id: 'm1', title: 'Dépasser le gigabit', text: 'Trouvez une configuration descendante dépassant 1 000 Mbit/s en 100 MHz.', solution: { mu: 1, bw: 100, layers: 4, qm: 6 }, check: function (s, m) { if (s.bw !== 100) return { ok: false, msg: 'Sélectionnez 100 MHz.' }; return m.r && m.r > 1000 && s.dir === 'dl' ? { ok: true, msg: 'Réussi : ' + fN(m.r, 4) + ' Mbit/s en théorie.' } : { ok: false, msg: 'Débit : ' + (m.r ? fN(m.r, 4) + ' Mbit/s' : 'non défini') + '.' }; } },
      { id: 'm2', title: 'Une configuration impossible', text: 'Sélectionnez une combinaison absente de la table.', solution: { mu: 0, bw: 100 }, check: function (s, m) { return !m.r ? { ok: true, msg: 'Réussi : 100 MHz n’existe pas à 15 kHz en FR1.' } : { ok: false, msg: 'Cette configuration est définie.' }; } },
      { id: 'm3', title: 'Orienter un faisceau', text: 'Avec au moins 16 éléments, dirigez le faisceau vers 30°.', solution: { N: 16, steer: 30 }, check: function (s) { return s.N >= 16 && s.steer === 30 ? { ok: true, msg: 'Réussi : déphasage entre éléments réglé pour viser 30°.' } : { ok: false, msg: 'Réglez au moins 16 éléments et une direction de 30°.' }; } }],
    limits: '<p>Le débit est le plafond théorique défini par 3GPP, hors charge, couverture et signalisation réelle. Seule la bande FR1 est couverte. Le faisceau suppose des éléments isotropes espacés d’une demi-longueur d’onde et sans couplage.</p>' };

  var list = [
    K.num('e1', 'Espacement', 'Numérologie', '<p>Calculez l’espacement des sous-porteuses pour µ = 2, en kHz.</p>', 60, 'kHz', { abs: 0.5 }, '<p>15 × 2² = 60 kHz.</p>'),
    K.num('e2', 'Créneau', 'Numérologie', '<p>Calculez la durée d’un créneau pour µ = 3, en µs.</p>', 125, 'µs', { rel: 0.01 }, '<p>1 ms / 2³ = 125 µs.</p>'),
    K.num('e3', 'Largeur RB', 'Numérologie', '<p>Calculez la largeur d’un bloc de ressources à 30 kHz, en kHz.</p>', 360, 'kHz', { abs: 0.5 }, '<p>12 × 30 = 360 kHz.</p>'),
    K.num('e4', 'Débit 20 MHz', 'Débit', '<p>µ = 1, 20 MHz (N = 51), 2 couches, 64-QAM, f = 1, descendant. Calculez le débit maximal, en Mbit/s.</p>', peak({ mu: 1, bw: 20, layers: 2, qm: 6, scale: 1, dir: 'dl' }), 'Mbit/s', { rel: 0.03 }, '<p>Formule TS 38.306 : ' + fN(peak({ mu: 1, bw: 20, layers: 2, qm: 6, scale: 1, dir: 'dl' }), 4) + ' Mbit/s.</p>'),
    K.num('e5', 'Gain de réseau', 'Antennes', '<p>Calculez le gain de réseau pour 32 éléments, en dB.</p>', arrayGainDb(32), 'dB', { rel: 0.02 }, '<p>10 log₁₀(32) = ' + fN(arrayGainDb(32), 4) + ' dB.</p>'),
    K.num('e6', 'Flux MIMO', 'Antennes', '<p>Un lien 4×2 peut transporter combien de flux au maximum ?</p>', 2, '', { abs: 0.1 }, '<p>min(N<sub>t</sub>, N<sub>r</sub>) = 2.</p>'),
    K.pick('e7', 'Tranche de réseau', 'Architecture', '<p>Une tranche de réseau est :</p>', 'un réseau logique isolé sur une infrastructure commune', ['une bande de fréquences unique', 'une antenne spéciale', 'un type de modulation'], '<p>Le découpage permet de fournir des réseaux adaptés à des usages différents.</p>'),
    K.pick('e8', 'Hautes fréquences', 'Architecture', '<p>Pourquoi utiliser des espacements plus grands aux fréquences millimétriques ?</p>', 'Pour mieux résister au bruit de phase et réduire les symboles', ['Pour diminuer la bande', 'Pour porter plus loin', 'Pour supprimer le préfixe cyclique'], '<p>Un espacement plus grand tolère mieux le bruit de phase et le Doppler aux hautes fréquences.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('5g', list) };
});
