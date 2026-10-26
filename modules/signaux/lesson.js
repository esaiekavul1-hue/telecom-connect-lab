/*
 * TELECOM CONNECT LAB — Module « Comprendre les signaux » : contenu de la leçon
 * ---------------------------------------------------------------------------
 * La leçon est découpée en chapitres. Chaque chapitre contient du HTML et des
 * figures (placeholders <div data-fig="…">) dessinées par core/plot.js à partir
 * de vrais calculs.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath;

  // Écriture des formules (variables en italique, comme dans un cours)
  function v(s) { return '<var>' + s + '</var>'; }
  var X_T = v('x') + '(' + v('t') + ')';
  var MODEL = X_T + ' = ' + v('A') + ' · sin(2π' + v('f') + v('t') + ' + ' + v('φ') + ')';

  var figures = {
    'analog': {
      caption: 'Un signal analogique quelconque : sa valeur varie de façon continue dans le temps.',
      options: function () {
        return {
          tWindow: 0.02, yMax: 5, yStep: 1,
          title: 'Exemple de signal analogique',
          desc: 'Courbe irrégulière mais continue, comprise entre environ −3,5 V et +3,5 V, sur 20 millisecondes.',
          series: [{ samples: 800, fn: function (t) { return 2 * Math.sin(2 * Math.PI * 100 * t) + 1.1 * Math.sin(2 * Math.PI * 300 * t + 1) + 0.6 * Math.sin(2 * Math.PI * 50 * t); } }]
        };
      }
    },
    'digital': {
      caption: 'Un signal numérique ne prend que quelques niveaux (ici 0 V et 4 V pour les bits 0 et 1).',
      options: function () {
        var bits = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1];
        return {
          tWindow: 0.01, yMax: 5, yStep: 1,
          title: 'Exemple de signal numérique',
          desc: 'Signal en créneaux qui alterne entre 0 V et 4 V selon la suite de bits 1 0 1 1 0 0 1 0 1 1, sur 10 millisecondes.',
          series: [{ samples: 2000, cls: 'scope__trace scope__trace--alt', fn: function (t) { var i = Math.min(bits.length - 1, Math.floor(t / 0.001)); return bits[i] * 4; } }]
        };
      }
    },
    'model': {
      caption: 'x(t) = 4 · sin(2π · 100 · t) : amplitude 4 V, fréquence 100 Hz, donc période 10 ms.',
      options: function () {
        return TCL.plot.sineOptions({ A: 4, f: 100, phi: 0, win: 0.02, showPeriod: true, ampMarker: true,
          title: 'Sinusoïde de référence du cours' });
      }
    },
    'amplitude': {
      caption: 'Même fréquence (100 Hz), amplitudes différentes : 6 V (trait plein) et 3 V (tirets). Les crêtes arrivent aux mêmes instants.',
      legend: [['trace', 'A = 6 V'], ['alt', 'A = 3 V']],
      options: function () {
        var o = TCL.plot.sineOptions({ A: 6, f: 100, phi: 0, win: 0.02, ampMarker: true, peakToPeak: true,
          extra: [{ cls: 'scope__trace scope__trace--alt', samples: 600, fn: function (t) { return M.value(3, 100, 0, t); } }],
          title: 'Deux sinusoïdes de même fréquence et d’amplitudes différentes',
          desc: 'Sinusoïde de 6 V d’amplitude (12 V crête à crête) et sinusoïde de 3 V d’amplitude, toutes deux à 100 Hz, sur 20 ms.' });
        return o;
      }
    },
    'frequency': {
      caption: 'Même amplitude (4 V) : 100 Hz (trait plein, T = 10 ms) et 200 Hz (tirets, T = 5 ms). Doubler la fréquence divise la période par deux.',
      legend: [['trace', 'f = 100 Hz'], ['alt', 'f = 200 Hz']],
      options: function () {
        return TCL.plot.sineOptions({ A: 4, f: 100, phi: 0, win: 0.02, showPeriod: true,
          extra: [{ cls: 'scope__trace scope__trace--alt', samples: 600, fn: function (t) { return M.value(4, 200, 0, t); } }],
          title: 'Deux sinusoïdes de même amplitude et de fréquences différentes',
          desc: 'Sinusoïde à 100 Hz (deux périodes visibles) et sinusoïde à 200 Hz (quatre périodes visibles) sur 20 ms.' });
      }
    },
    'phase': {
      caption: 'f = 50 Hz. La courbe pleine (φ = π/2) est en avance de 5 ms, soit un quart de période, sur la référence en pointillés (φ = 0).',
      legend: [['trace', 'φ = π/2 rad'], ['ref', 'référence φ = 0']],
      options: function () {
        return TCL.plot.sineOptions({ A: 4, f: 50, phi: Math.PI / 2, win: 0.04, reference: { A: 4 }, showShift: true,
          title: 'Effet de la phase : décalage horizontal',
          desc: 'Deux sinusoïdes de 4 V à 50 Hz ; celle de phase π/2 atteint sa crête 5 ms avant la référence de phase nulle.' });
      }
    },
    'reading': {
      caption: 'Graphique d’entraînement : lisez A et T, puis calculez f.',
      options: function () {
        return TCL.plot.sineOptions({ A: 3, f: 250, phi: 0, win: 0.01, yMax: 5, yStep: 1,
          title: 'Graphique d’entraînement à la lecture',
          desc: 'Sinusoïde qui monte jusqu’à +3 V et descend jusqu’à −3 V ; deux crêtes successives sont séparées de 4 ms ; 2,5 périodes sont visibles sur 10 ms.' });
      }
    }
  };

  var chapters = [
    {
      id: 'c1',
      title: 'Qu’est-ce qu’un signal ?',
      summary: 'Signal, information, signal analogique et représentation temporelle.',
      html: [
        '<p class="lead">En télécommunications, on transporte de l’information d’un point à un autre : une voix, une image, des données. Cette information voyage sous la forme d’un <strong>signal</strong>.</p>',
        '<h3>Définition</h3>',
        '<p>Un <strong>signal</strong> est une grandeur physique qui varie, le plus souvent dans le temps, et dont les variations portent une information.</p>',
        '<ul class="examples">',
        '<li><strong>Tension électrique</strong> à la sortie d’un microphone (en volts, V) : elle suit les vibrations de la voix.</li>',
        '<li><strong>Puissance lumineuse</strong> dans une fibre optique : la lumière est allumée, éteinte ou modulée.</li>',
        '<li><strong>Champ électrique</strong> d’une onde radio émise par une antenne.</li>',
        '</ul>',
        '<h3>Signal analogique et signal numérique</h3>',
        '<p>Un signal <strong>analogique</strong> varie de façon continue : entre deux valeurs, il peut prendre toutes les valeurs intermédiaires. Un signal <strong>numérique</strong> ne prend qu’un petit nombre de niveaux, qui représentent des symboles (par exemple les bits 0 et 1).</p>',
        '<div class="fig-pair"><div data-fig="analog"></div><div data-fig="digital"></div></div>',
        '<h3>La représentation temporelle</h3>',
        '<p>Pour étudier un signal, on trace sa <strong>valeur instantanée</strong> en fonction du temps. On note ' + X_T + ' la valeur du signal à l’instant ' + v('t') + '.</p>',
        '<ul><li>L’axe horizontal représente le <strong>temps</strong> ' + v('t') + ', en secondes (s) ou en millisecondes (ms).</li>',
        '<li>L’axe vertical représente la <strong>valeur</strong> du signal, par exemple une tension en volts (V).</li></ul>',
        '<p>C’est exactement ce qu’affiche un oscilloscope, l’appareil de mesure utilisé en laboratoire. Les graphiques de cette plateforme reprennent volontairement son apparence.</p>',
        '<div class="callout callout--info"><strong>Pourquoi étudier la sinusoïde ?</strong> Le signal sinusoïdal est le signal périodique le plus simple. C’est aussi la brique de base des télécommunications : une onde porteuse radio est une sinusoïde, et l’analyse de Fourier montre qu’un signal périodique peut être décrit comme une somme de sinusoïdes. Le reste de cette leçon porte sur lui.</div>'
      ].join('')
    },
    {
      id: 'c2',
      title: 'Le modèle du signal sinusoïdal',
      summary: 'La formule x(t) = A sin(2πft + φ), ses symboles et ses unités.',
      html: [
        '<p class="lead">Un signal sinusoïdal idéal est décrit par une seule formule. Savoir la lire, c’est savoir décrire complètement le signal.</p>',
        '<div class="formula" role="math" aria-label="x de t égale A fois sinus de deux pi f t plus phi">' + MODEL + '</div>',
        '<div class="table-wrap"><table class="data-table"><caption>Symboles du modèle</caption>',
        '<thead><tr><th scope="col">Symbole</th><th scope="col">Nom</th><th scope="col">Unité</th><th scope="col">Rôle</th></tr></thead><tbody>',
        '<tr><td>' + X_T + '</td><td>Valeur instantanée</td><td>celle du signal (ici V)</td><td>Valeur du signal à l’instant ' + v('t') + '.</td></tr>',
        '<tr><td>' + v('A') + '</td><td>Amplitude</td><td>V (pour une tension)</td><td>Valeur maximale atteinte : le signal varie entre −' + v('A') + ' et +' + v('A') + '.</td></tr>',
        '<tr><td>' + v('f') + '</td><td>Fréquence</td><td>hertz (Hz)</td><td>Nombre de cycles complets par seconde.</td></tr>',
        '<tr><td>' + v('t') + '</td><td>Temps</td><td>seconde (s)</td><td>Instant auquel on calcule la valeur.</td></tr>',
        '<tr><td>' + v('φ') + '</td><td>Phase à l’origine</td><td>radian (rad)</td><td>Position du signal dans son cycle à l’instant ' + v('t') + ' = 0.</td></tr>',
        '<tr><td>' + v('T') + ' = 1/' + v('f') + '</td><td>Période</td><td>seconde (s)</td><td>Durée d’un cycle complet (définie lorsque ' + v('f') + ' &gt; 0).</td></tr>',
        '<tr><td>' + v('ω') + ' = 2π' + v('f') + '</td><td>Pulsation</td><td>rad/s</td><td>Vitesse de rotation de l’angle 2π' + v('f') + v('t') + ' + ' + v('φ') + '.</td></tr>',
        '</tbody></table></div>',
        '<div data-fig="model"></div>',
        '<h3>Exemple guidé</h3>',
        '<p>Soit le signal ' + X_T + ' = 4 · sin(2π · 100 · ' + v('t') + ').</p>',
        '<ol class="steps"><li>Le nombre devant le sinus est l’amplitude : <strong>' + v('A') + ' = 4 V</strong>.</li>',
        '<li>Le nombre qui multiplie 2π' + v('t') + ' est la fréquence : <strong>' + v('f') + ' = 100 Hz</strong>.</li>',
        '<li>Il n’y a rien après le produit : <strong>' + v('φ') + ' = 0 rad</strong>.</li>',
        '<li>La période vaut ' + v('T') + ' = 1/' + v('f') + ' = 1/100 = 0,01 s = <strong>10 ms</strong>.</li></ol>',
        '<div class="callout callout--warn"><strong>Attention au mode de la calculatrice.</strong> Dans la formule, l’angle 2π' + v('f') + v('t') + ' + ' + v('φ') + ' est en <strong>radians</strong>. Si votre calculatrice est en degrés, tous vos calculs de ' + X_T + ' seront faux.</div>'
      ].join('')
    },
    {
      id: 'c3',
      title: 'L’amplitude',
      summary: 'Valeur maximale, valeur crête à crête et valeur efficace.',
      html: [
        '<p class="lead">L’amplitude ' + v('A') + ' indique « jusqu’où monte » le signal. Elle se lit verticalement sur le graphique.</p>',
        '<h3>Définitions</h3>',
        '<ul><li><strong>Amplitude</strong> ' + v('A') + ' (ou valeur crête) : écart entre la valeur 0 et la crête. Le signal varie entre −' + v('A') + ' et +' + v('A') + '.</li>',
        '<li><strong>Valeur crête à crête</strong> : écart entre la crête haute et la crête basse, égal à 2' + v('A') + '.</li>',
        '<li><strong>Valeur efficace</strong> d’une sinusoïde : ' + v('A') + '/√2 ≈ 0,707 × ' + v('A') + '. C’est celle qu’affichent les voltmètres en mode alternatif.</li></ul>',
        '<div data-fig="amplitude"></div>',
        '<h3>Exemples concrets</h3>',
        '<ul class="examples"><li>Une sinusoïde de 6 V d’amplitude a une valeur crête à crête de 12 V.</li>',
        '<li>Une tension alternative de 230 V efficaces a une amplitude d’environ 230 × √2 ≈ 325 V.</li></ul>',
        '<h3>Ce que l’amplitude change… et ce qu’elle ne change pas</h3>',
        '<p>' + v('A') + ' multiplie la fonction sinus <em>de l’extérieur</em>. Elle étire donc la courbe verticalement, mais ne modifie pas l’angle 2π' + v('f') + v('t') + ' + ' + v('φ') + ' à l’intérieur du sinus. Résultat : la fréquence, la période et la position des crêtes dans le temps restent identiques.</p>',
        '<div class="callout callout--info">En télécommunications, l’amplitude est liée à la <strong>puissance</strong> du signal. Un signal reçu de trop faible amplitude se confond avec le bruit ; c’est l’une des raisons pour lesquelles on amplifie les signaux.</div>'
      ].join('')
    },
    {
      id: 'c4',
      title: 'Fréquence et période',
      summary: 'T = 1/f, les unités Hz, kHz, MHz, GHz et les conversions.',
      html: [
        '<p class="lead">La période et la fréquence décrivent le même phénomène vu de deux façons : combien de temps dure un cycle, et combien de cycles se produisent chaque seconde.</p>',
        '<h3>Définitions</h3>',
        '<ul><li>La <strong>période</strong> ' + v('T') + ' est la durée d’un cycle complet. Elle se mesure en secondes (s).</li>',
        '<li>La <strong>fréquence</strong> ' + v('f') + ' est le nombre de cycles par seconde. Elle se mesure en hertz (Hz) : 1 Hz = 1 cycle par seconde.</li></ul>',
        '<div class="formula">' + v('T') + ' = 1 / ' + v('f') + '&emsp;&emsp;et&emsp;&emsp;' + v('f') + ' = 1 / ' + v('T') + '</div>',
        '<p>Ces deux grandeurs sont <strong>inverses</strong> : si la fréquence double, la période est divisée par deux.</p>',
        '<div data-fig="frequency"></div>',
        '<h3>Les unités et leurs conversions</h3>',
        '<div class="table-wrap"><table class="data-table"><caption>Multiples du hertz et périodes correspondantes</caption>',
        '<thead><tr><th scope="col">Unité</th><th scope="col">Valeur</th><th scope="col">Période associée</th></tr></thead><tbody>',
        '<tr><td>1 Hz</td><td>1 cycle par seconde</td><td>1 s</td></tr>',
        '<tr><td>1 kHz (kilohertz)</td><td>1 000 Hz</td><td>1 ms (10<sup>−3</sup> s)</td></tr>',
        '<tr><td>1 MHz (mégahertz)</td><td>1 000 000 Hz</td><td>1 µs (10<sup>−6</sup> s)</td></tr>',
        '<tr><td>1 GHz (gigahertz)</td><td>1 000 000 000 Hz</td><td>1 ns (10<sup>−9</sup> s)</td></tr>',
        '</tbody></table></div>',
        '<p>Pour convertir des hertz en kilohertz, on <strong>divise par 1 000</strong> : 2 450 Hz = 2,45 kHz. Pour passer des kilohertz aux hertz, on <strong>multiplie par 1 000</strong> : 0,8 kHz = 800 Hz.</p>',
        '<h3>Exemples concrets</h3>',
        '<div class="table-wrap"><table class="data-table"><caption>Quelques fréquences courantes</caption>',
        '<thead><tr><th scope="col">Signal</th><th scope="col">Fréquence</th><th scope="col">Période</th></tr></thead><tbody>',
        '<tr><td>Réseau électrique (la plupart des pays d’Afrique et d’Europe)</td><td>50 Hz</td><td>' + M.formatTime(M.period(50)) + '</td></tr>',
        '<tr><td>Note « la » du diapason</td><td>440 Hz</td><td>≈ ' + M.formatTime(M.period(440), 3) + '</td></tr>',
        '<tr><td>Station de radio FM</td><td>≈ 100 MHz</td><td>' + M.formatTime(M.period(100e6)) + '</td></tr>',
        '<tr><td>Wi-Fi (bande 2,4 GHz)</td><td>2,4 GHz</td><td>≈ ' + M.formatTime(M.period(2.4e9), 3) + '</td></tr>',
        '</tbody></table></div>',
        '<h3>Méthode de calcul</h3>',
        '<ol class="steps"><li>Convertissez la donnée en unité de base : fréquence en Hz, période en s.</li>',
        '<li>Appliquez ' + v('T') + ' = 1/' + v('f') + ' ou ' + v('f') + ' = 1/' + v('T') + '.</li>',
        '<li>Exprimez le résultat dans l’unité la plus lisible (ms, µs, kHz…).</li></ol>',
        '<p>Exemple : ' + v('T') + ' = 2,5 ms = 0,0025 s, donc ' + v('f') + ' = 1/0,0025 = <strong>400 Hz</strong>.</p>'
      ].join('')
    },
    {
      id: 'c5',
      title: 'La phase',
      summary: 'Phase à l’origine, radians et degrés, avance et retard.',
      html: [
        '<p class="lead">Deux sinusoïdes peuvent avoir la même amplitude et la même fréquence, mais ne pas atteindre leurs crêtes au même instant. C’est la <strong>phase</strong> qui fait la différence.</p>',
        '<h3>Définition</h3>',
        '<p>La phase à l’origine ' + v('φ') + ' indique où en est le signal dans son cycle à l’instant ' + v('t') + ' = 0. En effet, ' + v('x') + '(0) = ' + v('A') + ' · sin(' + v('φ') + ').</p>',
        '<ul><li>' + v('φ') + ' = 0 : le signal part de 0 en montant.</li>',
        '<li>' + v('φ') + ' = π/2 : le signal part de sa crête +' + v('A') + ' (c’est un cosinus).</li>',
        '<li>' + v('φ') + ' = π : le signal part de 0 en descendant ; il est inversé par rapport à ' + v('φ') + ' = 0 (opposition de phase).</li></ul>',
        '<h3>Radians et degrés</h3>',
        '<p>Un cycle complet correspond à 2π rad, soit 360°. Pour convertir : ' + v('φ') + ' (rad) = ' + v('φ') + ' (°) × π / 180. Ainsi 90° = π/2 rad ≈ 1,571 rad et 180° = π rad.</p>',
        '<h3>La phase décale le signal dans le temps</h3>',
        '<p>On peut réécrire le modèle sous la forme ' + v('A') + ' · sin(2π' + v('f') + '(' + v('t') + ' + Δ' + v('t') + ')), avec :</p>',
        '<div class="formula">Δ' + v('t') + ' = ' + v('φ') + ' / (2π' + v('f') + ') = (' + v('φ') + ' / 2π) × ' + v('T') + '</div>',
        '<ul><li>' + v('φ') + ' &gt; 0 : la courbe est décalée <strong>vers la gauche</strong> ; le signal est <strong>en avance</strong> de Δ' + v('t') + '.</li>',
        '<li>' + v('φ') + ' &lt; 0 : la courbe est décalée <strong>vers la droite</strong> ; le signal est <strong>en retard</strong>.</li></ul>',
        '<div data-fig="phase"></div>',
        '<p>Exemple : à 50 Hz, ' + v('T') + ' = 20 ms. Une phase de π/2 représente un quart de cycle (π/2 ÷ 2π = 1/4), donc Δ' + v('t') + ' = 20 / 4 = <strong>5 ms d’avance</strong>.</p>',
        '<div class="callout callout--info">La phase n’a de sens que par rapport à une référence (l’instant ' + v('t') + ' = 0 ou un autre signal). En télécommunications, on compare très souvent la phase de deux signaux : certaines modulations transmettent l’information justement dans la phase.</div>'
      ].join('')
    },
    {
      id: 'c6',
      title: 'Lire un graphique et synthèse',
      summary: 'Méthode de lecture, influence des paramètres, limites du modèle, erreurs fréquentes.',
      html: [
        '<p class="lead">Sur un oscilloscope comme dans un sujet d’examen, il faut savoir retrouver les paramètres d’un signal à partir de sa courbe.</p>',
        '<h3>Méthode de lecture</h3>',
        '<ol class="steps"><li>Repérez les <strong>unités des axes</strong> (V ? ms ? µs ?) et la valeur d’une graduation.</li>',
        '<li>Lisez la <strong>valeur maximale</strong> atteinte : c’est l’amplitude ' + v('A') + ' (et non l’écart entre les deux crêtes).</li>',
        '<li>Mesurez la durée entre <strong>deux crêtes successives</strong> (ou deux passages par 0 en montant) : c’est la période ' + v('T') + '.</li>',
        '<li>Calculez la <strong>fréquence</strong> ' + v('f') + ' = 1/' + v('T') + ' après avoir converti ' + v('T') + ' en secondes.</li>',
        '<li>Observez la valeur à ' + v('t') + ' = 0 pour estimer la <strong>phase</strong> : ' + v('x') + '(0) = ' + v('A') + ' sin(' + v('φ') + ').</li></ol>',
        '<div data-fig="reading"></div>',
        '<details class="reveal"><summary>Voir la correction</summary>',
        '<p>La courbe monte jusqu’à +3 V : ' + v('A') + ' = 3 V. Deux crêtes successives sont à 1 ms et 5 ms : ' + v('T') + ' = 4 ms = 0,004 s. Donc ' + v('f') + ' = 1/0,004 = 250 Hz. À ' + v('t') + ' = 0, la valeur est 0 et elle augmente : ' + v('φ') + ' = 0.</p></details>',
        '<h3>Influence de chaque paramètre</h3>',
        '<div class="table-wrap"><table class="data-table"><caption>Ce que change chaque paramètre</caption>',
        '<thead><tr><th scope="col">Si l’on augmente…</th><th scope="col">Ce qui change</th><th scope="col">Ce qui ne change pas</th></tr></thead><tbody>',
        '<tr><td>' + v('A') + ' (amplitude)</td><td>Hauteur des crêtes, valeur crête à crête</td><td>Fréquence, période, position des crêtes dans le temps</td></tr>',
        '<tr><td>' + v('f') + ' (fréquence)</td><td>La période diminue : les cycles sont plus serrés</td><td>Hauteur des crêtes</td></tr>',
        '<tr><td>' + v('φ') + ' (phase)</td><td>La courbe glisse horizontalement (avance)</td><td>Forme, amplitude, fréquence, période</td></tr>',
        '</tbody></table></div>',
        '<h3>Modèle idéal et signaux réels</h3>',
        '<p>Le modèle ' + MODEL + ' décrit une sinusoïde <strong>idéale</strong> : parfaitement régulière, sans début ni fin, sans bruit. Les signaux réels s’en écartent :</p>',
        '<ul><li>ils contiennent du <strong>bruit</strong> (perturbations aléatoires) ;</li>',
        '<li>ils peuvent être <strong>déformés</strong> (distorsion, harmoniques) par les circuits ;</li>',
        '<li>ils sont <strong>atténués</strong> en se propageant dans un câble, une fibre ou l’air ;</li>',
        '<li>ils ont une durée limitée.</li></ul>',
        '<p>Le laboratoire de cette plateforme simule le modèle idéal. Il ne simule pas la propagation réelle d’une onde radio dans l’environnement.</p>',
        '<h3>Résumé</h3>',
        '<ul class="summary">',
        '<li>Un signal est une grandeur qui varie dans le temps et transporte une information.</li>',
        '<li>Une sinusoïde s’écrit ' + MODEL + '.</li>',
        '<li>' + v('A') + ' est la valeur maximale (V) ; la valeur crête à crête vaut 2' + v('A') + '.</li>',
        '<li>' + v('f') + ' est en hertz ; ' + v('T') + ' = 1/' + v('f') + ' est en secondes.</li>',
        '<li>' + v('φ') + ' est en radians ; elle décale le signal de Δ' + v('t') + ' = ' + v('φ') + '/(2π' + v('f') + ').</li>',
        '</ul>',
        '<h3>Erreurs fréquentes à éviter</h3>',
        '<ul class="pitfalls">',
        '<li><strong>Confondre amplitude et crête à crête.</strong> Une courbe qui va de −3 V à +3 V a une amplitude de 3 V, pas 6 V.</li>',
        '<li><strong>Oublier de convertir.</strong> ' + v('f') + ' = 1/' + v('T') + ' s’applique avec ' + v('T') + ' en secondes : 1/5 ms n’est pas 0,2 Hz mais 200 Hz.</li>',
        '<li><strong>Calculer en degrés.</strong> Dans la formule, la phase et l’angle sont en radians.</li>',
        '<li><strong>Croire que la fréquence change la hauteur.</strong> Fréquence et amplitude sont indépendantes.</li>',
        '<li><strong>Se tromper de sens pour la phase.</strong> ' + v('φ') + ' &gt; 0 signifie avance : la courbe va vers la gauche.</li>',
        '</ul>'
      ].join('')
    }
  ];

  TCL.lessons = TCL.lessons || {};
  TCL.lessons.signaux = {
    id: 'signaux',
    title: 'Comprendre les signaux',
    intro: 'Cette leçon présente le signal sinusoïdal, base de toutes les transmissions. Vous apprendrez à reconnaître son amplitude, sa fréquence, sa période et sa phase, à passer de la formule au graphique, et à effectuer les calculs essentiels.',
    objectives: [
      'Définir un signal et distinguer signal analogique et signal numérique.',
      'Identifier A, f et φ dans l’expression x(t) = A sin(2πft + φ).',
      'Calculer une période à partir d’une fréquence, et inversement, en convertissant les unités.',
      'Expliquer l’effet de l’amplitude, de la fréquence et de la phase sur la courbe.',
      'Lire ces grandeurs sur un graphique.'
    ],
    prerequisites: 'Savoir utiliser une calculatrice scientifique et manipuler les puissances de 10.',
    chapters: chapters,
    figures: figures
  };
})(window);
