/*
 * TELECOM CONNECT LAB 2.0 — Courant alternatif et circuits RLC
 * Modèle : régime sinusoïdal établi, composants linéaires idéaux.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  var TAU = 2 * Math.PI;

  /* ---- Calculs ---- */
  function reactance(type, L, C, f) {
    var w = TAU * f;
    return type === 'rc' ? -1 / (w * C) : type === 'rl' ? w * L : w * L - 1 / (w * C);
  }
  function series(type, Veff, R, L, C, f) {
    var X = reactance(type, L, C, f), Z = Math.hypot(R, X), I = Veff / Z, phi = Math.atan2(X, R);
    return { X: X, Z: Z, I: I, phi: phi, P: I * I * R, Q: I * I * X, S: Veff * I, pf: Math.cos(phi) };
  }
  function f0(L, C) { return 1 / (TAU * Math.sqrt(L * C)); }
  function qFactor(R, L, C) { return Math.sqrt(L / C) / R; }
  function rms(Vp) { return Vp / Math.SQRT2; }
  var math = { reactance: reactance, series: series, f0: f0, qFactor: qFactor, rms: rms };

  /* ---- Leçon ---- */
  var sineFig = { caption: 'Une tension de 230 V efficaces a une amplitude de 325 V : la valeur efficace produit le même échauffement qu’une tension continue de 230 V.',
    options: function () { var Vp = 230 * Math.SQRT2; return { kind: 'xy', title: 'Tension du secteur à 50 Hz', desc: 'Sinusoïde d’amplitude 325 volts et de période 20 millisecondes, avec la valeur efficace 230 volts.', x: { min: 0, max: 40, label: 'temps (ms)' }, y: { min: -400, max: 400, label: 'tension (V)' }, series: [{ samples: 300, fn: function (t) { return Vp * Math.sin(TAU * 50 * t / 1000); } }], hlines: [{ y: 230, label: 'Veff = 230 V', anchor: 'start' }], points: [{ x: 5, y: Vp, label: 'crête 325 V' }] }; } };
  var rlcFig = { caption: 'Circuit RLC série alimenté par une source sinusoïdale : un même courant traverse les trois composants.',
    svg: function () { return S.svg(520, 190, 'Source alternative en série avec une résistance, une inductance et un condensateur.', S.wire('M70 45H130M190 45H240M300 45H350M410 45H450V150H70V125M70 65V45') + S.V(70, 95, true, 'v(t)', true) + S.R(160, 45, false, 'R') + S.L(270, 45, false, 'L') + S.C(380, 45, false, 'C') + S.text(255, 120, 'i(t) identique partout')); } };
  var resFig = { caption: 'Courant en fonction de la fréquence pour R = 50 Ω, L = 10 mH, C = 1 µF : le maximum est atteint à la résonance, vers 1,59 kHz.',
    options: function () { var L = 0.01, C = 1e-6, R = 50; return { kind: 'xy', title: 'Courbe de résonance', desc: 'Le courant passe par un maximum à la fréquence de résonance.', x: { min: 100, max: 20000, log: true, label: 'fréquence (Hz)' }, y: { min: 0, max: 0.25, label: 'courant efficace (A)' }, series: [{ samples: 300, fn: function (f) { return series('rlc', 10, R, L, C, f).I; } }], vlines: [{ x: f0(L, C), label: 'f₀' }] }; } };

  var ex1 = series('rlc', 230, 100, 0.2, 20e-6, 50), f1 = f0(10e-3, 1e-6);
  var lesson = K.lesson({ id: 'ac', title: 'Courant alternatif et circuits RLC',
    intro: 'Le réseau électrique, les signaux radio et la plupart des filtres fonctionnent en régime alternatif. Cette leçon donne les outils pour calculer courants, tensions et puissances dans ces circuits.',
    objectives: ['Passer de l’amplitude à la valeur efficace d’une grandeur sinusoïdale.', 'Calculer l’impédance et le déphasage d’un circuit RC, RL ou RLC série.', 'Distinguer puissances active, réactive et apparente.', 'Prévoir la fréquence de résonance et le facteur de qualité.'],
    prerequisites: 'Circuits électriques, notion de sinusoïde (module « Comprendre les signaux »).',
    sources: ['Page « RLC circuit » (résonance, facteur Q, bande passante).', 'Calculs contrôlés par tests/content-references.js.'],
    figures: { sine: sineFig, rlc: rlcFig, res: resFig },
    chapters: [
      { title: 'Grandeurs sinusoïdales', summary: 'Amplitude, valeur efficace, fréquence et pulsation.', html: [
        '<p class="lead">Une tension alternative change de signe périodiquement. Sa valeur instantanée seule ne suffit pas : il faut savoir quelle puissance elle peut réellement fournir.</p>',
        K.formula(v('v') + '(' + v('t') + ') = ' + v('V') + '<sub>p</sub> sin(ω' + v('t') + ' + φ), avec ω = 2π' + v('f'), 'V<sub>p</sub> en volts, f en hertz, ω en radians par seconde. Valable en régime sinusoïdal établi.'),
        K.defs([['Valeur efficace', 'Valeur de la tension continue qui dissiperait la même puissance dans une résistance.'], ['Période', 'Durée d’un cycle : T = 1/f.'], ['Déphasage', 'Décalage angulaire entre deux sinusoïdes de même fréquence.']]),
        '<div data-fig="sine"></div>',
        K.formula(v('V') + '<sub>eff</sub> = ' + v('V') + '<sub>p</sub> / √2', 'Uniquement pour une sinusoïde pure. Un signal carré ou déformé suit une autre relation.'),
        K.example('du réseau à l’amplitude', '<p>Un réseau de 220 V efficaces a pour amplitude 220 × √2 = ' + fN(220 * Math.SQRT2) + ' V. Un condensateur placé sur ce réseau doit donc supporter plus de 311 V, et non 220 V.</p>'),
        K.apply('<p>Un multimètre « RMS vrai » calcule la valeur efficace de tout signal. Un appareil plus simple suppose une sinusoïde et se trompe sur un signal déformé, comme celui d’un variateur.</p>')] },
      { title: 'Impédance et déphasage', summary: 'Réactances, impédance complexe, circuits RC et RL.', html: [
        '<p class="lead">Un condensateur et une inductance s’opposent au passage d’un courant alternatif, d’une façon qui dépend de la fréquence.</p>',
        K.defs([['Réactance inductive', 'X<sub>L</sub> = ωL : elle croît avec la fréquence.'], ['Réactance capacitive', 'X<sub>C</sub> = 1/(ωC) : elle diminue avec la fréquence.'], ['Impédance', 'Rapport des valeurs efficaces tension/courant, en ohms.']]),
        '<div data-fig="rlc"></div>',
        K.formula(v('Z') + ' = √(' + v('R') + '² + (X<sub>L</sub> − X<sub>C</sub>)²), tan φ = (X<sub>L</sub> − X<sub>C</sub>)/' + v('R'), 'Circuit série en régime établi. φ > 0 : le courant est en retard sur la tension (circuit inductif).'),
        K.example('RLC sur le réseau', '<p>R = 100 Ω, L = 0,2 H, C = 20 µF, 230 V à 50 Hz. X<sub>L</sub> = 2π × 50 × 0,2 = ' + fN(TAU * 50 * 0.2) + ' Ω ; X<sub>C</sub> = 1/(2π × 50 × 20·10⁻⁶) = ' + fN(1 / (TAU * 50 * 20e-6)) + ' Ω. Donc Z = ' + fN(ex1.Z, 4) + ' Ω, I = 230/Z = ' + fN(ex1.I) + ' A et φ = ' + fN(ex1.phi * 180 / Math.PI) + '° : le circuit est capacitif.</p>'),
        '<h3>Le filtre RC</h3><p>En série, la tension aux bornes du condensateur est atténuée aux hautes fréquences : c’est un filtre passe-bas de fréquence de coupure f<sub>c</sub> = 1/(2πRC). Aux bornes de la résistance, on obtient au contraire un passe-haut.</p>',
        '<h3>Le circuit RL</h3><p>La constante de temps vaut τ = L/R. Une inductance s’oppose aux variations rapides du courant : à la coupure brutale d’une bobine, une surtension apparaît, d’où la diode de roue libre sur les relais.</p>'] },
      { title: 'Puissances en alternatif', summary: 'Puissance active, réactive, apparente et facteur de puissance.', html: [
        '<p class="lead">Seule une partie de l’énergie échangée avec la source est réellement consommée. Le reste fait des allers-retours dans les bobines et les condensateurs.</p>',
        K.formula(v('P') + ' = ' + v('V') + v('I') + ' cos φ (W), ' + v('Q') + ' = ' + v('V') + v('I') + ' sin φ (var), ' + v('S') + ' = ' + v('V') + v('I') + ' (VA)', 'V et I en valeurs efficaces, régime sinusoïdal. S² = P² + Q².'),
        K.defs([['Facteur de puissance', 'cos φ = P/S, entre 0 et 1 en sinusoïdal.'], ['Puissance active', 'Puissance réellement convertie, en chaleur ou en travail.'], ['Puissance réactive', 'Échange d’énergie sans consommation moyenne.']]),
        K.example('facteur de puissance', '<p>Dans l’exemple précédent, P = R·I² = 100 × ' + fN(ex1.I) + '² = ' + fN(ex1.P) + ' W, S = 230 × ' + fN(ex1.I) + ' = ' + fN(ex1.S) + ' VA, donc cos φ = ' + fN(ex1.pf) + '.</p>'),
        K.apply('<p>Une installation avec un mauvais facteur de puissance appelle plus de courant pour la même puissance utile : câbles plus gros et pertes plus élevées. Des condensateurs servent à le corriger.</p>')] },
      { title: 'La résonance', summary: 'Fréquence propre, facteur de qualité, bande passante.', html: [
        '<p class="lead">À une fréquence particulière, les réactances de la bobine et du condensateur se compensent exactement.</p>',
        K.formula(v('f') + '₀ = 1 / (2π√(' + v('L') + v('C') + ')), ' + v('Q') + ' = (1/' + v('R') + ')√(' + v('L') + '/' + v('C') + '), Δ' + v('f') + ' = ' + v('f') + '₀/' + v('Q'), 'Circuit RLC série. L en henrys, C en farads. À f₀, Z = R et le courant est maximal.'),
        '<div data-fig="res"></div>',
        K.example('choisir f₀', '<p>L = 10 mH, C = 1 µF, R = 50 Ω : f₀ = ' + fN(f1, 4) + ' Hz ; Q = ' + fN(qFactor(50, 10e-3, 1e-6)) + ' ; bande passante = ' + fN(f1 / qFactor(50, 10e-3, 1e-6), 3) + ' Hz.</p>'),
        K.apply('<p>Un récepteur radio utilise un circuit résonant pour sélectionner une station. Un filtre avec un Q élevé est plus sélectif, mais sa fréquence dérive davantage avec les tolérances des composants.</p>'),
        K.pitfalls(['<strong>Additionner R et X directement.</strong> L’impédance se calcule par la racine de la somme des carrés.', '<strong>Confondre amplitude et valeur efficace</strong> dans le calcul d’une puissance.', '<strong>Oublier que la réactance dépend de la fréquence.</strong>', '<strong>Croire que la tension reste faible aux bornes de L et C à la résonance.</strong> Elle peut y dépasser celle de la source d’un facteur Q.']),
        K.summary(['V<sub>eff</sub> = V<sub>p</sub>/√2 pour une sinusoïde.', 'X<sub>L</sub> = ωL, X<sub>C</sub> = 1/(ωC), Z = √(R² + X²).', 'P = VI cos φ, Q = VI sin φ, S = VI.', 'À f₀ = 1/(2π√LC), Z est minimale et égale à R.']),
        K.toLab('ac', 'Réglez la fréquence pour trouver la résonance et observez le déphasage du courant.')] }
    ] });

  /* ---- Laboratoire ---- */
  var D = { type: 'rlc', V: 12, f: 1000, R: 50, Lm: 10, Cu: 1 };
  function M(s) { var L = s.Lm / 1000, C = s.Cu * 1e-6, r = series(s.type, s.V, s.R, L, C, s.f); r.L = L; r.C = C; r.f0 = s.type === 'rlc' ? f0(L, C) : null; r.Q0 = s.type === 'rlc' ? qFactor(s.R, L, C) : null; r.deg = r.phi * 180 / Math.PI; return r; }
  var lab = { id: 'ac', title: 'Circuit RLC en régime sinusoïdal', short: 'Courant alternatif et RLC', icon: 'wave', badge: 'Régime sinusoïdal établi, composants idéaux',
    text: 'Choisissez un circuit série, modifiez la fréquence et les composants, puis observez courant, déphasage et puissances.',
    summary: 'Trouvez la résonance d’un circuit RLC, observez le déphasage et calculez les puissances active, réactive et apparente.',
    params: [ { group: 'Source' }, { k: 'V', label: 'Tension efficace', min: 1, max: 230, step: 1, unit: 'V', dec: 1 }, { k: 'f', label: 'Fréquence', min: 10, max: 1000000, log: true, unit: 'Hz', dec: 1 },
      { group: 'Circuit' }, { k: 'type', label: 'Montage', opts: [['rlc', 'RLC'], ['rc', 'RC'], ['rl', 'RL']] }, { k: 'R', label: 'Résistance', min: 1, max: 10000, log: true, unit: 'Ω', dec: 1 },
      { k: 'Lm', label: 'Inductance', min: 0.1, max: 1000, log: true, unit: 'mH', dec: 2, when: function (s) { return s.type !== 'rc'; } }, { k: 'Cu', label: 'Capacité', min: 0.01, max: 1000, log: true, unit: 'µF', dec: 2, when: function (s) { return s.type !== 'rl'; } } ],
    defaults: D, model: M,
    expr: function (s, m) { return 'Z = ' + si(m.Z, 'Ω') + ' ; φ = ' + fN(m.deg) + '°'; },
    verdict: function (s, m) { if (Math.abs(m.deg) < 3) return { ok: true, text: 'Circuit quasi résistif' }; return { ok: true, text: m.deg > 0 ? 'Circuit inductif : courant en retard' : 'Circuit capacitif : courant en avance' }; },
    readouts: [['Réactance X', function (s, m) { return fN(m.X) + ' Ω'; }], ['Impédance |Z|', function (s, m) { return si(m.Z, 'Ω'); }], ['Courant efficace', function (s, m) { return si(m.I, 'A'); }], ['Déphasage φ', function (s, m) { return fN(m.deg) + '°'; }], ['Puissance active', function (s, m) { return si(m.P, 'W'); }], ['Puissance réactive', function (s, m) { return si(m.Q, 'var'); }], ['Facteur de puissance', function (s, m) { return fN(m.pf); }], ['Résonance f₀', function (s, m) { return m.f0 ? si(m.f0, 'Hz', 4) : 'sans objet'; }]],
    plots: [ { expr: function (s, m) { return 'Tension et courant sur deux périodes'; }, options: function (s, m, w) { var T = 1 / s.f, Vp = s.V * Math.SQRT2, Ip = m.I * Math.SQRT2, k = Vp / (Ip || 1); return { title: 'Tension et courant', desc: 'Tension de la source et courant, déphasés de ' + fN(m.deg) + ' degrés.', x: { min: 0, max: 2 * T * 1000, label: 'temps (ms)' }, y: { min: -1.2 * Vp, max: 1.2 * Vp, label: 'v (V), i normalisé' }, series: [{ samples: 240, fn: function (t) { return Vp * Math.sin(TAU * s.f * t / 1000); } }, { samples: 240, cls: 'scope__trace--alt', fn: function (t) { return k * Ip * Math.sin(TAU * s.f * t / 1000 - m.phi); } }] }; } },
      { expr: function (s, m) { return 'Courant en fonction de la fréquence' + (m.Q0 ? ' ; Q = ' + fN(m.Q0) : ''); }, options: function (s, m, w) { var I = function (f) { return series(s.type, s.V, s.R, m.L, m.C, f).I; }; var top = 0; for (var i = 0; i <= 400; i++) top = Math.max(top, I(Math.pow(10, 1 + 5 * i / 400))); if (m.f0) top = Math.max(top, I(m.f0)); return { title: 'Réponse en fréquence', desc: 'Courant efficace pour des fréquences de 10 hertz à 1 mégahertz.', x: { min: 10, max: 1000000, log: true, label: 'fréquence (Hz)' }, y: { min: 0, max: top * 1.12, label: 'I (A)' }, series: [{ samples: 400, fn: I }], vlines: [{ x: s.f, label: 'réglage' }] }; } } ],
    explain: function (s, m) { return '<p>À ' + si(s.f, 'Hz') + ', la réactance vaut ' + fN(m.X) + ' Ω. L’impédance est √(R² + X²) = <strong>' + si(m.Z, 'Ω') + '</strong> et le courant ' + si(m.I, 'A') + '. La source fournit ' + si(m.S, 'VA') + ', dont ' + si(m.P, 'W') + ' réellement dissipés dans R.</p>'; },
    missions: [
      { id: 'm1', title: 'Trouver la résonance', text: 'En montage RLC, réglez la fréquence à 2 % près de la résonance.', solution: { type: 'rlc', f: 1590 }, check: function (s, m) { if (s.type !== 'rlc') return { ok: false, msg: 'Choisissez le montage RLC.' }; return Math.abs(s.f - m.f0) / m.f0 <= 0.02 ? { ok: true, msg: 'Réussi : f₀ = ' + si(m.f0, 'Hz', 4) + '. Les réactances se compensent et Z vaut R.' } : { ok: false, msg: 'f = ' + si(s.f, 'Hz') + ', f₀ = ' + si(m.f0, 'Hz', 4) + '. Rapprochez la fréquence de f₀.' }; } },
      { id: 'm2', title: 'Un courant très en retard', text: 'Obtenez un déphasage supérieur à 60° en montage RL.', solution: { type: 'rl', R: 10, Lm: 100, f: 1000 }, check: function (s, m) { if (s.type !== 'rl') return { ok: false, msg: 'Choisissez le montage RL.' }; return m.deg > 60 ? { ok: true, msg: 'Réussi : φ = ' + fN(m.deg) + '°. La réactance domine la résistance.' } : { ok: false, msg: 'φ = ' + fN(m.deg) + '°. Augmentez f ou L, ou diminuez R.' }; } },
      { id: 'm3', title: 'Un circuit sélectif', text: 'En RLC, obtenez un facteur de qualité d’au moins 10.', solution: { type: 'rlc', R: 5, Lm: 10, Cu: 1 }, check: function (s, m) { if (s.type !== 'rlc') return { ok: false, msg: 'Choisissez le montage RLC.' }; return m.Q0 >= 10 ? { ok: true, msg: 'Réussi : Q = ' + fN(m.Q0) + ', bande passante ' + si(m.f0 / m.Q0, 'Hz') + '.' } : { ok: false, msg: 'Q = ' + fN(m.Q0) + '. Diminuez R ou augmentez L/C.' }; } },
      { id: 'm4', title: 'Facteur de puissance médiocre', text: 'Obtenez un facteur de puissance inférieur à 0,5 en montage RC.', solution: { type: 'rc', R: 10, Cu: 1, f: 1000 }, check: function (s, m) { if (s.type !== 'rc') return { ok: false, msg: 'Choisissez le montage RC.' }; return m.pf < 0.5 ? { ok: true, msg: 'Réussi : cos φ = ' + fN(m.pf) + '. La source échange surtout de l’énergie réactive.' } : { ok: false, msg: 'cos φ = ' + fN(m.pf) + '. Réduisez R ou C, ou la fréquence.' }; } } ],
    limits: '<p>Composants parfaits : pas de résistance série d’inductance, pas de pertes dans le condensateur, pas de saturation du noyau. Le régime transitoire à la mise sous tension n’est pas représenté. Aux fréquences élevées, les capacités et inductances parasites changent le comportement réel.</p>' };

  /* ---- Exercices ---- */
  var ser = series('rlc', 10, 100, 0.1, 10e-6, 200);
  var list = [
    K.num('e1', 'Amplitude du réseau', 'Valeur efficace', '<p>Une tension sinusoïdale a une valeur efficace de 220 V. Calculez son amplitude, en V.</p>', 220 * Math.SQRT2, 'V', { rel: 0.01 }, '<p>V<sub>p</sub> = V<sub>eff</sub> × √2 = ' + fN(220 * Math.SQRT2, 4) + ' V.</p>'),
    K.num('e2', 'Réactance d’un condensateur', 'Réactances', '<p>Calculez la réactance d’un condensateur de 10 µF à 50 Hz, en Ω.</p>', 1 / (TAU * 50 * 10e-6), 'Ω', { rel: 0.02 }, '<p>X<sub>C</sub> = 1/(2πfC) = ' + fN(1 / (TAU * 50 * 10e-6), 4) + ' Ω.</p>'),
    K.num('e3', 'Réactance d’une bobine', 'Réactances', '<p>Calculez la réactance d’une inductance de 10 mH à 10 kHz, en Ω.</p>', TAU * 1e4 * 0.01, 'Ω', { rel: 0.02 }, '<p>X<sub>L</sub> = 2πfL = ' + fN(TAU * 1e4 * 0.01, 4) + ' Ω.</p>'),
    K.num('e4', 'Impédance RLC', 'Impédance', '<p>R = 100 Ω, L = 0,1 H, C = 10 µF, f = 200 Hz, en série. Calculez |Z|, en Ω.</p>', ser.Z, 'Ω', { rel: 0.02 }, '<p>X = ωL − 1/(ωC) = ' + fN(ser.X, 4) + ' Ω, donc |Z| = √(R² + X²) = ' + fN(ser.Z, 4) + ' Ω.</p>'),
    K.num('e5', 'Fréquence de résonance', 'Résonance', '<p>Calculez la fréquence de résonance pour L = 1 mH et C = 100 nF, en kHz.</p>', f0(1e-3, 100e-9) / 1000, 'kHz', { rel: 0.02 }, '<p>f₀ = 1/(2π√(LC)) = ' + fN(f0(1e-3, 100e-9) / 1000, 4) + ' kHz.</p>'),
    K.num('e6', 'Puissance active', 'Puissances', '<p>Un appareil sous 230 V consomme 2 A avec cos φ = 0,8. Calculez la puissance active, en W.</p>', 368, 'W', { rel: 0.01 }, '<p>P = V·I·cos φ = 230 × 2 × 0,8 = 368 W.</p>'),
    K.pick('e7', 'Comportement en fréquence', 'Réactances', '<p>Quand la fréquence augmente :</p>', 'X_L augmente et X_C diminue', ['X_L et X_C augmentent', 'X_L diminue et X_C augmente', 'X_L et X_C restent constantes'], '<p>X<sub>L</sub> = ωL est proportionnelle à f ; X<sub>C</sub> = 1/(ωC) lui est inversement proportionnelle.</p>'),
    K.pick('e8', 'À la résonance', 'Résonance', '<p>Dans un RLC série à la résonance :</p>', 'L’impédance est minimale et égale à R', ['L’impédance est maximale', 'Le courant est nul', 'Le déphasage vaut 90°'], '<p>X<sub>L</sub> = X<sub>C</sub> : la réactance totale s’annule, Z = R, le courant est maximal et en phase avec la tension.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('ac', list) };
});
