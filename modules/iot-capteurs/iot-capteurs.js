/*
 * TELECOM CONNECT LAB 2.0 — Capteurs, actionneurs et mesures.
 * Modèle : thermistance CTN à paramètre B, diviseur, CAN, moyenne glissante, MLI.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  var T0 = 298.15;
  function ntcR(Tc, R0, B) { return R0 * Math.exp(B * (1 / (Tc + 273.15) - 1 / T0)); }
  function tempFromR(R, R0, B) { return 1 / (1 / T0 + Math.log(R / R0) / B) - 273.15; }
  function dividerV(Vcc, Rfix, Rntc) { return Vcc * Rntc / (Rfix + Rntc); }
  function code(V, Vref, n) { return K.clamp(Math.floor(V / Vref * Math.pow(2, n)), 0, Math.pow(2, n) - 1); }
  function codeToV(c, Vref, n) { return (c + 0.5) * Vref / Math.pow(2, n); }
  function rFromV(V, Vcc, Rfix) { return V >= Vcc ? Infinity : Rfix * V / (Vcc - V); }
  function movingAvg(list, n) { return list.map(function (x, i) { var a = Math.max(0, i - n + 1), s = 0; for (var j = a; j <= i; j++) s += list[j]; return s / (i - a + 1); }); }
  function pwm(duty, Vcc) { return duty * Vcc; }
  function samples(s, count) {
    var r = K.gaussian(K.rng(99)), out = [];
    for (var i = 0; i < count; i++) {
      var Tt = s.T + 2 * Math.sin(i / 25), R = ntcR(Tt, s.R0 * 1000, s.B), V = dividerV(s.Vcc, s.Rf * 1000, R) + r() * s.noise / 1000, c = code(V, s.Vcc, s.bits);
      out.push({ i: i, Tt: Tt, c: c, meas: tempFromR(rFromV(codeToV(c, s.Vcc, s.bits), s.Vcc, s.Rf * 1000), s.R0 * 1000, s.B) });
    }
    return out;
  }
  function stats(list, key) { var e = list.map(function (x) { return x[key] - x.Tt; }); var m = e.reduce(function (a, b) { return a + b; }, 0) / e.length; var sd = Math.sqrt(e.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / e.length); return { m: m, sd: sd }; }
  var math = { ntcR: ntcR, tempFromR: tempFromR, dividerV: dividerV, code: code, codeToV: codeToV, rFromV: rFromV, movingAvg: movingAvg, pwm: pwm };

  var lesson = K.lesson({ id: 'iot-capteurs', title: 'Capteurs, actionneurs et mesures',
    intro: 'Pour qu’un objet connecté soit utile, ses mesures doivent être fiables. Du capteur au nombre affiché, chaque étape introduit des erreurs qu’il faut comprendre.',
    objectives: ['Conditionner un capteur résistif par un diviseur de tension.', 'Convertir un code numérique en grandeur physique.', 'Filtrer une mesure bruitée.', 'Commander un actionneur par modulation de largeur d’impulsion.'],
    prerequisites: 'Circuits électriques ; introduction à l’IoT.',
    sources: ['Page « Thermistor » (équation à paramètre B).', 'Pages « Moving average », « Pulse-width modulation ».'],
    figures: { chain: { caption: 'Chaîne de mesure : de la grandeur physique à la donnée publiée.', svg: function () { return S.blocks({ w: 520, h: 110, label: 'Capteur, conditionnement, CAN, filtrage.', boxes: [{ id: 'a', x: 15, y: 30, w: 110, h: 50, t: 'Capteur' }, { id: 'b', x: 140, y: 30, w: 110, h: 50, t: 'Diviseur' }, { id: 'c', x: 265, y: 30, w: 110, h: 50, t: 'CAN' }, { id: 'd', x: 390, y: 30, w: 115, h: 50, t: 'Filtrage' }], links: [{ a: 'a', b: 'b' }, { a: 'b', b: 'c' }, { a: 'c', b: 'd' }] }); } },
      ntc: { caption: 'Résistance d’une CTN 10 kΩ (B = 3950) selon la température : la relation est fortement non linéaire.', options: function () { return { kind: 'xy', title: 'Thermistance CTN', desc: 'La résistance diminue quand la température augmente.', x: { min: -10, max: 80, label: 'température (°C)' }, y: { min: 1, max: 60, log: true, label: 'résistance (kΩ)' }, series: [{ samples: 200, fn: function (t) { return ntcR(t, 10, 3950); } }], points: [{ x: 25, y: 10, label: '10 kΩ à 25 °C' }] }; } } },
    chapters: [
      { title: 'Du capteur à la tension', summary: 'Grandeurs, capteurs résistifs, diviseur.', html: [
        '<p class="lead">Beaucoup de capteurs changent de résistance. Un diviseur de tension transforme cette variation en une tension mesurable.</p>',
        '<div data-fig="chain"></div>',
        K.formula(v('R') + '(T) = R₀ exp(B(1/T − 1/T₀))', 'Thermistance CTN, T et T₀ en kelvins. T₀ = 298,15 K (25 °C). B est donné par la fiche du capteur.'),
        '<div data-fig="ntc"></div>',
        K.formula(v('V') + ' = V<sub>cc</sub> R<sub>CTN</sub> / (R<sub>fixe</sub> + R<sub>CTN</sub>)', 'Diviseur à vide. Une valeur de R<sub>fixe</sub> proche de la résistance à la température utile maximise la sensibilité.'),
        K.defs([['Sensibilité', 'Variation de la sortie pour une variation de la grandeur mesurée.'], ['Justesse', 'Écart moyen à la valeur vraie.'], ['Fidélité', 'Dispersion des mesures répétées.']]),
        K.example('un point de mesure', '<p>R₀ = 10 kΩ, B = 3950, à 40 °C : R = ' + si(ntcR(40, 10000, 3950), 'Ω') + '. Avec R<sub>fixe</sub> = 10 kΩ et 3,3 V : V = ' + fN(dividerV(3.3, 10000, ntcR(40, 10000, 3950))) + ' V.</p>')] },
      { title: 'Acquisition et traitement', summary: 'Numérisation, conversion, filtrage.', html: [
        '<p class="lead">Une fois numérisée, la tension doit être reconvertie en température, puis filtrée.</p>',
        K.formula('T̂ = 1/(1/T₀ + (1/B) ln(R/R₀))', 'Inversion de l’équation à paramètre B. R calculée à partir du code CAN.'),
        K.formula('y<sub>n</sub> = (x<sub>n</sub> + … + x<sub>n−k+1</sub>)/k', 'Moyenne glissante sur k échantillons. Elle réduit le bruit, mais introduit un retard.'),
        K.defs([['Bruit', 'Variation aléatoire qui s’ajoute à la mesure.'], ['Étalonnage', 'Comparaison à une référence pour corriger une erreur.'], ['Retard de filtre', 'Temps avant de suivre une variation réelle.']]),
        K.example('moyenner', '<p>Mesures 21, 23, 22, 24 : la moyenne glissante sur 4 vaut ' + fN((21 + 23 + 22 + 24) / 4) + '. Un changement brusque ne sera entièrement visible qu’après quatre échantillons.</p>')] },
      { title: 'Commander un actionneur', summary: 'MLI, transistors, relais.', html: [
        '<p class="lead">Un microcontrôleur ne fournit pas assez de courant pour un moteur : il commande un transistor ou un relais.</p>',
        K.formula(v('V') + '<sub>moy</sub> = D · V<sub>cc</sub>', 'Signal MLI de rapport cyclique D, charge lissante (moteur, LED).'),
        K.defs([['MLI (PWM)', 'Modulation de largeur d’impulsion.'], ['Relais', 'Interrupteur commandé, isolant la charge.'], ['Diode de roue libre', 'Protège le transistor d’une charge inductive.']]),
        K.example('vitesse d’un ventilateur', '<p>12 V, rapport cyclique de 60 % : V<sub>moy</sub> = ' + fN(pwm(0.6, 12)) + ' V.</p>'),
        K.pitfalls(['<strong>Utiliser une CTN sans la linéariser.</strong>', '<strong>Filtrer trop fortement</strong> et manquer un événement rapide.', '<strong>Commander un moteur directement depuis une broche.</strong>', '<strong>Oublier l’auto-échauffement d’un capteur.</strong>']),
        K.summary(['Une CTN se conditionne par un diviseur.', 'L’équation à paramètre B convertit R en T.', 'La moyenne glissante réduit le bruit, avec un retard.', 'V<sub>moy</sub> = D·V<sub>cc</sub>.']),
        K.toLab('iot-capteurs', 'Réglez un capteur virtuel et filtrez ses mesures.')] }
    ] });

  var D = { T: 25, R0: 10, B: 3950, Rf: 10, Vcc: 3.3, bits: 8, noise: 30, win: 1, duty: 30 };
  function M(s) { var list = samples(s, 80), vals = movingAvg(list.map(function (x) { return x.meas; }), s.win); list.forEach(function (x, i) { x.flt = vals[i]; }); var raw = stats(list, 'meas'), fl = stats(list, 'flt'); return { list: list, raw: raw, fl: fl, R: ntcR(s.T, s.R0 * 1000, s.B), V: dividerV(s.Vcc, s.Rf * 1000, ntcR(s.T, s.R0 * 1000, s.B)), pwm: pwm(s.duty / 100, 12) }; }
  var lab = { id: 'iot-capteurs', title: 'Capteur de température virtuel', short: 'Capteurs et mesures', icon: 'target', badge: 'CTN idéale, bruit gaussien simulé',
    text: 'Réglez un capteur de température, choisissez un CAN, puis filtrez les mesures pour réduire le bruit.',
    summary: 'Conditionnez une thermistance, choisissez la résolution du CAN, filtrez le bruit et commandez un actionneur en MLI.',
    params: [{ group: 'Capteur' }, { k: 'T', label: 'Température réelle', min: -10, max: 80, step: 1, unit: '°C', dec: 0 }, { k: 'R0', label: 'R₀ de la CTN', min: 1, max: 100, log: true, unit: 'kΩ', dec: 1 }, { k: 'B', label: 'Paramètre B', min: 3000, max: 4500, step: 10, unit: 'K', dec: 0 }, { k: 'Rf', label: 'Résistance fixe', min: 1, max: 100, log: true, unit: 'kΩ', dec: 1 }, { group: 'Acquisition' }, { k: 'Vcc', label: 'Alimentation', opts: [[3.3, '3,3 V'], [5, '5 V']] }, { k: 'bits', label: 'Résolution', opts: [[8, '8 bits'], [10, '10 bits'], [12, '12 bits']] }, { k: 'noise', label: 'Bruit', min: 0, max: 200, step: 1, unit: 'mV', dec: 0 }, { k: 'win', label: 'Fenêtre de moyenne', min: 1, max: 40, step: 1, unit: '', dec: 0 }, { group: 'Actionneur' }, { k: 'duty', label: 'Rapport cyclique', min: 0, max: 100, step: 1, unit: '%', dec: 0 }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Écart-type brut ' + fN(m.raw.sd) + ' °C ; filtré ' + fN(m.fl.sd) + ' °C'; },
    readouts: [['Résistance CTN', function (s, m) { return si(m.R, 'Ω'); }], ['Tension de sortie', function (s, m) { return fN(m.V) + ' V'; }], ['Erreur moyenne', function (s, m) { return fN(m.fl.m) + ' °C'; }], ['Écart-type filtré', function (s, m) { return fN(m.fl.sd) + ' °C'; }], ['Tension moyenne MLI (12 V)', function (s, m) { return fN(m.pwm) + ' V'; }]],
    plots: [{ options: function (s, m) { var a = s.T - 8, b = s.T + 8; return { title: 'Température mesurée', desc: 'Température réelle, mesures brutes et filtrées.', x: { min: 0, max: 79, label: 'échantillon' }, y: { min: a, max: b, label: '°C' }, series: [{ points: m.list.map(function (p) { return [p.i, p.Tt]; }), cls: 'scope__trace--ref' }, { points: m.list.map(function (p) { return [p.i, K.clamp(p.flt, a - 20, b + 20)]; }) }], dots: m.list.map(function (p) { return { x: p.i, y: p.meas }; }) }; } }],
    explain: function (s, m) { return '<p>À ' + s.T + ' °C, la CTN vaut ' + si(m.R, 'Ω') + ' et donne ' + fN(m.V) + ' V. La mesure brute a un écart-type de ' + fN(m.raw.sd) + ' °C. Une moyenne sur ' + s.win + ' échantillon(s) le ramène à ' + fN(m.fl.sd) + ' °C.</p>'; },
    missions: [
      { id: 'm1', title: 'Réduire le bruit', text: 'Atteignez un écart-type filtré inférieur à 0,5 °C (à 30 mV de bruit). Attention : une fenêtre trop longue ajoute un retard, donc de l’erreur.', solution: { win: 8, bits: 12 }, check: function (s, m) { if (s.noise < 30) return { ok: false, msg: 'Gardez au moins 30 mV de bruit.' }; return m.fl.sd < 0.5 ? { ok: true, msg: 'Réussi : ' + fN(m.fl.sd) + ' °C.' } : { ok: false, msg: 'Écart-type : ' + fN(m.fl.sd) + ' °C.' }; } },
      { id: 'm2', title: 'Sensibilité maximale', text: 'À 25 °C, réglez R_fixe égale à R₀ à 10 % près.', solution: { T: 25, Rf: 10, R0: 10 }, check: function (s) { if (s.T !== 25) return { ok: false, msg: 'Réglez 25 °C.' }; return Math.abs(s.Rf / s.R0 - 1) <= 0.1 && (s.Rf !== D.Rf || s.R0 !== D.R0 || s.bits !== D.bits) ? { ok: true, msg: 'Réussi : le diviseur est au milieu de sa plage, là où il est le plus sensible.' } : { ok: false, msg: 'Rapport : ' + fN(s.Rf / s.R0) + '. Changez aussi la résolution ou les valeurs.' }; } },
      { id: 'm3', title: 'Commander un ventilateur', text: 'Réglez la MLI pour 7,2 V moyens sur 12 V.', solution: { duty: 60 }, check: function (s, m) { return Math.abs(m.pwm - 7.2) < 0.13 ? { ok: true, msg: 'Réussi : D = ' + s.duty + ' %.' } : { ok: false, msg: 'V_moy = ' + fN(m.pwm) + ' V.' }; } }],
    limits: '<p>Le capteur est idéal : pas d’auto-échauffement, de dérive ni de tolérance de fabrication. Le bruit est gaussien. Une CTN réelle demande un étalonnage. Le CAN ne tient pas compte de sa non-linéarité.</p>' };
  lab.missions[1].solution = { T: 25, Rf: 10, R0: 10, bits: 12 };

  var list = [
    K.num('e1', 'Résistance d’une CTN', 'Capteurs', '<p>CTN R₀ = 10 kΩ à 25 °C, B = 3950. Calculez R à 50 °C, en kΩ.</p>', ntcR(50, 10, 3950), 'kΩ', { rel: 0.02 }, '<p>R = 10·exp(3950(1/323,15 − 1/298,15)) = ' + fN(ntcR(50, 10, 3950), 4) + ' kΩ.</p>'),
    K.num('e2', 'Tension du diviseur', 'Capteurs', '<p>V<sub>cc</sub> = 5 V, R<sub>fixe</sub> = 10 kΩ, R<sub>CTN</sub> = 15 kΩ. Calculez V, en V.</p>', 3, 'V', { rel: 0.02 }, '<p>5 × 15/25 = 3 V.</p>'),
    K.num('e3', 'Code du CAN', 'Acquisition', '<p>V = 1,65 V, V<sub>ref</sub> = 3,3 V, 10 bits. Calculez le code.</p>', code(1.65, 3.3, 10), '', { abs: 1.1 }, '<p>⌊0,5 × 1024⌋ = 512.</p>'),
    K.num('e4', 'Moyenne', 'Traitement', '<p>Mesures 18, 22, 20, 24. Calculez la moyenne glissante sur 4.</p>', 21, '', { abs: 0.05 }, '<p>84/4 = 21.</p>'),
    K.num('e5', 'MLI', 'Actionneurs', '<p>D = 25 % sous 24 V. Calculez la tension moyenne, en V.</p>', 6, 'V', { rel: 0.02 }, '<p>0,25 × 24 = 6 V.</p>'),
    K.pick('e6', 'CTN', 'Capteurs', '<p>Quand la température augmente, la résistance d’une CTN :</p>', 'diminue', ['augmente', 'reste constante', 's’annule'], '<p>CTN signifie coefficient de température négatif.</p>'),
    K.pick('e7', 'Moyenne glissante', 'Traitement', '<p>Une fenêtre plus longue :</p>', 'réduit le bruit et augmente le retard', ['supprime le retard', 'augmente le bruit', 'ne change rien'], '<p>Le filtrage est un compromis entre stabilité et réactivité.</p>'),
    K.pick('e8', 'Commander une charge', 'Actionneurs', '<p>Pour commander un moteur de 1 A avec un microcontrôleur, on utilise :</p>', 'un transistor ou un relais, avec protection', ['directement une broche GPIO', 'un capteur de température', 'une résistance de 10 MΩ'], '<p>Les broches ne fournissent que quelques dizaines de milliampères au maximum.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('iot-capteurs', list) };
});
