/*
 * TELECOM CONNECT LAB 2.0 — Laboratoire complémentaire : organisation des fichiers.
 * Modèle : disque de 32 blocs, allocation contiguë (premier emplacement) ou indexée (inode).
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.registerLab(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN;
  var N = 32, SLOTS = 8;
  function blank() { var d = [], f = []; for (var i = 0; i < N; i++) d.push(0); for (i = 0; i < SLOTS; i++) f.push(null); return { disk: d, files: f, fail: 0, msg: '', made: 0 }; }
  function freeCount(d) { return d.filter(function (x) { return x === 0; }).length; }
  function largest(d) { var best = 0, run = 0; d.forEach(function (x) { run = x === 0 ? run + 1 : 0; best = Math.max(best, run); }); return best; }
  function contiguous(b) { return b.every(function (x, i) { return i === 0 || x === b[i - 1] + 1; }); }
  function create(s, algo, size) {
    var slot = s.files.indexOf(null);
    if (slot < 0) { s.msg = 'Répertoire plein : huit fichiers au maximum.'; return false; }
    var need = algo === 'idx' ? size + 1 : size, blocks = [], i;
    if (algo === 'cont') {
      for (i = 0; i + size <= N && !blocks.length; i++) { var free = true; for (var j = i; j < i + size; j++) if (s.disk[j]) free = false; if (free) for (j = i; j < i + size; j++) blocks.push(j); }
    } else if (freeCount(s.disk) >= need) { for (i = 0; i < N && blocks.length < need; i++) if (!s.disk[i]) blocks.push(i); }
    if (!blocks.length) { if (freeCount(s.disk) >= need) s.fail++; s.msg = 'Création impossible : ' + (freeCount(s.disk) >= need ? 'espace libre suffisant, mais trop fragmenté.' : 'espace insuffisant.'); return false; }
    s.made++;
    blocks.forEach(function (b) { s.disk[b] = slot + 1; });
    s.files[slot] = { name: 'F' + s.made, size: size, blocks: blocks, idx: algo === 'idx' ? blocks[0] : -1 };
    s.msg = s.files[slot].name + ' créé.';
    return true;
  }
  function remove(s, slot) { var f = s.files[slot]; if (!f) return; f.blocks.forEach(function (b) { s.disk[b] = 0; }); s.files[slot] = null; s.msg = f.name + ' supprimé.'; }
  var math = { blank: blank, freeCount: freeCount, largest: largest, contiguous: contiguous, create: create, remove: remove };

  var D = Object.assign({ algo: 'cont', sz: 6 }, blank());
  function M(s) { var fr = freeCount(s.disk), l = largest(s.disk), list = s.files.filter(Boolean); return { fr: fr, l: l, frag: fr ? (1 - l / fr) * 100 : 0, list: list, split: list.some(function (f) { return !contiguous(f.idx >= 0 ? f.blocks.slice(1) : f.blocks); }) }; }
  function reset(s) { Object.assign(s, blank()); }
  var lab = { id: 'fichiers', title: 'Organisation des fichiers sur un disque', short: 'Organisation des fichiers', icon: 'device', badge: 'Disque de 32 blocs, sans cache ni journal',
    text: 'Créez et supprimez des fichiers, puis comparez l’allocation contiguë et l’allocation indexée face à la fragmentation.',
    summary: 'Créez et supprimez des fichiers sur un disque simulé et comparez allocation contiguë et indexée.',
    params: [{ group: 'Système de fichiers' }, { k: 'algo', label: 'Allocation', opts: [['cont', 'Contiguë'], ['idx', 'Indexée (inode)']], onChange: reset }, { k: 'sz', label: 'Taille du fichier', min: 1, max: 16, step: 1, unit: 'blocs', dec: 0 }],
    defaults: D, model: M,
    actions: { create: function (s) { create(s, s.algo, s.sz); }, del: function (s, i) { remove(s, +i); }, clear: reset },
    widget: function (s, m) {
      var cells = s.disk.map(function (x, i) { var f = x ? s.files[x - 1] : null; return '<div class="sim-cell' + (f ? ' is-on' : '') + '"><small>' + i + '</small>' + (f ? f.name + (f.idx === i ? ' i' : '') : '·') + '</div>'; }).join('');
      var rows = s.files.map(function (f, i) { return f ? '<button type="button" class="sim-btn" data-act="del" data-arg="' + i + '">Supprimer ' + f.name + ' (' + f.size + ')</button>' : ''; }).join('');
      return '<div class="sim-row"><button type="button" class="btn btn--primary btn--sm" data-act="create">Créer un fichier</button><button type="button" class="btn btn--ghost btn--sm" data-act="clear">Formater</button></div>' + (s.msg ? '<p>' + s.msg + '</p>' : '') + '<div class="sim-cells">' + cells + '</div><div class="sim-row">' + rows + '</div><p class="muted">« i » désigne le bloc d’index (inode) du fichier.</p>';
    },
    expr: function (s, m) { return m.fr + ' blocs libres ; plus grand espace continu : ' + m.l; },
    readouts: [['Blocs libres', function (s, m) { return String(m.fr); }], ['Plus grand espace', function (s, m) { return String(m.l); }], ['Fragmentation externe', function (s, m) { return fN(m.frag) + ' %'; }], ['Fichiers', function (s, m) { return String(m.list.length); }]],
    explain: function (s, m) { return s.algo === 'cont' ? '<p>L’allocation contiguë exige un espace continu : lecture séquentielle simple, mais fragmentation externe (' + fN(m.frag) + ' %).</p>' : '<p>L’allocation indexée utilise n’importe quels blocs libres : un bloc d’index, comme un inode, les recense au prix d’un bloc supplémentaire par fichier.</p>'; },
    missions: [
      { id: 'm1', title: 'Peupler le disque', text: 'Créez au moins trois fichiers.', solution: function (s, a) { a.create(s); a.create(s); a.create(s); }, check: function (s, m) { return m.list.length >= 3 ? { ok: true, msg: 'Réussi : ' + m.list.length + ' fichiers enregistrés.' } : { ok: false, msg: m.list.length + ' fichier(s) pour l’instant.' }; } },
      { id: 'm2', title: 'Être bloqué par la fragmentation', text: 'En contiguë, créez une situation où un fichier est refusé alors qu’il reste assez de blocs libres.', solution: function (s, a) { s.algo = 'cont'; s.sz = 10; a.create(s); a.create(s); a.create(s); a.del(s, '1'); s.sz = 12; a.create(s); }, check: function (s) { if (s.algo !== 'cont') return { ok: false, msg: 'Choisissez l’allocation contiguë.' }; return s.fail > 0 ? { ok: true, msg: 'Réussi : l’espace libre existe, mais il n’est pas continu.' } : { ok: false, msg: 'Créez plusieurs fichiers, supprimez celui du milieu, puis demandez un fichier plus grand que l’espace libéré.' }; } },
      { id: 'm3', title: 'Répartir un fichier', text: 'En indexée, obtenez un fichier réparti sur des blocs non contigus.', solution: function (s, a) { s.algo = 'idx'; s.sz = 9; a.create(s); a.create(s); a.create(s); a.del(s, '1'); s.sz = 11; a.create(s); }, check: function (s, m) { if (s.algo !== 'idx') return { ok: false, msg: 'Choisissez l’allocation indexée.' }; return m.split ? { ok: true, msg: 'Réussi : l’inode retrouve des blocs dispersés.' } : { ok: false, msg: 'Libérez un espace au milieu, puis créez un fichier plus grand que cet espace.' }; } }],
    limits: '<p>Le disque est réduit à 32 blocs. Un seul niveau d’index et un répertoire de huit entrées : pas de journalisation, de cache, de permissions ni d’arborescence. Un système réel utilise des index à plusieurs niveaux.</p>' };
  return { math: math, lab: lab };
});
