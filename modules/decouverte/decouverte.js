/*
 * TELECOM CONNECT LAB — Démonstration publique : la loi d'Ohm
 * ----------------------------------------------------------
 * Seul contenu pédagogique chargé pour un visiteur. Les valeurs sont
 * calculées par la bibliothèque de circuits testée. Aucun résultat n'est
 * enregistré : la démonstration ne produit aucune validation.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath, C = TCL.circuitMath;
  function v(s) { return '<var>' + s + '</var>'; }
  function fN(x, s) { return M.formatNumber(x, s == null ? 3 : s); }

  function loopSvg() {
    return '<svg class="schema" viewBox="0 0 520 210" role="img" aria-label="Circuit simple : une source de tension alimente une résistance ; le courant circule dans la boucle fermée." xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="schema__bg" x="0" y="0" width="520" height="210" rx="14"/>' +
      '<path class="circuit__wire" d="M120 45 H400 V165 H120 V125 M120 85 V45"/>' +
      '<line class="circuit__wire" x1="100" y1="85" x2="140" y2="85"/><line class="circuit__wire" x1="108" y1="125" x2="132" y2="125"/>' +
      '<rect class="circuit__part" x="376" y="75" width="48" height="60" rx="3"/>' +
      '<text class="schema__t" x="60" y="110">U</text><text class="schema__t" x="436" y="110">R</text><text class="schema__t" x="250" y="34">courant I →</text></svg>';
  }

  function ohmOptions() {
    function line(r) { return function (u) { return C.current(u, r) * 1000; }; }
    return { kind: 'xy', title: 'Courant en fonction de la tension', desc: 'Deux droites passant par l’origine : plus la résistance est grande, plus la pente est faible.',
      x: { min: 0, max: 12, ticks: [0, 3, 6, 9, 12], label: 'tension U (V)' }, y: { min: 0, max: 130, ticks: [0, 30, 60, 90, 120], label: 'courant I (mA)' },
      series: [{ samples: 40, fn: line(100) }, { samples: 40, fn: line(220) }],
      points: [{ x: 12, y: 120, label: 'R = 100 Ω' }, { x: 12, y: C.current(12, 220) * 1000, label: 'R = 220 Ω' }] };
  }

  var lesson = {
    title: 'La loi d’Ohm',
    intro: 'Une leçon complète, en accès libre, pour découvrir notre façon d’enseigner : une notion, une formule expliquée, un exemple chiffré, une mise en garde pratique.',
    figures: {
      loop: { caption: 'Le circuit le plus simple : une source, un récepteur, une boucle fermée.', svg: loopSvg },
      ohm: { caption: 'À résistance fixe, le courant est proportionnel à la tension : c’est une droite passant par l’origine.', options: ohmOptions }
    },
    html: [
      '<p class="lead">Dès qu’un courant circule, trois grandeurs sont liées. Connaître deux d’entre elles suffit à calculer la troisième.</p>',
      '<h2>Trois grandeurs à distinguer</h2>',
      '<div data-fig="loop"></div>',
      '<ul><li>La <strong>tension</strong> ' + v('U') + ', en volts (V) : la différence de potentiel qui met les charges en mouvement.</li>',
      '<li>Le <strong>courant</strong> ' + v('I') + ', en ampères (A) : le débit de charges dans le fil.</li>',
      '<li>La <strong>résistance</strong> ' + v('R') + ', en ohms (Ω) : l’opposition du composant au passage du courant.</li></ul>',
      '<h2>La loi</h2>',
      '<p class="formula">' + v('U') + ' = ' + v('R') + ' · ' + v('I') + '</p>',
      '<p>La même relation s’écrit ' + v('I') + ' = ' + v('U') + '/' + v('R') + ' ou ' + v('R') + ' = ' + v('U') + '/' + v('I') + ', selon la grandeur recherchée. Les unités doivent être cohérentes : volts, ampères et ohms.</p>',
      '<div data-fig="ohm"></div>',
      '<h2>Un exemple chiffré</h2>',
      '<p>Une résistance de 470 Ω est alimentée sous 12 V. Le courant vaut ' + v('I') + ' = 12 / 470 = ' + fN(C.current(12, 470), 3) + ' A, soit ' + fN(C.current(12, 470) * 1000, 3) + ' mA.</p>',
      '<h2>La puissance : pourquoi un composant chauffe</h2>',
      '<p class="formula">' + v('P') + ' = ' + v('U') + ' · ' + v('I') + ' = ' + v('R') + ' · ' + v('I') + '²</p>',
      '<p>Toute la puissance reçue par une résistance devient de la chaleur. Dans notre exemple, ' + v('P') + ' = 12 × ' + fN(C.current(12, 470), 3) + ' = ' + fN(12 * C.current(12, 470), 3) + ' W. Or une résistance courante supporte 0,25 W : il faut ici un modèle plus puissant, sinon le composant surchauffe.</p>',
      '<h2>Les erreurs fréquentes</h2>',
      '<ul class="pitfalls"><li><strong>Oublier la conversion.</strong> Un courant de 25 mA vaut 0,025 A dans la formule.</li>',
      '<li><strong>Confondre tension et courant.</strong> La tension existe entre deux points ; le courant traverse un fil.</li>',
      '<li><strong>Appliquer la loi à tout composant.</strong> Elle décrit les résistances ; une diode ou une LED ne la suit pas.</li></ul>'
    ].join('')
  };

  var K = TCL.exerciseKit;
  var concept = K.concept([
    { label: 'Le courant double', ok: true },
    { label: 'Le courant est divisé par deux' },
    { label: 'Le courant ne change pas' },
    { label: 'La résistance double' }
  ]);

  var questions = [
    { id: 'q1', title: 'Calculer un courant', skill: 'Loi d’Ohm', type: 'numeric', unit: 'mA', tol: { abs: 0.5 }, answer: C.current(12, 240) * 1000,
      prompt: '<p>Une résistance de 240 Ω est alimentée sous 12 V. Quel est le courant, <strong>en mA</strong> ?</p>',
      explanation: '<p>I = U/R = 12 / 240 = 0,05 A, soit 50 mA. Pensez à convertir : 1 A = 1 000 mA.</p>' },
    { id: 'q2', title: 'Raisonner sans calcul', skill: 'Proportionnalité', type: 'qcm', options: concept.options, answer: concept.answer,
      prompt: '<p>La résistance d’un circuit reste la même. On double la tension. Que se passe-t-il ?</p>',
      explanation: '<p>I = U/R : à R constante, le courant est proportionnel à la tension. La résistance, elle, ne dépend pas de la tension appliquée dans ce modèle.</p>' },
    { id: 'q3', title: 'Retrouver une tension', skill: 'Loi d’Ohm', type: 'numeric', unit: 'V', tol: { abs: 0.06 }, answer: 470 * 0.02,
      prompt: '<p>Un courant de 20 mA traverse une résistance de 470 Ω. Quelle est la tension à ses bornes, <strong>en V</strong> ?</p>',
      explanation: '<p>U = R·I = 470 × 0,020 = 9,4 V. Si vous avez trouvé 9 400, le courant n’a pas été converti en ampères.</p>' }
  ];

  TCL.demo = { id: 'decouverte', lesson: lesson, questions: questions };
})(window);
