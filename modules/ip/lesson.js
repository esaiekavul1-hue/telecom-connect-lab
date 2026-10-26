/*
 * TELECOM CONNECT LAB — Module « Réseaux IP » : leçon
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var IP = TCL.ipMath, M = TCL.signalMath;
  function v(s) { return '<var>' + s + '</var>'; }
  function fN(x, s) { return M.formatNumber(x, s || 12); }

  /** Adresse en 32 cases : partie réseau / partie hôte. */
  function bitsSvg(addr, prefix, label) {
    var a = IP.parseIp(addr).value, b = IP.toBinary(a).replace(/\./g, ''), W = 600, H = 150, cw = 16, x0 = (W - 32 * cw - 3 * 6) / 2;
    var out = ['<svg class="schema" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="schema__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>');
    var oct = IP.toString(a).split('.');
    for (var i = 0; i < 32; i++) {
      var x = x0 + i * cw + Math.floor(i / 8) * 6;
      out.push('<rect class="' + (i < prefix ? 'schema__bitnet' : 'schema__bithost') + '" x="' + x + '" y="52" width="' + (cw - 2) + '" height="26" rx="3"/>');
      out.push('<text class="schema__bit" x="' + (x + (cw - 2) / 2) + '" y="70" text-anchor="middle">' + b[i] + '</text>');
      if (i % 8 === 0) out.push('<text class="schema__t" x="' + (x + 4 * cw - 4) + '" y="40" text-anchor="middle">' + oct[i / 8] + '</text>');
    }
    var xs = x0 + prefix * cw + Math.floor((prefix - 1) / 8) * 6 - 1;
    out.push('<line class="schema__cut" x1="' + xs + '" y1="44" x2="' + xs + '" y2="88"/>');
    out.push('<text class="schema__t schema__t--net" x="' + ((x0 + xs) / 2) + '" y="108" text-anchor="middle">réseau : ' + prefix + ' bits</text>');
    out.push('<text class="schema__t schema__t--host" x="' + ((xs + x0 + 32 * cw + 18) / 2) + '" y="108" text-anchor="middle">hôte : ' + (32 - prefix) + ' bits</text>');
    out.push('<text class="schema__t schema__t--muted" x="' + (W / 2) + '" y="134" text-anchor="middle">' + addr + '/' + prefix + ' · réseau ' + IP.toString(IP.network(a, prefix)) + ' · diffusion ' + IP.toString(IP.broadcast(a, prefix)) + '</text>');
    out.push('</svg>');
    return out.join('');
  }

  function encapSvg() {
    var W = 600, H = 250, layers = [
      ['Données de l’application', 'Application', 4, 'data'],
      ['TCP / UDP + données', 'Transport : segment', 3, 'tr'],
      ['IP + segment', 'Réseau : paquet', 2, 'ip'],
      ['Ethernet + paquet + FCS', 'Liaison : trame', 1, 'eth']
    ];
    var out = ['<svg class="schema" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Encapsulation : les données reçoivent un en-tête de transport (segment), puis un en-tête IP (paquet), puis un en-tête et un contrôle Ethernet (trame)." xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="schema__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>');
    layers.forEach(function (l, i) {
      var y = 22 + i * 56, dataX = 330, dataW = 150, x = dataX, parts = [];
      // empilement des en-têtes de gauche à droite
      var hdrs = [['tr', 'TCP 20'], ['ip', 'IP 20'], ['eth', 'Eth 14']].slice(0, 4 - l[2]);
      hdrs.forEach(function (h) { x -= 60; parts.unshift('<rect class="schema__enc schema__enc--' + h[0] + '" x="' + x + '" y="' + y + '" width="58" height="34" rx="4"/><text class="schema__t schema__t--in" x="' + (x + 29) + '" y="' + (y + 22) + '" text-anchor="middle">' + h[1] + '</text>'); });
      out.push(parts.join(''));
      out.push('<rect class="schema__enc schema__enc--data" x="' + dataX + '" y="' + y + '" width="' + dataW + '" height="34" rx="4"/><text class="schema__t schema__t--in" x="' + (dataX + dataW / 2) + '" y="' + (y + 22) + '" text-anchor="middle">données</text>');
      if (l[3] === 'eth') out.push('<rect class="schema__enc schema__enc--eth" x="' + (dataX + dataW + 2) + '" y="' + y + '" width="40" height="34" rx="4"/><text class="schema__t schema__t--in" x="' + (dataX + dataW + 22) + '" y="' + (y + 22) + '" text-anchor="middle">FCS</text>');
      out.push('<text class="schema__t" x="16" y="' + (y + 22) + '">' + l[1] + '</text>');
    });
    out.push('</svg>');
    return out.join('');
  }

  function topo(dst, step, fault) {
    var d = IP.parseIp(dst).value, s = { src: 'PC-A', dst: 'Serveur', fault: fault || 'none' };
    return TCL.ipPlot.topoSvg(s, IP.route('PC-A', d, 64, fault || 'none'), step);
  }

  var figures = {
    'bits-24': { caption: 'L’adresse 192.168.1.10/24 : les 24 premiers bits (en cyan) désignent le réseau, les 8 derniers la machine.', svg: function () { return bitsSvg('192.168.1.10', 24, 'Adresse 192.168.1.10 sur 32 bits : 24 bits de réseau, 8 bits d’hôte.'); } },
    'bits-26': { caption: 'Avec /26, la frontière se déplace dans le dernier octet : 26 bits de réseau, 6 bits d’hôte (62 machines).', svg: function () { return bitsSvg('192.168.10.77', 26, 'Adresse 192.168.10.77 sur 32 bits : 26 bits de réseau, 6 bits d’hôte.'); } },
    'topo-local': { caption: 'Réseau d’étude du laboratoire. PC-A envoie d’abord sa trame vers R1, sa passerelle, car le serveur n’est pas dans son réseau.', svg: function () { return topo('172.16.5.10', 0); } },
    'topo-route': { caption: 'R1 puis R2 consultent leur table de routage et transmettent le paquet de proche en proche jusqu’au serveur.', svg: function () { return topo('172.16.5.10', 2); } },
    encap: { caption: 'Encapsulation : chaque couche ajoute son en-tête (tailles minimales en octets). À la réception, chaque couche retire le sien.', svg: encapSvg }
  };

  var chapters = [
    {
      id: 'c1', title: 'Les adresses IPv4',
      summary: 'À quoi sert une adresse IP ; notation décimale pointée ; binaire.',
      html: [
        '<p class="lead">Sur Internet, chaque machine qui envoie ou reçoit des données est repérée par une adresse IP, comme une maison par son adresse postale.</p>',
        '<h3>Définition</h3>',
        '<p>Une <strong>adresse IPv4</strong> est un nombre de <strong>32 bits</strong>. Pour la lire facilement, on la découpe en 4 <strong>octets</strong> (groupes de 8 bits), écrits en décimal et séparés par des points : c’est la <strong>notation décimale pointée</strong>.</p>',
        '<div class="formula">192.168.1.10 = 11000000.10101000.00000001.00001010</div>',
        '<p>Chaque octet vaut entre 0 et 255 (2⁸ = 256 valeurs). Il existe donc 2³² ≈ 4,3 milliards d’adresses IPv4, ce qui est devenu insuffisant : c’est pourquoi IPv6 (128 bits) a été créé.</p>',
        '<h3>Convertir un octet en binaire</h3>',
        '<p>Les 8 bits d’un octet ont pour poids 128, 64, 32, 16, 8, 4, 2, 1. On décompose le nombre en partant du plus grand poids.</p>',
        '<ol class="steps"><li>172 ≥ 128 : bit 1, reste 44.</li><li>44 &lt; 64 : bit 0. 44 ≥ 32 : bit 1, reste 12.</li><li>12 &lt; 16 : bit 0. 12 ≥ 8 : bit 1, reste 4.</li><li>4 ≥ 4 : bit 1, reste 0 ; les bits 2 et 1 valent 0.</li></ol>',
        '<p>Résultat : 172 = <strong>' + IP.octetToBinary(172) + '</strong>. Vérification : 128 + 32 + 8 + 4 = 172.</p>',
        '<div class="callout callout--info"><strong>Adresse IP et adresse MAC.</strong> L’adresse IP est <em>logique</em> : elle dépend du réseau où se trouve la machine et permet d’acheminer les paquets à travers le monde. L’adresse MAC (48 bits, par exemple 02:00:00:00:01:0a) est inscrite dans la carte réseau et ne sert qu’à l’intérieur d’un même réseau local.</div>'
      ].join('')
    },
    {
      id: 'c2', title: 'Masque, préfixe et adresse de réseau',
      summary: 'Partie réseau et partie hôte ; notation /n ; adresses de réseau et de diffusion ; nombre d’hôtes.',
      html: [
        '<p class="lead">Une adresse IP contient deux informations : le réseau auquel la machine appartient, et la machine elle-même dans ce réseau. Le masque indique où se trouve la frontière.</p>',
        '<h3>Le masque de sous-réseau</h3>',
        '<p>Le <strong>masque</strong> est un nombre de 32 bits formé de 1 consécutifs (partie réseau) suivis de 0 (partie hôte). On l’écrit en décimal pointé (255.255.255.0) ou sous forme de <strong>préfixe</strong> : le nombre de bits à 1 (/24). C’est la notation <strong>CIDR</strong>.</p>',
        '<div data-fig="bits-24"></div>',
        '<h3>Adresse de réseau et adresse de diffusion</h3>',
        '<ul><li><strong>Adresse de réseau</strong> : tous les bits d’hôte à 0. On l’obtient par un ET logique bit à bit entre l’adresse et le masque. Elle désigne le réseau lui-même.</li>',
        '<li><strong>Adresse de diffusion</strong> (broadcast) : tous les bits d’hôte à 1. Un paquet envoyé à cette adresse est reçu par toutes les machines du réseau.</li></ul>',
        '<div class="formula">réseau = adresse ET masque&emsp;·&emsp;' + v('N') + '<sub>hôtes</sub> = 2<sup>(32 − ' + v('p') + ')</sup> − 2</div>',
        '<p>On retire 2 car l’adresse de réseau et l’adresse de diffusion ne peuvent pas être attribuées à une machine. Exception : un /31 (liaison point à point) a 2 adresses utilisables, un /32 désigne une seule machine.</p>',
        '<h3>Exemple guidé : 192.168.10.77/26</h3>',
        '<div data-fig="bits-26"></div>',
        '<ol class="steps"><li>/26 : 26 bits de réseau, 32 − 26 = <strong>6 bits d’hôte</strong>. Masque : 255.255.255.<strong>192</strong> (11000000).</li>',
        '<li>Dernier octet : 77 = 01001101. ET 11000000 = 01000000 = <strong>64</strong>. Adresse de réseau : <strong>192.168.10.64</strong>.</li>',
        '<li>Bits d’hôte à 1 : 01111111 = 127. Diffusion : <strong>192.168.10.127</strong>.</li>',
        '<li>Hôtes : 2⁶ − 2 = <strong>62</strong>, de 192.168.10.65 à 192.168.10.126.</li></ol>',
        '<div class="table-wrap"><table class="data-table"><caption>Préfixes courants</caption><thead><tr><th scope="col">Préfixe</th><th scope="col">Masque</th><th scope="col">Hôtes utilisables</th></tr></thead><tbody>' +
          [8, 16, 20, 22, 23, 24, 25, 26, 27, 28, 30].map(function (p) { return '<tr><td>/' + p + '</td><td class="mono">' + IP.toString(IP.prefixToMask(p)) + '</td><td>' + fN(IP.hostCount(p)) + '</td></tr>'; }).join('') +
        '</tbody></table></div>',
        '<h3>Choisir le masque pour un nombre de machines</h3>',
        '<p>On cherche le plus petit nombre de bits d’hôte ' + v('h') + ' tel que 2<sup>' + v('h') + '</sup> − 2 ≥ nombre de machines. Pour 50 machines : 2⁵ − 2 = 30 est insuffisant, 2⁶ − 2 = 62 convient, donc ' + v('h') + ' = 6 et le préfixe vaut /26.</p>'
      ].join('')
    },
    {
      id: 'c3', title: 'Sous-réseaux et adresses privées',
      summary: 'Découper un réseau ; même sous-réseau ou non ; plages privées ; classes historiques.',
      html: [
        '<p class="lead">Une entreprise découpe souvent son réseau en plusieurs sous-réseaux (un par service, par étage…) pour limiter la diffusion et organiser la sécurité.</p>',
        '<h3>Découper en sous-réseaux</h3>',
        '<p>Emprunter ' + v('k') + ' bits à la partie hôte crée 2<sup>' + v('k') + '</sup> sous-réseaux, chacun plus petit. Exemple : 192.168.1.0/24 découpé avec 2 bits supplémentaires donne 4 sous-réseaux /26 :</p>',
        '<div class="table-wrap"><table class="data-table"><caption>192.168.1.0/24 découpé en /26</caption><thead><tr><th scope="col">Sous-réseau</th><th scope="col">Hôtes</th><th scope="col">Diffusion</th></tr></thead><tbody>' +
          IP.subnets(IP.parseIp('192.168.1.0').value, 24, 26).list.map(function (s) { return '<tr><td class="mono">' + IP.toString(s.network) + '/26</td><td class="mono">' + IP.toString(s.network + 1) + ' – ' + IP.toString(s.broadcast - 1) + '</td><td class="mono">' + IP.toString(s.broadcast) + '</td></tr>'; }).join('') +
        '</tbody></table></div>',
        '<h3>Deux machines sont-elles dans le même sous-réseau ?</h3>',
        '<p>Elles le sont si elles ont la <strong>même adresse de réseau</strong> avec le même masque. 192.168.1.70 et 192.168.1.130 en /26 : 70 ET 192 = 64, 130 ET 192 = 128. Réseaux différents (…64 et …128) : elles doivent passer par un routeur pour communiquer. En /24, elles seraient dans le même réseau.</p>',
        '<h3>Adresses privées et publiques</h3>',
        '<p>Trois plages sont réservées aux réseaux internes (RFC 1918). Elles ne sont jamais routées sur Internet :</p>',
        '<ul><li><strong>10.0.0.0/8</strong> (10.0.0.0 à 10.255.255.255)</li><li><strong>172.16.0.0/12</strong> (172.16.0.0 à 172.31.255.255)</li><li><strong>192.168.0.0/16</strong> (192.168.0.0 à 192.168.255.255)</li></ul>',
        '<p>Votre box utilise par exemple 192.168.1.x chez vous. Pour sortir sur Internet, elle remplace l’adresse privée par son adresse publique : c’est la <strong>traduction d’adresses (NAT)</strong>. D’autres plages sont spéciales : 127.0.0.0/8 (boucle locale, la machine elle-même), 169.254.0.0/16 (adresse auto-attribuée faute de serveur DHCP).</p>',
        '<div class="callout callout--info"><strong>Les classes A, B, C.</strong> Avant 1993, la taille du réseau dépendait du premier octet : classe A (1–126, /8), B (128–191, /16), C (192–223, /24). Ce système gaspillait les adresses ; il a été remplacé par le CIDR, où le préfixe est libre. On rencontre encore ces termes, mais seul le préfixe compte.</div>'
      ].join('')
    },
    {
      id: 'c4', title: 'Passerelle et ARP : sortir du réseau local',
      summary: 'Décision locale ou distante ; passerelle par défaut ; résolution d’adresse ARP ; pannes typiques.',
      html: [
        '<p class="lead">Avant d’envoyer un paquet, une machine se pose une seule question : la destination est-elle dans mon réseau ?</p>',
        '<h3>La décision de l’émetteur</h3>',
        '<ol class="steps"><li>La machine calcule l’adresse de réseau de la destination avec <strong>son propre masque</strong>.</li>',
        '<li><strong>Même réseau</strong> : elle envoie la trame directement à la destination.</li>',
        '<li><strong>Réseau différent</strong> : elle envoie la trame à sa <strong>passerelle par défaut</strong> (le routeur de son réseau), qui se chargera de la suite.</li></ol>',
        '<div data-fig="topo-local"></div>',
        '<h3>ARP : trouver l’adresse MAC</h3>',
        '<p>Sur un réseau local Ethernet ou Wi-Fi, les trames sont adressées par adresse <strong>MAC</strong>. Pour connaître la MAC qui correspond à une adresse IP voisine, la machine diffuse une requête <strong>ARP</strong> : « qui a 192.168.1.1 ? ». Le propriétaire répond avec sa MAC, que l’émetteur garde en mémoire (cache ARP).</p>',
        '<h3>Deux pannes classiques</h3>',
        '<ul class="examples"><li><strong>Passerelle erronée</strong> : la machine joint ses voisins, mais rien à l’extérieur (la requête ARP vers une passerelle inexistante reste sans réponse).</li>',
        '<li><strong>Masque trop court</strong> (/16 au lieu de /24) : la machine croit que 192.168.2.30 est son voisin et le cherche directement en ARP, sans passer par le routeur. Les destinations hors de 192.168.0.0/16 restent joignables via la passerelle, ce qui rend la panne déroutante.</li></ul>',
        '<p>Ces deux situations sont reproduites dans le laboratoire, avec le diagnostic de chaque étape.</p>'
      ].join('')
    },
    {
      id: 'c5', title: 'Routage et TTL',
      summary: 'Table de routage ; correspondance du plus long préfixe ; route par défaut ; durée de vie TTL.',
      html: [
        '<p class="lead">Un routeur relie plusieurs réseaux. Pour chaque paquet reçu, il choisit vers où le renvoyer grâce à sa table de routage.</p>',
        '<h3>La table de routage</h3>',
        '<p>Chaque ligne associe un <strong>réseau de destination</strong> (adresse et préfixe) à une <strong>sortie</strong> : une interface, et éventuellement le routeur suivant (« prochain saut »). La route <strong>0.0.0.0/0</strong> correspond à toutes les adresses : c’est la <strong>route par défaut</strong>.</p>',
        '<h3>La règle du plus long préfixe</h3>',
        '<p>Si plusieurs lignes correspondent à la destination, le routeur choisit celle dont le préfixe est le <strong>plus long</strong>, c’est-à-dire la plus précise. Exemple pour la destination 172.16.5.10 avec la table de R1 :</p>',
        '<ul><li>172.16.0.0/16 → via 10.0.0.2 : correspond (16 bits identiques).</li><li>0.0.0.0/0 → via 10.0.0.2 : correspond (0 bit à comparer).</li><li>192.168.1.0/24 : ne correspond pas.</li></ul>',
        '<p>R1 retient 172.16.0.0/16 (16 &gt; 0). S’il n’existe aucune ligne correspondante et pas de route par défaut, le paquet est détruit et un message ICMP « destination inaccessible » est renvoyé à la source.</p>',
        '<div data-fig="topo-route"></div>',
        '<h3>Le TTL (Time To Live)</h3>',
        '<p>L’en-tête IP contient un compteur, le <strong>TTL</strong>. Chaque routeur le diminue de 1 ; s’il atteint 0, le paquet est détruit et un message ICMP « Time Exceeded » est envoyé à la source. Cela empêche un paquet de tourner indéfiniment en cas d’erreur de routage.</p>',
        '<div class="formula">TTL à l’arrivée = TTL initial − nombre de routeurs traversés</div>',
        '<p>Exemple : un paquet émis avec TTL = 64 qui traverse 5 routeurs arrive avec TTL = 59. Pour traverser ' + v('r') + ' routeurs, il faut un TTL initial d’au moins ' + v('r') + ' + 1. La commande <code>traceroute</code> exploite ce mécanisme : elle envoie des paquets avec TTL = 1, 2, 3… et note quel routeur répond à chaque fois.</p>',
        '<div class="callout callout--info">Chaque routeur construit une <strong>nouvelle trame</strong> pour le lien suivant : les adresses MAC changent à chaque saut, alors que les adresses IP source et destination restent les mêmes de bout en bout (sauf traduction NAT).</div>'
      ].join('')
    },
    {
      id: 'c6', title: 'Encapsulation et synthèse',
      summary: 'Couches et en-têtes ; tailles ; récapitulatif ; erreurs fréquentes.',
      html: [
        '<p class="lead">Les données d’une application ne voyagent jamais seules : chaque couche du réseau leur ajoute les informations dont elle a besoin.</p>',
        '<h3>Le principe</h3>',
        '<div data-fig="encap"></div>',
        '<ul><li><strong>Transport</strong> : TCP (20 octets minimum, fiable, avec accusés de réception, ex. le web) ou UDP (8 octets, simple et rapide, ex. le DNS). Les <strong>ports</strong> désignent l’application (80 pour HTTP, 443 pour HTTPS, 53 pour le DNS).</li>',
        '<li><strong>Réseau</strong> : en-tête IP (20 octets minimum) avec les adresses IP source et destination et le TTL.</li>',
        '<li><strong>Liaison</strong> : en-tête Ethernet (14 octets, adresses MAC) et contrôle d’erreur FCS (4 octets) à la fin.</li></ul>',
        '<p>Exemple : 100 octets de données web → segment TCP de 120 octets → paquet IP de 140 octets → trame Ethernet de ' + (140 + 18) + ' octets. Les en-têtes représentent ' + fN(58 / 158 * 100, 3) + ' % de la trame : pour de petits messages, le « coût » des en-têtes est important. Une trame Ethernet transporte au plus 1 500 octets de paquet IP (MTU).</p>',
        '<h3>Ce qu’il faut retenir</h3>',
        '<ul class="summary"><li>Une adresse IPv4 fait 32 bits ; le préfixe /' + v('p') + ' sépare réseau (' + v('p') + ' bits) et hôte (32 − ' + v('p') + ' bits).</li>',
        '<li>Réseau = adresse ET masque ; diffusion = bits d’hôte à 1 ; hôtes = 2<sup>32−' + v('p') + '</sup> − 2.</li>',
        '<li>Plages privées : 10/8, 172.16/12, 192.168/16.</li>',
        '<li>Destination locale : envoi direct ; sinon : passerelle. ARP traduit IP → MAC sur le lien local.</li>',
        '<li>Routage : plus long préfixe, route par défaut 0.0.0.0/0 ; le TTL diminue de 1 par routeur.</li></ul>',
        '<h3>Erreurs fréquentes à éviter</h3>',
        '<ul class="pitfalls">',
        '<li><strong>Oublier le « − 2 ».</strong> Un /24 a 256 adresses, mais 254 machines seulement.</li>',
        '<li><strong>Croire que la route par défaut l’emporte.</strong> Elle ne sert que si aucune route plus précise ne correspond.</li>',
        '<li><strong>Penser que les adresses IP changent à chaque routeur.</strong> Ce sont les adresses MAC qui changent.</li>',
        '<li><strong>Confondre masque et passerelle.</strong> Le masque définit le réseau local ; la passerelle est l’adresse du routeur de ce réseau.</li>',
        '</ul>'
      ].join('')
    }
  ];

  TCL.lessons = TCL.lessons || {};
  TCL.lessons.ip = {
    id: 'ip', title: 'Réseaux IP',
    intro: 'Cette leçon explique comment les machines sont adressées sur un réseau IP, comment calculer un réseau à partir d’une adresse et d’un masque, et comment un paquet trouve son chemin de routeur en routeur.',
    objectives: [
      'Lire une adresse IPv4 en décimal pointé et en binaire.',
      'Calculer l’adresse de réseau, l’adresse de diffusion et le nombre d’hôtes à partir d’un masque.',
      'Choisir un masque adapté à un nombre de machines et découper un réseau en sous-réseaux.',
      'Reconnaître les adresses privées et expliquer le rôle de la passerelle et d’ARP.',
      'Appliquer la règle du plus long préfixe et expliquer le rôle du TTL.',
      'Décrire l’encapsulation d’une donnée dans un segment, un paquet et une trame.'
    ],
    prerequisites: 'Savoir compter en binaire (puissances de 2). Aucune connaissance préalable en réseau n’est nécessaire.',
    chapters: chapters, figures: figures
  };
})(window);
