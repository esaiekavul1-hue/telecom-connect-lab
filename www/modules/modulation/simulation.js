/*
 * TELECOM CONNECT LAB — Laboratoire « Modulation et démodulation (AM / FM) »
 * ------------------------------------------------------------------------
 * Un message sinusoïdal module une porteuse en amplitude ou en fréquence (AM,
 * FM), ou une suite de bits module la porteuse en modulation numérique (ASK,
 * FSK, PSK). L'étudiant observe le signal modulé, la démodulation (détecteur
 * d'enveloppe, fréquence instantanée ou corrélateur) et le spectre ou la
 * constellation.
 * Les fréquences sont volontairement réduites (porteuse de quelques dizaines
 * de kHz) pour que les oscillations restent visibles à l'écran.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, D = TCL.modMath, U = TCL.util, K = TCL.labkit, esc = U.esc;
  var ID = 'modulation', LABEL = 'Modulation';

  var LIM = { fm: [1000, 5000], fc: [20000, 50000], Ac: [0.5, 2], m: [0, 1.5], df: [1000, 10000], Rb: [1000, 5000] };
  var DIGS = [['ASK', 'ASK (amplitude, tout ou rien)'], ['FSK', 'FSK (fréquence)'], ['PSK', 'PSK binaire (phase)']];
  var WINDOWS = [0.0005, 0.001, 0.002, 0.005];
  var DEFAULTS = { type: 'AM', fm: 1000, fc: 20000, Ac: 1, m: 0.5, df: 5000, win: 0.002, dig: 'PSK', bits: '10110010', Rb: 2000 };
  function digName(k) { return { ASK: 'ASK', FSK: 'FSK', PSK: 'PSK binaire' }[k]; }

  function fN(v, s) { return M.formatNumber(v, s); }
  function kHz(hz, s) { return M.formatFrequency(hz, s || 4); }

  var missions = [
    {
      id: 'm1', title: 'Modulation AM à 100 %',
      text: 'En AM, réglez l’indice de modulation à la limite de la surmodulation : l’enveloppe touche tout juste zéro.',
      check: function (s) {
        if (s.type !== 'AM') return { ok: false, msg: 'Choisissez d’abord la modulation AM.' };
        if (Math.abs(s.m - 1) <= 0.02) return { ok: true, msg: 'Réussi : m = ' + fN(s.m) + '. L’enveloppe descend jusqu’à Ac(1 − m) ≈ 0 V sans changer de signe. Au-delà, le détecteur d’enveloppe déforme le message.' };
        return { ok: false, msg: 'm = ' + fN(s.m) + '. L’enveloppe minimale vaut Ac(1 − m) = ' + fN(s.Ac * (1 - s.m), 3) + ' V : elle doit valoir 0.' };
      }
    },
    {
      id: 'm2', title: 'Une bande AM de 8 kHz',
      text: 'En AM, réglez le message pour que le signal modulé occupe une bande de 8 kHz.',
      check: function (s) {
        if (s.type !== 'AM') return { ok: false, msg: 'Choisissez d’abord la modulation AM.' };
        var B = D.amBandwidth(s.fm);
        if (M.approxEqual(B, 8000, 0.01)) return { ok: true, msg: 'Réussi : B = 2 × fm = 2 × ' + kHz(s.fm) + ' = ' + kHz(B) + '. Les raies latérales sont à fc ± fm.' };
        return { ok: false, msg: 'Bande actuelle : ' + kHz(B) + '. En AM, B = 2 × fm.' };
      }
    },
    {
      id: 'm3', title: 'FM : bande de Carson de 30 kHz',
      text: 'En FM, avec un message de 5 kHz, réglez l’excursion de fréquence pour obtenir une bande de Carson de 30 kHz.',
      check: function (s) {
        if (s.type !== 'FM') return { ok: false, msg: 'Choisissez d’abord la modulation FM.' };
        if (!M.approxEqual(s.fm, 5000, 0.01)) return { ok: false, msg: 'Le message doit être à 5 kHz (actuellement ' + kHz(s.fm) + ').' };
        var B = D.carson(s.df, s.fm);
        if (M.approxEqual(B, 30000, 0.02)) return { ok: true, msg: 'Réussi : B = 2(Δf + fm) = 2(' + kHz(s.df) + ' + 5 kHz) = ' + kHz(B) + ', avec β = Δf/fm = ' + fN(D.beta(s.df, s.fm), 3) + '.' };
        return { ok: false, msg: 'Bande de Carson actuelle : ' + kHz(B) + '. B = 2(Δf + fm).' };
      }
    },
    {
      id: 'm4', title: 'Transmettre un octet en PSK',
      text: 'En modulation numérique, envoyez l’octet 10110010 en PSK binaire au débit de 2 kbit/s, et vérifiez qu’il est correctement démodulé.',
      check: function (s) {
        if (s.type !== 'NUM') return { ok: false, msg: 'Choisissez d’abord la modulation numérique.' };
        if (s.dig !== 'PSK') return { ok: false, msg: 'Choisissez le type « PSK binaire ».' };
        if (s.bits !== '10110010') return { ok: false, msg: 'Les bits à émettre sont actuellement ' + s.bits + ' : saisissez 10110010.' };
        if (s.Rb !== 2000) return { ok: false, msg: 'Le débit est de ' + fN(s.Rb / 1000) + ' kbit/s : réglez-le à 2 kbit/s.' };
        var rec = D.demodulate('PSK', s.Ac, s.bits, s.Rb, s.fc, s.df).map(function (r) { return r.bit; }).join('');
        return rec === s.bits
          ? { ok: true, msg: 'Réussi : chaque bit dure Tb = 1/Rb = 0,5 ms. Un « 0 » inverse la phase de la porteuse (π) ; le corrélateur retrouve ' + rec + '.' }
          : { ok: false, msg: 'Le démodulateur lit ' + rec + '.' };
      }
    }
  ];

  /* --------------------------- Explications dynamiques --------------------------- */

  function explainDigital(param, b, s) {
    var Tb = 1 / s.Rb;
    if (param === 'type' || param === 'dig') {
      if (b[param] === s[param]) return null;
      var txt = { ASK: 'En <strong>ASK tout ou rien</strong>, la porteuse est émise pendant un « 1 » et coupée pendant un « 0 » : l’information est dans l’amplitude. Le démodulateur mesure l’énergie de chaque bit et la compare à un seuil.',
        FSK: 'En <strong>FSK</strong>, l’amplitude reste constante ; un « 1 » est émis à f₁ = fc + Δf = ' + kHz(s.fc + s.df) + ' et un « 0 » à f₀ = fc − Δf = ' + kHz(s.fc - s.df) + '. Le démodulateur compare l’énergie reçue autour de chaque fréquence.',
        PSK: 'En <strong>PSK binaire</strong>, l’amplitude et la fréquence restent constantes ; un « 0 » inverse la phase de la porteuse (décalage de π, soit 180°). Le démodulateur multiplie le signal par la porteuse de référence : le signe du résultat donne le bit.' }[s.dig];
      return '<p>' + txt + '</p><p>Chaque bit dure Tb = 1/Rb = ' + M.formatTime(Tb) + ', soit ' + fN(s.fc * Tb, 3) + ' oscillations de la porteuse.</p>';
    }
    if (param === 'Rb') {
      if (b.Rb === s.Rb) return null;
      return '<p>Le débit passe de ' + fN(b.Rb / 1000) + ' à <strong>' + fN(s.Rb / 1000) + ' kbit/s</strong> : chaque bit dure maintenant ' + M.formatTime(Tb) + ' (Tb = 1/Rb). Les 8 bits occupent ' + M.formatTime(8 * Tb) + '. Un débit plus élevé élargit le spectre : le lobe principal mesure environ ' + kHz(D.digitalBandwidth(s.dig, s.Rb, s.df)) + '.</p>';
    }
    if (param === 'bits') {
      if (b.bits === s.bits) return null;
      return '<p>Nouvelle suite de bits : <strong>' + s.bits + '</strong>. Le démodulateur retrouve ' + D.demodulate(s.dig, s.Ac, s.bits, s.Rb, s.fc, s.df).map(function (r) { return r.bit; }).join('') + ' (signal sans bruit). Pour voir l’effet du bruit sur ces décisions, ouvrez la simulation « Chaîne de transmission ».</p>';
    }
    if (param === 'df') {
      if (b.df === s.df) return null;
      return '<p>L’écart de fréquence FSK passe à Δf = <strong>' + kHz(s.df) + '</strong> : f₀ = ' + kHz(s.fc - s.df) + ' et f₁ = ' + kHz(s.fc + s.df) + '. Plus les deux fréquences sont éloignées, plus elles sont faciles à distinguer, mais plus la bande occupée est large (≈ ' + kHz(D.digitalBandwidth('FSK', s.Rb, s.df)) + ').</p>';
    }
    if (param === 'fc') {
      if (b.fc === s.fc) return null;
      return '<p>La porteuse passe à <strong>' + kHz(s.fc) + '</strong> : chaque bit contient maintenant ' + fN(s.fc * Tb, 3) + ' oscillations. Le spectre se déplace, mais la bande occupée dépend du débit, pas de la porteuse.</p>';
    }
    if (param === 'Ac') {
      if (b.Ac === s.Ac) return null;
      return '<p>L’amplitude passe à <strong>' + fN(s.Ac) + ' V</strong>. Les décisions ne changent pas sans bruit ; avec du bruit, une amplitude plus grande éloigne les points de la constellation et réduit les erreurs.</p>';
    }
    return null;
  }

  function explain(param, b, s) {
    if (s.type === 'NUM' && (param !== 'type' || b.type === 'NUM')) return explainDigital(param, b, s);
    if (param === 'type' && s.type === 'NUM') {
      if (b.type === 'NUM') return null;
      return '<p><strong>Modulation numérique</strong> : le message est une suite de bits. Selon le type choisi, chaque bit modifie l’amplitude (ASK), la fréquence (FSK) ou la phase (PSK) de la porteuse pendant une durée Tb = 1/Rb = ' + M.formatTime(1 / s.Rb) + '.</p>' + (explainDigital('dig', { dig: '' }, s) || '');
    }
    if (param === 'type') {
      if (b.type === s.type) return null;
      return s.type === 'AM'
        ? '<p>Modulation d’<strong>amplitude</strong> : la fréquence de la porteuse reste fixe (' + kHz(s.fc) + ') et c’est son amplitude qui suit le message. L’enveloppe (tirets) reproduit le message.</p>'
        : '<p>Modulation de <strong>fréquence</strong> : l’amplitude reste constante (' + fN(s.Ac) + ' V) et c’est la fréquence instantanée qui suit le message, entre ' + kHz(s.fc - s.df) + ' et ' + kHz(s.fc + s.df) + '. Les oscillations se resserrent puis s’écartent.</p>';
    }
    if (param === 'm') {
      if (b.m === s.m) return null;
      var t = '<p>L’indice de modulation passe de ' + fN(b.m) + ' à <strong>' + fN(s.m) + '</strong>. L’enveloppe varie entre Ac(1 − m) = ' + fN(s.Ac * (1 - s.m), 3) + ' V et Ac(1 + m) = ' + fN(s.Ac * (1 + s.m), 3) + ' V. Les raies latérales mesurent m·Ac/2 = ' + fN(s.m * s.Ac / 2, 3) + ' V et portent ' + fN(D.amEfficiency(s.m) * 100, 3) + ' % de la puissance totale.</p>';
      if (s.m > 1) t += '<p><strong>Surmodulation</strong> : l’enveloppe change de signe. Un détecteur d’enveloppe ne restitue plus qu’une version redressée et déformée du message (courbe de démodulation). En pratique, on garde m ≤ 1.</p>';
      else if (s.m === 0) t += '<p>Avec m = 0, la porteuse n’est pas modulée : elle ne transporte aucune information.</p>';
      return t;
    }
    if (param === 'fm') {
      if (b.fm === s.fm) return null;
      return s.type === 'AM'
        ? '<p>La fréquence du message passe de ' + kHz(b.fm) + ' à <strong>' + kHz(s.fm) + '</strong>. L’enveloppe varie plus ' + (s.fm > b.fm ? 'vite' : 'lentement') + '. Les raies latérales se placent à fc ± fm et la bande occupée devient B = 2fm = <strong>' + kHz(D.amBandwidth(s.fm)) + '</strong>.</p>'
        : '<p>La fréquence du message passe de ' + kHz(b.fm) + ' à <strong>' + kHz(s.fm) + '</strong>. Avec Δf = ' + kHz(s.df) + ', l’indice devient β = Δf/fm = <strong>' + fN(D.beta(s.df, s.fm), 3) + '</strong>. Les raies sont espacées de fm, et la bande de Carson vaut 2(Δf + fm) = <strong>' + kHz(D.carson(s.df, s.fm)) + '</strong>.</p>';
    }
    if (param === 'df') {
      if (b.df === s.df) return null;
      return '<p>L’excursion de fréquence passe de ' + kHz(b.df) + ' à <strong>' + kHz(s.df) + '</strong> : la fréquence instantanée varie maintenant entre ' + kHz(s.fc - s.df) + ' et ' + kHz(s.fc + s.df) + '. L’indice β = ' + fN(D.beta(s.df, s.fm), 3) + ' et la bande de Carson ' + kHz(D.carson(s.df, s.fm)) + '. Une excursion plus grande améliore la résistance au bruit, mais occupe plus de spectre.</p>';
    }
    if (param === 'fc') {
      if (b.fc === s.fc) return null;
      return '<p>La porteuse passe de ' + kHz(b.fc) + ' à <strong>' + kHz(s.fc) + '</strong>. Le spectre se déplace en bloc : la forme de la modulation et la bande occupée ne changent pas. Changer de porteuse, c’est changer de « canal ».</p>';
    }
    if (param === 'Ac') {
      if (b.Ac === s.Ac) return null;
      return '<p>L’amplitude de la porteuse passe de ' + fN(b.Ac) + ' V à <strong>' + fN(s.Ac) + ' V</strong>. Toutes les raies du spectre sont multipliées par ' + fN(s.Ac / b.Ac, 3) + '. ' + (s.type === 'AM' ? 'L’indice m étant un rapport, la forme relative de l’enveloppe ne change pas.' : 'En FM, l’information n’est pas dans l’amplitude : le message démodulé ne change pas.') + '</p>';
    }
    if (param === 'win') {
      if (b.win === s.win) return null;
      return '<p>La fenêtre passe à <strong>' + M.formatTime(s.win) + '</strong> : vous voyez ' + fN(s.win * s.fm, 3) + ' période(s) du message et ' + fN(s.win * s.fc, 3) + ' oscillations de la porteuse. Seul le zoom change.</p>';
    }
    return null;
  }

  function intro(s) {
    if (s.type === 'NUM') {
      return '<p>Modifiez un paramètre : l’explication s’adaptera aux valeurs affichées.</p><p>Réglage actuel : les bits ' + s.bits + ' sont émis en ' + digName(s.dig) + ' à ' + fN(s.Rb / 1000) + ' kbit/s sur une porteuse de ' + kHz(s.fc) + '. Chaque bit dure ' + M.formatTime(1 / s.Rb) + '. Le démodulateur retrouve ' + D.demodulate(s.dig, s.Ac, s.bits, s.Rb, s.fc, s.df).map(function (r) { return r.bit; }).join('') + '.</p>';
    }
    return '<p>Modifiez un paramètre : l’explication s’adaptera aux valeurs affichées.</p>' + (s.type === 'AM'
      ? '<p>Réglage actuel : un message de ' + kHz(s.fm) + ' module en amplitude une porteuse de ' + kHz(s.fc) + ' avec un indice m = ' + fN(s.m) + '. L’enveloppe suit le message ; le spectre contient la porteuse et deux raies latérales, sur une bande de ' + kHz(D.amBandwidth(s.fm)) + '.</p>'
      : '<p>Réglage actuel : un message de ' + kHz(s.fm) + ' module en fréquence une porteuse de ' + kHz(s.fc) + ' avec une excursion Δf = ' + kHz(s.df) + ' (β = ' + fN(D.beta(s.df, s.fm), 3) + '). Le spectre contient de nombreuses raies espacées de fm ; la règle de Carson estime la bande à ' + kHz(D.carson(s.df, s.fm)) + '.</p>');
  }

  /* ------------------------------------ Page ------------------------------------ */

  function sanitize(p) {
    var o = {};
    Object.keys(LIM).forEach(function (k) { if (isFinite(p[k]) && p[k] >= LIM[k][0] && p[k] <= LIM[k][1]) o[k] = Number(p[k]); });
    if (p.type === 'AM' || p.type === 'FM' || p.type === 'NUM') o.type = p.type;
    if (['ASK', 'FSK', 'PSK'].indexOf(p.dig) >= 0) o.dig = p.dig;
    if (/^[01]{8}$/.test(p.bits || '')) o.bits = p.bits;
    if (WINDOWS.indexOf(Number(p.win)) >= 0) o.win = Number(p.win);
    return o;
  }

  function timeAxis(win) {
    var tu = M.timeUnit(win);
    return { k: tu.factor, unit: tu.unit };
  }

  function mount(container) {
    var s = K.loadParams(ID, DEFAULTS, sanitize);
    var tr = K.tracker(), save = K.paramSaver(ID);

    container.innerHTML = [
      '<div class="lab">',
      K.head({ title: 'Laboratoire : modulation et démodulation', badge: 'Simulation pédagogique (fréquences réduites, signaux idéaux)', text: 'Faites moduler une porteuse par un message analogique (AM, FM) ou par une suite de bits (ASK, FSK, PSK). Observez le signal émis, la démodulation et le spectre occupé.' }),
      '<div class="lab__grid"><div class="lab__main">',
      '<div class="scope-panel scope-panel--tall">',
      '<div class="scope-panel__bar"><p class="scope-panel__expr" id="expr"></p>',
      '<p class="scope-panel__legend"><span class="sw sw--trace"></span>Signal modulé<span id="leg-env"><span class="sw sw--alt"></span>Enveloppe</span></p></div>',
      '<p class="scope-panel__title" id="msg-title">Message à transmettre m(t)</p><div class="scope-panel__plot" id="mod-msg"></div>',
      '<p class="scope-panel__title">Signal modulé émis s(t)</p><div class="scope-panel__plot" id="mod-sig"></div>',
      '</div>',
      '<div class="lab__pair">',
      '<div class="scope-panel"><p class="scope-panel__title" id="demod-title"></p><div class="scope-panel__plot" id="mod-demod"></div><p class="scope-panel__cursor" id="demod-note"></p></div>',
      '<div class="scope-panel"><p class="scope-panel__title" id="spec-title">Spectre du signal modulé</p><div class="scope-panel__plot" id="mod-spec"></div><p class="scope-panel__cursor" id="spec-note"></p></div>',
      '</div>',
      '<dl class="readouts readouts--4" aria-label="Valeurs calculées" id="mod-readouts"></dl>',
      K.explainBox(''),
      '</div>',
      '<aside class="lab__controls" aria-label="Commandes de la simulation"><form class="controls" onsubmit="return false" novalidate>',
      K.segmented({ id: 'in-type', label: 'Type de modulation', options: [['AM', 'AM'], ['FM', 'FM'], ['NUM', 'Numérique']], hint: 'AM et FM transmettent un message analogique ; « Numérique » transmet une suite de bits.' }).replace('class="segmented"', 'class="segmented segmented--3"'),
      '<div id="ctl-num">' + K.select({ id: 'in-dig', label: 'Modulation numérique', options: DIGS, hint: 'Ce que chaque bit modifie : amplitude, fréquence ou phase.' }) +
        '<div class="control"><label for="in-bits">Bits à émettre (8 bits)</label><div class="control__num"><input type="text" id="in-bits" inputmode="numeric" maxlength="8" autocomplete="off" spellcheck="false" aria-describedby="in-bits-hint in-bits-err" class="bits-input"><button type="button" class="btn btn--ghost btn--sm" id="bits-rand">Tirage</button></div>' +
        '<p class="control__hint" id="in-bits-hint">Huit chiffres 0 ou 1. « Tirage » choisit un octet au hasard.</p><p class="field-error" id="in-bits-err" aria-live="polite"></p></div>' +
        K.range({ id: 'in-Rb', label: 'Débit binaire <var>R</var><sub>b</sub>', min: 1000, max: 5000, step: 500, unit: 'bit/s', srLabel: 'Débit binaire en bits par seconde', hint: 'De 1 à 5 kbit/s. Durée d’un bit : Tb = 1/Rb.' }) + '</div>',
      '<div id="ctl-fmsg">' + K.range({ id: 'in-fm', label: 'Fréquence du message <var>f</var><sub>m</sub>', min: 1000, max: 5000, step: 100, unit: 'Hz', srLabel: 'Fréquence du message en hertz', hint: 'De 1 à 5 kHz (un son, par exemple).' }) + '</div>',
      K.range({ id: 'in-fc', label: 'Fréquence de la porteuse <var>f</var><sub>c</sub>', min: 20000, max: 50000, step: 1000, unit: 'Hz', srLabel: 'Fréquence de la porteuse en hertz', hint: 'De 20 à 50 kHz (valeurs réduites pour l’affichage).' }),
      K.range({ id: 'in-Ac', label: 'Amplitude de la porteuse <var>A</var><sub>c</sub>', min: 0.5, max: 2, step: 0.1, unit: 'V', srLabel: 'Amplitude de la porteuse en volts', hint: 'De 0,5 à 2 V.' }),
      '<div id="ctl-am">' + K.range({ id: 'in-m', label: 'Indice de modulation <var>m</var>', min: 0, max: 1.5, step: 0.01, unit: '', srLabel: 'Indice de modulation', hint: 'De 0 à 1,5. Au-delà de 1 : surmodulation.' }) + '</div>',
      '<div id="ctl-fm">' + K.range({ id: 'in-df', label: 'Excursion de fréquence <var>Δf</var>', min: 1000, max: 10000, step: 100, unit: 'Hz', srLabel: 'Excursion de fréquence en hertz', hint: 'De 1 à 10 kHz : écart maximal entre la fréquence instantanée et fc (en FSK : f₁ = fc + Δf, f₀ = fc − Δf).' }) + '</div>',
      '<div id="ctl-win">' + K.select({ id: 'in-win', label: 'Fenêtre de temps affichée', options: WINDOWS.map(function (w) { return [String(w), M.formatTime(w)]; }), hint: 'Zoom horizontal : ne modifie pas les signaux.' }) + '</div>',
      '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + TCL.icon('reset') + 'Réinitialiser</button>',
      '</form></aside></div>',
      K.missionsSection(missions),
      '<section class="box ref-table"><h2>Repères : AM et FM en radiodiffusion</h2><div class="table-wrap"><table class="data-table data-table--compact"><caption class="sr-only">Ordres de grandeur réels</caption><thead><tr><th scope="col"></th><th scope="col">Porteuses</th><th scope="col">Message</th><th scope="col">Bande d’un émetteur</th></tr></thead><tbody>' +
        '<tr><td>Radio AM (ondes moyennes)</td><td>de 531 à 1 611 kHz</td><td>audio limité à environ 4,5 kHz</td><td>environ 9 kHz (2 × fm)</td></tr>' +
        '<tr><td>Radio FM</td><td>de 87,5 à 108 MHz</td><td>audio jusqu’à 15 kHz</td><td>environ 180 kHz (Δf = 75 kHz, règle de Carson)</td></tr>' +
        '<tr><td>Wi-Fi, 4G, 5G (numérique)</td><td>de 700 MHz à plusieurs GHz</td><td>bits</td><td>de 5 à 400 MHz par canal, avec des modulations à plusieurs bits par symbole (QPSK, 16-QAM, 64-QAM…)</td></tr></tbody></table></div>' +
        '<p class="muted">Dans ce laboratoire, les porteuses sont réduites à quelques dizaines de kHz pour que les oscillations restent visibles ; les relations (B = 2fm, β = Δf/fm, règle de Carson) sont les mêmes.</p></section>',
      K.limits('<p>Le message est une sinusoïde pure ou une suite de 8 bits, et les signaux sont idéaux : pas de bruit, pas de filtrage, démodulateurs parfaitement synchronisés. Le détecteur d’enveloppe est modélisé par la valeur absolue de l’enveloppe ; un circuit réel (diode, condensateur) ajoute une petite ondulation. Le spectre FM est calculé exactement avec les fonctions de Bessel ; la règle de Carson n’en est qu’une approximation (environ 98 % de la puissance). En numérique, les transitions entre bits sont brutales (pas de filtrage de mise en forme) ; la bande indiquée est la largeur du lobe principal, un ordre de grandeur. Les systèmes réels (Wi-Fi, 4G, 5G) utilisent des modulations plus élaborées (QAM, OFDM).</p>'),
      K.sequenceLinks(ID),
      '</div>'
    ].join('');
    var $ = function (sel) { return container.querySelector(sel); };

    function tAxis(w) {
      var ta = timeAxis(s.win);
      return { min: 0, max: s.win * ta.k, label: 'temps t (' + ta.unit + ')', ticksCount: w };
    }
    /** Échelle verticale adaptée : 1, 1,5, 2, 3, 4 ou 5 V au-dessus de la valeur maximale. */
    function niceMax(v) { var steps = [0.5, 1, 1.5, 2, 3, 4, 5]; for (var i = 0; i < steps.length; i++) if (v * 1.12 <= steps[i]) return steps[i]; return 5; }
    function symTicks(m) { var st = m <= 2 ? 0.5 : 1, n = Math.floor(m / st + 1e-9), t = []; for (var k = -n; k <= n; k++) t.push(Math.round(k * st * 100) / 100); return t; }
    function winOf() { return s.type === 'NUM' ? s.bits.length / s.Rb : s.win; }
    function samplesFor() { return Math.min(9000, Math.max(600, Math.ceil(s.fc * winOf() * 40))); }
    function denseNote() { var c = s.fc * winOf(); return c > 200 ? M.formatNumber(c, 3) + ' oscillations : réduisez la fenêtre pour les distinguer' : null; }
    function bitGuides(ta) {
      var Tb = 1 / s.Rb, out = [];
      for (var i = 1; i < s.bits.length; i++) out.push({ x: i * Tb * ta.k, cls: 'scope__guide' });
      return out;
    }
    function bitLabels(ta, y) {
      var Tb = 1 / s.Rb;
      return s.bits.split('').map(function (b, i) { return { x: (i + 0.5) * Tb * ta.k, y: y, label: b }; });
    }

    var msgChart = TCL.plot.mount($('#mod-msg'), function (w) {
      if (s.type === 'NUM') {
        var tn = timeAxis(winOf());
        return { kind: 'xy', ratio: w < 520 ? 0.3 : 0.17, title: 'Bits à transmettre', desc: 'Suite de bits ' + s.bits + ' au débit de ' + fN(s.Rb) + ' bit/s.',
          x: { min: 0, max: winOf() * tn.k, label: 'temps t (' + tn.unit + ')' }, y: { min: -0.4, max: 1.6, ticks: [0, 1], label: 'bit' },
          series: [{ samples: 1600, cls: 'scope__trace scope__trace--msg', fn: function (x) { return D.bitAt(x / tn.k, s.bits, s.Rb); } }],
          vlines: bitGuides(tn) };
      }
      var ta = timeAxis(s.win);
      return { kind: 'xy', ratio: w < 520 ? 0.3 : 0.17, title: 'Message', desc: 'Message sinusoïdal de ' + kHz(s.fm) + '.',
        x: { min: 0, max: s.win * ta.k, label: 'temps t (' + ta.unit + ')' }, y: { min: -1.3, max: 1.3, ticks: [-1, 0, 1], label: 'm(t)' },
        series: [{ samples: 400, cls: 'scope__trace scope__trace--msg', fn: function (x) { return D.message(x / ta.k, s.fm); } }] };
    });

    var sigChart = TCL.plot.mount($('#mod-sig'), function (w) {
      if (s.type === 'NUM') {
        var tn = timeAxis(winOf()), yN = niceMax(s.Ac);
        return { kind: 'xy', ratio: w < 520 ? 0.6 : 0.38, title: 'Signal modulé ' + digName(s.dig), desc: 'Porteuse de ' + kHz(s.fc) + ' modulée en ' + digName(s.dig) + ' par les bits ' + s.bits + '.',
          x: { min: 0, max: winOf() * tn.k, label: 'temps t (' + tn.unit + ')' }, y: { min: -yN, max: yN * 1.3, ticks: symTicks(yN), label: 's(t) en V' },
          series: [{ samples: samplesFor(), fn: function (x) { return D.digital(s.dig, x / tn.k, s.Ac, s.bits, s.Rb, s.fc, s.df); } }],
          vlines: bitGuides(tn), barLabels: bitLabels(tn, yN * 1.08), note: denseNote() };
      }
      var ta = timeAxis(s.win), n = samplesFor();
      var series = [], yMax = niceMax(s.type === 'AM' ? s.Ac * (1 + s.m) : s.Ac);
      if (s.type === 'AM') {
        series.push({ samples: n, fn: function (x) { return D.am(x / ta.k, s.Ac, s.m, s.fm, s.fc); } });
        series.push({ samples: 300, cls: 'scope__trace scope__trace--alt', fn: function (x) { return D.amEnvelope(x / ta.k, s.Ac, s.m, s.fm); } });
        series.push({ samples: 300, cls: 'scope__trace scope__trace--alt', fn: function (x) { return -D.amEnvelope(x / ta.k, s.Ac, s.m, s.fm); } });
      } else {
        series.push({ samples: n, fn: function (x) { return D.fm(x / ta.k, s.Ac, D.beta(s.df, s.fm), s.fm, s.fc); } });
      }
      return { kind: 'xy', ratio: w < 520 ? 0.6 : 0.38, title: 'Signal modulé ' + s.type, desc: 'Porteuse de ' + kHz(s.fc) + ' modulée en ' + (s.type === 'AM' ? 'amplitude, indice ' + fN(s.m) : 'fréquence, excursion ' + kHz(s.df)) + '.',
        x: { min: 0, max: s.win * ta.k, label: 'temps t (' + ta.unit + ')' }, y: { min: -yMax, max: yMax, ticks: symTicks(yMax), label: 's(t) en V' }, series: series, note: denseNote() };
    });

    var demodChart = TCL.plot.mount($('#mod-demod'), function (w) {
      if (s.type === 'NUM') {
        var res = D.demodulate(s.dig, s.Ac, s.bits, s.Rb, s.fc, s.df);
        var ask = s.dig === 'ASK';
        return { kind: 'xy', ratio: w < 520 ? 0.55 : 0.6, title: 'Sortie du démodulateur', desc: 'Grandeur de décision calculée pour chaque bit, comparée au seuil ' + fN(res[0].threshold) + ' ; bits décidés ' + res.map(function (r) { return r.bit; }).join('') + '.',
          x: { min: 0.3, max: s.bits.length + 0.7, ticks: s.bits.split('').map(function (b, i) { return i + 1; }), label: 'n° du bit' },
          y: { min: ask ? -0.3 : -1.5, max: 1.6, ticks: ask ? [0, 0.5, 1] : [-1, 0, 1], label: 'décision' },
          bars: res.map(function (r, i) { return { x: i + 1, y: r.metric, base: ask ? 0 : 0, cls: r.bit ? 'scope__bar' : 'scope__bar scope__bar--alt' }; }),
          hlines: [{ y: res[0].threshold, cls: 'scope__limit', label: 'seuil', anchor: 'start' }],
          barLabels: res.map(function (r, i) { return { x: i + 1, y: 1.38, label: String(r.bit) }; }) };
      }
      var ta = timeAxis(s.win);
      var o = { kind: 'xy', ratio: w < 520 ? 0.55 : 0.6, x: { min: 0, max: s.win * ta.k, label: 't (' + ta.unit + ')' } };
      if (s.type === 'AM') {
        o.title = 'Sortie du détecteur d’enveloppe'; o.desc = 'Enveloppe détectée comparée à l’enveloppe idéale.';
        var top = niceMax(s.Ac * (1 + s.m)), bottom = Math.min(0, s.Ac * (1 - s.m));
        o.y = { min: bottom < 0 ? -niceMax(-bottom) : -top * 0.12, max: top, ticks: TCL.plot.niceTicks(bottom < 0 ? -niceMax(-bottom) : 0, top, 5), label: 'V' };
        o.series = [
          { samples: 400, cls: 'scope__trace scope__trace--ref', fn: function (x) { return D.amEnvelope(x / ta.k, s.Ac, s.m, s.fm); } },
          { samples: 400, fn: function (x) { return D.envelopeDetector(x / ta.k, s.Ac, s.m, s.fm); } }
        ];
      } else {
        o.title = 'Fréquence instantanée'; o.desc = 'Fréquence instantanée entre ' + kHz(s.fc - s.df) + ' et ' + kHz(s.fc + s.df) + '.';
        o.y = { min: 0, max: 60, ticks: [0, 20, 40, 60], label: 'fi (kHz)' };
        o.series = [{ samples: 400, fn: function (x) { return D.instFrequency(x / ta.k, s.fc, s.df, s.fm) / 1000; } }];
        o.hlines = [{ y: s.fc / 1000, cls: 'scope__guide' }];
      }
      return o;
    });

    var specChart = TCL.plot.mount($('#mod-spec'), function (w) {
      if (s.type === 'NUM') {
        if (s.dig === 'FSK') {
          var lo = Math.max(0, s.fc - s.df - 2 * s.Rb), hi = s.fc + s.df + 2 * s.Rb;
          return { kind: 'xy', ratio: w < 520 ? 0.55 : 0.6, title: 'Fréquences utilisées en FSK', desc: 'Deux fréquences : f0 = ' + kHz(s.fc - s.df) + ' pour les 0 et f1 = ' + kHz(s.fc + s.df) + ' pour les 1.',
            x: { min: lo / 1000, max: hi / 1000, label: 'f (kHz)' }, y: { min: 0, max: niceMax(s.Ac) * 1.4, ticks: TCL.plot.niceTicks(0, niceMax(s.Ac), 3), label: 'amplitude (V)' },
            bars: [{ x: (s.fc - s.df) / 1000, y: s.Ac, cls: 'scope__bar scope__bar--alt' }, { x: (s.fc + s.df) / 1000, y: s.Ac }],
            barLabels: [{ x: (s.fc - s.df) / 1000, y: s.Ac * 1.12, label: 'f₀ (« 0 »)' }, { x: (s.fc + s.df) / 1000, y: s.Ac * 1.12, label: 'f₁ (« 1 »)' }] };
        }
        var r = niceMax(s.Ac) * 1.25, pts = s.dig === 'PSK' ? [[s.Ac, '1'], [-s.Ac, '0']] : [[s.Ac, '1'], [0, '0']];
        return { kind: 'xy', ratio: w < 520 ? 0.75 : 0.6, title: 'Constellation ' + digName(s.dig), desc: 'Points de la constellation : ' + pts.map(function (p) { return '« ' + p[1] + ' » en I = ' + fN(p[0], 3) + ' V'; }).join(', ') + '.',
          x: { min: -r, max: r, ticks: symTicks(niceMax(s.Ac)), label: 'composante I (V)' }, y: { min: -r * 0.8, max: r * 0.8, ticks: [0], label: 'Q' },
          vlines: [{ x: 0, cls: 'scope__guide' }],
          points: pts.map(function (p) { return { x: p[0], y: 0, label: '« ' + p[1] + ' »' }; }) };
      }
      var bars, B = s.type === 'AM' ? D.amBandwidth(s.fm) : D.carson(s.df, s.fm);
      var span = Math.max(10000, Math.ceil(B * 1.5 / 10000) * 10000);
      var lo = Math.max(0, s.fc - span / 2), hi = lo + span;
      if (s.type === 'AM') { bars = D.amSpectrum(s.Ac, s.m, s.fm, s.fc); }
      else {
        var beta = D.beta(s.df, s.fm), N = Math.ceil(beta) + 4;
        bars = D.fmSpectrum(s.Ac, beta, s.fm, s.fc, N).filter(function (r) { return r.f > 0; });
      }
      var shown = bars.filter(function (r) { return r.amp > 1e-4 && r.f >= lo && r.f <= hi; });
      var top = niceMax(shown.reduce(function (a, r) { return Math.max(a, r.amp); }, 0.3) * 1.35);
      return {
        kind: 'xy', ratio: w < 520 ? 0.55 : 0.6, title: 'Spectre', desc: 'Raies du spectre ' + s.type + ' ; bande ' + kHz(B) + '.',
        x: { min: lo / 1000, max: hi / 1000, label: 'f (kHz)' }, y: { min: 0, max: top, ticks: TCL.plot.niceTicks(0, top, 4), label: 'amplitude (V)' },
        bars: shown.map(function (r) { return { x: r.f / 1000, y: r.amp, cls: r.n === 0 ? 'scope__bar scope__bar--alt' : 'scope__bar' }; }),
        arrows: [{ x1: (s.fc - B / 2) / 1000, x2: (s.fc + B / 2) / 1000, y: top * 0.84, label: 'B = ' + kHz(B, 3).replace(/ /g, ' ') }]
      };
    });

    function readouts() {
      var rows;
      if (s.type === 'NUM') {
        var Tb = 1 / s.Rb, rec = D.demodulate(s.dig, s.Ac, s.bits, s.Rb, s.fc, s.df).map(function (r) { return r.bit; }).join('');
        var errs = rec.split('').filter(function (b, i) { return b !== s.bits.charAt(i); }).length;
        rows = [['Débit binaire Rb', fN(s.Rb / 1000) + ' kbit/s'], ['Durée d’un bit Tb = 1/Rb', M.formatTime(Tb)], ['Oscillations par bit fc·Tb', fN(s.fc * Tb, 3)], ['Bits par symbole', '1 (rapidité ' + fN(s.Rb) + ' bauds)'],
          [s.dig === 'FSK' ? 'Fréquences f₀ / f₁' : 'Porteuse', s.dig === 'FSK' ? kHz(s.fc - s.df) + ' / ' + kHz(s.fc + s.df) : kHz(s.fc)], ['Lobe principal du spectre', '≈ ' + kHz(D.digitalBandwidth(s.dig, s.Rb, s.df))],
          ['Bits démodulés', rec], ['Erreurs', String(errs)]];
      } else if (s.type === 'AM') {
        var B = D.amBandwidth(s.fm);
        rows = [['Indice m', fN(s.m)], ['Bande B = 2fm', kHz(B)], ['Enveloppe max Ac(1+m)', fN(s.Ac * (1 + s.m), 3) + ' V'], ['Enveloppe min Ac(1−m)', fN(s.Ac * (1 - s.m), 3) + ' V'],
          ['Raies (kHz)', fN((s.fc - s.fm) / 1000) + ' ; ' + fN(s.fc / 1000) + ' ; ' + fN((s.fc + s.fm) / 1000)], ['Raie latérale m·Ac/2', fN(s.m * s.Ac / 2, 3) + ' V'],
          ['Rendement m²/(2+m²)', fN(D.amEfficiency(s.m) * 100, 3) + ' %'], ['Surmodulation', s.m > 1 ? 'oui' : 'non']];
      } else {
        var beta = D.beta(s.df, s.fm), Bc = D.carson(s.df, s.fm), Nc = Math.floor(beta + 1);
        rows = [['Indice β = Δf/fm', fN(beta, 3)], ['Excursion Δf', kHz(s.df)], ['Bande de Carson 2(Δf+fm)', kHz(Bc)], ['Fréquence instantanée', kHz(s.fc - s.df) + ' à ' + kHz(s.fc + s.df)],
          ['Raie porteuse Ac·|J₀(β)|', fN(s.Ac * Math.abs(D.besselJ(0, beta)), 3) + ' V'], ['Puissance dans la bande de Carson', fN(D.fmPowerWithin(beta, Nc) * 100, 3) + ' %'],
          ['Espacement des raies', kHz(s.fm)], ['Amplitude du signal', fN(s.Ac) + ' V (constante)']];
      }
      $('#mod-readouts').innerHTML = rows.map(function (r) { return '<div class="readout"><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
    }

    function refresh() {
      msgChart.update(); sigChart.update(); demodChart.update(); specChart.update();
      readouts();
      var am = s.type === 'AM', num = s.type === 'NUM';
      $('#ctl-am').hidden = !am; $('#ctl-fm').hidden = !(s.type === 'FM' || (num && s.dig === 'FSK')); $('#leg-env').hidden = !am;
      $('#ctl-num').hidden = !num; $('#ctl-fmsg').hidden = num; $('#ctl-win').hidden = num;
      $('#msg-title').textContent = num ? 'Bits à transmettre' : 'Message à transmettre m(t)';
      $('#spec-title').textContent = num ? (s.dig === 'FSK' ? 'Fréquences utilisées' : 'Constellation') : 'Spectre du signal modulé';
      $('#expr').innerHTML = num
        ? { ASK: 's(t) = ' + fN(s.Ac) + ' · cos(2π · ' + fN(s.fc) + ' · t) si bit = 1, 0 si bit = 0',
            FSK: 's(t) = ' + fN(s.Ac) + ' · cos(2π · f · t), f = ' + fN(s.fc + s.df) + ' Hz (1) ou ' + fN(s.fc - s.df) + ' Hz (0)',
            PSK: 's(t) = ' + fN(s.Ac) + ' · cos(2π · ' + fN(s.fc) + ' · t + φ), φ = 0 (1) ou π (0)' }[s.dig]
        : am
        ? 's(t) = ' + fN(s.Ac) + ' · [1 + ' + fN(s.m) + ' · cos(2π · ' + fN(s.fm) + ' · t)] · cos(2π · ' + fN(s.fc) + ' · t)'
        : 's(t) = ' + fN(s.Ac) + ' · cos(2π · ' + fN(s.fc) + ' · t + ' + fN(D.beta(s.df, s.fm), 3) + ' · sin(2π · ' + fN(s.fm) + ' · t))';
      $('#demod-title').textContent = num ? 'Démodulation : décision bit par bit' : am ? 'Démodulation : détecteur d’enveloppe' : 'Démodulation : fréquence instantanée';
      $('#demod-note').textContent = num
        ? { ASK: 'Énergie de chaque bit (1 pour un « 1 », 0 pour un « 0 ») comparée au seuil 0,5.', FSK: 'Énergie autour de f₁ moins énergie autour de f₀ : positive pour un « 1 ».', PSK: 'Corrélation avec la porteuse de référence : +1 pour un « 1 », −1 pour un « 0 ».' }[s.dig]
        : am
        ? (s.m > 1 ? 'Surmodulation : la sortie (trait plein) s’écarte de l’enveloppe idéale (pointillés). Le message est déformé.' : 'La sortie du détecteur (trait plein) suit l’enveloppe : on retrouve le message.')
        : 'La fréquence instantanée suit le message : un discriminateur la convertit en tension.';
      $('#spec-note').textContent = num
        ? (s.dig === 'FSK' ? 'Représentation simplifiée : les deux fréquences porteuses, sans les lobes latéraux dus aux changements de bit.' : 'Chaque point représente un symbole : distance entre points plus grande = meilleure résistance au bruit.')
        : am ? 'Porteuse (orange) et deux raies latérales à fc ± fm.' : 'Porteuse (orange) et raies latérales espacées de fm, d’amplitudes Ac·|Jn(β)|.';
      if (document.activeElement !== $('#in-dig')) $('#in-dig').value = s.dig;
      if (document.activeElement !== $('#in-bits')) $('#in-bits').value = s.bits;
      K.setText(container, '#in-Rb-out', fN(s.Rb / 1000) + ' kbit/s');
      pairs.Rb.sync(s.Rb);
      U.qsa('input[name=in-type]', container).forEach(function (r) { r.checked = r.value === s.type; });
      K.setText(container, '#in-fm-out', kHz(s.fm));
      K.setText(container, '#in-fc-out', kHz(s.fc));
      K.setText(container, '#in-Ac-out', fN(s.Ac) + ' V');
      K.setText(container, '#in-m-out', fN(s.m) + ' (' + fN(s.m * 100, 3) + ' %)');
      K.setText(container, '#in-df-out', kHz(s.df));
      pairs.fm.sync(s.fm); pairs.fc.sync(s.fc); pairs.Ac.sync(s.Ac); pairs.m.sync(s.m); pairs.df.sync(s.df);
      if (document.activeElement !== $('#in-win')) $('#in-win').value = String(s.win);
      var html = tr.param() ? explain(tr.param(), tr.base(), s) : null;
      $('#explain').innerHTML = html || intro(s);
      save(s);
    }

    function set(name, value, single) { tr.before(name, s); s[name] = value; refresh(); if (single) tr.end(); }
    function pair(key, unit, dec) {
      return K.bindPair(container, { id: 'in-' + key, validate: K.numberValidator(LIM[key][0], LIM[key][1], unit, dec), onInput: function (v) { set(key, v); }, onEnd: function () { tr.end(); }, current: function () { return s[key]; } });
    }
    var pairs = { fm: pair('fm', 'Hz', 0), fc: pair('fc', 'Hz', 0), Ac: pair('Ac', 'V', 2), m: pair('m', '', 2), df: pair('df', 'Hz', 0), Rb: pair('Rb', 'bit/s', 0) };
    $('#in-dig').addEventListener('change', function (e) { set('dig', e.target.value, true); });
    $('#in-bits').addEventListener('input', function (e) {
      var v = e.target.value.replace(/\s/g, ''), err = $('#in-bits-err');
      if (/^[01]{8}$/.test(v)) { err.textContent = ''; e.target.removeAttribute('aria-invalid'); set('bits', v, true); }
      else { err.textContent = /[^01]/.test(v) ? 'Seuls les chiffres 0 et 1 sont acceptés.' : 'Saisissez exactement 8 bits (' + v.length + ' pour l’instant).'; e.target.setAttribute('aria-invalid', 'true'); }
    });
    $('#bits-rand').addEventListener('click', function () {
      var b = ''; for (var i = 0; i < 8; i++) b += Math.random() < 0.5 ? '0' : '1';
      $('#in-bits-err').textContent = ''; $('#in-bits').removeAttribute('aria-invalid'); $('#in-bits').value = b; set('bits', b, true);
    });
    U.qsa('input[name=in-type]', container).forEach(function (r) { r.addEventListener('change', function () { if (r.checked) set('type', r.value, true); }); });
    $('#in-win').addEventListener('change', function (e) { set('win', Number(e.target.value), true); });
    $('#lab-reset').addEventListener('click', function () {
      s = Object.assign({}, DEFAULTS); tr.reset(); Object.keys(pairs).forEach(function (k) { pairs[k].clear(); }); $('#in-bits-err').textContent = ''; refresh();
      U.toast('Paramètres réinitialisés : AM, message 1 kHz, porteuse 20 kHz, m = 0,5.', 'info');
    });

    K.bindMissions(container, ID, LABEL, missions, function () { return s; });
    refresh();
    return function () { msgChart.destroy(); sigChart.destroy(); demodChart.destroy(); specChart.destroy(); };
  }

  function thumb() {
    var d = DEFAULTS;
    return { kind: 'xy', ratio: 0.55, title: 'Aperçu : signal modulé en amplitude', x: { min: 0, max: 2, label: 't (ms)' }, y: { min: -2, max: 2, ticks: [-1.5, 0, 1.5], label: 's(t)' },
      series: [{ samples: 1200, fn: function (x) { return D.am(x / 1000, d.Ac, d.m, d.fm, d.fc); } },
        { samples: 200, cls: 'scope__trace scope__trace--alt', fn: function (x) { return D.amEnvelope(x / 1000, d.Ac, d.m, d.fm); } }] };
  }

  TCL.labs = TCL.labs || {};
  TCL.labs[ID] = {
    id: ID, title: 'Modulation et démodulation (AM, FM, numérique)', short: LABEL, icon: 'modulation', mount: mount, missions: missions, thumb: thumb,
    summary: 'Modulez une porteuse en AM, en FM ou en numérique (ASK, FSK, PSK) : enveloppe, surmodulation, démodulation, spectre, constellation et bande occupée.',
    explain: explain, DEFAULTS: DEFAULTS
  };
})(window);
