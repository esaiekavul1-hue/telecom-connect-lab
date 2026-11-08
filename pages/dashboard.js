/*
 * TELECOM CONNECT LAB 2.0 — Mon espace : tableau de bord de l'étudiant.
 * Chaque chiffre provient d'activités enregistrées ou de validations serveur.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc, P = TCL.pages, O = TCL.official, CUR = TCL.curriculum, MA = TCL.mastery;

  function stat(value, label) { return '<div class="stat"><p class="stat__v">' + value + '</p><p class="stat__l">' + esc(label) + '</p></div>'; }

  function render(main) {
    var auth = TCL.auth.state(), off = O.get(), ctx = O.ctx();
    var overall = TCL.registry.overallProgress(ctx.state);
    var ids = Object.keys(CUR.competencies).filter(function (id) { return ctx.content[id]; });
    var mm = ids.map(function (id) { return MA.moduleMastery(id, ctx); });
    var profile = off.profile, signedIn = auth.status === 'signedIn';
    var name = (profile && profile.display_name) || (auth.user && (auth.user.name || auth.user.email)) || 'Invité';
    var spaceId = (profile && profile.space) || '';
    var space = CUR.spaceById(spaceId);
    var validated = mm.filter(function (m) { return m.status === 'validated'; });
    var recs = MA.recommendations(ctx, 4);

    var recHtml = recs.length ? '<ul class="plain recs">' + recs.map(function (r) { return '<li><a href="' + r.href + '">' + I(r.icon) + '<span>' + esc(r.text) + '</span></a></li>'; }).join('') + '</ul>' : '<p class="muted">Toutes les compétences disponibles sont validées.</p>';
    var compHtml = mm.map(function (m) {
      return '<li class="mod-row"><a href="#/competence/' + m.id + '">' + esc(CUR.competencies[m.id].title) + '</a>' + P.statusPill(m.status) + '<span class="mod-row__bar">' + U.progressBar(m.percent, CUR.competencies[m.id].title) + '</span></li>';
    }).join('');
    var attempts = off.attempts.filter(function (t) { return t.status !== 'in_progress'; }).slice(0, 5).map(function (t) {
      var a = O.assessmentById(t.assessment_id);
      return '<li><a href="#/resultat/' + t.id + '">' + esc(a ? a.title : t.assessment_id) + '</a> <span class="muted">' + esc(U.formatWhen(t.submitted_at || t.started_at)) + ' · ' + (t.percent != null ? Number(t.percent) + ' %' : '—') + '</span> ' + (t.proctor_status === 'pending' ? '<span class="pill">Supervision</span>' : t.passed ? '<span class="pill pill--ok">Réussi</span>' : '<span class="pill pill--ko">Non réussi</span>') + '</li>';
    }).join('');
    var activity = ctx.state.activity.slice(0, 5).map(function (a) { return '<li><span>' + esc(a.text) + '</span> <span class="muted">' + esc(U.formatWhen(a.at)) + '</span></li>'; }).join('');

    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Mon espace' }]) +
      P.head('Bonjour, ' + name, space ? 'Espace choisi : ' + esc(space.title) : 'Votre progression, vos validations et vos prochaines étapes.') + P.officialNotice() +
      (O.updateRequired() ? '<div class="callout callout--warn">' + I('alert') + '<p>Une version plus récente de l’application est requise. Mettez-la à jour pour continuer à passer les évaluations.</p></div>' : '') +
      '<div class="stats">' + stat(overall.percent + ' %', 'de l’entraînement réalisé') + stat(validated.length + ' / ' + ids.length, 'compétences validées') + stat(overall.exMastered + ' / ' + overall.exTotal, 'exercices réussis') + stat(overall.missionsDone + ' / ' + overall.missionsTotal, 'missions de laboratoire') + '</div>' +
      '<div class="dash"><div class="dash__main"><section class="box box--accent"><h2>Prochaines étapes</h2>' + recHtml + '</section>' +
      '<section class="box"><h2>Mes compétences</h2><ul class="mod-rows">' + compHtml + '</ul></section>' +
      '<section class="box"><h2>Mes évaluations</h2>' + (attempts ? '<ul class="plain">' + attempts + '</ul>' : '<p class="muted">Aucune évaluation passée.</p>') + '<p><a class="btn btn--ghost btn--sm" href="#/evaluations">Voir les évaluations</a></p></section></div>' +
      '<aside class="dash__side">' + (signedIn && off.status === 'ready' ? '<section class="box"><h2>Mon parcours</h2><div class="control"><label for="my-space">Espace de formation</label><select id="my-space"><option value="">Non choisi</option>' + CUR.spaces.map(function (s) { return '<option value="' + s.id + '"' + (s.id === spaceId ? ' selected' : '') + '>' + esc(s.title) + '</option>'; }).join('') + '</select><p class="field-hint" id="space-msg" aria-live="polite"></p></div></section>' : '') +
      '<section class="box"><h2>Accès rapides</h2><ul class="plain quick"><li><a href="#/parcours">' + I('book') + 'Parcours</a></li><li><a href="#/laboratoire">' + I('flask') + 'Laboratoires</a></li><li><a href="#/assistant">' + I('sparkle') + 'Assistant IA</a></li><li><a href="#/progression">' + I('chart') + 'Détail de ma progression</a></li><li><a href="#/compte">' + I('user') + 'Mon compte</a></li>' + (O.isAdmin() ? '<li><a href="#/admin">' + I('shield') + 'Administration</a></li>' : '') + '</ul></section>' +
      (validated.length ? '<section class="box"><h2>Attestations internes</h2><ul class="plain">' + validated.map(function (m) { return '<li><a href="#/attestation/' + m.id + '">' + esc(CUR.competencies[m.id].title) + '</a></li>'; }).join('') + '</ul></section>' : '') +
      '<section class="box"><h2>Activité récente</h2>' + (activity ? '<ul class="plain small">' + activity + '</ul>' : '<p class="muted">Aucune activité pour l’instant.</p>') + '<p data-sync-status>' + P.syncStatusHtml() + '</p></section></aside></div></div>';

    var sel = U.qs('#my-space', main);
    if (sel) sel.addEventListener('change', function () {
      var msg = U.qs('#space-msg', main); msg.textContent = 'Enregistrement…';
      TCL.api.update('profiles?id=eq.' + encodeURIComponent(auth.user.id), { space: sel.value || null }).then(function () { O.refresh(); U.toast('Espace enregistré.', 'success'); }).catch(function (e) { msg.textContent = e.message; });
    });
  }

  P.dashboard = { title: 'Mon espace', render: render };
})(window);
