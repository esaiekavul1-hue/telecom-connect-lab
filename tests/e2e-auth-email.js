/*
 * Messages d'erreur de l'envoi de codes et outil auth-check, contre le service SIMULÉ.
 * Aucun e-mail réel n'est envoyé. Ce n'est pas une validation de Supabase ni de Brevo.
 * Lancement : node tests/e2e-auth-email.js
 */
'use strict';
var path = require('path'), fs = require('fs'), http = require('http'), cp = require('child_process');
var { chromium } = require('playwright');
var mock = require('./mock-supabase-server.js');
var ROOT = path.join(__dirname, '..'), SITE = 'http://localhost:8776/', API = 'http://localhost:54376';
var pass = 0, fails = 0;
function ok(n, c, d) { if (c) pass++; else fails++; console.log((c ? '  ✔ ' : '  ✘ ') + n + (c || !d ? '' : '  → ' + String(d).slice(0, 300))); }
var T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml' };
function get(p) { return new Promise(function (r) { http.get(API + p, function (s) { var d = ''; s.on('data', function (c) { d += c; }); s.on('end', function () { r(JSON.parse(d || 'null')); }); }); }); }
function check(args) { return new Promise(function (done) { cp.execFile(process.execPath, [path.join(ROOT, 'tools/auth-check.js')].concat(args), { encoding: 'utf8', timeout: 15000, env: Object.assign({}, process.env, { TCL_AUTH_URL: API, TCL_AUTH_KEY: mock.ANON_KEY }) }, function (err, out, e) { done({ code: err ? err.code : 0, out: out + e }); }); }); }

(async function () {
  var site = http.createServer(function (q, s) { var p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; var f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
  var api = mock.createServer();
  await new Promise(function (r) { site.listen(8776, r); }); await new Promise(function (r) { api.listen(54376, r); });
  var browser = await chromium.launch(), ctx = await browser.newContext();
  await ctx.route('**/config.js', function (r) { r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.TCL_CONFIG={supabaseUrl:"' + API + '",supabaseAnonKey:"' + mock.ANON_KEY + '",siteUrl:""};' }); });
  var page = await ctx.newPage();
  var OTP = //auth/v1/otp/;
  async function attempt(mode, status, body, re, name) {
    await page.unroute(OTP).catch(function () {});
    await page.route(OTP, function (r) { r.fulfill({ status: status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(body) }); });
    await page.goto(SITE + '#/' + (mode === 'signup' ? 'inscription' : 'connexion')); await page.reload(); await page.waitForSelector('#f-email');
    if (mode === 'signup') await page.fill('#f-name', 'Test Auth');
    await page.fill('#f-email', 'x@exemple.cd'); await page.click('#email-form button[type=submit]'); await page.waitForTimeout(250);
    var t = await page.textContent('#form-msg');
    ok(name, re.test(t), t);
  }
  console.log('\nMessages d’erreur');
  await attempt('login', 429, { error_code: 'over_email_send_rate_limit', msg: 'For security purposes, you can only request this after 42 seconds.' }, /42 secondes/, 'délai par adresse : attente indiquée');
  await attempt('login', 429, { error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' }, /limite d’envoi/, 'limite globale : message distinct, sans faux délai');
  await attempt('login', 429, { error_code: 'over_request_rate_limit', msg: 'Too many requests' }, /quelques minutes/, 'trop de demandes depuis un réseau');
  await attempt('login', 422, { error_code: 'otp_disabled', msg: 'Signups not allowed for otp' }, /Aucun compte/, 'connexion : adresse inconnue');
  await attempt('signup', 422, { error_code: 'otp_disabled', msg: 'Signups not allowed for otp' }, /inscriptions sont désactivées/, 'inscription refusée : pas de renvoi vers « créer un compte »');
  await attempt('login', 500, { error_code: 'unexpected_failure', msg: 'Error sending magic link email' }, /n’a pas réussi à envoyer/, 'panne SMTP : message clair');
  await attempt('login', 400, { error_code: 'email_address_not_authorized', msg: 'Email address not authorized' }, /SMTP/, 'SMTP personnalisé absent : signalé');

  console.log('\nModèles d’e-mail et secrets');
  ['magic-link', 'confirm-signup'].forEach(function (n) { var t = fs.readFileSync(path.join(ROOT, 'supabase/email-template-' + n + '.html'), 'utf8'); ok(n + ' : code présent, aucun lien à usage unique', /\{\{ \.Token \}\}/.test(t) && !/\.ConfirmationURL \}\}/.test(t.replace(/<!--[\s\S]*?-->/, ''))); });
  var src = cp.execSync('git grep -nIE "xsmtpsib-|xkeysib-|smtp_pass\\s*[:=]" -- ":!tests" ":!tools/auth-check.js" || true', { cwd: ROOT, encoding: 'utf8' });
  ok('aucun identifiant SMTP dans le dépôt', src.trim() === '', src);

  console.log('\nOutil auth-check');
  var r1 = await check(['outil@exemple.cd']);
  ok('demande acceptée', r1.code === 0 && /acceptée/.test(r1.out), r1.out);
  var mail = await get('/__test/outbox?email=outil%40exemple.cd');
  var bad = await check(['outil@exemple.cd', '000000']);
  ok('mauvais code refusé, explication donnée', bad.code === 1 && /otp_expired/.test(bad.out), bad.out);
  var r2 = await check(['outil@exemple.cd', mail.code]);
  ok('bon code accepté, aucun jeton affiché', r2.code === 0 && /session ouverte/.test(r2.out) && !/eyJ|access_token/.test(r2.out), r2.out);
  await browser.close(); site.close(); api.close();
  console.log('\n' + pass + ' contrôles réussis, ' + fails + ' échec(s).');
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
