/*
 * TELECOM CONNECT LAB 2.0 — Dimensionnement, diagnostic et maintenance.
 * Modèle : Erlang B (appels perdus), disponibilité stationnaire.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  function erlangB(E, m) { if (E <= 0) return 0; var inv = 1; for (var j = 1; j <= m; j++) inv = 1 + inv * j / E; return 1 / inv; }
  function channelsFor(E, gos) { for (var m = 1; m <= 2000; m++) if (erlangB(E, m) <= gos) return m; return null; }
  function traffic(callsPerHour, holdSec) { return callsPerHour * holdSec / 3600; }
  function avail(mtbf, mttr) { return mtbf / (mtbf + mttr); }
  function series(list) { return list.reduce(function (p, x) { return p * x; }, 1); }
  function parallel(a, n) { return 1 - Math.pow(1 - a, n); }
  function downtimeMin(a) { return (1 - a) * 365.25 * 24 * 60; }
  var math = { erlangB: erlangB, channelsFor: channelsFor, traffic: traffic, avail: avail, series: series, parallel: parallel, downtimeMin: downtimeMin };

  var lesson = K.lesson({ id: 'ingenierie', title: 'Dimensionnement et maintenance',
    intro: 'Un réseau se dimensionne pour une charge donnée et se maintient avec méthode. Cette leçon donne les outils pour calculer les ressources et estimer la disponibilité.',
    objectives: ['Calculer un trafic en Erlang.', 'Dimensionner un nombre de circuits par Erlang B.', 'Calculer une disponibilité série et parallèle.', 'Suivre une méthode de diagnostic.'],
    prerequisites: 'Réseaux mobiles.',
    sources: ['Page « Erlang (unit) » (formule B et forme récursive).', 'Page « Availability » (série, parallèle, MTBF/MTTR).'],
    figures: { er: { caption: 'Pour un trafic de 10 Erlangs, la probabilité de blocage chute rapidement avec le nombre de circuits.', options: function () { var pts = []; for (var m = 5; m <= 25; m++) pts.push([m, erlangB(10, m)]); return { kind: 'xy', title: 'Blocage Erlang B', desc: 'Blocage en fonction du nombre de circuits.', x: { min: 5, max: 25, label: 'circuits' }, y: { min: 1e-4, max: 1, log: true, label: 'blocage' }, series: [{ points: pts }] }; } },
      red: { caption: 'Redondance : deux équipements en parallèle réduisent fortement l’indisponibilité.', svg: function () { return S.blocks({ w: 520, h: 150, label: 'Liaison avec deux chemins redondants.', boxes: [{ id: 'a', x: 20, y: 55, w: 90, h: 44, t: 'Source' }, { id: 'b', x: 210, y: 15, w: 100, h: 44, t: 'Chemin 1' }, { id: 'c', x: 210, y: 95, w: 100, h: 44, t: 'Chemin 2' }, { id: 'd', x: 410, y: 55, w: 90, h: 44, t: 'Destination' }], links: [{ a: 'a', b: 'b' }, { a: 'a', b: 'c' }, { a: 'b', b: 'd' }, { a: 'c', b: 'd' }] }); } } },
    chapters: [
      { title: 'Trafic et Erlang', summary: 'Intensité de trafic, blocage, dimensionnement.', html: [
        '<p class="lead">Combien de circuits faut-il pour écouler les appels à l’heure chargée ? La théorie du trafic répond avec un objectif de qualité.</p>',
        K.formula(v('A') + ' = λ ' + v('h') + ', B(A, m) = (A<sup>m</sup>/m!) / ∑ (A<sup>i</sup>/i!)', 'A en Erlang, λ appels par seconde, h durée moyenne en secondes. Appels bloqués perdus, arrivées de Poisson.'),
        '<div data-fig="er"></div>',
        K.defs([['Erlang', 'Unité de trafic : un circuit occupé en permanence.'], ['Taux de blocage (GoS)', 'Part des appels refusés.'], ['Heure chargée', 'Heure de plus forte activité.']]),
        K.example('dimensionner une station', '<p>1 800 appels à l’heure chargée, de 120 s : A = 1 800 × 120 / 3 600 = ' + fN(traffic(1800, 120)) + ' Erlangs. Pour 2 % de blocage, il faut ' + channelsFor(60, 0.02) + ' circuits.</p>'),
        K.apply('<p>Un réseau de données se dimensionne autrement, par débit et files d’attente, mais les notions d’heure chargée et d’objectif de qualité restent identiques.</p>')] },
      { title: 'Disponibilité', summary: 'MTBF, MTTR, redondance.', html: [
        '<p class="lead">Un service doit fonctionner presque tout le temps. La disponibilité se calcule et se conçoit.</p>',
        K.formula(v('A') + ' = MTBF / (MTBF + MTTR), A<sub>série</sub> = ∏ A<sub>i</sub>, A<sub>parallèle</sub> = 1 − ∏(1 − A<sub>i</sub>)', 'Éléments indépendants, régime stationnaire.'),
        '<div data-fig="red"></div>',
        K.defs([['MTBF', 'Temps moyen entre deux pannes.'], ['MTTR', 'Temps moyen de réparation.'], ['Redondance', 'Présence d’un élément de secours.']]),
        K.example('redonder une liaison', '<p>Un équipement à 99 % : deux en série donnent ' + fN(series([0.99, 0.99]) * 100, 4) + ' %. En parallèle : ' + fN(parallel(0.99, 2) * 100, 5) + ' %. Une disponibilité de 99,9 % correspond à ' + fN(downtimeMin(0.999) / 60) + ' heures d’arrêt par an.</p>')] },
      { title: 'Diagnostic et maintenance', summary: 'Méthode, supervision, maintenance préventive.', html: [
        '<p class="lead">Face à une panne réseau, la méthode prime sur l’intuition.</p>',
        K.defs([['Maintenance préventive', 'Interventions planifiées avant la panne.'], ['Maintenance corrective', 'Réparation après incident.'], ['Supervision', 'Mesure continue de l’état du réseau, alarmes et historique.']]),
        K.formula('Coût d’indisponibilité = (1 − A) × durée × revenu horaire', 'Estimation simple pour comparer des solutions de redondance.'),
        K.example('une démarche', '<p>Une cellule ne fonctionne plus : vérifier l’alimentation, puis la transmission, puis le radio ; consulter les alarmes ; corriger ; vérifier ; documenter dans le journal d’intervention.</p>'),
        K.apply('<p>Sur un site isolé, le coût d’un déplacement justifie la supervision à distance et le stock de pièces de rechange critiques.</p>'),
        K.pitfalls(['<strong>Dimensionner sur la moyenne</strong> plutôt que sur l’heure chargée.', '<strong>Additionner des disponibilités</strong> : on les multiplie en série.', '<strong>Oublier une dépendance commune</strong> (une seule alimentation pour deux équipements redondants).']),
        K.summary(['A = λh, en Erlang.', 'Erlang B dimensionne pour un blocage cible.', 'Disponibilité : produit en série, complément en parallèle.', 'Le diagnostic suit une méthode et se documente.']),
        K.toLab('ingenierie', 'Dimensionnez des circuits et concevez une architecture redondante.')] }
    ] });

  var D = { calls: 600, hold: 120, m: 15, gos: 2, mtbf: 8760, mttr: 24, nS: 3, red: 1 };
  function M(s) { var A = traffic(s.calls, s.hold), B = erlangB(A, s.m), need = channelsFor(A, s.gos / 100), a0 = avail(s.mtbf, s.mttr), a = parallel(a0, s.red), sys = Math.pow(a, s.nS); return { A: A, B: B, need: need, a0: a0, a: a, sys: sys, down: downtimeMin(sys), carried: A * (1 - B) }; }
  var lab = { id: 'ingenierie', title: 'Dimensionnement Erlang et disponibilité', short: 'Dimensionnement', icon: 'shield', badge: 'Erlang B, éléments indépendants',
    text: 'Dimensionnez un groupe de circuits pour un taux de blocage, puis concevez une architecture avec redondance.',
    summary: 'Dimensionnez un nombre de circuits avec Erlang B et étudiez l’effet de la redondance sur la disponibilité.',
    params: [{ group: 'Trafic' }, { k: 'calls', label: 'Appels à l’heure chargée', min: 10, max: 10000, log: true, unit: '', dec: 0 }, { k: 'hold', label: 'Durée moyenne', min: 10, max: 600, step: 5, unit: 's', dec: 0 }, { k: 'm', label: 'Circuits', min: 1, max: 500, step: 1, unit: '', dec: 0 }, { k: 'gos', label: 'Blocage cible', min: 0.1, max: 20, step: 0.1, unit: '%', dec: 1 }, { group: 'Disponibilité' }, { k: 'mtbf', label: 'MTBF', min: 100, max: 100000, log: true, unit: 'h', dec: 0 }, { k: 'mttr', label: 'MTTR', min: 1, max: 720, log: true, unit: 'h', dec: 1 }, { k: 'nS', label: 'Éléments en série', min: 1, max: 8, step: 1, unit: '', dec: 0 }, { k: 'red', label: 'Redondance', opts: [[1, 'Aucune'], [2, 'Double'], [3, 'Triple']] }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Trafic ' + fN(m.A) + ' Erlang ; blocage ' + fN(m.B * 100) + ' %'; },
    verdict: function (s, m) { return m.B * 100 <= s.gos ? { ok: true, text: 'Blocage dans l’objectif' } : { ok: false, text: 'Blocage excessif' }; },
    readouts: [['Trafic', function (s, m) { return fN(m.A) + ' Erl'; }], ['Blocage', function (s, m) { return fN(m.B * 100) + ' %'; }], ['Circuits nécessaires', function (s, m) { return m.need ? String(m.need) : 'plus de 2000'; }], ['Trafic écoulé', function (s, m) { return fN(m.carried) + ' Erl'; }], ['Disponibilité d’un élément', function (s, m) { return fN(m.a0 * 100, 5) + ' %'; }], ['Disponibilité système', function (s, m) { return fN(m.sys * 100, 5) + ' %'; }], ['Arrêt annuel', function (s, m) { return fN(m.down / 60) + ' h'; }]],
    plots: [{ options: function (s, m) { var hi = Math.max(s.m, m.need || s.m) * 2, pts = []; for (var i = 1; i <= hi; i++) pts.push([i, Math.max(erlangB(m.A, i), 1e-6)]); return { title: 'Blocage et circuits', desc: 'Blocage en fonction du nombre de circuits.', x: { min: 1, max: hi, label: 'circuits' }, y: { min: 1e-6, max: 1, log: true, label: 'blocage' }, series: [{ points: pts }], hlines: [{ y: s.gos / 100, label: 'cible', anchor: 'start' }], points: [{ x: s.m, y: Math.max(m.B, 1e-6), label: 'réglage' }] }; } }],
    explain: function (s, m) { return '<p>' + fN(s.calls) + ' appels par heure de ' + s.hold + ' s représentent ' + fN(m.A) + ' Erlangs. Avec ' + s.m + ' circuits, ' + fN(m.B * 100) + ' % des appels sont bloqués. Il en faudrait ' + (m.need || 'plus de 2000') + ' pour ' + s.gos + ' %. Le système est disponible ' + fN(m.sys * 100, 5) + ' % du temps, soit ' + fN(m.down / 60) + ' heures d’arrêt par an.</p>'; },
    missions: [
      { id: 'm1', title: 'Atteindre l’objectif', text: 'Réglez les circuits pour un blocage inférieur à 2 %, avec le minimum de circuits (à un près).', solution: { m: 28 }, check: function (s, m) { if (s.gos !== 2) return { ok: false, msg: 'Gardez un objectif de 2 %.' }; return m.B <= 0.02 && m.need && s.m <= m.need + 1 ? { ok: true, msg: 'Réussi : ' + s.m + ' circuits pour ' + fN(m.A) + ' Erlangs.' } : { ok: false, msg: 'Blocage : ' + fN(m.B * 100) + ' %. Il faut environ ' + m.need + ' circuits.' }; } },
      { id: 'm2', title: 'Viser quatre neuf', text: 'Avec 3 éléments en série, atteignez 99,99 % de disponibilité.', solution: { nS: 3, red: 3, mtbf: 8760, mttr: 24 }, check: function (s, m) { if (s.nS !== 3) return { ok: false, msg: 'Gardez 3 éléments en série.' }; return m.sys >= 0.9999 ? { ok: true, msg: 'Réussi : ' + fN(m.sys * 100, 5) + ' %.' } : { ok: false, msg: 'Disponibilité : ' + fN(m.sys * 100, 5) + ' %. Ajoutez de la redondance ou réduisez le MTTR.' }; } },
      { id: 'm3', title: 'Réduire le temps de réparation', text: 'Sans redondance, divisez l’arrêt annuel par au moins 4 en réduisant le MTTR, avec MTBF inchangé et 3 éléments.', solution: { red: 1, mttr: 5, mtbf: 8760, nS: 3 }, check: function (s, m) { if (s.red !== 1 || s.mtbf !== 8760 || s.nS !== 3) return { ok: false, msg: 'Restez sans redondance, avec MTBF de 8 760 h et 3 éléments.' }; var ref = M(D).down; return m.down <= ref / 4 ? { ok: true, msg: 'Réussi : ' + fN(m.down / 60) + ' h d’arrêt par an.' } : { ok: false, msg: 'Arrêt : ' + fN(m.down / 60) + ' h (référence ' + fN(ref / 60) + ' h).' }; } }],
    limits: '<p>Erlang B suppose des appels bloqués perdus et des arrivées indépendantes. La disponibilité suppose des pannes indépendantes et des réparations sans file d’attente. Les causes communes (alimentation, site) peuvent rendre la redondance moins efficace que le calcul.</p>' };

  var list = [
    K.num('e1', 'Calcul de trafic', 'Trafic', '<p>300 appels par heure, durée 180 s. Calculez le trafic, en Erlang.</p>', 15, 'Erl', { rel: 0.01 }, '<p>300 × 180 / 3600 = 15 Erlangs.</p>'),
    K.num('e2', 'Erlang B', 'Trafic', '<p>A = 2 Erlangs, 3 circuits. Calculez le blocage, en %.</p>', erlangB(2, 3) * 100, '%', { rel: 0.02 }, '<p>B = (8/6)/(1 + 2 + 2 + 8/6) = ' + fN(erlangB(2, 3) * 100, 4) + ' %.</p>'),
    K.num('e3', 'Dimensionnement', 'Trafic', '<p>A = 10 Erlangs, blocage visé 1 %. Combien de circuits ?</p>', channelsFor(10, 0.01), '', { abs: 0.5 }, '<p>La plus petite valeur de m donnant B ≤ 1 % est ' + channelsFor(10, 0.01) + '.</p>'),
    K.num('e4', 'Disponibilité', 'Disponibilité', '<p>MTBF = 1 000 h, MTTR = 2 h. Calculez la disponibilité, en %.</p>', avail(1000, 2) * 100, '%', { abs: 0.05 }, '<p>1000/1002 = ' + fN(avail(1000, 2) * 100, 5) + ' %.</p>'),
    K.num('e5', 'Série', 'Disponibilité', '<p>Trois éléments à 99 %. Calculez la disponibilité totale en série, en %.</p>', 97.0299, '%', { abs: 0.05 }, '<p>0,99³ = 97,03 %.</p>'),
    K.num('e6', 'Parallèle', 'Disponibilité', '<p>Deux éléments à 95 % en parallèle. Calculez la disponibilité, en %.</p>', 99.75, '%', { abs: 0.05 }, '<p>1 − 0,05² = 99,75 %.</p>'),
    K.pick('e7', 'Dimensionner sur quoi ?', 'Trafic', '<p>Un réseau se dimensionne sur :</p>', 'l’heure chargée', ['la moyenne annuelle', 'la nuit', 'le jour le plus calme'], '<p>Il faut satisfaire la charge maximale prévisible, pas une moyenne.</p>'),
    K.pick('e8', 'Cause commune', 'Disponibilité', '<p>Deux équipements redondants branchés sur une seule alimentation :</p>', 'perdent le bénéfice de la redondance en cas de panne d’alimentation', ['ont une disponibilité doublée', 'sont indépendants', 'ne tombent jamais en panne'], '<p>L’alimentation commune est un point unique de défaillance.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('ingenierie', list) };
});
