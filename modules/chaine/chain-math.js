/*
 * TELECOM CONNECT LAB — Chaîne de transmission : calculs
 * -----------------------------------------------------
 * Source texte → codage ASCII (8 bits) → codage de canal (aucun ou répétition ×3)
 * → modulation NRZ bipolaire (bit 1 → +A, bit 0 → −A, équivalent à une BPSK)
 * → canal (atténuation + bruit blanc gaussien) → filtre adapté (intégration sur
 * la durée du bit) → décision par seuil → décodage (vote majoritaire) → texte.
 *
 *   SNR (dB) = Pr (dBm) − N (dBm),  Pr = Pt − atténuation
 *   Probabilité d'erreur théorique par bit transmis : p = Q(√(2·SNR))
 *   Avec répétition ×3 (décision majoritaire) : Pb = 3p² − 2p³
 *   Capacité de Shannon : C = B log₂(1 + SNR)
 *
 * Le bruit est tiré par un générateur pseudo-aléatoire à graine : un même
 * réglage donne toujours le même tirage (reproductible pour les tests).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.chainMath = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /* ----------------------------- Hasard reproductible ----------------------------- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussian(rand) {
    var u = 0, w = 0;
    while (u === 0) u = rand();
    w = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
  }

  /* ----------------------------- Fonctions d'erreur ----------------------------- */
  /** erfc(x), erreur relative < 1,2 × 10⁻⁷ (approximation de Tchebychev, Numerical Recipes). */
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  /** Q(x) : probabilité qu'une variable gaussienne centrée réduite dépasse x. */
  function Q(x) { return 0.5 * erfc(x / Math.SQRT2); }

  function dbToLin(db) { return Math.pow(10, db / 10); }
  function linToDb(x) { return 10 * Math.log10(x); }

  /** TEB théorique par bit d'information. snrDb : rapport signal sur bruit par bit transmis. */
  function berUncoded(snrDb) { return Q(Math.sqrt(2 * dbToLin(snrDb))); }
  function berRepetition(snrDb) { var p = berUncoded(snrDb); return 3 * p * p - 2 * p * p * p; }
  function berTheory(snrDb, coding) { return coding === 'rep3' ? berRepetition(snrDb) : berUncoded(snrDb); }

  /** SNR minimal (dB) pour atteindre un TEB cible (recherche par dichotomie). */
  function snrForBer(target, coding) {
    var lo = -10, hi = 30;
    for (var i = 0; i < 100; i++) { var mid = (lo + hi) / 2; if (berTheory(mid, coding) > target) lo = mid; else hi = mid; }
    return hi;
  }

  /* ----------------------------- Codage de source ----------------------------- */
  function isAsciiPrintable(text) { return /^[\x20-\x7E]*$/.test(text); }
  function textToBits(text) {
    var b = '';
    for (var i = 0; i < text.length; i++) b += ('00000000' + text.charCodeAt(i).toString(2)).slice(-8);
    return b;
  }
  function bitsToText(bits) {
    var t = '';
    for (var i = 0; i + 8 <= bits.length; i += 8) t += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
    return t;
  }

  /* ----------------------------- Codage de canal ----------------------------- */
  function encode(bits, coding) {
    if (coding !== 'rep3') return bits;
    var out = '';
    for (var i = 0; i < bits.length; i++) out += bits[i] + bits[i] + bits[i];
    return out;
  }
  function decode(bits, coding) {
    if (coding !== 'rep3') return bits;
    var out = '';
    for (var i = 0; i + 3 <= bits.length; i += 3) {
      var ones = (bits[i] === '1') + (bits[i + 1] === '1') + (bits[i + 2] === '1');
      out += ones >= 2 ? '1' : '0';
    }
    return out;
  }
  function codeRate(coding) { return coding === 'rep3' ? 1 / 3 : 1; }

  /* ----------------------------- Transmission complète ----------------------------- */
  /**
   * p : { text, coding, pt, att, noise (dBm), seed, samplesPerBit }
   * Renvoie toutes les étapes, pour l'affichage pas à pas.
   * Le signal reçu est normalisé (amplitude 1 après le gain du récepteur) ;
   * l'écart type du bruit par échantillon vaut σ·√Ns, si bien qu'après
   * intégration sur Ns échantillons il vaut σ = 1/√(2·SNR).
   */
  function transmit(p) {
    var Ns = p.samplesPerBit || 16;
    var pr = p.pt - p.att, snrDb = pr - p.noise, snr = dbToLin(snrDb);
    var sigma = 1 / Math.sqrt(2 * snr);
    var rand = rng(p.seed >>> 0);
    var infoBits = textToBits(p.text);
    var coded = encode(infoBits, p.coding);
    var samples = [], stats = [], decided = '';
    for (var i = 0; i < coded.length; i++) {
      var x = coded[i] === '1' ? 1 : -1, sum = 0, row = [];
      for (var k = 0; k < Ns; k++) {
        var r = x + sigma * Math.sqrt(Ns) * gaussian(rand);
        row.push(r); sum += r;
      }
      var z = sum / Ns;
      samples.push(row); stats.push(z);
      decided += z > 0 ? '1' : '0';
    }
    var rawErrors = 0;
    for (var j = 0; j < coded.length; j++) if (coded[j] !== decided[j]) rawErrors++;
    var decoded = decode(decided, p.coding);
    var infoErrors = 0;
    for (var m = 0; m < infoBits.length; m++) if (infoBits[m] !== decoded[m]) infoErrors++;
    var text = bitsToText(decoded);
    var charErrors = 0;
    for (var c = 0; c < p.text.length; c++) if (text[c] !== p.text[c]) charErrors++;
    return {
      pr: pr, snrDb: snrDb, sigma: sigma, samplesPerBit: Ns,
      infoBits: infoBits, coded: coded, samples: samples, stats: stats, decided: decided,
      rawErrors: rawErrors, decoded: decoded, infoErrors: infoErrors, text: text, charErrors: charErrors,
      berTheory: berTheory(snrDb, p.coding), rawTheory: berUncoded(snrDb)
    };
  }

  /** Mesure du TEB par simulation sur n bits d'information (méthode de Monte-Carlo). */
  function measureBer(snrDb, coding, n, seed) {
    var sigma = 1 / Math.sqrt(2 * dbToLin(snrDb)), rand = rng(seed >>> 0), errors = 0, reps = coding === 'rep3' ? 3 : 1;
    for (var i = 0; i < n; i++) {
      var bit = rand() < 0.5 ? 1 : 0, x = bit ? 1 : -1, ones = 0;
      for (var r = 0; r < reps; r++) if (x + sigma * gaussian(rand) > 0) ones++;
      var d = reps === 1 ? ones : (ones >= 2 ? 1 : 0);
      if (d !== bit) errors++;
    }
    return { errors: errors, n: n, ber: errors / n };
  }

  /** Capacité de Shannon (bit/s). B en Hz, snrDb en dB. */
  function shannon(B, snrDb) { return B * Math.log2(1 + dbToLin(snrDb)); }
  /** Bruit thermique kTB (dBm) : −174 dBm/Hz à 290 K. */
  function thermalNoiseDbm(B, T) {
    var k = 1.380649e-23;
    return 10 * Math.log10(k * (T || 290) * B / 1e-3);
  }

  return {
    rng: rng, gaussian: gaussian, erfc: erfc, Q: Q, dbToLin: dbToLin, linToDb: linToDb,
    berUncoded: berUncoded, berRepetition: berRepetition, berTheory: berTheory, snrForBer: snrForBer,
    isAsciiPrintable: isAsciiPrintable, textToBits: textToBits, bitsToText: bitsToText,
    encode: encode, decode: decode, codeRate: codeRate, transmit: transmit, measureBer: measureBer,
    shannon: shannon, thermalNoiseDbm: thermalNoiseDbm
  };
});
