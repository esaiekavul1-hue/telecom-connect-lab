/*
 * TELECOM CONNECT LAB 2.0 — Communications satellitaires.
 * Modèle : orbite circulaire képlérienne, Terre sphérique, espace libre.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  var MU = 398600.4418, RE = 6378.137, C = 299792.458, KDB = 10 * K.log10(1.380649e-23);

  function period(h) { return 2 * Math.PI * Math.sqrt(Math.pow(RE + h, 3) / MU); }
  function speed(h) { return Math.sqrt(MU / (RE + h)); }
  function slant(h, elDeg) { var e = elDeg * Math.PI / 180, x = RE * Math.sin(e); return -x + Math.sqrt(x * x + 2 * RE * h + h * h); }
  function delay(d) { return d / C; }
  function fspl(dKm, fGHz) { return 92.45 + 20 * K.log10(dKm) + 20 * K.log10(fGHz); }
  function cn0(eirp, L, gt) { return eirp - L + gt - KDB; }
  function ebn0(cn, Rb) { return cn - 10 * K.log10(Rb); }
  function doppler(vKms, fHz) { return vKms / C * fHz; }
  var math = { MU: MU, RE: RE, C: C, KDB: KDB, period: period, speed: speed, slant: slant, delay: delay, fspl: fspl, cn0: cn0, ebn0: ebn0, doppler: doppler };

  var GEO = 35786;
  var lesson = K.lesson({ id: 'satellite', title: 'Communications satellitaires',
    intro: 'Un satellite relaie les communications là où les réseaux terrestres sont absents. Son altitude conditionne la latence, la couverture et le bilan de liaison.',
    objectives: ['Calculer la période et la vitesse d’une orbite circulaire.', 'Comparer les orbites LEO, MEO et GEO.', 'Établir un bilan de liaison descendante.', 'Estimer le décalage Doppler.'],
    prerequisites: 'Propagation radio ; mesures et décibels.',
    sources: ['Pages « Geostationary orbit », « Kepler’s laws », « Standard gravitational parameter », « G/T », « Carrier-to-noise ratio », « Link budget ».', 'Constante −228,6 dBW/K/Hz recalculée à partir de k.'],
    figures: { orb: { caption: 'Période et altitude d’une orbite circulaire : une orbite à 35 786 km effectue un tour par jour sidéral.', options: function () { return { kind: 'xy', title: 'Période orbitale', desc: 'La période croît avec l’altitude.', x: { min: 300, max: 40000, log: true, label: 'altitude (km)' }, y: { min: 1, max: 30, log: true, label: 'période (h)' }, series: [{ samples: 200, fn: function (h) { return period(h) / 3600; } }], vlines: [{ x: GEO, label: 'GEO' }] }; } },
      link: { caption: 'Liaison descendante : l’EIRP du satellite, l’affaiblissement du trajet, le gain et le bruit de la station.', svg: function () { return S.blocks({ w: 520, h: 130, label: 'Satellite, trajet espace libre, station terrienne, démodulateur.', boxes: [{ id: 'a', x: 20, y: 40, w: 110, h: 50, t: 'Satellite', sub: 'EIRP' }, { id: 'b', x: 190, y: 40, w: 110, h: 50, t: 'Espace libre', sub: 'L' }, { id: 'c', x: 360, y: 40, w: 130, h: 50, t: 'Station', sub: 'G/T' }], links: [{ a: 'a', b: 'b' }, { a: 'b', b: 'c' }] }); } } },
    chapters: [
      { title: 'Orbites', summary: 'LEO, MEO, GEO et lois de Kepler.', html: [
        '<p class="lead">L’altitude fixe la vitesse et la période d’un satellite, indépendamment de sa masse.</p>',
        K.formula(v('T') + ' = 2π √(a³/µ), v = √(µ/a)', 'Orbite circulaire, a = R<sub>T</sub> + h en km, µ = 398 600,44 km³/s².'),
        '<div data-fig="orb"></div>',
        K.defs([['LEO', 'Orbite basse (quelques centaines à 2 000 km) : latence faible, besoin d’une constellation.'], ['GEO', 'Orbite géostationnaire à 35 786 km : le satellite paraît fixe depuis le sol.'], ['MEO', 'Orbite moyenne, utilisée notamment par les systèmes de navigation.']]),
        K.example('la période géostationnaire', '<p>h = 35 786 km : a = ' + fN(RE + GEO, 6) + ' km, T = ' + fN(period(GEO) / 3600, 5) + ' h, soit un jour sidéral. La vitesse vaut ' + fN(speed(GEO)) + ' km/s.</p>')] },
      { title: 'Latence et couverture', summary: 'Distance, délai, angle d’élévation.', html: [
        '<p class="lead">Un signal parcourt la distance station-satellite-station à la vitesse de la lumière.</p>',
        K.formula(v('d') + ' = −R<sub>T</sub> sin ε + √((R<sub>T</sub> sin ε)² + 2R<sub>T</sub>h + h²)', 'Distance oblique pour une élévation ε, Terre sphérique.'),
        K.example('un aller-retour GEO', '<p>À la verticale, un trajet montée + descente représente 2 × 35 786 km, soit ' + si(delay(2 * GEO), 's') + ' environ. Une réponse demande deux tels trajets : plus de 0,47 s.</p>'),
        K.apply('<p>Dans les zones rurales de RDC, un lien satellite peut raccorder une école ou un centre de santé. Une constellation LEO offre une latence bien plus faible qu’un GEO, avec un équipement capable de suivre les satellites.</p>')] },
      { title: 'Bilan de liaison', summary: 'EIRP, G/T, C/N₀, marge, Doppler.', html: [
        '<p class="lead">Le bilan indique si le signal reçu est assez fort, compte tenu du bruit du récepteur.</p>',
        '<div data-fig="link"></div>',
        K.formula('C/N₀ = EIRP − L + G/T − 10 log₁₀ k', 'En dB. k = 1,380649·10⁻²³ J/K, soit −228,6 dBW/K/Hz. L : pertes totales.'),
        K.formula('L = 92,45 + 20 log₁₀ d<sub>km</sub> + 20 log₁₀ f<sub>GHz</sub>, Δ' + v('f') + ' ≈ (v<sub>r</sub>/c) ' + v('f'), 'Affaiblissement en espace libre, puis décalage Doppler pour v<sub>r</sub> ≪ c.'),
        K.example('liaison en bande Ku', '<p>d = 38 000 km, f = 12 GHz : L = ' + fN(fspl(38000, 12)) + ' dB. Avec EIRP = 52 dBW et G/T = 20 dB/K, C/N₀ = ' + fN(cn0(52, fspl(38000, 12), 20)) + ' dB·Hz. Pour 10 Mbit/s, E<sub>b</sub>/N₀ = ' + fN(ebn0(cn0(52, fspl(38000, 12), 20), 10e6)) + ' dB.</p>'),
        K.pitfalls(['<strong>Oublier les pertes atmosphériques</strong>, notamment la pluie en bande Ku et Ka en région tropicale.', '<strong>Confondre latence aller et latence aller-retour.</strong>', '<strong>Additionner des unités différentes</strong> dans le bilan : tout doit être en dB.']),
        K.summary(['T = 2π√(a³/µ).', 'GEO : 35 786 km, environ 240 ms de trajet montée-descente.', 'C/N₀ = EIRP − L + G/T + 228,6.', 'Doppler : v/c × f.']),
        K.toLab('satellite', 'Choisissez une orbite et dimensionnez une liaison.')] }
    ] });

  var D = { h: 550, el: 30, f: 12, eirp: 40, gt: 10, loss: 1, Rb: 10, need: 7 };
  function M(s) { var T = period(s.h), d = slant(s.h, s.el), v0 = speed(s.h), Lfs = fspl(d, s.f), L = Lfs + s.loss, c = cn0(s.eirp, L, s.gt), eb = ebn0(c, s.Rb * 1e6), margin = eb - s.need, drift = doppler(v0 * Math.cos(s.el * Math.PI / 180), s.f * 1e9); return { T: T, d: d, v0: v0, Lfs: Lfs, L: L, c: c, eb: eb, margin: margin, drift: drift, up: delay(d), rtt: 4 * delay(d) }; }
  var lab = { id: 'satellite', title: 'Orbite et bilan de liaison', short: 'Communications satellitaires', icon: 'antenna', badge: 'Orbite circulaire, espace libre, atmosphère simplifiée',
    text: 'Choisissez l’altitude d’une orbite, puis dimensionnez une liaison descendante.',
    summary: 'Comparez LEO et GEO, calculez latence et Doppler, et établissez la marge d’un bilan de liaison descendante.',
    params: [{ group: 'Orbite' }, { k: 'h', label: 'Altitude', min: 300, max: 40000, log: true, unit: 'km', dec: 0 }, { k: 'el', label: 'Élévation', min: 5, max: 90, step: 1, unit: '°', dec: 0 }, { group: 'Liaison' }, { k: 'f', label: 'Fréquence', min: 1, max: 30, step: 0.5, unit: 'GHz', dec: 1 }, { k: 'eirp', label: 'EIRP du satellite', min: 10, max: 65, step: 0.5, unit: 'dBW', dec: 1 }, { k: 'gt', label: 'G/T de la station', min: -20, max: 40, step: 0.5, unit: 'dB/K', dec: 1 }, { k: 'loss', label: 'Pertes additionnelles', min: 0, max: 20, step: 0.5, unit: 'dB', dec: 1 }, { k: 'Rb', label: 'Débit', min: 0.01, max: 500, log: true, unit: 'Mbit/s', dec: 2 }, { k: 'need', label: 'E_b/N₀ requis', min: 1, max: 20, step: 0.5, unit: 'dB', dec: 1 }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Distance ' + fN(m.d) + ' km ; marge ' + fN(m.margin) + ' dB'; },
    verdict: function (s, m) { return m.margin >= 3 ? { ok: true, text: 'Liaison réalisable avec marge' } : m.margin >= 0 ? { ok: true, text: 'Liaison sans marge' } : { ok: false, text: 'Liaison insuffisante' }; },
    readouts: [['Période', function (s, m) { return fN(m.T / 3600, 4) + ' h'; }], ['Vitesse orbitale', function (s, m) { return fN(m.v0, 4) + ' km/s'; }], ['Distance', function (s, m) { return fN(m.d) + ' km'; }], ['Temps aller-retour', function (s, m) { return si(m.rtt, 's'); }], ['Affaiblissement', function (s, m) { return fN(m.Lfs) + ' dB'; }], ['C/N₀', function (s, m) { return fN(m.c) + ' dB·Hz'; }], ['E_b/N₀', function (s, m) { return fN(m.eb) + ' dB'; }], ['Doppler max approx.', function (s, m) { return si(m.drift, 'Hz'); }]],
    plots: [{ expr: function () { return 'Marge selon l’élévation'; }, options: function (s, m) { return { title: 'Marge du bilan', desc: 'Marge de liaison en fonction de l’élévation.', x: { min: 5, max: 90, label: 'élévation (°)' }, y: { min: Math.min(-5, m.margin - 5), max: Math.max(10, m.margin + 8), label: 'marge (dB)' }, series: [{ samples: 100, fn: function (e) { var d = slant(s.h, e); return ebn0(cn0(s.eirp, fspl(d, s.f) + s.loss, s.gt), s.Rb * 1e6) - s.need; } }], hlines: [{ y: 0 }], points: [{ x: s.el, y: m.margin, label: 'réglage' }] }; } }],
    explain: function (s, m) { return '<p>À ' + fN(s.h) + ' km, un tour dure ' + fN(m.T / 3600, 4) + ' h. La distance oblique de ' + fN(m.d) + ' km représente ' + fN(m.Lfs) + ' dB d’affaiblissement. Il reste une marge de ' + fN(m.margin) + ' dB sur le E<sub>b</sub>/N₀ requis.</p>'; },
    missions: [
      { id: 'm1', title: 'Orbite géostationnaire', text: 'Réglez l’altitude pour obtenir une période de 23,93 h, à 0,05 h près.', solution: { h: 35786 }, check: function (s, m) { var hh = m.T / 3600; return Math.abs(hh - 23.934) <= 0.05 ? { ok: true, msg: 'Réussi : T = ' + fN(hh, 5) + ' h, un satellite placé à l’équateur paraîtrait fixe.' } : { ok: false, msg: 'T = ' + fN(hh, 4) + ' h.' }; } },
      { id: 'm2', title: 'Une marge de 3 dB', text: 'En orbite LEO (moins de 2 000 km), obtenez une marge d’au moins 3 dB à 50 Mbit/s.', solution: { h: 550, Rb: 50, eirp: 45, gt: 15, el: 30 }, check: function (s, m) { if (s.h >= 2000 || Math.abs(s.Rb - 50) > 0.5) return { ok: false, msg: 'Altitude < 2 000 km et débit de 50 Mbit/s.' }; return m.margin >= 3 ? { ok: true, msg: 'Réussi : marge de ' + fN(m.margin) + ' dB.' } : { ok: false, msg: 'Marge : ' + fN(m.margin) + ' dB. Augmentez EIRP ou G/T.' }; } },
      { id: 'm3', title: 'Comparer la latence', text: 'Trouvez une altitude pour laquelle le temps aller-retour dépasse 0,4 s.', solution: { h: 30000, el: 30 }, check: function (s, m) { return m.rtt > 0.4 ? { ok: true, msg: 'Réussi : RTT de ' + si(m.rtt, 's') + ', sensible pour les applications interactives.' } : { ok: false, msg: 'RTT : ' + si(m.rtt, 's') + '. Augmentez l’altitude.' }; } }],
    limits: '<p>Orbite circulaire autour d’une Terre sphérique. Les perturbations de l’orbite, l’atténuation par la pluie, la scintillation et les pertes d’antenne sont regroupées dans une seule perte additionnelle. Le temps aller-retour ne compte que la propagation, sans traitement.</p>' };

  var list = [
    K.num('e1', 'Période LEO', 'Orbites', '<p>Calculez la période d’un satellite à 500 km d’altitude, en minutes.</p>', period(500) / 60, 'min', { rel: 0.02 }, '<p>T = 2π√(a³/µ) avec a = 6878 km : ' + fN(period(500) / 60, 4) + ' min.</p>'),
    K.num('e2', 'Vitesse orbitale', 'Orbites', '<p>Calculez la vitesse orbitale à 500 km, en km/s.</p>', speed(500), 'km/s', { rel: 0.02 }, '<p>v = √(µ/a) = ' + fN(speed(500), 4) + ' km/s.</p>'),
    K.num('e3', 'Délai GEO', 'Latence', '<p>Calculez le temps pour parcourir 2 × 35 786 km à la vitesse de la lumière, en ms.</p>', delay(2 * GEO) * 1000, 'ms', { rel: 0.02 }, '<p>' + fN(delay(2 * GEO) * 1000, 4) + ' ms, soit la latence d’un trajet station-satellite-station.</p>'),
    K.num('e4', 'Affaiblissement', 'Bilan', '<p>d = 1 000 km, f = 12 GHz. Calculez l’affaiblissement en espace libre, en dB.</p>', fspl(1000, 12), 'dB', { abs: 0.3 }, '<p>92,45 + 60 + 21,58 = ' + fN(fspl(1000, 12), 4) + ' dB.</p>'),
    K.num('e5', 'C/N₀', 'Bilan', '<p>EIRP = 50 dBW, L = 205 dB, G/T = 20 dB/K. Calculez C/N₀, en dB·Hz.</p>', cn0(50, 205, 20), 'dB·Hz', { abs: 0.2 }, '<p>50 − 205 + 20 + 228,6 = ' + fN(cn0(50, 205, 20), 4) + ' dB·Hz.</p>'),
    K.num('e6', 'Doppler', 'Bilan', '<p>Vitesse radiale 7 km/s à 12 GHz. Calculez le décalage Doppler, en kHz.</p>', doppler(7, 12e9) / 1000, 'kHz', { rel: 0.02 }, '<p>Δf = 7/299 792 × 12·10⁹ = ' + fN(doppler(7, 12e9) / 1000, 4) + ' kHz.</p>'),
    K.pick('e7', 'Avantage LEO', 'Orbites', '<p>Quel est l’avantage d’une orbite basse sur une orbite géostationnaire ?</p>', 'Une latence beaucoup plus faible', ['Une couverture permanente avec un seul satellite', 'Une antenne fixe sans suivi', 'Un Doppler nul'], '<p>La distance réduite diminue la latence, mais demande une constellation.</p>'),
    K.pick('e8', 'Figure de mérite', 'Bilan', '<p>G/T caractérise :</p>', 'la station réceptrice', ['la puissance du satellite', 'la longueur du câble seul', 'la modulation'], '<p>C’est le rapport entre gain d’antenne et température de bruit du système de réception.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('satellite', list) };
});
