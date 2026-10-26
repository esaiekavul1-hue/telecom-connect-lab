/*
 * TELECOM CONNECT LAB — Outils communs aux séries d'exercices
 * ----------------------------------------------------------
 * Trois formats de question :
 *   - 'qcm'     : propositions ; la bonne est désignée PAR LE CALCUL (qcm())
 *                 ou par une définition du cours (concept()) ;
 *   - 'numeric' : réponse numérique avec unité et tolérance ;
 *   - 'text'    : réponse courte (adresse IP, masque…) vérifiée par une
 *                 fonction accept(réponse) propre à l'exercice.
 * Utilisé par le navigateur (TCL.exerciseKit) et par les tests Node.
 */
(function (root, factory) {
  var M = (typeof module === 'object' && module.exports) ? require('../modules/signaux/signal-math.js') : root.TCL.signalMath;
  var api = factory(M);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.exerciseKit = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (M) {
  'use strict';
  var IDS = ['a', 'b', 'c', 'd', 'e'];

  /** QCM dont la bonne proposition est celle dont la valeur correspond au calcul attendu. */
  function qcm(choices, expected, equal) {
    equal = equal || function (a, b) { return M.approxEqual(a, b, 1e-9, 1e-12); };
    var answer = null;
    var options = choices.map(function (c, i) {
      if (c.value != null && equal(c.value, expected)) {
        if (answer) throw new Error('Deux propositions correctes : ' + c.label);
        answer = IDS[i];
      }
      return { id: IDS[i], label: c.label };
    });
    if (!answer) throw new Error('Aucune proposition correcte pour la valeur ' + expected);
    return { options: options, answer: answer };
  }

  /** QCM de définition : exactement une proposition marquée ok: true. */
  function concept(choices) {
    var answer = null;
    var options = choices.map(function (c, i) {
      if (c.ok) { if (answer) throw new Error('Deux propositions correctes'); answer = IDS[i]; }
      return { id: IDS[i], label: c.label };
    });
    if (!answer) throw new Error('Aucune proposition correcte');
    return { options: options, answer: answer };
  }

  function stripUnit(raw, unit) {
    var s = String(raw == null ? '' : raw).trim();
    if (unit) s = s.replace(new RegExp('\\s*' + unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), '');
    return s;
  }

  /** Vérifie une réponse. { invalid, message } ou { correct, expected }. Aucun point pour une réponse fausse. */
  function check(ex, response) {
    if (ex.type === 'qcm') {
      if (!response) return { invalid: true, message: 'Choisissez une proposition.' };
      var opt = ex.options.filter(function (o) { return o.id === ex.answer; })[0];
      return { correct: response === ex.answer, expected: opt.label };
    }
    if (ex.type === 'text') {
      var t = String(response == null ? '' : response).trim();
      if (!t) return { invalid: true, message: 'Saisissez votre réponse.' };
      if (ex.validate) { var v = ex.validate(t); if (v) return { invalid: true, message: v }; }
      return { correct: !!ex.accept(t), expected: ex.expected };
    }
    var n = M.parseNumber(stripUnit(response, ex.unit));
    if (!isFinite(n)) return { invalid: true, message: 'Saisissez un nombre (la virgule est acceptée, par exemple 2,5).' };
    var tol = ex.tol || {};
    var ok = tol.abs != null ? Math.abs(n - ex.answer) <= tol.abs : M.approxEqual(n, ex.answer, tol.rel != null ? tol.rel : 0.01);
    var shown = M.formatNumber(ex.answer, ex.sig || 4);
    return { correct: ok, expected: (tol.abs != null || ex.approx ? '≈ ' : '') + shown + (ex.unit ? ' ' + ex.unit : ''), value: n };
  }

  /** Construit l'API d'une série : { list, check, byId, count, module }. */
  function series(moduleId, list) {
    var ids = {};
    list.forEach(function (e) {
      if (ids[e.id]) throw new Error('Identifiant d’exercice en double : ' + e.id);
      ids[e.id] = 1;
      if (!e.prompt || !e.explanation || !e.title || !e.skill) throw new Error('Exercice incomplet : ' + e.id);
    });
    return {
      module: moduleId, list: list, count: list.length, check: check,
      byId: function (id) { return list.filter(function (e) { return e.id === id; })[0]; }
    };
  }

  function v(s) { return '<var>' + s + '</var>'; }

  return { qcm: qcm, concept: concept, check: check, series: series, v: v, M: M };
});
