/*
 * TELECOM CONNECT LAB — Propagation radio : calculs (modèle d'espace libre)
 * -----------------------------------------------------------------------
 *   Affaiblissement en espace libre (formule de Friis) :
 *     FSPL (dB) = 20 log10(4π d f / c)
 *     ≈ 20 log10(d en km) + 20 log10(f en MHz) + 32,45
 *   Bilan de liaison :
 *     Pr = Pt + Gt + Gr − FSPL − L    (dBm, dBi, dB)
 *   Marge = Pr − S (sensibilité du récepteur)
 *   Portée maximale : distance pour laquelle Pr = S.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.propMath = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var C = 299792458;

  function log10(x) { return Math.log(x) / Math.LN10; }

  /** Affaiblissement en espace libre (dB). d en mètres, f en hertz. */
  function fspl(d, f) { return 20 * log10(4 * Math.PI * d * f / C); }

  /** Puissance reçue (dBm). p = { pt, gt, gr, f, d, loss } */
  function received(p) { return p.pt + p.gt + p.gr - fspl(p.d, p.f) - (p.loss || 0); }

  function margin(p) { return received(p) - p.sens; }

  /** Distance (m) à laquelle la puissance reçue est égale à la sensibilité. */
  function maxRange(p) {
    return C / (4 * Math.PI * p.f) * Math.pow(10, (p.pt + p.gt + p.gr - (p.loss || 0) - p.sens) / 20);
  }

  /** PIRE : puissance isotrope rayonnée équivalente (dBm). */
  function eirp(p) { return p.pt + p.gt; }

  function dbmToWatt(dbm) { return Math.pow(10, dbm / 10) / 1000; }
  function wattToDbm(w) { return 10 * log10(w * 1000); }

  /** Variation d'affaiblissement (dB) quand la distance ou la fréquence est multipliée par r. */
  function deltaDb(r) { return 20 * log10(r); }

  /* ----------------------- Modèle à deux rayons (sol) ----------------------- */
  /*
   * Rayon direct + rayon réfléchi par un sol plan, coefficient de réflexion
   * Γ = −1 (incidence rasante, approximation classique). ht, hr en mètres.
   *   d1 = √(d² + (ht − hr)²),  d2 = √(d² + (ht + hr)²),  Δ = d2 − d1
   *   Pr = Pt + Gt + Gr − L + 20 log10(λ/4π) + 10 log10(|e^{−jkd1}/d1 − e^{−jkd2}/d2|²)
   * avec |…|² = (Δ/(d1 d2))² + 4 sin²(kΔ/2)/(d1 d2), écriture stable numériquement.
   */
  function twoRayGainDb(d, f, ht, hr) {
    var lam = C / f, k = 2 * Math.PI / lam;
    var d1 = Math.sqrt(d * d + (ht - hr) * (ht - hr)), d2 = Math.sqrt(d * d + (ht + hr) * (ht + hr));
    var delta = 4 * ht * hr / (d1 + d2);
    var sn = Math.sin(k * delta / 2);
    var mag2 = Math.pow(delta / (d1 * d2), 2) + 4 * sn * sn / (d1 * d2);
    return 20 * log10(lam / (4 * Math.PI)) + 10 * log10(Math.max(mag2, 1e-300));
  }
  /** Affaiblissement de trajet (dB) du modèle à deux rayons. */
  function twoRayLoss(d, f, ht, hr) { return -twoRayGainDb(d, f, ht, hr); }
  function receivedTwoRay(p) { return p.pt + p.gt + p.gr - (p.loss || 0) + twoRayGainDb(p.d, p.f, p.ht, p.hr); }
  /** Distance de rupture : au-delà, Pr décroît d'environ 40 dB par décade. */
  function breakpoint(f, ht, hr) { return 4 * ht * hr / (C / f); }
  /** Plus grande distance (m) où Pr ≥ S avec le modèle à deux rayons (recherche numérique). */
  function maxRangeTwoRay(p) {
    var hi = 1e7, lo = 1;
    var ok = function (d) { return receivedTwoRay(Object.assign({}, p, { d: d })) >= p.sens; };
    if (ok(hi)) return hi;
    // on parcourt les distances en décroissant (échelle log) jusqu'au premier point qui convient
    var n = 4000, prev = hi;
    for (var i = 1; i <= n; i++) {
      var d = Math.pow(10, 7 - 7 * i / n);
      if (ok(d)) { lo = d; hi = prev; break; }
      prev = d;
      if (i === n) return 0;
    }
    for (var j = 0; j < 60; j++) { var mid = Math.sqrt(lo * hi); if (ok(mid)) lo = mid; else hi = mid; }
    return lo;
  }
  /** Horizon radioélectrique (m), atmosphère standard (rayon terrestre équivalent 4/3) : ≈ 4,12 (√ht + √hr) km. */
  function radioHorizon(ht, hr) { return 4120 * (Math.sqrt(ht) + Math.sqrt(hr)); }
  /** Rayon de la première zone de Fresnel (m) au point situé à d1 et d2 des extrémités. */
  function fresnelRadius(f, d1, d2) { var lam = C / f; return Math.sqrt(lam * d1 * d2 / (d1 + d2)); }

  /* ------------------- Obstacle : diffraction sur une arête ------------------- */
  /*
   * Modèle de l'arête en lame de couteau (UIT-R P.526) : un obstacle unique,
   * mince, dont le sommet est à h mètres au-dessus (h > 0) ou au-dessous (h < 0)
   * de la ligne directe, à d1 de l'émetteur et d2 du récepteur.
   *   ν = h · √(2 (d1 + d2) / (λ d1 d2))
   *   J(ν) ≈ 6,9 + 20 log10(√((ν − 0,1)² + 1) + ν − 0,1)  pour ν > −0,78, sinon 0
   */
  function knifeEdgeNu(h, d1, d2, f) { var lam = C / f; return h * Math.sqrt(2 * (d1 + d2) / (lam * d1 * d2)); }
  function knifeEdgeLoss(nu) { return nu > -0.78 ? 6.9 + 20 * log10(Math.sqrt((nu - 0.1) * (nu - 0.1) + 1) + nu - 0.1) : 0; }
  /** Plus grande distance (m, entre 1 m et 10 000 km) vérifiant ok(d), recherche numérique sur une échelle logarithmique. */
  function maxRangeFn(ok) {
    var hi = 1e7, lo = 1;
    if (ok(hi)) return hi;
    var n = 4000, prev = hi;
    for (var i = 1; i <= n; i++) {
      var d = Math.pow(10, 7 - 7 * i / n);
      if (ok(d)) { lo = d; hi = prev; break; }
      prev = d;
      if (i === n) return 0;
    }
    for (var j = 0; j < 60; j++) { var mid = Math.sqrt(lo * hi); if (ok(mid)) lo = mid; else hi = mid; }
    return lo;
  }

  return { C: C, fspl: fspl, twoRayGainDb: twoRayGainDb, twoRayLoss: twoRayLoss, receivedTwoRay: receivedTwoRay, breakpoint: breakpoint, maxRangeTwoRay: maxRangeTwoRay, radioHorizon: radioHorizon, fresnelRadius: fresnelRadius, knifeEdgeNu: knifeEdgeNu, knifeEdgeLoss: knifeEdgeLoss, maxRangeFn: maxRangeFn, received: received, margin: margin, maxRange: maxRange, eirp: eirp, dbmToWatt: dbmToWatt, wattToDbm: wattToDbm, deltaDb: deltaDb };
});
