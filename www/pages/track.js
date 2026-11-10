/*
 * TELECOM CONNECT LAB 2.0 — Choix et évolution du parcours.
 * Le choix initial est demandé une seule fois. Les changements sont vérifiés
 * par le serveur et ne suppriment aucun résultat.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc, P = TCL.pages, O = TCL.official, CUR = TCL.curriculum, A = TCL.access;

  function availability(s) {
    var live = s.courses.filter(function (c) { return c.modules.length; }).length;
    return live ? live + ' cours disponibles sur ' + s.courses.length : 'Contenus en cours de développement';
  }
  function title(id) { return (CUR.competencies[id] || {}).title || id; }

  function specOptions(selected) {
    return '<option value="">Tous les métiers (je préciserai plus tard)</option>' + CUR.specializations().map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.title) + (c.modules.length ? '' : ' (à développer)') + '</option>';
    }).join('');
  }

  /* --------------------------------- Premier choix --------------------------------- */

  function welcome(main) {
    var t = A.track(), u = TCL.auth.state().user || {};
    if (t.state !== 'missing') {
      main.innerHTML = '<div class="container page page--narrow"><p class="loading" id="track-loading" role="status"><span class="spinner" aria-hidden="true"></span>Chargement de votre profil…</p></div>';
      return;
    }
    var options = CUR.spaces.map(function (s) {
      return '<label class="track-option"><input type="radio" name="track" value="' + s.id + '"><span class="track-option__body">' + I(s.icon) + '<span><strong>' + esc(s.title) + '</strong><span class="track-option__text">' + esc(s.text) + '</span><span class="track-option__meta">' + esc(availability(s)) + '</span></span></span></label>';
    }).join('');
    main.innerHTML = '<div class="container page page--narrow">' +
      P.head('Bienvenue' + (u.name ? ', ' + u.name : ''), 'Choisissez votre parcours : votre espace s’adaptera à votre niveau. Ce choix est lié à votre compte et ne vous sera plus demandé.') +
      '<form id="track-form" novalidate><fieldset class="track-options"><legend class="sr-only">Votre parcours</legend>' + options + '</fieldset>' +
      '<div class="control" id="spec-box" hidden><label for="spec">Spécialisation (facultatif)</label><select id="spec">' + specOptions('') + '</select></div>' +
      '<p class="muted note">Vous pourrez évoluer plus tard depuis « Mon parcours », en respectant les prérequis. Vos résultats seront toujours conservés.</p>' +
      '<p class="field-error" id="track-err" role="alert"></p><button type="submit" class="btn btn--primary btn--lg btn--block" id="track-ok" disabled>' + I('check') + 'Confirmer mon parcours</button></form></div>';
    var form = U.qs('#track-form', main), ok = U.qs('#track-ok', main), err = U.qs('#track-err', main), specBox = U.qs('#spec-box', main);
    function chosen() { return (U.qs('input[name=track]:checked', form) || {}).value; }
    U.qsa('input[name=track]', form).forEach(function (r) {
      r.addEventListener('change', function () { ok.disabled = false; specBox.hidden = chosen() !== 'pro'; err.textContent = ''; });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var space = chosen();
      if (!space) return;
      var spec = space === 'pro' ? (U.qs('#spec', form).value || null) : null;
      ok.disabled = true; err.textContent = '';
      saveInitial(space, spec).then(function () {
        U.toast('Parcours enregistré : ' + CUR.trackLabel(space, spec), 'success');
        if (root.location.hash === '#/bienvenue') root.location.hash = '#/mon-espace';
      }).catch(function (ex) {
        if (ex && ex.hint === 'already_chosen') { O.refresh().then(function () { root.location.hash = '#/mon-espace'; }); return; }
        ok.disabled = false;
        err.textContent = (ex && ex.message) || 'Votre choix n’a pas pu être enregistré. Réessayez.';
      });
    });
  }

  /** Dans le profil serveur, ou — tant que le service n'est pas activé — avec la progression du compte. */
  function saveInitial(space, spec) {
    if (O.get().status === 'ready') {
      return TCL.api.rpc('choose_initial_track', { p_space: space, p_specialization: spec }).then(function () { return O.refresh(); });
    }
    // Conservé sur l'appareil tout de suite ; la synchronisation réessaie seule en cas de coupure.
    TCL.store.update(function (s) { s.prefs.track = { space: space, specialization: spec, at: new Date().toISOString() }; }, 'track');
    TCL.sync.syncNow();
    return Promise.resolve();
  }

  /* ------------------------------- Évolution du parcours ------------------------------- */

  function change(main) {
    var t = A.track(), off = O.get();
    if (t.state !== 'set') {
      main.innerHTML = '<div class="container page page--narrow"><p class="loading" role="status"><span class="spinner" aria-hidden="true"></span>Chargement de votre profil…</p></div>';
      return;
    }
    var online = off.status === 'ready';
    var directPro = (off.history || []).some(function (h) { return h.kind === 'initial' && h.to_space === 'pro'; });
    var cards = CUR.spaces.map(function (s) {
      var isCurrent = t.space === s.id;
      var move = CUR.checkMove(t, { space: s.id, specialization: s.id === 'pro' ? (t.space === 'pro' ? t.specialization : null) : null }, off.validated, directPro);
      var body;
      if (isCurrent && s.id !== 'pro') body = P.statusBadge('Parcours actuel');
      else if (move.allowed || move.same) {
        body = (isCurrent ? P.statusBadge('Parcours actuel') : '') + (s.id === 'pro' ? '<div class="control"><label for="spec-change">Spécialisation</label><select id="spec-change">' + specOptions(t.space === 'pro' ? t.specialization : '') + '</select></div>' : '') +
          '<button type="button" class="btn btn--primary btn--sm" data-move="' + s.id + '"' + (online ? '' : ' disabled') + '>' + (isCurrent ? 'Modifier ma spécialisation' : 'Choisir ce parcours') + '</button>';
      } else {
        body = '<p class="track-need">' + I('lock') + '<span>À valider d’abord : ' + move.missing.map(function (c) { return '<a href="#/competence/' + c + '">' + esc(title(c)) + '</a>'; }).join(', ') + '</span></p>' +
          (move.placements.length ? '<p class="muted small">Déjà expérimenté ? ' + move.placements.map(function (p) { return '<a href="#/evaluations/' + p.id + '">' + esc(p.title) + '</a>'; }).join(' · ') + '</p>' : '');
      }
      return '<article class="course' + (isCurrent ? ' course--current' : '') + '"><header class="course__head"><h2>' + esc(s.title) + '</h2></header><p>' + esc(s.text) + '</p><p class="muted small">' + esc(availability(s)) + '</p>' + body + '</article>';
    }).join('');
    var history = (off.history || []).map(function (h) {
      return '<li>' + esc(h.kind === 'initial' ? 'Parcours choisi : ' + CUR.trackLabel(h.to_space, h.to_specialization) : CUR.trackLabel(h.from_space, h.from_specialization) + ' → ' + CUR.trackLabel(h.to_space, h.to_specialization)) + ' <span class="muted">' + esc(U.formatWhen(h.at)) + '</span></li>';
    }).join('');
    var validated = Object.keys(off.validated);
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Mon parcours', href: '#/parcours' }, { label: 'Changer de parcours' }]) +
      P.head('Changer de parcours', 'Parcours actuel : <strong>' + esc(t.label) + '</strong>. Vos résultats et vos validations restent conservés.') +
      (online ? '' : '<div class="callout callout--warn">' + I('alert') + '<p>' + (off.status === 'not_deployed' ? 'Le changement de parcours sera disponible une fois le service activé.' : 'Une connexion est nécessaire pour changer de parcours.') + '</p></div>') +
      '<p class="field-error" id="move-err" role="alert"></p><div class="courses">' + cards + '</div>' +
      '<div class="dash dash--even"><section class="box"><h2>Compétences conservées</h2>' + (validated.length ? '<ul class="plain">' + validated.map(function (c) { return '<li>' + I('check') + ' ' + esc(title(c)) + '</li>'; }).join('') + '</ul>' : '<p class="muted">Aucune compétence validée pour l’instant.</p>') + '</section>' +
      '<section class="box"><h2>Historique</h2>' + (history ? '<ul class="plain">' + history + '</ul>' : '<p class="muted">Aucun changement enregistré.</p>') + '</section></div></div>';

    U.qsa('[data-move]', main).forEach(function (b) {
      b.addEventListener('click', function () {
        var space = b.getAttribute('data-move'), sel = U.qs('#spec-change', main);
        var spec = space === 'pro' && sel ? (sel.value || null) : null;
        if (!root.confirm('Passer au parcours « ' + CUR.trackLabel(space, spec) + ' » ? Vos résultats et vos validations sont conservés.')) return;
        b.disabled = true;
        TCL.api.rpc('change_track', { p_space: space, p_specialization: spec }).then(function () { return O.refresh(); }).then(function () {
          U.toast('Votre parcours est maintenant : ' + CUR.trackLabel(space, spec), 'success');
          root.location.hash = '#/mon-espace';
        }).catch(function (e) { b.disabled = false; U.qs('#move-err', main).textContent = e.message; });
      });
    });
  }

  /* ------------------------------------ Hors parcours ------------------------------------ */

  function outOfTrack(main, params) {
    var t = A.track(), c = CUR.competencies[params.module] || {};
    main.innerHTML = '<div class="container page page--narrow"><div class="empty">' + I('route', 'empty__icon') + '<h1 tabindex="-1">Hors de votre parcours</h1><p>« ' + esc(c.title || params.module) + ' » ne fait pas partie du parcours ' + esc(t.label || '') + '.</p>' +
      '<div class="empty__actions"><a class="btn btn--primary" href="#/parcours">' + I('route') + 'Voir mon parcours</a><a class="btn btn--ghost" href="#/changer-parcours">Changer de parcours</a></div></div></div>';
  }

  P.welcome = { title: 'Choisir mon parcours', render: welcome };
  P.trackChange = { title: 'Changer de parcours', render: change };
  P.outOfTrack = { title: 'Hors de votre parcours', render: outOfTrack };
})(window);
