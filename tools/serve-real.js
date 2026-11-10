#!/usr/bin/env node
/*
 * Sert le site en local avec le vrai config.js (clé publique), pour tester de vrais e-mails
 * sans publier sur Netlify. Se connecte au VRAI projet Supabase : les comptes créés sont réels.
 */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..'), PORT = Number(process.env.PORT) || 8090;
var TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
var PUBLIC = /^\/(index\.html|style\.css|style-v2\.css|script\.js|config\.js|version\.js|(auth|core|modules|pages|assets)\/)/;
http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  var f = path.join(ROOT, p);
  if (!PUBLIC.test(p) || f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, function () { console.log('Site avec le VRAI Supabase : http://localhost:' + PORT + '  (Ctrl+C pour arrêter)'); });
