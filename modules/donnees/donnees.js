/*
 * TELECOM CONNECT LAB 2.0 — Bases de données.
 * Modèle : petit moteur relationnel en mémoire (sélection, jointure, agrégat, transaction).
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, v = K.v, S = K.S;
  var ETU = [{ id: 1, nom: 'Amina', filiere: 'Telecom' }, { id: 2, nom: 'Junior', filiere: 'Telecom' }, { id: 3, nom: 'Grace', filiere: 'Reseaux' }, { id: 4, nom: 'Patrick', filiere: 'Reseaux' }, { id: 5, nom: 'Sarah', filiere: 'IoT' }];
  var NOTES = [{ etu: 1, module: 'Fibre', note: 16 }, { etu: 1, module: 'IP', note: 12 }, { etu: 2, module: 'Fibre', note: 9 }, { etu: 3, module: 'IP', note: 14 }, { etu: 3, module: 'Fibre', note: 11 }, { etu: 4, module: 'IP', note: 8 }, { etu: 5, module: 'IP', note: 17 }];
  function join() { var out = []; NOTES.forEach(function (n) { var e = ETU.filter(function (x) { return x.id === n.etu; })[0]; out.push({ nom: e.nom, filiere: e.filiere, module: n.module, note: n.note }); }); return out; }
  function query(q) {
    var rows = q.join ? join() : ETU.map(function (e) { return { id: e.id, nom: e.nom, filiere: e.filiere }; });
    if (q.filiere !== 'toutes') rows = rows.filter(function (r) { return r.filiere === q.filiere; });
    if (q.join && q.min > 0) rows = rows.filter(function (r) { return r.note >= q.min; });
    if (q.join && q.agg === 'moy') { var g = {}; rows.forEach(function (r) { (g[r.filiere] = g[r.filiere] || []).push(r.note); }); return Object.keys(g).map(function (f) { return { filiere: f, moyenne: Math.round(g[f].reduce(function (a, b) { return a + b; }, 0) / g[f].length * 100) / 100, nb: g[f].length }; }); }
    return rows;
  }
  function sql(q) {
    var w = []; if (q.filiere !== 'toutes') w.push("filiere = '" + q.filiere + "'"); if (q.join && q.min > 0) w.push('note >= ' + q.min);
    var where = w.length ? ' WHERE ' + w.join(' AND ') : '';
    if (!q.join) return 'SELECT id, nom, filiere FROM etudiants' + where + ';';
    if (q.agg === 'moy') return 'SELECT filiere, AVG(note), COUNT(*) FROM etudiants JOIN notes ON etudiants.id = notes.etu' + where + ' GROUP BY filiere;';
    return 'SELECT nom, filiere, module, note FROM etudiants JOIN notes ON etudiants.id = notes.etu' + where + ';';
  }
  /** Virement : avec transaction, tout est annulé si une panne survient en cours. */
  function transfer(s) { var A = 100, B = 50, amt = s.amt; if (s.tx) { if (s.crash) return { A: A, B: B }; return { A: A - amt, B: B + amt }; } A -= amt; if (!s.crash) B += amt; return { A: A, B: B }; }
  var math = { ETU: ETU, NOTES: NOTES, join: join, query: query, sql: sql, transfer: transfer };

  var lesson = K.lesson({ id: 'donnees', title: 'Bases de données',
    intro: 'Une base de données organise l’information pour qu’elle reste cohérente et facile à interroger, même quand plusieurs utilisateurs y accèdent.',
    objectives: ['Décrire une table, une clé primaire et une clé étrangère.', 'Écrire la logique d’une requête de sélection et de jointure.', 'Expliquer l’intérêt de la normalisation.', 'Énoncer les propriétés ACID d’une transaction.'],
    prerequisites: 'Architecture d’un ordinateur.',
    sources: ['Pages « Relational model », « Database normalization », « ACID ».'],
    figures: { er: { caption: 'Deux tables reliées par une clé : chaque note référence un étudiant.', svg: function () { return S.blocks({ w: 520, h: 130, label: 'Table étudiants et table notes liées.', boxes: [{ id: 'a', x: 20, y: 35, w: 150, h: 60, t: 'etudiants', sub: 'id, nom, filiere' }, { id: 'b', x: 350, y: 35, w: 150, h: 60, t: 'notes', sub: 'etu, module, note' }], links: [{ a: 'b', b: 'a', t: 'notes.etu → etudiants.id' }] }); } } },
    chapters: [
      { title: 'Le modèle relationnel', summary: 'Tables, clés, relations.', html: [
        '<p class="lead">Le modèle relationnel range les données en tables, reliées entre elles par des valeurs communes.</p>',
        '<div data-fig="er"></div>',
        K.defs([['Relation (table)', 'Ensemble de lignes de même structure.'], ['Clé primaire', 'Colonne, ou groupe, qui identifie chaque ligne de façon unique.'], ['Clé étrangère', 'Valeur qui fait référence à la clé d’une autre table.'], ['Normalisation', 'Structuration réduisant la redondance.']]),
        K.formula('Lignes de la jointure ≤ |A| × |B|', 'Une jointure sans condition produit toutes les combinaisons.'),
        K.example('éviter la redondance', '<p>Si le nom de la filière est recopié sur chaque note, une correction oblige à modifier toutes les lignes. On le place dans une table d’étudiants référencée par une clé.</p>')] },
      { title: 'Interroger les données', summary: 'Sélection, jointure, agrégat.', html: [
        '<p class="lead">Une requête décrit le résultat voulu, le moteur choisit comment l’obtenir.</p>',
        K.formula('SELECT colonnes FROM table WHERE condition', 'Forme minimale d’une requête de lecture en SQL.'),
        K.defs([['WHERE', 'Filtre les lignes.'], ['JOIN', 'Associe les lignes de deux tables.'], ['GROUP BY', 'Regroupe des lignes pour calculer une moyenne, un total.']]),
        K.example('moyenne par filière', '<p>' + S.esc(sql({ join: true, filiere: 'toutes', min: 0, agg: 'moy' })) + ' donne : ' + query({ join: true, filiere: 'toutes', min: 0, agg: 'moy' }).map(function (r) { return r.filiere + ' ' + fN(r.moyenne); }).join(', ') + '.</p>'),
        K.apply('<p>Un index accélère les recherches sur une colonne, au prix de l’espace disque et d’écritures un peu plus lentes.</p>')] },
      { title: 'Transactions', summary: 'ACID, panne, cohérence.', html: [
        '<p class="lead">Une transaction regroupe plusieurs opérations en une seule unité logique.</p>',
        K.defs([['Atomicité', 'Tout réussit ou tout est annulé.'], ['Cohérence', 'La transaction amène la base d’un état valide à un autre.'], ['Isolation', 'Les transactions concurrentes se comportent comme si elles étaient séquentielles.'], ['Durabilité', 'Une fois validée, une transaction survit à une panne.']]),
        K.formula('Solde total avant = solde total après', 'Invariant d’un virement correct.'),
        K.example('un virement', '<p>Débiter A puis créditer B : si une panne survient entre les deux, sans transaction, de l’argent disparaît. Avec une transaction, la base revient à l’état initial.</p>'),
        K.pitfalls(['<strong>Oublier la clause WHERE</strong> d’un UPDATE, qui modifie toute la table.', '<strong>Confondre clé primaire et index.</strong>', '<strong>Dupliquer une information</strong> au lieu de la référencer.']),
        K.summary(['Tables reliées par des clés.', 'SELECT, WHERE, JOIN, GROUP BY.', 'La normalisation réduit la redondance.', 'ACID : atomicité, cohérence, isolation, durabilité.']),
        K.toLab('donnees', 'Construisez des requêtes et testez une transaction.')] }
    ] });

  var D = { join: 0, filiere: 'toutes', min: 0, agg: 'non', amt: 30, tx: 1, crash: 0 };
  function Q(s) { return { join: !!s.join, filiere: s.filiere, min: s.min, agg: s.agg === 'moy' ? 'moy' : null }; }
  function M(s) { var q = Q(s), r = query(q), t = transfer(s); return { rows: r, sql: sql(q), t: t, total: t.A + t.B }; }
  var lab = { id: 'donnees', title: 'Requêtes et transactions', short: 'Bases de données', icon: 'chart', badge: 'Moteur en mémoire, données fictives',
    text: 'Construisez une requête avec les commandes, lisez le SQL correspondant, puis testez une transaction en cas de panne.',
    summary: 'Composez des requêtes avec filtres, jointures et agrégats, puis testez une transaction avec une panne.',
    params: [{ group: 'Requête' }, { k: 'join', label: 'Jointure avec les notes', opts: [[0, 'Non'], [1, 'Oui']] }, { k: 'filiere', label: 'Filtre sur la filière', select: true, opts: [['toutes', 'Toutes'], ['Telecom', 'Telecom'], ['Reseaux', 'Reseaux'], ['IoT', 'IoT']], hint: '' }, { k: 'min', label: 'Note minimale', min: 0, max: 20, step: 1, unit: '', dec: 0, when: function (s) { return !!s.join; } }, { k: 'agg', label: 'Agrégat', opts: [['non', 'Aucun'], ['moy', 'Moyenne par filière']], when: function (s) { return !!s.join; } }, { group: 'Transaction' }, { k: 'amt', label: 'Montant du virement', min: 1, max: 100, step: 1, unit: '', dec: 0 }, { k: 'tx', label: 'Transaction', opts: [[1, 'Oui'], [0, 'Non']] }, { k: 'crash', label: 'Panne en cours d’opération', opts: [[0, 'Non'], [1, 'Oui']] }],
    defaults: D, model: M,
    expr: function (s, m) { return S.esc(m.sql); },
    widget: function (s, m) { var keys = m.rows.length ? Object.keys(m.rows[0]) : ['résultat']; return '<h3>Résultat (' + m.rows.length + ' ligne(s))</h3>' + (m.rows.length ? K.table(keys, m.rows.map(function (r) { return keys.map(function (k) { return S.esc(typeof r[k] === 'number' ? fN(r[k], 4) : r[k]); }); })) : '<p class="muted">Aucune ligne.</p>') + '<h3>Comptes</h3><p>A = <strong>' + m.t.A + '</strong> · B = <strong>' + m.t.B + '</strong> · Total = <strong>' + m.total + '</strong> (attendu 150)</p>'; },
    verdict: function (s, m) { return m.total === 150 ? { ok: true, text: 'Base cohérente' } : { ok: false, text: 'Incohérence : de l’argent a disparu' }; },
    readouts: [['Lignes obtenues', function (s, m) { return String(m.rows.length); }], ['Total des comptes', function (s, m) { return String(m.total); }]],
    explain: function (s, m) { return '<p>La requête affichée renvoie ' + m.rows.length + ' ligne(s). ' + (s.crash ? (s.tx ? 'La panne a provoqué une annulation complète : la base est restée cohérente.' : 'Sans transaction, le débit a eu lieu mais pas le crédit : ' + (150 - m.total) + ' unités ont disparu.') : 'Le virement s’est déroulé normalement.') + '</p>'; },
    missions: [
      { id: 'm1', title: 'Filtrer', text: 'Sélectionnez seulement les étudiants de la filière Reseaux (sans jointure).', solution: { join: 0, filiere: 'Reseaux' }, check: function (s, m) { return !s.join && s.filiere === 'Reseaux' ? { ok: true, msg: 'Réussi : ' + m.rows.length + ' étudiants.' } : { ok: false, msg: 'Pas de jointure, filière Reseaux.' }; } },
      { id: 'm2', title: 'Joindre et filtrer', text: 'Affichez les notes de 14 ou plus, toutes filières confondues.', solution: { join: 1, filiere: 'toutes', min: 14, agg: 'non' }, check: function (s, m) { if (!s.join || s.min !== 14 || s.agg !== 'non' || s.filiere !== 'toutes') return { ok: false, msg: 'Activez la jointure, note minimale 14, sans agrégat ni filtre de filière.' }; return m.rows.length === 3 ? { ok: true, msg: 'Réussi : trois notes atteignent 14.' } : { ok: false, msg: m.rows.length + ' ligne(s).' }; } },
      { id: 'm3', title: 'Calculer une moyenne', text: 'Calculez la moyenne par filière.', solution: { join: 1, filiere: 'toutes', min: 0, agg: 'moy' }, check: function (s, m) { return s.join && s.agg === 'moy' ? { ok: true, msg: 'Réussi : ' + m.rows.length + ' groupes.' } : { ok: false, msg: 'Activez la jointure et la moyenne.' }; } },
      { id: 'm4', title: 'Provoquer une incohérence', text: 'Déclenchez une panne sans transaction, puis observez le total.', solution: { tx: 0, crash: 1 }, check: function (s, m) { return m.total !== 150 ? { ok: true, msg: 'Réussi : il manque ' + (150 - m.total) + ' unités. Une transaction aurait annulé l’opération.' } : { ok: false, msg: 'Le total est juste. Désactivez la transaction et simulez une panne.' }; } }],
    limits: '<p>Ce moteur évalue des filtres simples sur des données fictives. L’isolation entre utilisateurs et la durabilité sur disque ne sont pas simulées. Le SQL affiché est une transcription indicative.</p>' };

  var list = [
    K.pick('e1', 'Clé primaire', 'Modèle relationnel', '<p>Une clé primaire :</p>', 'identifie chaque ligne de façon unique', ['chiffre la table', 'trie les colonnes', 'contient toujours du texte'], '<p>Deux lignes ne peuvent pas partager la même valeur de clé primaire.</p>'),
    K.pick('e2', 'Clé étrangère', 'Modèle relationnel', '<p>Une clé étrangère :</p>', 'fait référence à la clé d’une autre table', ['est toujours nulle', 'est interdite dans une jointure', 'remplace la clé primaire'], '<p>Elle établit la relation entre les tables.</p>'),
    K.pick('e3', 'WHERE', 'Requêtes', '<p>La clause WHERE sert à :</p>', 'filtrer les lignes', ['trier les colonnes', 'créer une table', 'fermer une transaction'], '<p>Elle ne garde que les lignes qui vérifient la condition.</p>'),
    K.pick('e4', 'Atomicité', 'Transactions', '<p>L’atomicité garantit que :</p>', 'une transaction réussit entièrement ou est annulée entièrement', ['toutes les requêtes sont rapides', 'les données sont chiffrées', 'les tables sont petites'], '<p>Aucun état intermédiaire ne doit subsister.</p>'),
    K.num('e5', 'Nombre de lignes', 'Requêtes', '<p>Deux tables de 5 et 7 lignes, sans condition de jointure. Combien de lignes obtient-on ?</p>', 35, '', { abs: 0.1 }, '<p>Le produit cartésien donne 5 × 7 = 35 lignes.</p>'),
    K.num('e6', 'Moyenne', 'Requêtes', '<p>Trois notes : 12, 15, 9. Calculez la moyenne.</p>', 12, '', { abs: 0.05 }, '<p>(12 + 15 + 9)/3 = 12.</p>'),
    K.pick('e7', 'Normalisation', 'Modèle relationnel', '<p>Le but principal de la normalisation est de :</p>', 'réduire la redondance', ['augmenter la taille', 'supprimer les clés', 'chiffrer les données'], '<p>Une information ne doit être stockée qu’à un seul endroit.</p>'),
    K.pick('e8', 'Durabilité', 'Transactions', '<p>Une transaction validée :</p>', 'reste enregistrée même après une panne', ['disparaît au redémarrage', 'peut être annulée sans trace', 'n’est visible que du serveur'], '<p>C’est la durabilité.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('donnees', list) };
});
