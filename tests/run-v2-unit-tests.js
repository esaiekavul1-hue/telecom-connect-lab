/*
 * TELECOM CONNECT LAB 2.0 — Tests numériques et moteur de maîtrise
 * Lancement : node tests/run-v2-unit-tests.js
 * Les cas de référence du solveur sont calculés à la main, indépendamment du code.
 */
'use strict';
var assert = require('assert');
var C = require('../modules/circuits/circuit-math.js');
var EX = require('../modules/circuits/exercises.js');
var MA = require('../core/mastery.js');
var CUR = require('../core/curriculum.js');
var S = require('../core/store.js');
var gen = require('../tools/generate-assessments.js');

var passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('  ✔ ' + name); } catch (e) { failed++; console.log('  ✘ ' + name + '\n      ' + e.message); } }
function close(a, b, eps) { assert.ok(Math.abs(a - b) <= (eps || 1e-9), 'attendu ' + b + ', obtenu ' + a); }

console.log('\nSolveur de circuits : cas de référence');
test('résistance seule : 12 V sur 470 Ω', function () {
  var r = C.solveDC([{ type: 'V', id: 'E', a: 'a', b: '0', value: 12 }, { type: 'R', id: 'R', a: 'a', b: '0', value: 470 }]);
  close(r.elements.R.i, 12 / 470); close(r.elements.E.i, -12 / 470);
});
test('diviseur chargé : 12 V, 1 kΩ, 1 kΩ // 1 kΩ → 4 V', function () { close(C.dividerCircuit({ E: 12, R1: 1000, R2: 1000, RL: 1000, Ra: 0 }).v.m, 4); });
test('pont de Wheatstone équilibré : tension de pont nulle', function () {
  var r = C.solveDC([{ type: 'V', id: 'E', a: 't', b: '0', value: 10 }, { type: 'R', id: 'A', a: 't', b: 'x', value: 100 }, { type: 'R', id: 'B', a: 'x', b: '0', value: 200 }, { type: 'R', id: 'C', a: 't', b: 'y', value: 300 }, { type: 'R', id: 'D', a: 'y', b: '0', value: 600 }, { type: 'R', id: 'G', a: 'x', b: 'y', value: 50 }]);
  close(r.v.x - r.v.y, 0); close(r.elements.G.i, 0);
});
test('pont déséquilibré : valeur calculée à la main', function () {
  // E=12 V ; R1=R2=R3=100, R4=200, Rg=100 entre x et y. Équations nodales résolues à la main : Vx = 6,4615…, Vy = 7,3846…
  var r = C.solveDC([{ type: 'V', id: 'E', a: 't', b: '0', value: 12 }, { type: 'R', id: 'R1', a: 't', b: 'x', value: 100 }, { type: 'R', id: 'R2', a: 'x', b: '0', value: 100 }, { type: 'R', id: 'R3', a: 't', b: 'y', value: 100 }, { type: 'R', id: 'R4', a: 'y', b: '0', value: 200 }, { type: 'R', id: 'Rg', a: 'x', b: 'y', value: 100 }]);
  close(r.v.x, 84 / 13, 1e-9); close(r.v.y, 96 / 13, 1e-9);
});
test('superposition : source de tension + source de courant', function () {
  // 10 V – 1 kΩ – nœud n – 1 kΩ – masse, avec 2 mA injectés dans n : Vn = 5 + 1 = 6 V
  var r = C.solveDC([{ type: 'V', id: 'E', a: 's', b: '0', value: 10 }, { type: 'R', id: 'R1', a: 's', b: 'n', value: 1000 }, { type: 'R', id: 'R2', a: 'n', b: '0', value: 1000 }, { type: 'I', id: 'I', a: '0', b: 'n', value: 0.002 }]);
  close(r.v.n, 6, 1e-9);
});
test('conservation de l’énergie (fourni = absorbé) sur 200 circuits', function () {
  for (var i = 1; i <= 200; i++) {
    var p = { E: 1 + i % 29, R1: 10 + i * 37, R2: 10 + i * 53, RL: 100 + i * 11, Ra: 0.5, Rv: 1e6 };
    var r = C.dividerCircuit(p);
    close(r.delivered, r.absorbed, 1e-9);
  }
});
test('loi des nœuds vérifiée au point milieu', function () {
  var r = C.dividerCircuit({ E: 9, R1: 330, R2: 470, RL: 1000, Ra: 0, Rv: 1e6 });
  close(r.elements.R1.i, r.elements.R2.i + r.elements.RL.i + r.elements.Rv.i, 1e-12);
});
test('circuits sans solution refusés, jamais de valeur inventée', function () {
  assert.strictEqual(C.solveDC([{ type: 'V', id: 'A', a: 'x', b: '0', value: 5 }, { type: 'V', id: 'B', a: 'x', b: '0', value: 9 }]).ok, false);
  assert.strictEqual(C.solveDC([{ type: 'V', id: 'E', a: 'a', b: '0', value: 5 }, { type: 'R', id: 'R', a: 'a', b: 'f', value: 100 }, { type: 'I', id: 'I', a: 'f', b: 'g', value: 0.1 }]).ok, false);
  assert.strictEqual(C.solveDC([{ type: 'V', id: 'E', a: 'a', b: '0', value: 5 }, { type: 'R', id: 'R', a: 'a', b: '0', value: 0 }]).ok, false);
  assert.strictEqual(C.solveDC([{ type: 'R', id: 'R', a: 'a', b: 'b', value: 10 }]).ok, false);
});
test('RC : 63,2 % à τ, 99,3 % à 5τ, tension initiale prise en compte', function () {
  close(C.rcCharge(10, 1000, 1e-3, 1), 10 * (1 - Math.exp(-1))); close(C.rcCharge(10, 1000, 1e-3, 5) / 10, 1 - Math.exp(-5));
  close(C.rcCharge(10, 1000, 1e-3, 0, 4), 4);
});
test('exercices : réponses recalculées indépendamment', function () {
  var by = function (id) { return EX.byId(id).answer; };
  close(by('e1'), 25.531914893617, 1e-6); close(by('e2'), 650); close(by('e3'), 132); close(by('e4'), 8.25); close(by('e5'), 4); close(by('e6'), 0.25); close(by('e8'), 470, 1e-6);
  assert.strictEqual(EX.count, 9);
});

console.log('\nMoteur de maîtrise');
function ctx(mut, validated) {
  var state = S.emptyState(); if (mut) mut(state);
  return { state: state, validated: validated || {}, curriculum: CUR, content: { circuits: { chapters: ['c1', 'c2'], missions: ['m1', 'm2'], exercises: [{ id: 'e1', skill: 'A' }, { id: 'e2', skill: 'B' }, { id: 'e3', skill: 'B' }, { id: 'e4', skill: 'B' }] }, signaux: { chapters: ['c1'], missions: ['m1'], exercises: [{ id: 'e1', skill: 'X' }] }, 'ondes-em': { chapters: ['c1'], missions: ['m1'], exercises: [{ id: 'e1', skill: 'Y' }] } } };
}
test('sans activité : disponible, 0 %', function () { var m = MA.moduleMastery('circuits', ctx()); assert.strictEqual(m.status, 'available'); assert.strictEqual(m.percent, 0); });
test('prérequis non validé par le serveur : verrouillé, même si l’entraînement est complet', function () {
  var c = ctx(function (s) { s.lessons['ondes-em'] = { chapters: { c1: 'x' } }; s.lab['ondes-em'] = { missions: { m1: 'x' } }; s.exercises['ondes-em'] = { items: { e1: { attempts: 1, correct: 1 } } }; });
  var m = MA.moduleMastery('ondes-em', c);
  assert.strictEqual(m.status, 'locked'); assert.deepStrictEqual(m.prerequisitesMissing, ['signaux']);
  assert.strictEqual(MA.moduleMastery('ondes-em', Object.assign(c, { validated: { signaux: {} } })).status, 'ready');
});
function full(s) { s.lessons.circuits = { chapters: { c1: 'x', c2: 'x' } }; s.lab.circuits = { missions: { m1: 'x' } }; s.exercises.circuits = { items: { e1: { attempts: 1, correct: 1 }, e2: { attempts: 1, correct: 1 }, e3: { attempts: 1, correct: 1 } } }; }
test('seuils atteints : prêt, mais jamais validé sans le serveur', function () { var m = MA.moduleMastery('circuits', ctx(full)); assert.strictEqual(m.status, 'ready'); assert.ok(m.percent <= 90); assert.strictEqual(m.validated, null); });
test('seuils configurables', function () { var c = ctx(full); c.thresholds = { exercises: 100 }; assert.strictEqual(MA.moduleMastery('circuits', c).status, 'in_progress'); });
test('validation du serveur : validé à 100 %', function () { var m = MA.moduleMastery('circuits', ctx(null, { circuits: { source: 'assessment' } })); assert.strictEqual(m.status, 'validated'); assert.strictEqual(m.percent, 100); });
test('remédiation : compétences échouées regroupées, sans compter les réussites', function () {
  var w = MA.weakSkills('circuits', ctx(function (s) { s.exercises.circuits = { items: { e1: { attempts: 2, correct: 1 }, e2: { attempts: 1, correct: 0 }, e3: { attempts: 3, correct: 0 } } }; }));
  assert.deepStrictEqual(w, [{ skill: 'B', failed: 2 }]);
});
test('recommandations : l’échec passe avant le reste', function () {
  var c = ctx(function (s) { s.lessons.signaux = { chapters: { c1: 'x' } }; }); c.failedAttempts = [{ competency: 'circuits', skills: ['B'] }];
  var r = MA.recommendations(c, 3);
  assert.strictEqual(r[0].kind, 'remediation'); assert.ok(/B/.test(r[0].text)); assert.strictEqual(r[1].kind, 'continue');
});
test('cours sans module : « à développer »', function () { assert.strictEqual(MA.courseState({ modules: [] }, ctx()).status, 'planned'); });

console.log('\nRéférentiel et banque');
test('six espaces ; modules référencés existants ; Master avec des cours réels', function () {
  assert.deepStrictEqual(CUR.spaces.map(function (s) { return s.id; }), ['preparatoire', 'l1', 'l2', 'l3', 'master', 'pro']);
  CUR.spaces.forEach(function (s) { s.courses.forEach(function (c) { c.modules.forEach(function (m) { assert.ok(CUR.competencies[m], m); }); }); });
  assert.ok(CUR.modulesOfSpace(CUR.spaceById('master')).length >= 6);
});
test('graphe des prérequis sans cycle', function () {
  var seen = {};
  function visit(id, path) { assert.ok(path.indexOf(id) < 0, 'cycle : ' + path.concat(id)); if (seen[id]) return; CUR.competencies[id].prerequisites.forEach(function (p) { visit(p, path.concat(id)); }); seen[id] = 1; }
  Object.keys(CUR.competencies).forEach(function (id) { visit(id, []); });
});
test('évaluations : prérequis identiques au référentiel', function () {
  gen.assessments().forEach(function (a) { if (a.competency) assert.deepStrictEqual(a.prerequisites, CUR.competencies[a.competency].prerequisites); else assert.deepStrictEqual(a.prerequisites, []); });
});
test('banque : variantes distinctes, QCM à bonne réponse unique, valeurs finies', function () {
  gen.assessments().forEach(function (a) {
    assert.ok(a.questions.length >= a.count, a.id);
    a.questions.forEach(function (q) {
      var prompts = {};
      q.variants.forEach(function (v) {
        if (q.kind !== 'qcm' || q.variants.length === 1) { assert.ok(!prompts[v.prompt] , q.id + ' : variante en double'); prompts[v.prompt] = 1; }
        assert.ok(v.prompt && v.explanation, q.id);
        if (q.kind === 'numeric') assert.ok(isFinite(v.answer.value), q.id);
        if (q.kind === 'qcm') { var ids = v.options.map(function (o) { return o.id; }); assert.ok(ids.indexOf(v.answer.id) >= 0, q.id); assert.strictEqual(new Set(v.options.map(function (o) { return o.label; })).size, v.options.length, q.id); }
      });
    });
  });
});

console.log('\nParcours');
function ids(x) { return x.slice().sort(); }
test('Licence 1 : ses modules, sans ceux des autres niveaux', function () {
  var m = CUR.trackModules('l1', null);
  assert.deepStrictEqual(ids(m.core), ['ac', 'analyse', 'chaine', 'circuits', 'diodes', 'fourier', 'iot-capteurs', 'ip', 'mesures', 'signaux', 'systemes']); assert.deepStrictEqual(ids(m.prerequisites), ['binaire', 'iot-intro', 'ordinateur']); assert.ok(m.core.indexOf('fibre') < 0);
});
test('Licence 2 : le prérequis venu d’un autre niveau est identifié à part', function () {
  var m = CUR.trackModules('l2', null);
  assert.ok(m.core.indexOf('fibre') >= 0 && m.core.indexOf('circuits') < 0); assert.ok(m.prerequisites.indexOf('signaux') >= 0 && m.prerequisites.indexOf('circuits') >= 0); assert.ok(m.core.indexOf('5g') < 0);
});
test('Licence 3 : mobiles et tous ses prérequis', function () {
  var m = CUR.trackModules('l3', null); assert.ok(m.core.indexOf('mobiles') >= 0); ['modulation', 'ondes-em', 'propagation', 'signaux'].forEach(function (p) { assert.ok(m.prerequisites.indexOf(p) >= 0, p); });
});
test('Master : contenus avancés propres, pas ceux de L1', function () { var m = CUR.trackModules('master', null); assert.deepStrictEqual(ids(m.core), ['5g', 'cloud', 'ingenierie', 'iot-projets', 'rf', 'satellite']); assert.ok(m.core.indexOf('binaire') < 0); });
test('spécialisation : restreint au métier, avec ses prérequis', function () {
  var m = CUR.trackModules('pro', 'pro-fibre');
  assert.deepStrictEqual(m.core, ['fibre', 'qualite']); assert.deepStrictEqual(ids(m.prerequisites), ['chaine', 'ondes-em', 'signaux']);
  assert.ok(CUR.trackModules('pro', 'pro-iot').core.indexOf('iot-mqtt') >= 0); assert.ok(CUR.trackModules('pro', 'pro-iot').core.indexOf('fibre') < 0);
});
test('fermeture des prérequis : chaque évaluation d’un parcours a ses prérequis dans ce parcours', function () {
  CUR.trackList().forEach(function (t) { t.competencies.forEach(function (c) { CUR.competencies[c].prerequisites.forEach(function (p) { assert.ok(t.competencies.indexOf(p) >= 0, t.key + ' : ' + p); }); }); });
});
test('changement : monter exige l’entrée ; descendre, non', function () {
  var r = CUR.checkMove({ space: 'l1' }, { space: 'l2' }, { circuits: {} });
  assert.strictEqual(r.allowed, false); assert.deepStrictEqual(r.missing, ['signaux']); assert.ok(r.placements.some(function (p) { return p.id === 'placement-bases'; }));
  assert.strictEqual(CUR.checkMove({ space: 'l1' }, { space: 'l2' }, { circuits: {}, signaux: {} }).allowed, true);
  assert.strictEqual(CUR.checkMove({ space: 'l3' }, { space: 'l1' }, {}).allowed, true);
  var l1 = CUR.trackModules('l1', null), all = {}; l1.core.concat(l1.prerequisites).forEach(function (c) { all[c] = {}; });
  var locked = CUR.checkMove({ space: 'l1' }, { space: 'pro' }, { circuits: {} });
  assert.strictEqual(locked.allowed, false); assert.strictEqual(locked.missing.length, Object.keys(all).length - 1);
  assert.strictEqual(CUR.checkMove({ space: 'master' }, { space: 'pro' }, {}).allowed, false);
  assert.strictEqual(CUR.checkMove({ space: 'l1' }, { space: 'pro' }, all).allowed, true);
  var pv = {}; CUR.trackModules('preparatoire', null).core.forEach(function (c) { pv[c] = {}; });
  assert.strictEqual(CUR.checkMove({ space: 'preparatoire' }, { space: 'pro' }, pv, false, { space: 'l1' }).allowed, false, 'descendre ne réduit pas l’exigence');
  ['preparatoire', 'l1', 'l2', 'l3', 'master'].forEach(function (x) { assert.strictEqual(CUR.checkMove({ space: 'pro' }, { space: x }, {}, true).allowed, true, x); });
  assert.strictEqual(CUR.checkMove({ space: 'pro' }, { space: 'l1' }, {}).allowed, false);
  assert.strictEqual(CUR.checkMove({ space: 'l1' }, { space: 'l1' }, {}).same, true);
});
test('chaque niveau reste atteignable : l’entrée vient du niveau précédent ou d’un positionnement', function () {
  var order = ['preparatoire', 'l1', 'l2', 'l3', 'master'];
  order.slice(1).forEach(function (s, i) {
    var previous = CUR.trackList().filter(function (t) { return t.key === order[i]; })[0].competencies;
    CUR.spaceById(s).entry.forEach(function (c) {
      var viaPlacement = CUR.placements.some(function (p) { return p.grants.indexOf(c) >= 0; });
      assert.ok(previous.indexOf(c) >= 0 || viaPlacement, s + ' : ' + c);
    });
  });
});

console.log('\n' + passed + ' tests réussis, ' + failed + ' échec(s).');
process.exit(failed ? 1 : 0);
