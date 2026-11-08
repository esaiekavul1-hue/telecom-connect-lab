
/*
 * TELECOM CONNECT LAB — Démarrage de l'application, navigation et en-tête
 * ---------------------------------------------------------------------
 * Navigation par ancres (#/lecons, #/laboratoire…).
 */
(function (root) {
  'use strict';

  var TCL = root.TCL;
  var U = TCL.util;
  var I = TCL.icon;

  var NAV = [
    { id: 'parcours', href: '#/parcours', label: 'Parcours', icon: 'route' },
    { id: 'lessons', href: '#/lecons', label: 'Mes leçons', icon: 'book' },
    { id: 'lab', href: '#/laboratoire', label: 'Mon laboratoire', icon: 'flask' },
    { id: 'challenges', href: '#/defis', label: 'Mes défis', icon: 'target' },
    { id: 'evaluations', href: '#/evaluations', label: 'Évaluations', icon: 'shield' },
    { id: 'assistant', href: '#/assistant', label: 'Assistant', icon: 'sparkle' },
    { id: 'dashboard', href: '#/mon-espace', label: 'Mon espace', icon: 'user' }
  ];

  var ROUTES = [
    { re: /^\/?$/, page: 'home', nav: 'home' },
    { re: /^\/lecons\/?$/, page: 'lessons', nav: 'lessons' },
    { re: /^\/lecons\/([a-z0-9-]+)(?:\/(c\d+))?\/?$/, page: 'lesson', nav: 'lessons', keys: ['module', 'chapter'] },
    { re: /^\/laboratoire\/?$/, page: 'labs', nav: 'lab' },
    { re: /^\/laboratoire\/([a-z0-9-]+)\/?$/, page: 'lab', nav: 'lab', keys: ['lab'] },
    { re: /^\/defis\/?$/, page: 'challenges', nav: 'challenges' },
    { re: /^\/defis\/([a-z0-9-]+)\/?$/, page: 'challenge', nav: 'challenges', keys: ['module'] },
    { re: /^\/progression\/?$/, page: 'progress', nav: 'dashboard' },
    { re: /^\/compte\/?$/, page: 'account', nav: 'dashboard' },
    { re: /^\/parcours\/?$/, page: 'spaces', nav: 'parcours' },
    { re: /^\/parcours\/([a-z0-9-]+)\/?$/, page: 'space', nav: 'parcours', keys: ['space'] },
    { re: /^\/competence\/([a-z0-9-]+)\/?$/, page: 'competence', nav: 'parcours', keys: ['module'] },
    { re: /^\/evaluations\/?$/, page: 'evaluations', nav: 'evaluations' },
    { re: /^\/evaluations\/([a-z0-9-]+)\/?$/, page: 'assessment', nav: 'evaluations', keys: ['id'] },
    { re: /^\/resultat\/([a-f0-9-]+)\/?$/, page: 'result', nav: 'evaluations', keys: ['id'] },
    { re: /^\/attestation\/([a-z0-9-]+)\/?$/, page: 'attestation', nav: 'dashboard', keys: ['module'] },
    { re: /^\/assistant(?:\/([a-z0-9-]+))?\/?$/, page: 'assistant', nav: 'assistant', keys: ['module'] },
    { re: /^\/mon-espace\/?$/, page: 'dashboard', nav: 'dashboard' },
    { re: /^\/admin\/?$/, page: 'admin', nav: 'dashboard' },
    { re: /^\/connexion\/?$/, page: 'login', nav: 'login', fixed: { mode: 'login' } },
    { re: /^\/inscription\/?$/, page: 'login', nav: 'login', fixed: { mode: 'signup' } }
  ];

  var cleanup = null;
  var currentPath = null;

  function parse() {
    var raw = (root.location.hash || '#/').replace(/^#/, '');
    var path = raw.split('?')[0] || '/';

    for (var i = 0; i < ROUTES.length; i++) {
      var m = ROUTES[i].re.exec(path);

      if (m) {
        var params = Object.assign({}, ROUTES[i].fixed || {});
        (ROUTES[i].keys || []).forEach(function (k, j) {
          params[k] = m[j + 1];
        });

        return { route: ROUTES[i], params: params, path: path };
      }
    }

    return {
      route: { page: 'notFound', nav: null },
      params: {},
      path: path
    };
  }

  function render(force) {
    var r = parse();

    if (!force && r.path === currentPath) return;

    var samePage = currentPath === r.path;
    currentPath = r.path;

    if (cleanup) {
      try {
        cleanup();
      } catch (e) {
        console.error(e);
      }
      cleanup = null;
    }

    var main = U.qs('#main');
    var page = TCL.pages[r.route.page] || TCL.pages.notFound;

    main.classList.remove('is-entering');

    try {
      cleanup = page.render(main, r.params) || null;
    } catch (e) {
      console.error(e);
      main.innerHTML =
        '<div class="container page">' +
          '<div class="callout callout--error">' +
            '<h1 tabindex="-1">Cette page n’a pas pu s’afficher</h1>' +
            '<p>Une erreur inattendue s’est produite. Revenez à l’accueil puis réessayez.</p>' +
            '<p><a class="btn btn--primary" href="#/">Revenir à l’accueil</a></p>' +
          '</div>' +
        '</div>';
    }

    document.title =
      (page.title
        ? (typeof page.title === 'function'
          ? page.title(r.params)
          : page.title) + ' · '
        : '') + 'TELECOM CONNECT LAB';

    setActiveNav(r.route.nav);
    closeMenu();

    if (!samePage) {
      root.scrollTo(0, 0);

      if (!U.prefersReducedMotion()) {
        void main.offsetWidth;
        main.classList.add('is-entering');
      }

      var h1 = main.querySelector('h1');

      if (h1 && document.body.dataset.ready) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
    }

    document.body.dataset.ready = '1';
  }

  /* --------------------------------- En-tête --------------------------------- */

  function buildHeader() {
    var links = NAV.map(function (n) {
      return '<li><a class="nav__link" href="' + n.href +
        '" data-nav="' + n.id + '">' + I(n.icon) +
        '<span>' + n.label + '</span></a></li>';
    }).join('');

    U.qs('#nav-list').innerHTML =
      links + '<li class="nav__auth" id="nav-auth"></li>';

    U.qs('#menu-toggle').addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');

      this.setAttribute('aria-expanded', open ? 'true' : 'false');
      this.setAttribute(
        'aria-label',
        open ? 'Fermer le menu' : 'Ouvrir le menu'
      );
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    renderAuthNav();
  }

  function closeMenu() {
    document.body.classList.remove('menu-open');

    var t = U.qs('#menu-toggle');

    if (t) {
      t.setAttribute('aria-expanded', 'false');
      t.setAttribute('aria-label', 'Ouvrir le menu');
    }
  }

  function setActiveNav(id) {
    U.qsa('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === id;

      a.classList.toggle('is-active', on);

      if (on) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  /* Bouton Connexion / Déconnexion selon l'état réel de la session. */

  function renderAuthNav() {
    var host = U.qs('#nav-auth');
    if (!host) return;

    var st = TCL.auth.state();

    if (st.status === 'signedIn') {
      host.innerHTML =
        '<button type="button" class="nav__link nav__link--auth" id="btn-signout">' +
        I('logout') + '<span>Déconnexion</span></button>';

      U.qs('#btn-signout').addEventListener('click', signOut);
    } else if (st.status === 'checking') {
      host.innerHTML =
        '<span class="nav__link nav__link--auth is-muted" aria-live="polite">' +
        I('clock') + '<span>Vérification…</span></span>';
    } else {
      host.innerHTML =
        '<a class="nav__link nav__link--auth" href="#/connexion" data-nav="login">' +
        I('login') + '<span>Connexion</span></a>';

      setActiveNav(parse().route.nav);
    }
  }

  function signOut() {
    var btn = U.qs('#btn-signout');

    if (btn) {
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Déconnexion…';
    }

    TCL.auth.signOut().then(function () {
      U.toast('Vous êtes déconnecté.', 'info');

      if (/^\/compte/.test(parse().path)) {
        render(true);
      } else {
        root.location.hash = '#/compte';
      }
    });
  }

  TCL.signOut = signOut;
  TCL.router = {
    rerender: function () {
      render(true);
    },
    current: parse
  };

  function renderFooterStorage() {
    var el = U.qs('#footer-storage');
    if (!el) return;

    var st = TCL.auth.state();
    var sy = TCL.sync.status();
    var txt;

    if (!TCL.store.isPersistent()) {
      txt = 'Votre navigateur bloque l’enregistrement local : la progression sera perdue à la fermeture de la page.';
    } else if (st.status === 'signedIn') {
      txt = sy.state === 'synced'
        ? 'Progression enregistrée dans votre compte.'
        : sy.state === 'error'
          ? 'Progression conservée sur cet appareil ; la synchronisation a échoué.'
          : 'Progression associée à votre compte.';
    } else {
      txt = 'Progression enregistrée sur cet appareil uniquement.';
    }

    el.textContent = txt;
  }

  /* --------------------------------- Démarrage --------------------------------- */

  function start() {
    buildHeader();
    U.qs('#footer-year').textContent = String(new Date().getFullYear());

    TCL.auth.beforeSignOut(function () {
      return TCL.sync.beforeSignOut();
    });

    var lastUserId = null;

    TCL.auth.onChange(function (st) {
      renderAuthNav();

      if (st.status === 'signedIn' && st.user && st.user.id !== lastUserId) {
        lastUserId = st.user.id;
        TCL.sync.start(st.user);
        TCL.official.setUser(st.user);
      } else if (
        st.status !== 'signedIn' &&
        st.status !== 'checking' &&
        lastUserId
      ) {
        lastUserId = null;
        TCL.sync.stop();
        TCL.official.setUser(null);
      }

      renderFooterStorage();

      if (
        document.body.dataset.ready &&
        ['account', 'login', 'progress', 'spaces', 'space', 'competence', 'evaluations', 'dashboard'].indexOf(parse().route.page) >= 0
      ) {
        render(true);
      }
    });

    TCL.official.onChange(function () {
      var page = parse().route.page;
      var gated = page === 'admin' && !document.querySelector('#adm');
      if (document.body.dataset.ready && (gated || ['spaces', 'space', 'competence', 'evaluations', 'dashboard', 'attestation'].indexOf(page) >= 0)) render(true);
    });

    // Les formulaires des laboratoires se pilotent sans envoi de page.
    document.addEventListener('submit', function (e) {
      if (e.target.classList && e.target.classList.contains('controls')) e.preventDefault();
    });

    TCL.sync.onChange(function () {
      renderFooterStorage();

      var el = U.qs('[data-sync-status]');

      if (el && TCL.pages.syncStatusHtml) {
        el.innerHTML = TCL.pages.syncStatusHtml();
      }
    });

    TCL.store.subscribe(function (s, reason) {
      if (
        (reason === 'sync' || reason === 'scope') &&
        ['progress', 'account'].indexOf(parse().route.page) >= 0
      ) {
        render(true);
      }
    });

    root.addEventListener('hashchange', function () {
      render(false);
    });

    // Vérifier la session avant le premier affichage.
    var ready = TCL.auth.init();

    ready.then(function () {
      render(true);
    });

    ready.then(function () {
      renderFooterStorage();

      var f = TCL.auth.takeFlash();

      if (f) U.toast(f.text, f.kind);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
