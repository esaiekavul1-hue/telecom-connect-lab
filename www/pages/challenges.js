/*
 * Espace « Mes défis » : séries d'exercices corrigés.
 * Une réponse incorrecte ne rapporte aucun point. Chaque réponse est enregistrée
 * dans la progression (tentatives, réussites, séries terminées).
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc, M = TCL.signalMath;
  var P = TCL.pages;
  /* --------------------------------- Liste --------------------------------- */

  function skillsOf(api) {
    var seen = {}, out = [];
    api.list.forEach(function (e) { var k = e.skill.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push(k); } });
    return out;
  }

  function list(main) {
    var st = TCL.store.get();
    var mods = TCL.registry.withExercises();
    var all = TCL.registry.overallProgress(st);
    var cards = mods.map(function (m) {
      var api = TCL.exercises[m.id];
      var p = TCL.registry.moduleProgress(st, m.id);
      var E = (st.exercises[m.id] || {});
      var cur = E.current;
      var curAnswered = cur && !cur.completedAt ? Object.keys(cur.answers || {}).length : 0;
      var label = curAnswered > 0 ? 'Reprendre la série (' + curAnswered + ' / ' + api.count + ')' : (p.seriesCount ? 'Nouvelle série' : 'Commencer les exercices');
      return '<article class="card card--live" data-module="' + m.id + '"><div class="card__top">' + I(m.icon) + '<span class="badge badge--live">' + api.count + ' exercices</span></div>' +
        '<h3><a href="#/defis/' + m.id + '">' + esc(m.title) + '</a></h3>' +
        '<p>' + esc(skillsOf(api).slice(0, 5).join(', ')) + '.</p>' +
        '<p class="card__meta">Réussis : ' + p.exMastered + ' / ' + p.exTotal + (p.best != null ? ' · meilleur score ' + p.best + ' / ' + api.count : '') + '</p>' +
        U.progressBar(p.exMastered / Math.max(1, p.exTotal) * 100, 'Exercices réussis') +
        '<div class="card__actions"><a class="btn btn--primary btn--sm" href="#/defis/' + m.id + '">' + I('target') + label + '</a>' +
        '<a class="btn btn--ghost btn--sm" href="#/lecons/' + m.id + '">Leçon</a></div></article>';
    }).join('');
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Mes défis' }]) +
      P.head('Mes défis', 'Des exercices vérifiés par le calcul, une série par module. Après chaque réponse, vous voyez la correction et son explication.',
        '<div class="head-stat"><p class="head-stat__value">' + all.exMastered + ' / ' + all.exTotal + '</p><p class="head-stat__label">exercices réussis au moins une fois</p></div>') +
      '<div class="cards">' + cards + '</div></div>';
  }

  /* -------------------------------- Session -------------------------------- */

  function session(main, params) {
    var MOD = params.module;
    var mod = TCL.registry.byId(MOD);
    if (!mod || !TCL.registry.liveParts(mod).exercises) return TCL.pages.notFound.render(main);
    var parts = TCL.registry.liveParts(mod);
    var store = TCL.store;
    var api = TCL.exercises[MOD];
    var figCleanup = null;

    function cur() { return store.exercisesOf(store.get(), MOD).current; }
    function ensureSeries() {
      var c = cur();
      if (!c || c.completedAt) {
        store.update(function (s) { store.exercisesOf(s, MOD).current = { startedAt: new Date().toISOString(), index: 0, answers: {} }; }, 'series-start');
      }
    }
    ensureSeries();

    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Mes défis', href: '#/defis' }, { label: mod.title }]) +
      P.moduleNav(MOD, 'exercises') +
      '<div class="quiz-head"><div><h1 tabindex="-1">Défis : ' + esc(mod.title) + '</h1><p class="quiz-head__score" id="score" aria-live="polite"></p></div>' +
      '<button type="button" class="btn btn--ghost btn--sm" id="restart">' + I('reset') + 'Recommencer la série</button></div>' +
      '<div class="quiz"><nav class="quiz__nav" aria-label="Questions de la série"><p class="quiz__nav-title" aria-hidden="true">Questions de la série</p><ol id="qnav"></ol></nav><div class="quiz__main" id="qmain"></div></div></div>';

    U.qs('#restart', main).addEventListener('click', function () {
      var c = cur();
      var n = c ? Object.keys(c.answers || {}).length : 0;
      if (n > 0 && !c.completedAt && !root.confirm('Recommencer la série ? Vos ' + n + ' réponse(s) de cette série seront effacées de la série en cours (votre historique est conservé).')) return;
      store.update(function (s) { store.exercisesOf(s, MOD).current = { startedAt: new Date().toISOString(), index: 0, answers: {} }; }, 'series-start');
      U.toast('Nouvelle série commencée.', 'info');
      draw();
    });

    function scoreOf(c) {
      var answered = Object.keys(c.answers || {});
      var good = answered.filter(function (k) { return c.answers[k].correct; }).length;
      return { answered: answered.length, good: good };
    }

    function drawNav() {
      var c = cur();
      U.qs('#qnav', main).innerHTML = api.list.map(function (ex, i) {
        var a = c.answers[ex.id];
        var cls = a ? (a.correct ? 'is-ok' : 'is-ko') : '';
        var label = 'Question ' + (i + 1) + ' : ' + ex.title + (a ? (a.correct ? ' (bonne réponse)' : ' (réponse incorrecte)') : ' (sans réponse)');
        return '<li><button type="button" class="qdot ' + cls + (i === c.index && !c.completedAt ? ' is-current' : '') + '" data-i="' + i + '" aria-label="' + esc(label) + '"' + (i === c.index && !c.completedAt ? ' aria-current="step"' : '') + '>' +
          (a ? I(a.correct ? 'check' : 'x') : '<span>' + (i + 1) + '</span>') + '</button></li>';
      }).join('');
      U.qsa('.qdot', main).forEach(function (b) {
        b.addEventListener('click', function () {
          var i = Number(b.getAttribute('data-i'));
          store.update(function (s) { var cc = store.exercisesOf(s, MOD).current; cc.index = i; if (cc.completedAt) { /* consultation */ } }, 'series-nav');
          draw(true);
        });
      });
      var sc = scoreOf(c);
      U.qs('#score', main).textContent = 'Score : ' + sc.good + ' point' + (sc.good > 1 ? 's' : '') + ' sur ' + sc.answered + ' question' + (sc.answered > 1 ? 's' : '') + ' répondue' + (sc.answered > 1 ? 's' : '') + ' (' + api.count + ' au total)';
    }

    function draw(focus) {
      if (figCleanup) { figCleanup(); figCleanup = null; }
      var c = cur();
      drawNav();
      var allAnswered = api.list.every(function (ex) { return c.answers[ex.id]; });
      if (allAnswered && c.completedAt && c.index === -1) return drawResult(focus);
      var ex = api.list[Math.max(0, Math.min(api.count - 1, c.index))];
      drawQuestion(ex, c.answers[ex.id], focus);
    }

    function drawQuestion(ex, answered, focus) {
      var i = api.list.indexOf(ex);
      var host = U.qs('#qmain', main);
      var form;
      if (ex.type === 'qcm') {
        form = '<fieldset class="choices"><legend class="sr-only">Propositions</legend>' + ex.options.map(function (o) {
          var checked = answered && answered.response === o.id;
          var mark = answered ? (o.id === ex.answer ? ' is-right' : (checked ? ' is-wrong' : '')) : '';
          return '<label class="choice' + mark + '"><input type="radio" name="ans" value="' + o.id + '"' + (checked ? ' checked' : '') + (answered ? ' disabled' : '') + '><span class="choice__letter" aria-hidden="true">' + o.id.toUpperCase() + '</span><span class="choice__text">' + o.label + '</span></label>';
        }).join('') + '</fieldset>';
      } else if (ex.type === 'text') {
        form = '<div class="numeric"><label for="ans-num">Votre réponse</label><div class="numeric__row"><input type="text" class="numeric__text" id="ans-num" autocomplete="off" spellcheck="false" aria-describedby="ans-err ans-hint"' +
          (answered ? ' value="' + esc(answered.response) + '" disabled' : '') + '>' + (ex.unit ? '<span class="numeric__unit">' + esc(ex.unit) + '</span>' : '') + '</div>' +
          '<p class="field-error" id="ans-err" aria-live="polite"></p><p class="muted" id="ans-hint">' + esc(ex.hint || 'Saisissez votre réponse.') + '</p></div>';
      } else {
        form = '<div class="numeric"><label for="ans-num">Votre réponse</label><div class="numeric__row"><input type="text" id="ans-num" inputmode="decimal" autocomplete="off" aria-describedby="ans-err"' +
          (answered ? ' value="' + esc(answered.response) + '" disabled' : '') + '>' + (ex.unit ? '<span class="numeric__unit">' + esc(ex.unit) + '</span>' : '') + '</div>' +
          '<p class="field-error" id="ans-err" aria-live="polite"></p><p class="muted">La virgule et le point sont acceptés (2,5 ou 2.5).</p></div>';
      }
      host.innerHTML = '<article class="qcard">' +
        '<header class="qcard__head"><p class="qcard__step">Question ' + (i + 1) + ' sur ' + api.count + '</p><span class="badge badge--skill">' + esc(ex.skill) + '</span></header>' +
        '<h2 class="qcard__title" tabindex="-1">' + esc(ex.title) + '</h2>' +
        '<div class="qcard__prompt prose">' + ex.prompt + '</div>' +
        (ex.figure ? '<div class="figure-plot qcard__fig" id="qfig"></div>' : '') +
        '<form id="qform" novalidate>' + form +
        (answered ? '' : '<button type="submit" class="btn btn--primary">' + I('check') + 'Valider ma réponse</button>') +
        '</form><div id="qfb"></div></article>';

      if (ex.figure) {
        var fp = ex.figure, figEl = U.qs('#qfig', host);
        if (fp.svg) {
          figEl.className = 'figure-schema qcard__fig';
          figEl.innerHTML = fp.svg();
        } else {
          var mounted = TCL.plot.mount(figEl, function (w) {
            if (fp.options) return Object.assign(fp.options(w), { ratio: w < 480 ? 0.7 : 0.45 });
            return Object.assign(TCL.plot.sineOptions({ A: fp.A, f: fp.f, phi: fp.phi, win: fp.win, yMax: fp.yMax, yStep: fp.yStep, title: 'Graphique de l’exercice',
              desc: 'Graphique d’une tension sinusoïdale relevée sur ' + M.formatTime(fp.win) + ', axe vertical gradué de −' + fp.yMax + ' à +' + fp.yMax + ' V.' }), { ratio: w < 480 ? 0.7 : 0.45 });
          });
          figCleanup = function () { mounted.destroy(); };
        }
      }

      if (answered) showFeedback(ex, answered, false);
      else {
        U.qs('#qform', host).addEventListener('submit', function (e) {
          e.preventDefault();
          var resp = ex.type === 'qcm' ? ((U.qs('input[name=ans]:checked', host) || {}).value || '') : U.qs('#ans-num', host).value;
          var r = api.check(ex, resp);
          if (r.invalid) {
            if (ex.type === 'qcm') U.qs('#qfb', host).innerHTML = '<p class="feedback feedback--ko" role="alert">' + I('info') + '<span>' + esc(r.message) + '</span></p>';
            else { U.qs('#ans-err', host).textContent = r.message; U.qs('#ans-num', host).setAttribute('aria-invalid', 'true'); U.qs('#ans-num', host).focus(); }
            return;
          }
          record(ex, resp, r.correct);
        });
      }
      if (focus) { var h = U.qs('.qcard__title', host); if (h) h.focus({ preventScroll: false }); }
    }

    function record(ex, resp, correct) {
      var now = new Date().toISOString();
      store.update(function (s) {
        var E = store.exercisesOf(s, MOD);
        var it = E.items[ex.id] || (E.items[ex.id] = { attempts: 0, correct: 0, lastCorrect: false, lastAt: null, firstCorrectAt: null });
        it.attempts += 1;
        if (correct) { it.correct += 1; if (!it.firstCorrectAt) it.firstCorrectAt = now; }
        it.lastCorrect = correct; it.lastAt = now;
        E.current.answers[ex.id] = { response: resp, correct: correct, at: now };
      }, 'answer');
      store.log('exercise', MOD, 'Exercice « ' + ex.title + ' » (' + mod.title + ') : ' + (correct ? 'bonne réponse' : 'réponse incorrecte'));
      var c = cur();
      var done = api.list.every(function (x) { return c.answers[x.id]; });
      if (done && !c.completedAt) {
        var sc = scoreOf(c);
        store.update(function (s) {
          var E = store.exercisesOf(s, MOD);
          E.current.completedAt = now;
          E.series.push({ at: now, score: sc.good, total: api.count });
          E.series = E.series.slice(-30);
        }, 'series-end');
        store.log('series', MOD, 'Série terminée (' + mod.title + ') : ' + sc.good + ' / ' + api.count);
      }
      draw();
      var fb = U.qs('#qfb', main);
      if (fb) fb.querySelector('[tabindex]') && fb.querySelector('[tabindex]').focus();
    }

    function showFeedback(ex, a, announce) {
      var r = api.check(ex, a.response);
      var c = cur();
      var i = api.list.indexOf(ex);
      var nextUnanswered = api.list.filter(function (x, j) { return j > i && !c.answers[x.id]; })[0] || api.list.filter(function (x) { return !c.answers[x.id]; })[0];
      var finished = api.list.every(function (x) { return c.answers[x.id]; });
      var nextBtn = finished
        ? '<button type="button" class="btn btn--primary" id="to-result">' + I('chart') + 'Voir mon résultat</button>'
        : '<button type="button" class="btn btn--primary" id="to-next" data-i="' + api.list.indexOf(nextUnanswered) + '">Exercice suivant' + I('arrowRight') + '</button>';
      U.qs('#qfb', main).innerHTML = '<div class="feedback-card ' + (a.correct ? 'is-ok' : 'is-ko') + '" role="status">' +
        '<p class="feedback-card__verdict" tabindex="-1">' + I(a.correct ? 'check' : 'x') + '<span>' + (a.correct ? 'Bonne réponse : +1 point' : 'Réponse incorrecte : 0 point') + '</span></p>' +
        (a.correct ? '' : '<p>Bonne réponse : <strong>' + r.expected + '</strong>' + (ex.type !== 'qcm' ? ' (vous avez répondu ' + esc(a.response) + (ex.unit ? ' ' + esc(ex.unit) : '') + ')' : '') + '</p>') +
        '<div class="feedback-card__why prose"><h3>Explication</h3>' + ex.explanation + '</div>' +
        '<div class="feedback-card__actions">' + nextBtn + '</div></div>';
      var nb = U.qs('#to-next', main);
      if (nb) nb.addEventListener('click', function () {
        var j = Number(nb.getAttribute('data-i'));
        store.update(function (s) { store.exercisesOf(s, MOD).current.index = j; }, 'series-nav');
        draw(true);
      });
      var rb = U.qs('#to-result', main);
      if (rb) rb.addEventListener('click', function () {
        store.update(function (s) { store.exercisesOf(s, MOD).current.index = -1; }, 'series-nav');
        draw(true);
      });
    }

    function drawResult(focus) {
      var c = cur();
      var sc = scoreOf(c);
      var pct = Math.round(sc.good / api.count * 100);
      var msg = pct === 100 ? 'Parfait : toutes les notions du module sont maîtrisées.'
        : pct >= 70 ? 'Très bien. Revoyez les questions manquées pour consolider vos acquis.'
        : pct >= 40 ? 'C’est un bon début. Relisez les chapitres liés aux questions manquées, puis recommencez.'
        : 'Reprenez la leçon et le laboratoire, puis retentez la série : la progression viendra vite.';
      var recap = api.list.map(function (ex, i) {
        var a = c.answers[ex.id];
        var shown = ex.type === 'qcm' ? (ex.options.filter(function (o) { return o.id === a.response; })[0] || {}).label : esc(a.response) + (ex.unit ? ' ' + esc(ex.unit) : '');
        return '<li class="' + (a.correct ? 'is-ok' : 'is-ko') + '">' + I(a.correct ? 'check' : 'x') + '<div><button type="button" class="link-btn" data-i="' + i + '">' + (i + 1) + '. ' + esc(ex.title) + '</button><p class="muted">Votre réponse : ' + shown + '</p></div></li>';
      }).join('');
      U.qs('#qmain', main).innerHTML = '<article class="qcard result">' +
        '<h2 class="qcard__title" tabindex="-1">Résultat de la série</h2>' +
        '<p class="result__score"><strong>' + sc.good + '</strong> / ' + api.count + '</p>' + U.progressBar(pct, 'Score de la série') +
        '<p>' + msg + '</p><p class="muted">Ce résultat est enregistré dans votre progression.</p>' +
        '<ol class="recap">' + recap + '</ol>' +
        '<div class="result__actions"><button type="button" class="btn btn--primary" id="again">' + I('reset') + 'Recommencer la série</button>' +
        (parts.lesson ? '<a class="btn btn--ghost" href="#/lecons/' + MOD + '">' + I('book') + 'Revoir la leçon</a>' : '') +
        (parts.lab ? '<a class="btn btn--ghost" href="#/laboratoire/' + MOD + '">' + I('flask') + 'Ouvrir la simulation</a>' : '') +
        '<a class="btn btn--ghost" href="#/progression">' + I('chart') + 'Ma progression</a></div></article>';
      U.qs('#again', main).addEventListener('click', function () { U.qs('#restart', main).click(); });
      U.qsa('.recap .link-btn', main).forEach(function (b) {
        b.addEventListener('click', function () {
          var j = Number(b.getAttribute('data-i'));
          store.update(function (s) { store.exercisesOf(s, MOD).current.index = j; }, 'series-nav');
          draw(true);
        });
      });
      if (focus) U.qs('.qcard__title', main).focus();
    }

    draw();
    return function () { if (figCleanup) figCleanup(); };
  }

  TCL.pages.challenges = { title: 'Mes défis', render: list };
  TCL.pages.challenge = {
    title: function (p) { var m = TCL.registry.byId(p.module); return m ? 'Défis : ' + m.title : 'Défis'; },
    render: session
  };
})(window);
