/*
 * TELECOM CONNECT LAB 2.0 — MQTT, passerelles et supervision.
 * Référence : OASIS MQTT 3.1.1. Modèle : courtier simulé localement, pertes reproductibles.
 * Aucune connexion réseau n'est établie.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, v = K.v, S = K.S;

  /** Correspondance d'un nom de topic avec un filtre (+ et #), selon MQTT 3.1.1 §4.7. */
  function matches(filter, topic) {
    var f = filter.split('/'), t = topic.split('/');
    for (var i = 0; i < f.length; i++) {
      if (f[i] === '#') return i === f.length - 1;
      if (i >= t.length) return false;
      if (f[i] !== '+' && f[i] !== t[i]) return false;
    }
    return f.length === t.length;
  }
  function validFilter(filter) { var p = filter.split('/'); return p.every(function (x, i) { if (x === '#') return i === p.length - 1; if (x.indexOf('#') >= 0) return false; return x === '+' || x.indexOf('+') < 0; }); }
  function validTopic(t) { return t.length > 0 && t.indexOf('+') < 0 && t.indexOf('#') < 0; }

  /**
   * Remet un message à un abonné selon le QoS effectif, sur un lien pouvant perdre des paquets.
   * lost(i) indique si le i-ème paquet envoyé est perdu. Renvoie { delivered, duplicates, packets }.
   */
  function deliver(qos, lost) {
    var i = 0;
    function send() { return !lost(i++); }
    if (qos === 0) { var ok = send(); return { delivered: ok ? 1 : 0, duplicates: 0, packets: i }; }
    if (qos === 1) {
      var count = 0;
      for (var t = 0; t < 8; t++) { if (send()) { count++; if (send()) break; } }
      return { delivered: count ? 1 : 0, duplicates: Math.max(count - 1, 0), packets: i };
    }
    var stored = false;
    for (var a = 0; a < 8; a++) { if (send()) { stored = true; if (send()) break; } }
    for (var b = 0; b < 8; b++) { if (send() && send()) break; }
    return { delivered: stored ? 1 : 0, duplicates: 0, packets: i };
  }
  function keepAliveLimit(k) { return 1.5 * k; }
  var math = { matches: matches, validFilter: validFilter, validTopic: validTopic, deliver: deliver, keepAliveLimit: keepAliveLimit };

  var TOPICS = ['ferme/serre1/temperature', 'ferme/serre1/humidite', 'ferme/serre2/temperature', 'usine/ligne1/vibration'];
  var FILTERS = ['ferme/serre1/temperature', 'ferme/+/temperature', 'ferme/#', '#'];

  var lesson = K.lesson({ id: 'iot-mqtt', title: 'MQTT, passerelles et supervision',
    intro: 'MQTT est un protocole léger de publication et d’abonnement. Il sépare les capteurs des applications, grâce à un intermédiaire appelé courtier.',
    objectives: ['Expliquer le modèle publication-abonnement.', 'Écrire des filtres de topics avec jokers.', 'Choisir le bon niveau de QoS.', 'Utiliser le message retenu et le testament.'],
    prerequisites: 'Communication des objets.',
    sources: ['OASIS MQTT Version 3.1.1.', 'OASIS MQTT Version 5.0 (lecture partielle).'],
    figures: { arch: { caption: 'Le capteur publie vers le courtier, qui distribue aux abonnés intéressés.', svg: function () { return S.blocks({ w: 520, h: 130, label: 'Capteur, courtier et deux abonnés.', boxes: [{ id: 'a', x: 20, y: 40, w: 110, h: 50, t: 'Capteur', sub: 'publie' }, { id: 'b', x: 200, y: 40, w: 120, h: 50, t: 'Courtier' }, { id: 'c', x: 390, y: 10, w: 110, h: 44, t: 'Tableau de bord' }, { id: 'd', x: 390, y: 76, w: 110, h: 44, t: 'Alarme' }], links: [{ a: 'a', b: 'b' }, { a: 'b', b: 'c' }, { a: 'b', b: 'd' }] }); } },
      qos: { caption: 'Les trois niveaux de QoS et leurs échanges de paquets.', svg: function () { return S.blocks({ w: 520, h: 150, label: 'QoS 0, 1 et 2.', boxes: [{ id: 'a', x: 15, y: 15, w: 490, h: 34, t: 'QoS 0 : PUBLISH' }, { id: 'b', x: 15, y: 58, w: 490, h: 34, t: 'QoS 1 : PUBLISH → PUBACK' }, { id: 'c', x: 15, y: 101, w: 490, h: 34, t: 'QoS 2 : PUBLISH → PUBREC → PUBREL → PUBCOMP' }], links: [] }); } } },
    chapters: [
      { title: 'Publication et abonnement', summary: 'Courtier, topics, jokers.', html: [
        '<p class="lead">L’émetteur ne connaît pas les destinataires : il publie sur un sujet, et le courtier transmet aux abonnés correspondants.</p>',
        '<div data-fig="arch"></div>',
        K.defs([['Topic', 'Chaîne hiérarchique, par exemple ferme/serre1/temperature.'], ['+', 'Joker d’un seul niveau.'], ['#', 'Joker multi-niveaux, placé à la fin.'], ['Port', '1883 sans TLS, 8883 avec TLS (ports enregistrés auprès de l’IANA).']]),
        K.formula('Limite d’inactivité = 1,5 × Keep Alive', 'Au-delà, le serveur peut considérer la connexion comme perdue.'),
        K.example('des filtres', '<p>Le filtre ferme/+/temperature correspond à ferme/serre1/temperature et ferme/serre2/temperature, mais pas à ferme/serre1/temperature/max. Le filtre ferme/# correspond à tous les topics sous ferme. Un joker est interdit dans un nom de topic publié.</p>')] },
      { title: 'Qualité de service', summary: 'QoS 0, 1, 2, doublons.', html: [
        '<p class="lead">Le niveau de QoS définit la garantie de remise, au prix d’un nombre de paquets plus élevé.</p>',
        '<div data-fig="qos"></div>',
        K.defs([['QoS 0', 'Au plus une fois : aucun accusé de réception.'], ['QoS 1', 'Au moins une fois : doublons possibles.'], ['QoS 2', 'Exactement une fois, au prix de quatre paquets.']]),
        K.formula('QoS effectif = min(QoS publication, QoS abonnement)', 'Le courtier remet avec le plus petit des deux.'),
        K.example('choisir', '<p>Température relevée chaque minute : QoS 0 suffit, la mesure suivante arrive vite. Commande d’arrêt d’une pompe : QoS 1 avec une application qui tolère les doublons, ou QoS 2.</p>')] },
      { title: 'Messages retenus, testament, supervision', summary: 'Retained, LWT, tableaux de bord.', html: [
        '<p class="lead">Deux mécanismes rendent un système robuste : le message retenu et le testament.</p>',
        K.defs([['Message retenu', 'Le dernier message d’un topic est conservé et transmis aux nouveaux abonnés. Une charge vide l’efface.'], ['Testament (LWT)', 'Message publié par le courtier si un client disparaît sans DISCONNECT.'], ['Passerelle', 'Convertit un protocole local (LoRa, BLE) vers MQTT.'], ['Supervision', 'Affichage et alarmes sur les données reçues.']]),
        K.formula('T<sub>détection</sub> ≤ 1,5 × Keep Alive', 'Délai pour détecter une panne de client par le courtier.'),
        K.example('détecter une panne', '<p>Avec un Keep Alive de 60 s, un capteur muet est déclaré perdu au bout de ' + keepAliveLimit(60) + ' s, puis le testament est publié.</p>'),
        K.apply('<p>En production, utilisez TLS et une authentification par client. Un courtier ouvert sur Internet expose vos capteurs et vos commandes.</p>'),
        K.pitfalls(['<strong>Utiliser QoS 2 partout</strong> sur un lien cher ou à faible énergie.', '<strong>Publier sur un topic contenant un joker.</strong>', '<strong>Oublier de sécuriser le port 1883.</strong>', '<strong>Confondre message retenu et historique</strong> : seul le dernier est conservé.']),
        K.summary(['Le courtier découple émetteurs et abonnés.', '+ un niveau, # plusieurs niveaux.', 'QoS 0, 1, 2 : garanties croissantes.', 'Le testament signale une disparition.']),
        K.toLab('iot-mqtt', 'Publiez, abonnez-vous, simulez des pertes et une panne de client.')] }
    ] });

  var D = { topic: TOPICS[0], filter: FILTERS[0], qos: 0, subq: 1, loss: 30, retain: 0, keep: 60, retained: [], log: [], stats: { sent: 0, delivered: 0, dup: 0, pkts: 0 }, tick: 0, will: 0, connected: 0 };
  function M(s) { var effQ = Math.min(s.qos, s.subq), m = matches(s.filter, s.topic), st = s.stats; return { effQ: effQ, match: m, rate: st.sent ? st.delivered / st.sent * 100 : 0, limit: keepAliveLimit(s.keep) }; }
  function push(s, msg, cls) { s.log.unshift([msg, cls || 0]); if (s.log.length > 12) s.log.length = 12; }
  function lostFor(s) { var r = K.rng(1000 + s.tick * 17), p = s.loss / 100; var mem = []; return function (i) { while (mem.length <= i) mem.push(r() < p); return mem[i]; }; }
  function publishOnce(s) {
    s.tick++;
    if (s.retain) { var f = s.retained.filter(function (r) { return r[0] !== s.topic; }); f.push([s.topic, s.tick]); s.retained = f; }
    if (!matches(s.filter, s.topic)) { s.stats.sent++; push(s, 'Publié sur ' + s.topic + ' : aucun abonné ne correspond au filtre.', 0); return; }
    var r = deliver(Math.min(s.qos, s.subq), lostFor(s));
    s.stats.sent++; s.stats.delivered += r.delivered; s.stats.dup += r.duplicates; s.stats.pkts += r.packets;
    push(s, 'Publié sur ' + s.topic + ' (QoS ' + Math.min(s.qos, s.subq) + ') : ' + (r.delivered ? 'reçu' + (r.duplicates ? ', ' + r.duplicates + ' doublon(s)' : '') : 'perdu') + ', ' + r.packets + ' paquet(s).', r.delivered ? 1 : -1);
  }
  var actions = {
    pub: function (s) { publishOnce(s); },
    burst: function (s) { for (var i = 0; i < 20; i++) publishOnce(s); },
    sub: function (s) { s.connected = 1; var hit = s.retained.filter(function (r) { return matches(s.filter, r[0]); }); push(s, 'Nouvel abonné au filtre ' + s.filter + ' : ' + hit.length + ' message(s) retenu(s) reçu(s).', hit.length ? 1 : 0); s.seenRetained = (s.seenRetained || 0) + hit.length; },
    crash: function (s) { s.will = 1; push(s, 'Client perdu sans DISCONNECT : après ' + keepAliveLimit(s.keep) + ' s, le courtier publie le testament.', -1); },
    disc: function (s) { s.will = 0; push(s, 'DISCONNECT reçu : le testament n’est pas publié.', 1); s.cleanDisc = 1; },
    clear: function (s) { s.stats = { sent: 0, delivered: 0, dup: 0, pkts: 0 }; s.log = []; s.retained = []; s.tick = 0; s.seenRetained = 0; s.cleanDisc = 0; s.will = 0; }
  };
  D.seenRetained = 0; D.cleanDisc = 0;
  var lab = { id: 'iot-mqtt', title: 'Courtier MQTT simulé', short: 'MQTT et supervision', icon: 'cloud', badge: 'Courtier simulé localement, aucune connexion réelle',
    text: 'Publiez sur des topics, abonnez-vous avec des jokers, faites varier le QoS sur un lien qui perd des paquets, et simulez une panne de client.',
    summary: 'Publiez des messages, testez les jokers, comparez les QoS sur un lien imparfait, utilisez le message retenu et le testament.',
    params: [{ group: 'Publication' }, { k: 'topic', label: 'Topic', select: true, opts: TOPICS.map(function (t) { return [t, t]; }), hint: '' }, { k: 'qos', label: 'QoS de publication', opts: [[0, '0'], [1, '1'], [2, '2']] }, { k: 'retain', label: 'Retenir', opts: [[0, 'Non'], [1, 'Oui']] }, { group: 'Abonnement' }, { k: 'filter', label: 'Filtre', select: true, opts: FILTERS.map(function (t) { return [t, t]; }), hint: '' }, { k: 'subq', label: 'QoS d’abonnement', opts: [[0, '0'], [1, '1'], [2, '2']] }, { group: 'Réseau' }, { k: 'loss', label: 'Perte de paquets', min: 0, max: 80, step: 1, unit: '%', dec: 0 }, { k: 'keep', label: 'Keep Alive', min: 10, max: 600, step: 10, unit: 's', dec: 0 }],
    defaults: D, model: M, actions: actions,
    expr: function (s, m) { return m.match ? 'Le filtre correspond au topic ; QoS effectif ' + m.effQ : 'Le filtre ne correspond pas au topic'; },
    widget: function (s, m) { return '<div class="sim-row"><button type="button" class="btn btn--primary btn--sm" data-act="pub">Publier</button><button type="button" class="btn btn--ghost btn--sm" data-act="burst">Publier 20 fois</button><button type="button" class="btn btn--ghost btn--sm" data-act="sub">Nouvel abonné</button><button type="button" class="btn btn--ghost btn--sm" data-act="crash">Couper le client</button><button type="button" class="btn btn--ghost btn--sm" data-act="disc">Déconnexion propre</button><button type="button" class="btn btn--ghost btn--sm" data-act="clear">Effacer</button></div><ol class="sim-log">' + s.log.map(function (l) { return '<li class="' + (l[1] > 0 ? 'is-ok' : l[1] < 0 ? 'is-ko' : '') + '">' + S.esc(l[0]) + '</li>'; }).join('') + '</ol>' + (s.log.length ? '' : '<p class="muted">Aucun message pour l’instant.</p>'); },
    readouts: [['QoS effectif', function (s, m) { return String(m.effQ); }], ['Messages envoyés', function (s) { return String(s.stats.sent); }], ['Remise', function (s, m) { return s.stats.sent ? fN(m.rate) + ' %' : 'sans objet'; }], ['Doublons', function (s) { return String(s.stats.dup); }], ['Paquets échangés', function (s) { return String(s.stats.pkts); }], ['Messages retenus', function (s) { return String(s.retained.length); }], ['Détection de panne', function (s, m) { return fN(m.limit) + ' s'; }]],
    explain: function (s, m) { return '<p>Le QoS effectif est le minimum des deux réglages, soit ' + m.effQ + '. ' + (s.stats.sent ? 'Sur ' + s.stats.sent + ' messages, ' + fN(m.rate) + ' % ont été remis, avec ' + s.stats.dup + ' doublon(s) et ' + s.stats.pkts + ' paquets.' : 'Publiez pour voir le résultat.') + '</p>'; },
    missions: [
      { id: 'm1', title: 'Un joker d’un niveau', text: 'Choisissez un filtre qui reçoit le topic ferme/serre2/temperature avec un joker +.', solution: { filter: 'ferme/+/temperature', topic: 'ferme/serre2/temperature' }, check: function (s, m) { return s.topic === 'ferme/serre2/temperature' && s.filter === 'ferme/+/temperature' && m.match ? { ok: true, msg: 'Réussi : + remplace exactement un niveau.' } : { ok: false, msg: 'Sélectionnez ce topic et le filtre avec +.' }; } },
      { id: 'm2', title: 'Comparer QoS 0 et QoS 1', text: 'En QoS effectif 1 sur un lien à 30 % de pertes, envoyez 20 messages : presque tous doivent arriver, certains en double.', solution: function (s, a) { s.qos = 1; s.subq = 1; s.loss = 30; a.burst(s); }, check: function (s, m) { if (m.effQ !== 1 || s.stats.sent < 20) return { ok: false, msg: 'QoS effectif 1 et 20 messages envoyés.' }; return m.rate >= 95 && s.stats.dup > 0 ? { ok: true, msg: 'Réussi : ' + fN(m.rate) + ' % remis, ' + s.stats.dup + ' doublon(s).' } : { ok: false, msg: fN(m.rate) + ' % remis, ' + s.stats.dup + ' doublon(s). Réessayez.' }; } },
      { id: 'm3', title: 'Message retenu', text: 'Publiez avec « Retenir », puis connectez un nouvel abonné pour ce topic.', solution: function (s, a) { s.retain = 1; a.pub(s); a.sub(s); }, check: function (s) { return s.seenRetained > 0 ? { ok: true, msg: 'Réussi : le nouvel abonné a reçu immédiatement la dernière valeur.' } : { ok: false, msg: 'Publiez un message retenu, puis ajoutez un abonné.' }; } },
      { id: 'm4', title: 'Testament', text: 'Coupez un client sans DISCONNECT.', solution: function (s, a) { a.crash(s); }, check: function (s) { return s.will ? { ok: true, msg: 'Réussi : le courtier annonce la disparition du client.' } : { ok: false, msg: 'Utilisez « Couper le client ».' }; } }],
    limits: '<p>Aucun réseau réel n’est utilisé : le courtier est simulé dans cette page. Les pertes sont reproductibles. Sessions persistantes, authentification, TLS et messages de MQTT 5 ne sont pas représentés.</p>' };

  var list = [
    K.pick('e1', 'Joker +', 'Topics', '<p>Le filtre maison/+/lumiere correspond à :</p>', 'maison/salon/lumiere', ['maison/salon/haut/lumiere', 'maison/lumiere', 'bureau/salon/lumiere'], '<p>+ remplace exactement un niveau.</p>'),
    K.pick('e2', 'Joker #', 'Topics', '<p>Le filtre maison/# correspond à :</p>', 'maison/etage1/chambre/temp', ['bureau/maison/temp', 'autre', 'ville/maison'], '<p># remplace tous les niveaux suivants.</p>'),
    K.pick('e3', 'Publier avec joker', 'Topics', '<p>Peut-on publier sur le topic capteurs/+/temp ?</p>', 'Non, les jokers sont réservés aux filtres d’abonnement', ['Oui, sans restriction', 'Oui, uniquement en QoS 2', 'Oui, si le message est retenu'], '<p>La spécification interdit les jokers dans un nom de topic publié.</p>'),
    K.num('e4', 'QoS effectif', 'QoS', '<p>Publication en QoS 2, abonnement en QoS 1. Quel est le QoS effectif ?</p>', 1, '', { abs: 0.1 }, '<p>min(2, 1) = 1.</p>'),
    K.num('e5', 'Paquets QoS 2', 'QoS', '<p>Combien de paquets compte un échange QoS 2 sans perte ?</p>', 4, 'paquets', { abs: 0.1 }, '<p>PUBLISH, PUBREC, PUBREL, PUBCOMP.</p>'),
    K.num('e6', 'Keep Alive', 'Fiabilité', '<p>Keep Alive de 40 s. Après quel délai le courtier peut-il considérer le client perdu, en s ?</p>', 60, 's', { abs: 0.5 }, '<p>1,5 × 40 = 60 s.</p>'),
    K.pick('e7', 'Message retenu', 'Fiabilité', '<p>Un message retenu sert à :</p>', 'donner la dernière valeur aux nouveaux abonnés', ['stocker tout l’historique', 'chiffrer le topic', 'supprimer le courtier'], '<p>Le courtier ne garde que le dernier message retenu par topic.</p>'),
    K.pick('e8', 'Port sécurisé', 'Sécurité', '<p>Quel port est enregistré pour MQTT avec TLS ?</p>', '8883', ['1883', '80', '53'], '<p>1883 sans TLS, 8883 avec TLS.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('iot-mqtt', list) };
});
