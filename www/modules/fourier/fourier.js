/*
 * TELECOM CONNECT LAB 2.0 — Signaux et systèmes : Fourier, filtres, bande passante.
 * Modèle : série de Fourier tronquée et système linéaire du premier ordre.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S, TAU = 2 * Math.PI;

  /** Liste [{ n, a }] des harmoniques d'amplitude a ; signal sin(2π n f t). */
  function harmonics(kind, A, N) {
    var out = [], n;
    if (kind === 'square') for (n = 1; n <= N; n += 2) out.push({ n: n, a: 4 * A / (Math.PI * n) });
    else if (kind === 'triangle') for (n = 1; n <= N; n += 2) out.push({ n: n, a: (n % 4 === 1 ? 1 : -1) * 8 * A / (Math.PI * Math.PI * n * n) });
    else for (n = 1; n <= N; n++) out.push({ n: n, a: (n % 2 ? 1 : -1) * 2 * A / (Math.PI * n) });
    return out;
  }
  function power(kind, A) { return kind === 'square' ? A * A : A * A / 3; }
  function ideal(kind, A, f, t) {
    var p = ((t * f) % 1 + 1) % 1;
    if (kind === 'square') return p < 0.5 ? A : -A;
    if (kind === 'triangle') return p < 0.25 ? 4 * A * p : p < 0.75 ? 2 * A - 4 * A * p : 4 * A * p - 4 * A;
    return p < 0.5 ? 2 * A * p : 2 * A * p - 2 * A;
  }
  function lpResp(f, fc) { var x = f / fc; return { mag: 1 / Math.sqrt(1 + x * x), ph: -Math.atan(x) }; }
  function synth(list, f, t, fc) {
    return list.reduce(function (s, h) { var r = fc ? lpResp(h.n * f, fc) : { mag: 1, ph: 0 }; return s + h.a * r.mag * Math.sin(TAU * h.n * f * t + r.ph); }, 0);
  }
  function truncErr(kind, A, list) { var kept = list.reduce(function (s, h) { return s + h.a * h.a / 2; }, 0), p = power(kind, A); return Math.sqrt(Math.max(p - kept, 0) / p); }
  var math = { harmonics: harmonics, power: power, ideal: ideal, lpResp: lpResp, synth: synth, truncErr: truncErr };

  var lesson = K.lesson({ id: 'fourier', title: 'Signaux et systèmes',
    intro: 'Un signal complexe se décompose en sinusoïdes. Cette idée explique la largeur de bande d’un message, le rôle des filtres et la façon dont un canal déforme ce qu’il transmet.',
    objectives: ['Représenter un signal périodique par son spectre.', 'Calculer les harmoniques d’un signal carré.', 'Prévoir l’effet d’un système linéaire sur un signal.', 'Relier bande passante et fidélité d’une transmission.'],
    prerequisites: 'Comprendre les signaux : amplitude, fréquence, phase.',
    sources: ['Page « Square wave (waveform) » : harmoniques impaires d’un signal carré.', 'Formule de Parseval contrôlée numériquement (tests/content-references.js).'],
    figures: {
      syn: { caption: 'Un signal carré reconstitué avec les harmoniques 1, 3 et 5 : la somme se rapproche du carré, avec des oscillations près des fronts.', options: function () { var h = harmonics('square', 1, 5); return { kind: 'xy', title: 'Synthèse d’un carré', desc: 'Signal carré et somme de trois harmoniques.', x: { min: 0, max: 2, label: 'temps (périodes)' }, y: { min: -1.5, max: 1.5, label: 'amplitude' }, series: [{ samples: 500, cls: 'scope__trace--ref', fn: function (t) { return ideal('square', 1, 1, t); } }, { samples: 500, fn: function (t) { return synth(h, 1, t); } }] }; } },
      spec: { caption: 'Spectre d’un signal carré d’amplitude 1 : seules les harmoniques impaires sont présentes, en 1/n.', options: function () { return { kind: 'xy', title: 'Spectre du signal carré', desc: 'Raies aux harmoniques impaires d’amplitude décroissante.', x: { min: 0, max: 12, ticks: [1, 3, 5, 7, 9, 11], label: 'rang n' }, y: { min: 0, max: 1.5, label: 'amplitude' }, bars: harmonics('square', 1, 11).map(function (h) { return { x: h.n, y: h.a }; }) }; } },
      sys: { caption: 'Un système linéaire et invariant modifie l’amplitude et la phase de chaque sinusoïde, sans en créer de nouvelles.', svg: function () { return S.blocks({ w: 520, h: 110, label: 'Entrée x(t), système H(f), sortie y(t).', boxes: [{ id: 'a', x: 30, y: 30, w: 110, h: 50, t: 'x(t)' }, { id: 'b', x: 205, y: 30, w: 110, h: 50, t: 'H(f)', sub: 'filtre, canal' }, { id: 'c', x: 380, y: 30, w: 110, h: 50, t: 'y(t)' }], links: [{ a: 'a', b: 'b' }, { a: 'b', b: 'c' }] }); } } },
    chapters: [
      { title: 'Le spectre d’un signal', summary: 'Domaine temporel et fréquentiel.', html: [
        '<p class="lead">Le même signal peut être vu de deux façons : son évolution dans le temps, ou la liste des sinusoïdes qui le composent.</p>',
        K.defs([['Spectre', 'Répartition de l’amplitude d’un signal selon la fréquence.'], ['Fondamental', 'Composante à la fréquence du signal.'], ['Harmonique de rang n', 'Composante de fréquence n·f.']]),
        K.formula(v('x') + '(' + v('t') + ') = ∑ a<sub>n</sub> sin(2π n f ' + v('t') + ' + φ<sub>n</sub>)', 'Signal périodique de fréquence f, décomposé en harmoniques.'),
        '<div data-fig="spec"></div>',
        K.example('harmoniques d’un carré', '<p>Pour un carré d’amplitude A, a<sub>n</sub> = 4A/(πn) pour n impair, et zéro pour n pair. À A = 5 V, le fondamental vaut 4 × 5/π = ' + fN(20 / Math.PI) + ' V et le rang 3 vaut ' + fN(20 / (3 * Math.PI)) + ' V.</p>')] },
      { title: 'Reconstruire un signal', summary: 'Série tronquée, largeur de bande.', html: [
        '<p class="lead">Un canal limité ne transmet qu’une partie des harmoniques. Les fronts raides disparaissent en premier.</p>',
        '<div data-fig="syn"></div>',
        K.formula(v('P') + ' = ∑ a<sub>n</sub>²/2', 'Théorème de Parseval : la puissance se conserve entre les deux représentations (signal à valeur moyenne nulle).'),
        K.example('puissance retenue', '<p>Un carré d’amplitude A a une puissance A². Le seul fondamental apporte (4A/π)²/2 = ' + fN(8 / (Math.PI * Math.PI) * 100) + ' % de cette puissance. En gardant aussi le rang 3, on atteint ' + fN((8 / (Math.PI * Math.PI) + 8 / (9 * Math.PI * Math.PI)) * 100) + ' %.</p>'),
        K.apply('<p>Sur un câble ou un canal radio, la bande disponible limite le débit. C’est le lien direct entre la largeur de bande d’un système et la vitesse de transmission possible.</p>')] },
      { title: 'Systèmes linéaires', summary: 'Réponse en fréquence, filtrage.', html: [
        '<p class="lead">Un système linéaire et invariant dans le temps traite chaque fréquence indépendamment.</p>',
        '<div data-fig="sys"></div>',
        K.formula('|H(' + v('f') + ')| = 1/√(1 + (' + v('f') + '/' + v('f') + '<sub>c</sub>)²), φ(' + v('f') + ') = −arctan(' + v('f') + '/' + v('f') + '<sub>c</sub>)', 'Passe-bas du premier ordre. À f<sub>c</sub>, le gain vaut 1/√2, soit −3 dB.'),
        K.defs([['Linéarité', 'La réponse à une somme est la somme des réponses.'], ['Invariance', 'Le système se comporte de la même façon à tout instant.'], ['Bande passante', 'Plage où le gain reste supérieur à −3 dB du maximum.']]),
        K.example('filtrer un carré', '<p>Carré à 1 kHz, passe-bas à f<sub>c</sub> = 1 kHz : le fondamental est multiplié par ' + fN(lpResp(1000, 1000).mag) + ' et le rang 3 par ' + fN(lpResp(3000, 1000).mag) + '. La sortie est arrondie.</p>'),
        K.pitfalls(['<strong>Croire qu’un système linéaire crée de nouvelles fréquences.</strong> Seul un système non linéaire le fait.', '<strong>Oublier le déphasage</strong>, qui déforme le signal même si les amplitudes sont conservées.', '<strong>Confondre fréquence et rang d’harmonique.</strong>']),
        K.summary(['Un signal périodique est une somme de sinusoïdes.', 'Un carré contient les harmoniques impaires en 4A/(πn).', 'P = ∑ a<sub>n</sub>²/2.', 'Un système linéaire agit sur amplitude et phase, fréquence par fréquence.']),
        K.toLab('fourier', 'Construisez un signal harmonique par harmonique et filtrez-le.')] }
    ] });

  var D = { kind: 'square', A: 1, f: 1000, N: 3, fc: 50000 };
  function M(s) { var list = harmonics(s.kind, s.A, s.N); return { list: list, err: truncErr(s.kind, s.A, list), band: s.N * s.f, cnt: list.length, h1: lpResp(s.f, s.fc), h3: lpResp(3 * s.f, s.fc) }; }
  var lab = { id: 'fourier', title: 'Synthèse de Fourier et filtrage', short: 'Signaux et systèmes', icon: 'wave', badge: 'Série de Fourier tronquée, filtre du premier ordre',
    text: 'Ajoutez des harmoniques pour reconstruire un signal, puis faites-le passer dans un filtre passe-bas.',
    summary: 'Reconstruisez un signal carré, triangle ou en dents de scie, observez son spectre et son passage dans un filtre.',
    params: [{ group: 'Signal' }, { k: 'kind', label: 'Forme', opts: [['square', 'Carré'], ['triangle', 'Triangle'], ['saw', 'Dents de scie']] }, { k: 'A', label: 'Amplitude', min: 0.1, max: 10, step: 0.1, unit: 'V', dec: 2 }, { k: 'f', label: 'Fréquence', min: 10, max: 100000, log: true, unit: 'Hz', dec: 0 }, { k: 'N', label: 'Rang maximal', min: 1, max: 51, step: 1, unit: '', dec: 0, hint: 'De 1 à 51 : harmoniques conservées.' }, { group: 'Filtre passe-bas' }, { k: 'fc', label: 'Fréquence de coupure', min: 10, max: 1000000, log: true, unit: 'Hz', dec: 0 }],
    defaults: D, model: M,
    expr: function (s, m) { return m.cnt + ' harmonique(s) ; bande occupée : ' + si(m.band, 'Hz'); },
    readouts: [['Harmoniques', function (s, m) { return String(m.cnt); }], ['Erreur quadratique', function (s, m) { return fN(m.err * 100) + ' %'; }], ['Bande du signal', function (s, m) { return si(m.band, 'Hz'); }], ['Gain sur le fondamental', function (s, m) { return fN(m.h1.mag); }]],
    plots: [{ expr: function (s, m) { return 'Forme d’onde : signal idéal, somme des harmoniques, sortie filtrée'; }, options: function (s, m) { return { title: 'Forme d’onde', desc: 'Signal idéal, reconstruction et sortie du filtre.', x: { min: 0, max: 2000 / s.f, label: 'temps (ms)' }, y: { min: -1.5 * s.A, max: 1.5 * s.A, label: 'V' }, series: [{ samples: 800, cls: 'scope__trace--ref', fn: function (t) { return ideal(s.kind, s.A, s.f, t / 1000); } }, { samples: 800, fn: function (t) { return synth(m.list, s.f, t / 1000); } }, { samples: 800, cls: 'scope__trace--alt', fn: function (t) { return synth(m.list, s.f, t / 1000, s.fc); } }] }; } },
      { expr: function () { return 'Spectre du signal et réponse du filtre'; }, options: function (s, m) { return { title: 'Spectre', desc: 'Amplitude des harmoniques.', x: { min: 0, max: (s.N + 1) * s.f, label: 'fréquence (Hz)' }, y: { min: 0, max: 1.4 * Math.abs(m.list[0].a), label: 'amplitude (V)' }, bars: m.list.map(function (h) { return { x: h.n * s.f, y: Math.abs(h.a) * lpResp(h.n * s.f, s.fc).mag }; }) }; } }],
    explain: function (s, m) { return '<p>Avec ' + m.cnt + ' harmonique(s), il manque ' + fN(m.err * 100) + ' % de la valeur efficace du signal idéal. Le filtre conserve ' + fN(m.h1.mag * 100) + ' % du fondamental et ' + fN(m.h3.mag * 100) + ' % du rang 3.</p>'; },
    missions: [
      { id: 'm1', title: 'Approcher un carré', text: 'Obtenez une erreur inférieure à 10 % sur un signal carré.', solution: { kind: 'square', N: 51 }, check: function (s, m) { if (s.kind !== 'square') return { ok: false, msg: 'Choisissez le carré.' }; return m.err < 0.1 ? { ok: true, msg: 'Réussi : ' + fN(m.err * 100) + ' % d’erreur avec ' + m.cnt + ' harmoniques.' } : { ok: false, msg: 'Erreur : ' + fN(m.err * 100) + ' %. Ajoutez des harmoniques.' }; } },
      { id: 'm2', title: 'Isoler le fondamental', text: 'Avec un carré jusqu’au rang 9 au moins, réglez le filtre pour garder le fondamental (gain supérieur à 0,7) et atténuer le rang 3 à moins de 0,45.', solution: { kind: 'square', N: 9, fc: 1000 }, check: function (s, m) { if (s.kind !== 'square' || s.N < 9) return { ok: false, msg: 'Choisissez le carré, avec un rang maximal d’au moins 9.' }; return m.h1.mag >= 0.7 && m.h3.mag < 0.45 ? { ok: true, msg: 'Réussi : gains ' + fN(m.h1.mag) + ' et ' + fN(m.h3.mag) + '.' } : { ok: false, msg: 'Gains : ' + fN(m.h1.mag) + ' et ' + fN(m.h3.mag) + '. Placez f_c près de f.' }; } },
      { id: 'm3', title: 'Le triangle converge vite', text: 'Atteignez moins de 3 % d’erreur sur un triangle, avec au plus 5 harmoniques.', solution: { kind: 'triangle', N: 7 }, check: function (s, m) { if (s.kind !== 'triangle') return { ok: false, msg: 'Choisissez le triangle.' }; return m.err < 0.03 && m.cnt <= 5 ? { ok: true, msg: 'Réussi : ' + fN(m.err * 100) + ' %. Les harmoniques du triangle décroissent en 1/n².' } : { ok: false, msg: 'Erreur : ' + fN(m.err * 100) + ' %, ' + m.cnt + ' harmoniques.' }; } }],
    limits: '<p>Signal périodique idéal, sans bruit. La troncature et l’effet de Gibbs sont représentés, mais le filtre réel n’est que du premier ordre. Les signaux non périodiques demandent la transformée de Fourier, non simulée ici.</p>' };

  var list = [
    K.num('e1', 'Harmonique d’un carré', 'Spectre', '<p>Carré d’amplitude 2 V. Calculez l’amplitude du fondamental, en V.</p>', 8 / Math.PI, 'V', { rel: 0.02 }, '<p>a₁ = 4A/π = ' + fN(8 / Math.PI, 4) + ' V.</p>'),
    K.num('e2', 'Rang 5', 'Spectre', '<p>Carré d’amplitude 10 V. Calculez l’amplitude de l’harmonique 5, en V.</p>', 40 / (5 * Math.PI), 'V', { rel: 0.02 }, '<p>a₅ = 4 × 10/(5π) = ' + fN(40 / (5 * Math.PI), 4) + ' V.</p>'),
    K.num('e3', 'Puissance du fondamental', 'Parseval', '<p>Quelle fraction de la puissance d’un carré est portée par son fondamental, en % ?</p>', 8 / (Math.PI * Math.PI) * 100, '%', { rel: 0.02 }, '<p>8/π² = ' + fN(8 / (Math.PI * Math.PI) * 100, 4) + ' %.</p>'),
    K.num('e4', 'Gain à la coupure', 'Filtres', '<p>Calculez le gain d’un filtre du premier ordre à f = f<sub>c</sub>.</p>', 1 / Math.SQRT2, '', { rel: 0.02 }, '<p>1/√2 ≈ 0,707, soit −3 dB.</p>'),
    K.num('e5', 'Gain hors bande', 'Filtres', '<p>Calculez le gain d’un passe-bas du premier ordre à f = 10 f<sub>c</sub>.</p>', lpResp(10, 1).mag, '', { rel: 0.02 }, '<p>1/√(1 + 100) = ' + fN(lpResp(10, 1).mag, 4) + '.</p>'),
    K.num('e6', 'Bande nécessaire', 'Largeur de bande', '<p>Un carré de 2 kHz est transmis jusqu’au rang 7. Calculez la bande nécessaire, en kHz.</p>', 14, 'kHz', { rel: 0.02 }, '<p>7 × 2 = 14 kHz.</p>'),
    K.pick('e7', 'Harmoniques d’un carré', 'Spectre', '<p>Un signal carré symétrique contient :</p>', 'uniquement des harmoniques impaires', ['uniquement des harmoniques paires', 'toutes les harmoniques', 'un fondamental seulement'], '<p>Sa symétrie annule les rangs pairs.</p>'),
    K.pick('e8', 'Système linéaire', 'Systèmes', '<p>Un système linéaire invariant excité par une sinusoïde :</p>', 'produit une sinusoïde de même fréquence', ['double la fréquence', 'produit un carré', 'crée toujours des harmoniques'], '<p>Seules l’amplitude et la phase changent.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('fourier', list) };
});
