#!/usr/bin/env node
/*
 * Génère docs/CATALOGUE.md à partir du contenu réellement chargé dans Chromium :
 * le catalogue publié ne peut donc pas diverger de ce document.
 */
'use strict';
var path = require('path'), fs = require('fs'), http = require('http');
var { chromium } = require('playwright');
var bank = require('../content/assessments/bank.js');
var cur = require('../core/curriculum.js');
var gen = require('./generate-assessments.js');
var ROOT = path.join(__dirname, '..'), PORT = 8781;
var T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml' };

(async function () {
  var site = http.createServer(function (q, s) { var p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; var f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
  await new Promise(function (r) { site.listen(PORT, r); });
  var b = await chromium.launch(), c = await b.newContext();
  await c.route('**/config.js', function (r) { r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.TCL_CONFIG={supabaseUrl:"",supabaseAnonKey:"",siteUrl:""};' }); });
  var p = await c.newPage();
  await p.goto('http://localhost:' + PORT + '/#/lecons');
  await p.waitForFunction(function () { return window.TCL && TCL.content && TCL.content.ready(); }, null, { timeout: 30000 });
  var data = await p.evaluate(function () {
    var R = TCL.registry;
    return { domains: R.domains, categories: R.categories, modules: R.modules.map(function (m) { return { id: m.id, category: m.category, title: m.title, chapters: TCL.lessons[m.id].chapters.map(function (x) { return x.title; }), lab: TCL.labs[m.id].title, missions: TCL.labs[m.id].missions.map(function (x) { return x.title; }), ex: TCL.exercises[m.id].count, declarative: !!TCL.labs[m.id].def }; }), extras: R.extraLabs.map(function (x) { return { title: TCL.labs[x.id].title, parent: R.byId(x.parent).title, missions: TCL.labs[x.id].missions.map(function (y) { return y.title; }) }; }) };
  });
  await b.close(); site.close();

  var by = {}; data.modules.forEach(function (m) { by[m.id] = m; });
  var assess = gen.assessments(), L = [];
  var sum = function (f) { return data.modules.reduce(function (n, m) { return n + f(m); }, 0); };
  L.push('# Catalogue pédagogique — TELECOM CONNECT LAB 2.0', '', 'Document généré par `node tools/catalogue-report.js` à partir du contenu réellement chargé.', '');
  L.push('| Élément | Nombre |', '|---|---|', '| Modules | ' + data.modules.length + ' |', '| Chapitres de leçon | ' + sum(function (m) { return m.chapters.length; }) + ' |', '| Laboratoires interactifs | ' + (data.modules.length + data.extras.length) + ' (' + data.extras.length + ' complémentaires) |', '| Missions de laboratoire | ' + (sum(function (m) { return m.missions.length; }) + data.extras.reduce(function (n, x) { return n + x.missions.length; }, 0)) + ' |', '| Exercices et défis corrigés | ' + sum(function (m) { return m.ex; }) + ' |', '| Évaluations serveur | ' + assess.length + ' |', '| Questions d’évaluation | ' + assess.reduce(function (n, a) { return n + a.questions.length; }, 0) + ' (les tests de positionnement réutilisent des questions de modules) |', '');
  L.push('## Leçons par parcours', '');
  cur.spaces.forEach(function (s) {
    L.push('### ' + s.title, '');
    var tm = cur.trackModules(s.id, null);
    L.push(s.id === 'pro' ? 'Ensemble des métiers : ' + tm.core.length + ' modules. Chaque métier est compté ci-dessous.' : tm.core.length + ' modules du parcours' + (tm.prerequisites.length ? ' + ' + tm.prerequisites.length + ' bases à consolider venant d’autres niveaux.' : '.'), '');
    s.courses.forEach(function (co) { L.push('- **' + co.title + '** : ' + co.modules.map(function (m) { return by[m].title + ' (' + by[m].chapters.length + ' chapitres)'; }).join(' ; ') + (s.id === 'pro' ? ' — ' + cur.trackModules('pro', co.id).core.length + ' modules + ' + cur.trackModules('pro', co.id).prerequisites.length + ' bases' : '')); });
    L.push('');
  });
  L.push('## Modules, leçons et laboratoires par domaine', '');
  data.domains.forEach(function (d) {
    L.push('### ' + d.title, '');
    data.categories.filter(function (c) { return c.domain === d.id; }).forEach(function (cat) {
      data.modules.filter(function (m) { return m.category === cat.id; }).forEach(function (m) {
        L.push('#### ' + m.title + (m.declarative ? '' : ' (module V1 conservé)'), '', '- Chapitres : ' + m.chapters.join(' ; ') + '.', '- Laboratoire : ' + m.lab + '. Missions : ' + m.missions.join(' ; ') + '.', '- Exercices : ' + m.ex + '. Évaluation : ' + bank[m.id].length + ' questions à variantes, corrigées par le serveur.', '');
      });
    });
  });
  L.push('## Laboratoires complémentaires', '');
  data.extras.forEach(function (x) { L.push('- ' + x.title + ' (module ' + x.parent + '). Missions : ' + x.missions.join(' ; ') + '.'); });
  L.push('', '## Évaluations de positionnement', '');
  cur.placements.forEach(function (x) { L.push('- ' + x.title + ' : ' + x.grants.map(function (g) { return cur.competencies[g].title; }).join(', ') + '.'); });
  L.push('');
  fs.writeFileSync(path.join(ROOT, 'docs', 'CATALOGUE.md'), L.join('\n'));
  console.log('docs/CATALOGUE.md : ' + data.modules.length + ' modules');
})().catch(function (e) { console.error(e); process.exit(1); });
