/*
 * TELECOM CONNECT LAB 2.0 — Mesures et qualité des transmissions.
 * Modèle : cascade de bruit de Friis, diagramme de l'œil simulé (bruit gaussien, ISI).
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;

  function dbmToW(d) { return 1e-3 * Math.pow(10, d / 10); }
  function wToDbm(w) { return 10 * K.log10(w / 1e-3); }
  function noiseDbm(BHz, T) { return wToDbm(1.380649e-23 * (T || 290) * BHz); }
  /** Cascade : étages [{ g (dB), nf (dB) }]. */
  function friis(st) {
    var f = 0, gain = 1;
    st.forEach(function (x, i) { var F = K.fromDb(x.nf); f += i === 0 ? F : (F - 1) / gain; gain *= K.fromDb(x.g); });
    return { F: f, nf: K.toDb(f), gain: K.toDb(gain) };
  }
  function evmPct(sigma, Prms) { return Math.sqrt(2) * sigma / Prms * 100; }
  function evmDb(pct) { return 20 * K.log10(pct / 100); }
  var math = { dbmToW: dbmToW, wToDbm: wToDbm, noiseDbm: noiseDbm, friis: friis, evmPct: evmPct, evmDb: evmDb };

  function eye(s) {
    var r = K.rng(1234), g = K.gaussian(r), traces = [], top = [], bot = [], N = 40;
    for (var k = 0; k < 40; k++) {
      var a = [r() < 0.5 ? -1 : 1, r() < 0.5 ? -1 : 1, r() < 0.5 ? -1 : 1], pts = [];
      for (var i = 0; i <= N; i++) {
        var t = i / N;
        var pulse = function (x) { return Math.abs(x) < 1 ? 0.5 * (1 + Math.cos(Math.PI * x)) : 0; };
        var y = a[1] * pulse(t - 0.5) + a[0] * pulse(t + 0.5) * (1 + s.isi) + a[2] * pulse(t - 1.5) * (1 + s.isi) + s.isi * (a[0] * pulse(t - 0.5 + 1) * 0.5) + s.sigma * g();
        pts.push([t, y]);
        if (i === N / 2) { if (a[1] > 0) top.push(y); else bot.push(y); }
      }
      traces.push(pts);
    }
    var opening = Math.max((top.length ? Math.min.apply(null, top) : 1) - (bot.length ? Math.max.apply(null, bot) : -1), 0);
    return { traces: traces, opening: opening };
  }

  var lesson = K.lesson({ id: 'qualite', title: 'Mesures et qualité des transmissions',
    intro: 'Mesurer une liaison, c’est décider si elle fonctionne bien. Décibels, facteur de bruit, diagramme de l’œil et EVM sont les outils de ce diagnostic.',
    objectives: ['Convertir entre dB, dBm et watts.', 'Calculer le facteur de bruit d’une chaîne avec la formule de Friis.', 'Lire un diagramme de l’œil.', 'Définir l’EVM et l’interpréter.'],
    prerequisites: 'Chaîne de transmission.',
    sources: ['Pages « Friis formulas for noise », « Noise figure », « Johnson-Nyquist noise », « Eye pattern », « Error vector magnitude ».', 'Plancher −174 dBm/Hz recalculé à partir de kT à 290 K.'],
    figures: { chain: { caption: 'Le premier étage fixe l’essentiel du bruit de la chaîne : un amplificateur à faible bruit se place au plus près de l’antenne.', svg: function () { return S.blocks({ w: 520, h: 120, label: 'Antenne, LNA, mélangeur, amplificateur FI.', boxes: [{ id: 'a', x: 20, y: 35, w: 90, h: 50, t: 'Antenne' }, { id: 'b', x: 150, y: 35, w: 90, h: 50, t: 'LNA', sub: 'NF faible' }, { id: 'c', x: 280, y: 35, w: 90, h: 50, t: 'Mélangeur' }, { id: 'd', x: 410, y: 35, w: 90, h: 50, t: 'Ampli FI' }], links: [{ a: 'a', b: 'b' }, { a: 'b', b: 'c' }, { a: 'c', b: 'd' }] }); } },
      nf: { caption: 'Plancher de bruit thermique pour différentes largeurs de bande, à 290 K.', options: function () { return { kind: 'xy', title: 'Plancher de bruit', desc: 'Le plancher augmente avec la largeur de bande.', x: { min: 1e3, max: 1e9, log: true, label: 'bande (Hz)' }, y: { min: -150, max: -70, label: 'puissance (dBm)' }, series: [{ samples: 100, fn: function (b) { return noiseDbm(b); } }] }; } } },
    chapters: [
      { title: 'Décibels et niveaux', summary: 'dB, dBm, plancher de bruit.', html: [
        '<p class="lead">En télécommunications, les puissances varient sur de nombreux ordres de grandeur. Le décibel les rend faciles à manipuler.</p>',
        K.formula('P<sub>dBm</sub> = 10 log₁₀(P / 1 mW), N<sub>dBm</sub> = 10 log₁₀(k T B / 1 mW)', 'P en watts. k = 1,380649·10⁻²³ J/K ; à 290 K, le plancher vaut environ −174 dBm/Hz.'),
        '<div data-fig="nf"></div>',
        K.defs([['dB', 'Rapport de puissances exprimé en logarithme.'], ['dBm', 'Puissance référencée à 1 mW.'], ['SNR', 'Rapport signal sur bruit.']]),
        K.example('niveaux typiques', '<p>1 W = +30 dBm, 1 mW = 0 dBm, 1 µW = −30 dBm. Dans une bande de 20 MHz à 290 K, le bruit thermique vaut ' + fN(noiseDbm(20e6)) + ' dBm.</p>')] },
      { title: 'Bruit d’une chaîne', summary: 'Facteur de bruit, formule de Friis.', html: [
        '<p class="lead">Chaque étage dégrade le rapport signal sur bruit. Le premier étage a le plus d’importance.</p>',
        '<div data-fig="chain"></div>',
        K.formula('F = F₁ + (F₂ − 1)/G₁ + (F₃ − 1)/(G₁G₂) + …', 'Facteurs et gains en valeurs linéaires. NF = 10 log₁₀ F, en dB.'),
        K.defs([['Facteur de bruit F', 'Rapport entre le SNR à l’entrée et le SNR à la sortie, pour une source à 290 K.'], ['NF', 'Facteur de bruit exprimé en décibels.'], ['LNA', 'Amplificateur à faible bruit, placé au plus près de l’antenne.']]),
        K.example('placer un LNA', '<p>LNA (NF 1 dB, gain 20 dB) puis mélangeur (NF 10 dB) : NF total = ' + fN(friis([{ g: 20, nf: 1 }, { g: 0, nf: 10 }]).nf, 3) + ' dB. Si le mélangeur vient d’abord : ' + fN(friis([{ g: 0, nf: 10 }, { g: 20, nf: 1 }]).nf, 3) + ' dB. Le même matériel, placé dans l’autre ordre, dégrade la sensibilité de près de 9 dB.</p>'),
        K.apply('<p>Une perte placée avant le premier étage s’ajoute directement au facteur de bruit : 3 dB de câble entre une antenne et un récepteur coûtent 3 dB de sensibilité. C’est pourquoi un amplificateur est souvent monté en tête de mât, au plus près de l’antenne.</p>')] },
      { title: 'Œil et EVM', summary: 'Diagramme de l’œil, EVM, taux d’erreur.', html: [
        '<p class="lead">Un signal numérique se juge sur sa forme réelle : un œil ouvert signifie une décision fiable.</p>',
        K.defs([['Diagramme de l’œil', 'Superposition des périodes de symboles synchronisée sur l’horloge.'], ['Gigue', 'Variation de l’instant des transitions.'], ['EVM', 'Valeur efficace de l’écart entre points idéaux et reçus, rapportée à une amplitude de référence.']]),
        K.formula('EVM<sub>dB</sub> = 20 log₁₀(EVM<sub>%</sub> / 100)', 'L’EVM est exprimée en pourcentage de l’amplitude de référence.'),
        K.example('EVM en dB', '<p>Une EVM de 5 % correspond à ' + fN(evmDb(5)) + ' dB.</p>'),
        K.pitfalls(['<strong>Additionner des dBm entre eux.</strong> On additionne des dB à des dBm.', '<strong>Mettre l’atténuation avant le LNA</strong> sans en mesurer le coût sur le facteur de bruit.', '<strong>Juger une liaison sur la seule puissance reçue</strong> sans regarder le bruit.']),
        K.summary(['0 dBm = 1 mW.', 'Plancher thermique : −174 dBm/Hz à 290 K.', 'Friis : le premier étage domine.', 'Un œil fermé annonce des erreurs.']),
        K.toLab('qualite', 'Modifiez une chaîne de réception et observez le diagramme de l’œil.')] }
    ] });

  var D = { order: 'lna', gl: 20, nl: 1, nm: 10, loss: 0, B: 20, sigma: 0.05, isi: 0.05 };
  function M(s) { var lna = { g: s.gl, nf: s.nl }, mix = { g: 0, nf: s.nm }, cab = { g: -s.loss, nf: s.loss }, st = s.order === 'lna' ? [cab, lna, mix] : [cab, mix, lna]; if (!s.loss) st.shift(); var r = friis(st), n = noiseDbm(s.B * 1e6) + r.nf, e = eye(s); return { r: r, n: n, e: e, evm: evmPct(s.sigma / Math.SQRT2, 1) }; }
  var lab = { id: 'qualite', title: 'Cascade de bruit et diagramme de l’œil', short: 'Qualité des transmissions', icon: 'chart', badge: 'Formule de Friis, œil simulé',
    text: 'Agencez une chaîne de réception, mesurez son facteur de bruit, puis observez l’effet du bruit et de l’interférence entre symboles.',
    summary: 'Calculez le facteur de bruit d’une chaîne avec Friis et observez l’ouverture d’un diagramme de l’œil.',
    params: [{ group: 'Chaîne de réception' }, { k: 'order', label: 'Ordre des étages', opts: [['lna', 'LNA d’abord'], ['mix', 'Mélangeur d’abord']] }, { k: 'gl', label: 'Gain du LNA', min: 0, max: 30, step: 0.5, unit: 'dB', dec: 1 }, { k: 'nl', label: 'NF du LNA', min: 0.3, max: 6, step: 0.1, unit: 'dB', dec: 1 }, { k: 'nm', label: 'NF du mélangeur', min: 3, max: 15, step: 0.5, unit: 'dB', dec: 1 }, { k: 'loss', label: 'Perte du câble (avant le premier étage)', min: 0, max: 10, step: 0.5, unit: 'dB', dec: 1 }, { k: 'B', label: 'Bande', min: 0.01, max: 400, log: true, unit: 'MHz', dec: 2 }, { group: 'Signal' }, { k: 'sigma', label: 'Bruit (écart-type)', min: 0, max: 0.6, step: 0.01, unit: 'V', dec: 2 }, { k: 'isi', label: 'Interférence entre symboles', min: 0, max: 0.6, step: 0.01, unit: '', dec: 2 }],
    defaults: D, model: M,
    expr: function (s, m) { return 'NF = ' + fN(m.r.nf, 3) + ' dB ; ouverture de l’œil = ' + fN(m.e.opening) + ' V'; },
    verdict: function (s, m) { return m.e.opening > 0.8 ? { ok: true, text: 'Œil ouvert' } : m.e.opening > 0 ? { ok: true, text: 'Œil réduit' } : { ok: false, text: 'Œil fermé : décisions peu fiables' }; },
    readouts: [['Facteur de bruit', function (s, m) { return fN(m.r.nf, 3) + ' dB'; }], ['Gain total', function (s, m) { return fN(m.r.gain) + ' dB'; }], ['Bruit ramené en entrée', function (s, m) { return fN(m.n) + ' dBm'; }], ['Ouverture de l’œil', function (s, m) { return fN(m.e.opening) + ' V'; }]],
    plots: [{ options: function (s, m) { return { title: 'Diagramme de l’œil', desc: 'Superposition de quarante traces.', x: { min: 0, max: 1, label: 'temps (symbole)' }, y: { min: -2, max: 2, label: 'V' }, series: m.e.traces.map(function (p) { return { points: p, cls: 'scope__trace--thin' }; }) }; } }],
    explain: function (s, m) { return '<p>Avec le ' + (s.order === 'lna' ? 'LNA' : 'mélangeur') + ' en premier, le facteur de bruit total est ' + fN(m.r.nf, 3) + ' dB. Le bruit ramené à l’entrée atteint ' + fN(m.n) + ' dBm dans la bande. À l’instant de décision, l’œil est ouvert de ' + fN(m.e.opening) + ' V.</p>'; },
    missions: [
      { id: 'm1', title: 'Le bon ordre', text: 'Avec un mélangeur de 12 dB de NF ou plus, obtenez un facteur de bruit total inférieur à 2 dB.', solution: { order: 'lna', gl: 25, nl: 1, nm: 12, loss: 0 }, check: function (s, m) { if (s.nm < 12) return { ok: false, msg: 'Réglez le NF du mélangeur à 12 dB au moins.' }; return m.r.nf < 2 ? { ok: true, msg: 'Réussi : ' + fN(m.r.nf, 3) + ' dB. Le LNA masque le bruit du mélangeur.' } : { ok: false, msg: 'NF = ' + fN(m.r.nf, 3) + ' dB. Augmentez le gain du LNA, ou mettez-le en premier.' }; } },
      { id: 'm2', title: 'Le coût d’un câble', text: 'Avec une perte de câble de 3 dB ou plus avant le LNA, vérifiez que le facteur de bruit dépasse 4 dB.', solution: { loss: 4, gl: 20, nl: 1 }, check: function (s, m) { if (s.loss < 3) return { ok: false, msg: 'Ajoutez au moins 3 dB de perte.' }; return m.r.nf > 4 ? { ok: true, msg: 'Réussi : ' + fN(m.r.nf, 3) + ' dB ; une perte en tête s’ajoute directement au facteur de bruit.' } : { ok: false, msg: 'NF = ' + fN(m.r.nf, 3) + ' dB. Augmentez la perte.' }; } },
      { id: 'm3', title: 'Fermer l’œil', text: 'Augmentez le bruit et l’interférence pour fermer l’œil.', solution: { sigma: 0.6, isi: 0.6 }, check: function (s, m) { return m.e.opening <= 0.05 ? { ok: true, msg: 'Réussi : aucune décision fiable n’est possible.' } : { ok: false, msg: 'Ouverture : ' + fN(m.e.opening) + ' V.' }; } }],
    limits: '<p>Le bruit de phase et la non-linéarité ne sont pas modélisés. L’œil utilise une impulsion en cosinus surélevé et un bruit gaussien : il illustre la tendance, sans remplacer une mesure sur analyseur.</p>' };

  var list = [
    K.num('e1', 'Conversion dBm', 'Décibels', '<p>Convertissez 100 mW en dBm.</p>', 20, 'dBm', { abs: 0.1 }, '<p>10 log₁₀(100) = 20 dBm.</p>'),
    K.num('e2', 'Conversion en puissance', 'Décibels', '<p>Convertissez −30 dBm en µW.</p>', 1, 'µW', { rel: 0.02 }, '<p>−30 dBm = 10⁻³ mW = 1 µW.</p>'),
    K.num('e3', 'Plancher de bruit', 'Bruit', '<p>Calculez le bruit thermique à 290 K dans 1 MHz, en dBm.</p>', noiseDbm(1e6), 'dBm', { abs: 0.3 }, '<p>−174 + 10 log₁₀(10⁶) ≈ ' + fN(noiseDbm(1e6), 4) + ' dBm.</p>'),
    K.num('e4', 'Friis', 'Bruit', '<p>LNA : NF 2 dB, gain 15 dB ; mélangeur NF 8 dB. Calculez le NF total, en dB.</p>', friis([{ g: 15, nf: 2 }, { g: 0, nf: 8 }]).nf, 'dB', { abs: 0.1 }, '<p>F = ' + fN(K.fromDb(2), 3) + ' + (' + fN(K.fromDb(8), 3) + ' − 1)/' + fN(K.fromDb(15), 3) + ', soit ' + fN(friis([{ g: 15, nf: 2 }, { g: 0, nf: 8 }]).nf, 4) + ' dB.</p>'),
    K.num('e5', 'SNR de sortie', 'Bruit', '<p>SNR d’entrée 20 dB et NF 5 dB. Calculez le SNR de sortie, en dB.</p>', 15, 'dB', { abs: 0.1 }, '<p>SNR<sub>sortie</sub> = 20 − 5 = 15 dB.</p>'),
    K.num('e6', 'EVM en dB', 'Œil et EVM', '<p>EVM de 10 %. Calculez sa valeur en dB.</p>', -20, 'dB', { abs: 0.1 }, '<p>20 log₁₀(0,1) = −20 dB.</p>'),
    K.pick('e7', 'Premier étage', 'Bruit', '<p>Dans la formule de Friis, quel étage pèse le plus ?</p>', 'Le premier', ['Le dernier', 'Tous de la même façon', 'Le plus cher'], '<p>La contribution des suivants est divisée par le gain des précédents.</p>'),
    K.pick('e8', 'Œil fermé', 'Œil et EVM', '<p>Un œil fermé indique :</p>', 'un risque élevé d’erreurs de décision', ['une transmission parfaite', 'une fréquence trop basse', 'une alimentation éteinte'], '<p>Le récepteur ne peut plus distinguer sûrement les niveaux.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('qualite', list) };
});
