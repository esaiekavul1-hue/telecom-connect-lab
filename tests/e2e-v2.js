/*
 * TELECOM CONNECT LAB 2.0 — Parcours V2 dans un vrai navigateur.
 * Serveur LOCAL uniquement : vraies migrations SQL dans PostgreSQL (WASM),
 * connexion simulée. Ce n'est pas une validation du service Supabase réel.
 * Lancement : node tests/e2e-v2.js     (SHOTS_DIR=dossier pour des captures)
 */
'use strict';
var path = require('path');
var http = require('http');
var { chromium } = require('playwright');
var dev = require('../tools/dev-server.js');

var SHOTS = process.env.SHOTS_DIR || null;
var results = [];
function ok(name, cond, detail) { results.push(!!cond); console.log((cond ? '  ✔ ' : '  ✘ ') + name + (cond || detail == null ? '' : '  → ' + String(detail).slice(0, 400))); }
async function shot(p, n) { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); }
var text = async function (p, s) { return (await p.textContent(s)) || ''; };

var S, errs = [];
function get(u) { return new Promise(function (r, j) { http.get(u, function (res) { var d = ''; res.on('data', function (x) { d += x; }); res.on('end', function () { r(JSON.parse(d || 'null')); }); }).on('error', j); }); }
function post(u) { return new Promise(function (r) { var q = http.request(u, { method: 'POST' }, function (res) { res.resume(); res.on('end', r); }); q.end(); }); }
async function go(p, h) { await p.goto(S.site + '#/' + h); await p.waitForTimeout(350); }
function watch(p) {
  p.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  p.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(m.text()); });
}
async function waitHash(p, h) { await p.waitForFunction(function (x) { return location.hash === x; }, h, { timeout: 8000 }); await p.waitForTimeout(250); }
async function newPage(browser, width) { var c = await browser.newContext({ viewport: { width: width || 1360, height: 900 } }); var p = await c.newPage(); watch(p); return { ctx: c, page: p }; }
function hash(p) { return p.evaluate(function () { return location.hash; }); }

async function login(p, email, name) {
  await post(S.api + '/__test/reset-rate');
  await go(p, name ? 'inscription' : 'connexion');
  if (name) await p.fill('#f-name', name);
  await p.fill('#f-email', email);
  await p.click('#email-form button[type=submit]');
  await p.waitForSelector('#f-code', { timeout: 8000 });
  var mail = await get(S.api + '/__test/outbox?email=' + encodeURIComponent(email));
  await p.fill('#f-code', mail.code);
  await p.click('#code-form button[type=submit]');
  await p.waitForFunction(function () { return /Déconnexion/.test(document.querySelector('#nav-auth').textContent); }, null, { timeout: 8000 });
  await p.waitForTimeout(700);
}
// À l'inscription : le niveau d'études choisi (L1 avec demande professionnelle pour « pro »).
async function chooseTrack(p, space, spec) {
  var start = space === 'pro' ? 'l1' : space;
  await p.waitForSelector('#track-form', { timeout: 8000 });
  // Mode professionnel : aucun niveau à cocher, spécialisation et expérience obligatoires.
  if (space === 'pro') { await p.check('#pro-ask'); await p.selectOption('#spec', spec || 'pro-reseaux'); await p.fill('#pro-msg', 'Technicien depuis 5 ans'); }
  else await p.check('input[name=track][value=' + start + ']');
  await p.click('#track-ok');
  await waitHash(p, '#/mon-espace');
  if (space !== start && space !== 'pro') {
    var id = await p.evaluate(function () { return TCL.auth.state().user.id; });
    await S.db.db.query('update public.profiles set space = $1 where id = $2', [space, id]);
    await p.reload(); await waitHash(p, '#/mon-espace'); await p.waitForTimeout(500);
  }
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
async function finishExam(p) { p.once('dialog', function (d) { d.accept(); }); await p.click('#finish'); await p.waitForSelector('.result', { timeout: 8000 }); await p.waitForTimeout(400); }
async function profileOf(email) { return (await S.db.db.query('select p.space, p.specialization from public.profiles p join auth.users u on u.id = p.id where u.email = $1', [email])).rows[0]; }
function rpcResult(p, name, args) { return p.evaluate(function (a) { return TCL.api.rpc(a.n, a.x).then(function () { return 'OK'; }, function (e) { return e.message; }); }, { n: name, x: args }); }

(async function () {
  S = await dev.start({ sitePort: 8791, apiPort: 54391 });
  var browser = await chromium.launch();
  var d = await newPage(browser), p = d.page, dialogs = 0;
  p.on('dialog', function () { dialogs++; });

  console.log('\nVisiteur : découverte publique');
  await go(p, '');
  var home = await text(p, 'main');
  ok('accueil : Découvrir, Créer un compte, Se connecter', await p.isVisible('.hero__actions >> text=Découvrir') && await p.isVisible('.hero__actions >> text=Créer un compte') && await p.isVisible('.hero__actions >> text=Se connecter'));
  ok('accueil : objectifs, six parcours, avantages, fonctionnement', (await p.$$('.space-card')).length === 6 && /Notre objectif/.test(home) && /Conçue pour vos conditions/.test(home) && /Comment ça marche/.test(home));
  ok('accueil : assistant présenté comme non encore en service', /Assistant pédagogique/.test(home) && /pas encore en service/.test(home));
  var nav = (await p.$$eval('#nav-list .nav__link:not(.nav__link--auth)', function (a) { return a.map(function (x) { return x.textContent; }); })).join(',');
  ok('navigation publique conservée : Accueil, Leçons, Laboratoire, Défis, Progression', nav === 'Accueil,Leçons,Laboratoire,Défis,Progression', nav);
  ok('le catalogue complet n’est pas téléchargé par un visiteur', await p.evaluate(function () { return !performance.getEntriesByType('resource').some(function (r) { return /modules\/(fibre|ip|antennes|signaux\/lesson)/.test(r.name); }) && !(window.TCL.lessons && TCL.lessons.fibre); }));
  await shot(p, '01-accueil-public');

  await go(p, 'lecons');
  ok('Leçons : une seule leçon ouverte', (await p.$$('.card--live')).length === 1 && /La loi d’Ohm/.test(await text(p, 'main')));
  await go(p, 'lecons/decouverte');
  var words = (await text(p, '.lesson__body')).split(/\s+/).length;
  ok('leçon de démonstration réelle : formule, figures, exemple chiffré', /La loi d’Ohm/.test(await text(p, 'main h1')) && (await p.$$('.lesson__body figure svg')).length === 2 && /25|mA/.test(await text(p, '.lesson__body')) && words > 180, words);
  await shot(p, '02-lecon-demo');
  var blocked = [];
  for (var g of ['lecons/fibre', 'lecons/fibre/c1', 'laboratoire/fibre', 'defis/fibre', 'evaluations', 'evaluations/final-ip', 'assistant', 'mon-espace', 'parcours/l2', 'competence/ip', 'admin', 'bienvenue']) {
    await go(p, g);
    if (!/Réservé aux étudiants inscrits/.test(await text(p, 'main'))) blocked.push(g);
  }
  ok('accès direct au catalogue et aux espaces personnels refusé', blocked.length === 0, blocked.join(' '));

  await go(p, 'laboratoire/decouverte');
  await p.fill('#in-U', '12'); await p.fill('#in-R', '100'); await p.waitForTimeout(150);
  ok('simulation : 12 V sur 100 Ω → 120 mA, 1,44 W, surcharge signalée', /^120 mA/.test(await text(p, '#r-i')) && /^1,44 W/.test(await text(p, '#r-p')) && /0,25 W/.test(await text(p, '#verdict')), await text(p, '#r-i'));
  await p.fill('#in-U', '5'); await p.fill('#in-R', '1000'); await p.waitForTimeout(150);
  ok('simulation : 5 V sur 1 000 Ω → 5 mA, 25 mW, sans alerte', /^5 mA/.test(await text(p, '#r-i')) && /^25 mW/.test(await text(p, '#r-p')) && /dans les limites/.test(await text(p, '#verdict')), await text(p, '#r-p'));
  ok('simulation : hypothèses et limites affichées', /Limites/.test(await text(p, 'main')));
  await shot(p, '03-labo-demo');

  await go(p, 'defis/decouverte');
  await p.fill('#ans-num', '1'); await p.click('#qform button[type=submit]'); await p.waitForTimeout(100);
  ok('mini-défi : réponse fausse corrigée et expliquée immédiatement', /Réponse incorrecte/.test(await text(p, '#qfb')) && /Explication/.test(await text(p, '#qfb')));
  await p.click('#demo-next');
  await p.check('input[name=ans][value=a]'); await p.click('#qform button[type=submit]'); await p.waitForTimeout(100);
  ok('mini-défi : bonne réponse reconnue', /Bonne réponse/.test(await text(p, '#qfb')));
  await p.click('#demo-next');
  await p.fill('#ans-num', '9,4'); await p.click('#qform button[type=submit]'); await p.waitForTimeout(100);
  await p.click('#demo-next');
  ok('mini-défi : résultat sans validation officielle', /2.*\/ 3/.test(await text(p, '.result__score')) && /ne vaut pas validation/.test(await text(p, 'main')), await text(p, 'main'));
  ok('démonstration : rien n’est enregistré sur l’appareil', await p.evaluate(function () { var g = localStorage.getItem('tcl.progress.guest'); return !g || !/decouverte/.test(g); }));

  await go(p, 'progression');
  var kpi = await p.$$eval('.kpi__value', function (a) { return a.map(function (x) { return x.textContent; }); });
  ok('Progression : aperçu explicite, aucun résultat inventé', /aucune donnée réelle/.test(await text(p, 'main')) && kpi.length === 5 && kpi.every(function (v) { return v === '—'; }), kpi.join());
  ok('aucune fenêtre d’inscription intrusive', dialogs === 0 && (await p.$$('.modal, [role=dialog]')).length === 0);
  await shot(p, '04-progression-apercu');

  console.log('\nNouveau compte : choix unique du parcours');
  var email = 'etudiant@exemple.org';
  await login(p, email, 'Etudiant Test');
  await waitHash(p, '#/bienvenue');
  ok('après inscription : Préparatoire, L1, L2, L3 et Master proposés', (await p.$$eval('input[name=track]', function (a) { return a.map(function (x) { return x.value; }).join(); })) === 'preparatoire,l1,l2,l3,master');
  var metas = await p.$$eval('.track-option__meta', function (a) { return a.map(function (x) { return x.textContent; }); });
  ok('disponibilité des cours indiquée pour chaque niveau', metas.length === 5 && metas.every(function (m) { return /cours disponibles|pas encore disponibles/.test(m); }), metas.join(' | '));
  ok('parcours professionnel présenté à part', /Parcours professionnel/.test(await text(p, '.pro-ask')));
  ok('rubriques masquées tant que le parcours n’est pas choisi', (await p.$$('#nav-list .nav__link:not(.nav__link--auth)')).length === 0);
  await shot(p, '05-choix-parcours');
  await p.goto(S.site + '#/lecons'); await waitHash(p, '#/bienvenue');
  ok('impossible de contourner le choix', true);
  var btn = async function () { return { label: (await text(p, '#track-ok')).trim(), off: await p.isDisabled('#track-ok') }; };
  var b0 = await btn();
  ok('mode étudiant : niveau obligatoire avant confirmation', b0.off && /Confirmer mon parcours/.test(b0.label), JSON.stringify(b0));
  await p.check('#pro-ask');
  ok('demande professionnelle : spécialisations proposées', await p.isVisible('#spec') && (await p.$$('#spec option')).length === 8 && await p.isVisible('#pro-msg'));
  var b1 = await btn();
  ok('mode professionnel : aucun niveau universitaire demandé, bouton « Soumettre ma demande »', !(await p.isVisible('#level-box')) && /Soumettre ma demande/.test(b1.label) && b1.off, JSON.stringify(b1));
  await p.selectOption('#spec', 'pro-fibre'); await p.fill('#pro-msg', 'court');
  ok('mode professionnel : bouton inactif tant que l’expérience est incomplète', await p.isDisabled('#track-ok'));
  await p.fill('#pro-msg', 'Technicien fibre depuis 6 ans');
  ok('mode professionnel : bouton actif dès que les champs obligatoires sont remplis, sans niveau', !(await p.isDisabled('#track-ok')) && (await p.$$('input[name=track]:checked')).length === 0);
  await p.selectOption('#spec', '');
  ok('mode professionnel : spécialisation obligatoire', await p.isDisabled('#track-ok'));
  await p.uncheck('#pro-ask');
  var b2 = await btn();
  ok('retour au mode étudiant : niveaux affichés, champs professionnels masqués, niveau toujours exigé', !(await p.isVisible('#spec')) && await p.isVisible('#level-box') && b2.off && /Confirmer mon parcours/.test(b2.label), JSON.stringify(b2));
  ok('Monde professionnel à l’inscription : refusé par le serveur sans approbation', /Monde professionnel s'ouvre par une demande approuvée/.test(await rpcResult(p, 'choose_initial_track', { p_space: 'pro', p_specialization: null })));
  await p.check('input[name=track][value=l3]');
  ok('test de positionnement facultatif proposé à partir de la L1', await p.isVisible('#placement-ask') && !(await p.isChecked('#placement-ask')));
  await p.check('input[name=track][value=preparatoire]');
  ok('aucun positionnement proposé en Préparatoire', !(await p.isVisible('#placement-ask')));
  await p.check('input[name=track][value=l1]');
  await p.click('#track-ok');
  await waitHash(p, '#/mon-espace');
  ok('parcours enregistré dans le profil serveur', (await profileOf(email)).space === 'l1');
  await p.waitForTimeout(300);
  var dash = await text(p, 'main');
  ok('tableau de bord : bienvenue, parcours, progression, reprise, recommandations, labos, compétences, résultats', /Bonjour, Etudiant Test/.test(dash) && /Licence 1/.test(dash) && await p.isVisible('#continue') && /Continuer mon apprentissage/.test(dash) && /Prochaines activités/.test(dash) && /Mes laboratoires/.test(dash) && /Compétences acquises/.test(dash) && /Résultats des évaluations/.test(dash) && (await p.$$('.stat')).length === 4, dash.slice(0, 300));
  await shot(p, '06-tableau-de-bord');
  var nav2 = (await p.$$eval('#nav-list .nav__link:not(.nav__link--auth)', function (a) { return a.map(function (x) { return x.textContent; }); })).join(',');
  ok('navigation étudiante adaptée', nav2 === 'Mon espace,Mes leçons,Mon laboratoire,Mes défis,Évaluations,Assistant,Ma progression', nav2);

  console.log('\nSession');
  await p.reload(); await p.waitForTimeout(800);
  ok('actualisation : toujours sur le tableau de bord, sans nouvelle sélection', (await hash(p)) === '#/mon-espace' && /Licence 1/.test(await text(p, 'main')));
  var again = await d.ctx.newPage(); watch(again);
  await again.goto(S.site); await waitHash(again, '#/mon-espace');
  ok('réouverture de l’application : accès direct à son espace', /Bonjour/.test(await text(again, 'main h1')));
  await again.close();

  console.log('\nContenus filtrés selon le parcours');
  await go(p, 'lecons');
  var mods = (await p.$$eval('.card[data-module]', function (a) { return a.map(function (x) { return x.getAttribute('data-module'); }); })).sort().join(',');
  ok('Leçons : uniquement les modules de L1', mods === 'ac,analyse,binaire,chaine,circuits,diodes,fourier,iot-capteurs,iot-intro,ip,mesures,ordinateur,signaux,systemes', mods);
  ok('Leçons : aucun cours vide annoncé dans le parcours', (await p.$$('.soon')).length === 0 && !/En cours de développement/.test(await text(p, 'main')));
  await shot(p, '07-lecons-l1');
  await go(p, 'laboratoire');
  ok('Laboratoires : uniquement ceux de L1', (await p.$$('.lab-card')).length === 17);
  await go(p, 'defis');
  ok('Défis : uniquement ceux de L1', (await p.$$('.card[data-module]')).length === 14);
  await go(p, 'evaluations');
  ok('Évaluations : L1 et tests de positionnement', (await p.$$('.exam-row')).length === 22, (await p.$$('.exam-row')).length);
  await go(p, 'assistant');
  ok('Assistant : modules du parcours', (await p.$$('#ai-mod option')).length === 15);
  var off = [];
  for (var o of ['lecons/fibre', 'lecons/fibre/c1', 'laboratoire/mobiles', 'defis/antennes', 'competence/modulation', 'evaluations/final-fibre']) {
    await go(p, o);
    if (!/Hors de votre parcours/.test(await text(p, 'main h1'))) off.push(o);
  }
  ok('module hors parcours : page explicative, pas de contenu', off.length === 0, off.join(' '));
  await go(p, 'parcours');
  ok('Mon parcours : uniquement les cours de L1', /Mon parcours : Licence 1/.test(await text(p, 'main h1')) && (await p.$$('.course')).length === 7);
  ok('révisions recommandées des niveaux précédents, non bloquantes, avec positionnement', await p.isVisible('#revisions') && /ne bloquent ni vos cours ni vos évaluations/.test(await text(p, '#revisions')) && /Représentation des données/.test(await text(p, '#revisions')) && (await p.$$('#revisions a[href^="#/evaluations/placement-"]')).length > 0, await text(p, 'main'));

  console.log('\nContrôles côté serveur');
  await go(p, 'mon-espace');
  ok('évaluation hors parcours refusée par le serveur, même en appel direct', /ne fait pas partie/.test(await rpcResult(p, 'start_attempt', { p_assessment: 'final-fibre' })));
  ok('second choix initial refusé', /déjà enregistré/.test(await rpcResult(p, 'choose_initial_track', { p_space: 'l3', p_specialization: null })));
  var patched = await p.evaluate(function () { return TCL.api.update('profiles?id=eq.' + TCL.auth.state().user.id, { space: 'master' }).then(function () { return 'OK'; }, function (e) { return e.kind; }); });
  ok('écrire directement son parcours : refusé', patched === 'forbidden' && (await profileOf(email)).space === 'l1', patched);
  ok('Monde professionnel sans approbation ni évaluations : refusé', /à valider avant ce parcours/.test(await rpcResult(p, 'change_track', { p_space: 'pro', p_specialization: null })));
  ok('prérequis propre au niveau toujours appliqué', /Prérequis non validés : ac/.test(await rpcResult(p, 'start_attempt', { p_assessment: 'final-mesures' })));
  await p.evaluate(function () {
    var k = Object.keys(localStorage).filter(function (x) { return /^tcl\.official/.test(x); })[0];
    var c = JSON.parse(localStorage.getItem(k)); c.validated.signaux = { source: 'assessment', validated_at: '2026-01-01' }; c.profile.space = 'l3'; localStorage.setItem(k, JSON.stringify(c));
  });
  await p.reload(); await p.waitForTimeout(900);
  var fake = await S.db.db.query('select count(*)::int n from public.competency_validations');
  ok('falsifier le navigateur : ni validation ni parcours modifiés', fake.rows[0].n === 0 && /Licence 1/.test(await text(p, 'main')));

  console.log('\nApprentissage');
  await go(p, 'lecons/circuits/c2'); await p.waitForTimeout(200);
  await go(p, 'mon-espace');
  ok('dernière leçon affichée et reprise au bon endroit', /Les lois de Kirchhoff/.test(await text(p, '.dash-hero')) && /circuits\/c2$/.test(await p.getAttribute('#continue', 'href')));
  await go(p, 'lecons/circuits/c2'); await p.click('#mark-read'); await p.waitForTimeout(300);
  await go(p, 'mon-espace');
  ok('chapitre lu : la reprise passe au chapitre suivant', /circuits\/c3$/.test(await p.getAttribute('#continue', 'href')));
  await p.waitForTimeout(1900);

  await go(p, 'evaluations/final-circuits');
  await p.click('#start'); await p.waitForSelector('#eform');
  ok('examen : minuteur serveur et navigation', /Temps restant/.test(await text(p, '#timer')) && (await p.$$('.qdot')).length === 5);
  ok('examen : aucune réponse ni explication dans la page', !/"accepted"|"explanation"/.test(await p.content()));
  var att = await currentAttempt(email);
  await answerAll(p, email, 5, 2);
  await p.reload(); await p.waitForTimeout(800);
  await p.click('#start'); await p.waitForSelector('#eform');
  ok('reprise après rechargement : même tentative, réponses conservées', (await currentAttempt(email)) === att && (await p.$$('.qdot.is-ok')).length === 5);
  await finishExam(p);
  ok('échec : résultat, remédiation, juste ou faux par question', /40 %/.test(await text(p, '.result')) && /Pour progresser/.test(await text(p, 'main')) && (await p.$$('.correction.is-ok')).length === 2 && (await p.$$('.correction')).length === 5);
  ok('échec : aucun corrigé ni énoncé communiqué', !/Réponse attendue|Votre réponse/.test(await text(p, 'main')) && /disponible après la réussite/.test(await text(p, '#no-correction')), await text(p, 'main'));
  await S.db.db.query("update public.assessments set cooldown_minutes = 0 where id in ('final-circuits','final-signaux')");
  await p.evaluate(function () { return TCL.official.refresh(); });
  await go(p, 'evaluations/final-circuits'); await p.click('#start'); await p.waitForSelector('#eform');
  await answerAll(p, email, 5, 5);
  await finishExam(p);
  ok('réussite : compétence validée par le serveur, corrigé détaillé communiqué', /100 %/.test(await text(p, '.result')) && /Correction détaillée/.test(await text(p, 'main')) && /Votre réponse/.test(await text(p, 'main')));
  await go(p, 'attestation/circuits');
  ok('attestation clairement interne', /Attestation interne/.test(await text(p, 'main')) && /ni un diplôme/.test(await text(p, 'main')));

  console.log('\nDéconnexion, reconnexion, autre appareil');
  var saw = [];
  p.on('framenavigated', function (f) { saw.push(f.url()); });
  await go(p, 'mon-espace');
  await p.waitForTimeout(1800);
  await p.click('#btn-signout'); await waitHash(p, '#/');
  ok('déconnexion : retour à l’accueil public', await p.isVisible('.hero__actions') && /Créer un compte/.test(await text(p, '#nav-auth')));
  await go(p, 'mon-espace');
  ok('après déconnexion : espace inaccessible', /Réservé aux étudiants inscrits/.test(await text(p, 'main')));
  saw.length = 0;
  await login(p, email);
  await waitHash(p, '#/mon-espace');
  ok('reconnexion : directement dans son espace, sans sélection', !saw.some(function (u) { return /bienvenue/.test(u); }) && /Licence 1/.test(await text(p, 'main')));
  ok('reconnexion : progression, dernière leçon et compétence restaurées', /Le diviseur de tension/.test(await text(p, '.dash-hero')) && /Circuits électriques/.test(await text(p, '.dash__side')), await text(p, '.dash-hero'));
  var d2 = await newPage(browser, 390), q = d2.page, saw2 = [];
  q.on('framenavigated', function (f) { saw2.push(f.url()); });
  await login(q, email);
  await waitHash(q, '#/mon-espace');
  ok('autre appareil : parcours retrouvé sans le redemander', !saw2.some(function (u) { return /bienvenue/.test(u); }) && /Licence 1/.test(await text(q, 'main')));
  ok('autre appareil : dernière leçon et résultats retrouvés', /Le diviseur de tension/.test(await text(q, '.dash-hero')) && /Évaluation : Circuits/.test(await text(q, 'main')), await text(q, '.dash-hero'));
  await shot(q, '08-autre-appareil-mobile');

  console.log('\nÉvolution du parcours');
  await go(p, 'changer-parcours');
  ok('changement : tous les niveaux d’études ouverts sans prérequis', (await p.$$('[data-move=preparatoire],[data-move=l2],[data-move=l3],[data-move=master]')).length === 4 && !/À valider d’abord : Comprendre les signaux/.test(await text(p, '.courses')), await text(p, '.courses'));
  ok('étudiant L1 : Monde professionnel verrouillé dans le menu', (await p.$('[data-move=pro]')) === null && (await p.$('#spec-change')) === null);
  await shot(p, '09-changer-parcours');
  await go(p, 'evaluations/final-signaux'); await p.click('#start'); await p.waitForSelector('#eform');
  await answerAll(p, email, 5, 5);
  await finishExam(p);
  await go(p, 'evaluations/final-analyse'); await p.click('#start'); await p.waitForSelector('#eform');
  await answerAll(p, email, 5, 5);
  await finishExam(p);
  await go(p, 'changer-parcours');
  var before = (await S.db.db.query('select (select count(*)::int from public.attempts) a, (select count(*)::int from public.competency_validations) v')).rows[0];
  p.once('dialog', function (x) { x.accept(); });
  await p.click('[data-move=l2]');
  await waitHash(p, '#/mon-espace');
  ok('passage en L2 après validation des prérequis', (await profileOf(email)).space === 'l2' && /Licence 2/.test(await text(p, 'main')));
  var after = (await S.db.db.query('select (select count(*)::int from public.attempts) a, (select count(*)::int from public.competency_validations) v')).rows[0];
  ok('aucun résultat ni validation supprimés', after.a === before.a && after.v === before.v && after.v === 3, JSON.stringify([before, after]));
  ok('compétence de L1 toujours affichée', /Analyse des circuits/.test(await text(p, '.dash__side')) && /parcours précédent/.test(await text(p, '.dash__side')));
  await go(p, 'lecons');
  ok('L2 : ses modules, le prérequis et l’ancien module signalés', (await p.$$('.card[data-module=fibre]')).length === 1 && /Hors de votre parcours/.test(await text(p, '.card[data-module=analyse]')) && /Révision recommandée/.test(await text(p, '.card[data-module=signaux]')));
  await go(p, 'lecons/analyse/c2');
  ok('ancien module toujours consultable', /Thévenin et Norton/.test(await text(p, 'main h1')));
  await go(p, 'evaluations/final-analyse');
  ok('évaluation d’un ancien niveau refermée', /Hors de votre parcours/.test(await text(p, 'main h1')));
  await go(p, 'changer-parcours');
  ok('historique des parcours conservé', /Parcours choisi : Licence 1/.test(await text(p, 'main')) && /Licence 1 → Licence 2/.test(await text(p, 'main')));

  console.log('\nInscription directe en L3, avec positionnement');
  var d5 = await newPage(browser), l3 = d5.page;
  await login(l3, 'direct-l3@exemple.org', 'Direct L3');
  await waitHash(l3, '#/bienvenue');
  await l3.check('input[name=track][value=l3]'); await l3.check('#placement-ask'); await l3.click('#track-ok');
  await waitHash(l3, '#/evaluations');
  ok('L3 choisi directement, puis orientation vers les tests de positionnement', (await profileOf('direct-l3@exemple.org')).space === 'l3' && /Tests de positionnement/.test(await text(l3, 'main')));
  ok('L3 : évaluation ouverte sans les niveaux précédents', /^[0-9a-f-]{36}$/.test(await l3.evaluate(function () { return TCL.api.rpc('start_attempt', { p_assessment: 'final-numerique' }).then(function (r) { return r.attempt_id; }, function (e) { return e.message; }); })));
  await go(l3, 'changer-parcours');
  ok('changement de niveau proposé librement, Monde professionnel fermé', (await l3.$$('[data-move=preparatoire],[data-move=l1],[data-move=l2],[data-move=master]')).length === 4 && (await l3.$('[data-move=pro]')) === null);
  await d5.ctx.close();

  console.log('\nAnciens comptes');
  var d3 = await newPage(browser), v1 = d3.page;
  await login(v1, 'ancien@exemple.org', 'Ancien');
  await waitHash(v1, '#/bienvenue');
  var uid = await v1.evaluate(function () { return TCL.auth.state().user.id; });
  await S.db.db.query("update public.progress set data = $1, updated_at = now() where user_id = $2", [{ version: 1, updatedAt: '2026-11-01T00:00:00.000Z', lessons: { ip: { chapters: { c1: '2026-10-01T00:00:00.000Z' }, last: 'c1' } }, lab: {}, exercises: {}, activity: [], prefs: {} }, uid]);
  await v1.reload(); await waitHash(v1, '#/bienvenue');
  await v1.waitForSelector('input[name=track]', { timeout: 8000 });
  ok('compte V1 sans parcours : sélection demandée, sans réinscription', (await v1.$$('input[name=track]')).length === 5);
  await chooseTrack(v1, 'l1');
  await go(v1, 'progression');
  ok('compte V1 : progression préservée', /Chapitres lus ?1 \/ \d+/.test(await text(v1, '.kpis')), await text(v1, '.kpis'));
  await v1.reload(); await v1.waitForTimeout(800);
  ok('compte V1 : sélection plus jamais redemandée', (await hash(v1)) === '#/progression');

  console.log('\nPannes et sessions');
  var api = S.api + '/**';
  await d3.ctx.route(api, function (r) { r.abort(); });
  await v1.goto(S.site + '#/mon-espace'); await v1.reload(); await v1.waitForTimeout(1200);
  ok('service injoignable : parcours conservé, aucune nouvelle sélection, connexion maintenue', (await hash(v1)) === '#/mon-espace' && /Licence 1/.test(await text(v1, 'main')) && /Déconnexion/.test(await text(v1, '#nav-auth')), await text(v1, 'main'));
  ok('service injoignable : état hors ligne annoncé', /Hors ligne/.test(await text(v1, 'main')));
  await v1.evaluate(function () { var s = JSON.parse(localStorage.getItem('tcl.auth.session')); s.expires_at = Math.floor(Date.now() / 1000) - 3600; localStorage.setItem('tcl.auth.session', JSON.stringify(s)); });
  await v1.reload(); await v1.waitForTimeout(1200);
  ok('jeton expiré pendant la coupure : session et parcours conservés', /Déconnexion/.test(await text(v1, '#nav-auth')) && /Licence 1/.test(await text(v1, 'main')) && !!(await v1.evaluate(function () { return localStorage.getItem('tcl.auth.session'); })));
  await d3.ctx.unroute(api);
  await d3.ctx.route(api, function (r) { r.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"indisponible"}' }); });
  await v1.reload(); await v1.waitForTimeout(1200);
  ok('panne du service (503) : session, parcours et progression conservés', /Déconnexion/.test(await text(v1, '#nav-auth')) && (await hash(v1)) === '#/mon-espace' && /Licence 1/.test(await text(v1, 'main')));
  await d3.ctx.unroute(api);
  await v1.reload(); await v1.waitForTimeout(1200);
  ok('retour du service : session renouvelée automatiquement', /Déconnexion/.test(await text(v1, '#nav-auth')) && await v1.evaluate(function () { return !TCL.auth.state().offline && JSON.parse(localStorage.getItem('tcl.auth.session')).expires_at > Date.now() / 1000; }));
  var tokenCalls = 0;
  await d3.ctx.route('**/auth/v1/token**', function (r) { tokenCalls++; r.continue(); });
  var tokens = await v1.evaluate(function () {
    var real = Date.now;
    Date.now = function () { return real() + 7200000; };
    return Promise.all([1, 2, 3, 4, 5].map(function () { return TCL.auth.getAccessToken(); })).then(function (t) { Date.now = real; return t; }, function (e) { Date.now = real; return e.message; });
  });
  await d3.ctx.unroute('**/auth/v1/token**');
  ok('renouvellements simultanés : une seule demande, la session survit', Array.isArray(tokens) && new Set(tokens).size === 1 && tokenCalls === 1 && /Déconnexion/.test(await text(v1, '#nav-auth')), JSON.stringify([tokens, tokenCalls]));
  var before2 = await v1.evaluate(function () { return Object.keys(localStorage).filter(function (k) { return /^tcl\.progress\.u\./.test(k); }).length; });
  await v1.evaluate(function () { var s = JSON.parse(localStorage.getItem('tcl.auth.session')); s.access_token = 'faux'; s.refresh_token = 'faux'; s.expires_at = Math.floor(Date.now() / 1000) - 10; localStorage.setItem('tcl.auth.session', JSON.stringify(s)); });
  await v1.reload(); await v1.waitForTimeout(1000);
  ok('session réellement invalide : retour au public avec un message, progression locale conservée', await v1.isVisible('#nav-auth >> text=Créer un compte') && /session a expiré/.test(await text(v1, '#toast-host')) && before2 === 1 && (await v1.evaluate(function () { return Object.keys(localStorage).filter(function (k) { return /^tcl\.progress\.u\./.test(k); }).length; })) === 1, await text(v1, '#toast-host'));

  console.log('\nProgression réalisée sans compte (V1)');
  var d4 = await newPage(browser), g4 = d4.page;
  await go(g4, '');
  await g4.evaluate(function () { localStorage.setItem('tcl.progress.guest', JSON.stringify({ version: 1, updatedAt: '2026-10-01T00:00:00.000Z', lessons: { signaux: { chapters: { c1: '2026-10-01T00:00:00.000Z' } } }, lab: {}, exercises: {}, activity: [{ id: 'a', at: '2026-10-01T00:00:00.000Z', type: 'lesson', module: 'signaux', text: 'Chapitre lu' }], prefs: {} })); });
  await g4.reload(); await g4.waitForTimeout(300);
  await go(g4, 'progression');
  ok('progression locale annoncée au visiteur, réelle', /conserve une progression/.test(await text(g4, 'main')));
  await login(g4, 'invite@exemple.org', 'Invite');
  await chooseTrack(g4, 'l1');
  await go(g4, 'progression');
  ok('elle rejoint le compte à l’inscription', /Chapitres lus ?1 \/ \d+/.test(await text(g4, '.kpis')));

  console.log('\nAdministration');
  var d5 = await newPage(browser), a = d5.page;
  await login(a, 'admin@local.test', 'Admin');
  await a.waitForSelector('#nav-list [data-nav=admin]', { timeout: 8000 });
  ok('administrateur sans parcours : menu Administration visible', await a.isVisible('#nav-list [data-nav=admin]'));
  await a.click('#nav-list [data-nav=admin]'); await waitHash(a, '#/admin'); await a.waitForTimeout(500);
  ok('menu Administration : rubrique active sur la page', /is-active/.test(await a.getAttribute('#nav-list [data-nav=admin]', 'class') || ''));
  ok('administration accessible avant le choix du parcours', (await a.$$('#adm .stat')).length === 8, await text(a, '#adm'));
  await a.click('[data-tab=users]'); await a.waitForTimeout(400);
  ok('parcours des comptes visible', /Licence 2/.test(await text(a, '#adm')));
  for (var t of ['pro', 'exams', 'reviews', 'content', 'ai', 'errors']) { await a.click('[data-tab=' + t + ']'); await a.waitForTimeout(350); }
  ok('tous les onglets s’ouvrent sans erreur', !/callout--error/.test(await a.innerHTML('#adm')));
  await go(q, 'admin');
  ok('un étudiant est refusé, sans menu Administration', /Accès réservé/.test(await text(q, 'main')) && (await q.$('#nav-list [data-nav=admin]')) === null);
  await go(a, 'bienvenue');
  await chooseTrack(a, 'l1');
  ok('administrateur avec parcours : menu Administration conservé', (await a.$$('#nav-list [data-nav=admin]')).length === 1);
  var aw = [];
  for (var avw of [1101, 1280, 1440]) {
    await a.setViewportSize({ width: avw, height: 800 }); await a.goto(S.site + '#/admin'); await a.waitForTimeout(300);
    var adw = await a.evaluate(function () { var b = document.querySelector('#nav-auth').lastElementChild.getBoundingClientRect(); return Math.max(document.documentElement.scrollWidth - window.innerWidth, Math.ceil(b.right - window.innerWidth)); });
    if (adw > 0) aw.push(avw + ':' + adw);
  }
  await a.setViewportSize({ width: 1280, height: 800 });
  ok('en-tête administrateur complet de 1101 à 1440 px', aw.length === 0, aw.join(' '));

  console.log('\nAffichage');
  var m1 = await browser.newContext({ viewport: { width: 360, height: 700 }, deviceScaleFactor: 2, isMobile: true });
  var mp = await m1.newPage(); var over = [];
  for (var r of ['', 'lecons', 'lecons/decouverte', 'laboratoire/decouverte', 'defis/decouverte', 'progression', 'connexion']) {
    await mp.goto(S.site + '#/' + r); await mp.waitForTimeout(300);
    var w = await mp.evaluate(function () { return document.documentElement.scrollWidth - window.innerWidth; });
    if (w > 1) over.push(r + ':' + w);
  }
  await mp.goto(S.site + '#/'); await mp.waitForTimeout(300); await shot(mp, '10-mobile-accueil');
  await login(mp, 'mobile@exemple.org', 'Mobile');
  await waitHash(mp, '#/bienvenue');
  var ww = await mp.evaluate(function () { return document.documentElement.scrollWidth - window.innerWidth; });
  if (ww > 1) over.push('bienvenue:' + ww);
  await shot(mp, '11-mobile-choix');
  await chooseTrack(mp, 'pro', 'pro-fibre');
  ok('demande professionnelle : compte en L1, aucun droit avant l’approbation', (await profileOf('mobile@exemple.org')).space === 'l1' && (await S.db.db.query("select pro_status from public.profiles p join auth.users u on u.id = p.id where u.email = 'mobile@exemple.org'")).rows[0].pro_status === 'pending');
  await go(mp, 'changer-parcours');
  ok('demande professionnelle affichée en attente, Monde professionnel fermé', /en attente de validation/.test(await text(mp, '#pro-pending')) && (await mp.$('[data-move=pro]')) === null && (await mp.$('[data-move=master]')) !== null);
  await go(a, 'admin'); await a.click('[data-tab=pro]'); await a.waitForSelector('#adm tr[data-id]', { timeout: 5000 });
  ok('administration : demande listée avec sa spécialisation', /mobile@exemple\.org/.test(await text(a, '#adm')) && /fibre/i.test(await text(a, '#adm')), await text(a, '#adm'));
  a.once('dialog', function (x) { x.accept(); });
  await a.click('#adm tr:has-text("mobile@exemple.org") [data-pro="1"]');
  await a.waitForFunction(function () { return !/mobile@exemple/.test(document.querySelector('#adm').textContent); }, null, { timeout: 5000 });
  await mp.reload(); await mp.waitForTimeout(800);
  ok('approbation : Monde professionnel et spécialisation demandée', (await profileOf('mobile@exemple.org')).specialization === 'pro-fibre' && (await profileOf('mobile@exemple.org')).space === 'pro');
  await go(mp, 'changer-parcours');
  ok('professionnel approuvé : tous les niveaux proposés', (await mp.$$('[data-move=preparatoire],[data-move=l1],[data-move=l2],[data-move=l3],[data-move=master],[data-move=pro]')).length === 6);
  await go(mp, 'mon-espace');
  await go(mp, 'lecons');
  var pm = (await mp.$$eval('.card[data-module]', function (x) { return x.map(function (y) { return y.getAttribute('data-module'); }); })).sort().join(',');
  ok('spécialisation : uniquement ses modules et leurs bases', pm === 'chaine,fibre,ondes-em,qualite,signaux', pm);
  for (var s of ['mon-espace', 'parcours', 'changer-parcours', 'lecons', 'laboratoire', 'defis', 'evaluations', 'progression', 'compte']) {
    await mp.goto(S.site + '#/' + s); await mp.waitForTimeout(300);
    var w2 = await mp.evaluate(function () { return document.documentElement.scrollWidth - window.innerWidth; });
    if (w2 > 1) over.push(s + ':' + w2);
  }
  await go(mp, 'mon-espace'); await shot(mp, '12-mobile-tableau');
  ok('aucun débordement horizontal à 360 px', over.length === 0, over.join(' '));
  var wide = [];
  for (var pair of [[g4, 'mon-espace'], [await (await browser.newContext()).newPage(), '']]) {
    for (var vw of [1101, 1200, 1280, 1360, 1440, 1920]) {
      await pair[0].setViewportSize({ width: vw, height: 800 }); await pair[0].goto(S.site + '#/' + pair[1]); await pair[0].waitForTimeout(250);
      var dw = await pair[0].evaluate(function () { var b = document.querySelector('#nav-auth').lastElementChild.getBoundingClientRect(); return Math.max(document.documentElement.scrollWidth - window.innerWidth, Math.ceil(b.right - window.innerWidth)); });
      if (dw > 0) wide.push(pair[1] + vw + ':' + dw);
    }
  }
  ok('en-tête complet de 1101 à 1920 px, visiteur et étudiant', wide.length === 0, wide.join(' '));

  console.log('\nAssistant : fournisseur de TEST (jamais utilisé en production)');
  S.close();
  await new Promise(function (r) { setTimeout(r, 200); });
  var calls = [];
  S = await dev.start({ sitePort: 8792, apiPort: 54392, provider: { name: 'test', send: function (sys, msgs) { calls.push({ sys: sys, msgs: msgs }); return Promise.resolve({ text: '[RÉPONSE DE TEST]', truncated: false, refused: false, usage: { inputTokens: 100, outputTokens: 50, costUsd: 0.01 } }); } } });
  var c3 = await newPage(browser), ai = c3.page;
  await login(ai, 'ia@exemple.org', 'IA');
  await chooseTrack(ai, 'l2');
  await go(ai, 'assistant/fibre?chapitre=c1'); await ai.waitForSelector('#ai-input', { timeout: 15000 });
  ok('assistant : envoi impossible sans confirmation des conditions', await ai.$eval('#ai-input', function (e) { return e.disabled; }));
  await ai.check('#ai-consent'); await ai.waitForTimeout(100);
  await ai.click('[data-mode=hint]');
  await ai.fill('#ai-input', 'Comment calculer l’angle critique ?');
  await ai.click('#ai-send'); await ai.waitForSelector('.bubble--bot:not(:has(.spinner))');
  ok('la question atteint la passerelle, le niveau de l’étudiant est transmis', /RÉPONSE DE TEST/.test(await text(ai, '.bubble--bot')) && /Licence 2/.test(calls[0].sys) && /Fibre optique/.test(calls[0].sys), calls[0] && calls[0].sys);
  ok('le contenu du chapitre et le parcours sont transmis', /Extrait du cours/.test(calls[0].sys) && /Parcours : Licence 2/.test(calls[0].sys), calls[0] && calls[0].sys);
  await go(ai, 'evaluations/final-signaux'); await ai.click('#start'); await ai.waitForSelector('#eform');
  var st = await ai.evaluate(async function () { var r = await TCL.api.tutor({ messages: [{ role: 'user', content: 'aide' }] }); return r.res.status; });
  ok('pendant l’examen, le serveur bloque l’assistant', st === 403 && calls.length === 1, st);

  console.log('\nHors ligne (dossier www construit)');
  S.close();
  await new Promise(function (r) { setTimeout(r, 200); });
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, '../tools/build-www.js')]);
  S = await dev.start({ sitePort: 8793, apiPort: 54393, webRoot: path.join(__dirname, '../www') });
  var c4 = await newPage(browser), o = c4.page;
  await o.goto(S.site); await o.waitForTimeout(500);
  await o.evaluate(function () { return navigator.serviceWorker.ready; });
  await o.waitForTimeout(1500);
  var cached = function () { return o.evaluate(async function () { var k = await caches.keys(); var c = await caches.open(k[0]); return !!(await c.match('modules/fibre/lesson.js')); }); };
  ok('visiteur : le catalogue n’est pas mis en cache', !(await cached()));
  await login(o, 'offline@exemple.org', 'Offline');
  await chooseTrack(o, 'l2');
  await o.waitForFunction(function () { var s = TCL.access.scope(), f = []; s.core.concat(s.prerequisites).forEach(function (id) { f = f.concat(TCL.content.filesOf(id)); }); return Promise.all(f.map(function (u) { return caches.match(u); })).then(function (r) { return r.every(Boolean); }); }, null, { timeout: 20000 });
  // Choix direct de la L2 : la mise en cache se termine juste après l'inscription.
  for (var w = 0; w < 40 && !(await cached()); w++) await o.waitForTimeout(250);
  ok('étudiant : le catalogue est disponible hors ligne', await cached());
  await c4.ctx.setOffline(true);
  await o.reload(); await o.waitForTimeout(1200);
  ok('hors ligne : réouverture sur son espace, parcours conservé', (await hash(o)) === '#/mon-espace' && /Licence 2/.test(await text(o, 'main')), await text(o, 'main'));
  await o.goto(S.site + '#/lecons/fibre/c2'); await o.waitForTimeout(500);
  ok('hors ligne : les leçons du parcours s’ouvrent', /Réfraction/.test(await text(o, 'main h1')), await text(o, 'main h1'));
  await o.goto(S.site + '#/laboratoire/fibre'); await o.waitForTimeout(500);
  ok('hors ligne : les simulations fonctionnent', (await o.$$('.lab__controls')).length === 1);
  await c4.ctx.setOffline(false);

  var www = require('fs').readdirSync(path.join(__dirname, '../www'));
  ok('www ne contient ni banque de questions, ni SQL, ni outils', ['content', 'supabase', 'tests', 'tools'].every(function (x) { return www.indexOf(x) < 0; }));
  ok('aucune erreur JavaScript ni violation CSP', errs.length === 0, errs.join(' | '));
  await browser.close(); S.close();
  var bad = results.filter(function (x) { return !x; }).length;
  console.log('\n' + (results.length - bad) + ' / ' + results.length + ' vérifications réussies.');
  process.exit(bad ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
