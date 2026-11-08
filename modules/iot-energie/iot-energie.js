/*
 * TELECOM CONNECT LAB 2.0 — Énergie, fiabilité et sécurité des objets connectés.
 * Courants : fiche Espressif ESP32 v5.3. Sécurité : NIST IR 8259A.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  function avgCurrent(p) { var T = p.period, ta = Math.min(p.active, T), tx = Math.min(p.tx, ta); return (p.iSleep * (T - ta) + p.iActive * (ta - tx) + p.iTx * tx) / T; }
  function lifeHours(capMah, iAvgMa, selfPctMonth, usable) { var lossMa = capMah * (selfPctMonth / 100) / (30 * 24); return capMah * (usable == null ? 0.8 : usable) / (iAvgMa + lossMa); }
  function solarNeed(iAvgMa, V, peakHours, eff) { var wh = iAvgMa / 1000 * V * 24; return wh / (peakHours * eff); }
  var CORE = ['Identification du dispositif', 'Configuration du dispositif', 'Protection des données', 'Accès logique aux interfaces', 'Mise à jour logicielle', 'Connaissance de l’état de cybersécurité'];
  var math = { avgCurrent: avgCurrent, lifeHours: lifeHours, solarNeed: solarNeed, CORE: CORE };

  var EX = { period: 300, active: 2, tx: 0.5, iSleep: 0.01, iActive: 40, iTx: 240 };
  var lesson = K.lesson({ id: 'iot-energie', title: 'Énergie, fiabilité et sécurité',
    intro: 'Un objet connecté doit durer longtemps sans intervention et résister aux attaques. Son autonomie se calcule, et sa sécurité se conçoit dès le départ.',
    objectives: ['Calculer le courant moyen d’un cycle de fonctionnement.', 'Estimer une autonomie sur batterie.', 'Identifier les causes courantes de défaillance.', 'Appliquer les exigences de cybersécurité de base.'],
    prerequisites: 'Capteurs, actionneurs et mesures.',
    sources: ['Espressif ESP32 Series Datasheet v5.3 (sommeil profond, courants radio).', 'NIST IR 8259A (socle de capacités).'],
    figures: { cyc: { caption: 'Cycle typique d’un nœud : un long sommeil, un court réveil, une courte émission.', options: function () { function I(t) { var p = t % 10; return p < 0.2 ? 240 : p < 1 ? 40 : 0.01; } return { kind: 'xy', title: 'Courant consommé', desc: 'Courant au cours d’un cycle de fonctionnement.', x: { min: 0, max: 20, label: 'temps (s, illustratif)' }, y: { min: 0, max: 280, label: 'courant (mA)' }, series: [{ samples: 800, fn: I }] }; } },
      core: { caption: 'Les six capacités du socle NIST IR 8259A.', svg: function () { var bx = CORE.map(function (t, i) { return { id: 'c' + i, x: 15 + (i % 2) * 250, y: 12 + Math.floor(i / 2) * 44, w: 240, h: 36, t: t.replace('Connaissance de l’état de cybersécurité', 'État de cybersécurité') }; }); return S.blocks({ w: 520, h: 150, label: 'Capacités de cybersécurité.', boxes: bx, links: [] }); } } },
    chapters: [
      { title: 'Budget énergétique', summary: 'Courant moyen, autonomie.', html: [
        '<p class="lead">Un microcontrôleur dort presque tout le temps. Le courant moyen dépend surtout de la durée d’activité.</p>',
        '<div data-fig="cyc"></div>',
        K.formula('I<sub>moy</sub> = (I<sub>s</sub> t<sub>s</sub> + I<sub>a</sub> t<sub>a</sub> + I<sub>e</sub> t<sub>e</sub>) / T', 'Somme pondérée par les durées sur une période T.'),
        K.formula('Autonomie (h) = C × k / (I<sub>moy</sub> + I<sub>fuite</sub>)', 'C en mAh, k ≈ 0,8 pour la capacité réellement utilisable, I<sub>fuite</sub> : autodécharge ramenée en courant.'),
        K.defs([['Sommeil profond', 'Mode où seules la mémoire RTC et ses périphériques restent actifs. 10 µA pour l’ESP32 selon sa fiche.'], ['Rapport d’activité', 'Part du temps passée éveillé.'], ['Autodécharge', 'Perte de capacité sans utilisation.']]),
        K.example('un nœud ESP32', '<p>Mesure toutes les 5 min, 2 s actif à 40 mA, dont 0,5 s d’émission à 240 mA, 10 µA en sommeil : I<sub>moy</sub> = ' + fN(avgCurrent(EX), 3) + ' mA. Sur une batterie de 2 000 mAh à 2 %/mois d’autodécharge : ' + fN(lifeHours(2000, avgCurrent(EX), 2) / 24) + ' jours.</p>'),
        K.apply('<p>Les courants réels d’une carte de développement peuvent dépasser largement ceux de la puce seule, à cause du régulateur et de la LED d’alimentation : mesurez la carte complète.</p>')] },
      { title: 'Fiabilité', summary: 'Pannes, chien de garde, environnement.', html: [
        '<p class="lead">Un objet installé dans un champ doit fonctionner sans surveillance, parfois pendant des années.</p>',
        K.defs([['Chien de garde', 'Minuterie matérielle qui redémarre le système en cas de blocage.'], ['Indice IP', 'Niveau de protection d’un boîtier contre les poussières et l’eau.'], ['Mise à jour à distance', 'Remplacement du logiciel sans intervention sur le site.']]),
        K.formula('Puissance panneau = (I<sub>moy</sub> V × 24) / (H<sub>pic</sub> × η)', 'Sizing simplifié : H<sub>pic</sub> heures équivalentes de soleil, η rendement global.'),
        K.example('alimentation solaire', '<p>5 mA sous 3,7 V, 4 h de soleil équivalentes, rendement 50 % : ' + fN(solarNeed(5, 3.7, 4, 0.5), 3) + ' W de panneau, à majorer pour les journées nuageuses.</p>')] },
      { title: 'Sécurité des objets', summary: 'Socle de capacités, bonnes pratiques.', html: [
        '<p class="lead">Un objet non sécurisé peut être détourné, ou servir de porte d’entrée dans un réseau.</p>',
        '<div data-fig="core"></div>',
        K.defs([['Identifiant unique', 'Chaque objet doit être identifiable.'], ['Mot de passe par défaut', 'Il faut pouvoir le changer et éviter les valeurs communes.'], ['Chiffrement', 'TLS pour protéger les données en transit.']]),
        K.formula('Surface d’attaque ∝ interfaces ouvertes', 'Relation qualitative : désactiver les services inutiles réduit le risque.'),
        K.example('un capteur exposé', '<p>Un capteur à mot de passe par défaut, accessible depuis Internet : n’importe qui peut lire ses données ou le désactiver. Il faut changer le mot de passe, restreindre l’accès et chiffrer les échanges.</p>'),
        K.pitfalls(['<strong>Négliger le courant de la carte complète.</strong>', '<strong>Oublier les basses températures</strong>, qui réduisent la capacité d’une batterie.', '<strong>Livrer un objet sans moyen de mise à jour.</strong>', '<strong>Coder un mot de passe en dur dans le programme.</strong>']),
        K.summary(['I<sub>moy</sub> : moyenne pondérée par le temps.', 'Le sommeil profond domine l’autonomie.', 'Un chien de garde redémarre un système bloqué.', 'Six capacités de base (NIST IR 8259A).']),
        K.toLab('iot-energie', 'Dimensionnez la batterie d’un nœud et évaluez sa sécurité.')] }
    ] });

  var D = { cap: 2000, period: 60, active: 2, tx: 0.5, iSleep: 0.01, iActive: 40, iTx: 240, self: 2, sec: [0, 0, 0, 0, 0, 0] };
  function M(s) { var i = avgCurrent(s), h = lifeHours(s.cap, i, s.self), n = s.sec.filter(Boolean).length; return { i: i, h: h, days: h / 24, score: n, duty: Math.min(s.active, s.period) / s.period * 100 }; }
  var lab = { id: 'iot-energie', title: 'Budget énergétique et sécurité', short: 'Énergie et sécurité', icon: 'shield', badge: 'Courants de la puce, autodécharge simple',
    text: 'Réglez la période de réveil, le courant de sommeil et la batterie. Évaluez ensuite les capacités de sécurité de l’objet.',
    summary: 'Calculez le courant moyen et l’autonomie d’un nœud, puis complétez une grille de sécurité.',
    params: [{ group: 'Batterie' }, { k: 'cap', label: 'Capacité', min: 100, max: 20000, log: true, unit: 'mAh', dec: 0 }, { k: 'self', label: 'Autodécharge', min: 0, max: 10, step: 0.5, unit: '%/mois', dec: 1 }, { group: 'Cycle' }, { k: 'period', label: 'Période', min: 5, max: 3600, log: true, unit: 's', dec: 0 }, { k: 'active', label: 'Durée active', min: 0.05, max: 30, log: true, unit: 's', dec: 2 }, { k: 'tx', label: 'Durée d’émission', min: 0.01, max: 10, log: true, unit: 's', dec: 2 }, { group: 'Courants' }, { k: 'iSleep', label: 'Sommeil', min: 0.005, max: 50, log: true, unit: 'mA', dec: 3 }, { k: 'iActive', label: 'Actif', min: 1, max: 200, log: true, unit: 'mA', dec: 1 }, { k: 'iTx', label: 'Émission', min: 10, max: 500, log: true, unit: 'mA', dec: 0 }],
    defaults: D, model: M,
    actions: { sec: function (s, i) { s.sec[+i] = s.sec[+i] ? 0 : 1; } },
    widget: function (s, m) { return '<h3>Capacités de sécurité (' + m.score + ' / 6)</h3><div class="sim-row">' + CORE.map(function (t, i) { return '<button type="button" class="sim-btn' + (s.sec[i] ? ' is-on' : '') + '" data-act="sec" data-arg="' + i + '" aria-pressed="' + (s.sec[i] ? 'true' : 'false') + '">' + S.esc(t) + '</button>'; }).join('') + '</div>'; },
    expr: function (s, m) { return 'Courant moyen : ' + fN(m.i, 3) + ' mA ; autonomie : ' + fN(m.days) + ' jours'; },
    verdict: function (s, m) { return m.days >= 365 ? { ok: true, text: 'Autonomie d’au moins un an' } : { ok: false, text: 'Autonomie de moins d’un an' }; },
    readouts: [['Courant moyen', function (s, m) { return fN(m.i, 3) + ' mA'; }], ['Autonomie', function (s, m) { return fN(m.days) + ' jours'; }], ['Temps actif', function (s, m) { return fN(m.duty, 3) + ' %'; }], ['Capacités de sécurité', function (s, m) { return m.score + ' / 6'; }]],
    plots: [{ options: function (s, m) { return { title: 'Autonomie selon la période', desc: 'Autonomie estimée en fonction de la période de réveil.', x: { min: 5, max: 3600, log: true, label: 'période (s)' }, y: { min: 0.1, max: 20000, log: true, label: 'autonomie (jours)' }, series: [{ samples: 120, fn: function (T) { return lifeHours(s.cap, avgCurrent(Object.assign({}, s, { period: T })), s.self) / 24; } }], hlines: [{ y: 365, label: '1 an', anchor: 'start' }], points: [{ x: s.period, y: Math.max(m.days, 0.1), label: 'réglage' }] }; } }],
    explain: function (s, m) { return '<p>Sur une période de ' + fN(s.period) + ' s, le nœud consomme en moyenne ' + fN(m.i, 3) + ' mA. La batterie de ' + fN(s.cap) + ' mAh tient environ ' + fN(m.days) + ' jours.</p>'; },
    missions: [
      { id: 'm1', title: 'Une année d’autonomie', text: 'Avec une batterie de 2 000 mAh, atteignez au moins 365 jours.', solution: { cap: 2000, period: 1800, active: 2, tx: 0.5, iSleep: 0.01, iActive: 40, iTx: 240 }, check: function (s, m) { if (s.cap !== 2000) return { ok: false, msg: 'Gardez 2 000 mAh.' }; return m.days >= 365 ? { ok: true, msg: 'Réussi : ' + fN(m.days) + ' jours.' } : { ok: false, msg: fN(m.days) + ' jours. Espacez les réveils.' }; } },
      { id: 'm2', title: 'Le poids du sommeil', text: 'Sur une période de 3 600 s, montrez qu’un courant de sommeil de 5 mA réduit l’autonomie à moins de 30 jours.', solution: { period: 3600, iSleep: 5, cap: 2000, active: 2, tx: 0.5 }, check: function (s, m) { if (s.period !== 3600 || s.iSleep < 5) return { ok: false, msg: 'Réglez 3 600 s et au moins 5 mA de sommeil.' }; return m.days < 30 ? { ok: true, msg: 'Réussi : ' + fN(m.days) + ' jours seulement.' } : { ok: false, msg: fN(m.days) + ' jours. Réduisez la capacité.' }; } },
      { id: 'm3', title: 'Socle de sécurité', text: 'Validez les six capacités de base.', solution: { sec: [1, 1, 1, 1, 1, 1] }, check: function (s, m) { return m.score === 6 ? { ok: true, msg: 'Réussi : le socle NIST IR 8259A est couvert.' } : { ok: false, msg: 'Capacités validées : ' + m.score + ' sur 6.' }; } }],
    limits: '<p>Les courants proviennent de la fiche de la puce ESP32 et ne couvrent pas une carte complète. La température, le vieillissement de la batterie et les variations de tension ne sont pas représentés. La grille de sécurité est un aide-mémoire, pas une certification.</p>' };

  var list = [
    K.num('e1', 'Courant moyen', 'Énergie', '<p>Période 100 s : 1 s à 50 mA, 99 s à 0,1 mA. Calculez le courant moyen, en mA.</p>', (50 * 1 + 0.1 * 99) / 100, 'mA', { rel: 0.02 }, '<p>(50 + 9,9)/100 = 0,599 mA.</p>'),
    K.num('e2', 'Autonomie simple', 'Énergie', '<p>Batterie 1 000 mAh, 0,5 mA moyen, facteur 0,8, sans autodécharge. Calculez l’autonomie, en jours.</p>', 1000 * 0.8 / 0.5 / 24, 'jours', { rel: 0.02 }, '<p>800/0,5 = 1 600 h, soit ' + fN(1000 * 0.8 / 0.5 / 24, 4) + ' jours.</p>'),
    K.num('e3', 'Consommation journalière', 'Énergie', '<p>0,5 mA sous 3,7 V pendant 24 h. Calculez l’énergie journalière, en mWh.</p>', 0.5 * 3.7 * 24, 'mWh', { rel: 0.02 }, '<p>0,5 × 3,7 × 24 = 44,4 mWh.</p>'),
    K.num('e4', 'Panneau solaire', 'Fiabilité', '<p>Besoin journalier 0,5 Wh, 4 h équivalentes, rendement 50 %. Calculez la puissance du panneau, en W.</p>', 0.25, 'W', { rel: 0.02 }, '<p>0,5/(4 × 0,5) = 0,25 W.</p>'),
    K.pick('e5', 'Levier principal', 'Énergie', '<p>Pour augmenter l’autonomie d’un capteur :</p>', 'espacer les réveils et réduire le temps actif', ['supprimer le sommeil', 'augmenter la puissance d’émission', 'alimenter en continu le Wi-Fi'], '<p>L’activité radio représente l’essentiel de la consommation.</p>'),
    K.pick('e6', 'Chien de garde', 'Fiabilité', '<p>Un chien de garde sert à :</p>', 'redémarrer un système bloqué', ['chiffrer les données', 'augmenter la portée', 'mesurer la température'], '<p>Si le programme ne le rafraîchit plus, le matériel relance le système.</p>'),
    K.pick('e7', 'Mot de passe', 'Sécurité', '<p>Quelle pratique est dangereuse ?</p>', 'Garder le mot de passe par défaut du fabricant', ['Mettre à jour le logiciel', 'Chiffrer les échanges', 'Désactiver les services inutiles'], '<p>Les mots de passe par défaut sont publics.</p>'),
    K.pick('e8', 'Mise à jour', 'Sécurité', '<p>Pourquoi prévoir une mise à jour logicielle à distance ?</p>', 'Pour corriger des vulnérabilités sans intervenir sur le site', ['Pour consommer plus', 'Pour supprimer les capteurs', 'Pour éviter le chiffrement'], '<p>C’est l’une des capacités du socle NIST.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('iot-energie', list) };
});
