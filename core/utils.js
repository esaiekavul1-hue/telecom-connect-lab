/*
 * Petits outils partagés : échappement HTML, dates, notifications, etc.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};

  /** Échappe un texte avant de l'insérer dans du HTML (protection contre l'injection). */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function qs(sel, scope) { return (scope || document).querySelector(sel); }
  function qsa(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  var dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  var timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

  /** Date lisible : « aujourd'hui à 14:05 », « hier à 09:12 » ou « 3 octobre 2026 ». */
  function formatWhen(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var t = d.getTime();
    if (t >= start) return 'aujourd’hui à ' + timeFmt.format(d);
    if (t >= start - 86400000) return 'hier à ' + timeFmt.format(d);
    return 'le ' + dateFmt.format(d);
  }

  /** Message court en bas de l'écran (retour visuel), lu aussi par les lecteurs d'écran. */
  function toast(message, kind) {
    var host = qs('#toast-host');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast toast--' + (kind || 'info');
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    el.innerHTML = TCL.icon(kind === 'success' ? 'check' : kind === 'error' ? 'alert' : 'info') + '<span>' + esc(message) + '</span>';
    host.appendChild(el);
    setTimeout(function () { el.classList.add('toast--out'); }, 3800);
    setTimeout(function () { el.remove(); }, 4300);
  }

  /** Barre de progression accessible. */
  function progressBar(percent, label) {
    var p = Math.max(0, Math.min(100, Math.round(percent)));
    return '<div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p + '" aria-label="' + esc(label || 'Progression') + '">' +
      '<div class="pbar__fill" style="width:' + p + '%"></div></div>';
  }

  function prefersReducedMotion() {
    return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  TCL.util = {
    esc: esc, qs: qs, qsa: qsa, debounce: debounce, formatWhen: formatWhen,
    toast: toast, progressBar: progressBar, prefersReducedMotion: prefersReducedMotion, uid: uid
  };
})(window);
