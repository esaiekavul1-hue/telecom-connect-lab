/*
 * TELECOM CONNECT LAB — Module « Propagation radio » : exercices
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/exercise-kit.js') : root.TCL.exerciseKit;
  var P = node ? require('./propagation-math.js') : root.TCL.propMath;
  var api = factory(K, P, K.M);
  if (node) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL.exercises = root.TCL.exercises || {}; root.TCL.exercises.propagation = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (K, P, M) {
  'use strict';
  var v = K.v, fN = M.formatNumber, list = [];

  list.push({ id: 'e1', title: 'Des watts aux dBm', skill: 'Décibels', type: 'numeric',
    prompt: '<p>Un émetteur délivre 2 W. Exprimez cette puissance <strong>en dBm</strong> (arrondie au dixième).</p>',
    answer: P.wattToDbm(2), unit: 'dBm', tol: { abs: 0.06 }, approx: true,
    explanation: '<p>' + v('P') + '<sub>dBm</sub> = 10 log<sub>10</sub>(2 000 mW / 1 mW) = 10 × 3,301 ≈ <strong>' + fN(P.wattToDbm(2), 3) + ' dBm</strong>. Repère : 1 W = 30 dBm, et doubler ajoute 3 dB.</p>' });

  (function () {
    var L = P.fspl(10000, 2.4e9);
    list.push({ id: 'e2', title: 'Affaiblissement en espace libre', skill: 'Espace libre', type: 'numeric',
      prompt: '<p>Calculez l’affaiblissement en espace libre d’une liaison de 10 km à 2,4 GHz, <strong>en dB</strong> (à 0,5 dB près). Formule pratique : FSPL = 32,45 + 20 log ' + v('d') + '<sub>km</sub> + 20 log ' + v('f') + '<sub>MHz</sub>.</p>',
      answer: L, unit: 'dB', tol: { abs: 0.5 }, approx: true,
      explanation: '<p>FSPL = 32,45 + 20 log(10) + 20 log(2 400) = 32,45 + 20 + 67,60 ≈ <strong>' + fN(L, 4) + ' dB</strong>.</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'Il augmente d’environ 6 dB.', ok: true },
      { label: 'Il augmente d’environ 3 dB.' },
      { label: 'Il double (× 2 en dB).' },
      { label: 'Il augmente de 20 dB.' }
    ]);
    list.push({ id: 'e3', title: 'Doubler la distance', skill: 'Espace libre', type: 'qcm',
      prompt: '<p>En espace libre, que devient l’affaiblissement de propagation quand la distance double ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>FSPL contient 20 log<sub>10</sub>(' + v('d') + ') : multiplier ' + v('d') + ' par 2 ajoute 20 log<sub>10</sub>(2) ≈ ' + fN(P.deltaDb(2), 3) + ' dB. La puissance reçue est divisée par 4.</p>' });
  })();

  (function () {
    var pr = 20 + 3 - 100 - 5 + 3;
    list.push({ id: 'e4', title: 'Bilan de liaison', skill: 'Bilan de liaison', type: 'numeric',
      prompt: '<p>Un point d’accès émet 20 dBm avec une antenne de 3 dBi. L’affaiblissement de propagation vaut 100 dB, les murs ajoutent 5 dB et l’antenne de réception a un gain de 3 dBi. Quelle est la puissance reçue <strong>en dBm</strong> ?</p>',
      answer: pr, unit: 'dBm', tol: { abs: 0.05 },
      explanation: '<p>' + v('P') + '<sub>r</sub> = 20 + 3 − 100 − 5 + 3 = <strong>' + pr + ' dBm</strong>. En dB, on additionne les gains et on retranche les pertes.</p>' });
  })();

  (function () {
    var mg = -79 - (-85);
    var q = K.qcm([
      { label: 'Oui, avec une marge de 6 dB.', value: 'ok6' },
      { label: 'Non, il manque 6 dB.', value: 'ko6' },
      { label: 'Oui, avec une marge de 164 dB.', value: 'ok164' },
      { label: 'On ne peut pas conclure sans la fréquence.', value: 'unknown' }
    ], mg >= 0 ? 'ok6' : 'ko6', function (a, b) { return a === b; });
    list.push({ id: 'e5', title: 'La liaison fonctionne-t-elle ?', skill: 'Marge', type: 'qcm',
      prompt: '<p>Le récepteur de l’exercice précédent reçoit −79 dBm. Sa sensibilité est de −85 dBm. La liaison fonctionne-t-elle ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>Marge = ' + v('P') + '<sub>r</sub> − ' + v('S') + ' = −79 − (−85) = <strong>+' + mg + ' dB</strong> : la puissance reçue dépasse la sensibilité. La fréquence est déjà prise en compte dans l’affaiblissement.</p>' });
  })();

  (function () {
    var dc = P.breakpoint(900e6, 30, 2);
    list.push({ id: 'e6', title: 'Distance de rupture', skill: 'Réflexion sur le sol', type: 'numeric',
      prompt: '<p>Une station de base à ' + v('h') + '<sub>t</sub> = 30 m émet à 900 MHz (λ = 0,333 m) vers un récepteur à ' + v('h') + '<sub>r</sub> = 2 m. Calculez la distance de rupture ' + v('d') + '<sub>c</sub> = 4' + v('h') + '<sub>t</sub>' + v('h') + '<sub>r</sub>/λ <strong>en m</strong> (à 5 m près).</p>',
      answer: dc, unit: 'm', tol: { abs: 5 }, approx: true,
      explanation: '<p>' + v('d') + '<sub>c</sub> = 4 × 30 × 2 / 0,333 ≈ <strong>' + fN(dc, 3) + ' m</strong>. Au-delà, la puissance décroît d’environ 40 dB par décade au lieu de 20 dB.</p>' });
  })();

  (function () {
    var F1 = P.fresnelRadius(2.4e9, 1000, 1000);
    list.push({ id: 'e7', title: 'Rayon de la zone de Fresnel', skill: 'Zone de Fresnel', type: 'numeric',
      prompt: '<p>Une liaison Wi-Fi de 2 km relie deux bâtiments à 2,4 GHz (λ = 0,125 m). Quel est le rayon de la première zone de Fresnel au milieu du trajet, <strong>en m</strong> (arrondi au dixième) ?</p>',
      answer: F1, unit: 'm', tol: { abs: 0.15 }, approx: true,
      explanation: '<p>' + v('F') + '<sub>1</sub> = √(λ ' + v('d') + '<sub>1</sub> ' + v('d') + '<sub>2</sub> / (' + v('d') + '<sub>1</sub> + ' + v('d') + '<sub>2</sub>)) = √(0,125 × 1 000 × 1 000 / 2 000) = √62,5 ≈ <strong>' + fN(F1, 3) + ' m</strong>. Il faut en dégager environ 60 %, soit ' + fN(0.6 * F1, 2) + ' m sous la ligne directe.</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'Environ 6 dB.', ok: true },
      { label: '0 dB : la ligne directe n’est pas coupée.' },
      { label: 'Une perte infinie : le signal est bloqué.' },
      { label: 'Environ 20 dB.' }
    ]);
    list.push({ id: 'e8', title: 'Obstacle sur la ligne directe', skill: 'Diffraction', type: 'qcm',
      prompt: '<p>Le sommet d’une colline, assimilée à une arête mince, affleure exactement la ligne directe entre l’émetteur et le récepteur (ν = 0). Quelle perte supplémentaire provoque-t-il ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>Pour ν = 0, ' + v('J') + ' = 6,9 + 20 log<sub>10</sub>(√(0,01 + 1) − 0,1) ≈ ' + fN(P.knifeEdgeLoss(0), 3) + ' dB : la moitié du champ arrive, soit un quart de la puissance. L’obstacle bloque la moitié de la zone de Fresnel.</p>' });
  })();

  (function () {
    var hz = P.radioHorizon(25, 4) / 1000;
    list.push({ id: 'e9', title: 'Horizon radioélectrique', skill: 'Horizon', type: 'numeric',
      prompt: '<p>Un relais est installé à 25 m de hauteur ; l’antenne de réception est à 4 m. Avec ' + v('d') + ' ≈ 4,12 (√' + v('h') + '<sub>t</sub> + √' + v('h') + '<sub>r</sub>) km, quelle est la portée maximale en vue directe, <strong>en km</strong> (arrondie au dixième) ?</p>',
      answer: hz, unit: 'km', tol: { abs: 0.06 }, approx: true,
      explanation: '<p>4,12 × (√25 + √4) = 4,12 × (5 + 2) = <strong>' + fN(hz, 3) + ' km</strong>. Au-delà, la Terre masque l’émetteur, quelle que soit la puissance.</p>' });
  })();

  return K.series('propagation', list);
});
