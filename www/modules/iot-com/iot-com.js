/*
 * TELECOM CONNECT LAB 2.0 — Communication des objets.
 * Temps d'antenne : Semtech SX1276/77/78/79, §4.1.1.7. Cycle d'émission : ETSI EN 300 220-2.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  var SNR = { 6: -5, 7: -7.5, 8: -10, 9: -12.5, 10: -15, 11: -17.5, 12: -20 };
  function ts(sf, bw) { return Math.pow(2, sf) / bw; }
  function airtime(p) {
    var Ts = ts(p.sf, p.bw), de = p.de != null ? p.de : (Ts > 0.016 ? 1 : 0), ih = p.ih || 0, crc = p.crc != null ? p.crc : 1;
    var n = Math.max(Math.ceil((8 * p.pl - 4 * p.sf + 28 + 16 * crc - 20 * ih) / (4 * (p.sf - 2 * de))) * (p.cr + 4), 0) + 8;
    var pre = (p.pre + 4.25) * Ts;
    return { Ts: Ts, nPay: n, tPre: pre, tPay: n * Ts, total: pre + n * Ts, de: de };
  }
  function sensitivity(sf, bw, nf) { return -174 + 10 * K.log10(bw) + (nf == null ? 6 : nf) + SNR[sf]; }
  function fspl(dKm, fMHz) { return 32.45 + 20 * K.log10(dKm) + 20 * K.log10(fMHz); }
  function rangeKm(budget, fMHz, extra) { return Math.pow(10, (budget - extra - 32.45 - 20 * K.log10(fMHz)) / 20); }
  function minPeriod(t, duty) { return t / (duty / 100); }
  var TECH = [['Wi-Fi', '2,4 / 5 GHz', 'Centaines de m', 'Élevé', 'Élevée', 'Vidéo, passerelles'], ['BLE', '2,4 GHz', 'Dizaines de m', 'Faible', 'Très faible', 'Objets portés'], ['LoRa', '868 / 915 MHz (selon pays)', 'Km', 'Très faible', 'Très faible', 'Agriculture, ville'], ['NB-IoT / LTE-M', 'Bandes opérateurs', 'Km', 'Faible à moyen', 'Faible', 'Compteurs, suivi']];
  var math = { SNR: SNR, ts: ts, airtime: airtime, sensitivity: sensitivity, fspl: fspl, rangeKm: rangeKm, minPeriod: minPeriod };

  var lesson = K.lesson({ id: 'iot-com', title: 'Communication des objets',
    intro: 'Un objet connecté doit transmettre ses données en dépensant peu d’énergie. Le choix de la technologie radio fixe la portée, le débit et l’autonomie.',
    objectives: ['Comparer Wi-Fi, Bluetooth, LoRa et les technologies cellulaires.', 'Calculer un temps d’antenne LoRa.', 'Estimer une sensibilité et une portée.', 'Respecter un cycle d’émission.'],
    prerequisites: 'Introduction à l’IoT.',
    sources: ['Semtech SX1276/77/78/79, §4.1.1.7 et table des facteurs d’étalement.', 'ETSI EN 300 220-2 V3.2.1.', 'Pages « Bluetooth Low Energy », « LoRaWAN », « Narrowband IoT ».'],
    figures: { lw: { caption: 'Réseau LoRaWAN : les trames d’un capteur sont reçues par une ou plusieurs passerelles, puis dédupliquées par le serveur de réseau.', svg: function () { return S.blocks({ w: 520, h: 120, label: 'Capteur, passerelles, serveur de réseau, application.', boxes: [{ id: 'a', x: 15, y: 35, w: 100, h: 50, t: 'Capteur' }, { id: 'b', x: 145, y: 35, w: 100, h: 50, t: 'Passerelles' }, { id: 'c', x: 275, y: 35, w: 110, h: 50, t: 'Serveur réseau' }, { id: 'd', x: 410, y: 35, w: 95, h: 50, t: 'Application' }], links: [{ a: 'a', b: 'b', dash: true }, { a: 'b', b: 'c' }, { a: 'c', b: 'd' }] }); } },
      toa: { caption: 'Temps d’antenne pour 20 octets à 125 kHz : chaque SF supplémentaire double environ la durée.', options: function () { var C = [7, 8, 9, 10, 11, 12]; return { kind: 'xy', title: 'Temps d’antenne', desc: 'Temps d’antenne selon le facteur d’étalement.', x: { min: 6, max: 13, ticks: C, label: 'facteur d’étalement' }, y: { min: 0, max: 1.6, label: 'durée (s)' }, bars: C.map(function (sf) { return { x: sf, y: airtime({ sf: sf, bw: 125000, cr: 1, pl: 20, pre: 8 }).total }; }) }; } } },
    chapters: [
      { title: 'Technologies radio', summary: 'Comparaison et choix.', html: [
        '<p class="lead">Aucune technologie n’est la meilleure dans tous les cas : c’est un compromis entre débit, portée et énergie.</p>',
        K.table(['Technologie', 'Bande', 'Portée', 'Débit', 'Consommation', 'Usage'], TECH, 'Comparaison qualitative. Les performances varient selon l’installation.'),
        K.defs([['LPWAN', 'Réseau étendu à basse consommation.'], ['BLE', 'Bluetooth basse énergie : bande 2,4 GHz, 40 canaux de 2 MHz.'], ['NB-IoT', 'Technologie cellulaire à bande étroite (200 kHz).']]),
        K.formula('L = 32,45 + 20 log₁₀ d<sub>km</sub> + 20 log₁₀ f<sub>MHz</sub>', 'Affaiblissement en espace libre, en dB.'),
        K.example('affaiblissement', '<p>À 868 MHz et 2 km : L = ' + fN(fspl(2, 868)) + ' dB. Les obstacles réels ajoutent souvent 20 à 40 dB.</p>')] },
      { title: 'LoRa et temps d’antenne', summary: 'Facteur d’étalement, durée d’un paquet.', html: [
        '<p class="lead">LoRa échange du débit contre de la portée, en étalant chaque symbole dans le temps.</p>',
        '<div data-fig="lw"></div>',
        K.formula('T<sub>s</sub> = 2<sup>SF</sup>/BW, T<sub>préambule</sub> = (n + 4,25) T<sub>s</sub>', 'BW en Hz, n : longueur programmée du préambule.'),
        K.formula('n<sub>charge</sub> = 8 + max(⌈(8PL − 4SF + 28 + 16CRC − 20IH) / (4(SF − 2DE))⌉ (CR + 4), 0)', 'PL : octets, CR : 1 pour 4/5 à 4 pour 4/8, DE : optimisation bas débit.'),
        '<div data-fig="toa"></div>',
        K.example('un paquet de 20 octets', '<p>SF7, 125 kHz : ' + si(airtime({ sf: 7, bw: 125000, cr: 1, pl: 20, pre: 8 }).total, 's') + '. SF12 : ' + si(airtime({ sf: 12, bw: 125000, cr: 1, pl: 20, pre: 8 }).total, 's') + '.</p>')] },
      { title: 'Portée et réglementation', summary: 'Sensibilité, cycle d’émission.', html: [
        '<p class="lead">Un récepteur LoRa décode même sous le bruit, jusqu’à une certaine limite.</p>',
        K.formula('S = −174 + 10 log₁₀ BW + NF + SNR<sub>lim</sub>', 'En dBm. NF ≈ 6 dB supposé ; SNR<sub>lim</sub> de −7,5 dB (SF7) à −20 dB (SF12).'),
        K.formula('T<sub>min</sub> = T<sub>antenne</sub> / D', 'Période minimale entre deux paquets pour un cycle d’émission D.'),
        K.example('sensibilité', '<p>SF12, 125 kHz : S = ' + fN(sensitivity(12, 125000)) + ' dBm. Pour un paquet de 1,3 s et un cycle de 1 %, il faut attendre ' + fN(minPeriod(1.3, 1)) + ' s entre deux envois.</p>'),
        K.apply('<p>Les bandes et limites varient selon les pays. En Europe, EN 300 220 fixe des limites par sous-bande. En RDC ou ailleurs, consultez l’autorité de régulation avant tout déploiement.</p>'),
        K.pitfalls(['<strong>Choisir SF12 systématiquement.</strong> Le temps d’antenne et la consommation explosent.', '<strong>Ignorer le cycle d’émission.</strong>', '<strong>Calculer la portée en espace libre</strong> dans une zone bâtie.']),
        K.summary(['Le choix radio est un compromis.', 'T<sub>s</sub> = 2<sup>SF</sup>/BW.', 'Plus SF augmente, plus la sensibilité s’améliore.', 'Le cycle d’émission impose une période minimale.']),
        K.toLab('iot-com', 'Calculez un temps d’antenne et une portée LoRa.')] }
    ] });

  var D = { sf: 7, bw: 125, cr: 1, pl: 20, pre: 8, tx: 14, gain: 3, extra: 20, f: 868, duty: 1, period: 60 };
  function M(s) { var a = airtime({ sf: s.sf, bw: s.bw * 1000, cr: s.cr, pl: s.pl, pre: s.pre }), sens = sensitivity(s.sf, s.bw * 1000), budget = s.tx + s.gain - sens, R = rangeKm(budget, s.f, s.extra), Tmin = minPeriod(a.total, s.duty), dc = a.total / s.period * 100, br = s.sf * (4 / (4 + s.cr)) * (s.bw * 1000 / Math.pow(2, s.sf)); return { a: a, sens: sens, budget: budget, R: R, Tmin: Tmin, dc: dc, br: br }; }
  var lab = { id: 'iot-com', title: 'Liaison LoRa', short: 'Communication des objets', icon: 'antenna', badge: 'Formules Semtech, portée en espace libre corrigée',
    text: 'Choisissez un facteur d’étalement et une bande. Observez le temps d’antenne, la portée et le respect du cycle d’émission.',
    summary: 'Calculez le temps d’antenne LoRa selon la formule Semtech et trouvez le bon compromis portée, durée et cycle d’émission.',
    params: [{ group: 'Modulation' }, { k: 'sf', label: 'Facteur d’étalement', opts: [[7, '7'], [8, '8'], [9, '9'], [10, '10'], [11, '11'], [12, '12']] }, { k: 'bw', label: 'Bande', opts: [[125, '125 kHz'], [250, '250 kHz'], [500, '500 kHz']] }, { k: 'cr', label: 'Taux de codage', opts: [[1, '4/5'], [2, '4/6'], [3, '4/7'], [4, '4/8']] }, { k: 'pl', label: 'Charge utile', min: 1, max: 255, step: 1, unit: 'octets', dec: 0 }, { k: 'pre', label: 'Préambule', min: 6, max: 20, step: 1, unit: 'symboles', dec: 0 }, { group: 'Bilan' }, { k: 'tx', label: 'Puissance', min: 0, max: 20, step: 1, unit: 'dBm', dec: 0 }, { k: 'gain', label: 'Gains d’antennes', min: 0, max: 12, step: 1, unit: 'dB', dec: 0 }, { k: 'extra', label: 'Pertes d’obstacles', min: 0, max: 60, step: 1, unit: 'dB', dec: 0 }, { k: 'f', label: 'Fréquence', opts: [[868, '868 MHz'], [915, '915 MHz']] }, { group: 'Trafic' }, { k: 'period', label: 'Période d’émission', min: 1, max: 3600, log: true, unit: 's', dec: 0 }, { k: 'duty', label: 'Cycle autorisé', opts: [[0.1, '0,1 %'], [1, '1 %'], [10, '10 %']] }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Temps d’antenne : ' + si(m.a.total, 's'); },
    verdict: function (s, m) { return m.dc <= s.duty ? { ok: true, text: 'Cycle d’émission respecté' } : { ok: false, text: 'Cycle d’émission dépassé' }; },
    readouts: [['Durée d’un symbole', function (s, m) { return si(m.a.Ts, 's'); }], ['Symboles de charge', function (s, m) { return String(m.a.nPay); }], ['Temps d’antenne', function (s, m) { return si(m.a.total, 's'); }], ['Débit LoRa', function (s, m) { return si(m.br, 'bit/s'); }], ['Sensibilité', function (s, m) { return fN(m.sens) + ' dBm'; }], ['Bilan de liaison', function (s, m) { return fN(m.budget) + ' dB'; }], ['Portée estimée', function (s, m) { return fN(m.R) + ' km'; }], ['Cycle utilisé', function (s, m) { return fN(m.dc, 3) + ' %'; }]],
    plots: [{ options: function (s, m) { var C = [7, 8, 9, 10, 11, 12]; var top = 1.2 * airtime({ sf: 12, bw: s.bw * 1000, cr: s.cr, pl: s.pl, pre: s.pre }).total; return { title: 'Temps d’antenne selon SF', desc: 'Durée d’un paquet pour chaque facteur d’étalement.', x: { min: 6, max: 13, ticks: C, label: 'SF' }, y: { min: 0, max: top, label: 'durée (s)' }, bars: C.map(function (sf) { return { x: sf, y: airtime({ sf: sf, bw: s.bw * 1000, cr: s.cr, pl: s.pl, pre: s.pre }).total, cls: sf === s.sf ? 'scope__bar--alt' : undefined }; }) }; } }],
    explain: function (s, m) { return '<p>Avec SF' + s.sf + ' et ' + s.bw + ' kHz, un symbole dure ' + si(m.a.Ts, 's') + '. Le paquet occupe ' + m.a.nPay + ' symboles, soit ' + si(m.a.total, 's') + '. La sensibilité estimée est ' + fN(m.sens) + ' dBm, pour une portée de ' + fN(m.R) + ' km avec ' + s.extra + ' dB de pertes.</p>'; },
    missions: [
      { id: 'm1', title: 'Atteindre la portée', text: 'Obtenez au moins 10 km de portée avec 40 dB de pertes d’obstacles, sans dépasser 14 dBm.', solution: { sf: 12, bw: 125, extra: 40, tx: 14, gain: 6 }, check: function (s, m) { if (s.extra < 40 || s.tx > 14) return { ok: false, msg: 'Gardez au moins 40 dB de pertes et 14 dBm au plus.' }; return m.R >= 10 ? { ok: true, msg: 'Réussi : ' + fN(m.R) + ' km théoriques (temps d’antenne : ' + si(m.a.total, 's') + ').' } : { ok: false, msg: 'Portée : ' + fN(m.R) + ' km. Augmentez SF.' }; } },
      { id: 'm2', title: 'Respecter le cycle', text: 'En SF12, réglez une période respectant un cycle de 1 %.', solution: { sf: 12, bw: 125, duty: 1, period: 400 }, check: function (s, m) { if (s.sf !== 12 || s.duty !== 1) return { ok: false, msg: 'Réglez SF12 et un cycle de 1 %.' }; return m.dc <= 1 ? { ok: true, msg: 'Réussi : ' + fN(m.dc, 3) + ' %, période minimale ' + fN(m.Tmin) + ' s.' } : { ok: false, msg: 'Cycle : ' + fN(m.dc, 3) + ' %. Allongez la période.' }; } },
      { id: 'm3', title: 'Économiser l’antenne', text: 'Transmettez 51 octets en moins de 100 ms.', solution: { pl: 51, sf: 7, bw: 500 }, check: function (s, m) { if (s.pl !== 51) return { ok: false, msg: 'Réglez la charge à 51 octets.' }; return m.a.total < 0.1 ? { ok: true, msg: 'Réussi : ' + si(m.a.total, 's') + '.' } : { ok: false, msg: 'Durée : ' + si(m.a.total, 's') + '. Réduisez SF ou élargissez la bande.' }; } }],
    limits: '<p>Le temps d’antenne suit la fiche Semtech. La portée repose sur un affaiblissement en espace libre corrigé et un facteur de bruit supposé de 6 dB : elle indique un ordre de grandeur, pas une couverture réelle. Les règles radio dépendent du pays.</p>' };

  var a20 = airtime({ sf: 9, bw: 125000, cr: 1, pl: 20, pre: 8 });
  var list = [
    K.num('e1', 'Durée d’un symbole', 'LoRa', '<p>SF10, 125 kHz. Calculez T<sub>s</sub>, en ms.</p>', 8.192, 'ms', { rel: 0.01 }, '<p>2¹⁰/125 000 = 8,192 ms.</p>'),
    K.num('e2', 'Préambule', 'LoRa', '<p>n = 8, T<sub>s</sub> = 1 ms. Calculez la durée du préambule, en ms.</p>', 12.25, 'ms', { rel: 0.01 }, '<p>(8 + 4,25) × 1 = 12,25 ms.</p>'),
    K.num('e3', 'Temps d’antenne', 'LoRa', '<p>SF9, 125 kHz, CR 4/5, 20 octets, préambule 8, CRC activé, en-tête explicite. Calculez le temps d’antenne, en ms.</p>', a20.total * 1000, 'ms', { rel: 0.03 }, '<p>n<sub>charge</sub> = ' + a20.nPay + ' symboles, T<sub>s</sub> = ' + fN(a20.Ts * 1000) + ' ms, soit ' + fN(a20.total * 1000, 4) + ' ms.</p>'),
    K.num('e4', 'Sensibilité', 'Portée', '<p>SF7, 125 kHz, NF = 6 dB, SNR limite −7,5 dB. Calculez la sensibilité, en dBm.</p>', sensitivity(7, 125000), 'dBm', { abs: 0.3 }, '<p>−174 + 50,97 + 6 − 7,5 = ' + fN(sensitivity(7, 125000), 4) + ' dBm.</p>'),
    K.num('e5', 'Cycle d’émission', 'Réglementation', '<p>Paquet de 0,5 s, cycle autorisé 1 %. Calculez la période minimale, en s.</p>', 50, 's', { rel: 0.02 }, '<p>0,5/0,01 = 50 s.</p>'),
    K.num('e6', 'Affaiblissement', 'Portée', '<p>f = 868 MHz, d = 5 km. Calculez L, en dB.</p>', fspl(5, 868), 'dB', { abs: 0.3 }, '<p>32,45 + 13,98 + 58,77 = ' + fN(fspl(5, 868), 4) + ' dB.</p>'),
    K.pick('e7', 'Choix de la technologie', 'Technologies', '<p>Pour un capteur agricole isolé, sur batterie, envoyant peu de données :</p>', 'LoRa', ['Wi-Fi', 'Fibre optique', 'Ethernet'], '<p>Longue portée et très faible consommation.</p>'),
    K.pick('e8', 'Augmenter SF', 'LoRa', '<p>Augmenter le facteur d’étalement :</p>', 'allonge le temps d’antenne et améliore la sensibilité', ['réduit le temps d’antenne', 'augmente le débit', 'n’a aucun effet'], '<p>Chaque SF supplémentaire double environ la durée du symbole.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('iot-com', list) };
});
