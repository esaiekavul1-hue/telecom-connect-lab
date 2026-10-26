/*
 * TELECOM CONNECT LAB — Laboratoire « Propagation radio et atténuation »
 * --------------------------------------------------------------------
 * Bilan de liaison : de la puissance émise à la puissance reçue, comparaison
 * avec la sensibilité du récepteur, portée maximale. Deux modèles :
 *   - espace libre (formule de Friis) ;
 *   - deux rayons : rayon direct + rayon réfléchi par le sol.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, P = TCL.propMath, U = TCL.util, K = TCL.labkit, esc = U.esc;
  var ID = 'propagation', LABEL = 'Propagation radio';

  var LIM = { pt: [0, 50], gt: [0, 30], gr: [0, 30], f: [100e6, 6e9], d: [10, 100000], loss: [0, 60], sens: [-130, -40], ht: [2, 100], hr: [1, 30], oh: [-40, 60], ox: [0.05, 0.95] };
  var DEFAULTS = { model: 'libre', pt: 30, gt: 6, gr: 2, f: 900e6, d: 5000, loss: 0, sens: -90, ht: 30, hr: 1.5, obs: 'non', oh: 0, ox: 0.5 };
  /* Fonctions qui tiennent compte du modèle choisi */
  /** Perte de diffraction (dB) due à l'obstacle, pour une liaison de longueur d. */
  function nuAt(s, d) { return P.knifeEdgeNu(s.oh, s.ox * d, (1 - s.ox) * d, s.f); }
  function diffAt(s, d) { return s.obs === 'oui' ? P.knifeEdgeLoss(nuAt(s, d)) : 0; }
  function prAt(s, d) { var q = Object.assign({}, s, { d: d }); return (s.model === 'sol' ? P.receivedTwoRay(q) : P.received(q)) - diffAt(s, d); }
  function prOf(s) { return prAt(s, s.d); }
  function marginOf(s) { return prOf(s) - s.sens; }
  function rangeOf(s) {
    if (s.obs === 'oui') return P.maxRangeFn(function (d) { return prAt(s, d) >= s.sens; });
    return s.model === 'sol' ? P.maxRangeTwoRay(s) : P.maxRange(s);
  }
  function fresnelAt(s) { return P.fresnelRadius(s.f, s.ox * s.d, (1 - s.ox) * s.d); }
  var LOSSES = [['0', 'Aucun'], ['3', 'Vitre (≈ 3 dB)'], ['6', 'Cloison (≈ 6 dB)'], ['10', 'Arbres (≈ 10 dB)'], ['15', 'Mur en béton (≈ 15 dB)'], ['20', 'Entrée dans un bâtiment (≈ 20 dB)']];
  function pathLossOf(s) { return s.model === 'sol' ? P.twoRayLoss(s.d, s.f, s.ht, s.hr) : P.fspl(s.d, s.f); }
  var PRESETS = [[900e6, '900 MHz'], [1800e6, '1 800 MHz'], [2.4e9, '2,4 GHz'], [3.5e9, '3,5 GHz'], [5.8e9, '5,8 GHz']];
  var logF = K.logSlider(LIM.f[0], LIM.f[1]);
  var logD = K.logSlider(LIM.d[0], LIM.d[1]);
  var PR_REF = P.received(Object.assign({}, DEFAULTS));

  function fN(v, s) { return M.formatNumber(v, s); }
  function db(v, s) { return (v > 0 ? '+' : '') + fN(v, s || 4) + ' dB'; }
  function dbm(v) { return fN(v, 4) + ' dBm'; }

  /** Puissance en watts, dans l'unité la plus lisible. */
  function watts(w) {
    var u = [[1, 'W'], [1e-3, 'mW'], [1e-6, 'µW'], [1e-9, 'nW'], [1e-12, 'pW'], [1e-15, 'fW']];
    for (var i = 0; i < u.length; i++) if (w >= u[i][0] * 0.9995) return fN(w / u[i][0], 3) + ' ' + u[i][1];
    var e = Math.floor(Math.log10(w));
    return fN(w / Math.pow(10, e), 3) + '×10' + String(e).replace('-', '⁻').replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]; }) + ' W';
  }

  var missions = [
    {
      id: 'm1', title: 'À la limite de la portée',
      text: 'Réglez la distance pour que la puissance reçue soit égale à la sensibilité du récepteur (marge de 0 dB, à ±0,5 dB près).',
      check: function (s) {
        var mg = marginOf(s);
        if (Math.abs(mg) <= 0.5) return { ok: true, msg: 'Réussi : à ' + M.formatLength(s.d, 4) + ', Pr = ' + dbm(prOf(s)) + ' ≈ S. C’est la limite de portée (portée maximale calculée : ' + M.formatLength(rangeOf(s), 4) + ').' };
        return { ok: false, msg: 'Marge actuelle : ' + db(mg, 3) + '. ' + (mg > 0 ? 'Le signal est encore assez fort : éloignez le récepteur.' : 'Le signal est trop faible : rapprochez le récepteur.') + ' Le champ « Distance » permet un réglage précis.' };
      }
    },
    {
      id: 'm2', title: 'Passer à 1 800 MHz sans perdre de signal',
      text: 'Passez à 1 800 MHz et retrouvez au moins la puissance reçue du réglage de départ (' + M.formatNumber(PR_REF, 4) + ' dBm) en agissant sur d’autres paramètres.',
      check: function (s) {
        if (!M.approxEqual(s.f, 1800e6, 0.01)) return { ok: false, msg: 'La fréquence doit être 1 800 MHz (actuellement ' + M.formatFrequency(s.f, 4) + ').' };
        var pr = prOf(s);
        if (pr >= PR_REF - 0.05) return { ok: true, msg: 'Réussi : Pr = ' + dbm(pr) + '. Doubler la fréquence ajoute 20 log₁₀(2) ≈ 6 dB d’affaiblissement : il a fallu les compenser (gains, puissance ou distance).' };
        return { ok: false, msg: 'Pr = ' + dbm(pr) + ', il manque ' + fN(PR_REF - pr, 3) + ' dB. Doubler f coûte environ 6 dB.' };
      }
    },
    {
      id: 'm3', title: 'Une liaison de 10 km malgré les obstacles',
      text: 'Avec au moins 20 dB de pertes supplémentaires et une distance d’au moins 10 km, obtenez une marge positive.',
      check: function (s) {
        if (s.loss < 20) return { ok: false, msg: 'Réglez d’abord les pertes supplémentaires à 20 dB ou plus.' };
        if (s.d < 9999) return { ok: false, msg: 'La distance doit être d’au moins 10 km (actuellement ' + M.formatLength(s.d, 4) + ').' };
        var mg = marginOf(s);
        if (mg >= 0) return { ok: true, msg: 'Réussi : marge de ' + db(mg, 3) + ' à ' + M.formatLength(s.d, 4) + ' avec ' + fN(s.loss) + ' dB de pertes.' };
        return { ok: false, msg: 'Marge actuelle : ' + db(mg, 3) + '. Augmentez la puissance ou les gains d’antenne, ou choisissez un récepteur plus sensible.' };
      }
    },
    {
      id: 'm4', title: 'Un creux dû à la réflexion sur le sol',
      text: 'Choisissez le modèle « deux rayons » et trouvez une distance où le rayon réfléchi annule presque le rayon direct : au moins 10 dB de moins qu’en espace libre.',
      check: function (s) {
        if (s.model !== 'sol') return { ok: false, msg: 'Choisissez d’abord le modèle « Avec réflexion sur le sol ».' };
        var gap = P.received(s) - P.receivedTwoRay(s);
        if (gap >= 10) return { ok: true, msg: 'Réussi : à ' + M.formatLength(s.d, 4) + ', les deux rayons arrivent presque en opposition de phase : la puissance reçue est ' + fN(gap, 3) + ' dB sous celle de l’espace libre. Ces creux se trouvent avant la distance de rupture (' + M.formatLength(P.breakpoint(s.f, s.ht, s.hr), 3) + ').' };
        return { ok: false, msg: 'Écart actuel avec l’espace libre : ' + db(-gap, 3) + '. Cherchez à une distance inférieure à la distance de rupture (' + M.formatLength(P.breakpoint(s.f, s.ht, s.hr), 3) + '), en déplaçant lentement la distance.' };
      }
    },
    {
      id: 'm5', title: 'Dégager la zone de Fresnel',
      text: 'Activez l’obstacle. Placez son sommet sous la ligne directe, mais à l’intérieur de la première zone de Fresnel, avec une perte de diffraction inférieure à 1 dB.',
      check: function (s) {
        if (s.obs !== 'oui') return { ok: false, msg: 'Activez d’abord l’obstacle.' };
        var F1 = fresnelAt(s), J = diffAt(s, s.d);
        if (s.oh >= 0) return { ok: false, msg: 'Le sommet est sur ou au-dessus de la ligne directe : perte de ' + fN(J, 3) + ' dB. Abaissez l’obstacle (hauteur négative).' };
        if (-s.oh >= F1) return { ok: false, msg: 'Le sommet est à ' + fN(-s.oh, 3) + ' m sous la ligne, hors de la première zone de Fresnel (rayon ' + fN(F1, 3) + ' m) : aucune perte, mais cherchez plus près de la ligne directe.' };
        if (J < 1) return { ok: true, msg: 'Réussi : dégagement de ' + fN(-s.oh, 3) + ' m, soit ' + fN(-s.oh / F1 * 100, 2) + ' % du rayon de Fresnel (' + fN(F1, 3) + ' m), pour ' + fN(J, 2) + ' dB de perte. Règle pratique : dégager environ 60 % de la première zone de Fresnel suffit.' };
        return { ok: false, msg: 'Perte de diffraction : ' + fN(J, 3) + ' dB pour un dégagement de ' + fN(-s.oh / F1 * 100, 2) + ' % de la zone de Fresnel. Abaissez encore un peu l’obstacle.' };
      }
    }
  ];

  /* --------------------------- Explications dynamiques --------------------------- */

  function explain(param, b, s) {
    var pr0 = prOf(b), pr1 = prOf(s), dpr = pr1 - pr0;
    var tail = '<p>Puissance reçue : ' + dbm(pr0) + ' → <strong>' + dbm(pr1) + '</strong> (' + db(dpr, 3) + '). Marge : <strong>' + db(marginOf(s), 3) + '</strong>' + (marginOf(s) >= 0 ? ', la liaison fonctionne.' : ', la liaison ne fonctionne pas.') + '</p>';
    if (param === 'model') {
      if (b.model === s.model) return null;
      if (s.model === 'sol') {
        var bp = P.breakpoint(s.f, s.ht, s.hr);
        return '<p>Modèle à <strong>deux rayons</strong> : le récepteur reçoit le rayon direct et un rayon réfléchi par le sol. Selon la différence de trajet, ils s’additionnent ou s’annulent : la courbe oscille (creux et bosses).</p>' +
          '<p>Au-delà de la distance de rupture d<sub>c</sub> = 4·ht·hr/λ = <strong>' + M.formatLength(bp, 3) + '</strong>, les deux rayons s’annulent de plus en plus : la puissance décroît d’environ 40 dB par décade (12 dB quand la distance double), au lieu de 20 dB en espace libre.</p>' + tail;
      }
      return '<p>Retour au modèle d’<strong>espace libre</strong> : un seul trajet direct, sans sol. La puissance décroît de 20 dB par décade.</p>' + tail;
    }
    if (param === 'ht' || param === 'hr') {
      if (b[param] === s[param]) return null;
      return '<p>La hauteur de l’antenne ' + (param === 'ht' ? 'd’émission' : 'de réception') + ' passe de ' + fN(b[param]) + ' m à <strong>' + fN(s[param]) + ' m</strong>. La distance de rupture devient ' + M.formatLength(P.breakpoint(s.f, s.ht, s.hr), 3) + ' et l’horizon radioélectrique ' + M.formatLength(P.radioHorizon(s.ht, s.hr), 3) + '. Au-delà de la rupture, doubler une hauteur fait gagner 6 dB : c’est pourquoi les antennes sont placées en hauteur.</p>' + tail;
    }
    if (param === 'd' || param === 'f') {
      if (b[param] === s[param]) return null;
      var r = s[param] / b[param], dl = P.deltaDb(r);
      if (s.model === 'sol') {
        return '<p>' + (param === 'd' ? 'La distance passe de ' + M.formatLength(b.d, 4) + ' à <strong>' + M.formatLength(s.d, 4) + '</strong>' : 'La fréquence passe de ' + M.formatFrequency(b.f, 4) + ' à <strong>' + M.formatFrequency(s.f, 4) + '</strong>') + '.</p>' +
          '<p>Avec la réflexion sur le sol, l’affaiblissement passe de ' + fN(pathLossOf(b), 4) + ' dB à ' + fN(pathLossOf(s), 4) + ' dB (espace libre seul : ' + fN(P.fspl(s.d, s.f), 4) + ' dB). ' +
          (s.d > P.breakpoint(s.f, s.ht, s.hr) ? 'Vous êtes au-delà de la distance de rupture (' + M.formatLength(P.breakpoint(s.f, s.ht, s.hr), 3) + ') : la puissance décroît d’environ 40 dB par décade.' : 'Vous êtes en deçà de la distance de rupture (' + M.formatLength(P.breakpoint(s.f, s.ht, s.hr), 3) + ') : les deux rayons créent des creux et des bosses autour de la courbe d’espace libre.') + '</p>' + tail;
      }
      var what = param === 'd' ? 'La distance passe de ' + M.formatLength(b.d, 4) + ' à <strong>' + M.formatLength(s.d, 4) + '</strong>' : 'La fréquence passe de ' + M.formatFrequency(b.f, 4) + ' à <strong>' + M.formatFrequency(s.f, 4) + '</strong>';
      return '<p>' + what + ' (× ' + fN(r, 3) + ').</p>' +
        '<p>L’affaiblissement en espace libre varie de 20 log₁₀(' + fN(r, 3) + ') = <strong>' + db(dl, 3) + '</strong> : il passe de ' + fN(P.fspl(b.d, b.f), 4) + ' dB à ' + fN(P.fspl(s.d, s.f), 4) + ' dB. ' +
        'À retenir : doubler la ' + (param === 'd' ? 'distance' : 'fréquence') + ' coûte environ 6 dB, la multiplier par 10 coûte 20 dB.</p>' + tail;
    }
    if (param === 'pt') {
      if (b.pt === s.pt) return null;
      return '<p>La puissance d’émission passe de ' + dbm(b.pt) + ' (' + watts(P.dbmToWatt(b.pt)) + ') à <strong>' + dbm(s.pt) + ' (' + watts(P.dbmToWatt(s.pt)) + ')</strong>. ' +
        'En décibels, les puissances s’additionnent : +3 dB correspond à une puissance doublée, +10 dB à une puissance multipliée par 10.</p>' + tail +
        '<p>La portée maximale devient ' + M.formatLength(rangeOf(s), 4) + '.</p>';
    }
    if (param === 'gt' || param === 'gr') {
      if (b[param] === s[param]) return null;
      return '<p>Le gain de l’antenne ' + (param === 'gt' ? 'd’émission' : 'de réception') + ' passe de ' + fN(b[param]) + ' dBi à <strong>' + fN(s[param]) + ' dBi</strong>. Une antenne directive concentre l’énergie dans une direction : son gain s’ajoute directement au bilan.</p>' + tail +
        '<p>La portée maximale devient ' + M.formatLength(rangeOf(s), 4) + '.</p>';
    }
    if (param === 'loss') {
      if (b.loss === s.loss) return null;
      return '<p>Les pertes supplémentaires (obstacles, murs, câbles, connecteurs) passent de ' + fN(b.loss) + ' dB à <strong>' + fN(s.loss) + ' dB</strong>. Elles se soustraient du bilan.</p>' + tail +
        '<p>La portée maximale devient ' + M.formatLength(rangeOf(s), 4) + '.</p>';
    }
    if (param === 'obs' || param === 'oh' || param === 'ox') {
      if (b[param] === s[param]) return null;
      if (s.obs !== 'oui') return '<p>L’obstacle est retiré : le trajet est de nouveau dégagé.</p>' + tail;
      var F1 = fresnelAt(s), nu = nuAt(s, s.d), J = diffAt(s, s.d);
      return '<p>Obstacle à ' + M.formatLength(s.ox * s.d, 3) + ' de l’émetteur, sommet ' + (s.oh >= 0 ? fN(s.oh, 3) + ' m <strong>au-dessus</strong>' : fN(-s.oh, 3) + ' m <strong>au-dessous</strong>') + ' de la ligne directe. Rayon de la première zone de Fresnel à cet endroit : ' + fN(F1, 3) + ' m.</p>' +
        '<p>Paramètre de diffraction ν = h·√(2(d₁ + d₂)/(λ·d₁·d₂)) = ' + fN(nu, 3) + ' ; perte de diffraction J(ν) = <strong>' + fN(J, 3) + ' dB</strong>. ' +
        (J === 0 ? 'L’obstacle est assez bas pour ne pas gêner.' : s.oh < 0 ? 'Même sans couper la ligne directe, l’obstacle mord sur la zone de Fresnel : une partie de l’énergie est perdue.' : 'L’obstacle masque la vue directe : seule l’onde diffractée par son sommet atteint le récepteur.') + '</p>' + tail;
    }
    if (param === 'sens') {
      if (b.sens === s.sens) return null;
      return '<p>La sensibilité du récepteur passe de ' + dbm(b.sens) + ' à <strong>' + dbm(s.sens) + '</strong>. Une valeur plus basse (plus négative) signifie un récepteur capable de traiter des signaux plus faibles.</p>' +
        '<p>La puissance reçue ne change pas (' + dbm(pr1) + '), mais la marge devient <strong>' + db(marginOf(s), 3) + '</strong> et la portée maximale ' + M.formatLength(rangeOf(s), 4) + '.</p>';
    }
    return null;
  }

  function intro(s) {
    return '<p>Modifiez un paramètre : l’explication s’adaptera aux valeurs affichées.</p>' +
      '<p>Réglage actuel : ' + dbm(s.pt) + ' émis (' + watts(P.dbmToWatt(s.pt)) + ') à ' + M.formatFrequency(s.f, 4) + '. Sur ' + M.formatLength(s.d, 4) + ', l’onde perd ' + fN(pathLossOf(s), 4) + ' dB (' + (s.model === 'sol' ? 'modèle à deux rayons' : 'espace libre') + '). Le récepteur reçoit ' + dbm(prOf(s)) + ', soit ' + watts(P.dbmToWatt(prOf(s))) + '. Il lui faut au moins ' + dbm(s.sens) + ' : la marge est de ' + db(marginOf(s), 3) + '.</p>';
  }

  /** Profil schématique : ligne directe, première zone de Fresnel, obstacle. */
  function profileSvg(s) {
    var W = 640, H = 200, x0 = 40, x1 = W - 40, yl = 96, F1mid = P.fresnelRadius(s.f, s.d / 2, s.d / 2);
    var span = Math.max(F1mid * 1.25, Math.abs(s.oh) * 1.15, 1), k = 70 / span, xo = x0 + s.ox * (x1 - x0), F1 = fresnelAt(s);
    var top = '', bot = '';
    for (var i = 0; i <= 60; i++) {
      var t = i / 60, r = Math.sqrt(Math.max(0, t * (1 - t))) * 2 * F1mid * k, x = x0 + t * (x1 - x0);
      top += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (yl - r).toFixed(1); bot = 'L' + x.toFixed(1) + ' ' + (yl + r).toFixed(1) + bot;
    }
    var yo = yl - s.oh * k, J = diffAt(s, s.d), blocked = s.oh >= 0;
    var out = ['<svg class="profile" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Profil du trajet : émetteur à gauche, récepteur à droite, ligne directe, première zone de Fresnel en forme d’ellipse et obstacle dont le sommet est ' + (s.oh >= 0 ? 'au-dessus' : 'au-dessous') + ' de la ligne directe de ' + fN(Math.abs(s.oh), 3) + ' m. Perte de diffraction ' + fN(J, 3) + ' dB." xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="scope__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>');
    out.push('<path class="profile__fresnel" d="' + top + bot + 'Z"/>');
    out.push('<line class="profile__los' + (blocked ? ' is-blocked' : '') + '" x1="' + x0 + '" y1="' + yl + '" x2="' + x1 + '" y2="' + yl + '"/>');
    out.push('<path class="profile__obstacle' + (J > 0 ? ' is-hit' : '') + '" d="M' + (xo - 46) + ' ' + (H - 14) + 'L' + xo + ' ' + Math.max(8, yo).toFixed(1) + 'L' + (xo + 46) + ' ' + (H - 14) + 'Z"/>');
    if (blocked) out.push('<path class="profile__diff" d="M' + x0 + ' ' + yl + 'L' + xo + ' ' + Math.max(8, yo).toFixed(1) + 'L' + x1 + ' ' + yl + '"/>');
    out.push('<line class="profile__dim" x1="' + (xo + 54) + '" y1="' + yl + '" x2="' + (xo + 54) + '" y2="' + (yl - F1 * k).toFixed(1) + '"/><text class="profile__t" x="' + (xo + 60) + '" y="' + (yl - F1 * k / 2 + 4).toFixed(1) + '">F₁ = ' + fN(F1, 3) + ' m</text>');
    [[x0, 'Émetteur'], [x1, 'Récepteur']].forEach(function (a) { out.push('<circle class="profile__ant" cx="' + a[0] + '" cy="' + yl + '" r="6"/><text class="profile__t" x="' + a[0] + '" y="' + (yl + 24) + '" text-anchor="' + (a[0] === x0 ? 'start' : 'end') + '">' + a[1] + '</text>'); });
    out.push('<text class="profile__t profile__t--strong" x="16" y="24">obstacle : h = ' + (s.oh > 0 ? '+' : '') + fN(s.oh, 3) + ' m · J = ' + fN(J, 3) + ' dB</text>');
    out.push('</svg>');
    return out.join('');
  }

  /* ------------------------------------ Page ------------------------------------ */

  function sanitize(p) {
    var o = {};
    Object.keys(LIM).forEach(function (k) { if (isFinite(p[k]) && p[k] >= LIM[k][0] && p[k] <= LIM[k][1]) o[k] = Number(p[k]); });
    if (p.model === 'libre' || p.model === 'sol') o.model = p.model;
    if (p.obs === 'oui' || p.obs === 'non') o.obs = p.obs;
    return o;
  }

  function mount(container) {
    var s = K.loadParams(ID, DEFAULTS, sanitize);
    var tr = K.tracker(), save = K.paramSaver(ID);

    container.innerHTML = [
      '<div class="lab">',
      K.head({ title: 'Laboratoire : propagation radio et atténuation', badge: 'Modèles idéalisés : espace libre, réflexion sur un sol plan, obstacle en arête', text: 'Établissez le bilan d’une liaison radio : puissance émise, gains d’antenne, affaiblissement dû à la distance et à la fréquence, pertes, puis comparez la puissance reçue à la sensibilité du récepteur.' }),
      '<div class="lab__grid"><div class="lab__main">',
      '<div class="scope-panel">',
      '<div class="scope-panel__bar"><p class="scope-panel__expr" id="expr"></p><p class="verdict" id="verdict" aria-live="polite"></p></div>',
      '<div class="scope-panel__plot" id="pr-plot"></div>',
      '<p class="scope-panel__cursor" id="plot-note">Puissance reçue en fonction de la distance (échelle logarithmique). Le point indique la distance réglée.</p>',
      '</div>',
      K.readouts([['Affaiblissement de trajet', 'r-fspl'], ['Puissance reçue Pr', 'r-pr'], ['Pr en watts', 'r-prw'], ['Marge Pr − S', 'r-mg'], ['Portée maximale', 'r-dmax'],
        ['PIRE = Pt + Gt', 'r-eirp'], ['Puissance émise', 'r-ptw'], ['Longueur d’onde λ', 'r-l'], ['Distance de rupture 4·ht·hr/λ', 'r-bp'], ['Horizon radioélectrique', 'r-hz']]),
      '<section class="box lab__aux" id="obs-box"><h3>Profil du trajet (échelle verticale exagérée)</h3><div id="profile"></div>' + K.readouts([['Rayon de Fresnel à l’obstacle', 'r-f1'], ['Dégagement h / F₁', 'r-clr'], ['Paramètre ν', 'r-nu'], ['Perte de diffraction J(ν)', 'r-j']]) + '</section>',
      K.explainBox('<div class="phasor-box budget-box"><h2>Bilan de liaison</h2><ol class="budget" id="budget"></ol></div>', true),
      '</div>',
      '<aside class="lab__controls" aria-label="Commandes de la simulation"><form class="controls" onsubmit="return false" novalidate>',
      K.segmented({ id: 'in-model', label: 'Modèle de propagation', options: [['libre', 'Espace libre'], ['sol', 'Avec réflexion sur le sol']], hint: 'Le second modèle ajoute un rayon réfléchi par un sol plan (deux rayons).' }),
      '<div id="ctl-h">' + K.range({ id: 'in-ht', label: 'Hauteur de l’antenne d’émission <var>h</var><sub>t</sub>', min: 2, max: 100, step: 1, unit: 'm', srLabel: 'Hauteur d’émission en mètres', hint: 'De 2 à 100 m (pylône).' }) +
        K.range({ id: 'in-hr', label: 'Hauteur de l’antenne de réception <var>h</var><sub>r</sub>', min: 1, max: 30, step: 0.5, unit: 'm', srLabel: 'Hauteur de réception en mètres', hint: 'De 1 à 30 m (1,5 m : un téléphone tenu en main).' }) + '</div>',
      K.range({ id: 'in-pt', label: 'Puissance émise <var>P</var><sub>t</sub>', min: 0, max: 50, step: 1, unit: 'dBm', srLabel: 'Puissance émise en dBm', hint: 'De 0 dBm (1 mW) à 50 dBm (100 W).' }),
      K.range({ id: 'in-gt', label: 'Gain antenne d’émission <var>G</var><sub>t</sub>', min: 0, max: 30, step: 0.5, unit: 'dBi', srLabel: 'Gain d’émission en dBi', hint: 'De 0 à 30 dBi. 0 dBi : antenne isotrope de référence.' }),
      K.range({ id: 'in-gr', label: 'Gain antenne de réception <var>G</var><sub>r</sub>', min: 0, max: 30, step: 0.5, unit: 'dBi', srLabel: 'Gain de réception en dBi', hint: 'De 0 à 30 dBi.' }),
      K.range({ id: 'in-f', label: 'Fréquence <var>f</var>', min: 0, max: 1000, step: 1, unit: 'MHz', srLabel: 'Fréquence en mégahertz', hint: 'De 100 MHz à 6 GHz (curseur logarithmique).', extra: K.chips('Fréquences courantes', PRESETS, 'preset') }),
      K.range({ id: 'in-d', label: 'Distance <var>d</var>', min: 0, max: 1000, step: 1, unit: 'km', srLabel: 'Distance en kilomètres', hint: 'De 10 m à 100 km (curseur logarithmique). Le champ se saisit en km : 0,01 à 100.' }),
      K.range({ id: 'in-loss', label: 'Pertes supplémentaires <var>L</var>', min: 0, max: 60, step: 1, unit: 'dB', srLabel: 'Pertes supplémentaires en dB', hint: 'Murs, végétation, câbles, connecteurs : valeur choisie, de 0 à 60 dB. Repères indicatifs vers 1 à 3 GHz :', extra: K.chips('Pertes typiques', LOSSES, 'loss') }),
      K.segmented({ id: 'in-obs', label: 'Obstacle sur le trajet (colline, bâtiment)', options: [['non', 'Aucun'], ['oui', 'Arête unique']], hint: 'Diffraction calculée (modèle de l’arête en lame de couteau).' }),
      '<div id="ctl-obs">' + K.range({ id: 'in-oh', label: 'Hauteur du sommet / ligne directe <var>h</var>', min: -40, max: 60, step: 0.5, unit: 'm', srLabel: 'Hauteur du sommet par rapport à la ligne directe, en mètres', hint: 'Négatif : sommet sous la ligne directe ; positif : il la coupe.' }) +
        K.range({ id: 'in-ox', label: 'Position de l’obstacle', min: 5, max: 95, step: 1, unit: '%', srLabel: 'Position de l’obstacle en pourcentage de la distance', hint: 'En pourcentage de la distance, depuis l’émetteur.' }) + '</div>',
      K.range({ id: 'in-sens', label: 'Sensibilité du récepteur <var>S</var>', min: -130, max: -40, step: 1, unit: 'dBm', srLabel: 'Sensibilité en dBm', hint: 'Puissance minimale exploitable : de −130 à −40 dBm.' }),
      '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + TCL.icon('reset') + 'Réinitialiser</button>',
      '</form></aside></div>',
      K.missionsSection(missions),
      '<section class="box ref-table"><h2>Repères : les décibels</h2><div class="table-wrap"><table class="data-table data-table--compact"><caption class="sr-only">Correspondances en décibels</caption><thead><tr><th scope="col">Écart</th><th scope="col">Rapport de puissance</th><th scope="col">Exemple</th></tr></thead><tbody>' +
        '<tr><td>+3 dB</td><td>× 2 (environ)</td><td>20 dBm = 100 mW ; 23 dBm ≈ 200 mW</td></tr>' +
        '<tr><td>+10 dB</td><td>× 10</td><td>30 dBm = 1 W ; 40 dBm = 10 W</td></tr>' +
        '<tr><td>−20 dB</td><td>÷ 100</td><td>distance multipliée par 10 en espace libre</td></tr>' +
        '<tr><td>0 dBm</td><td>1 mW</td><td>référence des dBm</td></tr></tbody></table></div></section>',
      K.limits('<p>Ce laboratoire applique deux modèles idéalisés : l’espace libre (vue directe, sans sol) et le modèle à deux rayons (sol plan, parfaitement réfléchissant, coefficient de réflexion −1). Ni l’un ni l’autre ne tient compte de la courbure de la Terre (au-delà de l’horizon radioélectrique, la liaison directe n’existe plus), du relief, de la végétation, de la pluie ou de l’évanouissement rapide (fading) dû aux multiples trajets. En ville ou en intérieur, l’affaiblissement réel est souvent bien plus fort ; les ingénieurs utilisent alors des modèles empiriques (Okumura-Hata, COST 231…) et des mesures. Les « pertes supplémentaires » sont une valeur que vous choisissez : elles ne sont pas calculées (les repères proposés sont des ordres de grandeur, très variables selon les matériaux et la fréquence). L’obstacle est modélisé comme une arête unique et mince (UIT-R P.526) ; un relief réel, arrondi ou à plusieurs obstacles, produit davantage de pertes, et la diffraction n’est pas combinée rigoureusement avec la réflexion sur le sol. Les gains d’antenne supposent des antennes parfaitement orientées l’une vers l’autre.</p>'),
      K.sequenceLinks(ID),
      '</div>'
    ].join('');
    var $ = function (sel) { return container.querySelector(sel); };

    var chart = TCL.plot.mount($('#pr-plot'), function (w) {
      var dmax = rangeOf(s), pr = prOf(s), sol = s.model === 'sol';
      var o = {
        kind: 'xy', ratio: w < 520 ? 0.75 : 0.5, marginLeft: w < 480 ? 50 : 62,
        title: 'Puissance reçue en fonction de la distance',
        desc: 'Courbe décroissante de la puissance reçue entre 10 m et 100 km ; sensibilité à ' + fN(s.sens) + ' dBm ; à ' + M.formatLength(s.d, 4) + ', Pr = ' + fN(pr, 4) + ' dBm.',
        x: { min: LIM.d[0], max: LIM.d[1], log: true, ticks: [10, 100, 1000, 10000, 100000], format: function (v) { return M.formatLength(v).replace(/ /g, ' '); }, label: 'distance d' },
        y: { min: -160, max: 40, ticks: [-160, -140, -120, -100, -80, -60, -40, -20, 0, 20, 40], zeroLine: false, label: 'Pr (dBm)' },
        series: sol
          ? [{ samples: 200, cls: 'scope__trace scope__trace--ref', fn: function (d) { return P.received(Object.assign({}, s, { d: d })) - diffAt(s, d); } },
             { samples: 1600, fn: function (d) { return prAt(s, d); } }]
          : [{ samples: 400, fn: function (d) { return prAt(s, d); } }],
        hlines: [{ y: s.sens, label: 'S = ' + fN(s.sens) + ' dBm', anchor: 'start' }],
        points: [{ x: s.d, y: pr, label: fN(pr, 4) + ' dBm' }]
      };
      if (dmax > LIM.d[0] && dmax < LIM.d[1]) {
        o.bands = [{ x0: dmax, x1: LIM.d[1], cls: 'scope__zone scope__zone--ko', label: w < 480 ? '' : 'hors de portée' }];
        o.vlines = [{ x: dmax, cls: 'scope__guide', label: 'dmax = ' + M.formatLength(dmax, 3).replace(/ /g, ' ') }];
      }
      if (sol) {
        var bp = P.breakpoint(s.f, s.ht, s.hr);
        if (bp > LIM.d[0] && bp < LIM.d[1]) (o.vlines = o.vlines || []).push({ x: bp, cls: 'scope__marker', label: 'rupture ' + M.formatLength(bp, 2).replace(/\u00A0/g, ' '), variant: 'alt' });
      }
      return o;
    });

    function refresh() {
      chart.update();
      var L = pathLossOf(s), pr = prOf(s), mg = marginOf(s), dmax = rangeOf(s), sol = s.model === 'sol';
      $('#expr').innerHTML = 'Pr = Pt + Gt + Gr − ' + (sol ? 'A<sub>2 rayons</sub>' : 'FSPL') + ' − L' + (s.obs === 'oui' ? ' − J' : '') + ' = ' + fN(pr, 4) + ' dBm';
      $('#ctl-h').hidden = !sol;
      var on = s.obs === 'oui', J = diffAt(s, s.d);
      $('#ctl-obs').hidden = !on; $('#obs-box').hidden = !on;
      U.qsa('input[name=in-obs]', container).forEach(function (r) { r.checked = r.value === s.obs; });
      K.setText(container, '#in-oh-out', (s.oh > 0 ? '+' : '') + fN(s.oh) + ' m'); K.setText(container, '#in-ox-out', fN(Math.round(s.ox * 100)) + ' %');
      pairs.oh.sync(s.oh); pairs.ox.sync(Math.round(s.ox * 100));
      if (on) {
        var F1 = fresnelAt(s);
        $('#profile').innerHTML = profileSvg(s);
        K.setText(container, '#r-f1', fN(F1, 3) + ' m'); K.setText(container, '#r-clr', fN(s.oh / F1, 2)); K.setText(container, '#r-nu', fN(nuAt(s, s.d), 3)); K.setText(container, '#r-j', fN(J, 3) + ' dB');
      }
      U.qsa('input[name=in-model]', container).forEach(function (r) { r.checked = r.value === s.model; });
      $('#plot-note').textContent = sol ? 'Trait plein : deux rayons (direct + réfléchi). Pointillés : espace libre seul. Échelle logarithmique ; le point indique la distance réglée.' : 'Puissance reçue en fonction de la distance (échelle logarithmique). Le point indique la distance réglée.';
      K.setText(container, '#r-bp', M.formatLength(P.breakpoint(s.f, s.ht, s.hr), 3));
      K.setText(container, '#r-hz', M.formatLength(P.radioHorizon(s.ht, s.hr), 3));
      K.setText(container, '#in-ht-out', fN(s.ht) + ' m');
      K.setText(container, '#in-hr-out', fN(s.hr) + ' m');
      pairs.ht.sync(s.ht); pairs.hr.sync(s.hr);
      var v = $('#verdict');
      v.className = 'verdict ' + (mg >= 0 ? 'verdict--ok' : 'verdict--ko');
      v.innerHTML = TCL.icon(mg >= 0 ? 'check' : 'x') + '<span>' + (mg >= 0 ? 'Liaison possible' : 'Liaison impossible') + '</span>';
      K.setText(container, '#r-fspl', fN(L, 4) + ' dB');
      K.setText(container, '#r-pr', dbm(pr));
      K.setText(container, '#r-prw', watts(P.dbmToWatt(pr)));
      K.setText(container, '#r-mg', db(mg, 3));
      K.setText(container, '#r-dmax', dmax >= 1e7 ? 'plus de 10 000 km (modèle sans courbure terrestre)' : M.formatLength(dmax, 4));
      K.setText(container, '#r-eirp', dbm(P.eirp(s)));
      K.setText(container, '#r-ptw', watts(P.dbmToWatt(s.pt)));
      K.setText(container, '#r-l', M.formatLength(P.C / s.f, 4));
      $('#budget').innerHTML = [
        ['Puissance émise Pt', dbm(s.pt)], ['+ gain d’émission Gt', db(s.gt)], [sol ? '− affaiblissement (2 rayons)' : '− espace libre FSPL', db(-L)],
        ['− pertes supplémentaires L', db(-s.loss)]].concat(s.obs === 'oui' ? [['− diffraction par l’obstacle J', db(-diffAt(s, s.d))]] : []).concat([['+ gain de réception Gr', db(s.gr)]
      ]).map(function (r) { return '<li><span>' + r[0] + '</span><strong>' + r[1] + '</strong></li>'; }).join('') +
        '<li class="budget__total"><span>= Puissance reçue Pr</span><strong>' + dbm(pr) + '</strong></li>' +
        '<li class="budget__margin ' + (mg >= 0 ? 'is-ok' : 'is-ko') + '"><span>Marge (Pr − S)</span><strong>' + db(mg, 3) + '</strong></li>';
      K.setText(container, '#in-pt-out', dbm(s.pt) + ' (' + watts(P.dbmToWatt(s.pt)) + ')');
      K.setText(container, '#in-gt-out', fN(s.gt) + ' dBi');
      K.setText(container, '#in-gr-out', fN(s.gr) + ' dBi');
      K.setText(container, '#in-f-out', M.formatFrequency(s.f, 4));
      K.setText(container, '#in-d-out', M.formatLength(s.d, 4));
      K.setText(container, '#in-loss-out', fN(s.loss) + ' dB');
      K.setText(container, '#in-sens-out', dbm(s.sens));
      pairs.pt.sync(s.pt); pairs.gt.sync(s.gt); pairs.gr.sync(s.gr); pairs.loss.sync(s.loss); pairs.sens.sync(s.sens);
      pairs.f.sync(Number((s.f / 1e6).toPrecision(6))); pairs.d.sync(Number((s.d / 1000).toPrecision(6)));
      var html = tr.param() ? explain(tr.param(), tr.base(), s) : null;
      $('#explain').innerHTML = html || intro(s);
      save(s);
    }

    function set(name, value, single) { tr.before(name, s); s[name] = value; refresh(); if (single) tr.end(); }
    function linear(key, unit, dec) {
      return K.bindPair(container, { id: 'in-' + key, validate: K.numberValidator(LIM[key][0], LIM[key][1], unit, dec), onInput: function (v) { set(key, v); }, onEnd: function () { tr.end(); }, current: function () { return s[key]; } });
    }
    var pairs = {
      pt: linear('pt', 'dBm', 1), gt: linear('gt', 'dBi', 1), gr: linear('gr', 'dBi', 1), loss: linear('loss', 'dB', 1), sens: linear('sens', 'dBm', 1), ht: linear('ht', 'm', 1), hr: linear('hr', 'm', 1), oh: linear('oh', 'm', 1),
      ox: K.bindPair(container, { id: 'in-ox', validate: K.numberValidator(5, 95, '%', 0), onInput: function (v) { set('ox', v / 100); }, onEnd: function () { tr.end(); }, current: function () { return Math.round(s.ox * 100); } }),
      f: K.bindPair(container, { id: 'in-f', toSlider: function (mhz) { return logF.to(mhz * 1e6); }, fromSlider: logF.from,
        validate: function (raw) { var r = K.numberValidator(100, 6000, 'MHz', 4)(raw); if (r.ok) r.value *= 1e6; return r; },
        onInput: function (hz) { set('f', hz); }, onEnd: function () { tr.end(); }, current: function () { return Number((s.f / 1e6).toPrecision(6)); } }),
      d: K.bindPair(container, { id: 'in-d', toSlider: function (km) { return logD.to(km * 1000); }, fromSlider: logD.from,
        validate: function (raw) { var r = K.numberValidator(0.01, 100, 'km', 4)(raw); if (r.ok) r.value *= 1000; return r; },
        onInput: function (m) { set('d', m); }, onEnd: function () { tr.end(); }, current: function () { return Number((s.d / 1000).toPrecision(6)); } })
    };
    U.qsa('[data-preset]', container).forEach(function (b) { b.addEventListener('click', function () { pairs.f.clear(); set('f', Number(b.getAttribute('data-preset')), true); }); });
    U.qsa('input[name=in-model]', container).forEach(function (r) { r.addEventListener('change', function () { if (r.checked) set('model', r.value, true); }); });
    U.qsa('input[name=in-obs]', container).forEach(function (r) { r.addEventListener('change', function () { if (r.checked) set('obs', r.value, true); }); });
    U.qsa('[data-loss]', container).forEach(function (b) { b.addEventListener('click', function () { pairs.loss.clear(); set('loss', Number(b.getAttribute('data-loss')), true); }); });
    $('#lab-reset').addEventListener('click', function () {
      s = Object.assign({}, DEFAULTS); tr.reset();
      Object.keys(pairs).forEach(function (k) { pairs[k].clear(); });
      refresh();
      U.toast('Paramètres réinitialisés : espace libre, 30 dBm, 6 et 2 dBi, 900 MHz, 5 km, 0 dB, −90 dBm, sans obstacle.', 'info');
    });

    K.bindMissions(container, ID, LABEL, missions, function () { return s; });
    refresh();
    return function () { chart.destroy(); };
  }

  function thumb() {
    var s = DEFAULTS;
    return { kind: 'xy', ratio: 0.55, title: 'Aperçu : puissance reçue selon la distance', x: { min: 10, max: 100000, log: true, ticks: [10, 1000, 100000], format: function (v) { return M.formatLength(v).replace(/ /g, ' '); }, label: 'distance' },
      y: { min: -160, max: 40, ticks: [-150, -100, -50, 0], zeroLine: false, label: 'Pr (dBm)' },
      series: [{ samples: 120, fn: function (d) { return P.received(Object.assign({}, s, { d: d })); } }], hlines: [{ y: s.sens }], points: [{ x: s.d, y: P.received(s) }] };
  }

  TCL.labs = TCL.labs || {};
  TCL.labs[ID] = {
    id: ID, title: 'Propagation radio et atténuation', short: LABEL, icon: 'propagation', mount: mount, missions: missions, thumb: thumb,
    summary: 'Bilan de liaison : puissance, gains d’antenne, distance, fréquence, pertes ; espace libre ou réflexion sur le sol ; obstacle et zone de Fresnel ; marge et portée maximale.',
    explain: explain, DEFAULTS: DEFAULTS, PR_REF: PR_REF
  };
})(window);
