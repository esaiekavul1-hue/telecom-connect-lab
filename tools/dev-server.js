#!/usr/bin/env node
/*
 * TELECOM CONNECT LAB — Mode découverte local (npm run dev)
 * --------------------------------------------------------
 * Lance le site avec un serveur LOCAL complet : PostgreSQL en mémoire avec les
 * vraies migrations, connexion simulée (le code s'affiche dans ce terminal).
 * Rien n'est envoyé à Supabase, à Netlify ni à un fournisseur d'IA. Toutes les
 * données disparaissent à l'arrêt.
 *
 * L'adresse e-mail admin@local.test reçoit le rôle administrateur.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var mock = require('../tests/mock-supabase-server.js');
var localDb = require('./local-db.js');

var ROOT = path.join(__dirname, '..');
var TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

function ident(s) { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error('identifiant invalide'); return s; }

/** Traduit le sous-ensemble de l'API PostgREST utilisé par l'application. */
function restQuery(table, q) {
  var where = [], params = [];
  Object.keys(q).forEach(function (k) {
    if (['select', 'order', 'limit', 'on_conflict'].indexOf(k) >= 0) return;
    var m = /^eq\.(.*)$/.exec(q[k]);
    if (!m) throw new Error('filtre non pris en charge : ' + k);
    params.push(m[1]);
    where.push(ident(k) + '::text = $' + params.length);
  });
  return { where: where.length ? ' where ' + where.join(' and ') : '', params: params };
}

function sitePortOf(o) { return o.sitePort || 8080; }

function statusFor(code) {
  if (code === '42501') return 403;
  if (code === 'P0001' || /^22/.test(code)) return 400;
  if (code === '28000') return 403;
  return 500;
}

async function start(options) {
  options = options || {};
  var db = await localDb.create();
  // La vraie logique de la passerelle, sans ses annotations TypeScript.
  var strip = require('node:module').stripTypeScriptTypes;
  var tmp = path.join(require('os').tmpdir(), 'tcl-ai-handler-' + process.pid + '-' + sitePortOf(options) + '.mjs');
  fs.writeFileSync(tmp, strip(fs.readFileSync(path.join(ROOT, 'supabase/functions/ai-tutor/handler.ts'), 'utf8')));
  var handler = await import(require('url').pathToFileURL(tmp).href);
  fs.unlinkSync(tmp);
  /* Vraie conversation en local si GEMINI_API_KEY est définie (jamais envoyée au navigateur). */
  var realProvider = null;
  if (process.env.GEMINI_API_KEY && !options.provider) {
    var tmpG = path.join(require('os').tmpdir(), 'tcl-ai-gemini-' + process.pid + '.mjs');
    fs.writeFileSync(tmpG, strip(fs.readFileSync(path.join(ROOT, 'supabase/functions/ai-tutor/gemini.ts'), 'utf8')));
    var G = await import(require('url').pathToFileURL(tmpG).href);
    fs.unlinkSync(tmpG);
    realProvider = G.geminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: process.env.AI_MODEL || undefined, fallback: process.env.AI_FALLBACK_MODEL || undefined });
    console.log('  Assistant : Gemini activé (offre gratuite).');
  }
  var known = {};

  async function ensureUser(user) {
    if (known[user.id]) return;
    await db.db.query('insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3) on conflict (id) do nothing', [user.id, user.email, user.user_metadata || {}]);
    if (/^admin@/.test(user.email)) await db.db.query("update public.profiles set role = 'admin' where id = $1", [user.id]);
    known[user.id] = 1;
  }

  async function handle(c) {
    try {
      if (c.user) await ensureUser(c.user);
      if (/^\/functions\/v1\/ai-tutor/.test(c.u.pathname)) return await tutor(c);
      if (!c.user) return c.send(c.res, 401, { code: 'PGRST301', message: 'JWT requis' });
      var m;
      if ((m = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(c.u.pathname)) && c.req.method === 'POST') {
        var exists = await db.db.query("select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1", [m[1]]);
        if (!exists.rows.length) return c.send(c.res, 404, { code: 'PGRST202', message: 'Could not find the function' });
        return c.send(c.res, 200, await db.rpc(c.user.id, m[1], c.body));
      }
      m = /^\/rest\/v1\/([a-z_]+)$/.exec(c.u.pathname);
      if (!m) return c.send(c.res, 404, { code: 'PGRST125', message: 'chemin inconnu' });
      var table = 'public.' + ident(m[1]), q = c.u.query, parts = restQuery(table, q);
      if (c.req.method === 'GET') {
        var cols = q.select === '*' || !q.select ? '*' : q.select.split(',').map(ident).join(',');
        var order = q.order ? ' order by ' + q.order.split(',').map(function (o) { var p = o.split('.'); return ident(p[0]) + (p[1] === 'desc' ? ' desc' : ''); }).join(',') : '';
        var limit = q.limit ? ' limit ' + Number(q.limit) : '';
        var r = await db.as(c.user.id, 'authenticated', function (tx) { return tx.query('select ' + cols + ' from ' + table + parts.where + order + limit, parts.params); });
        return c.send(c.res, 200, r.rows);
      }
      if (c.req.method === 'POST' && m[1] === 'progress') {
        await db.as(c.user.id, 'authenticated', function (tx) { return tx.query('insert into public.progress (user_id, data, updated_at) values ($1, $2, $3) on conflict (user_id) do update set data = excluded.data, updated_at = excluded.updated_at', [c.body.user_id, c.body.data, c.body.updated_at]); });
        return c.send(c.res, 201);
      }
      if (c.req.method === 'PATCH') {
        var keys = Object.keys(c.body), n = parts.params.length;
        var set = keys.map(function (k, i) { return ident(k) + ' = $' + (n + i + 1); }).join(', ');
        await db.as(c.user.id, 'authenticated', function (tx) { return tx.query('update ' + table + ' set ' + set + parts.where, parts.params.concat(keys.map(function (k) { return c.body[k]; }))); });
        return c.send(c.res, 204);
      }
      return c.send(c.res, 405, { message: 'méthode non prise en charge' });
    } catch (e) {
      if (e.code) return c.send(c.res, statusFor(e.code), { code: e.code, message: e.message, hint: e.hint || null });
      console.error(e);
      return c.send(c.res, 500, { message: 'erreur interne du serveur local' });
    }
  }

  async function tutor(c) {
    var reqH = { authorization: c.req.headers.authorization || '', origin: c.req.headers.origin || '' };
    var request = new Request('http://local' + c.u.pathname, c.req.method === 'POST' ? { method: 'POST', headers: reqH, body: c.raw } : { method: c.req.method, headers: reqH });
    var response = await handler.handle(request, {
      provider: options.provider || realProvider, allowedOrigins: ['*'],
      verifyUser: function () { return Promise.resolve(c.user ? c.user.id : null); },
      reserve: function (id) { return db.rpc(null, 'ai_reserve_request', { p_user: id }, 'service_role'); },
      record: function (id, u) { return db.rpc(null, 'ai_record_usage', { p_user: id, p_input: u.inputTokens, p_output: u.outputTokens, p_cost: u.costUsd }, 'service_role'); },
      release: function (id) { return db.rpc(null, 'ai_release_request', { p_user: id }, 'service_role'); }
    });
    var text = await response.text();
    return c.send(c.res, response.status, text ? JSON.parse(text) : null);
  }

  var apiPort = options.apiPort || 54321, sitePort = options.sitePort || 8080, webRoot = options.webRoot || ROOT;
  var api = mock.createServer({ handle: handle });
  var printed = {};
  var config = 'window.TCL_CONFIG = { supabaseUrl: "http://localhost:' + apiPort + '", supabaseAnonKey: "' + mock.ANON_KEY + '", siteUrl: "" };\n';
  var site = http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    if (p === '/config.js') { res.writeHead(200, { 'Content-Type': TYPES['.js'] }); return res.end(config); }
    var file = path.join(webRoot, p);
    if (file.indexOf(webRoot) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });

  await new Promise(function (r) { api.listen(apiPort, r); });
  await new Promise(function (r) { site.listen(sitePort, r); });

  if (options.verbose) {
    setInterval(function () {
      http.get('http://localhost:' + apiPort + '/__test/state', function (res) {
        var d = ''; res.on('data', function (x) { d += x; });
        res.on('end', function () {
          Object.keys(JSON.parse(d).users).forEach(function (email) {
            http.get('http://localhost:' + apiPort + '/__test/outbox?email=' + encodeURIComponent(email), function (r2) {
              var m = ''; r2.on('data', function (x) { m += x; });
              r2.on('end', function () { var mail = JSON.parse(m); if (mail && printed[email] !== mail.code) { printed[email] = mail.code; console.log('  Code de connexion pour ' + email + ' : ' + mail.code); } });
            });
          });
        });
      }).on('error', function () { /* ignore */ });
    }, 800);
  }
  return { db: db, close: function () { site.close(); api.close(); }, site: 'http://localhost:' + sitePort + '/', api: 'http://localhost:' + apiPort };
}

module.exports = { start: start };

if (require.main === module) {
  start({ verbose: true, sitePort: Number(process.env.PORT) || 8080 }).then(function (s) {
    console.log('\nTELECOM CONNECT LAB 2.0 — mode découverte local');
    console.log('  Ouvrez : ' + s.site);
    console.log('  Compte administrateur : admin@local.test (tout autre e-mail crée un compte étudiant)');
    console.log('  Le code de connexion s’affichera ici. Données effacées à l’arrêt (Ctrl+C).\n');
  }).catch(function (e) { console.error(e); process.exit(1); });
}
