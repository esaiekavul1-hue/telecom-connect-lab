/*
 * TELECOM CONNECT LAB — Module « Antennes » : exercices
 * Les bonnes réponses sont calculées avec antenna-math.js (et revérifiées
 * indépendamment dans tests/run-unit-tests.js).
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/exercise-kit.js') : root.TCL.exerciseKit;
  var A = node ? require('./antenna-math.js') : root.TCL.antennaMath;
  var api = factory(K, A, K.M);
  if (node) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL.exercises = root.TCL.exercises || {}; root.TCL.exercises.antennes = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (K, A, M) {
  'use strict';
  var v = K.v, fN = M.formatNumber, D2R = Math.PI / 180;

  var list = [];

  (function () {
    var f = 100e6, L = A.wavelength(f) / 2;
    list.push({ id: 'e1', title: 'Longueur d’un dipôle demi-onde', skill: 'Dimensions', type: 'numeric',
      prompt: '<p>On veut une antenne dipôle demi-onde pour recevoir la radio FM à ' + M.formatFrequency(f) + '. Quelle est sa longueur théorique, <strong>en mètres</strong> ? (c ≈ 3 × 10⁸ m/s)</p>',
      answer: L, unit: 'm', tol: { rel: 0.01 }, approx: true,
      explanation: '<p>λ = c/f = 3 × 10⁸ / 10⁸ ≈ 3 m (exactement ' + fN(2 * L, 4) + ' m). Le dipôle mesure L ≈ λ/2 ≈ ' + fN(L, 3) + ' m. En pratique, on le raccourcit de quelques pour cent.</p>' });
  })();

  (function () {
    var dbd = 8, dbi = dbd + 2.15;
    list.push({ id: 'e2', title: 'Convertir des dBd en dBi', skill: 'Unités de gain', type: 'numeric',
      prompt: '<p>Une fiche technique indique un gain de ' + dbd + ' dBd (par rapport au dipôle demi-onde). Quel est ce gain <strong>en dBi</strong> ?</p>',
      answer: dbi, unit: 'dBi', tol: { abs: 0.06 },
      explanation: '<p>Le dipôle demi-onde a un gain de 2,15 dBi. Un gain exprimé par rapport à lui se convertit en ajoutant 2,15 dB : ' + dbd + ' + 2,15 = ' + fN(dbi, 4) + ' dBi.</p>' });
  })();

  (function () {
    var Ddb = 12, eta = 0.8, G = Ddb + 10 * Math.log10(eta);
    list.push({ id: 'e3', title: 'Du gain à la directivité', skill: 'Gain et rendement', type: 'numeric',
      prompt: '<p>Une antenne a une directivité de ' + Ddb + ' dBi et un rendement de ' + (eta * 100) + ' %. Quel est son <strong>gain en dBi</strong> ? (arrondi au dixième)</p>',
      answer: G, unit: 'dBi', tol: { abs: 0.06 },
      explanation: '<p>G = η · D, soit en décibels G<sub>dBi</sub> = D<sub>dBi</sub> + 10 log₁₀(η) = ' + Ddb + ' + 10 log₁₀(' + fN(eta) + ') = ' + Ddb + ' − ' + fN(-10 * Math.log10(eta), 3) + ' ≈ ' + fN(G, 3) + ' dBi. Les 20 % de pertes coûtent environ 1 dB.</p>' });
  })();

  (function () {
    var cfg = { type: 'half', N: 1, d: 0.5, beta: 0 };
    var hp = A.beamwidth(A.cut(cfg, 'V', 90, 0.1), 0);
    var q = K.qcm([{ label: 'environ 45°', value: 45 }, { label: 'environ 78°', value: 78 }, { label: 'environ 120°', value: 120 }, { label: '360° (omnidirectionnel)', value: 360 }], hp,
      function (a, b) { return Math.abs(a - b) < 3; });
    list.push({ id: 'e4', title: 'Lire une largeur à −3 dB', skill: 'Diagramme de rayonnement', type: 'qcm',
      prompt: '<p>Voici le diagramme <strong>vertical</strong> d’un dipôle demi-onde, en décibels. Le cercle pointillé marque −3 dB. Quelle est la largeur du lobe principal à −3 dB ?</p>',
      figure: { svg: function () { return root_polar(cfg); } },
      options: q.options, answer: q.answer,
      explanation: '<p>Le lobe principal pointe vers l’horizon (0°). Il croise le cercle à −3 dB à environ ±' + fN(hp / 2, 2) + '° : la largeur vaut environ ' + fN(hp, 3) + '°. Le dipôle est omnidirectionnel seulement dans le plan <em>horizontal</em>.</p>' });
  })();

  (function () {
    var d = 0.5, beta = -90, phi0 = A.mainDirection({ type: 'half', N: 4, d: d, beta: beta * D2R });
    var q = K.qcm([{ label: '30°', value: 30 }, { label: '45°', value: 45 }, { label: '60°', value: 60 }, { label: '90°', value: 90 }], phi0, function (a, b) { return Math.abs(a - b) < 0.5; });
    list.push({ id: 'e5', title: 'Dépointer un faisceau', skill: 'Réseaux d’antennes', type: 'qcm',
      prompt: '<p>Un réseau de 4 dipôles espacés de ' + v('d') + ' = λ/2 est alimenté avec un déphasage ' + v('β') + ' = −90° entre éléments voisins. Dans quelle direction (mesurée depuis l’axe du réseau) pointe le lobe principal ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>cos φ₀ = −β / (2π d/λ) = (π/2) / (2π × 0,5) = 0,5, donc φ₀ = ' + fN(phi0, 3) + '°. Avec β = 0, le faisceau serait perpendiculaire au réseau (90°).</p>' });
  })();

  (function () {
    var choices = [0.25, 0.5, 0.75, 1].map(function (d) { return { label: 'd = ' + fN(d) + ' λ', value: A.gratingLobes({ type: 'half', N: 4, d: d, beta: 0 }).length > 0 }; });
    // une seule proposition donne des lobes de réseau : la comparer à « vrai »
    var q = K.qcm(choices, true, function (a, b) { return a === b; });
    list.push({ id: 'e6', title: 'Repérer les lobes de réseau', skill: 'Réseaux d’antennes', type: 'qcm',
      prompt: '<p>Un réseau de 4 dipôles est alimenté en phase (β = 0). Parmi ces espacements, lequel fait apparaître des <strong>lobes de réseau</strong> (des lobes aussi forts que le lobe principal) ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>Les lobes de réseau apparaissent lorsqu’une autre direction reçoit les ondes en phase : 2π (d/λ) cos φ = 2π m avec m ≠ 0. Avec β = 0, il faut |m λ/d| ≤ 1, donc d ≥ λ. À d = λ, des lobes de réseau apparaissent dans l’axe (0° et 180°).</p>' });
  })();

  (function () {
    var delta = 60, l = A.polarizationLoss(delta).db;
    list.push({ id: 'e7', title: 'Perte de polarisation', skill: 'Polarisation', type: 'numeric',
      prompt: '<p>Une antenne d’émission verticale et une antenne de réception inclinée de ' + delta + '° par rapport à la verticale sont face à face. Quelle est la <strong>perte de polarisation en dB</strong> ? (arrondie au dixième)</p>',
      answer: l, unit: 'dB', tol: { abs: 0.06 },
      explanation: '<p>Facteur de polarisation : cos² ' + delta + '° = 0,5² = 0,25. Perte : −10 log₁₀(0,25) = ' + fN(l, 3) + ' dB. Seul un quart de la puissance est capté.</p>' });
  })();

  (function () {
    var f = 900e6, G = 1.64, Ae = A.effectiveArea(G, f) * 1e4;
    list.push({ id: 'e8', title: 'Surface effective d’un dipôle', skill: 'Surface effective', type: 'numeric',
      prompt: '<p>Un dipôle demi-onde (gain 1,64, soit 2,15 dBi) reçoit un signal à ' + M.formatFrequency(f) + '. Calculez sa surface effective ' + v('A') + '<sub>e</sub> = ' + v('G') + 'λ²/(4π), <strong>en cm²</strong>. (c = 3 × 10⁸ m/s)</p>',
      answer: Ae, unit: 'cm²', tol: { rel: 0.015 }, approx: true,
      explanation: '<p>λ = c/f = 3 × 10⁸ / 9 × 10⁸ ≈ 0,333 m, donc λ² ≈ 0,111 m². A<sub>e</sub> = 1,64 × 0,111 / (4π) ≈ 0,0145 m², soit ≈ ' + fN(Ae, 3) + ' cm². À 2,4 GHz, la même antenne ne capterait que 7 fois moins de puissance (λ² divisé par (2,4/0,9)² ≈ 7,1).</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'Elle rayonne avec la même intensité dans toutes les directions de l’espace.' },
      { label: 'Elle a les mêmes diagramme et gain à l’émission et à la réception.', ok: true },
      { label: 'Elle amplifie le signal reçu grâce à son gain.' },
      { label: 'Elle ne fonctionne qu’à une seule fréquence exacte.' }
    ]);
    list.push({ id: 'e9', title: 'Le principe de réciprocité', skill: 'Rôle de l’antenne', type: 'qcm',
      prompt: '<p>Que signifie le principe de <strong>réciprocité</strong> d’une antenne ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>Une même antenne se comporte de la même façon à l’émission et à la réception : une antenne qui envoie beaucoup d’énergie vers une direction capte aussi mieux ce qui vient de cette direction. Elle n’amplifie rien : le gain traduit une concentration de l’énergie, pas un apport.</p>' });
  })();

  // Le diagramme de l'exercice 4 est dessiné par la fonction de la simulation (navigateur uniquement).
  function root_polar(cfg) {
    var T = (typeof window !== 'undefined') ? window.TCL : null;
    return T && T.antennaPlot ? T.antennaPlot.polarSvg(A.cut(cfg, 'V', 90, 1), { plane: 'V', scale: 'db', main: 0, title: 'Diagramme vertical d’un dipôle demi-onde', desc: 'lobe principal vers l’horizon' }) : '';
  }

  return K.series('antennes', list);
});
