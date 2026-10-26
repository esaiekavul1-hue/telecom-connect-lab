/*
 * TELECOM CONNECT LAB — Calculs du module « Comprendre les signaux »
 * ------------------------------------------------------------------
 * Fonctions pures (sans accès à la page) pour le modèle sinusoïdal idéal :
 *     x(t) = A · sin(2π f t + φ)
 * Ce fichier est utilisé par le navigateur (window.TCL.signalMath)
 * ET par les tests automatiques Node (module.exports).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TCL = root.TCL || {};
  root.TCL.signalMath = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var TWO_PI = 2 * Math.PI;

  /** Valeur instantanée x(t) = A sin(2πft + φ). t en secondes, φ en radians. */
  function value(A, f, phi, t) {
    return A * Math.sin(TWO_PI * f * t + phi);
  }

  /** Période T = 1/f (s). Renvoie Infinity si f ≤ 0 (la période n'est pas définie). */
  function period(f) {
    return f > 0 ? 1 / f : Infinity;
  }

  /** Fréquence f = 1/T (Hz). Renvoie NaN si T ≤ 0. */
  function frequency(T) {
    return T > 0 ? 1 / T : NaN;
  }

  /** Pulsation ω = 2πf (rad/s). */
  function angularFrequency(f) {
    return TWO_PI * f;
  }

  function degToRad(deg) { return deg * Math.PI / 180; }
  function radToDeg(rad) { return rad * 180 / Math.PI; }

  /**
   * Décalage temporel produit par la phase : Δt = φ / (2πf) (s).
   * Δt > 0 : le signal est en AVANCE (courbe décalée vers la gauche).
   * Δt < 0 : le signal est en RETARD (courbe décalée vers la droite).
   */
  function timeShift(phi, f) {
    return f > 0 ? phi / (TWO_PI * f) : NaN;
  }

  /** Premier instant t ≥ 0 où le signal atteint sa crête (+A) : 2πft + φ ≡ π/2 [2π]. */
  function firstPeakTime(f, phi) {
    var T = period(f);
    var t = (Math.PI / 2 - phi) / (TWO_PI * f);
    t = ((t % T) + T) % T;
    if (Math.abs(t - T) < T * 1e-12) t = 0;
    return t;
  }

  /** Nombre de périodes visibles dans une fenêtre de durée win (s). */
  function periodsInWindow(f, win) { return f * win; }

  /** Valeur crête à crête = 2A. */
  function peakToPeak(A) { return 2 * A; }

  /** Valeur efficace d'une sinusoïde = A / √2. */
  function rms(A) { return A / Math.SQRT2; }

  /* ---------- Mise en forme (convention française : virgule décimale) ---------- */

  function roundSig(v, sig) {
    if (v === 0 || !isFinite(v)) return v;
    return Number(v.toPrecision(sig));
  }

  var nf = (typeof Intl !== 'undefined')
    ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 })
    : null;

  /** Nombre au format français, arrondi à `sig` chiffres significatifs (4 par défaut). */
  function formatNumber(v, sig) {
    if (!isFinite(v)) return v > 0 ? '∞' : (v < 0 ? '−∞' : '—');
    var r = roundSig(v, sig || 4);
    if (Object.is(r, -0)) r = 0;
    var s = nf ? nf.format(r) : String(r).replace('.', ',');
    // espace fine insécable -> espace insécable simple (meilleur rendu partout)
    return s.replace(/ /g, ' ').replace(/^-/, '−');
  }

  /** Choisit l'unité de temps la plus lisible : s, ms, µs ou ns. */
  function timeUnit(seconds) {
    var a = Math.abs(seconds);
    if (a >= 1 || a === 0) return { unit: 's', factor: 1 };
    if (a >= 1e-3) return { unit: 'ms', factor: 1e3 };
    if (a >= 1e-6) return { unit: 'µs', factor: 1e6 };
    return { unit: 'ns', factor: 1e9 };
  }

  function formatTime(seconds, sig) {
    if (!isFinite(seconds)) return 'non définie';
    var u = timeUnit(seconds);
    return formatNumber(seconds * u.factor, sig) + ' ' + u.unit;
  }

  function formatFrequency(hz, sig) {
    var a = Math.abs(hz);
    if (a >= 1e9) return formatNumber(hz / 1e9, sig) + ' GHz';
    if (a >= 1e6) return formatNumber(hz / 1e6, sig) + ' MHz';
    if (a >= 1e3) return formatNumber(hz / 1e3, sig) + ' kHz';
    return formatNumber(hz, sig) + ' Hz';
  }

  /** Longueur dans l'unité la plus lisible : km, m, cm, mm ou µm. */
  function formatLength(m, sig) {
    if (!isFinite(m)) return 'non définie';
    var a = Math.abs(m);
    if (a >= 1000) return formatNumber(m / 1000, sig) + '\u00A0km';
    if (a >= 1 || a === 0) return formatNumber(m, sig) + '\u00A0m';
    if (a >= 0.01) return formatNumber(m * 100, sig) + '\u00A0cm';
    if (a >= 1e-3) return formatNumber(m * 1000, sig) + '\u00A0mm';
    return formatNumber(m * 1e6, sig) + '\u00A0µm';
  }

  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  /** Écriture scientifique lisible : 2,998 × 10⁸. Les nombres « moyens » restent en écriture normale. */
  function formatSci(v, sig) {
    if (!isFinite(v) || v === 0) return formatNumber(v, sig);
    var e = Math.floor(Math.log10(Math.abs(v)));
    if (e >= -2 && e <= 4) return formatNumber(v, sig);
    var mant = v / Math.pow(10, e);
    if (Math.abs(Number(mant.toPrecision(sig || 4))) >= 10) { mant /= 10; e += 1; }
    return formatNumber(mant, sig) + '\u00A0×\u00A010' + String(e).split('').map(function (c) { return SUP[c]; }).join('');
  }

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a; }

  /**
   * Écrit une phase en radians comme multiple de π lorsque c'est possible
   * (multiples de π/12), sinon en décimal. Ex. : 1.5708 -> "π/2".
   */
  function formatPhase(rad) {
    var k = Math.round(rad / (Math.PI / 12));
    if (Math.abs(k * Math.PI / 12 - rad) < 1e-9) {
      if (k === 0) return '0';
      var g = gcd(k, 12), num = k / g, den = 12 / g;
      var sign = num < 0 ? '−' : '';
      var n = Math.abs(num);
      var top = (n === 1 ? '' : n) + 'π';
      return sign + (den === 1 ? top : top + '/' + den);
    }
    return formatNumber(rad, 3);
  }

  /** Lit un nombre saisi par un étudiant : accepte la virgule et les espaces. */
  function parseNumber(input) {
    if (typeof input === 'number') return input;
    if (typeof input !== 'string') return NaN;
    var s = input.trim().replace(/[\s  ]/g, '').replace(/−/g, '-').replace(',', '.');
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
    return Number(s);
  }

  /** Égalité approchée : tolérance relative (1 % par défaut) OU absolue. */
  function approxEqual(a, b, relTol, absTol) {
    if (!isFinite(a) || !isFinite(b)) return false;
    relTol = relTol == null ? 0.01 : relTol;
    absTol = absTol == null ? 1e-12 : absTol;
    return Math.abs(a - b) <= Math.max(absTol, relTol * Math.abs(b));
  }

  return {
    TWO_PI: TWO_PI,
    value: value,
    period: period,
    frequency: frequency,
    angularFrequency: angularFrequency,
    degToRad: degToRad,
    radToDeg: radToDeg,
    timeShift: timeShift,
    firstPeakTime: firstPeakTime,
    periodsInWindow: periodsInWindow,
    peakToPeak: peakToPeak,
    rms: rms,
    formatNumber: formatNumber,
    timeUnit: timeUnit,
    formatTime: formatTime,
    formatFrequency: formatFrequency,
    formatLength: formatLength,
    formatSci: formatSci,
    formatPhase: formatPhase,
    parseNumber: parseNumber,
    approxEqual: approxEqual
  };
});
