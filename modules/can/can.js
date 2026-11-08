/*
 * TELECOM CONNECT LAB 2.0 — Conversion analogique-numérique et numérique-analogique.
 * Modèle : échantillonneur idéal et quantificateur uniforme par arrondi.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S, TAU = 2 * Math.PI;

  function lsb(Vref, N) { return Vref / Math.pow(2, N); }
  function code(V, Vref, N) { var max = Math.pow(2, N) - 1; return K.clamp(Math.floor(V / lsb(Vref, N)), 0, max); }
  function sqnr(N) { return 6.02 * N + 1.76; }
  /** Fréquence apparente après échantillonnage. */
  function alias(f, fs) { var k = Math.round(f / fs); return Math.abs(f - k * fs); }
  function r2r(bits, Vref) { var c = 0; bits.forEach(function (b, i) { c += b << i; }); return Vref * c / Math.pow(2, bits.length); }
  /** SNR mesuré d'une sinusoïde pleine échelle quantifiée. */
  function measuredSnr(N, samples) {
    var q = 2 / Math.pow(2, N), ps = 0, pn = 0, c = samples || 200000;
    for (var i = 0; i < c; i++) { var x = (1 - q / 2) * Math.sin(TAU * i * 0.6180339887), y = Math.floor(x / q) * q + q / 2; ps += x * x; pn += (x - y) * (x - y); }
    return 10 * K.log10(ps / pn);
  }
  var math = { lsb: lsb, code: code, sqnr: sqnr, alias: alias, r2r: r2r, measuredSnr: measuredSnr };

  var lesson = K.lesson({ id: 'can', title: 'Conversion analogique-numérique',
    intro: 'Pour être traité par un processeur, un signal doit devenir une suite de nombres. Échantillonner et quantifier permet cette conversion, avec des limites précises.',
    objectives: ['Appliquer le théorème d’échantillonnage et prévoir un repliement.', 'Calculer un pas de quantification et un code numérique.', 'Estimer le rapport signal sur bruit de quantification.', 'Expliquer le principe d’un convertisseur R-2R.'],
    prerequisites: 'Signaux sinusoïdaux et représentation binaire.',
    sources: ['Pages « Nyquist-Shannon sampling theorem » et « Quantization ».', 'Formule SNR contrôlée par simulation (tests/content-references.js).'],
    figures: {
      ech: { caption: 'Une sinusoïde de 900 Hz échantillonnée à 1 kHz semble valoir 100 Hz : c’est le repliement de spectre.', options: function () { var f = 900, fs = 1000, pts = []; for (var i = 0; i <= 20; i++) pts.push({ x: i, y: Math.cos(TAU * f * i / fs) }); return { kind: 'xy', title: 'Repliement', desc: 'Les échantillons d’un signal rapide coïncident avec ceux d’un signal lent.', x: { min: 0, max: 20, label: 'temps (ms)' }, y: { min: -1.3, max: 1.3, label: 'amplitude' }, series: [{ samples: 800, cls: 'scope__trace--ref', fn: function (t) { return Math.cos(TAU * f * t / 1000); } }, { samples: 400, fn: function (t) { return Math.cos(TAU * 100 * t / 1000); } }], dots: pts }; } },
      r2r: { caption: 'Convertisseur numérique-analogique en échelle R-2R : chaque bit pondère la sortie par une puissance de deux.', svg: function () { return S.blocks({ w: 520, h: 150, label: 'Échelle de résistances R et 2R reliée à un amplificateur.', boxes: [{ id: 'b3', x: 20, y: 25, w: 70, h: 36, t: 'Bit 3' }, { id: 'b2', x: 110, y: 25, w: 70, h: 36, t: 'Bit 2' }, { id: 'b1', x: 200, y: 25, w: 70, h: 36, t: 'Bit 1' }, { id: 'b0', x: 290, y: 25, w: 70, h: 36, t: 'Bit 0' }, { id: 'l', x: 20, y: 95, w: 340, h: 36, t: 'Échelle R-2R' }, { id: 'o', x: 410, y: 95, w: 90, h: 36, t: 'Sortie' }], links: [{ a: 'b3', b: 'l', from: 'b', to: 't', dx: -135 }, { a: 'l', b: 'o' }] }); } } },
    chapters: [
      { title: 'L’échantillonnage', summary: 'Théorème de Shannon, repliement de spectre.', html: [
        '<p class="lead">Échantillonner, c’est relever la valeur d’un signal à intervalles réguliers. Si la cadence est suffisante, aucune information n’est perdue.</p>',
        K.formula(v('f') + '<sub>e</sub> > 2 ' + v('B'), 'B : plus haute fréquence du signal, en hertz. 2B est appelée fréquence de Nyquist du signal.'),
        K.defs([['Repliement', 'Une composante au-delà de f<sub>e</sub>/2 apparaît à tort à une fréquence plus basse.'], ['Filtre anti-repliement', 'Passe-bas placé avant l’échantillonneur.']]),
        '<div data-fig="ech"></div>',
        K.example('téléphone numérique', '<p>La voix téléphonique est limitée à 3,4 kHz et échantillonnée à 8 kHz : 8 kHz est bien supérieur à 2 × 3,4 kHz. Avec 8 bits par échantillon, le débit est 8 000 × 8 = 64 kbit/s.</p>')] },
      { title: 'La quantification', summary: 'Pas de quantification, codes et rapport signal/bruit.', html: [
        '<p class="lead">Chaque échantillon est remplacé par la valeur la plus proche d’une grille finie, d’où une petite erreur inévitable.</p>',
        K.formula('q = V<sub>ref</sub> / 2<sup>N</sup>, code = ⌊V / q⌋', 'Convertisseur N bits, entrée 0 à V<sub>ref</sub>.'),
        K.formula('SNR ≈ 6,02 N + 1,76 dB', 'Sinusoïde pleine échelle, bruit de quantification q²/12, bande de Nyquist complète.'),
        K.defs([['Pas de quantification (LSB)', 'Plus petit écart de tension mesurable.'], ['Saturation', 'Un signal hors de la plage du convertisseur est écrêté.']]),
        K.example('ADC d’un microcontrôleur', '<p>Le CAN 10 bits d’un ATmega328P sous 5 V a un pas de 5/1024 = ' + si(lsb(5, 10), 'V') + '. Une entrée de 2,5 V donne le code ' + code(2.5, 5, 10) + '. Le CAN 12 bits d’un ESP32 sous 3,3 V a un pas théorique de ' + si(lsb(3.3, 12), 'V') + ' ; sa précision réelle est moindre.</p>'),
        K.apply('<p>Le nombre de bits nominal n’est pas la précision effective : bruit, erreurs de linéarité et référence de tension réduisent le nombre de bits effectifs (ENOB).</p>')] },
      { title: 'La conversion numérique-analogique', summary: 'CNA R-2R, restitution du signal.', html: [
        '<p class="lead">La conversion inverse fabrique une tension à partir d’un nombre.</p>',
        '<div data-fig="r2r"></div>',
        K.formula(v('V') + '<sub>s</sub> = V<sub>ref</sub> · C / 2<sup>N</sup>', 'C : code entier, N bits. CNA idéal unipolaire.'),
        K.example('sortie d’un CNA', '<p>CNA 8 bits, V<sub>ref</sub> = 2,56 V, code 200 : V<sub>s</sub> = 2,56 × 200/256 = ' + fN(2.56 * 200 / 256) + ' V.</p>'),
        '<p>Une échelle R-2R n’utilise que deux valeurs de résistance, ce qui la rend facile à fabriquer. Un filtre passe-bas lisse ensuite les marches de la sortie.</p>',
        K.pitfalls(['<strong>Échantillonner à exactement 2B</strong> : la marge est nulle, le filtre réel exige un écart.', '<strong>Oublier le filtre anti-repliement.</strong>', '<strong>Confondre résolution et précision.</strong>', '<strong>Dépasser la tension de référence</strong> : la mesure sature et la broche peut être endommagée.']),
        K.summary(['f<sub>e</sub> > 2B.', 'Une fréquence f apparaît à |f − k·f<sub>e</sub>|.', 'q = V<sub>ref</sub>/2<sup>N</sup>.', 'SNR ≈ 6,02N + 1,76 dB.']),
        K.toLab('can', 'Modifiez la fréquence d’échantillonnage et le nombre de bits, puis observez le repliement et l’erreur.')] }
    ] });

  var D = { f: 50, fs: 1000, N: 4, Vref: 5, A: 2, off: 2.5 };
  function sampleAt(s, t) { return s.off + s.A * Math.sin(TAU * s.f * t); }
  function M(s) {
    var q = lsb(s.Vref, s.N), a = alias(s.f, s.fs), pts = [], cnt = 0, sum = 0, n = Math.min(200, Math.ceil(3 * s.fs / s.f)), T = n / s.fs, clip = false;
    for (var i = 0; i < n; i++) { var t = i / s.fs, x = sampleAt(s, t), c = code(x, s.Vref, s.N), y = (c + 0.5) * q; if (x < 0 || x >= s.Vref) clip = true; else { sum += (x - y) * (x - y); cnt++; } pts.push({ x: t * 1000, y: y }); }
    return { q: q, a: a, pts: pts, T: T, ok: s.fs > 2 * s.f, rmsErr: cnt ? Math.sqrt(sum / cnt) : 0, clip: clip, snr: sqnr(s.N), code0: code(s.off, s.Vref, s.N), bitrate: s.fs * s.N };
  }
  var lab = { id: 'can', title: 'Échantillonnage et quantification', short: 'Conversion A/N', icon: 'chart', badge: 'Échantillonneur idéal, quantificateur uniforme',
    text: 'Changez la fréquence d’échantillonnage et le nombre de bits : voyez l’erreur de quantification et le repliement apparaître.',
    summary: 'Échantillonnez un signal, faites varier les bits, observez le repliement, l’écrêtage et l’erreur de quantification.',
    params: [{ group: 'Signal' }, { k: 'f', label: 'Fréquence', min: 1, max: 5000, log: true, unit: 'Hz', dec: 1 }, { k: 'A', label: 'Amplitude', min: 0.1, max: 4, step: 0.1, unit: 'V', dec: 2 }, { k: 'off', label: 'Composante continue', min: 0, max: 5, step: 0.1, unit: 'V', dec: 2 }, { group: 'Convertisseur' }, { k: 'fs', label: 'Fréquence d’échantillonnage', min: 10, max: 50000, log: true, unit: 'Hz', dec: 0 }, { k: 'N', label: 'Résolution', min: 1, max: 16, step: 1, unit: 'bits', dec: 0 }, { k: 'Vref', label: 'Référence', opts: [[3.3, '3,3 V'], [5, '5 V']] }],
    defaults: D, model: M,
    expr: function (s, m) { return 'q = ' + si(m.q, 'V') + ' ; f apparente = ' + si(m.a, 'Hz'); },
    verdict: function (s, m) { if (m.clip) return { ok: false, text: 'Signal hors de la plage' }; return m.ok ? { ok: true, text: 'Condition de Shannon respectée' } : { ok: false, text: 'Repliement de spectre' }; },
    readouts: [['Pas de quantification', function (s, m) { return si(m.q, 'V'); }], ['Niveaux', function (s) { return fN(Math.pow(2, s.N), 6); }], ['Erreur efficace', function (s, m) { return si(m.rmsErr, 'V'); }], ['Fréquence apparente', function (s, m) { return si(m.a, 'Hz'); }], ['SNR théorique', function (s, m) { return fN(m.snr) + ' dB'; }], ['Débit binaire', function (s, m) { return si(m.bitrate, 'bit/s'); }]],
    plots: [{ expr: function (s, m) { return 'Signal d’origine et échantillons quantifiés'; }, options: function (s, m) { return { title: 'Signal échantillonné', desc: 'Signal analogique et ses échantillons numérisés.', x: { min: 0, max: m.T * 1000, label: 'temps (ms)' }, y: { min: Math.min(-0.2, s.off - s.A), max: Math.max(s.Vref + 0.2, s.off + s.A), label: 'tension (V)' }, series: [{ samples: 500, cls: 'scope__trace--ref', fn: function (t) { return sampleAt(s, t / 1000); } }], dots: m.pts, hlines: [{ y: s.Vref, label: 'Vref' }] }; } }],
    explain: function (s, m) { return '<p>' + (m.ok ? 'La fréquence d’échantillonnage dépasse deux fois celle du signal.' : 'Il faudrait f<sub>e</sub> > ' + si(2 * s.f, 'Hz') + ' : le signal apparaît à ' + si(m.a, 'Hz') + '.') + ' Chaque échantillon est arrondi à un pas de ' + si(m.q, 'V') + ', ce qui donne une erreur efficace mesurée de ' + si(m.rmsErr, 'V') + ' (théorie : q/√12 = ' + si(m.q / Math.sqrt(12), 'V') + ').</p>'; },
    missions: [
      { id: 'm1', title: 'Provoquer un repliement', text: 'Choisissez f et f_e pour que le signal apparaisse à une fréquence au moins dix fois plus basse que sa vraie valeur.', solution: { f: 990, fs: 1000 }, check: function (s, m) { return m.a > 0 && m.a <= s.f / 10 && !m.ok ? { ok: true, msg: 'Réussi : ' + si(s.f, 'Hz') + ' apparaît à ' + si(m.a, 'Hz') + '.' } : { ok: false, msg: 'Fréquence apparente : ' + si(m.a, 'Hz') + '. Rapprochez f de f_e.' }; } },
      { id: 'm2', title: 'Réduire l’erreur', text: 'Obtenez une erreur efficace inférieure à 10 mV sans écrêtage.', solution: { N: 10 }, check: function (s, m) { if (m.clip) return { ok: false, msg: 'Le signal dépasse la plage de 0 à Vref.' }; return m.rmsErr < 0.01 && s.N >= 6 ? { ok: true, msg: 'Réussi : ' + si(m.rmsErr, 'V') + ' avec ' + s.N + ' bits.' } : { ok: false, msg: 'Erreur : ' + si(m.rmsErr, 'V') + '. Augmentez le nombre de bits.' }; } },
      { id: 'm3', title: 'Détecter un écrêtage', text: 'Modifiez l’amplitude ou la composante continue pour que le signal sorte de la plage.', solution: { off: 4.8 }, check: function (s, m) { return m.clip ? { ok: true, msg: 'Réussi : hors de la plage 0 à ' + fN(s.Vref) + ' V, le convertisseur écrête.' } : { ok: false, msg: 'Le signal reste dans la plage.' }; } }],
    limits: '<p>Convertisseur idéal, sans bruit, erreur de linéarité, gigue d’horloge ni temps d’acquisition. Le SNR théorique suppose une sinusoïde pleine échelle. Un convertisseur réel atteint moins de bits effectifs que sa résolution nominale.</p>' };

  var list = [
    K.num('e1', 'Fréquence d’échantillonnage minimale', 'Échantillonnage', '<p>Un signal occupe jusqu’à 20 kHz. Calculez la fréquence minimale théorique d’échantillonnage, en kHz.</p>', 40, 'kHz', { rel: 0.01 }, '<p>f<sub>e</sub> > 2 × 20 = 40 kHz. En pratique, on prend plus, comme 44,1 kHz en audio.</p>'),
    K.num('e2', 'Fréquence apparente', 'Échantillonnage', '<p>Une sinusoïde de 7 kHz est échantillonnée à 10 kHz. À quelle fréquence apparaît-elle, en kHz ?</p>', 3, 'kHz', { rel: 0.02 }, '<p>|7 − 10| = 3 kHz.</p>'),
    K.num('e3', 'Pas de quantification', 'Quantification', '<p>Un CAN 12 bits a une référence de 3,3 V. Calculez le pas, en mV.</p>', lsb(3.3, 12) * 1000, 'mV', { rel: 0.02 }, '<p>q = 3,3/4096 = ' + fN(lsb(3.3, 12) * 1000, 4) + ' mV.</p>'),
    K.num('e4', 'Code numérique', 'Quantification', '<p>CAN 10 bits, V<sub>ref</sub> = 5 V, entrée 1,25 V. Calculez le code décimal.</p>', code(1.25, 5, 10), '', { abs: 1.1 }, '<p>code = ⌊1,25/(5/1024)⌋ = ' + code(1.25, 5, 10) + '.</p>'),
    K.num('e5', 'SNR de quantification', 'Quantification', '<p>Calculez le SNR théorique d’un CAN 12 bits, en dB.</p>', sqnr(12), 'dB', { rel: 0.01 }, '<p>6,02 × 12 + 1,76 = ' + fN(sqnr(12), 4) + ' dB.</p>'),
    K.num('e6', 'Débit d’un flux audio', 'Échantillonnage', '<p>Audio stéréo : 44,1 kHz, 16 bits, 2 voies. Calculez le débit, en kbit/s.</p>', 1411.2, 'kbit/s', { rel: 0.01 }, '<p>44 100 × 16 × 2 = 1 411,2 kbit/s.</p>'),
    K.num('e7', 'Sortie d’un CNA', 'CNA', '<p>CNA 8 bits, V<sub>ref</sub> = 5 V, code 128. Calculez la sortie, en V.</p>', 2.5, 'V', { rel: 0.01 }, '<p>V = 5 × 128/256 = 2,5 V.</p>'),
    K.pick('e8', 'Filtre anti-repliement', 'Échantillonnage', '<p>Où place-t-on le filtre anti-repliement ?</p>', 'Avant l’échantillonneur', ['Après le processeur', 'Dans la référence de tension', 'Nulle part, car il est inutile'], '<p>Une fois le repliement produit, on ne peut plus distinguer les composantes.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('can', list) };
});
