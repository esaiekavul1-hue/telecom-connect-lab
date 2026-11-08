/*
 * TELECOM CONNECT LAB — Module « Circuits électriques » : leçon
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, C = TCL.circuitMath;
  function v(s) { return '<var>' + s + '</var>'; }
  function fN(x, s) { return M.formatNumber(x, s); }

  function loopSvg() {
    return '<svg class="schema" viewBox="0 0 520 210" role="img" aria-label="Circuit simple : une source de tension E alimente une résistance R ; le courant I circule dans la boucle." xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="schema__bg" x="0" y="0" width="520" height="210" rx="14"/>' +
      '<path class="circuit__wire" d="M120 45 H400 V165 H120 V125 M120 85 V45"/>' +
      '<line class="circuit__wire" x1="100" y1="85" x2="140" y2="85"/><line class="circuit__wire" x1="108" y1="125" x2="132" y2="125"/>' +
      '<rect class="circuit__part" x="376" y="75" width="48" height="60" rx="3"/>' +
      '<text class="schema__t" x="60" y="110">E</text><text class="schema__t" x="436" y="110">R</text><text class="schema__t" x="250" y="34">courant I →</text></svg>';
  }

  function dividerSvg() {
    return '<svg class="schema" viewBox="0 0 520 230" role="img" aria-label="Diviseur de tension : la source E alimente R1 puis R2 en série ; la tension de sortie est prise aux bornes de R2." xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="schema__bg" x="0" y="0" width="520" height="230" rx="14"/>' +
      '<path class="circuit__wire" d="M100 35 H260 V60 M260 110 V130 M260 180 V200 H100 V135 M100 95 V35 M260 120 H420"/>' +
      '<line class="circuit__wire" x1="80" y1="95" x2="120" y2="95"/><line class="circuit__wire" x1="88" y1="135" x2="112" y2="135"/>' +
      '<rect class="circuit__part" x="240" y="60" width="40" height="50" rx="3"/><rect class="circuit__part" x="240" y="130" width="40" height="50" rx="3"/>' +
      '<circle class="circuit__node" cx="260" cy="120" r="4"/><text class="schema__t" x="50" y="120">E</text><text class="schema__t" x="290" y="90">R₁</text><text class="schema__t" x="290" y="160">R₂</text><text class="schema__t" x="360" y="110">sortie U₂</text></svg>';
  }

  function rcOptions() {
    var E = 10, tau = 1;
    return { kind: 'xy', title: 'Charge d’un condensateur', desc: 'La tension monte de 0 à 10 V ; elle atteint 63 % de la valeur finale après une constante de temps.',
      x: { min: 0, max: 5, ticks: [0, 1, 2, 3, 4, 5], label: 'temps (en multiples de τ)' }, y: { min: 0, max: 11, ticks: [0, 2, 4, 6, 8, 10], label: 'tension (V)' },
      series: [{ samples: 200, fn: function (t) { return C.rcCharge(E, 1000, tau / 1000, t); } }],
      hlines: [{ y: 6.32, label: '63 % de E', anchor: 'start' }], points: [{ x: 1, y: C.rcCharge(E, 1000, tau / 1000, 1), label: 't = τ' }] };
  }

  var figures = {
    loop: { caption: 'Le circuit le plus simple : une source, un récepteur, une boucle fermée.', svg: loopSvg },
    divider: { caption: 'Diviseur de tension : la sortie est prélevée entre le point milieu et la masse.', svg: dividerSvg },
    rc: { caption: 'Charge d’un condensateur à travers une résistance : u(t) = E(1 − e^(−t/τ)).', options: rcOptions }
  };

  var chapters = [
    { id: 'c1', title: 'Tension, courant, résistance',
      summary: 'Les grandeurs de base et la loi d’Ohm.',
      html: [
        '<p class="lead">Un circuit électrique déplace des charges dans une boucle fermée. Trois grandeurs suffisent pour commencer à le décrire.</p>',
        '<div data-fig="loop"></div>',
        '<ul><li>La <strong>tension</strong> ' + v('U') + ', en volts (V), est la différence de potentiel entre deux points.</li>',
        '<li>Le <strong>courant</strong> ' + v('I') + ', en ampères (A), est le débit de charges dans un fil.</li>',
        '<li>La <strong>résistance</strong> ' + v('R') + ', en ohms (Ω), mesure l’opposition au passage du courant.</li></ul>',
        '<h3>La loi d’Ohm</h3>',
        '<p class="formula">' + v('U') + ' = ' + v('R') + ' · ' + v('I') + '</p>',
        '<p><strong>Exemple.</strong> Une résistance de 470 Ω sous 12 V est traversée par 12 / 470 = ' + fN(C.current(12, 470) * 1000, 3) + ' mA.</p>',
        '<h3>La puissance</h3>',
        '<p class="formula">' + v('P') + ' = ' + v('U') + ' · ' + v('I') + ' = ' + v('R') + ' · ' + v('I') + '² = ' + v('U') + '²/' + v('R') + '</p>',
        '<p>Une résistance transforme cette puissance en chaleur. Chaque composant a une puissance maximale : 0,25 W pour une résistance courante.</p>',
        '<p><strong>Exemple.</strong> La résistance de 470 Ω sous 12 V dissipe 12² / 470 = ' + fN(12 * 12 / 470, 3) + ' W : c’est plus que 0,25 W. Le composant courant chaufferait trop, il faut choisir un modèle de 0,5 W ou plus.</p>',
        '<h3>Ordres de grandeur</h3><ul><li>Une pile : 1,5 V ; une batterie de voiture : 12 V ; le secteur en RDC : 220 V alternatifs.</li><li>Une LED : environ 20 mA ; un téléphone en charge : de 1 à 3 A.</li><li>Les résistances courantes vont de quelques ohms à plusieurs mégohms.</li></ul>'
      ].join('') },
    { id: 'c2', title: 'Les lois de Kirchhoff',
      summary: 'Loi des nœuds, loi des mailles, associations de résistances.',
      html: [
        '<p class="lead">La loi d’Ohm décrit un composant. Les lois de Kirchhoff décrivent la façon dont les composants se partagent tensions et courants.</p>',
        '<h3>Loi des nœuds</h3><p>La somme des courants qui entrent dans un nœud égale la somme de ceux qui en sortent : la charge ne s’accumule pas.</p>',
        '<h3>Loi des mailles</h3><p>En parcourant une boucle fermée, la somme algébrique des tensions est nulle : l’énergie fournie est entièrement consommée.</p>',
        '<h3>Associations</h3>',
        '<ul><li><strong>En série</strong>, même courant : ' + v('R') + '<sub>eq</sub> = R₁ + R₂ + …</li>',
        '<li><strong>En parallèle</strong>, même tension : 1/' + v('R') + '<sub>eq</sub> = 1/R₁ + 1/R₂ + …</li></ul>',
        '<p><strong>Exemple.</strong> 220 Ω et 330 Ω en parallèle donnent ' + fN(C.parallel([220, 330]), 3) + ' Ω, moins que la plus petite des deux.</p>',
        '<h3>Un calcul complet</h3><p>Une source de 12 V alimente 100 Ω en série avec l’ensemble 220 Ω // 330 Ω. La résistance totale vaut 100 + ' + fN(C.parallel([220, 330]), 3) + ' = ' + fN(100 + C.parallel([220, 330]), 3) + ' Ω, donc le courant fourni vaut ' + fN(12 / (100 + C.parallel([220, 330])) * 1000, 3) + ' mA. La loi des mailles donne la tension du groupe parallèle : ' + fN(12 * C.parallel([220, 330]) / (100 + C.parallel([220, 330])), 3) + ' V. La loi des nœuds se vérifie alors : le courant se partage entre les deux branches, et le plus fort passe dans la plus petite résistance.</p>'
      ].join('') },
    { id: 'c3', title: 'Le diviseur de tension',
      summary: 'Obtenir une tension plus faible, et l’effet d’une charge.',
      html: [
        '<p class="lead">Deux résistances en série partagent la tension de la source. C’est l’un des montages les plus utilisés en électronique.</p>',
        '<div data-fig="divider"></div>',
        '<p class="formula">' + v('U') + '₂ = ' + v('E') + ' · R₂ / (R₁ + R₂)</p>',
        '<h3>L’effet de la charge</h3>',
        '<p>Cette formule n’est juste qu’<strong>à vide</strong>. Une charge branchée sur la sortie se met en parallèle sur R₂ et abaisse la tension. Avec 12 V, R₁ = R₂ = 1 kΩ et une charge de 1 kΩ, la sortie tombe de 6 V à ' + fN(C.dividerCircuit({ E: 12, R1: 1000, R2: 1000, RL: 1000, Ra: 0 }).v.m, 3) + ' V.</p>',
        '<p>Règle pratique : pour que le diviseur reste stable, la charge doit être au moins dix fois plus grande que R₂.</p>',
        '<h3>À quoi ça sert ?</h3><p>Le diviseur adapte le niveau d’un signal, polarise un transistor ou réduit une tension pour qu’un microcontrôleur puisse la mesurer. Il ne sert pas à alimenter un appareil : une grande partie de l’énergie serait perdue en chaleur et la tension varierait avec le courant demandé. On utilise pour cela un régulateur de tension.</p>'
      ].join('') },
    { id: 'c4', title: 'Mesurer : voltmètre et ampèremètre',
      summary: 'Brancher correctement les instruments et connaître leur influence.',
      html: [
        '<p class="lead">Un instrument fait partie du circuit dès qu’on le branche : il le perturbe, un peu ou beaucoup.</p>',
        '<ul class="examples"><li><strong>Voltmètre</strong> : en parallèle. Sa résistance interne, très grande (10 MΩ sur un multimètre numérique courant), limite le courant qu’il prélève.</li>',
        '<li><strong>Ampèremètre</strong> : en série. Sa résistance interne, très faible, limite la chute de tension qu’il provoque.</li></ul>',
        '<p>Un voltmètre de 1 MΩ posé sur une résistance de 1 MΩ divise celle-ci par deux : la mesure est fausse alors que l’appareil fonctionne parfaitement.</p>',
        '<p><strong>Exemple chiffré.</strong> Un diviseur 12 V avec R₁ = R₂ = 1 MΩ donne 6 V à vide. Avec un voltmètre de 1 MΩ, l’appareil affiche ' + fN(C.dividerCircuit({ E: 12, R1: 1e6, R2: 1e6, Ra: 0, Rv: 1e6 }).v.m, 3) + ' V. Avec un multimètre de 10 MΩ, il affiche ' + fN(C.dividerCircuit({ E: 12, R1: 1e6, R2: 1e6, Ra: 0, Rv: 1e7 }).v.m, 3) + ' V : l’erreur devient bien plus faible, sans disparaître.</p>',
        '<p>Avant toute mesure, comparez donc la résistance de l’instrument à celles du montage : un rapport d’au moins cent rend en général l’erreur négligeable.</p>',
        '<div class="callout callout--warn"><p><strong>Sécurité.</strong> Un ampèremètre branché en parallèle sur une source crée un quasi court-circuit. Sur un vrai montage, vérifiez le calibre et le branchement avant de mettre sous tension.</p></div>'
      ].join('') },
    { id: 'c5', title: 'Le circuit RC',
      summary: 'Charge d’un condensateur et constante de temps.',
      html: [
        '<p class="lead">Un condensateur stocke des charges. Relié à une source à travers une résistance, il se charge progressivement.</p>',
        '<div data-fig="rc"></div>',
        '<p class="formula">' + v('u') + '(' + v('t') + ') = ' + v('E') + ' (1 − e<sup>−t/τ</sup>), avec τ = ' + v('R') + ' · ' + v('C') + '</p>',
        '<p>Après τ, la tension atteint environ 63 % de ' + v('E') + ' ; après 5τ, on considère la charge terminée (plus de 99 %).</p>',
        '<p><strong>Exemple.</strong> Avec R = 10 kΩ et C = 100 µF, τ = ' + fN(C.tau(10000, 100e-6), 3) + ' s. Sous 12 V, le condensateur atteint ' + fN(C.rcCharge(12, 10000, 100e-6, 1), 3) + ' V au bout d’une seconde, et la charge est terminée en 5 s environ.</p>',
        '<h3>Résumé</h3>',
        '<ul class="summary"><li>U = R·I ; P = U·I.</li><li>Loi des nœuds : les courants se conservent. Loi des mailles : les tensions s’équilibrent.</li><li>Diviseur à vide : U₂ = E·R₂/(R₁+R₂) ; une charge abaisse cette tension.</li><li>Voltmètre en parallèle, ampèremètre en série.</li><li>τ = R·C ; 63 % après τ, charge complète après 5τ.</li></ul>',
        '<h3>Erreurs fréquentes à éviter</h3>',
        '<ul class="pitfalls"><li><strong>Oublier la conversion.</strong> 12 V / 470 Ω donne des ampères, pas des milliampères.</li><li><strong>Appliquer le diviseur à vide à un montage chargé.</strong> R₂ doit alors être remplacée par R₂ en parallèle avec la charge.</li><li><strong>Additionner des résistances en parallèle.</strong> L’équivalent est toujours plus petit que la plus petite résistance.</li><li><strong>Oublier la puissance maximale</strong> d’un composant.</li></ul>'
      ].join('') }
  ];

  TCL.lessons = TCL.lessons || {};
  TCL.lessons.circuits = {
    id: 'circuits', title: 'Circuits électriques',
    intro: 'Cette leçon pose les bases de tout montage : loi d’Ohm, lois de Kirchhoff, diviseur de tension, influence des instruments de mesure, charge d’un condensateur.',
    objectives: ['Appliquer la loi d’Ohm et calculer une puissance.', 'Utiliser les lois de Kirchhoff et associer des résistances.', 'Dimensionner un diviseur de tension et prévoir l’effet d’une charge.', 'Brancher correctement un voltmètre et un ampèremètre.', 'Calculer une constante de temps RC.'],
    prerequisites: 'Calcul avec des fractions et des puissances de dix.',
    chapters: chapters, figures: figures
  };
})(window);
