/*
 * TELECOM CONNECT LAB 2.0 — Outils d'écriture des modules de contenu
 * ------------------------------------------------------------------
 * Un module tient dans un fichier modules/<id>/<id>.js qui renvoie
 * { math, lesson, lab, exercises }, sans accès au DOM : le fichier est donc
 * chargé tel quel par les tests Node (tests/run-content-tests.js).
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var EX = node ? require('./exercise-kit.js') : root.TCL.exerciseKit;
  var S = node ? require('./schematic.js') : root.TCL.schematic;
  var api = factory(EX, S, root);
  if (node) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL.moduleKit = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (EX, S, root) {
  'use strict';
  var M = EX.M;
  function fN(x, s) { return M.formatNumber(x, s == null ? 3 : s); }
  var PREFIX = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  /** Valeur avec préfixe : si(0.0123, 'A') → « 12,3 mA ». */
  function si(x, unit, s) {
    if (x === 0 || !isFinite(x)) return fN(x, s) + ' ' + unit;
    var a = Math.abs(x);
    for (var i = 0; i < PREFIX.length; i++) if (a >= PREFIX[i][0] * 0.9995) return fN(x / PREFIX[i][0], s) + ' ' + PREFIX[i][1] + unit;
    return fN(x / 1e-12, s) + ' p' + unit;
  }
  function v(s) { return '<var>' + s + '</var>'; }
  function log10(x) { return Math.log(x) / Math.LN10; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  /** Générateur pseudo-aléatoire déterministe : les simulations bruitées sont reproductibles. */
  function rng(seed) { var a = (seed >>> 0) || 1; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /** Fonction erreur complémentaire (Numerical Recipes, erreur relative < 1,2·10⁻⁷). */
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function qf(x) { return 0.5 * erfc(x / Math.SQRT2); }
  function fromDb(x) { return Math.pow(10, x / 10); }
  function toDb(x) { return 10 * log10(x); }
  function gaussian(r) { return function () { var u = 1 - r(), w = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w); }; }

  /* -------------------------------- Rédaction -------------------------------- */

  function formula(html, cond) { return '<p class="formula">' + html + '</p>' + (cond ? '<p class="formula-note">' + cond + '</p>' : ''); }
  function defs(list) { return '<dl class="defs">' + list.map(function (d) { return '<div><dt>' + d[0] + '</dt><dd>' + d[1] + '</dd></div>'; }).join('') + '</dl>'; }
  function example(title, html) { return '<div class="worked"><p class="worked__t">Exemple résolu : ' + title + '</p>' + html + '</div>'; }
  function apply(html) { return '<div class="applied"><p class="worked__t">Dans la pratique</p>' + html + '</div>'; }
  function pitfalls(list) { return '<h3>Erreurs fréquentes à éviter</h3><ul class="pitfalls">' + list.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function summary(list) { return '<h3>Résumé</h3><ul class="summary">' + list.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function toLab(id, text) { return '<p class="to-lab"><strong>Travaux pratiques.</strong> ' + text + ' <a href="#/laboratoire/' + id + '">Ouvrir le laboratoire</a>, puis <a href="#/defis/' + id + '">passer aux exercices</a>.</p>'; }
  function table(head, rows, caption) {
    return '<div class="table-wrap"><table class="data-table">' + (caption ? '<caption>' + caption + '</caption>' : '') + '<thead><tr>' + head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function lesson(o) { return Object.assign({ figures: {} }, o, { chapters: o.chapters.map(function (c, i) { return { id: 'c' + (i + 1), title: c.title, summary: c.summary, html: Array.isArray(c.html) ? c.html.join('') : c.html }; }) }); }

  /* -------------------------------- Exercices -------------------------------- */

  function num(id, title, skill, prompt, answer, unit, tol, explanation, level) {
    return { id: id, title: title, skill: skill, type: 'numeric', prompt: prompt, answer: answer, unit: unit, tol: tol, approx: true, explanation: explanation, level: level };
  }
  function pick(id, title, skill, prompt, good, wrong, explanation, level) {
    var h = 0; String(id + title).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) & 0xffff; });
    var all = wrong.map(function (w) { return { label: w }; }); all.splice(h % (wrong.length + 1), 0, { label: good, ok: true });
    var o = EX.concept(all);
    return { id: id, title: title, skill: skill, type: 'qcm', prompt: prompt, options: o.options, answer: o.answer, explanation: explanation, level: level };
  }
  function text(id, title, skill, prompt, expected, accept, explanation, level) {
    return { id: id, title: title, skill: skill, type: 'text', prompt: prompt, expected: expected, accept: accept, explanation: explanation, level: level };
  }

  /** Enregistre un module dans le navigateur. */
  function register(api) {
    var TCL = root.TCL, id = api.lesson.id;
    TCL.lessons = TCL.lessons || {}; TCL.labs = TCL.labs || {}; TCL.exercises = TCL.exercises || {};
    TCL.lessons[id] = api.lesson;
    TCL.exercises[id] = api.exercises;
    TCL.labs[id] = TCL.labEngine.build(api.lab);
  }

  /** Laboratoire complémentaire rattaché à un module existant (registry.extraLabs). */
  function registerLab(api) { var TCL = root.TCL; TCL.labs = TCL.labs || {}; TCL.labs[api.lab.id] = TCL.labEngine.build(api.lab); }

  return { M: M, EX: EX, S: S, fN: fN, si: si, v: v, log10: log10, clamp: clamp, rng: rng, gaussian: gaussian, erfc: erfc, qf: qf, fromDb: fromDb, toDb: toDb,
    formula: formula, defs: defs, example: example, apply: apply, pitfalls: pitfalls, summary: summary, toLab: toLab, table: table, lesson: lesson,
    num: num, pick: pick, text: text, series: EX.series, register: register, registerLab: registerLab };
});
