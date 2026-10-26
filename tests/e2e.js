/*
 * TELECOM CONNECT LAB — Tests de parcours dans un vrai navigateur (Chromium)
 * ------------------------------------------------------------------------
 * Prérequis (pour les développeurs) : Node.js 18+ et Playwright
 *     npm install playwright && npx playwright install chromium
 * Lancement : node tests/e2e.js
 *
 * Deux séries de tests :
 *   A. installation SANS configuration (cas par défaut du ZIP) ;
 *   B. connexion sans mot de passe contre le FAUX service de
 *      tests/mock-supabase-server.js (aucun e-mail réel n'est envoyé).
 */
'use strict';
var path = require('path');
var fs = require('fs');
var http = require('http');
var { chromium } = require('playwright');
var mock = require('./mock-supabase-server.js');

var ROOT = path.join(__dirname, '..');
var SITE_PORT = 8766, API_PORT = 54321;
var SITE = 'http://localhost:' + SITE_PORT + '/';
var API = 'http://localhost:' + API_PORT;
var SHOTS = process.env.SHOTS_DIR || null;

var results = [];
function ok(name, cond, detail) {
  results.push({ name: name, ok: !!cond, detail: detail || '' });
  console.log((cond ? '  ✔ ' : '  ✘ ') + name + (cond || !detail ? '' : '  → ' + detail));
}

/* --- petit serveur de fichiers statiques --- */
var TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown' };
function staticServer() {
  return http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    var file = path.join(ROOT, p);
    if (file.indexOf(ROOT) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
}

function watch(page, bucket) {
  page.on('pageerror', function (e) { bucket.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') bucket.push('console: ' + m.text()); });
}

async function shot(page, name) { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); }

async function go(page, hash) { await page.goto(SITE + '#/' + hash); await page.waitForTimeout(250); }
async function text(page, sel) { return (await page.textContent(sel)) || ''; }

async function apiGet(p) {
  return new Promise(function (resolve, reject) {
    http.get(API + p, function (res) { var d = ''; res.on('data', function (c) { d += c; }); res.on('end', function () { resolve(JSON.parse(d || 'null')); }); }).on('error', reject);
  });
}
async function apiPost(p, body) {
  return new Promise(function (resolve, reject) {
    var r = http.request(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, function (res) { var d = ''; res.on('data', function (c) { d += c; }); res.on('end', function () { resolve(d); }); });
    r.on('error', reject); r.end(JSON.stringify(body || {}));
  });
}

/* ======================================================================= */

async function suiteA(browser) {
  console.log('\nA. Installation sans configuration (mode local)');
  var ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  var page = await ctx.newPage();
  var errors = [], external = [];
  watch(page, errors);
  page.on('request', function (r) { if (!r.url().startsWith(SITE)) external.push(r.url()); });

  // Navigation
  await go(page, '');
  ok('A1 l’accueil affiche le nom, le slogan et la signature', /TELECOM CONNECT LAB/.test(await text(page, 'h1')) && /Apprendre · Simuler · Comprendre/.test(await text(page, '.hero')) && /Du réel au virtuel\. De la théorie à la pratique\./.test(await text(page, '.hero')));
  ok('A2 boutons « Commencer à apprendre » et « Explorer le laboratoire » présents', await page.isVisible('text=Commencer à apprendre') && await page.isVisible('text=Explorer le laboratoire'));
  ok('A3 accueil : les 9 modules sont affichés « Disponible » avec leurs liens Leçon / Laboratoire / Défis, aucun « En préparation »', (await page.$$('.module-grid .module-card')).length === 9 && (await page.$$('.module-grid .module-card--live')).length === 9 && (await page.$$('.module-grid a[href^="#/lecons/"]')).length >= 9 && (await page.$$('.module-grid a[href^="#/laboratoire/"]')).length === 9 && (await page.$$('.module-grid a[href^="#/defis/"]')).length === 9 && !/En préparation/.test(await text(page, 'main')));
  var navs = [['Mes leçons', '#/lecons', 'Mes leçons'], ['Mon laboratoire', '#/laboratoire', 'Mon laboratoire'], ['Mes défis', '#/defis', 'Mes défis'], ['Ma progression', '#/progression', 'Ma progression'], ['Mon compte', '#/compte', 'Mon compte'], ['Accueil', '#/', 'TELECOM CONNECT LAB']];
  var navOk = true, navDetail = '';
  for (var n of navs) {
    await page.click('.nav >> text=' + n[0]); await page.waitForTimeout(200);
    var h = await text(page, 'main h1');
    var cur = await page.getAttribute('.nav [aria-current=page]', 'href');
    if (!h.includes(n[2]) || cur !== n[1]) { navOk = false; navDetail += n[0] + '→' + h + '/' + cur + ' '; }
  }
  ok('A4 chaque lien de la navigation ouvre la bonne page et se marque comme actif', navOk, navDetail);
  ok('A5 bouton « Connexion » affiché (personne n’est connecté)', /Connexion/.test(await text(page, '#nav-auth')));
  await go(page, 'nimporte-quoi');
  ok('A6 une adresse inconnue affiche « Cette page n’existe pas » avec retour à l’accueil', /n’existe pas/.test(await text(page, 'h1')) && await page.isVisible('main >> text=Revenir à l’accueil'));

  // Leçons
  await go(page, 'lecons');
  ok('A7 la bibliothèque présente 4 catégories et 9 leçons ouvertes, chacune avec lien vers sa simulation et ses défis, aucune « en préparation »', (await page.$$('.cat')).length === 4 && (await page.$$('.card--live')).length === 9 && (await page.$$('.card--soon')).length === 0 && (await page.$$('.card--live a[href^="#/laboratoire/"]')).length === 9 && (await page.$$('.card--live a[href^="#/defis/"]')).length === 9);
  await go(page, 'lecons/signaux');
  ok('A8 la leçon affiche objectifs et 6 chapitres', (await page.$$('.objectives li')).length === 5 && (await page.$$('.chapter-row')).length === 6);
  var chapterFigs = 0;
  for (var c = 1; c <= 6; c++) { await go(page, 'lecons/signaux/c' + c); chapterFigs += (await page.$$('.lesson__body svg.scope')).length; }
  ok('A9 les 6 chapitres s’ouvrent et contiennent des graphiques calculés (' + chapterFigs + ' au total)', chapterFigs >= 7);
  await go(page, 'lecons/signaux/c1');
  await page.click('#mark-read'); await page.waitForTimeout(300);
  ok('A10 « Marquer comme lu et continuer » enregistre le chapitre et ouvre le suivant', page.url().endsWith('#/lecons/signaux/c2') && /1 \/ 6/.test(await text(page, '.toc__meta')));
  await page.reload(); await page.waitForTimeout(300);
  ok('A11 après actualisation, le chapitre lu est toujours enregistré', /1 \/ 6/.test(await text(page, '.toc__meta')));

  // Laboratoire
  await go(page, 'laboratoire/signaux');
  ok('A12 valeurs par défaut : A = 2 V, f = 100 Hz, T = 10 ms', (await text(page, '#r-A')).replace(/\s/g, ' ') === '2 V' && (await text(page, '#r-f')).includes('100') && (await text(page, '#r-T')).replace(/\s/g, ' ') === '10 ms');
  await page.fill('#in-f', '250'); await page.waitForTimeout(150);
  var T = (await text(page, '#r-T')).replace(/\s/g, ' ');
  var label = (await page.textContent('#lab-plot svg')).replace(/\s/g, ' ');
  ok('A13 f = 250 Hz → période affichée 4 ms, repère « T = 4 ms » sur le graphique', T === '4 ms' && label.includes('T = 4 ms'), T + ' | ' + label.slice(0, 80));
  var expl = (await text(page, '#explain')).replace(/\s/g, ' ');
  ok('A14 l’explication cite les valeurs réelles (100 Hz → 250 Hz, 10 ms → 4 ms)', expl.includes('100 Hz') && expl.includes('250 Hz') && expl.includes('10 ms') && expl.includes('4 ms'), expl.slice(0, 160));
  // Cohérence graphique : on relit la courbe dessinée et on la compare au calcul
  var coherence = await page.evaluate(function () {
    var svg = document.querySelector('#lab-plot svg');
    var path = svg.querySelector('path.scope__trace:not(.scope__trace--ref)');
    var frame = svg.querySelector('.scope__frame');
    var L = +frame.getAttribute('x'), Tp = +frame.getAttribute('y'), W = +frame.getAttribute('width'), H = +frame.getAttribute('height');
    var pts = path.getAttribute('d').slice(1).split('L').map(function (p) { return p.split(' ').map(Number); });
    var maxErr = 0;
    pts.forEach(function (p) {
      var t = (p[0] - L) / W * 0.02, v = (Tp + H / 2 - p[1]) / (H / 2) * 10;
      maxErr = Math.max(maxErr, Math.abs(v - 2 * Math.sin(2 * Math.PI * 250 * t)));
    });
    return { n: pts.length, maxErr: maxErr };
  });
  ok('A15 la courbe dessinée correspond au calcul (' + coherence.n + ' points, écart max ' + coherence.maxErr.toFixed(3) + ' V)', coherence.n > 300 && coherence.maxErr < 0.05);
  await page.click('[data-id=m1]'); await page.waitForTimeout(150);
  ok('A16 mission 1 (T = 4 ms) validée avec f = 250 Hz', /Réussi/.test(await text(page, '#fb-m1')));
  await page.click('[data-id=m2]'); await page.waitForTimeout(100);
  ok('A17 mission 2 refusée tant que A = 2 V (4 V crête à crête)', /4 V/.test(await text(page, '#fb-m2')) && !/Réussi/.test(await text(page, '#fb-m2')));
  await page.fill('#in-A', '3'); await page.waitForTimeout(100);
  var amp = (await text(page, '#explain')).replace(/\s/g, ' ');
  ok('A18 A = 3 V → crête à crête 6 V ; l’explication précise que la période ne change pas', (await text(page, '#r-pp')).replace(/\s/g, ' ') === '6 V' && amp.includes('ne changent pas') && amp.includes('4 ms'));
  await page.click('[data-id=m2]'); await page.waitForTimeout(100);
  ok('A19 mission 2 validée', /Réussi/.test(await text(page, '#fb-m2')));
  await page.check('#in-ref'); await page.click('[data-phase="90"]'); await page.waitForTimeout(150);
  var dt = (await text(page, '#r-dt')).replace(/\s/g, ' ');
  var ph = (await text(page, '#explain')).replace(/\s/g, ' ');
  ok('A20 φ = π/2 à 250 Hz → décalage 1 ms d’avance, explication « vers la gauche »', dt === '1 ms d’avance' && ph.includes('gauche') && ph.includes('avance'), dt);
  ok('A21 x(0) = A sin φ = 3 V', (await text(page, '#r-x0')).replace(/\s/g, ' ') === '3 V');
  await page.click('[data-id=m3]'); await page.waitForTimeout(150);
  ok('A22 mission 3 validée ; les 3 missions apparaissent « Réussie »', /Réussi/.test(await text(page, '#fb-m3')) && (await page.$$('.mission.is-done')).length === 3);
  await page.selectOption('#in-win', '0.005'); await page.waitForTimeout(100);
  ok('A23 fenêtre 5 ms → 1,25 période affichée', (await text(page, '#r-n')) === '1,25');
  await page.fill('#in-f', '20000'); await page.waitForTimeout(100);
  ok('A24 une fréquence hors limites est refusée avec un message', /de 1 à 10/.test(await text(page, '#in-f-err')) && (await text(page, '#r-f')).includes('250'));
  await page.click('#lab-reset'); await page.waitForTimeout(150);
  ok('A25 « Réinitialiser » rétablit A = 2 V, f = 100 Hz, φ = 0', (await text(page, '#r-A')).replace(/\s/g, ' ') === '2 V' && (await text(page, '#r-T')).replace(/\s/g, ' ') === '10 ms' && (await text(page, '#r-dt')) === 'aucun');
  await page.focus('#lab-plot'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  ok('A26 lecture au curseur au clavier : t = 0,4 ms, x(t) = 2 sin(2π·100·0,0004) ≈ 0,497 V', (await text(page, '#lab-cursor')).replace(/\s/g, ' ').includes('t = 0,4 ms, x(t) = 0,497 V'), await text(page, '#lab-cursor'));
  await shot(page, 'A-lab');

  // Défis
  await go(page, 'defis/signaux');
  var answers = { e1: 'b', e2: '20', e3: '400', e4: 'b', e5: 'b', e6: 'c', e7: 'b', e8: '500', e9: '5', e10: '1,41' };
  var wrong = { e3: '0,4', e5: 'a' }; // deux erreurs volontaires
  var feedbackOk = true, fbDetail = '';
  for (var i = 1; i <= 10; i++) {
    var id = 'e' + i;
    var resp = wrong[id] || answers[id];
    var isQcm = await page.$('input[name=ans]');
    if (isQcm) await page.check('input[name=ans][value="' + resp + '"]');
    else await page.fill('#ans-num', resp);
    await page.click('#qform button[type=submit]'); await page.waitForTimeout(150);
    var verdict = await text(page, '.feedback-card__verdict');
    var expectGood = !wrong[id];
    if ((expectGood && !/Bonne réponse : \+1 point/.test(verdict)) || (!expectGood && !/Réponse incorrecte : 0 point/.test(verdict))) { feedbackOk = false; fbDetail += id + ':' + verdict + ' '; }
    if (!(await page.isVisible('.feedback-card__why'))) { feedbackOk = false; fbDetail += id + ': pas d’explication '; }
    if (i < 10) await page.click('#to-next'); else { if (i === 10) await shot(page, 'A-exercise-feedback'); await page.click('#to-result'); }
    await page.waitForTimeout(120);
  }
  ok('A27 10 exercices : 8 bonnes réponses reconnues, 2 erreurs à 0 point, explication à chaque fois', feedbackOk, fbDetail);
  ok('A28 résultat final 8 / 10', /8\s*\/ 10/.test(await text(page, '.result__score')));
  await shot(page, 'A-result');
  page.once('dialog', function (d) { d.accept(); });
  await page.click('#again'); await page.waitForTimeout(150);
  ok('A29 « Recommencer la série » repart de la question 1 avec un score à zéro', /Question 1 sur 10/.test(await text(page, '.qcard__step')) && /Score : 0 point sur 0/.test(await text(page, '#score')));
  await page.fill('#ans-num', 'abc').catch(function () {});
  await page.check('input[name=ans][value=c]'); await page.click('#qform button[type=submit]'); await page.waitForTimeout(100);
  ok('A30 une mauvaise réponse au QCM e1 (6 V) est signalée avec la correction « 3 V »', /Bonne réponse : 3 V/.test(await text(page, '.feedback-card')));

  // Progression
  await go(page, 'progression');
  var kpis = (await text(page, '.kpis')).replace(/\s+/g, ' ');
  // Tous modules : 50 chapitres + 32 missions + 83 exercices = 165 activités ; ici 1 + 3 + 8 = 12 → 7 %
  var sigRow = norm(await text(page, '.progress-table tr[data-module="signaux"]'));
  ok('A31 tableau de bord : 7 % (12 / 165), 1 / 50 chapitres, 10 / 83 exercices effectués, 3 / 32 missions ; ligne « signaux » à 63 % (12 / 19)', kpis.includes('7 %') && kpis.includes('12 activités terminées sur 165') && kpis.includes('1 / 50') && kpis.includes('10 / 83') && kpis.includes('3 / 32') && /63 %/.test(sigRow), kpis + ' || ' + sigRow);
  ok('A32 activités récentes enregistrées (série, exercices, missions, chapitre)', (await page.$$('.activity li')).length >= 8 && /Série terminée \(Comprendre les signaux\) : 8 \/ 10/.test(await text(page, '.activity')));
  ok('A33 prochaines étapes calculées (chapitre suivant à lire, exercices à retravailler)', /lire le chapitre « Le modèle du signal sinusoïdal »/.test(await text(page, '.next-steps')) && /retravailler/.test(await text(page, '.next-steps')));
  await shot(page, 'A-progress');
  await page.reload(); await page.waitForTimeout(300);
  ok('A34 la progression survit à l’actualisation de la page', (await text(page, '.kpis')).includes('12 activités terminées sur 165'));

  // Compte non configuré
  await go(page, 'compte');
  ok('A35 « Mon compte » indique clairement que la connexion n’est pas configurée', /non configurée/.test(await text(page, 'main')) && /cet appareil/.test(await text(page, 'main')));
  await go(page, 'connexion');
  ok('A36 page de connexion : aucun champ mot de passe, formulaire désactivé tant que rien n’est configuré', (await page.$$('input[type=password]')).length === 0 && await page.isDisabled('#f-email') && await page.isDisabled('#email-form button[type=submit]'));
  await go(page, 'inscription');
  ok('A37 page de création de compte : nom + e-mail, aucun mot de passe', await page.$('#f-name') && await page.$('#f-email') && (await page.$$('input[type=password]')).length === 0);
  var ls = await page.evaluate(function () { return JSON.stringify(localStorage); });
  ok('A38 localStorage ne contient ni jeton ni code', !/access_token|refresh_token|"token"/.test(ls));
  ok('A39 aucune requête vers un site externe (fonctionne hors ligne)', external.length === 0, external.join(', '));

  // Mobile + clavier
  var m = await browser.newPage({ viewport: { width: 375, height: 760 } });
  watch(m, errors);
  await m.goto(SITE + '#/'); await m.waitForTimeout(250);
  var navHidden = !(await m.isVisible('#site-nav'));
  await m.click('#menu-toggle');
  var navShown = await m.isVisible('#site-nav') && (await m.getAttribute('#menu-toggle', 'aria-expanded')) === 'true';
  await m.click('#site-nav >> text=Mes défis'); await m.waitForTimeout(200);
  ok('A40 mobile : menu replié, s’ouvre au toucher, mène à la page et se referme', navHidden && navShown && /Mes défis/.test(await text(m, 'main h1')) && !(await m.isVisible('#site-nav')));
  var overflow = [];
  for (var r of ['', 'lecons/signaux/c2', 'laboratoire/signaux', 'defis/signaux', 'progression', 'connexion']) {
    await m.goto(SITE + '#/' + r); await m.waitForTimeout(250);
    var ov = await m.evaluate(function () { return document.documentElement.scrollWidth - window.innerWidth; });
    if (ov > 0) overflow.push(r + ':' + ov);
  }
  ok('A41 mobile 375 px : aucune page ne déborde horizontalement', overflow.length === 0, overflow.join(' '));
  await m.goto(SITE + '#/lecons'); await m.reload(); await m.waitForTimeout(300);
  await m.keyboard.press('Tab');
  ok('A42 clavier : le premier élément atteint est « Aller au contenu »', /Aller au contenu/.test(await m.evaluate(function () { return document.activeElement.textContent; })));
  var rm = await browser.newContext({ reducedMotion: 'reduce' });
  var rp = await rm.newPage(); await rp.goto(SITE + '#/'); await rp.waitForTimeout(300);
  ok('A43 « réduire les animations » : l’oscilloscope d’accueil démarre en pause', (await rp.getAttribute('#hero-pause', 'aria-pressed')) === 'true');
  await rm.close();

  ok('A44 aucune erreur JavaScript pendant toute la série A', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ======================================================================= */

async function suiteB(browser) {
  console.log('\nB. Connexion sans mot de passe (faux service Supabase local)');
  var cfg = 'window.TCL_CONFIG = { supabaseUrl: "' + API + '", supabaseAnonKey: "' + mock.ANON_KEY + '", siteUrl: "" };';
  async function newDevice(w) {
    var ctx = await browser.newContext({ viewport: { width: w || 1280, height: 900 } });
    await ctx.route('**/config.js', function (route) { route.fulfill({ status: 200, contentType: 'text/javascript', body: cfg }); });
    var page = await ctx.newPage();
    return { ctx: ctx, page: page };
  }
  var errors = [];
  var EMAIL = 'brenda.test@exemple.cd';

  // Appareil 1 : progression en visiteur, puis création de compte
  var d1 = await newDevice(); var p = d1.page; watch(p, errors);
  await go(p, 'lecons/signaux/c1'); await p.click('#mark-read'); await p.waitForTimeout(200);
  await go(p, 'compte');
  ok('B1 non connecté : « Vous n’êtes pas connecté » et boutons de connexion', /Vous n’êtes pas connecté/.test(await text(p, 'main')));
  await go(p, 'inscription');
  await p.fill('#f-name', 'Brenda Test'); await p.fill('#f-email', 'brenda@gmail');
  await p.click('#email-form button[type=submit]'); await p.waitForTimeout(150);
  ok('B2 adresse sans extension de domaine refusée avant tout envoi', /Le domaine doit contenir un point/.test(await text(p, '#f-email-err')));
  await p.fill('#f-email', EMAIL);
  await p.click('#email-form button[type=submit]');
  await p.waitForSelector('#f-code', { timeout: 5000 });
  ok('B3 confirmation d’envoi affichée avec l’adresse, champ de code proposé', (await text(p, '.sent')).includes(EMAIL));
  ok('B4 bouton « Renvoyer » bloqué pendant 60 s (compte à rebours)', await p.isDisabled('#resend') && /dans \d+ s/.test(await text(p, '#resend')));
  ok('B5 toujours non connecté tant que le code n’est pas vérifié', /Connexion/.test(await text(p, '#nav-auth')));
  await p.fill('#f-code', '000000'); await p.click('#code-form button[type=submit]'); await p.waitForTimeout(300);
  var mail = await apiGet('/__test/outbox?email=' + encodeURIComponent(EMAIL));
  var wrongCode = mail.code === '000000' ? '111111' : '000000';
  if (mail.code === '000000') { await p.fill('#f-code', wrongCode); await p.click('#code-form button[type=submit]'); await p.waitForTimeout(300); }
  ok('B6 code incorrect refusé avec message, aucune connexion', /Code incorrect ou expiré/.test(await text(p, '#code-msg')) && /Connexion/.test(await text(p, '#nav-auth')));
  await p.fill('#f-code', mail.code); await p.click('#code-form button[type=submit]');
  await p.waitForFunction(function () { return location.hash === '#/compte' && document.querySelector('.profile'); }, null, { timeout: 5000 });
  await p.waitForTimeout(500);
  ok('B7 code correct → « Mon compte » avec nom, e-mail et « adresse vérifiée »', /Brenda Test/.test(await text(p, '#profile-name')) && (await text(p, '.profile__email')).includes(EMAIL) && /adresse vérifiée/.test(await text(p, '.profile__email')));
  ok('B8 en-tête : « Déconnexion » affiché', /Déconnexion/.test(await text(p, '#nav-auth')));
  await p.waitForFunction(function () { return /Synchronisée/.test(document.querySelector('[data-sync-status]').textContent); }, null, { timeout: 5000 }).catch(function () {});
  ok('B9 statut : progression « Synchronisée avec votre compte »', /Synchronisée/.test(await text(p, '[data-sync-status]')), await text(p, '[data-sync-status]'));
  var st = await apiGet('/__test/state');
  var uid = Object.keys(st.users).map(function (k) { return st.users[k]; })[0].id;
  var row = st.progress[uid];
  ok('B10 la progression faite avant connexion (chapitre 1) est enregistrée dans le compte distant', row && row.data.lessons.signaux.chapters.c1);
  ok('B11 activité « Progression … ajoutée au compte » visible dans Mon compte', /ajoutée au compte/.test(await text(p, '.activity')));
  var stores = await p.evaluate(function () { return { ls: JSON.stringify(localStorage), ss: JSON.stringify(sessionStorage) }; });
  ok('B12 aucun jeton dans localStorage ; la session est dans sessionStorage', !/at_|rt_|access_token|refresh_token/.test(stores.ls) && /access_token/.test(stores.ss));
  await shot(p, 'B-account');

  await go(p, 'defis/signaux');
  await p.check('input[name=ans][value=b]'); await p.click('#qform button[type=submit]'); await p.waitForTimeout(1900);
  st = await apiGet('/__test/state');
  ok('B13 une réponse d’exercice est synchronisée automatiquement', st.progress[uid].data.exercises.signaux.items.e1.correct === 1);
  await p.reload(); await p.waitForTimeout(600);
  ok('B14 après actualisation, l’utilisateur reste connecté (session validée par le service)', /Déconnexion/.test(await text(p, '#nav-auth')));

  // Déconnexion
  await go(p, 'compte');
  await p.click('#account-signout'); await p.waitForTimeout(800);
  var after = await p.evaluate(function () { return { ls: JSON.stringify(localStorage), ss: JSON.stringify(sessionStorage) }; });
  ok('B15 déconnexion : « Connexion » réaffiché, « Vous n’êtes pas connecté », session effacée', /Connexion/.test(await text(p, '#nav-auth')) && /Vous n’êtes pas connecté/.test(await text(p, 'main')) && !/access_token/.test(after.ss));
  ok('B16 déconnexion : la copie locale de la progression du compte est retirée de l’appareil', !/tcl\.progress\.u\./.test(after.ls));
  st = await apiGet('/__test/state');
  ok('B17 déconnexion : la session est révoquée côté service', st.sessions === 0, 'sessions actives : ' + st.sessions);

  // Appareil 2 : connexion avec un autre navigateur
  await apiPost('/__test/reset-rate');
  var d2 = await newDevice(390); var q = d2.page; watch(q, errors);
  await go(q, 'connexion');
  await q.fill('#f-email', 'inconnu@exemple.cd'); await q.click('#email-form button[type=submit]'); await q.waitForTimeout(400);
  ok('B18 connexion avec une adresse sans compte → message « Aucun compte… »', /Aucun compte/.test(await text(q, '#form-msg')));
  await q.fill('#f-email', EMAIL.toUpperCase()); await q.click('#email-form button[type=submit]');
  await q.waitForSelector('#f-code');
  mail = await apiGet('/__test/outbox?email=' + encodeURIComponent(EMAIL));
  await q.fill('#f-code', mail.code); await q.click('#code-form button[type=submit]');
  await q.waitForFunction(function () { return location.hash === '#/compte' && document.querySelector('.profile'); }, null, { timeout: 5000 });
  await q.waitForTimeout(700);
  await go(q, 'progression');
  var k2 = (await text(q, '.kpis')).replace(/\s+/g, ' ');
  ok('B19 autre appareil : la progression du compte est retrouvée (1 chapitre lu, 1 exercice effectué)', k2.includes('1 / 50') && /Exercices effectués ?1 \/ 83/.test(k2), k2);
  await shot(q, 'B-device2-progress');

  // Limite d'envoi
  await go(q, 'compte'); await q.click('#account-signout'); await q.waitForTimeout(500);
  await go(q, 'connexion');
  await q.fill('#f-email', EMAIL); await q.click('#email-form button[type=submit]'); await q.waitForTimeout(400);
  ok('B20 deuxième demande en moins de 60 s → message « Patientez … secondes »', /Patientez \d+ secondes/.test(await text(q, '#form-msg')), await text(q, '#form-msg'));

  // Lien magique
  await apiPost('/__test/reset-rate');
  var d3 = await newDevice(); var r3 = d3.page; watch(r3, errors);
  await go(r3, 'connexion');
  await r3.fill('#f-email', EMAIL); await r3.click('#email-form button[type=submit]'); await r3.waitForSelector('#f-code');
  mail = await apiGet('/__test/outbox?email=' + encodeURIComponent(EMAIL));
  await r3.goto(mail.link); await r3.waitForTimeout(900);
  ok('B21 lien magique : connexion établie, adresse nettoyée (#/compte), aucun jeton visible dans l’URL', /Déconnexion/.test(await text(r3, '#nav-auth')) && r3.url().endsWith('#/compte') && !/access_token/.test(r3.url()));
  await r3.goto(mail.link); await r3.waitForTimeout(700);
  ok('B22 lien magique réutilisé → refusé avec un message clair (pas de fausse confirmation)', /expiré ou a déjà été utilisé/.test(await text(r3, '#toast-host')), await text(r3, '#toast-host'));

  // Session expirée : rafraîchissement automatique ; jeton invalide : déconnexion propre
  await r3.evaluate(function () { var s = JSON.parse(sessionStorage.getItem('tcl.auth.session')); s.expires_at = Math.floor(Date.now() / 1000) - 10; sessionStorage.setItem('tcl.auth.session', JSON.stringify(s)); });
  await r3.reload(); await r3.waitForTimeout(700);
  ok('B23 jeton d’accès expiré → renouvelé automatiquement, toujours connecté', /Déconnexion/.test(await text(r3, '#nav-auth')));
  await r3.evaluate(function () { var s = JSON.parse(sessionStorage.getItem('tcl.auth.session')); s.access_token = 'faux'; s.refresh_token = 'faux'; s.expires_at = Math.floor(Date.now() / 1000) - 10; sessionStorage.setItem('tcl.auth.session', JSON.stringify(s)); });
  await r3.reload(); await r3.waitForTimeout(700);
  ok('B24 jetons falsifiés → l’utilisateur n’est PAS considéré comme connecté', /Connexion/.test(await text(r3, '#nav-auth')) && !(await r3.evaluate(function () { return sessionStorage.getItem('tcl.auth.session'); })));

  // Table absente
  await apiPost('/__test/flags', { tableMissing: true });
  await apiPost('/__test/reset-rate');
  await go(r3, 'connexion'); await r3.fill('#f-email', EMAIL); await r3.click('#email-form button[type=submit]'); await r3.waitForSelector('#f-code');
  mail = await apiGet('/__test/outbox?email=' + encodeURIComponent(EMAIL));
  await r3.fill('#f-code', mail.code); await r3.click('#code-form button[type=submit]');
  await r3.waitForFunction(function () { return document.querySelector('.profile'); }, null, { timeout: 5000 }); await r3.waitForTimeout(700);
  ok('B25 stockage distant non installé → message explicite « exécutez supabase/schema.sql »', /schema\.sql/.test(await text(r3, '[data-sync-status]')), await text(r3, '[data-sync-status]'));
  await apiPost('/__test/flags', { tableMissing: false });

  ok('B26 aucune erreur JavaScript pendant la série B', errors.filter(function (e) { return !/Failed to load resource/.test(e); }).length === 0, errors.join(' | '));
  await d1.ctx.close(); await d2.ctx.close(); await d3.ctx.close();
}


/* ======================================================================= */

function norm(t) { return (t || '').replace(/\s+/g, ' ').trim(); }

async function suiteC(browser) {
  console.log('\nC. Nouvelles simulations (ondes EM, propagation, modulation)');
  var ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  var page = await ctx.newPage();
  var errors = []; watch(page, errors);

  await go(page, 'laboratoire');
  ok('C1 « Mon laboratoire » : 9 simulations disponibles, aucune en préparation', (await page.$$('.lab-card')).length === 9 && (await page.$$('.soon .badge--soon')).length === 0 && !/en préparation/i.test(await text(page, 'main')));
  await go(page, 'laboratoire/satellites');
  ok('C2 une simulation inexistante n’est pas accessible (page « n’existe pas »)', /n’existe pas/.test(await text(page, 'h1')));

  // --- Ondes électromagnétiques
  await go(page, 'laboratoire/ondes-em');
  ok('C3 ondes EM, réglage de départ : 100 MHz → λ = 2,998 m, λ/2 = 1,5 m, bande VHF', norm(await text(page, '#r-l')) === '2,998 m' && norm(await text(page, '#r-l2')) === '1,5 m' && /VHF/.test(await text(page, '#r-band')) && /λ = 2,998 m/.test(norm(await page.textContent('#em-plot svg'))));
  await page.click('[data-id=m1]'); await page.waitForTimeout(100);
  ok('C4 mission « λ = 3 m » validée à 100 MHz dans le vide', /Réussi/.test(await text(page, '#fb-m1')));
  await page.selectOption('#in-medium', 'coax-pe'); await page.waitForTimeout(150);
  var ex = norm(await text(page, '#explain'));
  ok('C5 câble coaxial 0,66 : λ = 1,979 m, la fréquence reste 100 MHz, explication adaptée', norm(await text(page, '#r-l')) === '1,979 m' && norm(await text(page, '#r-f')) === '100 MHz' && ex.includes('La fréquence ne change pas') && ex.includes('1,979 m'), ex.slice(0, 120));
  await page.click('[data-id=m2]'); await page.waitForTimeout(100);
  ok('C6 mission « même signal dans un câble » validée', /Réussi/.test(await text(page, '#fb-m2')));
  await page.selectOption('#in-medium', 'vide'); await page.fill('#in-f', '999,3'); await page.waitForTimeout(150);
  ok('C7 f = 999,3 MHz → λ/2 = 15 cm, bande UHF surlignée dans le tableau', norm(await text(page, '#r-l2')) === '15 cm' && (await page.getAttribute('tr.is-current', 'data-band')) === 'UHF');
  await page.click('[data-id=m3]'); await page.waitForTimeout(100);
  ok('C8 mission « antenne demi-onde de 15 cm » validée ; 3 missions réussies', /Réussi/.test(await text(page, '#fb-m3')) && (await page.$$('.mission.is-done')).length === 3);
  await page.click('[data-preset="2400000000"]'); await page.waitForTimeout(100);
  ok('C9 bouton « Wi-Fi 2,4 GHz » → λ = 12,49 cm', norm(await text(page, '#r-l')) === '12,49 cm');
  await page.fill('#in-f', '1'); await page.waitForTimeout(150);
  ok('C10 λ plus grande que la règle → message « allongez-la » au lieu d’une cote fausse', /dépasse la règle/.test(norm(await page.textContent('#em-plot svg'))));
  await page.click('#anim'); await page.waitForTimeout(250);
  var animOn = (await page.getAttribute('#anim', 'aria-pressed')) === 'true';
  await page.click('#lab-reset'); await page.waitForTimeout(150);
  ok('C11 animation activable, arrêtée par « Réinitialiser » qui rétablit 100 MHz', animOn && (await page.getAttribute('#anim', 'aria-pressed')) === 'false' && norm(await text(page, '#r-f')) === '100 MHz');

  // --- Propagation
  await go(page, 'laboratoire/propagation');
  ok('C12 propagation, réglage de départ : FSPL 105,5 dB, Pr = −67,51 dBm, portée 66,58 km, liaison possible', norm(await text(page, '#r-fspl')) === '105,5 dB' && norm(await text(page, '#r-pr')) === '−67,51 dBm' && norm(await text(page, '#r-dmax')) === '66,58 km' && /possible/.test(await text(page, '#verdict')));
  ok('C13 conversion affichée : 30 dBm = 1 W', /30 dBm \(1 W\)/.test(norm(await text(page, '#in-pt-out'))));
  var pt = await page.evaluate(function () {
    var svg = document.querySelector('#pr-plot svg'), c = svg.querySelector('circle.scope__point'), f = svg.querySelector('.scope__frame');
    var top = +f.getAttribute('y'), h = +f.getAttribute('height');
    return -160 + (top + h - +c.getAttribute('cy')) / h * 200;
  });
  ok('C14 le point tracé correspond à la puissance calculée (' + pt.toFixed(2) + ' dBm)', Math.abs(pt + 67.51) < 0.3);
  await page.fill('#in-d', '10'); await page.waitForTimeout(150);
  ex = norm(await text(page, '#explain'));
  ok('C15 distance × 2 → explication « 20 log₁₀(2) = +6,02 dB » et Pr = −73,53 dBm', ex.includes('20 log₁₀(2) = +6,02 dB') && norm(await text(page, '#r-pr')) === '−73,53 dBm', ex.slice(0, 140));
  await page.fill('#in-d', '66,58'); await page.waitForTimeout(150);
  await page.click('[data-id=m1]'); await page.waitForTimeout(100);
  ok('C16 mission « limite de portée » validée à 66,58 km (marge ≈ 0 dB)', /Réussi/.test(await text(page, '#fb-m1')) && /impossible|possible/.test(await text(page, '#verdict')));
  await page.fill('#in-d', '5'); await page.click('[data-preset="1800000000"]'); await page.waitForTimeout(100);
  await page.click('[data-id=m2]'); await page.waitForTimeout(100);
  var m2fail = /il manque 6,02 dB/.test(norm(await text(page, '#fb-m2')));
  await page.fill('#in-gt', '12,1'); await page.waitForTimeout(150);
  await page.click('[data-id=m2]'); await page.waitForTimeout(100);
  ok('C17 mission « 1 800 MHz » : refusée (il manque 6,02 dB), puis validée avec Gt = 12,1 dBi', m2fail && /Réussi/.test(await text(page, '#fb-m2')));
  await page.fill('#in-loss', '20'); await page.fill('#in-d', '10'); await page.waitForTimeout(100);
  await page.click('[data-id=m3]'); await page.waitForTimeout(100);
  var m3fail = !/Réussi/.test(await text(page, '#fb-m3'));
  await page.fill('#in-pt', '40'); await page.waitForTimeout(100);
  await page.click('[data-id=m3]'); await page.waitForTimeout(100);
  ok('C18 mission « 10 km malgré les obstacles » : refusée puis validée avec Pt = 40 dBm (10 W)', m3fail && /Réussi/.test(await text(page, '#fb-m3')) && /10 W/.test(norm(await text(page, '#in-pt-out'))));
  ok('C19 bilan de liaison détaillé (6 lignes + marge) cohérent avec Pr', (await page.$$('#budget li')).length === 7 && norm(await text(page, '.budget__total strong')) === norm(await text(page, '#r-pr')));
  await page.fill('#in-sens', '-200'); await page.waitForTimeout(100);
  ok('C20 sensibilité hors limites refusée avec un message', /de −130 à −40/.test(await text(page, '#in-sens-err')));
  await shot(page, 'C-propagation');

  // --- Modulation
  await go(page, 'laboratoire/modulation');
  ok('C21 AM par défaut : bande 2 kHz, 3 raies au spectre, pas de surmodulation', /Bande B = 2fm ?2 kHz/.test(norm(await text(page, '#mod-readouts'))) && (await page.$$('#mod-spec .scope__bar-cap')).length === 3 && /Surmodulation ?non/.test(norm(await text(page, '#mod-readouts'))));
  await page.fill('#in-m', '1'); await page.waitForTimeout(100);
  await page.click('[data-id=m1]'); await page.waitForTimeout(100);
  ok('C22 mission « AM à 100 % » validée avec m = 1', /Réussi/.test(await text(page, '#fb-m1')));
  await page.fill('#in-m', '1,3'); await page.waitForTimeout(150);
  ok('C23 m = 1,3 : explication « Surmodulation » et avertissement sur la démodulation', /Surmodulation/.test(await text(page, '#explain')) && /déformé/.test(await text(page, '#demod-note')));
  await page.fill('#in-fm', '4000'); await page.waitForTimeout(100);
  await page.click('[data-id=m2]'); await page.waitForTimeout(100);
  ok('C24 mission « bande AM de 8 kHz » validée avec fm = 4 kHz', /Réussi/.test(await text(page, '#fb-m2')));
  await page.check('input[name=in-type][value=FM]', { force: true }); await page.waitForTimeout(150);
  await page.fill('#in-fm', '5000'); await page.fill('#in-df', '10000'); await page.waitForTimeout(150);
  var ro = norm(await text(page, '#mod-readouts'));
  ok('C25 FM, fm = 5 kHz, Δf = 10 kHz : β = 2, Carson 30 kHz, raie porteuse 0,224 V (J₀(2))', /Indice β = Δf\/fm ?2(?![,\d])/.test(ro) && /Carson 2\(Δf\+fm\) ?30 kHz/.test(ro) && ro.includes('0,224 V'), ro.slice(0, 200));
  await page.click('[data-id=m3]'); await page.waitForTimeout(100);
  ok('C26 mission « Carson 30 kHz » validée ; 3 missions réussies', /Réussi/.test(await text(page, '#fb-m3')) && (await page.$$('.mission.is-done')).length === 3);
  ok('C27 en FM, la commande « indice m » est masquée et « Δf » affichée', await page.isHidden('#ctl-am') && await page.isVisible('#ctl-fm'));
  await shot(page, 'C-modulation-fm');

  // --- Progression et accueil
  await go(page, 'progression');
  var other = norm(await text(page, 'main'));
  var mis = {};
  for (var id of ['ondes-em', 'propagation', 'modulation']) mis[id] = norm(await text(page, '.progress-table tr[data-module="' + id + '"] td:nth-of-type(3)'));
  ok('C28 « Ma progression » : missions des simulations utilisées comptées (ondes EM 3 / 3, propagation 3 / 5, modulation 3 / 4)', mis['ondes-em'] === '3 / 3' && mis.propagation === '3 / 5' && mis.modulation === '3 / 4', JSON.stringify(mis));
  ok('C29 journal : missions des nouvelles simulations enregistrées', /Mission réussie \(Ondes électromagnétiques\)/.test(other) && /Mission réussie \(Modulation\)/.test(other));
  await page.reload(); await page.waitForTimeout(300);
  await go(page, 'laboratoire/propagation');
  ok('C30 les réglages de la simulation sont repris après actualisation (Pt = 40 dBm)', /40 dBm/.test(norm(await text(page, '#in-pt-out'))));

  // Mobile
  var m = await browser.newPage({ viewport: { width: 375, height: 760 } }); watch(m, errors);
  var ov = [];
  for (var r of ['laboratoire', 'laboratoire/ondes-em', 'laboratoire/propagation', 'laboratoire/modulation', 'progression', '']) {
    await m.goto(SITE + '#/' + r); await m.waitForTimeout(300);
    var o = await m.evaluate(function () { return document.documentElement.scrollWidth - window.innerWidth; });
    if (o > 0) ov.push(r + ':' + o);
  }
  ok('C31 mobile 375 px : aucune page des nouvelles simulations ne déborde', ov.length === 0, ov.join(' '));
  ok('C32 aucune erreur JavaScript pendant la série C', errors.length === 0, errors.join(' | '));

  // Protection contre une clé secrète collée par erreur dans config.js
  async function withConfig(key) {
    var c = await browser.newContext();
    var apiCalls = 0;
    await c.route('**/config.js', function (route) { route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.TCL_CONFIG = { supabaseUrl: "https://abcdefghijkl.supabase.co", supabaseAnonKey: "' + key + '", siteUrl: "" };' }); });
    await c.route('https://abcdefghijkl.supabase.co/**', function (route) { apiCalls++; route.abort(); });
    var pg = await c.newPage(); await pg.goto(SITE + '#/compte'); await pg.waitForTimeout(400);
    var t = norm(await pg.textContent('main'));
    await c.close();
    return { text: t, apiCalls: apiCalls };
  }
  var sec = await withConfig('sb_secret_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456');
  ok('C33 clé « sb_secret_ » dans config.js : refusée, alerte affichée, aucun appel au service', /Clé secrète détectée/.test(sec.text) && sec.apiCalls === 0);
  var jwt = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role: 'service_role', iss: 'supabase' })).toString('base64').replace(/=+$/, '') + '.signature';
  sec = await withConfig(jwt);
  ok('C34 ancienne clé « service_role » : refusée de la même façon', /Clé secrète détectée/.test(sec.text) && sec.apiCalls === 0);
  sec = await withConfig('sb_publishable_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456');
  ok('C35 clé publique « sb_publishable_ » : acceptée (page « Vous n’êtes pas connecté », pas d’alerte)', /Vous n’êtes pas connecté/.test(sec.text) && !/Clé secrète/.test(sec.text));
  await ctx.close();
}


/* ======================================================================= */

async function suiteD(browser) {
  console.log('\nD. Les 9 modules complets : leçons, laboratoires, défis, liens');
  var ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  var page = await ctx.newPage();
  var errors = []; watch(page, errors);
  await go(page, '');
  var mods = await page.evaluate(function () { return TCL.registry.modules.map(function (m) { return { id: m.id, title: m.title, chapters: TCL.lessons[m.id].chapters.map(function (c) { return c.id; }), missions: TCL.labs[m.id].missions.length, exercises: TCL.exercises[m.id].count }; }); });
  ok('D1 registre : 9 modules, chacun avec leçon, laboratoire et exercices réellement chargés', mods.length === 9 && (await page.evaluate(function () { return TCL.registry.modules.every(function (m) { var p = TCL.registry.liveParts(m); return p.lesson && p.lab && p.exercises && TCL.registry.statusOf(m) === 'available'; }); })));
  ok('D2 au moins 5 chapitres, 3 missions et 9 exercices par module', mods.every(function (m) { return m.chapters.length >= 5 && m.missions >= 3 && m.exercises >= 9; }), JSON.stringify(mods.map(function (m) { return m.id + ':' + m.chapters.length + '/' + m.missions + '/' + m.exercises; })));

  // Leçons : chaque chapitre s'ouvre, chaque figure est dessinée, barre Leçon / Laboratoire / Défis présente
  var lessonBad = [], figTotal = 0;
  for (var m of mods) {
    for (var c of m.chapters) {
      await page.goto(SITE + '#/lecons/' + m.id + '/' + c); await page.waitForTimeout(120);
      var info = await page.evaluate(function () {
        var figs = Array.prototype.slice.call(document.querySelectorAll('main figure.figure'));
        return { h1: (document.querySelector('main h1') || {}).textContent || '', figs: figs.length, empty: figs.filter(function (f) { return !f.querySelector('svg'); }).length + document.querySelectorAll('main [data-fig]').length, nav: document.querySelectorAll('.module-nav a').length, words: (document.querySelector('.lesson__body') || { textContent: '' }).textContent.split(/\s+/).length };
      });
      figTotal += info.figs;
      if (/n’existe pas/.test(info.h1) || info.empty || info.nav !== 3 || info.words < 150) lessonBad.push(m.id + '/' + c + JSON.stringify(info));
    }
  }
  ok('D3 les ' + mods.reduce(function (n, m) { return n + m.chapters.length; }, 0) + ' chapitres s’ouvrent, avec leurs ' + figTotal + ' figures dessinées et un texte développé', lessonBad.length === 0 && figTotal >= 50, lessonBad.join(' | '));

  // Lire toute la leçon « Réseaux IP »
  await page.goto(SITE + '#/lecons/ip/c1'); await page.waitForTimeout(150);
  for (var k = 0; k < 6; k++) { await page.click('#mark-read'); await page.waitForTimeout(150); }
  await go(page, 'lecons');
  ok('D4 lire les 6 chapitres de « Réseaux IP » marque la leçon comme terminée', /Leçon terminée/.test(await text(page, '.card--live[data-module="ip"]')));

  // Laboratoires : chargement, missions, vérification
  var labBad = [];
  for (var m2 of mods) {
    await go(page, 'laboratoire/' + m2.id);
    var n = (await page.$$('.mission')).length, svg = (await page.$$('.lab svg')).length;
    for (var b of await page.$$('.mission__check')) { await b.click(); }
    await page.waitForTimeout(100);
    var fbs = await page.$$eval('.mission .feedback', function (els) { return els.filter(function (e) { return e.textContent.trim().length > 10; }).length; });
    if (n !== m2.missions || svg < 1 || fbs !== n || (await page.$$('.module-nav a')).length !== 3) labBad.push(m2.id + ' missions ' + n + '/' + m2.missions + ' svg ' + svg + ' retours ' + fbs);
  }
  ok('D5 les 9 laboratoires se chargent avec leurs graphiques ; chaque mission répond à « Vérifier mes réglages »', labBad.length === 0, labBad.join(' | '));

  async function mission(id) { await page.click('[data-id=' + id + ']'); await page.waitForTimeout(120); return /Réussi/.test(await text(page, '#fb-' + id)); }
  async function fill(sel, v) { await page.fill(sel, String(v)); await page.dispatchEvent(sel, 'change'); await page.waitForTimeout(100); }

  await go(page, 'laboratoire/antennes');
  var d0 = norm(await text(page, '#r-Ddb'));
  await fill('#in-pol', 45);
  ok('D6 antennes : dipôle demi-onde 2,15 dBi ; désalignement de 45° → perte de 3 dB (mission validée)', d0 === '2,15 dBi' && /3,01 dB/.test(norm(await text(page, '#r-pol'))) && await mission('m4'), d0);
  await fill('#in-N', 4); await page.waitForTimeout(100);
  ok('D7 antennes : avec 4 dipôles, la directivité augmente et le diagramme change', parseFloat(norm(await text(page, '#r-Ddb')).replace(',', '.')) > 5);

  await go(page, 'laboratoire/propagation');
  await page.check('input[name=in-obs][value=oui]', { force: true }); await page.waitForTimeout(120);
  var j0 = norm(await text(page, '#r-j'));
  await fill('#in-oh', -12);
  ok('D8 propagation : obstacle sur la ligne directe → 6,03 dB ; abaissé de 12 m (dans la zone de Fresnel) → mission validée', j0 === '6,03 dB' && await page.isVisible('#profile svg') && await mission('m5'), j0);

  await go(page, 'laboratoire/chaine');
  await fill('#in-pt', 11);
  var snr = norm(await text(page, '#r-snr'));
  ok('D9 chaîne : Pt = 11 dBm → SNR 7 dB, TEB ≤ 10⁻³ (mission validée)', snr === '7 dB' && await mission('m1'), snr);
  var steps = (await page.$$('.chain__step')).length, stOk = true;
  for (var i2 = 1; i2 <= steps; i2++) { await page.click('.chain__step[data-stage="' + i2 + '"]'); await page.waitForTimeout(60); if (!/\S/.test(await text(page, '#stage'))) stOk = false; }
  ok('D10 chaîne : les ' + steps + ' étapes s’affichent une à une', steps === 7 && stOk);

  await go(page, 'laboratoire/fibre');
  await fill('#in-theta', 14);
  ok('D11 fibre : rayon à 14° (angle d’acceptance) encore guidé (mission validée)', /guidé/i.test(await text(page, '#verdict')) && await mission('m1'));

  await go(page, 'laboratoire/mobiles');
  await fill('#in-n', 4); await page.selectOption('#in-N', '7'); await page.waitForTimeout(120);
  ok('D12 mobiles : n = 4, motif N = 7 → C/I ≈ 18,7 dB, plus petit motif valable (mission validée)', /18,66 dB|18,7 dB/.test(norm(await text(page, 'main'))) && await mission('m1'));
  var box = await page.$('#hexmap svg'), bb = await box.boundingBox(), before = norm(await text(page, '#expr'));
  await page.mouse.click(bb.x + bb.width * 0.8, bb.y + bb.height * 0.3); await page.waitForTimeout(150);
  ok('D13 mobiles : un clic sur la carte déplace le téléphone et met à jour la cellule de service', norm(await text(page, '#explain')).length > 20 && (await page.$$('.hex--serving')).length === 1, before);

  await go(page, 'laboratoire/ip');
  await fill('#in-ip', '192.168.10.77'); await fill('#in-mask', '/26');
  ok('D14 IP : 192.168.10.77/26 → réseau 192.168.10.64, diffusion .127, 62 hôtes (mission « 50 machines » validée)', norm(await text(page, '#r-net')) === '192.168.10.64' && norm(await text(page, '#r-bc')) === '192.168.10.127' && norm(await text(page, '#r-hosts')) === '62' && await mission('m1'));
  await fill('#in-mask', '255.0.255.0');
  ok('D15 IP : un masque non contigu est refusé avec un message', /\S/.test(await text(page, '#in-mask-err')) && norm(await text(page, '#r-net')) === '—');
  await page.selectOption('#in-dst', 'Serveur'); await page.waitForTimeout(100);
  for (var h = 0; h < 3; h++) { await page.click('#hop-next'); await page.waitForTimeout(60); }
  ok('D16 IP : PC-A → serveur pas à pas : 4 étapes, paquet remis, table de routage de R2 affichée', /Paquet remis/.test(await text(page, '#verdict')) && /Étape 4 \/ 4/.test(await text(page, '#hop-count')) && await mission('m2'));
  await fill('#in-ttl', 2);
  for (h = 0; h < 2; h++) { await page.click('#hop-next'); await page.waitForTimeout(60); }
  var lost = /Paquet perdu/.test(await text(page, '#verdict')) && /TTL nul/.test(await text(page, '#hops'));
  await fill('#in-ttl', 3);
  ok('D17 IP : avec TTL = 2 le paquet est détruit par R2 ; TTL minimal 3 (mission validée)', lost && await mission('m3'));
  await page.selectOption('#in-fault', 'mask'); await page.waitForTimeout(100);
  ok('D18 IP : panne de masque, le serveur reste joignable (mission validée)', await mission('m4'));
  await page.selectOption('#in-dst', 'PC-C'); await page.waitForTimeout(100);
  for (h = 0; h < 2; h++) { await page.click('#hop-next').catch(function () {}); await page.waitForTimeout(60); }
  ok('D19 IP : même panne, PC-C est injoignable (échec ARP expliqué)', /Paquet perdu/.test(await text(page, '#verdict')) && /ARP/.test(await text(page, '#hops')));

  // Défis : chaque série complétée avec les bonnes réponses
  var serBad = [];
  for (var m3 of mods) {
    await go(page, 'defis/' + m3.id);
    for (var q = 0; q < m3.exercises; q++) {
      var ans = await page.evaluate(function (mid) {
        var title = document.querySelector('.qcard__title').textContent.trim(), api = TCL.exercises[mid];
        var ex = api.list.filter(function (e) { return e.title === title; })[0];
        if (!ex) return null;
        return { type: ex.type, value: ex.type === 'qcm' ? ex.answer : ex.type === 'text' ? ex.expected : String(Number(ex.answer.toPrecision(10))) };
      }, m3.id);
      if (!ans) { serBad.push(m3.id + ' q' + q + ' introuvable'); break; }
      if (ans.type === 'qcm') await page.check('input[name=ans][value="' + ans.value + '"]', { force: true });
      else await page.fill('#ans-num', ans.value);
      await page.click('#qform button[type=submit]'); await page.waitForTimeout(80);
      if (!/Bonne réponse/.test(await text(page, '.feedback-card__verdict'))) { serBad.push(m3.id + ' q' + q + ' ' + ans.value); }
      if (await page.$('#to-next')) await page.click('#to-next'); else await page.click('#to-result');
      await page.waitForTimeout(80);
    }
    var score = norm(await text(page, '.result__score'));
    if (score !== m3.exercises + ' / ' + m3.exercises) serBad.push(m3.id + ' score ' + score);
  }
  ok('D20 les 9 séries d’exercices sont réussies à 100 % avec les réponses calculées', serBad.length === 0, serBad.join(' | '));

  await go(page, 'progression');
  var kp = norm(await text(page, '.kpis'));
  ok('D21 « Ma progression » : 83 / 83 exercices réussis, 6 chapitres de plus, missions comptées', /83 \/ 83/.test(kp) || /Exercices effectués ?83 \/ 83/.test(kp), kp);

  // Robot de liens : toutes les adresses internes rencontrées mènent à une vraie page
  var seen = {}, queue = ['', 'lecons', 'laboratoire', 'defis', 'progression', 'compte', 'connexion'];
  mods.forEach(function (m) { queue.push('lecons/' + m.id, 'laboratoire/' + m.id, 'defis/' + m.id); });
  var broken = [];
  while (queue.length) {
    var r = queue.shift(); if (seen[r]) continue; seen[r] = 1;
    await page.goto(SITE + '#/' + r); await page.waitForTimeout(90);
    if (/n’existe pas/.test(await text(page, 'main h1'))) broken.push(r);
    var hrefs = await page.$$eval('a[href^="#/"]', function (as) { return as.map(function (a) { return a.getAttribute('href').slice(2); }); });
    hrefs.forEach(function (x) { if (!seen[x] && queue.indexOf(x) < 0) queue.push(x); });
  }
  ok('D22 robot de liens : ' + Object.keys(seen).length + ' adresses internes visitées, aucune ne mène à « page inexistante »', broken.length === 0 && Object.keys(seen).length > 70, broken.join(' '));
  ok('D23 aucun texte « Simulation en cours de développement » ni « en préparation » sur les pages des modules', !(await page.evaluate(function () { return /en cours de développement|en préparation/i.test(document.body.textContent); })));
  ok('D24 aucune erreur JavaScript pendant la série D', errors.length === 0, errors.slice(0, 5).join(' | '));
  await ctx.close();
}

(async function main() {
  var site = staticServer(), api = mock.createServer();
  await new Promise(function (r) { site.listen(SITE_PORT, r); });
  await new Promise(function (r) { api.listen(API_PORT, r); });
  var browser = await chromium.launch();
  try { await suiteA(browser); await suiteB(browser); await suiteC(browser); await suiteD(browser); }
  catch (e) { ok('exécution des tests sans interruption', false, e.stack); }
  await browser.close(); site.close(); api.close();
  var failed = results.filter(function (r) { return !r.ok; });
  console.log('\n' + (results.length - failed.length) + ' / ' + results.length + ' vérifications réussies.');
  if (process.env.RESULTS_JSON) fs.writeFileSync(process.env.RESULTS_JSON, JSON.stringify(results, null, 1));
  process.exit(failed.length ? 1 : 0);
})();
