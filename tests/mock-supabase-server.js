/*
 * TELECOM CONNECT LAB — Faux service Supabase POUR LES TESTS UNIQUEMENT
 * ------------------------------------------------------------------
 * Ce petit serveur imite les points d'accès de Supabase utilisés par la
 * plateforme (codes à usage unique, liens magiques, sessions, table progress
 * protégée par utilisateur). Il permet de tester le parcours de connexion
 * sans envoyer de vrais e-mails : les « e-mails » sont conservés en mémoire et
 * consultables via /__test/outbox.
 *
 * ⚠ Il ne doit jamais servir en production : il n'envoie aucun e-mail réel.
 *
 * Lancement : node tests/mock-supabase-server.js [port]   (port par défaut : 54321)
 */
'use strict';
var http = require('http');
var crypto = require('crypto');
var url = require('url');

var ANON_KEY = 'test-anon-key-0123456789abcdefghijklmnopqrstuvwxyz';

function createServer() {
  var users = {};        // email -> user
  var otps = {};         // email -> { code, exp, linkToken, sentAt }
  var sessions = {};     // access_token -> { userId, exp }
  var refresh = {};      // refresh_token -> userId
  var progress = {};     // userId -> row
  var outbox = [];
  var lastSent = {};     // email -> horodatage du dernier envoi (limite : 1 par 60 s)
  var flags = { tableMissing: false };

  function send(res, status, body, headers) {
    var h = Object.assign({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer, accept, x-client-info',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    }, headers || {});
    if (body === undefined || body === null) { res.writeHead(status, h); return res.end(); }
    h['Content-Type'] = 'application/json';
    res.writeHead(status, h);
    res.end(JSON.stringify(body));
  }
  function err(res, status, code, msg) { send(res, status, { code: status, error_code: code, msg: msg }); }
  function uuid() { return crypto.randomUUID(); }
  function token() { return crypto.randomBytes(24).toString('hex'); }

  function issue(user) {
    var at = 'at_' + token(), rt = 'rt_' + token();
    var exp = Math.floor(Date.now() / 1000) + 3600;
    sessions[at] = { userId: user.id, exp: exp };
    refresh[rt] = user.id;
    return { access_token: at, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: rt, user: user };
  }
  function userById(id) { return Object.keys(users).map(function (k) { return users[k]; }).filter(function (u) { return u.id === id; })[0]; }
  function authUser(req) {
    var h = req.headers.authorization || '';
    var t = h.replace(/^Bearer\s+/i, '');
    var s = sessions[t];
    if (!s || s.exp < Date.now() / 1000) return null;
    return userById(s.userId);
  }

  var server = http.createServer(function (req, res) {
    var u = url.parse(req.url, true);
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      var body = {};
      try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}; } catch (e) { body = {}; }
      if (req.method === 'OPTIONS') return send(res, 204);

      // ---- Outils de test ----
      if (u.pathname === '/__test/outbox') {
        var mails = outbox.filter(function (m) { return m.to === u.query.email; });
        return send(res, 200, mails[mails.length - 1] || null);
      }
      if (u.pathname === '/__test/state') return send(res, 200, { users: users, progress: progress, sessions: Object.keys(sessions).length, outbox: outbox.length });
      if (u.pathname === '/__test/flags') { Object.assign(flags, body); return send(res, 200, flags); }
      if (u.pathname === '/__test/reset-rate') { lastSent = {}; return send(res, 200, {}); }

      // ---- Lien magique (ouvert depuis l'e-mail) ----
      if (req.method === 'GET' && u.pathname === '/auth/v1/verify') {
        var redirect = u.query.redirect_to || 'http://localhost:8765/';
        var email = Object.keys(otps).filter(function (k) { return otps[k].linkToken === u.query.token; })[0];
        if (!email || otps[email].exp < Date.now()) {
          res.writeHead(303, { Location: redirect + '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired' });
          return res.end();
        }
        var usr = users[email];
        delete otps[email];
        usr.email_confirmed_at = usr.email_confirmed_at || new Date().toISOString();
        var ss = issue(usr);
        res.writeHead(303, { Location: redirect + '#access_token=' + ss.access_token + '&expires_at=' + ss.expires_at + '&expires_in=3600&refresh_token=' + ss.refresh_token + '&token_type=bearer&type=magiclink' });
        return res.end();
      }

      if (req.headers.apikey !== ANON_KEY) return err(res, 401, 'no_api_key', 'Invalid API key');

      // ---- Auth ----
      if (req.method === 'POST' && u.pathname === '/auth/v1/otp') {
        var em = String(body.email || '').toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(em)) return err(res, 400, 'email_address_invalid', 'Email address "' + em + '" is invalid');
        var prev = lastSent[em];
        if (prev && Date.now() - prev < 60000) {
          return err(res, 429, 'over_email_send_rate_limit', 'For security purposes, you can only request this after ' + Math.ceil((60000 - (Date.now() - prev)) / 1000) + ' seconds.');
        }
        lastSent[em] = Date.now();
        if (!users[em]) {
          if (!body.create_user) return err(res, 422, 'otp_disabled', 'Signups not allowed for otp');
          users[em] = { id: uuid(), email: em, user_metadata: body.data || {}, created_at: new Date().toISOString(), email_confirmed_at: null };
        }
        var code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        var lt = token();
        otps[em] = { code: code, linkToken: lt, exp: Date.now() + 3600000, sentAt: Date.now() };
        outbox.push({ to: em, code: code, link: 'http://localhost:' + server.address().port + '/auth/v1/verify?token=' + lt + '&type=magiclink&redirect_to=' + encodeURIComponent(u.query.redirect_to || 'http://localhost:8765/'), at: Date.now() });
        return send(res, 200, {});
      }
      if (req.method === 'POST' && u.pathname === '/auth/v1/verify') {
        var e2 = String(body.email || '').toLowerCase();
        var o = otps[e2];
        if (body.type !== 'email' || !o || o.code !== String(body.token) || o.exp < Date.now()) return err(res, 403, 'otp_expired', 'Token has expired or is invalid');
        delete otps[e2];
        users[e2].email_confirmed_at = users[e2].email_confirmed_at || new Date().toISOString();
        return send(res, 200, issue(users[e2]));
      }
      if (req.method === 'POST' && u.pathname === '/auth/v1/token' && u.query.grant_type === 'refresh_token') {
        var uid = refresh[body.refresh_token];
        if (!uid) return err(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
        delete refresh[body.refresh_token];
        return send(res, 200, issue(userById(uid)));
      }
      if (u.pathname === '/auth/v1/user') {
        var me = authUser(req);
        if (!me) return err(res, 401, 'bad_jwt', 'invalid JWT: unable to parse or verify signature');
        if (req.method === 'PUT') me.user_metadata = Object.assign({}, me.user_metadata, (body && body.data) || {});
        return send(res, 200, me);
      }
      if (req.method === 'POST' && u.pathname === '/auth/v1/logout') {
        var t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        delete sessions[t];
        return send(res, 204);
      }

      // ---- Table progress (avec règle « chacun sa ligne ») ----
      if (u.pathname === '/rest/v1/progress') {
        if (flags.tableMissing) return send(res, 404, { code: 'PGRST205', message: 'Could not find the table \'public.progress\' in the schema cache' });
        var who = authUser(req);
        if (!who) return send(res, 401, { code: 'PGRST301', message: 'JWT expired' });
        if (req.method === 'GET') {
          var want = String(u.query.user_id || '').replace(/^eq\./, '');
          var row = progress[who.id];
          return send(res, 200, row && want === who.id ? [{ data: row.data, updated_at: row.updated_at }] : []);
        }
        if (req.method === 'POST') {
          if (body.user_id !== who.id) return send(res, 403, { code: '42501', message: 'new row violates row-level security policy for table "progress"' });
          progress[who.id] = { user_id: who.id, data: body.data, updated_at: body.updated_at };
          return send(res, 201);
        }
      }
      return err(res, 404, 'not_found', 'Not found');
    });
  });
  return server;
}

if (require.main === module) {
  var port = Number(process.argv[2]) || 54321;
  createServer().listen(port, function () { console.log('Faux service Supabase (tests) : http://localhost:' + port + '  clé : ' + ANON_KEY); });
}

module.exports = { createServer: createServer, ANON_KEY: ANON_KEY };
