/*
 * TELECOM CONNECT LAB — Laboratoire « Ondes électromagnétiques et longueur d'onde »
 * --------------------------------------------------------------------------------
 * Photographie, à un instant donné, du champ électrique d'une onde sinusoïdale
 * le long de sa direction de propagation : E(x) = E0 sin(2πx/λ − ωt).
 * La longueur d'onde affichée est calculée par λ = v / f avec v = c × facteur de vitesse.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, W = TCL.waveMath, U = TCL.util, K = TCL.labkit, esc = U.esc;
  var ID = 'ondes-em', LABEL = 'Ondes électromagnétiques';

  var F_MIN = 3e3, F_MAX = 300e9;
  var WINDOWS = [0.001, 0.01, 0.1, 1, 10, 100, 1000, 10000, 100000];
  var DEFAULTS = { f: 100e6, medium: 'vide', win: 10, animate: false };
  var PRESETS = [
    [1e6, 'Radio AM 1 MHz'], [100e6, 'Radio FM 100 MHz'], [900e6, 'GSM 900 MHz'],
    [2.4e9, 'Wi-Fi 2,4 GHz'], [3.5e9, '5G 3,5 GHz'], [5e9, 'Wi-Fi 5 GHz']
  ];
  var logF = K.logSlider(F_MIN, F_MAX);

  function lam(s) { return W.wavelength(s.f, W.medium(s.medium).vf); }

  var missions = [
    {
      id: 'm1', title: 'Une longueur d’onde de 3 m',
      text: 'Dans le vide (ou l’air), réglez la fréquence pour obtenir une longueur d’onde de 3 m.',
      check: function (s) {
        var l = lam(s);
        if (s.medium !== 'vide') return { ok: false, msg: 'Choisissez d’abord le milieu « Vide ou air ».' };
        if (M.approxEqual(l, 3, 0.01)) return { ok: true, msg: 'Réussi : f = ' + M.formatFrequency(s.f) + ' donne λ = c/f = ' + M.formatLength(l, 4) + '. Avec c ≈ 3×10⁸ m/s : 3×10⁸ / 3 = 100 MHz.' };
        return { ok: false, msg: 'Longueur d’onde actuelle : ' + M.formatLength(l, 4) + '. Rappel : λ = c/f, donc f = c/λ.' };
      }
    },
    {
      id: 'm2', title: 'Le même signal dans un câble',
      text: 'Gardez f = 100 MHz et faites passer l’onde dans un câble coaxial à isolant polyéthylène plein. Que devient λ ?',
      check: function (s) {
        if (!M.approxEqual(s.f, 100e6, 0.01)) return { ok: false, msg: 'La fréquence doit rester à 100 MHz (actuellement ' + M.formatFrequency(s.f) + ').' };
        if (s.medium !== 'coax-pe') return { ok: false, msg: 'Choisissez le milieu « Câble coaxial, isolant polyéthylène plein ».' };
        return { ok: true, msg: 'Réussi : la fréquence ne change pas, mais v = 0,66 c, donc λ = 0,66 × 2,998 m ≈ ' + M.formatLength(lam(s), 3) + '.' };
      }
    },
    {
      id: 'm3', title: 'Une antenne demi-onde de 15 cm',
      text: 'Dans l’air, trouvez la fréquence pour laquelle une antenne demi-onde (longueur λ/2) mesure 15 cm.',
      check: function (s) {
        if (s.medium !== 'vide') return { ok: false, msg: 'Choisissez le milieu « Vide ou air ».' };
        var half = lam(s) / 2;
        if (M.approxEqual(half, 0.15, 0.01)) return { ok: true, msg: 'Réussi : λ = ' + M.formatLength(lam(s), 3) + ', donc λ/2 = ' + M.formatLength(half, 3) + ' à f = ' + M.formatFrequency(s.f, 4) + ' (bande UHF).' };
        return { ok: false, msg: 'λ/2 actuel : ' + M.formatLength(half, 3) + '. Il faut λ = 30 cm, puis f = c/λ.' };
      }
    }
  ];

  /* --------------------------- Explications dynamiques --------------------------- */

  function explain(param, b, s) {
    var med = W.medium(s.medium), l0 = W.wavelength(b.f, W.medium(b.medium).vf), l1 = lam(s);
    var n = s.win / l1;
    if (param === 'f') {
      if (b.f === s.f) return null;
      var r = s.f / b.f;
      var ratio = r >= 1 ? '× ' + M.formatNumber(r, 3) : '÷ ' + M.formatNumber(1 / r, 3);
      var b0 = W.band(b.f), b1 = W.band(s.f);
      return '<p>La fréquence passe de <strong>' + M.formatFrequency(b.f) + '</strong> à <strong>' + M.formatFrequency(s.f) + '</strong> (' + ratio + ').</p>' +
        '<p>La longueur d’onde est inversement proportionnelle à la fréquence (λ = v/f) : elle passe de ' + M.formatLength(l0, 4) + ' à <strong>' + M.formatLength(l1, 4) + '</strong>. ' +
        (r > 1 ? 'Plus la fréquence est élevée, plus les ondes sont courtes.' : 'Plus la fréquence est basse, plus les ondes sont longues.') + '</p>' +
        '<p>La vitesse ne change pas : v = ' + M.formatSci(W.speed(med.vf), 4) + ' m/s dans ce milieu.' +
        (b0 && b1 && b0.id !== b1.id ? ' Vous passez de la bande ' + b0.id + ' à la bande <strong>' + b1.id + '</strong> (' + b1.name + ').' : '') + '</p>';
    }
    if (param === 'medium') {
      if (b.medium === s.medium) return null;
      return '<p>Le milieu devient : <strong>' + esc(med.label) + '</strong>. La vitesse de l’onde vaut v = ' + M.formatNumber(med.vf, 3) + ' × c = ' + M.formatSci(W.speed(med.vf), 4) + ' m/s.</p>' +
        '<p>La fréquence ne change pas (' + M.formatFrequency(s.f) + ') : c’est l’émetteur qui l’impose. La longueur d’onde suit la vitesse : λ passe de ' + M.formatLength(l0, 4) + ' à <strong>' + M.formatLength(l1, 4) + '</strong>.</p>' +
        '<p>' + esc(med.note) + ' C’est pourquoi un tronçon de câble « quart d’onde » est plus court que λ/4 mesuré dans l’air.</p>';
    }
    if (param === 'win') {
      if (b.win === s.win) return null;
      return '<p>La règle affichée passe à <strong>' + M.formatLength(s.win) + '</strong> : elle contient ' + M.formatNumber(n, 3) + ' longueur' + (n >= 2 ? 's' : '') + ' d’onde. L’onde n’a pas changé (λ = ' + M.formatLength(l1, 4) + ') : seul le zoom est modifié.</p>';
    }
    return null;
  }

  function intro(s) {
    var med = W.medium(s.medium), l = lam(s), bd = W.band(s.f);
    return '<p>Modifiez la fréquence ou le milieu : l’explication s’adaptera aux valeurs affichées.</p>' +
      '<p>Réglage actuel : une onde de ' + M.formatFrequency(s.f) + ' se propageant dans « ' + esc(med.label.toLowerCase()) + ' » à ' + M.formatSci(W.speed(med.vf), 4) + ' m/s. Pendant une période T = ' + M.formatTime(1 / s.f) + ', elle avance d’une longueur d’onde : λ = v × T = v/f = ' + M.formatLength(l, 4) + '.' +
      (bd ? ' Elle appartient à la bande ' + bd.id + ' (' + bd.name + ').' : '') + '</p>';
  }

  /* ---------------------------------- Schéma E/B ---------------------------------- */

  function emDiagram() {
    var w = 220, h = 168, y0 = 74, x0 = 18, len = 180, a = 40;
    var e = '', b = '';
    for (var i = 0; i <= 80; i++) {
      var t = i / 80, x = x0 + t * len, v = Math.sin(t * 4 * Math.PI);
      e += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (y0 - a * v).toFixed(1);
      b += (i ? 'L' : 'M') + (x - 0.42 * a * v).toFixed(1) + ' ' + (y0 + 0.42 * a * v).toFixed(1);
    }
    return '<svg class="emdiag" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="Schéma d’une onde électromagnétique : le champ électrique E et le champ magnétique B oscillent en phase, perpendiculairement l’un à l’autre et à la direction de propagation.">' +
      '<line class="emdiag__axis" x1="' + x0 + '" y1="' + y0 + '" x2="' + (x0 + len + 14) + '" y2="' + y0 + '"/>' +
      '<path class="emdiag__axis" d="M' + (x0 + len + 6) + ' ' + (y0 - 5) + 'L' + (x0 + len + 14) + ' ' + y0 + 'L' + (x0 + len + 6) + ' ' + (y0 + 5) + '"/>' +
      '<path class="emdiag__b" d="' + b + '"/><path class="emdiag__e" d="' + e + '"/>' +
      '<text class="emdiag__t emdiag__t--e" x="' + (x0 + 26) + '" y="' + (y0 - a - 6) + '">E</text>' +
      '<text class="emdiag__t emdiag__t--b" x="' + (x0 + 2) + '" y="' + (y0 + a * 0.62 + 10) + '">B</text>' +
      '<text class="emdiag__t" x="' + (x0 + len + 14) + '" y="' + (h - 6) + '" text-anchor="end">sens de propagation →</text></svg>';
  }

  /* ---------------------------------- Page ---------------------------------- */

  function sanitize(p) {
    var o = {};
    if (isFinite(p.f) && p.f >= F_MIN && p.f <= F_MAX) o.f = Number(p.f);
    if (W.MEDIA.some(function (m) { return m.id === p.medium; })) o.medium = p.medium;
    if (WINDOWS.indexOf(Number(p.win)) >= 0) o.win = Number(p.win);
    return o;
  }

  function distUnit(win) {
    if (win >= 1000) return { u: 'km', k: 1e-3 };
    if (win >= 1) return { u: 'm', k: 1 };
    if (win >= 0.01) return { u: 'cm', k: 100 };
    return { u: 'mm', k: 1000 };
  }

  function mount(container) {
    var s = K.loadParams(ID, DEFAULTS, sanitize);
    s.animate = false;
    var tr = K.tracker();
    var save = K.paramSaver(ID);
    var offset = 0;

    var bandRows = W.BANDS.map(function (b) {
      return '<tr data-band="' + b.id + '"><td><strong>' + b.id + '</strong> · ' + esc(b.name) + '</td><td>' + M.formatFrequency(b.min) + ' – ' + M.formatFrequency(b.max) + '</td><td>' +
        M.formatLength(3e8 / b.max) + ' – ' + M.formatLength(3e8 / b.min) + '</td><td>' + esc(b.use) + '</td></tr>';
    }).join('');

    container.innerHTML = [
      '<div class="lab">',
      K.head({ title: 'Laboratoire : ondes électromagnétiques et longueur d’onde', badge: 'Simulation pédagogique d’une onde sinusoïdale idéale', text: 'Choisissez une fréquence et un milieu : observez la longueur d’onde λ = v/f, la place de l’onde dans le spectre radio et la taille des antennes associées.' }),
      '<div class="lab__grid"><div class="lab__main">',
      '<div class="scope-panel scope-panel--tall">',
      '<div class="scope-panel__bar"><p class="scope-panel__expr" id="expr"></p>',
      '<button type="button" class="icon-btn" id="anim" aria-pressed="false"></button></div>',
      '<div class="scope-panel__plot" id="em-plot"></div>',
      '<p class="scope-panel__cursor">Photographie du champ électrique le long de la direction de propagation, à un instant donné.</p>',
      '<div class="scope-panel__sub" id="em-spectrum"></div>',
      '</div>',
      K.readouts([['Fréquence f', 'r-f'], ['Longueur d’onde λ = v/f', 'r-l'], ['Période T = 1/f', 'r-T'], ['Vitesse v', 'r-v'], ['Facteur de vitesse v/c', 'r-vf'],
        ['Nombre d’onde k = 2π/λ', 'r-k'], ['Antenne demi-onde λ/2', 'r-l2'], ['Antenne quart d’onde λ/4', 'r-l4'], ['Bande (UIT)', 'r-band'], ['λ sur la règle', 'r-n']]),
      K.explainBox('<div class="phasor-box"><h2>Une onde, deux champs</h2>' + emDiagram() + '<p>Les champs électrique E et magnétique B oscillent ensemble, perpendiculairement entre eux et à la direction de propagation. Le graphique montre E.</p></div>'),
      '</div>',
      '<aside class="lab__controls" aria-label="Commandes de la simulation"><form class="controls" onsubmit="return false" novalidate>',
      K.range({ id: 'in-f', label: 'Fréquence <var>f</var>', min: 0, max: 1000, step: 1, unit: 'MHz', srLabel: 'Fréquence en mégahertz',
        hint: 'De 3 kHz à 300 GHz (curseur logarithmique). Le champ se saisit en MHz : 0,003 à 300 000.',
        extra: K.chips('Fréquences courantes', PRESETS.map(function (p) { return [p[0], p[1]]; }), 'preset') }),
      K.select({ id: 'in-medium', label: 'Milieu de propagation', options: W.MEDIA.map(function (m) { return [m.id, m.label + (m.vf !== 1 ? ' (v ≈ ' + M.formatNumber(m.vf) + ' c)' : '')]; }), hint: 'Change la vitesse v, donc λ. La fréquence reste celle de l’émetteur.' }),
      K.select({ id: 'in-win', label: 'Longueur de la règle affichée', options: WINDOWS.map(function (w) { return [String(w), M.formatLength(w)]; }), hint: 'Zoom sur la distance : ne modifie pas l’onde.' }),
      '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + TCL.icon('reset') + 'Réinitialiser</button>',
      '</form></aside></div>',
      K.missionsSection(missions),
      '<section class="box ref-table"><h2>Repères : les bandes de fréquences radio</h2><p class="muted">Définitions de l’UIT. Longueurs d’onde dans le vide, arrondies avec c ≈ 3 × 10⁸ m/s. La ligne de la fréquence réglée est mise en évidence.</p>',
      '<div class="table-wrap"><table class="data-table data-table--compact"><caption class="sr-only">Bandes de fréquences</caption><thead><tr><th scope="col">Bande</th><th scope="col">Fréquences</th><th scope="col">Longueurs d’onde</th><th scope="col">Exemples d’usage</th></tr></thead><tbody>' + bandRows + '</tbody></table></div></section>',
      K.limits('<p>Ce laboratoire représente une onde sinusoïdale idéale, de fréquence unique, dans un milieu sans pertes. Il ne simule ni l’atténuation, ni les réflexions, ni la polarisation réelle des antennes. Dans un câble, la vitesse dépend de l’isolant : les facteurs de vitesse indiqués sont des valeurs typiques. La longueur réelle d’une antenne demi-onde est souvent raccourcie de quelques pour cent par rapport à λ/2.</p>'),
      K.sequenceLinks(ID),
      '</div>'
    ].join('');
    var $ = function (sel) { return container.querySelector(sel); };

    var chart = TCL.plot.mount($('#em-plot'), function (w) {
      var l = lam(s), du = distUnit(s.win), n = s.win / l, dense = n > 120;
      var crest = l * (0.25 + offset / (2 * Math.PI));
      crest = crest % l;
      var o = {
        kind: 'xy', ratio: w < 520 ? 0.62 : 0.4,
        title: 'Champ électrique le long de la propagation',
        desc: 'Onde de ' + M.formatFrequency(s.f) + ', longueur d’onde ' + M.formatLength(l, 4) + ', sur une règle de ' + M.formatLength(s.win) + '.',
        x: { min: 0, max: s.win * du.k, label: 'distance x (' + du.u + ')' },
        y: { min: -1.4, max: 1.4, ticks: [-1, -0.5, 0, 0.5, 1], label: 'champ E (relatif)' },
        series: dense
          ? [{ points: [[0, 1], [s.win * du.k, 1]], cls: 'scope__trace' }, { points: [[0, -1], [s.win * du.k, -1]], cls: 'scope__trace' }]
          : [{ samples: Math.min(4000, Math.max(400, Math.ceil(n * 60))), fn: function (x) { return Math.sin(2 * Math.PI * (x / du.k) / l - offset); } }]
      };
      if (dense) o.note = M.formatNumber(n, 3) + ' longueurs d’onde sur la règle : choisissez une règle plus courte';
      else if (crest + l <= s.win) {
        o.arrows = [{ x1: crest * du.k, x2: (crest + l) * du.k, y: -1.18, label: 'λ = ' + M.formatLength(l, 4), guides: [{ x: crest * du.k, y: 1 }, { x: (crest + l) * du.k, y: 1 }] }];
      } else {
        o.note = 'λ = ' + M.formatLength(l, 4) + ' dépasse la règle de ' + M.formatLength(s.win) + ' : allongez-la';
      }
      return o;
    });

    var spectrum = TCL.plot.mount($('#em-spectrum'), function (w) {
      return {
        kind: 'xy', ratio: w < 520 ? 0.34 : 0.17, marginLeft: 14,
        title: 'Position de la fréquence dans le spectre radio', desc: 'Échelle logarithmique de 3 kHz à 300 GHz découpée en bandes UIT ; repère à ' + M.formatFrequency(s.f) + '.',
        x: { min: F_MIN, max: F_MAX, log: true, ticks: w < 520 ? [1e4, 1e6, 1e8, 1e10] : [1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11], format: function (v) { return M.formatFrequency(v, 2).replace(/ /g, ' '); }, label: '' },
        y: { min: 0, max: 1, ticks: [], format: function () { return ''; } },
        bands: W.BANDS.map(function (b) { return { x0: b.min, x1: b.max, label: b.id }; }),
        vlines: [{ x: s.f, cls: 'scope__marker', label: M.formatFrequency(s.f, 3).replace(/ /g, ' '), variant: 'alt' }]
      };
    });

    function refresh() {
      chart.update(); spectrum.update();
      var med = W.medium(s.medium), l = lam(s), bd = W.band(s.f);
      $('#expr').innerHTML = 'λ = v / f = ' + M.formatSci(W.speed(med.vf), 4) + ' / ' + M.formatSci(s.f, 4) + ' = ' + M.formatLength(l, 4);
      K.setText(container, '#r-f', M.formatFrequency(s.f, 4));
      K.setText(container, '#r-l', M.formatLength(l, 4));
      K.setText(container, '#r-T', M.formatTime(1 / s.f));
      K.setText(container, '#r-v', M.formatSci(W.speed(med.vf), 4) + ' m/s');
      K.setText(container, '#r-vf', M.formatNumber(med.vf, 3));
      K.setText(container, '#r-k', M.formatNumber(W.wavenumber(l), 4) + ' rad/m');
      K.setText(container, '#r-l2', M.formatLength(l / 2, 3));
      K.setText(container, '#r-l4', M.formatLength(l / 4, 3));
      K.setText(container, '#r-band', bd ? bd.id + ' (' + bd.name.split(' (')[0] + ')' : '—');
      K.setText(container, '#r-n', M.formatNumber(s.win / l, 3));
      K.setText(container, '#in-f-out', M.formatFrequency(s.f, 4));
      pair.sync(Number((s.f / 1e6).toPrecision(6)));
      if (document.activeElement !== $('#in-medium')) $('#in-medium').value = s.medium;
      if (document.activeElement !== $('#in-win')) $('#in-win').value = String(s.win);
      U.qsa('tr[data-band]', container).forEach(function (r) { r.classList.toggle('is-current', !!bd && r.getAttribute('data-band') === bd.id); });
      var html = tr.param() ? explain(tr.param(), tr.base(), s) : null;
      $('#explain').innerHTML = html || intro(s);
      save({ f: s.f, medium: s.medium, win: s.win });
    }

    function set(name, value, single) { tr.before(name, s); s[name] = value; refresh(); if (single) tr.end(); }

    var pair = K.bindPair(container, {
      id: 'in-f', toSlider: function (mhz) { return logF.to(mhz * 1e6); }, fromSlider: function (p) { return logF.from(p); },
      validate: function (raw) { var r = K.numberValidator(F_MIN / 1e6, F_MAX / 1e6, 'MHz', 6)(raw); if (r.ok) r.value = r.value * 1e6; return r; },
      onInput: function (hz) { set('f', hz); }, onEnd: function () { tr.end(); }, current: function () { return Number((s.f / 1e6).toPrecision(6)); }
    });
    U.qsa('[data-preset]', container).forEach(function (b) { b.addEventListener('click', function () { pair.clear(); set('f', Number(b.getAttribute('data-preset')), true); }); });
    $('#in-medium').addEventListener('change', function (e) { set('medium', e.target.value, true); });
    $('#in-win').addEventListener('change', function (e) { set('win', Number(e.target.value), true); });
    $('#lab-reset').addEventListener('click', function () {
      s = Object.assign({}, DEFAULTS); tr.reset(); offset = 0; stopAnim(); pair.clear(); refresh();
      U.toast('Paramètres réinitialisés : 100 MHz, vide ou air, règle de 10 m.', 'info');
    });

    /* Animation facultative : l'onde avance dans le sens de propagation (ralentie). */
    var raf = null, lastTs = null, lastDraw = 0;
    var animBtn = $('#anim');
    function syncAnimBtn() {
      animBtn.innerHTML = TCL.icon(raf ? 'pause' : 'play');
      animBtn.setAttribute('aria-pressed', raf ? 'true' : 'false');
      animBtn.setAttribute('aria-label', raf ? 'Arrêter l’animation de la propagation' : 'Animer la propagation (ralentie)');
    }
    function frame(ts) {
      if (lastTs != null) offset = (offset + (ts - lastTs) / 1000 * 2.2) % (2 * Math.PI);
      lastTs = ts;
      if (ts - lastDraw > 45) { chart.update(); lastDraw = ts; }
      raf = root.requestAnimationFrame(frame);
    }
    function stopAnim() { if (raf) root.cancelAnimationFrame(raf); raf = null; lastTs = null; syncAnimBtn(); }
    animBtn.addEventListener('click', function () {
      if (raf) stopAnim(); else { raf = root.requestAnimationFrame(frame); syncAnimBtn(); }
    });
    syncAnimBtn();

    K.bindMissions(container, ID, LABEL, missions, function () { return s; });
    refresh();
    return function () { stopAnim(); chart.destroy(); spectrum.destroy(); };
  }

  function thumb() {
    return { kind: 'xy', ratio: 0.55, title: 'Aperçu : onde électromagnétique', x: { min: 0, max: 10, label: 'distance x (m)' }, y: { min: -1.4, max: 1.4, ticks: [-1, 0, 1], label: 'champ E' },
      series: [{ samples: 500, fn: function (x) { return Math.sin(2 * Math.PI * x / W.wavelength(100e6)); } }],
      arrows: [{ x1: W.wavelength(100e6) / 4, x2: W.wavelength(100e6) * 1.25, y: -1.18, label: 'λ ≈ 3 m' }] };
  }

  TCL.labs = TCL.labs || {};
  TCL.labs[ID] = {
    id: ID, title: 'Ondes électromagnétiques et longueur d’onde', short: LABEL, icon: 'em', mount: mount, missions: missions, thumb: thumb,
    summary: 'Réglez la fréquence et le milieu, lisez la longueur d’onde, la bande UIT et la taille des antennes demi-onde et quart d’onde.',
    explain: explain, DEFAULTS: DEFAULTS
  };
})(window);
