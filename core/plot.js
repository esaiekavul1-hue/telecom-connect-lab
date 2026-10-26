/*
 * TELECOM CONNECT LAB — Tracé de signaux en SVG (style « écran d'oscilloscope »)
 * ----------------------------------------------------------------------------
 * TCL.plot.render(options)  -> { svg: '<svg…>', scale: {...} }
 * TCL.plot.mount(element, getOptions) -> redessine automatiquement à la bonne
 *     largeur (lisible sur téléphone comme sur ordinateur).
 *
 * Les courbes sont calculées point par point à partir des fonctions fournies :
 * ce qui est affiché correspond exactement au calcul.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath;
  var esc = function (s) { return TCL.util.esc(s); };

  /** Pas « agréable » pour les graduations : 1, 2, 2,5 ou 5 × 10^k. */
  function niceStep(range, target) {
    var raw = range / (target || 6);
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var n = raw / p;
    var s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return s * p;
  }

  function f1(v) { return Math.round(v * 10) / 10; }

  var counter = 0;

  function render(o) {
    var W = Math.max(280, Math.round(o.width || 640));
    var H = Math.max(180, Math.round(o.height || 320));
    var compact = W < 480;
    var m = { l: compact ? 40 : 54, r: compact ? 10 : 18, t: compact ? 22 : 24, b: compact ? 34 : 40 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var win = o.tWindow;
    var yMax = o.yMax || 10;
    var yStep = o.yStep || yMax / 5;
    var tu = M.timeUnit(win);
    // Si la fenêtre vaut exactement 1 ms, 1 µs… on garde l'unité « ronde ».
    var X = function (t) { return m.l + (t / win) * pw; };
    var Y = function (v) { return m.t + ph / 2 - (v / yMax) * (ph / 2); };
    var id = 'p' + (++counter);
    var out = [];
    var fs = compact ? 10.5 : 12;

    out.push('<svg class="scope" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-labelledby="' + id + 't ' + id + 'd" xmlns="http://www.w3.org/2000/svg">');
    out.push('<title id="' + id + 't">' + esc(o.title || 'Graphique du signal') + '</title>');
    out.push('<desc id="' + id + 'd">' + esc(o.desc || '') + '</desc>');
    out.push('<rect class="scope__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="' + (compact ? 10 : 14) + '"/>');
    out.push('<defs><clipPath id="' + id + 'c"><rect x="' + m.l + '" y="' + (m.t - 2) + '" width="' + pw + '" height="' + (ph + 4) + '"/></clipPath></defs>');

    // --- Grille et graduations horizontales (temps)
    var rangeU = win * tu.factor;
    var stepU = niceStep(rangeU, compact ? 4 : 6);
    for (var u = 0; u <= rangeU + stepU * 1e-6; u += stepU) {
      var x = f1(X(u / tu.factor));
      out.push('<line class="scope__grid" x1="' + x + '" y1="' + m.t + '" x2="' + x + '" y2="' + (m.t + ph) + '"/>');
      out.push('<text class="scope__tick" x="' + x + '" y="' + (m.t + ph + 16) + '" text-anchor="middle" font-size="' + fs + '">' + M.formatNumber(u, 4) + '</text>');
    }
    // --- Grille verticale (valeurs)
    for (var v = -yMax; v <= yMax + yStep * 1e-6; v += yStep) {
      var y = f1(Y(v));
      var isZero = Math.abs(v) < yStep * 1e-6;
      out.push('<line class="' + (isZero ? 'scope__axis' : 'scope__grid') + '" x1="' + m.l + '" y1="' + y + '" x2="' + (m.l + pw) + '" y2="' + y + '"/>');
      out.push('<text class="scope__tick" x="' + (m.l - 7) + '" y="' + (y + 4) + '" text-anchor="end" font-size="' + fs + '">' + M.formatNumber(isZero ? 0 : v, 3) + '</text>');
    }
    out.push('<rect class="scope__frame" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '"/>');
    // Légendes des axes (avec unités)
    out.push('<text class="scope__label" x="' + (m.l + pw) + '" y="' + (H - 6) + '" text-anchor="end" font-size="' + fs + '">temps t (' + tu.unit + ')</text>');
    out.push('<text class="scope__label" x="' + (m.l) + '" y="' + (m.t - 8) + '" font-size="' + fs + '">' + esc(o.yLabel || 'x(t) en V') + '</text>');

    out.push('<g clip-path="url(#' + id + 'c)">');

    // --- Courbes
    (o.series || []).forEach(function (s) {
      if (s.dense) {
        // Trop de périodes pour être dessinées lisiblement : on représente l'enveloppe.
        out.push('<rect class="scope__band" x="' + m.l + '" y="' + f1(Y(s.amp)) + '" width="' + pw + '" height="' + f1(Y(-s.amp) - Y(s.amp)) + '"/>');
        return;
      }
      var n = s.samples || 600;
      var d = '';
      for (var i = 0; i <= n; i++) {
        var t = (i / n) * win;
        var val = s.fn(t);
        val = Math.max(-yMax * 1.2, Math.min(yMax * 1.2, val));
        d += (i ? 'L' : 'M') + f1(X(t)) + ' ' + f1(Y(val));
      }
      out.push('<path class="' + (s.cls || 'scope__trace') + '" d="' + d + '"/>');
    });

    // --- Repère d'amplitude (flèche de 0 à A, éventuellement crête à crête)
    if (o.ampMarker) {
      var am = o.ampMarker, ax = f1(X(am.t));
      out.push(arrowV(ax, Y(0), Y(am.A), 'scope__mark'));
      out.push(labelBox(ax + 8, (Y(0) + Y(am.A)) / 2, am.label || 'A', 'start', fs));
      if (am.pp) {
        var px = f1(X(am.ppT));
        out.push(arrowV(px, Y(-am.A), Y(am.A), 'scope__mark scope__mark--alt'));
        out.push(labelBox(px + 8, Y(0) + 14, am.ppLabel || '2A', 'start', fs, 'alt'));
      }
    }

    // --- Repère de période T (entre deux crêtes successives)
    if (o.periodMarker) {
      var pm = o.periodMarker;
      var xa = f1(X(pm.t0)), xb = f1(X(pm.t0 + pm.T));
      var yy = f1(Y(pm.y));
      out.push('<line class="scope__guide" x1="' + xa + '" y1="' + f1(Y(pm.peak)) + '" x2="' + xa + '" y2="' + yy + '"/>');
      out.push('<line class="scope__guide" x1="' + xb + '" y1="' + f1(Y(pm.peak)) + '" x2="' + xb + '" y2="' + yy + '"/>');
      out.push(arrowH(xa, xb, yy, 'scope__mark'));
      out.push(labelBox((xa + xb) / 2, yy - 10, pm.label, 'middle', fs));
    }

    // --- Repère de décalage dû à la phase
    if (o.shiftMarker) {
      var sm = o.shiftMarker;
      var sa = f1(X(sm.from)), sb = f1(X(sm.to)), sy = f1(Y(sm.y));
      if (sm.peak != null) {
        out.push('<line class="scope__guide" x1="' + sa + '" y1="' + f1(Y(sm.peak)) + '" x2="' + sa + '" y2="' + (sy + 6) + '"/>');
        out.push('<line class="scope__guide" x1="' + sb + '" y1="' + f1(Y(sm.peak)) + '" x2="' + sb + '" y2="' + (sy + 6) + '"/>');
      }
      if (Math.abs(sb - sa) > 3) out.push(arrowH(sa, sb, sy, 'scope__mark scope__mark--alt', true));
      out.push(labelBox((sa + sb) / 2, sy - 17, sm.label, 'middle', fs, 'alt'));
    }

    out.push('</g>');

    // Points de lecture (exercices de lecture de graphique)
    (o.points || []).forEach(function (p) {
      out.push('<circle class="scope__dot" cx="' + f1(X(p.t)) + '" cy="' + f1(Y(p.v)) + '" r="4"/>');
    });

    // Curseur interactif (placé par simulation.js)
    out.push('<g class="scope__cursor" hidden><line class="scope__cursor-line" x1="0" y1="' + m.t + '" x2="0" y2="' + (m.t + ph) + '"/><circle class="scope__cursor-dot" r="4.5" cx="0" cy="0"/></g>');

    if (o.note) {
      out.push(labelBox(m.l + pw / 2, m.t + 16, o.note, 'middle', fs, 'warn'));
    }

    out.push('</svg>');
    return {
      svg: out.join(''),
      scale: { left: m.l, top: m.t, width: pw, height: ph, W: W, H: H, tWindow: win, yMax: yMax, X: X, Y: Y, unit: tu }
    };
  }

  function arrowH(x1, x2, y, cls, single) {
    var dir = x2 >= x1 ? 1 : -1, h = 5;
    var s = '<line class="' + cls + '" x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '"/>';
    s += '<path class="' + cls + '" d="M' + (x2 - dir * h * 1.4) + ' ' + (y - h) + 'L' + x2 + ' ' + y + 'L' + (x2 - dir * h * 1.4) + ' ' + (y + h) + '"/>';
    if (!single) s += '<path class="' + cls + '" d="M' + (x1 + dir * h * 1.4) + ' ' + (y - h) + 'L' + x1 + ' ' + y + 'L' + (x1 + dir * h * 1.4) + ' ' + (y + h) + '"/>';
    return s;
  }

  function arrowV(x, y1, y2, cls) {
    var dir = y2 >= y1 ? 1 : -1, h = 5;
    y1 = f1(y1); y2 = f1(y2);
    if (Math.abs(y2 - y1) < 2) return '';
    return '<line class="' + cls + '" x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '"/>' +
      '<path class="' + cls + '" d="M' + (x - h) + ' ' + (y2 - dir * h * 1.4) + 'L' + x + ' ' + y2 + 'L' + (x + h) + ' ' + (y2 - dir * h * 1.4) + '"/>';
  }

  /** Étiquette lisible sur fond sombre (petit cartouche). */
  function labelBox(x, y, text, anchor, fs, variant) {
    var w = String(text).length * fs * 0.58 + 12, h = fs + 8;
    var rx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    return '<g class="scope__tag' + (variant ? ' scope__tag--' + variant : '') + '">' +
      '<rect x="' + f1(rx) + '" y="' + f1(y - h / 2 - 3) + '" width="' + f1(w) + '" height="' + h + '" rx="4"/>' +
      '<text x="' + f1(rx + w / 2) + '" y="' + f1(y + fs / 2 - 4) + '" text-anchor="middle" font-size="' + fs + '">' + esc(text) + '</text></g>';
  }

  /**
   * Monte un graphique dans un élément et le redessine quand la largeur change.
   * getOptions(width) doit renvoyer les options de render().
   */
  function mount(el, getOptions, onRender) {
    var last = null;
    function draw() {
      var w = el.clientWidth || 640;
      var opts = getOptions(w);
      if (!opts.height) opts.height = Math.round(Math.max(210, Math.min(420, w * (opts.ratio || 0.5))));
      opts.width = w;
      var r = opts.kind === 'xy' ? TCL.plot.xy(opts) : render(opts);
      el.innerHTML = r.svg;
      last = r;
      if (onRender) onRender(r, el.firstChild);
    }
    draw();
    var ro = null;
    var lastW = el.clientWidth;
    if (root.ResizeObserver) {
      ro = new ResizeObserver(function () {
        if (Math.abs(el.clientWidth - lastW) > 2) { lastW = el.clientWidth; draw(); }
      });
      ro.observe(el);
    }
    return {
      update: draw,
      get scale() { return last && last.scale; },
      destroy: function () { if (ro) ro.disconnect(); }
    };
  }

  /**
   * Prépare les options standard d'une sinusoïde x(t) = A sin(2πft + φ),
   * avec repères facultatifs (période, décalage de phase par rapport à φ = 0).
   */
  function sineOptions(p) {
    var A = p.A, f = p.f, phi = p.phi || 0, win = p.win;
    var T = M.period(f);
    var periods = M.periodsInWindow(f, win);
    var dense = periods > 120;
    var samples = Math.min(6000, Math.max(400, Math.ceil(periods * 64)));
    var yMax = p.yMax || 10;
    var series = [];
    if (p.reference) {
      series.push({ fn: function (t) { return M.value(p.reference.A, f, 0, t); }, cls: 'scope__trace scope__trace--ref', samples: samples, dense: dense, amp: p.reference.A });
    }
    series.push({ fn: function (t) { return M.value(A, f, phi, t); }, cls: 'scope__trace', samples: samples, dense: dense, amp: A });
    (p.extra || []).forEach(function (s) { series.push(s); });

    var o = {
      tWindow: win, yMax: yMax, yStep: p.yStep, series: series,
      title: p.title || 'Signal sinusoïdal',
      desc: p.desc || ('Sinusoïde d’amplitude ' + M.formatNumber(A) + ' V, de fréquence ' + M.formatFrequency(f) + ', de période ' + M.formatTime(T) + ' et de phase ' + M.formatPhase(phi) + ' rad, affichée sur ' + M.formatTime(win) + '.'),
      yLabel: p.yLabel
    };

    if (dense) {
      o.note = 'Trop de périodes (' + M.formatNumber(periods, 3) + ') pour les distinguer : réduisez la fenêtre';
    }

    if (p.showPeriod && A > 0 && !dense) {
      var t0 = M.firstPeakTime(f, phi);
      if (t0 + T <= win * 1.0000001) {
        o.periodMarker = { t0: t0, T: T, peak: A, y: -yMax * 0.78, label: 'T = ' + M.formatTime(T) };
      }
    }
    if (p.showShift && p.reference && A > 0 && !dense && Math.abs(phi) > 1e-9) {
      var dt = M.timeShift(phi, f); // avance si > 0
      for (var k = 0; k < 6; k++) {
        var tr = T / 4 + k * T;          // crête de la référence (φ = 0)
        var ts = tr - dt;                // crête correspondante du signal
        if (tr <= win * 0.98 && ts >= win * 0.02 && ts <= win * 0.98) {
          o.shiftMarker = {
            from: tr, to: ts, y: Math.min(yMax * 0.8, A + yMax * 0.12), peak: A,
            label: 'Δt = ' + M.formatTime(Math.abs(dt), 3) + (dt > 0 ? ' (avance)' : ' (retard)')
          };
          break;
        }
      }
    }
    if (p.ampMarker && A > 0 && !dense) {
      var tp = M.firstPeakTime(f, phi);
      var tn = tp + T / 2;
      o.ampMarker = { t: tp, A: A, label: 'A = ' + M.formatNumber(A, 3) + ' V', pp: !!p.peakToPeak && tn <= win, ppT: tn, ppLabel: '2A = ' + M.formatNumber(2 * A, 3) + ' V' };
      if (o.ampMarker.pp) {
        o.ampMarker.ppT = tn;
        o.ampMarker.ppA = A;
      }
    }
    if (p.points) o.points = p.points;
    return o;
  }

  TCL.plot = { render: render, mount: mount, sineOptions: sineOptions, niceStep: niceStep, labelBox: labelBox, arrowH: arrowH, arrowV: arrowV };
})(window);
