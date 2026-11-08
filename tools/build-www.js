#!/usr/bin/env node
/*
 * Construit le dossier www (site web et application Capacitor).
 * LISTE BLANCHE : seuls ces éléments sont publiés. content/, supabase/, tests/
 * et tools/ — donc les corrigés des évaluations — n'y entrent jamais.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var ROOT = path.join(__dirname, '..');
var OUT = path.join(ROOT, 'www');
var PUBLIC = ['index.html', 'style.css', 'style-v2.css', 'script.js', 'config.js', 'version.js', 'auth', 'core', 'modules', 'pages', 'assets'];
var pkg = require('../package.json');

function copy(rel) {
  var src = path.join(ROOT, rel), dst = path.join(OUT, rel);
  if (fs.statSync(src).isDirectory()) { fs.readdirSync(src).forEach(function (f) { copy(path.join(rel, f)); }); return; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (f) { var p = path.join(dir, f); if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p); });
  return out;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
PUBLIC.forEach(copy);
fs.writeFileSync(path.join(OUT, 'version.js'), 'window.TCL_BUILD = { version: ' + JSON.stringify(pkg.version) + ', sw: true };\n');

var files = walk(OUT, []).map(function (f) { return path.relative(OUT, f).split(path.sep).join('/'); }).filter(function (f) { return !/\.png$/.test(f); });
var hash = crypto.createHash('sha256');
files.sort().forEach(function (f) { hash.update(f); hash.update(fs.readFileSync(path.join(OUT, f))); });
var version = hash.digest('hex').slice(0, 12);

/*
 * Service worker : un visiteur ne met en cache que l'application et la démonstration ;
 * les modules du parcours s'y ajoutent au chargement, puis restent disponibles
 * hors ligne, y compris après une mise à jour de l'application.
 */
var html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
var inPage = {};
(html.match(/<script src="[^"]+"/g) || []).forEach(function (m) { inPage[m.slice(13, -1)] = 1; });
var isContent = function (f) { return /^modules\/(?!registry\.js)/.test(f) && !inPage[f]; };
var core = files.filter(function (f) { return !isContent(f); });
var content = files.filter(isContent);
fs.writeFileSync(path.join(OUT, 'sw.js'), [
  "var CACHE = 'tcl-" + version + "';",
  'var CORE = ' + JSON.stringify(['./'].concat(core)) + ';',
  'var CONTENT = ' + JSON.stringify(content) + ';',
  "function refreshCached(c) { return caches.keys().then(function (ks) { var old = ks.filter(function (k) { return k !== CACHE; }); return Promise.all(CONTENT.map(function (f) { return Promise.all(old.map(function (k) { return caches.open(k).then(function (o) { return o.match(f); }); })).then(function (r) { return r.some(Boolean) ? c.add(f).catch(function () {}) : null; }); })); }); }",
  "self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE).then(function () { return refreshCached(c); }); }).then(function () { return self.skipWaiting(); })); });",
  "self.addEventListener('message', function (e) { if (e.data && e.data.keep) e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(e.data.keep.map(function (f) { return c.match(f).then(function (hit) { return hit || c.add(f).catch(function () {}); }); })); })); });",
  "self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });",
  "self.addEventListener('fetch', function (e) { var u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin) return; e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || fetch(e.request).then(function (res) { if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); } return res; }); })); });",
  ''
].join('\n'));

var forbidden = walk(OUT, []).filter(function (f) { return /assessments\.generated|content[\\/]assessments|supabase|bank\.js/.test(path.relative(OUT, f)); });
if (forbidden.length) throw new Error('Fichiers interdits dans www : ' + forbidden.join(', '));
console.log('www construit : ' + files.length + ' fichiers, cache ' + version);
