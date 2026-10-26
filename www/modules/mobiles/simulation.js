/*
 * TELECOM CONNECT LAB — Laboratoire « Réseaux mobiles »
 * ----------------------------------------------------
 * Carte de cellules hexagonales avec leurs stations de base. L'étudiant
 * choisit le motif de réutilisation, le rayon des cellules et l'environnement,
 * puis déplace un téléphone sur la carte : cellule de service, puissance reçue,
 * interférences des cellules qui réutilisent les mêmes fréquences, transfert.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, Mo = TCL.mobileMath, U = TCL.util, K = TCL.labkit, esc = U.esc;
  var ID = 'mobiles', LABEL = 'Réseaux mobiles';

  var NS = [1, 3, 4, 7, 9, 12];
  var LIM = { R: [0.2, 10], n: [2, 5], S: [12, 420], pt: [30, 46], sens: [-110, -80], area: [10, 1000] };
  var G = 15, F = 900e6, RINGS_DRAW = 3, RINGS_CALC = 5, HO_MARGIN = 3;
  var DEFAULTS = { N: 7, R: 0.5, n: 3.5, S: 168, pt: 43, sens: -100, area: 100, mx: 0.45, my: 0.25, coverage: true, scenario: null };
  var SCENARIOS = {
    ville: { label: 'Centre-ville dense', set: { R: 0.5, n: 4, N: 7, area: 50 }, text: 'En ville, les bâtiments affaiblissent fortement le signal (exposant n ≈ 4) et les utilisateurs sont nombreux : on utilise de petites cellules (rayon 0,5 km) pour couvrir correctement et multiplier la capacité.' },
    rural: { label: 'Zone rurale', set: { R: 8, n: 3, N: 7, area: 1000 }, text: 'À la campagne, il y a peu d’obstacles (n ≈ 3) : le signal porte loin, et de grandes cellules de 8 km suffisent. On installe peu de stations pour une grande surface, mais la capacité totale est faible, ce qui convient à une population peu dense.' },
    stade: { label: 'Grand événement (stade)', set: { R: 0.2, n: 3.8, N: 3, area: 10 }, text: 'Dans un stade, des dizaines de milliers de personnes sont réunies : on installe de très petites cellules et on réutilise les fréquences plus souvent (N = 3) pour la capacité, au prix d’un rapport C/I plus faible.' }
  };
  var logR = K.logSlider(LIM.R[0], LIM.R[1]);
  var LETTERS = 'ABCDEFGHIJKL';

  function fN(v, s) { return M.formatNumber(v, s); }
  function km(x, s) { return M.formatLength(x * 1000, s || 3); }
  function params(s) { return { R: s.R, N: s.N, n: s.n, pt: s.pt, g: G, f: F, rings: RINGS_CALC }; }

  function analyse(s) {
    var meas = Mo.measure(params(s), s.mx * s.R, s.my * s.R);
    var dcov = Mo.coverageRadius(s.pt, G, s.sens, F, s.n) / 1000;
    return {
      Q: Mo.reuseRatio(s.N), D: Mo.reuseDistance(s.R, s.N), ci: Mo.toDb(Mo.carrierToInterference(s.N, s.n)),
      perCell: Mo.channelsPerCell(s.S, s.N), area: Mo.cellArea(s.R), cells: Mo.cellsToCover(s.area, s.R),
      dcov: dcov, covered: s.R <= dcov, meas: meas,
      handover: meas.second && meas.best.pr - meas.second.pr < HO_MARGIN
    };
  }

  /* ---------------------------------- Carte (SVG) ---------------------------------- */

  var RD = 34; // rayon d'une cellule à l'écran (unités SVG)
  function mapSvg(s, a) {
    var cells = Mo.grid(RINGS_DRAW, s.N), half = RD * Math.sqrt(3) / 2;
    var W = 2 * (RINGS_DRAW * Math.sqrt(3) * RD + half + RD * 0.9), H = 2 * (RINGS_DRAW * 1.5 * RD + RD + 26);
    var cx = W / 2, cy = H / 2 - 8, k = RD / s.R; // px par km
    var X = function (xkm) { return cx + xkm * k; }, Y = function (ykm) { return cy + ykm * k; };
    var serving = a.meas.best.cell;
    var out = ['<svg class="hexmap" viewBox="0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0) + '" role="application" aria-label="' + esc('Carte des cellules : motif N = ' + s.N + ', rayon ' + km(s.R) + '. Le téléphone est servi par la cellule ' + LETTERS[serving.group] + ' à ' + km(a.meas.best.d / 1000) + ' de sa station. Cliquez sur la carte ou utilisez les flèches pour déplacer le téléphone.') + '" tabindex="0" xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="scope__bg" x="0" y="0" width="' + W.toFixed(0) + '" height="' + H.toFixed(0) + '" rx="14"/>');
    out.push('<defs><clipPath id="hexclip"><rect x="0" y="0" width="' + W.toFixed(0) + '" height="' + H.toFixed(0) + '" rx="14"/></clipPath></defs><g clip-path="url(#hexclip)">');
    cells.forEach(function (c) {
      var p = Mo.axialToXY(c.q, c.r, s.R), px = X(p.x), py = Y(p.y), pts = [];
      for (var i = 0; i < 6; i++) { var an = Math.PI / 180 * (60 * i - 30); pts.push((px + RD * Math.cos(an)).toFixed(1) + ',' + (py + RD * Math.sin(an)).toFixed(1)); }
      var same = c.group === serving.group, isServ = c.q === serving.q && c.r === serving.r;
      out.push('<polygon class="hex hex--g' + (c.group % 12) + (same ? ' hex--same' : '') + (isServ ? ' hex--serving' : '') + '" points="' + pts.join(' ') + '"/>');
      out.push('<text class="hex__label' + (same ? ' hex__label--same' : '') + '" x="' + px.toFixed(1) + '" y="' + (py - 9).toFixed(1) + '" text-anchor="middle">' + LETTERS[c.group] + '</text>');
      out.push('<path class="hex__bs" d="M' + px.toFixed(1) + ' ' + (py + 1).toFixed(1) + ' l-4 9 h8 z M' + px.toFixed(1) + ' ' + (py + 1).toFixed(1) + ' v-3"/>');
    });
    if (s.coverage) {
      cells.filter(function (c) { return c.ring <= 1; }).forEach(function (c) {
        var p = Mo.axialToXY(c.q, c.r, s.R);
        out.push('<circle class="hex__cov' + (a.covered ? '' : ' hex__cov--short') + '" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + Math.min(4000, a.dcov * k).toFixed(1) + '"/>');
      });
    }
    // distance de réutilisation depuis la cellule de service
    var sp = Mo.axialToXY(serving.q, serving.r, s.R);
    if (s.N > 1) {
      var co = cells.filter(function (c) { return c.group === serving.group && !(c.q === serving.q && c.r === serving.r); })
        .map(function (c) { var p = Mo.axialToXY(c.q, c.r, s.R); return { p: p, d: Math.hypot(p.x - sp.x, p.y - sp.y) }; })
        .sort(function (u, v2) { return u.d - v2.d || u.p.y - v2.p.y; })[0];
      if (co) {
        out.push('<line class="hex__reuse" x1="' + X(sp.x).toFixed(1) + '" y1="' + Y(sp.y).toFixed(1) + '" x2="' + X(co.p.x).toFixed(1) + '" y2="' + Y(co.p.y).toFixed(1) + '"/>');
        var mx = (X(sp.x) + X(co.p.x)) / 2, my = (Y(sp.y) + Y(co.p.y)) / 2;
        out.push(TCL.plot.labelBox(mx, my, 'D = ' + km(a.D, 3).replace(/ /g, ' '), 'middle', 12, 'alt'));
      }
    }
    // téléphone et liens radio
    var mxp = X(s.mx * s.R), myp = Y(s.my * s.R), b = a.meas.best, sec = a.meas.second;
    out.push('<line class="hex__link" x1="' + mxp.toFixed(1) + '" y1="' + myp.toFixed(1) + '" x2="' + X(b.x).toFixed(1) + '" y2="' + Y(b.y).toFixed(1) + '"/>');
    if (sec) out.push('<line class="hex__link hex__link--2" x1="' + mxp.toFixed(1) + '" y1="' + myp.toFixed(1) + '" x2="' + X(sec.x).toFixed(1) + '" y2="' + Y(sec.y).toFixed(1) + '"/>');
    out.push('<g class="hex__phone' + (a.handover ? ' is-ho' : '') + '"><circle cx="' + mxp.toFixed(1) + '" cy="' + myp.toFixed(1) + '" r="9"/><rect x="' + (mxp - 3).toFixed(1) + '" y="' + (myp - 5).toFixed(1) + '" width="6" height="10" rx="1.5"/></g>');
    out.push('</g>');
    // échelle
    var barKm = TCL.plot.niceStep(s.R * 2, 1), barPx = barKm * k;
    out.push('<path class="hex__scale" d="M16 ' + (H - 16) + ' h' + barPx.toFixed(1) + ' M16 ' + (H - 21) + ' v10 M' + (16 + barPx).toFixed(1) + ' ' + (H - 21) + ' v10"/><text class="hex__scale-t" x="' + (22 + barPx).toFixed(1) + '" y="' + (H - 12) + '">' + km(barKm, 3) + '</text>');
    out.push('</svg>');
    return { svg: out.join(''), toKm: function (svgX, svgY) { return { x: (svgX - cx) / k / s.R, y: (svgY - cy) / k / s.R }; } };
  }

  var missions = [
    {
      id: 'm1', title: 'Le plus petit motif pour C/I ≥ 18 dB',
      text: 'En environnement urbain (exposant n = 4), choisissez le plus petit motif de réutilisation N qui garantit un rapport C/I d’au moins 18 dB.',
      check: function (s) {
        if (Math.abs(s.n - 4) > 0.05) return { ok: false, msg: 'Réglez d’abord l’exposant d’affaiblissement à n = 4.' };
        var ci = Mo.toDb(Mo.carrierToInterference(s.N, s.n));
        if (ci < 18) return { ok: false, msg: 'Avec N = ' + s.N + ', C/I = ' + fN(ci, 3) + ' dB : insuffisant. Augmentez N.' };
        if (s.N === Mo.minClusterFor(18, 4)) return { ok: true, msg: 'Réussi : N = 7 donne Q = √21 ≈ 4,58 et C/I = Q⁴/6 ≈ ' + fN(ci, 3) + ' dB. N = 4 ne donnerait que 13,8 dB.' };
        return { ok: false, msg: 'C/I = ' + fN(ci, 3) + ' dB convient, mais un motif plus petit suffirait (et donnerait plus de canaux par cellule).' };
      }
    },
    {
      id: 'm2', title: 'Couvrir 100 km² avec au plus 40 cellules',
      text: 'Choisissez un rayon de cellule qui couvre une ville de 100 km² avec au plus 40 cellules, sans trou de couverture (rayon ≤ portée calculée).',
      check: function (s) {
        var a = analyse(s), cells = Mo.cellsToCover(100, s.R);
        if (cells > 40) return { ok: false, msg: 'Il faudrait ' + cells + ' cellules de ' + km(s.R) + ' pour 100 km² : agrandissez les cellules.' };
        if (!a.covered) return { ok: false, msg: 'Avec un rayon de ' + km(s.R) + ', la portée (' + km(a.dcov) + ') est insuffisante : des zones ne sont pas couvertes. Réduisez le rayon, ou améliorez la portée (puissance, environnement).' };
        return { ok: true, msg: 'Réussi : ' + cells + ' cellules de ' + km(s.R) + ' (' + fN(Mo.cellArea(s.R), 3) + ' km² chacune), portée ' + km(a.dcov) + '.' };
      }
    },
    {
      id: 'm3', title: 'Se placer en zone de transfert',
      text: 'Déplacez le téléphone à la frontière de deux cellules, là où les deux meilleures stations sont reçues à moins de 1 dB d’écart : c’est la zone où le réseau transfère l’appel (handover).',
      check: function (s) {
        var a = analyse(s), gap = a.meas.best.pr - a.meas.second.pr;
        if (gap < 1) return { ok: true, msg: 'Réussi : écart de ' + fN(gap, 2) + ' dB entre les cellules ' + LETTERS[a.meas.best.cell.group] + ' et ' + LETTERS[a.meas.second.cell.group] + '. Le réseau compare en permanence ces mesures pour décider du transfert, avec une marge (hystérésis) pour éviter les allers-retours.' };
        return { ok: false, msg: 'Écart actuel : ' + fN(gap, 3) + ' dB. Rapprochez le téléphone de la limite entre deux cellules (à mi-chemin de deux stations).' };
      }
    }
  ];

  /* ------------------------------- Explications ------------------------------- */

  function explain(param, b, s) {
    var a0 = analyse(b), a1 = analyse(s);
    if (param === 'N') {
      if (b.N === s.N) return null;
      var sh = Mo.shiftFor(s.N);
      return '<p>Le motif passe de ' + b.N + ' à <strong>N = ' + s.N + '</strong> (i = ' + sh[0] + ', j = ' + sh[1] + ' : N = i² + ij + j²). Les fréquences disponibles sont partagées en ' + s.N + ' groupe' + (s.N > 1 ? 's' : '') + ' (lettres sur la carte).</p>' +
        '<p>Distance de réutilisation D = R√(3N) = <strong>' + km(a1.D) + '</strong>, d’où C/I ≈ Q<sup>n</sup>/6 = <strong>' + fN(a1.ci, 3) + ' dB</strong> (contre ' + fN(a0.ci, 3) + ' dB). Mais chaque cellule ne dispose plus que de ' + a1.perCell + ' canaux (contre ' + a0.perCell + ') : ' + (s.N > b.N ? 'moins d’interférences, mais moins de capacité.' : 'plus de capacité, mais plus d’interférences.') + '</p>';
    }
    if (param === 'R') {
      if (b.R === s.R) return null;
      return '<p>Le rayon des cellules passe de ' + km(b.R) + ' à <strong>' + km(s.R) + '</strong>. Surface d’une cellule : ' + fN(a1.area, 3) + ' km² ; il faut <strong>' + a1.cells + ' cellules</strong> pour couvrir ' + fN(s.area) + ' km² (contre ' + a0.cells + ').</p>' +
        '<p>' + (s.R < b.R ? 'Des cellules plus petites coûtent plus de stations, mais chaque canal est réutilisé plus souvent sur le territoire : la capacité totale augmente (' + fN(a1.cells * a1.perCell) + ' communications simultanées possibles sur la zone).' : 'Des cellules plus grandes réduisent le nombre de stations, mais la capacité totale diminue (' + fN(a1.cells * a1.perCell) + ' communications simultanées sur la zone).') +
        (a1.covered ? '' : ' <strong>Attention</strong> : le rayon dépasse la portée calculée (' + km(a1.dcov) + ') : des zones ne sont pas couvertes.') + ' Le rapport C/I ne change pas : il ne dépend que de D/R.</p>';
    }
    if (param === 'n') {
      if (b.n === s.n) return null;
      return '<p>L’exposant d’affaiblissement passe à <strong>n = ' + fN(s.n) + '</strong> (2 : espace libre ; 3 à 4 : zone urbaine ; jusqu’à 5 : ville très dense). Le signal décroît plus vite avec la distance : la portée devient ' + km(a1.dcov) + '. Les cellules lointaines qui réutilisent les mêmes fréquences gênent aussi moins : C/I = ' + fN(a1.ci, 3) + ' dB.</p>';
    }
    if (param === 'S') {
      if (b.S === s.S) return null;
      return '<p>L’opérateur dispose de <strong>' + s.S + ' canaux</strong> au total. Avec N = ' + s.N + ', chaque cellule en reçoit ' + a1.perCell + ' : autant de communications simultanées par cellule (un canal par communication dans ce modèle simple).</p>';
    }
    if (param === 'pt' || param === 'sens') {
      if (b[param] === s[param]) return null;
      return '<p>' + (param === 'pt' ? 'Puissance d’émission de la station : <strong>' + fN(s.pt) + ' dBm</strong> (' + fN(Math.pow(10, s.pt / 10) / 1000, 3) + ' W).' : 'Sensibilité du téléphone : <strong>' + fN(s.sens) + ' dBm</strong>.') + ' Portée calculée : ' + km(a1.dcov) + (a1.covered ? ', suffisante pour des cellules de ' + km(s.R) + '.' : ', trop faible pour des cellules de ' + km(s.R) + ' : des trous de couverture apparaissent.') + '</p>';
    }
    if (param === 'area') {
      if (b.area === s.area) return null;
      return '<p>Zone à couvrir : <strong>' + fN(s.area) + ' km²</strong>, soit ' + a1.cells + ' cellules de ' + km(s.R) + '.</p>';
    }
    if (param === 'pos') {
      var m = a1.meas;
      return '<p>Le téléphone est servi par la cellule <strong>' + LETTERS[m.best.cell.group] + '</strong>, dont la station est à ' + km(m.best.d / 1000) + ' : puissance reçue <strong>' + fN(m.best.pr, 3) + ' dBm</strong>' + (m.best.pr >= s.sens ? '' : ' (sous la sensibilité : pas de service)') + '.</p>' +
        '<p>Les ' + m.interferers + ' stations du même groupe de fréquences (contour clair) créent des interférences : rapport signal/interférences à cet endroit ≈ <strong>' + fN(m.sirDb, 3) + ' dB</strong>. ' + (a1.handover ? 'Les deux meilleures stations sont reçues à moins de ' + HO_MARGIN + ' dB d’écart : le téléphone est en <strong>zone de transfert</strong>.' : 'Deuxième meilleure station : ' + fN(m.second.pr, 3) + ' dBm.') + '</p>';
    }
    if (param === 'scenario' && s.scenario) return '<p><strong>' + esc(SCENARIOS[s.scenario].label) + '</strong> : ' + esc(SCENARIOS[s.scenario].text) + '</p><p>C/I = ' + fN(a1.ci, 3) + ' dB, ' + a1.perCell + ' canaux par cellule, ' + a1.cells + ' cellules pour ' + fN(s.area) + ' km², portée ' + km(a1.dcov) + '.</p>';
    if (param === 'coverage') return '<p>Les cercles en pointillés montrent la portée calculée de quelques stations (' + km(a1.dcov) + '). ' + (a1.covered ? 'Ils se chevauchent : la zone est entièrement couverte, et ce chevauchement permet les transferts.' : 'Ils ne se rejoignent pas : il reste des trous de couverture.') + '</p>';
    return null;
  }

  function intro(s) {
    var a = analyse(s);
    return '<p>Cliquez sur la carte (ou utilisez les flèches du clavier) pour déplacer le téléphone, puis modifiez les paramètres : l’explication s’adaptera.</p><p>Réglage actuel : motif N = ' + s.N + ', cellules de ' + km(s.R) + ', D = ' + km(a.D) + ', C/I = ' + fN(a.ci, 3) + ' dB, ' + a.perCell + ' canaux par cellule. Le téléphone reçoit ' + fN(a.meas.best.pr, 3) + ' dBm de la cellule ' + LETTERS[a.meas.best.cell.group] + '.</p>';
  }

  /* ------------------------------------ Page ------------------------------------ */

  function sanitize(p) {
    var o = {};
    Object.keys(LIM).forEach(function (k) { if (isFinite(p[k]) && p[k] >= LIM[k][0] && p[k] <= LIM[k][1]) o[k] = Number(p[k]); });
    if (NS.indexOf(Number(p.N)) >= 0) o.N = Number(p.N);
    if (isFinite(p.mx) && Math.abs(p.mx) <= 6 && isFinite(p.my) && Math.abs(p.my) <= 6) { o.mx = Number(p.mx); o.my = Number(p.my); }
    if (typeof p.coverage === 'boolean') o.coverage = p.coverage;
    return o;
  }

  function mount(container) {
    var s = K.loadParams(ID, DEFAULTS, sanitize);
    s.scenario = null;
    var tr = K.tracker(), save = K.paramSaver(ID), map = null;
    var stopDrag = function () { if (dragging) { dragging = false; tr.end(); } };
    root.addEventListener('pointerup', stopDrag);
    root.addEventListener('pointercancel', stopDrag);

    container.innerHTML = [
      '<div class="lab">',
      K.head({ title: 'Laboratoire : réseaux mobiles et cellules', badge: 'Modèle pédagogique : cellules hexagonales, affaiblissement moyen', text: 'Explorez la couverture d’un réseau mobile : réglez le motif de réutilisation des fréquences et la taille des cellules, puis déplacez un téléphone pour voir quelle station le sert.' }),
      '<div class="lab__grid"><div class="lab__main">',
      '<div class="scope-panel"><div class="scope-panel__bar"><p class="scope-panel__expr" id="expr"></p><p class="verdict" id="verdict" aria-live="polite"></p></div><div id="hexmap" class="hexmap-host"></div>',
      '<p class="scope-panel__cursor" id="map-note">Cliquez ou glissez sur la carte pour placer le téléphone. Les lettres indiquent le groupe de fréquences de chaque cellule ; les cellules surlignées réutilisent les fréquences de votre cellule.</p></div>',
      K.readouts([['Rapport Q = D/R = √(3N)', 'r-q'], ['Distance de réutilisation D', 'r-d'], ['C/I (1re couronne)', 'r-ci'], ['Canaux par cellule', 'r-ch'], ['Surface d’une cellule', 'r-a'],
        ['Cellules pour la zone', 'r-cells'], ['Communications simultanées (zone)', 'r-cap'], ['Portée calculée', 'r-cov'], ['Cellule de service', 'r-serv'], ['Puissance reçue', 'r-pr'],
        ['Distance à la station', 'r-dist'], ['Signal / interférences au téléphone', 'r-sir'], ['Deuxième station', 'r-2nd'], ['Transfert (handover)', 'r-ho'], ['Couverture', 'r-ok']]),
      K.explainBox(''),
      '</div>',
      '<aside class="lab__controls" aria-label="Commandes de la simulation"><form class="controls" onsubmit="return false" novalidate>',
      '<div class="control"><p class="control__label">Scénarios</p>' + K.chips('Scénarios pédagogiques', Object.keys(SCENARIOS).map(function (k) { return [k, SCENARIOS[k].label]; }), 'scenario') + '</div>',
      K.select({ id: 'in-N', label: 'Motif de réutilisation <var>N</var>', options: NS.map(function (n) { var sh = Mo.shiftFor(n); return [String(n), 'N = ' + n + ' (i = ' + sh[0] + ', j = ' + sh[1] + ')']; }), hint: 'Nombre de cellules entre lesquelles on partage les fréquences.' }),
      K.range({ id: 'in-R', label: 'Rayon des cellules <var>R</var>', min: 0, max: 1000, step: 1, unit: 'km', srLabel: 'Rayon en kilomètres', hint: 'De 0,2 à 10 km (curseur logarithmique).' }),
      K.range({ id: 'in-n', label: 'Exposant d’affaiblissement <var>n</var>', min: 2, max: 5, step: 0.1, unit: '', srLabel: 'Exposant d’affaiblissement', hint: '2 : espace libre ; 3 à 4 : zone urbaine ; 5 : ville très dense.' }),
      K.range({ id: 'in-S', label: 'Canaux disponibles <var>S</var>', min: 12, max: 420, step: 12, unit: '', srLabel: 'Nombre total de canaux', hint: 'Canaux attribués à l’opérateur, partagés entre les N cellules du motif.' }),
      K.range({ id: 'in-pt', label: 'Puissance de la station <var>P</var><sub>t</sub>', min: 30, max: 46, step: 1, unit: 'dBm', srLabel: 'Puissance en dBm', hint: 'De 1 W (30 dBm) à 40 W (46 dBm). Antenne de ' + G + ' dBi, ' + M.formatFrequency(F) + '.' }),
      K.range({ id: 'in-sens', label: 'Sensibilité du téléphone <var>S</var>', min: -110, max: -80, step: 1, unit: 'dBm', srLabel: 'Sensibilité en dBm', hint: 'Puissance minimale pour garder la communication.' }),
      K.range({ id: 'in-area', label: 'Zone à couvrir', min: 10, max: 1000, step: 10, unit: 'km²', srLabel: 'Surface en kilomètres carrés', hint: 'Surface de la ville ou de la région.' }),
      '<div class="control control--checks"><label class="check"><input type="checkbox" id="in-cov"><span>Afficher la portée des stations</span></label></div>',
      '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + TCL.icon('reset') + 'Réinitialiser</button>',
      '</form></aside></div>',
      K.missionsSection(missions),
      K.limits('<p>Les cellules sont des hexagones parfaits et la puissance reçue suit un affaiblissement moyen en 10·n·log(d) : le relief, les bâtiments et l’évanouissement (fading) ne sont pas représentés, alors qu’ils déforment fortement les cellules réelles. Le C/I « 1re couronne » suppose six interférents à la distance D ; le rapport signal/interférences au téléphone additionne toutes les stations du même groupe dans un rayon de 5 couronnes. Un canal correspond ici à une communication ; les réseaux 4G et 5G partagent en réalité leurs ressources de façon dynamique entre les utilisateurs, et réutilisent souvent les mêmes fréquences dans toutes les cellules (N = 1) grâce au codage et à la coordination des interférences.</p>'),
      K.sequenceLinks(ID),
      '</div>'
    ].join('');
    var $ = function (sel) { return container.querySelector(sel); };

    function refresh() {
      var a = analyse(s), m = a.meas;
      map = mapSvg(s, a);
      $('#hexmap').innerHTML = map.svg;
      bindMap();
      $('#expr').innerHTML = 'N = ' + s.N + ' ; D = R√(3N) = ' + km(a.D) + ' ; C/I = (D/R)<sup>' + fN(s.n) + '</sup>/6 = ' + fN(a.ci, 3) + ' dB';
      var ok = m.best.pr >= s.sens, v = $('#verdict');
      v.className = 'verdict ' + (ok ? (a.handover ? 'verdict--warn' : 'verdict--ok') : 'verdict--ko');
      v.innerHTML = TCL.icon(ok ? (a.handover ? 'mobile' : 'check') : 'x') + '<span>' + (ok ? (a.handover ? 'Zone de transfert' : 'Téléphone servi') : 'Pas de service') + '</span>';
      K.setText(container, '#r-q', fN(a.Q, 3));
      K.setText(container, '#r-d', km(a.D));
      K.setText(container, '#r-ci', fN(a.ci, 3) + ' dB');
      K.setText(container, '#r-ch', String(a.perCell));
      K.setText(container, '#r-a', fN(a.area, 3) + ' km²');
      K.setText(container, '#r-cells', String(a.cells));
      K.setText(container, '#r-cap', fN(a.cells * a.perCell));
      K.setText(container, '#r-cov', km(a.dcov));
      K.setText(container, '#r-serv', 'cellule ' + LETTERS[m.best.cell.group]);
      K.setText(container, '#r-pr', fN(m.best.pr, 3) + ' dBm');
      K.setText(container, '#r-dist', km(m.best.d / 1000));
      K.setText(container, '#r-sir', fN(m.sirDb, 3) + ' dB');
      K.setText(container, '#r-2nd', LETTERS[m.second.cell.group] + ' : ' + fN(m.second.pr, 3) + ' dBm');
      K.setText(container, '#r-ho', a.handover ? 'oui (écart ' + fN(m.best.pr - m.second.pr, 2) + ' dB)' : 'non');
      K.setText(container, '#r-ok', a.covered ? 'complète' : 'trous de couverture');
      if (document.activeElement !== $('#in-N')) $('#in-N').value = String(s.N);
      $('#in-cov').checked = s.coverage;
      K.setText(container, '#in-R-out', km(s.R));
      K.setText(container, '#in-n-out', fN(s.n));
      K.setText(container, '#in-S-out', String(s.S));
      K.setText(container, '#in-pt-out', fN(s.pt) + ' dBm');
      K.setText(container, '#in-sens-out', fN(s.sens) + ' dBm');
      K.setText(container, '#in-area-out', fN(s.area) + ' km²');
      pairs.R.sync(s.R); pairs.n.sync(s.n); pairs.S.sync(s.S); pairs.pt.sync(s.pt); pairs.sens.sync(s.sens); pairs.area.sync(s.area);
      var html = tr.param() ? explain(tr.param(), tr.base(), s) : null;
      $('#explain').innerHTML = html || intro(s);
      save(s);
    }

    var dragging = false;
    function moveTo(ev) {
      var svg = $('#hexmap svg'); if (!svg) return;
      var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      var loc = pt.matrixTransform(svg.getScreenCTM().inverse()), p = map.toKm(loc.x, loc.y);
      var lim = RINGS_DRAW * 1.6;
      set('pos', null, false, function () { s.mx = Math.max(-lim, Math.min(lim, p.x)); s.my = Math.max(-lim, Math.min(lim, p.y)); });
    }
    function bindMap() {
      var svg = $('#hexmap svg');
      svg.addEventListener('pointerdown', function (ev) { dragging = true; try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } moveTo(ev); });
      svg.addEventListener('pointermove', function (ev) { if (dragging) moveTo(ev); });
      svg.addEventListener('pointerup', function () { dragging = false; tr.end(); });
      svg.addEventListener('keydown', function (ev) {
        var d = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[ev.key];
        if (!d) return;
        ev.preventDefault();
        set('pos', null, true, function () { s.mx += d[0]; s.my += d[1]; });
        $('#hexmap svg').focus();
      });
    }

    function set(name, value, single, mutate) {
      tr.before(name, s);
      if (mutate) mutate(); else s[name] = value;
      if (name !== 'scenario') s.scenario = null;
      refresh(); if (single) tr.end();
    }
    function pair(key, unit, dec) {
      return K.bindPair(container, { id: 'in-' + key, validate: K.numberValidator(LIM[key][0], LIM[key][1], unit, dec), onInput: function (v) { set(key, v); }, onEnd: function () { tr.end(); }, current: function () { return s[key]; } });
    }
    var pairs = {
      n: pair('n', '', 2), S: pair('S', 'canaux', 0), pt: pair('pt', 'dBm', 1), sens: pair('sens', 'dBm', 1), area: pair('area', 'km²', 0),
      R: K.bindPair(container, { id: 'in-R', toSlider: logR.to, fromSlider: logR.from, validate: K.numberValidator(0.2, 10, 'km', 3), onInput: function (v) { set('R', v); }, onEnd: function () { tr.end(); }, current: function () { return s.R; } })
    };
    $('#in-N').addEventListener('change', function (e) { set('N', Number(e.target.value), true); });
    $('#in-cov').addEventListener('change', function (e) { set('coverage', e.target.checked, true); });
    U.qsa('[data-scenario]', container).forEach(function (b) {
      b.addEventListener('click', function () {
        var sc = SCENARIOS[b.getAttribute('data-scenario')];
        set('scenario', null, true, function () { Object.assign(s, sc.set); s.scenario = b.getAttribute('data-scenario'); });
      });
    });
    $('#lab-reset').addEventListener('click', function () {
      s = Object.assign({}, DEFAULTS); tr.reset(); Object.keys(pairs).forEach(function (k) { pairs[k].clear(); }); refresh();
      U.toast('Paramètres réinitialisés : N = 7, cellules de 500 m, n = 3,5.', 'info');
    });

    K.bindMissions(container, ID, LABEL, missions, function () { return s; });
    refresh();
    return function () { root.removeEventListener('pointerup', stopDrag); root.removeEventListener('pointercancel', stopDrag); };
  }

  function thumb() { var s = Object.assign({}, DEFAULTS); return { html: '<div class="thumb-hex">' + mapSvg(s, analyse(s)).svg.replace('tabindex="0"', '').replace('role="application"', 'role="img"') + '</div>' }; }

  TCL.mobilePlot = { mapSvg: mapSvg, analyse: analyse, LETTERS: LETTERS };
  TCL.labs = TCL.labs || {};
  TCL.labs[ID] = {
    id: ID, title: 'Réseaux mobiles : cellules et réutilisation des fréquences', short: LABEL, icon: 'mobile', mount: mount, missions: missions, thumb: thumb,
    summary: 'Carte interactive de cellules : motif de réutilisation, distance de réutilisation, C/I, capacité, couverture et transfert d’un téléphone que vous déplacez.',
    explain: explain, analyse: analyse, DEFAULTS: DEFAULTS, SCENARIOS: SCENARIOS
  };
})(window);
