/*
 * TELECOM CONNECT LAB 2.0 — Amplificateurs opérationnels, filtres, oscillateurs.
 * Limites du LM741 : fiche TI SNOSC25D (0,5 V/µs, ±14 V, 1,5 MHz de bande).
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S, TAU = 2 * Math.PI;

  function gain(kind, Rf, Rg) { return kind === 'inv' ? -Rf / Rg : 1 + Rf / Rg; }
  function bandwidth(GBW, kind, Rf, Rg) { var noise = 1 + Rf / Rg; return GBW / noise; }
  function fullPower(SR, Vp) { return SR / (TAU * Vp); }
  /** Module d'un passe-bas du premier ordre. */
  function lp1(f, fc) { return 1 / Math.sqrt(1 + Math.pow(f / fc, 2)); }
  /** Sallen-Key passe-bas à gain unité, R1 = R2 = R. */
  function sallenKey(R, C1, C2) { return { f0: 1 / (TAU * R * Math.sqrt(C1 * C2)), Q: Math.sqrt(C1 * C2) / (2 * C2) }; }
  function lp2(f, f0, Q) { var u = f / f0; return 1 / Math.sqrt(Math.pow(1 - u * u, 2) + Math.pow(u / Q, 2)); }
  function wien(R, C) { return 1 / (TAU * R * C); }
  /**
   * Réponse temporelle d'un amplificateur non idéal à un sinus, sur une période :
   * limites de sortie (saturation) et pente maximale (slew rate).
   */
  function waveform(p) {
    var N = 720, T = 1 / p.f, dt = T / N, y = 0, out = [], clipped = false, slewed = false;
    for (var n = 0; n < 3 * N; n++) {
      var ideal = p.G * p.Vin * Math.sin(TAU * p.f * n * dt), target = Math.max(-p.Vsat, Math.min(p.Vsat, ideal));
      if (target !== ideal) clipped = true;
      var dy = target - y, mx = p.SR * dt;
      if (Math.abs(dy) > mx) { y += mx * (dy > 0 ? 1 : -1); slewed = true; } else y = target;
      if (n >= 2 * N) { var ph = (n - 2 * N) * dt * 1e3; out.push([ph, y, ideal]); }
    }
    // Le transitoire de démarrage est écarté : seule la dernière période compte pour la limitation.
    var lastSlew = false; y = out[0][1];
    for (var i = 1; i < out.length; i++) { if (Math.abs(out[i][1] - Math.max(-p.Vsat, Math.min(p.Vsat, out[i][2]))) > 0.02 * Math.max(p.Vsat, 1)) lastSlew = true; }
    return { trace: out, clipped: clipped, slewed: lastSlew };
  }
  var math = { gain: gain, bandwidth: bandwidth, fullPower: fullPower, lp1: lp1, sallenKey: sallenKey, lp2: lp2, wien: wien, waveform: waveform };

  function invSvg(dark, label) {
    return S.svg(520, 190, label || 'Montage inverseur : Rg vers l’entrée moins, Rf de la sortie vers l’entrée moins, entrée plus à la masse.', S.wire('M50 80H110M170 80H230M210 80V30H290M350 30H400V92M400 92H440M230 104H210V140') + S.R(140, 80, false, 'Rg') + S.R(320, 30, false, 'Rf') + S.opamp(270, 92) + S.wire('M310 92H400') + S.gnd(210, 140) + S.node(210, 80) + S.node(400, 92) + S.text(40, 85, 've', { a: 'end' }) + S.text(448, 97, 'vs', { a: 'start' }), dark);
  }
  var lesson = K.lesson({ id: 'aop', title: 'Amplificateurs opérationnels et filtres',
    intro: 'L’amplificateur opérationnel permet de construire amplificateurs, filtres et oscillateurs avec quelques résistances et condensateurs. Son gain réel ne dépend alors presque plus du composant.',
    objectives: ['Calculer le gain des montages inverseur et non inverseur.', 'Utiliser les hypothèses de l’AOP idéal.', 'Prévoir les limites : saturation, bande passante, vitesse de balayage.', 'Calculer un filtre actif et un oscillateur de Wien.'],
    prerequisites: 'Courant alternatif et impédance ; diviseur de tension.',
    sources: ['TI LM741, SNOSC25D (pente, gain, excursion).', 'Pages « Slew rate », « Gain-bandwidth product », « Sallen-Key topology », « Wien bridge oscillator ».'],
    figures: {
      inv: { caption: 'Montage inverseur : la contre-réaction ramène l’entrée inverseuse au potentiel de la masse.', svg: function () { return invSvg(false); } },
      gbw: { caption: 'Avec un produit gain-bande de 1,5 MHz, un gain de 100 limite la bande passante à 15 kHz.', options: function () { var G = [1, 10, 100]; return { kind: 'xy', title: 'Gain et bande passante', desc: 'Pour un produit gain-bande fixe, plus le gain augmente, plus la bande passante diminue.', x: { min: 100, max: 3e6, log: true, label: 'fréquence (Hz)' }, y: { min: 0.5, max: 200, log: true, label: 'gain' }, series: G.map(function (g, i) { return { samples: 200, cls: i === 1 ? 'scope__trace--alt' : undefined, fn: function (f) { return g * lp1(f, 1.5e6 / g); } }; }) }; } },
      filt: { caption: 'Réponse d’un filtre passe-bas du deuxième ordre (fréquence f₀ = 1 kHz) pour trois facteurs de qualité.', options: function () { return { kind: 'xy', title: 'Filtre du deuxième ordre', desc: 'Une valeur de Q élevée provoque une surtension près de la coupure.', x: { min: 100, max: 10000, log: true, label: 'fréquence (Hz)' }, y: { min: 0, max: 2.2, label: 'gain' }, series: [0.5, 0.707, 2].map(function (q, i) { return { samples: 200, cls: i === 1 ? 'scope__trace--alt' : undefined, fn: function (f) { return lp2(f, 1000, q); } }; }) }; } } },
    chapters: [
      { title: 'L’AOP idéal et ses montages', summary: 'Inverseur, non inverseur, suiveur, sommateur.', html: [
        '<p class="lead">Un AOP amplifie la différence entre ses deux entrées avec un très grand gain. Bouclé, il obéit à deux règles simples.</p>',
        K.defs([['Court-circuit virtuel', 'En contre-réaction, V<sub>+</sub> ≈ V<sub>−</sub>.'], ['Courants d’entrée nuls', 'Aucun courant n’entre dans les entrées d’un AOP idéal.'], ['Contre-réaction', 'Renvoi d’une partie de la sortie sur l’entrée inverseuse.']]),
        '<div data-fig="inv"></div>',
        K.formula(v('G') + ' = −' + v('R') + '<sub>f</sub> / ' + v('R') + '<sub>g</sub> (inverseur), ' + v('G') + ' = 1 + ' + v('R') + '<sub>f</sub> / ' + v('R') + '<sub>g</sub> (non inverseur)', 'AOP idéal en contre-réaction, sortie non saturée.'),
        K.example('un inverseur', '<p>R<sub>g</sub> = 10 kΩ et R<sub>f</sub> = 100 kΩ : G = −10. Une entrée de 0,5 V donne −5 V en sortie. Le montage impose une résistance d’entrée de 10 kΩ, à ne pas confondre avec celle de l’AOP.</p>'),
        '<p>Avec R<sub>f</sub> = 0 et R<sub>g</sub> infinie, le non inverseur devient un <strong>suiveur</strong> de gain 1 : il isole une source fragile d’une charge.</p>'] },
      { title: 'Les limites réelles', summary: 'Saturation, gain-bande, vitesse de balayage.', html: [
        '<p class="lead">Un AOP réel ne suit le modèle idéal que dans certaines limites, à vérifier à chaque conception.</p>',
        K.formula(v('f') + '<sub>c</sub> ≈ GBW / (1 + ' + v('R') + '<sub>f</sub>/' + v('R') + '<sub>g</sub>), ' + v('f') + '<sub>max</sub> = SR / (2π ' + v('V') + '<sub>p</sub>)', 'GBW en Hz, SR en V/s, V<sub>p</sub> amplitude de sortie. La bande est calculée à partir du gain de bruit, identique pour les deux montages.'),
        '<div data-fig="gbw"></div>',
        K.defs([['Saturation', 'La sortie ne peut dépasser une limite inférieure à l’alimentation : environ ±14 V sous ±15 V pour un LM741.'], ['Vitesse de balayage (slew rate)', 'Pente maximale de la sortie : 0,5 V/µs typique pour un LM741.'], ['Tension de décalage', 'Petite tension d’erreur en entrée, multipliée par le gain.']]),
        K.example('la limite de pente', '<p>Pour une sortie de 10 V d’amplitude, un LM741 à 0,5 V/µs suit au mieux f = 0,5·10⁶/(2π × 10) = ' + si(fullPower(0.5e6, 10), 'Hz') + '. Au-delà, la sortie devient triangulaire.</p>')] },
      { title: 'Filtres actifs', summary: 'Premier ordre, Sallen-Key, facteur de qualité.', html: [
        '<p class="lead">Un filtre actif sélectionne des fréquences sans inductance encombrante, avec un gain et une isolation apportés par l’AOP.</p>',
        K.formula(v('f') + '<sub>c</sub> = 1/(2π' + v('R') + v('C') + ') (premier ordre), ' + v('f') + '₀ = 1/(2π' + v('R') + '√(C₁C₂)), ' + v('Q') + ' = √(C₁C₂)/(2C₂)', 'Sallen-Key passe-bas à gain unité, R₁ = R₂ = R. C₁ est le condensateur de contre-réaction.'),
        '<div data-fig="filt"></div>',
        K.example('filtre de Butterworth à 1 kHz', '<p>Pour Q = 0,707, on prend C₁ = 2C₂. Avec C₂ = 10 nF, C₁ = 20 nF, et R = 1/(2π × 1000 × √(C₁C₂)) = ' + si(1 / (TAU * 1000 * Math.sqrt(20e-9 * 10e-9)), 'Ω') + '.</p>')] },
      { title: 'Oscillateurs et générateurs', summary: 'Critère de Barkhausen, pont de Wien.', html: [
        '<p class="lead">Un oscillateur est un amplificateur bouclé sur lui-même de façon à entretenir une sinusoïde.</p>',
        K.defs([['Condition d’oscillation', 'Le gain de boucle vaut 1 et sa phase est nulle (critère de Barkhausen).'], ['Oscillateur à quartz', 'Utilise la résonance mécanique très stable d’un cristal.']]),
        K.formula(v('f') + ' = 1/(2π' + v('R') + v('C') + '), ' + v('R') + '<sub>f</sub> = 2 ' + v('R') + '<sub>g</sub> (gain de 3)', 'Pont de Wien avec R et C égaux dans les deux branches. Une régulation d’amplitude est nécessaire en pratique.'),
        K.example('pont de Wien', '<p>R = 15 kΩ, C = 10 nF : f = ' + si(wien(15000, 10e-9), 'Hz') + '.</p>'),
        K.apply('<p>Les générateurs de signaux modernes utilisent souvent la synthèse numérique directe (DDS), plus flexible, mais l’oscillateur bouclé reste la base des références de fréquence.</p>'),
        K.pitfalls(['<strong>Compter sur le gain sans vérifier la bande passante.</strong>', '<strong>Ignorer la saturation</strong> : la sortie ne peut dépasser l’alimentation.', '<strong>Oublier le condensateur de découplage de l’alimentation</strong>, source d’oscillations parasites.', '<strong>Choisir un AOP à entrée non adaptée</strong> à l’alimentation unique : le LM741 nécessite une alimentation symétrique ou une polarisation adaptée.']),
        K.summary(['G = −R<sub>f</sub>/R<sub>g</sub> ou 1 + R<sub>f</sub>/R<sub>g</sub>.', 'f<sub>c</sub> ≈ GBW/gain ; f<sub>max</sub> = SR/(2πV<sub>p</sub>).', 'Un filtre du deuxième ordre est caractérisé par f₀ et Q.', 'Un oscillateur a un gain de boucle de 1 et une phase nulle.']),
        K.toLab('aop', 'Augmentez le gain, la fréquence et l’amplitude jusqu’à voir apparaître chaque limite.')] }
    ] });

  var D = { kind: 'inv', Rf: 100, Rg: 10, Vin: 0.5, f: 1000, Vsat: 14, SR: 0.5, GBW: 1.5, fcKhz: 1, Q: 0.707 };
  function M(s) {
    var G = gain(s.kind, s.Rf, s.Rg), bw = bandwidth(s.GBW * 1e6, s.kind, s.Rf, s.Rg), atten = lp1(s.f, bw), Geff = G * atten;
    var w = waveform({ G: Geff, Vin: s.Vin, f: s.f, Vsat: s.Vsat, SR: s.SR * 1e6 }), Vp = Math.abs(Geff) * s.Vin;
    return { G: G, bw: bw, Geff: Geff, w: w, Vp: Vp, fp: fullPower(s.SR * 1e6, Math.max(Vp, 1e-3)), clip: Vp > s.Vsat, slew: Math.min(Vp, s.Vsat) * TAU * s.f > s.SR * 1e6 };
  }
  var lab = { id: 'aop', title: 'Amplificateur réel et filtre', short: 'AOP et filtres', icon: 'modulation', badge: 'Modèle au premier ordre : saturation, bande, pente',
    text: 'Configurez un amplificateur, puis faites apparaître successivement la saturation, la limite de bande passante et la limite de pente.',
    summary: 'Réglez un montage inverseur ou non inverseur et observez saturation, bande passante et vitesse de balayage ; comparez des filtres.',
    params: [{ group: 'Montage' }, { k: 'kind', label: 'Type', opts: [['inv', 'Inverseur'], ['non', 'Non inverseur']] }, { k: 'Rf', label: 'R<sub>f</sub>', min: 1, max: 1000, log: true, unit: 'kΩ', dec: 1 }, { k: 'Rg', label: 'R<sub>g</sub>', min: 1, max: 100, log: true, unit: 'kΩ', dec: 1 }, { group: 'Signal' }, { k: 'Vin', label: 'Amplitude d’entrée', min: 0.001, max: 5, log: true, unit: 'V', dec: 3 }, { k: 'f', label: 'Fréquence', min: 10, max: 1000000, log: true, unit: 'Hz', dec: 0 }, { group: 'Composant' }, { k: 'Vsat', label: 'Limite de sortie', min: 3, max: 15, step: 0.5, unit: 'V', dec: 1 }, { k: 'SR', label: 'Vitesse de balayage', min: 0.1, max: 20, log: true, unit: 'V/µs', dec: 2 }, { k: 'GBW', label: 'Produit gain-bande', min: 0.5, max: 100, log: true, unit: 'MHz', dec: 2 }, { group: 'Filtre (2ᵉ graphique)' }, { k: 'fcKhz', label: 'Fréquence f₀', min: 0.1, max: 100, log: true, unit: 'kHz', dec: 2 }, { k: 'Q', label: 'Facteur Q', min: 0.3, max: 5, step: 0.01, unit: '', dec: 2 }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Gain idéal ' + fN(m.G) + ' ; gain réel ' + fN(m.Geff); },
    verdict: function (s, m) { if (m.clip) return { ok: false, text: 'Saturation de la sortie' }; if (m.slew) return { ok: false, text: 'Pente limitée' }; return { ok: true, text: 'Sortie fidèle' }; },
    readouts: [['Gain idéal', function (s, m) { return fN(m.G); }], ['Bande passante', function (s, m) { return si(m.bw, 'Hz'); }], ['Amplitude attendue', function (s, m) { return fN(m.Vp) + ' V'; }], ['Fréquence limite de pente', function (s, m) { return si(m.fp, 'Hz'); }]],
    plots: [{ expr: function () { return 'Sortie réelle (trait plein) et sortie sans limitation (pointillés), sur une période'; }, options: function (s, m) { var last = m.w.trace[m.w.trace.length - 1][0]; var y = Math.max(s.Vsat, m.Vp) * 1.2; return { title: 'Forme d’onde', desc: 'Sortie de l’amplificateur comparée à une sortie idéale.', x: { min: 0, max: last, label: 'temps (ms)' }, y: { min: -y, max: y, label: 'sortie (V)' }, series: [{ points: m.w.trace.map(function (p) { return [p[0], p[2]]; }), cls: 'scope__trace--ref' }, { points: m.w.trace.map(function (p) { return [p[0], p[1]]; }) }], hlines: [{ y: s.Vsat, label: 'limite' }, { y: -s.Vsat }] }; } },
      { expr: function (s) { return 'Filtre passe-bas du deuxième ordre : f₀ = ' + si(s.fcKhz * 1000, 'Hz') + ', Q = ' + fN(s.Q); }, options: function (s) { var f0 = s.fcKhz * 1000, top = Math.max(1.1, lp2(f0 * Math.sqrt(Math.max(1 - 1 / (2 * s.Q * s.Q), 0.0001)), f0, s.Q)) * 1.15; return { title: 'Réponse du filtre', desc: 'Gain du filtre en fonction de la fréquence.', x: { min: f0 / 30, max: f0 * 30, log: true, label: 'fréquence (Hz)' }, y: { min: 0, max: top, label: 'gain' }, series: [{ samples: 240, fn: function (f) { return lp2(f, f0, s.Q); } }], vlines: [{ x: f0, label: 'f₀' }], hlines: [{ y: 0.707, label: '−3 dB', anchor: 'start' }] }; } }],
    explain: function (s, m) { return '<p>Gain demandé : ' + fN(m.G) + '. La bande passante vaut environ ' + si(m.bw, 'Hz') + ' ; à ' + si(s.f, 'Hz') + ', le gain effectif est ' + fN(m.Geff) + ', soit une amplitude de ' + fN(m.Vp) + ' V. ' + (m.clip ? 'Elle dépasse la limite de ' + fN(s.Vsat) + ' V : la sortie sature.' : '') + (m.slew ? ' La pente demandée dépasse aussi la vitesse de balayage.' : '') + '</p>'; },
    missions: [
      { id: 'm1', title: 'Saturer la sortie', text: 'Atteignez la saturation de la sortie.', solution: { Vin: 2 }, check: function (s, m) { return m.clip ? { ok: true, msg: 'Réussi : l’amplitude attendue (' + fN(m.Vp) + ' V) dépasse la limite.' } : { ok: false, msg: 'Amplitude : ' + fN(m.Vp) + ' V, limite ' + fN(s.Vsat) + ' V. Augmentez l’entrée ou le gain.' }; } },
      { id: 'm2', title: 'Limite de pente', text: 'Sans saturer, faites apparaître la limitation de pente.', solution: { Vin: 1, f: 15000, Rf: 100, Rg: 10 }, check: function (s, m) { if (m.clip) return { ok: false, msg: 'La sortie sature. Réduisez l’amplitude.' }; return m.slew ? { ok: true, msg: 'Réussi : la pente demandée dépasse ' + fN(s.SR) + ' V/µs.' } : { ok: false, msg: 'La fréquence limite est ' + si(m.fp, 'Hz') + '. Augmentez la fréquence.' }; } },
      { id: 'm3', title: 'Élargir la bande', text: 'Obtenez une bande passante d’au moins 500 kHz, avec un GBW de 1,5 MHz.', solution: { Rf: 10, Rg: 10, kind: 'inv' }, check: function (s, m) { if (Math.abs(s.GBW - 1.5) > 0.01) return { ok: false, msg: 'Gardez le GBW à 1,5 MHz.' }; return m.bw >= 500000 ? { ok: true, msg: 'Réussi : ' + si(m.bw, 'Hz') + ' pour un gain de ' + fN(m.G) + '.' } : { ok: false, msg: 'Bande : ' + si(m.bw, 'Hz') + '. Réduisez le gain.' }; } },
      { id: 'm4', title: 'Réglage sans surtension', text: 'Réglez Q à 0,707 (Butterworth), à 0,02 près.', solution: { Q: 0.707 }, check: function (s) { return Math.abs(s.Q - 0.707) <= 0.02 && s.fcKhz !== 1 ? { ok: true, msg: 'Réussi : réponse la plus plate sans surtension.' } : { ok: false, msg: 'Réglez Q à 0,707 et une fréquence f₀ différente de 1 kHz.' }; } }],
    limits: '<p>Le gain en boucle fermée suit un pôle unique. La tension de décalage, le bruit, l’impédance de sortie et les marges de stabilité ne sont pas représentés. Les filtres supposent un AOP idéal et des composants exacts.</p>' };
  lab.missions[3].solution = { Q: 0.707, fcKhz: 2 };

  var list = [
    K.num('e1', 'Gain inverseur', 'Montages', '<p>R<sub>f</sub> = 47 kΩ, R<sub>g</sub> = 4,7 kΩ en inverseur. Calculez le gain.</p>', -10, '', { rel: 0.02 }, '<p>G = −R<sub>f</sub>/R<sub>g</sub> = −10.</p>'),
    K.num('e2', 'Gain non inverseur', 'Montages', '<p>R<sub>f</sub> = 90 kΩ, R<sub>g</sub> = 10 kΩ en non inverseur. Calculez le gain.</p>', 10, '', { rel: 0.02 }, '<p>G = 1 + 90/10 = 10.</p>'),
    K.num('e3', 'Bande passante', 'Limites', '<p>GBW = 1,5 MHz, montage de gain 100. Calculez la bande passante, en kHz.</p>', 15, 'kHz', { rel: 0.02 }, '<p>f<sub>c</sub> ≈ 1,5 MHz / 100 = 15 kHz.</p>'),
    K.num('e4', 'Vitesse de balayage', 'Limites', '<p>SR = 0,5 V/µs, sortie de 5 V d’amplitude. Calculez la fréquence maximale, en kHz.</p>', fullPower(0.5e6, 5) / 1000, 'kHz', { rel: 0.03 }, '<p>f = SR/(2πV<sub>p</sub>) = ' + fN(fullPower(0.5e6, 5) / 1000, 4) + ' kHz.</p>'),
    K.num('e5', 'Filtre du premier ordre', 'Filtres', '<p>R = 1,6 kΩ, C = 100 nF. Calculez la fréquence de coupure, en Hz.</p>', 1 / (TAU * 1600 * 100e-9), 'Hz', { rel: 0.02 }, '<p>f<sub>c</sub> = 1/(2πRC) = ' + fN(1 / (TAU * 1600 * 100e-9), 4) + ' Hz.</p>'),
    K.num('e6', 'Oscillateur de Wien', 'Oscillateurs', '<p>R = 10 kΩ, C = 16 nF. Calculez la fréquence, en Hz.</p>', wien(10000, 16e-9), 'Hz', { rel: 0.02 }, '<p>f = 1/(2πRC) = ' + fN(wien(10000, 16e-9), 4) + ' Hz.</p>'),
    K.pick('e7', 'Court-circuit virtuel', 'Montages', '<p>En contre-réaction, un AOP idéal fonctionne de sorte que :</p>', 'V+ et V− sont pratiquement égales', ['V+ est toujours nulle', 'la sortie est toujours nulle', 'les entrées absorbent un fort courant'], '<p>Le grand gain impose une différence d’entrée quasi nulle tant que la sortie ne sature pas.</p>'),
    K.pick('e8', 'Critère d’oscillation', 'Oscillateurs', '<p>Quelle condition entretient une oscillation sinusoïdale ?</p>', 'Gain de boucle de 1 et phase nulle', ['Gain de boucle nul', 'Une phase de 90° quelle que soit l’amplitude', 'Un gain négatif en continu'], '<p>C’est le critère de Barkhausen.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('aop', list) };
});
