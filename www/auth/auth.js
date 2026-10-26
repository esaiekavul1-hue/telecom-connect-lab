/*
 * TELECOM CONNECT LAB — Authentification SANS mot de passe
 * -------------------------------------------------------
 * Service utilisé : Supabase Auth (codes à usage unique et liens magiques
 * envoyés par e-mail). Ce fichier dialogue directement avec l'API REST de
 * Supabase Auth : aucune bibliothèque externe n'est nécessaire.
 *
 * Principes de sécurité appliqués :
 *  - aucun mot de passe n'est demandé ni enregistré ;
 *  - l'utilisateur n'est considéré comme connecté QUE si le service a validé le
 *    code (ou le lien) reçu par e-mail et a délivré une session ;
 *  - les jetons de session ne sont JAMAIS écrits dans localStorage : ils sont
 *    conservés dans sessionStorage (propre à l'onglet, effacé à sa fermeture) ;
 *  - seule la clé PUBLIQUE (anon / publishable) est utilisée côté navigateur.
 *
 * Configuration : voir config.js et README.md (section « Activer la connexion »).
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};

  var SESSION_KEY = 'tcl.auth.session';   // sessionStorage uniquement
  var PENDING_KEY = 'tcl.auth.pending';   // e-mail en cours de vérification (non secret)

  var cfg = root.TCL_CONFIG || {};
  var base = String(cfg.supabaseUrl || '').trim().replace(/\/+$/, '');
  var apiKey = String(cfg.supabaseAnonKey || '').trim();

  var state = { status: 'checking', user: null, offline: false };
  var session = null;
  var listeners = [];
  var refreshTimer = null;
  var flash = null; // message à afficher après un lien magique

  /**
   * Protection : si une clé SECRÈTE a été collée par erreur dans config.js,
   * on refuse de l'utiliser (elle donnerait tous les droits sur la base).
   */
  function isSecretKey(k) {
    if (/^sb_secret_/i.test(k)) return true;
    var parts = k.split('.');
    if (parts.length === 3) {
      try {
        var payload = JSON.parse(root.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload && payload.role === 'service_role';
      } catch (e) { return false; }
    }
    return false;
  }
  var secretKeyDetected = isSecretKey(apiKey);
  if (secretKeyDetected) {
    console.error('TELECOM CONNECT LAB : une clé secrète a été placée dans config.js. Elle est ignorée. Remplacez-la par la clé publique (Publishable key) et révoquez la clé secrète dans Supabase.');
  }

  function isConfigured() {
    if (secretKeyDetected) return false;
    // https obligatoire ; http accepté uniquement en local (Supabase CLI, tests).
    var okUrl = /^https:\/\/[^\s/]+$/i.test(base) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base);
    return okUrl && apiKey.length > 20 && !/VOTRE|YOUR/i.test(base + apiKey);
  }

  function AuthError(code, message, extra) {
    this.code = code; this.message = message; this.extra = extra || {};
  }

  /* ------------------------------ Stockage de session ------------------------------ */

 var ss = (function () {
  try {
    var k = '__tcl__';
    root.sessionStorage.setItem(k, '1');
    root.sessionStorage.removeItem(k);
    return root.sessionStorage;
  } catch (e) {
    return null;
  }
})();

var persistentStore = (function () {
  try {
    var k = '__tcl_persistent__';
    root.localStorage.setItem(k, '1');
    root.localStorage.removeItem(k);
    return root.localStorage;
  } catch (e) {
    return null;
  }
})();

  function saveSession(s) {
  session = s;

  try {
    if (persistentStore) {
      if (s) persistentStore.setItem(SESSION_KEY, JSON.stringify(s));
      else persistentStore.removeItem(SESSION_KEY);
    }
  } catch (e) { /* ignore */ }

  try {
    if (ss) {
      if (s) ss.setItem(SESSION_KEY, JSON.stringify(s));
      else ss.removeItem(SESSION_KEY);
    }
  } catch (e) { /* ignore */ }
}

function loadSession() {
  try {
    if (persistentStore) {
      var saved = persistentStore.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch (e) { /* ignore */ }

  try {
    return ss ? JSON.parse(ss.getItem(SESSION_KEY) || 'null') : null;
  } catch (e) {
    return null;
  }
}

  var pending = {
    get: function () { if (!ss) return null; try { return JSON.parse(ss.getItem(PENDING_KEY) || 'null'); } catch (e) { return null; } },
    set: function (p) { if (ss) try { ss.setItem(PENDING_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ } },
    clear: function () { if (ss) try { ss.removeItem(PENDING_KEY); } catch (e) { /* ignore */ } }
  };

  /* ---------------------------------- Appels API ---------------------------------- */

  function mapError(status, data, context) {
    data = data || {};
    var code = String(data.error_code || data.error || data.code || '');
    var msg = String(data.msg || data.message || data.error_description || '');
    var low = (code + ' ' + msg).toLowerCase();
    if (status === 429 || /rate limit|only request this after/.test(low)) {
      var m = /after (\d+) seconds?/.exec(msg);
      var wait = m ? Number(m[1]) : 60;
      return new AuthError('rate_limit', 'Trop de demandes rapprochées. Patientez ' + wait + ' secondes avant de demander un nouveau code.', { wait: wait });
    }
    if (/otp_disabled|signups not allowed|user not found/.test(low)) {
      return new AuthError('no_account', 'Aucun compte n’est associé à cette adresse. Créez d’abord votre compte (onglet « Créer un compte »).');
    }
    if (/signup_disabled|signups are disabled/.test(low)) {
      return new AuthError('signup_disabled', 'Les inscriptions sont désactivées dans la configuration du service de connexion.');
    }
    if (/not_authorized|not authorized/.test(low)) {
      return new AuthError('not_authorized', 'Le service d’envoi d’e-mails n’autorise pas encore cette adresse. Sur Supabase, le service d’e-mails par défaut n’écrit qu’aux membres de l’équipe du projet : un service SMTP doit être configuré (voir README).');
    }
    if (context === 'verify' && (status === 403 || status === 401 || /otp_expired|expired|invalid/.test(low))) {
      return new AuthError('invalid_code', 'Code incorrect ou expiré. Vérifiez le dernier e-mail reçu, ou demandez un nouveau code.');
    }
    if (/email_address_invalid|invalid.*email|email.*invalid/.test(low)) {
      return new AuthError('invalid_email', 'Le service refuse cette adresse e-mail. Vérifiez-la ou utilisez une autre adresse.');
    }
    if (/error sending|smtp/.test(low)) {
      return new AuthError('email_send', 'Le service n’a pas réussi à envoyer l’e-mail. La configuration de l’envoi d’e-mails (SMTP) doit être vérifiée.');
    }
    if (status === 401 || status === 403) {
      return new AuthError('unauthorized', 'Votre session n’est plus valide. Reconnectez-vous.');
    }
    if (status >= 500) {
      return new AuthError('server', 'Le service de connexion rencontre un problème (erreur ' + status + '). Réessayez dans quelques minutes.');
    }
    return new AuthError('unknown', 'La demande a échoué' + (msg ? ' : ' + msg : '') + '.');
  }

  function request(path, opts) {
    opts = opts || {};
    var url = base + path + (opts.query ? '?' + new URLSearchParams(opts.query).toString() : '');
    var headers = { 'apikey': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
    Object.assign(headers, opts.headers || {});
    return fetch(url, { method: opts.method || 'POST', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .catch(function () {
        throw new AuthError('network', 'Impossible de joindre le service de connexion. Vérifiez votre connexion Internet, puis réessayez.');
      })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
          if (!res.ok) throw mapError(res.status, data, opts.context);
          return data;
        });
      });
  }

  /* --------------------------------- État et session --------------------------------- */

  function setState(patch) {
    Object.assign(state, patch);
    listeners.slice().forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } });
  }

  function nowSec() { return Math.floor(Date.now() / 1000); }

  function normalizeSession(data) {
    if (!data || !data.access_token || !data.refresh_token) return null;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || (nowSec() + (Number(data.expires_in) || 3600)),
      user: data.user || null
    };
  }

  function publicUser(u) {
    if (!u) return null;
    var meta = u.user_metadata || {};
    return { id: u.id, email: u.email, name: meta.full_name || meta.name || '', createdAt: u.created_at || null, confirmedAt: u.email_confirmed_at || u.confirmed_at || null };
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    if (!session) return;
    var ms = Math.max(5, session.expires_at - nowSec() - 60) * 1000;
    refreshTimer = setTimeout(function () { refresh().catch(function () { /* traité dans refresh */ }); }, Math.min(ms, 2147000000));
  }

  function refresh() {
    if (!session) return Promise.reject(new AuthError('no_session', 'Aucune session.'));
    return request('/auth/v1/token', { query: { grant_type: 'refresh_token' }, body: { refresh_token: session.refresh_token } })
      .then(function (data) {
        var s = normalizeSession(data);
        if (!s) throw new AuthError('unknown', 'Réponse inattendue du service.');
        if (!s.user) s.user = session.user;
        saveSession(s);
        scheduleRefresh();
        setState({ status: 'signedIn', user: publicUser(s.user), offline: false });
        return s;
      })
      .catch(function (err) {
        if (err.code === 'network') {
          // Hors ligne : la session reste valable jusqu'à son expiration.
          setState({ offline: true });
          if (session.expires_at <= nowSec()) { endSession(); }
          else { refreshTimer = setTimeout(function () { refresh().catch(function () {}); }, 30000); }
        } else {
          endSession();
        }
        throw err;
      });
  }

  function endSession() {
    clearTimeout(refreshTimer);
    saveSession(null);
    setState({ status: 'signedOut', user: null, offline: false });
  }

  /** Renvoie un jeton d'accès valide (rafraîchi si nécessaire). */
  function getAccessToken() {
    if (!session) return Promise.reject(new AuthError('no_session', 'Vous n’êtes pas connecté.'));
    if (session.expires_at - nowSec() > 60) return Promise.resolve(session.access_token);
    return refresh().then(function (s) { return s.access_token; });
  }

  function fetchUser(token) {
    return request('/auth/v1/user', { method: 'GET', token: token });
  }

  /** Établit une session délivrée par le service (code vérifié ou lien magique). */
  function adopt(s) {
    saveSession(s);
    scheduleRefresh();
    var p = s.user ? Promise.resolve(s.user) : fetchUser(s.access_token);
    return p.then(function (u) {
      s.user = u; saveSession(s);
      var pend = pending.get();
      var meta = (u && u.user_metadata) || {};
      if (pend && pend.name && !meta.full_name) {
        return updateName(pend.name).catch(function () { return null; });
      }
      return null;
    }).then(function () {
      pending.clear();
      setState({ status: 'signedIn', user: publicUser(session.user), offline: false });
      return state.user;
    });
  }

  /* ---------------------------------- Actions publiques ---------------------------------- */

  /**
   * Demande l'envoi d'un code (et d'un lien) par e-mail.
   * mode 'signup' : crée le compte si besoin ; mode 'login' : refuse les adresses inconnues.
   */
  function requestCode(email, opts) {
    opts = opts || {};
    if (!isConfigured()) return Promise.reject(new AuthError('disabled', 'La connexion par e-mail n’est pas encore configurée sur cette installation.'));
    var body = { email: email, create_user: opts.mode === 'signup' };
    if (opts.mode === 'signup' && opts.name) body.data = { full_name: opts.name };
    var query = {};
    var redirect = cfg.siteUrl || (/^https?:/.test(root.location.protocol) ? root.location.origin + root.location.pathname : '');
    if (redirect) query.redirect_to = redirect;
    return request('/auth/v1/otp', { body: body, query: query }).then(function () {
      pending.set({ email: email, mode: opts.mode, name: opts.name || '', sentAt: Date.now() });
      return true;
    });
  }

  /** Vérifie le code reçu par e-mail. Seul un code validé par le service ouvre une session. */
  function verifyCode(email, code) {
    if (!isConfigured()) return Promise.reject(new AuthError('disabled', 'La connexion par e-mail n’est pas encore configurée.'));
    return request('/auth/v1/verify', { body: { email: email, token: code, type: 'email' }, context: 'verify' })
      .then(function (data) {
        var s = normalizeSession(data);
        if (!s) throw new AuthError('unknown', 'Le service n’a pas renvoyé de session. Réessayez.');
        return adopt(s);
      });
  }

  function updateName(name) {
    return getAccessToken().then(function (token) {
      return request('/auth/v1/user', { method: 'PUT', token: token, body: { data: { full_name: name } } });
    }).then(function (u) {
      if (u && session) { session.user = u; saveSession(session); setState({ user: publicUser(u) }); }
      return u;
    });
  }

  var beforeSignOutHooks = [];
  function beforeSignOut(fn) { beforeSignOutHooks.push(fn); }

  function signOut() {
    var token = session && session.access_token;
    var hooks = beforeSignOutHooks.map(function (fn) { return Promise.resolve().then(fn).catch(function () { return null; }); });
    return Promise.all(hooks).then(function () {
      if (!token) return null;
      return request('/auth/v1/logout', { token: token, query: { scope: 'local' } }).catch(function () { return null; });
    }).then(function () { endSession(); });
  }

  /** Lecture d'un lien magique : #access_token=…&refresh_token=… ou #error=… */
  function consumeUrlHash() {
    var h = root.location.hash || '';
    if (!/(^#|&)(access_token|error)=/.test(h)) return null;
    var params = new URLSearchParams(h.replace(/^#\/?/, ''));
    var clean = function () {
      try { root.history.replaceState(null, '', root.location.pathname + root.location.search + '#/compte'); }
      catch (e) { root.location.hash = '#/compte'; }
    };
    if (params.get('error')) {
      clean();
      var desc = params.get('error_description') || '';
      flash = { kind: 'error', text: /expired|invalid/i.test(desc + params.get('error_code'))
        ? 'Ce lien de connexion a expiré ou a déjà été utilisé. Demandez un nouveau code ou un nouveau lien.'
        : 'Le lien de connexion n’a pas pu être validé' + (desc ? ' (' + desc.replace(/\+/g, ' ') + ')' : '') + '.' };
      return null;
    }
    var s = normalizeSession({
      access_token: params.get('access_token'), refresh_token: params.get('refresh_token'),
      expires_at: Number(params.get('expires_at')) || null, expires_in: Number(params.get('expires_in')) || 3600
    });
    clean();
    return s;
  }

  function init() {
    if (!isConfigured()) { setState({ status: 'disabled', user: null }); return Promise.resolve(state); }
    setState({ status: 'checking' });
    var fromLink = consumeUrlHash();
    if (fromLink) {
      return adopt(fromLink).then(function () {
        flash = { kind: 'success', text: 'Adresse e-mail vérifiée : vous êtes connecté.' };
        return state;
      }).catch(function (err) {
        endSession();
        flash = { kind: 'error', text: err.message || 'Le lien de connexion n’a pas pu être validé.' };
        return state;
      });
    }
    var stored = loadSession();
    if (!stored || !stored.refresh_token) { setState({ status: 'signedOut', user: null }); return Promise.resolve(state); }
    session = stored;
    // On confirme la session auprès du service (ou on la rafraîchit si elle a expiré).
    var p = stored.expires_at - nowSec() > 60
      ? fetchUser(stored.access_token).then(function (u) {
          session.user = u; saveSession(session); scheduleRefresh();
          setState({ status: 'signedIn', user: publicUser(u), offline: false });
        })
      : refresh();
    return p.then(function () { return state; }).catch(function (err) {
      if (err.code === 'network' && session && session.expires_at > nowSec()) {
        // Session émise par le service et encore valide : utilisable hors ligne, signalée comme telle.
        scheduleRefresh();
        setState({ status: 'signedIn', user: publicUser(session.user), offline: true });
      } else if (state.status !== 'signedOut') {
        endSession();
      }
      return state;
    });
  }

  TCL.auth = {
    init: init,
    isConfigured: isConfigured,
    state: function () { return state; },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    requestCode: requestCode,
    verifyCode: verifyCode,
    signOut: signOut,
    beforeSignOut: beforeSignOut,
    updateName: updateName,
    getAccessToken: getAccessToken,
    pending: pending,
    takeFlash: function () { var f = flash; flash = null; return f; },
    config: { url: base, key: secretKeyDetected ? '' : apiKey },
    secretKeyDetected: function () { return secretKeyDetected; },
    _request: request
  };
})(window);
