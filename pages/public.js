/*
 * TELECOM CONNECT LAB 2.0 — Espace public de découverte.
 * Un visiteur essaie une vraie leçon, une vraie simulation et un mini-défi.
 * Aucun résultat n'est enregistré ni présenté comme une validation.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc, P = TCL.pages, CUR = TCL.curriculum, M = TCL.signalMath, C = TCL.circuitMath, K = TCL.labkit, D = TCL.demo;
  var P_MAX = 0.25; // puissance d'une résistance courante (W)

  function fN(x, s) { return M.formatNumber(x, s == null ? 3 : s); }
  function amp(i) { return Math.abs(i) >= 1 ? fN(i) + ' A' : fN(i * 1000) + ' mA'; }
  function watt(p) { return p >= 1 ? fN(p) + ' W' : fN(p * 1000) + ' mW'; }

  function joinBand(title, text) {
    return '<section class="join-band"><div><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p></div><div class="join-band__actions">' +
      '<a class="btn btn--primary" href="#/inscription">' + I('user') + 'Créer un compte</a><a class="btn btn--ghost" href="#/connexion">' + I('login') + 'Se connecter</a></div></section>';
  }

  /* ----------------------------------- Accueil ----------------------------------- */

  function trackCards() {
    return CUR.spaces.map(function (s) {
      var live = s.courses.filter(function (c) { return c.modules.length; }).length;
      return '<article class="card space-card"><div class="card__top">' + I(s.icon) + '<span class="badge ' + (live ? 'badge--live' : 'badge--soon') + '">' + (live ? live + ' / ' + s.courses.length + ' cours disponibles' : 'Programme à développer') + '</span></div><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></article>';
    }).join('');
  }

  function why(icon, title, text) { return '<div class="why__item"><h3>' + I(icon) + esc(title) + '</h3><p>' + esc(text) + '</p></div>'; }
  function tryCard(icon, title, text, href, cta) { return '<li class="journey__step"><div class="journey__icon">' + I(icon) + '</div><h3><a href="' + href + '">' + esc(title) + '</a></h3><p>' + esc(text) + '</p><a class="journey__cta" href="' + href + '" tabindex="-1" aria-hidden="true">' + esc(cta) + '</a></li>'; }

  function home(main) {
    main.innerHTML = [
      '<section class="hero"><div class="container hero__grid"><div class="hero__text">',
      '<img class="hero__mark" src="assets/images/logo-mark.svg" alt="" width="64" height="64">',
      '<h1 class="hero__title" tabindex="-1">TELECOM CONNECT LAB</h1>',
      '<p class="hero__slogan">Apprendre · Simuler · Pratiquer · Innover</p>',
      '<p class="hero__sign">Du réel au virtuel. De la théorie à la pratique.</p>',
      '<p class="hero__desc">La plateforme pour apprendre les télécommunications en manipulant : des leçons claires, des laboratoires virtuels calculés et des exercices corrigés, pensés pour les réalités des étudiants et des techniciens en RDC.</p>',
      '<div class="hero__actions"><a class="btn btn--primary btn--lg" href="#/lecons/decouverte">' + I('sparkle') + 'Découvrir</a>',
      '<a class="btn btn--on-dark btn--lg" href="#/inscription">' + I('user') + 'Créer un compte</a>',
      '<a class="btn btn--on-dark btn--lg" href="#/connexion">' + I('login') + 'Se connecter</a></div>',
      '</div>', P.heroScopeHtml(), '</div></section>',

      '<section class="section"><div class="container why"><div class="section-head"><h2>Notre objectif</h2><p>Permettre à chacun de comprendre les technologies, de les pratiquer sans laboratoire physique et de mesurer réellement ses progrès.</p></div>',
      '<div class="why__grid">',
      why('book', 'Comprendre', 'Chaque notion part de l’essentiel : la formule expliquée, ses unités, un exemple chiffré et les erreurs à éviter.'),
      why('flask', 'Pratiquer', 'Les laboratoires virtuels recalculent résultats et courbes à chaque réglage, sans matériel et sans risque.'),
      why('shield', 'Progresser', 'Les exercices sont corrigés immédiatement, et les évaluations du compte sont corrigées par le serveur.'),
      '</div></div></section>',

      '<section class="section section--tint"><div class="container"><div class="section-head"><h2>Six parcours</h2><p>À la création de votre compte, vous choisissez votre parcours. Votre espace s’adapte ensuite à votre niveau.</p></div>',
      '<div class="cards cards--spaces">' + trackCards() + '</div>',
      '<p class="muted note">Structure pédagogique proposée, qui ne constitue pas un programme universitaire officiel. Les cours encore en développement sont indiqués comme tels.</p></div></section>',

      '<section class="section"><div class="container"><div class="section-head"><h2>Essayez maintenant, sans compte</h2><p>Une démonstration complète autour de la loi d’Ohm.</p></div><ol class="journey">',
      tryCard('book', 'Une leçon', 'Lisez une vraie leçon, avec ses figures et un exemple chiffré.', '#/lecons/decouverte', 'Lire la leçon'),
      tryCard('flask', 'Un laboratoire', 'Modifiez la tension et la résistance, observez le courant et la puissance.', '#/laboratoire/decouverte', 'Ouvrir la simulation'),
      tryCard('target', 'Un mini-défi', 'Trois questions, corrigées et expliquées immédiatement.', '#/defis/decouverte', 'Relever le défi'),
      tryCard('chart', 'Le suivi', 'Voyez comment la plateforme suit votre progression.', '#/progression', 'Voir l’aperçu'),
      '</ol></div></section>',

      '<section class="section section--tint"><div class="container why"><div class="section-head"><h2>Conçue pour vos conditions réelles</h2></div><div class="why__grid">',
      why('device', 'Légère sur téléphone', 'Une application adaptée aux téléphones Android modestes et à la consommation de données.'),
      why('cloud', 'Disponible hors ligne', 'Après une première visite, vos leçons et laboratoires restent accessibles sans connexion.'),
      why('check', 'Gratuite pour apprendre', 'La formation fondamentale reste gratuite pour les étudiants, sans publicité intrusive.'),
      '</div></div></section>',

      '<section class="section"><div class="container"><div class="section-head"><h2>Comment ça marche</h2></div><ol class="how-steps">',
      '<li><strong>Créez votre compte</strong><span>Un e-mail suffit : aucun mot de passe à retenir.</span></li>',
      '<li><strong>Choisissez votre parcours</strong><span>Une seule fois, de Préparatoire au monde professionnel.</span></li>',
      '<li><strong>Apprenez et simulez</strong><span>Leçons, laboratoires et défis de votre niveau.</span></li>',
      '<li><strong>Validez vos compétences</strong><span>Des évaluations corrigées par le serveur, et une progression retrouvée sur tous vos appareils.</span></li>',
      '</ol>' + joinBand('Prêt à commencer ?', 'Créez votre compte gratuit et retrouvez votre progression sur tous vos appareils.') + '</div></section>'
    ].join('');
    return P.mountHeroScope(main);
  }

  /* ------------------------------------ Leçons ------------------------------------ */

  function lessons(main) {
    var n = Object.keys(CUR.competencies).length;
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Leçons' }]) +
      P.head('Leçons', 'Découvrez notre façon d’enseigner avec une leçon complète, en accès libre.') +
      '<div class="cards"><article class="card card--live"><div class="card__top">' + I('circuit') + '<span class="badge badge--live">Démonstration</span></div><h2><a href="#/lecons/decouverte">' + esc(D.lesson.title) + '</a></h2><p>' + esc(D.lesson.intro) + '</p><div class="card__actions"><a class="btn btn--primary btn--sm" href="#/lecons/decouverte">' + I('book') + 'Lire la leçon</a><a class="btn btn--ghost btn--sm" href="#/laboratoire/decouverte">Simulation</a></div></article>' +
      '<article class="card"><div class="card__top">' + I('lock') + '<span class="badge badge--soon">Avec un compte</span></div><h2>Le catalogue complet</h2><p>' + n + ' modules complets aujourd’hui, chacun avec sa leçon, sa simulation et ses exercices corrigés, adaptés à votre parcours.</p><div class="card__actions"><a class="btn btn--ghost btn--sm" href="#/inscription">Créer un compte</a></div></article></div></div>';
  }

  function lesson(main) {
    main.innerHTML = '<div class="container page page--narrow">' + P.crumbs([{ label: 'Leçons', href: '#/lecons' }, { label: D.lesson.title }]) +
      '<article class="lesson__body prose"><p class="lesson__step">Leçon de démonstration</p><h1 tabindex="-1">' + esc(D.lesson.title) + '</h1><p>' + esc(D.lesson.intro) + '</p>' + D.lesson.html + '</article>' +
      '<nav class="next-links" aria-label="Suite"><a class="btn btn--primary" href="#/laboratoire/decouverte">' + I('flask') + 'Essayer dans le laboratoire</a><a class="btn btn--ghost" href="#/defis/decouverte">' + I('target') + 'Relever le mini-défi</a></nav></div>';
    return P.mountFigures(main, D.lesson);
  }

  /* ---------------------------------- Laboratoire ---------------------------------- */

  function labs(main) {
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Laboratoire' }]) +
      P.head('Laboratoire', 'Une simulation à manipuler librement. Chaque réglage recalcule les résultats.') +
      '<div class="cards"><article class="card card--live"><div class="card__top">' + I('flask') + '<span class="badge badge--live">Démonstration</span></div><h2><a href="#/laboratoire/decouverte">Simulation : la loi d’Ohm</a></h2><p>Réglez la tension et la résistance, puis observez le courant, la puissance et la courbe.</p><div class="card__actions"><a class="btn btn--primary btn--sm" href="#/laboratoire/decouverte">' + I('flask') + 'Ouvrir la simulation</a></div></article>' +
      '<article class="card"><div class="card__top">' + I('lock') + '<span class="badge badge--soon">Avec un compte</span></div><h2>Les laboratoires complets</h2><p>Circuits, signaux, antennes, propagation, modulation, fibre, réseaux : selon votre parcours, avec missions et instruments.</p><div class="card__actions"><a class="btn btn--ghost btn--sm" href="#/inscription">Créer un compte</a></div></article></div></div>';
  }

  function explain(s, i, p) {
    if (s.U === 0) return '<p>Sans tension, aucune charge n’est mise en mouvement : le courant est nul.</p>';
    return '<p>Avec U = <strong>' + fN(s.U) + ' V</strong> et R = <strong>' + fN(s.R) + ' Ω</strong>, le courant vaut I = U/R = <strong>' + amp(i) + '</strong>.</p>' +
      '<p>La résistance dissipe P = U·I = <strong>' + watt(p) + '</strong>. ' + (p > P_MAX ? 'C’est plus que les 0,25 W d’une résistance courante : sur un vrai montage, elle surchaufferait.' : 'Cette valeur reste sous les 0,25 W d’une résistance courante.') + '</p>';
  }

  function lab(main) {
    var s = { U: 12, R: 470 }, logR = K.logSlider(10, 1000);
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Laboratoire', href: '#/laboratoire' }, { label: 'La loi d’Ohm' }]) + '<div class="lab">' +
      K.head({ title: 'Simulation : la loi d’Ohm', badge: 'Résistance idéale, régime continu', text: 'Déplacez les curseurs : le courant, la puissance et le point de fonctionnement sont recalculés.' }) +
      '<div class="lab__grid"><div class="lab__main"><div class="scope-panel"><div class="scope-panel__bar"><p class="scope-panel__expr" id="expr"></p><p class="verdict" id="verdict" aria-live="polite"></p></div><div class="scope-panel__plot" id="ohm-plot"></div></div>' +
      K.readouts([['Courant I', 'r-i'], ['Puissance P', 'r-p'], ['Conductance 1/R', 'r-g'], ['Courant maximal pour 0,25 W', 'r-m']]) + K.explainBox('') +
      '<section class="box"><h2>À essayer</h2><ul><li>Doublez la tension : que devient le courant ?</li><li>Doublez la résistance à tension constante.</li><li>Trouvez un réglage où la résistance dépasse 0,25 W.</li></ul></section></div>' +
      '<aside class="lab__controls" aria-label="Commandes de la simulation"><form class="controls" novalidate>' +
      K.range({ id: 'in-U', label: 'Tension <var>U</var>', min: 0, max: 24, step: 0.5, unit: 'V', srLabel: 'Tension en volts', hint: 'De 0 à 24 V.' }) +
      K.range({ id: 'in-R', label: 'Résistance <var>R</var>', min: 0, max: 1000, step: 1, unit: 'Ω', srLabel: 'Résistance en ohms', hint: 'De 10 à 1 000 Ω (curseur logarithmique).' }) +
      '</form></aside></div>' +
      K.limits('<p>Ce modèle suppose une résistance parfaite, de valeur constante, alimentée par une source idéale. Il ignore la tolérance du composant (souvent ±5 %) et l’effet de son échauffement. Le seuil de 0,25 W correspond à une résistance courante : vérifiez toujours la fiche technique du composant réel.</p>') +
      '<p class="muted note">Démonstration libre : vos essais ne sont pas enregistrés et ne constituent pas une validation.</p>' +
      joinBand('Envie d’aller plus loin ?', 'Avec un compte, accédez aux laboratoires de votre parcours, avec missions et instruments.') + '</div></div>';
    var $ = function (q) { return main.querySelector(q); };
    var chart = TCL.plot.mount($('#ohm-plot'), function (w) {
      var imax = C.current(24, s.R) * 1000, top = imax * 1.1;
      return { kind: 'xy', ratio: w < 520 ? 0.62 : 0.42, title: 'Courant en fonction de la tension', desc: 'Droite passant par l’origine pour une résistance de ' + fN(s.R) + ' ohms.',
        x: { min: 0, max: 24, ticks: [0, 4, 8, 12, 16, 20, 24], label: 'tension U (V)' }, y: { min: 0, max: top, ticks: TCL.plot.niceTicks(0, top, 5), label: 'courant I (mA)' },
        series: [{ points: [[0, 0], [24, imax]] }], points: [{ x: s.U, y: C.current(s.U, s.R) * 1000, label: amp(C.current(s.U, s.R)) }] };
    });
    var pairs;
    function refresh() {
      var i = C.current(s.U, s.R), p = C.powerRI(s.R, i), over = p > P_MAX;
      chart.update();
      $('#expr').innerHTML = 'I = U / R = ' + fN(s.U) + ' / ' + fN(s.R) + ' = ' + amp(i);
      var ve = $('#verdict'); ve.className = 'verdict ' + (over ? 'verdict--ko' : 'verdict--ok'); ve.innerHTML = I(over ? 'alert' : 'check') + '<span>' + (over ? 'Plus de 0,25 W dans la résistance' : 'Puissance dans les limites') + '</span>';
      K.setText(main, '#r-i', amp(i)); K.setText(main, '#r-p', watt(p)); K.setText(main, '#r-g', fN(1000 / s.R) + ' mS'); K.setText(main, '#r-m', amp(Math.sqrt(P_MAX / s.R)));
      K.setText(main, '#in-U-out', fN(s.U) + ' V'); K.setText(main, '#in-R-out', fN(s.R) + ' Ω');
      pairs.U.sync(s.U); pairs.R.sync(s.R);
      $('#explain').innerHTML = explain(s, i, p);
    }
    pairs = {
      U: K.bindPair(main, { id: 'in-U', validate: K.numberValidator(0, 24, 'V', 1), onInput: function (x) { s.U = x; refresh(); }, current: function () { return s.U; } }),
      R: K.bindPair(main, { id: 'in-R', toSlider: logR.to, fromSlider: logR.from, validate: K.numberValidator(10, 1000, 'Ω', 1), onInput: function (x) { s.R = x; refresh(); }, current: function () { return s.R; } })
    };
    refresh();
    return function () { chart.destroy(); };
  }

  /* --------------------------------------- Défis --------------------------------------- */

  function challenges(main) {
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Défis' }]) +
      P.head('Défis', 'Testez-vous : chaque réponse est corrigée et expliquée immédiatement.') +
      '<div class="cards"><article class="card card--live"><div class="card__top">' + I('target') + '<span class="badge badge--live">Démonstration</span></div><h2><a href="#/defis/decouverte">Mini-défi : la loi d’Ohm</a></h2><p>' + D.questions.length + ' questions, avec correction pédagogique immédiate. Aucune validation officielle.</p><div class="card__actions"><a class="btn btn--primary btn--sm" href="#/defis/decouverte">' + I('target') + 'Commencer</a></div></article>' +
      '<article class="card"><div class="card__top">' + I('lock') + '<span class="badge badge--soon">Avec un compte</span></div><h2>Les séries complètes</h2><p>Des exercices par module, un suivi de vos réussites et des évaluations pour valider vos compétences.</p><div class="card__actions"><a class="btn btn--ghost btn--sm" href="#/inscription">Créer un compte</a></div></article></div></div>';
  }

  function challenge(main) {
    var KIT = TCL.exerciseKit, idx = 0, good = 0;
    main.innerHTML = '<div class="container page page--narrow">' + P.crumbs([{ label: 'Défis', href: '#/defis' }, { label: 'Mini-défi' }]) + P.head('Mini-défi : la loi d’Ohm', 'Répondez aux questions : la correction est immédiate.') + '<div id="demo-q"></div></div>';
    var host = U.qs('#demo-q', main);
    function draw() {
      var q = D.questions[idx];
      var field = q.type === 'qcm'
        ? '<fieldset class="choices"><legend class="sr-only">Propositions</legend>' + q.options.map(function (o) { return '<label class="choice"><input type="radio" name="ans" value="' + o.id + '"><span class="choice__letter" aria-hidden="true">' + o.id.toUpperCase() + '</span><span class="choice__text">' + esc(o.label) + '</span></label>'; }).join('') + '</fieldset>'
        : '<div class="numeric"><label for="ans-num">Votre réponse</label><div class="numeric__row"><input type="text" id="ans-num" inputmode="decimal" autocomplete="off" aria-describedby="ans-err"><span class="numeric__unit">' + esc(q.unit) + '</span></div><p class="field-error" id="ans-err" aria-live="polite"></p></div>';
      host.innerHTML = '<article class="qcard"><header class="qcard__head"><p class="qcard__step">Question ' + (idx + 1) + ' sur ' + D.questions.length + '</p><span class="badge badge--skill">' + esc(q.skill) + '</span></header><h2 class="qcard__title" tabindex="-1">' + esc(q.title) + '</h2><div class="qcard__prompt prose">' + q.prompt + '</div><form id="qform" novalidate>' + field + '<button type="submit" class="btn btn--primary">' + I('check') + 'Valider ma réponse</button></form><div id="qfb"></div></article>';
      U.qs('#qform', host).addEventListener('submit', function (e) {
        e.preventDefault();
        var resp = q.type === 'qcm' ? ((U.qs('input[name=ans]:checked', host) || {}).value || '') : U.qs('#ans-num', host).value;
        var r = KIT.check(q, resp);
        if (r.invalid) { if (q.type === 'qcm') U.qs('#qfb', host).innerHTML = '<p class="feedback feedback--ko" role="alert">' + I('info') + '<span>' + esc(r.message) + '</span></p>'; else U.qs('#ans-err', host).textContent = r.message; return; }
        if (r.correct) good++;
        U.qs('#qform', host).querySelector('button').remove();
        U.qsa('input', host).forEach(function (x) { x.disabled = true; });
        var last = idx === D.questions.length - 1;
        U.qs('#qfb', host).innerHTML = '<div class="feedback-card ' + (r.correct ? 'is-ok' : 'is-ko') + '" role="status"><p class="feedback-card__verdict">' + I(r.correct ? 'check' : 'x') + '<span>' + (r.correct ? 'Bonne réponse' : 'Réponse incorrecte') + '</span></p>' + (r.correct ? '' : '<p>Bonne réponse : <strong>' + esc(r.expected) + '</strong></p>') + '<div class="feedback-card__why prose"><h3>Explication</h3>' + q.explanation + '</div><div class="feedback-card__actions"><button type="button" class="btn btn--primary" id="demo-next">' + (last ? 'Voir mon résultat' : 'Question suivante') + I('arrowRight') + '</button></div></div>';
        U.qs('#demo-next', host).addEventListener('click', function () { if (last) result(); else { idx++; draw(); } });
      });
    }
    function result() {
      host.innerHTML = '<article class="qcard"><h2 class="qcard__title" tabindex="-1">Votre résultat</h2><p class="result__score"><strong>' + good + '</strong> / ' + D.questions.length + '</p><p>Ce mini-défi est une démonstration : ce résultat n’est pas enregistré et ne vaut pas validation de compétence.</p><div class="result__actions"><button type="button" class="btn btn--ghost" id="demo-again">' + I('reset') + 'Recommencer</button><a class="btn btn--ghost" href="#/laboratoire/decouverte">' + I('flask') + 'Ouvrir la simulation</a></div></article>' +
        joinBand('Continuez à progresser', 'Avec un compte, vos réussites sont suivies et vos compétences peuvent être validées.');
      U.qs('#demo-again', host).addEventListener('click', function () { idx = 0; good = 0; draw(); });
    }
    draw();
  }

  /* ---------------------------------- Progression ---------------------------------- */

  function progress(main) {
    var guest = TCL.store.get(), hasLocal = !TCL.store.isEmpty(guest);
    function kpi(label, hint) { return '<div class="kpi"><p class="kpi__label">' + esc(label) + '</p><p class="kpi__value" aria-label="Aucune donnée">—</p><p class="kpi__hint">' + esc(hint) + '</p></div>'; }
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Progression' }]) +
      P.head('Progression', 'Avec un compte, la plateforme suit ce que vous faites réellement, et le retrouve sur tous vos appareils.') +
      (hasLocal ? '<div class="callout callout--info">' + I('device') + '<p>Cet appareil conserve une progression réalisée sans compte (' + guest.activity.length + ' activité' + (guest.activity.length > 1 ? 's' : '') + ' récente' + (guest.activity.length > 1 ? 's' : '') + '). Créez un compte ou connectez-vous : elle sera ajoutée à votre espace. <button type="button" class="link-btn link-btn--danger" id="reset-progress">L’effacer de cet appareil</button></p></div>' : '') +
      '<section class="preview" aria-labelledby="preview-title"><p class="preview__tag">' + I('info') + '<span>Aperçu de l’interface : aucune donnée réelle</span></p><h2 id="preview-title">Votre tableau de suivi</h2>' +
      '<div class="kpis">' + kpi('Progression générale', 'calculée sur votre parcours') + kpi('Chapitres lus', 'leçons terminées') + kpi('Exercices réussis', 'au moins une fois') + kpi('Missions du laboratoire', 'réussies') + kpi('Compétences validées', 'par le serveur') + '</div></section>' +
      '<div class="why__grid why__grid--track">' + why('chart', 'Mesuré, jamais estimé', 'Chaque pourcentage provient de vos activités : chapitres lus, missions réussies, réponses correctes.') + why('shield', 'Validé par le serveur', 'Une compétence n’est validée qu’après une évaluation corrigée côté serveur.') + why('cloud', 'Retrouvé partout', 'Votre parcours et vos résultats sont liés à votre compte, pas à votre téléphone.') + '</div>' +
      joinBand('Commencez votre suivi', 'Créez votre compte et choisissez votre parcours : votre tableau de bord se remplira au fil de vos activités.') + '</div>';
    var rb = U.qs('#reset-progress', main);
    if (rb) rb.addEventListener('click', function () {
      if (!root.confirm('Effacer la progression enregistrée sur cet appareil ? Cette action est définitive.')) return;
      TCL.store.resetAll(); U.toast('Progression effacée sur cet appareil.', 'info'); progress(main);
    });
  }

  /* ----------------------------------- Accès réservé ----------------------------------- */

  function gate(main) {
    main.innerHTML = '<div class="container page page--narrow"><div class="empty">' + I('lock', 'empty__icon') + '<h1 tabindex="-1">Réservé aux étudiants inscrits</h1><p>Ce contenu fait partie de l’espace personnel. Créez un compte gratuit ou connectez-vous pour y accéder selon votre parcours.</p>' +
      '<div class="empty__actions"><a class="btn btn--primary" href="#/inscription">' + I('user') + 'Créer un compte</a><a class="btn btn--ghost" href="#/connexion">' + I('login') + 'Se connecter</a></div><p class="note"><a href="#/lecons/decouverte">Essayer la démonstration gratuite</a></p></div></div>';
  }

  P.publicHome = { title: 'Accueil', render: home };
  P.publicLessons = { title: 'Leçons', render: lessons };
  P.publicLesson = { title: D.lesson.title, render: lesson };
  P.publicLabs = { title: 'Laboratoire', render: labs };
  P.publicLab = { title: 'Simulation : la loi d’Ohm', render: lab };
  P.publicChallenges = { title: 'Défis', render: challenges };
  P.publicChallenge = { title: 'Mini-défi', render: challenge };
  P.publicProgress = { title: 'Progression', render: progress };
  P.gate = { title: 'Réservé aux inscrits', render: gate };
})(window);
