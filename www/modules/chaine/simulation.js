/*
 * TELECOM CONNECT LAB — Laboratoire « Chaîne de transmission »
 * -----------------------------------------------------------
 * Un message texte parcourt toutes les étapes d'une transmission numérique.
 * Chaque étape est affichée avec les vraies données du message : bits,
 * signal émis, signal bruité reçu, décisions, erreurs, message restitué.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, C = TCL.chainMath, U = TCL.util, K = TCL.labkit, esc = U.esc;
  var ID = 'chaine', LABEL = 'Chaîne de transmission';

  var LIM = { pt: [0, 30], att: [60, 130], noise: [-110, -80] };
  var DEFAULTS = { text: 'TELECOM', coding: 'none', pt: 10, att: 110, noise: -106, seed: 1, stage: 1 };
  var SHOW = 24; // nombre de bits transmis affichés dans les graphiques
  var MEASURE_N = 20000;

  var STAGES = [
    { n: 1, short: 'Source', title: 'La source : le message à transmettre', icon: 'user' },
    { n: 2, short: 'Codage de source', title: 'Codage de source : du texte aux bits', icon: 'chain' },
    { n: 3, short: 'Codage de canal', title: 'Codage de canal : ajouter de la redondance', icon: 'shield' },
    { n: 4, short: 'Modulation', title: 'Modulation : des bits au signal électrique', icon: 'modulation' },
    { n: 5, short: 'Canal', title: 'Le canal : atténuation et bruit', icon: 'propagation' },
    { n: 6, short: 'Décision', title: 'Réception : filtrage et décision', icon: 'target' },
    { n: 7, short: 'Restitution', title: 'Décodage et restitution du message', icon: 'check' }
  ];

  function fN(v, s) { return M.formatNumber(v, s); }
  function sci(x) {
    if (x === 0) return '0';
    if (x >= 1e-3) return fN(x, 3);
    var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (Number(m.toPrecision(3)) >= 10) { m /= 10; e += 1; }
    return fN(m, 3) + ' × 10' + String(e).split('').map(function (c) { return { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c]; }).join('');
  }

  var cache = { key: null, value: null };
  function run(s) {
    var key = JSON.stringify([s.text, s.coding, s.pt, s.att, s.noise, s.seed]);
    if (cache.key === key) return cache.value;
    var t = C.transmit({ text: s.text, coding: s.coding, pt: s.pt, att: s.att, noise: s.noise, seed: s.seed, samplesPerBit: 16 });
    t.measured = C.measureBer(t.snrDb, s.coding, MEASURE_N, 1000 + s.seed);
    cache = { key: key, value: t };
    return t;
  }

  var missions = [
    {
      id: 'm1', title: 'TEB ≤ 10⁻³ avec le moins de puissance possible',
      text: 'Sans codage de canal, réglez la puissance d’émission pour obtenir un taux d’erreur binaire théorique d’au plus 10⁻³, avec un rapport signal sur bruit d’au plus 7,3 dB (pas de puissance gaspillée).',
      check: function (s) {
        if (s.coding !== 'none') return { ok: false, msg: 'Désactivez d’abord le codage de canal.' };
        var t = run(s);
        if (t.berTheory <= 1e-3 && t.snrDb <= 7.3) return { ok: true, msg: 'Réussi : SNR = ' + fN(t.snrDb, 3) + ' dB, TEB théorique = ' + sci(t.berTheory) + '. Le minimum exact est 6,79 dB.' };
        if (t.berTheory > 1e-3) return { ok: false, msg: 'TEB théorique actuel : ' + sci(t.berTheory) + ' (SNR = ' + fN(t.snrDb, 3) + ' dB). Augmentez la puissance émise ou réduisez l’atténuation.' };
        return { ok: false, msg: 'Le TEB est bien sous 10⁻³, mais le SNR (' + fN(t.snrDb, 3) + ' dB) est plus élevé que nécessaire : réduisez la puissance émise.' };
      }
    },
    {
      id: 'm2', title: 'Le codage corrige des erreurs',
      text: 'Activez le code à répétition. Obtenez une transmission où au moins un bit est faux à la réception, mais où toutes les erreurs sont corrigées par le décodeur (message restitué intact).',
      check: function (s) {
        if (s.coding !== 'rep3') return { ok: false, msg: 'Activez le code à répétition (×3).' };
        var t = run(s);
        if (t.rawErrors >= 1 && t.infoErrors === 0) return { ok: true, msg: 'Réussi : ' + t.rawErrors + ' bit(s) faux à la réception, tous corrigés par le vote majoritaire. Message restitué : « ' + t.text + ' ».' };
        if (t.rawErrors === 0) return { ok: false, msg: 'Aucun bit faux à la réception : le bruit est trop faible pour voir la correction. Baissez le SNR (vers 2 à 4 dB), ou faites un « Nouveau tirage du bruit ».' };
        return { ok: false, msg: t.infoErrors + ' erreur(s) restent après décodage (deux bits faux dans un même groupe de trois). Augmentez un peu le SNR ou faites un « Nouveau tirage du bruit ».' };
      }
    },
    {
      id: 'm3', title: 'Une liaison très atténuée',
      text: 'Avec une atténuation du canal d’au moins 118 dB et sans codage, ajustez la puissance d’émission pour obtenir un TEB théorique d’au plus 10⁻⁵.',
      check: function (s) {
        if (s.att < 118) return { ok: false, msg: 'Réglez l’atténuation du canal à 118 dB ou plus.' };
        if (s.coding !== 'none') return { ok: false, msg: 'Désactivez le codage de canal.' };
        var t = run(s);
        if (t.berTheory <= 1e-5) return { ok: true, msg: 'Réussi : Pr = Pt − A = ' + fN(t.pr, 4) + ' dBm, SNR = ' + fN(t.snrDb, 3) + ' dB, TEB théorique = ' + sci(t.berTheory) + '. Il faut au moins 9,59 dB de SNR.' };
        return { ok: false, msg: 'TEB théorique : ' + sci(t.berTheory) + ' (SNR = ' + fN(t.snrDb, 3) + ' dB). Il faut un SNR d’au moins 9,59 dB : SNR = Pt − A − N.' };
      }
    }
  ];

  /* ------------------------------- Explications ------------------------------- */

  function explain(param, b, s) {
    var t0 = run(b), t1 = run(s);
    var errs = '<p>Erreurs : ' + t1.rawErrors + ' bit(s) faux sur ' + t1.coded.length + ' transmis' + (s.coding === 'rep3' ? ', ' + t1.infoErrors + ' après décodage' : '') + ' ; message restitué « ' + esc(t1.text) + ' »' + (t1.charErrors ? ' (' + t1.charErrors + ' caractère(s) faux)' : ' (intact)') + '.</p>';
    if (param === 'pt' || param === 'att' || param === 'noise') {
      if (b[param] === s[param]) return null;
      var what = { pt: 'La puissance d’émission passe de ' + fN(b.pt) + ' à <strong>' + fN(s.pt) + ' dBm</strong>', att: 'L’atténuation du canal passe de ' + fN(b.att) + ' à <strong>' + fN(s.att) + ' dB</strong>', noise: 'La puissance de bruit au récepteur passe de ' + fN(b.noise) + ' à <strong>' + fN(s.noise) + ' dBm</strong>' }[param];
      return '<p>' + what + '. Puissance reçue : Pr = Pt − A = ' + fN(t1.pr, 4) + ' dBm. Rapport signal sur bruit : SNR = Pr − N = ' + fN(t0.snrDb, 3) + ' → <strong>' + fN(t1.snrDb, 3) + ' dB</strong>.</p>' +
        '<p>Le TEB théorique passe de ' + sci(t0.berTheory) + ' à <strong>' + sci(t1.berTheory) + '</strong>' + (t1.snrDb > t0.snrDb ? ' : avec un signal plus fort face au bruit, les décisions se trompent moins souvent.' : ' : le bruit pèse davantage face au signal, les erreurs deviennent plus fréquentes.') + '</p>' + errs;
    }
    if (param === 'coding') {
      if (b.coding === s.coding) return null;
      return s.coding === 'rep3'
        ? '<p><strong>Code à répétition</strong> : chaque bit est émis trois fois. Le récepteur décide à la majorité : une erreur isolée dans un groupe de trois est corrigée. À SNR égal par bit transmis, le TEB passe de ' + sci(C.berUncoded(t1.snrDb)) + ' à <strong>' + sci(t1.berTheory) + '</strong>.</p><p>Le prix à payer : trois fois plus de bits à transmettre (' + t1.coded.length + ' au lieu de ' + t1.infoBits.length + '), donc un débit utile divisé par 3 (rendement du code 1/3).</p>' + errs
        : '<p><strong>Sans codage de canal</strong> : chaque bit est émis une seule fois ; toute erreur de décision se retrouve dans le message. TEB théorique : ' + sci(t1.berTheory) + '.</p>' + errs;
    }
    if (param === 'text') {
      if (b.text === s.text) return null;
      return '<p>Nouveau message : « ' + esc(s.text) + ' » (' + s.text.length + ' caractère' + (s.text.length > 1 ? 's' : '') + ', soit ' + t1.infoBits.length + ' bits en ASCII).</p>' + errs;
    }
    if (param === 'seed') return '<p>Nouveau tirage du bruit : le bruit est aléatoire, donc les erreurs ne tombent pas toujours sur les mêmes bits, ni en même nombre. Seul le TEB moyen (théorique ou mesuré sur ' + fN(MEASURE_N) + ' bits) reste stable.</p>' + errs;
    return null;
  }

  function intro(s) {
    var t = run(s);
    return '<p>Parcourez les 7 étapes (boutons de la chaîne ci-dessus), puis modifiez un paramètre : l’explication s’adaptera.</p><p>Réglage actuel : le message « ' + esc(s.text) + ' » devient ' + t.infoBits.length + ' bits' + (s.coding === 'rep3' ? ', puis ' + t.coded.length + ' bits après codage' : '') + '. Le récepteur reçoit ' + fN(t.pr, 4) + ' dBm pour un bruit de ' + fN(s.noise) + ' dBm : SNR = ' + fN(t.snrDb, 3) + ' dB, TEB théorique ' + sci(t.berTheory) + '.</p>';
  }

  /* ------------------------------- Rendus des étapes ------------------------------- */

  function bitRow(bits, ref, group, max) {
    var out = '', n = Math.min(bits.length, max || bits.length);
    for (var i = 0; i < n; i++) {
      var err = ref && ref[i] !== bits[i];
      out += '<span class="bit' + (bits[i] === '1' ? ' bit--1' : '') + (err ? ' bit--err' : '') + '"' + (err ? ' title="bit faux"' : '') + '>' + bits[i] + '</span>';
      if (group && (i + 1) % group === 0 && i + 1 < n) out += '<span class="bit-gap" aria-hidden="true"></span>';
    }
    if (n < bits.length) out += '<span class="bit-more">… (' + (bits.length - n) + ' de plus)</span>';
    return '<div class="bits" aria-label="' + esc(bits.slice(0, n)) + '">' + out + '</div>';
  }

  function charBoxes(text, ref) {
    return '<div class="chars">' + text.split('').map(function (ch, i) {
      var err = ref && ref[i] !== ch;
      return '<span class="char' + (err ? ' char--err' : '') + '"><strong>' + esc(ch === ' ' ? '␣' : ch) + '</strong><small>' + ch.charCodeAt(0) + '</small></span>';
    }).join('') + '</div>';
  }

  function stageHtml(s, t) {
    var st = STAGES[s.stage - 1], n = Math.min(SHOW, t.coded.length);
    var head = '<div class="stage__head"><span class="stage__num">' + st.n + '</span><h2 id="stage-title" tabindex="-1">' + esc(st.title) + '</h2></div>';
    var body;
    switch (s.stage) {
      case 1:
        body = '<p>La source produit l’information à transmettre. Ici, c’est un texte : « <strong>' + esc(s.text) + '</strong> ». Ce pourrait être une voix (signal analogique), une image ou un fichier.</p>' + charBoxes(s.text) +
          '<p class="muted">Sous chaque caractère : son numéro dans la table ASCII.</p>';
        break;
      case 2:
        body = '<p>Le codage de source représente l’information par des bits. Chaque caractère devient son code ASCII sur 8 bits : ' + s.text.length + ' caractères → <strong>' + t.infoBits.length + ' bits</strong>. (Pour un son ou une image, cette étape comporte un échantillonnage, une quantification et souvent une compression.)</p>' +
          '<div class="table-wrap"><table class="data-table data-table--compact"><caption class="sr-only">Code ASCII de chaque caractère</caption><thead><tr><th scope="col">Caractère</th><th scope="col">Code décimal</th><th scope="col">8 bits</th></tr></thead><tbody>' +
          s.text.split('').map(function (ch, i) { return '<tr><td>' + esc(ch === ' ' ? '␣ (espace)' : ch) + '</td><td>' + ch.charCodeAt(0) + '</td><td class="mono">' + t.infoBits.slice(i * 8, i * 8 + 8) + '</td></tr>'; }).join('') + '</tbody></table></div>';
        break;
      case 3:
        body = s.coding === 'rep3'
          ? '<p>Le codage de canal ajoute de la <strong>redondance</strong> pour que le récepteur puisse corriger des erreurs. Avec le code à répétition, chaque bit est émis trois fois : ' + t.infoBits.length + ' bits → <strong>' + t.coded.length + ' bits transmis</strong> (rendement 1/3).</p><h3>Bits d’information</h3>' + bitRow(t.infoBits, null, 8, 48) + '<h3>Bits transmis (groupes de trois)</h3>' + bitRow(t.coded, null, 3, 72)
          : '<p>Aucun codage de canal n’est appliqué : les ' + t.infoBits.length + ' bits sont transmis tels quels (rendement 1). Une erreur de transmission ne pourra pas être corrigée. Activez le code à répétition pour voir la différence.</p><h3>Bits transmis</h3>' + bitRow(t.coded, null, 8, 72);
        break;
      case 4:
        body = '<p>Le modulateur transforme chaque bit en un signal : <strong>+A pour « 1 », −A pour « 0 »</strong> (code NRZ bipolaire, équivalent en bande de base de la modulation PSK binaire). Le graphique montre les ' + n + ' premiers bits transmis.</p><div class="figure-plot" id="stage-plot"></div>';
        break;
      case 5:
        body = '<p>Dans le canal, le signal est atténué de ' + fN(s.att) + ' dB (il arrive à ' + fN(t.pr, 4) + ' dBm) et s’ajoute au <strong>bruit</strong> du récepteur (' + fN(s.noise) + ' dBm). Le récepteur amplifie ce mélange : le signal retrouve son amplitude, le bruit aussi. SNR = <strong>' + fN(t.snrDb, 3) + ' dB</strong>.</p><div class="figure-plot" id="stage-plot"></div><p class="muted">Points : signal reçu échantillonné (16 échantillons par bit). Pointillés : signal émis.</p>';
        break;
      case 6:
        body = '<p>Pour chaque bit, le récepteur fait la <strong>moyenne</strong> des échantillons (filtre adapté) : le bruit se moyenne et diminue, le signal reste. Il compare le résultat au <strong>seuil 0</strong> : au-dessus, il décide « 1 » ; en dessous, « 0 ». Barres orange : décisions fausses.</p><div class="figure-plot" id="stage-plot"></div>' +
          '<h3>Bits émis</h3>' + bitRow(t.coded, null, s.coding === 'rep3' ? 3 : 8, 72) + '<h3>Bits décidés (' + t.rawErrors + ' faux sur ' + t.coded.length + ')</h3>' + bitRow(t.decided, t.coded, s.coding === 'rep3' ? 3 : 8, 72);
        break;
      default:
        body = (s.coding === 'rep3'
          ? '<p>Le décodeur regroupe les bits par trois et garde la <strong>majorité</strong> : ' + t.rawErrors + ' bit(s) faux reçus, <strong>' + t.infoErrors + ' erreur(s) après décodage</strong>.</p>'
          : '<p>Sans codage de canal, les bits décidés sont directement les bits du message : <strong>' + t.infoErrors + ' erreur(s)</strong>.</p>') +
          '<h3>Bits d’information retrouvés</h3>' + bitRow(t.decoded, t.infoBits, 8, 96) +
          '<p>Le décodage de source regroupe les bits par 8 et retrouve les caractères.</p><div class="compare"><div><h3>Message émis</h3>' + charBoxes(s.text) + '</div><div><h3>Message restitué</h3>' + charBoxes(t.text, s.text) + '</div></div>' +
          '<p class="verdict-line ' + (t.charErrors ? 'is-ko' : 'is-ok') + '">' + TCL.icon(t.charErrors ? 'x' : 'check') + '<span>' + (t.charErrors ? t.charErrors + ' caractère(s) faux : une seule erreur de bit suffit à changer un caractère.' : 'Message restitué sans erreur.') + '</span></p>';
    }
    return head + body;
  }

  function stagePlot(s, t) {
    var n = Math.min(SHOW, t.coded.length), Ns = t.samplesPerBit;
    var lvl = function (x) { var i = Math.min(n - 1, Math.floor(x)); return t.coded[i] === '1' ? 1 : -1; };
    var labels = [];
    for (var i = 0; i < n; i++) labels.push({ x: i + 0.5, y: 1.55, label: t.coded[i] });
    var base = { kind: 'xy', x: { min: 0, max: n, ticks: TCL.plot.niceTicks(0, n, 6), label: 'temps (en durées de bit)' } };
    if (s.stage === 4) return Object.assign(base, { title: 'Signal émis', desc: 'Signal NRZ bipolaire des ' + n + ' premiers bits : +1 pour un 1, −1 pour un 0.', y: { min: -2, max: 2, ticks: [-1, 0, 1], label: 'signal (A)' }, series: [{ samples: n * 40, fn: lvl }], barLabels: labels });
    if (s.stage === 5) {
      var pts = [];
      t.samples.slice(0, n).forEach(function (row, i) { row.forEach(function (r, k) { pts.push({ x: i + (k + 0.5) / Ns, y: r, cls: 'scope__sample' }); }); });
      var ym = Math.min(6, Math.max(2, Math.ceil(t.sigma * Math.sqrt(Ns) * 2.6 + 1)));
      return Object.assign(base, { title: 'Signal reçu bruité', desc: 'Échantillons du signal reçu, dispersés autour de +1 ou −1 ; écart type du bruit par échantillon ' + fN(t.sigma * Math.sqrt(Ns), 3) + '.', y: { min: -ym, max: ym, ticks: TCL.plot.niceTicks(-ym, ym, 6), label: 'signal reçu' },
        series: [{ samples: n * 40, cls: 'scope__trace scope__trace--ref', fn: lvl }], dots: pts });
    }
    var bars = t.stats.slice(0, n).map(function (z, i) { var bad = t.decided[i] !== t.coded[i]; return { x: i + 0.5, y: Math.max(-2.4, Math.min(2.4, z)), base: 0, cls: bad ? 'scope__bar scope__bar--alt' : 'scope__bar' }; });
    return Object.assign(base, { title: 'Valeurs moyennes et décision', desc: 'Moyenne du signal reçu pour chaque bit, comparée au seuil 0 ; ' + t.decided.slice(0, n).split('').filter(function (b, i) { return b !== t.coded[i]; }).length + ' décision(s) fausse(s) parmi les ' + n + ' premiers bits.',
      y: { min: -2.5, max: 2.5, ticks: [-2, -1, 0, 1, 2], label: 'moyenne' }, bars: bars, hlines: [{ y: 0, cls: 'scope__limit', label: 'seuil 0', anchor: 'start' }],
      barLabels: t.decided.slice(0, n).split('').map(function (b, i) { return { x: i + 0.5, y: 2.2, label: b }; }) });
  }

  function berOptions(s, t) {
    return { kind: 'xy', title: 'Taux d’erreur binaire en fonction du SNR', desc: 'Courbes théoriques sans codage et avec répétition ; point actuel à ' + fN(t.snrDb, 3) + ' dB.',
      x: { min: -2, max: 14, ticks: [-2, 0, 2, 4, 6, 8, 10, 12, 14], label: 'SNR (dB)' }, y: { min: 1e-7, max: 1, log: true, ticks: [1, 1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7], format: function (v) { return v === 1 ? '1' : '10' + String(Math.round(Math.log10(v))).replace('-', '⁻').replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]; }); }, label: 'TEB' },
      series: [{ samples: 200, cls: s.coding === 'rep3' ? 'scope__trace scope__trace--ref' : 'scope__trace', fn: function (x) { return C.berUncoded(x); } },
               { samples: 200, cls: s.coding === 'rep3' ? 'scope__trace' : 'scope__trace scope__trace--alt', fn: function (x) { return C.berRepetition(x); } }],
      points: [{ x: Math.max(-2, Math.min(14, t.snrDb)), y: Math.max(1e-7, t.berTheory), label: 'théorie ' + sci(t.berTheory) }]
        .concat(t.measured.errors > 0 ? [{ x: Math.max(-2, Math.min(14, t.snrDb)), y: t.measured.ber, cls: 'scope__point scope__point--alt' }] : []) };
  }

  /* ------------------------------------ Page ------------------------------------ */

  function sanitize(p) {
    var o = {};
    Object.keys(LIM).forEach(function (k) { if (isFinite(p[k]) && p[k] >= LIM[k][0] && p[k] <= LIM[k][1]) o[k] = Number(p[k]); });
    if (typeof p.text === 'string' && p.text.length >= 1 && p.text.length <= 12 && C.isAsciiPrintable(p.text)) o.text = p.text;
    if (p.coding === 'none' || p.coding === 'rep3') o.coding = p.coding;
    if (isFinite(p.seed) && p.seed >= 1) o.seed = Math.floor(p.seed);
    if (isFinite(p.stage) && p.stage >= 1 && p.stage <= 7) o.stage = Math.floor(p.stage);
    return o;
  }

  function mount(container) {
    var s = K.loadParams(ID, DEFAULTS, sanitize);
    var tr = K.tracker(), save = K.paramSaver(ID);
    var stageChart = null;

    container.innerHTML = [
      '<div class="lab">',
      K.head({ title: 'Laboratoire : chaîne de transmission', badge: 'Simulation pédagogique d’une transmission numérique (bruit gaussien)', text: 'Suivez un message de la source jusqu’au destinataire. Réglez la puissance, l’atténuation, le bruit et le codage, puis observez à chaque étape les bits, les signaux et les erreurs.' }),
      '<nav class="chain" aria-label="Étapes de la chaîne de transmission"><ol>' + STAGES.map(function (st) {
        return '<li><button type="button" class="chain__step" data-stage="' + st.n + '"><span class="chain__icon">' + TCL.icon(st.icon) + '</span><span class="chain__num">' + st.n + '</span><span class="chain__label">' + esc(st.short) + '</span></button></li>';
      }).join('') + '</ol></nav>',
      '<div class="lab__grid"><div class="lab__main">',
      '<section class="stage box" id="stage" aria-live="polite"></section>',
      '<div class="stage-pager"><button type="button" class="btn btn--ghost btn--sm" id="st-prev">' + TCL.icon('arrowLeft') + 'Étape précédente</button><button type="button" class="btn btn--primary btn--sm" id="st-next">Étape suivante' + TCL.icon('arrowRight') + '</button></div>',
      K.readouts([['Puissance reçue Pr = Pt − A', 'r-pr'], ['SNR = Pr − N', 'r-snr'], ['Bits d’information', 'r-nb'], ['Bits transmis', 'r-nt'], ['Rendement du code', 'r-rate'],
        ['Bits faux à la réception', 'r-raw'], ['Erreurs après décodage', 'r-err'], ['TEB théorique', 'r-bth'], ['TEB mesuré (' + fN(MEASURE_N) + ' bits)', 'r-bme'], ['Caractères faux', 'r-ce']]),
      '<div class="scope-panel"><p class="scope-panel__title">Taux d’erreur binaire (TEB) en fonction du rapport signal sur bruit</p><div class="scope-panel__plot" id="ber-plot"></div><p class="scope-panel__cursor" id="ber-note"></p></div>',
      K.explainBox(''),
      '</div>',
      '<aside class="lab__controls" aria-label="Commandes de la simulation"><form class="controls" onsubmit="return false" novalidate>',
      '<div class="control"><label for="in-text">Message à transmettre</label><input type="text" id="in-text" class="text-input" maxlength="12" autocomplete="off" spellcheck="false" aria-describedby="in-text-hint in-text-err"><p class="control__hint" id="in-text-hint">De 1 à 12 caractères (lettres sans accent, chiffres, ponctuation).</p><p class="field-error" id="in-text-err" aria-live="polite"></p></div>',
      K.segmented({ id: 'in-coding', label: 'Codage de canal', options: [['none', 'Aucun'], ['rep3', 'Répétition ×3']] }),
      K.range({ id: 'in-pt', label: 'Puissance d’émission <var>P</var><sub>t</sub>', min: 0, max: 30, step: 0.5, unit: 'dBm', srLabel: 'Puissance d’émission en dBm', hint: 'De 0 à 30 dBm (1 mW à 1 W).' }),
      K.range({ id: 'in-att', label: 'Atténuation du canal <var>A</var>', min: 60, max: 130, step: 0.5, unit: 'dB', srLabel: 'Atténuation en dB', hint: 'De 60 à 130 dB (distance, obstacles : voir le module Propagation).' }),
      K.range({ id: 'in-noise', label: 'Bruit au récepteur <var>N</var>', min: -110, max: -80, step: 0.5, unit: 'dBm', srLabel: 'Puissance de bruit en dBm', hint: 'De −110 à −80 dBm (bruit thermique et électronique).' }),
      '<button type="button" class="btn btn--ghost btn--block" id="reseed">' + TCL.icon('reset') + 'Nouveau tirage du bruit</button>',
      '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + TCL.icon('reset') + 'Réinitialiser</button>',
      '</form></aside></div>',
      K.missionsSection(missions),
      K.limits('<p>Le canal est modélisé par une atténuation fixe et un bruit blanc gaussien : pas d’évanouissements, d’interférences ni de trajets multiples. Le récepteur est supposé parfaitement synchronisé. Le code à répétition est le plus simple des codes correcteurs ; les systèmes réels (4G, 5G, Wi-Fi) utilisent des codes bien plus efficaces (turbo-codes, LDPC, codes polaires). Ici, le SNR est compté par bit transmis : à énergie égale par bit d’<em>information</em>, la répétition simple n’apporte en réalité aucun gain, car chaque bit transmis reçoit alors trois fois moins d’énergie.</p>'),
      K.sequenceLinks(ID),
      '</div>'
    ].join('');
    var $ = function (sel) { return container.querySelector(sel); };

    var berChart = TCL.plot.mount($('#ber-plot'), function (w) { return Object.assign(berOptions(s, run(s)), { ratio: w < 520 ? 0.7 : 0.42 }); });

    function drawStage(focus) {
      var t = run(s);
      if (stageChart) { stageChart.destroy(); stageChart = null; }
      $('#stage').innerHTML = stageHtml(s, t);
      var plotEl = $('#stage-plot');
      if (plotEl) stageChart = TCL.plot.mount(plotEl, function (w) { return Object.assign(stagePlot(s, run(s)), { ratio: w < 520 ? 0.62 : 0.36 }); });
      U.qsa('.chain__step', container).forEach(function (b) {
        var on = Number(b.getAttribute('data-stage')) === s.stage;
        b.classList.toggle('is-current', on);
        if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      $('#st-prev').disabled = s.stage === 1; $('#st-next').disabled = s.stage === 7;
      if (focus) { var h = $('#stage-title'); if (h) h.focus({ preventScroll: true }); }
    }

    function refresh() {
      var t = run(s);
      drawStage(false);
      berChart.update();
      K.setText(container, '#r-pr', fN(t.pr, 4) + ' dBm');
      K.setText(container, '#r-snr', fN(t.snrDb, 3) + ' dB');
      K.setText(container, '#r-nb', String(t.infoBits.length));
      K.setText(container, '#r-nt', String(t.coded.length));
      K.setText(container, '#r-rate', s.coding === 'rep3' ? '1/3' : '1');
      K.setText(container, '#r-raw', String(t.rawErrors));
      K.setText(container, '#r-err', String(t.infoErrors));
      K.setText(container, '#r-bth', sci(t.berTheory));
      K.setText(container, '#r-bme', t.measured.errors === 0 ? '0 erreur (TEB < ' + sci(1 / MEASURE_N) + ')' : sci(t.measured.ber) + ' (' + t.measured.errors + ' erreurs)');
      K.setText(container, '#r-ce', t.charErrors + ' / ' + s.text.length);
      $('#ber-note').textContent = (s.coding === 'rep3' ? 'Trait plein : avec répétition ×3. Pointillés : sans codage.' : 'Trait plein : sans codage. Tirets : avec répétition ×3.') + ' Point blanc : TEB théorique au réglage actuel' + (t.measured.errors ? ' ; point orange : TEB mesuré par simulation.' : '.');
      U.qsa('input[name=in-coding]', container).forEach(function (r) { r.checked = r.value === s.coding; });
      if (document.activeElement !== $('#in-text')) $('#in-text').value = s.text;
      K.setText(container, '#in-pt-out', fN(s.pt) + ' dBm');
      K.setText(container, '#in-att-out', fN(s.att) + ' dB');
      K.setText(container, '#in-noise-out', fN(s.noise) + ' dBm');
      pairs.pt.sync(s.pt); pairs.att.sync(s.att); pairs.noise.sync(s.noise);
      var html = tr.param() ? explain(tr.param(), tr.base(), s) : null;
      $('#explain').innerHTML = html || intro(s);
      save(s);
    }

    function set(name, value, single) { tr.before(name, s); s[name] = value; refresh(); if (single) tr.end(); }
    function pair(key, unit) {
      return K.bindPair(container, { id: 'in-' + key, validate: K.numberValidator(LIM[key][0], LIM[key][1], unit, 1), onInput: function (v) { set(key, v); }, onEnd: function () { tr.end(); }, current: function () { return s[key]; } });
    }
    var pairs = { pt: pair('pt', 'dBm'), att: pair('att', 'dB'), noise: pair('noise', 'dBm') };
    U.qsa('input[name=in-coding]', container).forEach(function (r) { r.addEventListener('change', function () { if (r.checked) set('coding', r.value, true); }); });
    $('#in-text').addEventListener('input', function (e) {
      var v = e.target.value, err = $('#in-text-err');
      if (!v.length) { err.textContent = 'Saisissez au moins un caractère.'; e.target.setAttribute('aria-invalid', 'true'); return; }
      if (!C.isAsciiPrintable(v)) { err.textContent = 'Caractère non pris en charge : utilisez des lettres sans accent, des chiffres ou de la ponctuation simple.'; e.target.setAttribute('aria-invalid', 'true'); return; }
      err.textContent = ''; e.target.removeAttribute('aria-invalid'); set('text', v, false);
    });
    $('#in-text').addEventListener('change', function () { tr.end(); });
    $('#reseed').addEventListener('click', function () { set('seed', s.seed + 1, true); U.toast('Nouveau tirage du bruit (n° ' + s.seed + ').', 'info'); });
    U.qsa('.chain__step', container).forEach(function (b) { b.addEventListener('click', function () { s.stage = Number(b.getAttribute('data-stage')); drawStage(true); save(s); }); });
    $('#st-prev').addEventListener('click', function () { if (s.stage > 1) { s.stage--; drawStage(true); save(s); } });
    $('#st-next').addEventListener('click', function () { if (s.stage < 7) { s.stage++; drawStage(true); save(s); } });
    $('#lab-reset').addEventListener('click', function () {
      s = Object.assign({}, DEFAULTS); tr.reset(); Object.keys(pairs).forEach(function (k) { pairs[k].clear(); }); $('#in-text-err').textContent = ''; refresh();
      U.toast('Paramètres réinitialisés : « TELECOM », sans codage, 10 dBm, 110 dB, −106 dBm.', 'info');
    });

    K.bindMissions(container, ID, LABEL, missions, function () { return s; });
    refresh();
    return function () { if (stageChart) stageChart.destroy(); berChart.destroy(); };
  }

  function thumb() {
    var t = C.transmit({ text: 'TC', coding: 'none', pt: 10, att: 110, noise: -103, seed: 4, samplesPerBit: 16 }), pts = [];
    t.samples.slice(0, 16).forEach(function (row, i) { row.forEach(function (r, k) { pts.push({ x: i + (k + 0.5) / 16, y: r, cls: 'scope__sample' }); }); });
    return { kind: 'xy', ratio: 0.55, title: 'Aperçu : signal reçu bruité', x: { min: 0, max: 16, ticks: [0, 4, 8, 12, 16], label: 'bits' }, y: { min: -3, max: 3, ticks: [-2, 0, 2], label: 'signal' },
      series: [{ samples: 640, cls: 'scope__trace scope__trace--ref', fn: function (x) { return t.coded[Math.min(15, Math.floor(x))] === '1' ? 1 : -1; } }], dots: pts };
  }

  TCL.labs = TCL.labs || {};
  TCL.labs[ID] = {
    id: ID, title: 'Chaîne de transmission numérique', short: LABEL, icon: 'chain', mount: mount, missions: missions, thumb: thumb,
    summary: 'Suivez un message en 7 étapes : codage ASCII, codage de canal, modulation, canal bruité, décision, décodage. Mesurez le taux d’erreur et l’effet du codage.',
    explain: explain, run: run, DEFAULTS: DEFAULTS, STAGES: STAGES
  };
})(window);
