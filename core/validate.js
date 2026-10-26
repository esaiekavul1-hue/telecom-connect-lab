/*
 * Validation des saisies (adresse e-mail, nom, code reçu par e-mail).
 * Utilisé par le navigateur (TCL.validate) et par les tests Node.
 *
 * IMPORTANT : un format valide ne prouve PAS que l'adresse existe ni qu'elle
 * appartient à l'utilisateur. Seul le code envoyé par e-mail le prouve.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TCL = root.TCL || {};
  root.TCL.validate = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var LOCAL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
  var LABEL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

  function normalizeEmail(raw) {
    return String(raw || '').trim().toLowerCase();
  }

  /**
   * Vérifie le format d'une adresse e-mail.
   * Renvoie { ok: true, email } ou { ok: false, message }.
   */
  function checkEmail(raw) {
    var email = normalizeEmail(raw);
    if (!email) return { ok: false, message: 'Saisissez votre adresse e-mail.' };
    if (/\s/.test(email)) return { ok: false, message: 'L’adresse e-mail ne doit pas contenir d’espace.' };
    if (email.length > 254) return { ok: false, message: 'Cette adresse e-mail est trop longue.' };
    var parts = email.split('@');
    if (parts.length !== 2) return { ok: false, message: 'Une adresse e-mail contient un seul symbole @, par exemple nom@domaine.com.' };
    var local = parts[0], domain = parts[1];
    if (!local) return { ok: false, message: 'Il manque la partie avant le @ (par exemple nom@domaine.com).' };
    if (local.length > 64 || !LOCAL_RE.test(local)) return { ok: false, message: 'La partie avant le @ contient un caractère non autorisé ou un point mal placé.' };
    if (!domain) return { ok: false, message: 'Il manque le domaine après le @ (par exemple gmail.com).' };
    var labels = domain.split('.');
    if (labels.length < 2) return { ok: false, message: 'Le domaine doit contenir un point, par exemple gmail.com.' };
    for (var i = 0; i < labels.length; i++) {
      if (!LABEL_RE.test(labels[i])) return { ok: false, message: 'Le domaine après le @ n’est pas valide. Vérifiez l’orthographe.' };
    }
    var tld = labels[labels.length - 1];
    if (!/^[a-z]{2,63}$/.test(tld)) return { ok: false, message: 'L’extension du domaine (.com, .cd, .fr…) n’est pas valide.' };
    return { ok: true, email: email };
  }

  function checkName(raw) {
    var name = String(raw || '').replace(/\s+/g, ' ').trim();
    if (name.length < 2) return { ok: false, message: 'Saisissez votre nom complet (au moins 2 caractères).' };
    if (name.length > 80) return { ok: false, message: 'Le nom ne doit pas dépasser 80 caractères.' };
    if (/[<>{}]/.test(name)) return { ok: false, message: 'Le nom contient un caractère non autorisé.' };
    return { ok: true, name: name };
  }

  /** Le code reçu par e-mail : 6 à 10 chiffres selon la configuration du service. */
  function checkCode(raw) {
    var code = String(raw || '').replace(/[\s-]/g, '');
    if (!code) return { ok: false, message: 'Saisissez le code reçu par e-mail.' };
    if (!/^\d{6,10}$/.test(code)) return { ok: false, message: 'Le code est composé uniquement de chiffres (6 en général).' };
    return { ok: true, code: code };
  }

  return { normalizeEmail: normalizeEmail, checkEmail: checkEmail, checkName: checkName, checkCode: checkCode };
});
