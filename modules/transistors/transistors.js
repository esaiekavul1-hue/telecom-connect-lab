/*
 * TELECOM CONNECT LAB 2.0 — Transistors bipolaires, MOSFET, amplification.
 * Paramètres BC547 : fiche onsemi. Le MOSFET est générique (loi quadratique).
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  var VT = 0.02585, VBE = 0.65, VCESAT = 0.2;

  /** Polarisation par pont de base et résistance d'émetteur, avec Thévenin d'entrée. */
  function bias(p) {
    var Vth = p.Vcc * p.R2 / (p.R1 + p.R2), Rth = p.R1 * p.R2 / (p.R1 + p.R2);
    var Ib = (Vth - VBE) / (Rth + (p.beta + 1) * p.Re);
    if (Ib <= 0) return { region: 'cutoff', Ib: 0, Ic: 0, Vce: p.Vcc, Vc: p.Vcc, Ve: 0, gm: 0, Av: 0, Vb: Vth };
    var Ic = p.beta * Ib, Ie = Ic + Ib, Vce = p.Vcc - Ic * p.Rc - Ie * p.Re;
    if (Vce >= VCESAT) { var gm = Ic / VT, re = 1 / gm, Av = -p.Rc / (re + (p.bypass ? 0 : p.Re)); return { region: 'active', Ib: Ib, Ic: Ic, Vce: Vce, Vc: p.Vcc - Ic * p.Rc, Ve: Ie * p.Re, gm: gm, Av: Av, Vb: Vth - Ib * Rth }; }
    // Saturation : Vce imposée, la résolution du maillage donne Ic < beta·Ib.
    var a = p.Rc + p.Re, b = p.Re;
    var det = (Rth + b) * a - b * b, rhs1 = Vth - VBE, rhs2 = p.Vcc - VCESAT;
    var Ib2 = (rhs1 * a - b * rhs2) / det, Ic2 = ((Rth + b) * rhs2 - b * rhs1) / det;
    return { region: 'saturation', Ib: Math.max(Ib2, 0), Ic: Ic2, Vce: VCESAT, Vc: p.Vcc - Ic2 * p.Rc, Ve: (Ic2 + Math.max(Ib2, 0)) * p.Re, gm: 0, Av: 0, Vb: Vth };
  }
  function nmosId(Vgs, Vds, k, Vth, lambda) {
    if (Vgs <= Vth) return { region: 'cutoff', Id: 0 };
    var Vov = Vgs - Vth;
    if (Vds < Vov) return { region: 'triode', Id: k * (Vov * Vds - Vds * Vds / 2) };
    return { region: 'saturation', Id: k / 2 * Vov * Vov * (1 + (lambda || 0) * Vds) };
  }
  function clipLimits(b, Vcc) { return b.region === 'active' ? { up: Vcc - b.Vc, down: b.Vc - b.Ve - VCESAT } : { up: 0, down: 0 }; }
  var math = { VT: VT, VBE: VBE, VCESAT: VCESAT, bias: bias, nmosId: nmosId, clipLimits: clipLimits };

  function ampSvg(dark, s) {
    return S.svg(520, 285, 'Amplificateur émetteur commun : pont de base R1 R2 sur la base, Rc entre Vcc et le collecteur, Re entre l’émetteur et la masse, sortie sur le collecteur.', S.wire('M60 25H440M130 25V55M285 25V45M130 115V170M130 230V255M285 245V255M60 255H440M130 150H240M285 105V115M285 110H390') + S.R(130, 85, true, 'R₁') + S.R(130, 200, true, 'R₂') + S.R(285, 75, true, 'Rc') + S.npn(270, 150, '') + S.R(285, 215, true, 'Re') + S.text(60, 18, s ? 'Vcc = ' + fN(s.Vcc) + ' V' : 'Vcc', { a: 'start' }) + S.text(398, 115, 'sortie', { a: 'start' }) + S.text(190, 142, 'base') + S.node(130, 150) + S.node(285, 110) + S.gnd(285, 255), dark);
  }
  var EXP = { Vcc: 12, R1: 47000, R2: 10000, Rc: 2200, Re: 470, beta: 200, bypass: true };
  var bx = bias(EXP);
  var lesson = K.lesson({ id: 'transistors', title: 'Transistors et amplification',
    intro: 'Le transistor commande un fort courant avec un faible signal. Il est à la base des amplificateurs, des interrupteurs et de tous les circuits numériques.',
    objectives: ['Identifier les régions de fonctionnement d’un transistor bipolaire et d’un MOSFET.', 'Calculer un point de repos par un pont de base.', 'Estimer le gain d’un étage émetteur commun.', 'Choisir entre fonctionnement en amplification et en commutation.'],
    prerequisites: 'Diodes et alimentations ; théorème de Thévenin.',
    sources: ['onsemi BC546/BC547/BC548 (limites, hFE, VBE, VCE(sat)).', 'Pages « MOSFET » (régions triode et saturation), « Common emitter », « Bipolar transistor biasing ».'],
    figures: { amp: { caption: 'Étage émetteur commun polarisé par un pont de base.', svg: function () { return ampSvg(false); } },
      mos: { caption: 'Caractéristiques d’un MOSFET générique (k = 0,1 A/V², V_th = 2 V) : régions triode puis saturation.', options: function () { return { kind: 'xy', title: 'MOSFET', desc: 'Courant de drain en fonction de la tension drain-source pour trois tensions de grille.', x: { min: 0, max: 8, label: 'V_DS (V)' }, y: { min: 0, max: 0.75, label: 'I_D (A)' }, series: [3, 4, 5].map(function (g, i) { return { samples: 120, cls: i === 1 ? 'scope__trace--alt' : undefined, fn: function (x) { return nmosId(g, x, 0.1, 2, 0.01).Id; } }; }) }; } } },
    chapters: [
      { title: 'Le transistor bipolaire', summary: 'Effet transistor, gain en courant et régions de fonctionnement.', html: [
        '<p class="lead">Dans un transistor NPN, un faible courant de base contrôle un courant de collecteur bien plus important.</p>',
        K.formula(v('I') + '<sub>C</sub> = β ' + v('I') + '<sub>B</sub>, ' + v('I') + '<sub>E</sub> = ' + v('I') + '<sub>C</sub> + ' + v('I') + '<sub>B</sub>', 'Région active uniquement. β varie beaucoup d’un exemplaire à l’autre.'),
        K.defs([['Blocage', 'Base non polarisée : I<sub>C</sub> ≈ 0, le transistor est un interrupteur ouvert.'], ['Région active', 'Jonction base-émetteur passante, V<sub>CE</sub> suffisante : amplification.'], ['Saturation', 'V<sub>CE</sub> faible, environ 0,2 V : interrupteur fermé.']]),
        K.example('un BC547 en commutation', '<p>La fiche onsemi donne h<sub>FE</sub> de 110 à 800 à 2 mA selon le classement : une conception fiable ne doit donc pas dépendre d’une valeur précise de β. Pour commuter 50 mA, on force un courant de base d’environ I<sub>C</sub>/10 = 5 mA, nettement plus que le strict nécessaire.</p>'),
        K.apply('<p>Limites du BC547 : V<sub>CEO</sub> = 45 V, I<sub>C</sub> = 100 mA, 625 mW à 25 °C. Pour une charge plus importante, on choisit un transistor de puissance ou un MOSFET.</p>')] },
      { title: 'Polarisation', summary: 'Fixer un point de repos stable.', html: [
        '<p class="lead">Pour amplifier un signal alternatif, le transistor doit reposer au milieu de sa zone utile.</p>',
        '<div data-fig="amp"></div>',
        K.formula(v('V') + '<sub>th</sub> = V<sub>CC</sub> R₂/(R₁+R₂), ' + v('I') + '<sub>B</sub> = (V<sub>th</sub> − V<sub>BE</sub>)/(R<sub>th</sub> + (β+1) R<sub>E</sub>)', 'R<sub>th</sub> = R₁ // R₂. V<sub>BE</sub> ≈ 0,65 V. Région active.'),
        K.example('point de repos', '<p>V<sub>CC</sub> = 12 V, R₁ = 47 kΩ, R₂ = 10 kΩ, R<sub>C</sub> = 2,2 kΩ, R<sub>E</sub> = 470 Ω, β = 200. On trouve I<sub>C</sub> = ' + si(bx.Ic, 'A') + ' et V<sub>CE</sub> = ' + fN(bx.Vce) + ' V : le transistor est bien en région active.</p>'),
        '<p>La résistance d’émetteur stabilise le point de repos : si I<sub>C</sub> augmente, V<sub>E</sub> monte et V<sub>BE</sub> se réduit. C’est une contre-réaction.</p>'] },
      { title: 'L’amplificateur émetteur commun', summary: 'Transconductance et gain en tension.', html: [
        '<p class="lead">Le signal appliqué sur la base module le courant de collecteur, qui crée une tension amplifiée et inversée sur R<sub>C</sub>.</p>',
        K.formula('g<sub>m</sub> = I<sub>C</sub>/V<sub>T</sub>, A<sub>v</sub> ≈ −g<sub>m</sub> R<sub>C</sub> (R<sub>E</sub> découplée), A<sub>v</sub> ≈ −R<sub>C</sub>/R<sub>E</sub> (non découplée)', 'Petits signaux, région active. V<sub>T</sub> ≈ 25,85 mV à 300 K. Le signe négatif marque une inversion.'),
        K.example('calcul du gain', '<p>Avec I<sub>C</sub> = ' + si(bx.Ic, 'A') + ', g<sub>m</sub> = ' + si(bx.gm, 'S') + ' et A<sub>v</sub> ≈ ' + fN(bx.Av) + ' si R<sub>E</sub> est découplée. Sans condensateur de découplage, le gain tombe à environ −R<sub>C</sub>/R<sub>E</sub> = ' + fN(-2200 / 470) + ', mais il devient indépendant de β.</p>'),
        K.apply('<p>Un gain élevé n’est pas toujours souhaitable : il augmente la distorsion et dépend du transistor. La contre-réaction échange du gain contre de la stabilité.</p>')] },
      { title: 'Le MOSFET', summary: 'Commande en tension, régions et commutation.', html: [
        '<p class="lead">Le MOSFET est commandé par une tension de grille et ne consomme pratiquement pas de courant statique sur cette grille.</p>',
        K.formula(v('I') + '<sub>D</sub> = (k/2)(V<sub>GS</sub> − V<sub>th</sub>)² (saturation), ' + v('I') + '<sub>D</sub> = k[(V<sub>GS</sub> − V<sub>th</sub>)V<sub>DS</sub> − V<sub>DS</sub>²/2] (triode)', 'k = µC<sub>ox</sub>W/L. Loi quadratique idéale, sans effets de canal court.'),
        '<div data-fig="mos"></div>',
        K.defs([['Tension de seuil V<sub>th</sub>', 'Tension de grille à partir de laquelle un canal apparaît.'], ['R<sub>DS(on)</sub>', 'Résistance du canal à l’état passant : elle fixe les pertes en commutation.']]),
        K.example('courant en saturation', '<p>V<sub>GS</sub> = 4 V, V<sub>th</sub> = 2 V, k = 0,1 A/V² : I<sub>D</sub> = 0,05 × 2² = ' + fN(nmosId(4, 5, 0.1, 2, 0).Id) + ' A, si V<sub>DS</sub> dépasse 2 V.</p>'),
        K.pitfalls(['<strong>Croire que β est une constante.</strong> Il dépend du transistor, du courant et de la température.', '<strong>Oublier de limiter le courant de base</strong> avec une résistance.', '<strong>Considérer la grille d’un MOSFET comme insensible</strong> : elle craint les décharges électrostatiques.', '<strong>Commander une charge inductive sans diode de roue libre.</strong>']),
        K.summary(['I<sub>C</sub> = βI<sub>B</sub> en région active.', 'Le pont de base et R<sub>E</sub> stabilisent le repos.', 'g<sub>m</sub> = I<sub>C</sub>/V<sub>T</sub> ; A<sub>v</sub> ≈ −g<sub>m</sub>R<sub>C</sub>.', 'Le MOSFET se commande en tension ; il a une résistance R<sub>DS(on)</sub>.']),
        K.toLab('transistors', 'Réglez le pont de base, observez les trois régions et mesurez le gain.')] }
    ] });

  var D = { Vcc: 12, R1: 47000, R2: 10000, Rc: 2200, Re: 470, beta: 200, by: 'on', Vin: 10 };
  function P(s) { return { Vcc: s.Vcc, R1: s.R1, R2: s.R2, Rc: s.Rc, Re: s.Re, beta: s.beta, bypass: s.by === 'on' }; }
  function M(s) { var b = bias(P(s)), lim = clipLimits(b, s.Vcc), ampOut = Math.abs(b.Av) * s.Vin / 1000; return { b: b, lim: lim, out: ampOut, clip: b.region !== 'active' || ampOut > Math.min(lim.up, lim.down) }; }
  var NAMES = { cutoff: 'Blocage', active: 'Région active', saturation: 'Saturation' };
  var lab = { id: 'transistors', title: 'Polarisation et amplification', short: 'Transistors', icon: 'circuit', badge: 'Modèle à VBE fixe, petit signal',
    text: 'Polarisez un étage émetteur commun avec un pont de base, observez sa région de fonctionnement, son gain et l’écrêtage du signal.',
    summary: 'Réglez le point de repos d’un NPN, observez blocage, région active et saturation, mesurez le gain et l’écrêtage.',
    params: [{ group: 'Polarisation' }, { k: 'Vcc', label: 'Alimentation', min: 5, max: 30, step: 0.5, unit: 'V', dec: 1 }, { k: 'R1', label: 'R₁', min: 1000, max: 1000000, log: true, unit: 'Ω', dec: 0 }, { k: 'R2', label: 'R₂', min: 1000, max: 1000000, log: true, unit: 'Ω', dec: 0 }, { k: 'Rc', label: 'R<sub>C</sub>', min: 100, max: 47000, log: true, unit: 'Ω', dec: 0 }, { k: 'Re', label: 'R<sub>E</sub>', min: 10, max: 10000, log: true, unit: 'Ω', dec: 0 }, { k: 'beta', label: 'Gain β', min: 50, max: 800, step: 10, unit: '', dec: 0, hint: 'De 50 à 800. Le BC547 varie de 110 à 800.' }, { group: 'Signal' }, { k: 'by', label: 'Découplage de R_E', opts: [['on', 'Avec condensateur'], ['off', 'Sans']] }, { k: 'Vin', label: 'Amplitude d’entrée', min: 0.1, max: 500, log: true, unit: 'mV', dec: 2 }],
    defaults: D, model: M,
    schema: function (s, m) { return ampSvg(true, s); },
    expr: function (s, m) { return NAMES[m.b.region] + ' ; I<sub>C</sub> = ' + si(m.b.Ic, 'A'); },
    verdict: function (s, m) { if (m.b.region !== 'active') return { ok: false, text: NAMES[m.b.region] + ' : pas d’amplification' }; return m.clip ? { ok: false, text: 'Sortie écrêtée' } : { ok: true, text: 'Amplification linéaire' }; },
    readouts: [['Région', function (s, m) { return NAMES[m.b.region]; }], ['Courant I_C', function (s, m) { return si(m.b.Ic, 'A'); }], ['Tension V_CE', function (s, m) { return fN(m.b.Vce) + ' V'; }], ['Transconductance', function (s, m) { return si(m.b.gm, 'S'); }], ['Gain A_v', function (s, m) { return fN(m.b.Av); }], ['Sortie (amplitude)', function (s, m) { return fN(m.out, 3) + ' V'; }], ['Marge haute', function (s, m) { return fN(m.lim.up) + ' V'; }], ['Marge basse', function (s, m) { return fN(m.lim.down) + ' V'; }]],
    plots: [{ expr: function () { return 'Sortie autour du point de repos, sur une période'; }, options: function (s, m) { var top = s.Vcc * 1.1; return { title: 'Tension de collecteur', desc: 'Tension de collecteur, limitée par l’alimentation et la saturation.', x: { min: 0, max: 360, ticks: [0, 90, 180, 270, 360], label: 'phase (degrés)' }, y: { min: 0, max: top, label: 'V_C (V)' }, series: [{ samples: 240, fn: function (d) { var b = m.b, raw = b.Vc + b.Av * (s.Vin / 1000) * Math.sin(d * Math.PI / 180); return Math.max(Math.min(raw, s.Vcc), b.Ve + 0.2); } }], hlines: [{ y: m.b.Vc, label: 'repos', anchor: 'start' }] }; } }],
    explain: function (s, m) { var b = m.b; if (b.region === 'cutoff') return '<p>V<sub>th</sub> du pont de base est trop faible pour rendre passante la jonction base-émetteur : aucun courant ne circule.</p>'; if (b.region === 'saturation') return '<p>Le courant de base est excessif : V<sub>CE</sub> tombe à ' + fN(b.Vce) + ' V. Le transistor se comporte en interrupteur fermé et n’amplifie plus.</p>'; return '<p>I<sub>C</sub> = ' + si(b.Ic, 'A') + ', V<sub>CE</sub> = ' + fN(b.Vce) + ' V. Avec g<sub>m</sub> = ' + si(b.gm, 'S') + ', le gain vaut <strong>' + fN(b.Av) + '</strong>. La sortie peut monter de ' + fN(m.lim.up) + ' V et descendre de ' + fN(m.lim.down) + ' V.</p>'; },
    missions: [
      { id: 'm1', title: 'Centrer le point de repos', text: 'Ajustez le montage pour que V_C soit à moins de 1 V du milieu de V_cc − V_E, et que la marge soit symétrique.', solution: { Rc: 1800 }, check: function (s, m) { if (m.b.region !== 'active') return { ok: false, msg: 'Placez d’abord le transistor en région active.' }; return Math.abs(m.lim.up - m.lim.down) <= 1 && s.Rc !== D.Rc ? { ok: true, msg: 'Réussi : marges de ' + fN(m.lim.up) + ' et ' + fN(m.lim.down) + ' V.' } : { ok: false, msg: 'Marges de ' + fN(m.lim.up) + ' et ' + fN(m.lim.down) + ' V. Modifiez R_C.' }; } },
      { id: 'm2', title: 'Saturer le transistor', text: 'Trouvez un réglage de saturation en modifiant le pont de base.', solution: { R1: 1000, R2: 1000000 }, check: function (s, m) { return m.b.region === 'saturation' ? { ok: true, msg: 'Réussi : V_CE = ' + fN(m.b.Vce) + ' V. Mode interrupteur fermé.' } : { ok: false, msg: 'Région actuelle : ' + NAMES[m.b.region] + '. Diminuez R₁.' }; } },
      { id: 'm3', title: 'Observer l’écrêtage', text: 'En région active, augmentez l’amplitude d’entrée jusqu’à l’écrêtage.', solution: { Vin: 500 }, check: function (s, m) { if (m.b.region !== 'active') return { ok: false, msg: 'Restez en région active.' }; return m.clip ? { ok: true, msg: 'Réussi : la sortie demandée (' + fN(m.out) + ' V) dépasse les marges disponibles.' } : { ok: false, msg: 'La sortie (' + fN(m.out) + ' V) reste linéaire. Augmentez le signal.' }; } },
      { id: 'm4', title: 'Stabiliser le gain', text: 'Retirez le découplage et obtenez un gain inférieur à 10 en valeur absolue.', solution: { by: 'off' }, check: function (s, m) { if (s.by !== 'off') return { ok: false, msg: 'Retirez le condensateur de découplage.' }; if (m.b.region !== 'active') return { ok: false, msg: 'Restez en région active.' }; return Math.abs(m.b.Av) < 10 ? { ok: true, msg: 'Réussi : gain de ' + fN(m.b.Av) + ', proche de −R_C/R_E, presque indépendant de β.' } : { ok: false, msg: 'Gain : ' + fN(m.b.Av) + '. Augmentez R_E.' }; } }],
    limits: '<p>V<sub>BE</sub> est fixée à 0,65 V et β est constant. L’effet Early, la température, les capacités parasites et la réponse en fréquence ne sont pas modélisés. L’écrêtage représenté est abrupt alors qu’un transistor réel se déforme progressivement. Vérifiez toujours les limites dans la fiche du composant.</p>' };

  var bZ = bias({ Vcc: 15, R1: 68000, R2: 10000, Rc: 3300, Re: 1000, beta: 150, bypass: false });
  var list = [
    K.num('e1', 'Courant de collecteur', 'Bipolaire', '<p>I<sub>B</sub> = 20 µA et β = 150 en région active. Calculez I<sub>C</sub>, en mA.</p>', 3, 'mA', { rel: 0.02 }, '<p>I<sub>C</sub> = β I<sub>B</sub> = 150 × 20 µA = 3 mA.</p>'),
    K.num('e2', 'Tension du pont de base', 'Polarisation', '<p>V<sub>CC</sub> = 12 V, R₁ = 47 kΩ, R₂ = 10 kΩ. Calculez V<sub>th</sub>, en V.</p>', 12 * 10 / 57, 'V', { rel: 0.02 }, '<p>V<sub>th</sub> = 12 × 10/57 = ' + fN(12 * 10 / 57, 4) + ' V.</p>'),
    K.num('e3', 'Transconductance', 'Amplification', '<p>I<sub>C</sub> = 2 mA à 300 K. Calculez g<sub>m</sub>, en mS.</p>', 2e-3 / VT * 1000, 'mS', { rel: 0.03 }, '<p>g<sub>m</sub> = I<sub>C</sub>/V<sub>T</sub> = 2 mA / 25,85 mV = ' + fN(2e-3 / VT * 1000, 4) + ' mS.</p>'),
    K.num('e4', 'Gain avec résistance d’émetteur', 'Amplification', '<p>R<sub>C</sub> = 4,7 kΩ, R<sub>E</sub> = 470 Ω non découplée. Calculez |A<sub>v</sub>| avec l’approximation usuelle.</p>', 10, '', { rel: 0.03 }, '<p>|A<sub>v</sub>| ≈ R<sub>C</sub>/R<sub>E</sub> = 10.</p>'),
    K.num('e5', 'Point de repos complet', 'Polarisation', '<p>V<sub>CC</sub> = 15 V, R₁ = 68 kΩ, R₂ = 10 kΩ, R<sub>C</sub> = 3,3 kΩ, R<sub>E</sub> = 1 kΩ, β = 150, V<sub>BE</sub> = 0,65 V. Calculez I<sub>C</sub>, en mA.</p>', bZ.Ic * 1000, 'mA', { rel: 0.04 }, '<p>V<sub>th</sub> = ' + fN(15 * 10 / 78, 4) + ' V, R<sub>th</sub> = ' + fN(68 * 10 / 78, 4) + ' kΩ, I<sub>B</sub> = (V<sub>th</sub> − 0,65)/(R<sub>th</sub> + 151 R<sub>E</sub>), donc I<sub>C</sub> = ' + fN(bZ.Ic * 1000, 4) + ' mA.</p>'),
    K.num('e6', 'MOSFET en saturation', 'MOSFET', '<p>k = 0,2 A/V², V<sub>th</sub> = 1,5 V, V<sub>GS</sub> = 3,5 V. Calculez I<sub>D</sub> en saturation, en A (λ = 0).</p>', 0.4, 'A', { rel: 0.02 }, '<p>I<sub>D</sub> = 0,1 × 2² = 0,4 A.</p>'),
    K.pick('e7', 'Régions d’un NPN', 'Bipolaire', '<p>Pour utiliser un transistor comme interrupteur fermé, on le place en :</p>', 'saturation', ['région active', 'blocage', 'claquage'], '<p>En saturation, V<sub>CE</sub> est faible (environ 0,2 V) : le transistor laisse passer le courant comme un interrupteur.</p>'),
    K.pick('e8', 'Grille d’un MOSFET', 'MOSFET', '<p>Quelle affirmation sur la grille d’un MOSFET est juste ?</p>', 'Elle est commandée en tension, avec un courant statique très faible', ['Elle exige un courant proportionnel à I_D', 'Sa tension de seuil est toujours nulle', 'Elle ne craint jamais les décharges électrostatiques'], '<p>La grille est isolée par un oxyde : presque aucun courant statique, mais une grande sensibilité aux décharges.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('transistors', list) };
});
