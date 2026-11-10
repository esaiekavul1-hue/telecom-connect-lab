/*
 * TELECOM CONNECT LAB 2.0 — Administration.
 * Cette page n'est qu'une interface : chaque action est vérifiée par le serveur.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc, P = TCL.pages, O = TCL.official, A = TCL.api, CUR = TCL.curriculum;

  var PRO_LABEL = { pending: 'demande pro en attente', approved: 'professionnel approuvé', rejected: 'demande pro refusée', legacy: 'pro à vérifier' };
  var TABS = [['stats', 'Vue d’ensemble'], ['users', 'Utilisateurs'], ['pro', 'Accès professionnels'], ['exams', 'Évaluations'], ['reviews', 'Supervision'], ['content', 'Parcours'], ['ai', 'Assistant IA'], ['errors', 'Incidents']];

  function render(main) {
    if (!O.isAdmin()) {
      main.innerHTML = '<div class="container page page--narrow"><div class="empty">' + I('lock', 'empty__icon') + '<h1 tabindex="-1">Accès réservé</h1><p>Cette page est réservée à l’administration de la plateforme.</p><p><a class="btn btn--primary" href="#/mon-espace">Retour à mon espace</a></p></div></div>';
      return;
    }
    var gone = false, tab = 'stats';
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Administration' }]) + P.head('Administration', 'Gérez la plateforme. Chaque modification sensible est tracée.') +
      '<div class="tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" class="tab" data-tab="' + t[0] + '">' + esc(t[1]) + '</button>'; }).join('') + '</div><div id="adm" role="tabpanel"></div></div>';
    var host = U.qs('#adm', main);
    function loading() { host.innerHTML = '<p class="loading"><span class="spinner" aria-hidden="true"></span>Chargement…</p>'; }
    function fail(e) { if (!gone) host.innerHTML = '<div class="callout callout--error"><p>' + esc(e.message) + '</p></div>'; }
    function act(p, ok) { return p.then(function () { if (ok) U.toast(ok, 'success'); }).catch(function (e) { U.toast(e.message, 'error'); throw e; }); }
    function table(heads, rows) { return '<div class="table-wrap"><table class="data-table data-table--compact"><thead><tr>' + heads.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>'; }

    var views = {
      stats: function () {
        return A.rpc('admin_stats').then(function (s) {
          host.innerHTML = '<div class="stats">' + [[s.users, 'comptes'], [s.active_7d, 'actifs sur 7 jours'], [s.attempts, 'tentatives corrigées'], [(s.pass_rate == null ? '—' : s.pass_rate + ' %'), 'taux de réussite'], [s.validations, 'validations'], [s.pending_reviews, 'supervisions en attente'], [s.errors_24h, 'incidents sur 24 h'], [Number(s.ai_cost_month).toFixed(2) + ' $', 'coût IA ce mois-ci']].map(function (x) { return '<div class="stat"><p class="stat__v">' + esc(x[0]) + '</p><p class="stat__l">' + esc(x[1]) + '</p></div>'; }).join('') + '</div>';
        });
      },
      users: function () {
        host.innerHTML = '<form id="u-f" class="inline-form"><label for="u-q" class="sr-only">Recherche</label><input id="u-q" placeholder="Nom ou e-mail"><button class="btn btn--ghost btn--sm">Chercher</button></form><div id="u-r"></div>';
        function load() {
          return A.rpc('admin_list_users', { p_search: U.qs('#u-q', host).value.trim(), p_limit: 50, p_offset: 0 }).then(function (list) {
            U.qs('#u-r', host).innerHTML = list.length ? table(['Compte', 'Nom', 'Parcours', 'Rôle', 'Validations', 'Tentatives', 'Dernière synchro'], list.map(function (u) {
              return '<tr><td>' + esc(u.email) + '</td><td>' + esc(u.display_name || '') + '</td><td>' + esc(u.space ? CUR.trackLabel(u.space, u.specialization || null) : '—') + (u.pro_status ? ' <span class="muted">· ' + esc(PRO_LABEL[u.pro_status] || u.pro_status) + '</span>' : '') + '</td><td><select data-role="' + u.id + '" aria-label="Rôle de ' + esc(u.email) + '">' + ['student', 'teacher', 'admin'].map(function (r) { return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + ({ student: 'Étudiant', teacher: 'Enseignant', admin: 'Administrateur' })[r] + '</option>'; }).join('') + '</select></td><td>' + u.validations + '</td><td>' + u.attempts + '</td><td>' + (u.last_sync ? esc(U.formatWhen(u.last_sync)) : '—') + '</td></tr>';
            })) : '<p class="muted">Aucun compte trouvé.</p>';
            U.qsa('[data-role]', host).forEach(function (s) {
              var prev = s.value;
              s.addEventListener('change', function () {
                if (!root.confirm('Changer le rôle de ce compte ?')) { s.value = prev; return; }
                act(A.rpc('admin_set_role', { p_user: s.getAttribute('data-role'), p_role: s.value }), 'Rôle mis à jour.').then(function () { prev = s.value; }).catch(function () { s.value = prev; });
              });
            });
          });
        }
        U.qs('#u-f', host).addEventListener('submit', function (e) { e.preventDefault(); load().catch(fail); });
        return load();
      },
      pro: function () {
        return A.rpc('admin_list_pro_requests').then(function (list) {
          host.innerHTML = '<p class="muted">Demandes en attente et anciens comptes inscrits directement en professionnel. Approuver ouvre le Monde professionnel et tous les niveaux. Refuser ramène le compte au plus haut niveau dont il a validé l’entrée. Aucun résultat n’est supprimé.</p>' +
            (list.length ? table(['Compte', 'Statut', 'Spécialisation', 'Expérience déclarée', 'Parcours actuel', 'Validations', 'Date', ''], list.map(function (r) {
              return '<tr data-id="' + r.id + '"><td>' + esc(r.email) + (r.display_name ? '<br><span class="muted">' + esc(r.display_name) + '</span>' : '') + '</td><td>' + (r.pro_status === 'legacy' ? 'Ancien compte, à vérifier' : 'Demande en attente') + '</td><td>' + esc(CUR.trackLabel('pro', r.pro_specialization || null)) + '</td><td>' + esc(r.pro_message || '—') + '</td><td>' + esc(r.space ? CUR.trackLabel(r.space, r.specialization || null) : '—') + '</td><td>' + r.validations + '</td><td>' + esc(U.formatWhen(r.pro_requested_at || r.created_at)) + '</td><td><button class="btn btn--primary btn--sm" data-pro="1">Approuver</button> <button class="btn btn--danger btn--sm" data-pro="0">Refuser</button></td></tr>';
            })) : '<p class="muted">Aucune demande à examiner.</p>');
          U.qsa('[data-pro]', host).forEach(function (b) {
            b.addEventListener('click', function () {
              var yes = b.getAttribute('data-pro') === '1';
              if (!root.confirm(yes ? 'Approuver l’accès professionnel de ce compte ?' : 'Refuser l’accès professionnel de ce compte ?')) return;
              act(A.rpc('admin_decide_pro', { p_user: b.closest('tr').getAttribute('data-id'), p_approve: yes, p_note: null }), 'Décision enregistrée.').then(views.pro).catch(function () {});
            });
          });
        });
      },
      exams: function () {
        return A.select('assessments?select=*&order=id').then(function (list) {
          host.innerHTML = table(['Évaluation', 'Statut', 'Questions', 'Seuil %', 'Durée (min)', 'Tentatives max', 'Délai (min)', 'Supervision', ''], list.map(function (a) {
            return '<tr data-id="' + a.id + '"><td>' + esc(a.title) + '</td><td><select data-k="status">' + ['draft', 'published', 'archived'].map(function (s) { return '<option' + (a.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td><td><input data-k="question_count" type="number" min="1" value="' + a.question_count + '"></td><td><input data-k="pass_percent" type="number" min="0" max="100" value="' + Number(a.pass_percent) + '"></td><td><input data-k="duration" type="number" min="1" value="' + (a.duration_seconds ? Math.round(a.duration_seconds / 60) : '') + '"></td><td><input data-k="max_attempts" type="number" min="1" value="' + (a.max_attempts || '') + '"></td><td><input data-k="cooldown_minutes" type="number" min="0" value="' + a.cooldown_minutes + '"></td><td><input data-k="requires_proctor" type="checkbox" aria-label="Supervision"' + (a.requires_proctor ? ' checked' : '') + '></td><td><button class="btn btn--ghost btn--sm" data-save>Enregistrer</button> <button class="btn btn--ghost btn--sm" data-q>Questions</button></td></tr>';
          })) + '<div id="q-list"></div>';
          U.qsa('[data-save]', host).forEach(function (b) {
            b.addEventListener('click', function () {
              var tr = b.closest('tr'), v = function (k) { return tr.querySelector('[data-k=' + k + ']'); }, num = function (k) { return v(k).value === '' ? null : Number(v(k).value); };
              act(A.rpc('admin_update_assessment', { p_id: tr.getAttribute('data-id'), p_patch: { status: v('status').value, question_count: num('question_count'), pass_percent: num('pass_percent'), duration_seconds: num('duration') == null ? null : num('duration') * 60, max_attempts: num('max_attempts'), cooldown_minutes: num('cooldown_minutes') || 0, requires_proctor: v('requires_proctor').checked } }), 'Évaluation mise à jour.').then(function () { O.refresh(); }).catch(function () {});
            });
          });
          U.qsa('[data-q]', host).forEach(function (b) {
            b.addEventListener('click', function () {
              var id = b.closest('tr').getAttribute('data-id');
              A.rpc('admin_list_questions', { p_assessment: id }).then(function (qs) {
                var box = U.qs('#q-list', host);
                box.innerHTML = '<h2 class="h-sub">Banque : ' + esc(id) + '</h2>' + table(['Question', 'Compétence', 'Type', 'Variantes', 'Active'], qs.map(function (q) { return '<tr><td>' + esc(q.id) + '</td><td>' + esc(q.skill) + '</td><td>' + esc(q.kind) + '</td><td>' + q.variant_count + '</td><td><input type="checkbox" data-qa="' + esc(q.id) + '" aria-label="Activer ' + esc(q.id) + '"' + (q.active ? ' checked' : '') + '></td></tr>'; }));
                U.qsa('[data-qa]', box).forEach(function (c) { c.addEventListener('change', function () { act(A.rpc('admin_set_question_active', { p_id: c.getAttribute('data-qa'), p_active: c.checked }), 'Question mise à jour.').catch(function () { c.checked = !c.checked; }); }); });
              }).catch(function (e) { U.toast(e.message, 'error'); });
            });
          });
        });
      },
      reviews: function () {
        return A.rpc('admin_pending_reviews').then(function (list) {
          host.innerHTML = list.length ? table(['Compte', 'Évaluation', 'Score', 'Date', ''], list.map(function (r) { return '<tr data-id="' + r.id + '"><td>' + esc(r.email) + '</td><td>' + esc(r.title) + '</td><td>' + Number(r.percent) + ' %</td><td>' + esc(U.formatWhen(r.submitted_at)) + '</td><td><button class="btn btn--primary btn--sm" data-ok="1">Approuver</button> <button class="btn btn--danger btn--sm" data-ok="0">Rejeter</button></td></tr>'; })) : '<p class="muted">Aucune supervision en attente.</p>';
          U.qsa('[data-ok]', host).forEach(function (b) { b.addEventListener('click', function () { act(A.rpc('admin_review_attempt', { p_attempt: b.closest('tr').getAttribute('data-id'), p_approve: b.getAttribute('data-ok') === '1', p_note: null }), 'Décision enregistrée.').then(views.reviews).catch(function () {}); }); });
        });
      },
      content: function () {
        var o = Object.assign({}, O.overrides()), th = Object.assign({}, TCL.mastery.DEFAULTS, o.thresholds || {}), hidden = (o.hidden || []).slice();
        host.innerHTML = '<div class="callout callout--info">' + I('info') + '<p>Les leçons, laboratoires et exercices sont livrés avec le code de l’application. Ici, vous réglez leur présentation et leurs seuils.</p></div>' +
          '<section class="box"><h2>Seuils conseillés avant évaluation (%)</h2><form class="inline-form" id="th">' + [['lesson', 'Leçon'], ['exercises', 'Exercices'], ['lab', 'Laboratoire']].map(function (x) { return '<label>' + x[1] + ' <input type="number" min="1" max="100" name="' + x[0] + '" value="' + th[x[0]] + '"></label>'; }).join('') + '<button class="btn btn--primary btn--sm">Enregistrer</button></form></section>' +
          CUR.spaces.map(function (s) { return '<section class="box"><h2>' + esc(s.title) + '</h2><ul class="plain">' + s.courses.map(function (c) { return '<li><label><input type="checkbox" data-c="' + c.id + '"' + (hidden.indexOf(c.id) < 0 ? ' checked' : '') + '> ' + esc(c.title) + (c.modules.length ? '' : ' <span class="muted">(à développer)</span>') + '</label></li>'; }).join('') + '</ul></section>'; }).join('');
        function save(msg) { return act(A.rpc('admin_set_setting', { p_key: 'curriculum_overrides', p_value: { thresholds: th, hidden: hidden } }), msg).then(function () { O.refresh(); }); }
        U.qs('#th', host).addEventListener('submit', function (e) { e.preventDefault(); ['lesson', 'exercises', 'lab'].forEach(function (k) { th[k] = Number(e.target.elements[k].value); }); save('Seuils enregistrés.').catch(function () {}); });
        U.qsa('[data-c]', host).forEach(function (c) { c.addEventListener('change', function () { var id = c.getAttribute('data-c'); hidden = hidden.filter(function (x) { return x !== id; }); if (!c.checked) hidden.push(id); save('Parcours mis à jour.').catch(function () {}); }); });
        return Promise.resolve();
      },
      ai: function () {
        return Promise.all([A.select('platform_settings?select=key,value'), A.rpc('admin_stats')]).then(function (r) {
          var s = {}; r[0].forEach(function (x) { s[x.key] = x.value; });
          host.innerHTML = '<div class="stats"><div class="stat"><p class="stat__v">' + esc(r[1].ai_requests_30d) + '</p><p class="stat__l">questions sur 30 jours</p></div><div class="stat"><p class="stat__v">' + Number(r[1].ai_cost_month).toFixed(2) + ' $</p><p class="stat__l">coût estimé ce mois-ci</p></div></div>' +
            '<section class="box"><form class="inline-form" id="ai-f"><label><input type="checkbox" name="on"' + (s.ai_enabled ? ' checked' : '') + '> Assistant activé</label><label>Questions par jour et par compte <input type="number" min="0" name="d" value="' + esc(s.ai_daily_requests) + '"></label><label>Budget mensuel ($) <input type="number" min="0" step="0.5" name="b" value="' + esc(s.ai_monthly_budget_usd) + '"></label><button class="btn btn--primary btn--sm">Enregistrer</button></form></section>';
          U.qs('#ai-f', host).addEventListener('submit', function (e) {
            e.preventDefault(); var f = e.target.elements;
            act(Promise.all([A.rpc('admin_set_setting', { p_key: 'ai_enabled', p_value: f.on.checked }), A.rpc('admin_set_setting', { p_key: 'ai_daily_requests', p_value: Number(f.d.value) }), A.rpc('admin_set_setting', { p_key: 'ai_monthly_budget_usd', p_value: Number(f.b.value) })]), 'Réglages enregistrés.').catch(function () {});
          });
        });
      },
      errors: function () {
        return A.rpc('admin_recent_errors', { p_limit: 50 }).then(function (list) {
          host.innerHTML = list.length ? table(['Date', 'Type', 'Message'], list.map(function (e) { return '<tr><td>' + esc(U.formatWhen(e.at)) + '</td><td>' + esc(e.kind) + '</td><td>' + esc(e.message) + (e.kind === 'ai_report' ? '<br><span class="muted">' + esc(JSON.stringify(e.context)) + '</span>' : '') + '</td></tr>'; })) : '<p class="muted">Aucun incident enregistré.</p>';
        });
      }
    };

    function show(id) {
      tab = id;
      U.qsa('.tab', main).forEach(function (b) { var on = b.getAttribute('data-tab') === id; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', String(on)); });
      loading();
      views[id]().catch(fail);
    }
    U.qsa('.tab', main).forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-tab')); }); });
    show(tab);
    return function () { gone = true; };
  }

  P.admin = { title: 'Administration', render: render };
})(window);
