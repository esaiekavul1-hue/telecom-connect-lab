/*
 * TELECOM CONNECT LAB — Laboratoire « Circuits électriques »
 * ---------------------------------------------------------
 * Diviseur de tension chargé, mesuré par des instruments réels ou idéaux,
 * et charge d'un circuit RC. Toutes les valeurs viennent du solveur nodal
 * (modules/circuits/circuit-math.js).
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, C = TCL.circuitMath, U = TCL.util, K = TCL.labkit;
  var ID = 'circuits', LABEL = 'Circuits électriques';
  var P_MAX = 0.25; // puissance maximale d'une résistance courante (W)

  var LIM = { E: [1, 30], R1: [10, 100000], R2: [10, 100000], RL: [10, 1000000], Rv: [1000, 10000000], Ra: [0.1, 100], Rc: [100, 100000], Cu: [1, 1000] };
  var DEFAULTS = { E: 12, R1: 1000, R2: 1000, RL: 10000, Rv: 10000000, Ra: 1, Rc: 10000, Cu: 100, load: 'off', meters: 'ideal' };
  var LOG = {}; ['R1', 'R2', 'RL', 'Rv', 'Ra', 'Rc', 'Cu'].forEach(function (k) { LOG[k] = K.logSlider(LIM[k][0], LIM[k][1]); });

  function fN(x, s) { return M.formatNumber(x, s == null ? 3 : s); }
  function ohm(r) { return r >= 1e6 ? fN(r / 1e6) + ' MΩ' : r >= 1000 ? fN(r / 1000) + ' kΩ' : fN(r) + ' Ω'; }
  function amp(i) { var a = Math.abs(i); return a >= 1 ? fN(i) + ' A' : a >= 1e-3 ? fN(i * 1000) + ' mA' : fN(i * 1e6) + ' µA'; }
  function watt(p) { return p >= 1 ? fN(p) + ' W' : p >= 1e-3 ? fN(p * 1000) + ' mW' : fN(p * 1e6) + ' µW'; }

  function model(s) {
    var load = s.load === 'on' ? s.RL : null, real = s.meters === 'real';
    var noLoad = C.dividerCircuit({ E: s.E, R1: s.R1, R2: s.R2, RL: null, Ra: 0, Rv: null });
    var ideal = C.dividerCircuit({ E: s.E, R1: s.R1, R2: s.R2, RL: load, Ra: 0, Rv: null });
    var meas = C.dividerCircuit({ E: s.E, R1: s.R1, R2: s.R2, RL: load, Ra: real ? s.Ra : 0, Rv: real ? s.Rv : null });
    var u = meas.elements.R2.u, i = meas.elements.R1.i;
    return { noLoad: noLoad.elements.R2.u, ideal: ideal.elements.R2.u, u: u, i: i, sol: meas,
      errPct: Math.abs(u - ideal.elements.R2.u) / ideal.elements.R2.u * 100,
      loadDrop: (noLoad.elements.R2.u - ideal.elements.R2.u) / noLoad.elements.R2.u * 100,
      pR1: meas.elements.R1.p, pR2: meas.elements.R2.p, balance: meas.delivered - meas.absorbed, tau: C.tau(s.Rc, s.Cu * 1e-6) };
  }

  function schema(s, m) {
    var load = s.load === 'on', real = s.meters === 'real';
    return '<svg class="fiber" viewBox="0 0 720 260" role="img" aria-label="' + U.esc('Diviseur alimenté sous ' + fN(s.E) + ' volts. Tension mesurée ' + fN(m.u) + ' volts, courant ' + amp(m.i) + '.') + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="scope__bg" x="0" y="0" width="720" height="260" rx="14"/>' +
      '<path class="circuit__wire circuit__wire--dark" d="M70 35 H320 V58 M320 112 V140 M320 196 V225 H70 V145 M70 105 V35 M320 126 H560' + (load ? ' M460 126 V145 M460 199 V225 H320' : '') + '"/>' +
      (real ? '<path class="circuit__wire circuit__wire--dark" d="M560 126 V145 M560 199 V225 H460"/>' : '') +
      '<line class="circuit__wire circuit__wire--dark" x1="50" y1="105" x2="90" y2="105"/><line class="circuit__wire circuit__wire--dark" x1="58" y1="145" x2="82" y2="145"/>' +
      '<rect class="circuit__part circuit__part--dark" x="298" y="58" width="44" height="54" rx="3"/><rect class="circuit__part circuit__part--dark" x="298" y="140" width="44" height="56" rx="3"/>' +
      (load ? '<rect class="circuit__part circuit__part--dark" x="438" y="145" width="44" height="54" rx="3"/><text class="fiber__t" x="490" y="176">charge ' + ohm(s.RL) + '</text>' : '') +
      (real ? '<circle class="circuit__meter" cx="560" cy="172" r="27"/><text class="circuit__meter-t" x="560" y="178" text-anchor="middle">V</text><circle class="circuit__meter" cx="180" cy="35" r="20"/><text class="circuit__meter-t" x="180" y="41" text-anchor="middle">A</text>' : '') +
      '<circle class="circuit__node" cx="320" cy="126" r="4"/>' +
      '<text class="fiber__t" x="14" y="130">E = ' + fN(s.E) + ' V</text><text class="fiber__t" x="350" y="90">R₁ = ' + ohm(s.R1) + '</text><text class="fiber__t" x="350" y="172" >R₂ = ' + ohm(s.R2) + '</text>' +
      '<text class="fiber__t fiber__t--ang" x="350" y="118">U = ' + fN(m.u, 4) + ' V</text><text class="fiber__t fiber__t--ang" x="210" y="26">I = ' + amp(m.i) + '</text></svg>';
  }

  var missions = [
    { id: 'm1', title: 'Diviser la tension par deux',
      text: 'Sans charge et avec des instruments idéaux, réglez R₁ et R₂ pour que U soit égale à la moitié de E (à 2 % près), avec R₂ différente de la valeur de départ.',
      check: function (s) { var m = model(s); if (s.load === 'on' || s.meters === 'real') return { ok: false, msg: 'Retirez la charge et choisissez des instruments idéaux.' }; if (s.R2 === DEFAULTS.R2) return { ok: false, msg: 'Choisissez une valeur de R₂ différente de 1 kΩ.' }; return Math.abs(m.u - s.E / 2) <= 0.02 * s.E / 2 ? { ok: true, msg: 'Réussi : U = ' + fN(m.u, 4) + ' V. La division par deux exige R₁ = R₂, quelle que soit leur valeur.' } : { ok: false, msg: 'U vaut ' + fN(m.u, 4) + ' V, pour ' + fN(s.E / 2, 4) + ' V attendus. Comparez R₁ et R₂.' }; } },
    { id: 'm2', title: 'Mettre en évidence l’effet de la charge',
      text: 'Branchez une charge qui fait chuter la tension de sortie d’au moins 20 % par rapport au montage à vide.',
      check: function (s) { var m = model(s); if (s.load !== 'on') return { ok: false, msg: 'Branchez d’abord la charge.' }; return m.loadDrop >= 20 ? { ok: true, msg: 'Réussi : la sortie chute de ' + fN(m.loadDrop) + ' %. La charge est en parallèle sur R₂ et réduit la résistance vue par le diviseur.' } : { ok: false, msg: 'Chute actuelle : ' + fN(m.loadDrop) + ' %. Diminuez la charge, ou augmentez R₂.' }; } },
    { id: 'm3', title: 'Un voltmètre qui fausse la mesure',
      text: 'Avec des instruments réels et sans charge, trouvez un réglage où l’erreur de mesure dépasse 5 %.',
      check: function (s) { var m = model(s); if (s.meters !== 'real' || s.load === 'on') return { ok: false, msg: 'Choisissez des instruments réels et retirez la charge.' }; return m.errPct > 5 ? { ok: true, msg: 'Réussi : erreur de ' + fN(m.errPct) + ' %. La résistance du voltmètre (' + ohm(s.Rv) + ') n’est plus négligeable devant celle du montage.' } : { ok: false, msg: 'Erreur actuelle : ' + fN(m.errPct) + ' %. Augmentez R₁ et R₂, ou diminuez la résistance du voltmètre.' }; } },
    { id: 'm4', title: 'Repérer une surcharge',
      text: 'Trouvez un réglage où R₁ dissipe plus que les 0,25 W d’une résistance courante, puis lisez l’alerte affichée.',
      check: function (s) { var m = model(s); return m.pR1 > P_MAX ? { ok: true, msg: 'Réussi : R₁ dissipe ' + watt(m.pR1) + '. Sur un vrai montage, ce composant chaufferait et pourrait griller : il faut une résistance de puissance supérieure.' } : { ok: false, msg: 'R₁ dissipe ' + watt(m.pR1) + '. Augmentez E ou diminuez les résistances.' }; } },
    { id: 'm5', title: 'Régler une constante de temps',
      text: 'Réglez le circuit RC pour obtenir une constante de temps de 1 s (à 5 % près).',
      check: function (s) { var t = C.tau(s.Rc, s.Cu * 1e-6); return Math.abs(t - 1) <= 0.05 ? { ok: true, msg: 'Réussi : τ = R·C = ' + fN(t, 4) + ' s.' } : { ok: false, msg: 'τ vaut ' + fN(t, 4) + ' s. Ajustez R ou C, sachant que τ = R·C.' }; } }
  ];

  function explain(param, b, s) {
    var m = model(s);
    if (param === 'Rc' || param === 'Cu') return '<p>τ = R·C = ' + ohm(s.Rc) + ' × ' + fN(s.Cu) + ' µF = <strong>' + fN(m.tau, 4) + ' s</strong>. Le condensateur atteint 63 % de ' + fN(s.E) + ' V en τ, et il est considéré comme chargé après 5τ, soit ' + fN(5 * m.tau) + ' s.</p>';
    if (param === 'load') return s.load === 'on' ? '<p>La charge de ' + ohm(s.RL) + ' se place en parallèle sur R₂, qui devient équivalente à ' + ohm(C.parallel([s.R2, s.RL])) + '. La sortie passe de ' + fN(m.noLoad, 4) + ' V à vide à <strong>' + fN(m.ideal, 4) + ' V</strong> (chute de ' + fN(m.loadDrop) + ' %).</p>' : '<p>Sans charge, la formule du diviseur s’applique directement : U = ' + fN(m.noLoad, 4) + ' V.</p>';
    if (param === 'meters' || param === 'Rv' || param === 'Ra') return s.meters === 'real' ? '<p>Les instruments font partie du circuit : le voltmètre (' + ohm(s.Rv) + ') est en parallèle sur la sortie, l’ampèremètre (' + ohm(s.Ra) + ') en série. Valeur lue : <strong>' + fN(m.u, 4) + ' V</strong> pour ' + fN(m.ideal, 4) + ' V sans instrument, soit une erreur de ' + fN(m.errPct, 2) + ' %.</p>' : '<p>Les instruments idéaux ne prélèvent rien : la valeur affichée est celle du circuit seul. Aucun appareil réel n’atteint ce cas limite.</p>';
    return '<p>Courant dans R₁ : ' + fN(s.E) + ' V répartis sur le montage donnent <strong>' + amp(m.i) + '</strong>. Tension de sortie : <strong>' + fN(m.u, 4) + ' V</strong>. R₁ dissipe ' + watt(m.pR1) + ', R₂ ' + watt(m.pR2) + '.</p>';
  }

  function sanitize(p) {
    var o = {};
    Object.keys(LIM).forEach(function (k) { if (isFinite(p[k]) && p[k] >= LIM[k][0] && p[k] <= LIM[k][1]) o[k] = Number(p[k]); });
    if (p.load === 'on' || p.load === 'off') o.load = p.load;
    if (p.meters === 'real' || p.meters === 'ideal') o.meters = p.meters;
    return o;
  }

  function mount(container) {
    var s = K.loadParams(ID, DEFAULTS, sanitize), tr = K.tracker(), save = K.paramSaver(ID);
    function r(key, label, unit, hint) { return K.range({ id: 'in-' + key, label: label, min: 0, max: 1000, step: 1, unit: unit, srLabel: label, hint: hint }); }
    container.innerHTML = [
      '<div class="lab">',
      K.head({ title: 'Laboratoire : circuits électriques', badge: 'Régime continu, composants linéaires, analyse nodale', text: 'Réglez un diviseur de tension, branchez une charge et comparez ce que mesurent des instruments idéaux et réels. Observez ensuite la charge d’un condensateur.' }),
      '<div class="lab__grid"><div class="lab__main">',
      '<div class="scope-panel"><div class="scope-panel__bar"><p class="scope-panel__expr" id="expr"></p><p class="verdict" id="verdict" aria-live="polite"></p></div><div id="schema"></div></div>',
      K.readouts([['Tension lue U', 'r-u'], ['Courant lu I', 'r-i'], ['Tension à vide', 'r-nl'], ['Erreur de mesure', 'r-err'], ['Puissance dans R₁', 'r-p1'], ['Puissance dans R₂', 'r-p2'], ['Fournie par la source', 'r-del'], ['Bilan fourni − absorbé', 'r-bal']]),
      '<div class="scope-panel"><div class="scope-panel__bar"><p class="scope-panel__expr" id="expr2"></p></div><div class="scope-panel__plot" id="rc-plot"></div></div>',
      K.explainBox(''),
      '</div><aside class="lab__controls" aria-label="Commandes de la simulation"><form class="controls" novalidate>',
      '<p class="controls__group">Diviseur de tension</p>',
      K.range({ id: 'in-E', label: 'Tension de la source <var>E</var>', min: 1, max: 30, step: 0.5, unit: 'V', srLabel: 'Tension en volts', hint: 'De 1 à 30 V.' }),
      r('R1', 'Résistance <var>R</var><sub>1</sub>', 'Ω', 'De 10 Ω à 100 kΩ (curseur logarithmique).'),
      r('R2', 'Résistance <var>R</var><sub>2</sub>', 'Ω', 'De 10 Ω à 100 kΩ.'),
      K.segmented({ id: 'in-load', label: 'Charge', options: [['off', 'Sans charge'], ['on', 'Branchée']] }),
      r('RL', 'Résistance de charge', 'Ω', 'De 10 Ω à 1 MΩ.'),
      '<p class="controls__group">Instruments</p>',
      K.segmented({ id: 'in-meters', label: 'Type d’instruments', options: [['ideal', 'Idéaux'], ['real', 'Réels']] }),
      r('Rv', 'Résistance interne du voltmètre', 'Ω', 'De 1 kΩ à 10 MΩ.'),
      r('Ra', 'Résistance interne de l’ampèremètre', 'Ω', 'De 0,1 à 100 Ω.'),
      '<p class="controls__group">Circuit RC</p>',
      r('Rc', 'Résistance <var>R</var>', 'Ω', 'De 100 Ω à 100 kΩ.'),
      r('Cu', 'Capacité <var>C</var>', 'µF', 'De 1 à 1 000 µF.'),
      '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + TCL.icon('reset') + 'Réinitialiser</button>',
      '</form></aside></div>',
      K.missionsSection(missions),
      K.limits('<p>Le modèle suppose un régime continu établi et des composants linéaires parfaits : source sans résistance interne, résistances constantes, fils sans résistance. Il ne tient pas compte de la tolérance des composants (souvent ±5 %), de l’échauffement ni du bruit. Le seuil de surcharge de 0,25 W correspond à une résistance courante : vérifiez toujours la fiche technique du composant réel. Le circuit RC suppose un condensateur idéal, sans fuite.</p>'),
      K.sequenceLinks(ID),
      '</div>'
    ].join('');
    var $ = function (sel) { return container.querySelector(sel); };

    var chart = TCL.plot.mount($('#rc-plot'), function (w) {
      var t = C.tau(s.Rc, s.Cu * 1e-6), tMax = 5 * t;
      return { kind: 'xy', ratio: w < 520 ? 0.6 : 0.34, title: 'Charge du condensateur', desc: 'Tension du condensateur de 0 à ' + fN(s.E) + ' volts en cinq constantes de temps.',
        x: { min: 0, max: tMax, label: 'temps (s)' }, y: { min: 0, max: s.E * 1.1, ticks: TCL.plot.niceTicks(0, s.E * 1.1, 5), label: 'tension (V)' },
        series: [{ samples: 200, fn: function (x) { return C.rcCharge(s.E, s.Rc, s.Cu * 1e-6, x); } }],
        hlines: [{ y: s.E * (1 - Math.exp(-1)), label: '63 %', anchor: 'start' }], points: [{ x: t, y: C.rcCharge(s.E, s.Rc, s.Cu * 1e-6, t), label: 'τ = ' + fN(t) + ' s' }] };
    });

    function refresh() {
      var m = model(s), over = m.pR1 > P_MAX || m.pR2 > P_MAX;
      $('#schema').innerHTML = schema(s, m);
      chart.update();
      $('#expr').innerHTML = 'Résolution par les lois de Kirchhoff : U = ' + fN(m.u, 4) + ' V';
      $('#expr2').innerHTML = 'u(t) = E(1 − e<sup>−t/τ</sup>) ; τ = R·C = ' + fN(m.tau, 4) + ' s';
      var ve = $('#verdict'); ve.className = 'verdict ' + (over ? 'verdict--ko' : 'verdict--ok'); ve.innerHTML = TCL.icon(over ? 'alert' : 'check') + '<span>' + (over ? 'Surcharge : plus de 0,25 W dans une résistance' : 'Puissances dans les limites') + '</span>';
      K.setText(container, '#r-u', fN(m.u, 4) + ' V');
      K.setText(container, '#r-i', amp(m.i));
      K.setText(container, '#r-nl', fN(m.noLoad, 4) + ' V');
      K.setText(container, '#r-err', s.meters === 'real' ? fN(m.errPct, 2) + ' %' : 'sans objet');
      K.setText(container, '#r-p1', watt(m.pR1));
      K.setText(container, '#r-p2', watt(m.pR2));
      K.setText(container, '#r-del', watt(m.sol.delivered));
      K.setText(container, '#r-bal', Math.abs(m.balance) < 1e-9 ? '0 (équilibré)' : fN(m.balance));
      [['E', fN(s.E) + ' V'], ['R1', ohm(s.R1)], ['R2', ohm(s.R2)], ['RL', ohm(s.RL)], ['Rv', ohm(s.Rv)], ['Ra', ohm(s.Ra)], ['Rc', ohm(s.Rc)], ['Cu', fN(s.Cu) + ' µF']].forEach(function (x) { K.setText(container, '#in-' + x[0] + '-out', x[1]); });
      ['load', 'meters'].forEach(function (k) { var el = container.querySelector('input[name="in-' + k + '"][value="' + s[k] + '"]'); if (el) el.checked = true; });
      Object.keys(pairs).forEach(function (k) { pairs[k].sync(s[k]); });
      $('#explain').innerHTML = tr.param() ? explain(tr.param(), tr.base(), s) : '<p>Modifiez un paramètre : l’explication s’adaptera aux valeurs affichées.</p>' + explain('E', s, s);
      save(s);
    }
    function set(k, v) { tr.before(k, s); s[k] = v; refresh(); }
    function logPair(key, unit, dec) {
      return K.bindPair(container, { id: 'in-' + key, toSlider: function (v) { return LOG[key].to(v); }, fromSlider: LOG[key].from,
        validate: K.numberValidator(LIM[key][0], LIM[key][1], unit, dec == null ? 1 : dec), onInput: function (v) { set(key, v); }, onEnd: function () { tr.end(); }, current: function () { return s[key]; } });
    }
    var pairs = { R1: logPair('R1', 'Ω'), R2: logPair('R2', 'Ω'), RL: logPair('RL', 'Ω'), Rv: logPair('Rv', 'Ω'), Ra: logPair('Ra', 'Ω', 2), Rc: logPair('Rc', 'Ω'), Cu: logPair('Cu', 'µF'),
      E: K.bindPair(container, { id: 'in-E', validate: K.numberValidator(1, 30, 'V', 1), onInput: function (v) { set('E', v); }, onEnd: function () { tr.end(); }, current: function () { return s.E; } }) };
    ['load', 'meters'].forEach(function (k) {
      U.qsa('input[name="in-' + k + '"]', container).forEach(function (el) { el.addEventListener('change', function () { tr.before(k, s); s[k] = el.value; refresh(); tr.end(); }); });
    });
    $('#lab-reset').addEventListener('click', function () { s = Object.assign({}, DEFAULTS); tr.reset(); Object.keys(pairs).forEach(function (k) { pairs[k].clear(); }); refresh(); U.toast('Paramètres réinitialisés.', 'info'); });
    K.bindMissions(container, ID, LABEL, missions, function () { return s; });
    refresh();
    return function () { chart.destroy(); };
  }

  function thumb() { var s = Object.assign({}, DEFAULTS, { meters: 'real', load: 'on' }); return { html: '<div class="thumb-fiber">' + schema(s, model(s)) + '</div>' }; }

  TCL.labs = TCL.labs || {};
  TCL.labs[ID] = { id: ID, title: 'Circuits : diviseur, instruments et RC', short: LABEL, icon: 'circuit', mount: mount, missions: missions, thumb: thumb,
    summary: 'Réglez un diviseur de tension, branchez une charge, comparez instruments idéaux et réels, détectez une surcharge, puis réglez la constante de temps d’un circuit RC.',
    explain: explain, DEFAULTS: DEFAULTS, model: model };
})(window);
