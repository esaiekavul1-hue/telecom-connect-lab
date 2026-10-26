/*
 * TELECOM CONNECT LAB — Module « Modulation » : leçon
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var Mo = TCL.modMath, M = TCL.signalMath;
  function v(s) { return '<var>' + s + '</var>'; }
  function fN(x, s) { return M.formatNumber(x, s); }
  var ms = function (t) { return fN(t * 1000, 3); };

  function amOptions(m, title) {
    return function () {
      var fm = 1000, fc = 10000, T = 0.002;
      return { kind: 'xy', title: title, desc: 'Porteuse de 10 kHz modulée en amplitude par un message de 1 kHz, indice ' + fN(m) + '.',
        x: { min: 0, max: T, ticks: [0, 0.0005, 0.001, 0.0015, 0.002], format: ms, label: 'temps (ms)' }, y: { min: -2.8, max: 2.8, ticks: [-2, -1, 0, 1, 2], label: 'amplitude (V)' },
        series: [{ samples: 1200, fn: function (t) { return Mo.am(t, 1, m, fm, fc); } },
          { samples: 200, cls: 'scope__trace scope__trace--msg', fn: function (t) { return Mo.amEnvelope(t, 1, m, fm); } },
          { samples: 200, cls: 'scope__trace scope__trace--msg', fn: function (t) { return -Mo.amEnvelope(t, 1, m, fm); } }] };
    };
  }
  function amSpectrumOptions() {
    var r = Mo.amSpectrum(1, 0.5, 1000, 10000);
    return { kind: 'xy', title: 'Spectre d’un signal AM (m = 0,5)', desc: 'Raie de la porteuse à 10 kHz (1 V) et deux raies latérales à 9 et 11 kHz (0,25 V chacune). Bande occupée : 2 kHz.',
      x: { min: 7000, max: 13000, ticks: [8000, 9000, 10000, 11000, 12000], format: function (f) { return fN(f / 1000) + ' k'; }, label: 'fréquence (Hz)' }, y: { min: 0, max: 1.2, ticks: [0, 0.25, 0.5, 0.75, 1], label: 'amplitude (V)' },
      bars: r.map(function (b) { return { x: b.f, y: b.amp, label: fN(b.amp, 2) + ' V' }; }), arrows: [{ x1: 9000, x2: 11000, y: 1.1, label: 'B = 2 fm = 2 kHz' }] };
  }
  function fmOptions() {
    var fmod = 1000, fc = 10000, df = 4000, b = Mo.beta(df, fmod);
    return { kind: 'xy', title: 'Signal FM (Δf = 4 kHz, fm = 1 kHz)', desc: 'Amplitude constante ; les oscillations se resserrent quand le message est positif et s’espacent quand il est négatif.',
      x: { min: 0, max: 0.002, ticks: [0, 0.0005, 0.001, 0.0015, 0.002], format: ms, label: 'temps (ms)' }, y: { min: -1.6, max: 1.6, ticks: [-1, 0, 1], label: 'amplitude (V)' },
      series: [{ samples: 2000, fn: function (t) { return Mo.fm(t, 1, b, fmod, fc); } }, { samples: 200, cls: 'scope__trace scope__trace--msg', fn: function (t) { return 1.35 * Mo.message(t, fmod); } }] };
  }
  function fmSpectrumOptions() {
    var fmod = 1000, fc = 10000, b = 2, r = Mo.fmSpectrum(1, b, fmod, fc, 6), B = Mo.carson(b * fmod, fmod);
    return { kind: 'xy', title: 'Spectre FM pour β = 2', desc: 'Raies espacées de 1 kHz autour de 10 kHz, d’amplitudes |Jn(2)| ; la bande de Carson vaut 6 kHz.',
      x: { min: 3000, max: 17000, ticks: [4000, 7000, 10000, 13000, 16000], format: function (f) { return fN(f / 1000) + ' k'; }, label: 'fréquence (Hz)' }, y: { min: 0, max: 0.75, ticks: [0, 0.2, 0.4, 0.6], label: 'amplitude (V)' },
      bars: r.filter(function (x) { return x.amp > 0.005; }).map(function (x) { return { x: x.f, y: x.amp }; }), arrows: [{ x1: fc - B / 2, x2: fc + B / 2, y: 0.68, label: 'Carson : 2(Δf + fm) = ' + fN(B / 1000) + ' kHz' }] };
  }
  function digitalOptions(kind) {
    return function () {
      var bits = '1011', Rb = 1000, fc = 3000, df = 1000;
      return { kind: 'xy', title: kind + ' : bits 1011 à 1 kbit/s', desc: 'Modulation ' + kind + ' d’une porteuse de 3 kHz par la suite de bits 1, 0, 1, 1.',
        x: { min: 0, max: 0.004, ticks: [0, 0.001, 0.002, 0.003, 0.004], format: ms, label: 'temps (ms)' }, y: { min: -1.6, max: 1.6, ticks: [-1, 0, 1], label: 'amplitude' },
        series: [{ samples: 1200, fn: function (t) { return Mo.digital(kind, Math.min(t, 0.0039999), 1, bits, Rb, fc, df); } }],
        vlines: [1, 2, 3].map(function (k) { return { x: k / Rb, cls: 'scope__guide' }; }),
        points: bits.split('').map(function (c, i) { return { x: (i + 0.5) / Rb, y: 1.42, label: c, cls: 'scope__point scope__point--alt' }; }) };
    };
  }
  function constellationSvg() {
    var W = 600, H = 220, sets = [['BPSK', 1, [[-1, 0], [1, 0]]], ['QPSK', 2, [[1, 1], [-1, 1], [-1, -1], [1, -1]]], ['16-QAM', 4, (function () { var o = []; [-3, -1, 1, 3].forEach(function (i) { [-3, -1, 1, 3].forEach(function (q) { o.push([i / 3, q / 3]); }); }); return o; })()]];
    var out = ['<svg class="schema" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Constellations : BPSK, 2 points, 1 bit par symbole ; QPSK, 4 points, 2 bits ; 16-QAM, 16 points, 4 bits." xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="schema__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>');
    sets.forEach(function (st, k) {
      var cx = 100 + k * 200, cy = 100, R = 62;
      out.push('<line class="schema__axis" x1="' + (cx - R - 12) + '" y1="' + cy + '" x2="' + (cx + R + 12) + '" y2="' + cy + '"/><line class="schema__axis" x1="' + cx + '" y1="' + (cy - R - 12) + '" x2="' + cx + '" y2="' + (cy + R + 12) + '"/>');
      st[2].forEach(function (p) { var s = st[0] === 'QPSK' ? R / Math.SQRT2 : R; out.push('<circle class="schema__dot" cx="' + (cx + p[0] * s).toFixed(1) + '" cy="' + (cy - p[1] * s).toFixed(1) + '" r="5"/>'); });
      out.push('<text class="schema__t" x="' + cx + '" y="' + (H - 28) + '" text-anchor="middle">' + st[0] + '</text><text class="schema__t schema__t--muted" x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle">' + st[2].length + ' points · ' + st[1] + ' bit' + (st[1] > 1 ? 's' : '') + ' par symbole</text>');
    });
    out.push('</svg>');
    return out.join('');
  }

  var figures = {
    am: { caption: 'Modulation d’amplitude (m = 0,5) : l’enveloppe de la porteuse (en couleur) reproduit le message.', options: amOptions(0.5, 'Signal AM, m = 0,5') },
    over: { caption: 'Surmodulation (m = 1,5) : l’enveloppe se replie, un détecteur d’enveloppe restituerait un message déformé.', options: amOptions(1.5, 'Signal AM surmodulé, m = 1,5') },
    'am-spectrum': { caption: 'Spectre AM : la porteuse et deux raies latérales, à fc ± fm.', options: amSpectrumOptions },
    fm: { caption: 'Modulation de fréquence : l’amplitude reste constante, c’est la fréquence instantanée qui suit le message (courbe de couleur).', options: fmOptions },
    'fm-spectrum': { caption: 'Spectre FM : de nombreuses raies, dont l’essentiel de la puissance tient dans la bande de Carson.', options: fmSpectrumOptions },
    ask: { caption: 'ASK (modulation d’amplitude par tout ou rien) : porteuse présente pour « 1 », absente pour « 0 ».', options: digitalOptions('ASK') },
    fsk: { caption: 'FSK : deux fréquences, l’une pour « 1 », l’autre pour « 0 ».', options: digitalOptions('FSK') },
    psk: { caption: 'PSK (BPSK) : la phase de la porteuse s’inverse (0 ou 180°) selon le bit.', options: digitalOptions('PSK') },
    constellation: { caption: 'Constellations : chaque point est un symbole (une amplitude et une phase). Plus il y a de points, plus on transmet de bits par symbole, mais plus ils sont proches et sensibles au bruit.', svg: constellationSvg }
  };

  var chapters = [
    {
      id: 'c1', title: 'Pourquoi moduler ?',
      summary: 'Porteuse et message ; taille des antennes ; partage des fréquences ; les trois grandeurs modulables.',
      html: [
        '<p class="lead">Une voix ou une musique occupe des fréquences de quelques dizaines de hertz à quelques kilohertz. On ne peut pas l’envoyer telle quelle par radio : on la confie à une porteuse.</p>',
        '<h3>Le principe</h3>',
        '<p><strong>Moduler</strong>, c’est faire varier une caractéristique d’une onde sinusoïdale de haute fréquence, la <strong>porteuse</strong>, au rythme du signal à transmettre, le <strong>message</strong> (ou signal modulant). Le récepteur fait l’opération inverse : la <strong>démodulation</strong>.</p>',
        '<div class="formula">porteuse : ' + v('p') + '(' + v('t') + ') = ' + v('A') + '<sub>c</sub> cos(2π' + v('f') + '<sub>c</sub>' + v('t') + ' + φ)</div>',
        '<p>Trois grandeurs peuvent porter l’information : l’<strong>amplitude</strong> ' + v('A') + '<sub>c</sub> (AM, ASK), la <strong>fréquence</strong> ' + v('f') + '<sub>c</sub> (FM, FSK) et la <strong>phase</strong> φ (PM, PSK).</p>',
        '<h3>Trois raisons de moduler</h3>',
        '<ol class="steps"><li><strong>La taille des antennes.</strong> Une antenne efficace mesure environ λ/2. Pour un son de 1 kHz, λ = 300 km ! À 100 MHz, λ/2 = 1,5 m.</li>',
        '<li><strong>Le partage du spectre.</strong> Chaque station utilise sa propre porteuse : des centaines d’émissions coexistent sans se mélanger (multiplexage fréquentiel). Le récepteur choisit la sienne en accordant un filtre.</li>',
        '<li><strong>L’adaptation au canal.</strong> On place le signal dans une bande qui se propage bien et on choisit une modulation robuste au bruit.</li></ol>',
        '<div class="callout callout--info"><strong>Analogique ou numérique ?</strong> Une modulation <em>analogique</em> (AM, FM) transmet un message continu, comme la voix. Une modulation <em>numérique</em> (ASK, FSK, PSK, QAM) transmet une suite de bits : la porteuse ne prend qu’un nombre fini d’états. Le Wi-Fi, la 4G et la 5G n’utilisent que des modulations numériques.</div>'
      ].join('')
    },
    {
      id: 'c2', title: 'La modulation d’amplitude (AM)',
      summary: 'Expression ; indice de modulation ; surmodulation ; spectre ; bande passante ; rendement.',
      html: [
        '<p class="lead">En AM, l’amplitude de la porteuse suit le message : sa silhouette, l’enveloppe, dessine le signal à transmettre.</p>',
        '<h3>Expression</h3>',
        '<p>Pour un message sinusoïdal de fréquence ' + v('f') + '<sub>m</sub> :</p>',
        '<div class="formula">' + v('s') + '(' + v('t') + ') = ' + v('A') + '<sub>c</sub> [1 + ' + v('m') + ' cos(2π' + v('f') + '<sub>m</sub>' + v('t') + ')] cos(2π' + v('f') + '<sub>c</sub>' + v('t') + ')</div>',
        '<p>' + v('m') + ' est l’<strong>indice de modulation</strong> (ou taux, en %). On le mesure sur l’écran : ' + v('m') + ' = (' + v('A') + '<sub>max</sub> − ' + v('A') + '<sub>min</sub>) / (' + v('A') + '<sub>max</sub> + ' + v('A') + '<sub>min</sub>), où ' + v('A') + '<sub>max</sub> et ' + v('A') + '<sub>min</sub> sont les valeurs extrêmes de l’enveloppe.</p>',
        '<div data-fig="am"></div>',
        '<h3>La surmodulation</h3>',
        '<p>Si ' + v('m') + ' &gt; 1, l’enveloppe passe par zéro et se « replie » : le message est déformé à la réception. On garde donc ' + v('m') + ' ≤ 1 (100 %).</p>',
        '<div data-fig="over"></div>',
        '<h3>Spectre et bande passante</h3>',
        '<p>En développant le produit des cosinus, le signal AM contient trois fréquences : la porteuse ' + v('f') + '<sub>c</sub> (amplitude ' + v('A') + '<sub>c</sub>) et deux <strong>raies latérales</strong> à ' + v('f') + '<sub>c</sub> ± ' + v('f') + '<sub>m</sub> (amplitude ' + v('m') + v('A') + '<sub>c</sub>/2 chacune).</p>',
        '<div class="formula">' + v('B') + '<sub>AM</sub> = 2 ' + v('f') + '<sub>m,max</sub></div>',
        '<div data-fig="am-spectrum"></div>',
        '<p>Exemple : la radio AM limite le son à 4,5 kHz, d’où une bande de 9 kHz par station (l’espacement des canaux en Europe).</p>',
        '<h3>Le rendement</h3>',
        '<p>La porteuse ne transporte aucune information, mais elle consomme l’essentiel de la puissance. Le rendement vaut η = ' + v('m') + '² / (2 + ' + v('m') + '²) : au mieux <strong>' + fN(Mo.amEfficiency(1) * 100, 3) + ' %</strong> pour ' + v('m') + ' = 1, et seulement ' + fN(Mo.amEfficiency(0.5) * 100, 2) + ' % pour ' + v('m') + ' = 0,5. Des variantes (double bande sans porteuse, bande latérale unique BLU) suppriment ce gaspillage.</p>'
      ].join('')
    },
    {
      id: 'c3', title: 'Démoduler un signal AM',
      summary: 'Détecteur d’enveloppe ; conditions ; démodulation cohérente ; sensibilité au bruit.',
      html: [
        '<p class="lead">Le grand avantage de l’AM : un récepteur très simple suffit à retrouver le message.</p>',
        '<h3>Le détecteur d’enveloppe</h3>',
        '<ol class="steps"><li>Une <strong>diode</strong> ne laisse passer que les alternances positives du signal reçu (redressement).</li>',
        '<li>Un <strong>condensateur</strong> en parallèle avec une résistance se charge sur les crêtes et se décharge lentement : la tension suit l’enveloppe.</li>',
        '<li>Un condensateur de liaison retire la composante continue (' + v('A') + '<sub>c</sub>) : il reste le message ' + v('m') + v('A') + '<sub>c</sub> cos(2π' + v('f') + '<sub>m</sub>' + v('t') + ').</li></ol>',
        '<p>La constante de temps ' + v('R') + v('C') + ' doit être <strong>grande devant la période de la porteuse</strong> (pour lisser les oscillations) et <strong>petite devant la période du message</strong> (pour suivre ses variations) : 1/' + v('f') + '<sub>c</sub> ≪ ' + v('R') + v('C') + ' ≪ 1/' + v('f') + '<sub>m</sub>.</p>',
        '<p>Exemple : ' + v('f') + '<sub>c</sub> = 1 MHz, ' + v('f') + '<sub>m</sub> = 5 kHz : il faut 1 µs ≪ ' + v('R') + v('C') + ' ≪ 200 µs ; ' + v('R') + v('C') + ' ≈ 20 µs convient.</p>',
        '<h3>La démodulation cohérente</h3>',
        '<p>On peut aussi multiplier le signal reçu par une copie de la porteuse (même fréquence, même phase), puis filtrer les hautes fréquences. Cette méthode fonctionne même sans porteuse émise et même en surmodulation, mais elle exige de reconstituer la porteuse : elle est à la base des démodulateurs numériques.</p>',
        '<div class="callout callout--info"><strong>Le point faible de l’AM.</strong> Le bruit et les parasites (orages, moteurs) modifient l’amplitude du signal reçu. Ils s’ajoutent donc directement au message démodulé : c’est le grésillement typique de la radio AM.</div>'
      ].join('')
    },
    {
      id: 'c4', title: 'La modulation de fréquence (FM)',
      summary: 'Excursion de fréquence ; indice β ; fréquence instantanée ; spectre ; règle de Carson ; avantages.',
      html: [
        '<p class="lead">En FM, l’amplitude de la porteuse reste constante : c’est sa fréquence qui varie autour de ' + v('f') + '<sub>c</sub> au rythme du message.</p>',
        '<h3>Expression</h3>',
        '<div class="formula">' + v('f') + '<sub>i</sub>(' + v('t') + ') = ' + v('f') + '<sub>c</sub> + Δ' + v('f') + ' cos(2π' + v('f') + '<sub>m</sub>' + v('t') + ')&emsp;·&emsp;' + v('s') + '(' + v('t') + ') = ' + v('A') + '<sub>c</sub> cos(2π' + v('f') + '<sub>c</sub>' + v('t') + ' + β sin(2π' + v('f') + '<sub>m</sub>' + v('t') + '))</div>',
        '<ul><li>Δ' + v('f') + ' : l’<strong>excursion</strong> (ou déviation) de fréquence, proportionnelle à l’amplitude du message.</li><li>β = Δ' + v('f') + ' / ' + v('f') + '<sub>m</sub> : l’<strong>indice de modulation</strong> FM.</li></ul>',
        '<div data-fig="fm"></div>',
        '<h3>Le spectre et la règle de Carson</h3>',
        '<p>Le spectre FM contient une infinité de raies, espacées de ' + v('f') + '<sub>m</sub> autour de ' + v('f') + '<sub>c</sub>, d’amplitudes ' + v('A') + '<sub>c</sub>|J<sub>n</sub>(β)| (fonctions de Bessel). En pratique, environ 98 % de la puissance tient dans la bande de Carson :</p>',
        '<div class="formula">' + v('B') + '<sub>Carson</sub> ≈ 2 (Δ' + v('f') + ' + ' + v('f') + '<sub>m</sub>) = 2 ' + v('f') + '<sub>m</sub> (β + 1)</div>',
        '<div data-fig="fm-spectrum"></div>',
        '<p>Exemple : la radio FM utilise Δ' + v('f') + ' = 75 kHz et un son jusqu’à 15 kHz : ' + v('B') + ' ≈ 2 × (75 + 15) = <strong>' + fN(Mo.carson(75e3, 15e3) / 1000) + ' kHz</strong>, bien plus que les 9 kHz de l’AM. D’où les canaux FM espacés de 100 à 200 kHz dans la bande 87,5–108 MHz.</p>',
        '<h3>Pourquoi la FM sonne mieux</h3>',
        '<p>L’information est dans la fréquence, pas dans l’amplitude : le récepteur écrête l’amplitude (limiteur), ce qui élimine une grande partie du bruit. Le prix à payer est une bande passante plus large. C’est le compromis <strong>bande passante contre qualité</strong>, que l’on retrouve dans toutes les modulations.</p>'
      ].join('')
    },
    {
      id: 'c5', title: 'Introduction aux modulations numériques',
      summary: 'ASK, FSK, PSK ; débit et rapidité de modulation ; démodulation par décision ; constellations, QPSK, QAM.',
      html: [
        '<p class="lead">Pour transmettre des bits, la porteuse ne prend qu’un petit nombre d’états, chacun maintenu pendant une durée fixe : le temps d’un symbole.</p>',
        '<h3>Les trois modulations de base</h3>',
        '<div data-fig="ask"></div>',
        '<div data-fig="fsk"></div>',
        '<div data-fig="psk"></div>',
        '<ul><li><strong>ASK / OOK</strong> : très simple (télécommandes, fibre optique), mais sensible au bruit d’amplitude.</li>',
        '<li><strong>FSK</strong> : robuste et facile à démoduler (Bluetooth basse consommation, radio-étiquettes, anciens modems).</li>',
        '<li><strong>PSK</strong> : la plus résistante au bruit à puissance égale ; la BPSK (2 phases) est utilisée par le GPS et les liaisons spatiales.</li></ul>',
        '<h3>Débit et bande occupée</h3>',
        '<p>Si chaque bit dure ' + v('T') + '<sub>b</sub>, le débit vaut ' + v('D') + ' = 1/' + v('T') + '<sub>b</sub> (bit/s). En ASK et en BPSK, le lobe principal du spectre a une largeur d’environ <strong>2' + v('D') + '</strong> autour de la porteuse ; un filtrage soigné le réduit vers ' + v('D') + '.</p>',
        '<h3>Démoduler : comparer puis décider</h3>',
        '<p>Le récepteur multiplie le signal reçu par une copie de la porteuse et l’intègre sur la durée d’un bit (corrélation). Il obtient un nombre, puis décide : au-dessus du seuil → « 1 », en dessous → « 0 ». Le bruit déplace ce nombre : s’il franchit le seuil, le bit est faux. Le laboratoire montre ces valeurs bit par bit.</p>',
        '<h3>Plus de bits par symbole</h3>',
        '<p>En combinant amplitude et phase, un symbole peut prendre ' + v('M') + ' états et porter log<sub>2</sub>(' + v('M') + ') bits. On représente ces états par une <strong>constellation</strong> : chaque point est un couple (amplitude, phase).</p>',
        '<div data-fig="constellation"></div>',
        '<div class="formula">' + v('D') + ' = ' + v('R') + ' × log<sub>2</sub>(' + v('M') + ')&emsp;(' + v('R') + ' : rapidité de modulation, en symboles/s ou bauds)</div>',
        '<p>Exemple : 1 Msymbole/s en 16-QAM donne 4 Mbit/s. La 4G et la 5G adaptent la constellation à la qualité du signal, de QPSK (2 bits) au bord de la cellule à 256-QAM (8 bits) près de l’antenne.</p>'
      ].join('')
    },
    {
      id: 'c6', title: 'Comparaison et synthèse',
      summary: 'Tableau comparatif ; récapitulatif ; erreurs fréquentes.',
      html: [
        '<p class="lead">Chaque modulation est un compromis entre simplicité, bande passante et résistance au bruit.</p>',
        '<div class="table-wrap"><table class="data-table"><caption>Comparaison des modulations étudiées</caption><thead><tr><th scope="col">Modulation</th><th scope="col">Grandeur modulée</th><th scope="col">Bande occupée</th><th scope="col">Bruit</th><th scope="col">Usages</th></tr></thead><tbody>' +
          '<tr><td>AM</td><td>amplitude</td><td>2 ' + v('f') + '<sub>m</sub></td><td>sensible</td><td>radio GO/OM, aviation</td></tr>' +
          '<tr><td>FM</td><td>fréquence</td><td>2 (Δ' + v('f') + ' + ' + v('f') + '<sub>m</sub>)</td><td>robuste</td><td>radio FM, talkies-walkies</td></tr>' +
          '<tr><td>ASK</td><td>amplitude (bits)</td><td>≈ 2' + v('D') + '</td><td>sensible</td><td>télécommandes, optique</td></tr>' +
          '<tr><td>FSK</td><td>fréquence (bits)</td><td>≈ 2Δ' + v('f') + ' + 2' + v('D') + '</td><td>robuste</td><td>Bluetooth LE, RFID</td></tr>' +
          '<tr><td>PSK / QAM</td><td>phase (et amplitude)</td><td>≈ 2' + v('R') + '</td><td>selon ' + v('M') + '</td><td>Wi-Fi, 4G, 5G, satellite</td></tr>' +
        '</tbody></table></div>',
        '<h3>Ce qu’il faut retenir</h3>',
        '<ul class="summary"><li>Moduler, c’est faire varier l’amplitude, la fréquence ou la phase d’une porteuse au rythme du message.</li>',
        '<li>AM : ' + v('m') + ' = (' + v('A') + '<sub>max</sub> − ' + v('A') + '<sub>min</sub>)/(' + v('A') + '<sub>max</sub> + ' + v('A') + '<sub>min</sub>) ≤ 1 ; bande 2' + v('f') + '<sub>m</sub> ; démodulation par détecteur d’enveloppe.</li>',
        '<li>FM : β = Δ' + v('f') + '/' + v('f') + '<sub>m</sub> ; bande de Carson 2(Δ' + v('f') + ' + ' + v('f') + '<sub>m</sub>) ; meilleure résistance au bruit.</li>',
        '<li>Numérique : ASK, FSK, PSK ; décision bit par bit ; ' + v('D') + ' = ' + v('R') + ' log<sub>2</sub> ' + v('M') + '.</li></ul>',
        '<h3>Erreurs fréquentes à éviter</h3>',
        '<ul class="pitfalls">',
        '<li><strong>Confondre ' + v('f') + '<sub>m</sub> et ' + v('f') + '<sub>c</sub>.</strong> La porteuse est la haute fréquence ; le message est la basse fréquence.</li>',
        '<li><strong>Croire que la FM n’occupe que 2Δ' + v('f') + '.</strong> La règle de Carson ajoute 2' + v('f') + '<sub>m</sub>.</li>',
        '<li><strong>Confondre bit/s et bauds.</strong> Ils ne sont égaux que pour 1 bit par symbole.</li>',
        '<li><strong>Penser que plus de points est toujours mieux.</strong> Une constellation dense exige un excellent rapport signal sur bruit.</li>',
        '</ul>'
      ].join('')
    }
  ];

  TCL.lessons = TCL.lessons || {};
  TCL.lessons.modulation = {
    id: 'modulation', title: 'Modulation',
    intro: 'Cette leçon explique pourquoi et comment on module une porteuse, en analogique (AM, FM) puis en numérique (ASK, FSK, PSK), et comment le récepteur retrouve le message.',
    objectives: [
      'Expliquer le rôle de la porteuse et les raisons de moduler.',
      'Écrire un signal AM, mesurer son indice et calculer sa bande passante.',
      'Décrire le principe du détecteur d’enveloppe et ses conditions de fonctionnement.',
      'Calculer l’indice β et la bande de Carson d’un signal FM.',
      'Reconnaître les modulations ASK, FSK et PSK et relier débit, rapidité et nombre d’états.'
    ],
    prerequisites: 'Module « Comprendre les signaux » (amplitude, fréquence, phase, spectre).',
    chapters: chapters, figures: figures
  };
})(window);
