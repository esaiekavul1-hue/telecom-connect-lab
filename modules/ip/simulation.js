/*
 * TELECOM CONNECT LAB — Laboratoire « Réseaux IP »
 * -----------------------------------------------
 * 1. Calculateur IPv4 : réseau, diffusion, hôtes, binaire, sous-réseaux.
 * 2. Parcours d'un paquet dans un petit réseau (2 routeurs, 3 réseaux locaux) :
 *    décision locale / passerelle, ARP, table de routage (plus long préfixe),
 *    TTL, encapsulation, pannes de configuration.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, IP = TCL.ipMath, U = TCL.util, K = TCL.labkit, esc = U.esc;
  var ID = 'ip', LABEL = 'Réseaux IP';

  var HOSTS = ['PC-A', 'PC-B', 'PC-C', 'Serveur'];
  var APPS = { web: { label: 'Page web (TCP, port 80)', proto: 'TCP', port: 80, hdr: 'tcp' }, dns: { label: 'Requête DNS (UDP, port 53)', proto: 'UDP', port: 53, hdr: 'udp' }, ping: { label: 'Ping (ICMP)', proto: 'ICMP', port: null, hdr: 'icmp' } };
  var FAULTS = { none: 'Aucune panne', gateway: 'Passerelle de PC-A erronée (192.168.1.254)', mask: 'Masque de PC-A erroné (/16 au lieu de /24)' };
  var DEFAULTS = { ip: '192.168.1.10', mask: '/24', split: 2, src: 'PC-A', dst: 'PC-B', custom: '8.8.8.8', app: 'web', payload: 100, ttl: 64, fault: 'none' };
  var EXAMPLES = [['192.168.1.10|/24', '192.168.1.10 /24'], ['192.168.10.77|/26', '192.168.10.77 /26'], ['172.16.5.10|255.255.0.0', '172.16.5.10 /16'], ['10.20.30.40|/12', '10.20.30.40 /12']];

  function fN(v, s) { return M.formatNumber(v, s || 12); }
  function calc(s) {
    var ip = IP.parseIp(s.ip), mk = IP.parseMask(s.mask);
    if (!ip.ok || !mk.ok) return { ok: false, ipErr: ip.ok ? '' : ip.message, maskErr: mk.ok ? '' : mk.message };
    var p = mk.prefix, v = ip.value;
    return { ok: true, ip: v, p: p, net: IP.network(v, p), bc: IP.broadcast(v, p), mask: IP.prefixToMask(p), first: IP.firstHost(v, p), last: IP.lastHost(v, p), hosts: IP.hostCount(p), total: IP.addressCount(p), kind: IP.classify(v) };
  }
  function dstIp(s) { if (s.dst === 'other') { var r = IP.parseIp(s.custom); return r.ok ? r.value : null; } return IP.topology('none').hosts[s.dst].ip; }
  function sim(s) { var d = dstIp(s); return d == null ? null : IP.route(s.src, d, s.ttl, s.fault); }

  var missions = [
    {
      id: 'm1', title: 'Un réseau pour 50 machines',
      text: 'Dans le calculateur, choisissez le masque qui permet au moins 50 hôtes, en gaspillant le moins d’adresses possible.',
      check: function (s) {
        var c = calc(s);
        if (!c.ok) return { ok: false, msg: 'Saisissez d’abord une adresse et un masque valides.' };
        if (c.hosts < 50) return { ok: false, msg: 'Avec /' + c.p + ', seuls ' + fN(c.hosts) + ' hôtes sont possibles : il en faut au moins 50.' };
        if (c.p === IP.prefixForHosts(50)) return { ok: true, msg: 'Réussi : /26 (255.255.255.192) donne 2⁶ − 2 = 62 hôtes. Un /27 n’en donnerait que 30, un /25 en gaspillerait 76.' };
        return { ok: false, msg: '/' + c.p + ' donne ' + fN(c.hosts) + ' hôtes : c’est suffisant, mais un masque plus long gaspillerait moins d’adresses.' };
      }
    },
    {
      id: 'm2', title: 'Joindre le serveur',
      text: 'Sans panne, envoyez un paquet de PC-A vers le serveur et suivez-le jusqu’à son arrivée.',
      check: function (s) {
        if (s.fault !== 'none') return { ok: false, msg: 'Choisissez « Aucune panne ».' };
        if (s.src !== 'PC-A' || s.dst !== 'Serveur') return { ok: false, msg: 'La source doit être PC-A et la destination le serveur.' };
        var r = sim(s);
        if (r && r.delivered) return { ok: true, msg: 'Réussi : PC-A → R1 → R2 → serveur. PC-A a envoyé le paquet à sa passerelle (le serveur n’est pas dans son réseau), puis chaque routeur a choisi la route au plus long préfixe.' };
        return { ok: false, msg: 'Le paquet n’arrive pas : vérifiez le TTL.' };
      }
    },
    {
      id: 'm3', title: 'Le TTL minimal',
      text: 'Toujours de PC-A vers le serveur, trouvez la plus petite valeur de TTL qui permet au paquet d’arriver.',
      check: function (s) {
        if (s.fault !== 'none' || s.src !== 'PC-A' || s.dst !== 'Serveur') return { ok: false, msg: 'Réglez : source PC-A, destination serveur, aucune panne.' };
        var r = sim(s);
        if (!r.delivered) return { ok: false, msg: 'Avec TTL = ' + s.ttl + ', le paquet est détruit par ' + r.failedAt + ' : augmentez le TTL.' };
        if (s.ttl === 3) return { ok: true, msg: 'Réussi : chaque routeur retire 1 au TTL et détruit le paquet s’il atteint 0. Deux routeurs à traverser : il faut TTL ≥ 3 (le paquet arrive avec TTL = 1).' };
        return { ok: false, msg: 'Le paquet arrive avec TTL = ' + r.ttlAtArrival + ' : une valeur plus petite suffirait.' };
      }
    },
    {
      id: 'm4', title: 'Diagnostiquer un masque erroné',
      text: 'Activez la panne « masque de PC-A erroné ». PC-A ne joint plus PC-C. Trouvez une destination hors de son réseau local (192.168.1.0/24) qu’il atteint encore.',
      check: function (s) {
        if (s.fault !== 'mask') return { ok: false, msg: 'Choisissez la panne « Masque de PC-A erroné ».' };
        if (s.src !== 'PC-A') return { ok: false, msg: 'La source doit être PC-A.' };
        var d = dstIp(s), r = sim(s);
        if (d == null) return { ok: false, msg: 'Saisissez une adresse de destination valide.' };
        if (IP.sameSubnet(d, IP.parseIp('192.168.1.0').value, 24)) return { ok: false, msg: 'Cette destination est dans le réseau local de PC-A : cherchez-en une à l’extérieur.' };
        if (r.delivered) return { ok: true, msg: 'Réussi : ' + IP.toString(d) + ' n’est pas dans 192.168.0.0/16, donc PC-A l’envoie bien à sa passerelle. Mais pour 192.168.2.30 (PC-C), le masque /16 lui fait croire qu’il est voisin : il le cherche en ARP sur son propre réseau, sans réponse.' };
        return { ok: false, msg: 'Le paquet vers ' + IP.toString(d) + ' n’arrive pas (' + reasonText(r) + ').' };
      }
    }
  ];

  function reasonText(r) {
    return { arp: 'aucune réponse ARP pour ' + (r.missing != null ? IP.toString(r.missing) : '?'), ttl: 'TTL épuisé chez ' + r.failedAt, noroute: 'aucune route chez ' + r.failedAt, wronghost: 'mauvais destinataire', loop: 'boucle' }[r.reason] || 'échec';
  }

  /* ------------------------------- Topologie (SVG) ------------------------------- */

  var POS = { 'PC-A': [70, 70], 'PC-B': [70, 230], SW1: [170, 150], R1: [290, 150], R2: [500, 150], 'PC-C': [700, 70], 'Serveur': [700, 230] };
  function segment(a, b) {
    var lan1 = ['PC-A', 'PC-B', 'R1'];
    if (lan1.indexOf(a) >= 0 && lan1.indexOf(b) >= 0) return [POS[a], POS.SW1, POS[b]];
    return [POS[a], POS[b]];
  }
  function topoSvg(s, r, step) {
    var topo = IP.topology(s.fault), W = 770, H = 300;
    var out = ['<svg class="topo" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Topologie : PC-A et PC-B sur le réseau 192.168.1.0/24 reliés au routeur R1 ; R1 relié à R2 par le réseau 10.0.0.0/30 ; R2 relié à PC-C (192.168.2.0/24) et au serveur (172.16.0.0/16)." xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="scope__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>');
    out.push('<rect class="topo__lan" x="20" y="18" width="300" height="264" rx="14"/><text class="topo__lanlabel" x="32" y="38">LAN1 · 192.168.1.0/24</text>');
    out.push('<rect class="topo__lan" x="600" y="18" width="150" height="122" rx="14"/><text class="topo__lanlabel" x="612" y="38">LAN2 · 192.168.2.0/24</text>');
    out.push('<rect class="topo__lan" x="600" y="160" width="150" height="122" rx="14"/><text class="topo__lanlabel" x="612" y="180">LAN3 · 172.16.0.0/16</text>');
    out.push('<text class="topo__lanlabel" x="395" y="138" text-anchor="middle">WAN · 10.0.0.0/30</text>');
    [['PC-A', 'SW1'], ['PC-B', 'SW1'], ['SW1', 'R1'], ['R1', 'R2'], ['R2', 'PC-C'], ['R2', 'Serveur']].forEach(function (l) {
      out.push('<line class="topo__link" x1="' + POS[l[0]][0] + '" y1="' + POS[l[0]][1] + '" x2="' + POS[l[1]][0] + '" y2="' + POS[l[1]][1] + '"/>');
    });
    // trajet parcouru jusqu'à l'étape courante
    var cur = null;
    if (r) r.hops.slice(0, step + 1).forEach(function (h, i) {
      if (!h.to) return;
      var seg = segment(h.at, h.to), d = seg.map(function (p, k) { return (k ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join('');
      out.push('<path class="topo__path' + (i === step ? ' topo__path--now' : '') + '" d="' + d + '"/>');
      if (i === step) cur = seg;
    });
    // équipements
    function device(name, kind, lines) {
      var p = POS[name], active = r && r.hops[step] && r.hops[step].at === name, failed = r && !r.delivered && step === r.hops.length - 1 && r.failedAt === name;
      out.push('<g class="topo__dev topo__dev--' + kind + (active ? ' is-active' : '') + (failed ? ' is-failed' : '') + '">');
      if (kind === 'router') out.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="22"/><path class="topo__glyph" d="M' + (p[0] - 11) + ' ' + p[1] + 'h22 M' + p[0] + ' ' + (p[1] - 11) + 'v22 M' + (p[0] + 7) + ' ' + (p[1] - 4) + 'l4 4-4 4 M' + (p[0] - 7) + ' ' + (p[1] - 4) + 'l-4 4 4 4"/>');
      else if (kind === 'switch') out.push('<rect x="' + (p[0] - 16) + '" y="' + (p[1] - 10) + '" width="32" height="20" rx="4"/>');
      else out.push('<rect x="' + (p[0] - 20) + '" y="' + (p[1] - 15) + '" width="40" height="28" rx="4"/><path class="topo__glyph" d="M' + (p[0] - 10) + ' ' + (p[1] + 19) + 'h20"/>');
      lines.forEach(function (t, i) { out.push('<text class="topo__t' + (i || kind === 'switch' ? ' topo__t--small' : '') + '" x="' + p[0] + '" y="' + (kind === 'switch' ? p[1] - 16 : p[1] + (kind === 'router' ? 38 : 34) + i * 13) + '" text-anchor="middle">' + esc(t) + '</text>'); });
      out.push('</g>');
    }
    HOSTS.forEach(function (h) { var x = topo.hosts[h]; device(h, 'host', [h, IP.toString(x.ip) + '/' + x.prefix]); });
    device('SW1', 'switch', ['commutateur']);
    device('R1', 'router', ['R1', '.1 | 10.0.0.1']);
    device('R2', 'router', ['R2', '10.0.0.2 | .1 | .0.1']);
    if (cur) {
      var a = cur[cur.length - 2], b = cur[cur.length - 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      out.push('<g class="topo__packet"><rect x="' + (mx - 13) + '" y="' + (my - 9) + '" width="26" height="18" rx="3"/><path d="M' + (mx - 13) + ' ' + (my - 9) + 'l13 10 13-10"/></g>');
    }
    out.push('</svg>');
    return out.join('');
  }

  /* ------------------------------- Explications ------------------------------- */

  function explain(param, b, s) {
    if (['ip', 'mask', 'split'].indexOf(param) >= 0) {
      var c = calc(s);
      if (!c.ok) return '<p>Saisie incomplète ou invalide : ' + esc(c.ipErr || c.maskErr) + '</p>';
      var hb = 32 - c.p;
      return '<p>Masque /' + c.p + ' : les ' + c.p + ' premiers bits désignent le <strong>réseau</strong>, les ' + hb + ' derniers l’<strong>hôte</strong>. Adresse réseau = adresse ET masque = <strong>' + IP.toString(c.net) + '</strong> (bits d’hôte à 0) ; diffusion = <strong>' + IP.toString(c.bc) + '</strong> (bits d’hôte à 1).</p>' +
        '<p>' + (c.p <= 30 ? 'Hôtes utilisables : 2<sup>' + hb + '</sup> − 2 = <strong>' + fN(c.hosts) + '</strong>, de ' + IP.toString(c.first) + ' à ' + IP.toString(c.last) + ' (on retire l’adresse du réseau et celle de diffusion).' : c.p === 31 ? 'Un /31 sert aux liaisons point à point : ses 2 adresses sont utilisables (RFC 3021).' : 'Un /32 désigne une seule machine.') + ' Nature : ' + esc(c.kind.label) + '.</p>';
    }
    var r = sim(s);
    if (!r) return '<p>L’adresse de destination saisie n’est pas valide.</p>';
    if (param === 'fault') return '<p>' + (s.fault === 'none' ? 'Configuration correcte rétablie.' : s.fault === 'gateway' ? 'La passerelle de PC-A pointe vers 192.168.1.254, une adresse qui n’existe pas : PC-A joint encore ses voisins du LAN1, mais plus rien à l’extérieur.' : 'Le masque de PC-A est /16 : il croit que toutes les adresses 192.168.x.x sont dans son réseau et les cherche directement en ARP, sans passer par le routeur.') + '</p>' + resultLine(r);
    if (param === 'ttl') return '<p>TTL initial : <strong>' + s.ttl + '</strong>. Chaque routeur retire 1 au TTL ; si le résultat vaut 0, le paquet est détruit. Cela évite qu’un paquet tourne indéfiniment en cas de boucle de routage.</p>' + resultLine(r);
    if (param === 'app' || param === 'payload') {
      var a = APPS[s.app], hdr = IP.HEADERS[a.hdr], ipLen = IP.HEADERS.ip + hdr + s.payload, frame = IP.HEADERS.ethernet + ipLen + IP.HEADERS.fcs;
      return '<p>' + esc(a.label) + ' : ' + s.payload + ' octets de données, + ' + hdr + ' octets d’en-tête ' + a.proto + ', + 20 octets d’en-tête IP, soit un paquet IP de ' + ipLen + ' octets, dans une trame Ethernet de ' + frame + ' octets (en-tête de 14 octets et contrôle de 4 octets). Les en-têtes représentent ' + fN((frame - s.payload) / frame * 100, 3) + ' % de la trame.</p>';
    }
    return '<p>' + esc(s.src) + ' envoie un paquet à ' + IP.toString(dstIp(s)) + '.</p>' + resultLine(r);
  }
  function resultLine(r) {
    return r.delivered ? '<p>Résultat : <strong>paquet remis</strong> en ' + r.hops.length + ' étape(s) (TTL à l’arrivée : ' + r.ttlAtArrival + ').</p>' : '<p>Résultat : <strong>paquet perdu</strong> (' + esc(reasonText(r)) + ').</p>';
  }
  function intro() { return '<p>Utilisez le calculateur, puis envoyez un paquet entre deux machines et suivez-le étape par étape : l’explication s’adaptera à vos réglages.</p>'; }

  /* ------------------------------------ Page ------------------------------------ */

  function sanitize(p) {
    var o = {};
    if (typeof p.ip === 'string' && p.ip.length < 40) o.ip = p.ip;
    if (typeof p.mask === 'string' && p.mask.length < 40) o.mask = p.mask;
    if (isFinite(p.split) && p.split >= 1 && p.split <= 4) o.split = Math.floor(p.split);
    if (HOSTS.indexOf(p.src) >= 0) o.src = p.src;
    if (HOSTS.indexOf(p.dst) >= 0 || p.dst === 'other') o.dst = p.dst;
    if (typeof p.custom === 'string' && p.custom.length < 40) o.custom = p.custom;
    if (APPS[p.app]) o.app = p.app;
    if (FAULTS[p.fault]) o.fault = p.fault;
    if (isFinite(p.payload) && p.payload >= 0 && p.payload <= 1460) o.payload = Math.floor(p.payload);
    if (isFinite(p.ttl) && p.ttl >= 1 && p.ttl <= 64) o.ttl = Math.floor(p.ttl);
    return o;
  }

  function mount(container) {
    var s = K.loadParams(ID, DEFAULTS, sanitize);
    var tr = K.tracker(), save = K.paramSaver(ID), step = 0, timer = null;

    container.innerHTML = [
      '<div class="lab">',
      K.head({ title: 'Laboratoire : réseaux IP', badge: 'Simulation pédagogique d’un petit réseau IPv4', text: 'Calculez les caractéristiques d’un réseau à partir d’une adresse et d’un masque, puis suivez un paquet de machine en machine : décision locale, passerelle, routage, TTL et encapsulation.' }),
      '<section class="ip-section" aria-labelledby="calc-title"><h2 class="h-sub" id="calc-title">1. Calculateur d’adresses IPv4</h2>',
      '<div class="ip-calc"><form class="controls" onsubmit="return false" novalidate>',
      '<div class="control"><label for="in-ip">Adresse IPv4</label><input type="text" id="in-ip" class="text-input mono" autocomplete="off" spellcheck="false" inputmode="decimal" aria-describedby="in-ip-err"><p class="field-error" id="in-ip-err" aria-live="polite"></p></div>',
      '<div class="control"><label for="in-mask">Masque ou préfixe</label><input type="text" id="in-mask" class="text-input mono" autocomplete="off" spellcheck="false" aria-describedby="in-mask-hint in-mask-err"><p class="control__hint" id="in-mask-hint">Exemples : /24, 24 ou 255.255.255.0.</p><p class="field-error" id="in-mask-err" aria-live="polite"></p></div>',
      '<div class="control"><p class="control__label">Exemples</p>' + K.chips('Exemples d’adresses', EXAMPLES, 'ex') + '</div>',
      K.select({ id: 'in-split', label: 'Découper en sous-réseaux', options: [['1', '2 sous-réseaux (+1 bit)'], ['2', '4 sous-réseaux (+2 bits)'], ['3', '8 sous-réseaux (+3 bits)'], ['4', '16 sous-réseaux (+4 bits)']], hint: 'Emprunte des bits à la partie hôte.' }),
      '</form><div class="ip-results">',
      K.readouts([['Adresse réseau', 'r-net'], ['Adresse de diffusion', 'r-bc'], ['Masque', 'r-mask'], ['Préfixe', 'r-p'], ['Première adresse utilisable', 'r-first'], ['Dernière adresse utilisable', 'r-last'],
        ['Hôtes utilisables', 'r-hosts'], ['Adresses au total', 'r-total'], ['Nature de l’adresse', 'r-kind'], ['Classe historique', 'r-cls']]),
      '<div class="box"><h3>Vue binaire</h3><div class="table-wrap"><table class="data-table data-table--compact bin-table" id="bin-table"><caption class="sr-only">Adresse, masque et réseau en binaire</caption></table></div><p class="muted"><span class="bin-legend bin-legend--net"></span> partie réseau · <span class="bin-legend bin-legend--host"></span> partie hôte</p></div>',
      '<div class="box"><h3 id="sub-title">Sous-réseaux</h3><div class="table-wrap"><table class="data-table data-table--compact" id="sub-table"><caption class="sr-only">Sous-réseaux</caption></table></div></div>',
      '</div></div></section>',
      '<section class="ip-section" aria-labelledby="route-title"><h2 class="h-sub" id="route-title">2. Parcours d’un paquet</h2>',
      '<div class="lab__grid"><div class="lab__main">',
      '<div class="scope-panel"><div class="scope-panel__bar"><p class="scope-panel__expr" id="expr"></p><p class="verdict" id="verdict" aria-live="polite"></p></div><div id="topo"></div>',
      '<div class="stage-pager stage-pager--dark"><button type="button" class="btn btn--on-dark btn--sm" id="hop-prev">' + TCL.icon('arrowLeft') + 'Étape précédente</button><span class="hop-count" id="hop-count" aria-live="polite"></span><button type="button" class="btn btn--on-dark btn--sm" id="hop-play">' + TCL.icon('play') + 'Lecture</button><button type="button" class="btn btn--primary btn--sm" id="hop-next">Étape suivante' + TCL.icon('arrowRight') + '</button></div></div>',
      '<div class="lab__pair">',
      '<section class="box"><h3>Ce que fait l’équipement</h3><ol class="hops" id="hops"></ol></section>',
      '<section class="box"><h3 id="rt-title">Table de routage</h3><div id="rt"></div></section>',
      '</div>',
      '<section class="box lab__aux"><h3>Encapsulation de la trame à cette étape</h3><div id="encap"></div></section>',
      K.explainBox(''),
      '</div>',
      '<aside class="lab__controls" aria-label="Commandes du parcours de paquet"><form class="controls" onsubmit="return false" novalidate>',
      K.select({ id: 'in-src', label: 'Machine source', options: HOSTS.map(function (h) { return [h, h]; }), hint: '' }),
      K.select({ id: 'in-dst', label: 'Destination', options: HOSTS.map(function (h) { return [h, h]; }).concat([['other', 'Autre adresse…']]), hint: '' }),
      '<div class="control" id="ctl-custom"><label for="in-custom">Adresse de destination</label><input type="text" id="in-custom" class="text-input mono" autocomplete="off" spellcheck="false" aria-describedby="in-custom-err"><p class="field-error" id="in-custom-err" aria-live="polite"></p></div>',
      K.select({ id: 'in-app', label: 'Application', options: Object.keys(APPS).map(function (k) { return [k, APPS[k].label]; }), hint: 'Détermine l’en-tête de transport.' }),
      K.range({ id: 'in-payload', label: 'Données', min: 0, max: 1460, step: 10, unit: 'octets', srLabel: 'Taille des données en octets', hint: 'De 0 à 1 460 octets (la trame reste sous la MTU Ethernet de 1 500 octets).' }),
      K.range({ id: 'in-ttl', label: 'TTL initial', min: 1, max: 64, step: 1, unit: '', srLabel: 'Durée de vie initiale', hint: 'Nombre maximal de routeurs traversés (64 par défaut sur de nombreux systèmes).' }),
      K.select({ id: 'in-fault', label: 'Panne de configuration', options: Object.keys(FAULTS).map(function (k) { return [k, FAULTS[k]]; }), hint: 'Pour s’entraîner au diagnostic.' }),
      '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + TCL.icon('reset') + 'Réinitialiser</button>',
      '</form></aside></div></section>',
      K.missionsSection(missions),
      K.limits('<p>Le réseau est minimal et statique : routes saisies à la main, pas de DHCP, pas de traduction d’adresses (NAT), pas de pare-feu, pas de pertes aléatoires. Seul l’aller du paquet est simulé (la réponse suivrait le chemin inverse). Les adresses MAC sont fictives. Le calculateur traite uniquement IPv4 ; IPv6 (adresses de 128 bits) suit les mêmes principes de préfixe et de routage.</p>'),
      K.sequenceLinks(ID),
      '</div>'
    ].join('');
    var $ = function (sel) { return container.querySelector(sel); };

    function refreshCalc() {
      var c = calc(s);
      $('#in-ip-err').textContent = c.ipErr || ''; $('#in-mask-err').textContent = c.maskErr || '';
      $('#in-ip').toggleAttribute('aria-invalid', !!c.ipErr); $('#in-mask').toggleAttribute('aria-invalid', !!c.maskErr);
      var set = function (id, t) { K.setText(container, id, t); };
      if (!c.ok) {
        ['#r-net', '#r-bc', '#r-mask', '#r-p', '#r-first', '#r-last', '#r-hosts', '#r-total', '#r-kind', '#r-cls'].forEach(function (id) { set(id, '—'); });
        $('#bin-table').innerHTML = '<tbody><tr><td>Saisissez une adresse et un masque valides.</td></tr></tbody>'; $('#sub-table').innerHTML = '';
        return;
      }
      set('#r-net', IP.toString(c.net)); set('#r-bc', IP.toString(c.bc)); set('#r-mask', IP.toString(c.mask)); set('#r-p', '/' + c.p);
      set('#r-first', IP.toString(c.first)); set('#r-last', IP.toString(c.last)); set('#r-hosts', fN(c.hosts)); set('#r-total', fN(c.total));
      set('#r-kind', c.kind.label); set('#r-cls', c.kind.cls + (c.kind.cls === 'D' ? ' (multidiffusion)' : c.kind.cls === 'E' ? ' (réservée)' : ''));
      function binRow(label, v) {
        var b = IP.toBinary(v), html = '', k = 0;
        for (var i = 0; i < b.length; i++) { if (b[i] === '.') { html += '<span class="bin-dot">.</span>'; continue; } html += '<span class="' + (k < c.p ? 'bin-net' : 'bin-host') + '">' + b[i] + '</span>'; k++; }
        return '<tr><th scope="row">' + label + '</th><td class="mono">' + IP.toString(v) + '</td><td class="mono bin">' + html + '</td></tr>';
      }
      $('#bin-table').innerHTML = '<thead><tr><th scope="col"></th><th scope="col">Décimal</th><th scope="col">Binaire</th></tr></thead><tbody>' + binRow('Adresse', c.ip) + binRow('Masque', c.mask) + binRow('Réseau (ET)', c.net) + binRow('Diffusion', c.bc) + '</tbody>';
      var np = Math.min(32, c.p + s.split);
      if (np > 30 || c.p >= 31) { $('#sub-title').textContent = 'Sous-réseaux'; $('#sub-table').innerHTML = '<tbody><tr><td>Plus assez de bits d’hôte pour découper ce réseau.</td></tr></tbody>'; return; }
      var sub = IP.subnets(c.ip, c.p, np, 16);
      $('#sub-title').textContent = 'Découpage en ' + sub.total + ' sous-réseaux /' + np + ' (' + fN(IP.hostCount(np)) + ' hôtes chacun)';
      $('#sub-table').innerHTML = '<thead><tr><th scope="col">N°</th><th scope="col">Réseau</th><th scope="col">Hôtes utilisables</th><th scope="col">Diffusion</th></tr></thead><tbody>' + sub.list.map(function (x, i) {
        var mine = IP.sameSubnet(c.ip, x.network, np);
        return '<tr class="' + (mine ? 'is-current' : '') + '"><td>' + (i + 1) + '</td><td class="mono">' + IP.toString(x.network) + '/' + np + '</td><td class="mono">' + IP.toString(x.network + 1) + ' – ' + IP.toString(x.broadcast - 1) + '</td><td class="mono">' + IP.toString(x.broadcast) + '</td></tr>';
      }).join('') + '</tbody>';
    }

    function encapHtml(h) {
      var a = APPS[s.app], th = IP.HEADERS[a.hdr];
      if (!h || !h.frame) return '<p class="muted">Pas de trame à cette étape (le paquet est traité ou détruit par l’équipement).</p>';
      var f = h.frame, total = IP.HEADERS.ethernet + IP.HEADERS.ip + th + s.payload + IP.HEADERS.fcs;
      var box = function (cls, title, lines, size) { return '<div class="encap__box encap__box--' + cls + '" style="flex-grow:' + Math.max(1, Math.log2(size + 2)) + '"><strong>' + title + '</strong>' + lines.map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('') + '<small>' + size + ' octets</small></div>'; };
      return '<div class="encap">' +
        box('eth', 'Ethernet (couche 2)', ['MAC src ' + f.macSrc, 'MAC dst ' + f.macDst], IP.HEADERS.ethernet) +
        box('ip', 'IP (couche 3)', ['src ' + IP.toString(f.ipSrc), 'dst ' + IP.toString(f.ipDst), 'TTL ' + f.ttl], IP.HEADERS.ip) +
        box('tr', a.proto + ' (couche 4)', a.port ? ['port ' + a.port] : ['écho'], th) +
        box('data', 'Données', [a.proto === 'ICMP' ? 'contenu du ping' : 'contenu de l’application'], s.payload) +
        box('fcs', 'FCS', ['contrôle'], IP.HEADERS.fcs) + '</div>' +
        '<p class="muted">Trame de ' + total + ' octets. D’un lien à l’autre, les adresses <strong>MAC</strong> changent ; les adresses <strong>IP</strong> restent celles de la source et de la destination ; le <strong>TTL</strong> diminue de 1 à chaque routeur.</p>';
    }

    function routeTable(r, h) {
      if (!h || (h.kind !== 'router' && !(h.kind === 'drop' && r.topo.routers[h.at]))) { $('#rt-title').textContent = 'Table de routage'; return '<p class="muted">' + (h && r.topo.hosts[h.at] ? h.at + ' n’a pas de table de routage complète : il compare la destination à son propre réseau, puis utilise sa passerelle par défaut (' + IP.toString(r.topo.hosts[h.at].gw) + ').' : 'Sélectionnez une étape traitée par un routeur.') + '</p>'; }
      var rt = r.topo.routers[h.at], d = dstIp(s), m = IP.longestPrefixMatch(rt.table, d);
      $('#rt-title').textContent = 'Table de routage de ' + h.at;
      return '<div class="table-wrap"><table class="data-table data-table--compact"><caption class="sr-only">Table de routage</caption><thead><tr><th scope="col">Destination</th><th scope="col">Passerelle</th><th scope="col">Interface</th><th scope="col">Correspond ?</th></tr></thead><tbody>' +
        rt.table.map(function (e) {
          var match = IP.network(d, e.prefix) === e.dest, chosen = m === e;
          return '<tr class="' + (chosen ? 'is-current' : '') + '"><td class="mono">' + (e.prefix === 0 ? '0.0.0.0/0 (défaut)' : IP.toString(e.dest) + '/' + e.prefix) + '</td><td class="mono">' + (e.nextHop == null ? 'directe' : IP.toString(e.nextHop)) + '</td><td>' + e.iface + '</td><td>' + (chosen ? '<strong>oui, plus long préfixe</strong>' : match ? 'oui' : 'non') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    function refreshRoute() {
      var r = sim(s), d = dstIp(s);
      $('#ctl-custom').hidden = s.dst !== 'other';
      $('#in-custom-err').textContent = s.dst === 'other' && d == null ? IP.parseIp(s.custom).message : '';
      if (!r) { $('#topo').innerHTML = topoSvg(s, null, 0); $('#hops').innerHTML = ''; $('#rt').innerHTML = ''; $('#encap').innerHTML = ''; K.setText(container, '#hop-count', ''); return; }
      step = Math.max(0, Math.min(step, r.hops.length - 1));
      $('#topo').innerHTML = topoSvg(s, r, step);
      $('#expr').innerHTML = esc(s.src) + ' (' + IP.toString(IP.topology(s.fault).hosts[s.src].ip) + ') → ' + IP.toString(d) + ' · TTL ' + s.ttl + ' · ' + esc(APPS[s.app].proto);
      var v = $('#verdict'), last = step === r.hops.length - 1;
      v.className = 'verdict ' + (!last ? 'verdict--warn' : r.delivered ? 'verdict--ok' : 'verdict--ko');
      v.innerHTML = TCL.icon(!last ? 'clock' : r.delivered ? 'check' : 'x') + '<span>' + (!last ? 'En route' : r.delivered ? 'Paquet remis' : 'Paquet perdu') + '</span>';
      $('#hops').innerHTML = r.hops.map(function (h, i) {
        return '<li class="hop' + (i === step ? ' is-current' : '') + (i > step ? ' is-future' : '') + (h.kind === 'drop' ? ' is-drop' : h.kind === 'deliver' ? ' is-ok' : '') + '"><button type="button" class="hop__btn" data-hop="' + i + '"><strong>' + esc(h.at) + '</strong></button>' +
          (i <= step ? '<p>' + esc(h.decision) + '</p><p class="muted">' + esc(h.text) + '</p>' : '<p class="muted">Étape suivante…</p>') + '</li>';
      }).join('');
      U.qsa('[data-hop]', container).forEach(function (b) { b.addEventListener('click', function () { step = Number(b.getAttribute('data-hop')); stopPlay(); refreshRoute(); }); });
      $('#rt').innerHTML = routeTable(r, r.hops[step]);
      $('#encap').innerHTML = encapHtml(r.hops[step]);
      K.setText(container, '#hop-count', 'Étape ' + (step + 1) + ' / ' + r.hops.length);
      $('#hop-prev').disabled = step === 0; $('#hop-next').disabled = last;
    }

    function refresh() {
      refreshCalc(); refreshRoute();
      if (document.activeElement !== $('#in-ip')) $('#in-ip').value = s.ip;
      if (document.activeElement !== $('#in-mask')) $('#in-mask').value = s.mask;
      if (document.activeElement !== $('#in-custom')) $('#in-custom').value = s.custom;
      ['split', 'src', 'dst', 'app', 'fault'].forEach(function (k) { var el = $('#in-' + k); if (document.activeElement !== el) el.value = String(s[k]); });
      K.setText(container, '#in-payload-out', s.payload + ' octets'); K.setText(container, '#in-ttl-out', String(s.ttl));
      pairs.payload.sync(s.payload); pairs.ttl.sync(s.ttl);
      var html = tr.param() ? explain(tr.param(), tr.base(), s) : null;
      $('#explain').innerHTML = html || intro(s);
      save(s);
    }

    function set(name, value, single, keepStep) {
      tr.before(name, s); s[name] = value;
      if (!keepStep && ['src', 'dst', 'custom', 'ttl', 'fault'].indexOf(name) >= 0) { step = 0; stopPlay(); }
      refresh(); if (single) tr.end();
    }
    var pairs = {
      payload: K.bindPair(container, { id: 'in-payload', validate: K.numberValidator(0, 1460, 'octets', 0), onInput: function (v) { set('payload', Math.round(v)); }, onEnd: function () { tr.end(); }, current: function () { return s.payload; } }),
      ttl: K.bindPair(container, { id: 'in-ttl', validate: K.numberValidator(1, 64, '', 0), onInput: function (v) { set('ttl', Math.round(v)); }, onEnd: function () { tr.end(); }, current: function () { return s.ttl; } })
    };
    $('#in-ip').addEventListener('input', function (e) { set('ip', e.target.value.trim()); });
    $('#in-mask').addEventListener('input', function (e) { set('mask', e.target.value.trim()); });
    ['#in-ip', '#in-mask', '#in-custom'].forEach(function (id) { $(id).addEventListener('change', function () { tr.end(); }); });
    $('#in-custom').addEventListener('input', function (e) { set('custom', e.target.value.trim()); });
    $('#in-split').addEventListener('change', function (e) { set('split', Number(e.target.value), true); });
    ['src', 'dst', 'app', 'fault'].forEach(function (k) { $('#in-' + k).addEventListener('change', function (e) { set(k, e.target.value, true); }); });
    U.qsa('[data-ex]', container).forEach(function (b) { b.addEventListener('click', function () { var p = b.getAttribute('data-ex').split('|'); tr.before('ip', s); s.ip = p[0]; s.mask = p[1]; refresh(); tr.end(); }); });
    $('#hop-prev').addEventListener('click', function () { stopPlay(); step--; refreshRoute(); });
    $('#hop-next').addEventListener('click', function () { stopPlay(); step++; refreshRoute(); });
    function stopPlay() { if (timer) { clearInterval(timer); timer = null; $('#hop-play').innerHTML = TCL.icon('play') + 'Lecture'; } }
    $('#hop-play').addEventListener('click', function () {
      if (timer) return stopPlay();
      var r = sim(s); if (!r) return;
      if (step >= r.hops.length - 1) step = 0;
      refreshRoute();
      $('#hop-play').innerHTML = TCL.icon('pause') + 'Pause';
      timer = setInterval(function () { var rr = sim(s); if (!rr || step >= rr.hops.length - 1) return stopPlay(); step++; refreshRoute(); }, 1300);
    });
    $('#lab-reset').addEventListener('click', function () {
      stopPlay(); s = Object.assign({}, DEFAULTS); step = 0; tr.reset(); Object.keys(pairs).forEach(function (k) { pairs[k].clear(); }); refresh();
      U.toast('Paramètres réinitialisés : 192.168.1.10 /24, PC-A vers PC-B, TTL 64, sans panne.', 'info');
    });

    K.bindMissions(container, ID, LABEL, missions, function () { return s; });
    refresh();
    return function () { stopPlay(); };
  }

  function thumb() { var s = Object.assign({}, DEFAULTS, { dst: 'Serveur' }); return { html: '<div class="thumb-topo">' + topoSvg(s, IP.route('PC-A', IP.parseIp('172.16.5.10').value, 64, 'none'), 2) + '</div>' }; }

  TCL.ipPlot = { topoSvg: topoSvg };
  TCL.labs = TCL.labs || {};
  TCL.labs[ID] = {
    id: ID, title: 'Réseaux IP : adressage et routage', short: LABEL, icon: 'network', mount: mount, missions: missions, thumb: thumb,
    summary: 'Calculateur IPv4 (réseau, diffusion, hôtes, binaire, sous-réseaux) et parcours pas à pas d’un paquet : passerelle, ARP, table de routage, TTL, encapsulation et pannes.',
    explain: explain, DEFAULTS: DEFAULTS
  };
})(window);
