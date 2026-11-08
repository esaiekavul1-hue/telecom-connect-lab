/*
 * TELECOM CONNECT LAB 2.0 — Laboratoire complémentaire : multimètre interactif.
 * Modèle : diviseur 12 V, 1 kΩ et 2,2 kΩ, multimètre 2000 points, voltmètre 10 MΩ, ampèremètre 1 Ω.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.registerLab(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, S = K.S;
  var E = 12, R1 = 1000, R2 = 2200, RV = 1e7, RA = 1;
  function par(a, b) { return a * b / (a + b); }
  var RANGES = { v: [2, 20, 200], ma: [2, 20, 200], ohm: [2, 20, 200] }, UNIT = { v: 'V', ma: 'mA', ohm: 'kΩ' };
  /** Valeur vraie vue par l'instrument. { value } dans l'unité affichée, ou { error }. */
  function measure(s) {
    if (s.fn === 'v') {
      if (!s.power) return { value: 0 };
      if (s.pt === 'src') return { value: E };
      if (s.pt === 'serie') return { value: E * RV / (RV + R1 + R2) };
      if (s.pt === 'r1') { var a = par(R1, RV); return { value: E * a / (a + R2) }; }
      var b = par(R2, RV); return { value: E * b / (b + R1) };
    }
    if (s.fn === 'ma') {
      if (!s.power) return { value: 0 };
      if (s.pt === 'src') return { error: 'fuse' };
      if (s.pt === 'serie') return { value: E / (R1 + R2 + RA) * 1000 };
      if (s.pt === 'r1') { var c = E / (R2 + par(R1, RA)); return { value: c * R1 / (R1 + RA) * 1000 }; }
      var d = E / (R1 + par(R2, RA)); return { value: d * R2 / (R2 + RA) * 1000 };
    }
    if (s.power) return { error: 'powered' };
    if (s.pt === 'src') return { value: 0 };
    if (s.pt === 'serie') return { value: (R1 + R2) / 1000 };
    if (s.isol) return { value: (s.pt === 'r1' ? R1 : R2) / 1000 };
    return { value: par(R1, R2) / 1000 };
  }
  /** Affichage 2000 points : OL hors calibre ; incertitude ±(0,5 % + 2 points). */
  function display(value, range) {
    if (value >= range) return { ol: true };
    var step = range / 2000, shown = Math.round(value / step) * step;
    return { ol: false, shown: shown, step: step, err: Math.abs(shown) * 0.005 + 2 * step };
  }
  var math = { measure: measure, display: display };

  var D = { fn: 'v', range: 2, pt: 'src', power: 1, isol: 0 };
  function M(s) { var r = measure(s), rg = RANGES[s.fn][s.range], d = r.error ? null : display(r.value, rg); return { r: r, rg: rg, d: d, u: UNIT[s.fn], dec: rg === 2 ? 3 : rg === 20 ? 2 : 1 }; }
  function txt(s, m) { if (m.r.error === 'fuse') return 'FUSIBLE'; if (m.r.error === 'powered') return 'ERREUR'; if (m.d.ol) return 'OL'; return m.d.shown.toFixed(m.dec).replace('.', ',') + ' ' + m.u; }
  var PTS = { src: 'Bornes de la source', r1: 'Bornes de R₁', r2: 'Bornes de R₂', serie: 'En série, circuit ouvert' };
  var lab = { id: 'multimetre', title: 'Multimètre interactif', short: 'Multimètre', icon: 'target', badge: 'Multimètre 2000 points simulé',
    text: 'Choisissez la fonction, le calibre et le point de mesure sur un diviseur de tension. Une mauvaise manipulation donne une valeur fausse ou un défaut.',
    summary: 'Mesurez tension, courant et résistance sur un circuit, choisissez le calibre et repérez les erreurs de branchement.',
    params: [{ group: 'Multimètre' }, { k: 'fn', label: 'Fonction', opts: [['v', 'Tension'], ['ma', 'Courant'], ['ohm', 'Résistance']] }, { k: 'range', label: 'Calibre', opts: [[0, '2'], [1, '20'], [2, '200']], hint: 'En V, mA ou kΩ selon la fonction.' }, { k: 'pt', label: 'Point de branchement', select: true, opts: Object.keys(PTS).map(function (k) { return [k, PTS[k]]; }), hint: '' }, { group: 'Circuit' }, { k: 'power', label: 'Alimentation', opts: [[1, 'Sous tension'], [0, 'Coupée']] }, { k: 'isol', label: 'Composant', opts: [[0, 'En circuit'], [1, 'Dessoudé']] }],
    defaults: D, model: M,
    schema: function (s) { return S.svg(520, 170, 'Source de 12 volts, R1 de 1 kilohm et R2 de 2,2 kilohms en série.', S.wire('M70 35H190M250 35H400V65M400 125V150H70V125M70 65V35') + S.V(70, 95, true, '12 V') + S.R(220, 35, false, 'R₁ = 1 kΩ') + S.R(400, 95, true, 'R₂ = 2,2 kΩ') + S.text(235, 100, 'Sondes : ' + PTS[s.pt]), true); },
    expr: function (s, m) { return 'Calibre ' + m.rg + ' ' + m.u; },
    verdict: function (s, m) { if (m.r.error === 'fuse') return { ok: false, text: 'Court-circuit : fusible détruit' }; if (m.r.error === 'powered') return { ok: false, text: 'Jamais d’ohmmètre sous tension' }; if (m.d.ol) return { ok: false, text: 'Hors calibre : choisissez plus grand' }; return { ok: true, text: 'Mesure possible' }; },
    widget: function (s, m) { return '<h3>Affichage</h3><div class="sim-cell is-on" aria-live="polite" style="font-size:30px;padding:16px">' + txt(s, m) + '</div>'; },
    readouts: [['Affichage', function (s, m) { return txt(s, m); }], ['Résolution', function (s, m) { return m.d && !m.d.ol ? fN(m.d.step, 3) + ' ' + m.u : 'sans objet'; }], ['Incertitude', function (s, m) { return m.d && !m.d.ol ? '± ' + fN(m.d.err, 3) + ' ' + m.u : 'sans objet'; }]],
    explain: function (s, m) { if (m.r.error === 'fuse') return '<p>En position ampèremètre, l’appareil présente environ 1 Ω : branché sur la source, il crée un quasi court-circuit.</p>'; if (m.r.error === 'powered') return '<p>Un ohmmètre injecte son propre courant : le circuit doit être hors tension.</p>'; if (m.d.ol) return '<p>La valeur dépasse le calibre : l’appareil affiche OL.</p>'; if (s.fn === 'ohm' && !s.isol && s.pt !== 'src' && s.pt !== 'serie') return '<p>En circuit, les autres composants sont en parallèle : la lecture n’est pas la valeur du composant.</p>'; if (s.fn === 'v' && s.pt === 'serie') return '<p>Placé en série, le voltmètre bloque presque tout le courant et lit la tension de la source.</p>'; return '<p>Un calibre juste au-dessus de la valeur donne la meilleure résolution.</p>'; },
    missions: [
      { id: 'm1', title: 'Mesurer une tension', text: 'Mesurez la tension aux bornes de R₂ avec le calibre offrant la meilleure résolution.', solution: { fn: 'v', pt: 'r2', range: 1, power: 1 }, check: function (s, m) { if (s.fn !== 'v' || s.pt !== 'r2' || !s.power) return { ok: false, msg: 'Fonction tension, aux bornes de R₂, sous tension.' }; return s.range === 1 ? { ok: true, msg: 'Réussi : ' + txt(s, m) + ' sur le calibre 20 V.' } : { ok: false, msg: 'Ce calibre n’est pas le mieux adapté à cette valeur.' }; } },
      { id: 'm2', title: 'Mesurer un courant', text: 'Mesurez le courant du circuit en plaçant l’appareil correctement, au meilleur calibre.', solution: { fn: 'ma', pt: 'serie', range: 1, power: 1 }, check: function (s, m) { if (s.fn !== 'ma' || s.pt !== 'serie' || !s.power) return { ok: false, msg: 'Un courant se mesure en série, sous tension.' }; return s.range === 1 ? { ok: true, msg: 'Réussi : ' + txt(s, m) + '.' } : { ok: false, msg: 'Choisissez un autre calibre.' }; } },
      { id: 'm3', title: 'Mesurer R₁ correctement', text: 'Obtenez la vraie valeur de R₁.', solution: { fn: 'ohm', pt: 'r1', range: 0, power: 0, isol: 1 }, check: function (s, m) { if (s.fn !== 'ohm' || s.pt !== 'r1') return { ok: false, msg: 'Fonction résistance, aux bornes de R₁.' }; if (s.power) return { ok: false, msg: 'Coupez d’abord l’alimentation.' }; if (!s.isol) return { ok: false, msg: 'En circuit, R₂ fausse la lecture : isolez le composant.' }; return s.range === 0 ? { ok: true, msg: 'Réussi : ' + txt(s, m) + '.' } : { ok: false, msg: 'Choisissez le calibre le plus précis.' }; } },
      { id: 'm4', title: 'Reconnaître l’erreur dangereuse', text: 'Trouvez le branchement qui détruit le fusible.', solution: { fn: 'ma', pt: 'src', power: 1 }, check: function (s, m) { return m.r.error === 'fuse' ? { ok: true, msg: 'Réussi : à ne jamais faire sur un vrai montage.' } : { ok: false, msg: 'Quel branchement crée un court-circuit de la source ?' }; } }],
    limits: '<p>Instrument et source idéalisés. La précision ±(0,5 % + 2 points) est un exemple de notice, à remplacer par celle de votre appareil. Le fusible est représenté par un simple seuil. Sur du matériel réel, respectez la catégorie de mesure et les consignes de sécurité.</p>' };
  return { math: math, lab: lab };
});
