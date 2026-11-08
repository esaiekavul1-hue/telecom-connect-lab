/*
 * TELECOM CONNECT LAB 2.0 — Introduction à l'Internet des objets.
 * Caractéristiques : fiches Microchip ATmega328P, Espressif ESP32, page Arduino UNO R3.
 * Modèle : microcontrôleur simulé, boucle de commande idéale.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  var BOARDS = { uno: { name: 'Arduino Uno (ATmega328P)', vcc: 5, adc: 10, flash: 32, sram: 2, mhz: 16, imax: 40, wifi: false }, esp32: { name: 'ESP32', vcc: 3.3, adc: 12, flash: 4096, sram: 520, mhz: 240, imax: 40, wifi: true } };
  function ledR(V, Vf, I) { return (V - Vf) / I; }
  function ledI(V, Vf, R) { return Math.max(V - Vf, 0) / R; }
  function dataRate(sensors, bytes, periodS) { return sensors * bytes * 8 / periodS; }
  function adcCode(V, Vref, n) { var max = Math.pow(2, n) - 1; return K.clamp(Math.floor(V / Vref * Math.pow(2, n)), 0, max); }
  /** Exécution simulée d'un programme clignotant sur une durée donnée. */
  function blink(onMs, offMs, totalMs) { var edges = [], t = 0, st = 1, n = 0; while (t < totalMs) { edges.push([t, st]); t += st ? onMs : offMs; if (st === 0) n++; st = 1 - st; edges.push([Math.min(t, totalMs), st ? 0 : 1]); } return { edges: edges, cycles: n }; }
  var math = { BOARDS: BOARDS, ledR: ledR, ledI: ledI, dataRate: dataRate, adcCode: adcCode, blink: blink };

  var lesson = K.lesson({ id: 'iot-intro', title: 'Introduction à l’IoT',
    intro: 'L’Internet des objets relie des capteurs et des actionneurs à des services numériques. Il associe l’électronique, l’informatique et les télécommunications.',
    objectives: ['Décrire l’architecture d’un système IoT.', 'Distinguer capteur, actionneur, microcontrôleur et passerelle.', 'Comparer un Arduino Uno et un ESP32.', 'Comprendre le fonctionnement d’une boucle embarquée.'],
    prerequisites: 'Aucun. Des notions de circuits électriques aident.',
    sources: ['Microchip ATmega328P (ADC, mémoire).', 'Espressif ESP32 Series Datasheet v5.3.', 'docs.arduino.cc : Arduino UNO R3.'],
    figures: { arch: { caption: 'Architecture IoT : objets, passerelle, plateforme, application.', svg: function () { return S.blocks({ w: 520, h: 120, label: 'Capteurs, passerelle, plateforme, application.', boxes: [{ id: 'a', x: 15, y: 35, w: 110, h: 50, t: 'Objets', sub: 'capteurs' }, { id: 'b', x: 140, y: 35, w: 110, h: 50, t: 'Passerelle' }, { id: 'c', x: 265, y: 35, w: 110, h: 50, t: 'Plateforme', sub: 'courtier, stockage' }, { id: 'd', x: 390, y: 35, w: 115, h: 50, t: 'Application' }], links: [{ a: 'a', b: 'b', both: true }, { a: 'b', b: 'c', both: true }, { a: 'c', b: 'd', both: true }] }); } },
      led: { caption: 'Commande d’une LED par une broche : la résistance limite le courant.', svg: function () { return S.svg(520, 140, 'Broche de microcontrôleur, résistance, LED et masse.', S.wire('M120 60H200M260 60H320M380 60H430V100M60 100H430') + S.text(60, 65, 'GPIO', { a: 'start' }) + S.wire('M95 60H120') + S.R(230, 60, false, 'R') + S.D(350, 60, false, 'LED', 'led')); } } },
    chapters: [
      { title: 'Architecture d’un système connecté', summary: 'Couches, composants, exemples d’usage.', html: [
        '<p class="lead">Un système IoT relève des mesures, les transporte, les traite et peut agir en retour.</p>',
        '<div data-fig="arch"></div>',
        K.defs([['Capteur', 'Convertit une grandeur physique en signal.'], ['Actionneur', 'Agit sur le monde physique : moteur, vanne, relais.'], ['Passerelle', 'Relie les objets à Internet.'], ['Plateforme', 'Reçoit, stocke et distribue les données.']]),
        K.formula('D = N<sub>capteurs</sub> × octets × 8 / période', 'Débit moyen d’un nœud, en bit/s, hors surcoûts de protocole.'),
        K.example('une ferme connectée', '<p>10 capteurs, 20 octets toutes les 60 s : D = 10 × 20 × 8/60 = ' + fN(dataRate(10, 20, 60)) + ' bit/s. Un débit très faible suffit : ce qui compte surtout, c’est l’énergie et la portée.</p>'),
        K.apply('<p>Les usages couvrent l’agriculture, l’environnement, la santé, l’énergie et l’industrie. Le choix technique dépend de la distance, de l’énergie disponible et du coût.</p>')] },
      { title: 'Microcontrôleurs', summary: 'Arduino, ESP32, GPIO, CAN.', html: [
        '<p class="lead">Un microcontrôleur intègre processeur, mémoire et entrées-sorties sur une seule puce.</p>',
        K.table(['Caractéristique', 'ATmega328P (Uno)', 'ESP32'], [['Fréquence', '16 MHz', 'jusqu’à 240 MHz'], ['CAN', '10 bits', '12 bits'], ['Flash / SRAM', '32 Ko / 2 Ko', 'selon le module, SRAM interne'], ['Tension', '5 V sur la carte Uno', '3,3 V'], ['Radio', 'Aucune', 'Wi-Fi et Bluetooth']], 'Comparaison à partir des fiches techniques'),
        K.defs([['GPIO', 'Broche d’entrée ou de sortie à usage général.'], ['Résistance de tirage', 'Fixe un niveau logique quand une entrée n’est pas pilotée.'], ['Système embarqué', 'Calculateur intégré à un appareil, dédié à une tâche.']]),
        '<div data-fig="led"></div>',
        K.formula(v('R') + ' = (V<sub>cc</sub> − V<sub>f</sub>) / ' + v('I'), 'Résistance série pour une LED. V<sub>f</sub> : tension directe.'),
        K.example('une LED sur Arduino', '<p>5 V, LED rouge de 2 V, 10 mA : R = 3/0,01 = ' + fN(ledR(5, 2, 0.01)) + ' Ω. On choisit 330 Ω en valeur normalisée. La limite absolue d’une broche ATmega328P est de 40 mA : on reste bien en dessous.</p>')] },
      { title: 'La boucle embarquée', summary: 'Lire, décider, agir, communiquer.', html: [
        '<p class="lead">Un programme embarqué s’exécute en boucle : il lit des capteurs, décide et agit.</p>',
        K.defs([['setup / loop', 'Dans l’environnement Arduino : initialisation, puis boucle répétée.'], ['Temporisation non bloquante', 'Mesurer le temps écoulé plutôt que d’attendre.'], ['Niveau logique', 'Tension interprétée comme 0 ou 1.']]),
        K.formula(v('f') + ' = 1/(t<sub>on</sub> + t<sub>off</sub>), rapport cyclique = t<sub>on</sub>/(t<sub>on</sub> + t<sub>off</sub>)', 'Signal de commande périodique.'),
        K.example('une LED à 1 Hz', '<p>500 ms allumée puis 500 ms éteinte : f = ' + fN(1 / (0.5 + 0.5)) + ' Hz, rapport cyclique 50 %.</p>'),
        K.pitfalls(['<strong>Brancher un capteur 5 V sur un ESP32 en 3,3 V</strong> sans adaptation de niveau.', '<strong>Oublier la résistance d’une LED.</strong>', '<strong>Alimenter une charge importante directement par une broche</strong> au lieu d’un transistor.', '<strong>Laisser une entrée flottante.</strong>']),
        K.summary(['Objets, passerelle, plateforme, application.', 'R = (V<sub>cc</sub> − V<sub>f</sub>)/I.', 'Le programme embarqué tourne en boucle.', 'Respectez les tensions et courants maximaux des broches.']),
        K.toLab('iot-intro', 'Configurez une carte simulée et commandez une LED.')] }
    ] });

  var D = { board: 'uno', Vf: 2, R: 100, on: 500, off: 500, sensors: 4, bytes: 20, period: 60 };
  function M(s) { var b = BOARDS[s.board], I = ledI(b.vcc, s.Vf, s.R), bl = blink(s.on, s.off, 4000); return { b: b, I: I, over: I * 1000 > b.imax, safe: I * 1000 <= 20 && I * 1000 >= 5, f: 1000 / (s.on + s.off), dc: s.on / (s.on + s.off), bl: bl, rate: dataRate(s.sensors, s.bytes, s.period), step: b.vcc / Math.pow(2, b.adc) }; }
  var lab = { id: 'iot-intro', title: 'Microcontrôleur simulé', short: 'Introduction à l’IoT', icon: 'network', badge: 'Microcontrôleur simulé, aucun matériel réel',
    text: 'Choisissez une carte, dimensionnez la résistance d’une LED, réglez un clignotement et estimez le débit d’un nœud.',
    summary: 'Comparez un Arduino et un ESP32, commandez une LED sans dépasser les limites des broches et dimensionnez un nœud.',
    params: [{ group: 'Carte' }, { k: 'board', label: 'Carte', opts: [['uno', 'Arduino Uno'], ['esp32', 'ESP32']] }, { group: 'Sortie LED' }, { k: 'Vf', label: 'Tension directe de la LED', min: 1.6, max: 3.2, step: 0.1, unit: 'V', dec: 1 }, { k: 'R', label: 'Résistance', min: 10, max: 10000, log: true, unit: 'Ω', dec: 0 }, { k: 'on', label: 'Durée allumée', min: 10, max: 2000, step: 10, unit: 'ms', dec: 0 }, { k: 'off', label: 'Durée éteinte', min: 10, max: 2000, step: 10, unit: 'ms', dec: 0 }, { group: 'Données' }, { k: 'sensors', label: 'Capteurs', min: 1, max: 50, step: 1, unit: '', dec: 0 }, { k: 'bytes', label: 'Octets par mesure', min: 1, max: 200, step: 1, unit: 'o', dec: 0 }, { k: 'period', label: 'Période d’envoi', min: 1, max: 3600, log: true, unit: 's', dec: 0 }],
    defaults: D, model: M,
    expr: function (s, m) { return m.b.name + ' : ' + m.b.vcc + ' V, CAN ' + m.b.adc + ' bits'; },
    verdict: function (s, m) { if (m.over) return { ok: false, text: 'Courant au-delà de la limite de broche' }; if (s.Vf >= m.b.vcc) return { ok: false, text: 'Tension insuffisante pour la LED' }; return { ok: true, text: 'Commande correcte' }; },
    readouts: [['Courant dans la LED', function (s, m) { return si(m.I, 'A'); }], ['Fréquence', function (s, m) { return fN(m.f) + ' Hz'; }], ['Rapport cyclique', function (s, m) { return fN(m.dc * 100) + ' %'; }], ['Pas du CAN', function (s, m) { return si(m.step, 'V'); }], ['Débit du nœud', function (s, m) { return fN(m.rate) + ' bit/s'; }]],
    plots: [{ expr: function () { return 'État de la broche sur 4 secondes'; }, options: function (s, m) { return { title: 'Signal sur la broche', desc: 'Signal de commande de la LED.', x: { min: 0, max: 4000, label: 'temps (ms)' }, y: { min: -0.2, max: m.b.vcc * 1.2, label: 'V' }, series: [{ points: m.bl.edges.map(function (p) { return [p[0], p[1] * m.b.vcc]; }) }] }; } }],
    explain: function (s, m) { return '<p>La broche fournit ' + m.b.vcc + ' V. La LED chute ' + fN(s.Vf) + ' V : la résistance de ' + si(s.R, 'Ω') + ' laisse passer ' + si(m.I, 'A') + '. Le nœud émet en moyenne ' + fN(m.rate) + ' bit/s.</p>'; },
    missions: [
      { id: 'm1', title: 'Dimensionner la résistance', text: 'Sur Uno, avec Vf = 2 V, obtenez un courant de 10 mA (à 5 % près).', solution: { board: 'uno', Vf: 2, R: 300 }, check: function (s, m) { if (s.board !== 'uno' || s.Vf !== 2) return { ok: false, msg: 'Sélectionnez Uno et V_f = 2 V.' }; return Math.abs(m.I - 0.01) <= 0.0005 ? { ok: true, msg: 'Réussi : I = ' + si(m.I, 'A') + '.' } : { ok: false, msg: 'I = ' + si(m.I, 'A') + '.' }; } },
      { id: 'm2', title: 'Détecter un danger', text: 'Trouvez un réglage qui dépasserait la limite de 40 mA.', solution: { R: 10 }, check: function (s, m) { return m.over ? { ok: true, msg: 'Réussi : ' + si(m.I, 'A') + ' : sur un vrai montage, la broche pourrait être endommagée.' } : { ok: false, msg: 'Courant actuel : ' + si(m.I, 'A') + '.' }; } },
      { id: 'm3', title: 'Passer en 3,3 V', text: 'Sur ESP32, avec une LED bleue de 3,2 V, constatez que le courant devient très faible.', solution: { board: 'esp32', Vf: 3.2, R: 100 }, check: function (s, m) { if (s.board !== 'esp32' || s.Vf !== 3.2) return { ok: false, msg: 'Choisissez ESP32 et V_f = 3,2 V.' }; return m.I <= 0.0011 ? { ok: true, msg: 'Réussi : marge de tension trop faible, seulement ' + si(m.I, 'A') + '.' } : { ok: false, msg: 'Courant : ' + si(m.I, 'A') + '.' }; } },
      { id: 'm4', title: 'Un clignotement à 2 Hz', text: 'Réglez un clignotement à 2 Hz avec un rapport cyclique de 25 %.', solution: { on: 120, off: 380 }, check: function (s, m) { return Math.abs(m.f - 2) <= 0.05 && Math.abs(m.dc - 0.25) <= 0.02 ? { ok: true, msg: 'Réussi : t_on = ' + s.on + ' ms, t_off = ' + s.off + ' ms.' } : { ok: false, msg: 'f = ' + fN(m.f) + ' Hz, rapport ' + fN(m.dc * 100) + ' %.' }; } }],
    limits: '<p>Carte simulée, sans matériel réel. Le courant suppose une LED à tension fixe. Le modèle ignore la résistance interne des broches et le temps d’exécution du programme. Les limites indiquées sont des maxima de fiches techniques, à ne pas utiliser comme valeurs de fonctionnement.</p>' };

  var list = [
    K.num('e1', 'Résistance de LED', 'Microcontrôleurs', '<p>3,3 V, LED de 2,1 V, courant 6 mA. Calculez R, en Ω.</p>', ledR(3.3, 2.1, 0.006), 'Ω', { rel: 0.02 }, '<p>(3,3 − 2,1)/0,006 = 200 Ω.</p>'),
    K.num('e2', 'Courant de LED', 'Microcontrôleurs', '<p>5 V, LED de 2 V, R = 220 Ω. Calculez le courant, en mA.</p>', ledI(5, 2, 220) * 1000, 'mA', { rel: 0.02 }, '<p>3/220 = ' + fN(ledI(5, 2, 220) * 1000, 4) + ' mA.</p>'),
    K.num('e3', 'Pas du CAN', 'Microcontrôleurs', '<p>CAN 12 bits sous 3,3 V. Calculez le pas, en mV.</p>', 3.3 / 4096 * 1000, 'mV', { rel: 0.02 }, '<p>3,3/4096 = ' + fN(3.3 / 4096 * 1000, 4) + ' mV.</p>'),
    K.num('e4', 'Débit d’un nœud', 'Architecture', '<p>5 capteurs, 12 octets, toutes les 30 s. Calculez le débit, en bit/s.</p>', dataRate(5, 12, 30), 'bit/s', { rel: 0.02 }, '<p>5 × 12 × 8/30 = 16 bit/s.</p>'),
    K.num('e5', 'Fréquence de clignotement', 'Programme', '<p>t<sub>on</sub> = 100 ms, t<sub>off</sub> = 400 ms. Calculez f, en Hz.</p>', 2, 'Hz', { rel: 0.02 }, '<p>1/0,5 s = 2 Hz.</p>'),
    K.pick('e6', 'Passerelle', 'Architecture', '<p>Une passerelle IoT :</p>', 'relie des objets à un réseau étendu', ['mesure la température', 'remplace le capteur', 'chauffe le microcontrôleur'], '<p>Elle assure la conversion entre les protocoles locaux et Internet.</p>'),
    K.pick('e7', 'Niveaux de tension', 'Microcontrôleurs', '<p>Pour relier une sortie 5 V à une entrée d’ESP32 :</p>', 'il faut adapter le niveau de tension', ['le branchement direct est conseillé', 'il faut inverser les polarités', 'il faut ajouter un second capteur'], '<p>L’ESP32 fonctionne en 3,3 V : il faut par exemple un diviseur de tension ou un adaptateur.</p>'),
    K.pick('e8', 'Actionneur', 'Architecture', '<p>Lequel est un actionneur ?</p>', 'Un relais', ['Une thermistance', 'Une photodiode', 'Un accéléromètre'], '<p>Le relais agit sur un circuit ; les autres sont des capteurs.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('iot-intro', list) };
});
