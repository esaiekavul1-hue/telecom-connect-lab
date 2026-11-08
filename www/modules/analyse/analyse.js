/*
 * TELECOM CONNECT LAB 2.0 — Analyse des circuits : superposition, Thévenin, Norton.
 * Modèle : réseau linéaire en régime continu, sources idéales.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;

  /* Réseau étudié : E1 — R1 — nœud A — R2 — E2, R3 entre A et la masse ; sortie A/masse. */
  function thevenin(E1, E2, R1, R2, R3) {
    var G = 1 / R1 + 1 / R2 + 1 / R3;
    return { Vth: (E1 / R1 + E2 / R2) / G, Rth: 1 / G };
  }
  function norton(Vth, Rth) { return { In: Vth / Rth, Rn: Rth }; }
  function load(Vth, Rth, RL) { var I = Vth / (Rth + RL), P = I * I * RL; return { I: I, U: I * RL, P: P, eta: RL / (RL + Rth) }; }
  function pMax(Vth, Rth) { return Vth * Vth / (4 * Rth); }
  function superpose(E1, E2, R1, R2, R3) { var a = thevenin(E1, 0, R1, R2, R3).Vth, b = thevenin(0, E2, R1, R2, R3).Vth; return { fromE1: a, fromE2: b, total: a + b }; }
  var math = { thevenin: thevenin, norton: norton, load: load, pMax: pMax, superpose: superpose };

  function net(s, labels, dark) {
    return S.svg(520, 190, 'Réseau à deux sources : E1 et R1, E2 et R2, R3 vers la masse, sortie au point A.', S.wire('M60 45H105M165 45H240M240 45H320M380 45H430V90M430 150V165H60V150M60 90V45M240 45V75M240 135V165') + S.V(60, 120, true, labels[0]) + S.R(135, 45, false, labels[1]) + S.R(350, 45, false, labels[2]) + S.R(240, 105, true, labels[3]) + S.V(430, 120, true, labels[4]) + S.node(240, 45) + S.node(240, 165) + S.text(240, 32, 'A') + S.gnd(240, 165), dark);
  }
  var ex = thevenin(12, 6, 100, 200, 300), ex2 = superpose(12, 6, 100, 200, 300);
  var lesson = K.lesson({ id: 'analyse', title: 'Analyse des circuits',
    intro: 'Quand un montage comporte plusieurs sources ou de nombreuses branches, les méthodes d’analyse évitent les longs systèmes d’équations et donnent une vue simple de ce que voit une charge.',
    objectives: ['Appliquer le théorème de superposition à un réseau linéaire.', 'Calculer le modèle de Thévenin et le modèle de Norton d’un réseau.', 'Déterminer la charge recevant la puissance maximale.', 'Distinguer puissance maximale et rendement maximal.'],
    prerequisites: 'Circuits électriques : loi d’Ohm, lois de Kirchhoff, associations de résistances.',
    sources: ['Pages « Thévenin’s theorem » et « Maximum power transfer theorem ».', 'Calculs contrôlés par le solveur nodal (tests/content-references.js).'],
    figures: { net: { caption: 'Réseau à deux sources utilisé dans cette leçon. La sortie est prise entre le point A et la masse.', svg: function () { return net(null, ['E₁', 'R₁', 'R₂', 'R₃', 'E₂']); } },
      th: { caption: 'Modèle de Thévenin : une source et une résistance équivalentes, vues depuis la sortie.', svg: function () { return S.blocks({ w: 520, h: 150, label: 'Un réseau linéaire quelconque est équivalent, pour la charge, à une source Vth en série avec Rth.', boxes: [{ id: 'a', x: 30, y: 45, w: 170, h: 62, t: 'Réseau linéaire', sub: 'sources + résistances' }, { id: 'b', x: 295, y: 45, w: 190, h: 62, t: 'Vth en série avec Rth', sub: 'vu depuis les bornes' }], links: [{ a: 'a', b: 'b', t: 'équivalent' }] }); } },
      pow: { caption: 'Puissance reçue par la charge pour Vth = 10 V et Rth = 100 Ω : le maximum est atteint pour RL = Rth.', options: function () { return { kind: 'xy', title: 'Transfert de puissance', desc: 'La puissance passe par un maximum quand la charge égale la résistance de Thévenin.', x: { min: 1, max: 10000, log: true, label: 'RL (Ω)' }, y: { min: 0, max: 0.3, label: 'P (W)' }, series: [{ samples: 200, fn: function (r) { return load(10, 100, r).P; } }], vlines: [{ x: 100, label: 'RL = Rth' }] }; } } },
    chapters: [
      { title: 'La superposition', summary: 'Traiter les sources une par une.', html: [
        '<p class="lead">Dans un réseau linéaire, l’effet de plusieurs sources est la somme des effets de chaque source prise seule.</p>',
        K.defs([['Linéarité', 'Propriété d’un circuit dont les éléments suivent des lois proportionnelles, comme la loi d’Ohm.'], ['Éteindre une source de tension', 'La remplacer par un court-circuit.'], ['Éteindre une source de courant', 'La remplacer par un circuit ouvert.']]),
        '<div data-fig="net"></div>',
        K.formula(v('V') + '<sub>A</sub> = ' + v('V') + '<sub>A</sub>|<sub>E₁ seule</sub> + ' + v('V') + '<sub>A</sub>|<sub>E₂ seule</sub>', 'Valable pour les tensions et courants d’un réseau linéaire. Pas pour les puissances, qui varient au carré.'),
        K.example('deux sources', '<p>E₁ = 12 V, E₂ = 6 V, R₁ = 100 Ω, R₂ = 200 Ω, R₃ = 300 Ω. E₁ seule donne ' + fN(ex2.fromE1, 4) + ' V ; E₂ seule donne ' + fN(ex2.fromE2, 4) + ' V. Au total, V<sub>A</sub> = ' + fN(ex2.total, 4) + ' V.</p>')] },
      { title: 'Thévenin et Norton', summary: 'Remplacer tout un réseau par deux éléments.', html: [
        '<p class="lead">Vu de deux bornes, tout réseau linéaire se comporte comme une source idéale associée à une résistance.</p>',
        '<div data-fig="th"></div>',
        K.defs([['V<sub>th</sub>', 'Tension à vide mesurée entre les deux bornes.'], ['R<sub>th</sub>', 'Résistance vue des bornes, toutes sources éteintes.'], ['Modèle de Norton', 'Source de courant I<sub>N</sub> = V<sub>th</sub>/R<sub>th</sub> en parallèle avec R<sub>th</sub>.']]),
        K.formula(v('I') + '<sub>N</sub> = ' + v('V') + '<sub>th</sub> / ' + v('R') + '<sub>th</sub>, ' + v('I') + '<sub>L</sub> = ' + v('V') + '<sub>th</sub> / (' + v('R') + '<sub>th</sub> + ' + v('R') + '<sub>L</sub>)', 'Réseau linéaire. Le modèle n’est équivalent que pour ce qui est branché sur ces bornes.'),
        K.example('modèle du réseau', '<p>Le réseau précédent : V<sub>th</sub> = ' + fN(ex.Vth, 4) + ' V (tension à vide au point A) et R<sub>th</sub> = R₁ // R₂ // R₃ = ' + fN(ex.Rth, 4) + ' Ω. Une charge de 100 Ω reçoit alors ' + si(load(ex.Vth, ex.Rth, 100).I, 'A') + '.</p>'),
        K.apply('<p>La mesure pratique est directe : relevez la tension à vide, puis le courant de court-circuit si le montage le permet, et déduisez R<sub>th</sub> = V<sub>co</sub>/I<sub>cc</sub>. Sur une batterie, ce rapport renseigne la résistance interne, à condition de ne pas réellement la court-circuiter.</p>')] },
      { title: 'Le transfert de puissance', summary: 'Puissance maximale, rendement et adaptation.', html: [
        '<p class="lead">Quelle charge reçoit le plus de puissance ? La réponse explique l’adaptation d’impédance en radio comme les limites d’une alimentation.</p>',
        K.formula(v('P') + '<sub>max</sub> = ' + v('V') + '<sub>th</sub>² / (4 ' + v('R') + '<sub>th</sub>), atteinte pour ' + v('R') + '<sub>L</sub> = ' + v('R') + '<sub>th</sub>', 'Source fixée, charge variable. Le rendement est alors de 50 %.'),
        '<div data-fig="pow"></div>',
        K.formula('η = ' + v('R') + '<sub>L</sub> / (' + v('R') + '<sub>L</sub> + ' + v('R') + '<sub>th</sub>)', 'Part de la puissance fournie qui atteint la charge.'),
        K.example('choisir la charge', '<p>Avec V<sub>th</sub> = 10 V et R<sub>th</sub> = 100 Ω, P<sub>max</sub> = 100/400 = ' + fN(pMax(10, 100)) + ' W pour R<sub>L</sub> = 100 Ω. Avec R<sub>L</sub> = 900 Ω, la charge reçoit ' + fN(load(10, 100, 900).P) + ' W seulement, mais avec un rendement de 90 %.</p>'),
        K.apply('<p>Un réseau électrique cherche le rendement et n’opère jamais à R<sub>L</sub> = R<sub>th</sub>. Un récepteur radio, qui dispose de très peu de puissance, cherche au contraire à en capter le maximum.</p>'),
        K.pitfalls(['<strong>Additionner des puissances en superposition.</strong> Seuls tensions et courants s’additionnent.', '<strong>Oublier d’éteindre les sources pour calculer R<sub>th</sub>.</strong>', '<strong>Confondre puissance maximale et rendement maximal.</strong>', '<strong>Appliquer ces théorèmes à un composant non linéaire</strong>, comme une diode, sans précaution.']),
        K.summary(['Superposition : on somme les effets de chaque source.', 'V<sub>th</sub> = tension à vide ; R<sub>th</sub> = résistance vue, sources éteintes.', 'I<sub>N</sub> = V<sub>th</sub>/R<sub>th</sub>.', 'P<sub>max</sub> pour R<sub>L</sub> = R<sub>th</sub>, avec η = 50 %.']),
        K.toLab('analyse', 'Faites varier la charge d’un réseau à deux sources et comparez le circuit complet à son modèle.')] }
    ] });

  var D = { E1: 12, E2: 6, R1: 100, R2: 200, R3: 300, RL: 1000, src: 'both' };
  function M(s) {
    var e1 = s.src === 'e2' ? 0 : s.E1, e2 = s.src === 'e1' ? 0 : s.E2, t = thevenin(e1, e2, s.R1, s.R2, s.R3), l = load(t.Vth, t.Rth, s.RL), n = norton(t.Vth, t.Rth);
    return { Vth: t.Vth, Rth: t.Rth, In: n.In, I: l.I, U: l.U, P: l.P, eta: l.eta, pMax: pMax(t.Vth, t.Rth), ratio: s.RL / t.Rth };
  }
  var lab = { id: 'analyse', title: 'Thévenin et transfert de puissance', short: 'Analyse des circuits', icon: 'circuit', badge: 'Réseau linéaire, sources idéales, régime continu',
    text: 'Modifiez les sources et les résistances d’un réseau, éteignez une source, puis cherchez la charge qui reçoit la puissance maximale.',
    summary: 'Calculez le modèle de Thévenin d’un réseau à deux sources, vérifiez la superposition et trouvez la charge optimale.',
    params: [{ group: 'Réseau' }, { k: 'src', label: 'Sources actives', opts: [['both', 'E₁ et E₂'], ['e1', 'E₁ seule'], ['e2', 'E₂ seule']] }, { k: 'E1', label: 'E₁', min: -24, max: 24, step: 0.5, unit: 'V', dec: 1 }, { k: 'E2', label: 'E₂', min: -24, max: 24, step: 0.5, unit: 'V', dec: 1 }, { k: 'R1', label: 'R₁', min: 10, max: 10000, log: true, unit: 'Ω', dec: 1 }, { k: 'R2', label: 'R₂', min: 10, max: 10000, log: true, unit: 'Ω', dec: 1 }, { k: 'R3', label: 'R₃', min: 10, max: 10000, log: true, unit: 'Ω', dec: 1 }, { group: 'Charge' }, { k: 'RL', label: 'Charge R<sub>L</sub>', min: 1, max: 100000, log: true, unit: 'Ω', dec: 1 }],
    defaults: D, model: M,
    expr: function (s, m) { return 'V<sub>th</sub> = ' + fN(m.Vth, 4) + ' V ; R<sub>th</sub> = ' + si(m.Rth, 'Ω', 4); },
    schema: function (s, m) { return net(s, ['E₁=' + fN(s.E1) + ' V', 'R₁', 'R₂', 'R₃', 'E₂=' + fN(s.E2) + ' V'], true); },
    readouts: [['Tension à vide V_th', function (s, m) { return fN(m.Vth, 4) + ' V'; }], ['Résistance R_th', function (s, m) { return si(m.Rth, 'Ω', 4); }], ['Courant de Norton', function (s, m) { return si(m.In, 'A'); }], ['Tension sur la charge', function (s, m) { return fN(m.U, 4) + ' V'; }], ['Courant de charge', function (s, m) { return si(m.I, 'A'); }], ['Puissance reçue', function (s, m) { return si(m.P, 'W'); }], ['Puissance maximale', function (s, m) { return si(m.pMax, 'W'); }], ['Rendement', function (s, m) { return fN(m.eta * 100) + ' %'; }]],
    plots: [{ expr: function (s, m) { return 'Puissance dans la charge en fonction de R<sub>L</sub>'; }, options: function (s, m) { var top = Math.max(m.pMax, 1e-9) * 1.15; return { title: 'Puissance et charge', desc: 'Puissance reçue pour une charge de 1 ohm à 100 kilohms.', x: { min: 1, max: 100000, log: true, label: 'RL (Ω)' }, y: { min: 0, max: top, label: 'P (W)' }, series: [{ samples: 200, fn: function (r) { return load(m.Vth, m.Rth, r).P; } }], vlines: [{ x: m.Rth, label: 'Rth' }], points: [{ x: s.RL, y: m.P, label: 'réglage' }] }; } }],
    explain: function (s, m) { return '<p>Vu depuis A, le réseau équivaut à ' + fN(m.Vth, 4) + ' V en série avec ' + si(m.Rth, 'Ω', 4) + '. La charge forme un diviseur avec R<sub>th</sub> : elle reçoit ' + fN(m.U, 4) + ' V, soit ' + si(m.P, 'W') + ' (' + fN(m.P / (m.pMax || 1) * 100) + ' % du maximum possible).</p>'; },
    missions: [
      { id: 'm1', title: 'Adapter la charge', text: 'Réglez R_L à 5 % près de R_th.', solution: function (s) { s.RL = 54.5; }, check: function (s, m) { return Math.abs(m.ratio - 1) <= 0.05 ? { ok: true, msg: 'Réussi : la charge reçoit ' + si(m.P, 'W') + ', le maximum possible.' } : { ok: false, msg: 'R_L/R_th = ' + fN(m.ratio) + '. Visez 1.' }; } },
      { id: 'm2', title: 'Viser le rendement', text: 'Obtenez un rendement d’au moins 95 %, avec E₁ et E₂ actives.', solution: { RL: 5000 }, check: function (s, m) { if (s.src !== 'both') return { ok: false, msg: 'Activez les deux sources.' }; return m.eta >= 0.95 && s.RL !== D.RL ? { ok: true, msg: 'Réussi : η = ' + fN(m.eta * 100) + ' %, mais la charge ne reçoit plus que ' + si(m.P, 'W') + '.' } : { ok: false, msg: 'η = ' + fN(m.eta * 100) + ' %. Modifiez et augmentez R_L.' }; } },
      { id: 'm3', title: 'Annuler la sortie', text: 'Réglez les sources pour que la tension à vide soit presque nulle (moins de 0,1 V), avec les deux sources actives.', solution: { E2: -24 }, check: function (s, m) { if (s.src !== 'both') return { ok: false, msg: 'Activez les deux sources.' }; return Math.abs(m.Vth) < 0.1 ? { ok: true, msg: 'Réussi : V_th = ' + fN(m.Vth, 3) + ' V. Les effets des deux sources se compensent.' } : { ok: false, msg: 'V_th = ' + fN(m.Vth, 4) + ' V. Une source doit être négative.' }; } }],
    limits: '<p>Sources parfaites et résistances constantes, sans échauffement ni tolérance. Le modèle de Thévenin n’est valable que pour un réseau linéaire. Une vraie source possède une résistance interne et un courant maximal qui ne sont pas représentés ici.</p>' };

  var t = thevenin(24, 0, 1000, 1000, 2000);
  var list = [
    K.num('e1', 'Superposition', 'Superposition', '<p>Dans le réseau de la leçon (R₁ = 100 Ω, R₂ = 200 Ω, R₃ = 300 Ω), E₁ = 12 V seule donne ' + fN(ex2.fromE1, 4) + ' V au point A, et E₂ = 6 V seule ' + fN(ex2.fromE2, 4) + ' V. Calculez V<sub>A</sub>, en V.</p>', ex2.total, 'V', { rel: 0.02 }, '<p>On additionne les deux contributions : ' + fN(ex2.total, 4) + ' V.</p>'),
    K.num('e2', 'Résistance de Thévenin', 'Thévenin', '<p>E₂ est absente (fil), R₁ = 1 kΩ, R₂ = 1 kΩ, R₃ = 2 kΩ, reliées au point A. Calculez R<sub>th</sub> vue du point A, en Ω.</p>', t.Rth, 'Ω', { rel: 0.02 }, '<p>R₁ // R₂ // R₃ = ' + fN(t.Rth, 4) + ' Ω.</p>'),
    K.num('e3', 'Tension de Thévenin', 'Thévenin', '<p>Même réseau avec E₁ = 24 V. Calculez V<sub>th</sub>, en V.</p>', t.Vth, 'V', { rel: 0.02 }, '<p>V<sub>th</sub> = (E₁/R₁)/G = ' + fN(t.Vth, 4) + ' V, avec G = 1/R₁ + 1/R₂ + 1/R₃.</p>'),
    K.num('e4', 'Courant de Norton', 'Norton', '<p>Un réseau a V<sub>th</sub> = 9 V et R<sub>th</sub> = 450 Ω. Calculez I<sub>N</sub>, en mA.</p>', 20, 'mA', { rel: 0.02 }, '<p>I<sub>N</sub> = 9/450 = 20 mA.</p>'),
    K.num('e5', 'Puissance maximale', 'Transfert de puissance', '<p>V<sub>th</sub> = 12 V et R<sub>th</sub> = 8 Ω. Calculez la puissance maximale disponible, en W.</p>', pMax(12, 8), 'W', { rel: 0.02 }, '<p>P<sub>max</sub> = V²/(4R) = 144/32 = 4,5 W.</p>'),
    K.num('e6', 'Rendement', 'Transfert de puissance', '<p>R<sub>th</sub> = 10 Ω et R<sub>L</sub> = 90 Ω. Calculez le rendement, en %.</p>', 90, '%', { rel: 0.01 }, '<p>η = 90/(90 + 10) = 90 %.</p>'),
    K.pick('e7', 'Éteindre une source', 'Thévenin', '<p>Pour calculer R<sub>th</sub>, une source de tension idéale est remplacée par :</p>', 'un court-circuit', ['un circuit ouvert', 'une résistance de 1 Ω', 'une source de courant'], '<p>Une source de tension éteinte impose 0 V à ses bornes : c’est un fil. Une source de courant éteinte impose 0 A : c’est un circuit ouvert.</p>'),
    K.pick('e8', 'Limite de la superposition', 'Superposition', '<p>Le théorème de superposition ne s’applique pas directement :</p>', 'aux puissances', ['aux courants', 'aux tensions', 'aux réseaux à deux sources'], '<p>La puissance varie comme le carré du courant : (I₁ + I₂)² n’est pas égal à I₁² + I₂².</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('analyse', list) };
});
