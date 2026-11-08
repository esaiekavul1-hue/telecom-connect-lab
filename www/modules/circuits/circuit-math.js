/*
 * TELECOM CONNECT LAB — Calculs du module « Circuits électriques »
 * ---------------------------------------------------------------
 * Modèle : régime continu, éléments linéaires idéaux. Le solveur applique
 * l'analyse nodale modifiée (lois de Kirchhoff + loi d'Ohm), résolue par
 * élimination de Gauss avec pivot partiel.
 *
 * Netlist : [{ type:'V'|'R'|'I', id, a, b, value }] ; le nœud '0' est la masse.
 *   V : a est la borne + ; I : le courant circule de a vers b à travers la source.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.circuitMath = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function series(list) { return list.reduce(function (s, r) { return s + r; }, 0); }
  function parallel(list) {
    if (list.some(function (r) { return r === 0; })) return 0;
    return 1 / list.reduce(function (s, r) { return s + 1 / r; }, 0);
  }
  function current(u, r) { return u / r; }
  function powerRI(r, i) { return r * i * i; }
  function divider(v, r1, r2) { return v * r2 / (r1 + r2); }

  /** Constante de temps RC (s) et charge du condensateur : u(t) = E(1 − e^(−t/τ)) + u0·e^(−t/τ). */
  function tau(r, c) { return r * c; }
  function rcCharge(e, r, c, t, u0) { var x = Math.exp(-t / tau(r, c)); return e * (1 - x) + (u0 || 0) * x; }

  /** Résout A·x = b. Renvoie null si le système est singulier. */
  function solveLinear(A, b) {
    var n = b.length, m = A.map(function (row, i) { return row.concat(b[i]); });
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
      if (Math.abs(m[p][c]) < 1e-12) return null;
      var tmp = m[c]; m[c] = m[p]; m[p] = tmp;
      for (var j = c + 1; j < n; j++) {
        var f = m[j][c] / m[c][c];
        if (f === 0) continue;
        for (var k = c; k <= n; k++) m[j][k] -= f * m[c][k];
      }
    }
    var x = new Array(n);
    for (var i = n - 1; i >= 0; i--) {
      var s = m[i][n];
      for (var l = i + 1; l < n; l++) s -= m[i][l] * x[l];
      x[i] = s / m[i][i];
    }
    return x;
  }

  /**
   * Analyse nodale modifiée.
   * Renvoie { ok:true, v:{nœud:tension}, elements:{id:{u,i,p}}, delivered, absorbed }
   * ou { ok:false, error } si le circuit n'a pas de solution unique.
   * Pour chaque élément : u = v(a) − v(b), i de a vers b, p = u·i (p > 0 : absorbe).
   */
  function solveDC(netlist) {
    var names = {};
    netlist.forEach(function (e) { [e.a, e.b].forEach(function (x) { if (x !== '0') names[x] = 1; }); });
    var nodes = Object.keys(names), idx = {};
    nodes.forEach(function (x, i) { idx[x] = i; });
    var sources = netlist.filter(function (e) { return e.type === 'V'; });
    var n = nodes.length, size = n + sources.length;
    if (netlist.every(function (e) { return e.a !== '0' && e.b !== '0'; })) return { ok: false, error: 'Aucun élément n’est relié à la masse.' };
    for (var z = 0; z < netlist.length; z++) {
      if (netlist[z].type === 'R' && !(netlist[z].value > 0)) return { ok: false, error: 'Une résistance doit être strictement positive.' };
    }
    var A = [], b = [];
    for (var i = 0; i < size; i++) { A.push(new Array(size).fill(0)); b.push(0); }
    function at(x) { return x === '0' ? -1 : idx[x]; }
    netlist.forEach(function (e) {
      var p = at(e.a), q = at(e.b);
      if (e.type === 'R') {
        var g = 1 / e.value;
        if (p >= 0) A[p][p] += g;
        if (q >= 0) A[q][q] += g;
        if (p >= 0 && q >= 0) { A[p][q] -= g; A[q][p] -= g; }
      } else if (e.type === 'I') {
        if (p >= 0) b[p] -= e.value;
        if (q >= 0) b[q] += e.value;
      }
    });
    sources.forEach(function (e, s) {
      var r = n + s, p = at(e.a), q = at(e.b);
      if (p >= 0) { A[p][r] += 1; A[r][p] += 1; }
      if (q >= 0) { A[q][r] -= 1; A[r][q] -= 1; }
      b[r] = e.value;
    });
    var x = solveLinear(A, b);
    if (!x) return { ok: false, error: 'Le circuit n’a pas de solution unique : nœud flottant, sources en conflit ou court-circuit d’une source.' };
    var v = { '0': 0 };
    nodes.forEach(function (name, i) { v[name] = x[i]; });
    var elements = {}, delivered = 0, absorbed = 0, sIdx = 0;
    netlist.forEach(function (e) {
      var u = v[e.a] - v[e.b], cur;
      if (e.type === 'R') cur = u / e.value;
      else if (e.type === 'I') cur = e.value;
      else cur = x[n + sIdx++];
      var pw = u * cur;
      elements[e.id] = { u: u, i: cur, p: pw };
      if (pw >= 0) absorbed += pw; else delivered += -pw;
    });
    return { ok: true, v: v, elements: elements, delivered: delivered, absorbed: absorbed };
  }

  /**
   * Diviseur chargé, mesuré par un voltmètre et un ampèremètre non idéaux.
   * Source E → (ampèremètre Ra) → R1 → nœud m → R2 // charge RL // voltmètre Rv → masse.
   * Options : RL = null (pas de charge), Rv = null (pas de voltmètre), Ra = 0 (ampèremètre idéal).
   */
  function dividerCircuit(p) {
    var net = [{ type: 'V', id: 'E', a: 's', b: '0', value: p.E }];
    if (p.Ra > 0) {
      net.push({ type: 'R', id: 'Ra', a: 's', b: 'in', value: p.Ra });
      net.push({ type: 'R', id: 'R1', a: 'in', b: 'm', value: p.R1 });
    } else {
      net.push({ type: 'R', id: 'R1', a: 's', b: 'm', value: p.R1 });
    }
    net.push({ type: 'R', id: 'R2', a: 'm', b: '0', value: p.R2 });
    if (p.RL) net.push({ type: 'R', id: 'RL', a: 'm', b: '0', value: p.RL });
    if (p.Rv) net.push({ type: 'R', id: 'Rv', a: 'm', b: '0', value: p.Rv });
    return solveDC(net);
  }

  return { series: series, parallel: parallel, current: current, powerRI: powerRI, divider: divider, tau: tau, rcCharge: rcCharge,
    solveLinear: solveLinear, solveDC: solveDC, dividerCircuit: dividerCircuit };
});
