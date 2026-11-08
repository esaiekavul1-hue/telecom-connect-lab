/*
 * TELECOM CONNECT LAB 2.0 — Parcours : six espaces, cours, compétences.
 * Un cours sans contenu développé est signalé comme tel, jamais simulé.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc, P = TCL.pages;
  var CUR = TCL.curriculum, MA = TCL.mastery, O = TCL.official;

  var STATUS = {
    validated: ['pill pill--ok', 'check', 'Validé'], ready: ['pill pill--info', 'shield', 'Prêt pour l’évaluation'],
    in_progress: ['pill pill--info', 'book', 'En cours'], available: ['pill', 'arrowRight', 'Disponible'],
    locked: ['pill', 'lock', 'Prérequis à valider'], planned: ['pill pill--plan', 'clock', 'Programme à développer']
  };
  function pill(status) { var s = STATUS[status]; return '<span class="' + s[0] + '">' + I(s[1]) + esc(s[2]) + '</span>'; }
  P.statusPill = pill;

  /** Bandeau sur l'origine des validations, selon l'état réel du service. */
  P.officialNotice = function () {
    var st = O.get().status, a = TCL.auth.state();
    if (a.status !== 'signedIn') return '<div class="callout callout--info">' + I('info') + '<p>Votre entraînement est enregistré sur cet appareil. <a href="#/connexion">Connectez-vous</a> pour passer les évaluations et faire valider vos compétences.</p></div>';
    if (st === 'not_deployed') return '<div class="callout callout--warn">' + I('alert') + '<p><strong>Service d’évaluation non activé.</strong> Les leçons, laboratoires et exercices fonctionnent. Les validations officielles seront disponibles une fois la migration du serveur appliquée.</p></div>';
    if (st === 'offline') return '<div class="callout callout--warn">' + I('device') + '<p>Hors ligne : les validations affichées sont celles de votre dernière connexion.</p></div>';
    if (st === 'error') return '<div class="callout callout--error">' + I('alert') + '<p>Les données officielles n’ont pas pu être chargées. <button type="button" class="link-btn" data-official-retry>Réessayer</button></p></div>';
    return '';
  };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-official-retry]')) O.refresh(); });

  function visibleCourses(list) {
    var hidden = O.overrides().hidden || [];
    return list.filter(function (c) { return hidden.indexOf(c.id) < 0; });
  }

  function spaces(main) {
    var ctx = O.ctx();
    var cards = CUR.spaces.map(function (s) {
      var st = MA.spaceState(s, ctx);
      return '<article class="card space-card card--live"><div class="card__top">' + I(s.icon) + '<span class="badge ' + (st.available ? 'badge--live' : 'badge--soon') + '">' + st.available + ' / ' + st.total + ' cours disponibles</span></div>' +
        '<h2><a href="#/parcours/' + s.id + '">' + esc(s.title) + '</a></h2><p>' + esc(s.text) + '</p>' +
        (st.available ? U.progressBar(st.percent, 'Avancement : ' + s.title) + '<p class="card__meta">' + st.percent + ' % · ' + st.validated + ' cours validé' + (st.validated > 1 ? 's' : '') + '</p>' : '<p class="card__meta">Programme à développer</p>') + '</article>';
    }).join('');
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Parcours' }]) +
      P.head('Parcours de formation', 'Six espaces, du secondaire au monde professionnel. Choisissez le vôtre : votre progression vous suit d’un espace à l’autre.') +
      P.officialNotice() + '<div class="cards cards--spaces">' + cards + '</div>' +
      '<p class="muted note">Cette structure est une proposition pédagogique. Elle ne constitue pas un programme universitaire officiel.</p></div>';
  }

  function moduleRow(m) {
    var c = CUR.competencies[m.id];
    return '<li class="mod-row"><a href="#/competence/' + m.id + '">' + esc(c.title) + '</a>' + pill(m.status) + '<span class="mod-row__bar">' + U.progressBar(m.percent, 'Avancement : ' + c.title) + '</span></li>';
  }

  function space(main, params) {
    var s = CUR.spaceById(params.space);
    if (!s) return P.notFound.render(main);
    var st = MA.spaceState(s, O.ctx());
    var courses = visibleCourses(st.courses).map(function (c) {
      var planned = c.state.status === 'planned';
      return '<article class="course' + (planned ? ' course--planned' : '') + '"><header class="course__head"><h2>' + esc(c.title) + '</h2>' + pill(c.state.status) + '</header>' +
        (planned ? '<p class="muted">Le contenu de ce cours n’est pas encore développé.</p>' :
          (c.coverage === 'partial' ? '<p class="muted">Couverture partielle : ce cours réunit les modules disponibles, sans couvrir tout le programme.</p>' : '') +
          '<ul class="mod-rows">' + c.state.modules.map(moduleRow).join('') + '</ul>') + '</article>';
    }).join('');
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Parcours', href: '#/parcours' }, { label: s.title }]) + P.head(s.title, esc(s.text)) + P.officialNotice() +
      (s.placement ? '<div class="callout callout--info">' + I('target') + '<p>Déjà expérimenté ? Les <a href="#/evaluations">tests de positionnement</a> valident directement vos acquis.</p></div>' : '') +
      '<div class="courses">' + courses + '</div></div>';
  }

  function competence(main, params) {
    var id = params.module, c = CUR.competencies[id], ctx = O.ctx();
    if (!c || !ctx.content[id]) return P.notFound.render(main);
    var m = MA.moduleMastery(id, ctx), off = O.get();
    var steps = m.steps.map(function (s, i) {
      return '<li class="step' + (s.done ? ' is-done' : '') + '"><span class="step__n" aria-hidden="true">' + (s.done ? I('check') : i + 1) + '</span><div class="step__body"><h3><a href="' + s.href + '">' + esc(s.label) + '</a></h3>' +
        U.progressBar(s.percent, s.label) + '<p class="muted">' + s.percent + ' % réalisés · seuil conseillé : ' + s.target + ' %</p></div></li>';
    }).join('');
    var prereq = c.prerequisites.length ? '<p>Prérequis : ' + c.prerequisites.map(function (p) { return '<a href="#/competence/' + p + '">' + esc(CUR.competencies[p].title) + '</a>' + (ctx.validated[p] ? ' ' + I('check') : ''); }).join(', ') + '</p>' : '<p class="muted">Aucun prérequis.</p>';
    var fid = 'final-' + id;
    var action;
    if (m.status === 'validated') action = '<p class="pill pill--ok">' + I('check') + 'Compétence validée ' + esc(U.formatWhen(m.validated.validated_at)) + '</p><p><a class="btn btn--ghost" href="#/attestation/' + id + '">' + I('shield') + 'Voir l’attestation interne</a></p>';
    else if (m.status === 'locked') action = '<p>' + I('lock') + ' Validez d’abord : ' + m.prerequisitesMissing.map(function (p) { return esc(CUR.competencies[p].title); }).join(', ') + '.</p><p class="muted">Vous pouvez vous entraîner dès maintenant. Seule l’évaluation reste fermée.</p>';
    else if (off.status === 'ready') action = (m.ready ? '<p>Vous avez atteint les seuils conseillés.</p>' : '<p class="muted">Seuils conseillés non atteints : vous pouvez tout de même tenter l’évaluation.</p>') + '<a class="btn btn--primary" href="#/evaluations/' + fid + '">' + I('shield') + 'Passer l’évaluation</a>';
    else action = '<p class="muted">L’évaluation nécessite une connexion à votre compte et un service actif.</p>';
    var weak = m.weak.length ? '<section class="box"><h2>À retravailler</h2><p class="muted">D’après vos exercices sans réussite à ce jour.</p><ul>' + m.weak.slice(0, 4).map(function (w) { return '<li>' + esc(w.skill) + ' (' + w.failed + ' exercice' + (w.failed > 1 ? 's' : '') + ')</li>'; }).join('') + '</ul><p><a class="btn btn--ghost btn--sm" href="#/defis/' + id + '">Refaire les exercices</a> <a class="btn btn--ghost btn--sm" href="#/assistant/' + id + '">' + I('sparkle') + 'Demander une explication</a></p></section>' : '';
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Parcours', href: '#/parcours' }, { label: c.title }]) + P.moduleNav(id, null) +
      P.head(c.title, 'Suivez ces étapes, puis faites valider la compétence.', pill(m.status)) + P.officialNotice() +
      '<div class="competence"><ol class="steps">' + steps + '</ol><div class="competence__side"><section class="box box--accent"><h2>Validation</h2>' + prereq + action + '</section>' + weak + '</div></div></div>';
  }

  P.spaces = { title: 'Parcours', render: spaces };
  P.space = { title: function (p) { var s = CUR.spaceById(p.space); return s ? s.title : 'Parcours'; }, render: space };
  P.competence = { title: function (p) { var c = CUR.competencies[p.module]; return c ? c.title : 'Compétence'; }, render: competence };
})(window);
