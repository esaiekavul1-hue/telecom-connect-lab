/*
 * TELECOM CONNECT LAB — Module « Modulation » : exercices
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/exercise-kit.js') : root.TCL.exerciseKit;
  var Mo = node ? require('./modulation-math.js') : root.TCL.modMath;
  var api = factory(K, Mo, K.M);
  if (node) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL.exercises = root.TCL.exercises || {}; root.TCL.exercises.modulation = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (K, Mo, M) {
  'use strict';
  var v = K.v, fN = M.formatNumber, list = [];
  var ms = function (t) { return fN(t * 1000, 3); };

  (function () {
    var Amax = 1.6, Amin = 0.4, m = (Amax - Amin) / (Amax + Amin);
    list.push({ id: 'e1', title: 'Mesurer un indice AM', skill: 'Indice de modulation AM', type: 'numeric',
      prompt: '<p>Sur l’oscilloscope, l’enveloppe d’un signal AM varie entre ' + v('A') + '<sub>min</sub> = 0,4 V et ' + v('A') + '<sub>max</sub> = 1,6 V (voir la figure). Calculez l’indice de modulation ' + v('m') + ' (nombre décimal).</p>',
      figure: { options: function () {
        return { kind: 'xy', title: 'Signal AM mesuré', desc: 'Enveloppe entre 0,4 et 1,6 V.', x: { min: 0, max: 0.002, ticks: [0, 0.0005, 0.001, 0.0015, 0.002], format: ms, label: 'temps (ms)' }, y: { min: -2, max: 2, ticks: [-1.6, -0.4, 0, 0.4, 1.6], label: 'tension (V)' },
          series: [{ samples: 1200, fn: function (t) { return Mo.am(t, 1, m, 1000, 10000); } }], hlines: [{ y: 1.6, label: 'Amax' }, { y: 0.4, label: 'Amin' }] };
      } },
      answer: m, unit: '', tol: { abs: 0.005 },
      explanation: '<p>' + v('m') + ' = (' + v('A') + '<sub>max</sub> − ' + v('A') + '<sub>min</sub>) / (' + v('A') + '<sub>max</sub> + ' + v('A') + '<sub>min</sub>) = (1,6 − 0,4) / (1,6 + 0,4) = 1,2 / 2 = <strong>' + fN(m) + '</strong>, soit 60 %. On retrouve ' + v('A') + '<sub>c</sub> = (1,6 + 0,4)/2 = 1 V.</p>' });
  })();

  list.push({ id: 'e2', title: 'Bande passante AM', skill: 'Spectre AM', type: 'numeric',
    prompt: '<p>Une station AM transmet un son dont la fréquence maximale est 4,5 kHz. Quelle bande de fréquences occupe-t-elle, <strong>en kHz</strong> ?</p>',
    answer: Mo.amBandwidth(4.5), unit: 'kHz', tol: { rel: 0.001 },
    explanation: '<p>' + v('B') + ' = 2 ' + v('f') + '<sub>m,max</sub> = 2 × 4,5 = <strong>9 kHz</strong> : la porteuse et deux bandes latérales de 4,5 kHz de part et d’autre.</p>' });

  (function () {
    var q = K.concept([
      { label: 'À 996 kHz, 1 000 kHz et 1 004 kHz.', ok: true },
      { label: 'À 1 000 kHz seulement.' },
      { label: 'À 4 kHz et 1 000 kHz.' },
      { label: 'À 992 kHz, 1 000 kHz et 1 008 kHz.' }
    ]);
    list.push({ id: 'e3', title: 'Raies d’un spectre AM', skill: 'Spectre AM', type: 'qcm',
      prompt: '<p>Une porteuse de 1 000 kHz est modulée en amplitude par un son pur de 4 kHz. À quelles fréquences trouve-t-on des raies dans le spectre ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>Le spectre AM contient la porteuse ' + v('f') + '<sub>c</sub> et deux raies latérales à ' + v('f') + '<sub>c</sub> ± ' + v('f') + '<sub>m</sub> : 1 000 − 4 = 996 kHz et 1 000 + 4 = 1 004 kHz.</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'Il y a surmodulation : l’enveloppe se replie et le message démodulé est déformé.', ok: true },
      { label: 'Le signal est plus puissant et mieux reçu.' },
      { label: 'La bande passante est multipliée par 1,5.' },
      { label: 'La porteuse disparaît complètement.' }
    ]);
    list.push({ id: 'e4', title: 'Indice supérieur à 1', skill: 'Indice de modulation AM', type: 'qcm',
      prompt: '<p>Que se passe-t-il si l’on règle l’indice de modulation AM à ' + v('m') + ' = 1,5 ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>Pour ' + v('m') + ' &gt; 1, le terme 1 + ' + v('m') + ' cos(…) devient négatif par moments : l’enveloppe passe par zéro et se replie. Le détecteur d’enveloppe restitue alors un message déformé. La bande passante, elle, reste 2' + v('f') + '<sub>m</sub>.</p>' });
  })();

  (function () {
    var b = Mo.beta(75e3, 15e3);
    list.push({ id: 'e5', title: 'Indice de modulation FM', skill: 'Indice FM', type: 'numeric',
      prompt: '<p>Un émetteur FM a une excursion Δ' + v('f') + ' = 75 kHz pour un son de ' + v('f') + '<sub>m</sub> = 15 kHz. Calculez l’indice de modulation β.</p>',
      answer: b, unit: '', tol: { rel: 0.001 },
      explanation: '<p>β = Δ' + v('f') + ' / ' + v('f') + '<sub>m</sub> = 75 / 15 = <strong>' + fN(b) + '</strong>.</p>' });
  })();

  (function () {
    var B = Mo.carson(75e3, 15e3) / 1000;
    list.push({ id: 'e6', title: 'Règle de Carson', skill: 'Bande FM', type: 'numeric',
      prompt: '<p>Pour le même émetteur (Δ' + v('f') + ' = 75 kHz, ' + v('f') + '<sub>m</sub> = 15 kHz), estimez la bande passante avec la règle de Carson, <strong>en kHz</strong>.</p>',
      answer: B, unit: 'kHz', tol: { rel: 0.001 },
      explanation: '<p>' + v('B') + ' ≈ 2 (Δ' + v('f') + ' + ' + v('f') + '<sub>m</sub>) = 2 × (75 + 15) = <strong>' + fN(B) + ' kHz</strong>, à comparer aux 9 kHz d’une station AM.</p>' });
  })();

  (function () {
    var q = K.concept([
      { label: 'PSK', ok: true }, { label: 'ASK' }, { label: 'FSK' }, { label: 'AM' }
    ]);
    list.push({ id: 'e7', title: 'Reconnaître une modulation numérique', skill: 'Modulations numériques', type: 'qcm',
      prompt: '<p>Sur la figure, la porteuse garde la même amplitude et la même fréquence, mais elle s’inverse brutalement à certaines frontières de bits. De quelle modulation s’agit-il ?</p>',
      figure: { options: function () {
        return { kind: 'xy', title: 'Signal numérique inconnu', desc: 'Porteuse d’amplitude et de fréquence constantes, dont la phase s’inverse selon les bits.', x: { min: 0, max: 0.004, ticks: [0, 0.001, 0.002, 0.003, 0.004], format: ms, label: 'temps (ms)' }, y: { min: -1.5, max: 1.5, ticks: [-1, 0, 1], label: 'amplitude' },
          series: [{ samples: 1200, fn: function (t) { return Mo.psk(Math.min(t, 0.0039999), 1, '1001', 1000, 3000); } }], vlines: [1, 2, 3].map(function (k) { return { x: k / 1000, cls: 'scope__guide' }; }) };
      } },
      options: q.options, answer: q.answer,
      explanation: '<p>Amplitude et fréquence constantes, inversion de la sinusoïde (déphasage de 180°) lors des changements de bit : c’est une modulation de phase à deux états, la BPSK. En ASK, la porteuse disparaîtrait pour « 0 » ; en FSK, sa fréquence changerait.</p>' });
  })();

  list.push({ id: 'e8', title: 'Bits par symbole', skill: 'Débit et rapidité', type: 'numeric',
    prompt: '<p>Une liaison transmet 2 millions de symboles par seconde en 16-QAM (16 états). Quel est son débit binaire, <strong>en Mbit/s</strong> ?</p>',
    answer: 2 * Math.log2(16), unit: 'Mbit/s', tol: { rel: 0.001 },
    explanation: '<p>Chaque symbole porte log<sub>2</sub>(16) = 4 bits. ' + v('D') + ' = ' + v('R') + ' × log<sub>2</sub>(' + v('M') + ') = 2 × 4 = <strong>8 Mbit/s</strong>.</p>' });

  (function () {
    var tb = 1 / 2000;
    list.push({ id: 'e9', title: 'Durée d’un bit', skill: 'Débit et rapidité', type: 'numeric',
      prompt: '<p>Un signal FSK transmet 2 000 bit/s. Combien de temps dure un bit, <strong>en ms</strong> ?</p>',
      answer: tb * 1000, unit: 'ms', tol: { rel: 0.001 },
      explanation: '<p>' + v('T') + '<sub>b</sub> = 1/' + v('D') + ' = 1/2 000 = 0,000 5 s = <strong>0,5 ms</strong>. Pendant cette durée, le récepteur intègre le signal avant de décider.</p>' });
  })();

  return K.series('modulation', list);
});
