/*
 * TELECOM CONNECT LAB 2.0 — Accès et personnalisation
 * --------------------------------------------------
 * Trois modes :
 *   open    : aucune connexion configurée, toute la plateforme reste locale ;
 *   visitor : découverte publique, sans le catalogue ;
 *   student : espace adapté au parcours du compte.
 *
 * Ces règles organisent l'interface. Les évaluations et les validations sont
 * contrôlées par le serveur (public.start_attempt, public.change_track).
 *
 * Un parcours n'est demandé que si le serveur confirme qu'il n'y en a pas :
 * une panne ou une coupure ne provoque jamais une nouvelle sélection.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var CUR = TCL.curriculum, O = TCL.official;
  var DEMO = 'decouverte';

  function mode() {
    var s = TCL.auth.state().status;
    return s === 'disabled' ? 'open' : s === 'signedIn' ? 'student' : 'visitor';
  }

  function set(space, specialization, source) {
    return { state: 'set', space: space, specialization: specialization || null, source: source, label: CUR.trackLabel(space, specialization) };
  }

  /**
   * set     : parcours connu (serveur, ou choix local en attente d'activation du service) ;
   * missing : le service confirme l'absence de parcours, il faut le demander ;
   * unknown : impossible de savoir pour l'instant, on ne demande rien.
   */
  function track() {
    if (mode() !== 'student') return { state: 'none' };
    var off = O.get(), p = off.profile, pref = (TCL.store.get().prefs || {}).track, sync = TCL.sync.status().state;
    if (p && p.space) return set(p.space, p.specialization, 'server');
    if (off.status === 'ready') {
      if (pref) return set(pref.space, pref.specialization, 'pending');
      return { state: sync === 'syncing' ? 'unknown' : 'missing' };
    }
    if (pref) return set(pref.space, pref.specialization, 'local');
    return { state: off.status === 'not_deployed' && sync === 'synced' ? 'missing' : 'unknown' };
  }

  function hasActivity(st, id) {
    return Object.keys((st.lessons[id] || {}).chapters || {}).length > 0 ||
      Object.keys((st.lab[id] || {}).missions || {}).length > 0 ||
      Object.keys((st.exercises[id] || {}).items || {}).length > 0;
  }

  /** core : le parcours ; prerequisites : bases exigées ; other : modules déjà travaillés ailleurs, jamais perdus. */
  function scope() {
    var t = track();
    if (t.state !== 'set') return null;
    var m = CUR.trackModules(t.space, t.specialization), known = m.core.concat(m.prerequisites);
    var st = TCL.store.get(), validated = O.get().validated;
    var other = Object.keys(CUR.competencies).filter(function (id) { return known.indexOf(id) < 0 && (validated[id] || hasActivity(st, id)); });
    return { track: t, core: m.core, prerequisites: m.prerequisites, other: other };
  }

  function allows(id) { var s = scope(); return !s || s.core.indexOf(id) >= 0 || s.prerequisites.indexOf(id) >= 0 || s.other.indexOf(id) >= 0; }
  /** Dans le parcours au sens du serveur : seules ces évaluations sont ouvertes. */
  function inTrack(id) { var s = scope(); return !s || s.core.indexOf(id) >= 0 || s.prerequisites.indexOf(id) >= 0; }
  function moduleFilter() { var s = scope(); if (!s) return null; return function (id) { return s.core.indexOf(id) >= 0 || s.prerequisites.indexOf(id) >= 0 || s.other.indexOf(id) >= 0; }; }
  function coreIds() { var s = scope(); return s ? s.core : undefined; }

  function tag(id) {
    var s = scope();
    if (!s) return '';
    if (s.prerequisites.indexOf(id) >= 0) return 'Base à consolider';
    if (s.other.indexOf(id) >= 0) return 'Hors de votre parcours';
    return '';
  }

  /** Limite les données du moteur de maîtrise au parcours actif. */
  function trackCtx() {
    var c = O.ctx(), s = scope();
    if (!s) return c;
    var content = {};
    s.core.concat(s.prerequisites).forEach(function (id) { if (c.content[id]) content[id] = c.content[id]; });
    return Object.assign({}, c, { content: content });
  }

  var PUBLIC_PAGES = { home: 'publicHome', lessons: 'publicLessons', labs: 'publicLabs', challenges: 'publicChallenges', progress: 'publicProgress' };
  var PUBLIC_DEMO = { lesson: 'publicLesson', lab: 'publicLab', challenge: 'publicChallenge' };
  var LIST_OF = { lesson: '#/lecons', lab: '#/laboratoire', challenge: '#/defis' };
  var MEMBERS_ONLY = ['spaces', 'space', 'competence', 'evaluations', 'assessment', 'result', 'attestation', 'assistant', 'dashboard', 'admin', 'welcome', 'trackChange'];

  function moduleOf(r) { return r.params.module || r.params.lab || null; }

  /** Décision de navigation : { redirect } , { page, params } ou null (page demandée). */
  function decide(r) {
    var m = mode(), page = r.route.page, id = moduleOf(r);

    if (m === 'visitor') {
      if (PUBLIC_PAGES[page]) return { page: PUBLIC_PAGES[page] };
      if (PUBLIC_DEMO[page]) return id === DEMO ? { page: PUBLIC_DEMO[page] } : { page: 'gate' };
      return MEMBERS_ONLY.indexOf(page) >= 0 ? { page: 'gate' } : null;
    }

    if (PUBLIC_DEMO[page] && id === DEMO) return { redirect: LIST_OF[page] };
    if (m === 'open') return page === 'welcome' || page === 'trackChange' ? { redirect: '#/mon-espace' } : null;

    var t = track();
    if (page === 'home' || page === 'login') return { redirect: t.state === 'missing' ? '#/bienvenue' : '#/mon-espace' };
    if (t.state === 'missing') return ['welcome', 'account', 'admin', 'notFound'].indexOf(page) >= 0 ? null : { redirect: '#/bienvenue' };
    if (page === 'welcome' && t.state === 'set') return { redirect: '#/mon-espace' };

    if (t.state === 'set') {
      if (page === 'spaces') return { page: 'space', params: { space: t.space } };
      if (page === 'space' && r.params.space !== t.space) return { redirect: '#/parcours' };
      if ((PUBLIC_DEMO[page] || page === 'competence') && CUR.competencies[id] && !allows(id)) return { page: 'outOfTrack', params: { module: id } };
      if (page === 'assessment' && /^final-/.test(r.params.id) && !inTrack(r.params.id.slice(6))) return { page: 'outOfTrack', params: { module: r.params.id.slice(6) } };
    }
    return null;
  }

  /* --------------------------- Chargement du catalogue --------------------------- */

  /*
   * Les contenus sont téléchargés après authentification et seulement pour le
   * parcours de l'étudiant : un téléphone ne charge pas tout le catalogue.
   * L'ordre d'exécution des scripts suit l'ordre d'insertion.
   */
  var V1_FILES = {
    circuits: ['simulation', 'lesson', 'exercises'],
    signaux: ['lesson', 'simulation', 'exercises'],
    'ondes-em': ['wave-math', 'simulation', 'lesson', 'exercises'],
    antennes: ['antenna-math', 'simulation', 'lesson', 'exercises'],
    propagation: ['propagation-math', 'simulation', 'lesson', 'exercises'],
    chaine: ['chain-math', 'simulation', 'lesson', 'exercises'],
    modulation: ['modulation-math', 'simulation', 'lesson', 'exercises'],
    fibre: ['fiber-math', 'simulation', 'lesson', 'exercises'],
    mobiles: ['mobile-math', 'simulation', 'lesson', 'exercises'],
    ip: ['ip-math', 'simulation', 'lesson', 'exercises']
  };
  var KIT = ['core/schematic.js', 'core/module-kit.js', 'core/lab-engine.js'];
  var loadedFiles = {}, loadedModules = {}, loading = null;

  function filesOf(id) {
    var f = V1_FILES[id];
    return f ? f.map(function (n) { return 'modules/' + id + '/' + n + '.js'; }) : ['modules/' + id + '/' + id + '.js'];
  }

  function loadScript(src) {
    if (loadedFiles[src]) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = function () { loadedFiles[src] = 1; resolve(); };
      s.onerror = function () { s.remove(); reject(new Error('Chargement impossible : ' + src)); };
      document.body.appendChild(s);
    });
  }

  /** Ce qu'il faut télécharger ; null : le parcours n'est pas encore connu, on attend. */
  function wanted() {
    var m = mode();
    if (m === 'visitor') return [];
    var all = TCL.registry.modules.map(function (x) { return x.id; });
    if (m === 'open') return all;
    var t = track();
    if (t.state === 'missing') return [];
    if (t.state === 'unknown') return O.get().status === 'loading' || TCL.sync.status().state === 'syncing' ? null : all;
    var s = scope();
    return s.core.concat(s.prerequisites, s.other);
  }

  function missing(list) { return list.filter(function (id) { return !loadedModules[id]; }); }

  function load() {
    var list = wanted();
    if (!list || !missing(list).length) return Promise.resolve();
    if (loading) return loading.then(load);
    var todo = missing(list), src = KIT.slice();
    todo.forEach(function (id) { src = src.concat(filesOf(id)); });
    loading = Promise.all(src.map(loadScript)).then(function () { todo.forEach(function (id) { loadedModules[id] = 1; }); loading = null; }, function (e) { loading = null; throw e; });
    return loading;
  }

  TCL.content = {
    load: load, filesOf: filesOf,
    pending: function () { return wanted() === null; },
    ready: function () { var w = wanted(); return w !== null && !missing(w).length; },
    needed: function () { return mode() !== 'visitor'; }
  };

  TCL.access = { DEMO: DEMO, mode: mode, track: track, scope: scope, allows: allows, inTrack: inTrack, moduleFilter: moduleFilter, coreIds: coreIds, tag: tag, trackCtx: trackCtx, decide: decide };
})(window);
