/*
 * TELECOM CONNECT LAB 2.0 — Évaluations.
 * Le navigateur affiche et transmet ; le serveur tire les questions, garde le
 * temps, corrige et décide de la validation.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc, P = TCL.pages, O = TCL.official, CUR = TCL.curriculum;

  function needsAccount(main, title) {
    main.innerHTML = '<div class="container page page--narrow"><div class="empty">' + I('lock', 'empty__icon') + '<h1 tabindex="-1">' + esc(title) + '</h1><p>Les évaluations sont corrigées par le serveur : un compte et une connexion Internet sont nécessaires.</p><p><a class="btn btn--primary" href="#/connexion">' + I('login') + 'Se connecter</a></p></div></div>';
  }
  function fmtDuration(s) { return s == null ? 'sans limite' : Math.round(s / 60) + ' min'; }

  function row(a) {
    var st = O.get(), mine = st.attempts.filter(function (t) { return t.assessment_id === a.id; });
    var open = mine.filter(function (t) { return t.status === 'in_progress'; })[0];
    var best = mine.reduce(function (b, t) { return t.percent != null ? Math.max(b, Number(t.percent)) : b; }, -1);
    var missing = a.prerequisites.filter(function (p) { return !st.validated[p]; });
    var done = a.competency ? !!st.validated[a.competency] : (a.grants.length && a.grants.every(function (g) { return st.validated[g]; }));
    var badge = done ? P.statusPill('validated') : missing.length ? P.statusPill('locked') : '';
    return '<li class="exam-row"><div><h3><a href="#/evaluations/' + a.id + '">' + esc(a.title) + '</a></h3><p class="muted">' + a.question_count + ' questions · ' + fmtDuration(a.duration_seconds) + ' · réussite à ' + Number(a.pass_percent) + ' %' + (best >= 0 ? ' · meilleur résultat ' + best + ' %' : '') + '</p></div>' + badge +
      '<a class="btn btn--sm ' + (open ? 'btn--primary' : 'btn--ghost') + '" href="#/evaluations/' + a.id + '">' + (open ? 'Reprendre' : 'Ouvrir') + '</a></li>';
  }

  function list(main) {
    if (TCL.auth.state().status !== 'signedIn') return needsAccount(main, 'Évaluations');
    var st = O.get();
    var mine = function (a) { return a.kind === 'placement' || !a.competency || TCL.access.inTrack(a.competency); };
    var by = function (k) { return st.assessments.filter(function (a) { return a.kind === k && mine(a); }); };
    var body;
    if (st.status === 'not_deployed' || (st.status !== 'ready' && !st.assessments.length)) body = P.officialNotice() || '<p class="loading"><span class="spinner" aria-hidden="true"></span>Chargement…</p>';
    else body = P.officialNotice() + '<section><h2 class="h-sub">Tests de positionnement</h2><p class="muted">Vous maîtrisez déjà un domaine ? Une réussite valide directement les compétences concernées.</p><ul class="exam-list">' + by('placement').map(row).join('') + '</ul></section>' +
      '<section><h2 class="h-sub">Évaluations de fin de module</h2><ul class="exam-list">' + by('course_final').concat(by('exam')).map(row).join('') + '</ul></section>';
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Évaluations' }]) + P.head('Évaluations', 'Corrigées par le serveur, avec des paramètres qui changent à chaque tentative.') + P.trackBanner() + body + '</div>';
  }

  function intro(main, params) {
    if (TCL.auth.state().status !== 'signedIn') return needsAccount(main, 'Évaluation');
    var a = O.assessmentById(params.id);
    if (!a) {
      if (O.get().status === 'loading') { main.innerHTML = '<div class="container page"><p class="loading"><span class="spinner" aria-hidden="true"></span>Chargement…</p></div>'; O.refresh().then(function () { if (O.assessmentById(params.id)) intro(main, params); else P.notFound.render(main); }); return; }
      return P.notFound.render(main);
    }
    var st = O.get(), mine = st.attempts.filter(function (t) { return t.assessment_id === a.id; });
    var open = mine.filter(function (t) { return t.status === 'in_progress'; })[0];
    var used = mine.filter(function (t) { return t.status === 'submitted' || t.status === 'expired'; }).length;
    var history = mine.filter(function (t) { return t.status !== 'in_progress'; }).map(function (t) {
      return '<li><a href="#/resultat/' + t.id + '">' + esc(U.formatWhen(t.submitted_at || t.started_at)) + '</a> : ' + (t.percent != null ? Number(t.percent) + ' %' : '—') + ' ' + (t.proctor_status === 'pending' ? '<span class="pill">En attente de supervision</span>' : t.passed ? '<span class="pill pill--ok">Réussi</span>' : '<span class="pill pill--ko">Non réussi</span>') + '</li>';
    }).join('');
    main.innerHTML = '<div class="container page page--narrow">' + P.crumbs([{ label: 'Évaluations', href: '#/evaluations' }, { label: a.title }]) + P.head(a.title, esc(a.description)) +
      '<section class="box"><h2>Déroulement</h2><ul><li>' + a.question_count + ' questions, durée ' + fmtDuration(a.duration_seconds) + '. Le compte à rebours est tenu par le serveur.</li><li>Réussite à partir de ' + Number(a.pass_percent) + ' %.</li><li>Tentatives : ' + (a.max_attempts ? used + ' utilisée(s) sur ' + a.max_attempts : 'non limitées') + (a.cooldown_minutes ? ', délai de ' + a.cooldown_minutes + ' min entre deux tentatives' + (a.kind === 'course_final' ? ', porté à 2 h puis 24 h après des échecs répétés' : '') : '') + '.</li>' +
      '<li>' + (a.kind === 'placement' ? 'Aucun corrigé n’est communiqué pour un test de positionnement.' : 'Le corrigé détaillé est communiqué après la réussite.') + '</li>' +
      '<li>Vos réponses sont enregistrées au fur et à mesure : une coupure n’efface rien tant que le temps n’est pas écoulé.</li><li>L’assistant IA est désactivé pendant l’évaluation.</li>' +
      (a.requires_proctor ? '<li><strong>Supervision humaine</strong> : une réussite doit être approuvée avant d’être validée.</li>' : '') + '</ul>' +
      '<p class="muted">Une évaluation à distance ne peut pas exclure toute forme de triche. Elle mesure votre travail honnête.</p>' +
      '<p class="field-error" id="start-err" role="alert"></p><button type="button" class="btn btn--primary btn--lg" id="start">' + I('shield') + (open ? 'Reprendre l’évaluation' : 'Commencer') + '</button></section>' +
      (history ? '<section class="box"><h2>Vos tentatives</h2><ul class="plain">' + history + '</ul></section>' : '') + '</div>';
    var cleanup = null, gone = false;
    U.qs('#start', main).addEventListener('click', function () {
      var btn = this; btn.disabled = true;
      TCL.api.rpc('start_attempt', { p_assessment: a.id }).then(function (t) {
        if (gone) return;
        cleanup = run(main, t, a);
      }).catch(function (e) { btn.disabled = false; U.qs('#start-err', main).textContent = e.message; });
    });
    return function () { gone = true; if (cleanup) cleanup(); };
  }

  function run(main, t, a) {
    var idx = 0, answers = {}, dirty = {}, saving = {}, timer = null, ended = false, saveState = 'saved';
    var skew = Date.parse(t.server_now) - Date.now();
    t.items.forEach(function (it) { answers[it.position] = it.response == null ? '' : String(it.response); });
    document.body.classList.add('exam-active');

    main.innerHTML = '<div class="container page page--narrow exam"><header class="exam__bar"><h1 tabindex="-1">' + esc(t.title) + '</h1><p class="exam__timer" id="timer" role="timer"></p></header>' +
      '<ol class="exam__nav" id="enav" aria-label="Questions"></ol><form id="eform" novalidate><div id="eq"></div>' +
      '<p class="exam__save" id="esave" aria-live="polite"></p><p class="field-error" id="eerr" role="alert"></p>' +
      '<div class="exam__actions"><button type="button" class="btn btn--ghost" id="prev">' + I('arrowLeft') + 'Précédente</button><button type="button" class="btn btn--ghost" id="next">Suivante' + I('arrowRight') + '</button><button type="button" class="btn btn--primary" id="finish">' + I('check') + 'Terminer</button></div></form></div>';

    function nav() {
      U.qs('#enav', main).innerHTML = t.items.map(function (it, i) {
        return '<li><button type="button" class="qdot' + (answers[it.position] ? ' is-ok' : '') + (i === idx ? ' is-current' : '') + '" data-i="' + i + '" aria-label="Question ' + (i + 1) + (answers[it.position] ? ', répondue' : ', sans réponse') + '"><span>' + (i + 1) + '</span></button></li>';
      }).join('');
      U.qsa('.qdot', main).forEach(function (b) { b.addEventListener('click', function () { idx = Number(b.getAttribute('data-i')); draw(); }); });
    }
    function draw() {
      var it = t.items[idx], val = answers[it.position];
      var field = it.kind === 'qcm'
        ? '<fieldset class="options"><legend class="sr-only">Propositions</legend>' + it.options.map(function (o) { return '<label class="option"><input type="radio" name="ans" value="' + esc(o.id) + '"' + (val === o.id ? ' checked' : '') + '><span>' + esc(o.label) + '</span></label>'; }).join('') + '</fieldset>'
        : '<div class="field"><label for="ans">Votre réponse' + (it.unit ? ' (en ' + esc(it.unit) + ')' : '') + '</label><input id="ans" name="ans" type="text" ' + (it.kind === 'numeric' ? 'inputmode="decimal"' : '') + ' maxlength="60" autocomplete="off" value="' + esc(val) + '"></div>';
      U.qs('#eq', main).innerHTML = '<p class="kicker">Question ' + (idx + 1) + ' sur ' + t.items.length + ' · ' + esc(it.skill) + '</p><div class="exam__prompt">' + it.prompt + '</div>' + field;
      U.qs('#prev', main).disabled = idx === 0;
      U.qs('#next', main).disabled = idx === t.items.length - 1;
      U.qsa('input[name=ans]', main).forEach(function (el) { el.addEventListener(el.type === 'radio' ? 'change' : 'input', function () { onAnswer(it.position, el.value); }); });
      nav();
    }
    function showSave() {
      var el = U.qs('#esave', main); if (!el) return;
      el.className = 'exam__save' + (saveState === 'failed' ? ' is-bad' : '');
      el.textContent = saveState === 'saving' ? 'Enregistrement…' : saveState === 'failed' ? 'Réponse non enregistrée : nouvel essai automatique dès le retour de la connexion.' : 'Réponses enregistrées.';
    }
    function onAnswer(pos, v) { answers[pos] = v; dirty[pos] = 1; nav(); scheduleSave(); }
    var scheduleSave = U.debounce(function () { flush(); }, 500);
    var retry = null;
    function flush() {
      var keys = Object.keys(dirty).filter(function (k) { return !saving[k]; });
      if (!keys.length) return Promise.resolve(true);
      saveState = 'saving'; showSave();
      return Promise.all(keys.map(function (k) {
        var value = answers[k]; saving[k] = 1; delete dirty[k];
        return TCL.api.rpc('save_answer', { p_attempt: t.attempt_id, p_position: Number(k), p_value: value }).then(function () { delete saving[k]; return true; })
          .catch(function (e) { delete saving[k]; if (e.kind === 'rule') return true; if (answers[k] !== undefined) dirty[k] = 1; return false; });
      })).then(function (r) {
        var ok = r.every(Boolean);
        if (Object.keys(dirty).length && ok) return flush();
        saveState = ok ? 'saved' : 'failed'; showSave();
        if (!ok && !ended) { clearTimeout(retry); retry = setTimeout(flush, 4000); }
        return ok;
      });
    }
    function tick() {
      if (!t.deadline_at) { U.qs('#timer', main).textContent = 'Sans limite de temps'; return; }
      var left = Math.max(0, Math.round((Date.parse(t.deadline_at) - (Date.now() + skew)) / 1000));
      var el = U.qs('#timer', main); if (!el) return;
      el.textContent = 'Temps restant : ' + Math.floor(left / 60) + ' min ' + String(left % 60).padStart(2, '0');
      el.classList.toggle('is-low', left <= 60);
      if (left === 0 && !ended) finish(true);
    }
    function stop() { ended = true; clearInterval(timer); clearTimeout(retry); document.body.classList.remove('exam-active'); }
    function finish(auto) {
      if (!auto) {
        var blank = t.items.filter(function (it) { return !answers[it.position]; }).length;
        if (!root.confirm(blank ? 'Il reste ' + blank + ' question(s) sans réponse. Terminer quand même ?' : 'Terminer et envoyer vos réponses ?')) return;
      }
      var btn = U.qs('#finish', main), err = U.qs('#eerr', main);
      btn.disabled = true; err.textContent = '';
      flush().then(function (ok) {
        if (!ok && !auto) throw new TCL.api.Error('network', 'Vos dernières réponses ne sont pas enregistrées. Vérifiez votre connexion, puis réessayez.');
        return TCL.api.rpc('submit_attempt', { p_attempt: t.attempt_id });
      }).then(function (res) {
        stop();
        O.refresh();
        root.location.hash = '#/resultat/' + res.attempt_id;
      }).catch(function (e) { btn.disabled = false; ended = false; err.textContent = e.message; });
    }

    U.qs('#eform', main).addEventListener('submit', function (e) { e.preventDefault(); });
    U.qs('#prev', main).addEventListener('click', function () { if (idx > 0) { idx--; draw(); } });
    U.qs('#next', main).addEventListener('click', function () { if (idx < t.items.length - 1) { idx++; draw(); } });
    U.qs('#finish', main).addEventListener('click', function () { finish(false); });
    var onOnline = function () { flush(); };
    root.addEventListener('online', onOnline);
    draw(); showSave(); tick();
    timer = setInterval(tick, 1000);
    var h1 = main.querySelector('h1'); if (h1) h1.focus({ preventScroll: true });
    return function () { root.removeEventListener('online', onOnline); stop(); };
  }

  function result(main, params) {
    if (TCL.auth.state().status !== 'signedIn') return needsAccount(main, 'Résultat');
    main.innerHTML = '<div class="container page"><p class="loading"><span class="spinner" aria-hidden="true"></span>Chargement du résultat…</p></div>';
    var gone = false;
    TCL.api.rpc('attempt_result', { p_attempt: params.id }).then(function (r) {
      if (gone) return;
      var pending = r.proctor_status === 'pending', rejected = r.proctor_status === 'rejected';
      var head = pending ? ['warn', 'clock', 'En attente de supervision', 'Votre résultat atteint le seuil. Une personne doit encore l’approuver avant la validation.']
        : rejected ? ['error', 'x', 'Non approuvée', 'La supervision n’a pas approuvé cette tentative.']
        : r.passed ? ['ok', 'check', 'Évaluation réussie', 'Votre compétence est validée sur votre compte.']
        : r.status === 'expired' ? ['error', 'clock', 'Temps écoulé', 'Seules les réponses enregistrées à temps ont été corrigées.']
        : ['error', 'info', 'Évaluation non réussie', 'Retravaillez les notions indiquées, puis réessayez.'];
      var failed = {}; r.items.forEach(function (i) { if (!i.correct) failed[i.skill] = 1; });
      var skills = Object.keys(failed);
      var remediation = !r.passed && skills.length ? '<section class="box"><h2>Pour progresser</h2><p>Notions à retravailler : ' + skills.map(esc).join(', ') + '.</p>' + (r.competency ? '<p><a class="btn btn--primary btn--sm" href="#/competence/' + esc(r.competency) + '">Revoir le module</a> <a class="btn btn--ghost btn--sm" href="#/assistant/' + esc(r.competency) + '">' + I('sparkle') + 'Demander à l’assistant</a></p>' : '') + '</section>' : '';
      var items = r.show_correction ? r.items.map(function (i) {
        var answered = i.response == null || i.response === '' ? 'Pas de réponse' : i.kind === 'qcm' ? ((i.options.filter(function (o) { return o.id === i.response; })[0] || {}).label || '—') : i.response;
        var expected = !i.answer ? '' : i.kind === 'qcm' ? (i.options.filter(function (o) { return o.id === i.answer.id; })[0] || {}).label : i.kind === 'text' ? i.answer.accepted[0] : TCL.signalMath.formatNumber(i.answer.value, 4) + (i.unit ? ' ' + i.unit : '');
        return '<li class="correction' + (i.correct ? ' is-ok' : ' is-ko') + '"><p class="kicker">Question ' + i.position + ' · ' + esc(i.skill) + ' <span class="pill ' + (i.correct ? 'pill--ok' : 'pill--ko') + '">' + (i.correct ? 'Juste' : 'Faux') + '</span></p><div>' + i.prompt + '</div><p><strong>Votre réponse :</strong> ' + esc(answered) + '</p>' + (i.correct ? '' : '<p><strong>Réponse attendue :</strong> ' + esc(expected) + '</p>') + '<div class="muted">' + (i.explanation || '') + '</div></li>';
      }).join('') : '';
      // Sans corrigé (échec, positionnement) : juste ou faux par question et notion, rien d'autre.
      var brief = !items && r.items.length ? '<ol class="corrections">' + r.items.map(function (i) { return '<li class="correction' + (i.correct ? ' is-ok' : ' is-ko') + '"><p class="kicker">Question ' + i.position + ' · ' + esc(i.skill) + ' <span class="pill ' + (i.correct ? 'pill--ok' : 'pill--ko') + '">' + (i.correct ? 'Juste' : 'Faux') + '</span></p></li>'; }).join('') + '</ol>' : '';
      var why = r.kind === 'placement' ? 'Les tests de positionnement ne communiquent pas de corrigé.'
        : r.correction_policy !== 'after_pass' ? 'La correction détaillée n’est pas communiquée pour cette évaluation.'
        : r.passed ? 'Le corrigé détaillé sera disponible après l’approbation de votre résultat.' : 'Le corrigé détaillé sera disponible après la réussite de cette évaluation.';
      main.innerHTML = '<div class="container page page--narrow">' + P.crumbs([{ label: 'Évaluations', href: '#/evaluations' }, { label: 'Résultat' }]) +
        '<header class="result result--' + head[0] + '">' + I(head[1]) + '<div><h1 tabindex="-1">' + esc(head[2]) + '</h1><p>' + esc(r.title) + ' : <strong>' + Number(r.percent) + ' %</strong> (seuil ' + Number(r.pass_percent) + ' %).</p><p>' + esc(head[3]) + '</p></div></header>' +
        remediation + (items ? '<section><h2 class="h-sub">Correction détaillée</h2><ol class="corrections">' + items + '</ol></section>' : '<section><h2 class="h-sub">Vos réponses</h2><p class="muted" id="no-correction">' + esc(why) + '</p>' + brief + '</section>') +
        '<p><a class="btn btn--ghost" href="#/evaluations">Retour aux évaluations</a></p></div>';
    }).catch(function (e) {
      if (gone) return;
      main.innerHTML = '<div class="container page page--narrow"><div class="callout callout--error"><h1 tabindex="-1">Résultat indisponible</h1><p>' + esc(e.message) + '</p><p><a class="btn btn--primary" href="#/evaluations">Retour</a></p></div></div>';
    });
    return function () { gone = true; };
  }

  function attestation(main, params) {
    var c = CUR.competencies[params.module], rec = O.get().validated[params.module], u = TCL.auth.state().user;
    if (!c || !rec) return P.notFound.render(main);
    var name = (O.get().profile && O.get().profile.display_name) || (u && (u.name || u.email)) || '';
    main.innerHTML = '<div class="container page page--narrow"><article class="attestation"><img src="assets/images/logo.svg" alt="TELECOM CONNECT LAB" width="240" height="45"><h1 tabindex="-1">Attestation interne</h1>' +
      '<p>TELECOM CONNECT LAB atteste que</p><p class="attestation__name">' + esc(name) + '</p><p>a validé sur la plateforme la compétence</p><p class="attestation__name">' + esc(c.title) + '</p><p>' + esc(U.formatWhen(rec.validated_at)) + ', par ' + (rec.source === 'placement' ? 'test de positionnement' : rec.source === 'admin' ? 'décision de l’administration' : 'évaluation corrigée automatiquement') + '.</p>' +
      '<p class="attestation__legal">Document interne à la plateforme. Il ne constitue ni un diplôme, ni une certification reconnue par un établissement ou une autorité.</p></article>' +
      '<p class="no-print"><button type="button" class="btn btn--primary" id="print">' + I('book') + 'Imprimer</button> <a class="btn btn--ghost" href="#/mon-espace">Retour</a></p></div>';
    U.qs('#print', main).addEventListener('click', function () { root.print(); });
  }

  P.evaluations = { title: 'Évaluations', render: list };
  P.assessment = { title: 'Évaluation', render: intro };
  P.result = { title: 'Résultat', render: result };
  P.attestation = { title: 'Attestation interne', render: attestation };
})(window);
