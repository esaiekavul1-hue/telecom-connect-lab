/*
 * TELECOM CONNECT LAB — Module « Ondes électromagnétiques » : leçon
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var W = TCL.waveMath, M = TCL.signalMath;
  function v(s) { return '<var>' + s + '</var>'; }
  function fN(x, s) { return M.formatNumber(x, s); }

  function emSvg() {
    var w = 560, h = 230, y0 = 115, x0 = 40, len = 440, a = 70, e = '', b = '', vec = '';
    for (var i = 0; i <= 160; i++) {
      var t = i / 160, x = x0 + t * len, s = Math.sin(t * 4 * Math.PI);
      e += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (y0 - a * s).toFixed(1);
      // B horizontal, vu en perspective cavalière : décalage oblique vers le bas et la gauche
      b += (i ? 'L' : 'M') + (x - 0.2 * a * s).toFixed(1) + ' ' + (y0 + 0.32 * a * s).toFixed(1);
      if (i % 8 === 4) vec += '<line class="schema__vec" x1="' + x.toFixed(1) + '" y1="' + y0 + '" x2="' + x.toFixed(1) + '" y2="' + (y0 - a * s).toFixed(1) + '"/><line class="schema__vec schema__vec--b" x1="' + x.toFixed(1) + '" y1="' + y0 + '" x2="' + (x - 0.2 * a * s).toFixed(1) + '" y2="' + (y0 + 0.32 * a * s).toFixed(1) + '"/>';
    }
    var lx1 = x0 + len / 8, lx2 = lx1 + len / 2;
    return '<svg class="schema" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Onde électromagnétique : le champ électrique E (vertical) et le champ magnétique B (horizontal, représenté en perspective) oscillent en phase et perpendiculairement à la direction de propagation. La distance entre deux crêtes est la longueur d’onde." xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="schema__bg" x="0" y="0" width="' + w + '" height="' + h + '" rx="14"/>' +
      '<line class="schema__axis" x1="' + x0 + '" y1="' + y0 + '" x2="' + (x0 + len + 30) + '" y2="' + y0 + '"/><path class="schema__axis" d="M' + (x0 + len + 22) + ' ' + (y0 - 6) + 'L' + (x0 + len + 30) + ' ' + y0 + 'L' + (x0 + len + 22) + ' ' + (y0 + 6) + '"/>' +
      vec + '<path class="schema__wave2" d="' + b + '"/><path class="schema__wave" d="' + e + '"/>' +
      '<line class="schema__lead" x1="' + lx1 + '" y1="' + (y0 - a - 14) + '" x2="' + lx2 + '" y2="' + (y0 - a - 14) + '"/>' +
      '<path class="schema__lead" d="M' + lx1 + ' ' + (y0 - a - 20) + 'v12M' + lx2 + ' ' + (y0 - a - 20) + 'v12"/>' +
      '<text class="schema__t" x="' + ((lx1 + lx2) / 2) + '" y="' + (y0 - a - 20) + '" text-anchor="middle">λ (longueur d’onde)</text>' +
      '<text class="schema__t schema__t--net" x="' + (x0 + 10) + '" y="' + (y0 - a + 10) + '">E</text>' +
      '<text class="schema__t schema__t--host" x="' + (x0 - 22) + '" y="' + (y0 + 40) + '">B</text>' +
      '<text class="schema__t schema__t--muted" x="' + (x0 + len + 28) + '" y="' + (h - 14) + '" text-anchor="end">direction de propagation, vitesse c →</text></svg>';
  }

  function spaceOptions(f, vf, title) {
    var l = W.wavelength(f, vf), xmax = 3 * W.wavelength(f, 1);
    return function () {
      return { kind: 'xy', title: title, desc: 'Champ électrique en fonction de la distance ; une période spatiale vaut ' + M.formatLength(l, 3) + '.',
        x: { min: 0, max: xmax, label: 'distance (m)' }, y: { min: -1.3, max: 1.3, ticks: [-1, 0, 1], label: 'champ E (normalisé)' },
        series: [{ samples: 600, fn: function (x) { return Math.sin(2 * Math.PI * x / l); } }],
        arrows: [{ x1: l / 4, x2: l / 4 + l, y: 1.15, label: 'λ = ' + M.formatLength(l, 3) }] };
    };
  }

  function compareOptions() {
    var f = 100e6, l0 = W.wavelength(f, 1), l1 = W.wavelength(f, 0.66);
    return { kind: 'xy', title: 'Une onde de 100 MHz dans l’air et dans un câble', desc: 'Même fréquence ; longueur d’onde de 3,00 m dans l’air et de 1,98 m dans le câble à polyéthylène.',
      x: { min: 0, max: 6, label: 'distance (m)' }, y: { min: -1.3, max: 1.3, ticks: [-1, 0, 1], label: 'champ (normalisé)' },
      series: [{ samples: 600, fn: function (x) { return Math.sin(2 * Math.PI * x / l0); } }, { samples: 600, cls: 'scope__trace scope__trace--alt', fn: function (x) { return Math.sin(2 * Math.PI * x / l1); } }],
      points: [{ x: l0 * 1.25, y: 1, label: 'air : λ = ' + M.formatLength(l0, 3) }, { x: l1 * 2.25, y: 1, cls: 'scope__point scope__point--alt', label: 'câble : λ = ' + M.formatLength(l1, 3) }] };
  }

  function spectrumOptions() {
    var marks = [[1e6, 'AM'], [100e6, 'FM'], [900e6, 'GSM'], [2.4e9, 'Wi-Fi'], [3.5e9, '5G'], [12e9, 'satellite']];
    return { kind: 'xy', title: 'Les bandes radio de l’UIT', desc: 'Échelle logarithmique de 3 kHz à 300 GHz découpée en bandes VLF, LF, MF, HF, VHF, UHF, SHF, EHF ; repères pour quelques usages.',
      x: { min: 3e3, max: 300e9, log: true, ticks: [1e4, 1e6, 1e8, 1e10], format: function (f) { return M.formatFrequency(f, 2); }, label: 'fréquence (échelle logarithmique)' },
      y: { min: 0, max: 1, ticks: [], label: '' },
      bands: W.BANDS.map(function (b) { return { x0: b.min, x1: b.max, label: b.id }; }),
      bars: marks.map(function (m) { return { x: m[0], y: 0.55, label: m[1] }; }) };
  }

  function inverseSquareOptions() {
    return { kind: 'xy', title: 'Densité de puissance à distance d’une antenne isotrope de 1 W', desc: 'La densité de puissance P/(4πd²) est divisée par 4 quand la distance double.',
      x: { min: 1, max: 10, label: 'distance d (m)' }, y: { min: 0, max: 0.09, ticks: [0, 0.02, 0.04, 0.06, 0.08], format: function (y) { return M.formatNumber(y * 1000, 3); }, label: 'densité (mW/m²)' },
      series: [{ samples: 300, fn: function (d) { return 1 / (4 * Math.PI * d * d); } }],
      points: [{ x: 2, y: 1 / (16 * Math.PI), label: 'd = 2 m : ' + fN(1000 / (16 * Math.PI), 3) + ' mW/m²' }, { x: 4, y: 1 / (64 * Math.PI), label: 'd = 4 m : ÷ 4' }] };
  }

  var figures = {
    em: { caption: 'Une onde électromagnétique : champs E et B perpendiculaires, en phase, se propageant à la vitesse de la lumière.', svg: emSvg },
    'space-fm': { caption: 'Instantané du champ d’une onde de 100 MHz dans l’air : la distance entre deux crêtes vaut λ ≈ 3 m.', options: spaceOptions(100e6, 1, 'Onde de 100 MHz dans l’air') },
    spectrum: { caption: 'Les bandes radio de l’UIT. Chaque bande couvre un facteur 10 en fréquence.', options: spectrumOptions },
    cable: { caption: 'Dans un câble, la fréquence reste la même mais l’onde va moins vite : sa longueur d’onde est plus courte.', options: compareOptions },
    inverse: { caption: 'Loin de l’antenne, la puissance se répartit sur une sphère de plus en plus grande : la densité décroît en 1/d².', options: inverseSquareOptions }
  };

  var chapters = [
    {
      id: 'c1', title: 'Qu’est-ce qu’une onde électromagnétique ?',
      summary: 'Champs électrique et magnétique ; propagation sans support ; vitesse de la lumière.',
      html: [
        '<p class="lead">La radio, la télévision, le Wi-Fi, les téléphones mobiles et la lumière elle-même transportent de l’énergie et de l’information grâce aux ondes électromagnétiques.</p>',
        '<h3>Définition</h3>',
        '<p>Une <strong>onde électromagnétique</strong> est l’association d’un <strong>champ électrique</strong> ' + v('E') + ' (en volts par mètre, V/m) et d’un <strong>champ magnétique</strong> ' + v('B') + ' (en teslas, T) qui oscillent ensemble et se propagent dans l’espace. Chacun entretient l’autre : un champ électrique qui varie crée un champ magnétique, et inversement.</p>',
        '<div data-fig="em"></div>',
        '<ul><li>' + v('E') + ' et ' + v('B') + ' sont <strong>perpendiculaires</strong> entre eux et à la direction de propagation : l’onde est <strong>transversale</strong>.</li>',
        '<li>Ils oscillent <strong>en phase</strong> ; dans le vide, ' + v('E') + ' = ' + v('c') + ' · ' + v('B') + '.</li>',
        '<li>La direction du champ ' + v('E') + ' définit la <strong>polarisation</strong> de l’onde (verticale, horizontale…). Elle compte pour l’orientation des antennes.</li></ul>',
        '<h3>Une onde qui n’a pas besoin de support</h3>',
        '<p>Contrairement au son, qui a besoin de l’air, l’onde électromagnétique se propage dans le <strong>vide</strong>. C’est ce qui permet de communiquer avec les satellites et les sondes spatiales.</p>',
        '<div class="formula">' + v('c') + ' = 299 792 458 m/s ≈ 3 × 10<sup>8</sup> m/s</div>',
        '<p>Dans le vide, toutes les ondes électromagnétiques vont à cette vitesse, quelle que soit leur fréquence. Dans l’air, la vitesse est inférieure d’environ 0,03 % : on la confond avec ' + v('c') + '.</p>',
        '<div class="callout callout--info"><strong>Comment naît une onde radio ?</strong> Un courant alternatif dans un conducteur (l’antenne) fait osciller des charges électriques. Ces charges en mouvement rayonnent une onde à la même fréquence que le courant. À la réception, l’onde fait à son tour osciller les charges d’une autre antenne : un petit courant apparaît, image du signal émis.</div>'
      ].join('')
    },
    {
      id: 'c2', title: 'Fréquence, période et longueur d’onde',
      summary: 'Relation λ = v/f ; double périodicité dans le temps et l’espace ; exemples guidés.',
      html: [
        '<p class="lead">Une onde est périodique deux fois : dans le temps (en un point donné) et dans l’espace (à un instant donné).</p>',
        '<h3>Deux périodes</h3>',
        '<ul><li><strong>Dans le temps</strong> : en un point fixe, le champ se répète toutes les ' + v('T') + ' secondes (la période). La fréquence vaut ' + v('f') + ' = 1/' + v('T') + ' (en hertz, Hz).</li>',
        '<li><strong>Dans l’espace</strong> : à un instant donné, le champ se répète tous les λ mètres. λ (lambda) est la <strong>longueur d’onde</strong>.</li></ul>',
        '<h3>La relation fondamentale</h3>',
        '<p>Pendant une période ' + v('T') + ', l’onde avance exactement d’une longueur d’onde :</p>',
        '<div class="formula">λ = ' + v('v') + ' × ' + v('T') + ' = ' + v('v') + ' / ' + v('f') + '&emsp;(λ en m, ' + v('v') + ' en m/s, ' + v('f') + ' en Hz)</div>',
        '<p>Dans le vide ou l’air, ' + v('v') + ' = ' + v('c') + '. Plus la fréquence est élevée, plus la longueur d’onde est courte : elles sont <strong>inversement proportionnelles</strong>.</p>',
        '<div data-fig="space-fm"></div>',
        '<h3>Exemple guidé : la radio FM</h3>',
        '<ol class="steps"><li>Donnée : ' + v('f') + ' = 100 MHz = 100 × 10<sup>6</sup> Hz = 10<sup>8</sup> Hz.</li>',
        '<li>Formule : λ = ' + v('c') + '/' + v('f') + ' = 3 × 10<sup>8</sup> / 10<sup>8</sup>.</li>',
        '<li>Résultat : λ ≈ <strong>3 m</strong> (valeur exacte avec ' + v('c') + ' = 299 792 458 m/s : ' + M.formatLength(W.wavelength(100e6, 1), 4) + ').</li></ol>',
        '<h3>Ordres de grandeur</h3>',
        '<div class="table-wrap"><table class="data-table"><caption>Longueurs d’onde dans l’air</caption><thead><tr><th scope="col">Usage</th><th scope="col">Fréquence</th><th scope="col">Longueur d’onde</th></tr></thead><tbody>' +
          [['Radio AM (ondes moyennes)', 1e6], ['Radio FM', 100e6], ['GSM', 900e6], ['Wi-Fi', 2.4e9], ['5G (bande 3,5 GHz)', 3.5e9], ['Wi-Fi 5 GHz', 5e9]].map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + M.formatFrequency(r[1]) + '</td><td>' + M.formatLength(W.wavelength(r[1], 1), 3) + '</td></tr>'; }).join('') +
        '</tbody></table></div>',
        '<p>Pour passer d’une longueur d’onde à une fréquence, on inverse la relation : ' + v('f') + ' = ' + v('c') + '/λ. Une onde de 30 cm a une fréquence de 3 × 10<sup>8</sup> / 0,3 = 1 GHz.</p>'
      ].join('')
    },
    {
      id: 'c3', title: 'Le spectre électromagnétique',
      summary: 'Des ondes radio aux rayons gamma ; bandes radio de l’UIT ; partage du spectre.',
      html: [
        '<p class="lead">Les ondes radio, la lumière visible et les rayons X sont de même nature : seule leur fréquence change.</p>',
        '<h3>Du radio aux rayons gamma</h3>',
        '<p>Par fréquence croissante : ondes <strong>radio</strong> (jusqu’à 300 GHz environ), <strong>infrarouge</strong>, <strong>lumière visible</strong> (de 400 à 800 nm de longueur d’onde environ), <strong>ultraviolet</strong>, <strong>rayons X</strong>, <strong>rayons gamma</strong>. Les télécommunications utilisent surtout les ondes radio et l’infrarouge proche (fibres optiques, vers 1 550 nm).</p>',
        '<h3>Les bandes radio</h3>',
        '<p>L’Union internationale des télécommunications (UIT) découpe les ondes radio en bandes qui couvrent chacune un facteur 10 en fréquence :</p>',
        '<div data-fig="spectrum"></div>',
        '<div class="table-wrap"><table class="data-table data-table--compact"><caption>Bandes de l’UIT</caption><thead><tr><th scope="col">Bande</th><th scope="col">Fréquences</th><th scope="col">Longueurs d’onde</th><th scope="col">Exemples d’usages</th></tr></thead><tbody>' +
          W.BANDS.map(function (b) { return '<tr><td><strong>' + b.id + '</strong></td><td>' + M.formatFrequency(b.min) + ' – ' + M.formatFrequency(b.max) + '</td><td>' + M.formatLength(W.wavelength(b.max, 1)) + ' – ' + M.formatLength(W.wavelength(b.min, 1)) + '</td><td>' + b.use + '</td></tr>'; }).join('') +
        '</tbody></table></div>',
        '<h3>Une ressource partagée</h3>',
        '<p>Deux émetteurs proches qui utilisent la même fréquence se brouillent. Le spectre est donc attribué par bandes, au niveau international (UIT) puis national (en France, l’ANFR et l’Arcep) : radio FM, télévision, opérateurs mobiles, radars, etc. Certaines bandes, comme 2,4 GHz et 5 GHz pour le Wi-Fi, sont libres d’accès sous condition de faible puissance.</p>',
        '<div class="callout callout--info"><strong>Basse ou haute fréquence ?</strong> Les basses fréquences contournent mieux les obstacles et portent plus loin, mais offrent peu de bande passante et demandent de grandes antennes. Les hautes fréquences permettent de hauts débits et de petites antennes, mais sont davantage arrêtées par les murs et la pluie. C’est un compromis permanent en télécommunications.</div>'
      ].join('')
    },
    {
      id: 'c4', title: 'Ondes guidées : câbles et facteur de vitesse',
      summary: 'Vitesse dans un milieu ; facteur de vitesse ; temps de propagation ; câbles quart d’onde.',
      html: [
        '<p class="lead">Une onde peut aussi être guidée par un câble. Elle y va moins vite que dans le vide.</p>',
        '<h3>Vitesse dans un milieu</h3>',
        '<p>Dans un isolant, l’onde est ralentie. On l’exprime par le <strong>facteur de vitesse</strong> ' + v('k') + ' (sans unité, entre 0 et 1) ou par l’indice ' + v('n') + ' du milieu :</p>',
        '<div class="formula">' + v('v') + ' = ' + v('k') + ' · ' + v('c') + ' = ' + v('c') + ' / ' + v('n') + '&emsp;et donc&emsp;λ<sub>câble</sub> = ' + v('k') + ' · λ<sub>air</sub></div>',
        '<ul><li>Câble coaxial à isolant polyéthylène plein : ' + v('k') + ' ≈ 0,66.</li><li>Câble coaxial à isolant en mousse : ' + v('k') + ' ≈ 0,8 à 0,88.</li><li>Fibre optique (verre, ' + v('n') + ' ≈ 1,47) : ' + v('v') + ' ≈ 204 000 km/s.</li></ul>',
        '<div data-fig="cable"></div>',
        '<p><strong>La fréquence ne change jamais</strong> en changeant de milieu : elle est imposée par l’émetteur. C’est la vitesse, et donc la longueur d’onde, qui changent.</p>',
        '<h3>Temps de propagation</h3>',
        '<div class="formula">' + v('t') + ' = ' + v('d') + ' / ' + v('v') + '</div>',
        '<p>Exemple : 100 m de câble à ' + v('k') + ' = 0,66 sont parcourus en ' + M.formatTime(W.travelTime(100, 0.66), 3) + '. Une liaison satellite géostationnaire (36 000 km de montée et autant de descente) ajoute environ ' + M.formatTime(W.travelTime(72e6, 1), 2) + ' de retard, ce qui se remarque dans une conversation.</p>',
        '<h3>Application : couper un câble à la bonne longueur</h3>',
        '<p>Certains montages utilisent un tronçon de câble d’un quart de longueur d’onde. À 100 MHz, λ/4 vaut 75 cm dans l’air, mais seulement 0,66 × 75 = <strong>49,5 cm</strong> dans un câble à polyéthylène. Oublier le facteur de vitesse rend le montage inefficace.</p>'
      ].join('')
    },
    {
      id: 'c5', title: 'Puissance, distance et synthèse',
      summary: 'Décroissance en 1/d² ; longueur d’onde et taille des antennes ; récapitulatif ; erreurs fréquentes.',
      html: [
        '<p class="lead">En s’éloignant de l’émetteur, l’onde s’affaiblit. Ce n’est pas une perte d’énergie : celle-ci se répartit sur une surface de plus en plus grande.</p>',
        '<h3>La décroissance en 1/d²</h3>',
        '<p>Une antenne idéale qui rayonne une puissance ' + v('P') + ' de la même façon dans toutes les directions (antenne <strong>isotrope</strong>) répartit cette puissance sur une sphère de surface 4π' + v('d') + '². La <strong>densité de puissance</strong> à la distance ' + v('d') + ' vaut :</p>',
        '<div class="formula">' + v('S') + ' = ' + v('P') + ' / (4π' + v('d') + '²)&emsp;(en W/m²)</div>',
        '<div data-fig="inverse"></div>',
        '<p>Doubler la distance divise la densité par 4 (−6 dB). Ce phénomène est à la base de l’affaiblissement en espace libre étudié dans le module « Propagation ».</p>',
        '<h3>Longueur d’onde et taille des antennes</h3>',
        '<p>Une antenne efficace a des dimensions comparables à la longueur d’onde. L’antenne <strong>demi-onde</strong> (longueur λ/2) est la référence : environ 1,5 m pour la radio FM, 16,7 cm pour le GSM à 900 MHz, 6,2 cm pour le Wi-Fi à 2,4 GHz. C’est pourquoi les téléphones peuvent intégrer leurs antennes, alors que les émetteurs grandes ondes utilisent des pylônes de plusieurs centaines de mètres.</p>',
        '<h3>Ce qu’il faut retenir</h3>',
        '<ul class="summary"><li>Une onde électromagnétique associe un champ ' + v('E') + ' et un champ ' + v('B') + ' perpendiculaires, en phase, transverses.</li>',
        '<li>Dans le vide : ' + v('c') + ' ≈ 3 × 10<sup>8</sup> m/s pour toutes les fréquences.</li>',
        '<li>λ = ' + v('v') + '/' + v('f') + ' ; dans un câble, ' + v('v') + ' = ' + v('k') + '·' + v('c') + ' et la fréquence ne change pas.</li>',
        '<li>Le spectre radio est découpé en bandes (VLF à EHF) et partagé entre les usages.</li>',
        '<li>La densité de puissance décroît en 1/' + v('d') + '² ; la taille d’une antenne suit la longueur d’onde.</li></ul>',
        '<h3>Erreurs fréquentes à éviter</h3>',
        '<ul class="pitfalls">',
        '<li><strong>Oublier de convertir les MHz ou GHz en Hz.</strong> 2,4 GHz = 2,4 × 10<sup>9</sup> Hz.</li>',
        '<li><strong>Croire que la fréquence change dans un câble.</strong> C’est la longueur d’onde qui change.</li>',
        '<li><strong>Penser que les ondes de haute fréquence vont plus vite.</strong> Dans le vide, toutes vont à ' + v('c') + '.</li>',
        '<li><strong>Confondre décroissance en 1/' + v('d') + ' et en 1/' + v('d') + '².</strong> C’est la puissance (ou sa densité) qui décroît en 1/' + v('d') + '² ; le champ ' + v('E') + ' décroît en 1/' + v('d') + '.</li>',
        '</ul>'
      ].join('')
    }
  ];

  TCL.lessons = TCL.lessons || {};
  TCL.lessons['ondes-em'] = {
    id: 'ondes-em', title: 'Ondes électromagnétiques',
    intro: 'Cette leçon présente la nature des ondes électromagnétiques, la relation entre fréquence et longueur d’onde, le spectre radio, la propagation dans les câbles et la décroissance de la puissance avec la distance.',
    objectives: [
      'Décrire une onde électromagnétique (champs E et B, propagation, polarisation).',
      'Calculer une longueur d’onde à partir d’une fréquence, et inversement.',
      'Situer une fréquence dans les bandes radio de l’UIT et citer des usages.',
      'Tenir compte du facteur de vitesse dans un câble et calculer un temps de propagation.',
      'Expliquer la décroissance en 1/d² et le lien entre longueur d’onde et taille des antennes.'
    ],
    prerequisites: 'Module « Comprendre les signaux » (fréquence, période) ; puissances de 10.',
    chapters: chapters, figures: figures
  };
})(window);
