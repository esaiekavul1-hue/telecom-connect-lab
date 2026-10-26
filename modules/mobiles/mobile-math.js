/*
 * TELECOM CONNECT LAB — Réseaux mobiles : calculs
 * ----------------------------------------------
 * Modèle cellulaire classique à cellules hexagonales de rayon R.
 *   Taille du motif de réutilisation : N = i² + i·j + j²  (i, j entiers)
 *   Distance de réutilisation : D = R √(3N) ;  Q = D/R = √(3N)
 *   Rapport porteuse/interférence (1re couronne, 6 interférents, exposant n) :
 *     C/I = Q^n / 6
 *   Surface d'une cellule : 3√3/2 · R²
 *   Affaiblissement (modèle log-distance, référence espace libre à 1 m) :
 *     PL(d) = 20 log10(4π/λ) + 10 n log10(d / 1 m)
 *
 * Coordonnées « axiales » (q, r) des hexagones (pointe en haut) :
 *   x = R√3 (q + r/2),  y = 1,5 R r
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.mobileMath = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var C = 299792458;
  var SHIFTS = { 1: [1, 0], 3: [1, 1], 4: [2, 0], 7: [2, 1], 9: [3, 0], 12: [2, 2], 13: [3, 1], 19: [3, 2] };

  function clusterSize(i, j) { return i * i + i * j + j * j; }
  function shiftFor(N) { return SHIFTS[N] || null; }
  function reuseRatio(N) { return Math.sqrt(3 * N); }
  function reuseDistance(R, N) { return R * Math.sqrt(3 * N); }
  function carrierToInterference(N, n, interferers) { return Math.pow(reuseRatio(N), n) / (interferers || 6); }
  function toDb(x) { return 10 * Math.log10(x); }
  function cellArea(R) { return 1.5 * Math.sqrt(3) * R * R; }
  function cellsToCover(area, R) { return Math.ceil(area / cellArea(R) - 1e-9); }
  function channelsPerCell(S, N) { return Math.floor(S / N); }

  /** Plus petit motif N (parmi les valeurs réalisables) qui donne C/I ≥ cible (dB). */
  function minClusterFor(targetDb, n) {
    var sizes = Object.keys(SHIFTS).map(Number).sort(function (a, b) { return a - b; });
    for (var k = 0; k < sizes.length; k++) if (toDb(carrierToInterference(sizes[k], n)) >= targetDb) return sizes[k];
    return null;
  }

  /* ----------------------------- Grille hexagonale ----------------------------- */

  function axialToXY(q, r, R) { return { x: R * Math.sqrt(3) * (q + r / 2), y: 1.5 * R * r }; }

  /**
   * Cellules dans un rayon de « rings » couronnes autour de l'origine, chacune avec
   * son groupe de fréquences (0…N−1). Deux cellules du même groupe utilisent les
   * mêmes fréquences.
   */
  function grid(rings, N) {
    var sh = shiftFor(N) || [1, 0], i = sh[0], j = sh[1], cells = [], keys = {}, next = 0;
    for (var q = -rings; q <= rings; q++) {
      for (var r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) cells.push({ q: q, r: r, ring: Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) });
    }
    cells.sort(function (a, b) { return a.ring - b.ring || Math.atan2(a.r, a.q) - Math.atan2(b.r, b.q); });
    cells.forEach(function (c) {
      // classe de (q, r) modulo le réseau engendré par a = (i, j) et b = (−j, i + j)
      var m = ((c.q * (i + j) + c.r * j) % N + N) % N, n = ((i * c.r - j * c.q) % N + N) % N, key = m + ',' + n;
      if (!(key in keys)) keys[key] = next++;
      c.group = keys[key];
    });
    return cells;
  }

  /** Affaiblissement de trajet (dB), modèle log-distance avec référence à 1 m. d en mètres. */
  function pathLoss(dMeters, f, n) {
    var lam = C / f, d = Math.max(1, dMeters);
    return 20 * Math.log10(4 * Math.PI / lam) + 10 * n * Math.log10(d);
  }
  /** Rayon (m) au-delà duquel la puissance reçue passe sous la sensibilité. */
  function coverageRadius(pt, g, sens, f, n) {
    var lam = C / f;
    return Math.pow(10, (pt + g - sens - 20 * Math.log10(4 * Math.PI / lam)) / (10 * n));
  }

  /**
   * Puissances reçues par un mobile placé en (x, y) (km) depuis toutes les stations.
   * p = { R (km), N, n, pt, g, f, rings }
   */
  function measure(p, x, y) {
    var cells = grid(p.rings, p.N);
    var list = cells.map(function (c) {
      var pos = axialToXY(c.q, c.r, p.R), d = Math.hypot(x - pos.x, y - pos.y) * 1000;
      return { cell: c, x: pos.x, y: pos.y, d: d, pr: p.pt + p.g - pathLoss(d, p.f, p.n) };
    }).sort(function (a, b) { return b.pr - a.pr; });
    var best = list[0], mw = function (dbm) { return Math.pow(10, dbm / 10); };
    var interf = list.filter(function (e) { return e !== best && e.cell.group === best.cell.group; }).reduce(function (s, e) { return s + mw(e.pr); }, 0);
    return { best: best, second: list[1], list: list, sirDb: interf > 0 ? best.pr - 10 * Math.log10(interf) : Infinity, interferers: list.filter(function (e) { return e !== best && e.cell.group === best.cell.group; }).length };
  }

  return { C: C, SHIFTS: SHIFTS, clusterSize: clusterSize, shiftFor: shiftFor, reuseRatio: reuseRatio, reuseDistance: reuseDistance,
    carrierToInterference: carrierToInterference, toDb: toDb, cellArea: cellArea, cellsToCover: cellsToCover, channelsPerCell: channelsPerCell,
    minClusterFor: minClusterFor, axialToXY: axialToXY, grid: grid, pathLoss: pathLoss, coverageRadius: coverageRadius, measure: measure };
});
