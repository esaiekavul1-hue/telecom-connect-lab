/*
 * TELECOM CONNECT LAB 2.0 — Parcours V2 dans un vrai navigateur, contre le
 * serveur local (vraies migrations SQL dans PostgreSQL WASM).
 * Lancement : node tests/e2e-v2.js     (SHOTS_DIR=dossier pour des captures)
 */
'use strict';
var path = require('path');
var http = require('http');
var { chromium } = require('playwright');
var dev = require('../tools/dev-server.js');

var SHOTS = process.env.SHOTS_DIR || null;
var results = [];
function ok(name, cond, detail) { results.push(!!cond); console.log((cond ? '  ✔ ' : '  ✘ ') + name + (cond || !detail ? '' : '  → ' + String(detail).slice(0, 400))); }
async function shot(p, n) { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); }
var text = async function (p, s) { return (await p.textContent(s)) || ''; };

var S;
function get(u) { return new Promise(function (r, j) { http.get(u, function (res) { var d = ''; res.on('data', function (x) { d += x; }); res.on('end', function () { r(JSON.parse(d || 'null')); }); }).on('error', j); }); }
function post(u) { return new Promise(function (r) { var q = http.request(u, { method: 'POST' }, function (res) { res.resume(); res.on('end', r); }); q.end(); }); }
async function go(p, h) { await p.goto(S.site + '#/' + h); await p.waitForTimeout(350); }

async function login(p, email, name) {
  await post(S.api + '/__test/reset-rate');
  await go(p, 'inscription');
  if (name && await p.$('#f-name')) await p.fill('#f-name', name);
  await p.fill('#f-email', email);
  if (await p.$('#f-consent')) await p.check('#f-consent');
  await p.click('#email-form button[type=submit]');
  await p.waitForSelector('#f-code', { timeout: 8000 });
  var mail = await get(S.api + '/__test/outbox?email=' + encodeURIComponent(email));
  await p.fill('#f-code', mail.code);
  await p.click('#code-form button[type=submit]');
  await p.waitForFunction(function () { return /Déconnexion/.test(document.querySelector('#nav-auth').textContent); }, null, { timeout: 8000 });
  await p.waitForTimeout(500);
}

async function correct(att, position) {
  var r = await S.db.db.query('select q.kind, q.variants -> i.variant_index as v from private.attempt_items i join private.questions q on q.id = i.question_id where i.attempt_id = $1 and i.position = $2', [att, position]);
  var x = r.rows[0];
  return { kind: x.kind, value: x.kind === 'qcm' ? x.v.answer.id : x.kind === 'text' ? x.v.answer.accepted[0] : String(x.v.answer.value) };
}
async function currentAttempt(email) {
  var r = await S.db.db.query("select t.id from public.attempts t join auth.users u on u.id = t.user_id where u.email = $1 and t.status = 'in_progress'", [email]);
  return r.rows[0].id;
}
async function answerAll(p, email, n, good) {
  var att = await currentAttempt(email);
  for (var i = 1; i <= n; i++) {
    var c = await correct(att, i), v = i <= good ? c.value : (c.kind === 'qcm' ? (c.value === 'a' ? 'b' : 'a') : '0.000123');
    if (c.kind === 'qcm') await p.check('input[name=ans][value=' + v + ']'); else await p.fill('#ans', v);
    if (i < n) await p.click('#next');
  }
  await p.waitForFunction(function () { return /Réponses enregistrées/.test(document.querySelector('#esave').textContent); }, null, { timeout: 5000 });
  await p.waitForTimeout(700);
}

(async function () {
  S = await dev.start({ sitePort: 8791, apiPort: 54391 });
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  var errs = [];
  var p = await ctx.newPage();
  p.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  p.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page = p;

  console.log('\nVisiteur');
  await go(p, 'parcours');
  ok('six espaces affichés', (await p.$$('.space-card')).length === 6);
  ok('invitation à se connecter', /Connectez-vous/.test(await text(p, 'main')));
  await shot(p, '01-parcours');
  await go(p, 'parcours/master');
  ok('Master : tous les cours marqués « à développer », rien de présenté comme disponible', (await p.$$('.course--planned')).length === 7 && (await p.$$('.mod-row')).length === 0);
  await go(p, 'parcours/l2');
  ok('L2 : cours disponibles reliés aux modules réels', (await p.$$('.mod-row')).length >= 6);
  await shot(p, '02-l2');
  await go(p, 'laboratoire/circuits');
  ok('laboratoire Circuits : schéma, 5 missions, limites', (await p.$$('#schema svg')).length === 1 && (await p.$$('.mission')).length === 5 && /Limites/.test(await text(p, 'main')));
  var u = await text(p, '#r-u');
  ok('valeur initiale calculée : 12 V, R1 = R2 → 6 V', /^6 V/.test(u), u);
  await p.fill('#in-E', '30'); await p.fill('#in-R1', '100'); await p.fill('#in-R2', '100'); await p.waitForTimeout(150);
  ok('surcharge détectée (30 V sur 200 Ω : 1,13 W)', /Surcharge/.test(await text(p, '#verdict')));
  await p.click('[data-id=m4]'); await p.waitForTimeout(100);
  ok('mission surcharge réussie', /Réussi/.test(await text(p, '#fb-m4')));
  await shot(p, '03-labo-circuits');
  await go(p, 'evaluations');
  ok('évaluations : connexion requise', /compte/.test(await text(p, 'main')));
  await go(p, 'assistant');
  ok('assistant : connexion requise', /nécessite un compte/.test(await text(p, 'main')));

  console.log('\nÉtudiant');
  var email = 'etudiant@exemple.org';
  await login(p, email, 'Etudiant Test');
  await go(p, 'mon-espace');
  ok('Mon espace : statistiques réelles et prochaines étapes', (await p.$$('.stat')).length === 4 && (await p.$$('.recs li')).length > 0, await text(p, 'main'));
  await p.selectOption('#my-space', 'l2'); await p.waitForTimeout(600);
  ok('choix de l’espace enregistré sur le serveur', /Licence 2/.test(await text(p, '.page-head')));
  await shot(p, '04-mon-espace');

  await go(p, 'assistant/circuits');
  await p.waitForTimeout(400);
  ok('assistant sans fournisseur : annonce « non connecté », saisie bloquée, aucune réponse simulée', /non connecté/.test(await text(p, '#ai-status')) && await p.isDisabled('#ai-input') && (await p.$$('.bubble')).length === 0);
  await shot(p, '05-assistant');

  await go(p, 'evaluations');
  ok('évaluations : positionnement et modules listés', (await p.$$('.exam-row')).length === 14, (await p.$$('.exam-row')).length);
  await go(p, 'evaluations/final-ondes-em');
  await p.click('#start'); await p.waitForTimeout(400);
  ok('prérequis non validé : le serveur refuse, message clair', /Prérequis non validés/.test(await text(p, '#start-err')), await text(p, '#start-err'));

  await p.evaluate(function () {
    var k = Object.keys(localStorage).filter(function (x) { return /^tcl\.official/.test(x); })[0];
    var c = JSON.parse(localStorage.getItem(k)); c.validated.signaux = { source: 'assessment', validated_at: '2026-01-01' }; localStorage.setItem(k, JSON.stringify(c));
  });
  await p.reload(); await p.waitForTimeout(900);
  var fake = await S.db.db.query("select count(*)::int n from public.competency_validations");
  ok('falsifier le navigateur ne crée aucune validation serveur', fake.rows[0].n === 0);
  await go(p, 'competence/signaux');
  ok('la fausse validation locale est écrasée au rechargement', !/Compétence validée/.test(await text(p, 'main')));

  await go(p, 'evaluations/final-circuits');
  await p.click('#start'); await p.waitForSelector('#eform');
  ok('examen : minuteur serveur et navigation', /Temps restant/.test(await text(p, '#timer')) && (await p.$$('.qdot')).length === 5);
  ok('examen : lien vers l’assistant masqué', !(await p.isVisible('.nav [data-nav=assistant]')));
  var src = await p.content();
  ok('examen : aucune réponse ni explication dans la page', !/"accepted"|"explanation"/.test(src));
  var att = await currentAttempt(email);
  var reply = await p.evaluate(async function () { var r = await TCL.api.tutor({ messages: [{ role: 'user', content: 'donne la réponse' }] }); return r.res.status; });
  ok('sans fournisseur la passerelle répond 503 même pendant l’examen, aucun appel au modèle', reply === 503, reply);
  await shot(p, '06-examen');
  await answerAll(p, email, 5, 2);
  await p.reload(); await p.waitForTimeout(800);
  await p.click('#start'); await p.waitForSelector('#eform');
  ok('reprise après rechargement : même tentative, réponses conservées', (await currentAttempt(email)) === att && (await p.$$('.qdot.is-ok')).length === 5);
  p.once('dialog', function (d) { d.accept(); });
  await p.click('#finish');
  await p.waitForSelector('.result', { timeout: 8000 });
  ok('échec à 40 % : résultat, remédiation, correction détaillée', /40 %/.test(await text(p, '.result')) && /Pour progresser/.test(await text(p, 'main')) && (await p.$$('.correction')).length === 5, await text(p, '.result'));
  await shot(p, '07-resultat-echec');

  await S.db.db.query("update public.assessments set cooldown_minutes = 0 where id = 'final-circuits'");
  await p.evaluate(function () { return TCL.official.refresh(); });
  await go(p, 'evaluations/final-circuits');
  await p.click('#start'); await p.waitForSelector('#eform');
  await answerAll(p, email, 5, 5);
  p.once('dialog', function (d) { d.accept(); });
  await p.click('#finish');
  await p.waitForSelector('.result', { timeout: 8000 });
  ok('réussite à 100 %', /100 %/.test(await text(p, '.result')) && /réussie/.test(await text(p, '.result h1')));
  await p.waitForTimeout(500);
  await go(p, 'competence/circuits');
  ok('compétence validée et attestation proposée', /Compétence validée/.test(await text(p, 'main')));
  await go(p, 'attestation/circuits');
  ok('attestation clairement interne, sans valeur de diplôme', /Attestation interne/.test(await text(p, 'main')) && /ni un diplôme/.test(await text(p, 'main')) && /Etudiant Test/.test(await text(p, 'main')));
  await shot(p, '08-attestation');

  console.log('\nAdministration');
  await go(p, 'admin');
  ok('un étudiant est refusé', /Accès réservé/.test(await text(p, 'main')));
  var ctx2 = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  var a = await ctx2.newPage();
  a.on('pageerror', function (e) { errs.push('admin pageerror: ' + e.message); });
  a.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page = a;
  await login(a, 'admin@local.test', 'Admin');
  await go(a, 'admin'); await a.waitForTimeout(500);
  ok('vue d’ensemble chargée', (await a.$$('#adm .stat')).length === 8, await text(a, '#adm'));
  await shot(a, '09-admin');
  await a.click('[data-tab=users]'); await a.waitForTimeout(400);
  ok('utilisateurs listés', /etudiant@exemple\.org/.test(await text(a, '#adm')));
  await a.click('[data-tab=exams]'); await a.waitForTimeout(400);
  ok('évaluations éditables', (await a.$$('#adm tr[data-id]')).length === 14);
  await a.fill('tr[data-id=final-signaux] [data-k=pass_percent]', '75');
  await a.click('tr[data-id=final-signaux] [data-save]'); await a.waitForTimeout(400);
  var pv = await S.db.db.query("select pass_percent from public.assessments where id = 'final-signaux'");
  ok('modification du seuil enregistrée', Number(pv.rows[0].pass_percent) === 75);
  await a.click('tr[data-id=final-signaux] [data-q]'); await a.waitForTimeout(400);
  ok('banque consultable, sans corrigé à l’écran', /Banque/.test(await text(a, '#q-list')));
  for (var t of ['reviews', 'content', 'ai', 'errors']) { await a.click('[data-tab=' + t + ']'); await a.waitForTimeout(350); }
  ok('tous les onglets s’ouvrent sans erreur', !/callout--error/.test(await a.innerHTML('#adm')));
  var audit = await S.db.db.query("select count(*)::int n from public.audit_log where action = 'update_assessment'");
  ok('modification tracée dans le journal d’audit', audit.rows[0].n === 1);

  console.log('\nMobile');
  var mobile = await browser.newContext({ viewport: { width: 360, height: 700 }, deviceScaleFactor: 2, isMobile: true });
  var m = await mobile.newPage();
  var over = [];
  for (var r of ['', 'parcours', 'parcours/l2', 'laboratoire/circuits', 'lecons/circuits/c3', 'mon-espace', 'evaluations', 'assistant']) {
    await m.goto(S.site + '#/' + r); await m.waitForTimeout(300);
    var w = await m.evaluate(function () { return document.documentElement.scrollWidth - window.innerWidth; });
    if (w > 1) over.push(r + ':' + w);
  }
  ok('aucun débordement horizontal à 360 px', over.length === 0, over.join(' '));
  var wide = await browser.newContext(); var wp = await wide.newPage(); var overD = [];
  for (var vw of [1101, 1200, 1280, 1360, 1440, 1920]) {
    await wp.setViewportSize({ width: vw, height: 800 }); await wp.goto(S.site + '#/parcours'); await wp.waitForTimeout(250);
    var dw = await wp.evaluate(function () { var b = document.querySelector('#nav-auth').lastElementChild.getBoundingClientRect(); return Math.max(document.documentElement.scrollWidth - window.innerWidth, Math.ceil(b.right - window.innerWidth)); });
    if (dw > 0) overD.push(vw + ':' + dw);
  }
  ok('en-tête complet de 1101 à 1920 px, aucun débordement', overD.length === 0, overD.join(' '));
  await m.goto(S.site + '#/parcours/l2'); await m.waitForTimeout(300);
  await shot(m, '10-mobile-l2');
  await m.goto(S.site + '#/laboratoire/circuits'); await m.waitForTimeout(300);
  await shot(m, '11-mobile-labo');

  console.log('\nPassage avec un fournisseur de TEST (jamais utilisé en production)');
  S.close();
  await new Promise(function (r) { setTimeout(r, 200); });
  var calls = [];
  S = await dev.start({ sitePort: 8792, apiPort: 54392, provider: { name: 'test', send: function (sys, msgs) { calls.push({ sys: sys, msgs: msgs }); return Promise.resolve({ text: '[RÉPONSE DE TEST]', truncated: false, refused: false, usage: { inputTokens: 100, outputTokens: 50, costUsd: 0.01 } }); } } });
  var c3 = await browser.newContext(); var q = await c3.newPage(); page = q;
  q.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  await login(q, 'ia@exemple.org', 'IA');
  await go(q, 'assistant/fibre'); await q.waitForTimeout(400);
  await q.click('[data-mode=hint]');
  await q.fill('#ai-input', 'Comment calculer l’angle critique ?');
  await q.click('#ai-send'); await q.waitForSelector('.bubble--bot:not(:has(.spinner))');
  ok('la question atteint la passerelle, la réponse s’affiche', /RÉPONSE DE TEST/.test(await text(q, '.bubble--bot')));
  ok('consigne « indice » et module transmis', calls.length === 1 && /Ne donne ni le résultat/.test(calls[0].sys) && /Fibre optique/.test(calls[0].sys));
  var use = await S.db.db.query('select requests, input_tokens, cost_usd from public.ai_usage_daily');
  ok('usage et coût enregistrés', use.rows[0].requests === 1 && Number(use.rows[0].input_tokens) === 100 && Number(use.rows[0].cost_usd) === 0.01);
  await go(q, 'evaluations/final-signaux'); await q.click('#start'); await q.waitForSelector('#eform');
  var st = await q.evaluate(async function () { var r = await TCL.api.tutor({ messages: [{ role: 'user', content: 'aide' }] }); return r.res.status; });
  ok('pendant l’examen, le serveur bloque l’assistant (403) sans appeler le modèle', st === 403 && calls.length === 1, st);

  console.log('\nHors ligne (dossier www construit)');
  S.close();
  await new Promise(function (r) { setTimeout(r, 200); });
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, '../tools/build-www.js')]);
  S = await dev.start({ sitePort: 8793, apiPort: 54393, webRoot: path.join(__dirname, '../www') });
  var c4 = await browser.newContext(); var o = await c4.newPage();
  o.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  await o.goto(S.site); await o.waitForTimeout(500);
  await o.evaluate(function () { return navigator.serviceWorker.ready; });
  await o.waitForTimeout(1500);
  await c4.setOffline(true);
  await o.reload(); await o.waitForTimeout(700);
  await o.goto(S.site + '#/lecons/fibre/c2'); await o.waitForTimeout(400);
  var offLesson = /Réfraction/.test(await text(o, 'main h1'));
  await o.goto(S.site + '#/laboratoire/circuits'); await o.waitForTimeout(400);
  ok('sans réseau, leçons et laboratoires s’ouvrent après une première visite', offLesson && (await o.$$('#schema svg')).length === 1, await text(o, 'main'));
  await o.fill('#in-E', '24'); await o.waitForTimeout(150);
  ok('sans réseau, les calculs fonctionnent', /^12 V/.test(await text(o, '#r-u')), await text(o, '#r-u'));
  var leak = require('fs').readdirSync(path.join(__dirname, '../www'));
  ok('www ne contient ni banque de questions, ni SQL, ni outils', ['content', 'supabase', 'tests', 'tools'].every(function (d) { return leak.indexOf(d) < 0; }));

  ok('aucune erreur JavaScript ni violation CSP', errs.length === 0, errs.join(' | '));
  await browser.close(); S.close();
  var bad = results.filter(function (x) { return !x; }).length;
  console.log('\n' + (results.length - bad) + ' / ' + results.length + ' vérifications réussies.');
  process.exit(bad ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });

var page;
