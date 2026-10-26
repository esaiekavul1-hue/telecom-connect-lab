/*
 * TELECOM CONNECT LAB — Module « Réseaux IP » : exercices
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/exercise-kit.js') : root.TCL.exerciseKit;
  var IP = node ? require('./ip-math.js') : root.TCL.ipMath;
  var api = factory(K, IP, K.M);
  if (node) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL.exercises = root.TCL.exercises || {}; root.TCL.exercises.ip = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (K, IP, M) {
  'use strict';
  var v = K.v, list = [];
  var ip = function (s) { return IP.parseIp(s).value; };

  /** Champ « adresse IPv4 » : valide la syntaxe, compare la valeur. */
  function ipAnswer(expected) {
    return {
      hint: 'Notation décimale pointée, par exemple 10.1.2.0.',
      validate: function (t) { var r = IP.parseIp(t); return r.ok ? null : r.message; },
      accept: function (t) { var r = IP.parseIp(t); return r.ok && r.value === expected; },
      expected: IP.toString(expected)
    };
  }
  function push(o, extra) { Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; }); list.push(o); }

  (function () {
    var a = ip('192.168.10.77'), net = IP.network(a, 26);
    push({ id: 'e1', title: 'Adresse de réseau', skill: 'Masque et réseau', type: 'text',
      prompt: '<p>Une machine a l’adresse <span class="mono">192.168.10.77/26</span>. Quelle est l’<strong>adresse du réseau</strong> auquel elle appartient ?</p>',
      explanation: '<p>/26 : masque 255.255.255.192. Seul le dernier octet est concerné : 77 = 01001101, ET 11000000 = 01000000 = 64. Adresse de réseau : <span class="mono">' + IP.toString(net) + '</span>.</p>' }, ipAnswer(net));
  })();

  (function () {
    var a = ip('192.168.10.77'), bc = IP.broadcast(a, 26);
    push({ id: 'e2', title: 'Adresse de diffusion', skill: 'Masque et réseau', type: 'text',
      prompt: '<p>Toujours pour <span class="mono">192.168.10.77/26</span>, quelle est l’<strong>adresse de diffusion</strong> (broadcast) du réseau ?</p>',
      explanation: '<p>On met à 1 les 6 bits d’hôte de l’adresse de réseau : 01000000 devient 01111111 = 127. Diffusion : <span class="mono">' + IP.toString(bc) + '</span>. Les machines vont donc de .65 à .126.</p>' }, ipAnswer(bc));
  })();

  (function () {
    var n = IP.hostCount(27);
    list.push({ id: 'e3', title: 'Nombre d’hôtes', skill: 'Nombre d’hôtes', type: 'numeric',
      prompt: '<p>Combien de machines peut-on adresser dans un réseau <span class="mono">/27</span> ?</p>',
      answer: n, unit: 'hôtes', tol: { rel: 0 },
      explanation: '<p>32 − 27 = 5 bits d’hôte, soit 2⁵ = 32 adresses. On retire l’adresse de réseau et celle de diffusion : 32 − 2 = ' + n + ' machines.</p>' });
  })();

  (function () {
    var m = IP.prefixToMask(20);
    push({ id: 'e4', title: 'Du préfixe au masque', skill: 'Masque et réseau', type: 'text',
      prompt: '<p>Écrivez le masque correspondant au préfixe <span class="mono">/20</span> en notation décimale pointée.</p>',
      explanation: '<p>20 bits à 1 : 8 + 8 + 4. Les deux premiers octets valent 255, le troisième 11110000 = 128 + 64 + 32 + 16 = 240, le dernier 0. Masque : <span class="mono">' + IP.toString(m) + '</span>.</p>' }, ipAnswer(m));
  })();

  (function () {
    var p = IP.prefixForHosts(500);
    list.push({ id: 'e5', title: 'Choisir un masque', skill: 'Dimensionnement', type: 'numeric',
      prompt: '<p>Un réseau doit accueillir <strong>500 machines</strong>. Quel est le préfixe le plus long (le réseau le plus petit) qui convient ? Donnez le nombre ' + v('p') + ' du préfixe /' + v('p') + '.</p>',
      answer: p, unit: '', tol: { rel: 0 },
      explanation: '<p>Il faut ' + v('h') + ' bits d’hôte avec 2<sup>' + v('h') + '</sup> − 2 ≥ 500. 2⁸ − 2 = 254 ne suffit pas ; 2⁹ − 2 = 510 convient. Donc ' + v('h') + ' = 9 et ' + v('p') + ' = 32 − 9 = ' + p + ' (masque 255.255.254.0).</p>' });
  })();

  (function () {
    var same = IP.sameSubnet(ip('192.168.1.70'), ip('192.168.1.130'), 26);
    var q = K.qcm([
      { label: 'Oui : elles commencent toutes deux par 192.168.1.', value: 'yes' },
      { label: 'Non : avec /26, leurs adresses de réseau sont 192.168.1.64 et 192.168.1.128.', value: 'no' },
      { label: 'Oui : un /26 contient 256 adresses.', value: 'yes-256' },
      { label: 'On ne peut pas savoir sans l’adresse de la passerelle.', value: 'unknown' }
    ], same ? 'yes' : 'no', function (a, b) { return a === b; });
    list.push({ id: 'e6', title: 'Même sous-réseau ?', skill: 'Sous-réseaux', type: 'qcm',
      prompt: '<p>Les machines <span class="mono">192.168.1.70/26</span> et <span class="mono">192.168.1.130/26</span> sont-elles dans le même sous-réseau ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>70 ET 192 = 64 et 130 ET 192 = 128 : les adresses de réseau diffèrent. Elles doivent passer par un routeur pour communiquer. Un /26 ne contient que 64 adresses.</p>' });
  })();

  (function () {
    var cands = ['172.20.4.1', '172.32.0.5', '192.169.1.1', '11.0.0.1'];
    var priv = cands.filter(function (a) { return IP.classify(ip(a)).private; });
    var q = K.qcm(cands.map(function (a) { return { label: a, value: a }; }), priv[0], function (a, b) { return a === b; });
    list.push({ id: 'e7', title: 'Reconnaître une adresse privée', skill: 'Adresses privées', type: 'qcm',
      prompt: '<p>Laquelle de ces adresses est une adresse <strong>privée</strong> (RFC 1918), non routée sur Internet ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>Les plages privées sont 10.0.0.0/8, 172.16.0.0/12 (de 172.16 à 172.31) et 192.168.0.0/16. 172.20.4.1 est dans 172.16.0.0/12 ; 172.32.0.5 est juste après cette plage ; 192.169.1.1 n’est pas dans 192.168.0.0/16 ; 11.0.0.1 est juste après 10.0.0.0/8.</p>' });
  })();

  (function () {
    var table = [
      { dest: ip('10.0.0.0'), prefix: 8, label: '10.0.0.0/8 → R-A' },
      { dest: ip('10.1.0.0'), prefix: 16, label: '10.1.0.0/16 → R-B' },
      { dest: ip('10.1.2.0'), prefix: 24, label: '10.1.2.0/24 → R-C' },
      { dest: 0, prefix: 0, label: '0.0.0.0/0 → R-D (défaut)' }
    ];
    var m = IP.longestPrefixMatch(table, ip('10.1.3.7'));
    var q = K.qcm(table.map(function (r) { return { label: r.label, value: r.label }; }), m.label, function (a, b) { return a === b; });
    list.push({ id: 'e8', title: 'Plus long préfixe', skill: 'Routage', type: 'qcm',
      prompt: '<p>Un routeur doit acheminer un paquet vers <span class="mono">10.1.3.7</span>. Quelle ligne de sa table de routage utilise-t-il ?</p>',
      options: q.options, answer: q.answer,
      explanation: '<p>10.1.3.7 correspond à 10.0.0.0/8, à 10.1.0.0/16 et à la route par défaut, mais pas à 10.1.2.0/24 (troisième octet 3 ≠ 2). Parmi les lignes qui correspondent, la plus précise est <strong>10.1.0.0/16</strong> : le paquet part vers R-B.</p>' });
  })();

  (function () {
    var ttl = 64 - 5;
    list.push({ id: 'e9', title: 'Durée de vie d’un paquet', skill: 'TTL', type: 'numeric',
      prompt: '<p>Un paquet est émis avec un TTL de 64. Il traverse 5 routeurs avant d’atteindre sa destination. Quelle est la valeur du TTL à l’arrivée ?</p>',
      answer: ttl, unit: '', tol: { rel: 0 },
      explanation: '<p>Chaque routeur retire 1 au TTL : 64 − 5 = ' + ttl + '. Le destinataire, lui, ne le modifie pas. Si le TTL avait atteint 0 dans un routeur, le paquet aurait été détruit.</p>' });
  })();

  (function () {
    var bits = IP.octetToBinary(172);
    list.push({ id: 'e10', title: 'Un octet en binaire', skill: 'Binaire', type: 'text',
      prompt: '<p>Le premier octet de l’adresse 172.16.5.10 vaut 172. Écrivez-le <strong>en binaire sur 8 bits</strong>.</p>',
      hint: 'Huit chiffres 0 ou 1.',
      validate: function (t) { var b = t.replace(/\s/g, ''); return /^[01]+$/.test(b) ? (b.length === 8 ? null : 'Saisissez exactement 8 bits (vous en avez saisi ' + b.length + ').') : 'Utilisez uniquement les chiffres 0 et 1.'; },
      accept: function (t) { return t.replace(/\s/g, '') === bits; }, expected: bits,
      explanation: '<p>172 = 128 + 32 + 8 + 4. Poids 128, 64, 32, 16, 8, 4, 2, 1 → 1, 0, 1, 0, 1, 1, 0, 0 : <span class="mono">' + bits + '</span>.</p>' });
  })();

  return K.series('ip', list);
});
