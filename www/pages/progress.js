/*
 * Espace « Ma progression » : tableau de bord calculé UNIQUEMENT à partir des
 * activités réellement enregistrées (aucune statistique inventée).
 * Vue générale (tous les modules) + détail d'un module au choix.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc;
  var P = TCL.pages;
  var R = function () { return TCL.registry; };

  /** Étapes proposées, dans l'ordre du parcours : modules commencés d'abord. */
  function stepsFor(st, m) {
    var out = [], parts = R().liveParts(m);
    if (parts.lesson) {
      var L = (st.lessons[m.id] || {}).chapters || {};
      var c = TCL.lessons[m.id].chapters.filter(function (x) { return !L[x.id]; })[0];
      if (c) out.push({ icon: 'book', href: '#/lecons/' + m.id + '/' + c.id, text: m.title + ' : lire le chapitre « ' + c.title + ' »' });
    }
    if (parts.lab) {
      var Mi = ((st.lab[m.id] || {}).missions) || {};
      var mi = TCL.labs[m.id].missions.filter(function (x) { return !Mi[x.id]; })[0];
      if (mi) out.push({ icon: 'flask', href: '#/laboratoire/' + m.id, text: m.title + ' : réussir la mission « ' + mi.title + ' »' });
    }
    if (parts.exercises) {
      var items = ((st.exercises[m.id] || {}).items) || {};
      var api = TCL.exercises[m.id];
      var rework = api.list.filter(function (e) { return items[e.id] && !(items[e.id].correct > 0); });
      var untried = api.list.filter(function (e) { return !items[e.id]; });
      if (rework.length) out.push({ icon: 'target', href: '#/defis/' + m.id, text: m.title + ' : retravailler ' + (rework.length === 1 ? 'l’exercice « ' + rework[0].title + ' »' : rework.length + ' exercices pas encore réussis') });
      else if (untried.length) out.push({ icon: 'target', href: '#/defis/' + m.id, text: m.title + ' : ' + (untried.length < api.count ? 'terminer la série d’exercices' : 'faire une première série d’exercices') });
    }
    return out;
  }

  function nextSteps(st) {
    var mods = R().modules.filter(function (m) { return R().statusOf(m) !== 'planned'; });
    var prog = {};
    mods.forEach(function (m) { prog[m.id] = R().moduleProgress(st, m.id); });
    var open = mods.filter(function (m) { return !prog[m.id].complete; });
    var ordered = open.filter(function (m) { return prog[m.id].started; }).concat(open.filter(function (m) { return !prog[m.id].started; }));
    var steps = [];
    ordered.forEach(function (m, i) {
      if (steps.length >= 3) return;
      var s = stepsFor(st, m);
      steps = steps.concat(s.slice(0, i === 0 ? 2 : 1));
    });
    if (!steps.length) steps.push({ icon: 'sparkle', href: '#/defis', text: 'Tous les modules sont terminés. Refaites une série d’exercices pour garder la main.' });
    return steps.slice(0, 3);
  }

  function detail(st, m) {
    var parts = R().liveParts(m), p = R().moduleProgress(st, m.id);
    var html = '<div class="detail__head"><h3><a href="#/lecons/' + m.id + '">' + esc(m.title) + '</a></h3><p class="muted">' + p.percent + ' % · ' + p.done + ' activités terminées sur ' + p.total + '</p></div>';
    var cols = '';
    if (parts.lesson) {
      var L = (st.lessons[m.id] || {}).chapters || {};
      cols += '<div><h3>Chapitres</h3><ul class="checklist">' + TCL.lessons[m.id].chapters.map(function (c) {
        return '<li class="' + (L[c.id] ? 'is-ok' : '') + '">' + I(L[c.id] ? 'check' : 'book') + '<span><a href="#/lecons/' + m.id + '/' + c.id + '">' + esc(c.title) + '</a></span><span class="muted">' + (L[c.id] ? 'lu ' + U.formatWhen(L[c.id]) : 'à lire') + '</span></li>';
      }).join('') + '</ul></div>';
    }
    if (parts.lab) {
      var Mi = ((st.lab[m.id] || {}).missions) || {};
      cols += '<div><h3>Missions du laboratoire</h3><ul class="checklist">' + TCL.labs[m.id].missions.map(function (x) {
        return '<li class="' + (Mi[x.id] ? 'is-ok' : '') + '">' + I(Mi[x.id] ? 'check' : 'flask') + '<span>' + esc(x.title) + '</span><span class="muted">' + (Mi[x.id] ? 'réussie ' + U.formatWhen(Mi[x.id]) : 'à faire') + '</span></li>';
      }).join('') + '</ul></div>';
    }
    html += '<div class="two-col">' + cols + '</div>';
    if (parts.exercises) {
      var api = TCL.exercises[m.id];
      var E = st.exercises[m.id] || {}, items = E.items || {};
      var series = (E.series || []).slice().reverse();
      html += '<h3>Résultats aux exercices</h3><div class="table-wrap"><table class="data-table data-table--compact"><caption class="sr-only">Résultats par exercice</caption><thead><tr><th scope="col">Exercice</th><th scope="col">Tentatives</th><th scope="col">Réussites</th><th scope="col">Dernière réponse</th></tr></thead><tbody>' +
        api.list.map(function (e, i) {
          var it = items[e.id];
          return '<tr><td>' + (i + 1) + '. ' + esc(e.title) + '</td><td>' + (it ? it.attempts : 0) + '</td><td>' + (it ? it.correct : 0) + '</td><td>' +
            (!it ? '<span class="pill">—</span>' : it.lastCorrect ? '<span class="pill pill--ok">Juste</span>' : '<span class="pill pill--ko">Faux</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<h3>Séries terminées</h3>' + (series.length ? '<ul class="series">' + series.slice(0, 6).map(function (s) {
          return '<li><span>' + esc(U.formatWhen(s.at)) + '</span><strong>' + s.score + ' / ' + s.total + '</strong>' + U.progressBar(s.score / s.total * 100, 'Score') + '</li>';
        }).join('') + '</ul>' : '<p class="muted">Aucune série terminée. Répondez aux ' + api.count + ' questions d’une série pour obtenir un score.</p>');
    }
    return html;
  }

  function render(main) {
    var st = TCL.store.get();
    var all = R().overallProgress(st);
    var empty = TCL.store.isEmpty(st);
    var head = P.crumbs([{ label: 'Ma progression' }]) + P.head('Ma progression', 'Un bilan calculé à partir de ce que vous avez réellement fait : chapitres lus, missions réussies et réponses aux exercices, dans chaque module.') +
      '<p class="sync-line" data-sync-status>' + P.syncStatusHtml() + '</p>';

    if (empty) {
      main.innerHTML = '<div class="container page">' + head +
        '<div class="empty">' + I('chart', 'empty__icon') + '<h2>Votre progression commencera ici</h2>' +
        '<p>Aucune activité n’est encore enregistrée. Lisez un chapitre, réussissez une mission du laboratoire ou répondez à un exercice : ce tableau se remplira automatiquement.</p>' +
        '<div class="empty__actions"><a class="btn btn--primary" href="#/lecons/signaux/c1">' + I('book') + 'Lire le premier chapitre</a><a class="btn btn--ghost" href="#/laboratoire">' + I('flask') + 'Ouvrir le laboratoire</a></div></div></div>';
      return;
    }

    var mods = R().modules.filter(function (m) { return R().statusOf(m) !== 'planned'; });
    var prefs = st.prefs || {};
    var lastMod = (st.activity.filter(function (a) { return a.module && R().byId(a.module); })[0] || {}).module;
    var sel = R().byId(prefs.progressModule) ? prefs.progressModule : (lastMod || 'signaux');

    var rows = mods.map(function (m) {
      var p = R().moduleProgress(st, m.id);
      return '<tr data-module="' + m.id + '"><th scope="row"><a href="#/lecons/' + m.id + '">' + esc(m.title) + '</a></th>' +
        '<td><span class="mini-bar">' + U.progressBar(p.percent, 'Progression ' + m.title) + '<span>' + p.percent + ' %</span></span></td>' +
        '<td>' + p.chaptersDone + ' / ' + p.chaptersTotal + '</td><td>' + p.missionsDone + ' / ' + p.missionsTotal + '</td>' +
        '<td>' + p.exMastered + ' / ' + p.exTotal + '</td><td>' + (p.best != null ? p.best + ' / ' + p.exTotal : '—') + '</td></tr>';
    }).join('');
    var acts = st.activity.slice(0, 12).map(function (a) {
      var icon = { lesson: 'book', 'lesson-complete': 'book', mission: 'flask', exercise: 'target', series: 'chart', account: 'user' }[a.type] || 'info';
      return '<li>' + I(icon) + '<span>' + esc(a.text) + '</span><time datetime="' + esc(a.at) + '">' + esc(U.formatWhen(a.at)) + '</time></li>';
    }).join('');
    var steps = nextSteps(st).map(function (s) { return '<li><a href="' + s.href + '">' + I(s.icon) + '<span>' + esc(s.text) + '</span></a></li>'; }).join('');
    var guest = TCL.auth.state().status !== 'signedIn';
    var options = mods.map(function (m) { return '<option value="' + m.id + '"' + (m.id === sel ? ' selected' : '') + '>' + esc(m.title) + '</option>'; }).join('');

    main.innerHTML = '<div class="container page">' + head +
      '<section class="kpis" aria-label="Résumé">' +
      '<div class="kpi kpi--main"><p class="kpi__label">Progression générale (' + all.modules + ' modules)</p><p class="kpi__value">' + all.percent + ' %</p>' + U.progressBar(all.percent, 'Progression générale') + '<p class="kpi__hint">' + all.done + ' activités terminées sur ' + all.total + '</p></div>' +
      '<div class="kpi"><p class="kpi__label">Chapitres lus</p><p class="kpi__value">' + all.chaptersDone + '<small> / ' + all.chaptersTotal + '</small></p><p class="kpi__hint">' + all.lessonsComplete + ' leçon' + (all.lessonsComplete > 1 ? 's' : '') + ' terminée' + (all.lessonsComplete > 1 ? 's' : '') + '</p></div>' +
      '<div class="kpi"><p class="kpi__label">Exercices effectués</p><p class="kpi__value">' + all.exAttempted + '<small> / ' + all.exTotal + '</small></p><p class="kpi__hint">' + all.exMastered + ' réussi' + (all.exMastered > 1 ? 's' : '') + ' au moins une fois</p></div>' +
      '<div class="kpi"><p class="kpi__label">Missions du laboratoire</p><p class="kpi__value">' + all.missionsDone + '<small> / ' + all.missionsTotal + '</small></p><p class="kpi__hint">réussies</p></div>' +
      '<div class="kpi"><p class="kpi__label">Modules terminés</p><p class="kpi__value">' + all.modulesComplete + '<small> / ' + all.modules + '</small></p><p class="kpi__hint">leçon + missions + exercices</p></div>' +
      '</section>' +
      '<div class="dash">' +
      '<div class="dash__main">' +
      '<section class="box"><h2>Prochaines étapes</h2><ul class="next-steps">' + steps + '</ul></section>' +
      '<section class="box"><h2>Par module</h2><div class="table-wrap"><table class="data-table data-table--compact progress-table"><caption class="sr-only">Progression par module</caption><thead><tr><th scope="col">Module</th><th scope="col">Progression</th><th scope="col">Chapitres</th><th scope="col">Missions</th><th scope="col">Exercices réussis</th><th scope="col">Meilleur score</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
      '<section class="box"><div class="detail-pick"><h2>Détail d’un module</h2><label for="detail-module" class="sr-only">Module à détailler</label><select id="detail-module">' + options + '</select></div><div id="detail">' + detail(st, R().byId(sel)) + '</div></section>' +
      '</div>' +
      '<aside class="dash__side"><section class="box"><h2>Activités récentes</h2><ul class="activity">' + acts + '</ul></section>' +
      '<section class="box box--plain"><h2>Comment les pourcentages sont calculés</h2><p class="muted">Pour chaque module : (chapitres lus + missions réussies + exercices réussis au moins une fois) ÷ (nombre total de chapitres, de missions et d’exercices du module). La progression générale additionne les activités de tous les modules. Une réponse incorrecte ne compte pas.</p>' +
      (guest ? '<button type="button" class="link-btn link-btn--danger" id="reset-progress">Effacer la progression enregistrée sur cet appareil</button>' : '') +
      '</section></aside>' +
      '</div></div>';

    U.qs('#detail-module', main).addEventListener('change', function (e) {
      var id = e.target.value;
      U.qs('#detail', main).innerHTML = detail(TCL.store.get(), R().byId(id));
      TCL.store.update(function (s) { s.prefs.progressModule = id; }, 'prefs');
    });
    var rb = U.qs('#reset-progress', main);
    if (rb) rb.addEventListener('click', function () {
      if (!root.confirm('Effacer toute la progression enregistrée sur cet appareil ? Cette action est définitive.')) return;
      TCL.store.resetAll();
      U.toast('Progression effacée sur cet appareil.', 'info');
      render(main);
    });
  }

  TCL.pages.progress = { title: 'Ma progression', render: render };
})(window);
