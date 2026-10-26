/*
 * TELECOM CONNECT LAB — Enregistrement de la progression
 * -----------------------------------------------------
 * - Visiteur non connecté : progression conservée dans CE navigateur, sur CET
 *   appareil (localStorage, clé « tcl.progress.guest »).
 * - Utilisateur connecté : copie locale par compte (« tcl.progress.u.<id> ») +
 *   synchronisation avec le stockage distant si celui-ci est configuré
 *   (voir core/sync.js).
 *
 * Seules des données de progression sont enregistrées ici : AUCUN mot de passe,
 * code ou jeton d'authentification n'est écrit dans localStorage.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.store = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var VERSION = 1;
  var GUEST_KEY = 'tcl.progress.guest';
  var MAX_ACTIVITY = 60;

  function emptyState() {
    return {
      version: VERSION,
      updatedAt: null,
      lessons: {},      // { signaux: { chapters: { c1: isoDate }, last: 'c2' } }
      lab: {},          // { signaux: { missions: { m1: isoDate }, params: {...} } }
      exercises: {},    // { signaux: { items: {...}, series: [...], current: {...} } }
      activity: [],     // [{ id, at, type, module, text }]
      prefs: {}
    };
  }

  /* ------------------------- Fusion de deux progressions ------------------------- */

  function minDate(a, b) { if (!a) return b; if (!b) return a; return a < b ? a : b; }
  function maxDate(a, b) { if (!a) return b; if (!b) return a; return a > b ? a : b; }

  function mergeMapDates(a, b) {
    var out = {};
    Object.keys(a || {}).forEach(function (k) { out[k] = a[k]; });
    Object.keys(b || {}).forEach(function (k) { out[k] = minDate(out[k], b[k]); });
    return out;
  }

  /**
   * Fusionne deux progressions sans rien perdre : union des chapitres lus et des
   * missions réussies, cumul des tentatives d'exercices, union des séries et du
   * journal d'activité. Utilisé lors de la connexion et de la synchronisation.
   */
  function merge(a, b) {
    a = normalize(a); b = normalize(b);
    var out = emptyState();
    out.updatedAt = maxDate(a.updatedAt, b.updatedAt);
    var newer = (a.updatedAt || '') >= (b.updatedAt || '') ? a : b;
    var older = newer === a ? b : a;

    // Leçons
    keys(a.lessons, b.lessons).forEach(function (m) {
      var la = a.lessons[m] || {}, lb = b.lessons[m] || {};
      out.lessons[m] = {
        chapters: mergeMapDates(la.chapters, lb.chapters),
        last: ((newer.lessons[m] || {}).last) || ((older.lessons[m] || {}).last) || null
      };
    });

    // Laboratoire
    keys(a.lab, b.lab).forEach(function (m) {
      var la = a.lab[m] || {}, lb = b.lab[m] || {};
      out.lab[m] = {
        missions: mergeMapDates(la.missions, lb.missions),
        params: ((newer.lab[m] || {}).params) || ((older.lab[m] || {}).params) || null
      };
    });

    // Exercices
    keys(a.exercises, b.exercises).forEach(function (m) {
      var ea = a.exercises[m] || {}, eb = b.exercises[m] || {};
      var items = {};
      keys(ea.items, eb.items).forEach(function (id) {
        var x = (ea.items || {})[id], y = (eb.items || {})[id];
        if (!x || !y) { items[id] = clone(x || y); return; }
        var latest = (x.lastAt || '') >= (y.lastAt || '') ? x : y;
        items[id] = {
          attempts: Math.max(x.attempts || 0, y.attempts || 0),
          correct: Math.max(x.correct || 0, y.correct || 0),
          lastCorrect: !!latest.lastCorrect,
          lastAt: maxDate(x.lastAt, y.lastAt),
          firstCorrectAt: minDate(x.firstCorrectAt, y.firstCorrectAt)
        };
      });
      var seen = {}, series = [];
      (ea.series || []).concat(eb.series || []).forEach(function (s) {
        var k = s.at + '|' + s.score;
        if (!seen[k]) { seen[k] = 1; series.push(clone(s)); }
      });
      series.sort(function (p, q) { return p.at < q.at ? -1 : 1; });
      out.exercises[m] = {
        items: items,
        series: series.slice(-30),
        current: clone(((newer.exercises[m] || {}).current) || ((older.exercises[m] || {}).current) || null)
      };
    });

    // Journal d'activité
    var seenA = {}, acts = [];
    a.activity.concat(b.activity).forEach(function (e) {
      var k = e.id || (e.at + e.text);
      if (!seenA[k]) { seenA[k] = 1; acts.push(clone(e)); }
    });
    acts.sort(function (p, q) { return p.at > q.at ? -1 : 1; });
    out.activity = acts.slice(0, MAX_ACTIVITY);

    out.prefs = Object.assign({}, older.prefs, newer.prefs);
    return out;
  }

  function keys(x, y) {
    var s = {};
    Object.keys(x || {}).forEach(function (k) { s[k] = 1; });
    Object.keys(y || {}).forEach(function (k) { s[k] = 1; });
    return Object.keys(s);
  }

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function normalize(s) {
    var e = emptyState();
    if (!s || typeof s !== 'object') return e;
    e.updatedAt = typeof s.updatedAt === 'string' ? s.updatedAt : null;
    ['lessons', 'lab', 'exercises', 'prefs'].forEach(function (k) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) e[k] = clone(s[k]);
    });
    e.activity = Array.isArray(s.activity) ? clone(s.activity) : [];
    return e;
  }

  function isEmpty(s) {
    s = normalize(s);
    return !s.activity.length &&
      !Object.keys(s.lessons).some(function (m) { return Object.keys((s.lessons[m] || {}).chapters || {}).length; }) &&
      !Object.keys(s.exercises).some(function (m) { return Object.keys((s.exercises[m] || {}).items || {}).length; }) &&
      !Object.keys(s.lab).some(function (m) { return Object.keys((s.lab[m] || {}).missions || {}).length; });
  }

  /* ------------------------------ Magasin actif ------------------------------ */

  var storageOk = (function () {
    try {
      if (!root.localStorage) return false;
      var k = '__tcl_test__';
      root.localStorage.setItem(k, '1'); root.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  var scope = null;           // null = visiteur ; sinon identifiant du compte
  var state = emptyState();
  var listeners = [];

  function keyFor(s) { return s ? 'tcl.progress.u.' + s : GUEST_KEY; }

  function read(key) {
    if (!storageOk) return emptyState();
    try { return normalize(JSON.parse(root.localStorage.getItem(key) || 'null')); }
    catch (e) { return emptyState(); }
  }

  function write() {
    if (!storageOk) return false;
    try { root.localStorage.setItem(keyFor(scope), JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }

  function emit(reason) {
    listeners.slice().forEach(function (fn) { try { fn(state, reason); } catch (e) { console.error(e); } });
  }

  function load() { state = read(keyFor(scope)); return state; }

  /** Change de « propriétaire » de progression (visiteur ou compte). */
  function setScope(newScope) {
    scope = newScope || null;
    load();
    emit('scope');
  }

  function get() { return state; }

  /** Modifie la progression puis l'enregistre immédiatement (survit à l'actualisation). */
  function update(mutator, reason) {
    mutator(state);
    state.updatedAt = new Date().toISOString();
    write();
    emit(reason || 'update');
    return state;
  }

  /** Remplace entièrement la progression (après synchronisation). */
  function replace(next, reason) {
    state = normalize(next);
    write();
    emit(reason || 'replace');
  }

  function log(type, module, text) {
    update(function (s) {
      s.activity.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        at: new Date().toISOString(), type: type, module: module, text: text
      });
      s.activity = s.activity.slice(0, MAX_ACTIVITY);
    }, 'activity');
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  /* Accès pratiques */
  function ensure(s, section, module, init) {
    if (!s[section][module]) s[section][module] = init();
    return s[section][module];
  }
  function lessonOf(s, m) { return ensure(s, 'lessons', m, function () { return { chapters: {}, last: null }; }); }
  function labOf(s, m) { return ensure(s, 'lab', m, function () { return { missions: {}, params: null }; }); }
  function exercisesOf(s, m) { return ensure(s, 'exercises', m, function () { return { items: {}, series: [], current: null }; }); }

  function readGuest() { return read(GUEST_KEY); }
  function clearGuest() { if (storageOk) try { root.localStorage.removeItem(GUEST_KEY); } catch (e) { /* ignore */ } }
  function clearScope(s) { if (storageOk) try { root.localStorage.removeItem(keyFor(s)); } catch (e) { /* ignore */ } }

  /** Efface la progression du propriétaire actuel (bouton « Réinitialiser »). */
  function resetAll() {
    state = emptyState();
    write();
    emit('reset');
  }

  if (typeof window !== 'undefined') load();

  return {
    emptyState: emptyState, normalize: normalize, merge: merge, isEmpty: isEmpty,
    get: get, update: update, replace: replace, log: log, subscribe: subscribe,
    setScope: setScope, getScope: function () { return scope; },
    lessonOf: lessonOf, labOf: labOf, exercisesOf: exercisesOf,
    readGuest: readGuest, clearGuest: clearGuest, clearScope: clearScope, resetAll: resetAll,
    isPersistent: function () { return storageOk; }
  };
});
