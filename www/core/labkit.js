/*
 * TELECOM CONNECT LAB — Boîte à outils commune des laboratoires
 * ------------------------------------------------------------
 * Fournit les éléments répétés dans chaque simulation, avec le design du
 * laboratoire « Comprendre les signaux » : en-tête, commandes (curseur +
 * champ numérique), valeurs calculées, explication, missions de vérification,
 * limites du modèle, sauvegarde des réglages.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var U = TCL.util, esc = U.esc, M = TCL.signalMath;

  function I(n) { return TCL.icon(n); }

  /* ------------------------------- Gabarits HTML ------------------------------- */

  function head(o) {
    return '<div class="page-head page-head--lab"><div><h1 tabindex="-1">' + esc(o.title) + '</h1>' +
      '<p class="page-head__text">' + o.text + '</p></div>' +
      '<p class="badge badge--model">' + I('info') + '<span>' + esc(o.badge) + '</span></p></div>';
  }

  /** Curseur + champ numérique synchronisés. */
  function range(o) {
    return '<div class="control">' +
      '<div class="control__top"><label for="' + o.id + '-range">' + o.label + '</label><output id="' + o.id + '-out" for="' + o.id + '-range"></output></div>' +
      '<input type="range" id="' + o.id + '-range" min="' + o.min + '" max="' + o.max + '" step="' + (o.step || 'any') + '" aria-describedby="' + o.id + '-hint">' +
      (o.noNumber ? '' : '<div class="control__num"><label for="' + o.id + '" class="sr-only">' + esc(o.srLabel || '') + '</label><input type="text" inputmode="decimal" id="' + o.id + '" aria-describedby="' + o.id + '-hint ' + o.id + '-err"><span>' + esc(o.unit || '') + '</span></div>') +
      '<p class="control__hint" id="' + o.id + '-hint">' + o.hint + '</p><p class="field-error" id="' + o.id + '-err" aria-live="polite"></p>' +
      (o.extra || '') + '</div>';
  }

  function select(o) {
    return '<div class="control"><label for="' + o.id + '">' + o.label + '</label><select id="' + o.id + '" aria-describedby="' + o.id + '-hint">' +
      o.options.map(function (op) { return '<option value="' + esc(op[0]) + '">' + esc(op[1]) + '</option>'; }).join('') +
      '</select><p class="control__hint" id="' + o.id + '-hint">' + o.hint + '</p></div>';
  }

  function segmented(o) {
    return '<div class="control"><p class="control__label" id="' + o.id + '-lbl">' + o.label + '</p><div class="segmented" role="radiogroup" aria-labelledby="' + o.id + '-lbl">' +
      o.options.map(function (op) {
        return '<label class="segmented__opt"><input type="radio" name="' + o.id + '" value="' + esc(op[0]) + '"><span>' + esc(op[1]) + '</span></label>';
      }).join('') + '</div>' + (o.hint ? '<p class="control__hint">' + o.hint + '</p>' : '') + '</div>';
  }

  function chips(label, items, attr) {
    return '<div class="chips" role="group" aria-label="' + esc(label) + '">' + items.map(function (it) {
      return '<button type="button" class="chip chip--text" data-' + attr + '="' + esc(it[0]) + '">' + esc(it[1]) + '</button>';
    }).join('') + '</div>';
  }

  function readouts(list) {
    var cls = list.length % 5 === 0 ? '' : (list.length % 4 === 0 ? ' readouts--4' : '');
    return '<dl class="readouts' + cls + '" aria-label="Valeurs calculées">' + list.map(function (r) {
      return '<div class="readout"><dt>' + r[0] + '</dt><dd id="' + r[1] + '"></dd></div>';
    }).join('') + '</dl>';
  }

  function explainBox(side, wide) {
    return '<div class="lab__explain-row' + (side ? (wide ? ' lab__explain-row--wide' : '') : ' lab__explain-row--full') + '">' +
      '<section class="explain" aria-labelledby="explain-title"><h2 id="explain-title">' + I('sparkle') + 'Ce qui se passe</h2><div id="explain" aria-live="polite"></div></section>' +
      (side || '') + '</div>';
  }

  function missionsSection(missions) {
    return '<section class="missions" aria-labelledby="missions-title">' +
      '<div class="section-head"><h2 id="missions-title">Vérifiez votre compréhension</h2><p>' + missions.length + ' missions à réaliser avec les commandes. La vérification utilise vos réglages actuels.</p></div>' +
      '<ol class="missions__list">' + missions.map(function (m, i) {
        return '<li class="mission" data-mission="' + m.id + '">' +
          '<div class="mission__head"><span class="mission__num" aria-hidden="true">' + (i + 1) + '</span><h3>' + esc(m.title) + '</h3><span class="mission__state"></span></div>' +
          '<p>' + esc(m.text) + '</p>' +
          '<button type="button" class="btn btn--ghost btn--sm mission__check" data-id="' + m.id + '">Vérifier mes réglages</button>' +
          '<div class="feedback" id="fb-' + m.id + '" role="status" aria-live="polite"></div></li>';
      }).join('') + '</ol></section>';
  }

  function limits(html) {
    return '<section class="limits callout callout--info"><h2>' + I('info') + 'Limites de cette simulation</h2>' + html + '</section>';
  }

  function nextLinks(links) {
    return '<nav class="next-links" aria-label="Suite">' + links.map(function (l) {
      return '<a class="btn ' + (l.primary ? 'btn--primary' : 'btn--ghost') + '" href="' + l.href + '">' + (l.icon ? I(l.icon) : '') + esc(l.label) + '</a>';
    }).join('') + '</nav>';
  }

  /** Liens de fin de page : leçon et défis du module, simulations précédente et suivante (ordre du catalogue). */
  function sequenceLinks(id) {
    var R = TCL.registry, mods = R.withLab(), i = mods.map(function (m) { return m.id; }).indexOf(id);
    var prev = mods[i - 1], next = mods[i + 1], parts = R.liveParts(R.byId(id)), links = [];
    if (prev) links.push({ href: '#/laboratoire/' + prev.id, label: prev.title, icon: 'arrowLeft' });
    if (parts.lesson) links.push({ href: '#/lecons/' + id, label: 'Revoir la leçon', icon: 'book' });
    if (parts.exercises) links.push({ href: '#/defis/' + id, label: 'Passer aux exercices', icon: 'target', primary: !next });
    if (next) links.push({ href: '#/laboratoire/' + next.id, label: 'Simulation suivante : ' + next.title, icon: 'arrowRight', primary: true });
    return nextLinks(links);
  }

  /* ------------------------------- Comportements ------------------------------- */

  function numberValidator(lo, hi, unit, decimals) {
    return function (raw) {
      var n = M.parseNumber(raw);
      if (!isFinite(n)) return { ok: false, message: 'Saisissez un nombre.' };
      if (n < lo || n > hi) return { ok: false, message: 'Valeur autorisée : de ' + M.formatNumber(lo) + ' à ' + M.formatNumber(hi) + ' ' + unit + '.' };
      var p = Math.pow(10, decimals == null ? 3 : decimals);
      return { ok: true, value: Math.round(n * p) / p };
    };
  }

  /**
   * Relie un curseur et son champ numérique.
   * o : { id, toSlider(v), fromSlider(s), validate(raw), onInput(v), onEnd() }
   */
  function bindPair(scope, o) {
    var rangeEl = scope.querySelector('#' + o.id + '-range');
    var num = scope.querySelector('#' + o.id);
    var err = scope.querySelector('#' + o.id + '-err');
    function clearErr() { if (err) err.textContent = ''; if (num) num.removeAttribute('aria-invalid'); }
    rangeEl.addEventListener('input', function () { clearErr(); o.onInput(o.fromSlider ? o.fromSlider(Number(rangeEl.value)) : Number(rangeEl.value)); });
    rangeEl.addEventListener('change', function () { if (o.onEnd) o.onEnd(); });
    if (num) {
      num.addEventListener('input', function () {
        var r = o.validate(num.value);
        if (r.ok) { clearErr(); o.onInput(r.value); }
        else { err.textContent = r.message; num.setAttribute('aria-invalid', 'true'); }
      });
      num.addEventListener('change', function () { if (o.onEnd) o.onEnd(); if (!num.getAttribute('aria-invalid') && o.current) num.value = o.current(); });
    }
    return {
      sync: function (v) {
        if (document.activeElement !== rangeEl) rangeEl.value = o.toSlider ? o.toSlider(v) : v;
        if (num && document.activeElement !== num) num.value = v;
      },
      clear: clearErr
    };
  }

  /** Mémorise l'état AVANT le geste en cours, pour expliquer « de … à … ». */
  function tracker() {
    var base = null, last = null, ended = false;
    return {
      before: function (name, s) { if (name !== last || ended || !base) { base = JSON.parse(JSON.stringify(s)); ended = false; } last = name; },
      end: function () { ended = true; },
      reset: function () { base = null; last = null; ended = false; },
      param: function () { return last; },
      base: function () { return base; }
    };
  }

  function loadParams(labId, defaults, sanitize) {
    var saved = (TCL.store.labOf(TCL.store.get(), labId).params) || {};
    return Object.assign({}, defaults, sanitize ? sanitize(saved) : {});
  }

  function paramSaver(labId) {
    return U.debounce(function (s) {
      TCL.store.update(function (st) { TCL.store.labOf(st, labId).params = JSON.parse(JSON.stringify(s)); }, 'lab-params');
    }, 700);
  }

  /** Missions : vérification sur l'état actuel, enregistrement dans la progression. */
  function bindMissions(scope, labId, labLabel, missions, getState) {
    var store = TCL.store;
    function render() {
      var done = store.labOf(store.get(), labId).missions;
      U.qsa('.mission', scope).forEach(function (el) {
        var ok = !!done[el.getAttribute('data-mission')];
        el.classList.toggle('is-done', ok);
        el.querySelector('.mission__state').innerHTML = ok ? I('check') + '<span>Réussie</span>' : '<span>À faire</span>';
      });
    }
    U.qsa('.mission__check', scope).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var m = missions.filter(function (x) { return x.id === id; })[0];
        var r = m.check(getState());
        var fb = scope.querySelector('#fb-' + id);
        fb.className = 'feedback ' + (r.ok ? 'feedback--ok' : 'feedback--ko');
        fb.innerHTML = I(r.ok ? 'check' : 'info') + '<span>' + esc(r.msg) + '</span>';
        if (r.ok && !store.labOf(store.get(), labId).missions[id]) {
          store.update(function (st) { store.labOf(st, labId).missions[id] = new Date().toISOString(); }, 'mission');
          store.log('mission', labId, 'Mission réussie (' + labLabel + ') : « ' + m.title + ' »');
          U.toast('Mission réussie : ' + m.title, 'success');
        }
        render();
      });
    });
    render();
  }

  function setText(scope, sel, txt) { var el = scope.querySelector(sel); if (el) el.textContent = txt; }

  /** Curseur logarithmique : position 0…1000 <-> valeur entre lo et hi. */
  function logSlider(lo, hi) {
    var a = Math.log10(lo), b = Math.log10(hi);
    return {
      to: function (v) { return Math.round((Math.log10(v) - a) / (b - a) * 1000); },
      from: function (s) { var v = Math.pow(10, a + (b - a) * s / 1000); return Number(v.toPrecision(3)); }
    };
  }

  TCL.labkit = {
    head: head, range: range, select: select, segmented: segmented, chips: chips, readouts: readouts,
    explainBox: explainBox, missionsSection: missionsSection, limits: limits, nextLinks: nextLinks, sequenceLinks: sequenceLinks,
    numberValidator: numberValidator, bindPair: bindPair, tracker: tracker, loadParams: loadParams,
    paramSaver: paramSaver, bindMissions: bindMissions, setText: setText, logSlider: logSlider
  };
})(window);
