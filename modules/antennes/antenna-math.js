/*
 * TELECOM CONNECT LAB — Antennes : calculs
 * ---------------------------------------
 * Géométrie retenue : dipôles verticaux (axe z), alignés le long de l'axe x
 * avec un espacement d (exprimé en longueurs d'onde) et un déphasage
 * progressif β entre deux éléments voisins.
 *
 *   Diagramme d'un élément (champ, normalisé) en fonction de θ (angle avec z) :
 *     dipôle court       : |sin θ|
 *     dipôle demi-onde   : |cos(π/2 · cos θ) / sin θ|
 *   Facteur de réseau (N éléments identiques, alimentés avec la même amplitude) :
 *     ψ = 2π (d/λ) sin θ cos φ + β ,   AF = |sin(Nψ/2) / (N sin(ψ/2))|
 *   Diagramme total : F(θ, φ) = élément(θ) × AF(ψ)
 *   Directivité : D = 4π / ∬ |F/Fmax|² sin θ dθ dφ   (intégration numérique)
 *   Gain : G = η · D ;  surface effective : Ae = G λ² / (4π)
 *   Désadaptation de polarisation (polarisations rectilignes) : PLF = cos² Δ
 *
 * Utilisé par le navigateur (TCL.antennaMath) et par les tests Node.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.antennaMath = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var C = 299792458, PI = Math.PI, D2R = PI / 180;

  function element(type, theta) {
    var s = Math.sin(theta);
    if (type === 'iso') return 1;
    if (type === 'short') return Math.abs(s);
    if (Math.abs(s) < 1e-9) return 0;
    return Math.abs(Math.cos(PI / 2 * Math.cos(theta)) / s); // demi-onde
  }

  function arrayFactor(N, psi) {
    if (N <= 1) return 1;
    var den = N * Math.sin(psi / 2);
    if (Math.abs(den) < 1e-12) return 1;
    return Math.abs(Math.sin(N * psi / 2) / den);
  }

  /** Champ normalisé (non divisé par le maximum) dans la direction (θ, φ). cfg = { type, N, d, beta (rad) } */
  function field(cfg, theta, phi) {
    var psi = 2 * PI * cfg.d * Math.sin(theta) * Math.cos(phi) + cfg.beta;
    return element(cfg.type, theta) * arrayFactor(cfg.N, psi);
  }

  /** Coupe horizontale (θ = 90°) : tableau de { deg, f } avec f normalisé au maximum de la coupe. */
  function cut(cfg, plane, phi0Deg, step) {
    step = step || 1;
    var out = [], max = 0, i, a;
    for (i = 0; i * step < 360; i++) {
      a = i * step;
      var f = plane === 'H' ? field(cfg, PI / 2, a * D2R)
        // coupe verticale dans le plan du lobe principal : a = angle d'élévation au-dessus de l'horizon (−180…180)
        : verticalField(cfg, a, phi0Deg);
      out.push({ deg: a, f: f });
      if (f > max) max = f;
    }
    out.forEach(function (p) { p.n = max > 0 ? p.f / max : 0; });
    return out;
  }

  /** Coupe verticale : angle a mesuré depuis l'horizon dans la direction φ0 (a = 90° : zénith). */
  function verticalField(cfg, aDeg, phi0Deg) {
    // a ∈ [0, 360) : de 0 à 180°, demi-plan côté φ0 ; de 180 à 360°, côté opposé
    var a = aDeg * D2R;
    var x = Math.cos(a), z = Math.sin(a);                         // direction dans le plan vertical
    var theta = Math.acos(Math.max(-1, Math.min(1, z)));
    var phi = phi0Deg * D2R + (x < 0 ? PI : 0);
    return field(cfg, theta, phi);
  }

  /** Directivité (rapport) par intégration numérique sur la sphère. */
  function directivity(cfg, nTheta, nPhi) {
    nTheta = nTheta || 180; nPhi = nPhi || 360;
    var dT = PI / nTheta, dP = 2 * PI / nPhi, sum = 0, max = 0;
    for (var i = 0; i < nTheta; i++) {
      var th = (i + 0.5) * dT, st = Math.sin(th);
      for (var j = 0; j < nPhi; j++) {
        var f = field(cfg, th, (j + 0.5) * dP), p = f * f;
        sum += p * st;
        if (p > max) max = p;
      }
    }
    // maximum affiné : direction analytique du lobe principal dans le plan horizontal
    var steer = mainDirection(cfg);
    if (steer != null) { var fm = field(cfg, PI / 2, steer * D2R); if (fm * fm > max) max = fm * fm; }
    var fz = field(cfg, PI / 2, PI / 2); if (fz * fz > max) max = fz * fz;
    return 4 * PI * max / (sum * dT * dP);
  }

  /** Direction (degrés, 0…180, mesurée depuis l'axe du réseau) du lobe principal, ou null si hors du domaine visible. */
  function mainDirection(cfg) {
    if (cfg.N <= 1) return null;
    var c = -cfg.beta / (2 * PI * cfg.d);
    if (Math.abs(c) > 1) return null;
    return Math.acos(c) / D2R;
  }

  /** Directions des lobes de réseau (maxima de même niveau que le lobe principal, m ≠ 0). */
  function gratingLobes(cfg) {
    var out = [];
    if (cfg.N <= 1) return out;
    for (var m = -6; m <= 6; m++) {
      if (m === 0) continue;
      var c = (2 * PI * m - cfg.beta) / (2 * PI * cfg.d);
      if (Math.abs(c) <= 1 + 1e-12) out.push(Math.acos(Math.max(-1, Math.min(1, c))) / D2R);
    }
    return out;
  }

  /** Largeur à −3 dB (degrés) du lobe le plus fort d'une coupe (tableau issu de cut, pas de 0,1° conseillé). */
  function beamwidth(points, centerDeg) {
    var n = points.length, imax = 0;
    for (var i = 1; i < n; i++) if (points[i].n > points[imax].n) imax = i;
    if (centerDeg != null) {
      // lobe à mesurer imposé (lobe principal) : on part du point le plus proche de la direction donnée
      var step0 = 360 / n;
      imax = Math.round((((centerDeg % 360) + 360) % 360) / step0) % n;
    }
    var half = Math.SQRT1_2; // champ à −3 dB
    if (points.every(function (p) { return p.n >= half; })) return 360;
    var step = 360 / n, l = 0, r = 0;
    while (l < n && points[(imax - l - 1 + n) % n].n >= half) l++;
    while (r < n && points[(imax + r + 1) % n].n >= half) r++;
    // interpolation linéaire aux deux bords
    function edge(iIn, iOut) {
      var a = points[(iIn + n) % n].n, b = points[(iOut + n) % n].n;
      return (a - half) / Math.max(1e-12, a - b);
    }
    return (l + r) * step + (edge(imax - l, imax - l - 1) + edge(imax + r, imax + r + 1)) * step;
  }

  /** Niveau (dB) du plus fort lobe secondaire d'une coupe ; null s'il n'y en a pas. */
  function sideLobeLevel(points) {
    var n = points.length, best = null;
    for (var i = 0; i < n; i++) {
      var a = points[(i - 1 + n) % n].n, b = points[i].n, c = points[(i + 1) % n].n;
      if (b > a && b >= c && b < 0.97 && b > 1e-4) {
        var db = 20 * Math.log10(b);
        if (best == null || db > best) best = db;
      }
    }
    return best;
  }

  function toDb(ratio) { return 10 * Math.log10(ratio); }
  function wavelength(f) { return C / f; }
  /** Surface effective (m²). */
  function effectiveArea(Glin, f) { var l = C / f; return Glin * l * l / (4 * PI); }
  /** Facteur de perte de polarisation et perte en dB (Δ en degrés). */
  function polarizationLoss(deltaDeg) {
    var c = Math.cos(deltaDeg * D2R), plf = c * c;
    return { plf: plf, db: plf < 1e-9 ? Infinity : -10 * Math.log10(plf) };
  }

  return {
    C: C, element: element, arrayFactor: arrayFactor, field: field, cut: cut, verticalField: verticalField,
    directivity: directivity, mainDirection: mainDirection, gratingLobes: gratingLobes,
    beamwidth: beamwidth, sideLobeLevel: sideLobeLevel, toDb: toDb, wavelength: wavelength,
    effectiveArea: effectiveArea, polarizationLoss: polarizationLoss
  };
});
