/*
 * TELECOM CONNECT LAB — Synchronisation de la progression avec le compte
 * ---------------------------------------------------------------------
 * Lorsque l'utilisateur est connecté ET que le stockage distant est configuré
 * (table « progress » de Supabase, voir supabase/schema.sql), la progression
 * est enregistrée en ligne et retrouvée sur tout autre appareil.
 *
 * Chaque envoi suit le principe « lire, fusionner, écrire » : on relit la
 * version distante, on la fusionne avec la version locale (aucune activité
 * n'est perdue), puis on enregistre le résultat.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};

  var status = { state: 'local', message: '', lastSyncedAt: null };
  var listeners = [];
  var user = null;
  var unsub = null;
  var running = null;
  var again = false;

  function set(patch) {
    Object.assign(status, patch);
    listeners.slice().forEach(function (fn) { try { fn(status); } catch (e) { console.error(e); } });
  }

  function restError(res, data) {
    var code = data && (data.code || ''), msg = data && (data.message || data.msg || '');
    if (res.status === 404 || code === 'PGRST205' || code === '42P01') {
      return { kind: 'setup', message: 'La table « progress » est introuvable sur le service distant. Exécutez le fichier supabase/schema.sql (voir README).' };
    }
    if (res.status === 401 || res.status === 403 || code === '42501') {
      return { kind: 'auth', message: 'Le service distant a refusé l’accès à votre progression (droits ou session).' };
    }
    return { kind: 'server', message: 'Erreur du stockage distant (' + res.status + (msg ? ' : ' + msg : '') + ').' };
  }

  function rest(method, path, body, extraHeaders) {
    var a = TCL.auth;
    return a.getAccessToken().then(function (token) {
      var headers = { apikey: a.config.key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' };
      Object.assign(headers, extraHeaders || {});
      return fetch(a.config.url + '/rest/v1/' + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
        .catch(function () { throw { kind: 'network', message: 'Hors ligne : la progression est conservée sur cet appareil et sera synchronisée au retour de la connexion.' }; })
        .then(function (res) {
          return res.text().then(function (t) {
            var data = null; try { data = t ? JSON.parse(t) : null; } catch (e) { data = null; }
            if (!res.ok) throw restError(res, data);
            return data;
          });
        });
    });
  }

  function pull() {
    return rest('GET', 'progress?select=data,updated_at&user_id=eq.' + encodeURIComponent(user.id)).then(function (rows) {
      return rows && rows[0] ? rows[0].data : null;
    });
  }

  function upsert(data) {
    return rest('POST', 'progress?on_conflict=user_id', { user_id: user.id, data: data, updated_at: new Date().toISOString() },
      { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  /** Lire, fusionner, écrire. */
  function syncNow() {
    if (!user) return Promise.resolve(false);
    if (running) { again = true; return running; }
    set({ state: 'syncing', message: '' });
    var store = TCL.store;
    running = pull().then(function (remote) {
      var local = store.get();
      var merged = remote ? store.merge(local, remote) : store.normalize(local);
      if (JSON.stringify(merged) !== JSON.stringify(local)) store.replace(merged, 'sync');
      return upsert(store.get());
    }).then(function () {
      set({ state: 'synced', message: '', lastSyncedAt: new Date().toISOString() });
      return true;
    }).catch(function (err) {
      set({ state: err && err.kind === 'network' ? 'offline' : 'error', message: (err && err.message) || 'Synchronisation impossible.' });
      return false;
    }).then(function (ok) {
      running = null;
      if (again) { again = false; return syncNow(); }
      return ok;
    });
    return running;
  }

  var schedule = TCL.util.debounce(function () { syncNow(); }, 1500);

  /** Démarre la synchronisation pour l'utilisateur connecté. */
  function start(u) {
    user = u;
    var store = TCL.store;
    var guest = store.readGuest();
    store.setScope(u.id);
    if (!store.isEmpty(guest)) {
      // La progression réalisée avant connexion sur cet appareil est ajoutée au compte.
      store.replace(store.merge(store.get(), guest), 'sync');
      store.clearGuest();
      store.log('account', null, 'Progression réalisée sur cet appareil avant la connexion ajoutée au compte');
    }
    if (unsub) unsub();
    unsub = store.subscribe(function (s, reason) {
      if (reason !== 'sync' && reason !== 'scope') schedule();
    });
    return syncNow();
  }

  /** Avant la déconnexion : dernier envoi, puis effacement de la copie locale si tout est en ligne. */
  function beforeSignOut() {
    if (!user) return Promise.resolve();
    var id = user.id;
    return syncNow().then(function (ok) {
      if (unsub) { unsub(); unsub = null; }
      user = null;
      if (ok) TCL.store.clearScope(id);
      TCL.store.setScope(null);
      set({ state: 'local', message: '', lastSyncedAt: null });
    });
  }

  function stop() {
    if (unsub) { unsub(); unsub = null; }
    user = null;
    TCL.store.setScope(null);
    set({ state: 'local', message: '', lastSyncedAt: null });
  }

  root.addEventListener('online', function () { if (user && status.state !== 'synced') syncNow(); });

  TCL.sync = {
    start: start, stop: stop, syncNow: syncNow, beforeSignOut: beforeSignOut,
    status: function () { return status; },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  };
})(window);
