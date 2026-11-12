/*
 * Base PostgreSQL locale (WASM, en mémoire) pour les tests et le mode découverte.
 * Rejoue les VRAIS fichiers SQL du projet. N'atteint jamais le service Supabase.
 * Seuls auth.users, auth.uid() et les rôles — fournis en production par Supabase —
 * sont reproduits ici.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');

var STUB = [
  "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;",
  "create schema auth; grant usage on schema auth to anon, authenticated, service_role;",
  "create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());",
  "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid $$;",
  "grant usage on schema public to anon, authenticated, service_role;",
  // Droits par défaut d'un projet Supabase : chaque migration doit retirer ce qu'elle n'ouvre pas.
  "alter default privileges in schema public grant all on tables to anon, authenticated, service_role;",
  "alter default privileges in schema public grant all on functions to anon, authenticated, service_role;",
  "alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;"
].join('\n');

async function create(options) {
  var { PGlite } = await import('@electric-sql/pglite');
  var db = new PGlite();
  await db.exec(STUB);
  await db.exec(fs.readFileSync(path.join(ROOT, 'supabase/schema.sql'), 'utf8'));
  if (options && options.beforeMigration) await options.beforeMigration(db);
  await db.exec(fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261108000100_v2_core.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261108000200_v2_tracks.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261110000100_v2_pro_access.sql'), 'utf8'));
  await db.exec(require('./generate-assessments.js').sql(require('./generate-assessments.js').assessments()));
  // Ordre réel du projet : la sécurisation s'applique sur une base déjà remplie.
  await db.exec(fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261110000200_v2_access_hardening.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261111000100_v2_level_choice.sql'), 'utf8'));

  /** Exécute une requête avec l'identité d'un utilisateur, comme le ferait l'API. */
  async function as(userId, role, fn) {
    return db.transaction(async function (tx) {
      var claims = JSON.stringify(userId ? { sub: userId, role: role } : { role: role });
      await tx.query("select set_config('request.jwt.claims', $1, true)", [claims]);
      await tx.exec('set local role ' + role);
      return fn(tx);
    });
  }

  async function rpc(userId, name, args, role) {
    if (!/^[a-z_]+$/.test(name)) throw new Error('nom invalide');
    var keys = Object.keys(args || {});
    var sql = 'select to_jsonb(public.' + name + '(' + keys.map(function (k, i) { return k + ' => $' + (i + 1); }).join(', ') + ')) as r';
    return as(userId, role || 'authenticated', async function (tx) {
      var res = await tx.query(sql, keys.map(function (k) { return args[k]; }));
      return res.rows[0] ? res.rows[0].r : null;
    });
  }

  async function createUser(email, name) {
    var r = await db.query('insert into auth.users (email, raw_user_meta_data) values ($1, $2) on conflict (email) do update set email = excluded.email returning id', [email, { full_name: name || '' }]);
    return r.rows[0].id;
  }

  return { db: db, as: as, rpc: rpc, createUser: createUser };
}

module.exports = { create: create };
