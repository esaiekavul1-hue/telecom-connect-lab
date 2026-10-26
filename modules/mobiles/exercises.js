/*
 * TELECOM CONNECT LAB — Module « Réseaux mobiles » : exercices
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/exercise-kit.js') : root.TCL.exerciseKit;
  var Mo = node ? require('./mobile-math.js') : root.TCL.mobileMath;
  var api = factory(K, Mo, K.M);
  if (node) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL.exercises = root.TCL.exercises || {}; root.TCL.exercises.mobiles = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (K, Mo, M) {
  'use strict';
  var v = K.v, fN = M.formatNumber, list = [];

  (function () {
    var N = Mo.clusterSize(2, 1);
    list.push({ id: 'e1', title: 'Taille d’un motif de réutilisation', skill: 'Motif de réutilisation', type: 'numeric',
      prompt: '<p>Pour trouver la cellule qui réutilise les mêmes fréquences, on avance de ' + v('i') + ' = 2 cellules, on tourne de 60°, puis on avance de ' + v('j') + ' = 1 cellule. Quelle est la taille ' + v('N') + ' du motif ?</p>',
      answer: N, unit: 'cellules', tol: { rel: 0 },
      explanation: '<p>N = i² + i·j + j² = 4 + 2 + 1 = ' + N + '. C’est le motif à 7 cellules, très utilisé en 2G.</p>' });
  })();

  (function () {
    var R = 2, N = 7, D = Mo.reuseDistance(R, N);
    list.push({ id: 'e2', title: 'Distance de réutilisation', skill: 'Distance de réutilisation', type: 'numeric',
      prompt: '<p>Des cellules de rayon ' + v('R') + ' = 2 km sont organisées en motif ' + v('N') + ' = 7. Quelle est la distance de réutilisation ' + v('D') + ', <strong>en km</strong> ? (arrondie au centième)</p>',
      answer: D, unit: 'km', tol: { abs: 0.011 }, approx: true,
      explanation: '<p>D = R √(3N) = 2 × √21 = 2 × 4,583 ≈ ' + fN(D, 3) + ' km : deux cellules qui utilisent les mêmes fréquences sont séparées d’environ 9 km.</p>' });
  })();

  (function () {
    var ci = Mo.toDb(Mo.carrierToInterference(7, 4));
    list.push({ id: 'e3', title: 'Rapport porteuse sur interférences', skill: 'Interférences', type: 'numeric',
      prompt: '<p>Avec un motif ' + v('N') + ' = 7 et un exposant d’affaiblissement ' + v('n') + ' = 4, calculez le rapport C/I ≈ Q<sup>n</sup>/6 (six interférents), <strong>en dB</strong>, arrondi au dixième.</p>',
      answer: ci, unit: 'dB', tol: { abs: 0.11 }, approx: true,
      explanation: '<p>Q = √(3N) = √21 ≈ 4,583. Q⁴ = 21² = 441. C/I = 441/6 = 73,5, soit 10 log₁₀(73,5) ≈ ' + fN(ci, 3) + ' dB.</p>' });
  })();

  (function () {
    var S = 420, N = 7, c = Mo.channelsPerCell(S, N);
    list.push({ id: 'e4', title: 'Canaux par cellule', skill: 'Capacité', type: 'numeric',
      prompt: '<p>Un opérateur dispose de ' + S + ' canaux et utilise un motif de ' + N + ' cellules. Combien de canaux chaque cellule peut-elle utiliser ?</p>',
      answer: c, unit: 'canaux', tol: { rel: 0 },
      explanation: '<p>Les canaux sont répartis entre les ' + N + ' cellules du motif : ' + S + ' / ' + N + ' = ' + c + ' canaux par cellule.</p>' });
  })();

  (function () {
    var area = 300, R = 2, n = Mo.cellsToCover(area, R);
    list.push({ id: 'e5', title: 'Nombre de cellules pour une ville', skill: 'Couverture', type: 'numeric',
      prompt: '<p>Une ville de ' + area + ' km² doit être couverte par des cellules hexagonales de rayon 2 km (surface d’une cellule : (3√3/2) R²). Combien de cellules faut-il au minimum ?</p>',
      answer: n, unit: 'cellules', tol: { rel: 0 },
      explanation: '<p>Surface d’une cellule : 2,598 × 2² ≈ ' + fN(Mo.cellArea(R), 3) + ' km². Nombre de cellules : ' + area + ' / ' + fN(Mo.cellArea(R), 3) + ' ≈ ' + fN(area / Mo.cellArea(R), 3) + ', arrondi à l’entier supérieur : ' + n + ' cellules.</p>' });
  })();

  (function () {
    var S = 168, before = Mo.channelsPerCell(S, 7), after = Mo.channelsPerCell(S, 3);
    var ciB = Mo.toDb(Mo.carrierToInterference(7, 4)), ciA = Mo.toDb(Mo.carrierToInterference(3, 4));
    var q = K.qcm([
      { label: 'Plus de canaux par cellule, mais un C/I plus faible.', value: 'more-worse' },
      { label: 'Moins de canaux par cellule, mais un C/I meilleur.', value: 'less-better' },
      { label: 'Plus de canaux par cellule et un meilleur C/I.', value: 'more-better' },
      { label: 'Aucun changement : seul le rayon compte.', value: 'same' }
    ], (after > before ? 'more' : 'less') + '-' + (ciA > ciB ? 'better' : 'worse'), function (a, b) { return a === b; });
    list.push({ id: 'e6', title: 'Effet d’un motif plus petit', skill: 'Compromis qualité / capacité', type: 'qcm',
      prompt: '<p>Un opérateur dispose de ' + S + ' canaux et passe d’un motif N = 7 à un motif N = 3 (n = 4). Quel est l’effet ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>Canaux par cellule : ' + S + '/7 = ' + before + ' → ' + S + '/3 = ' + after + '. Mais les cellules qui partagent les fréquences sont plus proches (D/R passe de 4,58 à 3) : C/I passe de ' + fN(ciB, 3) + ' dB à ' + fN(ciA, 3) + ' dB.</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'Le passage d’une communication en cours d’une cellule à une autre, sans coupure.', ok: true },
      { label: 'Le choix de la fréquence par l’abonné.' },
      { label: 'La mise en veille du téléphone quand il n’est pas utilisé.' },
      { label: 'L’envoi d’un SMS à plusieurs destinataires.' }
    ]);
    list.push({ id: 'e7', title: 'Le transfert intercellulaire', skill: 'Mobilité', type: 'qcm',
      prompt: '<p>Qu’est-ce qu’un <strong>handover</strong> (transfert intercellulaire) ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>Le téléphone mesure les stations voisines. Quand l’une devient nettement meilleure que la station actuelle, le réseau transfère la communication vers elle : c’est le handover. Une marge de quelques dB évite les transferts répétés à la frontière.</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: '2G (GSM)' }, { label: '3G (UMTS)' }, { label: '4G (LTE)', ok: true }, { label: 'Aucune : l’OFDMA n’est utilisé que par le Wi-Fi.' }
    ]);
    list.push({ id: 'e8', title: 'Les générations mobiles', skill: 'Générations 2G à 5G', type: 'qcm',
      prompt: '<p>Quelle génération de réseau mobile a, la première, utilisé l’accès <strong>OFDMA</strong> (également utilisé par la 5G) ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>La 2G utilise le TDMA/FDMA, la 3G le W-CDMA. La 4G (LTE) a introduit l’OFDMA, qui répartit les données sur de nombreuses sous-porteuses ; la 5G NR l’a repris.</p>' });
  })();

  (function () {
    var ratio = Mo.cellsToCover(1000, 1) / Mo.cellsToCover(1000, 2);
    list.push({ id: 'e9', title: 'Découper les cellules', skill: 'Capacité', type: 'numeric',
      prompt: '<p>Sur une même zone, on divise le rayon des cellules par 2 (de 2 km à 1 km), sans changer le motif. Par combien la capacité totale (nombre de communications simultanées sur la zone) est-elle environ multipliée ?</p>',
      answer: 4, unit: '', tol: { rel: 0.03 },
      explanation: '<p>La surface d’une cellule est proportionnelle à R² : divisée par 4. Il faut donc environ 4 fois plus de cellules (exemple sur 1 000 km² : ' + Mo.cellsToCover(1000, 2) + ' → ' + Mo.cellsToCover(1000, 1) + ' cellules, rapport ' + fN(ratio, 3) + '), chacune ayant autant de canaux : capacité ×4.</p>' });
  })();

  return K.series('mobiles', list);
});
