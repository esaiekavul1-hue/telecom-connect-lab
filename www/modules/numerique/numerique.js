/*
 * TELECOM CONNECT LAB 2.0 — Transmission numérique et codage.
 * Modèle : canal gaussien (AWGN), modulations cohérentes, codage de Gray pour QAM.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S, qf = K.qf;

  function ber(mod, ebn0dB) {
    var e = K.fromDb(ebn0dB);
    if (mod === 'bpsk' || mod === 'qpsk') return qf(Math.sqrt(2 * e));
    var M = mod === 'qam16' ? 16 : 64, k = Math.log2(M);
    return (4 / k) * (1 - 1 / Math.sqrt(M)) * qf(Math.sqrt(3 * k / (M - 1) * e));
  }
  function bitsPerSymbol(mod) { return { bpsk: 1, qpsk: 2, qam16: 4, qam64: 6 }[mod]; }
  function shannon(B, snrDb) { return B * Math.log2(1 + K.fromDb(snrDb)); }
  /** Monte-Carlo : 16-QAM de Gray sur canal gaussien, sert à contrôler l'approximation. */
  function simulateQam16(ebn0dB, bits, seed) {
    var r = K.rng(seed || 7), g = K.gaussian(r), n0 = 1 / (4 * K.fromDb(ebn0dB)), sigma = Math.sqrt(n0 / 2) * Math.sqrt(10), errs = 0, total = 0;
    function dem(y) { var b = y < 0 ? 0 : 1, c = Math.abs(y) < 2 ? 1 : 0; return [b, c]; }
    var LV = { '00': -3, '01': -1, '11': 1, '10': 3 };
    for (var i = 0; i < bits; i += 4) {
      var d = [r() < 0.5 ? 0 : 1, r() < 0.5 ? 0 : 1, r() < 0.5 ? 0 : 1, r() < 0.5 ? 0 : 1];
      var I = LV[d[0] + '' + d[1]] + sigma * g(), Q = LV[d[2] + '' + d[3]] + sigma * g(), a = dem(I), b = dem(Q);
      [a[0], a[1], b[0], b[1]].forEach(function (x, k) { if (x !== d[k]) errs++; total++; });
    }
    return errs / total;
  }
  /* Hamming(7,4) : positions 1..7 = p1 p2 d1 p3 d2 d3 d4 */
  function hammingEncode(d) { var p1 = d[0] ^ d[1] ^ d[3], p2 = d[0] ^ d[2] ^ d[3], p3 = d[1] ^ d[2] ^ d[3]; return [p1, p2, d[0], p3, d[1], d[2], d[3]]; }
  function syndrome(c) { var s1 = c[0] ^ c[2] ^ c[4] ^ c[6], s2 = c[1] ^ c[2] ^ c[5] ^ c[6], s3 = c[3] ^ c[4] ^ c[5] ^ c[6]; return s1 + 2 * s2 + 4 * s3; }
  function hammingDecode(c) { var fix = c.slice(), s = syndrome(c); if (s) fix[s - 1] ^= 1; return { s: s, data: [fix[2], fix[4], fix[5], fix[6]], fixed: fix }; }
  /** CRC : reste de la division polynomiale modulo 2. */
  function crc(bits, gen) { var r = bits.concat(new Array(gen.length - 1).fill(0)); for (var i = 0; i < bits.length; i++) { if (r[i]) for (var j = 0; j < gen.length; j++) r[i + j] ^= gen[j]; } return r.slice(bits.length); }
  var math = { ber: ber, bitsPerSymbol: bitsPerSymbol, shannon: shannon, simulateQam16: simulateQam16, hammingEncode: hammingEncode, syndrome: syndrome, hammingDecode: hammingDecode, crc: crc };

  var lesson = K.lesson({ id: 'numerique', title: 'Transmission numérique et codage',
    intro: 'Pour transmettre des bits de façon fiable, il faut choisir comment les représenter, combien en placer par symbole, et comment détecter ou corriger ceux qui arrivent faux.',
    objectives: ['Décrire les codes en ligne NRZ et Manchester.', 'Relier modulation, efficacité spectrale et taux d’erreur.', 'Appliquer la limite de Shannon.', 'Encoder et corriger un mot Hamming(7,4), et calculer un CRC simple.'],
    prerequisites: 'Modulation et chaîne de transmission.',
    sources: ['Pages « Bit error rate », « Phase-shift keying », « Shannon-Hartley theorem », « Hamming(7,4) », « Cyclic redundancy check », « Line code ».', 'Approximation 16-QAM contrôlée par simulation de Monte-Carlo.'],
    figures: {
      ber: { caption: 'Taux d’erreur binaire théorique sur canal gaussien : plus il y a de bits par symbole, plus il faut d’énergie par bit.', options: function () { var C = ['bpsk', 'qam16', 'qam64']; return { kind: 'xy', title: 'Taux d’erreur', desc: 'Taux d’erreur en fonction du rapport Eb sur N0.', x: { min: 0, max: 20, label: 'Eb/N₀ (dB)' }, y: { min: 1e-6, max: 1, log: true, label: 'BER' }, series: C.map(function (m, i) { return { samples: 200, cls: i === 1 ? 'scope__trace--alt' : undefined, fn: function (e) { var b = ber(m, e); return b > 1e-7 ? b : NaN; } }; }) }; } },
      ligne: { caption: 'Le bit 1 suivi d’un 0 : NRZ est un niveau constant, Manchester présente une transition au milieu de chaque bit.', options: function () { var bits = [1, 0, 1, 1, 0, 0]; function nrz(t) { return bits[Math.floor(t) % 6] ? 1 : -1; } function man(t) { var b = bits[Math.floor(t) % 6], f = t - Math.floor(t); return (b ? (f < 0.5 ? -1 : 1) : (f < 0.5 ? 1 : -1)); } return { kind: 'xy', title: 'Codes en ligne', desc: 'Formes des codes NRZ et Manchester pour six bits.', x: { min: 0, max: 6, ticks: [0, 1, 2, 3, 4, 5, 6], label: 'bit' }, y: { min: -2, max: 5, ticks: [], label: '' }, series: [{ samples: 600, fn: function (t) { return 3 + nrz(t); } }, { samples: 600, cls: 'scope__trace--alt', fn: function (t) { return man(t); } }] }; } } },
    chapters: [
      { title: 'Codage en ligne', summary: 'NRZ, Manchester, synchronisation.', html: [
        '<p class="lead">Le codage en ligne transforme des bits en niveaux électriques adaptés au support.</p>',
        K.defs([['NRZ', 'Un niveau par valeur de bit.'], ['Manchester', 'Une transition au milieu de chaque bit : l’horloge peut être récupérée.'], ['Composante continue', 'Valeur moyenne du signal ; certains supports ne la laissent pas passer.']]),
        '<div data-fig="ligne"></div>',
        K.formula('Bande Manchester ≈ 2 × bande NRZ', 'À débit égal, deux fois plus de transitions possibles.'),
        K.example('choix du code', '<p>Une longue suite de zéros en NRZ supprime toute transition : le récepteur perd l’horloge. Manchester évite ce problème, au prix d’une largeur de bande doublée.</p>')] },
      { title: 'Modulations et efficacité', summary: 'Bits par symbole, taux d’erreur, Shannon.', html: [
        '<p class="lead">Mettre plus de bits par symbole augmente le débit, mais rapproche les points de la constellation.</p>',
        '<div data-fig="ber"></div>',
        K.formula('BER<sub>BPSK/QPSK</sub> = Q(√(2 E<sub>b</sub>/N₀))', 'Canal gaussien, démodulation cohérente. E<sub>b</sub>/N₀ en valeur linéaire.'),
        K.formula('BER<sub>M-QAM</sub> ≈ (4/log₂M)(1 − 1/√M) Q(√(3 log₂M/(M−1) · E<sub>b</sub>/N₀))', 'Codage de Gray, M carré, bonne approximation pour de faibles taux d’erreur.'),
        K.formula(v('C') + ' = ' + v('B') + ' log₂(1 + S/N)', 'Capacité d’un canal gaussien en bit/s. S/N en valeur linéaire. C’est une limite, jamais dépassée sans erreur.'),
        K.example('limite de Shannon', '<p>Canal de 20 MHz avec 20 dB de SNR : C = 20·10⁶ × log₂(101) = ' + si(shannon(20e6, 20), 'bit/s') + '.</p>'),
        K.apply('<p>Les réseaux modernes adaptent la modulation à la qualité du canal : QPSK au bord de cellule, 64-QAM ou plus près de la station de base.</p>')] },
      { title: 'Détection et correction d’erreurs', summary: 'CRC, Hamming, redondance.', html: [
        '<p class="lead">Ajouter des bits calculés permet de détecter et parfois de corriger les erreurs du canal.</p>',
        K.defs([['Rendement', 'Bits utiles divisés par bits transmis.'], ['Distance minimale', 'Plus petit nombre de bits différents entre deux mots de code.'], ['CRC', 'Reste d’une division polynomiale, utilisé pour détecter des erreurs.']]),
        K.formula('rendement Hamming(7,4) = 4/7, distance minimale 3', 'Corrige une erreur par mot, ou détecte deux erreurs.'),
        K.example('un mot de Hamming', '<p>Données 1011 : d₁ = 1, d₂ = 0, d₃ = 1, d₄ = 1. p₁ = d₁⊕d₂⊕d₄ = ' + hammingEncode([1, 0, 1, 1])[0] + ', p₂ = d₁⊕d₃⊕d₄ = ' + hammingEncode([1, 0, 1, 1])[1] + ', p₃ = d₂⊕d₃⊕d₄ = ' + hammingEncode([1, 0, 1, 1])[3] + '. Le mot transmis est ' + hammingEncode([1, 0, 1, 1]).join('') + '.</p>'),
        K.example('calcul d’un CRC', '<p>Message 1101, polynôme 1011 : le reste de 1101000 divisé par 1011 est ' + crc([1, 1, 0, 1], [1, 0, 1, 1]).join('') + '.</p>'),
        K.pitfalls(['<strong>Croire qu’un CRC corrige une erreur.</strong> Il ne fait que la détecter.', '<strong>Oublier qu’un CRC n’est pas une protection contre la falsification.</strong>', '<strong>Comparer des modulations à SNR égal</strong> au lieu de E<sub>b</sub>/N₀ égal.', '<strong>Confondre capacité de Shannon et débit réel.</strong>']),
        K.summary(['Manchester facilite la synchronisation.', 'Plus de bits par symbole exige plus de SNR.', 'C = B log₂(1 + S/N).', 'Hamming(7,4) corrige une erreur par mot.']),
        K.toLab('numerique', 'Comparez les modulations, puis corrigez une erreur introduite sur un mot de Hamming.')] }
    ] });

  var D = { mod: 'qpsk', eb: 6, B: 20, data: [1, 0, 1, 1], flip: 0, flip2: 0 };
  function M(s) {
    var b = bitsPerSymbol(s.mod), snr = s.eb + K.toDb(b), code = hammingEncode(s.data), rx = code.slice();
    if (s.flip) rx[s.flip - 1] ^= 1; if (s.flip2) rx[s.flip2 - 1] ^= 1;
    var dec = hammingDecode(rx), ok = dec.data.join('') === s.data.join('');
    return { b: b, snr: snr, ber: ber(s.mod, s.eb), cap: shannon(s.B * 1e6, snr), rate: s.B * 1e6 * b, code: code, rx: rx, dec: dec, ok: ok, errs: (s.flip ? 1 : 0) + (s.flip2 && s.flip2 !== s.flip ? 1 : 0) };
  }
  function bit(act, arg, val, label) { return '<button type="button" class="sim-btn' + (val ? ' is-on' : '') + '" data-act="' + act + '" data-arg="' + arg + '" aria-pressed="' + (val ? 'true' : 'false') + '" aria-label="' + S.esc(label) + '">' + val + '</button>'; }
  var lab = { id: 'numerique', title: 'Taux d’erreur et code de Hamming', short: 'Transmission numérique', icon: 'chain', badge: 'Canal gaussien idéal, formules théoriques',
    text: 'Comparez les modulations sur un canal bruité, puis introduisez des erreurs dans un mot de Hamming pour voir ce que le code corrige.',
    summary: 'Comparez BPSK, QPSK et QAM, calculez la limite de Shannon, encodez et corrigez un mot de Hamming(7,4).',
    params: [{ group: 'Canal' }, { k: 'mod', label: 'Modulation', opts: [['bpsk', 'BPSK'], ['qpsk', 'QPSK'], ['qam16', '16-QAM'], ['qam64', '64-QAM']] }, { k: 'eb', label: 'E<sub>b</sub>/N₀', min: 0, max: 24, step: 0.5, unit: 'dB', dec: 1 }, { k: 'B', label: 'Bande', min: 0.1, max: 400, log: true, unit: 'MHz', dec: 1 }],
    defaults: D, model: M,
    actions: { d: function (s, i) { s.data[+i] ^= 1; s.flip = 0; s.flip2 = 0; }, f: function (s, i) { var n = +i; if (s.flip === n) { s.flip = s.flip2; s.flip2 = 0; } else if (s.flip2 === n) s.flip2 = 0; else if (!s.flip) s.flip = n; else s.flip2 = n; } },
    widget: function (s, m) {
      var names = ['p₁', 'p₂', 'd₁', 'p₃', 'd₂', 'd₃', 'd₄'];
      return '<h3>Code de Hamming(7,4)</h3><div class="sim-row">Données : ' + s.data.map(function (d, i) { return bit('d', i, d, 'Bit de donnée ' + (i + 1)); }).join('') + '</div><p class="muted">Mot transmis, puis cliquez sur un bit pour simuler une erreur (deux au maximum) :</p>' +
        '<div class="sim-cells">' + m.rx.map(function (b, i) { var flipped = s.flip === i + 1 || s.flip2 === i + 1; return '<button type="button" class="sim-btn' + (flipped ? ' is-on' : '') + '" data-act="f" data-arg="' + (i + 1) + '" aria-label="Bit reçu ' + names[i] + '">' + names[i] + ' = ' + b + '</button>'; }).join('') + '</div>' +
        '<p>Syndrome : <strong>' + m.dec.s + '</strong>' + (m.dec.s ? ' (bit ' + m.dec.s + ' à corriger)' : ' (aucune erreur détectée)') + ' · Données décodées : <strong>' + m.dec.data.join('') + '</strong> ' + (m.ok ? '(correct)' : '(<strong>erroné</strong>)') + '</p>';
    },
    expr: function (s, m) { return 'BER = ' + (m.ber < 1e-9 ? 'moins de 10⁻⁹' : fN(m.ber, 3)); },
    readouts: [['Bits par symbole', function (s, m) { return String(m.b); }], ['SNR équivalent', function (s, m) { return fN(m.snr) + ' dB'; }], ['BER théorique', function (s, m) { return m.ber < 1e-9 ? '< 10⁻⁹' : fN(m.ber, 3); }], ['Débit brut (1 symbole/Hz)', function (s, m) { return si(m.rate, 'bit/s'); }], ['Capacité de Shannon', function (s, m) { return si(m.cap, 'bit/s'); }]],
    plots: [{ options: function (s, m) { var cur = s.mod; return { title: 'Taux d’erreur', desc: 'Courbe de la modulation choisie, avec le point de fonctionnement.', x: { min: 0, max: 24, label: 'Eb/N₀ (dB)' }, y: { min: 1e-8, max: 1, log: true, label: 'BER' }, series: [{ samples: 240, fn: function (e) { var b = ber(cur, e); return b > 1e-9 ? b : NaN; } }], points: [{ x: s.eb, y: Math.max(m.ber, 1e-8), label: 'réglage' }] }; } }],
    explain: function (s, m) { return '<p>Avec ' + m.b + ' bit(s) par symbole et E<sub>b</sub>/N₀ = ' + fN(s.eb) + ' dB, le taux d’erreur vaut ' + (m.ber < 1e-9 ? 'moins de 10⁻⁹' : fN(m.ber, 3)) + '. Le SNR de ' + fN(m.snr) + ' dB autorise au mieux ' + si(m.cap, 'bit/s') + ' dans ' + si(s.B * 1e6, 'Hz') + '.</p>'; },
    missions: [
      { id: 'm1', title: 'Viser une liaison fiable', text: 'En 16-QAM, obtenez un taux d’erreur inférieur à 10⁻⁵.', solution: { mod: 'qam16', eb: 14 }, check: function (s, m) { if (s.mod !== 'qam16') return { ok: false, msg: 'Choisissez la 16-QAM.' }; return m.ber < 1e-5 ? { ok: true, msg: 'Réussi : BER de ' + fN(m.ber, 3) + '.' } : { ok: false, msg: 'BER : ' + fN(m.ber, 3) + '. Augmentez E_b/N₀.' }; } },
      { id: 'm2', title: 'Corriger une erreur', text: 'Changez les données, puis introduisez une erreur : le code doit retrouver les données.', solution: { data: [0, 1, 1, 0], flip: 3, flip2: 0 }, check: function (s, m) { if (s.data.join('') === D.data.join('')) return { ok: false, msg: 'Modifiez d’abord les données.' }; return m.errs === 1 && m.ok ? { ok: true, msg: 'Réussi : syndrome ' + m.dec.s + ', le bit fautif est corrigé.' } : { ok: false, msg: m.errs + ' erreur(s) introduite(s). Il en faut exactement une.' }; } },
      { id: 'm3', title: 'Dépasser le pouvoir de correction', text: 'Introduisez deux erreurs et observez un décodage erroné.', solution: { flip: 1, flip2: 3 }, check: function (s, m) { return m.errs === 2 && !m.ok ? { ok: true, msg: 'Réussi : deux erreurs dépassent la capacité de correction du code.' } : { ok: false, msg: m.errs + ' erreur(s) ; il en faut deux, conduisant à un résultat faux.' }; } }],
    limits: '<p>Le canal est gaussien et sans interférence. Les courbes supposent une synchronisation parfaite. Les canaux réels (évanouissements, trajets multiples) demandent davantage de marge. Le débit brut n’inclut ni codage ni préfixe.</p>' };

  var list = [
    K.num('e1', 'Capacité d’un canal', 'Shannon', '<p>Canal de 1 MHz avec un SNR de 15 (valeur linéaire). Calculez la capacité, en Mbit/s.</p>', 4, 'Mbit/s', { rel: 0.02 }, '<p>C = 10⁶ × log₂(16) = 4 Mbit/s.</p>'),
    K.num('e2', 'Bits par symbole', 'Modulations', '<p>Combien de bits transporte un symbole 256-QAM ?</p>', 8, 'bits', { abs: 0.1 }, '<p>log₂(256) = 8 bits.</p>'),
    K.num('e3', 'Débit symbole', 'Modulations', '<p>Débit de 12 Mbit/s en 16-QAM. Calculez la rapidité de modulation, en Mbaud.</p>', 3, 'Mbaud', { rel: 0.02 }, '<p>12/4 = 3 Mbaud.</p>'),
    K.num('e4', 'Rendement', 'Codage', '<p>Calculez le rendement du code Hamming(7,4), en %.</p>', 400 / 7, '%', { rel: 0.02 }, '<p>4/7 = ' + fN(400 / 7, 4) + ' %.</p>'),
    K.text('e5', 'Encoder Hamming', 'Codage', '<p>Encodez les données 1 0 1 1 avec p₁ = d₁⊕d₂⊕d₄, p₂ = d₁⊕d₃⊕d₄, p₃ = d₂⊕d₃⊕d₄, dans l’ordre p₁ p₂ d₁ p₃ d₂ d₃ d₄. Réponse : 7 bits sans espace.</p>', hammingEncode([1, 0, 1, 1]).join(''), function (t) { return t.replace(/\s/g, '') === hammingEncode([1, 0, 1, 1]).join(''); }, '<p>Le mot est ' + hammingEncode([1, 0, 1, 1]).join('') + '.</p>'),
    K.text('e6', 'Calcul d’un CRC', 'Codage', '<p>Message 1101, générateur 1011. Calculez le reste sur 3 bits.</p>', crc([1, 1, 0, 1], [1, 0, 1, 1]).join(''), function (t) { return t.replace(/\s/g, '') === crc([1, 1, 0, 1], [1, 0, 1, 1]).join(''); }, '<p>Division modulo 2 : le reste vaut ' + crc([1, 1, 0, 1], [1, 0, 1, 1]).join('') + '.</p>'),
    K.pick('e7', 'BPSK et QPSK', 'Modulations', '<p>À E<sub>b</sub>/N₀ égal, comparez le BER de QPSK et BPSK :</p>', 'Ils sont identiques', ['QPSK est bien pire', 'BPSK est bien pire', 'QPSK n’a pas d’erreurs'], '<p>QPSK porte deux canaux BPSK indépendants en quadrature.</p>'),
    K.pick('e8', 'Rôle du CRC', 'Codage', '<p>Un CRC permet de :</p>', 'détecter des erreurs de transmission', ['corriger toutes les erreurs', 'chiffrer un message', 'augmenter le débit'], '<p>C’est un code de détection : la correction exige un autre mécanisme.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('numerique', list) };
});
