/*
 * TELECOM CONNECT LAB — Module « Circuits électriques » : exercices
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/exercise-kit.js') : root.TCL.exerciseKit;
  var C = node ? require('./circuit-math.js') : root.TCL.circuitMath;
  var api = factory(K, C, K.M);
  if (node) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL.exercises = root.TCL.exercises || {}; root.TCL.exercises.circuits = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (K, C, M) {
  'use strict';
  var v = K.v, fN = M.formatNumber, list = [];

  list.push({ id: 'e1', title: 'Appliquer la loi d’Ohm', skill: 'Loi d’Ohm', type: 'numeric',
    prompt: '<p>Une résistance de 470 Ω est alimentée sous 12 V. Calculez le courant, <strong>en mA</strong>, arrondi au dixième.</p>',
    answer: C.current(12, 470) * 1000, unit: 'mA', tol: { abs: 0.06 }, approx: true,
    explanation: '<p>' + v('I') + ' = ' + v('U') + '/' + v('R') + ' = 12 / 470 = ' + fN(C.current(12, 470) * 1000, 4) + ' mA. N’oubliez pas la conversion : 1 A = 1 000 mA.</p>' });

  list.push({ id: 'e2', title: 'Résistances en série', skill: 'Association de résistances', type: 'numeric',
    prompt: '<p>Trois résistances de 100 Ω, 220 Ω et 330 Ω sont en série. Calculez la résistance équivalente, en Ω.</p>',
    answer: C.series([100, 220, 330]), unit: 'Ω', tol: { abs: 0.5 },
    explanation: '<p>En série, les résistances s’additionnent : 100 + 220 + 330 = 650 Ω.</p>' });

  list.push({ id: 'e3', title: 'Résistances en parallèle', skill: 'Association de résistances', type: 'numeric',
    prompt: '<p>Deux résistances de 220 Ω et 330 Ω sont en parallèle. Calculez la résistance équivalente, en Ω.</p>',
    answer: C.parallel([220, 330]), unit: 'Ω', tol: { abs: 0.6 }, approx: true,
    explanation: '<p>' + v('R') + '<sub>eq</sub> = R₁R₂/(R₁+R₂) = 220 × 330 / 550 = ' + fN(C.parallel([220, 330]), 4) + ' Ω : toujours inférieure à la plus petite des deux.</p>' });

  list.push({ id: 'e4', title: 'Le diviseur de tension', skill: 'Diviseur de tension', type: 'numeric',
    prompt: '<p>Un diviseur à vide est alimenté sous 12 V, avec R₁ = 1 kΩ côté source et R₂ = 2,2 kΩ côté masse. Calculez la tension aux bornes de R₂, en V.</p>',
    answer: C.divider(12, 1000, 2200), unit: 'V', tol: { abs: 0.06 }, approx: true,
    explanation: '<p>U₂ = E · R₂/(R₁+R₂) = 12 × 2200/3200 = ' + fN(C.divider(12, 1000, 2200), 4) + ' V.</p>' });

  (function () {
    var r = C.dividerCircuit({ E: 12, R1: 1000, R2: 1000, RL: 1000, Ra: 0, Rv: null });
    list.push({ id: 'e5', title: 'Un diviseur chargé', skill: 'Diviseur de tension', type: 'numeric',
      prompt: '<p>Le diviseur 12 V, R₁ = R₂ = 1 kΩ alimente une charge de 1 kΩ, branchée en parallèle sur R₂. Calculez la tension aux bornes de la charge, en V.</p>',
      answer: r.v.m, unit: 'V', tol: { abs: 0.05 }, approx: true,
      explanation: '<p>R₂ // charge = 500 Ω, donc U = 12 × 500/1500 = ' + fN(r.v.m, 4) + ' V, au lieu de 6 V à vide : une charge fait chuter la tension du diviseur.</p>' });
  })();

  list.push({ id: 'e6', title: 'Calculer une puissance', skill: 'Puissance', type: 'numeric',
    prompt: '<p>Une résistance de 100 Ω est parcourue par 50 mA. Calculez la puissance dissipée, <strong>en W</strong>.</p>',
    answer: C.powerRI(100, 0.05), unit: 'W', tol: { abs: 0.005 },
    explanation: '<p>P = R·I² = 100 × 0,05² = 0,25 W : c’est la limite d’une résistance 1/4 W courante.</p>' });

  (function () { var o = K.concept([
    { label: 'La somme des courants entrant dans un nœud égale la somme des courants qui en sortent', ok: true },
    { label: 'La somme des tensions aux bornes d’un nœud est nulle' },
    { label: 'Le courant diminue après chaque résistance d’une branche série' },
    { label: 'La tension est identique dans tous les éléments d’une maille' }]);
    list.push({ id: 'e7', title: 'La loi des nœuds', skill: 'Lois de Kirchhoff', type: 'qcm', prompt: '<p>Que dit la loi des nœuds de Kirchhoff ?</p>', options: o.options, answer: o.answer,
      explanation: '<p>La charge ne s’accumule pas dans un nœud : ce qui entre ressort. Dans une branche série, le courant est donc le même partout.</p>' });
  })();

  list.push({ id: 'e8', title: 'La constante de temps', skill: 'Circuit RC', type: 'numeric',
    prompt: '<p>Un circuit RC comporte R = 4,7 kΩ et C = 100 µF. Calculez sa constante de temps, <strong>en ms</strong>.</p>',
    answer: C.tau(4700, 100e-6) * 1000, unit: 'ms', tol: { abs: 0.6 },
    explanation: '<p>τ = R·C = 4700 × 100·10⁻⁶ = 0,47 s = 470 ms. Après τ, le condensateur atteint environ 63 % de la tension finale.</p>' });

  (function () { var o = K.concept([
    { label: 'En parallèle sur le composant, avec une résistance interne très grande', ok: true },
    { label: 'En série avec le composant, avec une résistance interne très grande' },
    { label: 'En parallèle sur le composant, avec une résistance interne très faible' },
    { label: 'En série avec le composant, avec une résistance interne très faible' }]);
    list.push({ id: 'e9', title: 'Brancher un voltmètre', skill: 'Instruments de mesure', type: 'qcm', prompt: '<p>Comment brancher un voltmètre pour perturber le moins possible le circuit ?</p>', options: o.options, answer: o.answer,
      explanation: '<p>Le voltmètre se branche en parallèle ; sa grande résistance interne limite le courant qu’il prélève. L’ampèremètre, lui, se branche en série et doit avoir une résistance très faible.</p>' });
  })();

  return K.series('circuits', list);
});
