/*
 * TELECOM CONNECT LAB 2.0 — Site « comme publié sur Netlify », dans un vrai navigateur.
 * Sert le dossier www construit, une configuration de production (sans aiGateway) et la
 * Netlify Function de l'assistant sur /functions/v1/ai-tutor, comme Netlify.
 * Supabase est le serveur LOCAL (vraies migrations SQL) ; Google est SIMULÉ : les réponses
 * affichées ici ne viennent pas de Gemini. Aucun appel réseau externe, aucune clé réelle.
 * Lancement : node tests/e2e-netlify.js
 */
'use strict';
var fs = require('fs');
var os = require('os');
var path = require('path');
var http = require('http');
var url = require('url');
var { chromium } = require('playwright');
var dev = require('../tools/dev-server.js');
var mock = require('./mock-supabase-server.js');

var ROOT = path.join(__dirname, '..'), WWW = path.join(ROOT, 'www');
var PORT = 8795, SITE = 'http://localhost:' + PORT;
var GEMINI_KEY = 'AIza-cle-de-test-netlify-0000000000', SERVICE = 'sb_secret_cle-de-test';
var TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

var results = [], errs = [];
function ok(name, cond, detail) { results.push(!!cond); console.log((cond ? '  ✔ ' : '  ✘ ') + name + (cond || detail == null ? '' : '  → ' + String(detail).slice(0, 300))); }
function get(u) { return new Promise(function (r, j) { http.get(u, function (res) { var d = ''; res.on('data', function (x) { d += x; }); res.on('end', function () { r({ status: res.statusCode, type: res.headers['content-type'] || '', body: d }); }); }).on('error', j); }); }
function postRaw(u) { return new Promise(function (r) { var q = http.request(u, { method: 'POST' }, function (res) { res.resume(); res.on('end', r); }); q.end(); }); }

/** Sources TypeScript → modules ES temporaires (Netlify assemble les mêmes fichiers avec esbuild). */
function functionModule() {
  var strip = require('node:module').stripTypeScriptTypes, dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcl-netlify-e2e-'));
  var put = function (name, src) { fs.writeFileSync(path.join(dir, name), strip(fs.readFileSync(path.join(ROOT, src), 'utf8')).replace(/(?:\.\.\/\.\.\/supabase\/functions\/ai-tutor\/|\.\/)(handler|gemini)\.ts/g, './$1.mjs')); };
  put('handler.mjs', 'supabase/functions/ai-tutor/handler.ts');
  put('gemini.mjs', 'supabase/functions/ai-tutor/gemini.ts');
  put('ai-tutor.mjs', 'netlify/functions/ai-tutor.mts');
  return import(url.pathToFileURL(path.join(dir, 'ai-tutor.mjs')).href);
}

(async function () {
  require('child_process').execFileSync(process.execPath, [path.join(ROOT, 'tools/build-www.js')]);
  var S = await dev.start({ sitePort: 8794, apiPort: 54394, webRoot: WWW });
  var F = await functionModule();
  var gemini = [];

  // Réseau du serveur : Google simulé, quotas exécutés par la vraie base locale avec le rôle service_role.
  async function serverFetch(u, init) {
    u = String(u);
    if (/generativelanguage\.googleapis\.com/.test(u)) {
      gemini.push({ url: u, key: init.headers['x-goog-api-key'], body: JSON.parse(init.body) });
      return Response.json({ candidates: [{ content: { parts: [{ text: '[RÉPONSE SIMULÉE DE TEST] U = R × I.' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 8 } });
    }
    var m = /\/rest\/v1\/rpc\/(ai_[a-z_]+)$/.exec(u);
    if (m) {
      if (init.headers.apikey !== SERVICE) return new Response('{}', { status: 401 });
      return new Response(JSON.stringify(await S.db.rpc(null, m[1], JSON.parse(init.body), 'service_role')), { status: 200 });
    }
    return fetch(u, init);
  }
  var tutor = F.createTutor({ SUPABASE_URL: S.api, SUPABASE_ANON_KEY: mock.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE, GEMINI_API_KEY: GEMINI_KEY, URL: SITE }, serverFetch);
  // Configuration de production : aucune adresse de passerelle, comme config.js publié.
  var config = 'window.TCL_CONFIG = ' + JSON.stringify({ supabaseUrl: S.api, supabaseAnonKey: mock.ANON_KEY, siteUrl: SITE + '/' }) + ';\n';

  var site = http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]);
    if (p === F.config.path) {
      var chunks = [];
      req.on('data', function (c) { chunks.push(c); });
      req.on('end', async function () {
        var h = {}; ['authorization', 'origin', 'content-type', 'apikey'].forEach(function (k) { if (req.headers[k]) h[k] = req.headers[k]; });
        var r = await tutor(new Request(SITE + p, { method: req.method, headers: h, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined }));
        var out = {}; r.headers.forEach(function (v, k) { out[k] = v; });
        res.writeHead(r.status, out); res.end(await r.text());
      });
      return;
    }
    if (p === '/') p = '/index.html';
    if (p === '/config.js') { res.writeHead(200, { 'Content-Type': TYPES['.js'] }); return res.end(config); }
    var file = path.join(WWW, p);
    if (file.indexOf(WWW) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(function (r) { site.listen(PORT, r); });

  console.log('\nFichiers publiés');
  var pub = {};
  for (var f of ['/', '/index.html', '/config.js', '/sw.js', '/script.js', '/modules/registry.js', '/content/assessments/bank.js', '/supabase/seed/assessments.generated.sql', '/netlify/functions/ai-tutor.mts', '/tools/build-www.js']) pub[f] = (await get(SITE + f)).status;
  ok('application publiée : accueil, scripts, service worker', pub['/'] === 200 && pub['/index.html'] === 200 && pub['/sw.js'] === 200 && pub['/script.js'] === 200 && pub['/modules/registry.js'] === 200, JSON.stringify(pub));
  ok('jamais publiés : banque de questions, SQL, fonction, outils', ['/content/assessments/bank.js', '/supabase/seed/assessments.generated.sql', '/netlify/functions/ai-tutor.mts', '/tools/build-www.js'].every(function (x) { return pub[x] === 404; }), JSON.stringify(pub));
  var leaks = [];
  (function walk(d) { fs.readdirSync(d).forEach(function (n) { var p = path.join(d, n); if (fs.statSync(p).isDirectory()) return walk(p); if (/\.(js|html|css|json)$/.test(n) && /AIza[0-9A-Za-z_-]{20,}|sb_secret_[0-9A-Za-z_-]{10,}|GEMINI_API_KEY\s*[:=]\s*['"][^'"]/.test(fs.readFileSync(p, 'utf8'))) leaks.push(path.relative(WWW, p)); }); })(WWW);
  ok('aucune clé Gemini ni clé secrète Supabase dans www', leaks.length === 0, leaks.join(' '));
  ok('passerelle : GET refusé (405)', (await get(SITE + F.config.path)).status === 405);
  var h = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
  ok('CSP : site lui-même et site Netlify autorisés pour l’application mobile', /connect-src 'self'[^;]*https:\/\/\*\.netlify\.app/.test(h));

  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }), p = await ctx.newPage();
  var requests = [];
  p.on('request', function (r) { requests.push(r.url()); });
  p.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  p.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(m.text()); });
  var go = async function (hh) { await p.goto(SITE + '/#/' + hh); await p.waitForTimeout(400); };

  console.log('\nRoutes de l’application publiée');
  await go('');
  ok('accueil public', /Créer un compte/.test(await p.textContent('#nav-auth')));
  await postRaw(S.api + '/__test/reset-rate');
  await go('inscription');
  await p.fill('#f-name', 'Netlify'); await p.fill('#f-email', 'netlify@exemple.org');
  await p.click('#email-form button[type=submit]'); await p.waitForSelector('#f-code', { timeout: 8000 });
  var mail = JSON.parse((await get(S.api + '/__test/outbox?email=netlify%40exemple.org')).body);
  await p.fill('#f-code', mail.code); await p.click('#code-form button[type=submit]');
  await p.waitForSelector('#track-form', { timeout: 8000 });
  await p.check('input[name=track][value=l1]'); await p.click('#track-ok');
  await p.waitForFunction(function () { return location.hash === '#/mon-espace' && TCL.content.ready(); }, null, { timeout: 15000 });
  var bad = [];
  for (var r of ['mon-espace', 'lecons', 'lecons/circuits/c1', 'laboratoire', 'laboratoire/circuits', 'defis', 'evaluations', 'evaluations/final-circuits', 'parcours', 'changer-parcours', 'progression', 'assistant', 'compte']) {
    await go(r);
    var main = (await p.textContent('main')) || '';
    if (main.trim().length < 40 || /Page introuvable|introuvable/i.test(await p.textContent('main h1').catch(function () { return ''; }))) bad.push(r);
  }
  ok('liens directs (#/…) ouverts après publication', bad.length === 0, bad.join(' '));
  await p.reload(); await p.waitForTimeout(800);
  ok('actualisation sur un lien direct : même page', /#\/compte$/.test(p.url()));

  console.log('\nAssistant par la Netlify Function (Google simulé)');
  await go('assistant'); await p.waitForSelector('#ai-input');
  await p.waitForTimeout(600);
  ok('sonde : assistant joignable, pas de blocage', !(await p.isVisible('#ai-status .callout--warn, #ai-status .callout--error')) && !/non connecté|injoignable/.test((await p.textContent('main')) || ''), await p.textContent('main'));
  await p.check('#ai-consent');
  requests.length = 0;
  await p.fill('#ai-input', 'Qu’est-ce que la loi d’Ohm ?'); await p.click('#ai-send');
  await p.waitForSelector('.bubble--bot:not(:has(.spinner))', { timeout: 15000 });
  ok('réponse affichée, reçue par la fonction du site', /RÉPONSE SIMULÉE DE TEST/.test(await p.textContent('.bubble--bot')) && requests.some(function (u) { return u === SITE + '/functions/v1/ai-tutor'; }), requests.join(' '));
  ok('le navigateur n’appelle jamais Google ni la fonction Supabase', !requests.some(function (u) { return /googleapis|\/functions\/v1\/ai-tutor/.test(u) && u.indexOf(SITE) !== 0; }));
  ok('Gemini appelé une fois par le serveur, avec la clé en en-tête', gemini.length === 1 && gemini[0].key === GEMINI_KEY && /Licence 1/.test(JSON.stringify(gemini[0].body)));
  var use = (await S.db.db.query("select requests from public.ai_usage_daily d join auth.users u on u.id = d.user_id where u.email = 'netlify@exemple.org'")).rows[0];
  ok('quota décompté dans la base', use && use.requests === 1, JSON.stringify(use));
  await S.db.db.query("update public.platform_settings set value = '1' where key = 'ai_daily_requests'");
  await p.fill('#ai-input', 'Et la puissance ?'); await p.click('#ai-send');
  await p.waitForSelector('.bubble--err', { timeout: 10000 });
  ok('limite quotidienne appliquée, Gemini non rappelé', /Limite quotidienne atteinte/.test(await p.textContent('.bubble--err')) && gemini.length === 1, await p.textContent('.bubble--err'));
  await S.db.db.query("update public.platform_settings set value = '20' where key = 'ai_daily_requests'");

  console.log('\nAdministration publiée');
  var a = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  a.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  await postRaw(S.api + '/__test/reset-rate');
  await a.goto(SITE + '/#/inscription'); await a.waitForTimeout(400);
  await a.fill('#f-name', 'Admin'); await a.fill('#f-email', 'admin@local.test'); await a.click('#email-form button[type=submit]'); await a.waitForSelector('#f-code', { timeout: 8000 });
  await a.fill('#f-code', JSON.parse((await get(S.api + '/__test/outbox?email=admin%40local.test')).body).code); await a.click('#code-form button[type=submit]');
  await a.waitForSelector('#nav-list [data-nav=admin]', { timeout: 8000 });
  await a.click('#nav-list [data-nav=admin]'); await a.waitForSelector('#adm .stat', { timeout: 8000 });
  await a.click('[data-tab=pro]'); await a.waitForTimeout(500);
  ok('menu Administration et onglet Accès professionnels', /Aucune demande|Demande en attente|Ancien compte/.test(await a.textContent('#adm')) && !/callout--error/.test(await a.innerHTML('#adm')));

  ok('aucune erreur JavaScript ni violation CSP', errs.length === 0, errs.join(' | '));
  await browser.close(); site.close(); S.close();
  var n = results.filter(function (x) { return !x; }).length;
  console.log('\n' + (results.length - n) + ' / ' + results.length + ' vérifications réussies.');
  process.exit(n ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
