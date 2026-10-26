/*
 * TELECOM CONNECT LAB — Ondes électromagnétiques : calculs
 * -------------------------------------------------------
 *   v = c × facteur de vitesse        (c = 299 792 458 m/s, valeur exacte)
 *   λ = v / f                          (longueur d'onde, m)
 *   T = 1 / f ,  k = 2π / λ
 * Utilisé par le navigateur (TCL.waveMath) et par les tests Node.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.waveMath = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var C = 299792458; // vitesse de la lumière dans le vide (m/s), valeur exacte par définition

  /* Milieux proposés. Le facteur de vitesse d'un câble coaxial dépend de son isolant :
     ≈ 0,66 pour le polyéthylène plein, ≈ 0,8 à 0,88 pour les isolants en mousse. */
  var MEDIA = [
    { id: 'vide', label: 'Vide ou air', vf: 1, note: 'Dans l’air, la vitesse n’est inférieure à c que d’environ 0,03 % : on la confond avec c.' },
    { id: 'coax-pe', label: 'Câble coaxial, isolant polyéthylène plein', vf: 0.66, note: 'Facteur de vitesse typique d’un câble à isolant polyéthylène plein : 0,66.' },
    { id: 'coax-mousse', label: 'Câble coaxial, isolant en mousse', vf: 0.85, note: 'Valeur typique ; selon le câble, le facteur de vitesse d’un isolant en mousse va d’environ 0,8 à 0,88.' }
  ];

  /* Bandes de fréquences de l'UIT (Union internationale des télécommunications). */
  var BANDS = [
    { id: 'VLF', min: 3e3, max: 30e3, name: 'ondes myriamétriques', use: 'communications avec les sous-marins' },
    { id: 'LF', min: 30e3, max: 300e3, name: 'ondes kilométriques (grandes ondes)', use: 'radio grandes ondes, signaux horaires' },
    { id: 'MF', min: 300e3, max: 3e6, name: 'ondes hectométriques (ondes moyennes)', use: 'radio AM en ondes moyennes' },
    { id: 'HF', min: 3e6, max: 30e6, name: 'ondes décamétriques (ondes courtes)', use: 'radio internationale, radioamateurs' },
    { id: 'VHF', min: 30e6, max: 300e6, name: 'ondes métriques', use: 'radio FM, radio aéronautique' },
    { id: 'UHF', min: 300e6, max: 3e9, name: 'ondes décimétriques', use: 'télévision, téléphonie mobile, Wi-Fi 2,4 GHz' },
    { id: 'SHF', min: 3e9, max: 30e9, name: 'ondes centimétriques', use: 'Wi-Fi 5 GHz, 5G, faisceaux hertziens, satellites' },
    { id: 'EHF', min: 30e9, max: 300e9, name: 'ondes millimétriques', use: 'radars, liaisons très haut débit' }
  ];

  function medium(id) { return MEDIA.filter(function (m) { return m.id === id; })[0] || MEDIA[0]; }
  function speed(vf) { return C * vf; }
  function wavelength(f, vf) { return f > 0 ? C * (vf == null ? 1 : vf) / f : Infinity; }
  function frequencyFor(lambda, vf) { return lambda > 0 ? C * (vf == null ? 1 : vf) / lambda : NaN; }
  function wavenumber(lambda) { return 2 * Math.PI / lambda; }
  function band(f) {
    for (var i = 0; i < BANDS.length; i++) {
      var b = BANDS[i];
      if (f >= b.min && (f < b.max || (i === BANDS.length - 1 && f <= b.max))) return b;
    }
    return null;
  }
  /** Durée pour parcourir une distance d (m) à la vitesse v. */
  function travelTime(d, vf) { return d / speed(vf); }

  return { C: C, MEDIA: MEDIA, BANDS: BANDS, medium: medium, speed: speed, wavelength: wavelength, frequencyFor: frequencyFor, wavenumber: wavenumber, band: band, travelTime: travelTime };
});
