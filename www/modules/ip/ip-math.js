/*
 * TELECOM CONNECT LAB — Réseaux IP : calculs d'adressage et de routage IPv4
 * ------------------------------------------------------------------------
 * Les adresses sont manipulées comme des entiers non signés sur 32 bits.
 *   réseau   = adresse ET masque
 *   diffusion = réseau OU (NON masque)
 *   hôtes utilisables = 2^(32 − p) − 2   (cas particuliers : /31 → 2 (RFC 3021), /32 → 1)
 * Routage : correspondance du plus long préfixe (longest prefix match).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.ipMath = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function u32(x) { return x >>> 0; }

  /** Lecture stricte d'une adresse IPv4. Renvoie { ok, value } ou { ok: false, message }. */
  function parseIp(str) {
    var s = String(str == null ? '' : str).trim();
    if (!s) return { ok: false, message: 'Saisissez une adresse IPv4, par exemple 192.168.1.10.' };
    var parts = s.split('.');
    if (parts.length !== 4) return { ok: false, message: 'Une adresse IPv4 comporte 4 nombres séparés par des points (exemple : 192.168.1.10).' };
    var v = 0;
    for (var i = 0; i < 4; i++) {
      var p = parts[i];
      if (!/^\d{1,3}$/.test(p)) return { ok: false, message: 'Chaque partie doit être un nombre entier de 0 à 255 (partie n° ' + (i + 1) + ' : « ' + p + ' »).' };
      if (p.length > 1 && p[0] === '0') return { ok: false, message: 'Évitez les zéros en tête (« ' + p + ' ») : écrivez ' + Number(p) + '.' };
      var n = Number(p);
      if (n > 255) return { ok: false, message: 'Chaque octet vaut au plus 255 (partie n° ' + (i + 1) + ' : ' + n + ').' };
      v = v * 256 + n;
    }
    return { ok: true, value: u32(v) };
  }

  function prefixToMask(p) { return p === 0 ? 0 : u32(0xFFFFFFFF << (32 - p)); }
  function maskToPrefix(m) {
    m = u32(m);
    var p = 0;
    while (p < 32 && (m & u32(0x80000000 >>> p))) p++;
    return u32(prefixToMask(p)) === m ? p : -1;
  }

  /** Masque : « /24 », « 24 » ou « 255.255.255.0 ». Renvoie { ok, prefix } ou { ok: false, message }. */
  function parseMask(str) {
    var s = String(str == null ? '' : str).trim();
    var m = /^\/?(\d{1,2})$/.exec(s);
    if (m) {
      var p = Number(m[1]);
      return p <= 32 ? { ok: true, prefix: p } : { ok: false, message: 'Un préfixe va de /0 à /32.' };
    }
    var ip = parseIp(s);
    if (!ip.ok) return { ok: false, message: 'Saisissez un masque comme 255.255.255.0 ou un préfixe comme /24.' };
    var pr = maskToPrefix(ip.value);
    if (pr < 0) return { ok: false, message: 'Ce masque n’est pas valide : ses bits à 1 doivent être tous à gauche, sans trou (exemple : 255.255.240.0).' };
    return { ok: true, prefix: pr };
  }

  function toString(v) { v = u32(v); return [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join('.'); }
  function toBinary(v) { v = u32(v); return [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].map(function (o) { return ('00000000' + o.toString(2)).slice(-8); }).join('.'); }
  function octetToBinary(n) { return ('00000000' + (n & 255).toString(2)).slice(-8); }

  function network(ip, p) { return u32(ip & prefixToMask(p)); }
  function broadcast(ip, p) { return u32(network(ip, p) | u32(~prefixToMask(p))); }
  function hostCount(p) { return p === 32 ? 1 : p === 31 ? 2 : Math.pow(2, 32 - p) - 2; }
  function addressCount(p) { return Math.pow(2, 32 - p); }
  function firstHost(ip, p) { return p >= 31 ? network(ip, p) : u32(network(ip, p) + 1); }
  function lastHost(ip, p) { return p >= 31 ? broadcast(ip, p) : u32(broadcast(ip, p) - 1); }
  function sameSubnet(a, b, p) { return network(a, p) === network(b, p); }
  /** Plus long préfixe permettant au moins n hôtes utilisables. */
  function prefixForHosts(n) { for (var p = 30; p >= 0; p--) if (hostCount(p) >= n) return p; return 0; }

  function inRange(ip, net, p) { return network(ip, p) === u32(net); }
  var SPECIAL = [
    { net: '0.0.0.0', p: 8, label: 'réseau « ce réseau » (réservé)' },
    { net: '10.0.0.0', p: 8, label: 'adresse privée (RFC 1918)', private: true },
    { net: '100.64.0.0', p: 10, label: 'espace partagé des opérateurs (CGNAT, RFC 6598)' },
    { net: '127.0.0.0', p: 8, label: 'boucle locale (loopback)' },
    { net: '169.254.0.0', p: 16, label: 'adresse locale de lien (attribuée automatiquement faute de DHCP)' },
    { net: '172.16.0.0', p: 12, label: 'adresse privée (RFC 1918)', private: true },
    { net: '192.168.0.0', p: 16, label: 'adresse privée (RFC 1918)', private: true },
    { net: '224.0.0.0', p: 4, label: 'multidiffusion (multicast)' },
    { net: '240.0.0.0', p: 4, label: 'réservée' }
  ];
  /** Nature d'une adresse : privée, publique, spéciale ; classe historique. */
  function classify(ip) {
    ip = u32(ip);
    if (ip === 0xFFFFFFFF) return { label: 'diffusion limitée (255.255.255.255)', private: false, special: true, cls: 'E' };
    var first = ip >>> 24, cls = first < 128 ? 'A' : first < 192 ? 'B' : first < 224 ? 'C' : first < 240 ? 'D' : 'E';
    for (var i = 0; i < SPECIAL.length; i++) {
      var sp = SPECIAL[i];
      if (inRange(ip, parseIp(sp.net).value, sp.p)) return { label: sp.label, private: !!sp.private, special: !sp.private, cls: cls };
    }
    return { label: 'adresse publique', private: false, special: false, cls: cls };
  }

  /** Découpe le réseau en sous-réseaux de préfixe newP (au plus max). */
  function subnets(ip, p, newP, max) {
    var out = [], base = network(ip, p), size = addressCount(newP), n = Math.pow(2, newP - p);
    for (var i = 0; i < Math.min(n, max || 16); i++) { var net = u32(base + i * size); out.push({ network: net, broadcast: u32(net + size - 1), prefix: newP }); }
    return { list: out, total: n };
  }

  /** Correspondance du plus long préfixe. table : [{ dest (entier), prefix, … }] */
  function longestPrefixMatch(table, dst) {
    var best = null;
    table.forEach(function (r) { if (inRange(dst, r.dest, r.prefix) && (!best || r.prefix > best.prefix)) best = r; });
    return best;
  }

  /* --------------------------- Topologie du laboratoire --------------------------- */

  function ip(s) { return parseIp(s).value; }
  /** Réseau d'étude : deux routeurs, trois réseaux locaux. */
  function topology(fault) {
    var hosts = {
      'PC-A': { name: 'PC-A', ip: ip('192.168.1.10'), prefix: 24, gw: ip('192.168.1.1'), mac: '02:00:00:00:01:0a', link: 'LAN1' },
      'PC-B': { name: 'PC-B', ip: ip('192.168.1.20'), prefix: 24, gw: ip('192.168.1.1'), mac: '02:00:00:00:01:14', link: 'LAN1' },
      'PC-C': { name: 'PC-C', ip: ip('192.168.2.30'), prefix: 24, gw: ip('192.168.2.1'), mac: '02:00:00:00:02:1e', link: 'LAN2' },
      'Serveur': { name: 'Serveur', ip: ip('172.16.5.10'), prefix: 16, gw: ip('172.16.0.1'), mac: '02:00:00:00:03:0a', link: 'LAN3' }
    };
    if (fault === 'gateway') hosts['PC-A'].gw = ip('192.168.1.254');
    if (fault === 'mask') hosts['PC-A'].prefix = 16;
    var routers = {
      R1: { name: 'R1', ifaces: [
        { name: 'eth0', ip: ip('192.168.1.1'), prefix: 24, mac: '02:00:00:00:a1:00', link: 'LAN1' },
        { name: 'eth1', ip: ip('10.0.0.1'), prefix: 30, mac: '02:00:00:00:a1:01', link: 'WAN' }],
        table: [
          { dest: ip('192.168.1.0'), prefix: 24, nextHop: null, iface: 'eth0' },
          { dest: ip('10.0.0.0'), prefix: 30, nextHop: null, iface: 'eth1' },
          { dest: ip('192.168.2.0'), prefix: 24, nextHop: ip('10.0.0.2'), iface: 'eth1' },
          { dest: ip('172.16.0.0'), prefix: 16, nextHop: ip('10.0.0.2'), iface: 'eth1' },
          { dest: 0, prefix: 0, nextHop: ip('10.0.0.2'), iface: 'eth1' }] },
      R2: { name: 'R2', ifaces: [
        { name: 'eth0', ip: ip('10.0.0.2'), prefix: 30, mac: '02:00:00:00:a2:00', link: 'WAN' },
        { name: 'eth1', ip: ip('192.168.2.1'), prefix: 24, mac: '02:00:00:00:a2:01', link: 'LAN2' },
        { name: 'eth2', ip: ip('172.16.0.1'), prefix: 16, mac: '02:00:00:00:a2:02', link: 'LAN3' }],
        table: [
          { dest: ip('10.0.0.0'), prefix: 30, nextHop: null, iface: 'eth0' },
          { dest: ip('192.168.2.0'), prefix: 24, nextHop: null, iface: 'eth1' },
          { dest: ip('172.16.0.0'), prefix: 16, nextHop: null, iface: 'eth2' },
          { dest: ip('192.168.1.0'), prefix: 24, nextHop: ip('10.0.0.1'), iface: 'eth0' }] }
    };
    return { hosts: hosts, routers: routers };
  }

  /** Équipement (et interface) qui possède l'adresse addr sur le lien link. */
  function arp(topo, link, addr) {
    var h = Object.keys(topo.hosts).map(function (k) { return topo.hosts[k]; }).filter(function (x) { return x.link === link && x.ip === addr; })[0];
    if (h) return { device: h.name, mac: h.mac, kind: 'host' };
    var found = null;
    Object.keys(topo.routers).forEach(function (k) {
      topo.routers[k].ifaces.forEach(function (i) { if (i.link === link && i.ip === addr) found = { device: k, mac: i.mac, kind: 'router', iface: i.name }; });
    });
    return found;
  }

  /**
   * Simule l'acheminement d'un paquet de l'hôte src vers l'adresse dst.
   * Renvoie { hops: […], delivered, reason, ttlAtArrival }.
   * Chaque étape : { at, kind, text, decision, frame: { macSrc, macDst, ttl }, link, to, route }
   */
  function route(srcName, dst, ttl, fault) {
    var topo = topology(fault), src = topo.hosts[srcName], hops = [], guard = 0;
    var t = ttl;
    // 1) décision de l'hôte source
    var local = sameSubnet(src.ip, dst, src.prefix);
    var nh = local ? dst : src.gw;
    var target = arp(topo, src.link, nh);
    var decision = 'Masque /' + src.prefix + ' : ' + toString(dst) + (local ? ' est dans mon réseau ' : ' n’est pas dans mon réseau ') + toString(network(src.ip, src.prefix)) + '/' + src.prefix + (local ? ' → envoi direct.' : ' → envoi à la passerelle ' + toString(src.gw) + '.');
    if (!target) {
      hops.push({ at: src.name, kind: 'host', decision: decision, text: 'Requête ARP « qui a ' + toString(nh) + ' ? » sur ' + src.link + ' : aucune réponse.', link: src.link, to: null, frame: null });
      return { hops: hops, delivered: false, reason: 'arp', topo: topo, failedAt: src.name, missing: nh };
    }
    hops.push({ at: src.name, kind: 'host', decision: decision, text: 'ARP : ' + toString(nh) + ' correspond à ' + target.mac + ' (' + target.device + '). Trame envoyée sur ' + src.link + '.', link: src.link, to: target.device, frame: { macSrc: src.mac, macDst: target.mac, ipSrc: src.ip, ipDst: dst, ttl: t } });
    var cur = target, lastLink = src.link;
    while (guard++ < 12) {
      if (cur.kind === 'host') {
        var h = topo.hosts[cur.device];
        if (h.ip === dst) return { hops: hops.concat([{ at: h.name, kind: 'deliver', decision: 'L’adresse de destination ' + toString(dst) + ' est la mienne.', text: 'Paquet reçu et remis à l’application (TTL restant : ' + t + ').', link: null, to: null, frame: null }]), delivered: true, ttlAtArrival: t, topo: topo };
        return { hops: hops.concat([{ at: h.name, kind: 'drop', decision: 'Le paquet ne m’est pas destiné.', text: 'Paquet ignoré.', link: null, to: null, frame: null }]), delivered: false, reason: 'wronghost', topo: topo, failedAt: h.name };
      }
      var r = topo.routers[cur.device];
      if (r.ifaces.some(function (i) { return i.ip === dst; })) return { hops: hops.concat([{ at: r.name, kind: 'deliver', decision: 'L’adresse ' + toString(dst) + ' est l’une de mes interfaces.', text: 'Paquet reçu par le routeur lui-même.', link: null, to: null, frame: null }]), delivered: true, ttlAtArrival: t, topo: topo };
      t -= 1;
      if (t <= 0) return { hops: hops.concat([{ at: r.name, kind: 'drop', decision: 'TTL décrémenté : ' + (t + 1) + ' → ' + t + '.', text: 'TTL nul : paquet détruit. Le routeur renvoie un message ICMP « Time Exceeded » à la source.', link: null, to: null, frame: null }]), delivered: false, reason: 'ttl', topo: topo, failedAt: r.name };
      var m = longestPrefixMatch(r.table, dst);
      if (!m) return { hops: hops.concat([{ at: r.name, kind: 'drop', decision: 'Aucune ligne de la table de routage ne correspond à ' + toString(dst) + '.', text: 'Paquet détruit ; message ICMP « Destination inaccessible » renvoyé à la source.', link: null, to: null, frame: null, route: null }]), delivered: false, reason: 'noroute', topo: topo, failedAt: r.name };
      var out = r.ifaces.filter(function (i) { return i.name === m.iface; })[0];
      var hopIp = m.nextHop == null ? dst : m.nextHop;
      var nxt = arp(topo, out.link, hopIp);
      var dec = 'TTL ' + (t + 1) + ' → ' + t + '. Plus long préfixe correspondant : ' + toString(m.dest) + '/' + m.prefix + (m.nextHop == null ? ' (réseau directement connecté sur ' + out.name + ').' : ' via ' + toString(m.nextHop) + ' (' + out.name + ').');
      if (!nxt) return { hops: hops.concat([{ at: r.name, kind: 'drop', decision: dec, text: 'Requête ARP pour ' + toString(hopIp) + ' sur ' + out.link + ' : aucune réponse (équipement absent). Paquet perdu.', link: out.link, to: null, frame: null, route: m }]), delivered: false, reason: 'arp', topo: topo, failedAt: r.name, missing: hopIp };
      hops.push({ at: r.name, kind: 'router', decision: dec, text: 'Nouvelle trame sur ' + out.link + ' : adresses MAC ' + out.mac + ' → ' + nxt.mac + ' (' + nxt.device + '). Les adresses IP ne changent pas.', link: out.link, to: nxt.device, route: m, frame: { macSrc: out.mac, macDst: nxt.mac, ipSrc: src.ip, ipDst: dst, ttl: t } });
      cur = nxt; lastLink = out.link;
    }
    void lastLink;
    return { hops: hops, delivered: false, reason: 'loop', topo: topo };
  }

  /** Tailles d'en-têtes (octets) pour l'encapsulation. */
  var HEADERS = { ethernet: 14, fcs: 4, ip: 20, tcp: 20, udp: 8, icmp: 8 };

  return { parseIp: parseIp, parseMask: parseMask, prefixToMask: prefixToMask, maskToPrefix: maskToPrefix, toString: toString, toBinary: toBinary, octetToBinary: octetToBinary,
    network: network, broadcast: broadcast, hostCount: hostCount, addressCount: addressCount, firstHost: firstHost, lastHost: lastHost, sameSubnet: sameSubnet,
    prefixForHosts: prefixForHosts, classify: classify, subnets: subnets, longestPrefixMatch: longestPrefixMatch, topology: topology, route: route, HEADERS: HEADERS };
});
