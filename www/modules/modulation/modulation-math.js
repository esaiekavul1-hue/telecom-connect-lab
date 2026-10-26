/*
 * TELECOM CONNECT LAB — Modulation d'amplitude (AM) et de fréquence (FM) : calculs
 * ------------------------------------------------------------------------------
 * Message sinusoïdal  m(t) = cos(2π fm t)
 * AM : s(t) = Ac [1 + m·cos(2π fm t)] cos(2π fc t)        (m : indice de modulation)
 *      enveloppe = Ac [1 + m cos(2π fm t)] ; bande B = 2 fm
 *      raies : fc (Ac), fc ± fm (m·Ac/2) ; rendement η = m² / (2 + m²)
 * FM : s(t) = Ac cos(2π fc t + β sin(2π fm t))            (β = Δf / fm)
 *      fréquence instantanée fi(t) = fc + Δf cos(2π fm t)
 *      raies : fc + n·fm, amplitude Ac·|Jn(β)| (fonctions de Bessel)
 *      bande de Carson B ≈ 2 (Δf + fm)
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.modMath = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var TWO_PI = 2 * Math.PI;

  function message(t, fm) { return Math.cos(TWO_PI * fm * t); }

  function am(t, Ac, m, fm, fc) { return Ac * (1 + m * Math.cos(TWO_PI * fm * t)) * Math.cos(TWO_PI * fc * t); }
  function amEnvelope(t, Ac, m, fm) { return Ac * (1 + m * Math.cos(TWO_PI * fm * t)); }
  /** Sortie d'un détecteur d'enveloppe idéal : il suit |enveloppe|, ce qui déforme le message si m > 1. */
  function envelopeDetector(t, Ac, m, fm) { return Math.abs(amEnvelope(t, Ac, m, fm)); }
  function amBandwidth(fm) { return 2 * fm; }
  /** Rendement : part de la puissance totale portée par les bandes latérales. */
  function amEfficiency(m) { return m * m / (2 + m * m); }

  function fm(t, Ac, beta, fmod, fc) { return Ac * Math.cos(TWO_PI * fc * t + beta * Math.sin(TWO_PI * fmod * t)); }
  function instFrequency(t, fc, df, fmod) { return fc + df * Math.cos(TWO_PI * fmod * t); }
  function beta(df, fmod) { return df / fmod; }
  function carson(df, fmod) { return 2 * (df + fmod); }

  /** Fonction de Bessel de première espèce Jn(x), n entier ≥ 0 (série entière, précise pour x ≤ 20). */
  function besselJ(n, x) {
    n = Math.abs(n);
    var sum = 0, term = Math.pow(x / 2, n);
    for (var i = 1; i <= n; i++) term /= i;          // (x/2)^n / n!
    for (var k = 0; k < 80; k++) {
      sum += term;
      term *= -(x * x / 4) / ((k + 1) * (k + 1 + n));
      if (Math.abs(term) < 1e-16 * Math.abs(sum) && k > n) break;
    }
    return sum;
  }
  /** J(−n) = (−1)^n Jn. */
  function besselJs(n, x) { var v = besselJ(Math.abs(n), x); return n < 0 && Math.abs(n) % 2 ? -v : v; }

  /** Raies du spectre FM : [{ f, amp }] pour |n| ≤ N. */
  function fmSpectrum(Ac, b, fmod, fc, N) {
    var out = [];
    for (var n = -N; n <= N; n++) out.push({ n: n, f: fc + n * fmod, amp: Ac * Math.abs(besselJs(n, b)) });
    return out;
  }

  function amSpectrum(Ac, m, fmod, fc) {
    return [{ n: -1, f: fc - fmod, amp: m * Ac / 2 }, { n: 0, f: fc, amp: Ac }, { n: 1, f: fc + fmod, amp: m * Ac / 2 }];
  }

  /** Fraction de la puissance FM comprise dans les raies |n| ≤ N. */
  function fmPowerWithin(b, N) {
    var s = 0;
    for (var n = -N; n <= N; n++) { var j = besselJs(n, b); s += j * j; }
    return s;
  }

  /* ------------------------- Modulations numériques ------------------------- */
  /* bits : chaîne de '0' et '1' ; Rb : débit binaire (bit/s) ; Tb = 1/Rb.        */

  function bitIndex(t, bits, Rb) { return Math.max(0, Math.min(bits.length - 1, Math.floor(t * Rb + 1e-9))); }
  function bitAt(t, bits, Rb) { return bits.charAt(bitIndex(t, bits, Rb)) === '1' ? 1 : 0; }

  /** ASK en tout ou rien (OOK) : porteuse émise pour « 1 », coupée pour « 0 ». */
  function ask(t, Ac, bits, Rb, fc) { return bitAt(t, bits, Rb) ? Ac * Math.cos(TWO_PI * fc * t) : 0; }

  /** FSK à phase continue : f1 = fc + df pour « 1 », f0 = fc − df pour « 0 ». */
  function fsk(t, Ac, bits, Rb, fc, df) {
    var Tb = 1 / Rb, i = bitIndex(t, bits, Rb), ph = 0;
    for (var k = 0; k < i; k++) ph += TWO_PI * (bits.charAt(k) === '1' ? fc + df : fc - df) * Tb;
    var f = bits.charAt(i) === '1' ? fc + df : fc - df;
    return Ac * Math.cos(ph + TWO_PI * f * (t - i * Tb));
  }

  /** PSK binaire (BPSK) : phase 0 pour « 1 », π pour « 0 ». */
  function psk(t, Ac, bits, Rb, fc) { return Ac * Math.cos(TWO_PI * fc * t + (bitAt(t, bits, Rb) ? 0 : Math.PI)); }

  function digital(kind, t, Ac, bits, Rb, fc, df) {
    if (kind === 'ASK') return ask(t, Ac, bits, Rb, fc);
    if (kind === 'FSK') return fsk(t, Ac, bits, Rb, fc, df);
    return psk(t, Ac, bits, Rb, fc);
  }

  /**
   * Démodulateur par corrélation, calculé sur le signal lui-même (intégration
   * numérique sur chaque durée de bit). Renvoie pour chaque bit la grandeur de
   * décision normalisée et le bit décidé.
   *  - ASK : énergie du bit comparée à la moitié de l'énergie d'un « 1 » ;
   *  - FSK : corrélation avec f1 moins corrélation avec f0 (signe) ;
   *  - PSK : corrélation avec la porteuse de référence (signe).
   */
  function demodulate(kind, Ac, bits, Rb, fc, df, samplesPerBit) {
    var Tb = 1 / Rb, N = samplesPerBit || 400, out = [];
    for (var i = 0; i < bits.length; i++) {
      var ic = 0, e = 0, c1 = 0, s1 = 0, c0 = 0, s0 = 0;
      for (var k = 0; k < N; k++) {
        var t = i * Tb + (k + 0.5) * Tb / N;
        var v = digital(kind, t, Ac, bits, Rb, fc, df);
        ic += v * Math.cos(TWO_PI * fc * t);
        e += v * v;
        if (kind === 'FSK') {
          var w1 = TWO_PI * (fc + df) * t, w0 = TWO_PI * (fc - df) * t;
          c1 += v * Math.cos(w1); s1 += v * Math.sin(w1);
          c0 += v * Math.cos(w0); s0 += v * Math.sin(w0);
        }
      }
      var metric;
      if (kind === 'PSK') metric = (2 / N) * ic / Ac;                       // ≈ +1 ou −1
      else if (kind === 'ASK') metric = (2 / N) * e / (Ac * Ac);            // ≈ 1 ou 0
      else metric = (2 / N) * (Math.sqrt(c1 * c1 + s1 * s1) - Math.sqrt(c0 * c0 + s0 * s0)) / Ac; // ≈ +1 ou −1
      var threshold = kind === 'ASK' ? 0.5 : 0;
      out.push({ metric: metric, bit: metric > threshold ? 1 : 0, threshold: threshold });
    }
    return out;
  }

  /** Largeur du lobe principal du spectre (entre premiers zéros), ordre de grandeur. */
  function digitalBandwidth(kind, Rb, df) { return kind === 'FSK' ? 2 * df + 2 * Rb : 2 * Rb; }

  return {
    bitAt: bitAt, bitIndex: bitIndex, ask: ask, fsk: fsk, psk: psk, digital: digital, demodulate: demodulate, digitalBandwidth: digitalBandwidth,
    message: message, am: am, amEnvelope: amEnvelope, envelopeDetector: envelopeDetector, amBandwidth: amBandwidth, amEfficiency: amEfficiency,
    fm: fm, instFrequency: instFrequency, beta: beta, carson: carson, besselJ: besselJ, besselJs: besselJs,
    fmSpectrum: fmSpectrum, amSpectrum: amSpectrum, fmPowerWithin: fmPowerWithin
  };
});
