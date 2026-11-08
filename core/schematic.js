/*
 * TELECOM CONNECT LAB 2.0 — Schémas techniques calculés (SVG)
 * ----------------------------------------------------------
 * Symboles de circuits (norme CEI : résistance rectangulaire), schémas-blocs.
 * Fonctions pures qui renvoient du texte : utilisables dans les leçons, les
 * laboratoires et les tests Node.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.schematic = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function n(x) { return Math.round(x * 10) / 10; }

  function svg(w, h, label, inner, dark) {
    return '<svg class="sk' + (dark ? ' sk--dark' : '') + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '" xmlns="http://www.w3.org/2000/svg"><rect class="sk__bg" x="0" y="0" width="' + w + '" height="' + h + '" rx="12"/>' + inner + '</svg>';
  }
  function wire(d) { return '<path class="sk__w" d="' + d + '"/>'; }
  function text(x, y, t, o) { o = o || {}; return '<text class="sk__t' + (o.cls ? ' ' + o.cls : '') + '" x="' + n(x) + '" y="' + n(y) + '" text-anchor="' + (o.a || 'middle') + '">' + esc(t) + '</text>'; }
  function node(x, y) { return '<circle class="sk__n" cx="' + n(x) + '" cy="' + n(y) + '" r="3.5"/>'; }

  /* Chaque dipôle est centré en (x, y) : axe horizontal (h) ou vertical (v), bornes à ±30. */
  function terminals(x, y, v, gap) {
    return v ? wire('M' + x + ' ' + (y - 30) + 'V' + (y - gap) + 'M' + x + ' ' + (y + gap) + 'V' + (y + 30)) : wire('M' + (x - 30) + ' ' + y + 'H' + (x - gap) + 'M' + (x + gap) + ' ' + y + 'H' + (x + 30));
  }
  function label(x, y, v, t) { return t ? (v ? text(x + 22, y + 5, t, { a: 'start' }) : text(x, y - 16, t)) : ''; }

  function R(x, y, v, t) { return terminals(x, y, v, 18) + (v ? '<rect class="sk__p" x="' + (x - 8) + '" y="' + (y - 18) + '" width="16" height="36"/>' : '<rect class="sk__p" x="' + (x - 18) + '" y="' + (y - 8) + '" width="36" height="16"/>') + label(x, y, v, t); }
  function C(x, y, v, t) {
    return terminals(x, y, v, 5) + (v ? wire('M' + (x - 14) + ' ' + (y - 5) + 'H' + (x + 14) + 'M' + (x - 14) + ' ' + (y + 5) + 'H' + (x + 14)) : wire('M' + (x - 5) + ' ' + (y - 14) + 'V' + (y + 14) + 'M' + (x + 5) + ' ' + (y - 14) + 'V' + (y + 14))) + label(x, y, v, t);
  }
  function L(x, y, v, t) {
    var a = '', i, r = 6;
    for (i = 0; i < 3; i++) a += v ? 'a' + r + ' ' + r + ' 0 0 1 0 ' + (2 * r) : 'a' + r + ' ' + r + ' 0 0 1 ' + (2 * r) + ' 0';
    return terminals(x, y, v, 18) + '<path class="sk__w" d="M' + (v ? x + ' ' + (y - 18) : (x - 18) + ' ' + y) + a + '"/>' + label(x, y, v, t);
  }
  /** Source : polarité + côté haut (ou droite). ac : sinusoïde. */
  function V(x, y, v, t, ac) {
    return terminals(x, y, v, 16) + '<circle class="sk__p" cx="' + x + '" cy="' + y + '" r="16"/>' +
      (ac ? '<path class="sk__w" d="M' + (x - 9) + ' ' + y + 'q4.5 -11 9 0t9 0"/>' : (v ? text(x, y - 3, '+', { cls: 'sk__s' }) + text(x, y + 11, '−', { cls: 'sk__s' }) : text(x + 7, y + 4, '+', { cls: 'sk__s' }) + text(x - 7, y + 4, '−', { cls: 'sk__s' }))) + (t ? (v ? text(x - 22, y + 5, t, { a: 'end' }) : text(x, y - 22, t)) : '');
  }
  function gnd(x, y) { return wire('M' + x + ' ' + y + 'v8M' + (x - 11) + ' ' + (y + 8) + 'h22M' + (x - 7) + ' ' + (y + 12) + 'h14M' + (x - 3) + ' ' + (y + 16) + 'h6'); }
  /** Diode : anode à gauche (h) ou en haut (v). zener : cathode en Z. led : flèches. */
  function D(x, y, v, t, kind) {
    var b = v ? 'M' + (x - 11) + ' ' + (y - 10) + 'h22l-11 20z' : 'M' + (x - 10) + ' ' + (y - 11) + 'v22l20 -11z';
    var bar = v ? 'M' + (x - 11) + ' ' + (y + 10) + 'h22' : 'M' + (x + 10) + ' ' + (y - 11) + 'v22';
    if (kind === 'zener') bar += v ? 'm-22 0v-5m22 5v5' : 'm0 -22h-5m5 22h5';
    return terminals(x, y, v, 10) + '<path class="sk__p" d="' + b + '"/>' + wire(bar) + (kind === 'led' ? wire('M' + (x + 8) + ' ' + (y - 14) + 'l8 -8m-5 0h5v5M' + (x + 14) + ' ' + (y - 10) + 'l8 -8m-5 0h5v5') : '') + label(x, y, v, t);
  }
  /** NPN : base à gauche (x-30, y), collecteur (x+15, y-35), émetteur (x+15, y+35). */
  function npn(x, y, t) {
    return wire('M' + (x - 30) + ' ' + y + 'H' + x + 'M' + x + ' ' + (y - 16) + 'V' + (y + 16) + 'M' + x + ' ' + (y - 8) + 'L' + (x + 15) + ' ' + (y - 20) + 'V' + (y - 35) + 'M' + x + ' ' + (y + 8) + 'L' + (x + 15) + ' ' + (y + 20) + 'V' + (y + 35)) + '<path class="sk__f" d="M' + (x + 15) + ' ' + (y + 20) + 'l-9 -2 4 -6z"/>' + '<circle class="sk__o" cx="' + (x + 7) + '" cy="' + y + '" r="24"/>' + (t ? text(x + 36, y + 5, t, { a: 'start' }) : '');
  }
  /** MOSFET canal N : grille (x-30, y), drain (x+15, y-35), source (x+15, y+35). */
  function nmos(x, y, t) {
    return wire('M' + (x - 30) + ' ' + y + 'H' + (x - 6) + 'M' + (x - 6) + ' ' + (y - 16) + 'V' + (y + 16) + 'M' + x + ' ' + (y - 16) + 'V' + (y - 6) + 'M' + x + ' ' + (y - 3) + 'V' + (y + 3) + 'M' + x + ' ' + (y + 6) + 'V' + (y + 16) + 'M' + x + ' ' + (y - 11) + 'H' + (x + 15) + 'V' + (y - 35) + 'M' + x + ' ' + (y + 11) + 'H' + (x + 15) + 'V' + (y + 35) + 'M' + x + ' ' + y + 'H' + (x + 15) + 'V' + (y + 11)) + '<path class="sk__f" d="M' + x + ' ' + y + 'l7 -4v8z"/>' + (t ? text(x + 26, y + 5, t, { a: 'start' }) : '');
  }
  /** AOP : entrées (x-40, y∓12) (− en haut), sortie (x+40, y). */
  function opamp(x, y) {
    return '<path class="sk__p" d="M' + (x - 28) + ' ' + (y - 32) + 'V' + (y + 32) + 'L' + (x + 32) + ' ' + y + 'z"/>' + wire('M' + (x - 40) + ' ' + (y - 12) + 'H' + (x - 28) + 'M' + (x - 40) + ' ' + (y + 12) + 'H' + (x - 28) + 'M' + (x + 32) + ' ' + y + 'H' + (x + 40)) + text(x - 20, y - 8, '−', { cls: 'sk__s' }) + text(x - 20, y + 16, '+', { cls: 'sk__s' });
  }

  function anchor(b, side) {
    if (side === 'l') return [b.x, b.y + b.h / 2];
    if (side === 'r') return [b.x + b.w, b.y + b.h / 2];
    if (side === 't') return [b.x + b.w / 2, b.y];
    return [b.x + b.w / 2, b.y + b.h];
  }
  /**
   * Schéma-blocs. o : { w, h, label, dark, boxes: [{ id, x, y, w, h, t, sub, on }],
   *                     links: [{ a, b, from?, to?, t?, dash?, both? }] }
   * Les liens sont droits ou en équerre : from/to = 'l','r','t','b'.
   */
  function blocks(o) {
    var by = {}, out = '', uid = 'a' + Math.abs(hash(o.label)).toString(36);
    o.boxes.forEach(function (b) { by[b.id] = b; });
    out += '<defs><marker id="' + uid + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="sk__f" d="M0 0L10 5L0 10z"/></marker></defs>';
    (o.links || []).forEach(function (l) {
      var A = by[l.a], B = by[l.b], sa = l.from || (B.x >= A.x + A.w ? 'r' : B.x + B.w <= A.x ? 'l' : B.y >= A.y ? 'b' : 't'), sb = l.to || (sa === 'r' ? 'l' : sa === 'l' ? 'r' : sa === 'b' ? 't' : 'b');
      var p = anchor(A, sa), q = anchor(B, sb), d;
      if (p[0] === q[0] || p[1] === q[1]) d = 'M' + p[0] + ' ' + p[1] + 'L' + q[0] + ' ' + q[1];
      else if (sa === 'r' || sa === 'l') { var mx = (p[0] + q[0]) / 2; d = 'M' + p[0] + ' ' + p[1] + 'H' + mx + 'V' + q[1] + 'H' + q[0]; }
      else { var my = (p[1] + q[1]) / 2; d = 'M' + p[0] + ' ' + p[1] + 'V' + my + 'H' + q[0] + 'V' + q[1]; }
      out += '<path class="sk__l' + (l.dash ? ' sk__l--d' : '') + (l.off ? ' sk__l--off' : '') + '" d="' + d + '" marker-end="url(#' + uid + ')"' + (l.both ? ' marker-start="url(#' + uid + ')"' : '') + '/>';
      if (l.t) out += text((p[0] + q[0]) / 2 + (l.dx || 0), (p[1] + q[1]) / 2 - 6 + (l.dy || 0), l.t, { cls: 'sk__c' });
    });
    o.boxes.forEach(function (b) {
      out += '<rect class="sk__b' + (b.on ? ' sk__b--on' : '') + '" x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" rx="7"/>' +
        text(b.x + b.w / 2, b.y + b.h / 2 + (b.sub ? -3 : 5), b.t, { cls: 'sk__bt' }) + (b.sub ? text(b.x + b.w / 2, b.y + b.h / 2 + 14, b.sub, { cls: 'sk__c' }) : '');
    });
    return svg(o.w, o.h, o.label, out, o.dark);
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  return { esc: esc, svg: svg, wire: wire, text: text, node: node, R: R, C: C, L: L, V: V, D: D, gnd: gnd, npn: npn, nmos: nmos, opamp: opamp, blocks: blocks };
});
