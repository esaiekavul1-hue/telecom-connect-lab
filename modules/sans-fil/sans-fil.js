/*
 * TELECOM CONNECT LAB 2.0 — Réseaux sans fil (Wi-Fi).
 * Modèle : canaux 2,4 GHz, affaiblissement log-distance, débit borné par Shannon.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  function centre(ch) { return ch === 14 ? 2484 : 2407 + 5 * ch; }
  function overlap(a, b, w) { return Math.abs(centre(a) - centre(b)) < (w || 20); }
  function pathLoss(fMHz, d, n, walls, wallDb) { var L0 = 20 * K.log10(fMHz) - 27.55; return L0 + 10 * n * K.log10(Math.max(d, 1)) + walls * wallDb; }
  function shannonRate(B, snrDb) { return B * Math.log2(1 + K.fromDb(snrDb)); }
  function collisionProb(n, W) { return 1 - Math.pow(1 - 1 / W, n - 1); }
  var math = { centre: centre, overlap: overlap, pathLoss: pathLoss, shannonRate: shannonRate, collisionProb: collisionProb };

  var lesson = K.lesson({ id: 'sans-fil', title: 'Réseaux sans fil',
    intro: 'Le Wi-Fi partage un canal radio entre plusieurs équipements. Sa performance dépend du plan de fréquences, de la distance et du nombre de stations.',
    objectives: ['Choisir des canaux Wi-Fi sans recouvrement.', 'Estimer la portée intérieure d’un point d’accès.', 'Expliquer le mécanisme CSMA/CA.', 'Diagnostiquer un réseau sans fil lent.'],
    prerequisites: 'Propagation radio ; réseaux IP.',
    sources: ['Pages « List of WLAN channels » et « CSMA/CA ».', 'Le débit estimé est borné par la formule de Shannon, sans table de modulation constructeur.'],
    figures: { chs: { caption: 'Canaux de 2,4 GHz de 20 MHz : les canaux 1, 6 et 11 ne se recouvrent pas.', options: function () { var C = [1, 6, 11]; return { kind: 'xy', title: 'Canaux 2,4 GHz', desc: 'Trois canaux disjoints.', x: { min: 2400, max: 2485, label: 'fréquence (MHz)' }, y: { min: 0, max: 1.2, ticks: [], label: '' }, bands: C.map(function (c) { return { x0: centre(c) - 10, x1: centre(c) + 10, label: 'canal ' + c }; }) , series: [{ points: [[2400, 0], [2485, 0]] }] }; } },
      csma: { caption: 'CSMA/CA : l’émetteur écoute, attend un délai aléatoire, puis attend l’acquittement.', svg: function () { return S.blocks({ w: 520, h: 110, label: 'Écoute, attente aléatoire, émission, acquittement.', boxes: [{ id: 'a', x: 15, y: 30, w: 100, h: 50, t: 'Écoute' }, { id: 'b', x: 145, y: 30, w: 100, h: 50, t: 'Attente', sub: 'aléatoire' }, { id: 'c', x: 275, y: 30, w: 100, h: 50, t: 'Émission' }, { id: 'd', x: 405, y: 30, w: 100, h: 50, t: 'Acquittement' }], links: [{ a: 'a', b: 'b' }, { a: 'b', b: 'c' }, { a: 'c', b: 'd' }] }); } } },
    chapters: [
      { title: 'Canaux et plan de fréquences', summary: 'Bandes, canaux, recouvrement.', html: [
        '<p class="lead">Dans la bande 2,4 GHz, les canaux sont espacés de 5 MHz, alors qu’un signal Wi-Fi occupe 20 MHz.</p>',
        K.formula(v('f') + '<sub>c</sub> = 2407 + 5' + v('n') + ' MHz', 'Canaux 1 à 13 à 2,4 GHz. Le canal 14 est à part (2484 MHz).'),
        '<div data-fig="chs"></div>',
        K.defs([['Canal disjoint', 'Canal dont la bande ne chevauche pas celle d’un autre.'], ['Interférence co-canal', 'Plusieurs réseaux partagent le même canal et se partagent le temps.'], ['Interférence adjacente', 'Canaux qui se chevauchent : le signal voisin agit comme un bruit.']]),
        K.example('choisir ses canaux', '<p>Canaux 1 (2412 MHz) et 4 (2427 MHz) : l’écart de 15 MHz est inférieur à 20 MHz, ils se chevauchent. Canaux 1 et 6 (2437 MHz) : 25 MHz d’écart, pas de recouvrement.</p>'),
        K.apply('<p>Les canaux disponibles dépendent de la réglementation nationale, à vérifier auprès de l’autorité compétente.</p>')] },
      { title: 'Portée intérieure', summary: 'Modèle log-distance, murs, SNR.', html: [
        '<p class="lead">En intérieur, le signal diminue plus vite qu’en espace libre, à cause des murs et du mobilier.</p>',
        K.formula('L = 20 log₁₀ f<sub>MHz</sub> − 27,55 + 10' + v('n') + ' log₁₀ ' + v('d') + ' + N<sub>m</sub> L<sub>m</sub>', 'Modèle empirique. d en mètres, n ≈ 3 en intérieur, L<sub>m</sub> : perte par mur.'),
        K.example('calcul de portée', '<p>À 2 437 MHz, 15 m, n = 3 et deux murs à 6 dB : L = ' + fN(pathLoss(2437, 15, 3, 2, 6)) + ' dB. Avec 20 dBm émis, le niveau reçu est ' + fN(20 - pathLoss(2437, 15, 3, 2, 6)) + ' dBm.</p>'),
        K.defs([['RSSI', 'Indicateur de puissance reçue.'], ['Débit Shannon', 'Limite théorique, jamais atteinte en pratique.']])] },
      { title: 'Accès au canal', summary: 'CSMA/CA et débit réel.', html: [
        '<p class="lead">Le Wi-Fi ne peut pas détecter une collision pendant l’émission. Il tente donc de l’éviter.</p>',
        '<div data-fig="csma"></div>',
        K.formula('p<sub>c</sub> = 1 − (1 − 1/W)<sup>n−1</sup>', 'Modèle simple : probabilité qu’une autre station choisisse le même créneau, parmi W créneaux et n stations.'),
        K.example('collisions', '<p>Avec W = 16 et n = 10 : p<sub>c</sub> = ' + fN(collisionProb(10, 16)) + '. Après un échec, la fenêtre double (repli exponentiel binaire).</p>'),
        K.pitfalls(['<strong>Choisir un canal « automatique » sans vérifier les voisins.</strong>', '<strong>Confondre le débit de lien affiché et le débit utile</strong>, souvent deux fois plus faible.', '<strong>Augmenter la puissance sans penser au retour</strong> : le terminal doit aussi être entendu.']),
        K.summary(['Canaux 2,4 GHz disjoints : 1, 6, 11.', 'L’atténuation intérieure croît en 10n log d.', 'CSMA/CA évite les collisions par attente aléatoire.']),
        K.toLab('sans-fil', 'Planifiez les canaux de trois points d’accès et étudiez la couverture.')] }
    ] });

  var D = { a: 1, b: 2, c: 3, tx: 20, d: 15, walls: 2, wall: 6, n: 3, B: 20, stations: 10, W: 16, noise: -95 };
  function M(s) { var L = pathLoss(2437, s.d, s.n, s.walls, s.wall), rx = s.tx - L, snr = rx - s.noise, rate = snr > 0 ? shannonRate(s.B * 1e6, snr) : 0, ab = overlap(s.a, s.b), bc = overlap(s.b, s.c), ac = overlap(s.a, s.c), n = (ab ? 1 : 0) + (bc ? 1 : 0) + (ac ? 1 : 0); return { L: L, rx: rx, snr: snr, rate: rate, clash: n, pc: collisionProb(s.stations, s.W), est: rate * 0.5 / s.stations * (1 - collisionProb(s.stations, s.W)) }; }
  var CH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(function (c) { return [c, 'Canal ' + c]; });
  var lab = { id: 'sans-fil', title: 'Plan de fréquences et couverture Wi-Fi', short: 'Réseaux sans fil', icon: 'antenna', badge: 'Modèle log-distance, débit borné par Shannon',
    text: 'Attribuez des canaux à trois points d’accès, puis étudiez la portée intérieure et le partage du canal.',
    summary: 'Choisissez des canaux sans recouvrement, estimez la couverture intérieure et l’effet du nombre de stations.',
    params: [{ group: 'Canaux des points d’accès' }, { k: 'a', label: 'Point d’accès A', select: true, opts: CH, hint: '' }, { k: 'b', label: 'Point d’accès B', select: true, opts: CH, hint: '' }, { k: 'c', label: 'Point d’accès C', select: true, opts: CH, hint: '' }, { group: 'Couverture' }, { k: 'tx', label: 'Puissance émise', min: 0, max: 30, step: 1, unit: 'dBm', dec: 0 }, { k: 'd', label: 'Distance', min: 1, max: 100, step: 1, unit: 'm', dec: 0 }, { k: 'walls', label: 'Murs traversés', min: 0, max: 6, step: 1, unit: '', dec: 0 }, { k: 'wall', label: 'Perte par mur', min: 2, max: 15, step: 1, unit: 'dB', dec: 0 }, { k: 'n', label: 'Exposant n', min: 2, max: 5, step: 0.1, unit: '', dec: 1 }, { k: 'B', label: 'Largeur du canal', opts: [[20, '20 MHz'], [40, '40 MHz']] }, { group: 'Partage du canal' }, { k: 'stations', label: 'Stations actives', min: 1, max: 40, step: 1, unit: '', dec: 0 }, { k: 'W', label: 'Fenêtre de contention', opts: [[16, '16'], [32, '32'], [64, '64']] }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Niveau reçu ' + fN(m.rx) + ' dBm ; SNR ' + fN(m.snr) + ' dB'; },
    verdict: function (s, m) { return m.clash ? { ok: false, text: m.clash + ' recouvrement(s) de canaux' } : { ok: true, text: 'Canaux sans recouvrement' }; },
    readouts: [['Affaiblissement', function (s, m) { return fN(m.L) + ' dB'; }], ['Niveau reçu', function (s, m) { return fN(m.rx) + ' dBm'; }], ['SNR', function (s, m) { return fN(m.snr) + ' dB'; }], ['Limite de Shannon', function (s, m) { return si(m.rate, 'bit/s'); }], ['Recouvrements', function (s, m) { return String(m.clash); }], ['Probabilité de collision', function (s, m) { return fN(m.pc * 100) + ' %'; }], ['Part par station (estim.)', function (s, m) { return si(m.est, 'bit/s'); }]],
    plots: [{ options: function (s, m) { return { title: 'Niveau reçu et distance', desc: 'Niveau reçu en fonction de la distance.', x: { min: 1, max: 100, log: true, label: 'distance (m)' }, y: { min: -110, max: 10, label: 'niveau (dBm)' }, series: [{ samples: 100, fn: function (d) { return s.tx - pathLoss(2437, d, s.n, s.walls, s.wall); } }], hlines: [{ y: s.noise, label: 'bruit', anchor: 'start' }], points: [{ x: s.d, y: m.rx, label: 'poste' }] }; } }],
    explain: function (s, m) { return '<p>À ' + s.d + ' m, le signal perd ' + fN(m.L) + ' dB et arrive à ' + fN(m.rx) + ' dBm. Le débit théorique maximal dans ' + s.B + ' MHz est ' + si(m.rate, 'bit/s') + '. Avec ' + s.stations + ' stations, chaque terminal disposerait d’environ ' + si(m.est, 'bit/s') + ' (estimation grossière, à vérifier sur le réseau réel).</p>'; },
    missions: [
      { id: 'm1', title: 'Trois canaux disjoints', text: 'Attribuez trois canaux sans aucun recouvrement.', solution: { a: 1, b: 6, c: 11 }, check: function (s, m) { return !m.clash ? { ok: true, msg: 'Réussi : aucune interférence adjacente entre les trois points d’accès.' } : { ok: false, msg: m.clash + ' recouvrement(s). Espacez les canaux d’au moins 5.' }; } },
      { id: 'm2', title: 'Couvrir une pièce éloignée', text: 'Obtenez un SNR d’au moins 25 dB à 30 m ou plus, avec au moins un mur.', solution: { d: 30, walls: 1, wall: 3, tx: 30, n: 2.2 }, check: function (s, m) { if (s.d < 30 || s.walls < 1) return { ok: false, msg: 'Placez le poste à 30 m ou plus avec au moins un mur.' }; return m.snr >= 25 ? { ok: true, msg: 'Réussi : SNR de ' + fN(m.snr) + ' dB.' } : { ok: false, msg: 'SNR : ' + fN(m.snr) + ' dB.' }; } },
      { id: 'm3', title: 'Réduire les collisions', text: 'Avec au moins 10 stations, obtenez moins de 15 % de probabilité de collision.', solution: { stations: 10, W: 64 }, check: function (s, m) { if (s.stations < 10) return { ok: false, msg: 'Gardez au moins 10 stations.' }; return m.pc < 0.15 ? { ok: true, msg: 'Réussi : p_c = ' + fN(m.pc * 100) + ' %.' } : { ok: false, msg: 'p_c = ' + fN(m.pc * 100) + ' %. Augmentez la fenêtre de contention.' }; } }],
    limits: '<p>Ce modèle log-distance est empirique et ne connaît pas votre bâtiment réel. Le débit de Shannon est une borne ; les débits réels sont nettement inférieurs. Le partage du canal est très simplifié (répartition égale, rendement de 50 % supposé). Seule la bande 2,4 GHz est représentée.</p>' };

  var list = [
    K.num('e1', 'Fréquence d’un canal', 'Canaux', '<p>Calculez la fréquence centrale du canal 11 à 2,4 GHz, en MHz.</p>', 2462, 'MHz', { abs: 0.5 }, '<p>2407 + 5 × 11 = 2462 MHz.</p>'),
    K.num('e2', 'Écart de canaux', 'Canaux', '<p>Combien de MHz séparent les canaux 1 et 6 ?</p>', 25, 'MHz', { abs: 0.5 }, '<p>5 × 5 = 25 MHz.</p>'),
    K.num('e3', 'Affaiblissement', 'Couverture', '<p>f = 2437 MHz, d = 10 m, n = 3, sans mur. Calculez L, en dB.</p>', pathLoss(2437, 10, 3, 0, 0), 'dB', { abs: 0.5 }, '<p>L = 40,2 + 30 = ' + fN(pathLoss(2437, 10, 3, 0, 0), 4) + ' dB.</p>'),
    K.num('e4', 'Niveau reçu', 'Couverture', '<p>Émission 20 dBm, L = 75 dB. Calculez le niveau reçu, en dBm.</p>', -55, 'dBm', { abs: 0.2 }, '<p>20 − 75 = −55 dBm.</p>'),
    K.num('e5', 'Limite de Shannon', 'Couverture', '<p>20 MHz, SNR 30 dB. Calculez la limite, en Mbit/s.</p>', shannonRate(20e6, 30) / 1e6, 'Mbit/s', { rel: 0.02 }, '<p>20 × log₂(1001) = ' + fN(shannonRate(20e6, 30) / 1e6, 4) + ' Mbit/s.</p>'),
    K.num('e6', 'Probabilité de collision', 'Accès', '<p>W = 16, n = 2. Calculez p<sub>c</sub>.</p>', collisionProb(2, 16), '', { rel: 0.02 }, '<p>1 − 15/16 = ' + fN(collisionProb(2, 16), 4) + '.</p>'),
    K.pick('e7', 'Canaux disjoints', 'Canaux', '<p>Quel trio de canaux 2,4 GHz est disjoint ?</p>', '1, 6 et 11', ['1, 2 et 3', '5, 6 et 7', '2, 4 et 6'], '<p>25 MHz d’écart entre chaque canal.</p>'),
    K.pick('e8', 'Détection de collision', 'Accès', '<p>Pourquoi le Wi-Fi utilise-t-il CSMA/CA plutôt que CSMA/CD ?</p>', 'Une station ne peut pas facilement écouter pendant qu’elle émet', ['Il n’y a jamais de collision en radio', 'Il n’utilise pas de porteuse', 'Les trames sont trop courtes'], '<p>L’émission masque l’écoute : on évite donc les collisions avant qu’elles ne surviennent.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('sans-fil', list) };
});
