/*
 * TELECOM CONNECT LAB — Module « Chaîne de transmission » : leçon
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, C = TCL.chainMath;
  function v(s) { return '<var>' + s + '</var>'; }
  function sup(e) { return String(e).replace('-', '⁻').replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]; }); }

  function chainSchema() {
    var blocks = [['Source', 'message'], ['Codage de source', 'bits'], ['Codage de canal', 'redondance'], ['Modulateur', 'signal'], ['Canal', 'atténuation + bruit'], ['Démodulateur', 'décision'], ['Décodage', 'correction'], ['Destinataire', 'message']];
    var W = 920, H = 210, bw = 96, gap = (W - 40 - blocks.length * bw) / (blocks.length - 1);
    var out = ['<svg class="schema" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Schéma de la chaîne de transmission : source, codage de source, codage de canal, modulateur, canal avec bruit, démodulateur, décodage, destinataire." xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="schema__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>');
    out.push('<text class="schema__group" x="' + (20 + 2 * (bw + gap)) + '" y="34" text-anchor="middle">ÉMETTEUR</text><text class="schema__group" x="' + (20 + 5.5 * (bw + gap) + bw / 2) + '" y="34" text-anchor="middle">RÉCEPTEUR</text>');
    out.push('<path class="schema__brace" d="M20 44 H ' + (20 + 3 * (bw + gap) + bw) + '"/><path class="schema__brace" d="M' + (20 + 5 * (bw + gap)) + ' 44 H ' + (20 + 6 * (bw + gap) + bw) + '"/>');
    blocks.forEach(function (b, i) {
      var x = 20 + i * (bw + gap), y = 70, cls = i === 4 ? 'schema__block schema__block--channel' : (i === 0 || i === 7 ? 'schema__block schema__block--end' : 'schema__block');
      out.push('<rect class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y + '" width="' + bw + '" height="62" rx="10"/>');
      var words = b[0].split(' ');
      words = words.length > 2 ? [words[0] + ' ' + words[1], words.slice(2).join(' ')] : (words.length === 2 && b[0].length > 12 ? words : [b[0]]);
      words.forEach(function (wd, k) { out.push('<text class="schema__bt" x="' + (x + bw / 2).toFixed(1) + '" y="' + (y + 26 + k * 15 - (words.length - 1) * 7) + '" text-anchor="middle">' + wd + '</text>'); });
      out.push('<text class="schema__bs" x="' + (x + bw / 2).toFixed(1) + '" y="' + (y + 52) + '" text-anchor="middle">' + b[1] + '</text>');
      if (i < blocks.length - 1) { var ax = x + bw + 2, bx = x + bw + gap - 3; out.push('<path class="schema__arrow" d="M' + ax.toFixed(1) + ' 101 H' + bx.toFixed(1) + ' M' + (bx - 6).toFixed(1) + ' 96 L' + bx.toFixed(1) + ' 101 L' + (bx - 6).toFixed(1) + ' 106"/>'); }
    });
    var cx = 20 + 4 * (bw + gap) + bw / 2;
    out.push('<path class="schema__noise" d="M' + cx + ' 190 V 138 M' + (cx - 6) + ' 146 L' + cx + ' 136 L' + (cx + 6) + ' 146"/><text class="schema__t schema__t--alt" x="' + (cx + 10) + '" y="186">bruit</text>');
    out.push('</svg>');
    return out.join('');
  }

  function samplingOptions() {
    var f = 1000, fe = 8000;
    var pts = []; for (var k = 0; k * (1 / fe) <= 0.002 + 1e-12; k++) { var t = k / fe; pts.push({ x: t * 1000, y: Math.round(7 * Math.sin(2 * Math.PI * f * t)) / 7 }); }
    return { kind: 'xy', title: 'Échantillonnage et quantification', desc: 'Sinusoïde de 1 kHz échantillonnée à 8 kHz : 8 échantillons par période, chacun arrondi au niveau de quantification le plus proche.',
      x: { min: 0, max: 2, label: 'temps (ms)' }, y: { min: -1.3, max: 1.3, ticks: [-1, -0.5, 0, 0.5, 1], label: 'amplitude' },
      series: [{ samples: 400, cls: 'scope__trace scope__trace--ref', fn: function (x) { return Math.sin(2 * Math.PI * f * x / 1000); } }],
      bars: pts.map(function (p) { return { x: p.x, y: p.y, base: 0 }; }) };
  }

  function noisyOptions() {
    var t = C.transmit({ text: 'Hi', coding: 'none', pt: 10, att: 110, noise: -104, seed: 11, samplesPerBit: 16 }), pts = [];
    t.samples.forEach(function (row, i) { row.forEach(function (r, k) { pts.push({ x: i + (k + 0.5) / 16, y: r, cls: 'scope__sample' }); }); });
    return { kind: 'xy', title: 'Signal reçu avec du bruit', desc: 'Les 16 bits du mot « Hi » : signal émis en pointillés, échantillons reçus bruités autour de +1 et −1 (SNR 4 dB).',
      x: { min: 0, max: 16, ticks: [0, 4, 8, 12, 16], label: 'temps (en durées de bit)' }, y: { min: -4, max: 4, ticks: [-3, -2, -1, 0, 1, 2, 3], label: 'signal reçu' },
      series: [{ samples: 640, cls: 'scope__trace scope__trace--ref', fn: function (x) { return t.coded[Math.min(15, Math.floor(x))] === '1' ? 1 : -1; } }], dots: pts };
  }

  function berOptions() {
    return { kind: 'xy', title: 'Taux d’erreur binaire', desc: 'TEB théorique en fonction du SNR : environ 8 % à 0 dB, 10⁻³ à 6,8 dB, 10⁻⁵ à 9,6 dB sans codage ; courbe plus basse avec répétition.',
      x: { min: -2, max: 14, ticks: [-2, 0, 2, 4, 6, 8, 10, 12, 14], label: 'SNR (dB)' }, y: { min: 1e-7, max: 1, log: true, ticks: [1, 1e-2, 1e-4, 1e-6], format: function (x) { return x === 1 ? '1' : '10' + sup(Math.round(Math.log10(x))); }, label: 'TEB' },
      series: [{ samples: 200, fn: C.berUncoded }, { samples: 200, cls: 'scope__trace scope__trace--alt', fn: C.berRepetition }],
      points: [{ x: C.snrForBer(1e-3, 'none'), y: 1e-3, label: '10⁻³ à 6,8 dB' }] };
  }

  var figures = {
    chain: { caption: 'La chaîne de transmission : chaque bloc de l’émetteur a son « inverse » au récepteur.', svg: chainSchema },
    sampling: { caption: 'Un signal analogique (pointillés) est remplacé par des échantillons pris à intervalles réguliers, puis arrondis à un nombre fini de niveaux.', options: samplingOptions },
    noisy: { caption: 'Le signal émis (pointillés) arrive noyé dans le bruit. Le récepteur doit décider, pour chaque bit, si c’était +1 ou −1.', options: noisyOptions },
    ber: { caption: 'Taux d’erreur binaire théorique en fonction du SNR : sans codage (trait plein), avec répétition ×3 (tirets, à SNR égal par bit transmis).', legend: [['trace', 'sans codage'], ['alt', 'répétition ×3']], options: berOptions }
  };

  var chapters = [
    {
      id: 'c1', title: 'Vue d’ensemble de la chaîne',
      summary: 'Source, émetteur, canal, récepteur, destinataire : le rôle de chaque bloc.',
      html: [
        '<p class="lead">Téléphoner, envoyer un message, regarder une vidéo : chaque fois, l’information traverse une <strong>chaîne de transmission</strong>. Les mêmes grandes étapes se retrouvent dans tous les systèmes.</p>',
        '<div data-fig="chain"></div>',
        '<h3>Les blocs de la chaîne</h3>',
        '<ul><li><strong>Source</strong> : produit l’information (voix, texte, image, données).</li>',
        '<li><strong>Codage de source</strong> : représente l’information par des bits, si possible avec peu de bits (compression).</li>',
        '<li><strong>Codage de canal</strong> : ajoute des bits de contrôle pour détecter ou corriger les erreurs.</li>',
        '<li><strong>Modulateur et émetteur</strong> : transforment les bits en un signal adapté au support (câble, fibre, onde radio) et l’amplifient.</li>',
        '<li><strong>Canal</strong> : le support physique. Il <strong>atténue</strong> le signal et lui ajoute du <strong>bruit</strong> et des perturbations.</li>',
        '<li><strong>Récepteur et démodulateur</strong> : amplifient, filtrent et <strong>décident</strong> quels bits ont été émis.</li>',
        '<li><strong>Décodage de canal, puis de source</strong> : corrigent les erreurs possibles et reconstituent le message.</li>',
        '<li><strong>Destinataire</strong> : reçoit le message restitué.</li></ul>',
        '<h3>Exemple : un appel sur un téléphone mobile</h3>',
        '<ol class="steps"><li>Votre voix (source) est captée par le microphone.</li><li>Elle est numérisée et compressée (codage de source : quelques kbit/s).</li><li>Des bits de protection sont ajoutés (codage de canal).</li><li>Les bits modulent une porteuse radio (modulation), émise par l’antenne.</li><li>L’onde traverse l’air, s’atténue et se mélange au bruit (canal).</li><li>La station de base démodule, corrige les erreurs, puis le réseau achemine la voix jusqu’à votre correspondant.</li></ol>',
        '<div class="callout callout--info">Le but de toute la chaîne est que le message restitué soit <strong>identique</strong> au message émis, malgré un canal imparfait. On mesure sa qualité par le <strong>taux d’erreur binaire</strong> (TEB) : la proportion de bits faux.</div>'
      ].join('')
    },
    {
      id: 'c2', title: 'La source et le codage de source',
      summary: 'Échantillonnage, quantification, débit binaire ; codage d’un texte en ASCII.',
      html: [
        '<p class="lead">Avant d’être transmise numériquement, l’information doit devenir une suite de bits.</p>',
        '<h3>Numériser un signal analogique</h3>',
        '<p>Un son ou une image est un signal analogique. On le numérise en deux opérations :</p>',
        '<ol class="steps"><li><strong>Échantillonnage</strong> : on prélève sa valeur à intervalles réguliers, ' + v('f') + '<sub>e</sub> fois par seconde.</li><li><strong>Quantification</strong> : chaque échantillon est arrondi à l’un des 2<sup>' + v('n') + '</sup> niveaux possibles et codé sur ' + v('n') + ' bits.</li></ol>',
        '<div data-fig="sampling"></div>',
        '<p>Le <strong>théorème de Shannon–Nyquist</strong> impose d’échantillonner au moins deux fois plus vite que la fréquence la plus élevée du signal :</p>',
        '<div class="formula">' + v('f') + '<sub>e</sub> ≥ 2 ' + v('f') + '<sub>max</sub></div>',
        '<p>Le débit binaire produit vaut :</p>',
        '<div class="formula">' + v('D') + ' = ' + v('f') + '<sub>e</sub> × ' + v('n') + '&emsp;(bit/s)</div>',
        '<div class="table-wrap"><table class="data-table"><caption>Exemples</caption><thead><tr><th scope="col">Signal</th><th scope="col">' + v('f') + '<sub>e</sub></th><th scope="col">Bits par échantillon</th><th scope="col">Débit</th></tr></thead><tbody>',
        '<tr><td>Téléphone fixe classique (voix jusqu’à 3,4 kHz)</td><td>8 kHz</td><td>8</td><td>64 kbit/s</td></tr>',
        '<tr><td>CD audio (son jusqu’à 20 kHz), par voie</td><td>44,1 kHz</td><td>16</td><td>705,6 kbit/s</td></tr>',
        '</tbody></table></div>',
        '<h3>Coder un texte</h3>',
        '<p>Un texte se code caractère par caractère. Le code <strong>ASCII</strong> associe à chaque lettre, chiffre ou signe un nombre de 0 à 127, transmis sur un octet (8 bits). Par exemple, « A » = 65 = <span class="mono">01000001</span>. Les caractères accentués nécessitent un codage plus large (UTF-8).</p>',
        '<h3>La compression</h3>',
        '<p>Le codage de source cherche aussi à <strong>réduire le nombre de bits</strong> : un appel mobile compresse la voix de 64 kbit/s à quelques kbit/s (de 4 à 13 kbit/s environ, selon le codec). La compression peut être sans perte (fichiers ZIP) ou avec perte (MP3, JPEG, vidéo).</p>'
      ].join('')
    },
    {
      id: 'c3', title: 'Codage de canal et modulation',
      summary: 'Ajouter de la redondance pour corriger les erreurs ; transformer les bits en signal.',
      html: [
        '<p class="lead">Le canal introduit des erreurs. Le codage de canal ajoute des bits « de protection » qui permettent de les détecter, voire de les corriger.</p>',
        '<h3>Détecter : le bit de parité</h3>',
        '<p>On ajoute un bit pour que le nombre total de « 1 » soit pair. Si un bit est inversé pendant la transmission, la parité devient fausse : l’erreur est <strong>détectée</strong> (mais pas localisée).</p>',
        '<h3>Corriger : le code à répétition</h3>',
        '<p>Chaque bit est émis trois fois : 1 → 111, 0 → 000. Le récepteur décide à la <strong>majorité</strong> : s’il reçoit 101, il retient 1. Une erreur dans un groupe de trois est corrigée ; deux erreurs dans le même groupe donnent un bit faux.</p>',
        '<h3>Le rendement d’un code</h3>',
        '<p>Un code qui transforme ' + v('k') + ' bits d’information en ' + v('n') + ' bits transmis a un <strong>rendement</strong> R = ' + v('k') + '/' + v('n') + '. Le code à répétition a un rendement de 1/3 : pour le même débit transmis, le débit utile est divisé par 3. Les codes modernes (turbo-codes, LDPC, codes polaires de la 5G) corrigent beaucoup mieux avec un rendement souvent compris entre 1/3 et 9/10.</p>',
        '<h3>La modulation</h3>',
        '<p>Le modulateur associe un signal à chaque bit. Le plus simple : <strong>+A pour un « 1 » et −A pour un « 0 »</strong>, pendant la durée d’un bit ' + v('T') + '<sub>b</sub> = 1/' + v('R') + '<sub>b</sub>. Sur une porteuse radio, ce principe devient la <strong>PSK binaire</strong> : un « 0 » inverse la phase de la porteuse. Le module « Modulation et démodulation » détaille les modulations ASK, FSK et PSK.</p>',
        '<div class="callout callout--info">Le codage de canal et la modulation se choisissent ensemble : si le canal est bon, on transmet plus de bits par symbole et moins de redondance ; s’il se dégrade, on protège davantage. C’est l’<strong>adaptation de lien</strong> des réseaux 4G et 5G.</div>'
      ].join('')
    },
    {
      id: 'c4', title: 'Le canal : atténuation et bruit',
      summary: 'Puissance reçue, bruit thermique, rapport signal sur bruit (SNR).',
      html: [
        '<p class="lead">Le canal affaiblit le signal et lui ajoute du bruit. Ce qui compte pour le récepteur, c’est le rapport entre les deux.</p>',
        '<h3>L’atténuation</h3>',
        '<p>Entre l’émetteur et le récepteur, le signal perd de la puissance (distance, obstacles, câble). En décibels, la puissance reçue vaut :</p>',
        '<div class="formula">' + v('P') + '<sub>r</sub> (dBm) = ' + v('P') + '<sub>t</sub> (dBm) − ' + v('A') + ' (dB)</div>',
        '<p>Exemple : 10 dBm émis (10 mW) avec 110 dB d’atténuation donnent −100 dBm reçus, soit 0,1 picowatt.</p>',
        '<h3>Le bruit</h3>',
        '<p>Tout récepteur ajoute du bruit, en particulier le <strong>bruit thermique</strong> dû à l’agitation des électrons. Sa puissance est proportionnelle à la bande passante ' + v('B') + ' :</p>',
        '<div class="formula">' + v('N') + ' = ' + v('k') + ' ' + v('T') + ' ' + v('B') + '&emsp;soit&emsp;' + v('N') + ' (dBm) ≈ −174 + 10 log₁₀(' + v('B') + ' en Hz)</div>',
        '<p>Pour une bande de 1 MHz : N ≈ −174 + 60 = −114 dBm. Les composants du récepteur ajoutent quelques dB (le « facteur de bruit »).</p>',
        '<div data-fig="noisy"></div>',
        '<h3>Le rapport signal sur bruit</h3>',
        '<div class="formula">SNR (dB) = ' + v('P') + '<sub>r</sub> (dBm) − ' + v('N') + ' (dBm)</div>',
        '<p>Avec −100 dBm reçus et −106 dBm de bruit, SNR = 6 dB : le signal est environ 4 fois plus puissant que le bruit. Plus le SNR est élevé, plus les décisions du récepteur sont sûres.</p>'
      ].join('')
    },
    {
      id: 'c5', title: 'Décision, taux d’erreur et synthèse',
      summary: 'Filtre adapté, seuil de décision, TEB, capacité de Shannon ; résumé et erreurs fréquentes.',
      html: [
        '<p class="lead">À la réception, il faut décider, pour chaque bit, quelle valeur a été émise.</p>',
        '<h3>Filtrer puis décider</h3>',
        '<p>Le récepteur fait la <strong>moyenne du signal sur la durée de chaque bit</strong> (filtre adapté, ou « intégrer et vider ») : le bruit, aléatoire, se moyenne en grande partie, alors que le signal reste. Il compare ensuite le résultat à un <strong>seuil</strong> (0 pour un signal ±A) : au-dessus → « 1 », en dessous → « 0 ».</p>',
        '<h3>Le taux d’erreur binaire</h3>',
        '<p>Quand le bruit est assez fort pour faire passer la moyenne de l’autre côté du seuil, le bit est faux. Pour un bruit gaussien et un signal ±A :</p>',
        '<div class="formula">TEB = ' + v('Q') + '(√(2 · SNR))&emsp;(SNR en valeur linéaire)</div>',
        '<p>' + v('Q') + '(' + v('x') + ') est la probabilité qu’une variable gaussienne dépasse ' + v('x') + ' écarts types. Repères : TEB ≈ 8 % à 0 dB, 10⁻³ à 6,8 dB, 10⁻⁵ à 9,6 dB. Avec un TEB de 10⁻³ à 1 Mbit/s, il y a en moyenne 1 000 bits faux par seconde : d’où le codage de canal.</p>',
        '<div data-fig="ber"></div>',
        '<h3>La limite de Shannon</h3>',
        '<p>Claude Shannon a montré (1948) qu’il existe un débit maximal, la <strong>capacité</strong>, en dessous duquel on peut transmettre avec un taux d’erreur aussi petit qu’on veut grâce à un codage adapté :</p>',
        '<div class="formula">' + v('C') + ' = ' + v('B') + ' log₂(1 + SNR)&emsp;(bit/s)</div>',
        '<p>Exemple : B = 1 MHz et SNR = 15 (11,8 dB) donnent C = 10⁶ × log₂(16) = 4 Mbit/s. Aucun système ne peut dépasser cette limite ; les codes modernes s’en approchent.</p>',
        '<h3>Résumé</h3>',
        '<ul class="summary"><li>Chaîne : source → codage de source → codage de canal → modulation → canal → démodulation et décision → décodage → destinataire.</li>',
        '<li>Numérisation : ' + v('f') + '<sub>e</sub> ≥ 2 ' + v('f') + '<sub>max</sub>, débit D = ' + v('f') + '<sub>e</sub> × ' + v('n') + '.</li>',
        '<li>Le codage de canal ajoute de la redondance (rendement R = k/n) pour corriger des erreurs.</li>',
        '<li>SNR (dB) = Pr − N ; bruit thermique ≈ −174 dBm/Hz.</li>',
        '<li>TEB = Q(√(2·SNR)) pour un signal ±A ; capacité C = B log₂(1 + SNR).</li></ul>',
        '<h3>Erreurs fréquentes à éviter</h3>',
        '<ul class="pitfalls">',
        '<li><strong>Additionner des puissances en dBm.</strong> En décibels, on additionne des gains et on soustrait des pertes ; deux puissances en dBm ne s’additionnent pas directement.</li>',
        '<li><strong>Oublier la bande passante dans le bruit.</strong> −174 dBm est une densité (par hertz) : il faut ajouter 10 log₁₀(B).</li>',
        '<li><strong>Croire que le codage est gratuit.</strong> Il réduit le débit utile (rendement R < 1).</li>',
        '<li><strong>Confondre SNR en dB et SNR linéaire.</strong> Dans les formules Q(√(2·SNR)) et log₂(1 + SNR), le SNR est un rapport, pas des dB.</li>',
        '</ul>'
      ].join('')
    }
  ];

  TCL.lessons = TCL.lessons || {};
  TCL.lessons.chaine = {
    id: 'chaine', title: 'Chaîne de transmission',
    intro: 'Cette leçon suit l’information de la source au destinataire : numérisation, codage, modulation, canal bruité, décision et correction des erreurs. Elle donne les outils pour évaluer la qualité d’une transmission.',
    objectives: [
      'Nommer et expliquer chaque bloc d’une chaîne de transmission numérique.',
      'Calculer une fréquence d’échantillonnage minimale et un débit binaire.',
      'Coder un caractère en ASCII.',
      'Expliquer le rôle d’un code correcteur et calculer son rendement.',
      'Calculer un rapport signal sur bruit à partir d’un bilan de puissance et du bruit thermique.',
      'Interpréter un taux d’erreur binaire et la capacité de Shannon.'
    ],
    prerequisites: 'Notions de décibels (module « Propagation ») et de signal numérique (module « Comprendre les signaux »).',
    chapters: chapters, figures: figures
  };
})(window);
