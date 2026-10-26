/*
 * Espaces « Mon compte » et « Connexion / Création de compte » (sans mot de passe).
 * L'interface n'affiche « connecté » que si TCL.auth a obtenu une session
 * délivrée par le service après vérification du code ou du lien reçu par e-mail.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc, V = TCL.validate;
  var P = TCL.pages;

  var notConfiguredBox = function () {
    if (TCL.auth.secretKeyDetected && TCL.auth.secretKeyDetected()) {
      return '<div class="callout callout--error auth-off" role="alert"><h2>' + I('alert') + 'Clé secrète détectée dans config.js</h2>' +
        '<p>Le fichier config.js contient une clé <strong>secrète</strong> (Secret key ou service_role). Par sécurité, la plateforme refuse de l’utiliser et la connexion reste désactivée.</p>' +
        '<ul><li>Remplacez-la par la <strong>Publishable key</strong> (sb_publishable_…), puis republiez le site.</li>' +
        '<li>Si le site a déjà été publié avec cette clé, révoquez-la dans Supabase (Project Settings → API Keys) : elle a pu être vue.</li></ul></div>';
    }
    return '<div class="callout callout--warn auth-off" role="note"><h2>' + I('alert') + 'Connexion par e-mail non configurée</h2>' +
      '<p>Cette installation de TELECOM CONNECT LAB n’est pas encore reliée à un service d’authentification. Aucun e-mail ne peut donc être envoyé, et aucune connexion ne peut être simulée.</p>' +
      '<ul><li><strong>Fonctionne déjà :</strong> leçons, laboratoire, défis et progression, enregistrée dans ce navigateur sur cet appareil.</li>' +
      '<li><strong>Nécessite une configuration :</strong> création de compte, connexion par code ou lien e-mail, et synchronisation entre appareils.</li></ul>' +
      '<p class="muted">Responsable du site : suivez la section « Activer la connexion par e-mail » du fichier README.md, puis complétez config.js.</p></div>';
  };

  /* ---------------------------------- Mon compte ---------------------------------- */

  function account(main) {
    var a = TCL.auth.state();
    var head = P.crumbs([{ label: 'Mon compte' }]);
    if (a.status === 'checking') {
      main.innerHTML = '<div class="container page page--narrow">' + head + '<h1 tabindex="-1">Mon compte</h1><div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>Vérification de votre session auprès du service…</div></div>';
      return;
    }
    if (a.status === 'disabled') {
      main.innerHTML = '<div class="container page page--narrow">' + head + P.head('Mon compte', 'Votre espace personnel : identité, progression et activités.') + notConfiguredBox() + localSummary() + '</div>';
      return;
    }
    if (a.status !== 'signedIn') {
      main.innerHTML = '<div class="container page page--narrow">' + head + P.head('Mon compte', 'Votre espace personnel : identité, progression et activités.') +
        '<div class="auth-card auth-card--center">' + I('user', 'auth-card__icon') + '<h2>Vous n’êtes pas connecté</h2>' +
        '<p>Connectez-vous avec votre adresse e-mail pour retrouver votre progression sur tous vos appareils. Aucun mot de passe : vous recevez un code à usage unique par e-mail.</p>' +
        '<div class="auth-card__actions"><a class="btn btn--primary" href="#/connexion">' + I('login') + 'Se connecter</a><a class="btn btn--ghost" href="#/inscription">Créer un compte</a></div></div>' +
        localSummary() + '</div>';
      return;
    }

    var u = a.user;
    var st = TCL.store.get();
    var all = TCL.registry.overallProgress(st);
    var doneLessons = TCL.registry.withLesson().filter(function (m) { return TCL.registry.moduleProgress(st, m.id).lessonComplete; });
    var scored = TCL.registry.withExercises().map(function (m) { return { m: m, p: TCL.registry.moduleProgress(st, m.id) }; }).filter(function (x) { return x.p.best != null; });
    var acts = st.activity.slice(0, 6).map(function (x) { return '<li><span>' + esc(x.text) + '</span><time datetime="' + esc(x.at) + '">' + esc(U.formatWhen(x.at)) + '</time></li>'; }).join('');
    var initial = (u.name || u.email || '?').trim().charAt(0).toUpperCase();

    main.innerHTML = '<div class="container page">' + head + P.head('Mon compte', 'Votre identité, votre progression et vos activités enregistrées.') +
      (a.offline ? '<p class="callout callout--warn">' + I('device') + ' Hors ligne : votre session reste valable sur cet appareil, mais rien ne peut être synchronisé pour le moment.</p>' : '') +
      '<div class="dash"><div class="dash__main">' +
      '<section class="box profile"><div class="profile__avatar" aria-hidden="true">' + esc(initial) + '</div><div class="profile__id">' +
      '<h2 id="profile-name">' + esc(u.name || 'Nom non renseigné') + '</h2><p class="profile__email">' + I('mail') + '<span>' + esc(u.email) + '</span><span class="pill pill--ok">' + I('shield') + 'adresse vérifiée</span></p>' +
      (u.createdAt ? '<p class="muted">Compte créé ' + esc(U.formatWhen(u.createdAt)) + '</p>' : '') + '</div>' +
      '<button type="button" class="btn btn--ghost btn--sm" id="edit-name">Modifier mon nom</button>' +
      '<form id="name-form" class="name-form" hidden novalidate><label for="name-input">Nom complet</label><div class="name-form__row"><input id="name-input" type="text" autocomplete="name" value="' + esc(u.name || '') + '" aria-describedby="name-err"><button class="btn btn--primary btn--sm" type="submit">Enregistrer</button><button class="btn btn--ghost btn--sm" type="button" id="name-cancel">Annuler</button></div><p class="field-error" id="name-err" aria-live="polite"></p></form>' +
      '</section>' +
      '<section class="box"><h2>Ma progression</h2><p class="sync-line" data-sync-status>' + P.syncStatusHtml() + '</p>' +
      '<p>Progression générale : <strong>' + all.percent + ' %</strong> (' + all.chaptersDone + ' chapitres lus sur ' + all.chaptersTotal + ')</p>' + U.progressBar(all.percent, 'Progression générale') +
      '<div class="two-col"><div><h3>Leçons terminées</h3>' + (doneLessons.length ? '<ul class="checklist">' + doneLessons.map(function (m) { return '<li class="is-ok">' + I('check') + '<span>' + esc(m.title) + '</span></li>'; }).join('') + '</ul>' : '<p class="muted">Aucune leçon entièrement terminée.</p>') + '</div>' +
      '<div><h3>Résultats aux exercices</h3><p>' + all.exAttempted + ' exercice' + (all.exAttempted > 1 ? 's' : '') + ' effectué' + (all.exAttempted > 1 ? 's' : '') + ', ' + all.exMastered + ' réussi' + (all.exMastered > 1 ? 's' : '') + '.</p>' +
      (scored.length ? '<ul class="checklist">' + scored.map(function (x) { return '<li class="is-ok">' + I('target') + '<span>' + esc(x.m.title) + ' : meilleur score <strong>' + x.p.best + ' / ' + x.p.exTotal + '</strong></span></li>'; }).join('') + '</ul>' : '<p class="muted">Aucune série terminée.</p>') + '</div></div>' +
      '<a class="btn btn--ghost btn--sm" href="#/progression">' + I('chart') + 'Voir le détail</a></section>' +
      '</div><aside class="dash__side">' +
      '<section class="box"><h2>Activités enregistrées</h2>' + (acts ? '<ul class="activity activity--plain">' + acts + '</ul>' : '<p class="muted">Aucune activité pour l’instant.</p>') + '</section>' +
      '<section class="box box--plain"><h2>Session</h2><p class="muted">Votre session reste active dans cet onglet et se termine à la fermeture du navigateur ou à la déconnexion.</p>' +
      '<button type="button" class="btn btn--danger btn--block" id="account-signout">' + I('logout') + 'Se déconnecter</button></section>' +
      '</aside></div></div>';

    U.qs('#account-signout', main).addEventListener('click', function () { this.disabled = true; TCL.signOut(); });
    var form = U.qs('#name-form', main), edit = U.qs('#edit-name', main);
    edit.addEventListener('click', function () { form.hidden = false; edit.hidden = true; U.qs('#name-input', main).focus(); });
    U.qs('#name-cancel', main).addEventListener('click', function () { form.hidden = true; edit.hidden = false; edit.focus(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = V.checkName(U.qs('#name-input', main).value);
      var err = U.qs('#name-err', main);
      if (!r.ok) { err.textContent = r.message; return; }
      var btn = form.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = 'Enregistrement…';
      TCL.auth.updateName(r.name).then(function () {
        U.toast('Nom enregistré.', 'success');
        TCL.router.rerender();
      }).catch(function (ex) {
        err.textContent = ex.message || 'Le nom n’a pas pu être enregistré.';
        btn.disabled = false; btn.textContent = 'Enregistrer';
      });
    });
  }

  function localSummary() {
    var st = TCL.store.get();
    if (TCL.store.isEmpty(st)) return '';
    var all = TCL.registry.overallProgress(st);
    return '<section class="box"><h2>Progression sur cet appareil</h2><p>Progression générale : <strong>' + all.percent + ' %</strong></p>' + U.progressBar(all.percent, 'Progression') +
      '<p class="muted">Elle est enregistrée dans ce navigateur uniquement. Elle n’est pas synchronisée avec d’autres appareils.</p><a class="btn btn--ghost btn--sm" href="#/progression">' + I('chart') + 'Voir ma progression</a></section>';
  }

  /* ------------------------------ Connexion / Inscription ------------------------------ */

  function login(main, params) {
    var mode = params.mode === 'signup' ? 'signup' : 'login';
    var a = TCL.auth.state();
    var configured = TCL.auth.isConfigured();
    var title = mode === 'signup' ? 'Créer un compte' : 'Se connecter';
    var head = P.crumbs([{ label: title }]);

    if (a.status === 'signedIn') {
      main.innerHTML = '<div class="container page page--narrow">' + head + '<div class="auth-card auth-card--center">' + I('shield', 'auth-card__icon auth-card__icon--ok') +
        '<h1 tabindex="-1">Vous êtes connecté</h1><p>Connecté avec l’adresse <strong>' + esc(a.user.email) + '</strong>.</p>' +
        '<div class="auth-card__actions"><a class="btn btn--primary" href="#/compte">' + I('user') + 'Aller à mon compte</a></div></div></div>';
      return;
    }

    var tabs = '<div class="auth-tabs" role="navigation" aria-label="Type de demande">' +
      '<a href="#/connexion" class="auth-tab' + (mode === 'login' ? ' is-active' : '') + '"' + (mode === 'login' ? ' aria-current="page"' : '') + '>Se connecter</a>' +
      '<a href="#/inscription" class="auth-tab' + (mode === 'signup' ? ' is-active' : '') + '"' + (mode === 'signup' ? ' aria-current="page"' : '') + '>Créer un compte</a></div>';

    main.innerHTML = '<div class="container page page--narrow">' + head +
      '<div class="auth-layout"><div class="auth-card">' +
      '<h1 tabindex="-1">' + title + '</h1>' + tabs +
      (configured ? '' : notConfiguredBox()) +
      '<div id="auth-step"></div></div>' +
      '<aside class="auth-aside"><h2>' + I('lock') + 'Sans mot de passe</h2><ol class="auth-how">' +
      '<li>Vous saisissez votre adresse e-mail' + (mode === 'signup' ? ' et votre nom' : '') + '.</li>' +
      '<li>Le service vous envoie un code à usage unique et un lien de connexion.</li>' +
      '<li>Vous saisissez le code (ou cliquez sur le lien) : cela prouve que l’adresse vous appartient.</li></ol>' +
      '<p class="muted">Le code expire après un délai limité et ne fonctionne qu’une fois. Aucun mot de passe n’est demandé ni enregistré.</p></aside></div></div>';

    var stepHost = U.qs('#auth-step', main);
    var pend = TCL.auth.pending.get();
    if (configured && pend && pend.mode === mode && Date.now() - pend.sentAt < 3600 * 1000) codeStep(pend.email, pend.name);
    else emailStep();

    function errorBox(msg) { return '<div class="feedback feedback--ko" role="alert">' + I('alert') + '<span>' + esc(msg) + '</span></div>'; }

    function emailStep(prefill) {
      prefill = prefill || {};
      var dis = configured ? '' : ' disabled';
      stepHost.innerHTML = '<form id="email-form" class="auth-form" novalidate>' +
        (mode === 'signup' ? '<div class="field"><label for="f-name">Nom complet</label><input id="f-name" type="text" autocomplete="name" required aria-describedby="f-name-err" value="' + esc(prefill.name || '') + '"' + dis + '><p class="field-error" id="f-name-err" aria-live="polite"></p></div>' : '') +
        '<div class="field"><label for="f-email">Adresse e-mail</label><input id="f-email" type="email" autocomplete="email" inputmode="email" required aria-describedby="f-email-hint f-email-err" value="' + esc(prefill.email || '') + '"' + dis + '>' +
        '<p class="field-hint" id="f-email-hint">Exemple : prenom.nom@gmail.com</p><p class="field-error" id="f-email-err" aria-live="polite"></p></div>' +
        '<div id="form-msg"></div>' +
        '<button type="submit" class="btn btn--primary btn--block"' + dis + '>' + I('mail') + '<span>' + (mode === 'signup' ? 'Créer mon compte et recevoir le code' : 'Recevoir mon code de connexion') + '</span></button>' +
        '<p class="auth-switch">' + (mode === 'signup' ? 'Vous avez déjà un compte ? <a href="#/connexion">Se connecter</a>' : 'Première visite ? <a href="#/inscription">Créer un compte</a>') + '</p>' +
        '</form>';
      var form = U.qs('#email-form', stepHost);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!configured) return;
        var ok = true, name = '';
        if (mode === 'signup') {
          var rn = V.checkName(U.qs('#f-name', form).value);
          U.qs('#f-name-err', form).textContent = rn.ok ? '' : rn.message;
          U.qs('#f-name', form).toggleAttribute('aria-invalid', !rn.ok);
          ok = rn.ok; name = rn.name;
        }
        var re = V.checkEmail(U.qs('#f-email', form).value);
        U.qs('#f-email-err', form).textContent = re.ok ? '' : re.message;
        U.qs('#f-email', form).toggleAttribute('aria-invalid', !re.ok);
        if (!re.ok || !ok) { (form.querySelector('[aria-invalid]') || {}).focus && form.querySelector('[aria-invalid]').focus(); return; }
        var btn = form.querySelector('[type=submit]');
        setBusy(btn, true, 'Envoi en cours…');
        U.qs('#form-msg', form).innerHTML = '';
        TCL.auth.requestCode(re.email, { mode: mode, name: name }).then(function () {
          U.toast('E-mail envoyé à ' + re.email, 'success');
          codeStep(re.email, name, true);
        }).catch(function (err) {
          setBusy(btn, false);
          U.qs('#form-msg', form).innerHTML = errorBox(err.message || 'L’envoi a échoué.') +
            (err.code === 'no_account' ? '<p><a class="btn btn--ghost btn--sm" href="#/inscription">Créer un compte avec cette adresse</a></p>' : '');
        });
      });
    }

    function codeStep(email, name, justSent) {
      stepHost.innerHTML = '<div class="sent" role="status">' + I('mail', 'sent__icon') + '<div><p><strong>' + (justSent ? 'E-mail envoyé.' : 'Un code vous a été envoyé.') + '</strong> Consultez la boîte de réception de <strong>' + esc(email) + '</strong> (et le dossier « Courrier indésirable »).</p>' +
        '<p class="muted">L’e-mail contient un code à usage unique et un lien. Le lien doit être ouvert sur cet appareil.</p></div></div>' +
        '<form id="code-form" class="auth-form" novalidate><div class="field"><label for="f-code">Code reçu par e-mail</label>' +
        '<input id="f-code" class="code-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="12" aria-describedby="f-code-err" placeholder="123456">' +
        '<p class="field-error" id="f-code-err" aria-live="polite"></p></div><div id="code-msg"></div>' +
        '<button type="submit" class="btn btn--primary btn--block">' + I('shield') + '<span>Valider le code</span></button></form>' +
        '<div class="resend"><button type="button" class="link-btn" id="resend" disabled></button><button type="button" class="link-btn" id="change-email">Modifier l’adresse e-mail</button></div>';
      var form = U.qs('#code-form', stepHost);
      var input = U.qs('#f-code', form);
      input.focus();
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var rc = V.checkCode(input.value);
        U.qs('#f-code-err', form).textContent = rc.ok ? '' : rc.message;
        input.toggleAttribute('aria-invalid', !rc.ok);
        if (!rc.ok) { input.focus(); return; }
        var btn = form.querySelector('[type=submit]');
        setBusy(btn, true, 'Vérification…');
        U.qs('#code-msg', form).innerHTML = '';
        TCL.auth.verifyCode(email, rc.code).then(function (user) {
          U.toast('Adresse vérifiée : bienvenue' + (user && user.name ? ', ' + user.name : '') + ' !', 'success');
          root.location.hash = '#/compte';
        }).catch(function (err) {
          setBusy(btn, false);
          U.qs('#code-msg', form).innerHTML = errorBox(err.message || 'La vérification a échoué.');
          input.select();
        });
      });
      var resend = U.qs('#resend', stepHost);
      var pendNow = TCL.auth.pending.get();
      var sentAt = (pendNow && pendNow.sentAt) || Date.now();
      var timer = setInterval(tick, 1000);
      function tick() {
        if (!document.body.contains(resend)) { clearInterval(timer); return; }
        var left = Math.ceil(60 - (Date.now() - sentAt) / 1000);
        if (left > 0) { resend.disabled = true; resend.textContent = 'Renvoyer un code (dans ' + left + ' s)'; }
        else { resend.disabled = false; resend.textContent = 'Renvoyer un nouveau code'; }
      }
      tick();
      resend.addEventListener('click', function () {
        resend.disabled = true; resend.textContent = 'Envoi en cours…';
        TCL.auth.requestCode(email, { mode: mode, name: name }).then(function () {
          sentAt = Date.now(); tick();
          U.qs('#code-msg', form).innerHTML = '<div class="feedback feedback--ok" role="status">' + I('check') + '<span>Nouveau code envoyé. Seul le code le plus récent est valable.</span></div>';
        }).catch(function (err) {
          if (err.extra && err.extra.wait) sentAt = Date.now() - (60 - err.extra.wait) * 1000;
          tick();
          U.qs('#code-msg', form).innerHTML = errorBox(err.message);
        });
      });
      U.qs('#change-email', stepHost).addEventListener('click', function () {
        clearInterval(timer);
        TCL.auth.pending.clear();
        emailStep({ email: email, name: name });
        U.qs('#f-email', stepHost).focus();
      });
    }

    function setBusy(btn, busy, label) {
      btn.disabled = busy;
      var span = btn.querySelector('span:not(.spinner)');
      if (busy) { btn.dataset.label = span.textContent; span.textContent = label; btn.insertAdjacentHTML('afterbegin', '<span class="spinner" aria-hidden="true"></span>'); btn.setAttribute('aria-busy', 'true'); }
      else { var sp = btn.querySelector('.spinner'); if (sp) sp.remove(); span.textContent = btn.dataset.label || span.textContent; btn.removeAttribute('aria-busy'); }
    }
  }

  TCL.pages.account = { title: 'Mon compte', render: account };
  TCL.pages.login = { title: function (p) { return p.mode === 'signup' ? 'Créer un compte' : 'Connexion'; }, render: login };
})(window);
