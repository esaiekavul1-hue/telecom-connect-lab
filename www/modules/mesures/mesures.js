/*
 * TELECOM CONNECT LAB 2.0 — Mesures à l'oscilloscope, au multimètre, dépannage.
 * Modèle : oscilloscope virtuel à déclenchement sur front et atténuation de sonde.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S, TAU = 2 * Math.PI;

  var SIGNALS = { a: { f: 1000, A: 2.5, off: 1.2, name: 'A' }, b: { f: 47000, A: 0.35, off: 0, name: 'B' }, c: { f: 50, A: 15.56, off: 0, name: 'C' } };
  function rmsAC(A) { return A / Math.SQRT2; }
  function rmsTotal(A, off) { return Math.sqrt(off * off + A * A / 2); }
  function loading(Rs, Rm) { return Rm / (Rs + Rm); }
  function resolutionErr(reading, pct, digits, step) { return reading * pct / 100 + digits * step; }
  /** Premier instant où le signal franchit le niveau de déclenchement en montant. */
  function triggerOffset(sig, level, coupling) {
    var off = coupling === 'ac' ? 0 : sig.off, x = (level - off) / sig.A;
    if (Math.abs(x) >= 1) return null;
    return Math.asin(x) / (TAU * sig.f);
  }
  /** Mesure guidée : retrouve la panne d'une chaîne d'alimentation simplifiée. */
  var FAULTS = { none: { in: 12, reg: 5, led: 2.1 }, fuse: { in: 0, reg: 0, led: 0 }, reg: { in: 12, reg: 0, led: 0 }, led: { in: 12, reg: 5, led: 5 } };
  var math = { SIGNALS: SIGNALS, rmsAC: rmsAC, rmsTotal: rmsTotal, loading: loading, resolutionErr: resolutionErr, triggerOffset: triggerOffset, FAULTS: FAULTS };

  var lesson = K.lesson({ id: 'mesures', title: 'Mesures et dépannage électronique',
    intro: 'Une mesure n’a de valeur que si l’on connaît sa précision et l’influence de l’instrument. Cette leçon apprend à utiliser correctement le multimètre et l’oscilloscope, puis à chercher une panne avec méthode.',
    objectives: ['Choisir la fonction et le calibre d’un multimètre.', 'Estimer l’incertitude d’une mesure à partir d’une notice.', 'Régler un oscilloscope : base de temps, calibre vertical, déclenchement, couplage.', 'Suivre une méthode de diagnostic.'],
    prerequisites: 'Courant alternatif, valeur efficace.',
    sources: ['Page « Oscilloscope » (déclenchement, calibres, sonde ×10).', 'Module Circuits : influence des instruments.'],
    figures: { scope: { caption: 'Commandes principales d’un oscilloscope : vertical, horizontal et déclenchement.', svg: function () { return S.blocks({ w: 520, h: 150, label: 'Sonde, voie verticale, base de temps et déclenchement.', boxes: [{ id: 's', x: 20, y: 50, w: 90, h: 50, t: 'Sonde', sub: '×1 ou ×10' }, { id: 'v', x: 150, y: 50, w: 110, h: 50, t: 'Vertical', sub: 'V/div, couplage' }, { id: 'e', x: 400, y: 50, w: 100, h: 50, t: 'Écran' }, { id: 'h', x: 268, y: 10, w: 118, h: 44, t: 'Temps', sub: 's/div' }, { id: 't', x: 268, y: 96, w: 118, h: 44, t: 'Déclenchement', sub: 'niveau, front' }], links: [{ a: 's', b: 'v' }, { a: 'v', b: 'e' }, { a: 'h', b: 'e', dash: true }, { a: 't', b: 'e', dash: true }] }); } },
      tree: { caption: 'Une recherche de panne progresse par moitiés : chaque mesure élimine une partie du circuit.', svg: function () { return S.blocks({ w: 520, h: 130, label: 'Alimentation, fusible, régulateur, charge.', boxes: [{ id: 'a', x: 20, y: 40, w: 90, h: 50, t: 'Entrée 12 V' }, { id: 'b', x: 150, y: 40, w: 90, h: 50, t: 'Fusible' }, { id: 'c', x: 280, y: 40, w: 90, h: 50, t: 'Régulateur' }, { id: 'd', x: 410, y: 40, w: 90, h: 50, t: 'Charge' }], links: [{ a: 'a', b: 'b' }, { a: 'b', b: 'c' }, { a: 'c', b: 'd' }] }); } } },
    chapters: [
      { title: 'Le multimètre', summary: 'Fonctions, calibres, précision.', html: [
        '<p class="lead">Le multimètre est l’outil de base. Mal utilisé, il donne une valeur fausse ou se détruit.</p>',
        K.defs([['Calibre', 'Plage maximale de mesure sélectionnée.'], ['Résolution', 'Plus petit écart affiché.'], ['Précision', 'Écart maximal annoncé par le fabricant entre l’affichage et la valeur vraie.']]),
        K.formula('Δ' + v('x') + ' = (a % × lecture) + (b × résolution)', 'Forme usuelle des notices d’appareils numériques. a et b viennent de la notice.'),
        K.example('incertitude d’une mesure', '<p>Lecture de 12,00 V, précision ±(0,5 % + 2 digits), résolution 0,01 V : Δx = 0,06 + 0,02 = ' + fN(resolutionErr(12, 0.5, 2, 0.01)) + ' V. La valeur est comprise entre 11,92 et 12,08 V.</p>'),
        K.apply('<p>Avant de mesurer une résistance, coupez toujours l’alimentation et déchargez les condensateurs. Pour un courant, le circuit doit être ouvert et le multimètre placé en série.</p>')] },
      { title: 'L’oscilloscope', summary: 'Base de temps, calibre, sonde, déclenchement.', html: [
        '<p class="lead">L’oscilloscope trace la tension en fonction du temps. Il montre ce qu’un multimètre ne peut pas voir.</p>',
        '<div data-fig="scope"></div>',
        K.formula(v('f') + ' = 1/(N<sub>div</sub> × s/div), ' + v('V') + '<sub>cc</sub> = N<sub>carreaux</sub> × V/div', 'Lecture à l’écran. Tenir compte de l’atténuation de la sonde.'),
        K.defs([['Déclenchement', 'Choix de l’instant de capture à partir d’un niveau et d’un front, pour stabiliser l’image.'], ['Couplage AC', 'Bloque la composante continue et ne laisse voir que la partie variable.'], ['Sonde ×10', 'Divise la tension par dix et réduit l’effet de charge : le signal réel vaut dix fois l’affichage si le réglage n’est pas fait.']]),
        K.example('lire un écran', '<p>Une période occupe 4 carreaux à 200 µs/div : T = 800 µs, soit f = 1,25 kHz. Le signal s’étend sur 5 carreaux à 1 V/div : V<sub>cc</sub> = 5 V, donc une amplitude de 2,5 V et 1,77 V efficaces.</p>')] },
      { title: 'Méthode de dépannage', summary: 'Observer, mesurer par moitiés, corriger, vérifier.', html: [
        '<p class="lead">Un dépanneur efficace ne remplace pas des composants au hasard. Il réduit méthodiquement le domaine de recherche.</p>',
        '<div data-fig="tree"></div>',
        K.defs([['Division par moitiés', 'Mesurer au milieu de la chaîne pour éliminer d’un coup la moitié des causes.'], ['Mesure de référence', 'Valeur relevée sur un appareil qui fonctionne, ou calculée.']]),
        K.formula('rapport de charge = ' + v('R') + '<sub>m</sub> / (' + v('R') + '<sub>s</sub> + ' + v('R') + '<sub>m</sub>)', 'Rapport entre tension lue et tension réelle pour une source de résistance R<sub>s</sub> et un instrument de résistance R<sub>m</sub>.'),
        K.example('fusible coupé', '<p>12 V à l’entrée, 0 V après le fusible : la panne se situe entre ces deux points. Avant de remplacer le fusible, recherchez le court-circuit qui l’a fait fondre.</p>'),
        K.pitfalls(['<strong>Mesurer un courant en position tension, ou l’inverse.</strong>', '<strong>Oublier le facteur 10 de la sonde.</strong>', '<strong>Relier la masse de l’oscilloscope à n’importe quel point :</strong> elle est liée à la terre sur les modèles secteur.', '<strong>Remplacer un composant sans chercher la cause</strong> de sa défaillance.']),
        K.summary(['Une mesure s’accompagne d’une incertitude.', 'f et V<sub>cc</sub> se lisent à l’écran, en comptant les carreaux.', 'Le déclenchement stabilise l’image.', 'Dépannez par moitiés, à partir d’une valeur de référence.']),
        K.toLab('mesures', 'Mesurez des signaux inconnus avec un oscilloscope virtuel et localisez une panne.')] }
    ] });

  var D = { sig: 'a', tdiv: 0.0005, vdiv: 1, couple: 'dc', level: 0, probe: 1, setProbe: 1, fault: 'fuse', point: 'in', guess: '', reads: [] };
  var TD = [[0.00001, '10 µs/div'], [0.00005, '50 µs/div'], [0.0002, '200 µs/div'], [0.0005, '500 µs/div'], [0.002, '2 ms/div'], [0.01, '10 ms/div']];
  var VD = [[0.1, '0,1 V/div'], [0.5, '0,5 V/div'], [1, '1 V/div'], [2, '2 V/div'], [5, '5 V/div'], [10, '10 V/div']];
  function M(s) {
    var sig = SIGNALS[s.sig], gain = s.setProbe / s.probe, off = s.couple === 'ac' ? 0 : sig.off, trig = triggerOffset(sig, s.level / gain, s.couple);
    var span = 10 * s.tdiv, cycles = span * sig.f, ppDiv = 2 * sig.A * gain / s.vdiv, topDiv = Math.abs(off * gain) / s.vdiv + sig.A * gain / s.vdiv;
    var f = FAULTS[s.fault], meas = f[s.point];
    return { sig: sig, off: off, gain: gain, trig: trig, span: span, cycles: cycles, ppDiv: ppDiv, onScreen: topDiv <= 4 && ppDiv >= 1.5, usable: trig !== null && cycles >= 1 && cycles <= 20, meas: meas };
  }
  var lab = { id: 'mesures', title: 'Oscilloscope virtuel et dépannage', short: 'Mesures et dépannage', icon: 'target', badge: 'Instrument virtuel, signaux synthétiques',
    text: 'Réglez la base de temps, le calibre, le déclenchement et la sonde pour lire des signaux inconnus, puis localisez une panne par mesures.',
    summary: 'Réglez un oscilloscope pour mesurer des signaux inconnus, puis localisez une panne dans une chaîne d’alimentation.',
    params: [{ group: 'Signal à mesurer' }, { k: 'sig', label: 'Signal', opts: [['a', 'A'], ['b', 'B'], ['c', 'C']] }, { group: 'Réglages' }, { k: 'tdiv', label: 'Base de temps', select: true, opts: TD, hint: 'Durée par carreau horizontal.' }, { k: 'vdiv', label: 'Calibre vertical', select: true, opts: VD, hint: 'Tension par carreau vertical.' }, { k: 'couple', label: 'Couplage', opts: [['dc', 'DC'], ['ac', 'AC']] }, { k: 'level', label: 'Niveau de déclenchement', min: -20, max: 20, step: 0.1, unit: 'V', dec: 1 }, { k: 'probe', label: 'Sonde réelle', opts: [[1, '×1'], [10, '×10']] }, { k: 'setProbe', label: 'Réglage de sonde sur l’appareil', opts: [[1, '×1'], [10, '×10']] }, { group: 'Dépannage' }, { k: 'fault', label: 'Situation', select: true, opts: [['fuse', 'Panne 1'], ['reg', 'Panne 2'], ['led', 'Panne 3'], ['none', 'Appareil sain']], hint: 'La nature de la panne est à découvrir par la mesure.' }, { k: 'point', label: 'Point mesuré', opts: [['in', 'Entrée'], ['reg', 'Sortie régulateur'], ['led', 'Charge']] }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Base de temps ' + si(s.tdiv, 's') + '/div ; ' + fN(s.vdiv) + ' V/div'; },
    verdict: function (s, m) { if (m.trig === null) return { ok: false, text: 'Pas de déclenchement : image instable' }; if (!m.onScreen) return { ok: false, text: 'Mauvais calibre vertical' }; return { ok: true, text: 'Image stable et lisible' }; },
    readouts: [['Carreaux crête à crête', function (s, m) { return fN(m.ppDiv) + ' div'; }], ['Périodes affichées', function (s, m) { return fN(m.cycles); }], ['Point mesuré', function (s, m) { return fN(m.meas) + ' V'; }], ['Tension de référence', function (s) { return s.point === 'in' ? '12 V' : s.point === 'reg' ? '5 V' : '2,1 V'; }]],
    plots: [{ expr: function (s, m) { return 'Écran : 10 carreaux horizontaux, 8 verticaux'; }, options: function (s, m) { var tr = m.trig == null ? 0.137 / m.sig.f : m.trig; return { title: 'Écran de l’oscilloscope', desc: 'Trace affichée selon les réglages de l’appareil.', x: { min: 0, max: 10, ticks: [0, 2, 4, 6, 8, 10], label: 'carreaux' }, y: { min: -4, max: 4, ticks: [-4, -2, 0, 2, 4], label: 'carreaux' }, series: [{ samples: 800, fn: function (d) { var t = d * s.tdiv + tr; return (m.off + m.sig.A * Math.sin(TAU * m.sig.f * t)) * m.gain / s.vdiv; } }], hlines: [{ y: s.level / s.vdiv, label: 'trig' }] }; } }],
    explain: function (s, m) { var gainTxt = m.gain !== 1 ? ' Attention : la sonde et le réglage de l’appareil diffèrent, l’affichage est faux d’un facteur ' + fN(m.gain) + '.' : ''; return '<p>La tension vaut ' + fN(m.ppDiv) + ' carreaux de haut pour ' + fN(m.cycles) + ' périodes à l’écran.' + gainTxt + ' Mesure de dépannage au point « ' + (s.point === 'in' ? 'entrée' : s.point === 'reg' ? 'sortie régulateur' : 'charge') + ' » : ' + fN(m.meas) + ' V.</p>'; },
    missions: [
      { id: 'm1', title: 'Stabiliser et cadrer le signal A', text: 'Sur le signal A, obtenez une image déclenchée, entre 1 et 5 périodes à l’écran et bien cadrée en hauteur.', solution: { sig: 'a', tdiv: 0.0005, vdiv: 2, level: 1.2, couple: 'dc' }, check: function (s, m) { if (s.sig !== 'a') return { ok: false, msg: 'Sélectionnez le signal A.' }; if (m.trig === null) return { ok: false, msg: 'Le niveau de déclenchement est hors du signal.' }; if (s.level === 0 && s.vdiv === 1) return { ok: false, msg: 'Réglez le niveau et le calibre : le signal déborde.' }; return m.cycles >= 1 && m.cycles <= 5 && m.onScreen ? { ok: true, msg: 'Réussi : la période vaut ' + si(1 / m.sig.f, 's') + '.' } : { ok: false, msg: fN(m.cycles) + ' périodes, ' + fN(m.ppDiv) + ' carreaux. Ajustez les calibres.' }; } },
      { id: 'm2', title: 'Isoler la partie variable', text: 'Sur le signal A, utilisez le couplage AC pour supprimer la composante continue, à 0,5 V/div.', solution: { sig: 'a', couple: 'ac', vdiv: 0.5 }, check: function (s, m) { if (s.sig !== 'a') return { ok: false, msg: 'Sélectionnez le signal A.' }; return s.couple === 'ac' && s.vdiv === 0.5 ? { ok: true, msg: 'Réussi : seule l’ondulation de ±' + fN(m.sig.A) + ' V reste visible.' } : { ok: false, msg: 'Passez en couplage AC et à 0,5 V/div.' }; } },
      { id: 'm3', title: 'Repérer une erreur de sonde', text: 'Créez une situation où l’affichage est dix fois trop petit.', solution: { probe: 10, setProbe: 1 }, check: function (s, m) { return m.gain === 0.1 ? { ok: true, msg: 'Réussi : sonde ×10 non déclarée, l’écran affiche dix fois moins que la réalité.' } : { ok: false, msg: 'Sélectionnez une sonde ×10 et laissez l’appareil réglé sur ×1.' }; } },
      { id: 'm4', title: 'Localiser la panne 2', text: 'En situation « Panne 2 », placez la mesure sur le point qui montre où s’arrête le 5 V.', solution: { fault: 'reg', point: 'reg' }, check: function (s, m) { if (s.fault !== 'reg') return { ok: false, msg: 'Choisissez la panne 2.' }; return s.point === 'reg' && m.meas === 0 ? { ok: true, msg: 'Réussi : 12 V à l’entrée mais 0 V en sortie du régulateur, le régulateur est le suspect.' } : { ok: false, msg: 'Mesurez à la sortie du régulateur.' }; } }],
    limits: '<p>Les signaux sont idéaux et le déclenchement instantané. L’écran n’a ni bruit ni limite de bande passante. La sonde est parfaitement compensée. Sur du matériel réel, la masse de la sonde et les tensions du réseau présentent un danger : suivez les consignes de sécurité.</p>' };
  lab.defaults.reads = [0];

  var list = [
    K.num('e1', 'Incertitude de lecture', 'Multimètre', '<p>Lecture 5,00 V, précision ±(1 % + 2 digits), résolution 0,01 V. Calculez l’incertitude, en V.</p>', resolutionErr(5, 1, 2, 0.01), 'V', { rel: 0.03 }, '<p>Δx = 0,05 + 0,02 = 0,07 V.</p>'),
    K.num('e2', 'Lecture de fréquence', 'Oscilloscope', '<p>Une période occupe 5 carreaux à 100 µs/div. Calculez la fréquence, en kHz.</p>', 2, 'kHz', { rel: 0.02 }, '<p>T = 500 µs, donc f = 2 kHz.</p>'),
    K.num('e3', 'Tension crête à crête', 'Oscilloscope', '<p>Le signal couvre 6 carreaux à 0,5 V/div. Calculez V<sub>cc</sub>, en V.</p>', 3, 'V', { rel: 0.02 }, '<p>6 × 0,5 = 3 V.</p>'),
    K.num('e4', 'Valeur efficace', 'Oscilloscope', '<p>Une sinusoïde a une amplitude de 2,5 V. Calculez sa valeur efficace, en V.</p>', rmsAC(2.5), 'V', { rel: 0.02 }, '<p>V<sub>eff</sub> = 2,5/√2 = ' + fN(rmsAC(2.5), 4) + ' V.</p>'),
    K.num('e5', 'Effet de charge', 'Influence de l’instrument', '<p>Une source de résistance 1 MΩ est mesurée par un voltmètre de 10 MΩ. Calculez le rapport tension lue/tension réelle, en %.</p>', loading(1e6, 1e7) * 100, '%', { rel: 0.02 }, '<p>10/(1 + 10) = ' + fN(loading(1e6, 1e7) * 100, 4) + ' %.</p>'),
    K.num('e6', 'Sonde mal déclarée', 'Oscilloscope', '<p>Sonde ×10 utilisée, appareil réglé sur ×1 : l’écran affiche 1,2 V. Quelle est la tension réelle, en V ?</p>', 12, 'V', { rel: 0.02 }, '<p>La sonde divise par dix : 1,2 × 10 = 12 V.</p>'),
    K.pick('e7', 'Méthode', 'Dépannage', '<p>Quelle est la démarche la plus efficace ?</p>', 'Mesurer au milieu de la chaîne pour éliminer la moitié des causes', ['Remplacer tous les composants', 'Commencer par les composants les moins chers', 'Remplacer le fusible sans autre contrôle'], '<p>La division par moitiés réduit très vite la zone de recherche.</p>'),
    K.pick('e8', 'Couplage', 'Oscilloscope', '<p>Le couplage AC :</p>', 'supprime la composante continue', ['ajoute une composante continue', 'double la tension', 'mesure uniquement la fréquence'], '<p>Il permet d’observer une petite ondulation superposée à une tension continue.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('mesures', list) };
});
