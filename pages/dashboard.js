/*
 * TELECOM CONNECT LAB 2.0 — Mon espace : tableau de bord de l'étudiant.
 * Chaque chiffre provient d'activités enregistrées ou de validations serveur.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc, P = TCL.pages, O = TCL.official, CUR = TCL.curriculum, MA = TCL.mastery, A = TCL.access;

  function stat(value, label) { return '<div class="stat"><p class="stat__v">' + value + '</p><p class="stat__l">' + esc(label) + '</p></div>'; }
  function title(id) { return (CUR.competencies[id] || {}).title || id; }

  /** Dernier chapitre consulté, s'il existe encore et reste accessible. */
  function lastLesson(st) {
    var l = (st.prefs || {}).lastLesson;
    if (!l || !TCL.lessons[l.module] || !A.allows(l.module)) return null;
    var lesson = TCL.lessons[l.module], chapter = lesson.chapters.filter(function (c) { return c.id === l.chapter; })[0];
    return chapter ? { module: l.module, lesson: lesson, chapter: chapter, at: l.at } : null;
  }

  /** Reprend au dernier chapitre non lu ; à défaut, à la première activité recommandée. */
  function continueTarget(st, recs) {
    var last = lastLesson(st);
    if (last) {
      var read = (st.lessons[last.module] || {}).chapters || {}, list = last.lesson.chapters, at = list.indexOf(last.chapter);
      var next = !read[last.chapter] ? last.chapter : list.slice(at + 1).concat(list.slice(0, at)).filter(function (c) { return !read[c.id]; })[0];
      if (next) return { href: '#/lecons/' + last.module + '/' + next.id, text: last.lesson.title + ' : ' + next.title };
    }
    if (recs.length) return { href: recs[0].href, text: recs[0].text };
    return { href: '#/parcours', text: 'Voir mon parcours' };
  }

  function render(main) {
    var auth = TCL.auth.state(), off = O.get(), ctx = A.trackCtx(), t = A.track(), s = A.scope();
    var name = (off.profile && off.profile.display_name) || (auth.user && (auth.user.name || auth.user.email)) || 'Invité';

    if (t.state === 'missing') return; // la navigation redirige vers le choix du parcours
    if (A.mode() === 'student' && t.state === 'unknown' && off.status === 'loading') {
      main.innerHTML = '<div class="container page"><p class="loading" role="status"><span class="spinner" aria-hidden="true"></span>Chargement de votre espace…</p></div>';
      return;
    }

    var core = A.coreIds();
    var overall = TCL.registry.overallProgress(ctx.state, core);
    var ids = Object.keys(CUR.competencies).filter(function (id) { return ctx.content[id]; });
    var mm = ids.map(function (id) { return MA.moduleMastery(id, ctx); });
    var inTrack = core ? mm.filter(function (m) { return core.indexOf(m.id) >= 0; }) : mm;
    var recs = MA.recommendations(ctx, 4);
    var go = continueTarget(ctx.state, recs), last = lastLesson(ctx.state);
    var validatedIds = Object.keys(off.validated);
    var empty = core && !core.length;

    var recHtml = recs.length ? '<ul class="plain recs">' + recs.map(function (r) { return '<li><a href="' + r.href + '">' + I(r.icon) + '<span>' + esc(r.text) + '</span></a></li>'; }).join('') + '</ul>'
      : '<p class="muted">' + (empty ? 'Les activités de ce parcours sont en cours de développement.' : 'Toutes les compétences disponibles de votre parcours sont validées.') + '</p>';
    var compHtml = mm.length ? '<ul class="mod-rows">' + mm.map(function (m) {
      var pre = core && core.indexOf(m.id) < 0;
      return '<li class="mod-row"><a href="#/competence/' + m.id + '">' + esc(title(m.id)) + (pre ? ' <span class="muted small">(base)</span>' : '') + '</a>' + P.statusPill(m.status) + '<span class="mod-row__bar">' + U.progressBar(m.percent, title(m.id)) + '</span></li>';
    }).join('') + '</ul>' : '<p class="muted">Aucun module disponible pour le moment dans ce parcours.</p>';
    var acquired = validatedIds.length ? '<ul class="plain">' + validatedIds.map(function (id) {
      return '<li>' + I('check') + ' <a href="#/attestation/' + id + '">' + esc(title(id)) + '</a>' + (s && !A.inTrack(id) ? ' <span class="muted small">(parcours précédent)</span>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="muted">Aucune compétence validée pour l’instant.</p>';
    var attempts = off.attempts.filter(function (x) { return x.status !== 'in_progress'; }).slice(0, 5).map(function (x) {
      var a = O.assessmentById(x.assessment_id);
      return '<li><a href="#/resultat/' + x.id + '">' + esc(a ? a.title : x.assessment_id) + '</a> <span class="muted">' + esc(U.formatWhen(x.submitted_at || x.started_at)) + ' · ' + (x.percent != null ? Number(x.percent) + ' %' : '—') + '</span> ' + (x.proctor_status === 'pending' ? '<span class="pill">Supervision</span>' : x.passed ? '<span class="pill pill--ok">Réussi</span>' : '<span class="pill pill--ko">Non réussi</span>') + '</li>';
    }).join('');
    var labs = (core ? TCL.registry.withLab().filter(function (m) { return core.indexOf(m.id) >= 0; }) : TCL.registry.withLab()).map(function (m) {
      return '<li><a href="#/laboratoire/' + m.id + '">' + I(m.icon) + '<span>' + esc(m.title) + '</span></a></li>';
    }).join('');
    var activity = ctx.state.activity.slice(0, 4).map(function (a) { return '<li><span>' + esc(a.text) + '</span> <span class="muted">' + esc(U.formatWhen(a.at)) + '</span></li>'; }).join('');

    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Mon espace' }]) +
      '<header class="dash-hero"><div class="dash-hero__text"><h1 tabindex="-1">Bonjour, ' + esc(name) + '</h1>' +
      (t.state === 'set' ? '<p class="dash-hero__track">' + I('route') + '<span>Parcours : <strong>' + esc(t.label) + '</strong></span> <a href="#/parcours">Voir mon parcours</a></p>' : '<p class="dash-hero__track">Vos résultats et vos prochaines étapes.</p>') +
      (last ? '<p class="dash-hero__last">Dernière leçon : <a href="#/lecons/' + last.module + '/' + last.chapter.id + '">' + esc(last.lesson.title + ', ' + last.chapter.title) + '</a> <span>' + esc(U.formatWhen(last.at)) + '</span></p>' : '') +
      '</div><div class="dash-hero__action"><a class="btn btn--primary btn--lg" id="continue" href="' + go.href + '">' + I('arrowRight') + 'Continuer mon apprentissage</a><p>' + esc(go.text) + '</p></div></header>' +
      P.officialNotice() + (t.state === 'unknown' ? '<div class="callout callout--warn">' + I('device') + '<p>Votre parcours n’a pas pu être chargé pour le moment. Il n’est pas perdu : il réapparaîtra au retour de la connexion.</p></div>' : '') +
      (O.updateRequired() ? '<div class="callout callout--warn">' + I('alert') + '<p>Une version plus récente de l’application est requise pour passer les évaluations.</p></div>' : '') +
      '<div class="stats">' + stat(overall.percent + ' %', core ? 'de votre parcours réalisé' : 'de l’entraînement réalisé') + stat(inTrack.filter(function (m) { return m.status === 'validated'; }).length + ' / ' + inTrack.length, 'compétences du parcours validées') + stat(overall.exMastered + ' / ' + overall.exTotal, 'exercices réussis') + stat(overall.missionsDone + ' / ' + overall.missionsTotal, 'missions de laboratoire') + '</div>' +
      U.progressBar(overall.percent, 'Progression générale') +
      '<div class="dash dash--spaced"><div class="dash__main"><section class="box box--accent"><h2>Prochaines activités recommandées</h2>' + recHtml + '</section>' +
      '<section class="box"><h2>Mes compétences</h2>' + compHtml + '</section>' +
      '<section class="box"><h2>Résultats des évaluations</h2>' + (attempts ? '<ul class="plain">' + attempts + '</ul>' : '<p class="muted">Aucune évaluation passée.</p>') + '<p><a class="btn btn--ghost btn--sm" href="#/evaluations">Voir les évaluations</a></p></section></div>' +
      '<aside class="dash__side"><section class="box"><h2>Compétences acquises</h2>' + acquired + '</section>' +
      '<section class="box"><h2>Mes laboratoires</h2>' + (labs ? '<ul class="plain quick">' + labs + '</ul>' : '<p class="muted">Aucun laboratoire disponible pour ce parcours pour le moment.</p>') + '</section>' +
      '<section class="box"><h2>Accès rapides</h2><ul class="plain quick"><li><a href="#/parcours">' + I('route') + 'Mon parcours</a></li><li><a href="#/changer-parcours">' + I('reset') + 'Changer de parcours</a></li><li><a href="#/progression">' + I('chart') + 'Détail de ma progression</a></li><li><a href="#/compte">' + I('user') + 'Mon compte</a></li>' + (O.isAdmin() ? '<li><a href="#/admin">' + I('shield') + 'Administration</a></li>' : '') + '</ul></section>' +
      '<section class="box"><h2>Activité récente</h2>' + (activity ? '<ul class="plain small">' + activity + '</ul>' : '<p class="muted">Aucune activité pour l’instant.</p>') + '<p data-sync-status>' + P.syncStatusHtml() + '</p></section></aside></div></div>';
  }

  P.dashboard = { title: 'Mon espace', render: render };
})(window);
