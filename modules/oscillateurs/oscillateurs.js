/*
 * TELECOM CONNECT LAB 2.0 — Laboratoire complémentaire : oscillateur à pont de Wien.
 * Modèle : équation s²R²C² + (3 − A)sRC + 1 = 0, AOP idéal, saturation abrupte.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.registerLab(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, S = K.S, TAU = 2 * Math.PI;
  function f0(R, C) { return 1 / (TAU * R * C); }
  function beta(f, fc) { var x = f / fc - fc / f; return { mag: 1 / Math.sqrt(9 + x * x), ph: -Math.atan2(x, 3) }; }
  function regime(A) { return Math.abs(A - 3) <= 0.01 ? 'entretien' : A < 3 ? 'amortie' : 'croissante'; }
  function wave(A, fc, Vsat, t) { var w = TAU * fc, z = (3 - A) / 2, d = Math.sqrt(Math.max(1 - z * z, 0)); return K.clamp(Math.exp(-z * w * t) * Math.sin(w * d * t), -Vsat, Vsat); }
  var math = { f0: f0, beta: beta, regime: regime, wave: wave };
  var NAMES = { entretien: 'Oscillation entretenue', amortie: 'Oscillation qui s’éteint', croissante: 'Amplitude croissante, limitée par la saturation' };

  var D = { R: 15, C: 10, Rf: 15, Rg: 10, Vsat: 13 };
  function M(s) { var fc = f0(s.R * 1e3, s.C * 1e-9), A = 1 + s.Rf / s.Rg, r = regime(A); return { fc: fc, A: A, loop: A / 3, r: r }; }
  var lab = { id: 'oscillateurs', title: 'Oscillateur à pont de Wien', short: 'Oscillateurs', icon: 'wave', badge: 'AOP idéal, saturation abrupte',
    text: 'Réglez le réseau de Wien et le gain : observez une oscillation qui s’éteint, qui se maintient ou qui sature.',
    summary: 'Choisissez la fréquence d’un pont de Wien et réglez le gain autour de 3 pour vérifier la condition d’oscillation.',
    params: [{ group: 'Réseau de Wien' }, { k: 'R', label: 'Résistance R', min: 1, max: 100, log: true, unit: 'kΩ', dec: 2 }, { k: 'C', label: 'Capacité C', min: 1, max: 1000, log: true, unit: 'nF', dec: 1 }, { group: 'Amplificateur' }, { k: 'Rf', label: 'R<sub>f</sub>', min: 5, max: 40, step: 0.05, unit: 'kΩ', dec: 2 }, { k: 'Rg', label: 'R<sub>g</sub>', min: 5, max: 20, step: 0.5, unit: 'kΩ', dec: 1 }, { k: 'Vsat', label: 'Limite de sortie', min: 3, max: 15, step: 0.5, unit: 'V', dec: 1 }],
    defaults: D, model: M,
    expr: function (s, m) { return 'f₀ = ' + si(m.fc, 'Hz', 4) + ' ; gain A = ' + fN(m.A, 4); },
    verdict: function (s, m) { return { ok: m.r === 'entretien', text: NAMES[m.r] }; },
    readouts: [['Fréquence f₀', function (s, m) { return si(m.fc, 'Hz', 4); }], ['Gain A = 1 + R_f/R_g', function (s, m) { return fN(m.A, 4); }], ['Gain de boucle à f₀', function (s, m) { return fN(m.loop, 4); }], ['Régime', function (s, m) { return NAMES[m.r]; }]],
    plots: [{ expr: function () { return 'Démarrage de l’oscillation (20 périodes)'; }, options: function (s, m) { var T = 20 / m.fc; return { title: 'Sortie de l’oscillateur', desc: 'Évolution de la tension de sortie au démarrage.', x: { min: 0, max: T * 1000, label: 'temps (ms)' }, y: { min: -s.Vsat * 1.15, max: s.Vsat * 1.15, label: 'V' }, series: [{ samples: 900, fn: function (t) { return wave(m.A, m.fc, s.Vsat, t / 1000); } }], hlines: [{ y: s.Vsat, label: 'limite' }, { y: -s.Vsat }] }; } },
      { expr: function () { return 'Atténuation |β| du réseau de Wien : maximum de 1/3 à f₀'; }, options: function (s, m) { return { title: 'Réseau de Wien', desc: 'Atténuation du réseau en fonction de la fréquence.', x: { min: m.fc / 30, max: m.fc * 30, log: true, label: 'fréquence (Hz)' }, y: { min: 0, max: 0.4, label: '|β|' }, series: [{ samples: 240, fn: function (f) { return beta(f, m.fc).mag; } }], vlines: [{ x: m.fc, label: 'f₀' }], hlines: [{ y: 1 / 3, label: '1/3', anchor: 'start' }] }; } }],
    explain: function (s, m) { return '<p>À f₀ = ' + si(m.fc, 'Hz', 4) + ', le réseau atténue par 3 sans déphasage. Avec A = ' + fN(m.A, 4) + ', le gain de boucle vaut ' + fN(m.loop, 4) + ' : ' + NAMES[m.r].toLowerCase() + '.</p>'; },
    missions: [
      { id: 'm1', title: 'Viser 1 kHz', text: 'Réglez R et C pour obtenir f₀ = 1 kHz, à 2 % près.', solution: { R: 10, C: 15.9 }, check: function (s, m) { return Math.abs(m.fc - 1000) <= 20 ? { ok: true, msg: 'Réussi : f₀ = ' + si(m.fc, 'Hz', 4) + '.' } : { ok: false, msg: 'f₀ = ' + si(m.fc, 'Hz', 4) + '. Ajustez R ou C.' }; } },
      { id: 'm2', title: 'Entretenir l’oscillation', text: 'Réglez le gain à 3, à 0,01 près.', solution: { Rf: 20, Rg: 10 }, check: function (s, m) { return m.r === 'entretien' ? { ok: true, msg: 'Réussi : gain de boucle égal à 1, condition de Barkhausen satisfaite.' } : { ok: false, msg: 'A = ' + fN(m.A, 4) + '. Visez R_f = 2 R_g.' }; } },
      { id: 'm3', title: 'Observer la saturation', text: 'Dépassez nettement le gain de 3 pour que la sortie atteigne la limite.', solution: { Rf: 25, Rg: 10 }, check: function (s, m) { return m.A >= 3.2 ? { ok: true, msg: 'Réussi : A = ' + fN(m.A, 4) + ', la sortie sature et se déforme.' } : { ok: false, msg: 'A = ' + fN(m.A, 4) + '. Augmentez R_f.' }; } }],
    limits: '<p>L’AOP est idéal, la saturation abrupte, et le bruit de démarrage remplacé par une condition initiale de 1 V. Un oscillateur réel stabilise son amplitude par un élément non linéaire (lampe, diodes, CAG), non représenté. L’entretien exact à A = 3 est instable en pratique.</p>' };
  return { math: math, lab: lab };
});
