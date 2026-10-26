/*
 * TELECOM CONNECT LAB — Graphique XY générique (même style « oscilloscope »)
 * -----------------------------------------------------------------------
 * Utilisé par les simulations qui ne tracent pas une grandeur en fonction du
 * temps : distance, fréquence (échelle logarithmique), spectre en barres…
 *
 * TCL.plot.xy(options) -> { svg, scale }   (ou TCL.plot.mount avec kind: 'xy')
 *
 * options :
 *   x / y : { min, max, log?, ticks?, format?(v), label }
 *   series : [{ points: [[x, y], …] } ou { fn: x => y, samples }, cls ]
 *   bars   : [{ x, y, base?, cls?, label? }]          (raies d'un spectre)
 *   bands  : [{ x0, x1, label, cls? }]                (zones colorées : bandes radio…)
 *   hlines / vlines : [{ y | x, label?, cls? }]
 *   points : [{ x, y, label?, cls? }]
 *   arrows : [{ x1, x2, y, label?, variant? }]        (cote horizontale)
 *   note   : message d'avertissement affiché en haut
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath;
  var esc = function (s) { return TCL.util.esc(s); };

  function f1(v) { return Math.round(v * 10) / 10; }

  function niceTicks(min, max, count) {
    var step = TCL.plot.niceStep(max - min, count || 6);
    var start = Math.ceil(min / step - 1e-9) * step;
    var out = [];
    for (var v = start; v <= max + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12)));
    return out;
  }

  function logTicks(min, max) {
    var out = [];
    var a = Math.floor(Math.log10(min)), b = Math.ceil(Math.log10(max));
    var decades = b - a;
    for (var e = a; e <= b; e++) {
      [1, 2, 5].forEach(function (m) {
        if (m !== 1 && decades > 3) return;
        var v = m * Math.pow(10, e);
        if (v >= min * (1 - 1e-9) && v <= max * (1 + 1e-9)) out.push(v);
      });
    }
    return out;
  }

  var counter = 0;

  function xy(o) {
    var W = Math.max(280, Math.round(o.width || 640));
    var H = Math.max(180, Math.round(o.height || 320));
    var compact = W < 480;
    var m = { l: o.marginLeft || (compact ? 46 : 60), r: compact ? 12 : 20, t: compact ? 24 : 26, b: compact ? 36 : 42 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var x = o.x, y = o.y;
    var fs = compact ? 10.5 : 12;
    var lx0 = x.log ? Math.log10(x.min) : 0, lx1 = x.log ? Math.log10(x.max) : 0;
    var X = function (v) {
      if (x.log) return m.l + (Math.log10(Math.max(v, x.min * 1e-6)) - lx0) / (lx1 - lx0) * pw;
      return m.l + (v - x.min) / (x.max - x.min) * pw;
    };
    var ly0 = y.log ? Math.log10(y.min) : 0, ly1 = y.log ? Math.log10(y.max) : 0;
    var Y = function (v) {
      if (y.log) return m.t + ph - (Math.log10(Math.max(v, y.min * 1e-3)) - ly0) / (ly1 - ly0) * ph;
      return m.t + ph - (v - y.min) / (y.max - y.min) * ph;
    };
    var fx = x.format || function (v) { return M.formatNumber(v, 4); };
    var fy = y.format || function (v) { return M.formatNumber(v, 4); };
    var id = 'xy' + (++counter);
    var out = [];

    out.push('<svg class="scope" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-labelledby="' + id + 't ' + id + 'd" xmlns="http://www.w3.org/2000/svg">');
    out.push('<title id="' + id + 't">' + esc(o.title || 'Graphique') + '</title><desc id="' + id + 'd">' + esc(o.desc || '') + '</desc>');
    out.push('<rect class="scope__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="' + (compact ? 10 : 14) + '"/>');
    out.push('<defs><clipPath id="' + id + 'c"><rect x="' + m.l + '" y="' + (m.t - 2) + '" width="' + pw + '" height="' + (ph + 4) + '"/></clipPath></defs>');

    // Zones colorées (sous la grille)
    (o.bands || []).forEach(function (b, i) {
      var a = Math.max(m.l, X(b.x0)), c = Math.min(m.l + pw, X(b.x1));
      if (c <= a) return;
      out.push('<rect class="' + (b.cls || ('scope__zone' + (i % 2 ? ' scope__zone--alt' : ''))) + '" x="' + f1(a) + '" y="' + m.t + '" width="' + f1(c - a) + '" height="' + ph + '"/>');
      if (b.label && c - a > fs * 2.2) out.push('<text class="scope__zone-label" x="' + f1((a + c) / 2) + '" y="' + (m.t + 14) + '" text-anchor="middle" font-size="' + (fs - 1) + '">' + esc(b.label) + '</text>');
    });

    var xt = x.ticks || (x.log ? logTicks(x.min, x.max) : niceTicks(x.min, x.max, compact ? 4 : 6));
    xt.forEach(function (v) {
      var px = f1(X(v));
      out.push('<line class="scope__grid" x1="' + px + '" y1="' + m.t + '" x2="' + px + '" y2="' + (m.t + ph) + '"/>');
      var anchor = px > m.l + pw - 18 ? 'end' : (px < m.l + 18 && v !== 0 ? 'start' : 'middle');
      out.push('<text class="scope__tick" x="' + (anchor === 'end' ? px + 2 : px) + '" y="' + (m.t + ph + 16) + '" text-anchor="' + anchor + '" font-size="' + fs + '">' + esc(fx(v)) + '</text>');
    });
    var yt = y.ticks || (y.log ? logTicks(y.min, y.max) : niceTicks(y.min, y.max, compact ? 5 : 6));
    yt.forEach(function (v) {
      var py = f1(Y(v));
      out.push('<line class="' + (v === 0 && y.zeroLine !== false && y.min < 0 ? 'scope__axis' : 'scope__grid') + '" x1="' + m.l + '" y1="' + py + '" x2="' + (m.l + pw) + '" y2="' + py + '"/>');
      out.push('<text class="scope__tick" x="' + (m.l - 7) + '" y="' + (py + 4) + '" text-anchor="end" font-size="' + fs + '">' + esc(fy(v)) + '</text>');
    });
    out.push('<rect class="scope__frame" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '"/>');
    if (x.label) out.push('<text class="scope__label" x="' + (m.l + pw) + '" y="' + (H - 6) + '" text-anchor="end" font-size="' + fs + '">' + esc(x.label) + '</text>');
    if (y.label) out.push('<text class="scope__label" x="' + m.l + '" y="' + (m.t - 8) + '" font-size="' + fs + '">' + esc(y.label) + '</text>');

    out.push('<g clip-path="url(#' + id + 'c)">');

    (o.vlines || []).forEach(function (l) {
      var px = f1(X(l.x));
      out.push('<line class="' + (l.cls || 'scope__guide') + '" x1="' + px + '" y1="' + m.t + '" x2="' + px + '" y2="' + (m.t + ph) + '"/>');
    });
    (o.hlines || []).forEach(function (l) {
      var py = f1(Y(l.y));
      out.push('<line class="' + (l.cls || 'scope__limit') + '" x1="' + m.l + '" y1="' + py + '" x2="' + (m.l + pw) + '" y2="' + py + '"/>');
    });

    (o.bars || []).forEach(function (b) {
      var base = b.base != null ? b.base : (y.min < 0 && y.max > 0 ? 0 : y.min);
      var px = f1(X(b.x)), y0 = f1(Y(base)), y1 = f1(Y(b.y));
      out.push('<line class="' + (b.cls || 'scope__bar') + '" x1="' + px + '" y1="' + y0 + '" x2="' + px + '" y2="' + y1 + '"/>');
      out.push('<circle class="scope__bar-cap' + (b.cls && b.cls.indexOf('--alt') >= 0 ? ' scope__bar-cap--alt' : '') + '" cx="' + px + '" cy="' + y1 + '" r="3"/>');
    });

    (o.series || []).forEach(function (s) {
      var pts = s.points;
      if (!pts && s.fn) {
        var n = s.samples || 500;
        pts = [];
        for (var i = 0; i <= n; i++) {
          var xv = x.log ? Math.pow(10, lx0 + (lx1 - lx0) * i / n) : x.min + (x.max - x.min) * i / n;
          pts.push([xv, s.fn(xv)]);
        }
      }
      var d = '', started = false, span = y.max - y.min;
      pts.forEach(function (p) {
        if (!isFinite(p[1])) { started = false; return; }
        var yy = y.log ? Math.max(y.min * 0.5, Math.min(y.max * 2, p[1])) : Math.max(y.min - span * 0.3, Math.min(y.max + span * 0.3, p[1]));
        d += (started ? 'L' : 'M') + f1(X(p[0])) + ' ' + f1(Y(yy));
        started = true;
      });
      if (d) out.push('<path class="' + (s.cls || 'scope__trace') + '" d="' + d + '"/>');
    });

    // Nuage de petits points (échantillons d'un signal bruité, positions…)
    if (o.dots && o.dots.length) {
      var dd = '';
      o.dots.forEach(function (p) {
        var px = X(p.x), py = Y(Math.max(y.min, Math.min(y.max, p.y)));
        dd += 'M' + f1(px - 1.4) + ' ' + f1(py) + 'h2.8';
      });
      out.push('<path class="' + (o.dots[0].cls || 'scope__sample') + '" d="' + dd + '"/>');
    }

    (o.arrows || []).forEach(function (a) {
      var xa = f1(X(a.x1)), xb = f1(X(a.x2)), yy = f1(Y(a.y));
      if (a.guides) {
        a.guides.forEach(function (g) { out.push('<line class="scope__guide" x1="' + f1(X(g.x)) + '" y1="' + f1(Y(g.y)) + '" x2="' + f1(X(g.x)) + '" y2="' + (yy + 6) + '"/>'); });
      }
      if (Math.abs(xb - xa) > 3) out.push(TCL.plot.arrowH(xa, xb, yy, 'scope__mark' + (a.variant ? ' scope__mark--' + a.variant : ''), !!a.single));
      if (a.label) out.push(TCL.plot.labelBox((xa + xb) / 2, yy - 17, a.label, 'middle', fs, a.variant));
    });

    out.push('</g>');

    (o.hlines || []).forEach(function (l) {
      if (!l.label) return;
      var py = Y(l.y);
      out.push(TCL.plot.labelBox(l.anchor === 'start' ? m.l + 8 : m.l + pw - 8, py - 13, l.label, l.anchor === 'start' ? 'start' : 'end', fs, l.variant || 'alt'));
    });
    (o.vlines || []).forEach(function (l) {
      if (!l.label) return;
      var px = X(l.x), anchor = px > m.l + pw * 0.72 ? 'end' : (px < m.l + pw * 0.28 ? 'start' : 'middle');
      out.push(TCL.plot.labelBox(anchor === 'end' ? px - 6 : (anchor === 'start' ? px + 6 : px), m.t + 30, l.label, anchor, fs, l.variant));
    });
    (o.points || []).forEach(function (p) {
      var px = f1(X(p.x)), py = f1(Y(Math.max(y.min, Math.min(y.max, p.y))));
      out.push('<circle class="' + (p.cls || 'scope__point') + '" cx="' + px + '" cy="' + py + '" r="5.5"/>');
      if (p.label) {
        var right = px < m.l + pw * 0.6;
        out.push(TCL.plot.labelBox(right ? px + 10 : px - 10, py - 14, p.label, right ? 'start' : 'end', fs, p.variant));
      }
    });
    (o.barLabels || []).forEach(function (b) {
      out.push('<text class="scope__tick" x="' + f1(X(b.x)) + '" y="' + f1(Y(b.y) - 8) + '" text-anchor="middle" font-size="' + (fs - 1) + '">' + esc(b.label) + '</text>');
    });

    if (o.note) out.push(TCL.plot.labelBox(m.l + pw / 2, m.t + 16, o.note, 'middle', fs, 'warn'));
    out.push('</svg>');
    return { svg: out.join(''), scale: { left: m.l, top: m.t, width: pw, height: ph, W: W, H: H, X: X, Y: Y } };
  }

  TCL.plot.xy = xy;
  TCL.plot.niceTicks = niceTicks;
  TCL.plot.logTicks = logTicks;
})(window);
