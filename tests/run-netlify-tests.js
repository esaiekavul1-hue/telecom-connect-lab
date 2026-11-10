/*
 * TELECOM CONNECT LAB — Tests de la Netlify Function de l'assistant (netlify/functions/ai-tutor.mts).
 * Lancement : node tests/run-netlify-tests.js [module]
 *   module : facultatif, une version assemblée de la fonction (par exemple par esbuild, comme Netlify).
 * Supabase et Google sont simulés par un fetch injecté : aucun appel réseau, aucune clé réelle.
 */
'use strict';
var assert = require('assert');
var path = require('path');
var url = require('url');

var passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✔ ' + name); }
  catch (e) { failed++; console.log('  ✘ ' + name + '\n      ' + e.message); }
}

var GEMINI_KEY = 'AIza-cle-de-test-ne-doit-jamais-sortir';
var SECRET = 'sb_secret_cle-de-test';
var BASE_ENV = { SUPABASE_URL: 'https://projet.supabase.co/', SUPABASE_ANON_KEY: 'sb_publishable_test', SUPABASE_SERVICE_ROLE_KEY: SECRET, GEMINI_API_KEY: GEMINI_KEY, URL: 'https://tcl.netlify.app' };
var SITE = 'https://tcl.netlify.app/functions/v1/ai-tutor';

/** Faux Supabase et faux Google, avec journal des appels. */
function fakeNet(opts) {
  opts = opts || {};
  var calls = [];
  var fn = async function (u, init) {
    init = init || {};
    var h = init.headers || {};
    calls.push({ url: String(u), headers: h, body: init.body });
    if (/\/auth\/v1\/user$/.test(u)) return h.Authorization === 'Bearer jeton-valide' ? Response.json({ id: 'u-1' }) : new Response('{}', { status: 401 });
    var m = /\/rest\/v1\/rpc\/(\w+)$/.exec(u);
    if (m) {
      if (opts.rpcStatus) return new Response('{"message":"interne"}', { status: opts.rpcStatus });
      if (m[1] === 'ai_reserve_request') return Response.json(opts.quota || { allowed: true, used: 3, limit: 20 });
      return new Response(null, { status: 204 });
    }
    if (/generativelanguage\.googleapis\.com/.test(u)) {
      if (opts.gemini === 'slow') return new Promise(function (_, reject) { init.signal.addEventListener('abort', function () { reject(new Error('abort')); }); });
      if (opts.gemini === 429) return new Response('{"error":{"status":"RESOURCE_EXHAUSTED","message":"quota ' + GEMINI_KEY + '"}}', { status: 429 });
      return Response.json({ candidates: [{ content: { parts: [{ text: 'La loi d’Ohm : U = R × I.' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 12 } });
    }
    throw new Error('appel inattendu : ' + u);
  };
  fn.calls = calls;
  return fn;
}

function post(body, headers) {
  return new Request(SITE, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Authorization: 'Bearer jeton-valide', Origin: 'https://tcl.netlify.app' }, headers || {}), body: JSON.stringify(body) });
}
var QUESTION = { messages: [{ role: 'user', content: 'Qu’est-ce que la loi d’Ohm ?' }], mode: 'explain', level: 'l1' };

/** Sources TypeScript → modules ES temporaires (le projet est en CommonJS ; Netlify, lui, assemble avec esbuild). */
function fromSources() {
  var fs = require('fs'), os = require('os'), strip = require('node:module').stripTypeScriptTypes;
  var root = path.join(__dirname, '..'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcl-netlify-'));
  var put = function (name, src) { fs.writeFileSync(path.join(dir, name), strip(fs.readFileSync(path.join(root, src), 'utf8')).replace(/(?:\.\.\/\.\.\/supabase\/functions\/ai-tutor\/|\.\/)(handler|gemini)\.ts/g, './$1.mjs')); };
  put('handler.mjs', 'supabase/functions/ai-tutor/handler.ts');
  put('gemini.mjs', 'supabase/functions/ai-tutor/gemini.ts');
  put('ai-tutor.mjs', 'netlify/functions/ai-tutor.mts');
  return path.join(dir, 'ai-tutor.mjs');
}

(async function () {
  var target = process.argv[2] ? path.resolve(process.argv[2]) : fromSources();
  var F = await import(url.pathToFileURL(target).href);
  console.log('\nNetlify Function de l’assistant (' + path.basename(target) + ')');

  await test('route publiée : /functions/v1/ai-tutor, comme la passerelle Supabase', async function () {
    assert.strictEqual(F.config.path, '/functions/v1/ai-tutor');
    assert.strictEqual(typeof F.default, 'function');
  });
  await test('secrets Supabase absents : « non configuré », aucun appel externe', async function () {
    var net = fakeNet(), r = await F.createTutor({ GEMINI_API_KEY: GEMINI_KEY }, net)(post(QUESTION));
    assert.strictEqual(r.status, 503); assert.strictEqual((await r.json()).error, 'not_configured'); assert.strictEqual(net.calls.length, 0);
  });
  await test('sans jeton ou jeton invalide : refusé, Gemini jamais appelé', async function () {
    var net = fakeNet(), t = F.createTutor(BASE_ENV, net);
    assert.strictEqual((await t(post(QUESTION, { Authorization: '' }))).status, 401);
    assert.strictEqual((await t(post(QUESTION, { Authorization: 'Bearer faux' }))).status, 401);
    assert.ok(!net.calls.some(function (c) { return /googleapis/.test(c.url); }));
  });
  await test('sans GEMINI_API_KEY : « non configuré » pour un étudiant connecté', async function () {
    var env = Object.assign({}, BASE_ENV); delete env.GEMINI_API_KEY;
    var r = await F.createTutor(env, fakeNet())(post(QUESTION));
    assert.strictEqual(r.status, 503); assert.strictEqual((await r.json()).error, 'not_configured');
  });
  await test('modèle payant refusé : l’assistant reste « non configuré »', async function () {
    var r = await F.createTutor(Object.assign({}, BASE_ENV, { AI_MODEL: 'gemini-ultra-pro' }), fakeNet())(post(QUESTION));
    assert.strictEqual(r.status, 503); assert.strictEqual((await r.json()).error, 'not_configured');
  });
  await test('sonde sans coût (message vide) : 400 avant tout quota ou appel Gemini', async function () {
    var net = fakeNet(), r = await F.createTutor(BASE_ENV, net)(post({ messages: [] }));
    assert.strictEqual(r.status, 400);
    assert.ok(!net.calls.some(function (c) { return /rpc|googleapis/.test(c.url); }));
  });
  await test('question : réponse Gemini, quota réservé puis consommation enregistrée', async function () {
    var net = fakeNet(), r = await F.createTutor(BASE_ENV, net)(post(QUESTION));
    var body = await r.json();
    assert.strictEqual(r.status, 200, JSON.stringify(body));
    assert.strictEqual(body.text, 'La loi d’Ohm : U = R × I.'); assert.strictEqual(body.used, 3); assert.strictEqual(body.limit, 20);
    var order = net.calls.map(function (c) { return c.url.replace(/^https:\/\/[^/]+/, ''); });
    assert.deepStrictEqual(order.map(function (u) { return u.split(':')[0]; }), ['/auth/v1/user', '/rest/v1/rpc/ai_reserve_request', '/v1beta/models/gemini-3.6-flash', '/rest/v1/rpc/ai_record_usage']);
    assert.ok(/^https:\/\/projet\.supabase\.co\/auth/.test(net.calls[0].url), 'barre finale de SUPABASE_URL retirée');
  });
  await test('clé Gemini : en en-tête vers Google uniquement, jamais dans l’adresse ni dans la réponse', async function () {
    var net = fakeNet(), r = await F.createTutor(BASE_ENV, net)(post(QUESTION));
    var g = net.calls.filter(function (c) { return /googleapis/.test(c.url); })[0];
    assert.strictEqual(g.headers['x-goog-api-key'], GEMINI_KEY); assert.ok(g.url.indexOf(GEMINI_KEY) < 0);
    assert.ok((await r.text()).indexOf(GEMINI_KEY) < 0);
    assert.ok(!net.calls.some(function (c) { return !/googleapis/.test(c.url) && JSON.stringify(c).indexOf(GEMINI_KEY) >= 0; }), 'clé envoyée à Supabase');
  });
  await test('clé secrète Supabase : en-tête apikey seul (sb_secret_), Authorization pour une ancienne clé JWT', async function () {
    var net = fakeNet(); await F.createTutor(BASE_ENV, net)(post(QUESTION));
    var rpc = net.calls.filter(function (c) { return /rpc/.test(c.url); })[0];
    assert.strictEqual(rpc.headers.apikey, SECRET); assert.strictEqual(rpc.headers.Authorization, undefined);
    var net2 = fakeNet(); await F.createTutor(Object.assign({}, BASE_ENV, { SUPABASE_SERVICE_ROLE_KEY: 'eyJ.ancienne.cle' }), net2)(post(QUESTION));
    var rpc2 = net2.calls.filter(function (c) { return /rpc/.test(c.url); })[0];
    assert.strictEqual(rpc2.headers.Authorization, 'Bearer eyJ.ancienne.cle');
    var auth = net.calls[0];
    assert.strictEqual(auth.headers.apikey, 'sb_publishable_test', 'la session se vérifie avec la clé publique');
  });
  await test('limite quotidienne : 429, Gemini jamais appelé', async function () {
    var net = fakeNet({ quota: { allowed: false, reason: 'daily_limit', limit: 20 } }), r = await F.createTutor(BASE_ENV, net)(post(QUESTION));
    assert.strictEqual(r.status, 429); assert.deepStrictEqual(await r.json(), { error: 'daily_limit', limit: 20 });
    assert.ok(!net.calls.some(function (c) { return /googleapis/.test(c.url); }));
  });
  await test('évaluation en cours : 403', async function () {
    var r = await F.createTutor(BASE_ENV, fakeNet({ quota: { allowed: false, reason: 'exam_active' } }))(post(QUESTION));
    assert.strictEqual(r.status, 403); assert.strictEqual((await r.json()).error, 'exam_active');
  });
  await test('limite gratuite Google : 429 « free_limit », demande rendue, clé absente de la réponse', async function () {
    var net = fakeNet({ gemini: 429 }), r = await F.createTutor(BASE_ENV, net)(post(QUESTION));
    var t = await r.text();
    assert.strictEqual(r.status, 429); assert.strictEqual(JSON.parse(t).error, 'free_limit'); assert.ok(t.indexOf(GEMINI_KEY) < 0);
    assert.strictEqual(net.calls.filter(function (c) { return /googleapis/.test(c.url); }).length, 2, 'modèle de secours essayé');
    assert.ok(net.calls.some(function (c) { return /ai_release_request/.test(c.url); }));
  });
  await test('Gemini trop lent : réponse avant la limite Netlify, demande rendue', async function () {
    var net = fakeNet({ gemini: 'slow' }), t0 = Date.now();
    var alive = setInterval(function () {}, 100); // le délai d'AbortSignal ne retient pas Node à lui seul (un serveur, si)
    var r = await F.createTutor(Object.assign({}, BASE_ENV, { AI_BUDGET_MS: '2000' }), net)(post(QUESTION)).finally(function () { clearInterval(alive); });
    var ms = Date.now() - t0;
    assert.strictEqual(r.status, 503); assert.strictEqual((await r.json()).error, 'provider_busy');
    assert.ok(ms < 3000, ms + ' ms');
    assert.strictEqual(net.calls.filter(function (c) { return /googleapis/.test(c.url); }).length, 1, 'pas de second essai hors budget');
    assert.ok(net.calls.some(function (c) { return /ai_release_request/.test(c.url); }));
    assert.strictEqual(F.BUDGET_MS, 9000);
  });
  await test('base injoignable : 503 sans détail interne', async function () {
    var r = await F.createTutor(BASE_ENV, fakeNet({ rpcStatus: 500 }))(post(QUESTION));
    var t = await r.text();
    assert.strictEqual(r.status, 503); assert.ok(!/interne|rpc|supabase/i.test(t), t);
  });
  await test('CORS : site, application Android et iOS autorisés, autre origine non', async function () {
    var t = F.createTutor(BASE_ENV, fakeNet());
    for (var o of ['https://tcl.netlify.app', 'https://localhost', 'capacitor://localhost']) {
      var r = await t(new Request(SITE, { method: 'OPTIONS', headers: { Origin: o } }));
      assert.strictEqual(r.status, 204); assert.strictEqual(r.headers.get('access-control-allow-origin'), o);
    }
    var bad = await t(post({ messages: [] }, { Origin: 'https://pirate.example' }));
    assert.notStrictEqual(bad.headers.get('access-control-allow-origin'), 'https://pirate.example');
    var extra = await F.createTutor(Object.assign({}, BASE_ENV, { ALLOWED_ORIGINS: 'https://telecom.cd, https://www.telecom.cd' }), fakeNet())(new Request(SITE, { method: 'OPTIONS', headers: { Origin: 'https://www.telecom.cd' } }));
    assert.strictEqual(extra.headers.get('access-control-allow-origin'), 'https://www.telecom.cd');
  });
  await test('seule la méthode POST est acceptée', async function () {
    var r = await F.createTutor(BASE_ENV, fakeNet())(new Request(SITE, { method: 'GET' }));
    assert.strictEqual(r.status, 405);
  });

  console.log('\n' + passed + ' tests réussis, ' + failed + ' échec(s).');
  process.exit(failed ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
