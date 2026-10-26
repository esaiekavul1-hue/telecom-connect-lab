/*
 * Page d'accueil.
 * Le bandeau d'ouverture contient un petit écran d'oscilloscope réellement
 * calculé : le visiteur peut faire varier la fréquence dès son arrivée.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, M = TCL.signalMath, esc = U.esc;

  function render(main) {
    var st = TCL.store.get();
    var prog = TCL.registry.moduleProgress(st, 'signaux');
    var started = prog.done > 0;
    var lesson = TCL.lessons.signaux;

    // Cartes des modules : statut calculé à partir des parties réellement chargées.
    var reg = TCL.registry;
    var availableCount = reg.available().length;
    var moduleCards = reg.modules.map(function (m) {
      var parts = reg.liveParts(m), status = reg.statusOf(m);
      var p = reg.moduleProgress(st, m.id);
      var links = [
        parts.lesson ? '<a href="#/lecons/' + m.id + '">Leçon</a>' : '',
        parts.lab ? '<a href="#/laboratoire/' + m.id + '">Laboratoire</a>' : '',
        parts.exercises ? '<a href="#/defis/' + m.id + '">Défis</a>' : ''
      ].join('');
      var missing = ['lesson', 'lab', 'exercises'].filter(function (k) { return !parts[k]; });
      var badge = status === 'available' ? (p.complete ? '<span class="badge badge--live">Terminé</span>' : '<span class="badge badge--live">Disponible</span>')
        : status === 'partial' ? '<span class="badge badge--soon">Partiellement disponible</span>' : '<span class="badge badge--soon">En préparation</span>';
      return '<article class="module-card' + (status === 'available' ? ' module-card--live' : '') + '" data-module="' + m.id + '">' +
        '<div class="module-card__top">' + I(m.icon) + badge + '</div>' +
        '<h3>' + (parts.lesson ? '<a href="#/lecons/' + m.id + '">' + esc(m.title) + '</a>' : esc(m.title)) + '</h3><p>' + esc(m.text) + '</p>' +
        (status !== 'planned' ? U.progressBar(p.percent, 'Avancement du module ' + m.title) + '<p class="module-card__meta">' + p.percent + ' % réalisé</p>' : '') +
        (missing.length && status !== 'planned' ? '<p class="module-card__meta">En préparation : ' + missing.map(function (k) { return { lesson: 'leçon', lab: 'simulation', exercises: 'exercices' }[k]; }).join(', ') + '</p>' : '') +
        (links ? '<div class="module-card__links">' + links + '</div>' : '') + '</article>';
    }).join('');

    main.innerHTML = [
      '<section class="hero">',
      '<div class="container hero__grid">',
      '<div class="hero__text">',
      '<img class="hero__mark" src="assets/images/logo-mark.svg" alt="" width="64" height="64">',
      '<h1 class="hero__title" tabindex="-1">TELECOM CONNECT LAB</h1>',
      '<p class="hero__slogan">Apprendre · Simuler · Comprendre</p>',
      '<p class="hero__sign">Du réel au virtuel. De la théorie à la pratique.</p>',
      '<p class="hero__desc">Une plateforme pour voir ce que disent les formules. Lisez une leçon courte, manipulez le signal dans le laboratoire, puis vérifiez votre compréhension avec des exercices corrigés. Elle complète les cours de vos enseignants.</p>',
      '<div class="hero__actions">',
      '<a class="btn btn--primary btn--lg" href="#/lecons/signaux">' + I('book') + 'Commencer à apprendre</a>',
      '<a class="btn btn--on-dark btn--lg" href="#/laboratoire/signaux">' + I('flask') + 'Explorer le laboratoire</a>',
      '</div>',
      '</div>',
      '<figure class="hero__scope">',
      '<div class="hero__scope-top"><span class="hero__scope-name">' + I('wave') + 'Essai en direct</span>',
      '<button type="button" class="icon-btn" id="hero-pause" aria-pressed="false" aria-label="Mettre l’animation en pause">' + I('pause') + '</button></div>',
      '<div id="hero-plot" class="hero__plot"></div>',
      '<div class="hero__knob">',
      '<label for="hero-f">Fréquence</label>',
      '<input type="range" id="hero-f" min="50" max="500" step="10" value="100">',
      '<p class="hero__values" aria-live="polite"><span id="hero-fv"></span><span id="hero-tv"></span></p>',
      '</div>',
      '<figcaption>Augmentez la fréquence : les cycles se resserrent, car la période T = 1/f diminue.</figcaption>',
      '</figure>',
      '</div>',
      '</section>',

      '<section class="section">',
      '<div class="container feature">',
      '<div class="feature__text">',
      '<p class="kicker">Premier module conseillé</p>',
      '<h2>Comprendre les signaux</h2>',
      '<p>' + esc(lesson.intro) + '</p>',
      '<ul class="feature__list">',
      '<li>' + I('book') + '<span><strong>' + lesson.chapters.length + ' chapitres</strong> illustrés, du signal analogique à la lecture d’un graphique</span></li>',
      '<li>' + I('flask') + '<span><strong>Un laboratoire</strong> pour régler A, f et φ, avec ' + TCL.labs.signaux.missions.length + ' missions de vérification</span></li>',
      '<li>' + I('target') + '<span><strong>' + TCL.exercises.signaux.count + ' exercices corrigés</strong> avec explication détaillée</span></li>',
      '</ul>',
      started
        ? '<div class="feature__progress"><p>Votre avancement : <strong>' + prog.percent + ' %</strong></p>' + U.progressBar(prog.percent, 'Avancement du module Comprendre les signaux') + '<a class="btn btn--primary" href="#/progression">' + I('chart') + 'Voir ma progression</a></div>'
        : '<a class="btn btn--primary" href="#/lecons/signaux">' + I('book') + 'Ouvrir le premier chapitre</a>',
      '</div>',
      '<div class="feature__visual"><div id="home-fig" class="figure-plot"></div>',
      '<p class="figure-caption">x(t) = 4 · sin(2π · 100 · t) : amplitude 4 V, période 10 ms.</p></div>',
      '</div>',
      '</section>',

      '<section class="section section--tint">',
      '<div class="container">',
      '<div class="section-head"><h2>Un parcours en quatre espaces</h2><p>Chaque espace correspond à une étape de l’apprentissage. Vous pouvez les parcourir dans l’ordre ou revenir à l’un d’eux à tout moment.</p></div>',
      '<ol class="journey">',
      step('Mes leçons', 'book', '#/lecons', 'Des explications progressives, des illustrations calculées, les unités et les erreurs à éviter.', 'Lire les leçons'),
      step('Mon laboratoire', 'flask', '#/laboratoire', 'Des simulations à manipuler : chaque réglage met à jour la courbe, les valeurs et l’explication.', 'Ouvrir le laboratoire'),
      step('Mes défis', 'target', '#/defis', 'Des exercices vérifiés par le calcul, avec la correction expliquée après chaque réponse.', 'Relever les défis'),
      step('Ma progression', 'chart', '#/progression', 'Vos chapitres lus, vos missions et vos résultats, calculés à partir de ce que vous avez réellement fait.', 'Suivre ma progression'),
      '</ol>',
      '</div>',
      '</section>',

      '<section class="section">',
      '<div class="container why">',
      '<div class="section-head"><h2>Pourquoi apprendre en manipulant ?</h2></div>',
      '<div class="why__grid">',
      '<div class="why__item"><h3>' + I('wave') + 'Voir l’effet immédiatement</h3><p>Une formule comme T = 1/f devient concrète quand on voit les cycles se resserrer en augmentant la fréquence.</p></div>',
      '<div class="why__item"><h3>' + I('sparkle') + 'Tester ses hypothèses</h3><p>« Et si je double l’amplitude ? » Le laboratoire répond tout de suite, sans matériel et sans risque d’erreur de branchement.</p></div>',
      '<div class="why__item"><h3>' + I('check') + 'Vérifier sa compréhension</h3><p>Les exercices corrigés montrent ce qui est acquis et ce qu’il faut revoir, avant l’examen plutôt qu’après.</p></div>',
      '</div>',
      '<p class="why__note">' + I('info') + '<span>Les simulations reposent sur des modèles idéaux. Elles préparent aux travaux pratiques en laboratoire réel, sans les remplacer.</span></p>',
      '</div>',
      '</section>',

      '<section class="section section--tint">',
      '<div class="container">',
      '<div class="section-head"><h2>Les modules</h2><p>' + availableCount + ' modules sont disponibles, chacun avec une leçon, une simulation interactive et une série d’exercices corrigés. Suivez-les dans l’ordre proposé ou choisissez celui dont vous avez besoin.</p></div>',
      '<div class="module-grid">' + moduleCards + '</div>',
      '</div>',
      '</section>'
    ].join('');

    // Figure du module (calculée)
    var fig = TCL.plot.mount(U.qs('#home-fig', main), function (w) {
      return Object.assign(TCL.plot.sineOptions({ A: 4, f: 100, phi: 0, win: 0.02, showPeriod: true, ampMarker: true, title: 'Sinusoïde de 4 V à 100 Hz' }), { ratio: w < 500 ? 0.7 : 0.6 });
    });

    // Oscilloscope d'accueil
    var heroEl = U.qs('#hero-plot', main);
    var slider = U.qs('#hero-f', main);
    var f = 100, offset = 0, paused = U.prefersReducedMotion(), raf = null, lastTs = null;
    var hero = TCL.plot.mount(heroEl, function (w) {
      return Object.assign(TCL.plot.sineOptions({ A: 3, f: f, phi: offset, win: 0.02, yMax: 5, yStep: 1, title: 'Oscilloscope de démonstration', desc: 'Sinusoïde de 3 V dont la fréquence se règle avec le curseur placé dessous.' }), { ratio: w < 420 ? 0.62 : 0.56 });
    });
    function values() {
      U.qs('#hero-fv', main).textContent = 'f = ' + M.formatFrequency(f);
      U.qs('#hero-tv', main).textContent = 'T = ' + M.formatTime(M.period(f));
    }
    function redrawTrace() {
      var path = heroEl.querySelector('.scope__trace');
      var sc = hero.scale;
      if (!path || !sc) return;
      var n = 500, d = '';
      for (var i = 0; i <= n; i++) {
        var t = i / n * 0.02;
        d += (i ? 'L' : 'M') + sc.X(t).toFixed(1) + ' ' + sc.Y(M.value(3, f, offset, t)).toFixed(1);
      }
      path.setAttribute('d', d);
    }
    function frame(ts) {
      if (lastTs != null) offset = (offset + (ts - lastTs) / 1000 * 2.4) % (2 * Math.PI);
      lastTs = ts;
      redrawTrace();
      raf = root.requestAnimationFrame(frame);
    }
    function play() { if (!raf && !paused && !document.hidden) { lastTs = null; raf = root.requestAnimationFrame(frame); } }
    function stop() { if (raf) root.cancelAnimationFrame(raf); raf = null; }
    slider.addEventListener('input', function () { f = Number(slider.value); hero.update(); values(); });
    var pauseBtn = U.qs('#hero-pause', main);
    function syncPauseBtn() {
      pauseBtn.innerHTML = I(paused ? 'play' : 'pause');
      pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pauseBtn.setAttribute('aria-label', paused ? 'Relancer l’animation' : 'Mettre l’animation en pause');
    }
    pauseBtn.addEventListener('click', function () { paused = !paused; syncPauseBtn(); if (paused) stop(); else play(); });
    function onVis() { if (document.hidden) stop(); else play(); }
    document.addEventListener('visibilitychange', onVis);
    syncPauseBtn(); values(); play();

    return function () { stop(); hero.destroy(); fig.destroy(); document.removeEventListener('visibilitychange', onVis); };
  }

  function step(title, icon, href, text, cta) {
    return '<li class="journey__step"><div class="journey__icon">' + I(icon) + '</div><h3><a href="' + href + '">' + esc(title) + '</a></h3><p>' + esc(text) + '</p><a class="journey__cta" href="' + href + '" tabindex="-1" aria-hidden="true">' + esc(cta) + '</a></li>';
  }

  TCL.pages.home = { title: 'Accueil', render: render };
})(window);
