/*
 * TELECOM CONNECT LAB — Laboratoire « Antennes et diagrammes de rayonnement »
 * -------------------------------------------------------------------------
 * Dipôle court, dipôle demi-onde, ou réseau linéaire de N dipôles demi-onde
 * verticaux alimentés avec la même amplitude. Les diagrammes polaires, la
 * directivité, le gain et les largeurs de faisceau sont CALCULÉS à partir du
 * modèle (antenna-math.js), pas dessinés à la main.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, A = TCL.antennaMath, U = TCL.util, K = TCL.labkit, esc = U.esc;
  var ID = 'antennes', LABEL = 'Antennes';
  var D2R = Math.PI / 180;

  var LIM = { N: [1, 8], d: [0.1, 1.5], beta: [-180, 180], eta: [50, 100], f: [100e6, 6e9], pol: [0, 90] };
  var DEFAULTS = { type: 'half', N: 1, d: 0.5, beta: 0, eta: 100, f: 900e6, pol: 0, scale: 'db' };
  var logF = K.logSlider(LIM.f[0], LIM.f[1]);
  var TYPES = [['short', 'Dipôle court (longueur ≪ λ)'], ['half', 'Dipôle demi-onde (λ/2)']];

  function fN(v, s) { return M.formatNumber(v, s); }
  function cfgOf(s) { return { type: s.type, N: s.N, d: s.d, beta: s.beta * D2R }; }

  /** Toutes les grandeurs calculées pour un réglage. */
  function analyse(s) {
    var cfg = cfgOf(s);
    var D = A.directivity(cfg);
    var G = D * s.eta / 100;
    var main = A.mainDirection(cfg);
    var H = A.cut(cfg, 'H', 0, 0.5);
    var V = A.cut(cfg, 'V', main == null ? 90 : main, 0.5);
    var Hfine = A.cut(cfg, 'H', 0, 0.1), Vfine = A.cut(cfg, 'V', main == null ? 90 : main, 0.1);
    var lam = A.wavelength(s.f);
    return {
      cfg: cfg, D: D, Ddb: A.toDb(D), G: G, Gdb: A.toDb(G), main: main,
      grating: A.gratingLobes(cfg), H: H, V: V,
      hpbwH: A.beamwidth(Hfine, main == null ? null : main),
      hpbwV: A.beamwidth(Vfine, 0),
      sll: s.N > 1 ? A.sideLobeLevel(Hfine) : null,
      lam: lam, Ae: A.effectiveArea(G, s.f), pol: A.polarizationLoss(s.pol)
    };
  }

  /* ---------------------------- Diagramme polaire (SVG) ---------------------------- */

  /**
   * points : [{ deg, n }] (n : champ normalisé). Angle mathématique (0° à droite, sens trigonométrique).
   * o : { scale: 'db'|'lin', ref: points de comparaison, plane: 'H'|'V', N, d, main, title, desc }
   */
  function polarSvg(points, o) {
    var S = 340, c = S / 2, R = 128, floor = -40;
    var rOf = function (n) {
      if (o.scale === 'lin') return R * n;
      var db = 20 * Math.log10(Math.max(n, 1e-6));
      return R * Math.max(0, (db - floor) / -floor);
    };
    var path = function (pts) {
      return pts.map(function (p, i) { var r = rOf(p.n), a = p.deg * D2R; return (i ? 'L' : 'M') + (c + r * Math.cos(a)).toFixed(1) + ' ' + (c - r * Math.sin(a)).toFixed(1); }).join('') + 'Z';
    };
    var out = ['<svg class="polar" viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="' + esc(o.title + ' : ' + (o.desc || '')) + '" xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="scope__bg" x="0" y="0" width="' + S + '" height="' + S + '" rx="14"/>');
    var rings = o.scale === 'lin' ? [[1, '1'], [0.75, '0,75'], [0.5, '0,5'], [0.25, '0,25']] : [[1, '0 dB'], [Math.pow(10, -0.5), '−10'], [0.1, '−20'], [Math.pow(10, -1.5), '−30']];
    rings.forEach(function (rg, i) {
      out.push('<circle class="' + (i === 0 ? 'polar__ring polar__ring--outer' : 'polar__ring') + '" cx="' + c + '" cy="' + c + '" r="' + rOf(rg[0]).toFixed(1) + '"/>');
      out.push('<text class="polar__ringlabel" x="' + (c + 3) + '" y="' + (c - rOf(rg[0]) + 11).toFixed(1) + '">' + rg[1] + '</text>');
    });
    if (o.scale !== 'lin') {
      var r3 = rOf(Math.SQRT1_2);
      out.push('<circle class="polar__half" cx="' + c + '" cy="' + c + '" r="' + r3.toFixed(1) + '"/>');
    }
    for (var a = 0; a < 360; a += 30) {
      var x = c + R * Math.cos(a * D2R), y = c - R * Math.sin(a * D2R);
      out.push('<line class="polar__spoke" x1="' + c + '" y1="' + c + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>');
      var lx = c + (R + 16) * Math.cos(a * D2R), ly = c - (R + 16) * Math.sin(a * D2R) + 4;
      var lab = o.plane === 'V' ? (a <= 90 ? a : a <= 270 ? 180 - a : a - 360) + '°' + (a === 90 ? ' (zénith)' : '') : a + '°';
      out.push('<text class="polar__label" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle">' + lab + '</text>');
    }
    if (o.ref) out.push('<path class="polar__ref" d="' + path(o.ref) + '"/>');
    out.push('<path class="polar__trace" d="' + path(points) + '"/>');
    // direction du lobe principal
    if (o.main != null) {
      var am = o.main * D2R;
      out.push('<line class="polar__main" x1="' + c + '" y1="' + c + '" x2="' + (c + (R + 4) * Math.cos(am)).toFixed(1) + '" y2="' + (c - (R + 4) * Math.sin(am)).toFixed(1) + '"/>');
    }
    // géométrie de l'antenne au centre
    if (o.plane === 'H') {
      var n = o.N || 1, sp = Math.min(14, 90 / Math.max(1, n - 1));
      for (var k = 0; k < n; k++) out.push('<circle class="polar__elem" cx="' + (c + (k - (n - 1) / 2) * sp).toFixed(1) + '" cy="' + c + '" r="3.2"/>');
      if (n > 1) out.push('<text class="polar__axis" x="' + (S - 6) + '" y="' + (c + 20) + '" text-anchor="end">axe du réseau</text>');
    } else {
      out.push('<line class="polar__dipole" x1="' + c + '" y1="' + (c - 16) + '" x2="' + c + '" y2="' + (c + 16) + '"/>');
      out.push('<text class="polar__axis" x="' + (S - 6) + '" y="' + (c + 20) + '" text-anchor="end">horizon</text>');
    }
    out.push('</svg>');
    return out.join('');
  }

  var missions = [
    {
      id: 'm1', title: 'Le plus directif des deux dipôles',
      text: 'Avec un seul élément, comparez le dipôle court et le dipôle demi-onde, puis gardez celui qui a le faisceau vertical le plus étroit (largeur à −3 dB).',
      check: function (s) {
        if (s.N !== 1) return { ok: false, msg: 'Utilisez un seul élément (N = 1) pour comparer les deux dipôles.' };
        var a = analyse(s);
        if (s.type === 'half') return { ok: true, msg: 'Réussi : le dipôle demi-onde a une largeur verticale de ' + fN(a.hpbwV, 3) + '° (contre 90° pour le dipôle court) et une directivité de 2,15 dBi (contre 1,76 dBi).' };
        return { ok: false, msg: 'Le dipôle court a une largeur verticale de ' + fN(a.hpbwV, 3) + '°. Essayez l’autre type et comparez.' };
      }
    },
    {
      id: 'm2', title: 'Au moins 10 dBi, sans lobe de réseau',
      text: 'Réglez un réseau d’antennes dont le gain atteint au moins 10 dBi, sans faire apparaître de lobe de réseau.',
      check: function (s) {
        var a = analyse(s);
        if (a.grating.length) return { ok: false, msg: 'Des lobes de réseau apparaissent (espacement trop grand : ' + fN(s.d) + ' λ). Réduisez l’espacement en dessous de λ.' };
        if (a.Gdb >= 10) return { ok: true, msg: 'Réussi : G = ' + fN(a.Gdb, 3) + ' dBi avec ' + s.N + ' dipôles espacés de ' + fN(s.d) + ' λ (rendement ' + s.eta + ' %). Le faisceau horizontal ne mesure plus que ' + fN(a.hpbwH, 3) + '°.' };
        return { ok: false, msg: 'Gain actuel : ' + fN(a.Gdb, 3) + ' dBi. Ajoutez des éléments, ou vérifiez le rendement.' };
      }
    },
    {
      id: 'm3', title: 'Dépointer le faisceau à 60°',
      text: 'Avec au moins 4 éléments, orientez le lobe principal à 60° de l’axe du réseau (à ±2° près) en jouant sur le déphasage.',
      check: function (s) {
        if (s.N < 4) return { ok: false, msg: 'Utilisez au moins 4 éléments.' };
        var a = analyse(s);
        if (a.main != null && Math.abs(a.main - 60) <= 2) return { ok: true, msg: 'Réussi : lobe principal à ' + fN(a.main, 3) + '°. La formule cos φ₀ = −β/(2π d/λ) donne β = ' + fN(s.beta) + '° pour d = ' + fN(s.d) + ' λ.' };
        return { ok: false, msg: 'Lobe principal actuel : ' + (a.main == null ? 'hors du domaine visible' : fN(a.main, 3) + '°') + '. Pour d = λ/2, il faut cos 60° = 0,5 = −β/π, soit β = −90°.' };
      }
    },
    {
      id: 'm4', title: 'Perdre 3 dB par la polarisation',
      text: 'Réglez le désalignement de polarisation entre émission et réception pour que la perte soit de 3 dB (±0,2 dB).',
      check: function (s) {
        var l = A.polarizationLoss(s.pol).db;
        if (Math.abs(l - 3.01) <= 0.2) return { ok: true, msg: 'Réussi : Δ = ' + fN(s.pol) + '°, cos² Δ = ' + fN(Math.cos(s.pol * D2R) * Math.cos(s.pol * D2R), 3) + ' : la moitié de la puissance est perdue (−3 dB).' };
        return { ok: false, msg: 'Perte actuelle : ' + (isFinite(l) ? fN(l, 3) + ' dB' : 'totale') + '. La perte vaut −10 log₁₀(cos² Δ).' };
      }
    }
  ];

  /* --------------------------- Explications dynamiques --------------------------- */

  function explain(param, b, s) {
    var a0 = analyse(b), a1 = analyse(s);
    var gain = '<p>Directivité : ' + fN(a0.Ddb, 3) + ' → <strong>' + fN(a1.Ddb, 3) + ' dBi</strong> ; gain : <strong>' + fN(a1.Gdb, 3) + ' dBi</strong>. Largeur horizontale à −3 dB : ' + (a1.hpbwH >= 359 ? 'omnidirectionnel' : fN(a1.hpbwH, 3) + '°') + '.</p>';
    if (param === 'type') {
      if (b.type === s.type) return null;
      return '<p>' + (s.type === 'half'
        ? 'Le <strong>dipôle demi-onde</strong> (longueur λ/2 = ' + M.formatLength(a1.lam / 2, 3) + ') concentre un peu plus l’énergie vers l’horizon : son diagramme vertical est plus étroit (' + fN(a1.hpbwV, 3) + '°) que celui du dipôle court (90°). Dans le plan horizontal, il reste omnidirectionnel.'
        : 'Le <strong>dipôle court</strong> (longueur très petite devant λ) a un diagramme en sin θ : largeur verticale de 90°, directivité 1,5 (1,76 dBi). En pratique, il est difficile à adapter et rayonne peu efficacement.') + '</p>' + gain;
    }
    if (param === 'N') {
      if (b.N === s.N) return null;
      return '<p>Le réseau passe de ' + b.N + ' à <strong>' + s.N + ' élément' + (s.N > 1 ? 's' : '') + '</strong>. Les ondes des différents dipôles s’additionnent en phase dans certaines directions et s’annulent dans d’autres : ' +
        (s.N > b.N ? 'le faisceau se resserre et la directivité augmente.' : 'le faisceau s’élargit et la directivité diminue.') + ' Longueur totale du réseau : ' + M.formatLength((s.N - 1) * s.d * a1.lam, 3) + '.</p>' + gain +
        (s.N > 1 && a1.sll != null ? '<p>Plus fort lobe secondaire : ' + fN(a1.sll, 3) + ' dB sous le lobe principal.</p>' : '');
    }
    if (param === 'd') {
      if (b.d === s.d) return null;
      var t = '<p>L’espacement passe de ' + fN(b.d) + ' λ à <strong>' + fN(s.d) + ' λ</strong> (' + M.formatLength(s.d * a1.lam, 3) + ' à ' + M.formatFrequency(s.f, 3) + '). Un réseau plus long donne un faisceau plus étroit.</p>' + gain;
      if (a1.grating.length) t += '<p><strong>Lobes de réseau</strong> : avec d ≥ λ (pour β = 0), d’autres directions reçoivent la même intensité que le lobe principal (' + a1.grating.map(function (g) { return fN(g, 3) + '°'; }).join(', ') + '). L’énergie est gaspillée : on garde en général d < λ.</p>';
      return t;
    }
    if (param === 'beta') {
      if (b.beta === s.beta) return null;
      return '<p>Le déphasage entre éléments voisins passe de ' + fN(b.beta) + '° à <strong>' + fN(s.beta) + '°</strong>. Le lobe principal se place là où les ondes arrivent en phase : cos φ₀ = −β/(2π d/λ). ' +
        (a1.main == null ? 'Ici, aucune direction ne vérifie cette condition : le lobe principal sort du domaine visible.' : 'Il pointe maintenant à <strong>' + fN(a1.main, 3) + '°</strong> de l’axe du réseau' + (Math.abs(a1.main - 90) < 0.5 ? ' (perpendiculaire au réseau : rayonnement « transversal »).' : Math.abs(a1.main) < 0.5 || Math.abs(a1.main - 180) < 0.5 ? ' (dans l’axe : rayonnement « longitudinal »).' : '.')) +
        ' C’est le principe du dépointage électronique des antennes actives (5G, radars), sans bouger l’antenne.</p>' + gain;
    }
    if (param === 'eta') {
      if (b.eta === s.eta) return null;
      return '<p>Le rendement passe à <strong>' + s.eta + ' %</strong> : une partie de la puissance fournie est perdue en chaleur dans l’antenne. Le diagramme et la directivité ne changent pas (' + fN(a1.Ddb, 3) + ' dBi), mais le gain G = η·D devient <strong>' + fN(a1.Gdb, 3) + ' dBi</strong>.</p>';
    }
    if (param === 'f') {
      if (b.f === s.f) return null;
      return '<p>La fréquence passe à <strong>' + M.formatFrequency(s.f, 4) + '</strong> : λ = ' + M.formatLength(a1.lam, 4) + '. Un dipôle demi-onde mesure ' + M.formatLength(a1.lam / 2, 3) + ' et le réseau ' + M.formatLength((s.N - 1) * s.d * a1.lam, 3) + '. Les diagrammes sont identiques, car toutes les dimensions sont exprimées en longueurs d’onde. Seule la surface effective change : Ae = Gλ²/4π = ' + fN(a1.Ae * 1e4, 3) + ' cm².</p>';
    }
    if (param === 'pol') {
      if (b.pol === s.pol) return null;
      var l = a1.pol.db;
      return '<p>Les antennes d’émission et de réception sont inclinées de <strong>' + fN(s.pol) + '°</strong> l’une par rapport à l’autre. Seule la composante du champ parallèle à l’antenne de réception est captée : facteur cos² Δ = ' + fN(a1.pol.plf, 3) + ', soit une perte de <strong>' + (isFinite(l) ? fN(l, 3) + ' dB' : 'totale (polarisations croisées)') + '</strong>.</p>';
    }
    if (param === 'scale') return '<p>Échelle ' + (s.scale === 'db' ? '<strong>en décibels</strong> : les petits lobes deviennent visibles ; le cercle pointillé marque −3 dB.' : '<strong>linéaire</strong> (amplitude du champ) : on voit surtout le lobe principal ; les petits lobes paraissent négligeables.') + '</p>';
    return null;
  }

  function intro(s) {
    var a = analyse(s);
    return '<p>Modifiez un paramètre : l’explication s’adaptera aux valeurs affichées.</p><p>Réglage actuel : ' + (s.N === 1 ? 'un ' + (s.type === 'half' ? 'dipôle demi-onde' : 'dipôle court') + ' vertical' : 'un réseau de ' + s.N + ' dipôles espacés de ' + fN(s.d) + ' λ') + ', à ' + M.formatFrequency(s.f, 3) + '. Directivité ' + fN(a.Ddb, 3) + ' dBi, gain ' + fN(a.Gdb, 3) + ' dBi. ' +
      (s.N === 1 ? 'Dans le plan horizontal, l’antenne rayonne autant dans toutes les directions (omnidirectionnelle) ; dans le plan vertical, rien ne part dans l’axe du dipôle.' : 'Largeur du faisceau horizontal : ' + fN(a.hpbwH, 3) + '°.') + '</p>';
  }

  /* ------------------------------------ Page ------------------------------------ */

  function sanitize(p) {
    var o = {};
    Object.keys(LIM).forEach(function (k) { if (isFinite(p[k]) && p[k] >= LIM[k][0] && p[k] <= LIM[k][1]) o[k] = Number(p[k]); });
    if (p.type === 'short' || p.type === 'half') o.type = p.type;
    if (p.scale === 'db' || p.scale === 'lin') o.scale = p.scale;
    if (o.N != null) o.N = Math.round(o.N);
    return o;
  }

  function mount(container) {
    var s = K.loadParams(ID, DEFAULTS, sanitize);
    var tr = K.tracker(), save = K.paramSaver(ID);

    container.innerHTML = [
      '<div class="lab">',
      K.head({ title: 'Laboratoire : antennes et diagrammes de rayonnement', badge: 'Modèle pédagogique : dipôles idéaux en espace libre', text: 'Choisissez une antenne, assemblez plusieurs dipôles en réseau et orientez le faisceau. Les diagrammes, la directivité et le gain sont recalculés à chaque réglage.' }),
      '<div class="lab__grid"><div class="lab__main">',
      '<div class="lab__pair lab__pair--top">',
      '<div class="scope-panel"><p class="scope-panel__title">Plan horizontal (vu de dessus)</p><div id="pol-h"></div><p class="scope-panel__cursor" id="pol-h-note"></p></div>',
      '<div class="scope-panel"><p class="scope-panel__title">Plan vertical (dans la direction du lobe principal)</p><div id="pol-v"></div><p class="scope-panel__cursor" id="pol-v-note"></p></div>',
      '</div>',
      '<p class="lab__legend"><span class="leg"><span class="sw sw--trace"></span>Diagramme de l’antenne réglée</span><span class="leg"><span class="sw sw--ref"></span>Dipôle demi-onde seul (référence)</span><span class="leg"><span class="sw sw--alt"></span>Direction du lobe principal</span></p>',
      K.readouts([['Directivité D', 'r-D'], ['Directivité (dBi)', 'r-Ddb'], ['Gain G = η·D', 'r-G'], ['Gain (dBd)', 'r-Gd'], ['Lobe principal', 'r-main'],
        ['Largeur à −3 dB (horizontal)', 'r-hh'], ['Largeur à −3 dB (vertical)', 'r-hv'], ['Lobe secondaire max.', 'r-sll'], ['Lobes de réseau', 'r-gl'], ['Longueur d’onde λ', 'r-lam'],
        ['Longueur d’un dipôle λ/2', 'r-l2'], ['Longueur du réseau', 'r-len'], ['Surface effective Ae', 'r-ae'], ['Perte de polarisation', 'r-pol'], ['Puissance captée (polar.)', 'r-plf']]),
      K.explainBox(''),
      '</div>',
      '<aside class="lab__controls" aria-label="Commandes de la simulation"><form class="controls" onsubmit="return false" novalidate>',
      K.select({ id: 'in-type', label: 'Type d’élément', options: TYPES, hint: 'Dipôles verticaux, alimentés en leur centre.' }),
      K.range({ id: 'in-N', label: 'Nombre d’éléments <var>N</var>', min: 1, max: 8, step: 1, unit: '', srLabel: 'Nombre d’éléments', hint: 'De 1 à 8 dipôles alignés (réseau linéaire).' }),
      '<div id="ctl-array">' +
        K.range({ id: 'in-d', label: 'Espacement <var>d</var>', min: 0.1, max: 1.5, step: 0.05, unit: 'λ', srLabel: 'Espacement en longueurs d’onde', hint: 'De 0,1 λ à 1,5 λ entre deux éléments voisins.' }) +
        K.range({ id: 'in-beta', label: 'Déphasage entre éléments <var>β</var>', min: -180, max: 180, step: 5, unit: '°', srLabel: 'Déphasage en degrés', hint: 'De −180° à +180°. Oriente le faisceau.',
          extra: K.chips('Déphasages remarquables', [['-90', '−90°'], ['0', '0°'], ['90', '+90°'], ['-180', '−180°']], 'beta') }) + '</div>',
      K.range({ id: 'in-eta', label: 'Rendement <var>η</var>', min: 50, max: 100, step: 1, unit: '%', srLabel: 'Rendement en pour cent', hint: 'Part de la puissance réellement rayonnée (le reste chauffe l’antenne).' }),
      K.range({ id: 'in-f', label: 'Fréquence <var>f</var>', min: 0, max: 1000, step: 1, unit: 'MHz', srLabel: 'Fréquence en mégahertz', hint: 'De 100 MHz à 6 GHz : fixe les dimensions réelles.' }),
      K.range({ id: 'in-pol', label: 'Désalignement de polarisation <var>Δ</var>', min: 0, max: 90, step: 1, unit: '°', srLabel: 'Désalignement de polarisation en degrés', hint: 'Angle entre l’antenne d’émission et l’antenne de réception (0° : alignées).' }),
      K.segmented({ id: 'in-scale', label: 'Échelle des diagrammes', options: [['db', 'Décibels'], ['lin', 'Linéaire']] }),
      '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + TCL.icon('reset') + 'Réinitialiser</button>',
      '</form></aside></div>',
      K.missionsSection(missions),
      '<section class="box ref-table"><h2>Repères : quelques antennes courantes</h2><div class="table-wrap"><table class="data-table data-table--compact"><caption class="sr-only">Ordres de grandeur</caption><thead><tr><th scope="col">Antenne</th><th scope="col">Gain typique</th><th scope="col">Usage</th></tr></thead><tbody>' +
        '<tr><td>Dipôle demi-onde</td><td>2,15 dBi</td><td>référence, antennes FM, VHF</td></tr>' +
        '<tr><td>Antenne de téléphone mobile</td><td>de −5 à +2 dBi environ</td><td>compacte, peu directive</td></tr>' +
        '<tr><td>Antenne panneau de station de base</td><td>de 15 à 18 dBi environ</td><td>secteur de 65° environ dans le plan horizontal</td></tr>' +
        '<tr><td>Parabole de 60 cm à 12 GHz</td><td>environ 35 dBi</td><td>télévision par satellite</td></tr></tbody></table></div><p class="muted">Ordres de grandeur indicatifs : le gain réel dépend du modèle et de la fréquence.</p></section>',
      K.limits('<p>Les éléments sont des dipôles idéaux, alimentés avec la même amplitude et parfaitement adaptés. Le modèle ignore le couplage mutuel entre éléments (qui modifie un peu les diagrammes réels), le sol, le mât et les objets proches. Le rendement est une valeur que vous choisissez : il n’est pas calculé. Les antennes réelles (panneaux, paraboles, antennes imprimées) ont des diagrammes plus complexes, mesurés en chambre anéchoïque.</p>'),
      K.sequenceLinks(ID),
      '</div>'
    ].join('');
    var $ = function (sel) { return container.querySelector(sel); };
    var refH = A.cut({ type: 'half', N: 1, d: 0.5, beta: 0 }, 'H', 0, 2), refV = A.cut({ type: 'half', N: 1, d: 0.5, beta: 0 }, 'V', 90, 2);

    function refresh() {
      var a = analyse(s);
      $('#pol-h').innerHTML = polarSvg(a.H, { plane: 'H', scale: s.scale, ref: s.N > 1 || s.type !== 'half' ? refH : null, N: s.N, main: a.main != null && s.N > 1 ? a.main : null, title: 'Diagramme de rayonnement dans le plan horizontal', desc: s.N === 1 ? 'cercle : rayonnement identique dans toutes les directions horizontales' : 'lobe principal à ' + fN(a.main == null ? 0 : a.main, 3) + ' degrés de l’axe du réseau, largeur à −3 dB ' + fN(a.hpbwH, 3) + ' degrés' });
      $('#pol-v').innerHTML = polarSvg(a.V, { plane: 'V', scale: s.scale, ref: s.type !== 'half' ? refV : null, main: 0, title: 'Diagramme de rayonnement dans le plan vertical', desc: 'maximum vers l’horizon, nul vers le zénith ; largeur à −3 dB ' + fN(a.hpbwV, 3) + ' degrés' });
      $('#pol-h-note').textContent = s.N === 1 ? 'Omnidirectionnel : un dipôle vertical rayonne autant dans toutes les directions horizontales.' : 'Les points au centre représentent les ' + s.N + ' dipôles alignés (vus de dessus).';
      $('#pol-v-note').textContent = 'Le trait au centre représente un dipôle vertical. Aucun rayonnement dans son axe (vers le zénith).';
      K.setText(container, '#r-D', fN(a.D, 4));
      K.setText(container, '#r-Ddb', fN(a.Ddb, 3) + ' dBi');
      K.setText(container, '#r-G', fN(a.Gdb, 3) + ' dBi (' + fN(a.G, 3) + ')');
      K.setText(container, '#r-Gd', fN(a.Gdb - 2.15, 3) + ' dBd');
      K.setText(container, '#r-main', s.N === 1 ? 'toutes les directions horizontales' : a.main == null ? 'hors du domaine visible' : fN(a.main, 3) + '° de l’axe');
      K.setText(container, '#r-hh', a.hpbwH >= 359 ? 'omnidirectionnel (360°)' : fN(a.hpbwH, 3) + '°');
      K.setText(container, '#r-hv', fN(a.hpbwV, 3) + '°');
      K.setText(container, '#r-sll', a.sll == null ? '—' : fN(a.sll, 3) + ' dB');
      K.setText(container, '#r-gl', a.grating.length ? 'oui : ' + a.grating.map(function (g) { return fN(g, 3) + '°'; }).join(', ') : 'aucun');
      K.setText(container, '#r-lam', M.formatLength(a.lam, 4));
      K.setText(container, '#r-l2', M.formatLength(a.lam / 2, 3));
      K.setText(container, '#r-len', s.N === 1 ? '—' : M.formatLength((s.N - 1) * s.d * a.lam, 3));
      K.setText(container, '#r-ae', a.Ae >= 1 ? fN(a.Ae, 3) + ' m²' : fN(a.Ae * 1e4, 3) + ' cm²');
      K.setText(container, '#r-pol', isFinite(a.pol.db) ? fN(a.pol.db, 3) + ' dB' : 'totale');
      K.setText(container, '#r-plf', fN(a.pol.plf * 100, 3) + ' %');
      $('#ctl-array').hidden = s.N === 1;
      if (document.activeElement !== $('#in-type')) $('#in-type').value = s.type;
      U.qsa('input[name=in-scale]', container).forEach(function (r) { r.checked = r.value === s.scale; });
      K.setText(container, '#in-N-out', String(s.N));
      K.setText(container, '#in-d-out', fN(s.d) + ' λ');
      K.setText(container, '#in-beta-out', fN(s.beta) + '°');
      K.setText(container, '#in-eta-out', s.eta + ' %');
      K.setText(container, '#in-f-out', M.formatFrequency(s.f, 4));
      K.setText(container, '#in-pol-out', fN(s.pol) + '°');
      pairs.N.sync(s.N); pairs.d.sync(s.d); pairs.beta.sync(s.beta); pairs.eta.sync(s.eta); pairs.pol.sync(s.pol); pairs.f.sync(Number((s.f / 1e6).toPrecision(6)));
      var html = tr.param() ? explain(tr.param(), tr.base(), s) : null;
      $('#explain').innerHTML = html || intro(s);
      save(s);
    }

    function set(name, value, single) { tr.before(name, s); s[name] = value; refresh(); if (single) tr.end(); }
    function pair(key, unit, dec, conv) {
      return K.bindPair(container, { id: 'in-' + key, validate: K.numberValidator(LIM[key][0], LIM[key][1], unit, dec), onInput: function (v) { set(key, conv ? conv(v) : v); }, onEnd: function () { tr.end(); }, current: function () { return s[key]; } });
    }
    var pairs = {
      N: pair('N', 'éléments', 0, Math.round), d: pair('d', 'λ', 2), beta: pair('beta', '°', 0), eta: pair('eta', '%', 0), pol: pair('pol', '°', 1),
      f: K.bindPair(container, { id: 'in-f', toSlider: function (mhz) { return logF.to(mhz * 1e6); }, fromSlider: logF.from,
        validate: function (raw) { var r = K.numberValidator(100, 6000, 'MHz', 4)(raw); if (r.ok) r.value *= 1e6; return r; },
        onInput: function (hz) { set('f', hz); }, onEnd: function () { tr.end(); }, current: function () { return Number((s.f / 1e6).toPrecision(6)); } })
    };
    $('#in-type').addEventListener('change', function (e) { set('type', e.target.value, true); });
    U.qsa('input[name=in-scale]', container).forEach(function (r) { r.addEventListener('change', function () { if (r.checked) set('scale', r.value, true); }); });
    U.qsa('[data-beta]', container).forEach(function (b) { b.addEventListener('click', function () { pairs.beta.clear(); set('beta', Number(b.getAttribute('data-beta')), true); }); });
    $('#lab-reset').addEventListener('click', function () {
      s = Object.assign({}, DEFAULTS); tr.reset(); Object.keys(pairs).forEach(function (k) { pairs[k].clear(); }); refresh();
      U.toast('Paramètres réinitialisés : un dipôle demi-onde à 900 MHz, rendement 100 %.', 'info');
    });

    K.bindMissions(container, ID, LABEL, missions, function () { return s; });
    refresh();
    return function () {};
  }

  function thumb() {
    var cfg = { type: 'half', N: 4, d: 0.5, beta: 0 };
    return { html: '<div class="thumb-polar">' + polarSvg(A.cut(cfg, 'H', 0, 2), { plane: 'H', scale: 'db', N: 4, main: 90, title: 'Aperçu : diagramme d’un réseau de 4 dipôles', desc: 'deux lobes principaux perpendiculaires au réseau' }) + '</div>' };
  }

  TCL.antennaPlot = { polarSvg: polarSvg, analyse: analyse };
  TCL.labs = TCL.labs || {};
  TCL.labs[ID] = {
    id: ID, title: 'Antennes et diagrammes de rayonnement', short: LABEL, icon: 'antenna', mount: mount, missions: missions, thumb: thumb,
    summary: 'Dipôles et réseaux d’antennes : diagrammes horizontal et vertical, directivité, gain, dépointage du faisceau, lobes de réseau et polarisation.',
    explain: explain, analyse: analyse, DEFAULTS: DEFAULTS
  };
})(window);
