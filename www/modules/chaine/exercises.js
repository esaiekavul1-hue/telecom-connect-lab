/*
 * TELECOM CONNECT LAB — Module « Chaîne de transmission » : exercices
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/exercise-kit.js') : root.TCL.exerciseKit;
  var C = node ? require('./chain-math.js') : root.TCL.chainMath;
  var api = factory(K, C, K.M);
  if (node) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL.exercises = root.TCL.exercises || {}; root.TCL.exercises.chaine = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (K, C, M) {
  'use strict';
  var v = K.v, fN = M.formatNumber, list = [];

  (function () {
    var fe = 8000, n = 8, D = fe * n / 1000;
    list.push({ id: 'e1', title: 'Débit d’une voix numérisée', skill: 'Codage de source', type: 'numeric',
      prompt: '<p>La voix téléphonique est échantillonnée à ' + v('f') + '<sub>e</sub> = 8 kHz et chaque échantillon est codé sur 8 bits. Quel est le débit binaire, <strong>en kbit/s</strong> ?</p>',
      answer: D, unit: 'kbit/s', tol: { rel: 0.001 },
      explanation: '<p>D = ' + v('f') + '<sub>e</sub> × ' + v('n') + ' = 8 000 échantillons/s × 8 bits = 64 000 bit/s = ' + fN(D) + ' kbit/s. C’est le débit d’une ligne téléphonique numérique classique.</p>' });
  })();

  (function () {
    var fmax = 20, fe = 2 * fmax;
    list.push({ id: 'e2', title: 'Fréquence d’échantillonnage minimale', skill: 'Échantillonnage', type: 'numeric',
      prompt: '<p>Un signal audio contient des fréquences jusqu’à ' + fmax + ' kHz. Quelle est la fréquence d’échantillonnage <strong>minimale</strong>, en kHz, d’après le théorème de Shannon–Nyquist ?</p>',
      answer: fe, unit: 'kHz', tol: { rel: 0.001 },
      explanation: '<p>Il faut ' + v('f') + '<sub>e</sub> ≥ 2 ' + v('f') + '<sub>max</sub> = 2 × ' + fmax + ' = ' + fe + ' kHz. Le CD audio utilise 44,1 kHz, un peu au-dessus, pour laisser de la marge au filtrage.</p>' });
  })();

  (function () {
    var n = 12, levels = Math.pow(2, n);
    list.push({ id: 'e3', title: 'Niveaux de quantification', skill: 'Quantification', type: 'numeric',
      prompt: '<p>Un convertisseur code chaque échantillon sur ' + n + ' bits. Combien de <strong>niveaux</strong> de quantification différents peut-il représenter ?</p>',
      answer: levels, unit: 'niveaux', tol: { rel: 0 },
      explanation: '<p>Avec ' + v('n') + ' bits, on forme 2<sup>' + v('n') + '</sup> combinaisons : 2<sup>12</sup> = ' + fN(levels) + ' niveaux. Chaque bit supplémentaire double le nombre de niveaux.</p>' });
  })();

  (function () {
    var ch = 'A', bits = C.textToBits(ch);
    list.push({ id: 'e4', title: 'Coder une lettre en ASCII', skill: 'Codage de source', type: 'text',
      prompt: '<p>En ASCII, la lettre « ' + ch + ' » a le code décimal ' + ch.charCodeAt(0) + '. Écrivez ce code <strong>en binaire sur 8 bits</strong>.</p>',
      hint: 'Huit chiffres 0 ou 1, par exemple 00110001.',
      validate: function (t) { var b = t.replace(/\s/g, ''); return /^[01]+$/.test(b) ? (b.length === 8 ? null : 'Saisissez exactement 8 bits (vous en avez saisi ' + b.length + ').') : 'Utilisez uniquement les chiffres 0 et 1.'; },
      accept: function (t) { return t.replace(/\s/g, '') === bits; }, expected: bits,
      explanation: '<p>65 = 64 + 1 = 2⁶ + 2⁰. En partant du bit de poids fort (2⁷ = 128) : 0·128 + 1·64 + 0·32 + 0·16 + 0·8 + 0·4 + 0·2 + 1·1, soit <span class="mono">' + bits + '</span>.</p>' });
  })();

  (function () {
    var Rb = 9.6, useful = Rb * C.codeRate('rep3');
    list.push({ id: 'e5', title: 'Rendement d’un code', skill: 'Codage de canal', type: 'numeric',
      prompt: '<p>Une liaison transmet 9,6 kbit/s. On protège les données avec un code à répétition (chaque bit est émis trois fois). Quel est le <strong>débit utile</strong>, en kbit/s ?</p>',
      answer: useful, unit: 'kbit/s', tol: { rel: 0.005 },
      explanation: '<p>Le rendement du code vaut R = k/n = 1/3. Débit utile = 9,6 × 1/3 = ' + fN(useful) + ' kbit/s. La protection contre les erreurs se paie en débit.</p>' });
  })();

  (function () {
    var B = 1e6, N = C.thermalNoiseDbm(B), Pr = -100, snr = Pr - N;
    list.push({ id: 'e6', title: 'Rapport signal sur bruit', skill: 'Bruit et SNR', type: 'numeric',
      prompt: '<p>Un récepteur reçoit ' + Pr + ' dBm dans une bande de 1 MHz. On ne considère que le bruit thermique (−174 dBm/Hz). Quel est le <strong>SNR en dB</strong> ? (arrondi à l’unité)</p>',
      answer: snr, unit: 'dB', tol: { abs: 0.6 }, approx: true,
      explanation: '<p>Bruit : N = −174 + 10 log₁₀(10⁶) = −174 + 60 = −114 dBm. SNR = Pr − N = −100 − (−114) = 14 dB (exactement ' + fN(snr, 3) + ' dB avec kT à 290 K).</p>' });
  })();

  (function () {
    var ber = 1e-3, Rb = 1e6, errs = ber * Rb;
    list.push({ id: 'e7', title: 'Interpréter un taux d’erreur', skill: 'Taux d’erreur binaire', type: 'numeric',
      prompt: '<p>Une liaison à 1 Mbit/s a un taux d’erreur binaire de 10⁻³. Combien de bits faux reçoit-on <strong>en moyenne par seconde</strong> ?</p>',
      answer: errs, unit: 'bits/s', tol: { rel: 0.001 },
      explanation: '<p>Bits faux par seconde = TEB × débit = 10⁻³ × 10⁶ = ' + fN(errs) + '. Un TEB de 10⁻³ paraît faible, mais il est inacceptable sans codage correcteur.</p>' });
  })();

  (function () {
    var B = 1, snrLin = 15, Cap = B * Math.log2(1 + snrLin);
    list.push({ id: 'e8', title: 'La capacité de Shannon', skill: 'Capacité', type: 'numeric',
      prompt: '<p>Un canal a une bande passante de 1 MHz et un rapport signal sur bruit de 15 (en valeur linéaire). Quelle est sa capacité de Shannon, <strong>en Mbit/s</strong> ?</p>',
      answer: Cap, unit: 'Mbit/s', tol: { rel: 0.005 },
      explanation: '<p>' + v('C') + ' = ' + v('B') + ' log₂(1 + SNR) = 1 MHz × log₂(16) = 1 × 4 = ' + fN(Cap) + ' Mbit/s. Aucun système ne peut transmettre sans erreur plus vite sur ce canal.</p>' });
  })();

  (function () {
    var received = '101', decoded = C.decode(received, 'rep3');
    var q = K.qcm([{ label: '0', value: '0' }, { label: '1', value: '1' }, { label: 'Le décodeur ne peut pas décider.', value: 'x' }, { label: 'Le bit est perdu.', value: 'y' }], decoded, function (a, b) { return a === b; });
    list.push({ id: 'e9', title: 'Décoder un code à répétition', skill: 'Correction d’erreurs', type: 'qcm',
      prompt: '<p>Avec un code à répétition (chaque bit émis trois fois), le récepteur décide les trois bits <span class="mono">' + received + '</span>. Quel bit d’information le décodeur restitue-t-il ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>Vote majoritaire : deux « 1 » contre un « 0 », le décodeur restitue ' + decoded + '. Le bit du milieu a probablement été inversé par le bruit : l’erreur est corrigée.</p>' });
  })();

  return K.series('chaine', list);
});
