/*
 * TELECOM CONNECT LAB — Module « Ondes électromagnétiques » : exercices
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/exercise-kit.js') : root.TCL.exerciseKit;
  var W = node ? require('./wave-math.js') : root.TCL.waveMath;
  var api = factory(K, W, K.M);
  if (node) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL.exercises = root.TCL.exercises || {}; root.TCL.exercises['ondes-em'] = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (K, W, M) {
  'use strict';
  var v = K.v, fN = M.formatNumber, list = [];
  var C3 = 3e8; // valeur arrondie de c utilisée dans les énoncés

  (function () {
    var l = C3 / 900e6;
    list.push({ id: 'e1', title: 'Longueur d’onde du GSM', skill: 'λ = c/f', type: 'numeric',
      prompt: '<p>Un téléphone GSM émet à ' + v('f') + ' = 900 MHz. Avec ' + v('c') + ' = 3 × 10<sup>8</sup> m/s, calculez la longueur d’onde λ <strong>en cm</strong> (arrondie au dixième).</p>',
      answer: l * 100, unit: 'cm', tol: { abs: 0.06 }, approx: true,
      explanation: '<p>λ = ' + v('c') + '/' + v('f') + ' = 3 × 10<sup>8</sup> / (900 × 10<sup>6</sup>) = 0,3333 m ≈ <strong>' + fN(l * 100, 3) + ' cm</strong>. Piège classique : oublier de convertir 900 MHz en 9 × 10<sup>8</sup> Hz.</p>' });
  })();

  (function () {
    var f = C3 / 0.125;
    list.push({ id: 'e2', title: 'De la longueur d’onde à la fréquence', skill: 'f = c/λ', type: 'numeric',
      prompt: '<p>Une onde radio a une longueur d’onde de 12,5 cm dans l’air. Quelle est sa fréquence, <strong>en GHz</strong> ? (' + v('c') + ' = 3 × 10<sup>8</sup> m/s)</p>',
      answer: f / 1e9, unit: 'GHz', tol: { rel: 0.005 },
      explanation: '<p>' + v('f') + ' = ' + v('c') + '/λ = 3 × 10<sup>8</sup> / 0,125 = 2,4 × 10<sup>9</sup> Hz = <strong>2,4 GHz</strong> : c’est la bande du Wi-Fi et du Bluetooth.</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'Elle est divisée par deux.', ok: true },
      { label: 'Elle est multipliée par deux.' },
      { label: 'Elle ne change pas : seule la vitesse change.' },
      { label: 'Elle est divisée par quatre.' }
    ]);
    list.push({ id: 'e3', title: 'Doubler la fréquence', skill: 'Proportionnalité inverse', type: 'qcm',
      prompt: '<p>Dans l’air, on double la fréquence d’une onde. Que devient sa longueur d’onde ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>λ = ' + v('c') + '/' + v('f') + ' : la vitesse ' + v('c') + ' est fixe, donc λ et ' + v('f') + ' sont inversement proportionnelles. Si ' + v('f') + ' double, λ est divisée par 2.</p>' });
  })();

  (function () {
    var lc = 0.66 * C3 / 100e6;
    list.push({ id: 'e4', title: 'Longueur d’onde dans un câble', skill: 'Facteur de vitesse', type: 'numeric',
      prompt: '<p>Un signal de 100 MHz circule dans un câble coaxial de facteur de vitesse ' + v('k') + ' = 0,66. Quelle est sa longueur d’onde dans le câble, <strong>en m</strong> ? (' + v('c') + ' = 3 × 10<sup>8</sup> m/s)</p>',
      answer: lc, unit: 'm', tol: { rel: 0.005 },
      explanation: '<p>' + v('v') + ' = 0,66 × 3 × 10<sup>8</sup> = 1,98 × 10<sup>8</sup> m/s. λ = ' + v('v') + '/' + v('f') + ' = 1,98 × 10<sup>8</sup> / 10<sup>8</sup> = <strong>' + fN(lc, 3) + ' m</strong>, contre 3 m dans l’air. La fréquence, elle, reste 100 MHz.</p>' });
  })();

  (function () {
    var t = 50 / (0.66 * C3);
    list.push({ id: 'e5', title: 'Temps de propagation', skill: 'Temps de propagation', type: 'numeric',
      prompt: '<p>Combien de temps met un signal pour parcourir 50 m de ce même câble (' + v('k') + ' = 0,66) ? Répondez <strong>en nanosecondes</strong> (arrondi à l’unité).</p>',
      answer: t * 1e9, unit: 'ns', tol: { abs: 0.6 }, approx: true,
      explanation: '<p>' + v('t') + ' = ' + v('d') + '/' + v('v') + ' = 50 / (1,98 × 10<sup>8</sup>) = 2,53 × 10<sup>−7</sup> s ≈ <strong>' + fN(t * 1e9, 3) + ' ns</strong>.</p>' });
  })();

  (function () {
    var b = W.band(2.4e9);
    var q = K.qcm(W.BANDS.filter(function (x) { return ['HF', 'VHF', 'UHF', 'SHF'].indexOf(x.id) >= 0; }).map(function (x) { return { label: x.id + ' (' + M.formatFrequency(x.min) + ' – ' + M.formatFrequency(x.max) + ')', value: x.id }; }), b.id, function (a, c) { return a === c; });
    list.push({ id: 'e6', title: 'Situer une fréquence', skill: 'Bandes radio', type: 'qcm',
      prompt: '<p>Dans quelle bande de l’UIT se trouve le Wi-Fi à 2,4 GHz ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>La bande ' + b.id + ' (' + b.name + ') va de 300 MHz à 3 GHz : 2,4 GHz en fait partie. Le Wi-Fi à 5 GHz, lui, est en SHF.</p>' });
  })();

  (function () {
    var half = C3 / 1.8e9 / 2;
    list.push({ id: 'e7', title: 'Antenne demi-onde', skill: 'Taille des antennes', type: 'numeric',
      prompt: '<p>Quelle longueur doit avoir une antenne demi-onde (λ/2) pour la fréquence de 1,8 GHz (DCS 1800) ? Répondez <strong>en cm</strong>, arrondi au dixième.</p>',
      answer: half * 100, unit: 'cm', tol: { abs: 0.06 }, approx: true,
      explanation: '<p>λ = 3 × 10<sup>8</sup> / 1,8 × 10<sup>9</sup> = 0,1667 m ; λ/2 ≈ <strong>' + fN(half * 100, 3) + ' cm</strong>. Plus la fréquence monte, plus les antennes sont petites.</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'Elle est divisée par 4.', ok: true },
      { label: 'Elle est divisée par 2.' },
      { label: 'Elle est divisée par 8.' },
      { label: 'Elle ne change pas dans le vide.' }
    ]);
    list.push({ id: 'e8', title: 'Densité de puissance et distance', skill: 'Décroissance en 1/d²', type: 'qcm',
      prompt: '<p>On s’éloigne d’une antenne, de 1 km à 2 km. Que devient la densité de puissance reçue (en W/m²), en espace libre ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>' + v('S') + ' = ' + v('P') + '/(4π' + v('d') + '²) : la puissance se répartit sur une sphère dont la surface est multipliée par 2² = 4. La densité est divisée par 4, soit une baisse de 6 dB.</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'Perpendiculaires entre eux et à la direction de propagation.', ok: true },
      { label: 'Parallèles à la direction de propagation.' },
      { label: 'Parallèles entre eux et décalés d’un quart de période.' },
      { label: 'Le champ magnétique n’existe que dans les câbles.' }
    ]);
    list.push({ id: 'e9', title: 'Structure d’une onde', skill: 'Nature de l’onde', type: 'qcm',
      prompt: '<p>Dans une onde électromagnétique qui se propage dans le vide, comment sont orientés le champ électrique ' + v('E') + ' et le champ magnétique ' + v('B') + ' ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>L’onde électromagnétique est transversale : ' + v('E') + ' et ' + v('B') + ' sont perpendiculaires entre eux, perpendiculaires à la direction de propagation, et oscillent en phase.</p>' });
  })();

  return K.series('ondes-em', list);
});
