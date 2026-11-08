/*
 * Éléments communs aux pages : fil d'Ariane, en-têtes, page introuvable, statut de synchronisation.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc;

  TCL.pages = TCL.pages || {};

  /** Fil d'Ariane : l'utilisateur sait toujours où il est et comment revenir à l'accueil. */
  TCL.pages.crumbs = function (items) {
    var html = '<nav class="crumbs" aria-label="Fil d’Ariane"><ol>';
    html += '<li><a href="#/">' + I('home') + '<span>Accueil</span></a></li>';
    items.forEach(function (it, i) {
      var last = i === items.length - 1;
      html += '<li>' + (last || !it.href ? '<span aria-current="page">' + esc(it.label) + '</span>' : '<a href="' + it.href + '">' + esc(it.label) + '</a>') + '</li>';
    });
    return html + '</ol></nav>';
  };

  TCL.pages.head = function (title, text, extra) {
    return '<header class="page-head"><div><h1 tabindex="-1">' + esc(title) + '</h1>' +
      (text ? '<p class="page-head__text">' + text + '</p>' : '') + '</div>' + (extra || '') + '</header>';
  };

  /** Statut de synchronisation affiché dans « Mon compte » et « Ma progression ». */
  TCL.pages.syncStatusHtml = function () {
    var a = TCL.auth.state(), s = TCL.sync.status();
    if (a.status !== 'signedIn') {
      if (!TCL.auth.isConfigured()) {
        return '<span class="sync sync--local">' + I('device') + '<span>Enregistrée sur cet appareil uniquement. La connexion et la synchronisation entre appareils ne sont pas encore configurées.</span></span>';
      }
      return '<span class="sync sync--local">' + I('device') + '<span>Enregistrée sur cet appareil uniquement. <a href="#/connexion">Connectez-vous</a> pour la retrouver sur vos autres appareils.</span></span>';
    }
    var map = {
      syncing: ['sync--busy', 'cloud', 'Synchronisation en cours…'],
      synced: ['sync--ok', 'cloud', 'Synchronisée avec votre compte' + (s.lastSyncedAt ? ' (' + U.formatWhen(s.lastSyncedAt) + ')' : '') + '. Elle sera retrouvée sur vos autres appareils.'],
      offline: ['sync--warn', 'device', s.message || 'Hors ligne : progression conservée sur cet appareil.'],
      error: ['sync--error', 'alert', s.message || 'La synchronisation a échoué.'],
      local: ['sync--local', 'device', 'Associée à votre compte sur cet appareil.']
    };
    var m = map[s.state] || map.local;
    var retry = (s.state === 'error' || s.state === 'offline') ? ' <button type="button" class="link-btn" data-sync-retry>Réessayer</button>' : '';
    return '<span class="sync ' + m[0] + '">' + I(m[1]) + '<span>' + esc(m[2]) + retry + '</span></span>';
  };

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-sync-retry]');
    if (t) TCL.sync.syncNow();
  });

  /**
   * Barre « Leçon · Laboratoire · Défis » d'un module : relie les trois parties.
   * active : 'lesson' | 'lab' | 'exercises'.
   */
  TCL.pages.moduleNav = function (moduleId, active) {
    var m = TCL.registry.byId(moduleId);
    if (!m) return '';
    var parts = TCL.registry.liveParts(m);
    var items = [
      ['lesson', '#/lecons/' + m.id, 'book', 'Leçon'],
      ['lab', '#/laboratoire/' + m.id, 'flask', 'Laboratoire'],
      ['exercises', '#/defis/' + m.id, 'target', 'Défis']
    ].filter(function (it) { return parts[it[0]]; });
    if (TCL.curriculum.competencies[m.id]) {
      items.push(['validation', '#/competence/' + m.id, 'shield', 'Validation']);
      items.push(['assistant', '#/assistant/' + m.id, 'sparkle', 'Assistant']);
    }
    return '<nav class="module-nav" aria-label="Parties du module ' + esc(m.title) + '"><span class="module-nav__title">' + I(m.icon) + '<span>' + esc(m.title) + '</span></span><ul>' +
      items.map(function (it) {
        var on = it[0] === active;
        return '<li><a href="' + it[1] + '" class="module-nav__link' + (on ? ' is-active' : '') + '"' + (on ? ' aria-current="page"' : '') + '>' + I(it[2]) + '<span>' + it[3] + '</span></a></li>';
      }).join('') + '</ul></nav>';
  };

  /** Rappelle le parcours actif en tête des listes de contenus. */
  TCL.pages.trackBanner = function () {
    var a = TCL.access, t = a.track();
    if (a.mode() !== 'student') return '';
    if (t.state === 'unknown') return '<div class="callout callout--warn">' + I('device') + '<p>Votre parcours n’a pas pu être chargé : tous les contenus sont affichés pour le moment.</p></div>';
    if (t.state !== 'set') return '';
    return '<p class="track-line">' + I('route') + '<span>Contenus du parcours <strong>' + esc(t.label) + '</strong></span> <a href="#/parcours">Voir mon parcours</a></p>';
  };

  /** Cours du parcours dont le contenu n'existe pas encore. */
  TCL.pages.trackPlanned = function () {
    var s = TCL.access.scope();
    if (!s) return '';
    var list = TCL.curriculum.trackCourses(s.track.space, s.track.specialization).filter(function (c) { return !c.modules.length; });
    if (!list.length) return '';
    return '<section aria-labelledby="planned-title"><h2 class="h-sub" id="planned-title">En cours de développement pour votre parcours</h2><ul class="soon-list">' +
      list.map(function (c) { return '<li class="soon">' + I('clock') + '<div><h4>' + esc(c.title) + '</h4><p>Ce contenu n’est pas encore disponible.</p></div><span class="badge badge--soon">À développer</span></li>'; }).join('') + '</ul></section>';
  };

  TCL.pages.trackEmpty = function (count) {
    if (count || !TCL.access.scope()) return '';
    return '<div class="empty">' + I('clock', 'empty__icon') + '<h2>Aucun contenu disponible pour le moment</h2><p>Les contenus de votre parcours sont en cours de développement. Vous pouvez choisir un autre parcours en attendant : vos résultats seront conservés.</p><p><a class="btn btn--ghost" href="#/changer-parcours">Changer de parcours</a></p></div>';
  };

  TCL.pages.trackTag = function (id) {
    var t = TCL.access.tag(id);
    return t ? '<span class="badge badge--soon">' + esc(t) + '</span>' : '';
  };

  TCL.pages.statusBadge = function (text) { return '<p class="track-current">' + I('check') + '<span>' + esc(text) + '</span></p>'; };

  TCL.pages.notFound = {
    title: 'Page introuvable',
    render: function (main) {
      main.innerHTML = '<div class="container page page--narrow"><div class="empty">' + I('alert', 'empty__icon') +
        '<h1 tabindex="-1">Cette page n’existe pas</h1><p>Le lien suivi est incorrect ou la page a été déplacée.</p>' +
        '<p><a class="btn btn--primary" href="#/">' + I('home') + 'Revenir à l’accueil</a></p></div></div>';
    }
  };
})(window);
