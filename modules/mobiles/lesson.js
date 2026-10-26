/*
 * TELECOM CONNECT LAB — Module « Réseaux mobiles » : leçon
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, Mo = TCL.mobileMath;
  function v(s) { return '<var>' + s + '</var>'; }
  function fN(x, s) { return M.formatNumber(x, s); }
  function map(N, mx, my) {
    var s = { N: N, R: 1, n: 4, S: 168, pt: 43, sens: -100, area: 100, mx: mx, my: my, coverage: false };
    return TCL.mobilePlot.mapSvg(s, TCL.mobilePlot.analyse(s)).svg.replace('tabindex="0"', '').replace('role="application"', 'role="img"');
  }

  function ciOptions() {
    var Ns = [1, 3, 4, 7, 9, 12];
    return { kind: 'xy', title: 'C/I selon le motif de réutilisation', desc: 'Rapport C/I en dB pour N = 1, 3, 4, 7, 9 et 12, avec n = 3 et n = 4 ; seuil de 18 dB.',
      x: { min: 0, max: 13, ticks: Ns, label: 'motif N' }, y: { min: 0, max: 30, ticks: [0, 5, 10, 15, 20, 25, 30], label: 'C/I (dB)' },
      series: [{ points: Ns.map(function (n) { return [n, Mo.toDb(Mo.carrierToInterference(n, 4))]; }) }, { cls: 'scope__trace scope__trace--alt', points: Ns.map(function (n) { return [n, Mo.toDb(Mo.carrierToInterference(n, 3))]; }) }],
      hlines: [{ y: 18, label: 'objectif 18 dB', anchor: 'start' }],
      points: Ns.map(function (n) { return { x: n, y: Mo.toDb(Mo.carrierToInterference(n, 4)) }; }) };
  }

  var figures = {
    cells: { caption: 'Un réseau de cellules hexagonales, motif N = 7 : chaque lettre est un groupe de fréquences. Les cellules surlignées réutilisent les fréquences de la cellule où se trouve le téléphone.', svg: function () { return map(7, 0.4, 0.2); } },
    cells3: { caption: 'Motif N = 3 : les mêmes fréquences reviennent plus souvent (D = 3R) ; plus de canaux par cellule, mais plus d’interférences.', svg: function () { return map(3, 0.4, 0.2); } },
    ci: { caption: 'Rapport C/I (1re couronne) en fonction de N : n = 4 en trait plein, n = 3 en tirets. Avec n = 4, il faut N ≥ 7 pour dépasser 18 dB.', legend: [['trace', 'n = 4'], ['alt', 'n = 3']], options: ciOptions },
    handover: { caption: 'Téléphone à la frontière de deux cellules : les deux stations sont reçues avec des niveaux voisins ; le réseau prépare le transfert.', svg: function () { return map(7, 0.866, 0.0); } }
  };

  var chapters = [
    {
      id: 'c1', title: 'Le principe cellulaire',
      summary: 'Découper le territoire en cellules servies par des stations de base.',
      html: [
        '<p class="lead">Un réseau mobile couvre un pays avec des milliers d’antennes. Chacune ne dessert qu’une petite zone : une <strong>cellule</strong>.</p>',
        '<h3>Pourquoi des cellules ?</h3>',
        '<p>Les fréquences radio sont une ressource rare, attribuée aux opérateurs par l’État. Un opérateur ne dispose que de quelques dizaines de MHz. Si une seule antenne couvrait toute une ville, elle ne pourrait servir qu’un nombre limité de communications simultanées.</p>',
        '<p>L’idée cellulaire : découper le territoire en petites zones et <strong>réutiliser les mêmes fréquences</strong> dans des cellules suffisamment éloignées pour qu’elles ne se gênent pas. La capacité totale du réseau augmente avec le nombre de cellules.</p>',
        '<h3>La station de base</h3>',
        '<ul><li>Elle comprend des <strong>antennes</strong> (souvent trois panneaux orientés à 120°, qui forment trois « secteurs »), des émetteurs-récepteurs et un lien vers le cœur de réseau (fibre ou faisceau hertzien).</li>',
        '<li>Son nom change selon la génération : BTS (2G), NodeB (3G), eNodeB (4G), gNodeB (5G).</li>',
        '<li>Le téléphone communique toujours avec la station qui le sert le mieux, généralement la plus proche.</li></ul>',
        '<div data-fig="cells"></div>',
        '<h3>Le modèle hexagonal</h3>',
        '<p>Pour étudier un réseau, on représente chaque cellule par un <strong>hexagone</strong> de rayon ' + v('R') + ', avec la station au centre. Les hexagones pavent le plan sans trou ni chevauchement, et approchent la forme d’une zone de couverture circulaire. Les cellules réelles ont des formes irrégulières, déformées par le relief et les bâtiments.</p>'
      ].join('')
    },
    {
      id: 'c2', title: 'Réutilisation des fréquences',
      summary: 'Motif N = i² + ij + j², distance de réutilisation D = R√(3N), canaux par cellule.',
      html: [
        '<p class="lead">Les fréquences de l’opérateur sont partagées entre un groupe de ' + v('N') + ' cellules voisines, le <strong>motif</strong> (ou cluster). Ce motif est répété sur tout le territoire.</p>',
        '<h3>La taille du motif</h3>',
        '<p>Pour que le pavage soit régulier, ' + v('N') + ' doit s’écrire :</p>',
        '<div class="formula">' + v('N') + ' = ' + v('i') + '² + ' + v('i') + '·' + v('j') + ' + ' + v('j') + '²&emsp;(' + v('i') + ', ' + v('j') + ' entiers)</div>',
        '<p>Valeurs possibles : 1, 3, 4, 7, 9, 12, 13, 19… Pour trouver la cellule voisine qui réutilise les mêmes fréquences : on avance de ' + v('i') + ' cellules, on tourne de 60°, puis on avance de ' + v('j') + ' cellules.</p>',
        '<h3>La distance de réutilisation</h3>',
        '<div class="formula">' + v('D') + ' = ' + v('R') + ' √(3' + v('N') + ')&emsp;&emsp;' + v('Q') + ' = ' + v('D') + '/' + v('R') + ' = √(3' + v('N') + ')</div>',
        '<p>Exemple : N = 7 et R = 2 km donnent D = 2 × √21 ≈ <strong>9,17 km</strong>.</p>',
        '<div data-fig="cells3"></div>',
        '<h3>Canaux par cellule</h3>',
        '<p>Si l’opérateur dispose de ' + v('S') + ' canaux, chaque cellule du motif en reçoit ' + v('S') + '/' + v('N') + '. Avec S = 420 et N = 7 : <strong>60 canaux</strong> par cellule. Un petit motif donne plus de canaux par cellule, mais rapproche les cellules qui utilisent les mêmes fréquences.</p>'
      ].join('')
    },
    {
      id: 'c3', title: 'Interférences et capacité',
      summary: 'Rapport C/I, compromis entre qualité et capacité, découpage des cellules.',
      html: [
        '<p class="lead">Réutiliser les fréquences crée des interférences : un téléphone reçoit sa station, mais aussi, plus faiblement, les stations lointaines qui émettent sur la même fréquence.</p>',
        '<h3>Le rapport porteuse sur interférences</h3>',
        '<p>Au bord d’une cellule, la puissance utile décroît en 1/' + v('R') + '<sup>' + v('n') + '</sup>, et chacune des 6 cellules interférentes de la première couronne est à une distance d’environ ' + v('D') + '. D’où :</p>',
        '<div class="formula">' + v('C') + '/' + v('I') + ' ≈ ' + v('Q') + '<sup>' + v('n') + '</sup> / 6 = (√(3' + v('N') + '))<sup>' + v('n') + '</sup> / 6</div>',
        '<p>' + v('n') + ' est l’<strong>exposant d’affaiblissement</strong> : 2 en espace libre, 3 à 4 en zone urbaine. Exemple : N = 7, n = 4 : Q = √21 ≈ 4,58 ; C/I = 4,58⁴/6 ≈ 73,5, soit <strong>' + fN(Mo.toDb(Mo.carrierToInterference(7, 4)), 3) + ' dB</strong>.</p>',
        '<div data-fig="ci"></div>',
        '<h3>Le compromis qualité / capacité</h3>',
        '<ul><li>Grand ' + v('N') + ' : cellules interférentes éloignées, bon C/I, mais peu de canaux par cellule.</li><li>Petit ' + v('N') + ' : beaucoup de canaux par cellule, mais C/I plus faible.</li></ul>',
        '<p>La 2G (GSM) visait un C/I d’environ 9 à 12 dB avec des motifs de 3 à 7 cellules ; un objectif de 18 dB est souvent cité pour les anciens systèmes analogiques. Les réseaux 4G et 5G utilisent même N = 1 (toutes les cellules sur les mêmes fréquences), grâce à des modulations et des codes qui tolèrent les interférences, et à la coordination entre stations.</p>',
        '<h3>Augmenter la capacité : découper les cellules</h3>',
        '<p>Diviser le rayon des cellules par 2 multiplie leur nombre par 4 sur la même surface : la capacité totale est multipliée par 4, à motif identique. C’est pourquoi les centres-villes ont des cellules de quelques centaines de mètres, et les stades de très petites cellules.</p>'
      ].join('')
    },
    {
      id: 'c4', title: 'Couverture, mobilité et transfert',
      summary: 'Portée d’une station, nombre de cellules, handover et localisation des abonnés.',
      html: [
        '<p class="lead">Un réseau doit à la fois couvrir tout le territoire et suivre les abonnés qui se déplacent.</p>',
        '<h3>Couvrir une zone</h3>',
        '<p>La surface d’une cellule hexagonale vaut ' + v('A') + ' = (3√3/2) ' + v('R') + '² ≈ 2,6 ' + v('R') + '². Pour couvrir une surface ' + v('S') + '<sub>zone</sub>, il faut environ ' + v('S') + '<sub>zone</sub>/' + v('A') + ' cellules. Avec R = 2 km (10,4 km² par cellule), une ville de 300 km² demande <strong>' + Mo.cellsToCover(300, 2) + ' cellules</strong>.</p>',
        '<p>Le rayon ne peut pas dépasser la <strong>portée</strong> de la station, fixée par le bilan de liaison (puissance, gains d’antenne, affaiblissement, sensibilité du téléphone ; voir le module « Propagation »).</p>',
        '<h3>Le transfert intercellulaire (handover)</h3>',
        '<p>Pendant un appel, le téléphone mesure en permanence la puissance reçue de sa station et des stations voisines. Quand une voisine devient nettement meilleure, le réseau <strong>transfère</strong> la communication, sans coupure perceptible. Une marge (hystérésis de quelques dB) évite les allers-retours à la frontière.</p>',
        '<div data-fig="handover"></div>',
        '<h3>La localisation</h3>',
        '<p>Au repos, le téléphone signale au réseau la zone où il se trouve (zone de localisation). Lors d’un appel entrant, le réseau sait ainsi dans quelles cellules le chercher (« paging »). Grâce à l’<strong>itinérance</strong> (roaming), un abonné peut aussi utiliser le réseau d’un autre opérateur, par exemple à l’étranger.</p>'
      ].join('')
    },
    {
      id: 'c5', title: 'Les générations 2G à 5G et synthèse',
      summary: 'Évolution des techniques, des débits et des services ; résumé et erreurs fréquentes.',
      html: [
        '<p class="lead">Chaque génération de réseau mobile a apporté de nouvelles techniques et de nouveaux usages.</p>',
        '<div class="table-wrap"><table class="data-table"><caption>Générations de réseaux mobiles (ordres de grandeur)</caption><thead><tr><th scope="col">Génération</th><th scope="col">Norme principale</th><th scope="col">Débuts</th><th scope="col">Technique d’accès</th><th scope="col">Débits typiques</th><th scope="col">Usages</th></tr></thead><tbody>',
        '<tr><td>2G</td><td>GSM (+ GPRS, EDGE)</td><td>1991</td><td>TDMA + FDMA, porteuses de 200 kHz</td><td>de quelques kbit/s à quelques centaines de kbit/s</td><td>voix, SMS</td></tr>',
        '<tr><td>3G</td><td>UMTS (+ HSPA)</td><td>2001</td><td>CDMA à large bande (W-CDMA), canaux de 5 MHz</td><td>384 kbit/s à plusieurs dizaines de Mbit/s</td><td>Internet mobile, visiophonie</td></tr>',
        '<tr><td>4G</td><td>LTE (+ LTE-Advanced)</td><td>2009</td><td>OFDMA, canaux jusqu’à 20 MHz (agrégeables)</td><td>de quelques dizaines à plusieurs centaines de Mbit/s</td><td>vidéo, applications, voix sur IP</td></tr>',
        '<tr><td>5G</td><td>NR (New Radio)</td><td>2019</td><td>OFDMA, canaux jusqu’à 100 MHz (sous 6 GHz) ou 400 MHz (ondes millimétriques), antennes actives</td><td>de centaines de Mbit/s à plusieurs Gbit/s</td><td>très haut débit, faible latence, objets connectés</td></tr>',
        '</tbody></table></div>',
        '<p class="muted">Les débits réels dépendent de la bande de fréquences, de la charge de la cellule et de la position de l’utilisateur.</p>',
        '<h3>L’architecture d’un réseau mobile</h3>',
        '<p>Un réseau comporte trois grandes parties : le <strong>terminal</strong> (téléphone), le <strong>réseau d’accès radio</strong> (les stations de base) et le <strong>cœur de réseau</strong>, qui gère les abonnés, l’authentification, la mobilité et l’accès à Internet ou au réseau téléphonique.</p>',
        '<h3>Résumé</h3>',
        '<ul class="summary"><li>Le territoire est découpé en cellules ; chaque station de base sert sa cellule.</li>',
        '<li>Motif N = i² + ij + j² ; distance de réutilisation D = R√(3N).</li>',
        '<li>C/I ≈ (√(3N))<sup>n</sup>/6 : un grand N améliore la qualité, un petit N la capacité.</li>',
        '<li>Canaux par cellule = S/N ; diviser R par 2 multiplie la capacité par 4.</li>',
        '<li>Le handover transfère l’appel d’une cellule à l’autre ; la 4G et la 5G utilisent l’OFDMA.</li></ul>',
        '<h3>Erreurs fréquentes à éviter</h3>',
        '<ul class="pitfalls">',
        '<li><strong>Choisir N au hasard.</strong> Seules certaines valeurs (1, 3, 4, 7, 9, 12…) permettent un pavage régulier.</li>',
        '<li><strong>Croire que des cellules plus petites améliorent le C/I.</strong> À motif égal, C/I ne dépend que du rapport D/R, pas de R.</li>',
        '<li><strong>Oublier le dB.</strong> C/I = 73,5 en valeur linéaire correspond à 18,7 dB.</li>',
        '<li><strong>Confondre couverture et capacité.</strong> Une station peut couvrir une zone sans pouvoir servir tous ses utilisateurs.</li>',
        '</ul>'
      ].join('')
    }
  ];

  TCL.lessons = TCL.lessons || {};
  TCL.lessons.mobiles = {
    id: 'mobiles', title: 'Réseaux mobiles',
    intro: 'Cette leçon explique comment un réseau mobile couvre un territoire avec des cellules, pourquoi et comment il réutilise ses fréquences, comment il suit les abonnés en mouvement, et ce qui distingue les générations 2G à 5G.',
    objectives: [
      'Expliquer le principe cellulaire et le rôle d’une station de base.',
      'Calculer une taille de motif, une distance de réutilisation et un nombre de canaux par cellule.',
      'Estimer un rapport C/I et choisir un motif adapté.',
      'Calculer le nombre de cellules nécessaires pour couvrir une zone.',
      'Décrire le transfert intercellulaire (handover).',
      'Situer les principales caractéristiques des générations 2G à 5G.'
    ],
    prerequisites: 'Modules « Antennes » et « Propagation » (bilan de liaison, décibels).',
    chapters: chapters, figures: figures
  };
})(window);
