/*
 * TELECOM CONNECT LAB 2.0 — Réseaux et client-serveur.
 * Références : RFC 9293 (TCP), RFC 1035 (DNS), RFC 9110 (HTTP), RFC 792 (ICMP), RFC 2131 (DHCP).
 * Modèle : échanges simplifiés, sans retransmission ni congestion.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  var LAYERS = ['Physique', 'Liaison de données', 'Réseau', 'Transport', 'Session', 'Présentation', 'Application'];
  function pageTime(p) { return p.rtt * (p.dns ? 1 : 0) + p.rtt * (1 + (p.tls ? 2 : 0)) + p.rtt + p.sizeKo * 8000 / (p.mbps * 1e6) * 1000; }
  var SCENARIOS = {
    ok: { dns: 1, ping: 1, tcp: 1, http: 200 },
    dns: { dns: 0, ping: 1, tcp: 1, http: 200 },
    route: { dns: 1, ping: 0, tcp: 0, http: 0 },
    port: { dns: 1, ping: 1, tcp: 0, http: 0 },
    app: { dns: 1, ping: 1, tcp: 1, http: 500 },
    notfound: { dns: 1, ping: 1, tcp: 1, http: 404 }
  };
  function run(sc) {
    var c = SCENARIOS[sc], log = [];
    log.push(['DNS : requête du type A pour www.exemple.cd', 0]);
    if (!c.dns) { log.push(['DNS : pas de réponse, le nom ne peut pas être résolu', -1]); return log; }
    log.push(['DNS : réponse 203.0.113.10', 1]);
    if (!c.ping) { log.push(['ICMP : aucune réponse à la demande d’écho, l’hôte est injoignable', -1]); log.push(['TCP : SYN sans réponse', -1]); return log; }
    log.push(['ICMP : écho reçu', 1]);
    log.push(['TCP : SYN envoyé', 0]);
    if (!c.tcp) { log.push(['TCP : connexion refusée, le service n’écoute pas sur ce port', -1]); return log; }
    log.push(['TCP : SYN, ACK reçu', 1]); log.push(['TCP : ACK envoyé, connexion établie', 1]);
    log.push(['HTTP : GET /', 0]);
    log.push(['HTTP : réponse ' + c.http, c.http === 200 ? 1 : -1]);
    return log;
  }
  var math = { LAYERS: LAYERS, pageTime: pageTime, SCENARIOS: SCENARIOS, run: run };

  var lesson = K.lesson({ id: 'reseaux-info', title: 'Réseaux et client-serveur',
    intro: 'Quand vous ouvrez une page web, plusieurs protocoles coopèrent en quelques millisecondes. Comprendre leur enchaînement permet de localiser un problème.',
    objectives: ['Situer un protocole dans le modèle en couches.', 'Décrire ARP, DHCP et DNS.', 'Expliquer l’ouverture de connexion TCP et une requête HTTP.', 'Diagnostiquer une panne réseau par étapes.'],
    prerequisites: 'Réseaux IP.',
    sources: ['RFC 9293 (TCP), RFC 1035 (DNS), RFC 9110 (HTTP), RFC 2131 (DHCP), RFC 792 (ICMP), RFC 1918 (adresses privées).', 'Pages « OSI model », « Address Resolution Protocol », « Traceroute ».'],
    figures: { osi: { caption: 'Modèle OSI : chaque couche utilise les services de la couche inférieure.', svg: function () { var bx = LAYERS.slice().reverse().map(function (l, i) { return { id: 'l' + i, x: 110, y: 6 + i * 27, w: 300, h: 24, t: (7 - i) + '. ' + l }; }); return S.blocks({ w: 520, h: 200, label: 'Sept couches du modèle OSI.', boxes: bx, links: [] }); } },
      tcp: { caption: 'Ouverture d’une connexion TCP en trois temps.', svg: function () { return S.blocks({ w: 520, h: 130, label: 'SYN, SYN-ACK, ACK entre client et serveur.', boxes: [{ id: 'c', x: 20, y: 40, w: 110, h: 50, t: 'Client' }, { id: 'a', x: 170, y: 10, w: 180, h: 30, t: 'SYN →' }, { id: 'b', x: 170, y: 50, w: 180, h: 30, t: '← SYN, ACK' }, { id: 'd', x: 170, y: 90, w: 180, h: 30, t: 'ACK →' }, { id: 's', x: 390, y: 40, w: 110, h: 50, t: 'Serveur' }], links: [] }); } } },
    chapters: [
      { title: 'Le modèle en couches', summary: 'OSI, TCP/IP, encapsulation.', html: [
        '<p class="lead">Découper les communications en couches permet de changer une technologie sans tout refaire.</p>',
        '<div data-fig="osi"></div>',
        K.defs([['Encapsulation', 'Chaque couche ajoute son en-tête autour des données de la couche supérieure.'], ['Adresse MAC', 'Adresse de couche liaison, locale au réseau.'], ['ARP', 'Protocole qui trouve l’adresse MAC associée à une adresse IP.'], ['DHCP', 'Attribution automatique de configuration IP : DISCOVER, OFFER, REQUEST, ACK.']]),
        K.formula('Taille trame = données + en-têtes', 'Le surcoût de chaque couche réduit le débit utile.'),
        K.example('surcoût', '<p>Une trame de 1518 octets contient environ 1460 octets utiles, en TCP/IPv4 sur Ethernet sans options : ' + fN(1460 / 1518 * 100) + ' % d’efficacité.</p>')] },
      { title: 'DNS, TCP et HTTP', summary: 'Résolution de nom, connexion, requête.', html: [
        '<p class="lead">Ouvrir une page enchaîne une résolution de nom, une connexion, puis une requête.</p>',
        '<div data-fig="tcp"></div>',
        K.defs([['DNS', 'Traduit les noms en adresses. Types courants : A, NS, CNAME, MX.'], ['Port', 'Numéro qui identifie un service sur une machine.'], ['Codes HTTP', '2xx succès, 3xx redirection, 4xx erreur du client, 5xx erreur du serveur.']]),
        K.formula('T<sub>page</sub> ≈ RTT<sub>DNS</sub> + RTT<sub>TCP</sub> + RTT<sub>HTTP</sub> + taille / débit', 'Modèle simple, sans retransmission. Avec TLS, ajouter environ deux RTT dans les versions anciennes.'),
        K.example('temps de chargement', '<p>RTT 50 ms, 500 Ko, 10 Mbit/s sans TLS : T ≈ 150 + 400 = ' + fN(pageTime({ rtt: 50, dns: true, tls: false, sizeKo: 500, mbps: 10 })) + ' ms.</p>')] },
      { title: 'Diagnostic réseau', summary: 'ping, traceroute, dépannage.', html: [
        '<p class="lead">Un diagnostic méthodique suit les couches de bas en haut.</p>',
        K.defs([['ping', 'Envoie une demande d’écho ICMP (type 8) et attend la réponse (type 0).'], ['traceroute', 'Envoie des paquets avec un TTL croissant et lit les réponses ICMP.'], ['Adresse privée', '10/8, 172.16/12, 192.168/16 : non routables sur Internet.']]),
        K.formula('Paquets perdus = 1 − reçus / envoyés', 'Une perte élevée signale un problème de liaison ou de congestion.'),
        K.example('lire un symptôme', '<p>Le navigateur affiche « nom introuvable », mais un ping de l’adresse IP fonctionne : la panne est du côté DNS, pas du côté réseau.</p>'),
        K.pitfalls(['<strong>Conclure trop vite à une panne d’Internet</strong> sans tester chaque étape.', '<strong>Oublier que certains pare-feu bloquent ICMP</strong> : un ping sans réponse ne prouve rien à lui seul.', '<strong>Confondre un 404 et une panne de serveur.</strong> Le serveur a répondu.']),
        K.summary(['Le modèle OSI comprend sept couches.', 'DNS résout, TCP connecte en trois temps, HTTP demande.', '4xx : erreur client ; 5xx : erreur serveur.', 'Diagnostiquez de bas en haut.']),
        K.toLab('reseaux-info', 'Suivez un échange client-serveur et diagnostiquez des pannes.')] }
    ] });

  var D = { sc: 'ok', rtt: 50, sizeKo: 500, mbps: 10, tls: 0, diag: 'none', ran: 0 };
  function M(s) { return { log: s.ran ? run(s.sc) : [], t: pageTime({ rtt: s.rtt, dns: true, tls: !!s.tls, sizeKo: s.sizeKo, mbps: s.mbps }), c: SCENARIOS[s.sc] }; }
  var CASES = { ok: 'Cas 1', dns: 'Cas 2', route: 'Cas 3', port: 'Cas 4', app: 'Cas 5', notfound: 'Cas 6' };
  var RIGHT = { ok: 'none', dns: 'dns', route: 'net', port: 'port', app: 'server', notfound: 'content' };
  var lab = { id: 'reseaux-info', title: 'Échange client-serveur et diagnostic', short: 'Client-serveur', icon: 'network', badge: 'Échanges simplifiés, sans congestion',
    text: 'Lancez une requête et suivez chaque étape. Analysez le résultat pour diagnostiquer six situations.',
    summary: 'Suivez DNS, TCP et HTTP pas à pas, calculez un temps de chargement et diagnostiquez six pannes.',
    params: [{ group: 'Situation' }, { k: 'sc', label: 'Cas à analyser', select: true, opts: Object.keys(CASES).map(function (k) { return [k, CASES[k]]; }), hint: 'Lancez la requête, puis lisez le journal.', onChange: function (s) { s.ran = 0; } }, { k: 'diag', label: 'Votre diagnostic', select: true, opts: [['none', 'Aucune panne'], ['dns', 'Résolution de nom'], ['net', 'Réseau, hôte injoignable'], ['port', 'Service non démarré ou port fermé'], ['server', 'Erreur interne du serveur'], ['content', 'Page inexistante']], hint: 'Déduisez la cause du journal.' }, { group: 'Performance' }, { k: 'rtt', label: 'RTT', min: 1, max: 700, step: 1, unit: 'ms', dec: 0 }, { k: 'sizeKo', label: 'Taille de la page', min: 10, max: 10000, log: true, unit: 'Ko', dec: 0 }, { k: 'mbps', label: 'Débit', min: 0.1, max: 1000, log: true, unit: 'Mbit/s', dec: 1 }, { k: 'tls', label: 'Connexion chiffrée', opts: [[0, 'Non'], [1, 'Avec TLS ancien']] }],
    defaults: D, model: M,
    actions: { go: function (s) { s.ran = 1; } },
    expr: function (s, m) { return 'Temps de chargement estimé : ' + fN(m.t) + ' ms'; },
    widget: function (s, m) { return '<div class="sim-row"><button type="button" class="btn btn--primary btn--sm" data-act="go">Envoyer la requête</button></div><ol class="sim-log">' + m.log.map(function (l) { return '<li class="' + (l[1] > 0 ? 'is-ok' : l[1] < 0 ? 'is-ko' : '') + '">' + S.esc(l[0]) + '</li>'; }).join('') + '</ol>' + (m.log.length ? '' : '<p class="muted">Aucun échange pour l’instant.</p>'); },
    readouts: [['Temps estimé', function (s, m) { return fN(m.t) + ' ms'; }], ['Échanges journalisés', function (s, m) { return String(m.log.length); }]],
    explain: function (s, m) { return '<p>Le temps de chargement ajoute des allers-retours (DNS, TCP, HTTP) et la durée de transfert : ' + fN(m.t) + ' ms. Le journal montre où l’échange s’arrête.</p>'; },
    missions: [
      { id: 'm1', title: 'Une requête réussie', text: 'Sur le cas 1, envoyez la requête et obtenez un 200.', solution: { sc: 'ok', ran: 1 }, check: function (s, m) { return s.sc === 'ok' && s.ran && m.c.http === 200 ? { ok: true, msg: 'Réussi : DNS, TCP et HTTP se sont enchaînés.' } : { ok: false, msg: 'Sélectionnez le cas 1 et envoyez la requête.' }; } },
      { id: 'm2', title: 'Diagnostiquer le cas 4', text: 'Analysez le journal du cas 4 et choisissez la bonne cause.', solution: { sc: 'port', ran: 1, diag: 'port' }, check: function (s) { if (s.sc !== 'port' || !s.ran) return { ok: false, msg: 'Sélectionnez le cas 4 et envoyez la requête.' }; return s.diag === RIGHT.port ? { ok: true, msg: 'Réussi : l’hôte répond mais refuse la connexion TCP.' } : { ok: false, msg: 'Relisez le journal : quelle étape échoue ?' }; } },
      { id: 'm3', title: 'Diagnostiquer le cas 2', text: 'Analysez le cas 2.', solution: { sc: 'dns', ran: 1, diag: 'dns' }, check: function (s) { if (s.sc !== 'dns' || !s.ran) return { ok: false, msg: 'Sélectionnez le cas 2 et envoyez la requête.' }; return s.diag === RIGHT.dns ? { ok: true, msg: 'Réussi : aucune adresse n’a pu être obtenue.' } : { ok: false, msg: 'Relisez le journal.' }; } },
      { id: 'm4', title: 'Chargement rapide', text: 'Pour 2 Mo sur un RTT de 200 ms, obtenez un temps inférieur à 1 s.', solution: { sizeKo: 2000, rtt: 200, mbps: 200 }, check: function (s, m) { if (s.sizeKo !== 2000 || s.rtt !== 200) return { ok: false, msg: 'Réglez 2 000 Ko et un RTT de 200 ms.' }; return m.t < 1000 ? { ok: true, msg: 'Réussi : ' + fN(m.t) + ' ms. Au-delà d’un certain débit, c’est le RTT qui limite.' } : { ok: false, msg: 'Temps : ' + fN(m.t) + ' ms. Augmentez le débit.' }; } }],
    limits: '<p>Les échanges sont simplifiés : pas de retransmission, de contrôle de congestion, de cache DNS ni de réutilisation de connexion. Le modèle TLS correspond à un échange ancien de deux allers-retours. Les messages et adresses sont fictifs.</p>' };

  var list = [
    K.num('e1', 'Efficacité', 'Couches', '<p>1 460 octets utiles dans une trame de 1 518 octets. Calculez l’efficacité, en %.</p>', 1460 / 1518 * 100, '%', { abs: 0.2 }, '<p>1460/1518 = ' + fN(1460 / 1518 * 100, 4) + ' %.</p>'),
    K.num('e2', 'Temps de transfert', 'Performance', '<p>Transférer 1 Mo à 8 Mbit/s prend combien de temps, en s ?</p>', 1, 's', { rel: 0.02 }, '<p>8 Mbit / 8 Mbit/s = 1 s.</p>'),
    K.num('e3', 'Couches OSI', 'Couches', '<p>Combien de couches compte le modèle OSI ?</p>', 7, '', { abs: 0.1 }, '<p>Physique, liaison, réseau, transport, session, présentation, application.</p>'),
    K.pick('e4', 'Rôle de DNS', 'Protocoles', '<p>DNS sert à :</p>', 'traduire un nom en adresse', ['chiffrer une page', 'attribuer des adresses MAC', 'compresser les données'], '<p>Un enregistrement de type A associe un nom à une adresse IPv4.</p>'),
    K.pick('e5', 'Ordre TCP', 'Protocoles', '<p>L’ouverture d’une connexion TCP se fait par :</p>', 'SYN, SYN+ACK, ACK', ['ACK, SYN, FIN', 'GET, 200, FIN', 'DISCOVER, OFFER, ACK'], '<p>C’est l’échange en trois temps de la RFC 9293.</p>'),
    K.pick('e6', 'Code 404', 'HTTP', '<p>Un code 404 signifie :</p>', 'le serveur a répondu et la ressource est introuvable', ['le serveur est éteint', 'le réseau est coupé', 'le nom DNS est inconnu'], '<p>Le serveur fonctionne ; c’est l’adresse demandée qui n’existe pas.</p>'),
    K.pick('e7', 'Adresse privée', 'Adressage', '<p>Quelle adresse est privée ?</p>', '192.168.1.20', ['8.8.8.8', '41.243.10.5', '203.0.113.200'], '<p>192.168.0.0/16 fait partie des plages privées (RFC 1918).</p>'),
    K.pick('e8', 'DHCP', 'Protocoles', '<p>L’ordre correct est :</p>', 'DISCOVER, OFFER, REQUEST, ACK', ['OFFER, DISCOVER, ACK, REQUEST', 'REQUEST, ACK, DISCOVER, OFFER', 'SYN, ACK, FIN, RST'], '<p>Le client cherche, le serveur propose, le client demande, le serveur confirme.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('reseaux-info', list) };
});
