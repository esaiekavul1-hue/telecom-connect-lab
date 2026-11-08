/*
 * TELECOM CONNECT LAB 2.0 — Architecture d'un ordinateur.
 * Modèle : machine à accumulateur pédagogique sur 16 mots de 8 bits.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, si = K.si, v = K.v, S = K.S;
  var OPS = ['HALT', 'LOAD', 'ADD', 'SUB', 'STORE', 'JMP', 'JZ', 'OUT'];
  function enc(op, a) { return OPS.indexOf(op) * 16 + (a || 0); }
  function pad(a) { while (a.length < 16) a.push(0); return a; }
  var PROGRAMS = {
    somme: { name: 'Somme de deux nombres', mem: pad([enc('LOAD', 14), enc('ADD', 15), enc('STORE', 13), enc('OUT'), enc('HALT'), 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 5]) },
    boucle: { name: 'Compte à rebours', mem: pad([enc('LOAD', 14), enc('OUT'), enc('SUB', 15), enc('STORE', 14), enc('JZ', 6), enc('JMP', 0), enc('HALT'), 0, 0, 0, 0, 0, 0, 0, 3, 1]) }
  };
  function freshState(pn) { return { prog: pn, pc: 0, acc: 0, mem: PROGRAMS[pn].mem.slice(), halted: 0, out: [], steps: 0, trace: '' }; }
  function step(st) {
    if (st.halted) return st;
    var w = st.mem[st.pc], op = OPS[w >> 4], a = w & 15;
    st.trace = 'Lecture à l’adresse ' + st.pc + ', décodage : ' + op + (op === 'HALT' || op === 'OUT' ? '' : ' ' + a);
    var next = (st.pc + 1) % 16;
    if (op === 'HALT') { st.halted = 1; st.steps++; return st; }
    if (op === 'LOAD') st.acc = st.mem[a];
    else if (op === 'ADD') st.acc = (st.acc + st.mem[a]) & 255;
    else if (op === 'SUB') st.acc = (st.acc - st.mem[a] + 256) & 255;
    else if (op === 'STORE') st.mem[a] = st.acc;
    else if (op === 'JMP') next = a;
    else if (op === 'JZ') { if (st.acc === 0) next = a; }
    else if (op === 'OUT') st.out.push(st.acc);
    st.pc = next; st.steps++;
    return st;
  }
  function amat(h, m, p) { return h + m * p; }
  function disasm(w) { var op = OPS[w >> 4]; if (!op) return '?'; return op === 'HALT' || op === 'OUT' ? op : op + ' ' + (w & 15); }
  var math = { OPS: OPS, enc: enc, PROGRAMS: PROGRAMS, freshState: freshState, step: step, amat: amat };

  var lesson = K.lesson({ id: 'ordinateur', title: 'Architecture d’un ordinateur',
    intro: 'Un ordinateur exécute une liste d’instructions simples, à grande vitesse, en échangeant sans cesse avec sa mémoire.',
    objectives: ['Identifier les composants d’un ordinateur.', 'Décrire le cycle d’instruction.', 'Expliquer la hiérarchie de la mémoire et calculer un temps d’accès moyen.', 'Distinguer stockage, mémoire et périphériques.'],
    prerequisites: 'Représentation des données.',
    sources: ['Pages « Von Neumann architecture », « Instruction cycle », « Average memory access time ».'],
    figures: { vn: { caption: 'Architecture de von Neumann : données et instructions partagent la même mémoire.', svg: function () { return S.blocks({ w: 520, h: 170, label: 'Processeur, mémoire, entrées-sorties reliés par un bus.', boxes: [{ id: 'c', x: 40, y: 20, w: 170, h: 54, t: 'Processeur', sub: 'UAL + contrôle' }, { id: 'm', x: 310, y: 20, w: 170, h: 54, t: 'Mémoire', sub: 'instructions, données' }, { id: 'b', x: 40, y: 118, w: 440, h: 30, t: 'Bus' }, { id: 'e', x: 225, y: 72, w: 70, h: 30, t: 'E/S' }], links: [{ a: 'c', b: 'b', from: 'b', to: 't', both: true, dx: -100 }, { a: 'm', b: 'b', from: 'b', to: 't', both: true, dx: 100 }, { a: 'e', b: 'b', from: 'b', to: 't', both: true }] }); } },
      hier: { caption: 'Hiérarchie de mémoire : plus c’est proche du processeur, plus c’est rapide et plus c’est petit.', svg: function () { return S.blocks({ w: 520, h: 110, label: 'Registres, caches, mémoire centrale, stockage.', boxes: [{ id: 'a', x: 15, y: 30, w: 110, h: 50, t: 'Registres', sub: '< 1 ns' }, { id: 'b', x: 140, y: 30, w: 110, h: 50, t: 'Caches', sub: 'ns' }, { id: 'c', x: 265, y: 30, w: 110, h: 50, t: 'RAM', sub: 'dizaines de ns' }, { id: 'd', x: 390, y: 30, w: 115, h: 50, t: 'Stockage', sub: 'µs à ms' }], links: [{ a: 'a', b: 'b', both: true }, { a: 'b', b: 'c', both: true }, { a: 'c', b: 'd', both: true }] }); } } },
    chapters: [
      { title: 'Les composants', summary: 'Processeur, mémoire, bus, périphériques.', html: [
        '<p class="lead">Le modèle de von Neumann, toujours à la base des machines actuelles, distingue quatre éléments.</p>',
        '<div data-fig="vn"></div>',
        K.defs([['UAL', 'Unité arithmétique et logique : calcule.'], ['Unité de contrôle', 'Séquence les opérations.'], ['Goulot de von Neumann', 'Limite du débit entre processeur et mémoire.']]),
        K.formula('Débit = largeur du bus × fréquence', 'Débit maximal théorique d’un bus, sans surcoût de protocole.'),
        K.example('débit de bus', '<p>Un bus de 64 bits à 3 200 MT/s transfère au plus 8 octets × 3,2·10⁹ = ' + si(8 * 3.2e9, 'o/s') + '.</p>'),
        K.apply('<p>Dans ce modèle, instructions et données partagent une même mémoire, ce qui permet de charger n’importe quel programme. Un téléphone, un serveur et un microcontrôleur reposent sur ces mêmes principes, avec des capacités très différentes. Choisir un équipement revient donc souvent à équilibrer processeur, mémoire et stockage selon l’usage réel, plutôt qu’à regarder une seule caractéristique.</p>')] },
      { title: 'Le cycle d’instruction', summary: 'Lecture, décodage, exécution.', html: [
        '<p class="lead">Le processeur répète sans fin le même cycle.</p>',
        K.defs([['Compteur de programme (PC)', 'Registre contenant l’adresse de la prochaine instruction.'], ['Accumulateur', 'Registre de travail de la machine étudiée ici.'], ['Instruction', 'Opération codée en binaire.']]),
        K.formula('T<sub>exécution</sub> = N<sub>instr</sub> × CPI / f', 'N<sub>instr</sub> : nombre d’instructions, CPI : cycles par instruction, f : fréquence d’horloge.'),
        K.example('temps d’exécution', '<p>2·10⁹ instructions, CPI de 1,5 à 3 GHz : T = 2·10⁹ × 1,5 / 3·10⁹ = 1 s.</p>'),
        '<p>À chaque cycle, l’unité de contrôle lit le mot situé à l’adresse indiquée par le compteur de programme, le décode pour savoir quelle opération réaliser, puis l’exécute et prépare l’adresse suivante. Une instruction de saut remplace simplement le contenu du compteur de programme : c’est ce mécanisme qui permet les boucles et les décisions.</p>'] },
      { title: 'Mémoires et stockage', summary: 'Cache, temps d’accès moyen, périphériques.', html: [
        '<p class="lead">Un processeur attend souvent sa mémoire. Les caches réduisent cette attente en exploitant la répétition des accès.</p>',
        '<div data-fig="hier"></div>',
        K.formula('AMAT = H + MR · AMP', 'H : temps d’accès au cache, MR : taux de défaut, AMP : pénalité moyenne de défaut.'),
        K.example('intérêt d’un cache', '<p>H = 1 ns, MR = 5 %, AMP = 100 ns : AMAT = 1 + 0,05 × 100 = ' + fN(amat(1, 0.05, 100)) + ' ns. À 1 % de défaut : ' + fN(amat(1, 0.01, 100)) + ' ns.</p>'),
        K.defs([['RAM', 'Mémoire volatile de travail.'], ['SSD', 'Stockage non volatile à mémoire flash.'], ['Périphérique', 'Dispositif d’entrée ou de sortie.']]),
        K.pitfalls(['<strong>Confondre fréquence et performance.</strong> Le CPI et la mémoire comptent autant.', '<strong>Confondre RAM et stockage.</strong> La RAM s’efface à l’arrêt.', '<strong>Croire qu’ajouter de la RAM accélère tout.</strong> Elle aide surtout quand la mémoire manque.']),
        K.summary(['Processeur, mémoire, E/S et bus.', 'Lecture, décodage, exécution.', 'T = N × CPI / f.', 'AMAT = H + MR × AMP.']),
        K.toLab('ordinateur', 'Exécutez pas à pas un petit programme et observez les registres.')] }
    ] });

  var D = Object.assign(freshState('somme'), { H: 1, MR: 5, AMP: 100 });
  function M(s) { return { w: s.mem[s.pc], am: amat(s.H, s.MR / 100, s.AMP) }; }
  var lab = { id: 'ordinateur', title: 'Processeur pas à pas et cache', short: 'Architecture', icon: 'device', badge: 'Machine à accumulateur pédagogique',
    text: 'Exécutez un programme instruction par instruction, modifiez les données et observez les registres et la mémoire.',
    summary: 'Faites tourner un mini-processeur pas à pas, modifiez la mémoire et comparez les temps d’accès d’un cache.',
    params: [{ group: 'Programme' }, { k: 'prog', label: 'Programme', opts: [['somme', 'Somme'], ['boucle', 'Compte à rebours']], onChange: function (s) { Object.assign(s, freshState(s.prog)); } }, { group: 'Cache' }, { k: 'H', label: 'Temps d’accès au cache', min: 0.5, max: 10, step: 0.5, unit: 'ns', dec: 1 }, { k: 'MR', label: 'Taux de défaut', min: 0, max: 50, step: 0.5, unit: '%', dec: 1 }, { k: 'AMP', label: 'Pénalité de défaut', min: 10, max: 300, step: 5, unit: 'ns', dec: 0 }],
    defaults: D, model: M,
    actions: { step: function (s) { step(s); }, run: function (s) { for (var i = 0; i < 200 && !s.halted; i++) step(s); }, inc: function (s, a) { s.mem[+a] = (s.mem[+a] + 1) & 255; }, reset: function (s) { Object.assign(s, freshState(s.prog)); } },
    widget: function (s, m) {
      return '<div class="sim-row"><button type="button" class="btn btn--primary btn--sm" data-act="step"' + (s.halted ? ' disabled' : '') + '>Instruction suivante</button><button type="button" class="btn btn--ghost btn--sm" data-act="run"' + (s.halted ? ' disabled' : '') + '>Tout exécuter</button><button type="button" class="btn btn--ghost btn--sm" data-act="reset">Réinitialiser</button></div>' +
        '<p>PC = <strong>' + s.pc + '</strong> · Accumulateur = <strong>' + s.acc + '</strong> · ' + s.steps + ' instruction(s)' + (s.halted ? ' · <strong>arrêté</strong>' : '') + (s.out.length ? ' · Sortie : <strong>' + s.out.join(', ') + '</strong>' : '') + '</p>' + (s.trace ? '<p class="muted">' + S.esc(s.trace) + '</p>' : '') +
        '<div class="sim-cells">' + s.mem.map(function (w, i) { return '<div class="sim-cell' + (i === s.pc ? ' is-on' : '') + '"><small>' + i + '</small>' + w + '<small>' + (i < 14 ? disasm(w) : 'donnée') + '</small></div>'; }).join('') + '</div>' +
        '<div class="sim-row"><span>Modifier les données :</span><button type="button" class="sim-btn" data-act="inc" data-arg="14">Case 14 +1</button><button type="button" class="sim-btn" data-act="inc" data-arg="15">Case 15 +1</button></div>';
    },
    expr: function (s, m) { return 'AMAT = ' + fN(m.am) + ' ns'; },
    readouts: [['Compteur de programme', function (s) { return String(s.pc); }], ['Accumulateur', function (s) { return String(s.acc); }], ['Instructions exécutées', function (s) { return String(s.steps); }], ['Temps d’accès moyen', function (s, m) { return fN(m.am) + ' ns'; }]],
    explain: function (s, m) { return '<p>' + (s.trace ? S.esc(s.trace) + '. ' : 'Lancez une instruction pour commencer. ') + 'Le PC vaut ' + s.pc + '. Le temps d’accès moyen du cache réglé est ' + fN(m.am) + ' ns.</p>'; },
    missions: [
      { id: 'm1', title: 'Faire tourner le programme', text: 'Exécutez le programme « Somme » jusqu’à son arrêt.', solution: function (s, a) { Object.assign(s, freshState('somme')); a.run(s); }, check: function (s) { return s.prog === 'somme' && s.halted && s.mem[13] === 12 ? { ok: true, msg: 'Réussi : la case 13 contient 12 après ' + s.steps + ' instructions.' } : { ok: false, msg: 'Le programme n’est pas terminé (ou a changé).' }; } },
      { id: 'm2', title: 'Modifier les données', text: 'Faites en sorte que la somme vaille 20, puis exécutez le programme.', solution: function (s, a) { Object.assign(s, freshState('somme')); for (var i = 0; i < 8; i++) a.inc(s, '14'); a.run(s); }, check: function (s) { return s.prog === 'somme' && s.halted && s.mem[13] === 20 ? { ok: true, msg: 'Réussi : la somme des cases 14 et 15 vaut 20.' } : { ok: false, msg: 'Résultat : ' + s.mem[13] + '. Modifiez les cases 14 et 15, puis exécutez.' }; } },
      { id: 'm3', title: 'Observer une boucle', text: 'Exécutez le compte à rebours jusqu’à la fin : le saut JZ termine la boucle.', solution: function (s, a) { Object.assign(s, freshState('boucle')); a.run(s); }, check: function (s) { return s.prog === 'boucle' && s.halted && s.out.length === 3 ? { ok: true, msg: 'Réussi : sortie ' + s.out.join(', ') + '. Trois tours de boucle.' } : { ok: false, msg: 'Choisissez le compte à rebours et exécutez-le entièrement.' }; } },
      { id: 'm4', title: 'Accélérer les accès', text: 'Réglez le cache pour un AMAT inférieur à 2 ns avec une pénalité de 100 ns.', solution: { H: 1, MR: 0.5, AMP: 100 }, check: function (s, m) { if (s.AMP !== 100) return { ok: false, msg: 'Gardez une pénalité de 100 ns.' }; return m.am < 2 ? { ok: true, msg: 'Réussi : AMAT = ' + fN(m.am) + ' ns.' } : { ok: false, msg: 'AMAT = ' + fN(m.am) + ' ns.' }; } }],
    limits: '<p>La machine est volontairement minimale : pas de pipeline, d’interruptions ni de mémoire virtuelle. Un processeur réel exécute des milliards d’instructions par seconde, avec prédiction de branchement et exécution dans le désordre. La programmation n’est pas l’objet de ce laboratoire.</p>' };

  var list = [
    K.num('e1', 'Temps d’exécution', 'Performance', '<p>10⁹ instructions, CPI = 2, f = 2 GHz. Calculez le temps, en s.</p>', 1, 's', { rel: 0.02 }, '<p>T = 10⁹ × 2 / 2·10⁹ = 1 s.</p>'),
    K.num('e2', 'AMAT', 'Mémoire', '<p>H = 2 ns, MR = 10 %, AMP = 80 ns. Calculez l’AMAT, en ns.</p>', 10, 'ns', { rel: 0.02 }, '<p>2 + 0,1 × 80 = 10 ns.</p>'),
    K.num('e3', 'Taille adressable', 'Mémoire', '<p>Combien d’octets une adresse de 32 bits peut-elle désigner (en Gio) ?</p>', 4, 'Gio', { rel: 0.02 }, '<p>2³² octets = 4 Gio.</p>'),
    K.num('e4', 'Débit de bus', 'Bus', '<p>Bus 32 bits à 100 MHz, un transfert par cycle. Calculez le débit, en Mo/s.</p>', 400, 'Mo/s', { rel: 0.02 }, '<p>4 octets × 100·10⁶ = 400 Mo/s.</p>'),
    K.pick('e5', 'Rôle du PC', 'Cycle d’instruction', '<p>Le compteur de programme contient :</p>', 'l’adresse de la prochaine instruction', ['le résultat du calcul', 'la quantité de mémoire', 'la fréquence du processeur'], '<p>Il est incrémenté à chaque instruction, sauf en cas de saut.</p>'),
    K.pick('e6', 'Volatilité', 'Mémoire', '<p>Quelle mémoire perd son contenu à l’arrêt ?</p>', 'La RAM', ['Le SSD', 'Le disque dur', 'La mémoire flash'], '<p>La RAM est volatile ; les autres supports conservent les données.</p>'),
    K.pick('e7', 'Goulot de von Neumann', 'Architecture', '<p>Il désigne :</p>', 'la limite du débit entre processeur et mémoire', ['une limite de l’écran', 'un type de virus', 'le nombre de périphériques'], '<p>Le processeur attend les transferts avec la mémoire, ce qui limite ses performances.</p>'),
    K.pick('e8', 'Ordre du cycle', 'Cycle d’instruction', '<p>L’ordre correct est :</p>', 'lecture, décodage, exécution', ['exécution, lecture, décodage', 'décodage, exécution, lecture', 'lecture, exécution, décodage'], '<p>L’instruction doit être lue et comprise avant d’être exécutée.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('ordinateur', list) };
});
