/*
 * TELECOM CONNECT LAB 2.0 — Laboratoire complémentaire : routage dynamique.
 * Modèle : vecteur de distance synchrone (Bellman-Ford distribué), infini = 16,
 * comparé aux plus courts chemins (Floyd-Warshall). Connaissance de cours générale.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.registerLab(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var S = K.S, NAMES = ['A', 'B', 'C', 'D', 'E'], N = 5, INF = 16;
  var LINKS = [[0, 1, 1], [1, 2, 1], [2, 3, 2], [0, 3, 5], [3, 4, 1], [1, 4, 4]];
  var POS = [[80, 110], [230, 35], [400, 60], [340, 185], [170, 190]];
  function cost(s, i) { return i === 3 ? s.cAD : LINKS[i][2]; }
  function neighbours(s) { var out = [[], [], [], [], []]; LINKS.forEach(function (l, i) { if (s.up[i]) { var c = cost(s, i); out[l[0]].push([l[1], c]); out[l[1]].push([l[0], c]); } }); return out; }
  function initTables() { var d = [], n = []; for (var i = 0; i < N; i++) { d.push([]); n.push([]); for (var j = 0; j < N; j++) { d[i].push(i === j ? 0 : INF); n[i].push(i === j ? i : -1); } } return { dist: d, next: n }; }
  /** Un échange synchrone. Renvoie vrai si une table a changé. */
  function round(s) {
    var nb = neighbours(s), old = s.dist, oldN = s.next, nd = [], nn = [], changed = false;
    for (var i = 0; i < N; i++) {
      nd.push([]); nn.push([]);
      for (var d = 0; d < N; d++) {
        if (i === d) { nd[i].push(0); nn[i].push(i); continue; }
        var best = INF, via = -1;
        nb[i].forEach(function (x) { if (s.sh && oldN[x[0]][d] === i) return; var c = Math.min(INF, x[1] + old[x[0]][d]); if (c < best || (c === best && via < 0 && c < INF)) { best = c; via = x[0]; } });
        nd[i].push(best); nn[i].push(via);
        if (best !== old[i][d] || via !== oldN[i][d]) changed = true;
      }
    }
    s.dist = nd; s.next = nn;
    return changed;
  }
  function shortest(s) { var d = initTables().dist, i, j, k; LINKS.forEach(function (l, x) { if (s.up[x]) { var c = cost(s, x); d[l[0]][l[1]] = Math.min(d[l[0]][l[1]], c); d[l[1]][l[0]] = d[l[0]][l[1]]; } }); for (k = 0; k < N; k++) for (i = 0; i < N; i++) for (j = 0; j < N; j++) d[i][j] = Math.min(INF, Math.min(d[i][j], d[i][k] + d[k][j])); return d; }
  function path(s, a, b) { var p = [a], cur = a, seen = {}; seen[a] = 1; while (cur !== b) { var nx = s.next[cur][b]; if (nx < 0) return { ok: false, nodes: p, why: 'injoignable' }; if (seen[nx]) { p.push(nx); return { ok: false, nodes: p, why: 'boucle' }; } p.push(nx); seen[nx] = 1; cur = nx; } return { ok: true, nodes: p }; }
  function agreed(s) { var r = shortest(s); return s.dist.every(function (row, i) { return row.every(function (x, j) { return x === r[i][j]; }); }); }
  var math = { LINKS: LINKS, INF: INF, initTables: initTables, round: round, shortest: shortest, path: path, agreed: agreed };

  var t0 = initTables();
  var D = { cAD: 5, src: 0, dst: 2, sh: 0, up: [1, 1, 1, 1, 1, 1], dist: t0.dist, next: t0.next, rounds: 0, since: 0 };
  function M(s) { var r = shortest(s), p = path(s, s.src, s.dst); return { ref: r, p: p, conv: agreed(s), cur: s.dist[s.src][s.dst], opt: r[s.src][s.dst] }; }
  function step(s) { var c = round(s); if (c) { s.rounds++; s.since++; } return c; }
  function f(x) { return x >= INF ? '∞' : String(x); }
  var lab = { id: 'routage', title: 'Routage dynamique à vecteur de distance', short: 'Routage dynamique', icon: 'network', badge: 'Vecteur de distance synchrone, 5 routeurs',
    text: 'Faites échanger leurs tables aux routeurs, coupez des liens et observez la convergence, le reroutage et le comptage à l’infini.',
    summary: 'Faites converger un réseau de cinq routeurs, coupez des liens et observez le reroutage et le comptage à l’infini.',
    params: [{ group: 'Réseau' }, { k: 'cAD', label: 'Coût du lien A–D', min: 1, max: 10, step: 1, unit: '', dec: 0 }, { k: 'sh', label: 'Horizon partagé', opts: [[0, 'Non'], [1, 'Oui']] }, { group: 'Trajet observé' }, { k: 'src', label: 'Source', opts: NAMES.map(function (n, i) { return [i, n]; }) }, { k: 'dst', label: 'Destination', opts: NAMES.map(function (n, i) { return [i, n]; }) }],
    defaults: D, model: M,
    actions: { round: function (s) { step(s); }, conv: function (s) { for (var i = 0; i < 40 && step(s); i++); }, toggle: function (s, i) { s.up[+i] = s.up[+i] ? 0 : 1; s.since = 0; }, reset: function (s) { var t = initTables(); s.dist = t.dist; s.next = t.next; s.rounds = 0; s.since = 0; s.up = [1, 1, 1, 1, 1, 1]; } },
    schema: function (s) { var o = ''; LINKS.forEach(function (l, i) { var a = POS[l[0]], b = POS[l[1]]; o += '<path class="sk__l' + (s.up[i] ? '' : ' sk__l--off sk__l--d') + '" d="M' + a[0] + ' ' + a[1] + 'L' + b[0] + ' ' + b[1] + '"/>' + S.text((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 5, s.up[i] ? String(cost(s, i)) : 'coupé', { cls: 'sk__c' }); }); POS.forEach(function (p, i) { o += '<circle class="sk__p" cx="' + p[0] + '" cy="' + p[1] + '" r="17"/>' + S.text(p[0], p[1] + 5, NAMES[i]); }); return S.svg(480, 225, 'Réseau de cinq routeurs et leurs liens.', o, true); },
    widget: function (s, m) {
      var head = ['Routeur'].concat(NAMES.map(function (n) { return 'vers ' + n; })), rows = s.dist.map(function (r, i) { return [NAMES[i]].concat(r.map(function (x, j) { return f(x) + (s.next[i][j] >= 0 && i !== j ? ' (' + NAMES[s.next[i][j]] + ')' : ''); })); });
      return '<div class="sim-row"><button type="button" class="btn btn--primary btn--sm" data-act="round">Échange de tables</button><button type="button" class="btn btn--ghost btn--sm" data-act="conv">Jusqu’à stabilité</button><button type="button" class="btn btn--ghost btn--sm" data-act="reset">Réinitialiser</button></div><div class="sim-row">' + LINKS.map(function (l, i) { return '<button type="button" class="sim-btn' + (s.up[i] ? ' is-on' : '') + '" data-act="toggle" data-arg="' + i + '" aria-pressed="' + (s.up[i] ? 'true' : 'false') + '">' + NAMES[l[0]] + '–' + NAMES[l[1]] + '</button>'; }).join('') + '</div>' + K.table(head, rows, 'Coût et prochain saut');
    },
    expr: function (s, m) { return NAMES[s.src] + ' → ' + NAMES[s.dst] + ' : ' + m.p.nodes.map(function (i) { return NAMES[i]; }).join(' → ') + (m.p.ok ? '' : ' (' + m.p.why + ')'); },
    verdict: function (s, m) { return m.conv ? { ok: true, text: 'Tables optimales' } : { ok: false, text: 'Tables non convergées' }; },
    readouts: [['Échanges effectués', function (s) { return String(s.rounds); }], ['Coût annoncé', function (s, m) { return f(m.cur); }], ['Coût optimal', function (s, m) { return f(m.opt); }], ['Depuis le dernier changement', function (s) { return String(s.since); }]],
    explain: function (s, m) { return '<p>À chaque échange, un routeur recalcule ses routes à partir des tables de ses voisins. ' + (m.conv ? 'Les coûts annoncés sont égaux aux plus courts chemins.' : 'Les coûts annoncés diffèrent encore des plus courts chemins.') + (s.sh ? ' L’horizon partagé empêche un routeur d’annoncer une route au voisin par lequel elle passe.' : '') + '</p>'; },
    missions: [
      { id: 'm1', title: 'Faire converger le réseau', text: 'Échangez les tables jusqu’à obtenir des routes optimales partout.', solution: function (s, a) { a.conv(s); }, check: function (s, m) { return m.conv && s.rounds > 0 ? { ok: true, msg: 'Réussi en ' + s.rounds + ' échange(s).' } : { ok: false, msg: 'Lancez les échanges jusqu’à stabilité.' }; } },
      { id: 'm2', title: 'Rerouter après une panne', text: 'Convergez, coupez le lien B–C, puis laissez le réseau trouver une route de A vers C.', solution: function (s, a) { s.src = 0; s.dst = 2; a.conv(s); a.toggle(s, '1'); a.conv(s); }, check: function (s, m) { if (s.up[1]) return { ok: false, msg: 'Coupez le lien B–C.' }; if (s.src !== 0 || s.dst !== 2) return { ok: false, msg: 'Observez le trajet A vers C.' }; return m.conv && m.p.ok ? { ok: true, msg: 'Réussi : nouveau coût ' + f(m.cur) + '.' } : { ok: false, msg: 'Le réseau n’a pas encore convergé.' }; } },
      { id: 'm3', title: 'Comptage à l’infini', text: 'Sans horizon partagé, isolez le routeur E après convergence et observez la montée lente des coûts.', solution: function (s, a) { s.sh = 0; a.conv(s); a.toggle(s, '4'); a.toggle(s, '5'); a.conv(s); }, check: function (s) { if (s.sh) return { ok: false, msg: 'Désactivez l’horizon partagé.' }; if (s.up[4] || s.up[5]) return { ok: false, msg: 'Coupez les liens D–E et B–E.' }; return s.since >= 4 && s.dist[0][4] >= INF ? { ok: true, msg: 'Réussi : ' + s.since + ' échanges pour constater la perte de E.' } : { ok: false, msg: 'Lancez les échanges jusqu’à stabilité.' }; } }],
    limits: '<p>Les échanges sont synchrones et sans perte. Le modèle reprend le principe des protocoles à vecteur de distance, sans en reproduire un en particulier : pas de minuteries ni d’empoisonnement de route. Les protocoles à état de lien, comme OSPF, ne sont pas simulés.</p>' };
  return { math: math, lab: lab };
});
