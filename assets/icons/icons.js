/*
 * Jeu d'icônes TELECOM CONNECT LAB (tracés originaux, grille 24 × 24, trait 1,8).
 * Les icônes sont intégrées en SVG dans la page pour fonctionner aussi
 * lorsque le site est ouvert directement depuis le disque (sans serveur).
 * Utilisation : TCL.icon('flask') -> chaîne SVG décorative (aria-hidden).
 */
(function (root) {
  'use strict';
  var P = {
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
    book: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5.7 1.5 1.5z"/>',
    flask: '<path d="M9.5 3.5h5"/><path d="M10.5 3.5v5.2L5 18.3A1.5 1.5 0 0 0 6.3 20.5h11.4a1.5 1.5 0 0 0 1.3-2.2l-5.5-9.6V3.5"/><path d="M7.6 14.5h8.8"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>',
    chart: '<path d="M4 20h16"/><path d="M7 16.5V11"/><path d="M12 16.5V6.5"/><path d="M17 16.5v-3.5"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6"/>',
    login: '<path d="M13.5 4h4A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-4"/><path d="M4 12h10"/><path d="m10.5 8.5 3.5 3.5-3.5 3.5"/>',
    logout: '<path d="M10.5 4h-4A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h4"/><path d="M9 12h11"/><path d="m16.5 8.5 3.5 3.5-3.5 3.5"/>',
    wave: '<path d="M2.5 12c1.6-5.3 3.2-5.3 4.8 0s3.2 5.3 4.7 0 3.2-5.3 4.8 0 3.1 5.3 4.7 0"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
    x: '<path d="m6.5 6.5 11 11"/><path d="m17.5 6.5-11 11"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    arrowLeft: '<path d="M19 12H5.5"/><path d="m11 6-6 6 6 6"/>',
    arrowRight: '<path d="M5 12h13.5"/><path d="m13 6 6 6-6 6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.6v.1"/>',
    alert: '<path d="M12 4 3 19.5h18z"/><path d="M12 10v4.5"/><path d="M12 17v.1"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="m4 7 8 6 8-6"/>',
    shield: '<path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    cloud: '<path d="M7 18.5h10a4 4 0 0 0 .6-8A5.5 5.5 0 0 0 7 9.2a4.7 4.7 0 0 0 0 9.3z"/>',
    device: '<rect x="6.5" y="3" width="11" height="18" rx="2"/><path d="M11 18h2"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    pause: '<path d="M8.5 5.5v13"/><path d="M15.5 5.5v13"/>',
    antenna: '<path d="M12 10v10.5"/><path d="m8.5 20.5 3.5-10.5 3.5 10.5"/><path d="M8.2 6.2a5.4 5.4 0 0 0 0 7.6"/><path d="M15.8 6.2a5.4 5.4 0 0 1 0 7.6"/><circle cx="12" cy="10" r="1"/>',
    fiber: '<path d="M3 15c4-6 8 2 12-4s5-3 6-3"/><path d="M3 19c4-6 8 2 12-4s5-3 6-3"/>',
    network: '<circle cx="12" cy="5.5" r="2"/><circle cx="5.5" cy="18" r="2"/><circle cx="18.5" cy="18" r="2"/><path d="M11 7.3 6.5 16.2"/><path d="m13 7.3 4.5 8.9"/><path d="M7.5 18h9"/>',
    mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 5h3"/><path d="M4.5 8.5a6 6 0 0 0 0 7"/><path d="M19.5 8.5a6 6 0 0 1 0 7"/>',
    chain: '<rect x="3" y="9" width="5" height="6" rx="1"/><rect x="9.5" y="9" width="5" height="6" rx="1"/><rect x="16" y="9" width="5" height="6" rx="1"/><path d="M8 12h1.5"/><path d="M14.5 12H16"/>',
    modulation: '<path d="M3 12c.8-3 1.5-3 2.2 0s1.5 3 2.2 0 1.5-6 2.3-6 1.5 12 2.3 12 1.5-6 2.2-6 1.5 3 2.3 0 1.4-3 2.2 0 1.5 3 2.3 0"/>',
    em: '<path d="M3 12c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0 3 4 4.5 0"/><path d="M3 12h18" opacity=".45"/><path d="M7.5 6.5v11" opacity=".45"/>',
    propagation: '<circle cx="5" cy="17" r="1.6"/><path d="M8.6 13.4a5 5 0 0 1 0 7.2"/><path d="M11.4 10.6a9 9 0 0 1 0 12.8" transform="translate(0 -3)"/><path d="M14 6a13 13 0 0 1 2 11"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
    sparkle: '<path d="M12 4v4"/><path d="M12 16v4"/><path d="M4 12h4"/><path d="M16 12h4"/><path d="m6.6 6.6 2.1 2.1"/><path d="m15.3 15.3 2.1 2.1"/><path d="m6.6 17.4 2.1-2.1"/><path d="m15.3 8.7 2.1-2.1"/>'
  };

  function icon(name, cls) {
    var body = P[name] || P.info;
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="24" height="24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body + '</svg>';
  }

  root.TCL = root.TCL || {};
  root.TCL.icon = icon;
  root.TCL.iconNames = Object.keys(P);
})(window);
