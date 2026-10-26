/*
 * TELECOM CONNECT LAB — Module « Fibre optique » : exercices
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/exercise-kit.js') : root.TCL.exerciseKit;
  var F = node ? require('./fiber-math.js') : root.TCL.fiberMath;
  var api = factory(K, F, K.M);
  if (node) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL.exercises = root.TCL.exercises || {}; root.TCL.exercises.fibre = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (K, F, M) {
  'use strict';
  var v = K.v, fN = M.formatNumber, list = [];
  var n1 = 1.48, n2 = 1.46;

  (function () {
    var tc = F.criticalAngle(n1, n2);
    list.push({ id: 'e1', title: 'Calculer un angle critique', skill: 'Réflexion totale', type: 'numeric',
      prompt: '<p>Le cœur d’une fibre a un indice ' + v('n') + '<sub>1</sub> = ' + fN(n1) + ' et sa gaine ' + v('n') + '<sub>2</sub> = ' + fN(n2) + '. Calculez l’angle critique θ<sub>c</sub> (mesuré depuis la normale), <strong>en degrés</strong>, arrondi au dixième.</p>',
      answer: tc, unit: '°', tol: { abs: 0.11 }, approx: true,
      explanation: '<p>sin θ<sub>c</sub> = n₂/n₁ = ' + fN(n2) + '/' + fN(n1) + ' = ' + fN(n2 / n1, 4) + ', donc θ<sub>c</sub> = arcsin(' + fN(n2 / n1, 4) + ') ≈ ' + fN(tc, 3) + '°. Un rayon qui frappe la gaine sous un angle plus grand est totalement réfléchi.</p>' });
  })();

  (function () {
    var na = F.numericalAperture(n1, n2);
    list.push({ id: 'e2', title: 'L’ouverture numérique', skill: 'Ouverture numérique', type: 'numeric',
      prompt: '<p>Pour la même fibre (' + v('n') + '<sub>1</sub> = ' + fN(n1) + ', ' + v('n') + '<sub>2</sub> = ' + fN(n2) + '), calculez l’ouverture numérique ON, arrondie au centième.</p>',
      answer: na, unit: '', tol: { abs: 0.006 }, approx: true, sig: 3,
      explanation: '<p>ON = √(n₁² − n₂²) = √(' + fN(n1 * n1, 5) + ' − ' + fN(n2 * n2, 5) + ') = √' + fN(n1 * n1 - n2 * n2, 3) + ' ≈ ' + fN(na, 3) + '.</p>' });
  })();

  (function () {
    var ta = F.acceptanceAngle(n1, n2);
    list.push({ id: 'e3', title: 'L’angle d’acceptance', skill: 'Ouverture numérique', type: 'numeric',
      prompt: '<p>Toujours pour cette fibre, quel est l’angle d’acceptance θ<sub>a</sub> (angle maximal d’entrée depuis l’air, mesuré depuis l’axe), <strong>en degrés</strong> ? (arrondi à l’unité)</p>',
      answer: ta, unit: '°', tol: { abs: 0.6 }, approx: true,
      explanation: '<p>sin θ<sub>a</sub> = ON ≈ ' + fN(F.numericalAperture(n1, n2), 3) + ', donc θ<sub>a</sub> = arcsin(' + fN(F.numericalAperture(n1, n2), 3) + ') ≈ ' + fN(ta, 3) + '°. Le cône d’acceptance a donc une demi-ouverture d’environ 14°.</p>' });
  })();

  (function () {
    var th = 30, n = 1.5, r = F.snell(1, th, n);
    list.push({ id: 'e4', title: 'Appliquer la loi de Snell-Descartes', skill: 'Réfraction', type: 'numeric',
      prompt: '<p>Un rayon passe de l’air (n = 1) dans un verre d’indice ' + fN(n) + ', avec un angle d’incidence de ' + th + '° (depuis la normale). Quel est l’angle de réfraction dans le verre, <strong>en degrés</strong> ? (arrondi au dixième)</p>',
      answer: r, unit: '°', tol: { abs: 0.11 }, approx: true,
      explanation: '<p>1 × sin 30° = 1,5 × sin θ₂, donc sin θ₂ = 0,5 / 1,5 = 0,333 et θ₂ = arcsin(0,333) ≈ ' + fN(r, 3) + '°. En entrant dans un milieu plus réfringent, le rayon se rapproche de la normale.</p>' });
  })();

  (function () {
    var b = F.budget({ pt: 0, alpha: 0.2, L: 50, splices: 5, spliceLoss: 0.1, connectors: 2, connectorLoss: 0.5 });
    list.push({ id: 'e5', title: 'Puissance reçue au bout d’une liaison', skill: 'Bilan de puissance', type: 'numeric',
      prompt: '<p>Un laser émet 0 dBm dans une fibre monomode de 50 km (0,2 dB/km). La liaison comporte 2 connecteurs (0,5 dB chacun) et 5 épissures (0,1 dB chacune). Quelle est la puissance reçue, <strong>en dBm</strong> ?</p>',
      answer: b.pr, unit: 'dBm', tol: { abs: 0.06 },
      explanation: '<p>Fibre : 0,2 × 50 = 10 dB. Connecteurs : 2 × 0,5 = 1 dB. Épissures : 5 × 0,1 = 0,5 dB. Total : ' + fN(b.total) + ' dB. Pr = 0 − ' + fN(b.total) + ' = ' + fN(b.pr) + ' dBm.</p>' });
  })();

  (function () {
    var p = { pt: -3, sens: -28, alpha: 0.35, splices: 0, spliceLoss: 0.1, connectors: 4, connectorLoss: 0.5 }, L = F.maxLength(p);
    list.push({ id: 'e6', title: 'Longueur maximale d’une liaison', skill: 'Bilan de puissance', type: 'numeric',
      prompt: '<p>Un émetteur de −3 dBm et un récepteur de sensibilité −28 dBm sont reliés par une fibre à 1 310 nm (0,35 dB/km). Les connecteurs coûtent 2 dB au total. Quelle est la longueur maximale de la liaison, <strong>en km</strong> ? (arrondie à l’unité)</p>',
      answer: L, unit: 'km', tol: { abs: 0.6 }, approx: true,
      explanation: '<p>Pertes acceptables : Pe − S = −3 − (−28) = 25 dB. Il en reste 25 − 2 = 23 dB pour la fibre : L<sub>max</sub> = 23 / 0,35 ≈ ' + fN(L, 3) + ' km (en pratique, on garde aussi une marge de sécurité de quelques dB).</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'Il faut que le cœur ait un indice plus grand que la gaine (n₁ > n₂).', ok: true },
      { label: 'Il faut que la gaine ait un indice plus grand que le cœur (n₂ > n₁).' },
      { label: 'Il faut que le cœur et la gaine aient exactement le même indice.' },
      { label: 'Il faut que la gaine soit métallique pour réfléchir la lumière.' }
    ]);
    list.push({ id: 'e7', title: 'Condition de guidage', skill: 'Réflexion totale', type: 'qcm',
      prompt: '<p>Quelle condition sur les indices est nécessaire pour que la lumière soit guidée par réflexion totale interne ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>La réflexion totale ne se produit que lorsque la lumière va d’un milieu plus réfringent vers un milieu moins réfringent : sin θc = n₂/n₁ n’a de solution que si n₂ &lt; n₁. La gaine n’est pas métallique : c’est du verre d’indice un peu plus faible.</p>' });
  })();

  (function () {
    var t = F.transitTime(100, 1.47) * 1e6;
    list.push({ id: 'e8', title: 'Temps de parcours dans la fibre', skill: 'Vitesse de la lumière', type: 'numeric',
      prompt: '<p>Combien de temps met la lumière pour parcourir 100 km de fibre d’indice 1,47 ? Réponse <strong>en microsecondes</strong> (c = 3 × 10⁸ m/s), arrondie à la dizaine.</p>',
      answer: t, unit: 'µs', tol: { abs: 6 }, approx: true,
      explanation: '<p>Vitesse : v = c/n = 3 × 10⁸ / 1,47 ≈ 2,04 × 10⁸ m/s. Temps : t = L/v = 10⁵ / 2,04 × 10⁸ ≈ 4,9 × 10⁻⁴ s ≈ ' + fN(t, 3) + ' µs. C’est une des sources de latence des réseaux : environ 5 µs par kilomètre.</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'La fibre multimode, car son cœur large capte plus de lumière.' },
      { label: 'La fibre monomode, car elle atténue peu et n’a pas de dispersion modale.', ok: true },
      { label: 'Les deux conviennent de la même façon.' },
      { label: 'Aucune : il faut un câble coaxial.' }
    ]);
    list.push({ id: 'e9', title: 'Choisir le type de fibre', skill: 'Monomode et multimode', type: 'qcm',
      prompt: '<p>Un opérateur doit relier deux villes distantes de 80 km à 100 Gbit/s. Quel type de fibre choisir ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>À 1 550 nm, une fibre monomode atténue d’environ 0,2 dB/km (16 dB sur 80 km) et ne présente pas de dispersion modale. Une multimode à 850 nm perdrait plus de 200 dB sur cette distance et limiterait fortement le débit.</p>' });
  })();

  return K.series('fibre', list);
});
