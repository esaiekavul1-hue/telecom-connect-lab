/*
 * TELECOM CONNECT LAB — Laboratoire « Fibre optique »
 * --------------------------------------------------
 * 1. Trajet d'un rayon lumineux : réfraction à l'entrée, réflexion totale
 *    interne (ou fuite dans la gaine), calculées par la loi de Snell-Descartes.
 * 2. Bilan de puissance d'une liaison : atténuation, épissures, connecteurs.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, F = TCL.fiberMath, U = TCL.util, K = TCL.labkit, esc = U.esc;
  var ID = 'fibre', LABEL = 'Fibre optique';
  var D2R = Math.PI / 180;
  var SPLICE = 0.1, CONNECTOR = 0.5; // pertes typiques (dB)

  var PRESETS = {
    mm850: { label: 'Multimode, 850 nm (≈ 3 dB/km)', alpha: 3, n1: 1.48, n2: 1.46, lambda: 850 },
    sm1310: { label: 'Monomode, 1 310 nm (≈ 0,35 dB/km)', alpha: 0.35, n1: 1.4675, n2: 1.4622, lambda: 1310 },
    sm1550: { label: 'Monomode, 1 550 nm (≈ 0,2 dB/km)', alpha: 0.2, n1: 1.4675, n2: 1.4622, lambda: 1550 }
  };
  var LIM = { n1: [1.40, 1.60], n2: [1.38, 1.599], theta: [0, 40], alpha: [0.1, 5], L: [0.1, 100], splices: [0, 20], connectors: [0, 6], pt: [-10, 10], sens: [-40, -10] };
  var DEFAULTS = { preset: 'mm850', n1: 1.48, n2: 1.46, theta: 10, alpha: 3, L: 2, splices: 2, connectors: 2, pt: 0, sens: -28 };
  var logL = K.logSlider(LIM.L[0], LIM.L[1]);

  function fN(v, s) { return M.formatNumber(v, s); }
  function db(v, s) { return (v > 0 ? '+' : '') + fN(v, s || 3) + ' dB'; }
  function pw(dbm) { var mw = F.dbmToMw(dbm); return mw >= 1 ? fN(mw, 3) + ' mW' : mw >= 1e-3 ? fN(mw * 1000, 3) + ' µW' : fN(mw * 1e6, 3) + ' nW'; }
  function bud(s) { return F.budget({ pt: s.pt, alpha: s.alpha, L: s.L, splices: s.splices, spliceLoss: SPLICE, connectors: s.connectors, connectorLoss: CONNECTOR }); }
  function lmax(s) { return F.maxLength({ pt: s.pt, sens: s.sens, alpha: s.alpha, splices: s.splices, spliceLoss: SPLICE, connectors: s.connectors, connectorLoss: CONNECTOR }); }
  function fmtTime(t) { return M.formatTime(t, 3); }
  function rate(b) { return !isFinite(b) ? '—' : b >= 1e9 ? fN(b / 1e9, 3) + ' Gbit/s' : b >= 1e6 ? fN(b / 1e6, 3) + ' Mbit/s' : fN(b / 1e3, 3) + ' kbit/s'; }

  /* ----------------------------- Schéma du rayon (SVG) ----------------------------- */

  function fiberSvg(p) {
    var W = 720, H = 250, x0 = 110, yTop = 80, yBot = 170, yc = (yTop + yBot) / 2, clad = 46;
    var r = F.ray(1, p.n1, p.n2, p.theta), ta = F.acceptanceAngle(p.n1, p.n2);
    var out = ['<svg class="fiber" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc('Trajet du rayon : entrée à ' + fN(p.theta, 3) + '°, ' + (r.guided ? 'guidé par réflexion totale interne' : 'non guidé, il s’échappe dans la gaine')) + '" xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="scope__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>');
    out.push('<rect class="fiber__clad" x="' + x0 + '" y="' + (yTop - clad) + '" width="' + (W - x0 - 10) + '" height="' + clad + '"/>');
    out.push('<rect class="fiber__clad" x="' + x0 + '" y="' + yBot + '" width="' + (W - x0 - 10) + '" height="' + clad + '"/>');
    out.push('<rect class="fiber__core" x="' + x0 + '" y="' + yTop + '" width="' + (W - x0 - 10) + '" height="' + (yBot - yTop) + '"/>');
    out.push('<line class="fiber__axis" x1="' + (x0 - 90) + '" y1="' + yc + '" x2="' + (W - 10) + '" y2="' + yc + '"/>');
    out.push('<text class="fiber__t" x="' + (W - 18) + '" y="' + (yTop - clad + 16) + '" text-anchor="end">gaine n₂ = ' + fN(p.n2, 4) + '</text>');
    out.push('<text class="fiber__t" x="' + (W - 18) + '" y="' + (yTop + 18) + '" text-anchor="end">cœur n₁ = ' + fN(p.n1, 4) + '</text>');
    out.push('<text class="fiber__t" x="14" y="' + (yTop - clad + 16) + '">air n₀ = 1</text>');
    // cône d'acceptance
    var cl = 92;
    out.push('<path class="fiber__cone" d="M' + x0 + ' ' + yc + ' L' + (x0 - cl * Math.cos(ta * D2R)).toFixed(1) + ' ' + (yc - cl * Math.sin(ta * D2R)).toFixed(1) + ' M' + x0 + ' ' + yc + ' L' + (x0 - cl * Math.cos(ta * D2R)).toFixed(1) + ' ' + (yc + cl * Math.sin(ta * D2R)).toFixed(1) + '"/>');
    out.push('<text class="fiber__t fiber__t--cone" x="14" y="' + (yBot + 30) + '">cône d’acceptance ±' + fN(ta, 3) + '°</text>');
    // rayon incident (vient d'en bas à gauche, monte vers le point d'entrée)
    var inc = p.theta * D2R, Lin = 96;
    out.push('<line class="fiber__ray" x1="' + (x0 - Lin * Math.cos(inc)).toFixed(1) + '" y1="' + (yc + Lin * Math.sin(inc)).toFixed(1) + '" x2="' + x0 + '" y2="' + yc + '"/>');
    // trajet dans le cœur
    var a = r.inCore * D2R, x = x0, y = yc, dir = -1, d = 'M' + x0 + ' ' + yc, first = null, n = 0;
    if (a < 1e-4) { d += ' L' + (W - 10) + ' ' + yc; }
    while (a >= 1e-4 && n < 60) {
      var yt = dir < 0 ? yTop : yBot, dx = Math.abs(yt - y) / Math.tan(a);
      if (x + dx >= W - 10) { d += ' L' + (W - 10) + ' ' + (y + dir * (W - 10 - x) * Math.tan(a)).toFixed(1); break; }
      x += dx; y = yt; d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1);
      if (!first) first = { x: x, y: y };
      if (!r.guided) break;
      dir = -dir; n++;
    }
    out.push('<path class="fiber__ray" d="' + d + '"/>');
    if (!r.guided && first && r.escape != null) {
      var e = (90 - r.escape) * D2R, ex = first.x + clad / Math.tan(e);
      out.push('<line class="fiber__ray fiber__ray--lost" x1="' + first.x.toFixed(1) + '" y1="' + first.y + '" x2="' + ex.toFixed(1) + '" y2="' + (first.y - clad) + '"/>');
      out.push('<line class="fiber__ray fiber__ray--weak" x1="' + first.x.toFixed(1) + '" y1="' + first.y + '" x2="' + (first.x + 60 / Math.tan(a)).toFixed(1) + '" y2="' + (first.y + 60) + '"/>');
      out.push('<text class="fiber__t fiber__t--warn" x="' + Math.min(W - 20, ex + 8).toFixed(1) + '" y="' + (first.y - clad + 14) + '">la lumière s’échappe</text>');
    }
    // angle d'incidence au premier point de réflexion
    if (first) {
      var rr = 28;
      out.push('<line class="fiber__normal" x1="' + first.x.toFixed(1) + '" y1="' + (first.y - 30) + '" x2="' + first.x.toFixed(1) + '" y2="' + (first.y + 34) + '"/>');
      out.push('<text class="fiber__t fiber__t--ang" x="' + (first.x + 6).toFixed(1) + '" y="' + (first.y + 46) + '">α = ' + fN(r.incidence, 3) + '° ' + (r.guided ? '≥' : '<') + ' θc = ' + fN(r.critical, 3) + '°</text>');
      void rr;
    }
    out.push('<text class="fiber__t" x="14" y="' + (H - 12) + '">Schéma non à l’échelle (un cœur mesure de 9 à 62,5 µm)</text>');
    out.push('</svg>');
    return out.join('');
  }

  var missions = [
    {
      id: 'm1', title: 'À la limite du cône d’acceptance',
      text: 'Réglez l’angle d’entrée du rayon à la limite de l’angle d’acceptance (à ±0,5° près) : le rayon est encore guidé, mais tout juste.',
      check: function (s) {
        var ta = F.acceptanceAngle(s.n1, s.n2), r = F.ray(1, s.n1, s.n2, s.theta);
        if (Math.abs(s.theta - ta) <= 0.5 && r.guided) return { ok: true, msg: 'Réussi : θ = ' + fN(s.theta, 3) + '°, angle d’acceptance θa = arcsin(ON) = ' + fN(ta, 3) + '°. Au-delà, le rayon frappe la gaine sous un angle inférieur à l’angle critique et s’échappe.' };
        if (Math.abs(s.theta - ta) <= 0.5) return { ok: false, msg: 'Vous êtes tout près (' + fN(s.theta, 3) + '°), mais le rayon n’est plus guidé : revenez un peu en dessous de ' + fN(ta, 3) + '°.' };
        return { ok: false, msg: 'Angle actuel : ' + fN(s.theta, 3) + '° ; angle d’acceptance : ' + fN(ta, 3) + '° (θa = arcsin √(n₁² − n₂²)).' };
      }
    },
    {
      id: 'm2', title: 'Une ouverture numérique de 0,20',
      text: 'Avec un cœur d’indice n₁ = 1,48, choisissez l’indice de la gaine n₂ pour obtenir une ouverture numérique de 0,20 (±0,005).',
      check: function (s) {
        var na = F.numericalAperture(s.n1, s.n2);
        if (Math.abs(s.n1 - 1.48) > 0.0015) return { ok: false, msg: 'Réglez d’abord n₁ à 1,48 (actuellement ' + fN(s.n1, 4) + ').' };
        if (Math.abs(na - 0.2) <= 0.005) return { ok: true, msg: 'Réussi : ON = √(1,48² − ' + fN(s.n2, 4) + '²) = ' + fN(na, 3) + '. Il faut n₂ = √(1,48² − 0,2²) ≈ 1,4664 : un écart d’indice de 1 % suffit.' };
        return { ok: false, msg: 'ON actuelle : ' + fN(na, 3) + '. Rappel : ON = √(n₁² − n₂²), donc n₂ = √(n₁² − ON²).' };
      }
    },
    {
      id: 'm3', title: 'Une liaison de 60 km',
      text: 'Avec 12 épissures et 2 connecteurs, obtenez une liaison d’au moins 60 km avec une marge d’au moins 3 dB, sans changer la puissance émise (0 dBm) ni la sensibilité (−28 dBm).',
      check: function (s) {
        if (s.pt !== 0 || s.sens !== -28) return { ok: false, msg: 'Gardez Pe = 0 dBm et S = −28 dBm.' };
        if (s.splices < 12 || s.connectors < 2) return { ok: false, msg: 'Réglez au moins 12 épissures et 2 connecteurs.' };
        if (s.L < 60) return { ok: false, msg: 'La longueur doit être d’au moins 60 km (actuellement ' + fN(s.L, 3) + ' km).' };
        var b = bud(s), mg = b.pr - s.sens;
        if (mg >= 3) return { ok: true, msg: 'Réussi : pertes totales ' + fN(b.total, 3) + ' dB, Pr = ' + fN(b.pr, 3) + ' dBm, marge ' + db(mg) + '. Seule une fibre monomode (1 310 ou 1 550 nm) le permet : à 850 nm, 60 km coûteraient 180 dB.' };
        return { ok: false, msg: 'Marge actuelle : ' + db(mg) + ' (pertes ' + fN(b.total, 3) + ' dB). Choisissez une fibre moins atténuante.' };
      }
    }
  ];

  /* ------------------------------- Explications ------------------------------- */

  function explain(param, b, s) {
    var r1 = F.ray(1, s.n1, s.n2, s.theta), b1 = bud(s), mg = b1.pr - s.sens;
    var budgetTail = '<p>Bilan : Pr = ' + fN(s.pt) + ' − ' + fN(b1.total, 3) + ' = <strong>' + fN(b1.pr, 3) + ' dBm</strong> (' + pw(b1.pr) + '), marge <strong>' + db(mg) + '</strong>' + (mg >= 0 ? '.' : ' : la liaison ne fonctionne pas.') + '</p>';
    if (param === 'theta') {
      if (b.theta === s.theta) return null;
      return '<p>Le rayon entre avec un angle de <strong>' + fN(s.theta, 3) + '°</strong>. En entrant dans le verre, il se rapproche de l’axe : sin θ = n₁ sin θ<sub>cœur</sub>, donc θ<sub>cœur</sub> = ' + fN(r1.inCore, 3) + '°. Il frappe la gaine avec un angle d’incidence α = 90° − ' + fN(r1.inCore, 3) + '° = ' + fN(r1.incidence, 3) + '°.</p>' +
        (r1.guided ? '<p>α est supérieur à l’angle critique θc = ' + fN(r1.critical, 3) + '° : <strong>réflexion totale interne</strong>. Le rayon rebondit sans perte et reste guidé.</p>'
          : '<p>α est inférieur à l’angle critique θc = ' + fN(r1.critical, 3) + '° : la lumière <strong>passe dans la gaine</strong> (réfraction à ' + fN(r1.escape, 3) + '°) et se perd. Il faut rester dans le cône d’acceptance (±' + fN(F.acceptanceAngle(s.n1, s.n2), 3) + '°).</p>');
    }
    if (param === 'n1' || param === 'n2') {
      if (b[param] === s[param]) return null;
      var na = F.numericalAperture(s.n1, s.n2);
      return '<p>' + (param === 'n1' ? 'L’indice du cœur' : 'L’indice de la gaine') + ' passe à <strong>' + fN(s[param], 4) + '</strong>. L’écart d’indice règle le guidage : angle critique θc = arcsin(n₂/n₁) = ' + fN(r1.critical, 3) + '°, ouverture numérique ON = √(n₁² − n₂²) = <strong>' + fN(na, 3) + '</strong>, angle d’acceptance ' + fN(F.acceptanceAngle(s.n1, s.n2), 3) + '°.</p><p>' +
        (na > F.numericalAperture(b.n1, b.n2) ? 'Un plus grand écart d’indice accepte des rayons plus inclinés (couplage plus facile), mais augmente la dispersion modale.' : 'Un plus petit écart d’indice n’accepte que des rayons proches de l’axe : moins de dispersion modale, mais un couplage plus délicat.') + ' Le rayon actuel est ' + (r1.guided ? 'guidé.' : 'perdu.') + '</p>';
    }
    if (param === 'preset') {
      if (b.preset === s.preset) return null;
      var pr = PRESETS[s.preset];
      return '<p>Fibre choisie : <strong>' + esc(pr.label) + '</strong>. ' + (s.preset === 'mm850' ? 'Les fibres multimodes (cœur de 50 ou 62,5 µm) sont peu chères et faciles à raccorder, mais atténuent fortement : elles servent sur quelques centaines de mètres (bâtiments, centres de données).' : 'Les fibres monomodes (cœur d’environ 9 µm) atténuent très peu, surtout à 1 550 nm : elles relient des villes et traversent les océans.') + '</p>' + budgetTail;
    }
    if (param === 'alpha' || param === 'L') {
      if (b[param] === s[param]) return null;
      return '<p>' + (param === 'L' ? 'La longueur passe à <strong>' + fN(s.L, 3) + ' km</strong>' : 'L’atténuation passe à <strong>' + fN(s.alpha, 3) + ' dB/km</strong>') + ' : la fibre seule coûte α × L = ' + fN(s.alpha, 3) + ' × ' + fN(s.L, 3) + ' = ' + fN(b1.fiber, 3) + ' dB. Longueur maximale avec ces réglages : <strong>' + fN(lmax(s), 3) + ' km</strong>.</p>' + budgetTail;
    }
    if (param === 'splices' || param === 'connectors') {
      if (b[param] === s[param]) return null;
      return '<p>' + (param === 'splices' ? s.splices + ' épissure(s) à ' + fN(SPLICE) + ' dB : ' + fN(b1.splices, 3) + ' dB' : s.connectors + ' connecteur(s) à ' + fN(CONNECTOR) + ' dB : ' + fN(b1.connectors, 3) + ' dB') + '. Chaque raccordement ajoute une petite perte ; sur une liaison courte, elles peuvent dépasser l’atténuation de la fibre elle-même.</p>' + budgetTail;
    }
    if (param === 'pt' || param === 'sens') {
      if (b[param] === s[param]) return null;
      return '<p>' + (param === 'pt' ? 'Puissance émise : <strong>' + fN(s.pt) + ' dBm</strong> (' + pw(s.pt) + ')' : 'Sensibilité du récepteur : <strong>' + fN(s.sens) + ' dBm</strong> (' + pw(s.sens) + ')') + '. La plage disponible pour les pertes vaut Pe − S = ' + fN(s.pt - s.sens) + ' dB ; longueur maximale : ' + fN(lmax(s), 3) + ' km.</p>' + budgetTail;
    }
    return null;
  }

  function intro(s) {
    var r = F.ray(1, s.n1, s.n2, s.theta), b = bud(s);
    return '<p>Modifiez un paramètre : l’explication s’adaptera aux valeurs affichées.</p><p>Réglage actuel : un rayon entre à ' + fN(s.theta, 3) + '° et frappe la gaine à ' + fN(r.incidence, 3) + '° (angle critique ' + fN(r.critical, 3) + '°) : il est ' + (r.guided ? 'guidé par réflexion totale interne' : 'perdu dans la gaine') + '. Sur ' + fN(s.L, 3) + ' km, la liaison perd ' + fN(b.total, 3) + ' dB : Pr = ' + fN(b.pr, 3) + ' dBm pour une sensibilité de ' + fN(s.sens) + ' dBm.</p>';
  }

  /* ------------------------------------ Page ------------------------------------ */

  function sanitize(p) {
    var o = {};
    Object.keys(LIM).forEach(function (k) { if (isFinite(p[k]) && p[k] >= LIM[k][0] && p[k] <= LIM[k][1]) o[k] = Number(p[k]); });
    if (PRESETS[p.preset] || p.preset === 'custom') o.preset = p.preset;
    if (o.n1 != null && o.n2 != null && o.n2 >= o.n1) delete o.n2;
    return o;
  }

  function mount(container) {
    var s = K.loadParams(ID, DEFAULTS, sanitize);
    var tr = K.tracker(), save = K.paramSaver(ID);

    container.innerHTML = [
      '<div class="lab">',
      K.head({ title: 'Laboratoire : fibre optique', badge: 'Modèle de l’optique géométrique (rayons) et bilan de puissance', text: 'Observez comment la lumière est guidée dans le cœur d’une fibre, puis calculez la puissance reçue au bout d’une liaison selon sa longueur, son atténuation et ses raccordements.' }),
      '<div class="lab__grid"><div class="lab__main">',
      '<div class="scope-panel"><div class="scope-panel__bar"><p class="scope-panel__expr" id="expr"></p><p class="verdict" id="verdict" aria-live="polite"></p></div><div id="fiber-svg"></div></div>',
      K.readouts([['Angle critique θc', 'r-tc'], ['Ouverture numérique ON', 'r-na'], ['Angle d’acceptance θa', 'r-ta'], ['Angle dans le cœur', 'r-tin'], ['Incidence sur la gaine α', 'r-alpha']]),
      '<div class="scope-panel"><div class="scope-panel__bar"><p class="scope-panel__expr" id="expr2"></p><p class="verdict" id="verdict2" aria-live="polite"></p></div><div class="scope-panel__plot" id="pwr-plot"></div><p class="scope-panel__cursor">Puissance le long de la liaison : décroissance régulière dans la fibre, sauts aux connecteurs (extrémités) et aux épissures.</p></div>',
      K.readouts([['Pertes dans la fibre α·L', 'r-pf'], ['Épissures + connecteurs', 'r-pc'], ['Pertes totales', 'r-pt'], ['Puissance reçue', 'r-pr'], ['Marge Pr − S', 'r-mg'],
        ['Longueur maximale', 'r-lm'], ['Temps de parcours (L·n₁/c)', 'r-tt'], ['Dispersion modale ΔT', 'r-dt'], ['Débit max. (≈ 1/2ΔT)', 'r-br'], ['Puissance reçue (mW)', 'r-prw']]),
      K.explainBox(''),
      '</div>',
      '<aside class="lab__controls" aria-label="Commandes de la simulation"><form class="controls" onsubmit="return false" novalidate>',
      '<p class="controls__group">Guidage de la lumière</p>',
      K.range({ id: 'in-theta', label: 'Angle d’entrée du rayon <var>θ</var>', min: 0, max: 40, step: 0.5, unit: '°', srLabel: 'Angle d’entrée en degrés', hint: 'De 0 à 40°, mesuré depuis l’axe de la fibre, dans l’air.' }),
      K.range({ id: 'in-n1', label: 'Indice du cœur <var>n</var><sub>1</sub>', min: 1.40, max: 1.60, step: 0.001, unit: '', srLabel: 'Indice du cœur', hint: 'De 1,40 à 1,60 (verre de silice : environ 1,45 à 1,48).' }),
      K.range({ id: 'in-n2', label: 'Indice de la gaine <var>n</var><sub>2</sub>', min: 1.38, max: 1.599, step: 0.0005, unit: '', srLabel: 'Indice de la gaine', hint: 'Toujours inférieur à n₁ pour qu’il y ait guidage.' }),
      '<p class="controls__group">Bilan de puissance</p>',
      K.select({ id: 'in-preset', label: 'Type de fibre', options: Object.keys(PRESETS).map(function (k) { return [k, PRESETS[k].label]; }).concat([['custom', 'Personnalisée']]), hint: 'Fixe l’atténuation et des indices typiques.' }),
      K.range({ id: 'in-alpha', label: 'Atténuation <var>α</var>', min: 0.1, max: 5, step: 0.05, unit: 'dB/km', srLabel: 'Atténuation en dB par km', hint: 'De 0,1 à 5 dB/km.' }),
      K.range({ id: 'in-L', label: 'Longueur <var>L</var>', min: 0, max: 1000, step: 1, unit: 'km', srLabel: 'Longueur en km', hint: 'De 0,1 à 100 km (curseur logarithmique).' }),
      K.range({ id: 'in-splices', label: 'Épissures', min: 0, max: 20, step: 1, unit: '', srLabel: 'Nombre d’épissures', hint: 'Soudures entre tronçons, ' + M.formatNumber(SPLICE) + ' dB chacune.' }),
      K.range({ id: 'in-connectors', label: 'Connecteurs', min: 0, max: 6, step: 1, unit: '', srLabel: 'Nombre de connecteurs', hint: 'Raccords démontables, ' + M.formatNumber(CONNECTOR) + ' dB chacun.' }),
      K.range({ id: 'in-pt', label: 'Puissance émise <var>P</var><sub>e</sub>', min: -10, max: 10, step: 0.5, unit: 'dBm', srLabel: 'Puissance émise en dBm', hint: 'Laser ou diode : de −10 à +10 dBm.' }),
      K.range({ id: 'in-sens', label: 'Sensibilité du récepteur <var>S</var>', min: -40, max: -10, step: 0.5, unit: 'dBm', srLabel: 'Sensibilité en dBm', hint: 'Puissance minimale détectable : de −40 à −10 dBm.' }),
      '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + TCL.icon('reset') + 'Réinitialiser</button>',
      '</form></aside></div>',
      K.missionsSection(missions),
      '<section class="box ref-table"><h2>Repères : fibres et pertes typiques</h2><div class="table-wrap"><table class="data-table data-table--compact"><caption class="sr-only">Valeurs typiques</caption><thead><tr><th scope="col">Élément</th><th scope="col">Valeur typique</th><th scope="col">Remarque</th></tr></thead><tbody>' +
        '<tr><td>Fibre multimode à 850 nm</td><td>2,5 à 3,5 dB/km</td><td>cœur de 50 ou 62,5 µm, quelques centaines de mètres</td></tr>' +
        '<tr><td>Fibre monomode à 1 310 nm</td><td>0,3 à 0,4 dB/km</td><td>cœur d’environ 9 µm</td></tr>' +
        '<tr><td>Fibre monomode à 1 550 nm</td><td>0,17 à 0,25 dB/km</td><td>longues distances, câbles sous-marins</td></tr>' +
        '<tr><td>Épissure par fusion</td><td>≤ 0,1 dB</td><td>soudure permanente</td></tr>' +
        '<tr><td>Connecteur</td><td>0,3 à 0,5 dB</td><td>raccord démontable</td></tr></tbody></table></div></section>',
      K.limits('<p>Le trajet du rayon suit l’optique géométrique, valable pour les fibres multimodes à saut d’indice. Dans une fibre monomode (cœur de 9 µm, à peine plus grand que la longueur d’onde), la lumière se propage comme une onde guidée unique : l’image du rayon n’est qu’une approximation. Le bilan de puissance utilise des pertes typiques ; il ignore la dispersion chromatique, le vieillissement, les courbures et la marge de sécurité que l’on ajoute en pratique (souvent 3 dB). La dispersion modale est calculée pour une fibre à saut d’indice ; les fibres à gradient d’indice la réduisent fortement.</p>'),
      K.sequenceLinks(ID),
      '</div>'
    ].join('');
    var $ = function (sel) { return container.querySelector(sel); };

    var chart = TCL.plot.mount($('#pwr-plot'), function (w) {
      var b = bud(s), steps = [], L = s.L;
      var co = s.connectors * CONNECTOR, half = co / 2;
      // profil : moitié des connecteurs au départ, épissures régulièrement réparties, l'autre moitié à l'arrivée
      var pos = []; for (var i = 1; i <= s.splices; i++) pos.push(L * i / (s.splices + 1));
      var x = 0, pwr = s.pt - half; steps.push([0, s.pt]); steps.push([0, pwr]);
      pos.forEach(function (px) { pwr -= s.alpha * (px - x); steps.push([px, pwr]); pwr -= SPLICE; steps.push([px, pwr]); x = px; });
      pwr -= s.alpha * (L - x); steps.push([L, pwr]); pwr -= co - half; steps.push([L, pwr]);
      var ymin = Math.min(s.sens, b.pr) - 5, ymax = s.pt + 3;
      ymin = Math.floor(ymin / 5) * 5; ymax = Math.ceil(ymax / 5) * 5;
      return { kind: 'xy', ratio: w < 520 ? 0.65 : 0.4, title: 'Puissance le long de la fibre', desc: 'Puissance de ' + fN(s.pt) + ' dBm à l’émission à ' + fN(b.pr, 3) + ' dBm à l’arrivée après ' + fN(L, 3) + ' km ; sensibilité ' + fN(s.sens) + ' dBm.',
        x: { min: 0, max: L, label: 'distance (km)' }, y: { min: ymin, max: ymax, ticks: TCL.plot.niceTicks(ymin, ymax, 6), zeroLine: false, label: 'puissance (dBm)' },
        series: [{ points: steps }], hlines: [{ y: s.sens, label: 'S = ' + fN(s.sens) + ' dBm', anchor: 'start' }], points: [{ x: L, y: b.pr, label: fN(b.pr, 3) + ' dBm' }] };
    });

    function refresh() {
      var r = F.ray(1, s.n1, s.n2, s.theta), b = bud(s), mg = b.pr - s.sens;
      var dt = F.modalDispersion(s.L, s.n1, s.n2);
      $('#fiber-svg').innerHTML = fiberSvg(s);
      chart.update();
      $('#expr').innerHTML = 'n₀ sin θ = n₁ sin θ<sub>cœur</sub> ; θc = arcsin(n₂/n₁) = ' + fN(r.critical, 3) + '°';
      var v1 = $('#verdict'); v1.className = 'verdict ' + (r.guided ? 'verdict--ok' : 'verdict--ko'); v1.innerHTML = TCL.icon(r.guided ? 'check' : 'x') + '<span>' + (r.guided ? 'Rayon guidé' : 'Rayon perdu') + '</span>';
      $('#expr2').innerHTML = 'Pr = Pe − α·L − pertes de raccordement = ' + fN(b.pr, 3) + ' dBm';
      var v2 = $('#verdict2'); v2.className = 'verdict ' + (mg >= 0 ? 'verdict--ok' : 'verdict--ko'); v2.innerHTML = TCL.icon(mg >= 0 ? 'check' : 'x') + '<span>' + (mg >= 0 ? 'Liaison possible' : 'Liaison impossible') + '</span>';
      K.setText(container, '#r-tc', fN(r.critical, 4) + '°');
      K.setText(container, '#r-na', fN(F.numericalAperture(s.n1, s.n2), 3));
      K.setText(container, '#r-ta', fN(F.acceptanceAngle(s.n1, s.n2), 3) + '°');
      K.setText(container, '#r-tin', fN(r.inCore, 3) + '°');
      K.setText(container, '#r-alpha', fN(r.incidence, 4) + '°');
      K.setText(container, '#r-pf', fN(b.fiber, 3) + ' dB');
      K.setText(container, '#r-pc', fN(b.splices + b.connectors, 3) + ' dB');
      K.setText(container, '#r-pt', fN(b.total, 3) + ' dB');
      K.setText(container, '#r-pr', fN(b.pr, 3) + ' dBm');
      K.setText(container, '#r-mg', db(mg));
      K.setText(container, '#r-lm', fN(lmax(s), 3) + ' km');
      K.setText(container, '#r-tt', fmtTime(F.transitTime(s.L, s.n1)));
      K.setText(container, '#r-dt', s.preset === 'mm850' || s.preset === 'custom' ? fmtTime(dt) : 'sans objet (monomode)');
      K.setText(container, '#r-br', s.preset === 'mm850' || s.preset === 'custom' ? rate(F.maxBitRate(dt)) : 'non limité par les modes');
      K.setText(container, '#r-prw', pw(b.pr));
      if (document.activeElement !== $('#in-preset')) $('#in-preset').value = s.preset;
      K.setText(container, '#in-theta-out', fN(s.theta, 3) + '°');
      K.setText(container, '#in-n1-out', fN(s.n1, 4));
      K.setText(container, '#in-n2-out', fN(s.n2, 4));
      K.setText(container, '#in-alpha-out', fN(s.alpha, 3) + ' dB/km');
      K.setText(container, '#in-L-out', fN(s.L, 3) + ' km');
      K.setText(container, '#in-splices-out', String(s.splices));
      K.setText(container, '#in-connectors-out', String(s.connectors));
      K.setText(container, '#in-pt-out', fN(s.pt) + ' dBm');
      K.setText(container, '#in-sens-out', fN(s.sens) + ' dBm');
      Object.keys(pairs).forEach(function (k) { pairs[k].sync(s[k]); });
      var html = tr.param() ? explain(tr.param(), tr.base(), s) : null;
      $('#explain').innerHTML = html || intro(s);
      save(s);
    }

    function set(name, value, single) {
      tr.before(name, s); s[name] = value;
      if (name === 'n1' && s.n2 >= s.n1) s.n2 = Math.round((s.n1 - 0.005) * 10000) / 10000;
      if ((name === 'alpha' || name === 'n1' || name === 'n2') && s.preset !== 'custom') s.preset = 'custom';
      refresh(); if (single) tr.end();
    }
    function pair(key, unit, dec, conv) {
      return K.bindPair(container, { id: 'in-' + key, validate: function (raw) {
        var r = K.numberValidator(LIM[key][0], LIM[key][1], unit, dec)(raw);
        if (r.ok && key === 'n2' && r.value >= s.n1) return { ok: false, message: 'L’indice de la gaine doit être inférieur à celui du cœur (' + fN(s.n1, 4) + ').' };
        return r;
      }, onInput: function (v) {
        if (key === 'n2' && v >= s.n1) v = Math.round((s.n1 - 0.0005) * 10000) / 10000;
        set(key, conv ? conv(v) : v);
      }, onEnd: function () { tr.end(); }, current: function () { return s[key]; } });
    }
    var pairs = { theta: pair('theta', '°', 2), n1: pair('n1', '', 4), n2: pair('n2', '', 4), alpha: pair('alpha', 'dB/km', 3), splices: pair('splices', '', 0, Math.round), connectors: pair('connectors', '', 0, Math.round), pt: pair('pt', 'dBm', 1), sens: pair('sens', 'dBm', 1),
      L: K.bindPair(container, { id: 'in-L', toSlider: function (km) { return logL.to(km); }, fromSlider: logL.from, validate: K.numberValidator(0.1, 100, 'km', 3), onInput: function (v) { set('L', v); }, onEnd: function () { tr.end(); }, current: function () { return s.L; } }) };
    $('#in-preset').addEventListener('change', function (e) {
      var k = e.target.value;
      tr.before('preset', s); s.preset = k;
      if (PRESETS[k]) { s.alpha = PRESETS[k].alpha; s.n1 = PRESETS[k].n1; s.n2 = PRESETS[k].n2; }
      refresh(); tr.end();
    });
    $('#lab-reset').addEventListener('click', function () {
      s = Object.assign({}, DEFAULTS); tr.reset(); Object.keys(pairs).forEach(function (k) { pairs[k].clear(); }); refresh();
      U.toast('Paramètres réinitialisés : fibre multimode à 850 nm, 2 km, rayon à 10°.', 'info');
    });

    K.bindMissions(container, ID, LABEL, missions, function () { return s; });
    refresh();
    return function () { chart.destroy(); };
  }

  function thumb() { return { html: '<div class="thumb-fiber">' + fiberSvg({ n1: 1.48, n2: 1.46, theta: 10 }) + '</div>' }; }

  TCL.fiberPlot = { fiberSvg: fiberSvg };
  TCL.labs = TCL.labs || {};
  TCL.labs[ID] = {
    id: ID, title: 'Fibre optique : guidage et bilan de puissance', short: LABEL, icon: 'fiber', mount: mount, missions: missions, thumb: thumb,
    summary: 'Tracez le trajet d’un rayon (réflexion totale interne, cône d’acceptance), puis établissez le bilan de puissance d’une liaison : atténuation, épissures, connecteurs, longueur maximale.',
    explain: explain, DEFAULTS: DEFAULTS, PRESETS: PRESETS
  };
})(window);
