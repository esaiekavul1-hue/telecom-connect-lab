/*
 * TELECOM CONNECT LAB 2.0 — Parcours complet du catalogue dans Chromium.
 * Lancement : node tests/e2e-catalogue.js
 *
 * A. Mode local : chaque leçon, chapitre, laboratoire et défi s'ouvre sans erreur ;
 *    aucun lien interne cassé ; pas de débordement à la largeur d'un téléphone.
 * B. Service d'authentification SIMULÉ (tests/mock-supabase-server.js) : un visiteur
 *    ne télécharge pas le catalogue, un étudiant ne télécharge que son parcours.
 *    Ce n'est pas une validation du vrai service Supabase.
 */
'use strict';
var path = require('path'), fs = require('fs'), http = require('http');
var { chromium } = require('playwright');
var mock = require('./mock-supabase-server.js');
var ROOT = path.join(__dirname, '..');
var SITE_PORT = 8775, API_PORT = 54375, SITE = 'http://localhost:' + SITE_PORT + '/', API = 'http://localhost:' + API_PORT;
var fails = 0, pass = 0;
function ok(name, cond, detail) { if (cond) pass++; else fails++; console.log((cond ? '  ✔ ' : '  ✘ ') + name + (cond || !detail ? '' : '  → ' + String(detail).slice(0, 900))); }

var TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
function site() { return http.createServer(function (q, s) { var p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; var f = path.join(ROOT, p); if (f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end('404'); } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); }); }
function watch(page, bucket) { page.on('pageerror', function (e) { bucket.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error' && !/favicon|404/.test(m.text())) bucket.push(m.text()); }); }
async function local(browser, viewport) { var c = await browser.newContext({ viewport: viewport }); await c.route('**/config.js', function (r) { r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.TCL_CONFIG = { supabaseUrl: "", supabaseAnonKey: "", siteUrl: "" };' }); }); return c; }
async function open(page, hash) { await page.goto(SITE + '#/' + hash); await page.waitForTimeout(90); }
function apiGet(p) { return new Promise(function (res, rej) { http.get(API + p, function (r) { var d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { res(JSON.parse(d || 'null')); }); }).on('error', rej); }); }

async function suiteA(browser) {
  console.log('\nA. Catalogue complet (mode local)');
  var ctx = await local(browser, { width: 1360, height: 900 }), page = await ctx.newPage(), errors = []; watch(page, errors);
  await page.goto(SITE + '#/lecons'); await page.waitForFunction(function () { return window.TCL && TCL.content && TCL.content.ready(); }, null, { timeout: 30000 });
  var mods = await page.evaluate(function () { return TCL.registry.modules.map(function (m) { var p = TCL.registry.liveParts(m); return { id: m.id, ok: p.lesson && p.lab && p.exercises, chapters: p.lesson ? TCL.lessons[m.id].chapters.map(function (c) { return c.id; }) : [], ex: p.exercises ? TCL.exercises[m.id].count : 0, mi: p.lab ? TCL.labs[m.id].missions.length : 0 }; }); });
  ok(mods.length + ' modules chargés, chacun avec leçon, laboratoire et exercices', mods.length === 40 && mods.every(function (m) { return m.ok; }), mods.filter(function (m) { return !m.ok; }).map(function (m) { return m.id; }));
  var dom = await page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('.domain-head'), function (e) { return e.textContent; }); });
  ok('les quatre domaines apparaissent', dom.length === 4, dom.join(','));

  var links = {}, bad = [], figs = 0;
  async function harvest() { (await page.$$eval('main a[href^="#/"]', function (a) { return a.map(function (x) { return x.getAttribute('href'); }); })).forEach(function (h) { links[h.split('?')[0]] = 1; }); }
  for (var m of mods) {
    await open(page, 'lecons/' + m.id); await harvest();
    for (var c of m.chapters) {
      await open(page, 'lecons/' + m.id + '/' + c);
      var i = await page.evaluate(function () { var f = document.querySelectorAll('main figure.figure'), empty = 0; f.forEach(function (x) { if (!x.querySelector('svg')) empty++; }); return { h: (document.querySelector('main h1') || {}).textContent || '', figs: f.length, empty: empty + document.querySelectorAll('main [data-fig]').length, words: (document.querySelector('.lesson__body') || { textContent: '' }).textContent.split(/\s+/).length }; });
      figs += i.figs;
      if (/n’existe pas|pas pu s’afficher/.test(i.h) || i.empty || i.words < 90) bad.push(m.id + '/' + c + JSON.stringify(i));
      await harvest();
    }
  }
  ok('chapitres ouverts avec texte développé et ' + figs + ' figures dessinées', bad.length === 0, bad.join(' | '));

  var labBad = [];
  for (var l of mods) {
    await open(page, 'laboratoire/' + l.id); await page.waitForTimeout(60);
    var n = (await page.$$('.mission')).length, vis = (await page.$$('.lab svg, .sim-widget')).length, h = (await page.textContent('main h1')) || '';
    for (var b of await page.$$('.mission__check')) await b.click();
    var fb = await page.$$eval('.mission .feedback', function (e) { return e.filter(function (x) { return x.textContent.trim().length > 5; }).length; });
    var acts = await page.$$('[data-act]:not([disabled])');
    for (var a = 0; a < Math.min(acts.length, 4); a++) { await page.evaluate(function (el) { el.click(); }, acts[a]).catch(function () {}); }
    var ranges = await page.$$('.lab__controls input[type=range]');
    if (ranges.length) await ranges[0].evaluate(function (r) { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); });
    var reset = await page.$('#lab-reset'); if (reset) await reset.click();
    var dead = await page.evaluate(function () { return Array.prototype.filter.call(document.querySelectorAll('.readout dd'), function (d) { return d.offsetParent !== null && (!d.textContent.trim() || /NaN|undefined/.test(d.textContent)); }).length; });
    if (n !== l.mi || !vis || fb !== n || dead || /Cette page/.test(h)) labBad.push(l.id + ' missions ' + n + '/' + l.mi + ' visuel ' + vis + ' retours ' + fb + ' valeurs vides ' + dead);
    await harvest();
  }
  ok('laboratoires : affichage, missions, commandes et réinitialisation', labBad.length === 0, labBad.join(' | '));

  var exBad = [];
  for (var x of mods) {
    await open(page, 'defis/' + x.id);
    var q = await page.$('.qcard'); var hh = (await page.textContent('main h1')) || '';
    if (!q || !/Défis/.test(hh)) exBad.push(x.id);
    await harvest();
  }
  ok('défis : chaque série s’ouvre', exBad.length === 0, exBad.join(','));

  var dead = [];
  for (var href of Object.keys(links)) {
    await page.goto(SITE + href); await page.waitForTimeout(40);
    var title = (await page.textContent('main h1').catch(function () { return ''; })) || '';
    if (/n’existe pas|pas pu s’afficher/.test(title)) dead.push(href);
  }
  ok(Object.keys(links).length + ' liens internes vérifiés, aucun cassé', dead.length === 0, dead.join(' '));
  ok('aucune erreur JavaScript sur tout le parcours', errors.length === 0, Array.from(new Set(errors)).slice(0, 6).join(' | '));
  await ctx.close();

  console.log('\nB. Téléphone (360 px)');
  var mc = await local(browser, { width: 360, height: 740 }), mp = await mc.newPage(), me = []; watch(mp, me);
  await mp.goto(SITE + '#/lecons'); await mp.waitForFunction(function () { return window.TCL && TCL.content && TCL.content.ready(); }, null, { timeout: 30000 });
  var wide = [];
  for (var w of mods) {
    for (var u of ['lecons/' + w.id + '/c1', 'laboratoire/' + w.id, 'defis/' + w.id]) {
      await open(mp, u);
      var sw = await mp.evaluate(function () { return document.documentElement.scrollWidth - window.innerWidth; });
      if (sw > 1) wide.push(u + ' +' + sw + 'px');
    }
  }
  ok('aucun débordement horizontal à 360 px', wide.length === 0, wide.join(' | '));
  ok('aucune erreur JavaScript sur téléphone', me.length === 0, Array.from(new Set(me)).slice(0, 4).join(' | '));
  await mc.close();
}

async function suiteC(browser) {
  console.log('\nC. Chargement par parcours (service simulé)');
  var ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**/config.js', function (r) { r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.TCL_CONFIG={supabaseUrl:"' + API + '",supabaseAnonKey:"' + mock.ANON_KEY + '",siteUrl:""};' }); });
  var page = await ctx.newPage(), urls = [], errors = []; watch(page, errors);
  page.on('request', function (r) { var m = /\/modules\/([^/]+)\//.exec(r.url()); if (m) urls.push(m[1]); });
  await page.goto(SITE + '#/'); await page.waitForTimeout(700);
  var pub = Array.from(new Set(urls));
  ok('un visiteur ne télécharge que la démonstration', pub.every(function (x) { return x === 'decouverte' || x === 'circuits' || x === 'signaux'; }), pub.join(','));
  ok('l’accueil public présente l’assistant IA, sans l’ouvrir', /Assistant pédagogique/.test(await page.textContent('main')) && /sans compte|compte est nécessaire|nécessite un compte/i.test(await page.textContent('main')));
  ok('l’accueil public présente les quatre domaines', /Internet des objets/.test(await page.textContent('main')) && /Informatique/.test(await page.textContent('main')));
  await page.goto(SITE + '#/assistant'); await page.waitForTimeout(300);
  ok('l’assistant est réservé aux comptes', !(await page.$('#ai-form')));

  urls.length = 0;
  await page.goto(SITE + '#/inscription'); await page.waitForTimeout(400);
  await page.fill('#f-name', 'Test Catalogue'); await page.fill('#f-email', 'cat@exemple.cd'); await page.click('#email-form button[type=submit]'); await page.waitForSelector('#f-code');
  var mail = await apiGet('/__test/outbox?email=cat%40exemple.cd');
  await page.fill('#f-code', mail.code); await page.click('#code-form button[type=submit]');
  await page.waitForSelector('#track-form', { timeout: 8000 });
  ok('avant le choix du parcours, aucun contenu n’est téléchargé', urls.filter(function (x) { return x !== 'decouverte'; }).length === 0, urls.join(','));
  await page.check('input[name=track][value=l1]'); await page.click('#track-ok');
  await page.waitForFunction(function () { return location.hash === '#/mon-espace' && TCL.content.ready(); }, null, { timeout: 15000 });
  var got = Array.from(new Set(urls));
  ok('Licence 1 : son parcours est téléchargé', ['ac', 'diodes', 'fourier', 'iot-capteurs', 'ordinateur'].every(function (x) { return got.indexOf(x) >= 0; }), got.join(','));
  ok('Licence 1 : pas la 5G ni le satellite', got.indexOf('5g') < 0 && got.indexOf('satellite') < 0 && got.indexOf('fibre') < 0, got.join(','));
  await page.goto(SITE + '#/lecons/5g'); await page.waitForTimeout(350);
  ok('module hors parcours : refusé', /Hors de votre parcours/.test(await page.textContent('main')));
  await page.goto(SITE + '#/laboratoire/ac'); await page.waitForTimeout(450);
  ok('laboratoire du parcours : fonctionnel', (await page.$$('.mission')).length >= 3);
  await page.goto(SITE + '#/assistant/ac?chapitre=c2'); await page.waitForTimeout(450);
  ok('assistant : indisponibilité affichée honnêtement, sans réponse simulée', /non connecté/.test(await page.textContent('main')) && await page.$eval('#ai-input', function (e) { return e.disabled; }));
  await page.goto(SITE + '#/lecons/ac/c1'); await page.waitForTimeout(350);
  ok('leçon : lien vers l’assistant avec son contexte', !!(await page.$('a[href^="#/assistant/ac?chapitre=c1"]')));
  await page.goto(SITE + '#/laboratoire/ac'); await page.waitForTimeout(350);
  ok('laboratoire : lien vers l’assistant avec son contexte', !!(await page.$('a[href^="#/assistant/ac?labo=1"]')));
  ok('aucune erreur JavaScript', errors.filter(function (e) { return !/503|Failed to load/.test(e); }).length === 0, errors.slice(0, 4).join(' | '));
  await ctx.close();
}

(async function () {
  var s = site(), api = mock.createServer();
  await new Promise(function (r) { s.listen(SITE_PORT, r); }); await new Promise(function (r) { api.listen(API_PORT, r); });
  var browser = await chromium.launch();
  try { await suiteA(browser); await suiteC(browser); } catch (e) { fails++; console.error(e); }
  await browser.close(); s.close(); api.close();
  console.log('\n' + pass + ' contrôles réussis, ' + fails + ' échec(s).');
  process.exit(fails ? 1 : 0);
})();
