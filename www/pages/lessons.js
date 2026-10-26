/*
 * Espace « Mes leçons » : bibliothèque par catégories et lecteur de leçon.
 * Fonctionne pour tous les modules : #/lecons/<module> et #/lecons/<module>/<chapitre>.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc;
  var P = TCL.pages;

  /* ------------------------------- Bibliothèque ------------------------------- */

  function library(main) {
    var st = TCL.store.get();
    var html = '<div class="container page">' + P.crumbs([{ label: 'Mes leçons' }]) +
      P.head('Mes leçons', 'Les leçons sont classées par domaine. Chacune est reliée à sa simulation et à ses exercices corrigés.');
    TCL.registry.categories.forEach(function (cat) {
      var mods = TCL.registry.modules.filter(function (m) { return m.category === cat.id; });
      html += '<section class="cat" aria-labelledby="cat-' + cat.id + '"><div class="cat__head"><h2 id="cat-' + cat.id + '">' + esc(cat.title) + '</h2><p>' + esc(cat.text) + '</p></div><div class="cards">';
      mods.forEach(function (m) {
        var parts = TCL.registry.liveParts(m);
        if (parts.lesson) {
          var lesson = TCL.lessons[m.id];
          var p = TCL.registry.moduleProgress(st, m.id);
          var last = (st.lessons[m.id] || {}).last;
          var resume = last && !p.lessonComplete;
          html += '<article class="card card--live" data-module="' + m.id + '"><div class="card__top">' + I(m.icon) + '<span class="badge badge--live">' + (p.lessonComplete ? 'Leçon terminée' : 'Disponible') + '</span></div>' +
            '<h3><a href="#/lecons/' + m.id + '">' + esc(m.title) + '</a></h3><p>' + esc(m.text) + '</p>' +
            '<p class="card__meta">' + p.chaptersDone + ' chapitre' + (p.chaptersDone > 1 ? 's' : '') + ' lu' + (p.chaptersDone > 1 ? 's' : '') + ' sur ' + p.chaptersTotal + '</p>' +
            U.progressBar(p.chaptersDone / p.chaptersTotal * 100, 'Chapitres lus') +
            '<div class="card__actions"><a class="btn btn--primary btn--sm" href="#/lecons/' + m.id + (resume ? '/' + last : '') + '">' + (p.chaptersDone === 0 ? 'Commencer la leçon' : resume ? 'Reprendre la lecture' : 'Revoir la leçon') + '</a>' +
            (parts.lab ? '<a class="btn btn--ghost btn--sm" href="#/laboratoire/' + m.id + '">Simulation</a>' : '') +
            (parts.exercises ? '<a class="btn btn--ghost btn--sm" href="#/defis/' + m.id + '">Défis</a>' : '') + '</div></article>';
          void lesson;
        } else {
          html += '<article class="card card--soon"><div class="card__top">' + I(m.icon) + '<span class="badge badge--soon">Leçon en préparation</span></div>' +
            '<h3>' + esc(m.title) + '</h3><p>' + esc(m.text) + '</p><p class="card__meta">Pas encore disponible</p></article>';
        }
      });
      html += '</div></section>';
    });
    main.innerHTML = html + '</div>';
  }

  /* ----------------------------- Lecteur de leçon ----------------------------- */

  /**
   * Remplace chaque <div data-fig="clé"> par la figure correspondante :
   *  - def.options(w) : graphique calculé (TCL.plot) ;
   *  - def.svg()      : schéma SVG calculé (trajets, diagrammes, réseaux…).
   */
  function mountFigures(scope, lesson) {
    var mounted = [];
    U.qsa('[data-fig]', scope).forEach(function (el) {
      var def = lesson.figures[el.getAttribute('data-fig')];
      if (!def) return;
      var wrap = document.createElement('figure');
      wrap.className = 'figure' + (def.svg ? ' figure--schema' : '');
      var plot = document.createElement('div');
      plot.className = def.svg ? 'figure-schema' : 'figure-plot';
      wrap.appendChild(plot);
      var cap = document.createElement('figcaption');
      cap.className = 'figure-caption';
      var legend = (def.legend || []).map(function (l) { return '<span class="leg"><span class="sw sw--' + l[0] + '"></span>' + esc(l[1]) + '</span>'; }).join('');
      cap.innerHTML = (legend ? '<span class="legend">' + legend + '</span>' : '') + esc(def.caption);
      wrap.appendChild(cap);
      el.replaceWith(wrap);
      if (def.svg) { plot.innerHTML = def.svg(); return; }
      var inPair = !!wrap.closest('.fig-pair');
      mounted.push(TCL.plot.mount(plot, function (w) {
        return Object.assign(def.options(w), { ratio: def.ratio ? def.ratio(w) : (w < 480 ? 0.72 : (inPair ? 0.62 : 0.46)) });
      }));
    });
    return function () { mounted.forEach(function (m) { m.destroy(); }); };
  }

  function sidebar(mid, lesson, done, current) {
    var parts = TCL.registry.liveParts(TCL.registry.byId(mid));
    var n = lesson.chapters.filter(function (c) { return done[c.id]; }).length;
    var items = lesson.chapters.map(function (c, i) {
      var isDone = !!done[c.id];
      return '<li class="toc__item' + (c.id === current ? ' is-current' : '') + (isDone ? ' is-done' : '') + '">' +
        '<a href="#/lecons/' + mid + '/' + c.id + '"' + (c.id === current ? ' aria-current="step"' : '') + '>' +
        '<span class="toc__num" aria-hidden="true">' + (isDone ? I('check') : (i + 1)) + '</span>' +
        '<span>' + esc(c.title) + (isDone ? '<span class="sr-only"> (lu)</span>' : '') + '</span></a></li>';
    }).join('');
    return '<aside class="lesson__side"><div class="toc"><p class="toc__title"><a href="#/lecons/' + mid + '">' + esc(lesson.title) + '</a></p>' +
      '<p class="toc__meta">' + n + ' / ' + lesson.chapters.length + ' chapitres lus</p>' + U.progressBar(n / lesson.chapters.length * 100, 'Chapitres lus') +
      '<ol class="toc__list">' + items + '</ol></div>' +
      '<div class="side-cta"><p>Mettre en pratique</p>' +
      (parts.lab ? '<a class="btn btn--ghost btn--block btn--sm" href="#/laboratoire/' + mid + '">' + I('flask') + 'Ouvrir la simulation</a>' : '') +
      (parts.exercises ? '<a class="btn btn--ghost btn--block btn--sm" href="#/defis/' + mid + '">' + I('target') + 'Passer aux exercices</a>' : '') + '</div></aside>';
  }

  function overview(main, mid, lesson) {
    var parts = TCL.registry.liveParts(TCL.registry.byId(mid));
    var st = TCL.store.get();
    var done = ((st.lessons[mid] || {}).chapters) || {};
    var first = lesson.chapters.filter(function (c) { return !done[c.id]; })[0];
    var resumeId = (first || lesson.chapters[0]).id;
    var nDone = lesson.chapters.filter(function (c) { return done[c.id]; }).length;
    var list = lesson.chapters.map(function (c, i) {
      return '<li class="chapter-row' + (done[c.id] ? ' is-done' : '') + '"><span class="chapter-row__num" aria-hidden="true">' + (done[c.id] ? I('check') : (i + 1)) + '</span>' +
        '<div><h3><a href="#/lecons/' + mid + '/' + c.id + '">' + esc(c.title) + '</a></h3><p>' + esc(c.summary) + '</p></div>' +
        '<span class="chapter-row__state">' + (done[c.id] ? 'Lu' : 'À lire') + '</span></li>';
    }).join('');
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Mes leçons', href: '#/lecons' }, { label: lesson.title }]) +
      P.moduleNav(mid, 'lesson') +
      P.head(lesson.title, esc(lesson.intro)) +
      '<div class="overview">' +
      '<div class="overview__main"><section class="box"><h2>Objectifs pédagogiques</h2><p>À la fin de cette leçon, vous serez capable de :</p><ul class="objectives">' +
      lesson.objectives.map(function (o) { return '<li>' + I('check') + '<span>' + esc(o) + '</span></li>'; }).join('') + '</ul>' +
      '<p class="muted">Prérequis : ' + esc(lesson.prerequisites) + '</p></section>' +
      '<section><h2 class="h-sub">Chapitres</h2><ol class="chapter-list">' + list + '</ol></section></div>' +
      '<aside class="overview__side"><div class="box box--accent"><p class="box__big">' + nDone + ' / ' + lesson.chapters.length + '</p><p>chapitres lus</p>' +
      U.progressBar(nDone / lesson.chapters.length * 100, 'Chapitres lus') +
      '<a class="btn btn--primary btn--block" href="#/lecons/' + mid + '/' + resumeId + '">' + I('book') + (nDone === 0 ? 'Commencer la leçon' : nDone === lesson.chapters.length ? 'Relire la leçon' : 'Reprendre la lecture') + '</a>' +
      (parts.lab ? '<a class="btn btn--ghost btn--block" href="#/laboratoire/' + mid + '">' + I('flask') + 'Ouvrir la simulation</a>' : '') +
      (parts.exercises ? '<a class="btn btn--ghost btn--block" href="#/defis/' + mid + '">' + I('target') + 'Passer aux exercices</a>' : '') + '</div></aside>' +
      '</div></div>';
  }

  function chapterPage(main, mid, lesson, cid) {
    var parts = TCL.registry.liveParts(TCL.registry.byId(mid));
    var idx = lesson.chapters.map(function (c) { return c.id; }).indexOf(cid);
    if (idx < 0) return TCL.pages.notFound.render(main);
    var ch = lesson.chapters[idx];
    var prev = lesson.chapters[idx - 1], next = lesson.chapters[idx + 1];
    var store = TCL.store;
    if (store.lessonOf(store.get(), mid).last !== cid) {
      store.update(function (s) { store.lessonOf(s, mid).last = cid; }, 'lesson-open');
    }
    var done = store.lessonOf(store.get(), mid).chapters;
    var after = parts.exercises ? ['#/defis/' + mid, 'Passer aux exercices'] : (parts.lab ? ['#/laboratoire/' + mid, 'Ouvrir la simulation'] : ['#/lecons', 'Toutes les leçons']);

    main.innerHTML = '<div class="container page">' +
      P.crumbs([{ label: 'Mes leçons', href: '#/lecons' }, { label: lesson.title, href: '#/lecons/' + mid }, { label: ch.title }]) +
      P.moduleNav(mid, 'lesson') +
      '<div class="lesson">' + sidebar(mid, lesson, done, cid) +
      '<article class="lesson__body prose">' +
      '<p class="lesson__step">Chapitre ' + (idx + 1) + ' sur ' + lesson.chapters.length + '</p>' +
      '<h1 tabindex="-1">' + esc(ch.title) + '</h1>' + ch.html +
      '<footer class="lesson__foot">' +
      '<div class="lesson__done" id="done-zone"></div>' +
      '<nav class="pager" aria-label="Chapitres">' +
      (prev ? '<a class="btn btn--ghost" href="#/lecons/' + mid + '/' + prev.id + '">' + I('arrowLeft') + 'Chapitre précédent</a>' : '<span></span>') +
      (next ? '<a class="btn btn--ghost" href="#/lecons/' + mid + '/' + next.id + '">Chapitre suivant' + I('arrowRight') + '</a>' : '<a class="btn btn--ghost" href="' + after[0] + '">' + after[1] + I('arrowRight') + '</a>') +
      '</nav></footer></article></div></div>';

    var cleanFigs = mountFigures(main, lesson);

    function renderDone() {
      var zone = U.qs('#done-zone', main);
      var isDone = !!store.lessonOf(store.get(), mid).chapters[cid];
      if (isDone) {
        zone.innerHTML = '<p class="done-note">' + I('check') + '<span>Chapitre marqué comme lu.</span></p>' +
          (next ? '<a class="btn btn--primary" href="#/lecons/' + mid + '/' + next.id + '">Continuer : ' + esc(next.title) + '</a>'
                : (parts.lab ? '<a class="btn btn--primary" href="#/laboratoire/' + mid + '">' + I('flask') + 'Passer au laboratoire</a>' : ''));
      } else {
        zone.innerHTML = '<p>Vous avez lu ce chapitre et compris l’essentiel ?</p><button type="button" class="btn btn--primary" id="mark-read">' + I('check') + (next ? 'Marquer comme lu et continuer' : 'Marquer comme lu') + '</button>';
        U.qs('#mark-read', main).addEventListener('click', function () {
          store.update(function (s) { store.lessonOf(s, mid).chapters[cid] = new Date().toISOString(); }, 'chapter');
          store.log('lesson', mid, 'Chapitre lu (' + lesson.title + ') : « ' + ch.title + ' »');
          var all = lesson.chapters.every(function (c) { return store.lessonOf(store.get(), mid).chapters[c.id]; });
          if (all) {
            store.log('lesson-complete', mid, 'Leçon terminée : « ' + lesson.title + ' »');
            U.toast('Leçon terminée ! Tous les chapitres sont lus.', 'success');
          } else {
            U.toast('Chapitre enregistré comme lu.', 'success');
          }
          if (next) root.location.hash = '#/lecons/' + mid + '/' + next.id;
          else { renderDone(); U.qs('.lesson__side', main).outerHTML = sidebar(mid, lesson, store.lessonOf(store.get(), mid).chapters, cid); }
        });
      }
    }
    renderDone();
    return cleanFigs;
  }

  function lessonFor(mid) {
    var m = TCL.registry.byId(mid);
    return m && TCL.registry.liveParts(m).lesson ? TCL.lessons[mid] : null;
  }

  TCL.pages.lessons = { title: 'Mes leçons', render: library };
  TCL.pages.lesson = {
    title: function (p) {
      var l = lessonFor(p.module);
      if (!l) return 'Leçon';
      var c = p.chapter && l.chapters.filter(function (x) { return x.id === p.chapter; })[0];
      return c ? c.title + ' · ' + l.title : l.title;
    },
    render: function (main, params) {
      var lesson = lessonFor(params.module);
      if (!lesson) return TCL.pages.notFound.render(main);
      if (!params.chapter) return overview(main, params.module, lesson);
      return chapterPage(main, params.module, lesson, params.chapter);
    }
  };
  TCL.pages.mountFigures = mountFigures;
})(window);
