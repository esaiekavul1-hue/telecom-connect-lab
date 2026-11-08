/*
 * TELECOM CONNECT LAB 2.0 — Radiofréquence : lignes de transmission, ROS, adaptation.
 * Modèle : ligne sans pertes, charge complexe, réseau d'adaptation en L sans pertes.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S, TAU = 2 * Math.PI;
  function cx(a, b) { return { re: a, im: b }; }
  function add(a, b) { return cx(a.re + b.re, a.im + b.im); }
  function mul(a, b) { return cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function div(a, b) { var d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); }
  function abs(a) { return Math.hypot(a.re, a.im); }
  function gamma(ZL, Z0) { return div(cx(ZL.re - Z0, ZL.im), cx(ZL.re + Z0, ZL.im)); }
  function vswr(g) { var m = abs(g); return m >= 1 ? Infinity : (1 + m) / (1 - m); }
  function returnLoss(g) { return -20 * K.log10(Math.max(abs(g), 1e-9)); }
  function mismatchLoss(g) { return -10 * K.log10(1 - Math.min(abs(g) * abs(g), 0.999999)); }
  /** Impédance d'entrée d'une ligne sans pertes ; l est exprimée en longueurs d'onde. */
  function zin(ZL, Z0, l) { var t = Math.tan(TAU * l), j = cx(0, 1); return mul(cx(Z0, 0), div(add(ZL, mul(j, cx(Z0 * t, 0))), add(cx(Z0, 0), mul(j, mul(ZL, cx(t, 0)))))); }
  /** Réseau en L adaptant Rs et RL (résistifs) : réactance série et réactance parallèle. */
  function lMatch(Rs, RL) {
    var hi = Math.max(Rs, RL), lo = Math.min(Rs, RL), Q = Math.sqrt(hi / lo - 1);
    return { Q: Q, Xseries: Q * lo, Xparallel: hi / Q, parallelSide: RL >= Rs ? 'charge' : 'source' };
  }
  function lambdaOf(fMHz, vf) { return 299.792458 * (vf || 1) / fMHz; }
  var math = { gamma: gamma, vswr: vswr, returnLoss: returnLoss, mismatchLoss: mismatchLoss, zin: zin, lMatch: lMatch, abs: abs, lambdaOf: lambdaOf };

  var lesson = K.lesson({ id: 'rf', title: 'Radiofréquence et adaptation',
    intro: 'À haute fréquence, un câble n’est plus un simple fil. Il devient une ligne de transmission, et une désadaptation renvoie une partie de la puissance vers la source.',
    objectives: ['Calculer un coefficient de réflexion, un ROS et un affaiblissement de réflexion.', 'Prévoir l’impédance vue à l’entrée d’une ligne.', 'Dimensionner un réseau d’adaptation en L.', 'Évaluer les conséquences d’une désadaptation.'],
    prerequisites: 'Impédance complexe (courant alternatif) ; ondes électromagnétiques.',
    sources: ['Pages « Standing wave ratio », « Reflection coefficient », « Return loss », « Transmission line », « Impedance matching ».'],
    figures: { line: { caption: 'Une onde incidente se réfléchit partiellement sur une charge différente de l’impédance caractéristique.', svg: function () { return S.blocks({ w: 520, h: 130, label: 'Source, ligne d’impédance Z0, charge ZL et onde réfléchie.', boxes: [{ id: 'a', x: 20, y: 40, w: 100, h: 50, t: 'Source', sub: 'Zs = Z₀' }, { id: 'b', x: 180, y: 40, w: 160, h: 50, t: 'Ligne Z₀', sub: 'longueur l' }, { id: 'c', x: 400, y: 40, w: 100, h: 50, t: 'Charge', sub: 'Z_L' }], links: [{ a: 'a', b: 'b', t: 'incidente' }, { a: 'b', b: 'c' }, { a: 'c', b: 'b', from: 't', to: 't', dash: true, t: 'réfléchie', dy: -4 }] }); } },
      swr: { caption: 'Puissance réfléchie selon le ROS : un ROS de 2 réfléchit environ 11 % de la puissance.', options: function () { return { kind: 'xy', title: 'ROS et puissance réfléchie', desc: 'La puissance réfléchie augmente avec le ROS.', x: { min: 1, max: 10, label: 'ROS' }, y: { min: 0, max: 70, label: 'puissance réfléchie (%)' }, series: [{ samples: 200, fn: function (s) { var g = (s - 1) / (s + 1); return g * g * 100; } }], points: [{ x: 2, y: 100 / 9, label: 'ROS 2' }] }; } } },
    chapters: [
      { title: 'Lignes de transmission', summary: 'Impédance caractéristique et longueur électrique.', html: [
        '<p class="lead">Dès que la longueur d’un conducteur devient une fraction notable de la longueur d’onde, la tension et le courant varient le long du câble.</p>',
        '<div data-fig="line"></div>',
        K.defs([['Impédance caractéristique Z₀', 'Rapport tension/courant d’une onde qui se propage dans la ligne, souvent 50 Ω ou 75 Ω.'], ['Coefficient de vélocité', 'Rapport entre la vitesse dans le câble et la vitesse de la lumière.'], ['Longueur électrique', 'Longueur de la ligne exprimée en longueurs d’onde.']]),
        K.formula('λ = v / f = ' + v('k') + ' c / f', 'k : coefficient de vélocité, environ 0,66 pour un câble coaxial à polyéthylène plein.'),
        K.example('longueur d’onde dans un câble', '<p>À 145 MHz avec k = 0,66 : λ = 0,66 × 299,8/145 = ' + fN(lambdaOf(145, 0.66)) + ' m. Un câble de 34 cm correspond déjà à un quart d’onde.</p>')] },
      { title: 'Réflexion et ROS', summary: 'Coefficient de réflexion, ROS, return loss.', html: [
        '<p class="lead">Si la charge ne vaut pas Z₀, une partie de l’énergie est renvoyée vers la source.</p>',
        K.formula('Γ = (Z<sub>L</sub> − Z₀)/(Z<sub>L</sub> + Z₀), ROS = (1 + |Γ|)/(1 − |Γ|), RL = −20 log₁₀|Γ|', 'Ligne sans pertes. Γ est complexe si la charge l’est. La convention de signe de RL varie selon les documents.'),
        '<div data-fig="swr"></div>',
        K.example('antenne à 75 Ω sur ligne 50 Ω', '<p>Γ = 25/125 = ' + fN(0.2) + ', ROS = 1,2/0,8 = ' + fN(1.5) + ', RL = ' + fN(returnLoss(cx(0.2, 0))) + ' dB. La puissance réfléchie est |Γ|² = 4 %, soit une perte de ' + fN(mismatchLoss(cx(0.2, 0)), 3) + ' dB seulement.</p>'),
        K.apply('<p>Un ROS élevé peut endommager l’amplificateur d’un émetteur : la plupart réduisent automatiquement leur puissance. Le ROS se mesure avec un wattmètre directionnel ou un analyseur de réseau.</p>')] },
      { title: 'Transformation d’impédance et adaptation', summary: 'Ligne quart d’onde, réseau en L.', html: [
        '<p class="lead">Une ligne peut transformer une impédance, et un réseau de composants réactifs permet d’annuler une désadaptation.</p>',
        K.formula('Z<sub>in</sub> = Z₀ (Z<sub>L</sub> + jZ₀ tan βl)/(Z₀ + jZ<sub>L</sub> tan βl)', 'Ligne sans pertes, β = 2π/λ. À λ/4, Z<sub>in</sub> = Z₀²/Z<sub>L</sub>.'),
        K.formula('Q = √(R<sub>h</sub>/R<sub>b</sub> − 1), X<sub>série</sub> = Q R<sub>b</sub>, X<sub>parallèle</sub> = R<sub>h</sub>/Q', 'Réseau en L entre deux résistances R<sub>h</sub> > R<sub>b</sub>. Élément parallèle côté R<sub>h</sub>, un composant inductif et un capacitif.'),
        K.example('adapter 200 Ω à 50 Ω', '<p>Q = √(200/50 − 1) = ' + fN(lMatch(50, 200).Q) + ' ; X<sub>série</sub> = ' + fN(lMatch(50, 200).Xseries) + ' Ω ; X<sub>parallèle</sub> = ' + fN(lMatch(50, 200).Xparallel) + ' Ω. À 100 MHz, l’inductance série vaut X/(2πf) = ' + si(lMatch(50, 200).Xseries / (TAU * 1e8), 'H') + ' et le condensateur parallèle 1/(2πfX) = ' + si(1 / (TAU * 1e8 * lMatch(50, 200).Xparallel), 'F') + '.</p>'),
        K.pitfalls(['<strong>Croire qu’un ROS élevé signifie que l’antenne ne rayonne pas.</strong> Il indique seulement une réflexion.', '<strong>Oublier que l’adaptation ne vaut que pour une bande de fréquences.</strong>', '<strong>Confondre ROS et pertes du câble.</strong> Un câble très atténuateur peut afficher un bon ROS à l’entrée.', '<strong>Ignorer le coefficient de vélocité.</strong>']),
        K.summary(['Γ = (Z<sub>L</sub> − Z₀)/(Z<sub>L</sub> + Z₀).', 'ROS = (1+|Γ|)/(1−|Γ|).', 'Un quart d’onde transforme Z<sub>L</sub> en Z₀²/Z<sub>L</sub>.', 'Un réseau en L adapte deux résistances à une fréquence donnée.']),
        K.toLab('rf', 'Modifiez la charge et la ligne, puis calculez un réseau d’adaptation.')] }
    ] });

  var D = { Z0: 50, R: 75, X: 0, l: 0.1, fMHz: 145, P: 10 };
  function M(s) { var ZL = cx(s.R, s.X), g = gamma(ZL, s.Z0), z = zin(ZL, s.Z0, s.l), m = abs(g); return { g: g, gm: m, swr: vswr(g), rl: returnLoss(g), ml: mismatchLoss(g), z: z, Pref: s.P * m * m, Pload: s.P * (1 - m * m), match: lMatch(s.Z0, Math.max(s.R, 1)), lam: lambdaOf(s.fMHz) }; }
  function fmtZ(z) { return fN(z.re) + (z.im >= 0 ? ' + j' : ' − j') + fN(Math.abs(z.im)) + ' Ω'; }
  var lab = { id: 'rf', title: 'Ligne de transmission et adaptation', short: 'Radiofréquence', icon: 'antenna', badge: 'Ligne sans pertes, réseau en L idéal',
    text: 'Choisissez une charge et une ligne, observez la réflexion et calculez un réseau d’adaptation.',
    summary: 'Modifiez la charge d’une ligne, mesurez ROS et réflexion, et observez la transformation d’impédance le long de la ligne.',
    params: [{ group: 'Ligne' }, { k: 'Z0', label: 'Impédance caractéristique', opts: [[50, '50 Ω'], [75, '75 Ω']] }, { k: 'l', label: 'Longueur électrique', min: 0, max: 1, step: 0.005, unit: 'λ', dec: 3 }, { k: 'fMHz', label: 'Fréquence', min: 1, max: 6000, log: true, unit: 'MHz', dec: 1 }, { group: 'Charge' }, { k: 'R', label: 'Résistance', min: 1, max: 1000, log: true, unit: 'Ω', dec: 1 }, { k: 'X', label: 'Réactance', min: -500, max: 500, step: 1, unit: 'Ω', dec: 0 }, { k: 'P', label: 'Puissance incidente', min: 0.1, max: 100, log: true, unit: 'W', dec: 1 }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Γ = ' + fN(m.gm) + ' ; ROS = ' + (isFinite(m.swr) ? fN(m.swr) : 'infini'); },
    verdict: function (s, m) { return m.swr <= 1.5 ? { ok: true, text: 'Bonne adaptation' } : m.swr <= 3 ? { ok: true, text: 'Adaptation acceptable' } : { ok: false, text: 'Forte désadaptation' }; },
    readouts: [['|Γ|', function (s, m) { return fN(m.gm); }], ['ROS', function (s, m) { return isFinite(m.swr) ? fN(m.swr) : 'infini'; }], ['Return loss', function (s, m) { return fN(m.rl) + ' dB'; }], ['Perte de désadaptation', function (s, m) { return fN(m.ml, 3) + ' dB'; }], ['Puissance réfléchie', function (s, m) { return si(m.Pref, 'W'); }], ['Puissance dans la charge', function (s, m) { return si(m.Pload, 'W'); }], ['Impédance à l’entrée', function (s, m) { return fmtZ(m.z); }], ['Longueur d’onde', function (s, m) { return si(m.lam, 'm'); }]],
    plots: [{ expr: function () { return 'Résistance vue à l’entrée selon la longueur de ligne'; }, options: function (s, m) { var ZL = cx(s.R, s.X); var top = Math.min(2000, Math.max(s.Z0 * m.swr * 1.15, s.Z0 * 1.5)); return { title: 'Transformation d’impédance', desc: 'Partie réelle de l’impédance d’entrée sur une longueur d’onde.', x: { min: 0, max: 1, label: 'longueur (λ)' }, y: { min: 0, max: top, label: 'Re(Zin) (Ω)' }, series: [{ samples: 400, fn: function (l) { var z = zin(ZL, s.Z0, l); return z.re > top * 2 ? NaN : z.re; } }], vlines: [{ x: s.l, label: 'ligne' }], hlines: [{ y: s.Z0, label: 'Z₀', anchor: 'start' }] }; } }],
    explain: function (s, m) { return '<p>La charge ' + fmtZ(cx(s.R, s.X)) + ' sur une ligne de ' + s.Z0 + ' Ω donne |Γ| = ' + fN(m.gm) + '. Sur ' + si(s.P, 'W') + ', ' + si(m.Pref, 'W') + ' reviennent vers la source. Vue depuis l’entrée de la ligne, l’impédance devient ' + fmtZ(m.z) + '. Un réseau en L adapté utiliserait Q = ' + fN(m.match.Q) + '.</p>'; },
    missions: [
      { id: 'm1', title: 'Adapter la charge', text: 'Obtenez un ROS inférieur à 1,1 sur une ligne de 50 Ω.', solution: { Z0: 50, R: 50, X: 0 }, check: function (s, m) { if (s.Z0 !== 50) return { ok: false, msg: 'Choisissez une ligne de 50 Ω.' }; return m.swr < 1.1 ? { ok: true, msg: 'Réussi : ROS de ' + fN(m.swr) + ', presque toute la puissance atteint la charge.' } : { ok: false, msg: 'ROS : ' + fN(m.swr) + '. Rapprochez la charge de 50 Ω.' }; } },
      { id: 'm2', title: 'Quart d’onde transformateur', text: 'Réglez la ligne à λ/4 (à 0,005 près) et observez Z₀²/Z_L.', solution: { l: 0.25 }, check: function (s, m) { return Math.abs(s.l - 0.25) <= 0.005 ? { ok: true, msg: 'Réussi : Z_in ≈ ' + fN(m.z.re) + ' Ω, proche de Z₀²/R.' } : { ok: false, msg: 'Longueur : ' + fN(s.l) + ' λ. Visez 0,25 λ.' }; } },
      { id: 'm3', title: 'Une forte désadaptation', text: 'Obtenez plus de 25 % de puissance réfléchie.', solution: { R: 10, X: 0 }, check: function (s, m) { return m.gm * m.gm > 0.25 ? { ok: true, msg: 'Réussi : ' + fN(m.gm * m.gm * 100) + ' % de la puissance est réfléchie.' } : { ok: false, msg: 'Réfléchie : ' + fN(m.gm * m.gm * 100) + ' %. Éloignez la charge de Z₀.' }; } }],
    limits: '<p>Ligne sans pertes et fréquence unique. Les pertes du câble, la dépendance en fréquence d’une antenne réelle et la largeur de bande du réseau d’adaptation ne sont pas calculées. Les réglages réels se font avec un analyseur de réseau.</p>' };

  var list = [
    K.num('e1', 'Coefficient de réflexion', 'Réflexion', '<p>Charge résistive de 100 Ω sur une ligne de 50 Ω. Calculez |Γ|.</p>', 1 / 3, '', { rel: 0.02 }, '<p>Γ = 50/150 = 0,333.</p>'),
    K.num('e2', 'ROS', 'Réflexion', '<p>Calculez le ROS pour |Γ| = 1/3.</p>', 2, '', { rel: 0.02 }, '<p>ROS = (1 + 1/3)/(1 − 1/3) = 2.</p>'),
    K.num('e3', 'Return loss', 'Réflexion', '<p>|Γ| = 0,1. Calculez l’affaiblissement de réflexion, en dB.</p>', 20, 'dB', { rel: 0.02 }, '<p>−20 log₁₀(0,1) = 20 dB.</p>'),
    K.num('e4', 'Puissance réfléchie', 'Réflexion', '<p>ROS = 2 et 100 W incidents. Calculez la puissance réfléchie, en W.</p>', 100 / 9, 'W', { rel: 0.02 }, '<p>|Γ| = 1/3, |Γ|² = 1/9, donc ' + fN(100 / 9, 4) + ' W.</p>'),
    K.num('e5', 'Transformateur quart d’onde', 'Transformation', '<p>Ligne quart d’onde de 75 Ω chargée par 50 Ω. Calculez Z<sub>in</sub>, en Ω.</p>', 112.5, 'Ω', { rel: 0.02 }, '<p>Z<sub>in</sub> = 75²/50 = 112,5 Ω.</p>'),
    K.num('e6', 'Réseau en L', 'Adaptation', '<p>Adapter 200 Ω à 50 Ω. Calculez le facteur Q du réseau.</p>', Math.sqrt(3), '', { rel: 0.02 }, '<p>Q = √(200/50 − 1) = √3 = ' + fN(Math.sqrt(3), 4) + '.</p>'),
    K.pick('e7', 'Ligne adaptée', 'Réflexion', '<p>Sur une ligne terminée par Z_L = Z₀ :</p>', 'il n’y a pas d’onde réfléchie', ['toute la puissance est réfléchie', 'le ROS est infini', 'la longueur impose une perte fixe'], '<p>Γ = 0, donc ROS = 1.</p>'),
    K.pick('e8', 'Fréquence d’adaptation', 'Adaptation', '<p>Un réseau en L calculé à 100 MHz :</p>', 'reste adapté seulement dans une bande autour de 100 MHz', ['reste adapté à toute fréquence', 'ne fonctionne qu’en continu', 'remplace l’antenne'], '<p>Ses réactances dépendent de la fréquence : l’adaptation n’est valable qu’à proximité de la fréquence de calcul.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('rf', list) };
});
