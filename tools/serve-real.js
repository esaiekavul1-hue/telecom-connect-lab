#!/usr/bin/env node
/*
 * Sert le site en local avec le vrai config.js (clé publique), pour tester de vrais e-mails
 * sans publier sur Netlify. Se connecte au VRAI projet Supabase : les comptes créés sont réels.
 * L'assistant passe par la passerelle de ce serveur (GEMINI_API_KEY reste côté serveur),
 * puisque la fonction ai-tutor n'est pas déployée.
 */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), url = require('url');
var strip = require('node:module').stripTypeScriptTypes;
var ROOT = path.join(__dirname, '..'), PORT = Number(process.env.PORT) || 8090, DAILY = 20;
var TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
var PUBLIC = /^\/(index\.html|style\.css|style-v2\.css|script\.js|version\.js|(auth|core|modules|pages|assets)\/)/;

var cfgText = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
function read(k) { var m = new RegExp(k + "\\s*:\\s*'([^']*)'").exec(cfgText); return m ? m[1] : ''; }
var SUPA = process.env.TCL_AUTH_URL || read('supabaseUrl'), ANON = process.env.TCL_AUTH_KEY || read('supabaseAnonKey');
var clientConfig = 'window.TCL_CONFIG = ' + JSON.stringify({ supabaseUrl: SUPA, supabaseAnonKey: ANON, siteUrl: read('siteUrl') }) + ';\nwindow.TCL_CONFIG.aiGateway = location.origin;\n';

async function load(name) {
  var tmp = path.join(os.tmpdir(), 'tcl-real-' + name + '-' + process.pid + '.mjs');
  fs.writeFileSync(tmp, strip(fs.readFileSync(path.join(ROOT, 'supabase/functions/ai-tutor', name + '.ts'), 'utf8')));
  var m = await import(url.pathToFileURL(tmp).href);
  fs.unlinkSync(tmp);
  return m;
}

function authHeaders(token) { return { apikey: ANON, Authorization: 'Bearer ' + token }; }

/** Évaluation en cours, lue avec le jeton de l'étudiant. Tables V2 absentes : aucune évaluation possible. */
async function reserve(userId, token, used) {
  var res = await fetch(SUPA + '/rest/v1/attempts?select=deadline_at&status=eq.in_progress', { headers: authHeaders(token) });
  if (res.ok) {
    var open = (await res.json()).some(function (a) { return !a.deadline_at || new Date(a.deadline_at).getTime() + 30000 > Date.now(); });
    if (open) return { allowed: false, reason: 'exam_active' };
  } else if (res.status !== 404) return { allowed: false, reason: 'disabled' };
  var key = userId + ':' + new Date().toISOString().slice(0, 10), n = used.get(key) || 0;
  if (n >= DAILY) return { allowed: false, reason: 'daily_limit', limit: DAILY };
  used.set(key, n + 1);
  return { allowed: true, used: n + 1, limit: DAILY };
}

(async function () {
  var handler = await load('handler'), gemini = await load('gemini'), provider = null, used = new Map();
  if (process.env.GEMINI_API_KEY) provider = gemini.geminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: process.env.AI_MODEL || undefined, fallback: process.env.AI_FALLBACK_MODEL || undefined });

  function tutor(req, res, raw) {
    var token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    var request = new Request('http://local/functions/v1/ai-tutor', { method: req.method, headers: { authorization: req.headers.authorization || '', origin: req.headers.origin || '' }, body: req.method === 'POST' ? raw : undefined });
    return handler.handle(request, {
      provider: provider, allowedOrigins: ['*'],
      verifyUser: async function (t) { var r = await fetch(SUPA + '/auth/v1/user', { headers: authHeaders(t) }); return r.ok ? ((await r.json()).id || null) : null; },
      reserve: function (id) { return reserve(id, token, used); },
      record: function () { return Promise.resolve(); },
      release: function (id) { var k = id + ':' + new Date().toISOString().slice(0, 10); used.set(k, Math.max((used.get(k) || 1) - 1, 0)); return Promise.resolve(); }
    }).then(async function (r) { res.writeHead(r.status, { 'Content-Type': 'application/json' }); res.end(await r.text()); });
  }

  http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/functions/v1/ai-tutor') {
      var chunks = [];
      req.on('data', function (c) { chunks.push(c); });
      req.on('end', function () { tutor(req, res, Buffer.concat(chunks).toString('utf8')).catch(function () { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"provider_error"}'); }); });
      return;
    }
    if (p === '/') p = '/index.html';
    if (p === '/config.js') { res.writeHead(200, { 'Content-Type': TYPES['.js'] }); return res.end(clientConfig); }
    var f = path.join(ROOT, p);
    if (!PUBLIC.test(p) || f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(PORT, function () {
    console.log('Site avec le VRAI Supabase : http://localhost:' + PORT + '  (Ctrl+C pour arrêter)');
    console.log(provider ? 'Assistant : Gemini actif, offre gratuite.' : 'Assistant : GEMINI_API_KEY absente de ce terminal, assistant non connecté.');
  });
})().catch(function (e) { console.error(e.message); process.exit(1); });
