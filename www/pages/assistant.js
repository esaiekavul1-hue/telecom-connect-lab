/*
 * TELECOM CONNECT LAB 2.0 — Assistant pédagogique.
 * Toute réponse provient du service réel, derrière la passerelle serveur.
 * Si le service n'est pas connecté, la page le dit : aucune réponse simulée.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc, P = TCL.pages, O = TCL.official, CUR = TCL.curriculum;

  var MODES = [['explain', 'Expliquer'], ['rephrase', 'Reformuler'], ['hint', 'Un indice'], ['error', 'Comprendre mon erreur'], ['practice', 'M’exercer'], ['progress', 'Ma progression']];
  var ERRORS = {
    exam_active: 'L’assistant est désactivé pendant une évaluation en cours. Terminez-la pour l’utiliser.',
    daily_limit: 'Limite quotidienne atteinte. Vous pourrez poser de nouvelles questions demain.',
    budget: 'Le service a atteint son budget mensuel. Il sera de nouveau disponible le mois prochain.',
    disabled: 'L’assistant est momentanément désactivé par l’administration.',
    provider_error: 'Le service d’IA ne répond pas. Réessayez dans quelques instants.',
    refused: 'L’assistant n’a pas pu répondre à cette demande. Reformulez-la autour de votre cours.',
    invalid_messages: 'Message trop long : limitez-le à 2 000 caractères.'
  };

  /** Page d'où vient l'étudiant : #/assistant/<module>?chapitre=c2 ou ?labo=1. */
  function origin(mod) {
    var q = (root.location.hash.split('?')[1] || '').split('&').map(function (x) { return x.split('='); });
    function get(k) { var f = q.filter(function (x) { return x[0] === k; })[0]; return f ? f[1] : null; }
    var ch = get('chapitre'), lesson = mod && TCL.lessons && TCL.lessons[mod];
    if (ch && lesson) { var c = lesson.chapters.filter(function (x) { return x.id === ch; })[0]; if (c) return { label: 'Chapitre : ' + c.title, text: 'L’étudiant lit le chapitre « ' + c.title + ' ».' }; }
    if (get('labo') && mod && TCL.labs && TCL.labs[mod]) return { label: 'Laboratoire : ' + TCL.labs[mod].title, text: 'L’étudiant travaille dans le laboratoire « ' + TCL.labs[mod].title + ' ».' };
    return null;
  }

  function progressContext(mod, from) {
    var ctx = O.ctx(), parts = [], t = TCL.access.track();
    if (t.state === 'set') parts.push('Parcours : ' + t.label + '.');
    if (from) parts.push(from.text);
    if (mod && ctx.content[mod]) {
      var m = TCL.mastery.moduleMastery(mod, ctx);
      parts.push('Avancement du module : ' + m.steps.map(function (s) { return s.label + ' ' + s.percent + ' %'; }).join(', ') + '.');
      if (m.weak.length) parts.push('Notions en difficulté : ' + m.weak.map(function (w) { return w.skill; }).join(', ') + '.');
      parts.push(m.validated ? 'Compétence validée.' : 'Compétence non validée.');
    } else {
      parts.push('Compétences validées : ' + (Object.keys(ctx.validated).join(', ') || 'aucune') + '.');
    }
    return parts.join(' ');
  }

  function render(main, params) {
    var auth = TCL.auth.state();
    if (auth.status !== 'signedIn') {
      main.innerHTML = '<div class="container page page--narrow"><div class="empty">' + I('sparkle', 'empty__icon') + '<h1 tabindex="-1">Assistant pédagogique</h1><p>L’assistant nécessite un compte et une connexion Internet.</p><p><a class="btn btn--primary" href="#/connexion">' + I('login') + 'Se connecter</a></p></div></div>';
      return;
    }
    var mods = Object.keys(CUR.competencies).filter(function (id) { return TCL.registry.byId(id) && TCL.access.allows(id); });
    var current = mods.indexOf(params.module) >= 0 ? params.module : '';
    var history = [], busy = false, gone = false, mode = 'explain', from = origin(current);

    main.innerHTML = '<div class="container page page--narrow">' + P.crumbs([{ label: 'Assistant' }]) +
      P.head('Assistant pédagogique', 'Posez vos questions sur le cours : il explique, reformule, donne des indices et vous propose des exercices.') +
      (from ? '<p class="track-line">' + I('book') + '<span>' + esc(from.label) + '</span></p>' : '') + '<div id="ai-status"></div><section class="chat"><div class="chat__tools"><div class="control"><label for="ai-mod">Module</label><select id="ai-mod"><option value="">Tous les modules</option>' +
      mods.map(function (id) { return '<option value="' + id + '"' + (id === current ? ' selected' : '') + '>' + esc(CUR.competencies[id].title) + '</option>'; }).join('') + '</select></div>' +
      '<div class="chips" role="group" aria-label="Type d’aide">' + MODES.map(function (m) { return '<button type="button" class="chip chip--text' + (m[0] === mode ? ' is-active' : '') + '" data-mode="' + m[0] + '" aria-pressed="' + (m[0] === mode) + '">' + esc(m[1]) + '</button>'; }).join('') + '</div></div>' +
      '<div class="chat__log" id="ai-log" aria-live="polite"></div>' +
      '<form class="chat__form" id="ai-form"><label for="ai-input" class="sr-only">Votre question</label><textarea id="ai-input" rows="2" maxlength="2000" placeholder="Votre question…"></textarea><button class="btn btn--primary" id="ai-send" type="submit">Envoyer</button></form>' +
      '<p class="muted note">Une IA peut se tromper : vérifiez dans la leçon ou le laboratoire. Elle n’intervient jamais dans la notation.</p></section></div>';

    var log = U.qs('#ai-log', main), input = U.qs('#ai-input', main), send = U.qs('#ai-send', main), status = U.qs('#ai-status', main);

    function block(msg, kind) {
      status.innerHTML = '<div class="callout callout--' + (kind || 'warn') + '">' + I('alert') + '<p>' + msg + '</p></div>';
      input.disabled = send.disabled = true;
    }
    function bubble(role, html) {
      var el = document.createElement('div');
      el.className = 'bubble bubble--' + role; el.innerHTML = html;
      log.appendChild(el); el.scrollIntoView({ block: 'nearest' });
      return el;
    }
    function text2html(t) { return esc(t).replace(/\n/g, '<br>'); }

    /* Sonde sans coût : un message vide est rejeté avant tout appel au modèle. */
    TCL.api.tutor({ messages: [] }).then(function (r) {
      if (gone) return;
      if (r.res.status === 503 || r.res.status === 404) block('<strong>Service d’IA non connecté.</strong> L’interface est prête, mais aucun fournisseur de modèle n’est encore branché sur le serveur. Aucune réponse ne sera simulée.');
      else if (r.res.status === 401) block('Votre session n’est plus valide. <a href="#/connexion">Reconnectez-vous</a>.');
    }).catch(function (e) { if (!gone && e.kind === 'network') block('L’assistant nécessite une connexion Internet.'); else if (!gone) block(esc(e.message)); });

    U.qsa('[data-mode]', main).forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-mode');
        U.qsa('[data-mode]', main).forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
      });
    });
    U.qs('#ai-mod', main).addEventListener('change', function () { current = this.value; from = null; });

    U.qs('#ai-form', main).addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q || busy) return;
      if (document.body.classList.contains('exam-active')) return block(ERRORS.exam_active);
      busy = true; send.disabled = true; input.value = '';
      history.push({ role: 'user', content: q });
      bubble('user', text2html(q));
      var wait = bubble('bot', '<span class="spinner" aria-hidden="true"></span> Réflexion…');
      var profile = O.get().profile;
      TCL.api.tutor({ messages: history, mode: mode, module: current ? CUR.competencies[current].title : undefined, level: profile && profile.space, context: progressContext(current, from) }).then(function (r) {
        if (gone) return;
        if (r.data && r.data.text) {
          history.push({ role: 'assistant', content: r.data.text });
          wait.innerHTML = text2html(r.data.text) + (r.data.truncated ? '<p class="muted">Réponse tronquée : demandez la suite.</p>' : '') +
            '<p class="bubble__meta">' + (r.data.limit ? esc(r.data.used + ' / ' + r.data.limit + ' questions aujourd’hui') + ' · ' : '') + '<button type="button" class="link-btn" data-report>Signaler une erreur</button></p>';
          wait.querySelector('[data-report]').addEventListener('click', function () {
            this.disabled = true;
            TCL.reportError('ai_report', 'Réponse signalée par un étudiant', { module: current, question: q.slice(0, 300), answer: r.data.text.slice(0, 600) });
            this.textContent = 'Merci, c’est signalé.';
          });
        } else {
          history.pop();
          var code = r.data && r.data.error;
          if (r.res.status === 503) block('<strong>Service d’IA non connecté.</strong>');
          wait.className = 'bubble bubble--err'; wait.textContent = ERRORS[code] || 'La réponse n’a pas pu être obtenue.';
        }
      }).catch(function (err) {
        history.pop();
        if (!gone) { wait.className = 'bubble bubble--err'; wait.textContent = err.message; }
      }).then(function () { busy = false; if (!gone && !input.disabled) send.disabled = false; });
    });
    return function () { gone = true; };
  }

  P.assistant = { title: 'Assistant', render: render };
})(window);
