/*
 * TELECOM CONNECT LAB 2.0 — Diodes, redressement, alimentations.
 * Valeurs de composants : fiches Vishay 1N4007 et 1N4733A, TI LM7805.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S, TAU = 2 * Math.PI;
  var VT = 0.02585; // kT/q à 300 K (V)

  function shockley(Is, n, Vd) { return Is * (Math.exp(Vd / (n * VT)) - 1); }
  /** Point de fonctionnement d'une diode en série avec R, par dichotomie sur la loi de Kirchhoff. */
  function operating(E, R, Is, n) {
    if (E <= 0) return { Vd: E, I: 0 };
    var a = 0, b = E, f = function (x) { return (E - x) / R - shockley(Is, n, x); };
    for (var i = 0; i < 80; i++) { var c = (a + b) / 2; if (f(c) > 0) a = c; else b = c; }
    var Vd = (a + b) / 2; return { Vd: Vd, I: (E - Vd) / R };
  }
  /** Simulation temporelle d'un redresseur à capacité : la diode conduit quand la source dépasse la sortie. */
  function rectifier(p) {
    var f = p.f, T = 1 / f, drop = p.type === 'bridge' ? 2 * p.Vf : p.Vf, dt = T / 1000, N = 6000, C = p.C, R = p.R, Vp = p.Vp, vc = 0, out = [];
    function src(t) { var x = Vp * Math.sin(TAU * f * t); return p.type === 'bridge' ? Math.abs(x) : x; }
    var ipk = 0, last = N - 2000, vmin = Infinity, vmax = -Infinity, sum = 0, cnt = 0;
    for (var i = 0; i < N; i++) {
      var t = i * dt, vs = src(t), target = vs - drop;
      if (C <= 0) { vc = Math.max(0, target); }
      else if (target > vc) {
        // Diode passante : la capacité suit la source (résistance série négligée).
        var dv = target - vc, ic = C * dv / dt; vc = target; if (i >= last) ipk = Math.max(ipk, ic + vc / R);
      } else { vc *= Math.exp(-dt / (R * C)); }
      if (i >= last) { vmin = Math.min(vmin, vc); vmax = Math.max(vmax, vc); sum += vc; cnt++; }
      if (i >= N - 2000 && i % 10 === 0) out.push([(t - (N - 2000) * dt) * 1000, vc, vs]);
    }
    return { trace: out, vmin: vmin, vmax: vmax, vavg: sum / cnt, ripple: vmax - vmin, ipk: ipk, prv: p.type === 'bridge' ? Vp - p.Vf : (C > 0 ? 2 * Vp : Vp) };
  }
  function zener(Vin, Rs, Vz, Rl, Izm) {
    var openV = Vin * Rl / (Rs + Rl), reg = openV >= Vz, Vo = reg ? Vz : openV, Is = (Vin - Vo) / Rs, Il = Vo / Rl, Iz = reg ? Is - Il : 0;
    return { reg: reg, Vo: Vo, Is: Is, Il: Il, Iz: Iz, Pz: Iz * Vz, over: Iz > Izm };
  }
  var math = { VT: VT, shockley: shockley, operating: operating, rectifier: rectifier, zener: zener };

  var Is = 1e-12, nD = 1.8;
  var lesson = K.lesson({ id: 'diodes', title: 'Diodes et alimentations',
    intro: 'La diode laisse passer le courant dans un seul sens. Cette propriété simple permet de transformer le courant alternatif du réseau en tension continue stable pour alimenter l’électronique.',
    objectives: ['Décrire la caractéristique d’une diode et calculer un point de fonctionnement.', 'Choisir un redresseur et estimer ses tensions de sortie.', 'Dimensionner un condensateur de filtrage à partir de l’ondulation.', 'Calculer un stabilisateur à diode Zener et connaître les limites d’un régulateur.'],
    prerequisites: 'Circuits électriques et notions de courant alternatif.',
    sources: ['Vishay 1N4001-1N4007 (VRRM, IF(AV), VF).', 'Vishay 1N4728A-1N4761A (1N4733A).', 'TI LM340/LM7805, SNOSBT0L (chute de tension).', 'Pages « Shockley diode equation », « Rectifier », « Ripple ».'],
    figures: {
      iv: { caption: 'Caractéristique calculée par l’équation de Shockley (Is = 1 pA, n = 1,8) : le courant croît très vite au-delà d’environ 0,7 V.', options: function () { return { kind: 'xy', title: 'Courant dans une diode', desc: 'Courant presque nul sous 0,5 volt, puis croissance exponentielle.', x: { min: 0, max: 1, label: 'tension V_D (V)' }, y: { min: 0, max: 100, label: 'I_D (mA)' }, series: [{ samples: 200, fn: function (x) { return shockley(Is, nD, x) * 1000; } }] }; } },
      rect: { caption: 'Pont de Graetz : à chaque alternance, deux diodes conduisent et le courant traverse la charge dans le même sens.', svg: function () { return S.svg(520, 200, 'Pont de quatre diodes alimentant une charge résistive en parallèle avec un condensateur.', S.wire('M60 60H180L240 30L300 60V100L240 170L180 100V60M60 140H120V100H180M240 30V15H440V60M240 170V185H440V140M360 15V60M360 140V185') + S.V(60, 100, true, 'v(t)', true) + S.D(210, 45, false, '') + S.D(270, 45, false, '') + S.D(210, 135, false, '') + S.D(270, 135, false, '') + S.C(360, 100, true, 'C') + S.R(440, 100, true, 'R')); } } ,
      zener: { caption: 'Stabilisateur Zener : la résistance Rs absorbe l’écart entre l’entrée et la tension de sortie.', svg: function () { return S.svg(520, 170, 'Source, résistance série Rs, diode Zener et charge en parallèle.', S.wire('M70 40H140M200 40H400V75M280 40V75M280 135V150M400 135V150M70 150H400M70 125V150M70 65V40') + S.V(70, 95, true, 'Ve') + S.R(170, 40, false, 'Rs') + S.D(280, 105, true, 'Vz', 'zener') + S.R(400, 105, true, 'RL') + S.node(280, 40) + S.node(280, 150)); } } },
    chapters: [
      { title: 'La jonction PN et sa caractéristique', summary: 'Conduction, seuil, équation de Shockley.', html: [
        '<p class="lead">Une diode associe un semi-conducteur dopé P à un semi-conducteur dopé N. La zone de jonction ne laisse le courant circuler aisément que dans un sens.</p>',
        K.formula(v('I') + '<sub>D</sub> = ' + v('I') + '<sub>S</sub> (e<sup>V<sub>D</sub>/(n V<sub>T</sub>)</sup> − 1), V<sub>T</sub> = kT/q ≈ 25,85 mV à 300 K', 'I<sub>S</sub> : courant de saturation, n : facteur d’idéalité (1 à 2). Polarisation directe et faible inverse ; ne décrit pas le claquage.'),
        '<div data-fig="iv"></div>',
        K.defs([['Tension de seuil', 'Repère pratique, proche de 0,6 à 0,7 V pour une diode au silicium ; ce n’est pas une valeur physique exacte.'], ['Claquage', 'Forte conduction inverse au-delà d’une tension limite.'], ['V<sub>RRM</sub>', 'Tension inverse répétitive maximale garantie par le fabricant.']]),
        K.example('point de fonctionnement', '<p>Une diode en série avec 1 kΩ sous 5 V : la résolution donne V<sub>D</sub> ≈ ' + fN(operating(5, 1000, Is, nD).Vd, 3) + ' V et I ≈ ' + si(operating(5, 1000, Is, nD).I, 'A') + '. Le modèle simple à 0,7 V donne (5 − 0,7)/1000 = 4,3 mA, très proche.</p>'),
        K.apply('<p>La fiche technique de la 1N4007 indique V<sub>RRM</sub> = 1000 V, 1 A de courant moyen et V<sub>F</sub> ≤ 1,1 V à 1 A. Une diode de redressement réelle chute donc davantage que 0,7 V à fort courant.</p>')] },
      { title: 'Le redressement', summary: 'Simple alternance, pont de Graetz.', html: [
        '<p class="lead">Redresser, c’est obtenir une tension de signe constant à partir d’une tension alternative.</p>',
        '<div data-fig="rect"></div>',
        K.formula(v('V') + '<sub>moy</sub> = ' + v('V') + '<sub>p</sub>/π (mono-alternance), ' + v('V') + '<sub>moy</sub> = 2' + v('V') + '<sub>p</sub>/π (double alternance)', 'Diodes idéales et sans condensateur. En pratique, retrancher une chute de diode (deux pour un pont).'),
        K.defs([['Mono-alternance', 'Une diode conduit une demi-période sur deux.'], ['Pont de Graetz', 'Quatre diodes : les deux alternances sont utilisées, l’ondulation est à 2f.']]),
        K.example('pont sur un transformateur 12 V', '<p>Secondaire 12 V efficaces : V<sub>p</sub> = 12 × √2 = ' + fN(12 * Math.SQRT2) + ' V. Le pont retire environ 2 × 0,7 V : la crête en sortie vaut ' + fN(12 * Math.SQRT2 - 1.4) + ' V.</p>')] },
      { title: 'Filtrage et ondulation', summary: 'Le condensateur réservoir.', html: [
        '<p class="lead">Un condensateur se charge à la crête, puis alimente la charge entre deux crêtes. La tension de sortie ondule légèrement.</p>',
        K.formula('Δ' + v('V') + ' ≈ ' + v('I') + ' / (2 ' + v('f') + ' ' + v('C') + ') (pont), Δ' + v('V') + ' ≈ ' + v('I') + ' / (' + v('f') + ' ' + v('C') + ') (mono-alternance)', 'f : fréquence du réseau. Approximation valable si l’ondulation reste faible devant la tension de sortie.'),
        K.example('choisir C', '<p>On veut au plus 1 V d’ondulation sous 500 mA, sur un pont à 50 Hz : C ≥ 0,5/(2 × 50 × 1) = ' + si(0.5 / (2 * 50 * 1), 'F') + ', soit 4 700 µF en valeur normalisée pour conserver une marge.</p>'),
        K.apply('<p>Le condensateur absorbe un fort courant de crête à chaque recharge, bien plus que le courant moyen. Il faut en tenir compte dans le choix des diodes et du transformateur.</p>')] },
      { title: 'Stabilisation et régulation', summary: 'Diode Zener, régulateur linéaire.', html: [
        '<p class="lead">L’ondulation et les variations du réseau doivent encore être supprimées pour alimenter un circuit sensible.</p>',
        '<div data-fig="zener"></div>',
        K.formula(v('I') + '<sub>Z</sub> = (' + v('V') + '<sub>e</sub> − ' + v('V') + '<sub>Z</sub>)/' + v('R') + '<sub>s</sub> − ' + v('V') + '<sub>Z</sub>/' + v('R') + '<sub>L</sub>', 'Zener en conduction, I<sub>Z</sub> positif et inférieur à I<sub>ZM</sub>.'),
        K.defs([['Régulateur linéaire', 'Composant qui dissipe l’excédent de tension sous forme de chaleur.'], ['Tension de déchet', 'Écart minimal entre entrée et sortie pour réguler : 2 V pour un LM7805 à 1 A.']]),
        K.example('Zener 5,1 V', '<p>Entrée 12 V, R<sub>s</sub> = 100 Ω, charge 220 Ω avec une 1N4733A (5,1 V). I<sub>s</sub> = ' + si(zener(12, 100, 5.1, 220, 0.178).Is, 'A') + ', I<sub>L</sub> = ' + si(zener(12, 100, 5.1, 220, 0.178).Il, 'A') + ', donc I<sub>Z</sub> = ' + si(zener(12, 100, 5.1, 220, 0.178).Iz, 'A') + ', sous la limite de 178 mA.</p>'),
        K.pitfalls(['<strong>Utiliser la valeur efficace</strong> à la place de la crête pour la tension de sortie.', '<strong>Oublier la tension inverse</strong> : avec condensateur, une simple alternance voit jusqu’à 2 V<sub>p</sub>.', '<strong>Ignorer la dissipation d’un régulateur :</strong> P = (V<sub>e</sub> − V<sub>s</sub>) × I.', '<strong>Brancher un condensateur chimique à l’envers.</strong>']),
        K.summary(['La diode conduit dans un sens, avec une chute de 0,6 à 1 V.', 'Le pont utilise les deux alternances.', 'ΔV ≈ I/(2fC) pour un pont.', 'Une Zener ou un régulateur stabilise, au prix d’une dissipation.']),
        K.toLab('diodes', 'Comparez les redresseurs, puis dimensionnez le condensateur et le stabilisateur.')] }
    ] });

  var D = { type: 'bridge', Vrms: 12, f: 50, Cu: 2200, R: 100, Vf: 0.8, Rs: 1000, Vz: 5.1 };
  function M(s) { var Vp = s.Vrms * Math.SQRT2, r = rectifier({ type: s.type, Vp: Vp, f: s.f, C: s.Cu * 1e-6, R: s.R, Vf: s.Vf }), z = zener(r.vavg, s.Rs, s.Vz, s.R, 0.178); return { Vp: Vp, r: r, z: z, Iload: r.vavg / s.R, pR: z.Is * z.Is * s.Rs }; }
  var lab = { id: 'diodes', title: 'Redressement, filtrage et stabilisation', short: 'Diodes et alimentations', icon: 'circuit', badge: 'Simulation temporelle, diode à chute fixe',
    text: 'Comparez un redresseur simple alternance et un pont, dimensionnez le condensateur, puis ajoutez un stabilisateur Zener.',
    summary: 'Observez la tension redressée, mesurez l’ondulation, dimensionnez le condensateur et un stabilisateur Zener.',
    params: [{ group: 'Source' }, { k: 'Vrms', label: 'Tension efficace', min: 3, max: 48, step: 0.5, unit: 'V', dec: 1 }, { k: 'f', label: 'Fréquence du réseau', opts: [[50, '50 Hz'], [60, '60 Hz']] }, { group: 'Redresseur' }, { k: 'type', label: 'Montage', opts: [['bridge', 'Pont'], ['half', 'Simple']] }, { k: 'Vf', label: 'Chute par diode', min: 0.2, max: 1.1, step: 0.05, unit: 'V', dec: 2 }, { k: 'Cu', label: 'Condensateur', min: 0, max: 22000, step: 100, unit: 'µF', dec: 0 }, { k: 'R', label: 'Charge', min: 10, max: 10000, log: true, unit: 'Ω', dec: 1 }, { group: 'Stabilisateur Zener' }, { k: 'Rs', label: 'Résistance série', min: 10, max: 2000, log: true, unit: 'Ω', dec: 1 }, { k: 'Vz', label: 'Tension Zener', min: 3.3, max: 15, step: 0.1, unit: 'V', dec: 1 }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Moyenne ' + fN(m.r.vavg) + ' V ; ondulation ' + fN(m.r.ripple, 3) + ' V'; },
    verdict: function (s, m) { if (m.z.over) return { ok: false, text: 'Zener en surcharge : plus de 178 mA' }; if (!m.z.reg) return { ok: false, text: 'Zener hors régulation' }; return { ok: true, text: 'Stabilisateur en régulation' }; },
    readouts: [['Crête du secondaire', function (s, m) { return fN(m.Vp) + ' V'; }], ['Tension moyenne', function (s, m) { return fN(m.r.vavg) + ' V'; }], ['Ondulation crête à crête', function (s, m) { return fN(m.r.ripple, 3) + ' V'; }], ['Courant de charge', function (s, m) { return si(m.Iload, 'A'); }], ['Tension inverse diode', function (s, m) { return fN(m.r.prv) + ' V'; }], ['Sortie stabilisée', function (s, m) { return fN(m.z.Vo) + ' V'; }], ['Courant Zener', function (s, m) { return si(m.z.Iz, 'A'); }], ['Puissance Zener', function (s, m) { return si(m.z.Pz, 'W'); }]],
    plots: [{ expr: function (s, m) { return 'Tension redressée (régime établi, trois cycles)'; }, options: function (s, m) { var last = m.r.trace[m.r.trace.length - 1][0]; return { title: 'Sortie du redresseur', desc: 'Tension de sortie du redresseur en régime établi.', x: { min: 0, max: last, label: 'temps (ms)' }, y: { min: 0, max: m.Vp * 1.15, label: 'tension (V)' }, series: [{ points: m.r.trace.map(function (p) { return [p[0], Math.max(0, p[2])]; }), cls: 'scope__trace--ref' }, { points: m.r.trace.map(function (p) { return [p[0], p[1]]; }) }] }; } }],
    explain: function (s, m) { return '<p>Le secondaire culmine à ' + fN(m.Vp) + ' V. ' + (s.type === 'bridge' ? 'Le pont fait chuter deux diodes' : 'La diode fait chuter une seule tension') + '. ' + (s.Cu > 0 ? 'Le condensateur se recharge à chaque crête puis se décharge dans la charge, d’où une ondulation de ' + fN(m.r.ripple, 3) + ' V.' : 'Sans condensateur, la sortie retombe à zéro à chaque alternance.') + ' Courant Zener : ' + si(m.z.Iz, 'A') + '.</p>'; },
    missions: [
      { id: 'm1', title: 'Ondulation maîtrisée', text: 'Avec un pont et une charge de 100 Ω, obtenez une ondulation inférieure à 0,5 V.', solution: { type: 'bridge', R: 100, Cu: 22000 }, check: function (s, m) { if (s.type !== 'bridge' || s.R !== 100) return { ok: false, msg: 'Choisissez le pont et laissez la charge à 100 Ω.' }; return m.r.ripple < 0.5 ? { ok: true, msg: 'Réussi : ' + fN(m.r.ripple, 3) + ' V d’ondulation avec ' + fN(s.Cu) + ' µF.' } : { ok: false, msg: 'Ondulation : ' + fN(m.r.ripple, 3) + ' V. Augmentez C.' }; } },
      { id: 'm2', title: 'Comparer les montages', text: 'En simple alternance, sans condensateur, observez une tension moyenne d’environ 32 % de la crête, à 5 % près.', solution: { type: 'half', Cu: 0, Vf: 0.2 }, check: function (s, m) { if (s.type !== 'half' || s.Cu !== 0) return { ok: false, msg: 'Choisissez la simple alternance et C = 0.' }; var q = m.r.vavg / (m.Vp - s.Vf); return Math.abs(q - 1 / Math.PI) <= 0.05 ? { ok: true, msg: 'Réussi : V_moy/V_crête = ' + fN(q) + ', proche de 1/π.' } : { ok: false, msg: 'Rapport : ' + fN(q) + '. Réduisez la chute de diode.' }; } },
      { id: 'm3', title: 'Stabiliser sans surcharger', text: 'Réglez le stabilisateur pour que la Zener régule, avec un courant Zener compris entre 5 et 150 mA.', solution: { Rs: 100 }, check: function (s, m) { if (!m.z.reg) return { ok: false, msg: 'La Zener ne conduit pas. Réduisez R_s ou la tension Zener.' }; return m.z.Iz >= 0.005 && m.z.Iz <= 0.15 ? { ok: true, msg: 'Réussi : I_Z = ' + si(m.z.Iz, 'A') + ', sortie à ' + fN(m.z.Vo) + ' V.' } : { ok: false, msg: 'I_Z = ' + si(m.z.Iz, 'A') + '. Ajustez R_s.' }; } }],
    limits: '<p>La diode est modélisée par une chute de tension fixe, sans résistance interne ni temps de recouvrement. La résistance du transformateur et celle du condensateur sont négligées, ce qui surestime les courants de crête réels. La Zener est idéale : sa résistance dynamique, sa dérive thermique et sa limite de puissance réelle ne sont pas calculées. Ne travaillez jamais sur le secteur sans protection ni formation.</p>' };

  var list = [
    K.num('e1', 'Crête d’un secondaire', 'Redressement', '<p>Un transformateur délivre 9 V efficaces. Calculez la tension de crête, en V.</p>', 9 * Math.SQRT2, 'V', { rel: 0.02 }, '<p>V<sub>p</sub> = 9 × √2 = ' + fN(9 * Math.SQRT2, 4) + ' V.</p>'),
    K.num('e2', 'Sortie d’un pont', 'Redressement', '<p>Crête secondaire de 17 V, pont à deux chutes de 0,7 V. Calculez la crête en sortie, en V.</p>', 15.6, 'V', { rel: 0.02 }, '<p>17 − 2 × 0,7 = 15,6 V.</p>'),
    K.num('e3', 'Valeur moyenne', 'Redressement', '<p>Double alternance idéale de crête 10 V, sans condensateur. Calculez la tension moyenne, en V.</p>', 20 / Math.PI, 'V', { rel: 0.02 }, '<p>V<sub>moy</sub> = 2V<sub>p</sub>/π = ' + fN(20 / Math.PI, 4) + ' V.</p>'),
    K.num('e4', 'Dimensionner un filtrage', 'Filtrage', '<p>Pont à 50 Hz, 1 A de charge, 2 V d’ondulation admis. Calculez C minimal, en µF.</p>', 1 / (2 * 50 * 2) * 1e6, 'µF', { rel: 0.03 }, '<p>C ≥ I/(2f·ΔV) = 1/(2 × 50 × 2) = 5 000 µF.</p>'),
    K.num('e5', 'Courant Zener', 'Stabilisation', '<p>Entrée 12 V, R<sub>s</sub> = 100 Ω, V<sub>Z</sub> = 5,1 V, charge 470 Ω. Calculez I<sub>Z</sub>, en mA.</p>', zener(12, 100, 5.1, 470, 0.178).Iz * 1000, 'mA', { rel: 0.03 }, '<p>I<sub>s</sub> = 6,9/100 = 69 mA ; I<sub>L</sub> = 5,1/470 = ' + fN(5.1 / 470 * 1000, 4) + ' mA ; I<sub>Z</sub> = ' + fN(zener(12, 100, 5.1, 470, 0.178).Iz * 1000, 4) + ' mA.</p>'),
    K.num('e6', 'Dissipation d’un régulateur', 'Stabilisation', '<p>Un LM7805 reçoit 12 V et fournit 5 V sous 500 mA. Calculez la puissance dissipée, en W.</p>', 3.5, 'W', { rel: 0.02 }, '<p>P = (12 − 5) × 0,5 = 3,5 W : un dissipateur est nécessaire.</p>'),
    K.pick('e7', 'Tension inverse', 'Redressement', '<p>Quelle grandeur vérifier pour choisir une diode de redressement ?</p>', 'La tension inverse répétitive maximale (VRRM)', ['Seulement la couleur du boîtier', 'La capacité du condensateur de sortie', 'La fréquence de coupure de la charge'], '<p>V<sub>RRM</sub> et le courant moyen sont les deux grandeurs de premier choix.</p>'),
    K.pick('e8', 'Tension de déchet', 'Stabilisation', '<p>Un LM7805 à 1 A nécessite en entrée, au minimum :</p>', 'environ 7 V, soit 5 V plus 2 V de chute', ['5 V exactement', '3,3 V', '35 V'], '<p>La fiche indique 2 V de chute à 1 A et 25 °C : l’entrée doit rester au-dessus de 7 V, ondulation comprise.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('diodes', list) };
});
