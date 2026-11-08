/*
 * TELECOM CONNECT LAB 2.0 — Diagnostic et maintenance informatique.
 * Références : OSTEP (RAID), CISA (règle 3-2-1), page Power-on self-test.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, v = K.v, S = K.S;
  function raid(level, N, B) {
    if (level === 0) return { cap: N * B, tol: 0 };
    if (level === 1) return { cap: N * B / 2, tol: 1 };
    return { cap: (N - 1) * B, tol: 1 };
  }
  function alive(level, N, failed) { if (level === 0) return failed === 0; return failed <= 1; }
  function backup321(c) { var ok = c.copies >= 3 && c.media >= 2 && c.offsite >= 1; return { ok: ok, copies: c.copies >= 3, media: c.media >= 2, offsite: c.offsite >= 1 }; }
  function diskFull(usedPct, dailyGo, sizeGo) { return dailyGo > 0 ? (100 - usedPct) / 100 * sizeGo / dailyGo : Infinity; }
  var SYMPTOMS = {
    alim: { label: 'Aucune lumière, pas de ventilateur', test: 'alimentation', cause: 'alim' },
    ram: { label: 'Ventilateur tourne, écran noir, bips courts au démarrage', test: 'memoire', cause: 'ram' },
    disque: { label: 'Message « Aucun disque amorçable »', test: 'disque', cause: 'disque' },
    temp: { label: 'Arrêts brutaux sous charge', test: 'temperature', cause: 'temp' }
  };
  var math = { raid: raid, alive: alive, backup321: backup321, diskFull: diskFull, SYMPTOMS: SYMPTOMS };

  var lesson = K.lesson({ id: 'maintenance', title: 'Diagnostic et maintenance informatique',
    intro: 'Un ordinateur tombe en panne selon des schémas reconnaissables. Une méthode permet de trouver la cause et de protéger les données.',
    objectives: ['Décrire la séquence de démarrage.', 'Appliquer une méthode de diagnostic.', 'Comparer les niveaux de RAID.', 'Appliquer la règle de sauvegarde 3-2-1.'],
    prerequisites: 'Systèmes d’exploitation.',
    sources: ['OSTEP, chapitre RAID.', 'CISA, Data Backup Options (règle 3-2-1).', 'Page « Power-on self-test ».'],
    figures: { boot: { caption: 'Séquence de démarrage d’un ordinateur.', svg: function () { return S.blocks({ w: 520, h: 110, label: 'Alimentation, POST, chargeur, système.', boxes: [{ id: 'a', x: 15, y: 30, w: 110, h: 50, t: 'Alimentation' }, { id: 'b', x: 140, y: 30, w: 110, h: 50, t: 'POST' }, { id: 'c', x: 265, y: 30, w: 110, h: 50, t: 'Chargeur' }, { id: 'd', x: 390, y: 30, w: 115, h: 50, t: 'Système' }], links: [{ a: 'a', b: 'b' }, { a: 'b', b: 'c' }, { a: 'c', b: 'd' }] }); } } },
    chapters: [
      { title: 'Démarrage et méthode', summary: 'POST, méthode de dépannage.', html: [
        '<p class="lead">Chaque étape du démarrage indique où chercher une panne.</p>',
        '<div data-fig="boot"></div>',
        K.defs([['POST', 'Autotest réalisé par le microprogramme juste après la mise sous tension.'], ['Chargeur d’amorçage', 'Programme qui lance le système d’exploitation.'], ['Isolement', 'Retirer ou tester un composant à la fois.']]),
        K.formula('Autonomie disque = espace libre / croissance quotidienne', 'Estimation simple pour anticiper un disque plein.'),
        K.example('anticiper', '<p>500 Go à 80 % d’occupation, croissance 5 Go/jour : il reste ' + fN(diskFull(80, 5, 500)) + ' jours.</p>'),
        K.apply('<p>Avant toute manipulation : sauvegarder, noter l’état initial, ne changer qu’une chose à la fois, et documenter l’intervention.</p>')] },
      { title: 'RAID et disques', summary: 'Niveaux 0, 1, 5.', html: [
        '<p class="lead">Répartir les données sur plusieurs disques permet d’accélérer les accès ou de survivre à une panne.</p>',
        K.formula('RAID 0 : N·B, RAID 1 : N·B/2, RAID 5 : (N−1)·B', 'N disques de capacité B. RAID 1 et RAID 5 tolèrent la perte d’un disque.'),
        K.defs([['RAID 0', 'Répartition sans redondance : aucune panne tolérée.'], ['RAID 1', 'Miroir.'], ['RAID 5', 'Parité répartie.']]),
        K.example('choisir', '<p>Quatre disques de 2 To : RAID 0 = ' + raid(0, 4, 2).cap + ' To, RAID 1 = ' + raid(1, 4, 2).cap + ' To, RAID 5 = ' + raid(5, 4, 2).cap + ' To.</p>'),
        K.apply('<p>Le RAID protège d’une panne de disque, pas d’un effacement accidentel ni d’un rançongiciel.</p>')] },
      { title: 'Sauvegardes', summary: 'Règle 3-2-1, restauration.', html: [
        '<p class="lead">Une sauvegarde n’a de valeur que si on sait la restaurer.</p>',
        K.defs([['3 copies', 'Une version principale et deux sauvegardes.'], ['2 supports', 'De types différents.'], ['1 copie hors site', 'À l’extérieur du bâtiment.']]),
        K.formula('Perte maximale = intervalle entre deux sauvegardes', 'Objectif de point de reprise : combien de données peut-on accepter de perdre ?'),
        K.example('une petite école', '<p>PC principal, disque externe et sauvegarde sur un service distant : 3 copies, 2 supports, 1 hors site. Une restauration doit être testée régulièrement.</p>'),
        K.pitfalls(['<strong>Confondre RAID et sauvegarde.</strong>', '<strong>Ne jamais tester la restauration.</strong>', '<strong>Changer plusieurs éléments à la fois</strong>, rendant la cause impossible à identifier.']),
        K.summary(['Le POST vérifie le matériel au démarrage.', 'Isoler, changer une chose à la fois.', 'RAID 5 : (N−1)·B, une panne tolérée.', 'Sauvegarde 3-2-1 et tests de restauration.']),
        K.toLab('maintenance', 'Testez une grappe RAID et des pannes de démarrage.')] }
    ] });

  var D = { level: 5, N: 4, B: 2, failed: 0, copies: 2, media: 1, offsite: 0, sym: 'ram', test: 'alimentation', cause: 'alim' };
  function M(s) { var r = raid(s.level, s.N, s.B), b = backup321(s), sy = SYMPTOMS[s.sym]; return { r: r, up: alive(s.level, s.N, s.failed), b: b, sy: sy, right: s.test === sy.test }; }
  var lab = { id: 'maintenance', title: 'RAID, sauvegardes et diagnostic', short: 'Maintenance', icon: 'shield', badge: 'Logique de pannes simplifiée',
    text: 'Configurez une grappe de disques et simulez des pannes, vérifiez une stratégie de sauvegarde, puis diagnostiquez un symptôme.',
    summary: 'Simulez des pannes RAID, vérifiez une stratégie 3-2-1 et diagnostiquez des pannes de démarrage.',
    params: [{ group: 'Grappe de disques' }, { k: 'level', label: 'Niveau', opts: [[0, 'RAID 0'], [1, 'RAID 1'], [5, 'RAID 5']] }, { k: 'N', label: 'Disques', min: 2, max: 12, step: 1, unit: '', dec: 0 }, { k: 'B', label: 'Capacité par disque', min: 0.5, max: 20, step: 0.5, unit: 'To', dec: 1 }, { k: 'failed', label: 'Disques en panne', min: 0, max: 3, step: 1, unit: '', dec: 0 }, { group: 'Sauvegarde' }, { k: 'copies', label: 'Copies totales', min: 1, max: 5, step: 1, unit: '', dec: 0 }, { k: 'media', label: 'Types de support', min: 1, max: 3, step: 1, unit: '', dec: 0 }, { k: 'offsite', label: 'Copies hors site', min: 0, max: 2, step: 1, unit: '', dec: 0 }, { group: 'Diagnostic' }, { k: 'sym', label: 'Symptôme', select: true, opts: Object.keys(SYMPTOMS).map(function (k) { return [k, SYMPTOMS[k].label]; }), hint: '' }, { k: 'test', label: 'Premier contrôle', select: true, opts: [['alimentation', 'Alimentation électrique'], ['memoire', 'Barrettes mémoire'], ['disque', 'Disque et ordre d’amorçage'], ['temperature', 'Refroidissement']], hint: '' }],
    defaults: D, model: M,
    widget: function (s, m) { var cells = ''; for (var i = 0; i < s.N; i++) cells += '<div class="sim-cell' + (i < s.failed ? ' is-on' : '') + '"><small>disque ' + (i + 1) + '</small>' + (i < s.failed ? 'panne' : 'OK') + '</div>'; return '<h3>Grappe</h3><div class="sim-cells">' + cells + '</div><p>' + (m.up ? 'Les données restent accessibles.' : '<strong>Données perdues : restauration depuis une sauvegarde nécessaire.</strong>') + '</p>'; },
    expr: function (s, m) { return 'Capacité utile : ' + fN(m.r.cap) + ' To'; },
    verdict: function (s, m) { return m.up ? { ok: true, text: 'Données accessibles' } : { ok: false, text: 'Grappe perdue' }; },
    readouts: [['Capacité utile', function (s, m) { return fN(m.r.cap) + ' To'; }], ['Pannes tolérées', function (s, m) { return String(m.r.tol); }], ['État', function (s, m) { return m.up ? 'Accessible' : 'Perdu'; }], ['Règle 3-2-1', function (s, m) { return m.b.ok ? 'Respectée' : 'Incomplète'; }], ['Premier contrôle', function (s, m) { return m.right ? 'Pertinent' : 'À revoir'; }]],
    explain: function (s, m) { return '<p>Cette grappe offre ' + fN(m.r.cap) + ' To et tolère ' + m.r.tol + ' panne(s). ' + (m.up ? 'Les données restent lisibles.' : 'Trop de disques sont perdus.') + ' Sauvegarde : ' + (m.b.ok ? 'la règle 3-2-1 est respectée.' : 'il manque ' + [m.b.copies ? '' : 'des copies', m.b.media ? '' : 'un autre support', m.b.offsite ? '' : 'une copie hors site'].filter(Boolean).join(', ') + '.') + '</p>'; },
    missions: [
      { id: 'm1', title: 'Survivre à une panne', text: 'En RAID 5, avec 4 disques, simulez un disque en panne.', solution: { level: 5, N: 4, failed: 1 }, check: function (s, m) { if (s.level !== 5 || s.N !== 4) return { ok: false, msg: 'Choisissez RAID 5 avec 4 disques.' }; return s.failed === 1 && m.up ? { ok: true, msg: 'Réussi : la parité permet de reconstituer les données.' } : { ok: false, msg: 'Simulez exactement un disque en panne.' }; } },
      { id: 'm2', title: 'La fragilité du RAID 0', text: 'En RAID 0, simulez une panne et constatez la perte.', solution: { level: 0, failed: 1 }, check: function (s, m) { if (s.level !== 0) return { ok: false, msg: 'Choisissez RAID 0.' }; return !m.up ? { ok: true, msg: 'Réussi : sans redondance, un seul disque perdu détruit la grappe.' } : { ok: false, msg: 'Simulez une panne.' }; } },
      { id: 'm3', title: 'Sauvegarde correcte', text: 'Respectez la règle 3-2-1.', solution: { copies: 3, media: 2, offsite: 1 }, check: function (s, m) { return m.b.ok ? { ok: true, msg: 'Réussi : 3 copies, 2 supports, 1 hors site.' } : { ok: false, msg: 'Règle incomplète.' }; } },
      { id: 'm4', title: 'Diagnostic de démarrage', text: 'Pour un démarrage sans image avec bips, choisissez le bon premier contrôle.', solution: { sym: 'ram', test: 'memoire' }, check: function (s, m) { if (s.sym !== 'ram') return { ok: false, msg: 'Sélectionnez le symptôme avec les bips au démarrage.' }; return m.right ? { ok: true, msg: 'Réussi : le POST signale une anomalie de mémoire par des bips.' } : { ok: false, msg: 'Ce n’est pas le contrôle le plus pertinent.' }; } }],
    limits: '<p>La logique de panne est simplifiée : le niveau RAID et le nombre de disques seuls sont considérés, sans durée de reconstruction ni erreurs de lecture. Les codes de bips varient selon les constructeurs : référez-vous à la documentation de la carte mère.</p>' };

  var list = [
    K.num('e1', 'RAID 5', 'RAID', '<p>5 disques de 4 To en RAID 5. Calculez la capacité utile, en To.</p>', 16, 'To', { abs: 0.1 }, '<p>(5 − 1) × 4 = 16 To.</p>'),
    K.num('e2', 'RAID 1', 'RAID', '<p>2 disques de 8 To en RAID 1. Calculez la capacité utile, en To.</p>', 8, 'To', { abs: 0.1 }, '<p>(2 × 8)/2 = 8 To.</p>'),
    K.num('e3', 'RAID 0', 'RAID', '<p>3 disques de 2 To en RAID 0. Calculez la capacité utile, en To.</p>', 6, 'To', { abs: 0.1 }, '<p>3 × 2 = 6 To, sans redondance.</p>'),
    K.num('e4', 'Disque plein', 'Prévention', '<p>1 To (1 000 Go) occupé à 90 %, croissance 2 Go/jour. Dans combien de jours sera-t-il plein ?</p>', 50, 'jours', { abs: 0.5 }, '<p>100 Go libres / 2 Go par jour = 50 jours.</p>'),
    K.pick('e5', 'Règle 3-2-1', 'Sauvegardes', '<p>La règle 3-2-1 recommande notamment :</p>', 'une copie hors site', ['trois copies sur le même disque', 'aucune copie en ligne', 'de ne pas sauvegarder le système'], '<p>3 copies, sur 2 types de support, dont 1 hors site.</p>'),
    K.pick('e6', 'RAID et sauvegarde', 'Sauvegardes', '<p>Un RAID 1 protège :</p>', 'd’une panne d’un disque', ['d’un effacement accidentel', 'd’un rançongiciel', 'd’un incendie'], '<p>Le miroir recopie aussi instantanément les erreurs et effacements.</p>'),
    K.pick('e7', 'POST', 'Démarrage', '<p>Le POST s’exécute :</p>', 'juste après la mise sous tension', ['après la connexion de l’utilisateur', 'à l’arrêt de la machine', 'une seule fois dans la vie de la machine'], '<p>C’est un autotest du matériel au démarrage.</p>'),
    K.pick('e8', 'Méthode', 'Diagnostic', '<p>Lors d’un dépannage, il faut :</p>', 'changer un seul élément à la fois', ['tout remplacer d’un coup', 'ignorer les messages d’erreur', 'éviter de noter ce qu’on fait'], '<p>Sinon, on ne saura pas quelle action a résolu le problème.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('maintenance', list) };
});
