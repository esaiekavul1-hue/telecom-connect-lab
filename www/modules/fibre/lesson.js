/*
 * TELECOM CONNECT LAB — Module « Fibre optique » : leçon
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, F = TCL.fiberMath;
  function v(s) { return '<var>' + s + '</var>'; }
  function fN(x, s) { return M.formatNumber(x, s); }

  function structureSvg() {
    var out = ['<svg class="schema" viewBox="0 0 560 220" role="img" aria-label="Coupe d’une fibre optique : au centre le cœur, entouré de la gaine optique de 125 micromètres, puis d’un revêtement protecteur." xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="schema__bg" x="0" y="0" width="560" height="220" rx="14"/>');
    var cx = 130, cy = 110;
    out.push('<circle class="schema__coat" cx="' + cx + '" cy="' + cy + '" r="90"/><circle class="schema__cladding" cx="' + cx + '" cy="' + cy + '" r="62"/><circle class="schema__corec" cx="' + cx + '" cy="' + cy + '" r="14"/>');
    [['cœur (n₁) : 9 µm (monomode) ou 50 à 62,5 µm (multimode)', cy - 8, 14], ['gaine optique (n₂ < n₁) : 125 µm', cy + 34, 50], ['revêtement protecteur : 250 µm environ', cy + 78, 84]].forEach(function (l) {
      out.push('<line class="schema__lead" x1="' + (cx + l[2]) + '" y1="' + l[1] + '" x2="250" y2="' + l[1] + '"/><text class="schema__t" x="258" y="' + (l[1] + 4) + '">' + l[0] + '</text>');
    });
    out.push('</svg>');
    return out.join('');
  }

  function snellSvg(theta, n1, n2, label) {
    var W = 300, H = 230, cx = 150, cy = 115, R = 95, D2R = Math.PI / 180;
    var th2 = F.snell(n1, theta, n2), crit = F.criticalAngle(n1, n2);
    var out = ['<svg class="schema schema--small" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="schema__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>');
    out.push('<rect class="schema__medium2" x="0" y="0" width="' + W + '" height="' + cy + '" rx="14"/><rect class="schema__medium1" x="0" y="' + cy + '" width="' + W + '" height="' + (H - cy) + '"/>');
    out.push('<line class="schema__interface" x1="0" y1="' + cy + '" x2="' + W + '" y2="' + cy + '"/><line class="schema__normalv" x1="' + cx + '" y1="10" x2="' + cx + '" y2="' + (H - 10) + '"/>');
    out.push('<text class="schema__t" x="10" y="22">n₂ = ' + fN(n2, 3) + ' (gaine)</text><text class="schema__t" x="10" y="' + (H - 12) + '">n₁ = ' + fN(n1, 3) + ' (cœur)</text>');
    var ix = cx - R * Math.sin(theta * D2R), iy = cy + R * Math.cos(theta * D2R);
    out.push('<line class="schema__ray" x1="' + ix.toFixed(1) + '" y1="' + iy.toFixed(1) + '" x2="' + cx + '" y2="' + cy + '"/>');
    if (th2 != null) {
      out.push('<line class="schema__ray" x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R * Math.sin(th2 * D2R)).toFixed(1) + '" y2="' + (cy - R * Math.cos(th2 * D2R)).toFixed(1) + '"/>');
      out.push('<line class="schema__ray schema__ray--weak" x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R * Math.sin(theta * D2R)).toFixed(1) + '" y2="' + (cy + R * Math.cos(theta * D2R)).toFixed(1) + '"/>');
      out.push('<text class="schema__t schema__t--alt" x="' + (cx + 8) + '" y="' + (cy - 60) + '">réfracté ' + fN(th2, 3) + '°</text>');
    } else {
      out.push('<line class="schema__ray" x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R * Math.sin(theta * D2R)).toFixed(1) + '" y2="' + (cy + R * Math.cos(theta * D2R)).toFixed(1) + '"/>');
      out.push('<text class="schema__t schema__t--alt" x="' + (cx + 8) + '" y="' + (cy - 20) + '">réflexion totale</text>');
    }
    out.push('<text class="schema__t" x="' + (cx - 8) + '" y="' + (cy + 40) + '" text-anchor="end">incidence ' + fN(theta, 3) + '°</text>');
    out.push('<text class="schema__t schema__t--muted" x="' + (W - 10) + '" y="' + (H - 12) + '" text-anchor="end">θc = ' + fN(crit, 3) + '°</text>');
    out.push('</svg>');
    return out.join('');
  }

  function attenuationOptions() {
    // Courbe indicative de l'atténuation de la silice : diffusion de Rayleigh (∝ 1/λ⁴) + absorption infrarouge (pic OH non représenté)
    var ray = function (lnm) { var l = lnm / 1000; return 0.8 / Math.pow(l, 4) / 1.0; };
    var ir = function (lnm) { var l = lnm / 1000; return 6e11 * Math.exp(-48 / l); };
    return { kind: 'xy', title: 'Atténuation de la fibre selon la longueur d’onde (allure)', desc: 'Atténuation décroissante de 850 nm à un minimum vers 1 550 nm, puis croissante : fenêtres de transmission à 850, 1 310 et 1 550 nm.',
      x: { min: 700, max: 1700, ticks: [800, 1000, 1200, 1400, 1600], label: 'longueur d’onde (nm)' }, y: { min: 0, max: 3.5, ticks: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], label: 'dB/km' },
      series: [{ samples: 300, fn: function (l) { return ray(l) + ir(l); } }],
      vlines: [{ x: 850, label: '850 nm' }, { x: 1310, label: '1 310 nm' }, { x: 1550, label: '1 550 nm' }] };
  }

  function budgetOptions() {
    var pt = 0, alpha = 0.2, L = 80, sens = -28, steps = [[0, 0], [0, -0.5]], x = 0, p = -0.5;
    [20, 40, 60].forEach(function (s) { p -= alpha * (s - x); steps.push([s, p]); p -= 0.1; steps.push([s, p]); x = s; });
    p -= alpha * (L - x); steps.push([L, p]); p -= 0.5; steps.push([L, p]);
    return { kind: 'xy', title: 'Bilan de puissance d’une liaison de 80 km', desc: 'Puissance de 0 dBm à −17,3 dBm sur 80 km à 0,2 dB/km avec 2 connecteurs et 3 épissures ; sensibilité −28 dBm.',
      x: { min: 0, max: L, label: 'distance (km)' }, y: { min: -30, max: 3, ticks: [-30, -25, -20, -15, -10, -5, 0], zeroLine: false, label: 'puissance (dBm)' },
      series: [{ points: steps }], hlines: [{ y: sens, label: 'sensibilité −28 dBm', anchor: 'start' }], points: [{ x: L, y: p, label: fN(p, 3) + ' dBm' }] };
  }

  var figures = {
    structure: { caption: 'Coupe d’une fibre optique (non à l’échelle). La lumière est guidée dans le cœur.', svg: structureSvg },
    'snell-a': { caption: 'Incidence de 70° : inférieure à l’angle critique, la lumière passe en partie dans la gaine (réfraction).', svg: function () { return snellSvg(70, 1.48, 1.46, 'Rayon incident à 70 degrés : réfracté dans la gaine'); } },
    'snell-b': { caption: 'Incidence de 85° : supérieure à l’angle critique (80,6°), toute la lumière est réfléchie dans le cœur.', svg: function () { return snellSvg(85, 1.48, 1.46, 'Rayon incident à 85 degrés : réflexion totale'); } },
    guided: { caption: 'Un rayon entrant à 10° dans le cône d’acceptance (±14°) est guidé par réflexions totales successives.', svg: function () { return TCL.fiberPlot.fiberSvg({ n1: 1.48, n2: 1.46, theta: 10 }); } },
    lost: { caption: 'Un rayon entrant à 20°, hors du cône d’acceptance, frappe la gaine sous un angle trop faible et s’échappe.', svg: function () { return TCL.fiberPlot.fiberSvg({ n1: 1.48, n2: 1.46, theta: 20 }); } },
    attenuation: { caption: 'Allure de l’atténuation d’une fibre en silice : elle est minimale vers 1 550 nm (environ 0,2 dB/km). Courbe indicative, sans le pic d’absorption de l’eau vers 1 380 nm.', options: attenuationOptions },
    budget: { caption: 'Bilan de puissance : pente régulière dans la fibre, petits sauts aux épissures, sauts de 0,5 dB aux connecteurs.', options: budgetOptions }
  };

  var chapters = [
    {
      id: 'c1', title: 'Pourquoi la fibre optique ?',
      summary: 'Transmettre de la lumière dans un fil de verre ; structure cœur–gaine ; avantages.',
      html: [
        '<p class="lead">Une fibre optique est un fil de verre plus fin qu’un cheveu, dans lequel des impulsions de lumière transportent les bits. Elle forme l’ossature de l’Internet mondial.</p>',
        '<h3>Structure</h3>',
        '<div data-fig="structure"></div>',
        '<ul><li>Le <strong>cœur</strong>, d’indice de réfraction ' + v('n') + '<sub>1</sub>, guide la lumière.</li><li>La <strong>gaine optique</strong>, d’indice ' + v('n') + '<sub>2</sub> légèrement plus faible, l’entoure (125 µm de diamètre).</li><li>Un <strong>revêtement</strong> en polymère protège le verre ; le câble ajoute des renforts et une gaine extérieure.</li></ul>',
        '<h3>Avantages</h3>',
        '<ul class="examples"><li><strong>Très faible atténuation</strong> : environ 0,2 dB/km à 1 550 nm, contre plusieurs dizaines de dB/km pour un câble coaxial à haute fréquence.</li>',
        '<li><strong>Très grande bande passante</strong> : plusieurs térabits par seconde sur une seule fibre, en multipliant les longueurs d’onde (multiplexage WDM).</li>',
        '<li><strong>Insensible aux perturbations électromagnétiques</strong> : la lumière n’est pas gênée par les moteurs ou la foudre.</li>',
        '<li>Légère, peu encombrante, difficile à espionner sans la couper.</li></ul>',
        '<h3>Usages</h3>',
        '<p>Réseaux de cœur des opérateurs, câbles sous-marins entre continents, raccordement des stations de base 4G et 5G, fibre jusqu’au domicile (FTTH), réseaux internes des centres de données.</p>'
      ].join('')
    },
    {
      id: 'c2', title: 'Réfraction et réflexion totale interne',
      summary: 'Loi de Snell-Descartes, angle critique, condition de guidage.',
      html: [
        '<p class="lead">La lumière reste prisonnière du cœur grâce à un phénomène simple : la réflexion totale interne.</p>',
        '<h3>L’indice de réfraction</h3>',
        '<p>L’indice ' + v('n') + ' d’un milieu indique combien la lumière y est ralentie : ' + v('v') + ' = ' + v('c') + '/' + v('n') + '. Pour le verre de silice, ' + v('n') + ' ≈ 1,45 à 1,48 : la lumière y circule à environ 200 000 km/s.</p>',
        '<h3>La loi de Snell-Descartes</h3>',
        '<p>Quand un rayon passe d’un milieu à un autre, il change de direction (réfraction). Les angles sont mesurés depuis la <strong>normale</strong> (la perpendiculaire à la surface) :</p>',
        '<div class="formula">' + v('n') + '<sub>1</sub> sin θ<sub>1</sub> = ' + v('n') + '<sub>2</sub> sin θ<sub>2</sub></div>',
        '<p>En passant d’un milieu plus réfringent (cœur) à un milieu moins réfringent (gaine), le rayon s’écarte de la normale.</p>',
        '<h3>L’angle critique</h3>',
        '<p>Si l’angle d’incidence dépasse l’<strong>angle critique</strong> θ<sub>c</sub>, le rayon ne peut plus sortir : toute la lumière est réfléchie. C’est la <strong>réflexion totale interne</strong>, sans aucune perte.</p>',
        '<div class="formula">sin θ<sub>c</sub> = ' + v('n') + '<sub>2</sub> / ' + v('n') + '<sub>1</sub>&emsp;(il faut ' + v('n') + '<sub>2</sub> &lt; ' + v('n') + '<sub>1</sub>)</div>',
        '<p>Exemple : ' + v('n') + '<sub>1</sub> = 1,48 et ' + v('n') + '<sub>2</sub> = 1,46 donnent sin θ<sub>c</sub> = 0,9865, soit θ<sub>c</sub> ≈ <strong>' + fN(F.criticalAngle(1.48, 1.46), 3) + '°</strong>. Seuls les rayons qui frappent la gaine de manière très rasante (plus de 80,6° par rapport à la normale) sont guidés.</p>',
        '<div class="fig-pair"><div data-fig="snell-a"></div><div data-fig="snell-b"></div></div>'
      ].join('')
    },
    {
      id: 'c3', title: 'Ouverture numérique, modes et dispersion',
      summary: 'Cône d’acceptance ; fibres multimodes et monomodes ; dispersion modale.',
      html: [
        '<p class="lead">Pour être guidé, un rayon doit entrer dans la fibre avec une inclinaison limitée. Cette limite définit l’ouverture numérique.</p>',
        '<h3>Ouverture numérique et angle d’acceptance</h3>',
        '<p>En combinant la réfraction à l’entrée (air → cœur) et la condition de réflexion totale, on trouve l’angle maximal d’entrée θ<sub>a</sub> :</p>',
        '<div class="formula">ON = sin θ<sub>a</sub> = √(' + v('n') + '<sub>1</sub>² − ' + v('n') + '<sub>2</sub>²)&emsp;(entrée depuis l’air)</div>',
        '<p>Avec 1,48 et 1,46 : ON = √(2,1904 − 2,1316) = √0,0588 ≈ <strong>0,243</strong>, soit θ<sub>a</sub> ≈ <strong>14°</strong>. Les rayons qui arrivent dans ce <strong>cône d’acceptance</strong> sont guidés ; les autres sont perdus.</p>',
        '<div data-fig="guided"></div><div data-fig="lost"></div>',
        '<h3>Fibres multimodes et monomodes</h3>',
        '<ul><li><strong>Multimode</strong> (cœur de 50 ou 62,5 µm) : de nombreux trajets (« modes ») coexistent. Facile à raccorder, utilisée sur quelques centaines de mètres.</li>',
        '<li><strong>Monomode</strong> (cœur d’environ 9 µm) : un seul mode se propage. Elle permet des débits très élevés sur des dizaines, voire des milliers de kilomètres (avec amplificateurs).</li></ul>',
        '<h3>La dispersion modale</h3>',
        '<p>Dans une fibre multimode à saut d’indice, un rayon très incliné parcourt plus de chemin qu’un rayon axial : il arrive plus tard. Une impulsion lumineuse s’étale dans le temps de :</p>',
        '<div class="formula">Δ' + v('T') + ' = (' + v('L') + ' · ' + v('n') + '<sub>1</sub> / ' + v('c') + ') · (' + v('n') + '<sub>1</sub>/' + v('n') + '<sub>2</sub> − 1)</div>',
        '<p>Pour 1 km avec 1,48 / 1,46 : ΔT ≈ ' + fN(F.modalDispersion(1, 1.48, 1.46) * 1e9, 3) + ' ns. Si les impulsions se chevauchent, le récepteur ne distingue plus les bits : le débit est limité à environ 1/(2ΔT), soit quelques Mbit/s par kilomètre. Les fibres à <strong>gradient d’indice</strong> et surtout les fibres monomodes réduisent fortement ce problème.</p>'
      ].join('')
    },
    {
      id: 'c4', title: 'Atténuation et bilan de puissance',
      summary: 'dB/km, fenêtres de transmission, épissures et connecteurs, longueur maximale.',
      html: [
        '<p class="lead">Même dans le meilleur verre, la lumière s’affaiblit peu à peu. Le bilan de puissance vérifie qu’il en reste assez au bout de la liaison.</p>',
        '<h3>L’atténuation linéique</h3>',
        '<p>L’atténuation d’une fibre s’exprime en <strong>dB/km</strong>. Elle provient surtout de la diffusion de la lumière par les irrégularités microscopiques du verre (diffusion de Rayleigh, plus forte aux courtes longueurs d’onde) et de l’absorption infrarouge.</p>',
        '<div data-fig="attenuation"></div>',
        '<p>On utilise trois <strong>fenêtres</strong> : 850 nm (≈ 3 dB/km, multimode, composants bon marché), 1 310 nm (≈ 0,35 dB/km) et 1 550 nm (≈ 0,2 dB/km, longues distances).</p>',
        '<h3>Le bilan de puissance</h3>',
        '<div class="formula">' + v('P') + '<sub>r</sub> = ' + v('P') + '<sub>e</sub> − α·' + v('L') + ' − ' + v('N') + '<sub>e</sub>·' + v('a') + '<sub>e</sub> − ' + v('N') + '<sub>c</sub>·' + v('a') + '<sub>c</sub></div>',
        '<p>avec α l’atténuation (dB/km), ' + v('N') + '<sub>e</sub> épissures (≈ 0,1 dB chacune) et ' + v('N') + '<sub>c</sub> connecteurs (≈ 0,5 dB chacun). La liaison fonctionne si ' + v('P') + '<sub>r</sub> reste supérieure à la <strong>sensibilité</strong> ' + v('S') + ' du récepteur, avec une marge de sécurité.</p>',
        '<h3>Exemple guidé</h3>',
        '<ol class="steps"><li>Émission 0 dBm, 80 km à 1 550 nm (0,2 dB/km) : 16 dB.</li><li>2 connecteurs (1 dB) et 3 épissures (0,3 dB) : 1,3 dB.</li><li>Pr = 0 − 16 − 1,3 = <strong>−17,3 dBm</strong>. Avec une sensibilité de −28 dBm, la marge vaut 10,7 dB.</li></ol>',
        '<div data-fig="budget"></div>',
        '<p>Longueur maximale : ' + v('L') + '<sub>max</sub> = (' + v('P') + '<sub>e</sub> − ' + v('S') + ' − pertes de raccordement) / α.</p>'
      ].join('')
    },
    {
      id: 'c5', title: 'Débits, applications et synthèse',
      summary: 'Ce qui limite le débit ; multiplexage en longueur d’onde ; résumé et erreurs fréquentes.',
      html: [
        '<p class="lead">Deux phénomènes limitent une liaison optique : l’atténuation (la portée) et la dispersion (le débit).</p>',
        '<h3>Ce qui limite le débit</h3>',
        '<ul><li><strong>Dispersion modale</strong> (multimode) : les trajets n’ont pas la même longueur.</li><li><strong>Dispersion chromatique</strong> (monomode) : les différentes couleurs d’une impulsion ne voyagent pas exactement à la même vitesse. Elle se compense par des fibres ou des traitements numériques adaptés.</li></ul>',
        '<h3>Multiplexer les longueurs d’onde</h3>',
        '<p>Le <strong>multiplexage en longueur d’onde</strong> (WDM) envoie des dizaines de « couleurs » différentes dans la même fibre, chacune portant son propre flux de données (100 Gbit/s ou plus chacun). Des amplificateurs optiques, placés tous les 50 à 100 km environ, permettent de traverser les océans.</p>',
        '<h3>Résumé</h3>',
        '<ul class="summary"><li>Fibre = cœur (' + v('n') + '<sub>1</sub>) + gaine (' + v('n') + '<sub>2</sub> &lt; ' + v('n') + '<sub>1</sub>) ; la lumière est guidée par réflexion totale interne.</li>',
        '<li>Snell-Descartes : n₁ sin θ₁ = n₂ sin θ₂ ; angle critique sin θc = n₂/n₁.</li>',
        '<li>Ouverture numérique ON = √(n₁² − n₂²) = sin θa.</li>',
        '<li>Monomode (9 µm) pour les longues distances, multimode (50–62,5 µm) pour les courtes.</li>',
        '<li>Bilan : Pr = Pe − α·L − pertes de raccordement ; la liaison fonctionne si Pr ≥ S (avec une marge).</li></ul>',
        '<h3>Erreurs fréquentes à éviter</h3>',
        '<ul class="pitfalls">',
        '<li><strong>Mesurer l’angle depuis la surface.</strong> Dans la loi de Snell-Descartes, les angles se mesurent depuis la normale.</li>',
        '<li><strong>Inverser les indices.</strong> Le guidage exige un cœur plus réfringent que la gaine (n₁ &gt; n₂).</li>',
        '<li><strong>Oublier les raccordements.</strong> Sur une liaison courte, connecteurs et épissures pèsent souvent plus que la fibre elle-même.</li>',
        '<li><strong>Confondre atténuation (dB/km) et perte totale (dB).</strong> La perte de la fibre vaut α × L.</li>',
        '</ul>'
      ].join('')
    }
  ];

  TCL.lessons = TCL.lessons || {};
  TCL.lessons.fibre = {
    id: 'fibre', title: 'Fibre optique',
    intro: 'Cette leçon explique comment un fil de verre guide la lumière sur des dizaines de kilomètres, ce qui limite sa portée et son débit, et comment vérifier qu’une liaison optique fonctionne grâce au bilan de puissance.',
    objectives: [
      'Décrire la structure d’une fibre optique (cœur, gaine, revêtement).',
      'Appliquer la loi de Snell-Descartes et calculer un angle critique.',
      'Calculer une ouverture numérique et un angle d’acceptance.',
      'Distinguer fibres monomodes et multimodes, et expliquer la dispersion modale.',
      'Établir le bilan de puissance d’une liaison et en déduire sa longueur maximale.'
    ],
    prerequisites: 'Notions de décibels (module « Propagation ») ; utiliser les fonctions sinus et arcsinus de la calculatrice.',
    chapters: chapters, figures: figures
  };
})(window);
