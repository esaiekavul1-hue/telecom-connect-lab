/*
 * TELECOM CONNECT LAB — Laboratoire « Comprendre les signaux »
 * -----------------------------------------------------------
 * Simulation pédagogique d'une sinusoïde IDÉALE x(t) = A sin(2πft + φ).
 * Toutes les valeurs affichées et le tracé proviennent des mêmes calculs
 * (signal-math.js). Aucune propagation physique n'est simulée.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var M = TCL.signalMath;
  var U = TCL.util;
  var esc = U.esc;

  var LIMITS = { A: { min: 0, max: 10, step: 0.1 }, f: { min: 1, max: 10000 }, phi: { min: -180, max: 180, step: 5 } };
  var WINDOWS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];
  var DEFAULTS = { A: 2, f: 100, phiDeg: 0, win: 0.02, showRef: false, showPeriod: true };

  var missions = [
    {
      id: 'm1', title: 'Obtenir une période de 4 ms',
      text: 'Réglez la fréquence pour que la période du signal soit exactement 4 ms.',
      check: function (s) {
        var T = M.period(s.f);
        if (M.approxEqual(T, 0.004, 0.01)) return { ok: true, msg: 'Réussi : avec f = ' + M.formatFrequency(s.f) + ', T = 1/f = ' + M.formatTime(T) + '.' };
        return { ok: false, msg: 'Période actuelle : ' + M.formatTime(T) + '. Rappel : T = 1/f, avec T en secondes. Utilisez le champ numérique pour une valeur précise.' };
      }
    },
    {
      id: 'm2', title: 'Obtenir 6 V crête à crête',
      text: 'Réglez l’amplitude pour que l’écart entre la crête haute et la crête basse soit de 6 V.',
      check: function (s) {
        var pp = M.peakToPeak(s.A);
        if (Math.abs(pp - 6) < 0.05) return { ok: true, msg: 'Réussi : A = ' + M.formatNumber(s.A) + ' V, donc 2A = ' + M.formatNumber(pp) + ' V crête à crête.' };
        return { ok: false, msg: 'Valeur crête à crête actuelle : ' + M.formatNumber(pp, 3) + ' V. Attention : la valeur crête à crête vaut le double de l’amplitude.' };
      }
    },
    {
      id: 'm3', title: 'Avancer le signal d’un quart de période',
      text: 'Affichez la référence (φ = 0), puis réglez la phase pour que votre signal soit en avance d’un quart de période sur elle.',
      check: function (s) {
        var phi = M.degToRad(s.phiDeg);
        var frac = phi / (2 * Math.PI);
        if (Math.abs(s.phiDeg - 90) < 2.5) return { ok: true, msg: 'Réussi : φ = π/2 rad (90°). Le décalage vaut Δt = T/4 = ' + M.formatTime(M.period(s.f) / 4) + ' d’avance.' };
        var dir = frac > 0 ? 'avance' : frac < 0 ? 'retard' : 'aucun décalage';
        return { ok: false, msg: 'Décalage actuel : ' + (frac === 0 ? 'aucun' : M.formatNumber(Math.abs(frac), 3) + ' période (' + dir + ')') + '. Un cycle complet correspond à 360° ; une avance demande une phase positive.' };
      }
    }
  ];

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function fToSlider(f) { return Math.round(Math.log10(f) / 4 * 1000); }
  function sliderToF(s) { var f = Math.pow(10, s / 1000 * 4); return f >= 100 ? Math.round(f) : Math.round(f * 10) / 10; }

  function phaseText(deg) {
    var rad = M.degToRad(deg);
    return M.formatPhase(rad) + ' rad (' + M.formatNumber(deg, 4) + '°)';
  }

  /* ----------------------------- Explications dynamiques ----------------------------- */

  function explain(param, before, s) {
    var T0 = M.period(before.f), T1 = M.period(s.f);
    var n1 = M.periodsInWindow(s.f, s.win);
    if (param === 'f') {
      if (M.approxEqual(before.f, s.f, 1e-9)) return null;
      var ratio = s.f / before.f;
      var r = ratio >= 1 ? '× ' + M.formatNumber(ratio, 3) : '÷ ' + M.formatNumber(1 / ratio, 3);
      return '<p>La fréquence passe de <strong>' + M.formatFrequency(before.f) + '</strong> à <strong>' + M.formatFrequency(s.f) + '</strong> (' + r + ').</p>' +
        '<p>La période étant l’inverse de la fréquence (T = 1/f), elle passe de ' + M.formatTime(T0) + ' à <strong>' + M.formatTime(T1) + '</strong> : chaque cycle dure ' + (ratio > 1 ? 'moins' : 'plus') + ' longtemps, les cycles sont plus ' + (ratio > 1 ? 'serrés' : 'espacés') + '.</p>' +
        '<p>Dans la fenêtre de ' + M.formatTime(s.win) + ', on voit maintenant ' + M.formatNumber(n1, 3) + ' période' + (n1 >= 2 ? 's' : '') + ' au lieu de ' + M.formatNumber(M.periodsInWindow(before.f, s.win), 3) + '. La hauteur des crêtes (A = ' + M.formatNumber(s.A) + ' V) ne change pas.</p>';
    }
    if (param === 'A') {
      if (before.A === s.A) return null;
      if (s.A === 0) return '<p>L’amplitude vaut 0 V : le signal est nul à chaque instant (une droite sur l’axe du temps). Il ne transporte plus aucune variation, donc plus d’information. La fréquence réglée (' + M.formatFrequency(s.f) + ') n’est plus observable.</p>';
      return '<p>L’amplitude passe de <strong>' + M.formatNumber(before.A) + ' V</strong> à <strong>' + M.formatNumber(s.A) + ' V</strong>. Les crêtes ' + (s.A > before.A ? 'montent' : 'descendent') + ' à +' + M.formatNumber(s.A) + ' V et −' + M.formatNumber(s.A) + ' V (crête à crête : ' + M.formatNumber(M.peakToPeak(s.A)) + ' V).</p>' +
        '<p>La fréquence (' + M.formatFrequency(s.f) + ') et la période (' + M.formatTime(T1) + ') ne changent pas : les crêtes restent aux mêmes instants. A multiplie le sinus de l’extérieur ; elle étire la courbe verticalement sans toucher à l’angle 2πft + φ.</p>';
    }
    if (param === 'phiDeg') {
      if (before.phiDeg === s.phiDeg) return null;
      var phi = M.degToRad(s.phiDeg), dt = M.timeShift(phi, s.f);
      var txt = '<p>La phase passe de ' + phaseText(before.phiDeg) + ' à <strong>' + phaseText(s.phiDeg) + '</strong>.</p>';
      if (s.phiDeg === 0) return txt + '<p>Le signal n’est plus décalé : il part de 0 en montant à t = 0, comme la référence.</p>';
      txt += '<p>Par rapport à φ = 0, la courbe est décalée <strong>vers la ' + (dt > 0 ? 'gauche' : 'droite') + '</strong> de Δt = φ/(2πf) = <strong>' + M.formatTime(Math.abs(dt), 3) + '</strong> : le signal est <strong>en ' + (dt > 0 ? 'avance' : 'retard') + '</strong> de ' + M.formatNumber(Math.abs(s.phiDeg) / 360, 3) + ' période (T = ' + M.formatTime(T1) + ').</p>';
      if (Math.abs(s.phiDeg) === 180) txt += '<p>À ±180°, le signal est en <strong>opposition de phase</strong> : il est l’inverse exact de la référence.</p>';
      return txt + '<p>Sa forme, son amplitude et sa fréquence sont inchangées. À t = 0, il vaut x(0) = A·sin φ = ' + M.formatNumber(M.value(s.A, s.f, phi, 0), 3) + ' V.</p>';
    }
    if (param === 'win') {
      if (before.win === s.win) return null;
      return '<p>La fenêtre d’observation passe à <strong>' + M.formatTime(s.win) + '</strong> : vous voyez maintenant ' + M.formatNumber(n1, 3) + ' période' + (n1 >= 2 ? 's' : '') + '. Le signal lui-même n’a pas changé (f = ' + M.formatFrequency(s.f) + ', T = ' + M.formatTime(T1) + ') : seul le « zoom » horizontal est modifié, comme le réglage de la base de temps d’un oscilloscope.</p>';
    }
    return null;
  }

  function intro(s) {
    return '<p>Modifiez un paramètre : l’explication s’adaptera aux valeurs affichées.</p>' +
      '<p>Réglage actuel : une sinusoïde de ' + M.formatNumber(s.A) + ' V d’amplitude à ' + M.formatFrequency(s.f) + '. Chaque cycle dure T = 1/f = ' + M.formatTime(M.period(s.f)) + ', et la fenêtre de ' + M.formatTime(s.win) + ' en montre ' + M.formatNumber(M.periodsInWindow(s.f, s.win), 3) + '.</p>';
  }

  /* ------------------------------------ Phaseur ------------------------------------ */

  function phasorSvg(s) {
    var R = 66, c = 84, phi = M.degToRad(s.phiDeg);
    var r = (s.A / LIMITS.A.max) * R;
    var x = c + r * Math.cos(phi), y = c - r * Math.sin(phi);
    var x0 = M.value(s.A, s.f, phi, 0);
    var arc = '';
    if (Math.abs(s.phiDeg) > 0 && r > 0) {
      var ar = Math.min(26, Math.max(14, r * 0.45));
      var ex = c + ar * Math.cos(phi), ey = c - ar * Math.sin(phi);
      arc = '<path class="phasor__arc" d="M' + (c + ar) + ' ' + c + ' A' + ar + ' ' + ar + ' 0 0 ' + (phi > 0 ? 0 : 1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '"/>';
    }
    return '<svg class="phasor" viewBox="0 0 168 168" width="168" height="168" role="img" aria-label="Représentation de la phase : vecteur de longueur ' + esc(M.formatNumber(s.A)) + ' volts faisant un angle de ' + esc(M.formatNumber(s.phiDeg)) + ' degrés ; sa projection verticale vaut x(0) = ' + esc(M.formatNumber(x0, 3)) + ' volts.">' +
      '<circle class="phasor__ring" cx="' + c + '" cy="' + c + '" r="' + R + '"/>' +
      '<line class="phasor__axis" x1="' + (c - R - 8) + '" y1="' + c + '" x2="' + (c + R + 8) + '" y2="' + c + '"/>' +
      '<line class="phasor__axis" x1="' + c + '" y1="' + (c - R - 8) + '" x2="' + c + '" y2="' + (c + R + 8) + '"/>' +
      (r > 0 ? '<circle class="phasor__amp" cx="' + c + '" cy="' + c + '" r="' + r.toFixed(1) + '"/>' : '') +
      arc +
      '<line class="phasor__proj" x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + c + '" y2="' + y.toFixed(1) + '"/>' +
      '<line class="phasor__vec" x1="' + c + '" y1="' + c + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>' +
      '<circle class="phasor__tip" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5"/>' +
      '<circle class="phasor__x0" cx="' + c + '" cy="' + y.toFixed(1) + '" r="4"/>' +
      '</svg>';
  }

  /* --------------------------------- Montage de la page --------------------------------- */

  function mount(container) {
    var store = TCL.store;
    var saved = (store.labOf(store.get(), 'signaux').params) || {};
    var s = Object.assign({}, DEFAULTS, sanitize(saved));
    var committed = Object.assign({}, s);
    var lastParam = null;

    container.innerHTML = template(s);
    var $ = function (sel) { return container.querySelector(sel); };

    var plotEl = $('#lab-plot');
    var cursorT = null;
    var chart = TCL.plot.mount(plotEl, function () {
      return Object.assign(TCL.plot.sineOptions({
        A: s.A, f: s.f, phi: M.degToRad(s.phiDeg), win: s.win,
        reference: s.showRef ? { A: s.A } : null, showShift: s.showRef, showPeriod: s.showPeriod,
        title: 'Simulation : x(t) = A sin(2πft + φ)'
      }), { ratio: plotEl.clientWidth < 520 ? 0.72 : 0.48 });
    }, function () { placeCursor(); });

    /* --- Lecture au curseur (souris, doigt ou flèches du clavier) --- */
    function placeCursor() {
      var svg = plotEl.querySelector('svg');
      var g = svg && svg.querySelector('.scope__cursor');
      var out = $('#lab-cursor');
      if (!g) return;
      if (cursorT == null) { g.setAttribute('hidden', ''); out.textContent = 'Survolez le graphique (ou utilisez les flèches ← →) pour lire x(t).'; return; }
      var sc = chart.scale;
      var val = M.value(s.A, s.f, M.degToRad(s.phiDeg), cursorT);
      g.removeAttribute('hidden');
      var line = g.querySelector('line'), dot = g.querySelector('circle');
      var px = sc.X(cursorT);
      line.setAttribute('x1', px); line.setAttribute('x2', px);
      dot.setAttribute('cx', px); dot.setAttribute('cy', sc.Y(Math.max(-sc.yMax, Math.min(sc.yMax, val))));
      out.textContent = 'Curseur : t = ' + M.formatNumber(cursorT * sc.unit.factor, 4) + ' ' + sc.unit.unit + ', x(t) = ' + M.formatNumber(Math.abs(val) < 1e-9 ? 0 : val, 3) + ' V';
    }
    function pointerToT(ev) {
      var svg = plotEl.querySelector('svg');
      var rect = svg.getBoundingClientRect();
      var sc = chart.scale;
      var px = (ev.clientX - rect.left) * (sc.W / rect.width);
      return clamp((px - sc.left) / sc.width, 0, 1) * s.win;
    }
    plotEl.addEventListener('pointermove', function (ev) { cursorT = pointerToT(ev); placeCursor(); });
    plotEl.addEventListener('pointerdown', function (ev) { cursorT = pointerToT(ev); placeCursor(); });
    plotEl.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') { cursorT = null; placeCursor(); } });
    plotEl.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'Home' && ev.key !== 'End') return;
      ev.preventDefault();
      var step = s.win / 100;
      if (cursorT == null) cursorT = 0;
      if (ev.key === 'ArrowLeft') cursorT = Math.max(0, cursorT - step);
      if (ev.key === 'ArrowRight') cursorT = Math.min(s.win, cursorT + step);
      if (ev.key === 'Home') cursorT = 0;
      if (ev.key === 'End') cursorT = s.win;
      placeCursor();
    });

    /* --- Mise à jour de tout l'affichage --- */
    function refresh() {
      chart.update();
      var phi = M.degToRad(s.phiDeg), T = M.period(s.f), dt = M.timeShift(phi, s.f);
      $('#expr').innerHTML = 'x(t) = ' + M.formatNumber(s.A) + ' · sin(2π · ' + M.formatNumber(s.f, 6) + ' · t' + (s.phiDeg === 0 ? '' : (s.phiDeg > 0 ? ' + ' : ' − ') + M.formatPhase(Math.abs(phi))) + ')';
      setText('#r-A', M.formatNumber(s.A) + ' V');
      setText('#r-pp', M.formatNumber(M.peakToPeak(s.A)) + ' V');
      setText('#r-rms', M.formatNumber(M.rms(s.A), 3) + ' V');
      setText('#r-f', M.formatFrequency(s.f, 6) + (s.f >= 1000 ? ' (' + M.formatNumber(s.f, 6) + ' Hz)' : ''));
      setText('#r-T', M.formatTime(T));
      setText('#r-w', M.formatNumber(M.angularFrequency(s.f), 4) + ' rad/s');
      setText('#r-phi', phaseText(s.phiDeg));
      setText('#r-dt', s.phiDeg === 0 ? 'aucun' : M.formatTime(Math.abs(dt), 3) + (dt > 0 ? ' d’avance' : ' de retard'));
      setText('#r-n', M.formatNumber(M.periodsInWindow(s.f, s.win), 3));
      setText('#r-x0', M.formatNumber(Math.abs(M.value(s.A, s.f, phi, 0)) < 1e-9 ? 0 : M.value(s.A, s.f, phi, 0), 3) + ' V');
      $('#phasor').innerHTML = phasorSvg(s);
      $('#legend-ref').hidden = !s.showRef;
      // valeurs à côté des curseurs
      setText('#out-A', M.formatNumber(s.A) + ' V');
      setText('#out-f', M.formatFrequency(s.f, 6));
      setText('#out-phi', phaseText(s.phiDeg));
      // synchroniser les champs (sans écraser une saisie en cours)
      syncField('#in-A-range', s.A); syncField('#in-A', s.A);
      syncField('#in-f-range', fToSlider(s.f)); syncField('#in-f', s.f);
      syncField('#in-phi-range', s.phiDeg); syncField('#in-phi', s.phiDeg);
      syncField('#in-win', String(s.win));
      $('#in-ref').checked = s.showRef; $('#in-period').checked = s.showPeriod;
      placeCursor();
      updateExplanation();
      saveParams();
    }
    function setText(sel, t) { var el = $(sel); if (el) el.textContent = t; }
    function syncField(sel, val) {
      var el = $(sel);
      if (el && document.activeElement !== el) el.value = val;
    }

    function updateExplanation() {
      var html = lastParam ? explain(lastParam, committed, s) : null;
      $('#explain').innerHTML = html || intro(s);
    }

    var saveParams = U.debounce(function () {
      store.update(function (st) { store.labOf(st, 'signaux').params = { A: s.A, f: s.f, phiDeg: s.phiDeg, win: s.win, showRef: s.showRef, showPeriod: s.showPeriod }; }, 'lab-params');
    }, 700);

    /* --- Liaison des commandes --- */
    // L'explication compare l'état AVANT le geste en cours (committed) à l'état actuel.
    // Un geste se termine quand l'utilisateur relâche le curseur ou valide un champ.
    var gestureEnded = false;
    function setParam(name, value, single) {
      if (name !== lastParam || gestureEnded) { committed = Object.assign({}, s); gestureEnded = false; }
      lastParam = name;
      s[name] = value;
      refresh();
      if (single) gestureEnded = true;
    }

    function bindPair(rangeSel, numSel, name, fromRange, validate) {
      var range = $(rangeSel), num = $(numSel), err = $(numSel + '-err');
      range.addEventListener('input', function () { err.textContent = ''; num.removeAttribute('aria-invalid'); setParam(name, fromRange(Number(range.value))); });
      num.addEventListener('input', function () {
        var r = validate(num.value);
        if (r.ok) { err.textContent = ''; num.removeAttribute('aria-invalid'); setParam(name, r.value); }
        else { err.textContent = r.message; num.setAttribute('aria-invalid', 'true'); }
      });
      range.addEventListener('change', function () { gestureEnded = true; });
      num.addEventListener('change', function () { gestureEnded = true; if (num.getAttribute('aria-invalid')) return; num.value = s[name]; });
    }

    function numberValidator(lo, hi, unit, decimals) {
      return function (raw) {
        var n = M.parseNumber(raw);
        if (!isFinite(n)) return { ok: false, message: 'Saisissez un nombre.' };
        if (n < lo || n > hi) return { ok: false, message: 'Valeur autorisée : de ' + M.formatNumber(lo) + ' à ' + M.formatNumber(hi) + ' ' + unit + '.' };
        var p = Math.pow(10, decimals);
        return { ok: true, value: Math.round(n * p) / p };
      };
    }

    bindPair('#in-A-range', '#in-A', 'A', function (v) { return Math.round(v * 10) / 10; }, numberValidator(LIMITS.A.min, LIMITS.A.max, 'V', 2));
    bindPair('#in-f-range', '#in-f', 'f', sliderToF, numberValidator(LIMITS.f.min, LIMITS.f.max, 'Hz', 3));
    bindPair('#in-phi-range', '#in-phi', 'phiDeg', function (v) { return v; }, numberValidator(LIMITS.phi.min, LIMITS.phi.max, '°', 2));

    $('#in-win').addEventListener('change', function (e) { setParam('win', Number(e.target.value), true); });
    $('#in-ref').addEventListener('change', function (e) { s.showRef = e.target.checked; refresh(); });
    $('#in-period').addEventListener('change', function (e) { s.showPeriod = e.target.checked; refresh(); });
    U.qsa('[data-phase]', container).forEach(function (b) {
      b.addEventListener('click', function () { setParam('phiDeg', Number(b.getAttribute('data-phase')), true); });
    });
    $('#lab-reset').addEventListener('click', function () {
      s = Object.assign({}, DEFAULTS);
      committed = Object.assign({}, s);
      lastParam = null;
      U.qsa('.field-error', container).forEach(function (e) { e.textContent = ''; });
      U.qsa('[aria-invalid]', container).forEach(function (e) { e.removeAttribute('aria-invalid'); });
      refresh();
      U.toast('Paramètres réinitialisés : A = 2 V, f = 100 Hz, φ = 0, fenêtre 20 ms.', 'info');
    });

    /* --- Missions de vérification --- */
    function renderMissions() {
      var done = store.labOf(store.get(), 'signaux').missions;
      U.qsa('.mission', container).forEach(function (el) {
        var id = el.getAttribute('data-mission');
        var ok = !!done[id];
        el.classList.toggle('is-done', ok);
        el.querySelector('.mission__state').innerHTML = ok ? TCL.icon('check') + '<span>Réussie</span>' : '<span>À faire</span>';
      });
    }
    U.qsa('.mission__check', container).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var m = missions.filter(function (x) { return x.id === id; })[0];
        var r = m.check(s);
        var fb = container.querySelector('#fb-' + id);
        fb.className = 'feedback ' + (r.ok ? 'feedback--ok' : 'feedback--ko');
        fb.innerHTML = TCL.icon(r.ok ? 'check' : 'info') + '<span>' + esc(r.msg) + '</span>';
        if (r.ok) {
          var already = store.labOf(store.get(), 'signaux').missions[id];
          if (!already) {
            store.update(function (st) { store.labOf(st, 'signaux').missions[id] = new Date().toISOString(); }, 'mission');
            store.log('mission', 'signaux', 'Mission réussie au laboratoire : « ' + m.title + ' »');
            U.toast('Mission réussie : ' + m.title, 'success');
          }
          renderMissions();
        }
      });
    });

    refresh();
    renderMissions();
    return function cleanup() { chart.destroy(); };
  }

  function sanitize(p) {
    var out = {};
    if (isFinite(p.A)) out.A = clamp(Number(p.A), LIMITS.A.min, LIMITS.A.max);
    if (isFinite(p.f)) out.f = clamp(Number(p.f), LIMITS.f.min, LIMITS.f.max);
    if (isFinite(p.phiDeg)) out.phiDeg = clamp(Number(p.phiDeg), LIMITS.phi.min, LIMITS.phi.max);
    if (WINDOWS.indexOf(Number(p.win)) >= 0) out.win = Number(p.win);
    if (typeof p.showRef === 'boolean') out.showRef = p.showRef;
    if (typeof p.showPeriod === 'boolean') out.showPeriod = p.showPeriod;
    return out;
  }

  function template(s) {
    var I = TCL.icon;
    var winOpts = WINDOWS.map(function (w) {
      return '<option value="' + w + '">' + M.formatTime(w) + '</option>';
    }).join('');
    var missionHtml = missions.map(function (m, i) {
      return '<li class="mission" data-mission="' + m.id + '">' +
        '<div class="mission__head"><span class="mission__num" aria-hidden="true">' + (i + 1) + '</span><h3>' + esc(m.title) + '</h3><span class="mission__state"></span></div>' +
        '<p>' + esc(m.text) + '</p>' +
        '<button type="button" class="btn btn--ghost btn--sm mission__check" data-id="' + m.id + '">Vérifier mes réglages</button>' +
        '<div class="feedback" id="fb-' + m.id + '" role="status" aria-live="polite"></div></li>';
    }).join('');

    return [
      '<div class="lab">',
      '<div class="page-head page-head--lab">',
      '<div><h1 tabindex="-1">Laboratoire : comprendre les signaux</h1>',
      '<p class="page-head__text">Faites varier l’amplitude, la fréquence et la phase d’une sinusoïde, et observez immédiatement l’effet sur la courbe et sur les valeurs calculées.</p></div>',
      '<p class="badge badge--model">' + I('info') + '<span>Simulation pédagogique d’un signal sinusoïdal idéal</span></p>',
      '</div>',
      '<div class="lab__grid">',
      '<div class="lab__main">',
      '<div class="scope-panel">',
      '<div class="scope-panel__bar"><p class="scope-panel__expr" id="expr" aria-live="off"></p>',
      '<p class="scope-panel__legend"><span class="sw sw--trace"></span>Signal<span id="legend-ref" hidden><span class="sw sw--ref"></span>Référence φ = 0</span></p></div>',
      '<div class="scope-panel__plot" id="lab-plot" tabindex="0" aria-describedby="lab-cursor"></div>',
      '<p class="scope-panel__cursor" id="lab-cursor" aria-live="polite"></p>',
      '</div>',
      '<dl class="readouts" aria-label="Valeurs calculées">',
      ro('Amplitude A', 'r-A'), ro('Crête à crête 2A', 'r-pp'), ro('Valeur efficace A/√2', 'r-rms'),
      ro('Fréquence f', 'r-f'), ro('Période T = 1/f', 'r-T'), ro('Pulsation ω = 2πf', 'r-w'),
      ro('Phase φ', 'r-phi'), ro('Décalage Δt = φ/(2πf)', 'r-dt'), ro('x(0) = A sin φ', 'r-x0'),
      ro('Périodes affichées', 'r-n'),
      '</dl>',
      '<div class="lab__explain-row">',
      '<section class="explain" aria-labelledby="explain-title"><h2 id="explain-title">' + I('sparkle') + 'Ce qui se passe</h2><div id="explain" aria-live="polite"></div></section>',
      '<div class="phasor-box"><h2>La phase sur un cercle</h2><div id="phasor"></div><p>Le vecteur de longueur A tourne à la vitesse ω. À t = 0, il fait l’angle φ ; sa hauteur donne x(0).</p></div>',
      '</div>',
      '</div>',
      '<aside class="lab__controls" aria-label="Commandes de la simulation">',
      '<form class="controls" onsubmit="return false" novalidate>',
      '<div class="control">',
      '<div class="control__top"><label for="in-A-range">Amplitude <var>A</var></label><output id="out-A" for="in-A-range"></output></div>',
      '<input type="range" id="in-A-range" min="0" max="10" step="0.1" aria-describedby="hint-A">',
      '<div class="control__num"><label for="in-A" class="sr-only">Amplitude en volts</label><input type="text" inputmode="decimal" id="in-A" aria-describedby="hint-A in-A-err"><span>V</span></div>',
      '<p class="control__hint" id="hint-A">De 0 à 10 V. Change la hauteur des crêtes, pas la période.</p><p class="field-error" id="in-A-err" aria-live="polite"></p>',
      '</div>',
      '<div class="control">',
      '<div class="control__top"><label for="in-f-range">Fréquence <var>f</var></label><output id="out-f" for="in-f-range"></output></div>',
      '<input type="range" id="in-f-range" min="0" max="1000" step="1" aria-describedby="hint-f">',
      '<div class="control__num"><label for="in-f" class="sr-only">Fréquence en hertz</label><input type="text" inputmode="decimal" id="in-f" aria-describedby="hint-f in-f-err"><span>Hz</span></div>',
      '<p class="control__hint" id="hint-f">De 1 Hz à 10 kHz (curseur logarithmique). Nombre de cycles par seconde ; la période vaut T = 1/f.</p><p class="field-error" id="in-f-err" aria-live="polite"></p>',
      '</div>',
      '<div class="control">',
      '<div class="control__top"><label for="in-phi-range">Phase <var>φ</var></label><output id="out-phi" for="in-phi-range"></output></div>',
      '<input type="range" id="in-phi-range" min="-180" max="180" step="5" aria-describedby="hint-phi">',
      '<div class="control__num"><label for="in-phi" class="sr-only">Phase en degrés</label><input type="text" inputmode="decimal" id="in-phi" aria-describedby="hint-phi in-phi-err"><span>°</span></div>',
      '<div class="chips" role="group" aria-label="Phases remarquables">',
      '<button type="button" class="chip" data-phase="-90">−π/2</button><button type="button" class="chip" data-phase="0">0</button><button type="button" class="chip" data-phase="45">π/4</button><button type="button" class="chip" data-phase="90">π/2</button><button type="button" class="chip" data-phase="180">π</button>',
      '</div>',
      '<p class="control__hint" id="hint-phi">De −180° à +180° (−π à +π rad). Décale la courbe horizontalement.</p><p class="field-error" id="in-phi-err" aria-live="polite"></p>',
      '</div>',
      '<div class="control">',
      '<label for="in-win">Fenêtre de temps affichée</label>',
      '<select id="in-win" aria-describedby="hint-win">' + winOpts + '</select>',
      '<p class="control__hint" id="hint-win">Zoom horizontal : ne modifie pas le signal.</p>',
      '</div>',
      '<div class="control control--checks">',
      '<label class="check"><input type="checkbox" id="in-ref"><span>Afficher la référence φ = 0</span></label>',
      '<label class="check"><input type="checkbox" id="in-period"><span>Afficher le repère de période T</span></label>',
      '</div>',
      '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + I('reset') + 'Réinitialiser</button>',
      '</form>',
      '</aside>',
      '</div>',
      '<section class="missions" aria-labelledby="missions-title">',
      '<div class="section-head"><h2 id="missions-title">Vérifiez votre compréhension</h2><p>Trois missions à réaliser avec les commandes. La vérification utilise vos réglages actuels.</p></div>',
      '<ol class="missions__list">' + missionHtml + '</ol>',
      '</section>',
      '<section class="limits callout callout--info"><h2>' + I('info') + 'Limites de cette simulation</h2>',
      '<p>Ce laboratoire calcule une sinusoïde mathématique idéale, parfaitement régulière et sans bruit. Il ne simule ni la propagation d’une onde radio dans l’environnement, ni l’atténuation d’un câble, ni les déformations introduites par les circuits réels. Sur un vrai oscilloscope, vous observeriez un signal proche, mais légèrement bruité.</p></section>',
      '<nav class="next-links" aria-label="Suite du module">',
      '<a class="btn btn--ghost" href="#/lecons/signaux">' + I('book') + 'Revoir la leçon</a>',
      '<a class="btn btn--primary" href="#/defis/signaux">' + I('target') + 'Passer aux exercices</a>',
      '</nav>',
      '</div>'
    ].join('');
  }

  function ro(label, id) {
    return '<div class="readout"><dt>' + label + '</dt><dd id="' + id + '"></dd></div>';
  }

  TCL.labs = TCL.labs || {};
  TCL.labs.signaux = { mount: mount, missions: missions, DEFAULTS: DEFAULTS, LIMITS: LIMITS, explain: explain, sliderToF: sliderToF, fToSlider: fToSlider };
})(window);
