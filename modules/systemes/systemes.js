/*
 * TELECOM CONNECT LAB 2.0 — Systèmes d'exploitation et fichiers.
 * Modèle : ordonnanceur sans coût de commutation, pagination simple.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, v = K.v, S = K.S;
  function stats(done, jobs) { var turn = 0, resp = 0; jobs.forEach(function (j) { turn += done[j.id].end; resp += done[j.id].start; }); return { turn: turn / jobs.length, resp: resp / jobs.length }; }
  /** Ordonnancement non préemptif : tous les travaux arrivent à t = 0. */
  function fifo(jobs) { var t = 0, g = [], done = {}; jobs.forEach(function (j) { done[j.id] = { start: t, end: t + j.d }; g.push({ id: j.id, a: t, b: t + j.d }); t += j.d; }); return { gantt: g, done: done, s: stats(done, jobs) }; }
  function sjf(jobs) { var r = fifo(jobs.slice().sort(function (a, b) { return a.d - b.d; })); return r; }
  function rr(jobs, q) {
    var rest = {}, done = {}, order = jobs.map(function (j) { rest[j.id] = j.d; return j.id; }), t = 0, g = [];
    while (order.length) {
      var id = order.shift(), use = Math.min(q, rest[id]);
      if (!done[id]) done[id] = { start: t };
      g.push({ id: id, a: t, b: t + use }); t += use; rest[id] -= use;
      if (rest[id] > 1e-9) order.push(id); else done[id].end = t;
    }
    return { gantt: g, done: done, s: stats(done, jobs) };
  }
  function pageFaults(refs, frames, algo) {
    var mem = [], faults = 0, hist = [];
    refs.forEach(function (p) {
      var i = mem.indexOf(p), hit = i >= 0;
      if (hit) { if (algo === 'lru') { mem.splice(i, 1); mem.push(p); } }
      else { faults++; if (mem.length >= frames) mem.shift(); mem.push(p); }
      hist.push({ p: p, hit: hit, mem: mem.slice() });
    });
    return { faults: faults, hist: hist };
  }
  var math = { fifo: fifo, sjf: sjf, rr: rr, pageFaults: pageFaults };

  var lesson = K.lesson({ id: 'systemes', title: 'Systèmes d’exploitation et fichiers',
    intro: 'Le système d’exploitation partage le matériel entre les programmes. Il décide qui s’exécute, gère la mémoire et organise les fichiers.',
    objectives: ['Décrire le rôle du système d’exploitation.', 'Comparer FIFO, SJF et Round Robin avec les mesures adaptées.', 'Expliquer la mémoire virtuelle et la pagination.', 'Décrire l’organisation d’un système de fichiers.'],
    prerequisites: 'Architecture d’un ordinateur.',
    sources: ['OSTEP, chapitres Scheduling, TLBs, File System Implementation.', 'Page « Scheduling (computing) ».'],
    figures: { os: { caption: 'Le système d’exploitation s’interpose entre les applications et le matériel.', svg: function () { return S.blocks({ w: 520, h: 150, label: 'Applications, noyau, matériel.', boxes: [{ id: 'a', x: 120, y: 15, w: 280, h: 34, t: 'Applications' }, { id: 'b', x: 120, y: 62, w: 280, h: 34, t: 'Noyau', sub: '' }, { id: 'c', x: 120, y: 108, w: 280, h: 34, t: 'Matériel' }], links: [{ a: 'a', b: 'b', both: true }, { a: 'b', b: 'c', both: true }] }); } },
      trt: { caption: 'Exemple OSTEP : trois tâches de 100, 10 et 10 s. FIFO donne 110 s de temps moyen de séjour, SJF 50 s.', options: function () { return { kind: 'xy', title: 'Temps moyen de séjour', desc: 'Comparaison de FIFO et SJF.', x: { min: 0, max: 3, ticks: [], label: '' }, y: { min: 0, max: 130, label: 'secondes' }, bars: [{ x: 1, y: 110 }, { x: 2, y: 50 }], barLabels: [{ x: 1, y: 110, label: 'FIFO 110' }, { x: 2, y: 50, label: 'SJF 50' }] }; } } },
    chapters: [
      { title: 'Rôle du système', summary: 'Noyau, processus, appels système.', html: [
        '<p class="lead">Sans système d’exploitation, chaque programme devrait gérer lui-même le disque, le réseau et la mémoire.</p>',
        '<div data-fig="os"></div>',
        K.defs([['Processus', 'Programme en cours d’exécution, avec sa mémoire et son état.'], ['Noyau', 'Cœur du système, qui s’exécute avec les privilèges maximaux.'], ['Appel système', 'Demande adressée au noyau par une application.']]),
        K.formula('T<sub>séjour</sub> = T<sub>fin</sub> − T<sub>arrivée</sub>, T<sub>réponse</sub> = T<sub>début</sub> − T<sub>arrivée</sub>', 'Mesures usuelles (OSTEP). Valables pour chaque tâche.'),
        K.example('deux mesures', '<p>Une tâche arrivée à t = 0, lancée à t = 3 s et terminée à t = 8 s a un temps de réponse de 3 s et un temps de séjour de 8 s.</p>')] },
      { title: 'Ordonnancement', summary: 'FIFO, SJF, Round Robin.', html: [
        '<p class="lead">L’ordre d’exécution influence fortement la performance perçue.</p>',
        '<div data-fig="trt"></div>',
        K.defs([['FIFO', 'Premier arrivé, premier servi.'], ['SJF', 'La tâche la plus courte d’abord : optimale pour le temps de séjour moyen, à arrivées simultanées.'], ['Round Robin', 'Chaque tâche reçoit tour à tour un quantum de temps.']]),
        K.formula('T̄ = (1/n) ∑ T<sub>séjour,i</sub>', 'Moyenne sur les n tâches.'),
        K.example('tâches 100, 10, 10', '<p>FIFO dans cet ordre : fins à 100, 110 et 120 s, moyenne ' + fN(fifo([{ id: 'A', d: 100 }, { id: 'B', d: 10 }, { id: 'C', d: 10 }]).s.turn) + ' s. SJF : fins à 10, 20, 120 s, moyenne ' + fN(sjf([{ id: 'A', d: 100 }, { id: 'B', d: 10 }, { id: 'C', d: 10 }]).s.turn) + ' s.</p>'),
        K.apply('<p>Round Robin améliore la réactivité, utile pour les usages interactifs, souvent au prix d’un temps de séjour plus long.</p>')] },
      { title: 'Mémoire et fichiers', summary: 'Pagination, TLB, inodes.', html: [
        '<p class="lead">Chaque processus croit disposer de toute la mémoire. Le système traduit ces adresses virtuelles en adresses physiques.</p>',
        K.defs([['Page', 'Bloc de mémoire de taille fixe, souvent 4 Kio.'], ['TLB', 'Cache matériel de traductions d’adresses.'], ['Défaut de page', 'Accès à une page absente de la mémoire physique.'], ['Inode', 'Structure qui décrit un fichier et localise ses blocs.']]),
        K.formula('page = ⌊adresse / taille⌋, décalage = adresse mod taille', 'Traduction en pagination simple.'),
        K.example('une adresse', '<p>Adresse 8200, pages de 4096 : page ' + Math.floor(8200 / 4096) + ', décalage ' + (8200 % 4096) + '.</p>'),
        K.pitfalls(['<strong>Confondre processus et programme.</strong>', '<strong>Choisir un quantum trop court</strong>, qui multiplie les commutations.', '<strong>Croire qu’un fichier supprimé est effacé physiquement.</strong> Souvent, seules les métadonnées changent.']),
        K.summary(['Le noyau partage le matériel.', 'SJF minimise le temps de séjour moyen à arrivées simultanées.', 'Round Robin améliore la réponse.', 'La pagination traduit les adresses virtuelles.']),
        K.toLab('systemes', 'Comparez les algorithmes d’ordonnancement et de remplacement de pages.')] }
    ] });

  var REFS = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
  var D = { da: 100, db: 10, dc: 10, algo: 'fifo', q: 10, frames: 3, pg: 'fifo' };
  function M(s) { var j = [{ id: 'A', d: s.da }, { id: 'B', d: s.db }, { id: 'C', d: s.dc }]; var r = s.algo === 'fifo' ? fifo(j) : s.algo === 'sjf' ? sjf(j) : rr(j, s.q); return { r: r, pf: pageFaults(REFS, s.frames, s.pg), total: s.da + s.db + s.dc }; }
  var lab = { id: 'systemes', title: 'Ordonnanceur et mémoire', short: 'Systèmes d’exploitation', icon: 'device', badge: 'Pas de coût de commutation, tâches à arrivée simultanée',
    text: 'Comparez les algorithmes d’ordonnancement sur trois tâches, puis observez les défauts de page.',
    summary: 'Comparez FIFO, SJF et Round Robin sur trois tâches, puis deux algorithmes de remplacement de pages.',
    params: [{ group: 'Tâches' }, { k: 'da', label: 'Tâche A', min: 1, max: 200, step: 1, unit: 's', dec: 0 }, { k: 'db', label: 'Tâche B', min: 1, max: 200, step: 1, unit: 's', dec: 0 }, { k: 'dc', label: 'Tâche C', min: 1, max: 200, step: 1, unit: 's', dec: 0 }, { k: 'algo', label: 'Algorithme', opts: [['fifo', 'FIFO'], ['sjf', 'SJF'], ['rr', 'Round Robin']] }, { k: 'q', label: 'Quantum', min: 1, max: 50, step: 1, unit: 's', dec: 0, when: function (s) { return s.algo === 'rr'; } }, { group: 'Mémoire' }, { k: 'frames', label: 'Cadres de page', min: 1, max: 6, step: 1, unit: '', dec: 0 }, { k: 'pg', label: 'Remplacement', opts: [['fifo', 'FIFO'], ['lru', 'LRU']] }],
    defaults: D, model: M,
    expr: function (s, m) { return 'Séjour moyen ' + fN(m.r.s.turn) + ' s ; réponse moyenne ' + fN(m.r.s.resp) + ' s'; },
    widget: function (s, m) { return '<h3>Diagramme de Gantt</h3><p>' + m.r.gantt.slice(0, 40).map(function (g) { return '<strong>' + g.id + '</strong> ' + g.a + '→' + g.b; }).join(' · ') + (m.r.gantt.length > 40 ? ' …' : '') + '</p><h3>Accès aux pages</h3><div class="sim-cells">' + m.pf.hist.map(function (h) { return '<div class="sim-cell' + (h.hit ? '' : ' is-on') + '"><small>page</small>' + h.p + '<small>' + (h.hit ? 'présente' : 'défaut') + '</small></div>'; }).join('') + '</div>'; },
    readouts: [['Temps moyen de séjour', function (s, m) { return fN(m.r.s.turn) + ' s'; }], ['Temps moyen de réponse', function (s, m) { return fN(m.r.s.resp) + ' s'; }], ['Durée totale', function (s, m) { return fN(m.total) + ' s'; }], ['Défauts de page', function (s, m) { return String(m.pf.faults); }]],
    explain: function (s, m) { return '<p>Avec cet algorithme, les tâches séjournent en moyenne ' + fN(m.r.s.turn) + ' s et répondent après ' + fN(m.r.s.resp) + ' s. Avec ' + s.frames + ' cadre(s), la suite de références provoque ' + m.pf.faults + ' défauts de page.</p>'; },
    missions: [
      { id: 'm1', title: 'Minimiser le séjour', text: 'Avec les durées 100, 10 et 10 s, obtenez un temps de séjour moyen de 50 s.', solution: { algo: 'sjf', da: 100, db: 10, dc: 10 }, check: function (s, m) { if (s.da !== 100 || s.db !== 10 || s.dc !== 10) return { ok: false, msg: 'Gardez les durées 100, 10 et 10.' }; return Math.abs(m.r.s.turn - 50) < 0.01 ? { ok: true, msg: 'Réussi : SJF place les tâches courtes en premier.' } : { ok: false, msg: 'Séjour moyen : ' + fN(m.r.s.turn) + ' s.' }; } },
      { id: 'm2', title: 'Améliorer la réactivité', text: 'Choisissez Round Robin avec un quantum qui donne moins de 15 s de temps de réponse moyen, sur 100, 10, 10.', solution: { algo: 'rr', q: 10, da: 100, db: 10, dc: 10 }, check: function (s, m) { if (s.algo !== 'rr') return { ok: false, msg: 'Choisissez Round Robin.' }; return m.r.s.resp < 15 ? { ok: true, msg: 'Réussi : réponse moyenne de ' + fN(m.r.s.resp) + ' s.' } : { ok: false, msg: 'Réponse moyenne : ' + fN(m.r.s.resp) + ' s. Réduisez le quantum.' }; } },
      { id: 'm3', title: 'Plus de mémoire, plus de défauts ?', text: 'Avec FIFO, trouvez un réglage de 4 cadres qui donne plus de défauts que 3 (anomalie de Belady).', solution: { pg: 'fifo', frames: 4 }, check: function (s, m) { if (s.pg !== 'fifo' || s.frames !== 4) return { ok: false, msg: 'Sélectionnez FIFO et 4 cadres.' }; var b = pageFaults(REFS, 3, 'fifo').faults; return m.pf.faults > b ? { ok: true, msg: 'Réussi : ' + m.pf.faults + ' défauts avec 4 cadres, ' + b + ' avec 3. C’est l’anomalie de Belady.' } : { ok: false, msg: 'Défauts : ' + m.pf.faults + '.' }; } }],
    limits: '<p>Les tâches arrivent simultanément, sans entrées-sorties ni coût de commutation. Les systèmes réels utilisent des ordonnanceurs bien plus élaborés. La pagination ne représente ni la TLB ni la mémoire d’échange.</p>' };

  var list = [
    K.num('e1', 'Temps de séjour', 'Mesures', '<p>Une tâche arrive à t = 2 s et finit à t = 9 s. Calculez son temps de séjour, en s.</p>', 7, 's', { abs: 0.1 }, '<p>9 − 2 = 7 s.</p>'),
    K.num('e2', 'FIFO', 'Ordonnancement', '<p>Tâches de 30, 10 et 20 s en FIFO, à t = 0. Calculez le temps de séjour moyen, en s.</p>', fifo([{ id: 'A', d: 30 }, { id: 'B', d: 10 }, { id: 'C', d: 20 }]).s.turn, 's', { rel: 0.02 }, '<p>Fins à 30, 40 et 60 s : moyenne 43,3 s.</p>'),
    K.num('e3', 'SJF', 'Ordonnancement', '<p>Mêmes tâches en SJF. Calculez le temps de séjour moyen, en s.</p>', sjf([{ id: 'A', d: 30 }, { id: 'B', d: 10 }, { id: 'C', d: 20 }]).s.turn, 's', { rel: 0.02 }, '<p>Fins à 10, 30 et 60 s : moyenne 33,3 s.</p>'),
    K.num('e4', 'Traduction d’adresse', 'Mémoire', '<p>Pages de 4 096 octets, adresse 10 000. Calculez le numéro de page.</p>', 2, '', { abs: 0.1 }, '<p>⌊10 000/4 096⌋ = 2.</p>'),
    K.num('e5', 'Décalage', 'Mémoire', '<p>Même adresse : calculez le décalage dans la page.</p>', 10000 % 4096, 'octets', { abs: 0.5 }, '<p>10 000 mod 4 096 = ' + (10000 % 4096) + '.</p>'),
    K.pick('e6', 'Rôle de la TLB', 'Mémoire', '<p>La TLB est :</p>', 'un cache matériel des traductions d’adresses', ['une liste de fichiers', 'un disque rapide', 'un type de processus'], '<p>Elle évite de consulter la table des pages à chaque accès.</p>'),
    K.pick('e7', 'Inode', 'Fichiers', '<p>Un inode stocke notamment :</p>', 'les métadonnées et l’emplacement des blocs d’un fichier', ['le nom du processeur', 'la couleur des fenêtres', 'le mot de passe de l’utilisateur'], '<p>Le nom du fichier est stocké dans le répertoire, qui pointe vers l’inode.</p>'),
    K.pick('e8', 'Quantum', 'Ordonnancement', '<p>Un quantum très long fait se comporter Round Robin comme :</p>', 'FIFO', ['SJF', 'un défaut de page', 'une TLB'], '<p>Si chaque tâche se termine dans son quantum, on retrouve l’ordre d’arrivée.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('systemes', list) };
});
