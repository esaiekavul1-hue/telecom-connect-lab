/*
 * TELECOM CONNECT LAB — Module « Antennes » : leçon
 * Les diagrammes polaires des figures sont calculés avec antenna-math.js.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, A = TCL.antennaMath;
  function v(s) { return '<var>' + s + '</var>'; }
  function polar(cfg, plane, main, title, desc) {
    return TCL.antennaPlot.polarSvg(A.cut(cfg, plane, main == null ? 90 : main, 1), { plane: plane, scale: 'db', N: cfg.N, main: plane === 'H' && cfg.N > 1 ? main : (plane === 'V' ? 0 : null), title: title, desc: desc });
  }
  var HALF = { type: 'half', N: 1, d: 0.5, beta: 0 }, SHORT = { type: 'short', N: 1, d: 0.5, beta: 0 };

  function dipoleSchema() {
    // Dipôle alimenté en son centre, distribution du courant (sinusoïdale, nulle aux extrémités)
    var out = ['<svg class="schema" viewBox="0 0 560 230" role="img" aria-label="Schéma d’un dipôle demi-onde : deux brins conducteurs de longueur λ/4 alimentés au centre par une ligne ; le courant est maximal au centre et nul aux extrémités ; l’onde rayonnée part perpendiculairement au dipôle." xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="schema__bg" x="0" y="0" width="560" height="230" rx="14"/>');
    var x = 150, top = 30, bot = 200, mid = 115;
    out.push('<line class="schema__wire" x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + (mid - 6) + '"/><line class="schema__wire" x1="' + x + '" y1="' + (mid + 6) + '" x2="' + x + '" y2="' + bot + '"/>');
    out.push('<path class="schema__feed" d="M' + x + ' ' + (mid - 6) + ' H 60 M' + x + ' ' + (mid + 6) + ' H 60"/><text class="schema__t" x="58" y="' + (mid - 14) + '" text-anchor="end">ligne</text><text class="schema__t" x="58" y="' + (mid + 2) + '" text-anchor="end">d’alimentation</text>');
    var d = '';
    for (var i = 0; i <= 40; i++) { var t = i / 40, y = top + t * (bot - top), I = Math.cos(Math.PI * (t - 0.5)); d += (i ? 'L' : 'M') + (x + 8 + 34 * I).toFixed(1) + ' ' + y.toFixed(1); }
    out.push('<path class="schema__current" d="' + d + '"/><text class="schema__t schema__t--alt" x="' + (x + 46) + '" y="' + (mid + 4) + '">courant I</text>');
    out.push('<path class="schema__dim" d="M' + (x - 22) + ' ' + top + ' V ' + bot + ' M' + (x - 27) + ' ' + top + ' h10 M' + (x - 27) + ' ' + bot + ' h10"/><text class="schema__t" x="' + (x - 30) + '" y="' + (mid + 40) + '" text-anchor="end">L ≈ λ/2</text>');
    for (var k = 0; k < 3; k++) { var r = 60 + k * 40; out.push('<path class="schema__wave" d="M' + (x + 120 + k * 40) + ' ' + (mid - r * 0.55) + ' q 24 ' + (r * 0.55) + ' 0 ' + (r * 1.1) + '"/>'); }
    out.push('<path class="schema__arrow" d="M300 ' + mid + ' H 520 M510 ' + (mid - 6) + ' L520 ' + mid + ' L510 ' + (mid + 6) + '"/><text class="schema__t" x="520" y="' + (mid - 12) + '" text-anchor="end">onde rayonnée</text>');
    out.push('</svg>');
    return out.join('');
  }

  function polLossOptions() {
    return { kind: 'xy', title: 'Perte de polarisation', desc: 'Perte en décibels en fonction de l’angle entre les deux antennes : 0 dB à 0°, 3 dB à 45°, 6 dB à 60°, perte totale à 90°.',
      x: { min: 0, max: 90, ticks: [0, 15, 30, 45, 60, 75, 90], label: 'désalignement Δ (°)' }, y: { min: 0, max: 20, ticks: [0, 3, 6, 10, 15, 20], label: 'perte (dB)' },
      series: [{ samples: 400, fn: function (a) { var l = A.polarizationLoss(a).db; return isFinite(l) ? l : 40; } }],
      points: [{ x: 45, y: A.polarizationLoss(45).db, label: '45° → 3 dB' }, { x: 60, y: A.polarizationLoss(60).db, label: '60° → 6 dB' }] };
  }

  var figures = {
    dipole: { caption: 'Un dipôle demi-onde : deux brins alimentés au centre. Le courant est maximal au centre, nul aux extrémités.', svg: dipoleSchema },
    'pat-half-v': { caption: 'Dipôle demi-onde vertical, plan vertical : maximum vers l’horizon (0°), aucun rayonnement vers le zénith. Le cercle pointillé marque −3 dB.', svg: function () { return polar(HALF, 'V', 0, 'Diagramme vertical du dipôle demi-onde', 'deux lobes en forme de huit, maximum à l’horizon, largeur à −3 dB 78 degrés'); } },
    'pat-half-h': { caption: 'Même dipôle, plan horizontal (vu de dessus) : un cercle. Il rayonne autant dans toutes les directions horizontales.', svg: function () { return polar(HALF, 'H', null, 'Diagramme horizontal du dipôle demi-onde', 'cercle : omnidirectionnel'); } },
    'pat-short-v': { caption: 'Dipôle court, plan vertical : forme en sin θ, un peu plus large (90° à −3 dB).', svg: function () { return polar(SHORT, 'V', 0, 'Diagramme vertical du dipôle court', 'largeur à −3 dB de 90 degrés'); } },
    'pat-array': { caption: 'Réseau de 4 dipôles espacés de λ/2, en phase (β = 0) : deux lobes étroits perpendiculaires au réseau (26° à −3 dB), lobes secondaires à −11,3 dB.', svg: function () { return polar({ type: 'half', N: 4, d: 0.5, beta: 0 }, 'H', 90, 'Diagramme horizontal d’un réseau de 4 dipôles', 'deux lobes principaux à 90 et 270 degrés'); } },
    'pat-steer': { caption: 'Le même réseau avec β = −90° : le lobe principal est dépointé à 60° de l’axe du réseau, sans bouger l’antenne.', svg: function () { return polar({ type: 'half', N: 4, d: 0.5, beta: -Math.PI / 2 }, 'H', 60, 'Diagramme d’un réseau dépointé', 'lobe principal à 60 degrés'); } },
    'pat-grating': { caption: 'Réseau de 4 dipôles espacés de λ (β = 0) : des lobes de réseau, aussi forts que le lobe principal, apparaissent dans l’axe (0° et 180°).', svg: function () { return polar({ type: 'half', N: 4, d: 1, beta: 0 }, 'H', 90, 'Lobes de réseau', 'quatre lobes de même niveau'); } },
    polloss: { caption: 'Perte de polarisation entre deux antennes rectilignes inclinées de Δ : −10 log₁₀(cos² Δ).', options: polLossOptions }
  };

  var chapters = [
    {
      id: 'c1', title: 'Le rôle d’une antenne',
      summary: 'Convertir un courant en onde et inversement ; réciprocité ; quelques familles d’antennes.',
      html: [
        '<p class="lead">Un émetteur produit un courant électrique alternatif ; l’air transporte une onde électromagnétique. L’<strong>antenne</strong> fait le lien entre les deux.</p>',
        '<h3>Définition</h3>',
        '<p>Une antenne est un conducteur (ou un ensemble de conducteurs) qui transforme un <strong>courant alternatif</strong> en <strong>onde électromagnétique rayonnée</strong> à l’émission, et une onde reçue en courant à la réception.</p>',
        '<div data-fig="dipole"></div>',
        '<h3>Le principe de réciprocité</h3>',
        '<p>Une même antenne a les mêmes propriétés à l’émission et à la réception : même fréquence de fonctionnement, même diagramme de rayonnement, même gain. Une antenne qui envoie beaucoup d’énergie dans une direction capte aussi mieux les signaux venant de cette direction.</p>',
        '<h3>Quelques familles d’antennes</h3>',
        '<ul class="examples">',
        '<li><strong>Dipôle</strong> : deux brins alignés, alimentés au centre (radio FM, antennes de référence).</li>',
        '<li><strong>Monopôle</strong> : un seul brin au-dessus d’un plan conducteur (antennes de voiture, talkies-walkies).</li>',
        '<li><strong>Antenne imprimée (patch)</strong> : une plaque métallique sur un circuit (téléphones, GPS, Wi-Fi).</li>',
        '<li><strong>Réseau d’antennes</strong> : plusieurs éléments combinés (stations de base 4G et 5G).</li>',
        '<li><strong>Parabole</strong> : un réflecteur qui concentre l’onde (satellites, faisceaux hertziens).</li>',
        '</ul>',
        '<div class="callout callout--info">Une antenne ne crée pas d’énergie : elle répartit dans l’espace la puissance qu’on lui fournit. Elle peut seulement la <strong>concentrer</strong> dans certaines directions, au détriment des autres.</div>'
      ].join('')
    },
    {
      id: 'c2', title: 'Fréquence de fonctionnement et dimensions',
      summary: 'La taille d’une antenne se mesure en longueurs d’onde : L ≈ λ/2 pour un dipôle.',
      html: [
        '<p class="lead">Une antenne fonctionne bien à une fréquence donnée lorsque ses dimensions sont liées à la longueur d’onde.</p>',
        '<h3>La résonance du dipôle demi-onde</h3>',
        '<p>Un dipôle est <strong>résonant</strong> quand sa longueur totale vaut environ une demi-longueur d’onde :</p>',
        '<div class="formula">' + v('L') + ' ≈ λ / 2 = ' + v('c') + ' / (2' + v('f') + ')</div>',
        '<p>À la résonance, l’antenne présente une impédance d’environ 73 Ω, facile à adapter à l’émetteur : presque toute la puissance est rayonnée au lieu d’être renvoyée vers l’émetteur. En pratique, on la raccourcit de quelques pour cent (environ 0,47 à 0,48 λ) à cause de l’épaisseur des brins.</p>',
        '<div class="table-wrap"><table class="data-table"><caption>Longueur théorique d’un dipôle demi-onde (λ/2, dans l’air)</caption><thead><tr><th scope="col">Usage</th><th scope="col">Fréquence</th><th scope="col">λ/2</th></tr></thead><tbody>',
        [['Radio FM', 100e6], ['Téléphonie GSM', 900e6], ['Wi-Fi', 2.4e9], ['Wi-Fi', 5.8e9]].map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + M.formatFrequency(r[1]) + '</td><td>' + M.formatLength(A.wavelength(r[1]) / 2, 3) + '</td></tr>'; }).join(''),
        '</tbody></table></div>',
        '<h3>Le monopôle quart d’onde</h3>',
        '<p>Un seul brin de longueur λ/4, posé verticalement sur un plan conducteur (toit de voiture, circuit imprimé), se comporte comme un dipôle demi-onde dont la moitié inférieure serait « remplacée » par son image dans le plan. Il est deux fois plus court, ce qui explique sa popularité.</p>',
        '<h3>Bande passante</h3>',
        '<p>Une antenne reste utilisable sur une plage de fréquences autour de sa fréquence de résonance : c’est sa <strong>bande passante</strong>. Une antenne de téléphone doit couvrir plusieurs bandes (700 MHz, 1 800 MHz, 3,5 GHz…) : elle combine plusieurs éléments ou utilise des formes particulières.</p>',
        '<h3>Exemple guidé</h3>',
        '<ol class="steps"><li>Fréquence : 433 MHz (télécommandes, capteurs).</li><li>λ = c/f = 3×10⁸ / 433×10⁶ ≈ 0,693 m.</li><li>Dipôle demi-onde : L ≈ 0,693 / 2 ≈ <strong>34,6 cm</strong>. Monopôle quart d’onde : ≈ <strong>17,3 cm</strong>.</li></ol>'
      ].join('')
    },
    {
      id: 'c3', title: 'Le diagramme de rayonnement',
      summary: 'Représenter la puissance rayonnée selon la direction ; plans horizontal et vertical ; lobes et largeur à −3 dB.',
      html: [
        '<p class="lead">Le diagramme de rayonnement indique, pour chaque direction, la part de puissance que l’antenne envoie (ou capte) par rapport à sa direction la plus favorable.</p>',
        '<h3>Comment le lire</h3>',
        '<ul><li>On le trace en <strong>coordonnées polaires</strong> : l’angle est la direction, la distance au centre est l’intensité.</li>',
        '<li>Il est <strong>normalisé</strong> : le maximum vaut 0 dB (ou 1 en échelle linéaire).</li>',
        '<li>On en montre deux coupes : le <strong>plan horizontal</strong> (vu de dessus) et le <strong>plan vertical</strong>.</li></ul>',
        '<div class="fig-pair"><div data-fig="pat-half-v"></div><div data-fig="pat-half-h"></div></div>',
        '<h3>Vocabulaire</h3>',
        '<ul><li><strong>Lobe principal</strong> : la zone autour de la direction de rayonnement maximal.</li>',
        '<li><strong>Lobes secondaires</strong> : des maxima plus faibles dans d’autres directions (souvent indésirables : ils créent des interférences).</li>',
        '<li><strong>Zéros</strong> : directions dans lesquelles l’antenne ne rayonne pas (l’axe d’un dipôle).</li>',
        '<li><strong>Largeur à −3 dB</strong> (ou ouverture) : l’angle entre les deux directions où la puissance est divisée par deux par rapport au maximum.</li></ul>',
        '<div data-fig="pat-short-v"></div>',
        '<h3>Antenne isotrope et antenne omnidirectionnelle</h3>',
        '<p>Une antenne <strong>isotrope</strong> rayonnerait autant dans toutes les directions de l’espace : elle n’existe pas, mais sert de référence pour les calculs. Une antenne <strong>omnidirectionnelle</strong>, comme le dipôle vertical, rayonne autant dans toutes les directions <em>horizontales</em>, mais pas vers le haut ni vers le bas.</p>',
        '<div class="callout callout--warn"><strong>Attention aux échelles.</strong> En décibels, un lobe à −20 dB paraît grand alors qu’il ne représente que 1 % de la puissance du maximum. Vérifiez toujours l’échelle d’un diagramme avant de l’interpréter.</div>'
      ].join('')
    },
    {
      id: 'c4', title: 'Directivité et gain',
      summary: 'Comparer une antenne à l’antenne isotrope : D, G = η·D, dBi et dBd, surface effective.',
      html: [
        '<p class="lead">La directivité et le gain chiffrent la capacité d’une antenne à concentrer l’énergie dans sa direction privilégiée.</p>',
        '<h3>La directivité</h3>',
        '<p>La <strong>directivité</strong> ' + v('D') + ' est le rapport entre l’intensité rayonnée dans la direction du maximum et l’intensité moyenne (celle qu’aurait une antenne isotrope de même puissance rayonnée). Elle s’exprime en rapport ou en <strong>dBi</strong> (décibels par rapport à l’isotrope) :</p>',
        '<div class="formula">' + v('D') + '<sub>dBi</sub> = 10 log₁₀(' + v('D') + ')</div>',
        '<ul><li>Antenne isotrope : D = 1, soit 0 dBi.</li><li>Dipôle court : D = 1,5, soit 1,76 dBi.</li><li>Dipôle demi-onde : D ≈ 1,64, soit <strong>2,15 dBi</strong>.</li></ul>',
        '<h3>Le gain</h3>',
        '<p>Une antenne réelle perd une partie de la puissance fournie (résistance des conducteurs, isolants). Son <strong>rendement</strong> η (entre 0 et 1) relie le gain à la directivité :</p>',
        '<div class="formula">' + v('G') + ' = η · ' + v('D') + '&emsp;&emsp;soit&emsp;&emsp;' + v('G') + '<sub>dBi</sub> = ' + v('D') + '<sub>dBi</sub> + 10 log₁₀(η)</div>',
        '<p>Exemple : D = 12 dBi et η = 80 % donnent G = 12 + 10 log₁₀(0,8) = 12 − 0,97 ≈ <strong>11,0 dBi</strong>.</p>',
        '<h3>dBi et dBd</h3>',
        '<p>Certains fabricants donnent le gain en <strong>dBd</strong>, par rapport au dipôle demi-onde. Comme le dipôle vaut 2,15 dBi : <strong>G<sub>dBi</sub> = G<sub>dBd</sub> + 2,15</strong>.</p>',
        '<h3>Gain et largeur de faisceau vont ensemble</h3>',
        '<p>Plus une antenne concentre l’énergie (faisceau étroit), plus son gain est élevé. Ci-dessous, quatre dipôles combinés atteignent environ 9,2 dBi, contre 2,15 dBi pour un seul.</p>',
        '<div data-fig="pat-array"></div>',
        '<h3>La surface effective</h3>',
        '<p>À la réception, une antenne de gain ' + v('G') + ' se comporte comme une surface ' + v('A') + '<sub>e</sub> qui collecterait la puissance de l’onde :</p>',
        '<div class="formula">' + v('A') + '<sub>e</sub> = ' + v('G') + ' λ² / (4π)</div>',
        '<p>À gain égal, une antenne capte moins de puissance à haute fréquence (λ plus petite). C’est l’origine du terme en fréquence de l’affaiblissement en espace libre, étudié dans le module « Propagation ».</p>'
      ].join('')
    },
    {
      id: 'c5', title: 'Réseaux d’antennes et dépointage',
      summary: 'Combiner plusieurs éléments ; orienter le faisceau par le déphasage ; éviter les lobes de réseau.',
      html: [
        '<p class="lead">En alimentant plusieurs antennes ensemble, on obtient un faisceau plus étroit, et on peut l’orienter électroniquement.</p>',
        '<h3>Principe</h3>',
        '<p>Dans chaque direction, les ondes émises par les différents éléments s’additionnent. Si elles arrivent <strong>en phase</strong>, elles se renforcent ; si elles arrivent en opposition, elles s’annulent. Le diagramme total est le produit du diagramme d’un élément par le <strong>facteur de réseau</strong>, qui dépend du nombre d’éléments ' + v('N') + ', de leur espacement ' + v('d') + ' et du déphasage ' + v('β') + ' appliqué entre deux éléments voisins.</p>',
        '<h3>Orienter le faisceau</h3>',
        '<p>Le lobe principal pointe dans la direction ' + v('φ') + '<sub>0</sub> (mesurée depuis l’axe du réseau) qui compense le déphasage :</p>',
        '<div class="formula">cos ' + v('φ') + '<sub>0</sub> = −' + v('β') + ' / (2π ' + v('d') + '/λ)</div>',
        '<ul><li>β = 0 : faisceau perpendiculaire au réseau (φ₀ = 90°).</li><li>d = λ/2 et β = −90° : cos φ₀ = 0,5, donc φ₀ = 60°.</li></ul>',
        '<div data-fig="pat-steer"></div>',
        '<p>C’est le principe des <strong>antennes actives</strong> des stations 5G et des radars : le faisceau suit l’utilisateur sans aucune pièce mobile (formation de faisceau, ou « beamforming »).</p>',
        '<h3>Les lobes de réseau</h3>',
        '<p>Si les éléments sont trop espacés (d ≥ λ pour un faisceau perpendiculaire), d’autres directions reçoivent les ondes en phase : des <strong>lobes de réseau</strong> aussi forts que le lobe principal apparaissent. L’énergie part dans des directions inutiles. On garde donc en général d ≤ λ/2 à λ.</p>',
        '<div data-fig="pat-grating"></div>'
      ].join('')
    },
    {
      id: 'c6', title: 'Polarisation et synthèse',
      summary: 'Orientation du champ électrique ; perte de polarisation ; résumé et erreurs fréquentes.',
      html: [
        '<p class="lead">La polarisation décrit l’orientation du champ électrique de l’onde. Émetteur et récepteur doivent être accordés.</p>',
        '<h3>Types de polarisation</h3>',
        '<ul><li><strong>Rectiligne verticale</strong> : le champ E oscille verticalement (dipôle vertical, radio FM en voiture).</li>',
        '<li><strong>Rectiligne horizontale</strong> : le champ E oscille horizontalement (certaines antennes de télévision).</li>',
        '<li><strong>Circulaire</strong> : le champ E tourne autour de la direction de propagation (GPS, satellites) ; elle évite les problèmes d’orientation.</li>',
        '<li><strong>Polarisation croisée ±45°</strong> : deux antennes inclinées à +45° et −45° dans un même panneau (stations 4G et 5G), utilisées pour transmettre deux flux en parallèle.</li></ul>',
        '<h3>La perte de polarisation</h3>',
        '<p>Une antenne rectiligne ne capte que la composante du champ parallèle à elle. Si les deux antennes font un angle Δ :</p>',
        '<div class="formula">facteur = cos² Δ&emsp;&emsp;perte = −10 log₁₀(cos² Δ) dB</div>',
        '<div data-fig="polloss"></div>',
        '<p>À 45°, on perd la moitié de la puissance (3 dB). À 90° (polarisations croisées), la perte est théoriquement totale ; en pratique, les réflexions la limitent à 20 ou 30 dB.</p>',
        '<h3>Résumé</h3>',
        '<ul class="summary"><li>L’antenne convertit un courant en onde et inversement (réciprocité).</li>',
        '<li>Un dipôle résonant mesure environ λ/2 ; un monopôle sur plan de masse, λ/4.</li>',
        '<li>Le diagramme de rayonnement montre la répartition de la puissance selon la direction ; la largeur à −3 dB mesure l’ouverture du faisceau.</li>',
        '<li>Directivité en dBi : 0 dBi pour l’isotrope, 2,15 dBi pour le dipôle demi-onde. Gain : G = η·D.</li>',
        '<li>Un réseau d’antennes resserre le faisceau ; le déphasage l’oriente : cos φ₀ = −β/(2πd/λ).</li>',
        '<li>Désalignement de polarisation Δ : perte −10 log₁₀(cos² Δ).</li></ul>',
        '<h3>Erreurs fréquentes à éviter</h3>',
        '<ul class="pitfalls">',
        '<li><strong>Croire qu’une antenne amplifie.</strong> Le gain ne crée pas d’énergie : il la redistribue dans l’espace.</li>',
        '<li><strong>Confondre dBi et dBd.</strong> 0 dBd = 2,15 dBi : comparez toujours les gains dans la même unité.</li>',
        '<li><strong>Confondre omnidirectionnel et isotrope.</strong> Un dipôle est omnidirectionnel dans le plan horizontal, mais pas isotrope.</li>',
        '<li><strong>Oublier le rendement.</strong> La directivité décrit la forme du diagramme ; le gain tient compte des pertes.</li>',
        '<li><strong>Espacer trop les éléments d’un réseau.</strong> Au-delà de λ, des lobes de réseau apparaissent.</li>',
        '</ul>'
      ].join('')
    }
  ];

  TCL.lessons = TCL.lessons || {};
  TCL.lessons.antennes = {
    id: 'antennes', title: 'Antennes',
    intro: 'L’antenne est la porte d’entrée et de sortie de toute liaison radio. Cette leçon explique comment elle rayonne, comment lire un diagramme de rayonnement et ce que signifient le gain, la directivité et la polarisation.',
    objectives: [
      'Expliquer le rôle d’une antenne et le principe de réciprocité.',
      'Calculer la longueur d’un dipôle demi-onde ou d’un monopôle quart d’onde pour une fréquence donnée.',
      'Lire un diagramme de rayonnement : lobes, zéros, largeur à −3 dB.',
      'Calculer et convertir une directivité et un gain (dBi, dBd, rendement).',
      'Expliquer comment un réseau d’antennes oriente son faisceau, et ce qu’est un lobe de réseau.',
      'Calculer une perte de polarisation.'
    ],
    prerequisites: 'Module « Ondes électromagnétiques » (longueur d’onde) et notions de décibels.',
    chapters: chapters, figures: figures
  };
})(window);
