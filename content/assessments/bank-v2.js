/*
 * TELECOM CONNECT LAB 2.0 — Banque de questions des modules ajoutés.
 * CE DOSSIER N'EST JAMAIS PUBLIÉ (voir tools/build-www.js) : les corrigés restent sur le serveur.
 * Les réponses numériques sont CALCULÉES par les fonctions des modules, jamais recopiées.
 * Une relecture par un enseignant reste nécessaire avant tout usage à enjeu.
 * ⚠ Ne pas réordonner les paramètres d'une question publiée : voir bank.js.
 */
'use strict';
var path = require('path');
function mod(id) { return require(path.join(__dirname, '..', '..', 'modules', id, id + '.js')).math; }
var K = require('../../core/module-kit.js');
var IDS = ['a', 'b', 'c', 'd'];
function fN(x, s) { return K.fN(x, s || 4); }

function num(id, skill, params, fn) {
  return { id: id, skill: skill, kind: 'numeric', variants: params.map(function (p) {
    var r = fn(p), answer = { value: r.value };
    if (r.abs != null) answer.abs = r.abs; else answer.rel = r.rel != null ? r.rel : 0.02;
    return { prompt: r.prompt, unit: r.unit || '', answer: answer, display: fN(r.value) + (r.unit ? ' ' + r.unit : ''), explanation: r.explanation };
  }) };
}
function mcq(id, skill, prompt, correct, wrong, explanation) {
  return { id: id, skill: skill, kind: 'qcm', variants: [0, 1, 2, 3].map(function (n) {
    var labels = wrong.slice(), at = n % (wrong.length + 1);
    labels.splice(at, 0, correct);
    return { prompt: '<p>' + prompt + '</p>', options: labels.map(function (l, i) { return { id: IDS[i], label: l }; }), answer: { id: IDS[at] }, display: correct, explanation: '<p>' + explanation + '</p>' };
  }) };
}
function P(s) { return '<p>' + s + '</p>'; }

var AC = mod('ac'), AN = mod('analyse'), DI = mod('diodes'), TR = mod('transistors'), OP = mod('aop'), CA = mod('can'), ME = mod('mesures'), RF = mod('rf');
var FO = mod('fourier'), NU = mod('numerique'), MU = mod('multiplexage'), QU = mod('qualite'), SA = mod('satellite'), G5 = mod('5g'), SF = mod('sans-fil'), IN = mod('ingenierie');
var BI = mod('binaire'), OR = mod('ordinateur'), SY = mod('systemes'), RI = mod('reseaux-info'), CL = mod('cloud'), MA = mod('maintenance');
var II = mod('iot-intro'), IC = mod('iot-capteurs'), IM = mod('iot-com'), IE = mod('iot-energie');
var TAU = 2 * Math.PI;
var b = {};

b.ac = [
  num('ac-eff', 'Valeur efficace', [[230], [120], [12], [48]], function (p) { return { prompt: P('Une sinusoïde a une valeur efficace de ' + fN(p[0]) + ' V. Calculez son amplitude, en V.'), value: p[0] * Math.SQRT2, unit: 'V', explanation: P('V<sub>p</sub> = V<sub>eff</sub> × √2.') }; }),
  num('ac-xc', 'Réactances', [[10, 50], [1, 1000], [100, 60], [0.1, 10000]], function (p) { var x = 1 / (TAU * p[1] * p[0] * 1e-6); return { prompt: P('Calculez la réactance d’un condensateur de ' + fN(p[0]) + ' µF à ' + fN(p[1]) + ' Hz, en Ω.'), value: x, unit: 'Ω', explanation: P('X<sub>C</sub> = 1/(2πfC).') }; }),
  num('ac-z', 'Impédance', [[100, 0.1, 10, 200], [50, 0.2, 20, 100], [220, 0.05, 1, 1000]], function (p) { var r = AC.series('rlc', 10, p[0], p[1], p[2] * 1e-6, p[3]); return { prompt: P('RLC série : R = ' + fN(p[0]) + ' Ω, L = ' + fN(p[1]) + ' H, C = ' + fN(p[2]) + ' µF, f = ' + fN(p[3]) + ' Hz. Calculez |Z|, en Ω.'), value: r.Z, unit: 'Ω', explanation: P('|Z| = √(R² + (X<sub>L</sub> − X<sub>C</sub>)²).') }; }),
  num('ac-res', 'Résonance', [[1, 100], [10, 1], [100, 10], [0.5, 47]], function (p) { var f = AC.f0(p[0] * 1e-3, p[1] * 1e-9) / 1000; return { prompt: P('Calculez la fréquence de résonance pour L = ' + fN(p[0]) + ' mH et C = ' + fN(p[1]) + ' nF, en kHz.'), value: f, unit: 'kHz', explanation: P('f₀ = 1/(2π√(LC)).') }; }),
  num('ac-p', 'Puissances', [[230, 2, 0.8], [220, 5, 0.9], [120, 3, 0.7]], function (p) { return { prompt: P('Un appareil sous ' + fN(p[0]) + ' V absorbe ' + fN(p[1]) + ' A, avec cos φ = ' + fN(p[2]) + '. Calculez la puissance active, en W.'), value: p[0] * p[1] * p[2], unit: 'W', explanation: P('P = V·I·cos φ.') }; }),
  mcq('ac-reson', 'Résonance', 'Dans un circuit RLC série à la résonance, le courant est :', 'maximal et en phase avec la tension', ['nul', 'minimal', 'en quadrature avec la tension'], 'La réactance totale s’annule, donc Z = R.')
];
b.analyse = [
  num('an-th', 'Thévenin', [[24, 1000, 1000, 2000], [12, 470, 1000, 2200], [9, 220, 330, 1000]], function (p) { var t = AN.thevenin(p[0], 0, p[1], p[2], p[3]); return { prompt: P('E₁ = ' + fN(p[0]) + ' V, E₂ remplacée par un fil, R₁ = ' + fN(p[1]) + ' Ω, R₂ = ' + fN(p[2]) + ' Ω, R₃ = ' + fN(p[3]) + ' Ω. Calculez V<sub>th</sub> au point A, en V.'), value: t.Vth, unit: 'V', explanation: P('V<sub>th</sub> = (E₁/R₁)/G avec G = 1/R₁ + 1/R₂ + 1/R₃.') }; }),
  num('an-rth', 'Thévenin', [[1000, 1000, 2000], [470, 1000, 2200], [100, 200, 300]], function (p) { var t = AN.thevenin(0, 0, p[0], p[1], p[2]); return { prompt: P('Calculez R<sub>th</sub> de trois résistances en parallèle : ' + fN(p[0]) + ' Ω, ' + fN(p[1]) + ' Ω, ' + fN(p[2]) + ' Ω.'), value: t.Rth, unit: 'Ω', explanation: P('R<sub>th</sub> = 1/(1/R₁ + 1/R₂ + 1/R₃).') }; }),
  num('an-norton', 'Norton', [[9, 450], [12, 60], [5, 250]], function (p) { return { prompt: P('V<sub>th</sub> = ' + fN(p[0]) + ' V et R<sub>th</sub> = ' + fN(p[1]) + ' Ω. Calculez I<sub>N</sub>, en mA.'), value: p[0] / p[1] * 1000, unit: 'mA', explanation: P('I<sub>N</sub> = V<sub>th</sub>/R<sub>th</sub>.') }; }),
  num('an-pmax', 'Transfert de puissance', [[12, 8], [10, 100], [24, 50]], function (p) { return { prompt: P('V<sub>th</sub> = ' + fN(p[0]) + ' V, R<sub>th</sub> = ' + fN(p[1]) + ' Ω. Calculez la puissance maximale disponible, en W.'), value: AN.pMax(p[0], p[1]), unit: 'W', explanation: P('P<sub>max</sub> = V²/(4R).') }; }),
  num('an-eta', 'Transfert de puissance', [[10, 90], [50, 50], [25, 75]], function (p) { return { prompt: P('R<sub>th</sub> = ' + fN(p[0]) + ' Ω et R<sub>L</sub> = ' + fN(p[1]) + ' Ω. Calculez le rendement, en %.'), value: p[1] / (p[0] + p[1]) * 100, unit: '%', explanation: P('η = R<sub>L</sub>/(R<sub>L</sub> + R<sub>th</sub>).') }; }),
  mcq('an-off', 'Thévenin', 'Pour calculer R<sub>th</sub>, une source de courant idéale est remplacée par :', 'un circuit ouvert', ['un court-circuit', 'une résistance de 1 Ω', 'une source de tension'], 'Éteinte, elle impose un courant nul.')
];
b.diodes = [
  num('di-crete', 'Redressement', [[9], [12], [24], [6]], function (p) { return { prompt: P('Un secondaire délivre ' + fN(p[0]) + ' V efficaces. Calculez la tension de crête, en V.'), value: p[0] * Math.SQRT2, unit: 'V', explanation: P('V<sub>p</sub> = V<sub>eff</sub> × √2.') }; }),
  num('di-moy', 'Redressement', [[10], [17], [34]], function (p) { return { prompt: P('Redressement double alternance idéal, crête ' + fN(p[0]) + ' V, sans condensateur. Calculez la tension moyenne, en V.'), value: 2 * p[0] / Math.PI, unit: 'V', explanation: P('V<sub>moy</sub> = 2V<sub>p</sub>/π.') }; }),
  num('di-c', 'Filtrage', [[1, 2], [0.5, 1], [2, 2.5]], function (p) { return { prompt: P('Pont à 50 Hz, ' + fN(p[0]) + ' A de charge, ' + fN(p[1]) + ' V d’ondulation admis. Calculez C minimal, en µF.'), value: p[0] / (2 * 50 * p[1]) * 1e6, unit: 'µF', rel: 0.03, explanation: P('C ≥ I/(2f·ΔV).') }; }),
  num('di-z', 'Stabilisation', [[12, 100, 470], [15, 220, 1000], [9, 68, 330]], function (p) { var z = DI.zener(p[0], p[1], 5.1, p[2], 0.178); return { prompt: P('Entrée ' + fN(p[0]) + ' V, R<sub>s</sub> = ' + fN(p[1]) + ' Ω, V<sub>Z</sub> = 5,1 V, charge ' + fN(p[2]) + ' Ω. Calculez I<sub>Z</sub>, en mA.'), value: z.Iz * 1000, unit: 'mA', rel: 0.03, explanation: P('I<sub>Z</sub> = (V<sub>e</sub> − V<sub>Z</sub>)/R<sub>s</sub> − V<sub>Z</sub>/R<sub>L</sub>.') }; }),
  num('di-reg', 'Stabilisation', [[12, 0.5], [9, 1], [15, 0.2]], function (p) { return { prompt: P('Un régulateur 5 V reçoit ' + fN(p[0]) + ' V et débite ' + fN(p[1]) + ' A. Calculez la puissance dissipée, en W.'), value: (p[0] - 5) * p[1], unit: 'W', explanation: P('P = (V<sub>e</sub> − V<sub>s</sub>) × I.') }; }),
  mcq('di-cond', 'Jonction PN', 'Une diode au silicium en conduction directe présente typiquement une chute de :', 'environ 0,6 à 1 V', ['exactement 0 V', 'environ 5 V', 'la tension d’alimentation'], 'La chute dépend du courant, comme l’indiquent les fiches techniques.')
];
b.transistors = [
  num('tr-ic', 'Bipolaire', [[20, 150], [10, 200], [50, 100]], function (p) { return { prompt: P('I<sub>B</sub> = ' + fN(p[0]) + ' µA, β = ' + fN(p[1]) + ', région active. Calculez I<sub>C</sub>, en mA.'), value: p[0] * p[1] / 1000, unit: 'mA', explanation: P('I<sub>C</sub> = β I<sub>B</sub>.') }; }),
  num('tr-vth', 'Polarisation', [[12, 47, 10], [15, 68, 10], [9, 33, 10]], function (p) { return { prompt: P('V<sub>CC</sub> = ' + fN(p[0]) + ' V, R₁ = ' + fN(p[1]) + ' kΩ, R₂ = ' + fN(p[2]) + ' kΩ. Calculez V<sub>th</sub> du pont, en V.'), value: p[0] * p[2] / (p[1] + p[2]), unit: 'V', explanation: P('V<sub>th</sub> = V<sub>CC</sub> R₂/(R₁ + R₂).') }; }),
  num('tr-gm', 'Amplification', [[1], [2], [5]], function (p) { return { prompt: P('I<sub>C</sub> = ' + fN(p[0]) + ' mA à 300 K. Calculez g<sub>m</sub>, en mS.'), value: p[0] / 25.85 * 1000, unit: 'mS', rel: 0.03, explanation: P('g<sub>m</sub> = I<sub>C</sub>/V<sub>T</sub>, V<sub>T</sub> ≈ 25,85 mV.') }; }),
  num('tr-av', 'Amplification', [[4700, 470], [2200, 220], [10000, 1000]], function (p) { return { prompt: P('R<sub>C</sub> = ' + fN(p[0]) + ' Ω, R<sub>E</sub> = ' + fN(p[1]) + ' Ω non découplée. Calculez |A<sub>v</sub>| avec l’approximation usuelle.'), value: p[0] / p[1], unit: '', explanation: P('|A<sub>v</sub>| ≈ R<sub>C</sub>/R<sub>E</sub>.') }; }),
  num('tr-mos', 'MOSFET', [[0.2, 1.5, 3.5], [0.1, 2, 4], [0.5, 1, 2]], function (p) { var r = TR.nmosId(p[2], 20, p[0], p[1], 0); return { prompt: P('k = ' + fN(p[0]) + ' A/V², V<sub>th</sub> = ' + fN(p[1]) + ' V, V<sub>GS</sub> = ' + fN(p[2]) + ' V, en saturation, λ = 0. Calculez I<sub>D</sub>, en A.'), value: r.Id, unit: 'A', explanation: P('I<sub>D</sub> = (k/2)(V<sub>GS</sub> − V<sub>th</sub>)².') }; }),
  mcq('tr-sat', 'Bipolaire', 'En saturation, la tension V<sub>CE</sub> d’un NPN est :', 'faible, environ 0,2 V', ['égale à V<sub>CC</sub>', 'négative', 'toujours égale à 5 V'], 'Le transistor se comporte comme un interrupteur fermé.')
];
b.aop = [
  num('op-inv', 'Montages', [[47, 4.7], [100, 10], [22, 2.2]], function (p) { return { prompt: P('Inverseur, R<sub>f</sub> = ' + fN(p[0]) + ' kΩ et R<sub>g</sub> = ' + fN(p[1]) + ' kΩ. Calculez le gain (avec son signe).'), value: OP.gain('inv', p[0], p[1]), unit: '', explanation: P('G = −R<sub>f</sub>/R<sub>g</sub>.') }; }),
  num('op-non', 'Montages', [[90, 10], [47, 10], [22, 2]], function (p) { return { prompt: P('Non inverseur, R<sub>f</sub> = ' + fN(p[0]) + ' kΩ et R<sub>g</sub> = ' + fN(p[1]) + ' kΩ. Calculez le gain.'), value: OP.gain('non', p[0], p[1]), unit: '', explanation: P('G = 1 + R<sub>f</sub>/R<sub>g</sub>.') }; }),
  num('op-bw', 'Limites', [[1.5, 100], [10, 50], [3, 20]], function (p) { return { prompt: P('GBW = ' + fN(p[0]) + ' MHz, gain de bruit ' + fN(p[1]) + '. Calculez la bande passante, en kHz.'), value: p[0] * 1000 / p[1], unit: 'kHz', explanation: P('f<sub>c</sub> ≈ GBW/gain.') }; }),
  num('op-sr', 'Limites', [[0.5, 5], [0.5, 10], [13, 10]], function (p) { return { prompt: P('SR = ' + fN(p[0]) + ' V/µs, sortie de ' + fN(p[1]) + ' V d’amplitude. Calculez la fréquence maximale, en kHz.'), value: OP.fullPower(p[0] * 1e6, p[1]) / 1000, unit: 'kHz', explanation: P('f = SR/(2πV<sub>p</sub>).') }; }),
  num('op-rc', 'Filtres', [[1600, 100], [10000, 10], [470, 1000]], function (p) { return { prompt: P('R = ' + fN(p[0]) + ' Ω, C = ' + fN(p[1]) + ' nF. Calculez la fréquence de coupure du premier ordre, en Hz.'), value: 1 / (TAU * p[0] * p[1] * 1e-9), unit: 'Hz', explanation: P('f<sub>c</sub> = 1/(2πRC).') }; }),
  mcq('op-osc', 'Oscillateurs', 'Pour un oscillateur de Wien, le gain de l’amplificateur doit être :', 'égal à 3', ['égal à 1', 'nul', 'égal à 10'], 'Le réseau de Wien atténue par 3 à sa fréquence centrale.')
];
b.logique = [
  mcq('lo-xor', 'Portes', 'A = 1 et B = 1 : la sortie d’un OU exclusif vaut :', '0', ['1', 'indéfinie', '2'], 'A ⊕ B = 1 seulement si les entrées diffèrent.'),
  mcq('lo-nand', 'Portes', 'A = 1 et B = 0 : la sortie d’une porte NON-ET vaut :', '1', ['0', 'indéfinie', 'la moitié de V<sub>cc</sub>'], 'La sortie ne vaut 0 que si toutes les entrées valent 1.'),
  mcq('lo-dm', 'Algèbre de Boole', 'Le complément de A·B est :', 'Ā + B̄', ['Ā · B̄', 'A + B', 'A · B̄'], 'Loi de De Morgan.'),
  num('lo-add', 'Combinatoire', [[11, 6], [9, 7], [15, 1], [5, 8]], function (p) { return { prompt: P('Additionnez ' + p[0].toString(2) + ' et ' + p[1].toString(2) + ' en binaire. Donnez le résultat en décimal.'), value: p[0] + p[1], abs: 0.1, unit: '', explanation: P('La retenue se propage de bit en bit.') }; }),
  num('lo-div', 'Séquentiel', [[8, 3], [16, 4], [32, 5]], function (p) { return { prompt: P('Une horloge de ' + fN(p[0]) + ' MHz traverse ' + p[1] + ' bascules en diviseur. Calculez la fréquence de sortie, en MHz.'), value: p[0] / Math.pow(2, p[1]), unit: 'MHz', explanation: P('Chaque bascule divise la fréquence par deux.') }; }),
  mcq('lo-dff', 'Séquentiel', 'Entre deux fronts montants, la sortie d’une bascule D :', 'conserve sa valeur', ['suit D en permanence', 's’annule', 'oscille'], 'La bascule ne capture D qu’au front d’horloge.')
];
b.can = [
  num('ca-fs', 'Échantillonnage', [[20], [4], [3.4], [100]], function (p) { return { prompt: P('Un signal occupe jusqu’à ' + fN(p[0]) + ' kHz. Calculez la fréquence minimale théorique d’échantillonnage, en kHz.'), value: 2 * p[0], unit: 'kHz', explanation: P('f<sub>e</sub> > 2B.') }; }),
  num('ca-alias', 'Échantillonnage', [[7, 10], [11, 8], [900, 1000]], function (p) { return { prompt: P('Une sinusoïde de ' + fN(p[0]) + ' kHz est échantillonnée à ' + fN(p[1]) + ' kHz. À quelle fréquence apparaît-elle, en kHz ?'), value: CA.alias(p[0], p[1]), unit: 'kHz', explanation: P('f apparente = |f − k·f<sub>e</sub>|.') }; }),
  num('ca-lsb', 'Quantification', [[3.3, 12], [5, 10], [2.048, 8]], function (p) { return { prompt: P('CAN ' + p[1] + ' bits, référence ' + fN(p[0]) + ' V. Calculez le pas, en mV.'), value: CA.lsb(p[0], p[1]) * 1000, unit: 'mV', explanation: P('q = V<sub>ref</sub>/2<sup>N</sup>.') }; }),
  num('ca-snr', 'Quantification', [[8], [10], [12], [16]], function (p) { return { prompt: P('Calculez le SNR théorique d’un CAN ' + p[0] + ' bits, en dB.'), value: CA.sqnr(p[0]), unit: 'dB', rel: 0.01, explanation: P('SNR ≈ 6,02N + 1,76 dB.') }; }),
  num('ca-dac', 'CNA', [[5, 128, 8], [2.56, 200, 8], [3.3, 512, 10]], function (p) { return { prompt: P('CNA ' + p[2] + ' bits, V<sub>ref</sub> = ' + fN(p[0]) + ' V, code ' + p[1] + '. Calculez la sortie, en V.'), value: p[0] * p[1] / Math.pow(2, p[2]), unit: 'V', explanation: P('V = V<sub>ref</sub>·C/2<sup>N</sup>.') }; }),
  mcq('ca-aa', 'Échantillonnage', 'Le filtre anti-repliement se place :', 'avant l’échantillonneur', ['après le CNA uniquement', 'dans le processeur', 'sur la référence'], 'Une fois replié, un signal ne peut plus être corrigé.')
];
b.mesures = [
  num('me-inc', 'Multimètre', [[12, 0.5, 2, 0.01], [5, 1, 2, 0.01], [230, 1.2, 5, 0.1]], function (p) { return { prompt: P('Lecture ' + fN(p[0]) + ' V, précision ±(' + fN(p[1]) + ' % + ' + p[2] + ' digits), résolution ' + fN(p[3]) + ' V. Calculez l’incertitude, en V.'), value: ME.resolutionErr(p[0], p[1], p[2], p[3]), unit: 'V', rel: 0.03, explanation: P('Δx = a % × lecture + b × résolution.') }; }),
  num('me-f', 'Oscilloscope', [[5, 100], [4, 200], [8, 50]], function (p) { return { prompt: P('Une période occupe ' + p[0] + ' carreaux à ' + p[1] + ' µs/div. Calculez la fréquence, en kHz.'), value: 1000 / (p[0] * p[1]), unit: 'kHz', explanation: P('f = 1/(N<sub>div</sub> × s/div).') }; }),
  num('me-v', 'Oscilloscope', [[6, 0.5], [4, 2], [5, 1]], function (p) { return { prompt: P('Le signal couvre ' + p[0] + ' carreaux à ' + fN(p[1]) + ' V/div. Calculez V<sub>cc</sub>, en V.'), value: p[0] * p[1], unit: 'V', explanation: P('V<sub>cc</sub> = carreaux × V/div.') }; }),
  num('me-rms', 'Oscilloscope', [[2.5], [5], [10]], function (p) { return { prompt: P('Sinusoïde d’amplitude ' + fN(p[0]) + ' V. Calculez sa valeur efficace, en V.'), value: ME.rmsAC(p[0]), unit: 'V', explanation: P('V<sub>eff</sub> = V<sub>p</sub>/√2.') }; }),
  num('me-load', 'Influence de l’instrument', [[1e6, 1e7], [1e5, 1e7], [1e6, 1e6]], function (p) { return { prompt: P('Source de résistance ' + K.si(p[0], 'Ω') + ', voltmètre de ' + K.si(p[1], 'Ω') + '. Calculez le rapport tension lue/tension réelle, en %.'), value: ME.loading(p[0], p[1]) * 100, unit: '%', explanation: P('Rapport = R<sub>m</sub>/(R<sub>s</sub> + R<sub>m</sub>).') }; }),
  mcq('me-meth', 'Dépannage', 'Pour localiser une panne dans une chaîne, on mesure d’abord :', 'au milieu de la chaîne', ['au hasard', 'uniquement à la sortie, sans autre contrôle', 'la couleur des composants'], 'Chaque mesure élimine la moitié des causes possibles.')
];
b.rf = [
  num('rf-g', 'Réflexion', [[100, 50], [75, 50], [25, 50]], function (p) { return { prompt: P('Charge de ' + p[0] + ' Ω sur une ligne de ' + p[1] + ' Ω. Calculez |Γ|.'), value: RF.abs(RF.gamma({ re: p[0], im: 0 }, p[1])), unit: '', explanation: P('Γ = (Z<sub>L</sub> − Z₀)/(Z<sub>L</sub> + Z₀).') }; }),
  num('rf-swr', 'Réflexion', [[0.2], [1 / 3], [0.5]], function (p) { return { prompt: P('Calculez le ROS pour |Γ| = ' + fN(p[0]) + '.'), value: (1 + p[0]) / (1 - p[0]), unit: '', explanation: P('ROS = (1 + |Γ|)/(1 − |Γ|).') }; }),
  num('rf-rl', 'Réflexion', [[0.1], [0.5], [0.05]], function (p) { return { prompt: P('|Γ| = ' + fN(p[0]) + '. Calculez l’affaiblissement de réflexion, en dB.'), value: RF.returnLoss({ re: p[0], im: 0 }), unit: 'dB', explanation: P('RL = −20 log₁₀|Γ|.') }; }),
  num('rf-qw', 'Transformation', [[75, 50], [50, 100], [70, 35]], function (p) { return { prompt: P('Ligne quart d’onde de ' + p[0] + ' Ω chargée par ' + p[1] + ' Ω. Calculez Z<sub>in</sub>, en Ω.'), value: p[0] * p[0] / p[1], unit: 'Ω', explanation: P('Z<sub>in</sub> = Z₀²/Z<sub>L</sub>.') }; }),
  num('rf-l', 'Adaptation', [[50, 200], [50, 450], [75, 300]], function (p) { return { prompt: P('Réseau en L adaptant ' + p[0] + ' Ω à ' + p[1] + ' Ω. Calculez Q.'), value: RF.lMatch(p[0], p[1]).Q, unit: '', explanation: P('Q = √(R<sub>h</sub>/R<sub>b</sub> − 1).') }; }),
  mcq('rf-match', 'Réflexion', 'Une charge égale à Z₀ donne :', 'un ROS de 1', ['un ROS infini', 'une réflexion totale', 'un |Γ| de 1'], 'Aucune onde n’est réfléchie.')
];
b.fourier = [
  num('fo-a1', 'Spectre', [[2], [5], [1.5]], function (p) { return { prompt: P('Carré d’amplitude ' + fN(p[0]) + ' V. Calculez l’amplitude du fondamental, en V.'), value: 4 * p[0] / Math.PI, unit: 'V', explanation: P('a₁ = 4A/π.') }; }),
  num('fo-an', 'Spectre', [[10, 5], [4, 3], [8, 7]], function (p) { return { prompt: P('Carré d’amplitude ' + fN(p[0]) + ' V. Calculez l’amplitude de l’harmonique ' + p[1] + ', en V.'), value: 4 * p[0] / (Math.PI * p[1]), unit: 'V', explanation: P('a<sub>n</sub> = 4A/(πn) pour n impair.') }; }),
  num('fo-g', 'Filtres', [[2], [5], [10]], function (p) { return { prompt: P('Calculez le gain d’un passe-bas du premier ordre à f = ' + p[0] + ' f<sub>c</sub>.'), value: FO.lpResp(p[0], 1).mag, unit: '', explanation: P('|H| = 1/√(1 + (f/f<sub>c</sub>)²).') }; }),
  num('fo-b', 'Largeur de bande', [[2, 7], [1, 5], [4, 9]], function (p) { return { prompt: P('Carré de ' + p[0] + ' kHz transmis jusqu’au rang ' + p[1] + '. Calculez la bande nécessaire, en kHz.'), value: p[0] * p[1], unit: 'kHz', explanation: P('Bande = rang × fréquence.') }; }),
  mcq('fo-odd', 'Spectre', 'Un carré symétrique contient :', 'des harmoniques impaires', ['des harmoniques paires', 'une seule sinusoïde', 'aucune harmonique'], 'La symétrie annule les rangs pairs.'),
  mcq('fo-lti', 'Systèmes', 'Un système linéaire invariant peut :', 'modifier l’amplitude et la phase de chaque fréquence', ['créer de nouvelles fréquences', 'doubler toutes les fréquences', 'transformer un sinus en carré'], 'Seul un système non linéaire crée de nouvelles fréquences.')
];
b.numerique = [
  num('nu-c', 'Shannon', [[1, 15], [2, 31], [20, 3]], function (p) { return { prompt: P('Canal de ' + p[0] + ' MHz, SNR de ' + p[1] + ' (linéaire). Calculez la capacité, en Mbit/s.'), value: p[0] * Math.log2(1 + p[1]), unit: 'Mbit/s', explanation: P('C = B log₂(1 + S/N).') }; }),
  num('nu-k', 'Modulations', [[4], [16], [64], [256]], function (p) { return { prompt: P('Combien de bits transporte un symbole à ' + p[0] + ' états ?'), value: Math.log2(p[0]), abs: 0.1, unit: 'bits', explanation: P('log₂ M.') }; }),
  num('nu-bd', 'Modulations', [[12, 16], [10, 4], [18, 64]], function (p) { return { prompt: P('Débit de ' + p[0] + ' Mbit/s en ' + p[1] + '-QAM ou équivalent. Calculez la rapidité, en Mbaud.'), value: p[0] / Math.log2(p[1]), unit: 'Mbaud', explanation: P('Rapidité = débit / bits par symbole.') }; }),
  { id: 'nu-ham', skill: 'Codage', kind: 'text', variants: [[1, 0, 1, 1], [0, 1, 1, 0], [1, 1, 0, 0]].map(function (d) { var w = NU.hammingEncode(d).join(''); return { prompt: P('Encodez les données ' + d.join(' ') + ' en Hamming(7,4), avec p₁ = d₁⊕d₂⊕d₄, p₂ = d₁⊕d₃⊕d₄, p₃ = d₂⊕d₃⊕d₄, dans l’ordre p₁ p₂ d₁ p₃ d₂ d₃ d₄. Répondez sur 7 bits.'), answer: { accepted: [w] }, display: w, explanation: P('Le mot est ' + w + '.') }; }) },
  mcq('nu-crc', 'Codage', 'Un CRC permet :', 'de détecter des erreurs', ['de corriger toutes les erreurs', 'de chiffrer les données', 'de multiplier le débit'], 'Il sert à la détection.'),
  mcq('nu-man', 'Codage en ligne', 'Le code Manchester facilite :', 'la récupération de l’horloge', ['la réduction de la bande', 'le chiffrement', 'la compression'], 'Une transition par bit fournit des repères temporels.')
];
b.multiplexage = [
  num('mu-tdm', 'TDM', [[32, 8, 125], [24, 8, 125], [16, 8, 125]], function (p) { return { prompt: P(p[0] + ' voies de ' + p[1] + ' bits, trame de ' + p[2] + ' µs. Calculez le débit, en Mbit/s.'), value: MU.tdm(p[0], p[1], p[2] * 1e-6) / 1e6, unit: 'Mbit/s', explanation: P('D = N·b/T.') }; }),
  num('mu-tu', 'OFDM', [[15], [30], [60]], function (p) { return { prompt: P('Espacement de ' + p[0] + ' kHz. Calculez T<sub>u</sub>, en µs.'), value: 1000 / p[0], unit: 'µs', explanation: P('T<sub>u</sub> = 1/Δf.') }; }),
  num('mu-b', 'OFDM', [[3276, 30], [1200, 15], [600, 15]], function (p) { return { prompt: P(p[0] + ' sous-porteuses espacées de ' + p[1] + ' kHz. Calculez la bande, en MHz.'), value: p[0] * p[1] / 1000, unit: 'MHz', explanation: P('B = N·Δf.') }; }),
  num('mu-al', 'Accès aléatoire', [[0.5], [1], [2]], function (p) { return { prompt: P('G = ' + fN(p[0]) + ' en ALOHA à créneaux. Calculez S.'), value: MU.aloha('slotted', p[0]), unit: '', explanation: P('S = G e<sup>−G</sup>.') }; }),
  mcq('mu-cp', 'OFDM', 'Le préfixe cyclique sert à :', 'absorber l’étalement des trajets multiples', ['augmenter le débit', 'chiffrer le signal', 'supprimer les sous-porteuses'], 'Il protège le symbole utile des échos.'),
  mcq('mu-wdm', 'Multiplexage', 'Le WDM est utilisé :', 'sur les fibres optiques', ['sur les câbles téléphoniques uniquement', 'dans les bus de processeur', 'dans les diodes Zener'], 'Plusieurs longueurs d’onde sur une fibre.')
];
b.qualite = [
  num('qu-dbm', 'Décibels', [[100], [1], [1000]], function (p) { return { prompt: P('Convertissez ' + p[0] + ' mW en dBm.'), value: 10 * Math.log10(p[0]), abs: 0.1, unit: 'dBm', explanation: P('P<sub>dBm</sub> = 10 log₁₀ P<sub>mW</sub>.') }; }),
  num('qu-noise', 'Bruit', [[1e6], [2e7], [1e5]], function (p) { return { prompt: P('Calculez le bruit thermique à 290 K dans ' + K.si(p[0], 'Hz') + ', en dBm.'), value: QU.noiseDbm(p[0]), abs: 0.3, unit: 'dBm', explanation: P('N = 10 log₁₀(kTB/1 mW).') }; }),
  num('qu-friis', 'Bruit', [[15, 2, 8], [20, 1, 10], [10, 3, 12]], function (p) { return { prompt: P('LNA : gain ' + p[0] + ' dB, NF ' + p[1] + ' dB ; mélangeur NF ' + p[2] + ' dB. Calculez le NF total, en dB.'), value: QU.friis([{ g: p[0], nf: p[1] }, { g: 0, nf: p[2] }]).nf, abs: 0.15, unit: 'dB', explanation: P('F = F₁ + (F₂ − 1)/G₁.') }; }),
  num('qu-evm', 'Œil et EVM', [[10], [5], [1]], function (p) { return { prompt: P('EVM de ' + p[0] + ' %. Calculez sa valeur en dB.'), value: QU.evmDb(p[0]), abs: 0.15, unit: 'dB', explanation: P('EVM<sub>dB</sub> = 20 log₁₀(EVM<sub>%</sub>/100).') }; }),
  mcq('qu-first', 'Bruit', 'Dans une cascade, l’étage qui compte le plus pour le bruit est :', 'le premier', ['le dernier', 'celui du milieu', 'aucun'], 'La contribution des suivants est divisée par le gain des précédents.'),
  mcq('qu-eye', 'Œil et EVM', 'Un œil bien ouvert indique :', 'une décision fiable au récepteur', ['une panne de l’émetteur', 'une fréquence nulle', 'une alimentation trop faible'], 'Les niveaux restent bien séparés à l’instant de décision.')
];
b.satellite = [
  num('sa-t', 'Orbites', [[500], [1200], [20200]], function (p) { return { prompt: P('Calculez la période d’une orbite circulaire à ' + p[0] + ' km, en minutes.'), value: SA.period(p[0]) / 60, unit: 'min', explanation: P('T = 2π√(a³/µ).') }; }),
  num('sa-v', 'Orbites', [[500], [1200], [35786]], function (p) { return { prompt: P('Calculez la vitesse orbitale à ' + p[0] + ' km, en km/s.'), value: SA.speed(p[0]), unit: 'km/s', explanation: P('v = √(µ/a).') }; }),
  num('sa-l', 'Bilan', [[1000, 12], [36000, 4], [550, 20]], function (p) { return { prompt: P('d = ' + p[0] + ' km, f = ' + p[1] + ' GHz. Calculez l’affaiblissement en espace libre, en dB.'), value: SA.fspl(p[0], p[1]), abs: 0.3, unit: 'dB', explanation: P('L = 92,45 + 20 log₁₀ d + 20 log₁₀ f.') }; }),
  num('sa-cn', 'Bilan', [[50, 205, 20], [40, 180, 10], [52, 206, 25]], function (p) { return { prompt: P('EIRP = ' + p[0] + ' dBW, L = ' + p[1] + ' dB, G/T = ' + p[2] + ' dB/K. Calculez C/N₀, en dB·Hz.'), value: SA.cn0(p[0], p[1], p[2]), abs: 0.2, unit: 'dB·Hz', explanation: P('C/N₀ = EIRP − L + G/T + 228,6.') }; }),
  num('sa-d', 'Bilan', [[7, 12], [3, 2], [7.5, 20]], function (p) { return { prompt: P('Vitesse radiale ' + p[0] + ' km/s à ' + p[1] + ' GHz. Calculez le décalage Doppler, en kHz.'), value: SA.doppler(p[0], p[1] * 1e9) / 1000, unit: 'kHz', explanation: P('Δf ≈ (v/c) f.') }; }),
  mcq('sa-geo', 'Orbites', 'Un satellite géostationnaire est placé à environ :', '35 786 km', ['550 km', '2 000 km', '384 000 km'], 'À cette altitude, la période égale un jour sidéral.')
];
b['5g'] = [
  num('g5-scs', 'Numérologie', [[0], [2], [3]], function (p) { return { prompt: P('Calculez l’espacement des sous-porteuses pour µ = ' + p[0] + ', en kHz.'), value: G5.scs(p[0]), abs: 0.5, unit: 'kHz', explanation: P('Δf = 2<sup>µ</sup>·15 kHz.') }; }),
  num('g5-slot', 'Numérologie', [[1], [2], [3]], function (p) { return { prompt: P('Calculez la durée d’un créneau pour µ = ' + p[0] + ', en µs.'), value: G5.slot(p[0]) * 1e6, unit: 'µs', explanation: P('T = 1 ms / 2<sup>µ</sup>.') }; }),
  num('g5-rate', 'Débit', [[1, 100, 4, 8], [1, 20, 2, 6], [0, 20, 2, 6]], function (p) { var v = G5.peak({ mu: p[0], bw: p[1], layers: p[2], qm: p[3], scale: 1, dir: 'dl' }); return { prompt: P('µ = ' + p[0] + ', ' + p[1] + ' MHz (N<sub>PRB</sub> = ' + G5.NRB[p[0]][p[1]] + '), ' + p[2] + ' couches, Q<sub>m</sub> = ' + p[3] + ', f = 1, descendant FR1. Calculez le débit maximal, en Mbit/s.'), value: v, unit: 'Mbit/s', rel: 0.03, explanation: P('Formule TS 38.306 §4.1.2.') }; }),
  num('g5-ag', 'Antennes', [[8], [32], [64]], function (p) { return { prompt: P('Calculez le gain de réseau de ' + p[0] + ' éléments, en dB.'), value: G5.arrayGainDb(p[0]), unit: 'dB', explanation: P('G ≈ 10 log₁₀ N.') }; }),
  mcq('g5-slice', 'Architecture', 'Une tranche de réseau est :', 'un réseau logique isolé sur une infrastructure commune', ['une bande de fréquences', 'une antenne', 'un câble optique'], 'Elle adapte le réseau à un usage.'),
  mcq('g5-mimo', 'Antennes', 'Le nombre de flux MIMO est limité par :', 'min(N<sub>t</sub>, N<sub>r</sub>)', ['N<sub>t</sub> + N<sub>r</sub>', 'la fréquence seule', 'la longueur du câble'], 'Le plus petit nombre d’antennes des deux côtés fixe la limite.')
];
b['sans-fil'] = [
  num('sf-c', 'Canaux', [[1], [6], [11]], function (p) { return { prompt: P('Calculez la fréquence centrale du canal ' + p[0] + ' à 2,4 GHz, en MHz.'), value: SF.centre(p[0]), abs: 0.5, unit: 'MHz', explanation: P('f<sub>c</sub> = 2407 + 5n.') }; }),
  num('sf-l', 'Couverture', [[10, 3], [20, 3], [15, 2.5]], function (p) { return { prompt: P('f = 2437 MHz, d = ' + p[0] + ' m, n = ' + p[1] + ', sans mur. Calculez L, en dB.'), value: SF.pathLoss(2437, p[0], p[1], 0, 0), abs: 0.5, unit: 'dB', explanation: P('L = 20 log₁₀ f − 27,55 + 10n log₁₀ d.') }; }),
  num('sf-r', 'Couverture', [[20, 30], [40, 25], [20, 10]], function (p) { return { prompt: P(p[0] + ' MHz, SNR ' + p[1] + ' dB. Calculez la limite de Shannon, en Mbit/s.'), value: SF.shannonRate(p[0] * 1e6, p[1]) / 1e6, unit: 'Mbit/s', explanation: P('C = B log₂(1 + S/N).') }; }),
  num('sf-p', 'Accès', [[16, 2], [16, 10], [32, 5]], function (p) { return { prompt: P('W = ' + p[0] + ', n = ' + p[1] + ' stations. Calculez p<sub>c</sub>.'), value: SF.collisionProb(p[1], p[0]), unit: '', explanation: P('p<sub>c</sub> = 1 − (1 − 1/W)<sup>n−1</sup>.') }; }),
  mcq('sf-ch', 'Canaux', 'Quel trio est disjoint à 2,4 GHz ?', '1, 6 et 11', ['1, 2 et 3', '2, 4 et 6', '5, 7 et 9'], 'Il faut au moins 25 MHz d’écart.'),
  mcq('sf-csma', 'Accès', 'En Wi-Fi, une station :', 'attend un délai aléatoire avant d’émettre', ['émet sans écouter', 'réserve la bande pour toujours', 'détecte les collisions en émettant'], 'C’est le mécanisme CSMA/CA.')
];
b.ingenierie = [
  num('in-a', 'Trafic', [[300, 180], [600, 120], [1800, 120]], function (p) { return { prompt: P(p[0] + ' appels par heure de ' + p[1] + ' s. Calculez le trafic, en Erlang.'), value: IN.traffic(p[0], p[1]), unit: 'Erl', explanation: P('A = λ·h.') }; }),
  num('in-b', 'Trafic', [[2, 3], [5, 8], [10, 15]], function (p) { return { prompt: P('A = ' + p[0] + ' Erlangs, ' + p[1] + ' circuits. Calculez le blocage, en %.'), value: IN.erlangB(p[0], p[1]) * 100, unit: '%', explanation: P('Formule Erlang B.') }; }),
  num('in-m', 'Trafic', [[10, 0.01], [5, 0.02], [20, 0.01]], function (p) { return { prompt: P('A = ' + p[0] + ' Erlangs, blocage visé ' + (p[1] * 100) + ' %. Combien de circuits ?'), value: IN.channelsFor(p[0], p[1]), abs: 0.5, unit: '', explanation: P('Plus petit m tel que B(A, m) ≤ cible.') }; }),
  num('in-av', 'Disponibilité', [[1000, 2], [8760, 24], [500, 5]], function (p) { return { prompt: P('MTBF = ' + p[0] + ' h, MTTR = ' + p[1] + ' h. Calculez la disponibilité, en %.'), value: IN.avail(p[0], p[1]) * 100, abs: 0.05, unit: '%', explanation: P('A = MTBF/(MTBF + MTTR).') }; }),
  num('in-par', 'Disponibilité', [[0.95, 2], [0.99, 2], [0.9, 3]], function (p) { return { prompt: P(p[1] + ' éléments disponibles à ' + (p[0] * 100) + ' % en parallèle. Calculez la disponibilité, en %.'), value: IN.parallel(p[0], p[1]) * 100, abs: 0.02, unit: '%', explanation: P('A = 1 − (1 − a)<sup>n</sup>.') }; }),
  mcq('in-busy', 'Trafic', 'Un réseau se dimensionne d’après :', 'l’heure chargée', ['la moyenne annuelle', 'la nuit', 'le week-end'], 'Il doit écouler le trafic de pointe.')
];
b.binaire = [
  num('bi-dec', 'Numération', [[202], [85], [170], [39]], function (p) { var s = p[0].toString(2); return { prompt: P('Convertissez ' + s + ' en décimal.'), value: p[0], abs: 0.1, unit: '', explanation: P('Somme des poids des bits à 1.') }; }),
  { id: 'bi-hex', skill: 'Numération', kind: 'text', variants: [255, 171, 32, 128].map(function (n) { var h = BI.toHex(n); return { prompt: P('Convertissez ' + n + ' en hexadécimal (deux chiffres, sans préfixe).'), answer: { accepted: [h, h.toLowerCase()] }, display: h, explanation: P('Le résultat est ' + h + '.') }; }) },
  { id: 'bi-neg', skill: 'Entiers signés', kind: 'text', variants: [-3, -5, -20].map(function (n) { var b8 = BI.fromInt(n, 8).join(''); return { prompt: P('Codez ' + n + ' sur 8 bits en complément à deux.'), answer: { accepted: [b8] }, display: b8, explanation: P('Inverser les bits puis ajouter 1.') }; }) },
  num('bi-range', 'Entiers signés', [[8], [16], [12]], function (p) { return { prompt: P('Quelle est la valeur maximale d’un entier signé de ' + p[0] + ' bits ?'), value: BI.signedRange(p[0]).max, abs: 0.1, unit: '', explanation: P('2<sup>n−1</sup> − 1.') }; }),
  num('bi-rate', 'Tailles', [[80], [100], [16]], function (p) { return { prompt: P('Un lien de ' + p[0] + ' Mbit/s transfère combien de Mo par seconde ?'), value: p[0] / 8, unit: 'Mo/s', explanation: P('1 octet = 8 bits.') }; }),
  mcq('bi-kib', 'Tailles', 'Combien d’octets contient 1 Kio ?', '1024', ['1000', '100', '2048'], 'Le préfixe binaire kibi vaut 2¹⁰.')
];
b.ordinateur = [
  num('or-t', 'Performance', [[1e9, 2, 2], [2e9, 1.5, 3], [4e9, 1, 2]], function (p) { return { prompt: P(fN(p[0]) + ' instructions, CPI = ' + fN(p[1]) + ', f = ' + p[2] + ' GHz. Calculez le temps, en s.'), value: p[0] * p[1] / (p[2] * 1e9), unit: 's', explanation: P('T = N × CPI / f.') }; }),
  num('or-amat', 'Mémoire', [[2, 10, 80], [1, 5, 100], [1, 2, 200]], function (p) { return { prompt: P('H = ' + p[0] + ' ns, MR = ' + p[1] + ' %, AMP = ' + p[2] + ' ns. Calculez l’AMAT, en ns.'), value: OR.amat(p[0], p[1] / 100, p[2]), unit: 'ns', explanation: P('AMAT = H + MR × AMP.') }; }),
  num('or-addr', 'Mémoire', [[32], [20], [16]], function (p) { return { prompt: P('Combien d’octets une adresse de ' + p[0] + ' bits peut-elle désigner, en Kio ?'), value: Math.pow(2, p[0]) / 1024, unit: 'Kio', explanation: P('2<sup>n</sup> octets, divisés par 1024.') }; }),
  mcq('or-pc', 'Cycle d’instruction', 'Le compteur de programme contient :', 'l’adresse de la prochaine instruction', ['le résultat du calcul', 'la taille du disque', 'la fréquence du processeur'], 'Il guide la lecture du programme.'),
  mcq('or-cycle', 'Cycle d’instruction', 'L’ordre du cycle est :', 'lecture, décodage, exécution', ['exécution, décodage, lecture', 'décodage, lecture, exécution', 'lecture, exécution, décodage'], 'L’instruction doit être lue et comprise avant d’être exécutée.'),
  mcq('or-vol', 'Mémoire', 'Quelle mémoire est volatile ?', 'La RAM', ['Le SSD', 'Le disque dur', 'La mémoire flash'], 'Elle perd son contenu à l’arrêt.')
];
b.systemes = [
  num('sy-f', 'Ordonnancement', [[30, 10, 20], [100, 10, 10], [5, 15, 10]], function (p) { return { prompt: P('Tâches de ' + p.join(', ') + ' s en FIFO à t = 0. Calculez le temps de séjour moyen, en s.'), value: SY.fifo([{ id: 'A', d: p[0] }, { id: 'B', d: p[1] }, { id: 'C', d: p[2] }]).s.turn, unit: 's', explanation: P('Moyenne des instants de fin.') }; }),
  num('sy-s', 'Ordonnancement', [[30, 10, 20], [100, 10, 10], [5, 15, 10]], function (p) { return { prompt: P('Tâches de ' + p.join(', ') + ' s en SJF à t = 0. Calculez le temps de séjour moyen, en s.'), value: SY.sjf([{ id: 'A', d: p[0] }, { id: 'B', d: p[1] }, { id: 'C', d: p[2] }]).s.turn, unit: 's', explanation: P('Les tâches courtes passent d’abord.') }; }),
  num('sy-p', 'Mémoire', [[10000], [8200], [4097]], function (p) { return { prompt: P('Pages de 4 096 octets, adresse ' + p[0] + '. Calculez le numéro de page.'), value: Math.floor(p[0] / 4096), abs: 0.1, unit: '', explanation: P('⌊adresse/taille⌋.') }; }),
  num('sy-o', 'Mémoire', [[10000], [8200], [4097]], function (p) { return { prompt: P('Pages de 4 096 octets, adresse ' + p[0] + '. Calculez le décalage, en octets.'), value: p[0] % 4096, abs: 0.5, unit: 'octets', explanation: P('adresse mod taille.') }; }),
  mcq('sy-tlb', 'Mémoire', 'La TLB est :', 'un cache des traductions d’adresses', ['un système de fichiers', 'un type de processus', 'un disque'], 'Elle évite de consulter la table des pages à chaque accès.'),
  mcq('sy-rr', 'Ordonnancement', 'Round Robin améliore surtout :', 'le temps de réponse', ['la capacité du disque', 'la fréquence du processeur', 'la taille de la mémoire'], 'Chaque tâche commence rapidement.')
];
b['reseaux-info'] = [
  num('ri-eff', 'Couches', [[1460, 1518], [500, 578], [1000, 1078]], function (p) { return { prompt: P(p[0] + ' octets utiles dans une trame de ' + p[1] + ' octets. Calculez l’efficacité, en %.'), value: p[0] / p[1] * 100, abs: 0.2, unit: '%', explanation: P('Efficacité = utiles/total.') }; }),
  num('ri-t', 'Performance', [[1, 8], [5, 10], [2, 16]], function (p) { return { prompt: P('Transférer ' + p[0] + ' Mo à ' + p[1] + ' Mbit/s prend combien de temps, en s ?'), value: p[0] * 8 / p[1], unit: 's', explanation: P('Durée = bits / débit.') }; }),
  mcq('ri-tcp', 'Protocoles', 'L’ouverture d’une connexion TCP se fait par :', 'SYN, SYN+ACK, ACK', ['GET, 200, FIN', 'DISCOVER, OFFER, ACK', 'ACK, SYN, RST'], 'C’est l’échange en trois temps.'),
  mcq('ri-dns', 'Protocoles', 'DNS sert à :', 'traduire un nom en adresse', ['attribuer une MAC', 'chiffrer un disque', 'alimenter un routeur'], 'L’enregistrement A associe un nom à une adresse IPv4.'),
  mcq('ri-5xx', 'HTTP', 'Un code 503 signale :', 'une indisponibilité temporaire du serveur', ['une erreur de l’utilisateur', 'une réussite', 'une redirection'], 'La classe 5xx concerne les erreurs côté serveur.'),
  mcq('ri-arp', 'Protocoles', 'ARP permet de trouver :', 'l’adresse MAC associée à une adresse IP', ['le nom de domaine', 'le port du serveur', 'la version du navigateur'], 'ARP opère sur le réseau local.')
];
b.donnees = [
  mcq('do-pk', 'Modèle relationnel', 'Une clé primaire :', 'identifie chaque ligne de façon unique', ['chiffre la table', 'peut être en double', 'est toujours du texte'], 'Deux lignes ne peuvent pas partager la même clé.'),
  mcq('do-fk', 'Modèle relationnel', 'Une clé étrangère :', 'référence la clé d’une autre table', ['supprime une table', 'est toujours nulle', 'remplace WHERE'], 'Elle matérialise la relation.'),
  mcq('do-where', 'Requêtes', 'WHERE sert à :', 'filtrer les lignes', ['créer une table', 'trier uniquement', 'valider une transaction'], 'Seules les lignes vérifiant la condition restent.'),
  num('do-prod', 'Requêtes', [[5, 7], [4, 9], [10, 3]], function (p) { return { prompt: P('Tables de ' + p[0] + ' et ' + p[1] + ' lignes, sans condition de jointure. Combien de lignes ?'), value: p[0] * p[1], abs: 0.1, unit: '', explanation: P('Produit cartésien.') }; }),
  mcq('do-atom', 'Transactions', 'L’atomicité garantit que :', 'une transaction réussit entièrement ou est annulée', ['les requêtes sont rapides', 'les données sont chiffrées', 'les tables sont triées'], 'Aucun état intermédiaire ne subsiste.'),
  mcq('do-durab', 'Transactions', 'La durabilité garantit que :', 'une transaction validée survit à une panne', ['les données expirent', 'les colonnes sont fixes', 'les clés sont uniques'], 'Le résultat est conservé.')
];
b.cloud = [
  num('cl-h', 'Consolidation', [[30, 4, 2, 64, 4], [20, 2, 2, 64, 8], [10, 8, 2, 128, 8]], function (p) { return { prompt: P(p[0] + ' applications de ' + p[1] + ' Go, surcoût ' + p[2] + ' Go par VM, hôte ' + p[3] + ' Go avec ' + p[4] + ' Go de réserve. Combien d’hôtes ?'), value: CL.hosts(p[0], p[1], p[2], p[3], p[4]), abs: 0.1, unit: '', explanation: P('⌈N / ⌊(RAM − réserve)/(appli + surcoût)⌋⌉.') }; }),
  num('cl-s', 'Élasticité', [[75, 20], [90, 10], [130, 50]], function (p) { return { prompt: P('Charge ' + p[0] + ' %, serveurs de capacité ' + p[1] + ' %. Combien de serveurs ?'), value: Math.ceil(p[0] / p[1]), abs: 0.1, unit: '', explanation: P('⌈charge/capacité⌉.') }; }),
  mcq('cl-saas', 'Modèles', 'Une messagerie en ligne est un exemple de :', 'SaaS', ['IaaS', 'PaaS', 'matériel dédié'], 'Le logiciel est livré prêt à l’emploi.'),
  mcq('cl-iaas', 'Modèles', 'En IaaS, le client gère :', 'le système et les applications', ['le bâtiment', 'l’alimentation électrique', 'les disques physiques'], 'Le fournisseur gère l’infrastructure.'),
  mcq('cl-ct', 'Virtualisation', 'Un conteneur partage avec l’hôte :', 'le noyau', ['son disque physique uniquement', 'son mot de passe', 'son écran'], 'Il ne peut pas embarquer un noyau différent.'),
  mcq('cl-t1', 'Virtualisation', 'Un hyperviseur de type 1 :', 'fonctionne directement sur le matériel', ['exige un navigateur', 'est un conteneur', 'n’isole rien'], 'Il n’y a pas de système intermédiaire.')
];
b.maintenance = [
  num('ma-5', 'RAID', [[5, 4], [4, 2], [8, 10]], function (p) { return { prompt: P(p[0] + ' disques de ' + p[1] + ' To en RAID 5. Calculez la capacité utile, en To.'), value: MA.raid(5, p[0], p[1]).cap, abs: 0.1, unit: 'To', explanation: P('(N − 1)·B.') }; }),
  num('ma-1', 'RAID', [[2, 8], [4, 2], [6, 4]], function (p) { return { prompt: P(p[0] + ' disques de ' + p[1] + ' To en RAID 1. Calculez la capacité utile, en To.'), value: MA.raid(1, p[0], p[1]).cap, abs: 0.1, unit: 'To', explanation: P('(N·B)/2.') }; }),
  num('ma-full', 'Prévention', [[90, 2, 1000], [80, 5, 500], [50, 10, 2000]], function (p) { return { prompt: P('Disque de ' + p[2] + ' Go occupé à ' + p[0] + ' %, croissance ' + p[1] + ' Go/jour. Dans combien de jours sera-t-il plein ?'), value: MA.diskFull(p[0], p[1], p[2]), abs: 0.5, unit: 'jours', explanation: P('Espace libre / croissance.') }; }),
  mcq('ma-321', 'Sauvegardes', 'La règle 3-2-1 impose notamment :', 'une copie hors site', ['trois copies sur le même disque', 'aucune copie externe', 'un seul support'], '3 copies, 2 supports, 1 hors site.'),
  mcq('ma-raid', 'Sauvegardes', 'Un RAID 1 ne protège pas :', 'd’un effacement accidentel', ['d’une panne d’un disque', 'd’une lecture lente', 'd’une perte de secteur isolée'], 'Le miroir recopie aussi l’effacement.'),
  mcq('ma-post', 'Démarrage', 'Le POST se déroule :', 'juste après la mise sous tension', ['à l’arrêt', 'après l’ouverture de session', 'une seule fois par an'], 'C’est un autotest matériel.')
];
b['iot-intro'] = [
  num('ii-r', 'Microcontrôleurs', [[3.3, 2.1, 6], [5, 2, 10], [5, 3, 20]], function (p) { return { prompt: P(fN(p[0]) + ' V, LED de ' + fN(p[1]) + ' V, ' + p[2] + ' mA. Calculez R, en Ω.'), value: II.ledR(p[0], p[1], p[2] / 1000), unit: 'Ω', explanation: P('R = (V − V<sub>f</sub>)/I.') }; }),
  num('ii-step', 'Microcontrôleurs', [[3.3, 12], [5, 10], [3.3, 10]], function (p) { return { prompt: P('CAN ' + p[1] + ' bits sous ' + fN(p[0]) + ' V. Calculez le pas, en mV.'), value: p[0] / Math.pow(2, p[1]) * 1000, unit: 'mV', explanation: P('q = V/2<sup>N</sup>.') }; }),
  num('ii-d', 'Architecture', [[5, 12, 30], [10, 20, 60], [2, 50, 10]], function (p) { return { prompt: P(p[0] + ' capteurs, ' + p[1] + ' octets toutes les ' + p[2] + ' s. Calculez le débit, en bit/s.'), value: II.dataRate(p[0], p[1], p[2]), unit: 'bit/s', explanation: P('D = N × octets × 8 / période.') }; }),
  mcq('ii-act', 'Architecture', 'Lequel est un actionneur ?', 'Une électrovanne', ['Une thermistance', 'Une photodiode', 'Un microphone'], 'Elle agit sur le monde physique.'),
  mcq('ii-gw', 'Architecture', 'Une passerelle IoT :', 'relie les objets au réseau étendu', ['mesure la température', 'remplace la batterie', 'supprime le capteur'], 'Elle fait le lien entre les protocoles.'),
  mcq('ii-esp', 'Microcontrôleurs', 'Un ESP32 fonctionne avec une tension de :', '3,3 V', ['12 V', '230 V', '48 V'], 'Une entrée 5 V demande une adaptation de niveau.')
];
b['iot-capteurs'] = [
  num('ic-r', 'Capteurs', [[50], [0], [80]], function (p) { return { prompt: P('CTN R₀ = 10 kΩ à 25 °C, B = 3950. Calculez R à ' + p[0] + ' °C, en kΩ.'), value: IC.ntcR(p[0], 10, 3950), unit: 'kΩ', explanation: P('R = R₀ exp(B(1/T − 1/T₀)), T en kelvins.') }; }),
  num('ic-v', 'Capteurs', [[5, 10, 15], [3.3, 10, 10], [5, 22, 10]], function (p) { return { prompt: P('V<sub>cc</sub> = ' + fN(p[0]) + ' V, R<sub>fixe</sub> = ' + p[1] + ' kΩ, R<sub>CTN</sub> = ' + p[2] + ' kΩ. Calculez V, en V.'), value: IC.dividerV(p[0], p[1], p[2]), unit: 'V', explanation: P('V = V<sub>cc</sub> R<sub>CTN</sub>/(R<sub>fixe</sub> + R<sub>CTN</sub>).') }; }),
  num('ic-c', 'Acquisition', [[1.65, 3.3, 10], [2.5, 5, 12], [1, 5, 10]], function (p) { return { prompt: P('V = ' + fN(p[0]) + ' V, V<sub>ref</sub> = ' + fN(p[1]) + ' V, ' + p[2] + ' bits. Calculez le code.'), value: IC.code(p[0], p[1], p[2]), abs: 1.1, unit: '', explanation: P('⌊V/V<sub>ref</sub> × 2<sup>N</sup>⌋.') }; }),
  num('ic-pwm', 'Actionneurs', [[25, 24], [60, 12], [50, 5]], function (p) { return { prompt: P('D = ' + p[0] + ' % sous ' + p[1] + ' V. Calculez la tension moyenne, en V.'), value: IC.pwm(p[0] / 100, p[1]), unit: 'V', explanation: P('V<sub>moy</sub> = D·V<sub>cc</sub>.') }; }),
  mcq('ic-ntc', 'Capteurs', 'La résistance d’une CTN, quand la température monte :', 'diminue', ['augmente', 's’annule', 'reste constante'], 'Coefficient de température négatif.'),
  mcq('ic-ma', 'Traitement', 'Une moyenne glissante plus longue :', 'réduit le bruit et augmente le retard', ['annule le retard', 'augmente le bruit', 'change la grandeur mesurée'], 'C’est un compromis.')
];
b['iot-com'] = [
  num('im-ts', 'LoRa', [[10], [7], [12]], function (p) { return { prompt: P('SF' + p[0] + ', 125 kHz. Calculez T<sub>s</sub>, en ms.'), value: IM.ts(p[0], 125000) * 1000, unit: 'ms', rel: 0.01, explanation: P('T<sub>s</sub> = 2<sup>SF</sup>/BW.') }; }),
  num('im-toa', 'LoRa', [[7, 20], [9, 20], [12, 12]], function (p) { var a = IM.airtime({ sf: p[0], bw: 125000, cr: 1, pl: p[1], pre: 8 }); return { prompt: P('SF' + p[0] + ', 125 kHz, CR 4/5, ' + p[1] + ' octets, préambule 8, CRC activé, en-tête explicite. Calculez le temps d’antenne, en ms.'), value: a.total * 1000, unit: 'ms', rel: 0.03, explanation: P('T = (n + 4,25)T<sub>s</sub> + n<sub>charge</sub>T<sub>s</sub>.') }; }),
  num('im-s', 'Portée', [[7], [10], [12]], function (p) { return { prompt: P('SF' + p[0] + ', 125 kHz, NF = 6 dB. La limite de SNR est ' + fN(IM.SNR[p[0]]) + ' dB. Calculez la sensibilité, en dBm.'), value: IM.sensitivity(p[0], 125000), abs: 0.3, unit: 'dBm', explanation: P('S = −174 + 10 log₁₀ BW + NF + SNR.') }; }),
  num('im-dc', 'Réglementation', [[0.5, 1], [1.3, 1], [0.1, 0.1]], function (p) { return { prompt: P('Paquet de ' + fN(p[0]) + ' s, cycle autorisé ' + fN(p[1]) + ' %. Calculez la période minimale, en s.'), value: IM.minPeriod(p[0], p[1]), unit: 's', explanation: P('T<sub>min</sub> = T/D.') }; }),
  mcq('im-tech', 'Technologies', 'Pour un capteur isolé sur batterie envoyant peu de données :', 'LoRa', ['Wi-Fi', 'Ethernet', 'Fibre optique'], 'Longue portée, faible consommation.'),
  mcq('im-sf', 'LoRa', 'Augmenter le facteur d’étalement :', 'allonge le temps d’antenne', ['raccourcit les paquets', 'augmente le débit', 'réduit la portée'], 'La durée du symbole double à chaque SF.')
];
b['iot-mqtt'] = [
  mcq('iq-plus', 'Topics', 'Le filtre a/+/c correspond à :', 'a/b/c', ['a/b/x/c', 'a/c', 'x/b/c'], '+ remplace exactement un niveau.'),
  mcq('iq-hash', 'Topics', 'Le filtre a/# correspond à :', 'a/b/c/d', ['b/a', 'x/a/b', 'c'], '# remplace tous les niveaux suivants.'),
  mcq('iq-noqos', 'QoS', 'Le QoS 0 garantit :', 'une remise au plus une fois, sans accusé', ['une remise exactement une fois', 'une remise au moins une fois', 'le chiffrement'], 'Aucun acquittement n’est échangé.'),
  num('iq-eff', 'QoS', [[2, 1], [0, 2], [1, 1]], function (p) { return { prompt: P('Publication en QoS ' + p[0] + ', abonnement en QoS ' + p[1] + '. Quel est le QoS effectif ?'), value: Math.min(p[0], p[1]), abs: 0.1, unit: '', explanation: P('Le minimum des deux.') }; }),
  num('iq-ka', 'Fiabilité', [[40], [60], [120]], function (p) { return { prompt: P('Keep Alive de ' + p[0] + ' s. Après quel délai le client peut-il être considéré perdu, en s ?'), value: 1.5 * p[0], abs: 0.5, unit: 's', explanation: P('1,5 × Keep Alive.') }; }),
  mcq('iq-will', 'Fiabilité', 'Le testament est publié quand :', 'le client disparaît sans DISCONNECT', ['le client envoie DISCONNECT', 'un message est retenu', 'le QoS vaut 2'], 'Une déconnexion propre supprime le testament.')
];
b['iot-energie'] = [
  num('ie-i', 'Énergie', [[100, 1, 50, 0.1], [60, 2, 40, 0.01], [300, 5, 80, 0.05]], function (p) { var I = (p[2] * p[1] + p[3] * (p[0] - p[1])) / p[0]; return { prompt: P('Période ' + p[0] + ' s : ' + p[1] + ' s à ' + p[2] + ' mA, le reste à ' + p[3] + ' mA. Calculez le courant moyen, en mA.'), value: I, unit: 'mA', explanation: P('Moyenne pondérée par les durées.') }; }),
  num('ie-life', 'Énergie', [[1000, 0.5], [2000, 1], [500, 0.2]], function (p) { return { prompt: P('Batterie ' + p[0] + ' mAh, ' + fN(p[1]) + ' mA moyen, facteur 0,8, sans autodécharge. Calculez l’autonomie, en jours.'), value: IE.lifeHours(p[0], p[1], 0) / 24, unit: 'jours', explanation: P('C × 0,8 / I, en heures, divisé par 24.') }; }),
  num('ie-e', 'Énergie', [[0.5, 3.7], [1, 3.3], [2, 5]], function (p) { return { prompt: P(fN(p[0]) + ' mA sous ' + fN(p[1]) + ' V pendant 24 h. Calculez l’énergie journalière, en mWh.'), value: p[0] * p[1] * 24, unit: 'mWh', explanation: P('E = I·V·t.') }; }),
  mcq('ie-lev', 'Énergie', 'Le levier le plus efficace pour l’autonomie est :', 'de réduire le temps actif et radio', ['d’augmenter la puissance d’émission', 'de supprimer le sommeil', 'd’ajouter des LED'], 'La radio domine la consommation.'),
  mcq('ie-wdt', 'Fiabilité', 'Un chien de garde sert à :', 'redémarrer un système bloqué', ['chiffrer les données', 'mesurer la tension', 'augmenter la portée'], 'C’est une minuterie matérielle.'),
  mcq('ie-pwd', 'Sécurité', 'Quelle pratique réduit le risque ?', 'Changer le mot de passe par défaut', ['Exposer le service sur Internet', 'Désactiver les mises à jour', 'Partager un même mot de passe'], 'Les mots de passe par défaut sont publics.')
];
b['iot-projets'] = [
  num('ip-m', 'Dimensionnement', [[10], [5], [15]], function (p) { return { prompt: P('Une mesure toutes les ' + p[0] + ' min. Combien de messages par jour ?'), value: 1440 / p[0], abs: 0.1, unit: '', explanation: P('1440 / période.') }; }),
  num('ip-air', 'Dimensionnement', [[144, 0.1], [288, 0.2], [96, 1.3]], function (p) { return { prompt: P(p[0] + ' messages de ' + fN(p[1]) + ' s d’antenne. Calculez la durée quotidienne, en s.'), value: p[0] * p[1], unit: 's', explanation: P('Messages × durée.') }; }),
  num('ip-seuil', 'Régulation', [[24, 3], [26, 2], [20, 4]], function (p) { return { prompt: P('Consigne ' + p[0] + ' °C, hystérésis ' + p[1] + ' °C. Calculez le seuil de marche du refroidissement, en °C.'), value: p[0] + p[1] / 2, abs: 0.05, unit: '°C', explanation: P('T<sub>c</sub> + H/2.') }; }),
  num('ip-wh', 'Dimensionnement', [[25, 6], [30, 10], [100, 2]], function (p) { return { prompt: P('Un ventilateur de ' + p[0] + ' W fonctionne ' + p[1] + ' h. Calculez l’énergie, en Wh.'), value: p[0] * p[1], abs: 0.5, unit: 'Wh', explanation: P('E = P × t.') }; }),
  mcq('ip-hyst', 'Régulation', 'L’hystérésis sert à :', 'limiter les commutations rapides', ['augmenter le bruit', 'alimenter le capteur', 'supprimer la mesure'], 'Deux seuils séparent la marche et l’arrêt.'),
  mcq('ip-sur', 'Conception', 'Une fonction de sûreté doit :', 'fonctionner localement, même sans réseau', ['dépendre d’un serveur distant', 'attendre un utilisateur', 'être désactivée la nuit'], 'La connexion peut être perdue.')
];

module.exports = b;
