/*
 * TELECOM CONNECT LAB 2.0 — Contrôle automatique des modules de contenu
 * Lancement : node tests/run-content-tests.js
 *
 * Partie 1 : contrôles communs à tous les modules modules/<id>/<id>.js
 *   (structure des leçons, valeurs limites des simulations, missions réalisables,
 *    corrigés d'exercices).
 * Partie 2 : cas de référence numériques, calculés indépendamment du code
 *   (tests/content-references.js).
 * Ces tests ne remplacent pas une relecture par un enseignant.
 */
'use strict';
var fs = require('fs'), path = require('path'), assert = require('assert');
var EX = require('../core/exercise-kit.js');
var CUR = require('../core/curriculum.js');
var ROOT = path.join(__dirname, '..', 'modules');

var passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; if (process.env.VERBOSE) console.log('  ✔ ' + name); } catch (e) { failed++; console.log('  ✘ ' + name + '\n      ' + e.message); } }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
var BAD = /undefined|NaN|\[object|Infinity/;
function clean(where, html) { var t = String(html), i = t.search(BAD); if (i >= 0) assert.fail(where + ' contient une valeur invalide : … ' + t.slice(Math.max(0, i - 60), i + 20)); }

var ids = fs.readdirSync(ROOT).filter(function (d) { return d !== 'decouverte' && fs.existsSync(path.join(ROOT, d, d + '.js')); });
var mods = {};
ids.forEach(function (id) { mods[id] = require(path.join(ROOT, id, id + '.js')); });
console.log('\n' + ids.length + ' modules au format déclaratif');

function evalPlot(where, p, s, m) {
  [640, 320].forEach(function (w) {
    var o = p.options(s, m, w);
    clean(where + ' titre', (o.title || '') + (o.desc || ''));
    if (o.kind && o.kind !== 'xy') return;
    assert.ok(isFinite(o.x.min) && isFinite(o.x.max) && o.x.max > o.x.min, where + ' axe x invalide ' + o.x.min + '..' + o.x.max);
    assert.ok(isFinite(o.y.min) && isFinite(o.y.max) && o.y.max > o.y.min, where + ' axe y invalide ' + o.y.min + '..' + o.y.max);
    if (o.x.log) assert.ok(o.x.min > 0, where + ' log x');
    if (o.y.log) assert.ok(o.y.min > 0, where + ' log y');
    (o.series || []).forEach(function (se) {
      var pts = se.points;
      if (!pts) { pts = []; for (var i = 0; i <= 20; i++) { var t = i / 20, x = o.x.log ? Math.pow(10, Math.log10(o.x.min) + t * (Math.log10(o.x.max) - Math.log10(o.x.min))) : o.x.min + t * (o.x.max - o.x.min); pts.push([x, se.fn(x)]); } }
      assert.ok(pts.length > 0, where + ' série vide');
      assert.ok(pts.some(function (q) { return isFinite(q[1]); }), where + ' série sans valeur finie');
    });
  });
}

function runState(lab, s, where) {
  var m = lab.model(s);
  lab.readouts.forEach(function (r) { var t = r[1](s, m); assert.strictEqual(typeof t, 'string', where + ' ' + r[0]); clean(where + ' valeur « ' + r[0] + ' »', t); });
  if (lab.expr) clean(where + ' expr', lab.expr(s, m));
  if (lab.verdict) { var v = lab.verdict(s, m); if (v) clean(where + ' verdict', v.text); }
  if (lab.schema) clean(where + ' schéma', lab.schema(s, m));
  if (lab.widget) clean(where + ' widget', lab.widget(s, m));
  clean(where + ' explication', lab.explain(s, m, null));
  (lab.plots || []).forEach(function (p, i) { evalPlot(where + ' graphique ' + i, p, s, m); if (p.expr) clean(where + ' légende', p.expr(s, m)); });
}

ids.forEach(function (id) {
  var api = mods[id], L = api.lesson, lab = api.lab, X = api.exercises;

  test(id + ' : leçon complète', function () {
    assert.strictEqual(L.id, id);
    assert.ok(L.title && L.intro && L.prerequisites, 'titre, introduction, prérequis');
    assert.ok(L.objectives.length >= 3, 'objectifs');
    assert.ok(L.sources && L.sources.length, 'références');
    assert.ok(L.chapters.length >= 3, 'au moins 3 chapitres');
    var all = L.chapters.map(function (c) { return c.html; }).join('');
    clean(id + ' leçon', all);
    assert.ok(/class="formula"/.test(all), 'formule');
    assert.ok(/class="worked"/.test(all), 'exemple résolu');
    assert.ok(/class="pitfalls"/.test(all), 'erreurs fréquentes');
    assert.ok(/class="summary"/.test(all), 'résumé');
    assert.ok(/class="to-lab"/.test(all), 'transition vers le laboratoire');
    assert.ok(/class="defs"/.test(all), 'définitions');
    L.chapters.forEach(function (c) {
      assert.ok(c.title && c.summary, c.id);
      assert.ok(c.html.replace(/<[^>]+>/g, ' ').split(/\s+/).length >= 90, c.id + ' trop court');
      (c.html.match(/data-fig="([^"]+)"/g) || []).forEach(function (f) { assert.ok(L.figures[f.slice(10, -1)], 'figure ' + f); });
    });
    assert.ok(/data-fig=/.test(all), 'au moins une figure');
    Object.keys(L.figures).forEach(function (k) {
      var fg = L.figures[k];
      assert.ok(fg.caption, k);
      if (fg.svg) clean(id + ' figure ' + k, fg.svg()); else evalPlot(id + ' figure ' + k, { options: function (s, m, w) { return fg.options(w); } }, null, null);
      assert.ok(all.indexOf('data-fig="' + k + '"') >= 0, 'figure inutilisée ' + k);
    });
  });

  test(id + ' : exercices corrigés', function () {
    assert.strictEqual(X.module, id);
    assert.ok(X.count >= 6, 'au moins 6 exercices');
    X.list.forEach(function (e) {
      clean(id + '/' + e.id, e.prompt + e.explanation + e.title);
      if (e.type === 'numeric') {
        assert.ok(isFinite(e.answer), e.id + ' réponse');
        assert.ok(e.tol && (e.tol.abs != null || e.tol.rel != null), e.id + ' tolérance');
        assert.strictEqual(EX.check(e, String(e.answer).replace('.', ',')).correct, true, e.id + ' réponse exacte refusée');
        assert.strictEqual(EX.check(e, String(e.answer * 1.5 + 1)).correct, false, e.id + ' mauvaise réponse acceptée');
      } else if (e.type === 'qcm') {
        assert.strictEqual(EX.check(e, e.answer).correct, true, e.id);
        assert.strictEqual(new Set(e.options.map(function (o) { return o.label; })).size, e.options.length, e.id + ' propositions en double');
        clean(id + '/' + e.id, e.options.map(function (o) { return o.label; }).join(' '));
      } else {
        assert.strictEqual(EX.check(e, e.expected).correct, true, e.id + ' réponse attendue refusée');
      }
    });
    assert.ok(new Set(X.list.map(function (e) { return e.skill; })).size >= 2, 'au moins 2 compétences');
  });

  test(id + ' : laboratoire, valeurs de départ', function () {
    assert.strictEqual(lab.id, id);
    assert.ok(lab.title && lab.short && lab.icon && lab.badge && lab.text && lab.summary, 'présentation');
    assert.ok(lab.limits && lab.limits.length > 60, 'limites du modèle');
    assert.ok(lab.missions.length >= 3, 'au moins 3 missions');
    assert.ok(lab.plots || lab.schema || lab.widget, 'représentation');
    lab.params.filter(function (p) { return p.k; }).forEach(function (p) {
      var d = lab.defaults[p.k];
      assert.ok(d !== undefined, p.k + ' sans valeur de départ');
      if (p.opts) assert.ok(p.opts.some(function (o) { return o[0] === d; }), p.k + ' départ hors liste');
      else { assert.ok(d >= p.min && d <= p.max, p.k + ' départ hors limites'); if (p.log) assert.ok(p.min > 0, p.k + ' log'); }
    });
    runState(lab, clone(lab.defaults), id + ' départ');
  });

  test(id + ' : laboratoire, valeurs limites', function () {
    var params = lab.params.filter(function (p) { return p.k; });
    function ends(p) { return p.opts ? p.opts.map(function (o) { return o[0]; }) : [p.min, p.max]; }
    params.forEach(function (p) { ends(p).forEach(function (v) { var s = clone(lab.defaults); s[p.k] = v; runState(lab, s, id + ' ' + p.k + '=' + v); }); });
    [0, 1].forEach(function (side) { var s = clone(lab.defaults); params.forEach(function (p) { var e = ends(p); s[p.k] = side ? e[e.length - 1] : e[0]; }); runState(lab, s, id + ' toutes ' + (side ? 'max' : 'min')); });
    var seed = 12345;
    function r() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 60; i++) {
      var s = clone(lab.defaults);
      params.forEach(function (p) { if (p.opts) s[p.k] = p.opts[Math.floor(r() * p.opts.length)][0]; else s[p.k] = p.log ? Math.pow(10, Math.log10(p.min) + r() * (Math.log10(p.max) - Math.log10(p.min))) : p.min + r() * (p.max - p.min); });
      runState(lab, s, id + ' aléatoire');
    }
  });

  test(id + ' : laboratoire, actions', function () {
    if (!lab.actions) return;
    var s = clone(lab.defaults);
    for (var round = 0; round < 40; round++) {
      Object.keys(lab.actions).forEach(function (name) {
        var html = lab.widget ? lab.widget(s, lab.model(s)) : '', re = new RegExp('data-act="' + name + '"(?: data-arg="([^"]*)")?', 'g'), m, args = [];
        while ((m = re.exec(html))) args.push(m[1]);
        (args.length ? args : [undefined]).slice(0, 12).forEach(function (a) { lab.actions[name](s, a); });
      });
      runState(lab, s, id + ' après actions');
    }
  });

  test(id + ' : missions réalisables et non acquises au départ', function () {
    var ms = {};
    lab.missions.forEach(function (m) {
      assert.ok(!ms[m.id], 'mission en double'); ms[m.id] = 1;
      assert.ok(m.title && m.text && m.solution, m.id + ' incomplète');
      var d = clone(lab.defaults), rd = m.check(d, lab.model(d));
      assert.ok(rd && typeof rd.msg === 'string' && rd.msg, m.id + ' retour');
      clean(m.id + ' retour', rd.msg);
      assert.strictEqual(rd.ok, false, m.id + ' déjà réussie au départ');
      var s = clone(lab.defaults);
      if (typeof m.solution === 'function') m.solution(s, lab.actions); else Object.assign(s, m.solution);
      var r2 = m.check(s, lab.model(s));
      assert.strictEqual(r2.ok, true, m.id + ' : la solution de référence échoue (' + r2.msg + ')');
      clean(m.id + ' réussite', r2.msg);
    });
  });
});

console.log('\nRéférentiel');
test('chaque module du référentiel existe (V1 ou déclaratif)', function () {
  Object.keys(CUR.competencies).forEach(function (id) { assert.ok(fs.existsSync(path.join(ROOT, id)), 'dossier manquant : ' + id); });
  ids.filter(function (i) { return i !== 'decouverte'; }).forEach(function (id) { assert.ok(CUR.competencies[id], 'compétence manquante : ' + id); });
});
test('chaque compétence est enseignée dans au moins un parcours', function () {
  var used = {};
  CUR.spaces.forEach(function (s) { s.courses.forEach(function (c) { c.modules.forEach(function (m) { used[m] = 1; }); }); });
  Object.keys(CUR.competencies).forEach(function (id) { assert.ok(used[id], id + ' absent des parcours'); });
});
test('aucun cours vide ; chaque parcours a du contenu', function () {
  CUR.spaces.forEach(function (s) { assert.ok(s.courses.length >= 4, s.id); s.courses.forEach(function (c) { assert.ok(c.modules.length > 0, c.id); }); });
});
test('les quatre domaines sont présents dans chaque niveau', function () {
  var D = { telecom: ['signaux', 'fourier', 'ondes-em', 'antennes', 'propagation', 'chaine', 'modulation', 'numerique', 'multiplexage', 'fibre', 'satellite', 'mobiles', '5g', 'sans-fil', 'ip', 'qualite', 'ingenierie'], elec: ['circuits', 'ac', 'analyse', 'diodes', 'transistors', 'aop', 'logique', 'can', 'mesures', 'rf'], info: ['binaire', 'ordinateur', 'systemes', 'reseaux-info', 'donnees', 'cloud', 'maintenance'], iot: ['iot-intro', 'iot-capteurs', 'iot-com', 'iot-mqtt', 'iot-energie', 'iot-projets'] };
  ['preparatoire', 'l1', 'l2', 'l3', 'master'].forEach(function (sp) {
    var t = CUR.trackModules(sp, null), all = t.core.concat(t.prerequisites);
    Object.keys(D).forEach(function (k) { assert.ok(D[k].some(function (m) { return all.indexOf(m) >= 0; }), sp + ' sans domaine ' + k); });
  });
});

var refs = fs.existsSync(path.join(__dirname, 'content-references.js')) ? require('./content-references.js') : null;
if (refs) { console.log('\nCas de référence'); refs(mods, test, assert); }

console.log('\n' + passed + ' tests réussis, ' + failed + ' échec(s).');
process.exit(failed ? 1 : 0);
