/*
 * TELECOM CONNECT LAB 2.0 — Accès aux services et données officielles
 * ------------------------------------------------------------------
 * TCL.api      : appels à l'API (fonctions serveur, lecture, passerelle IA).
 * TCL.official : validations, tentatives et réglages venant du serveur.
 *
 * La copie locale de ces données sert uniquement à l'affichage hors ligne ;
 * le serveur reste seul juge lors de toute évaluation.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};

  function ApiError(kind, message, hint, status) { this.kind = kind; this.message = message; this.hint = hint || null; this.status = status || 0; }

  var MESSAGES = {
    network: 'Connexion impossible. Vérifiez votre accès à Internet, puis réessayez.',
    not_deployed: 'Ce service n’est pas encore activé sur le serveur.',
    auth: 'Votre session n’est plus valide. Reconnectez-vous.',
    forbidden: 'Vous n’avez pas les droits nécessaires pour cette action.',
    server: 'Le serveur a rencontré un problème. Réessayez dans quelques instants.'
  };

  function toError(res, data) {
    var code = (data && data.code) || '', msg = (data && data.message) || '', hint = (data && data.hint) || null;
    if (res.status === 404 || code === '42883' || code === '42P01' || code === '42703') return new ApiError('not_deployed', MESSAGES.not_deployed, null, 404);
    if (res.status === 401 || code === 'PGRST301' || code === '28000') return new ApiError('auth', MESSAGES.auth, null, 401);
    if (code === '42501' || res.status === 403) return new ApiError('forbidden', msg && /administration/.test(msg) ? msg : MESSAGES.forbidden, null, 403);
    if (code === 'P0001' || code === 'P0002' || code === '22023' || code === '22001') return new ApiError('rule', msg, hint, res.status);
    return new ApiError('server', MESSAGES.server, null, res.status);
  }

  function call(method, path, body, headers, base) {
    var a = TCL.auth;
    if (!a.isConfigured()) return Promise.reject(new ApiError('not_deployed', 'La connexion n’est pas configurée sur cette installation.'));
    return a.getAccessToken().catch(function (e) {
      if (e && e.code === 'network') throw new ApiError('network', MESSAGES.network);
      if (e && (e.code === 'server' || e.code === 'rate_limit')) throw new ApiError('network', MESSAGES.server);
      throw new ApiError('auth', 'Connectez-vous pour accéder à ce service.');
    }).then(function (token) {
      return fetch((base || a.config.url) + path, { method: method, headers: Object.assign({ apikey: a.config.key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' }, headers || {}), body: body == null ? undefined : JSON.stringify(body) })
        .catch(function () { throw new ApiError('network', MESSAGES.network); })
        .then(function (res) {
          return res.text().then(function (t) {
            var data = null; try { data = t ? JSON.parse(t) : null; } catch (e) { data = null; }
            return { res: res, data: data };
          });
        });
    });
  }

  function restCall(method, path, body) {
    return call(method, '/rest/v1/' + path, body).then(function (r) { if (!r.res.ok) throw toError(r.res, r.data); return r.data; });
  }

  TCL.api = {
    Error: ApiError,
    rpc: function (name, args) { return restCall('POST', 'rpc/' + name, args || {}); },
    select: function (query) { return restCall('GET', query); },
    update: function (query, body) { return restCall('PATCH', query, body); },
    /** Passerelle IA : renvoie { status, data } sans lever d'erreur pour les statuts métier. */
    tutor: function (body) { return call('POST', '/functions/v1/ai-tutor', body, null, (root.TCL_CONFIG || {}).aiGateway); }
  };

  /* ------------------------- Données officielles ------------------------- */

  var EMPTY = { status: 'signed_out', validated: {}, attempts: [], assessments: [], settings: {}, profile: null, history: [] };
  var state = Object.assign({}, EMPTY), listeners = [], userId = null, loading = null;

  function emit() { listeners.slice().forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } }); }
  function cacheKey(id) { return 'tcl.official.u.' + id; }
  function saveCache() { try { root.localStorage.setItem(cacheKey(userId), JSON.stringify({ validated: state.validated, attempts: state.attempts, assessments: state.assessments, settings: state.settings, profile: state.profile, history: state.history })); } catch (e) { /* ignore */ } }
  function readCache(id) { try { return JSON.parse(root.localStorage.getItem(cacheKey(id)) || 'null'); } catch (e) { return null; } }

  /*
   * Choix fait avant l'activation du service : transmis une seule fois au profil, sans redemander.
   * Le premier parcours est Préparatoire ou L1 ; un ancien choix plus élevé démarre en L1
   * (Préparatoire pour le Monde professionnel, qui devient une demande à l'administration).
   */
  var INITIAL = ['preparatoire', 'l1'];
  function pushPendingTrack() {
    var pref = (TCL.store.get().prefs || {}).track;
    if (!state.profile || state.profile.space || !pref) return null;
    var pro = !!pref.pro || pref.space === 'pro';
    var space = INITIAL.indexOf(pref.space) >= 0 ? pref.space : pref.space === 'pro' ? 'preparatoire' : 'l1';
    return TCL.api.rpc('choose_initial_track', { p_space: space, p_specialization: null }).then(function (r) {
      state.profile.space = r.space; state.profile.specialization = r.specialization; saveCache();
      if (!pro) return null;
      return TCL.api.rpc('request_pro', { p_specialization: pref.proSpecialization || pref.specialization || null, p_message: pref.proMessage || null }).then(function (x) { state.profile.pro_status = x.pro_status; saveCache(); });
    }).catch(function () { /* nouvel essai au prochain chargement */ });
  }

  function refresh() {
    if (!userId) return Promise.resolve(state);
    if (loading) return loading;
    var id = userId;
    loading = Promise.all([
      TCL.api.select('competency_validations?select=competency,source,validated_at,attempt_id'),
      TCL.api.select('attempts?select=id,assessment_id,status,started_at,submitted_at,percent,passed,proctor_status,deadline_at&order=started_at.desc&limit=60'),
      TCL.api.select('assessments?select=id,title,description,kind,competency,question_count,pass_percent,duration_seconds,max_attempts,cooldown_minutes,requires_proctor,prerequisites,grants&order=id'),
      TCL.api.select('platform_settings?select=key,value'),
      TCL.api.select('profiles?select=*&id=eq.' + encodeURIComponent(id)),
      TCL.api.select('track_history?select=from_space,from_specialization,to_space,to_specialization,kind,at&order=at.desc&limit=20')
    ]).then(function (r) {
      if (id !== userId) return state;
      var validated = {}; r[0].forEach(function (v) { validated[v.competency] = v; });
      var settings = {}; r[3].forEach(function (s) { settings[s.key] = s.value; });
      Object.assign(state, { status: 'ready', validated: validated, attempts: r[1], assessments: r[2], settings: settings, profile: r[4][0] || null, history: r[5] });
      saveCache();
      return pushPendingTrack();
    }).catch(function (e) {
      if (id !== userId) return;
      state.status = e.kind === 'not_deployed' ? 'not_deployed' : e.kind === 'network' ? 'offline' : 'error';
    }).then(function () { loading = null; emit(); return state; });
    return loading;
  }

  function setUser(u) {
    if (!u) { userId = null; state = Object.assign({}, EMPTY); emit(); return Promise.resolve(state); }
    userId = u.id;
    var c = readCache(u.id);
    state = Object.assign({}, EMPTY, c || {}, { status: 'loading' });
    emit();
    return refresh();
  }

  /** Contenu réellement chargé, par module, pour le moteur de maîtrise. */
  function content() {
    var out = {};
    TCL.registry.modules.forEach(function (m) {
      var p = TCL.registry.liveParts(m);
      if (!p.lesson || !p.lab || !p.exercises) return;
      out[m.id] = { chapters: TCL.lessons[m.id].chapters.map(function (c) { return c.id; }), missions: TCL.labs[m.id].missions.map(function (x) { return x.id; }), exercises: TCL.exercises[m.id].list.map(function (e) { return { id: e.id, skill: e.skill }; }) };
    });
    return out;
  }

  function assessmentById(id) { return state.assessments.filter(function (a) { return a.id === id; })[0] || null; }

  /** Dernière tentative échouée par compétence, pour la remédiation. */
  function failedAttempts() {
    var seen = {}, out = [];
    state.attempts.forEach(function (t) {
      if (t.status === 'in_progress') return;
      var a = assessmentById(t.assessment_id);
      if (!a || !a.competency || seen[a.competency]) return;
      seen[a.competency] = 1;
      if (t.passed === false) out.push({ competency: a.competency, attemptId: t.id, skills: [] });
    });
    return out;
  }

  function overrides() { return state.settings.curriculum_overrides || {}; }

  function ctx() {
    return { state: TCL.store.get(), content: content(), validated: state.validated, curriculum: TCL.curriculum, thresholds: overrides().thresholds, failedAttempts: failedAttempts() };
  }

  TCL.official = {
    get: function () { return state; }, refresh: refresh,
    /** Efface la copie locale à la déconnexion volontaire (téléphone partagé). */
    forget: function () { if (userId) try { root.localStorage.removeItem(cacheKey(userId)); } catch (e) { /* ignore */ } }, setUser: setUser, ctx: ctx, assessmentById: assessmentById, overrides: overrides,
    isAdmin: function () { return !!(state.profile && state.profile.role === 'admin'); },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  };

  /* ------------------- Hors ligne, version, journal d'erreurs ------------------- */

  function compareVersions(a, b) {
    var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0) ? -1 : 1; }
    return 0;
  }
  TCL.official.updateRequired = function () {
    var min = state.settings.min_app_version, cur = root.TCL_BUILD && root.TCL_BUILD.version;
    return !!(min && cur && compareVersions(cur.replace(/-.*/, ''), min) < 0);
  };
  TCL.compareVersions = compareVersions;

  root.addEventListener('online', function () { if (userId && state.status !== 'ready') refresh(); });

  var sent = 0;
  function report(kind, message, context) {
    if (sent >= 5 || !userId || state.status !== 'ready') return;
    sent++;
    TCL.api.rpc('log_client_error', { p_kind: kind, p_message: String(message), p_context: context || {} }).catch(function () { /* jamais bloquant */ });
  }
  TCL.reportError = report;
  root.addEventListener('error', function (e) { report('js', e.message, { src: String(e.filename || '').split('/').pop(), line: e.lineno, version: (root.TCL_BUILD || {}).version }); });

  /* Application web installable : jamais dans l'APK, dont les fichiers sont déjà locaux. */
  if (root.TCL_BUILD && root.TCL_BUILD.sw && !root.Capacitor && 'serviceWorker' in navigator && (root.location.protocol === 'https:' || root.location.hostname === 'localhost')) {
    root.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* facultatif */ }); });
  }
})(window);
