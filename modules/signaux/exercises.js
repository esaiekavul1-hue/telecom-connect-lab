/*
 * TELECOM CONNECT LAB — Module « Comprendre les signaux » : exercices (« Mes défis »)
 * --------------------------------------------------------------------------------
 * Chaque bonne réponse est CALCULÉE à partir des fonctions de signal-math.js,
 * jamais saisie « à la main ». Pour les QCM, chaque proposition porte la valeur
 * qu'elle affirme ; la bonne proposition est celle dont la valeur correspond au
 * calcul. Les tests automatiques (tests/run-unit-tests.js) vérifient en plus
 * chaque réponse avec un calcul indépendant.
 */
(function (root, factory) {
  var M = (typeof module === 'object' && module.exports) ? require('./signal-math.js') : root.TCL.signalMath;
  var api = factory(M);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.exercises = root.TCL.exercises || {}; root.TCL.exercises.signaux = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (M) {
  'use strict';

  var fN = M.formatNumber, fT = M.formatTime, fF = M.formatFrequency;
  var IDS = ['a', 'b', 'c', 'd'];
  function v(s) { return '<var>' + s + '</var>'; }

  /** Construit les options d'un QCM et désigne la bonne à partir de la valeur calculée. */
  function qcm(choices, expected, equal) {
    var answer = null;
    var options = choices.map(function (c, i) {
      var ok = c.value != null && equal(c.value, expected);
      if (ok) {
        if (answer) throw new Error('Deux propositions correctes');
        answer = IDS[i];
      }
      return { id: IDS[i], label: c.label };
    });
    if (!answer) throw new Error('Aucune proposition correcte');
    return { options: options, answer: answer };
  }

  function near(a, b) { return M.approxEqual(a, b, 1e-9, 1e-12); }

  var defs = [
    function e1() {
      var p = { A: 3, f: 250, phi: 0, win: 0.008, yMax: 5, yStep: 1 };
      var q = qcm([
        { label: '1,5 V', value: 1.5 },
        { label: '3 V', value: 3 },
        { label: '6 V', value: 6 },
        { label: '4,5 V', value: 4.5 }
      ], p.A, near);
      return {
        id: 'e1', title: 'Identifier l’amplitude', skill: 'Amplitude', type: 'qcm',
        prompt: '<p>Le graphique ci-dessous représente une tension sinusoïdale. Quelle est son <strong>amplitude</strong> ' + v('A') + ' ?</p>',
        figure: p, options: q.options, answer: q.answer,
        explanation: '<p>La courbe monte jusqu’à +' + fN(p.A) + ' V et descend jusqu’à −' + fN(p.A) + ' V. L’amplitude est la valeur maximale mesurée depuis 0 : ' + v('A') + ' = ' + fN(p.A) + ' V. La proposition ' + fN(M.peakToPeak(p.A)) + ' V correspond à la valeur crête à crête (2' + v('A') + '), une confusion fréquente.</p>'
      };
    },
    function e2() {
      var f = 50, T = M.period(f);
      return {
        id: 'e2', title: 'Calculer une période', skill: 'Période', type: 'numeric',
        prompt: '<p>Un signal sinusoïdal a une fréquence ' + v('f') + ' = ' + fF(f) + '. Calculez sa période ' + v('T') + ' <strong>en millisecondes</strong>.</p>',
        answer: T * 1e3, unit: 'ms', tol: { rel: 0.005 },
        explanation: '<p>' + v('T') + ' = 1/' + v('f') + ' = 1/' + fN(f) + ' = ' + fN(T) + ' s. Comme 1 s = 1 000 ms : ' + v('T') + ' = ' + fN(T * 1e3) + ' ms.</p>'
      };
    },
    function e3() {
      var T = 0.0025, f = M.frequency(T);
      return {
        id: 'e3', title: 'Calculer une fréquence', skill: 'Fréquence', type: 'numeric',
        prompt: '<p>La période d’un signal vaut ' + v('T') + ' = ' + fT(T) + '. Quelle est sa fréquence ' + v('f') + ' <strong>en hertz</strong> ?</p>',
        answer: f, unit: 'Hz', tol: { rel: 0.005 },
        explanation: '<p>On convertit d’abord la période en secondes : ' + fT(T) + ' = ' + fN(T) + ' s. Puis ' + v('f') + ' = 1/' + v('T') + ' = 1/' + fN(T) + ' = ' + fN(f) + ' Hz.</p>'
      };
    },
    function e4() {
      var hz = 2450, khz = hz / 1000;
      var q = qcm([
        { label: '24,5 kHz', value: 24.5 },
        { label: '2,45 kHz', value: 2.45 },
        { label: '0,245 kHz', value: 0.245 },
        { label: '2 450 000 kHz', value: 2450000 }
      ], khz, near);
      return {
        id: 'e4', title: 'Convertir des hertz en kilohertz', skill: 'Conversion Hz / kHz', type: 'qcm',
        prompt: '<p>Un générateur affiche une fréquence de ' + fN(hz) + ' Hz. Quelle est cette fréquence en <strong>kilohertz</strong> ?</p>',
        options: q.options, answer: q.answer,
        explanation: '<p>1 kHz = 1 000 Hz. Pour passer des hertz aux kilohertz, on divise par 1 000 : ' + fN(hz) + ' ÷ 1 000 = ' + fN(khz) + ' kHz. Multiplier par 1 000 donnerait des millihertz, pas des kilohertz.</p>'
      };
    },
    function e5() {
      var f1 = 200, f2 = 400, T1 = M.period(f1), T2 = M.period(f2);
      var q = qcm([
        { label: 'Elle passe de ' + fT(T1) + ' à ' + fT(2 * T1) + '.', value: 2 * T1 },
        { label: 'Elle passe de ' + fT(T1) + ' à ' + fT(T1 / 2) + '.', value: T1 / 2 },
        { label: 'Elle ne change pas : seule la hauteur du signal change.', value: T1 },
        { label: 'Elle passe de ' + fT(T1) + ' à ' + fT(T1 / 4) + '.', value: T1 / 4 }
      ], T2, near);
      return {
        id: 'e5', title: 'Effet d’une modification de fréquence', skill: 'Effet de la fréquence', type: 'qcm',
        prompt: '<p>On fait passer la fréquence d’un signal de ' + fF(f1) + ' à ' + fF(f2) + ', sans rien changer d’autre. Que devient sa <strong>période</strong> ?</p>',
        options: q.options, answer: q.answer,
        explanation: '<p>La période est l’inverse de la fréquence. Avant : ' + v('T') + ' = 1/' + fN(f1) + ' = ' + fT(T1) + '. Après : ' + v('T') + ' = 1/' + fN(f2) + ' = ' + fT(T2) + '. La fréquence double, donc la période est divisée par deux : les cycles sont deux fois plus courts. L’amplitude, elle, ne change pas.</p>'
      };
    },
    function e6() {
      var f = 100, A1 = 2, A2 = 4, T = M.period(f);
      var expected = { crest: A2, T: T };
      var eq = function (a, b) { return near(a.crest, b.crest) && near(a.T, b.T); };
      var q = qcm([
        { label: 'Les crêtes atteignent ±' + fN(A2) + ' V et la période devient ' + fT(T / 2) + '.', value: { crest: A2, T: T / 2 } },
        { label: 'Les crêtes restent à ±' + fN(A1) + ' V et la fréquence double.', value: { crest: A1, T: T / 2 } },
        { label: 'Les crêtes atteignent ±' + fN(A2) + ' V et la période reste ' + fT(T) + '.', value: { crest: A2, T: T } },
        { label: 'Les crêtes atteignent ±' + fN(2 * A2) + ' V et la période reste ' + fT(T) + '.', value: { crest: 2 * A2, T: T } }
      ], expected, eq);
      return {
        id: 'e6', title: 'Effet d’une modification d’amplitude', skill: 'Effet de l’amplitude', type: 'qcm',
        prompt: '<p>Un signal de ' + fF(f) + ' a une amplitude de ' + fN(A1) + ' V. On double son amplitude, qui passe à ' + fN(A2) + ' V. Quelle affirmation est exacte ?</p>',
        options: q.options, answer: q.answer,
        explanation: '<p>' + v('A') + ' multiplie le sinus : les crêtes passent de ±' + fN(A1) + ' V à ±' + fN(A2) + ' V (crête à crête : ' + fN(2 * A2) + ' V). L’intérieur du sinus, 2π' + v('f') + v('t') + ', ne change pas : la fréquence reste ' + fF(f) + ' et la période ' + fT(T) + '.</p>'
      };
    },
    function e7() {
      var f = 50, phi = Math.PI / 2, dt = M.timeShift(phi, f), T = M.period(f);
      var q = qcm([
        { label: v('x') + '₂ est en retard de ' + fT(Math.abs(dt)) + ' sur ' + v('x') + '₁.', value: -Math.abs(dt) },
        { label: v('x') + '₂ est en avance de ' + fT(Math.abs(dt)) + ' sur ' + v('x') + '₁.', value: Math.abs(dt) },
        { label: v('x') + '₂ est en avance de ' + fT(T) + ' sur ' + v('x') + '₁.', value: T },
        { label: v('x') + '₂ a une amplitude plus grande que ' + v('x') + '₁.', value: null }
      ], dt, near);
      return {
        id: 'e7', title: 'Comprendre la phase', skill: 'Phase', type: 'qcm',
        prompt: '<p>On compare deux signaux de même fréquence :</p><p class="formula formula--sm">' +
          v('x') + '₁(' + v('t') + ') = 3 · sin(2π · ' + fN(f) + ' · ' + v('t') + ')<br>' +
          v('x') + '₂(' + v('t') + ') = 3 · sin(2π · ' + fN(f) + ' · ' + v('t') + ' + π/2)</p><p>Que peut-on dire de ' + v('x') + '₂ par rapport à ' + v('x') + '₁ ?</p>',
        options: q.options, answer: q.answer,
        explanation: '<p>La période vaut ' + v('T') + ' = 1/' + fN(f) + ' = ' + fT(T) + '. Le décalage vaut Δ' + v('t') + ' = ' + v('φ') + '/(2π' + v('f') + ') = (π/2)/(2π × ' + fN(f) + ') = ' + fT(dt) + ', soit un quart de période. La phase est positive : ' + v('x') + '₂ atteint sa crête ' + fT(dt) + ' plus tôt, il est <strong>en avance</strong>. Les amplitudes sont identiques (3 V).</p>'
      };
    },
    function e8() {
      var p = { A: 2, f: 500, phi: 0, win: 0.006, yMax: 5, yStep: 1 };
      var n = M.periodsInWindow(p.f, p.win), T = p.win / n, f = M.frequency(T);
      return {
        id: 'e8', title: 'Interpréter un graphique', skill: 'Lecture de graphique', type: 'numeric',
        prompt: '<p>Le graphique montre un signal relevé pendant ' + fT(p.win) + '. Déterminez sa <strong>fréquence en hertz</strong>.</p>',
        figure: p, answer: f, unit: 'Hz', tol: { rel: 0.01 },
        explanation: '<p>On compte ' + fN(n) + ' périodes complètes en ' + fT(p.win) + '. Une période dure donc ' + fT(p.win) + ' ÷ ' + fN(n) + ' = ' + fT(T) + ' = ' + fN(T) + ' s. D’où ' + v('f') + ' = 1/' + v('T') + ' = 1/' + fN(T) + ' = ' + fN(f) + ' Hz.</p>'
      };
    },
    function e9() {
      var f = 50, d = 0.1, n = M.periodsInWindow(f, d);
      return {
        id: 'e9', title: 'Situation pratique : le réseau électrique', skill: 'Situation pratique', type: 'numeric',
        prompt: '<p>Le réseau électrique fournit une tension alternative de fréquence ' + fF(f) + '. Combien de <strong>périodes complètes</strong> se produisent en ' + fT(d) + ' ?</p>',
        answer: n, unit: 'périodes', tol: { rel: 0.001 },
        explanation: '<p>Une période dure ' + v('T') + ' = 1/' + fN(f) + ' = ' + fT(M.period(f)) + '. En ' + fT(d) + ', on compte ' + fT(d) + ' ÷ ' + fT(M.period(f)) + ' = ' + fN(n) + ' périodes. On peut aussi écrire : ' + v('f') + ' × durée = ' + fN(f) + ' × ' + fN(d) + ' = ' + fN(n) + '.</p>'
      };
    },
    function e10() {
      var A = 2, f = 100, t = 0.00125, angle = 2 * Math.PI * f * t, x = M.value(A, f, 0, t);
      return {
        id: 'e10', title: 'Calculer une valeur instantanée', skill: 'Utiliser le modèle', type: 'numeric',
        prompt: '<p>Pour le signal ' + v('x') + '(' + v('t') + ') = ' + fN(A) + ' · sin(2π · ' + fN(f) + ' · ' + v('t') + '), calculez la valeur du signal à l’instant ' + v('t') + ' = ' + fT(t) + '. Donnez le résultat <strong>en volts, arrondi au centième</strong>.</p>',
        answer: x, unit: 'V', tol: { abs: 0.006 },
        explanation: '<p>On convertit ' + v('t') + ' = ' + fT(t) + ' = ' + fN(t) + ' s. L’angle vaut 2π × ' + fN(f) + ' × ' + fN(t) + ' = ' + M.formatPhase(angle) + ' rad (≈ ' + fN(angle, 4) + ' rad). sin(π/4) ≈ ' + fN(Math.sin(angle), 3) + ', donc ' + v('x') + ' ≈ ' + fN(A) + ' × ' + fN(Math.sin(angle), 3) + ' ≈ ' + fN(x, 3) + ' V. Calculatrice en mode radians !</p>'
      };
    }
  ];

  var list = defs.map(function (build) { return build(); });

  /**
   * Vérifie une réponse. Renvoie :
   *  - { invalid: true, message } si la saisie n'est pas un nombre lisible ;
   *  - { correct: true|false, expected } sinon.
   * Aucun point n'est accordé à une réponse incorrecte.
   */
  function check(ex, response) {
    if (ex.type === 'qcm') {
      if (!response) return { invalid: true, message: 'Choisissez une proposition.' };
      var opt = ex.options.filter(function (o) { return o.id === ex.answer; })[0];
      return { correct: response === ex.answer, expected: opt.label };
    }
    // On tolère que l'étudiant recopie l'unité (« 20 ms », « 400 Hz »).
    var raw = String(response == null ? '' : response).trim();
    if (ex.unit) raw = raw.replace(new RegExp('\\s*' + ex.unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), '');
    var n = M.parseNumber(raw);
    if (!isFinite(n)) return { invalid: true, message: 'Saisissez un nombre (la virgule est acceptée, par exemple 2,5).' };
    var tol = ex.tol || {};
    var ok = tol.abs != null ? Math.abs(n - ex.answer) <= tol.abs : M.approxEqual(n, ex.answer, tol.rel != null ? tol.rel : 0.01);
    var shown = ex.unit === 'V' ? fN(ex.answer, 3) : fN(ex.answer, 4);
    return { correct: ok, expected: (ex.tol && ex.tol.abs != null ? '≈ ' : '') + shown + ' ' + ex.unit, value: n };
  }

  function byId(id) { return list.filter(function (e) { return e.id === id; })[0]; }

  return { list: list, check: check, byId: byId, count: list.length };
});
