/*
 * TELECOM CONNECT LAB — Fibre optique : calculs
 * --------------------------------------------
 *   Loi de Snell-Descartes : n1 sin θ1 = n2 sin θ2 (angles mesurés depuis la normale)
 *   Angle critique (cœur → gaine) : θc = arcsin(n2 / n1)
 *   Ouverture numérique : ON = √(n1² − n2²) ; angle d'acceptance : θa = arcsin(ON / n0)
 *   Bilan de puissance : Pr = Pe − α·L − Ne·ae − Nc·ac  (dBm, dB/km, km, dB)
 *   Dispersion modale (fibre multimode à saut d'indice, optique géométrique) :
 *     ΔT = (L · n1 / c) · (n1/n2 − 1)
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.fiberMath = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var C = 299792458, D2R = Math.PI / 180, R2D = 180 / Math.PI;

  /** Angle de réfraction (degrés) ou null en cas de réflexion totale. */
  function snell(n1, thetaDeg, n2) {
    var s = n1 * Math.sin(thetaDeg * D2R) / n2;
    return Math.abs(s) > 1 ? null : Math.asin(s) * R2D;
  }
  function criticalAngle(n1, n2) { return n2 < n1 ? Math.asin(n2 / n1) * R2D : null; }
  function numericalAperture(n1, n2) { return Math.sqrt(Math.max(0, n1 * n1 - n2 * n2)); }
  function acceptanceAngle(n1, n2, n0) { var na = numericalAperture(n1, n2) / (n0 || 1); return na >= 1 ? 90 : Math.asin(na) * R2D; }

  /**
   * Trajet d'un rayon entrant dans la fibre depuis l'air avec l'angle θ (par rapport à l'axe).
   * Renvoie l'angle dans le cœur, l'angle d'incidence sur la gaine, et s'il est guidé.
   */
  function ray(n0, n1, n2, thetaInDeg) {
    var inCore = snell(n0, thetaInDeg, n1);            // angle avec l'axe, dans le cœur
    var incidence = 90 - inCore;                       // angle avec la normale à l'interface cœur-gaine
    var crit = criticalAngle(n1, n2);
    var guided = crit != null && incidence >= crit - 1e-12;
    return { inCore: inCore, incidence: incidence, critical: crit, guided: guided, escape: guided ? null : snell(n1, incidence, n2) };
  }

  /** Puissance reçue (dBm) et détail des pertes. p = { pt, alpha, L, splices, spliceLoss, connectors, connectorLoss } */
  function budget(p) {
    var fiber = p.alpha * p.L, sp = p.splices * p.spliceLoss, co = p.connectors * p.connectorLoss;
    var total = fiber + sp + co;
    return { fiber: fiber, splices: sp, connectors: co, total: total, pr: p.pt - total };
  }
  /** Longueur maximale (km) pour laquelle Pr ≥ sensibilité, à nombre d'épissures et de connecteurs fixé. */
  function maxLength(p) { return Math.max(0, (p.pt - p.sens - p.splices * p.spliceLoss - p.connectors * p.connectorLoss) / p.alpha); }

  /** Temps de parcours (s) d'un rayon axial : t = L·n1/c (L en km). */
  function transitTime(Lkm, n1) { return Lkm * 1000 * n1 / C; }
  /** Étalement des temps de parcours (s) entre le rayon axial et le rayon le plus incliné guidé. */
  function modalDispersion(Lkm, n1, n2) { return Lkm * 1000 * n1 / C * (n1 / n2 - 1); }
  /** Ordre de grandeur du débit maximal (bit/s) limité par la dispersion : ≈ 1/(2 ΔT). */
  function maxBitRate(dt) { return dt > 0 ? 1 / (2 * dt) : Infinity; }

  function dbmToMw(dbm) { return Math.pow(10, dbm / 10); }

  return { C: C, snell: snell, criticalAngle: criticalAngle, numericalAperture: numericalAperture, acceptanceAngle: acceptanceAngle, ray: ray,
    budget: budget, maxLength: maxLength, transitTime: transitTime, modalDispersion: modalDispersion, maxBitRate: maxBitRate, dbmToMw: dbmToMw };
});
