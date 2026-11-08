/*
 * TELECOM CONNECT LAB 2.0 — Représentation des données.
 * Références : complément à deux, RFC 3629 (UTF-8), NIST (préfixes binaires).
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, v = K.v, S = K.S;
  function toUnsigned(bits) { return bits.reduce(function (t, b) { return t * 2 + b; }, 0); }
  function toSigned(bits) { var u = toUnsigned(bits); return bits[0] ? u - Math.pow(2, bits.length) : u; }
  function toHex(n, w) { var h = n.toString(16).toUpperCase(); while (h.length < (w || 2)) h = '0' + h; return h; }
  function fromInt(n, w) { var out = [], m = ((n % Math.pow(2, w)) + Math.pow(2, w)) % Math.pow(2, w); for (var i = w - 1; i >= 0; i--) out.push(Math.floor(m / Math.pow(2, i)) % 2); return out; }
  function addBits(a, b) { var w = a.length, s = toUnsigned(a) + toUnsigned(b), carry = s >= Math.pow(2, w) ? 1 : 0, r = fromInt(s, w), sa = a[0], sb = b[0], sr = r[0]; return { bits: r, carry: carry, overflow: sa === sb && sr !== sa ? 1 : 0 }; }
  function utf8Len(cp) { return cp <= 0x7F ? 1 : cp <= 0x7FF ? 2 : cp <= 0xFFFF ? 3 : 4; }
  function signedRange(n) { return { min: -Math.pow(2, n - 1), max: Math.pow(2, n - 1) - 1 }; }
  var math = { toUnsigned: toUnsigned, toSigned: toSigned, toHex: toHex, fromInt: fromInt, addBits: addBits, utf8Len: utf8Len, signedRange: signedRange };

  var lesson = K.lesson({ id: 'binaire', title: 'Représentation des données',
    intro: 'Dans un ordinateur, tout est binaire : nombres, textes, images. Comprendre cette représentation évite de nombreuses erreurs d’interprétation.',
    objectives: ['Convertir entre binaire, décimal et hexadécimal.', 'Représenter des entiers signés en complément à deux.', 'Reconnaître un dépassement de capacité.', 'Expliquer l’encodage du texte et les préfixes de taille.'],
    prerequisites: 'Aucun : puissances et divisions simples.',
    sources: ['Page « Two’s complement ».', 'RFC 3629 (UTF-8).', 'NIST, préfixes binaires.', 'Page « Double-precision floating-point format ».'],
    figures: { w: { caption: 'Poids des bits d’un octet, du poids fort au poids faible.', svg: function () { var bx = [128, 64, 32, 16, 8, 4, 2, 1].map(function (p, i) { return { id: 'b' + i, x: 20 + i * 60, y: 45, w: 50, h: 50, t: String(p) }; }); return S.blocks({ w: 520, h: 130, label: 'Huit bits de poids 128 à 1.', boxes: bx, links: [] }); } } },
    chapters: [
      { title: 'Systèmes de numération', summary: 'Binaire, décimal, hexadécimal.', html: [
        '<p class="lead">Un chiffre vaut plus ou moins selon sa position. En binaire, chaque position vaut une puissance de 2.</p>',
        '<div data-fig="w"></div>',
        K.formula('N = ∑ b<sub>i</sub> 2<sup>i</sup>', 'b<sub>i</sub> vaut 0 ou 1. L’octet comprend 8 bits, de 0 à 255.'),
        K.defs([['Bit', 'Plus petite unité d’information : 0 ou 1.'], ['Octet', 'Groupe de 8 bits.'], ['Hexadécimal', 'Base 16 : chaque chiffre représente 4 bits.']]),
        K.example('conversions', '<p>1011 0010 = 128 + 32 + 16 + 2 = ' + toUnsigned([1, 0, 1, 1, 0, 0, 1, 0]) + '. En hexadécimal : 1011 → B, 0010 → 2, donc 0xB2.</p>')] },
      { title: 'Entiers signés et dépassement', summary: 'Complément à deux.', html: [
        '<p class="lead">Pour coder les négatifs, les processeurs utilisent le complément à deux : additionner fonctionne alors comme pour les positifs.</p>',
        K.formula('−N = (N̄) + 1, plage sur n bits : −2<sup>n−1</sup> à 2<sup>n−1</sup> − 1', 'N̄ : inversion de tous les bits.'),
        K.example('coder −5 sur 8 bits', '<p>5 = 0000 0101. Inversé : 1111 1010. Plus 1 : ' + fromInt(-5, 8).join('') + '.</p>'),
        K.defs([['Dépassement (overflow)', 'Résultat hors de la plage signée.'], ['Retenue', 'Bit sortant du poids fort, pertinent pour les non signés.']]),
        K.apply('<p>Un dépassement peut faire passer un compteur de 127 à −128 : c’est une source classique de bogues dans les systèmes embarqués.</p>')] },
      { title: 'Textes, nombres réels et tailles', summary: 'UTF-8, virgule flottante, préfixes.', html: [
        '<p class="lead">Un même ensemble d’octets peut désigner un texte, un nombre ou une image. Seul le format indique comment les lire.</p>',
        K.formula('1 Ko = 1000 octets, 1 Kio = 1024 octets', 'Le préfixe kilo du Système international vaut 1000 ; les préfixes binaires (kibi, mébi) valent 2¹⁰, 2²⁰.'),
        K.table(['Code', 'Octets UTF-8'], [['U+0000 à U+007F', '1'], ['U+0080 à U+07FF', '2'], ['U+0800 à U+FFFF', '3'], ['U+10000 à U+10FFFF', '4']], 'Longueurs définies par la RFC 3629'),
        K.example('un texte en UTF-8', '<p>« é » (U+00E9) occupe ' + utf8Len(0xE9) + ' octets, « A » occupe ' + utf8Len(0x41) + ' octet, et « € » (U+20AC) occupe ' + utf8Len(0x20AC) + ' octets.</p>'),
        K.defs([['Double précision', 'Format de réel sur 64 bits : 1 bit de signe, 11 d’exposant, 52 de mantisse.']]),
        K.pitfalls(['<strong>Confondre bit et octet</strong> : un débit de 100 Mbit/s vaut 12,5 Mo/s.', '<strong>Oublier le dépassement</strong> sur un entier de petite taille.', '<strong>Comparer des réels</strong> par égalité stricte : 0,1 + 0,2 ne vaut pas exactement 0,3 en double précision.']),
        K.summary(['N = ∑ b<sub>i</sub>2<sup>i</sup>.', 'Complément à deux : inverser, ajouter 1.', 'UTF-8 utilise de 1 à 4 octets.', 'Ko = 1000, Kio = 1024.']),
        K.toLab('binaire', 'Basculez les bits d’un octet et additionnez jusqu’au dépassement.')] }
    ] });

  var D = { a: [0, 1, 0, 1, 0, 0, 1, 1], b: [0, 0, 0, 0, 1, 1, 0, 0] };
  function M(s) { var r = addBits(s.a, s.b); return { ua: toUnsigned(s.a), ub: toUnsigned(s.b), sa: toSigned(s.a), sb: toSigned(s.b), r: r, ur: toUnsigned(r.bits), sr: toSigned(r.bits) }; }
  function bit(act, i, v2, label) { return '<button type="button" class="sim-btn' + (v2 ? ' is-on' : '') + '" data-act="' + act + '" data-arg="' + i + '" aria-pressed="' + (v2 ? 'true' : 'false') + '" aria-label="' + S.esc(label) + '">' + v2 + '</button>'; }
  function row(act, bits, name) { return '<div class="sim-row">' + name + ' : ' + bits.map(function (b, i) { return bit(act, i, b, name + ', bit ' + (7 - i)); }).join('') + '</div>'; }
  var lab = { id: 'binaire', title: 'Bits, hexadécimal et complément à deux', short: 'Représentation des données', icon: 'chart', badge: 'Arithmétique entière sur 8 bits',
    text: 'Basculez les bits pour composer des nombres, observez leur interprétation et déclenchez un dépassement.',
    summary: 'Composez des octets, lisez-les en non signé, signé, hexadécimal et caractère, additionnez jusqu’au dépassement.',
    params: [], defaults: D, model: M,
    actions: { a: function (s, i) { s.a[+i] ^= 1; }, b: function (s, i) { s.b[+i] ^= 1; }, neg: function (s) { s.a = fromInt(-toSigned(s.a), 8); }, zero: function (s) { s.a = [0, 0, 0, 0, 0, 0, 0, 0]; s.b = [0, 0, 0, 0, 0, 0, 0, 0]; } },
    widget: function (s, m) { var ch = m.ua >= 32 && m.ua < 127 ? String.fromCharCode(m.ua) : '—'; return row('a', s.a, 'A') + '<p>A : <strong>' + m.ua + '</strong> (non signé), <strong>' + m.sa + '</strong> (signé), 0x<strong>' + toHex(m.ua) + '</strong>, caractère <strong>' + S.esc(ch) + '</strong></p>' + row('b', s.b, 'B') + '<div class="sim-row"><button type="button" class="btn btn--ghost btn--sm" data-act="neg">Opposé de A</button><button type="button" class="btn btn--ghost btn--sm" data-act="zero">Tout à zéro</button></div><p>A + B = <strong>' + m.r.bits.join('') + '</strong> : ' + m.ur + ' (non signé), ' + m.sr + ' (signé), retenue ' + m.r.carry + ', dépassement ' + m.r.overflow + '</p>'; },
    expr: function (s, m) { return 'A = ' + m.ua + ' ; B = ' + m.ub; },
    readouts: [['A + B non signé', function (s, m) { return String(m.ur); }], ['A + B signé', function (s, m) { return String(m.sr); }], ['Retenue', function (s, m) { return String(m.r.carry); }], ['Dépassement signé', function (s, m) { return String(m.r.overflow); }]],
    explain: function (s, m) { return '<p>' + m.sa + ' + ' + m.sb + ' = ' + (m.sa + m.sb) + ' au sens mathématique. ' + (m.r.overflow ? 'Sur 8 bits signés, la plage est −128 à 127 : le résultat dépasse, et s’affiche ' + m.sr + '.' : 'Le résultat tient dans la plage signée.') + '</p>'; },
    missions: [
      { id: 'm1', title: 'Coder une lettre', text: 'Composez A pour obtenir le caractère « T » (code 84).', solution: { a: fromInt(84, 8) }, check: function (s, m) { return m.ua === 84 ? { ok: true, msg: 'Réussi : 01010100 = 84 = 0x54.' } : { ok: false, msg: 'A vaut ' + m.ua + '. Visez 84.' }; } },
      { id: 'm2', title: 'Un négatif', text: 'Composez A pour obtenir −1 en signé.', solution: { a: fromInt(-1, 8) }, check: function (s, m) { return m.sa === -1 ? { ok: true, msg: 'Réussi : 11111111 vaut −1 en complément à deux.' } : { ok: false, msg: 'A signé vaut ' + m.sa + '.' }; } },
      { id: 'm3', title: 'Dépassement signé', text: 'Choisissez A et B positifs dont la somme dépasse 127.', solution: { a: fromInt(100, 8), b: fromInt(100, 8) }, check: function (s, m) { return m.r.overflow && m.sa > 0 && m.sb > 0 ? { ok: true, msg: 'Réussi : ' + m.sa + ' + ' + m.sb + ' donne ' + m.sr + ' sur 8 bits.' } : { ok: false, msg: 'A et B doivent être positifs et leur somme supérieure à 127.' }; } }],
    limits: '<p>Le laboratoire travaille sur 8 bits. La virgule flottante et l’encodage UTF-8 complet sont présentés dans la leçon, sans simulation.</p>' };

  var list = [
    K.num('e1', 'Binaire vers décimal', 'Numération', '<p>Convertissez 1100 1010 en décimal.</p>', 202, '', { abs: 0.1 }, '<p>128 + 64 + 8 + 2 = 202.</p>'),
    K.text('e2', 'Décimal vers hexadécimal', 'Numération', '<p>Convertissez 255 en hexadécimal, sans préfixe.</p>', 'FF', function (t) { return /^ff$/i.test(t.trim()); }, '<p>255 = 16 × 15 + 15, donc FF.</p>'),
    K.text('e3', 'Complément à deux', 'Entiers signés', '<p>Codez −3 sur 8 bits (8 chiffres).</p>', '11111101', function (t) { return t.replace(/\s/g, '') === '11111101'; }, '<p>3 = 00000011 ; inversé : 11111100 ; plus 1 : 11111101.</p>'),
    K.num('e4', 'Plage signée', 'Entiers signés', '<p>Quelle est la valeur maximale d’un entier signé de 16 bits ?</p>', 32767, '', { abs: 0.1 }, '<p>2¹⁵ − 1 = 32 767.</p>'),
    K.num('e5', 'Débit et octets', 'Tailles', '<p>Un lien de 80 Mbit/s transfère combien de Mo par seconde ?</p>', 10, 'Mo/s', { rel: 0.01 }, '<p>80 / 8 = 10 Mo/s.</p>'),
    K.num('e6', 'Préfixes binaires', 'Tailles', '<p>Combien d’octets contient 1 Mio ?</p>', 1048576, 'octets', { abs: 0.5 }, '<p>2²⁰ = 1 048 576 octets.</p>'),
    K.num('e7', 'UTF-8', 'Texte', '<p>Combien d’octets occupe le caractère U+20AC en UTF-8 ?</p>', 3, 'octets', { abs: 0.1 }, '<p>U+0800 à U+FFFF : 3 octets.</p>'),
    K.pick('e8', 'Égalité entre réels', 'Nombres réels', '<p>Pourquoi éviter de tester l’égalité stricte entre deux réels ?</p>', 'Beaucoup de décimaux ne sont pas représentés exactement en binaire', ['Les réels sont toujours entiers', 'Les réels sont chiffrés', 'L’opérateur égal n’existe pas'], '<p>0,1 n’a pas d’écriture binaire finie : on compare avec une tolérance.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('binaire', list) };
});
