/*
 * TELECOM CONNECT LAB 2.0 — Projets IoT intégrés.
 * Modèle : serre à température du premier ordre, régulation à hystérésis,
 * publication périodique de mesures et suivi d'énergie.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;

  function outside(h, mean, swing) { return mean + swing * Math.sin((h - 9) * 2 * Math.PI / 24); }
  /**
   * Simulation sur 24 h au pas de 1 min.
   * Échange thermique : dT/dt = (Text + Gain − T)/τ, gain solaire le jour ; le ventilateur abaisse l'équilibre de Pv degrés.
   */
  function simulate(p) {
    var T = p.T0, on = 0, sw = 0, inBand = 0, n = 24 * 60, ener = 0, out = [], msgs = 0, r = K.gaussian(K.rng(5)), sampled = T;
    for (var i = 0; i < n; i++) {
      var h = i / 60, ext = outside(h, p.mean, p.swing), sun = h > 6 && h < 18 ? p.sun * Math.sin((h - 6) * Math.PI / 12) : 0;
      if (i % p.sample === 0) {
        sampled = T + r() * p.noise;
        var hi = p.set + p.hyst / 2, lo = p.set - p.hyst / 2, prev = on;
        if (p.mode === 'hyst') { if (sampled >= hi) on = 1; else if (sampled <= lo) on = 0; }
        else if (p.mode === 'tor') on = sampled > p.set ? 1 : 0;
        else on = 0;
        if (on !== prev) sw++;
        msgs++;
      }
      var eq = ext + sun - (on ? p.fan : 0);
      T += (eq - T) / p.tau;
      if (on) ener += p.watt / 60;
      if (T >= p.lo && T <= p.hi) inBand++;
      if (i % 10 === 0) out.push([h, T, ext, on]);
    }
    return { pts: out, sw: sw, pct: inBand / n * 100, wh: ener, msgs: msgs };
  }
  function airtimeDaily(msgs, sec) { return msgs * sec; }
  var math = { outside: outside, simulate: simulate, airtimeDaily: airtimeDaily };

  var lesson = K.lesson({ id: 'iot-projets', title: 'Projets IoT intégrés',
    intro: 'Un projet IoT réunit électronique, informatique et télécommunications. Cette leçon suit la conception complète d’une serre connectée.',
    objectives: ['Décomposer un projet en fonctions.', 'Concevoir une régulation à hystérésis.', 'Dimensionner les échanges et l’énergie.', 'Identifier les risques et les vérifications d’un projet.'],
    prerequisites: 'MQTT et supervision ; énergie, fiabilité et sécurité.',
    sources: ['Page « Hysteresis » (thermostat).', 'OASIS MQTT 3.1.1.', 'Modules du domaine IoT.'],
    figures: { sys: { caption: 'Serre connectée : capteur, contrôle local, actionneur, puis supervision à distance.', svg: function () { return S.blocks({ w: 520, h: 150, label: 'Capteur, microcontrôleur, ventilateur, passerelle, tableau de bord.', boxes: [{ id: 'a', x: 15, y: 15, w: 110, h: 46, t: 'Capteur T' }, { id: 'b', x: 165, y: 15, w: 120, h: 46, t: 'Contrôleur' }, { id: 'c', x: 330, y: 15, w: 175, h: 46, t: 'Ventilateur' }, { id: 'd', x: 165, y: 90, w: 120, h: 46, t: 'Passerelle' }, { id: 'e', x: 330, y: 90, w: 175, h: 46, t: 'Tableau de bord' }], links: [{ a: 'a', b: 'b' }, { a: 'b', b: 'c' }, { a: 'b', b: 'd' }, { a: 'd', b: 'e', both: true }] }); } },
      hy: { caption: 'Hystérésis : deux seuils évitent les commutations rapides autour de la consigne.', options: function () { var T = 26, on = 0; var pts = []; for (var i = 0; i <= 300; i++) { var t = i / 10; if (T >= 27) on = 1; else if (T <= 25) on = 0; T += ((on ? 22 : 30) - T) / 40; pts.push([t, T]); } return { kind: 'xy', title: 'Régulation à hystérésis', desc: 'Température oscillant entre les deux seuils.', x: { min: 0, max: 30, label: 'temps (min, illustratif)' }, y: { min: 23, max: 30, label: 'température (°C)' }, series: [{ points: pts }], hlines: [{ y: 27, label: 'arrêt', anchor: 'start' }, { y: 25, label: 'marche', anchor: 'start' }] }; } } },
    chapters: [
      { title: 'Concevoir un système complet', summary: 'Fonctions, contraintes, architecture.', html: [
        '<p class="lead">Un projet commence par le besoin, pas par le choix du matériel.</p>',
        '<div data-fig="sys"></div>',
        K.defs([['Cahier des charges', 'Description des besoins, contraintes et critères de réussite.'], ['Commande locale', 'La régulation fonctionne même sans réseau.'], ['Supervision', 'Affichage et alarmes à distance.']]),
        K.formula('Messages/jour = 1440 / période (min)', 'Pour une publication périodique.'),
        K.example('dimensionner les messages', '<p>Une mesure toutes les 5 minutes : 288 messages par jour. Avec un temps d’antenne de 0,2 s, cela représente ' + fN(airtimeDaily(288, 0.2)) + ' s d’émission par jour.</p>'),
        K.apply('<p>La règle de sécurité est simple : une commande vitale ne doit pas dépendre d’Internet. Le système doit rester sûr si la connexion est coupée.</p>')] },
      { title: 'Régulation', summary: 'Tout-ou-rien, hystérésis.', html: [
        '<p class="lead">Une commande à un seul seuil ferait commuter sans cesse un ventilateur autour de la consigne.</p>',
        '<div data-fig="hy"></div>',
        K.formula('marche si T ≥ T<sub>c</sub> + H/2, arrêt si T ≤ T<sub>c</sub> − H/2', 'Refroidissement à hystérésis de largeur H.'),
        K.defs([['Consigne', 'Valeur souhaitée.'], ['Hystérésis', 'Écart entre seuil de marche et seuil d’arrêt.'], ['Tout-ou-rien', 'Actionneur uniquement en marche ou à l’arrêt.']]),
        K.example('choisir H', '<p>Consigne 26 °C, H = 2 °C : le ventilateur démarre à 27 °C et s’arrête à 25 °C. Une plus grande valeur de H réduit l’usure, mais élargit les oscillations.</p>')] },
      { title: 'Vérifier et documenter', summary: 'Essais, indicateurs, risques.', html: [
        '<p class="lead">Un prototype qui fonctionne une heure n’est pas un produit fiable.</p>',
        K.defs([['Indicateur', 'Mesure objective : pourcentage de temps dans la plage, nombre de commutations.'], ['Scénario de panne', 'Test du comportement en cas de capteur défaillant ou de réseau coupé.']]),
        K.formula('Taux de réussite = temps dans la plage / temps total', 'Indicateur de qualité de régulation.'),
        K.example('un plan d’essai', '<p>Tester la coupure réseau, un capteur débranché, une panne d’alimentation et un redémarrage. Chaque scénario doit mener à un état sûr, documenté.</p>'),
        K.pitfalls(['<strong>Négliger le bruit du capteur</strong>, qui provoque de fausses commutations.', '<strong>Faire dépendre la sécurité de la connexion.</strong>', '<strong>Oublier le remplacement du matériel</strong> sur la durée de vie du projet.']),
        K.summary(['Partir du besoin.', 'L’hystérésis limite les commutations.', 'Mesurer le temps dans la plage et les commutations.', 'Tester les pannes.']),
        K.toLab('iot-projets', 'Réglez la régulation d’une serre simulée sur 24 heures.')] }
    ] });

  var D = { mode: 'none', set: 26, hyst: 2, sample: 5, noise: 0.3, fan: 10, tau: 40, mean: 26, swing: 6, sun: 6, watt: 30, T0: 26, lo: 18, hi: 30 };
  function M(s) { var r = simulate(s); return { r: r, band: r.pct }; }
  var lab = { id: 'iot-projets', title: 'Serre connectée simulée', short: 'Projets IoT', icon: 'sparkle', badge: 'Modèle thermique du premier ordre, 24 h simulées',
    text: 'Réglez la régulation d’une serre et cherchez le meilleur compromis entre température, usure du ventilateur et énergie.',
    summary: 'Réglez une régulation à hystérésis sur 24 h, avec capteur bruité, ventilateur et suivi de l’énergie.',
    params: [{ group: 'Régulation' }, { k: 'mode', label: 'Commande', opts: [['none', 'Aucune'], ['tor', 'Seuil unique'], ['hyst', 'Hystérésis']] }, { k: 'set', label: 'Consigne', min: 18, max: 32, step: 0.5, unit: '°C', dec: 1 }, { k: 'hyst', label: 'Hystérésis', min: 0.2, max: 8, step: 0.1, unit: '°C', dec: 1, when: function (s) { return s.mode === 'hyst'; } }, { k: 'sample', label: 'Période de mesure', min: 1, max: 60, step: 1, unit: 'min', dec: 0 }, { k: 'noise', label: 'Bruit du capteur', min: 0, max: 3, step: 0.1, unit: '°C', dec: 1 }, { group: 'Serre' }, { k: 'fan', label: 'Effet du ventilateur', min: 1, max: 20, step: 0.5, unit: '°C', dec: 1 }, { k: 'tau', label: 'Inertie thermique', min: 5, max: 200, step: 5, unit: 'min', dec: 0 }, { k: 'mean', label: 'Moyenne extérieure', min: 10, max: 35, step: 0.5, unit: '°C', dec: 1 }, { k: 'swing', label: 'Amplitude journalière', min: 0, max: 15, step: 0.5, unit: '°C', dec: 1 }, { k: 'sun', label: 'Gain solaire', min: 0, max: 15, step: 0.5, unit: '°C', dec: 1 }, { k: 'watt', label: 'Puissance du ventilateur', min: 5, max: 200, step: 5, unit: 'W', dec: 0 }, { group: 'Objectif' }, { k: 'lo', label: 'Limite basse', min: 10, max: 30, step: 0.5, unit: '°C', dec: 1 }, { k: 'hi', label: 'Limite haute', min: 20, max: 40, step: 0.5, unit: '°C', dec: 1 }],
    defaults: D, model: M,
    expr: function (s, m) { return fN(m.r.pct) + ' % du temps dans la plage ; ' + m.r.sw + ' commutation(s)'; },
    verdict: function (s, m) { return m.r.pct >= 95 ? { ok: true, text: 'Plage de température tenue' } : { ok: false, text: 'Température hors plage' }; },
    readouts: [['Temps dans la plage', function (s, m) { return fN(m.r.pct) + ' %'; }], ['Commutations', function (s, m) { return String(m.r.sw); }], ['Énergie du ventilateur', function (s, m) { return si(m.r.wh, 'Wh'); }], ['Messages publiés', function (s, m) { return String(m.r.msgs); }]],
    plots: [{ options: function (s, m) { var all = []; m.r.pts.forEach(function (p) { all.push(p[1], p[2]); }); var lo = Math.min.apply(null, all.concat([s.lo])) - 2, hi = Math.max.apply(null, all.concat([s.hi])) + 2; return { title: 'Température sur 24 h', desc: 'Température intérieure, extérieure et limites.', x: { min: 0, max: 24, ticks: [0, 6, 12, 18, 24], label: 'heure' }, y: { min: lo, max: hi, label: '°C' }, series: [{ points: m.r.pts.map(function (p) { return [p[0], p[2]]; }), cls: 'scope__trace--ref' }, { points: m.r.pts.map(function (p) { return [p[0], p[1]]; }) }], hlines: [{ y: s.lo, label: 'min', anchor: 'start' }, { y: s.hi, label: 'max', anchor: 'start' }] }; } }],
    explain: function (s, m) { return '<p>La serre reste ' + fN(m.r.pct) + ' % du temps entre ' + fN(s.lo) + ' et ' + fN(s.hi) + ' °C. Le ventilateur commute ' + m.r.sw + ' fois et consomme ' + si(m.r.wh, 'Wh') + '. Le système publie ' + m.r.msgs + ' messages par jour.</p>'; },
    missions: [
      { id: 'm1', title: 'Tenir la plage', text: 'Avec une commande active, maintenez au moins 95 % du temps dans la plage.', solution: { mode: 'hyst', set: 26, hyst: 2 }, check: function (s, m) { if (s.mode === 'none') return { ok: false, msg: 'Activez une commande.' }; return m.r.pct >= 95 ? { ok: true, msg: 'Réussi : ' + fN(m.r.pct) + ' % du temps dans la plage.' } : { ok: false, msg: fN(m.r.pct) + ' %. Ajustez la consigne.' }; } },
      { id: 'm2', title: 'Préserver le ventilateur', text: 'Atteignez 95 % dans la plage avec au plus 60 commutations sur 24 h.', solution: { mode: 'hyst', set: 26, hyst: 4, noise: 0.3, sample: 5 }, check: function (s, m) { if (s.mode === 'none') return { ok: false, msg: 'Activez une commande.' }; return m.r.pct >= 95 && m.r.sw <= 60 ? { ok: true, msg: 'Réussi : ' + m.r.sw + ' commutations.' } : { ok: false, msg: fN(m.r.pct) + ' %, ' + m.r.sw + ' commutations. Élargissez l’hystérésis.' }; } },
      { id: 'm3', title: 'Le bruit perturbe le seuil', text: 'Avec un seuil unique et un bruit d’au moins 1 °C, constatez plus de 100 commutations.', solution: { mode: 'tor', noise: 1.5, sample: 1 }, check: function (s, m) { if (s.mode !== 'tor' || s.noise < 1) return { ok: false, msg: 'Sélectionnez le seuil unique et au moins 1 °C de bruit.' }; return m.r.sw > 100 ? { ok: true, msg: 'Réussi : ' + m.r.sw + ' commutations, usure rapide de l’actionneur.' } : { ok: false, msg: m.r.sw + ' commutations. Réduisez la période de mesure.' }; } }],
    limits: '<p>La serre est représentée par un seul compartiment thermique. L’humidité, le rayonnement réel, le vent et la dynamique du ventilateur ne sont pas modélisés. Aucun matériel ni réseau réel n’est utilisé : ce laboratoire sert à comprendre le dimensionnement, pas à valider une installation.</p>' };

  var list = [
    K.num('e1', 'Messages par jour', 'Dimensionnement', '<p>Une mesure toutes les 10 min. Combien de messages par jour ?</p>', 144, '', { abs: 0.1 }, '<p>1440/10 = 144.</p>'),
    K.num('e2', 'Émission quotidienne', 'Dimensionnement', '<p>144 messages de 0,1 s d’antenne. Calculez la durée quotidienne, en s.</p>', 14.4, 's', { rel: 0.02 }, '<p>144 × 0,1 = 14,4 s.</p>'),
    K.num('e3', 'Seuils', 'Régulation', '<p>Consigne 24 °C, hystérésis 3 °C. Calculez le seuil de marche du refroidissement, en °C.</p>', 25.5, '°C', { abs: 0.05 }, '<p>24 + 3/2 = 25,5 °C.</p>'),
    K.num('e4', 'Énergie d’un ventilateur', 'Dimensionnement', '<p>Un ventilateur de 25 W fonctionne 6 h. Calculez l’énergie, en Wh.</p>', 150, 'Wh', { abs: 0.5 }, '<p>25 × 6 = 150 Wh.</p>'),
    K.num('e5', 'Taux de réussite', 'Vérification', '<p>Température dans la plage 21 h sur 24 h. Calculez le taux, en %.</p>', 87.5, '%', { abs: 0.1 }, '<p>21/24 = 87,5 %.</p>'),
    K.pick('e6', 'Intérêt de l’hystérésis', 'Régulation', '<p>L’hystérésis sert à :</p>', 'limiter les commutations rapides', ['augmenter le bruit', 'supprimer la mesure', 'alimenter le capteur'], '<p>Deux seuils évitent de commuter à chaque petite variation autour de la consigne.</p>'),
    K.pick('e7', 'Sûreté', 'Conception', '<p>Une serre doit-elle attendre un ordre d’Internet pour protéger les plantes ?</p>', 'Non, la protection doit fonctionner localement', ['Oui, toujours', 'Oui, mais la nuit seulement', 'Seulement avec MQTT'], '<p>La connexion peut tomber : la sécurité doit rester locale.</p>'),
    K.pick('e8', 'Plan d’essai', 'Vérification', '<p>Un plan d’essai complet comprend :</p>', 'des scénarios de panne', ['uniquement un test réussi', 'aucun capteur', 'la suppression des alarmes'], '<p>On vérifie aussi ce qui se passe quand les choses vont mal.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('iot-projets', list) };
});
