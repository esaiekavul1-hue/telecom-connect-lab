/*
 * TELECOM CONNECT LAB 2.0 — Électronique numérique : Boole, portes, bascules.
 * Modèle : logique idéale, sans temps de propagation.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, v = K.v, S = K.S;

  var GATES = { and: function (a, b) { return a & b; }, or: function (a, b) { return a | b; }, xor: function (a, b) { return a ^ b; }, nand: function (a, b) { return 1 - (a & b); }, nor: function (a, b) { return 1 - (a | b); }, xnor: function (a, b) { return 1 - (a ^ b); } };
  function truth(g) { return [[0, 0], [0, 1], [1, 0], [1, 1]].map(function (x) { return GATES[g](x[0], x[1]); }); }
  function fullAdder(a, b, c) { return { s: a ^ b ^ c, c: (a & b) | (c & (a ^ b)) }; }
  function add4(A, B, cin) { var carry = cin, sum = 0, bits = []; for (var i = 0; i < 4; i++) { var f = fullAdder((A >> i) & 1, (B >> i) & 1, carry); sum |= f.s << i; carry = f.c; bits.push(f); } return { sum: sum, carry: carry, bits: bits }; }
  function mux2(a, b, sel) { return sel ? b : a; }
  /** Compteur par bascules D : front montant, retour à zéro au modulo choisi. */
  function counterStep(st, modulo) { var n = (st + 1) % modulo; return n; }
  function dff(prevClk, clk, d, q) { return prevClk === 0 && clk === 1 ? d : q; }
  var math = { GATES: GATES, truth: truth, fullAdder: fullAdder, add4: add4, mux2: mux2, counterStep: counterStep, dff: dff };

  var lesson = K.lesson({ id: 'logique', title: 'Électronique numérique',
    intro: 'Toute machine numérique se ramène à des opérations logiques sur des bits. Cette leçon part des portes pour arriver aux circuits qui comptent et mémorisent.',
    objectives: ['Écrire et simplifier une expression booléenne.', 'Construire la table de vérité des portes usuelles.', 'Assembler un additionneur et un multiplexeur.', 'Décrire le fonctionnement d’une bascule D et d’un compteur.'],
    prerequisites: 'Représentation binaire des données.',
    sources: ['Pages « Adder (electronics) », « Flip-flop », « De Morgan’s laws ».', 'Tables de vérité contrôlées exhaustivement par tests/content-references.js.'],
    figures: {
      add: { caption: 'Additionneur complet : deux portes OU exclusif produisent la somme, les portes ET et OU la retenue.', svg: function () { return S.blocks({ w: 520, h: 170, label: 'Additionneur complet à partir de portes logiques.', boxes: [{ id: 'a', x: 20, y: 30, w: 70, h: 40, t: 'A, B' }, { id: 'c', x: 20, y: 110, w: 70, h: 40, t: 'Cin' }, { id: 'x1', x: 150, y: 30, w: 90, h: 40, t: 'XOR' }, { id: 'x2', x: 300, y: 30, w: 90, h: 40, t: 'XOR' }, { id: 'o', x: 275, y: 108, w: 140, h: 46, t: 'ET + OU', sub: 'A·B + Cin·(A⊕B)' }, { id: 's', x: 440, y: 30, w: 60, h: 40, t: 'S' }, { id: 'cc', x: 440, y: 111, w: 60, h: 40, t: 'Cout' }], links: [{ a: 'a', b: 'x1' }, { a: 'x1', b: 'x2' }, { a: 'x2', b: 's' }, { a: 'c', b: 'o', to: 'l' }, { a: 'o', b: 'cc' }, { a: 'c', b: 'x2', from: 't', to: 'b', dash: true }] }); } },
      chrono: { caption: 'Compteur 2 bits à fronts montants : la sortie Q0 change à chaque front, Q1 tous les deux fronts.', options: function () { function sq(p, t) { return Math.floor(t / p) % 2; } return { kind: 'xy', title: 'Chronogramme', desc: 'Horloge et sorties d’un compteur binaire.', x: { min: 0, max: 16, ticks: [0, 4, 8, 12, 16], label: 'temps (périodes d’horloge)' }, y: { min: -0.2, max: 6, ticks: [0, 2, 4], label: '' }, series: [{ samples: 800, fn: function (t) { return 4 + sq(0.5, t); } }, { samples: 800, cls: 'scope__trace--alt', fn: function (t) { return 2 + sq(1, t); } }, { samples: 800, fn: function (t) { return sq(2, t); } }] }; } } },
    chapters: [
      { title: 'Algèbre de Boole', summary: 'Variables logiques, lois et simplification.', html: [
        '<p class="lead">L’algèbre de Boole raisonne sur des variables qui valent 0 ou 1. Elle permet de simplifier un circuit avant de le construire.</p>',
        K.defs([['ET', 'A·B vaut 1 si A et B valent 1.'], ['OU', 'A+B vaut 1 si au moins une variable vaut 1.'], ['NON', 'Ā inverse la variable.']]),
        K.formula('A·(B+C) = A·B + A·C, A + Ā = 1, A·Ā = 0', 'Lois de distributivité et de complément.'),
        K.formula('(A·B)‾ = Ā + B̄, (A+B)‾ = Ā·B̄', 'Lois de De Morgan. Elles permettent de réaliser tout circuit avec des portes NON-ET.'),
        K.example('simplifier une fonction', '<p>F = A·B + A·B̄ = A·(B + B̄) = A. Deux portes ET et une porte OU sont remplacées par un simple fil.</p>')] },
      { title: 'Portes et circuits combinatoires', summary: 'Table de vérité, additionneur, multiplexeur.', html: [
        '<p class="lead">Dans un circuit combinatoire, la sortie ne dépend que des entrées actuelles.</p>',
        K.table(['A', 'B', 'ET', 'OU', 'XOR', 'NON-ET'], [[0, 0, 0, 0, 0, 1], [0, 1, 0, 1, 1, 1], [1, 0, 0, 1, 1, 1], [1, 1, 1, 1, 0, 0]], 'Tables de vérité'),
        K.formula('S = A ⊕ B ⊕ C<sub>in</sub>, C<sub>out</sub> = A·B + C<sub>in</sub>·(A ⊕ B)', 'Additionneur complet d’un bit.'),
        '<div data-fig="add"></div>',
        K.example('addition sur quatre bits', '<p>0101 + 0011 : bit 0 : 1+1 = 0, retenue 1. Bit 1 : 0+1+1 = 0, retenue 1. Bit 2 : 1+0+1 = 0, retenue 1. Bit 3 : 0+0+1 = 1. Résultat 1000, soit 5 + 3 = 8.</p>'),
        K.defs([['Multiplexeur', 'Choisit l’une de ses entrées selon un signal de sélection.'], ['Décodeur', 'Active une seule sortie parmi 2ⁿ selon un code de n bits.']])] },
      { title: 'Circuits séquentiels', summary: 'Bascules, registres, compteurs.', html: [
        '<p class="lead">Un circuit séquentiel possède une mémoire : sa sortie dépend aussi du passé.</p>',
        K.defs([['Bascule D', 'À chaque front montant de l’horloge, la sortie Q prend la valeur de D et la conserve jusqu’au front suivant.'], ['Registre', 'Ensemble de bascules qui mémorise un mot.'], ['Compteur', 'Registre dont la valeur s’incrémente à chaque front.']]),
        '<div data-fig="chrono"></div>',
        K.formula(v('f') + '<sub>Qn</sub> = ' + v('f') + '<sub>H</sub> / 2<sup>n+1</sup>', 'Compteur binaire : chaque étage divise la fréquence par deux.'),
        K.example('diviser une horloge', '<p>Une horloge de 16 MHz traversant 4 étages donne en sortie Q3 une fréquence de 16 MHz / 2⁴ = 1 MHz.</p>'),
        K.apply('<p>Un microcontrôleur génère ses temporisations avec de tels compteurs : c’est ainsi qu’un ESP32 ou un Arduino mesure le temps et produit des signaux MLI.</p>'),
        K.pitfalls(['<strong>Oublier la barre dans De Morgan</strong> : on complémente chaque variable et on change l’opérateur.', '<strong>Confondre OU et OU exclusif</strong>, qui diffèrent pour A = B = 1.', '<strong>Confondre état et front</strong> : une bascule D réagit au front, pas au niveau.', '<strong>Négliger les temps de propagation</strong>, qui créent de courtes impulsions parasites dans les circuits réels.']),
        K.summary(['Une expression se simplifie avec les lois de Boole et De Morgan.', 'Le combinatoire dépend des entrées actuelles.', 'S = A ⊕ B ⊕ C<sub>in</sub>.', 'Une bascule D mémorise au front montant ; un compteur divise la fréquence.']),
        K.toLab('logique', 'Construisez des tables de vérité, additionnez sur quatre bits et cadencez un compteur.')] }
    ] });

  var D = { gate: 'and', a: 0, b: 0, A: [0, 1, 0, 1], B: [1, 1, 0, 0], cin: 0, count: 0, modulo: 16, seen: [0, 0, 0, 0], clocks: 0 };
  function nb(arr) { return arr.reduce(function (t, x, i) { return t + (x << i); }, 0); }
  function M(s) {
    var a = nb(s.A), b = nb(s.B), r = add4(a, b, s.cin), out = GATES[s.gate](s.a, s.b);
    return { a: a, b: b, sum: r.sum, carry: r.carry, total: r.sum + 16 * r.carry, out: out, table: truth(s.gate), complete: s.seen.every(Boolean), q: [0, 1, 2, 3].map(function (i) { return (s.count >> i) & 1; }) };
  }
  function bit(act, arg, val, label) { return '<button type="button" class="sim-btn' + (val ? ' is-on' : '') + '" data-act="' + act + '" data-arg="' + arg + '" aria-pressed="' + (val ? 'true' : 'false') + '" aria-label="' + S.esc(label) + '">' + val + '</button>'; }
  var lab = { id: 'logique', title: 'Portes, additionneur et compteur', short: 'Électronique numérique', icon: 'circuit', badge: 'Logique idéale, sans délai de propagation',
    text: 'Explorez les portes logiques, additionnez sur quatre bits et cadencez un compteur en appuyant sur l’horloge.',
    summary: 'Testez six portes, additionnez deux nombres de quatre bits et faites fonctionner un compteur à l’horloge.',
    params: [{ group: 'Porte logique' }, { k: 'gate', label: 'Type de porte', select: true, opts: [['and', 'ET'], ['or', 'OU'], ['xor', 'OU exclusif'], ['nand', 'NON-ET'], ['nor', 'NON-OU'], ['xnor', 'NON-OU exclusif']], hint: 'Testez toutes les combinaisons d’entrées.', onChange: function (s) { s.seen = [0, 0, 0, 0]; } }, { group: 'Compteur' }, { k: 'modulo', label: 'Modulo', opts: [[4, '4'], [8, '8'], [10, '10'], [16, '16']] }],
    defaults: D, model: M,
    actions: { in: function (s, k) { s[k] = s[k] ? 0 : 1; s.seen[s.a * 2 + s.b] = 1; }, ba: function (s, i) { s.A[+i] = 1 - s.A[+i]; }, bb: function (s, i) { s.B[+i] = 1 - s.B[+i]; }, cin: function (s) { s.cin = 1 - s.cin; }, clk: function (s) { s.count = counterStep(s.count, s.modulo); s.clocks++; }, rst: function (s) { s.count = 0; s.clocks = 0; } },
    widget: function (s, m) {
      var rows = [[0, 0], [0, 1], [1, 0], [1, 1]].map(function (x, i) { return [x[0], x[1], m.table[i], s.seen[i] ? 'testé' : '—']; });
      return '<h3>Porte logique</h3><div class="sim-row">A ' + bit('in', 'a', s.a, 'Entrée A') + ' B ' + bit('in', 'b', s.b, 'Entrée B') + ' <strong>Sortie : ' + m.out + '</strong></div>' + K.table(['A', 'B', 'Sortie', 'Observé'], rows) +
        '<h3>Additionneur 4 bits</h3><div class="sim-row">A (' + m.a + ') : ' + [3, 2, 1, 0].map(function (i) { return bit('ba', i, s.A[i], 'Bit ' + i + ' de A'); }).join('') + '</div><div class="sim-row">B (' + m.b + ') : ' + [3, 2, 1, 0].map(function (i) { return bit('bb', i, s.B[i], 'Bit ' + i + ' de B'); }).join('') + '</div><div class="sim-row">Retenue d’entrée ' + bit('cin', '0', s.cin, 'Retenue d’entrée') + ' <strong>Somme : ' + m.sum + ' (retenue ' + m.carry + ') = ' + m.total + '</strong></div>' +
        '<h3>Compteur</h3><div class="sim-row"><button type="button" class="btn btn--primary btn--sm" data-act="clk">Front d’horloge</button><button type="button" class="btn btn--ghost btn--sm" data-act="rst">Remise à zéro</button> <strong>Valeur : ' + s.count + '</strong> (Q3…Q0 = ' + m.q.slice().reverse().join('') + ') · ' + s.clocks + ' front(s)</div>';
    },
    readouts: [['Sortie de la porte', function (s, m) { return String(m.out); }], ['Somme', function (s, m) { return String(m.total); }], ['Retenue finale', function (s, m) { return String(m.carry); }], ['Compteur', function (s) { return String(s.count); }]],
    explain: function (s, m) { return '<p>La somme se calcule bit par bit, en propageant la retenue : ' + m.a + ' + ' + m.b + (s.cin ? ' + 1' : '') + ' = ' + m.total + '. Un dépassement de 15 active la retenue finale. Le compteur reboucle à ' + s.modulo + '.</p>'; },
    missions: [
      { id: 'm1', title: 'Parcourir une table de vérité', text: 'Testez les quatre combinaisons d’entrées d’une porte.', solution: function (s) { s.seen = [1, 1, 1, 1]; }, check: function (s, m) { return m.complete ? { ok: true, msg: 'Réussi : vous avez parcouru les quatre lignes.' } : { ok: false, msg: s.seen.filter(Boolean).length + ' combinaison(s) testée(s) sur 4.' }; } },
      { id: 'm2', title: 'Déclencher un dépassement', text: 'Choisissez A et B pour que la somme dépasse 15 et active la retenue.', solution: { A: [1, 1, 1, 1], B: [1, 0, 0, 0], cin: 0 }, check: function (s, m) { return m.carry === 1 ? { ok: true, msg: 'Réussi : ' + m.a + ' + ' + m.b + ' dépasse 15 ; seuls 4 bits tiennent, la retenue signale le dépassement.' } : { ok: false, msg: 'Somme : ' + m.total + '. Augmentez A et B.' }; } },
      { id: 'm3', title: 'Compteur décimal', text: 'Réglez le modulo à 10 et amenez le compteur à 9.', solution: { modulo: 10, count: 9 }, check: function (s) { return s.modulo === 10 && s.count === 9 ? { ok: true, msg: 'Réussi : au prochain front, il repassera à 0 : c’est un compteur décimal.' } : { ok: false, msg: 'Modulo ' + s.modulo + ', valeur ' + s.count + '. Visez modulo 10 et valeur 9.' }; } }],
    limits: '<p>Les portes sont idéales et instantanées. Les niveaux de tension, les temps de propagation, les rebonds des interrupteurs réels et les conditions de maintien des bascules ne sont pas représentés.</p>' };

  var list = [
    K.pick('e1', 'Porte ET', 'Portes', '<p>Une porte ET reçoit A = 1 et B = 0. La sortie vaut :</p>', '0', ['1', 'indéfinie', '2'], '<p>La sortie d’une porte ET ne vaut 1 que si toutes ses entrées valent 1.</p>'),
    K.pick('e2', 'OU exclusif', 'Portes', '<p>Quand un OU exclusif vaut-il 1 ?</p>', 'Quand les entrées sont différentes', ['Quand elles sont égales', 'Toujours', 'Jamais'], '<p>A ⊕ B = 1 si A ≠ B.</p>'),
    K.pick('e3', 'De Morgan', 'Algèbre de Boole', '<p>(A + B)‾ est égal à :</p>', 'Ā · B̄', ['Ā + B̄', 'A · B', 'A + B̄'], '<p>La complémentation transforme le OU en ET et complémente chaque variable.</p>'),
    K.num('e4', 'Somme binaire', 'Combinatoire', '<p>Calculez 1011 + 0110 en binaire. Donnez le résultat en décimal.</p>', 17, '', { abs: 0.1 }, '<p>11 + 6 = 17 (10001 en binaire).</p>'),
    K.num('e5', 'Diviseur d’horloge', 'Séquentiel', '<p>Une horloge de 8 MHz traverse 3 bascules montées en diviseur. Calculez la fréquence en sortie, en MHz.</p>', 1, 'MHz', { rel: 0.02 }, '<p>8 MHz / 2³ = 1 MHz.</p>'),
    K.num('e6', 'Capacité d’un compteur', 'Séquentiel', '<p>Combien de valeurs différentes un compteur de 8 bits peut-il prendre ?</p>', 256, '', { abs: 0.1 }, '<p>2⁸ = 256 valeurs, de 0 à 255.</p>'),
    K.text('e7', 'Simplification', 'Algèbre de Boole', '<p>Simplifiez F = A·B + A·B̄. Répondez par une seule lettre.</p>', 'A', function (t) { return /^a$/i.test(t.trim()); }, '<p>A·B + A·B̄ = A·(B + B̄) = A.</p>'),
    K.pick('e8', 'Bascule D', 'Séquentiel', '<p>Quand une bascule D recopie-t-elle son entrée sur Q ?</p>', 'Au front montant de l’horloge', ['À tout instant', 'Quand D passe à 0', 'Uniquement à la mise sous tension'], '<p>La bascule échantillonne D au front d’horloge, puis conserve la valeur.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('logique', list) };
});
