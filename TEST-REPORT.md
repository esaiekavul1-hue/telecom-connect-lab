# TEST-REPORT — TELECOM CONNECT LAB

Ce rapport ne liste que des tests **réellement exécutés**, avec les résultats observés. Les éléments qui n’ont pas pu être vérifiés sont indiqués à la fin.

**Version 3 (16 octobre 2026)** : les 9 modules sont complets (50 chapitres de leçon, 9 simulations, 83 exercices). Nouvelles simulations Antennes, Chaîne de transmission, Fibre optique, Réseaux mobiles et Réseaux IP ; obstacle et zone de Fresnel ajoutés à la propagation ; modulations numériques ajoutées à la modulation. Tous les tests des versions 1 et 2 ont été relancés sur cette version.

## Environnement de test

| Élément | Valeur |
|---|---|
| Date | 16 octobre 2026 |
| Système | Linux (environnement de développement en ligne) |
| Node.js | v22.22.0 |
| Navigateur | Chromium 141 (moteur de Chrome et Edge), piloté par Playwright, sans affichage |
| Tailles d’écran | 1360 × 900, 1280 × 900 (ordinateur) ; 390 × 844 et 375 × 760 / 800 (téléphone) |
| Service de connexion | **Faux** service Supabase local (`tests/mock-supabase-server.js`), qui imite les réponses de Supabase. Aucun vrai projet Supabase, aucun vrai e-mail. |

## Synthèse

| Série | Commande | Résultat |
|---|---|---|
| Calculs des 9 modules, correction de tous les exercices, validation, fusion | `node tests/run-unit-tests.js` | **145 / 145 réussis** |
| Parcours dans le navigateur (A : sans configuration ; B : connexion simulée ; C : simulations et clés ; D : les 9 modules, robot de liens) | `node tests/e2e.js` | **129 / 129 réussis** |
| Ouverture par double-clic (`file://`), navigateur hors ligne, 9 simulations | script ponctuel | réussi (voir section 3) |
| Débordement horizontal sur téléphone (375 px), 75 pages | script ponctuel | aucune page ne déborde |
| Contrastes de couleurs | calcul WCAG | toutes les paires ≥ 4,5:1 |
| Revue visuelle des captures d’écran | inspection | défauts trouvés et corrigés (section 5) |

---

## 1. Tests des calculs (`tests/run-unit-tests.js`)

Chaque formule et chaque bonne réponse d’exercice sont comparées à une valeur calculée **indépendamment** (valeurs de référence connues, calcul à la main, analyse numérique, simulation de Monte-Carlo). Pour chacun des 83 exercices, le test vérifie aussi qu’une **mauvaise** réponse est refusée.

| Résultat | Vérification |
|---|---|
| | **Modèle x(t) = A sin(2πft + φ)** |
| ✅ | période de 50 Hz = 0,02 s |
| ✅ | période non définie pour f = 0 |
| ✅ | fréquence pour T = 2,5 ms = 400 Hz |
| ✅ | pulsation de 100 Hz = 200π rad/s |
| ✅ | valeur à t = 1,25 ms pour 2 sin(2π·100·t) = √2 |
| ✅ | φ = π/2 : x(0) = A (cosinus) |
| ✅ | φ = π : opposition de phase |
| ✅ | décalage dû à φ = π/2 à 50 Hz = 5 ms d’avance |
| ✅ | le décalage correspond bien à une translation de la courbe |
| ✅ | première crête : T/4 pour φ = 0, 0 pour φ = π/2 |
| ✅ | crête à crête = 2A et valeur efficace = A/√2 |
| ✅ | périodes dans 100 ms à 50 Hz = 5 |
| ✅ | conversions degrés ↔ radians |
| ✅ | curseur de fréquence logarithmique : bornes 1 Hz et 10 kHz |
| | **Mise en forme française** |
| ✅ | formatTime |
| ✅ | formatFrequency |
| ✅ | formatPhase en multiples de π |
| ✅ | lecture des nombres saisis |
| | **Exercices du module « Comprendre les signaux »** |
| ✅ | au moins 8 exercices, identifiants uniques |
| ✅ | chaque exercice a une question, une explication et une bonne réponse |
| ✅ | les thèmes exigés sont couverts |
| ✅ | e1 : la proposition correcte est « 3 V » |
| ✅ | e4 : la proposition correcte est « 2,45 kHz » |
| ✅ | e5 : la proposition correcte est « Elle passe de 5 ms à 2,5 ms. » |
| ✅ | e6 : la proposition correcte est « Les crêtes atteignent ±4 V et la période reste 10 ms. » |
| ✅ | e7 : la proposition correcte est « x₂ est en avance de 5 ms sur x₁. » |
| ✅ | e2 : bonne réponse numérique = 20 |
| ✅ | e3 : bonne réponse numérique = 400 |
| ✅ | e8 : bonne réponse numérique = 500 |
| ✅ | e9 : bonne réponse numérique = 5 |
| ✅ | e10 : bonne réponse numérique = 1.414213562373095 |
| ✅ | e2 : « 20 », « 20,0 » et « 20 ms » acceptés ; « 0,02 » (en secondes) refusé |
| ✅ | e3 : 400 accepté, 0,4 (kHz confondus) refusé |
| ✅ | e10 : 1,41 et 1,414 acceptés ; 1,4 et le résultat en mode degrés refusés |
| ✅ | e8 et e9 cohérents avec le graphique et la situation |
| ✅ | une saisie illisible est signalée sans être comptée |
| | **Validation des adresses e-mail** |
| ✅ | acceptée : etudiant@gmail.com |
| ✅ | acceptée : prenom.nom@ista.ac.cd |
| ✅ | acceptée : a.b-c+tag@sub.domaine.fr |
| ✅ | acceptée : MAJ@Exemple.COM |
| ✅ | refusée : «  » |
| ✅ | refusée : « @ » |
| ✅ | refusée : « nom@ » |
| ✅ | refusée : « @gmail.com » |
| ✅ | refusée : « nom@gmail » |
| ✅ | refusée : « nom@@gmail.com » |
| ✅ | refusée : « nom@gmail..com » |
| ✅ | refusée : « nom @gmail.com » |
| ✅ | refusée : « nom@-gmail.com » |
| ✅ | refusée : « .nom@gmail.com » |
| ✅ | refusée : « nom.@gmail.com » |
| ✅ | refusée : « nom@gmail.c » |
| ✅ | refusée : « nom@gmail.123 » |
| ✅ | normalisation en minuscules |
| ✅ | code : 6 chiffres acceptés, lettres refusées |
| ✅ | nom complet requis |
| | **Progression : fusion entre appareils** |
| ✅ | la fusion n’efface aucune activité |
| ✅ | la fusion est idempotente |
| ✅ | état vide détecté ; données invalides ignorées |
| | **Ondes électromagnétiques** |
| ✅ | c = 299 792 458 m/s (valeur exacte) |
| ✅ | λ(100 MHz, vide) = 2,998 m |
| ✅ | λ(100 MHz, coaxial 0,66) = 1,979 m |
| ✅ | λ(2,4 GHz) ≈ 12,49 cm |
| ✅ | f pour λ/2 = 15 cm : 999,3 MHz |
| ✅ | nombre d’onde k = 2π/λ |
| ✅ | bandes UIT : 100 MHz VHF, 300 MHz UHF, 2,4 GHz UHF, 3,5 GHz SHF, 1 MHz MF, 300 GHz EHF |
| ✅ | bandes contiguës, de 3 kHz à 300 GHz, chacune d’une décade |
| ✅ | écriture scientifique : 2,998 × 10⁸ |
| ✅ | formatLength |
| | **Propagation radio (espace libre)** |
| ✅ | FSPL(1 km, 1 MHz) = 32,45 dB (constante de la formule pratique) |
| ✅ | FSPL = 20log(d km) + 20log(f MHz) + 32,45 pour d = 5 km, f = 900 MHz |
| ✅ | doubler la distance ou la fréquence ajoute 6,02 dB |
| ✅ | bilan de liaison par défaut : Pr = −67,51 dBm, marge 22,49 dB |
| ✅ | à la portée maximale, la marge vaut exactement 0 dB |
| ✅ | les pertes supplémentaires réduisent la portée de façon cohérente (20 dB → ÷ 10) |
| ✅ | conversions dBm ↔ W : 30 dBm = 1 W, 0 dBm = 1 mW, PIRE = Pt + Gt |
| | **Modulation AM / FM** |
| ✅ | fonctions de Bessel : J0(1), J1(1), J1(5), J2(10) (valeurs de table) |
| ✅ | J0 s’annule en 2,4048 (porteuse FM supprimée) |
| ✅ | somme des Jn(β)² = 1 (conservation de la puissance FM) pour β = 0,5 … 10 |
| ✅ | règle de Carson : ≥ 98 % de la puissance pour β = 1, 2, 5, 10 |
| ✅ | AM : bande = 2fm, rendement 1/3 à m = 1, enveloppe en t = 0 = Ac(1 + m) |
| ✅ | FM : β = Δf/fm et Carson 2(Δf + fm) = 30 kHz pour Δf = 10 kHz, fm = 5 kHz |
| ✅ | AM : la transformée de Fourier numérique retrouve Ac en fc et m·Ac/2 en fc ± fm |
| ✅ | FM : la transformée de Fourier numérique retrouve Ac·\|Jn(β)\| pour chaque raie |
| ✅ | FM : la fréquence instantanée est la dérivée de la phase |
| ✅ | surmodulation : le détecteur d’enveloppe s’écarte du message si m > 1 |
| | **Outil commun des exercices** |
| ✅ | réponse numérique : unité retirée, virgule acceptée, tolérance relative |
| ✅ | réponse numérique : tolérance absolue |
| ✅ | réponse texte : saisie invalide signalée sans être comptée fausse |
| | **Séries d’exercices de tous les modules** |
| ✅ | signaux : au moins 8 exercices, identifiants uniques, explication présente |
| ✅ | signaux : chaque bonne réponse est acceptée et une mauvaise est refusée |
| ✅ | ondes-em : au moins 8 exercices, identifiants uniques, explication présente |
| ✅ | ondes-em : chaque bonne réponse est acceptée et une mauvaise est refusée |
| ✅ | antennes : au moins 8 exercices, identifiants uniques, explication présente |
| ✅ | antennes : chaque bonne réponse est acceptée et une mauvaise est refusée |
| ✅ | propagation : au moins 8 exercices, identifiants uniques, explication présente |
| ✅ | propagation : chaque bonne réponse est acceptée et une mauvaise est refusée |
| ✅ | chaine : au moins 8 exercices, identifiants uniques, explication présente |
| ✅ | chaine : chaque bonne réponse est acceptée et une mauvaise est refusée |
| ✅ | modulation : au moins 8 exercices, identifiants uniques, explication présente |
| ✅ | modulation : chaque bonne réponse est acceptée et une mauvaise est refusée |
| ✅ | fibre : au moins 8 exercices, identifiants uniques, explication présente |
| ✅ | fibre : chaque bonne réponse est acceptée et une mauvaise est refusée |
| ✅ | mobiles : au moins 8 exercices, identifiants uniques, explication présente |
| ✅ | mobiles : chaque bonne réponse est acceptée et une mauvaise est refusée |
| ✅ | ip : au moins 8 exercices, identifiants uniques, explication présente |
| ✅ | ip : chaque bonne réponse est acceptée et une mauvaise est refusée |
| | **Ondes électromagnétiques** |
| ✅ | λ à 100 MHz dans le vide ≈ 2,998 m ; dans un câble k = 0,66 : × 0,66 |
| ✅ | bande de 2,4 GHz = UHF, de 5 GHz = SHF |
| | **Antennes** |
| ✅ | directivité du dipôle demi-onde = 1,64 (2,15 dBi) |
| ✅ | directivité du dipôle court = 1,5 (1,76 dBi) |
| ✅ | largeur à −3 dB dans le plan vertical : 78° (demi-onde) et 90° (court) |
| ✅ | réseau de N dipôles alimentés en phase : directivité croissante avec N |
| ✅ | facteur de réseau maximal (= 1) pour ψ = 0, nul pour ψ = 2π/N |
| ✅ | perte de polarisation : 3 dB à 45°, 0 dB à 0° |
| | **Propagation** |
| ✅ | FSPL : 900 MHz, 5 km ≈ 105,5 dB |
| ✅ | portée calculée : la puissance reçue y vaut la sensibilité |
| ✅ | deux rayons : au-delà de la rupture, 12 dB par doublement de distance |
| ✅ | diffraction sur une arête : 6 dB pour ν = 0, 0 dB sous ν = −0,78 |
| ✅ | ν = √2 · h / F₁ au milieu du trajet |
| ✅ | rayon de Fresnel : 2 km à 2,4 GHz ≈ 7,9 m ; horizon 25 m / 4 m = 28,8 km |
| | **Chaîne de transmission** |
| ✅ | Q(0) = 0,5 et erfc cohérente |
| ✅ | TEB BPSK : 10⁻³ vers 6,79 dB, 10⁻⁵ vers 9,59 dB |
| ✅ | code à répétition : TEB = 3p² − 2p³ |
| ✅ | texte → bits → texte (ASCII 8 bits) |
| ✅ | Monte-Carlo : TEB mesuré proche de la théorie (200 000 bits à 4 dB) |
| ✅ | transmission sans bruit notable : message intact |
| ✅ | bruit thermique : −174 dBm/Hz ; Shannon 1 MHz à 0 dB = 1 Mbit/s |
| | **Fibre optique** |
| ✅ | angle critique 1,48/1,46 ≈ 80,6° ; ON ≈ 0,243 ; acceptance ≈ 14° |
| ✅ | rayon dans le cône guidé, hors du cône non guidé |
| ✅ | bilan : 0 dBm, 80 km à 0,2 dB/km, 3 épissures, 2 connecteurs → −17,3 dBm |
| | **Réseaux mobiles** |
| ✅ | tailles de motif N = i² + ij + j² : 3, 4, 7, 12 |
| ✅ | C/I pour N = 7, n = 4 ≈ 18,66 dB ; plus petit motif pour 18 dB = 7 |
| ✅ | grille hexagonale : N groupes, cellules voisines toujours différentes |
| ✅ | distance de réutilisation D = R√(3N) |
| | **Réseaux IP** |
| ✅ | 192.168.10.77/26 : réseau .64, diffusion .127, 62 hôtes |
| ✅ | masques : /20 = 255.255.240.0 ; 255.255.255.192 = /26 ; masque non contigu refusé |
| ✅ | /31 = 2 adresses utilisables, /32 = 1 ; préfixe pour 500 hôtes = /23 |
| ✅ | adresses privées RFC 1918 et spéciales |
| ✅ | plus long préfixe : /16 préféré à /8 et à la route par défaut |
| ✅ | parcours PC-A → serveur : 2 routeurs, TTL 64 → 62 |
| ✅ | TTL minimal pour 2 routeurs = 3 ; avec TTL = 2, destruction chez R2 |
| ✅ | les adresses MAC changent à chaque saut, pas les adresses IP |
| ✅ | pannes : passerelle fausse ou masque /16 → échec ARP vers PC-C ; masque /16 n’empêche pas d’atteindre le serveur |
| ✅ | destination sans route : destruction chez R2 (pas de route par défaut) |

---

## 2. Parcours dans le navigateur (`tests/e2e.js`)

Le navigateur clique, saisit et lit les pages comme un étudiant. La série D parcourt automatiquement **tous** les modules : ouverture des 50 chapitres et de leurs figures, chargement des 9 laboratoires et vérification de chaque mission, réalisation de missions par les commandes, réponse à chacun des 83 exercices dans l’interface, puis un robot suit tous les liens internes rencontrés.

### A. Installation sans configuration (situation du ZIP livré)

| Résultat | Vérification |
|---|---|
| ✅ | A1 l’accueil affiche le nom, le slogan et la signature |
| ✅ | A2 boutons « Commencer à apprendre » et « Explorer le laboratoire » présents |
| ✅ | A3 accueil : les 9 modules sont affichés « Disponible » avec leurs liens Leçon / Laboratoire / Défis, aucun « En préparation » |
| ✅ | A4 chaque lien de la navigation ouvre la bonne page et se marque comme actif |
| ✅ | A5 bouton « Connexion » affiché (personne n’est connecté) |
| ✅ | A6 une adresse inconnue affiche « Cette page n’existe pas » avec retour à l’accueil |
| ✅ | A7 la bibliothèque présente 4 catégories et 9 leçons ouvertes, chacune avec lien vers sa simulation et ses défis, aucune « en préparation » |
| ✅ | A8 la leçon affiche objectifs et 6 chapitres |
| ✅ | A9 les 6 chapitres s’ouvrent et contiennent des graphiques calculés (7 au total) |
| ✅ | A10 « Marquer comme lu et continuer » enregistre le chapitre et ouvre le suivant |
| ✅ | A11 après actualisation, le chapitre lu est toujours enregistré |
| ✅ | A12 valeurs par défaut : A = 2 V, f = 100 Hz, T = 10 ms |
| ✅ | A13 f = 250 Hz → période affichée 4 ms, repère « T = 4 ms » sur le graphique |
| ✅ | A14 l’explication cite les valeurs réelles (100 Hz → 250 Hz, 10 ms → 4 ms) |
| ✅ | A15 la courbe dessinée correspond au calcul (401 points, écart max 0.005 V) |
| ✅ | A16 mission 1 (T = 4 ms) validée avec f = 250 Hz |
| ✅ | A17 mission 2 refusée tant que A = 2 V (4 V crête à crête) |
| ✅ | A18 A = 3 V → crête à crête 6 V ; l’explication précise que la période ne change pas |
| ✅ | A19 mission 2 validée |
| ✅ | A20 φ = π/2 à 250 Hz → décalage 1 ms d’avance, explication « vers la gauche » |
| ✅ | A21 x(0) = A sin φ = 3 V |
| ✅ | A22 mission 3 validée ; les 3 missions apparaissent « Réussie » |
| ✅ | A23 fenêtre 5 ms → 1,25 période affichée |
| ✅ | A24 une fréquence hors limites est refusée avec un message |
| ✅ | A25 « Réinitialiser » rétablit A = 2 V, f = 100 Hz, φ = 0 |
| ✅ | A26 lecture au curseur au clavier : t = 0,4 ms, x(t) = 2 sin(2π·100·0,0004) ≈ 0,497 V |
| ✅ | A27 10 exercices : 8 bonnes réponses reconnues, 2 erreurs à 0 point, explication à chaque fois |
| ✅ | A28 résultat final 8 / 10 |
| ✅ | A29 « Recommencer la série » repart de la question 1 avec un score à zéro |
| ✅ | A30 une mauvaise réponse au QCM e1 (6 V) est signalée avec la correction « 3 V » |
| ✅ | A31 tableau de bord : 7 % (12 / 165), 1 / 50 chapitres, 10 / 83 exercices effectués, 3 / 32 missions ; ligne « signaux » à 63 % (12 / 19) |
| ✅ | A32 activités récentes enregistrées (série, exercices, missions, chapitre) |
| ✅ | A33 prochaines étapes calculées (chapitre suivant à lire, exercices à retravailler) |
| ✅ | A34 la progression survit à l’actualisation de la page |
| ✅ | A35 « Mon compte » indique clairement que la connexion n’est pas configurée |
| ✅ | A36 page de connexion : aucun champ mot de passe, formulaire désactivé tant que rien n’est configuré |
| ✅ | A37 page de création de compte : nom + e-mail, aucun mot de passe |
| ✅ | A38 localStorage ne contient ni jeton ni code |
| ✅ | A39 aucune requête vers un site externe (fonctionne hors ligne) |
| ✅ | A40 mobile : menu replié, s’ouvre au toucher, mène à la page et se referme |
| ✅ | A41 mobile 375 px : aucune page ne déborde horizontalement |
| ✅ | A42 clavier : le premier élément atteint est « Aller au contenu » |
| ✅ | A43 « réduire les animations » : l’oscilloscope d’accueil démarre en pause |
| ✅ | A44 aucune erreur JavaScript pendant toute la série A |

### B. Connexion sans mot de passe contre le faux service Supabase local

| Résultat | Vérification |
|---|---|
| ✅ | B1 non connecté : « Vous n’êtes pas connecté » et boutons de connexion |
| ✅ | B2 adresse sans extension de domaine refusée avant tout envoi |
| ✅ | B3 confirmation d’envoi affichée avec l’adresse, champ de code proposé |
| ✅ | B4 bouton « Renvoyer » bloqué pendant 60 s (compte à rebours) |
| ✅ | B5 toujours non connecté tant que le code n’est pas vérifié |
| ✅ | B6 code incorrect refusé avec message, aucune connexion |
| ✅ | B7 code correct → « Mon compte » avec nom, e-mail et « adresse vérifiée » |
| ✅ | B8 en-tête : « Déconnexion » affiché |
| ✅ | B9 statut : progression « Synchronisée avec votre compte » |
| ✅ | B10 la progression faite avant connexion (chapitre 1) est enregistrée dans le compte distant |
| ✅ | B11 activité « Progression … ajoutée au compte » visible dans Mon compte |
| ✅ | B12 aucun jeton dans localStorage ; la session est dans sessionStorage |
| ✅ | B13 une réponse d’exercice est synchronisée automatiquement |
| ✅ | B14 après actualisation, l’utilisateur reste connecté (session validée par le service) |
| ✅ | B15 déconnexion : « Connexion » réaffiché, « Vous n’êtes pas connecté », session effacée |
| ✅ | B16 déconnexion : la copie locale de la progression du compte est retirée de l’appareil |
| ✅ | B17 déconnexion : la session est révoquée côté service |
| ✅ | B18 connexion avec une adresse sans compte → message « Aucun compte… » |
| ✅ | B19 autre appareil : la progression du compte est retrouvée (1 chapitre lu, 1 exercice effectué) |
| ✅ | B20 deuxième demande en moins de 60 s → message « Patientez … secondes » |
| ✅ | B21 lien magique : connexion établie, adresse nettoyée (#/compte), aucun jeton visible dans l’URL |
| ✅ | B22 lien magique réutilisé → refusé avec un message clair (pas de fausse confirmation) |
| ✅ | B23 jeton d’accès expiré → renouvelé automatiquement, toujours connecté |
| ✅ | B24 jetons falsifiés → l’utilisateur n’est PAS considéré comme connecté |
| ✅ | B25 stockage distant non installé → message explicite « exécutez supabase/schema.sql » |
| ✅ | B26 aucune erreur JavaScript pendant la série B |

### C. Simulations ondes EM, propagation, modulation et protection des clés

| Résultat | Vérification |
|---|---|
| ✅ | C1 « Mon laboratoire » : 9 simulations disponibles, aucune en préparation |
| ✅ | C2 une simulation inexistante n’est pas accessible (page « n’existe pas ») |
| ✅ | C3 ondes EM, réglage de départ : 100 MHz → λ = 2,998 m, λ/2 = 1,5 m, bande VHF |
| ✅ | C4 mission « λ = 3 m » validée à 100 MHz dans le vide |
| ✅ | C5 câble coaxial 0,66 : λ = 1,979 m, la fréquence reste 100 MHz, explication adaptée |
| ✅ | C6 mission « même signal dans un câble » validée |
| ✅ | C7 f = 999,3 MHz → λ/2 = 15 cm, bande UHF surlignée dans le tableau |
| ✅ | C8 mission « antenne demi-onde de 15 cm » validée ; 3 missions réussies |
| ✅ | C9 bouton « Wi-Fi 2,4 GHz » → λ = 12,49 cm |
| ✅ | C10 λ plus grande que la règle → message « allongez-la » au lieu d’une cote fausse |
| ✅ | C11 animation activable, arrêtée par « Réinitialiser » qui rétablit 100 MHz |
| ✅ | C12 propagation, réglage de départ : FSPL 105,5 dB, Pr = −67,51 dBm, portée 66,58 km, liaison possible |
| ✅ | C13 conversion affichée : 30 dBm = 1 W |
| ✅ | C14 le point tracé correspond à la puissance calculée (-67.50 dBm) |
| ✅ | C15 distance × 2 → explication « 20 log₁₀(2) = +6,02 dB » et Pr = −73,53 dBm |
| ✅ | C16 mission « limite de portée » validée à 66,58 km (marge ≈ 0 dB) |
| ✅ | C17 mission « 1 800 MHz » : refusée (il manque 6,02 dB), puis validée avec Gt = 12,1 dBi |
| ✅ | C18 mission « 10 km malgré les obstacles » : refusée puis validée avec Pt = 40 dBm (10 W) |
| ✅ | C19 bilan de liaison détaillé (6 lignes + marge) cohérent avec Pr |
| ✅ | C20 sensibilité hors limites refusée avec un message |
| ✅ | C21 AM par défaut : bande 2 kHz, 3 raies au spectre, pas de surmodulation |
| ✅ | C22 mission « AM à 100 % » validée avec m = 1 |
| ✅ | C23 m = 1,3 : explication « Surmodulation » et avertissement sur la démodulation |
| ✅ | C24 mission « bande AM de 8 kHz » validée avec fm = 4 kHz |
| ✅ | C25 FM, fm = 5 kHz, Δf = 10 kHz : β = 2, Carson 30 kHz, raie porteuse 0,224 V (J₀(2)) |
| ✅ | C26 mission « Carson 30 kHz » validée ; 3 missions réussies |
| ✅ | C27 en FM, la commande « indice m » est masquée et « Δf » affichée |
| ✅ | C28 « Ma progression » : missions des simulations utilisées comptées (ondes EM 3 / 3, propagation 3 / 5, modulation 3 / 4) |
| ✅ | C29 journal : missions des nouvelles simulations enregistrées |
| ✅ | C30 les réglages de la simulation sont repris après actualisation (Pt = 40 dBm) |
| ✅ | C31 mobile 375 px : aucune page des nouvelles simulations ne déborde |
| ✅ | C32 aucune erreur JavaScript pendant la série C |
| ✅ | C33 clé « sb_secret_ » dans config.js : refusée, alerte affichée, aucun appel au service |
| ✅ | C34 ancienne clé « service_role » : refusée de la même façon |
| ✅ | C35 clé publique « sb_publishable_ » : acceptée (page « Vous n’êtes pas connecté », pas d’alerte) |

### D. Les 9 modules complets : leçons, laboratoires, défis, liens

| Résultat | Vérification |
|---|---|
| ✅ | D1 registre : 9 modules, chacun avec leçon, laboratoire et exercices réellement chargés |
| ✅ | D2 au moins 5 chapitres, 3 missions et 9 exercices par module |
| ✅ | D3 les 50 chapitres s’ouvrent, avec leurs 54 figures dessinées et un texte développé |
| ✅ | D4 lire les 6 chapitres de « Réseaux IP » marque la leçon comme terminée |
| ✅ | D5 les 9 laboratoires se chargent avec leurs graphiques ; chaque mission répond à « Vérifier mes réglages » |
| ✅ | D6 antennes : dipôle demi-onde 2,15 dBi ; désalignement de 45° → perte de 3 dB (mission validée) |
| ✅ | D7 antennes : avec 4 dipôles, la directivité augmente et le diagramme change |
| ✅ | D8 propagation : obstacle sur la ligne directe → 6,03 dB ; abaissé de 12 m (dans la zone de Fresnel) → mission validée |
| ✅ | D9 chaîne : Pt = 11 dBm → SNR 7 dB, TEB ≤ 10⁻³ (mission validée) |
| ✅ | D10 chaîne : les 7 étapes s’affichent une à une |
| ✅ | D11 fibre : rayon à 14° (angle d’acceptance) encore guidé (mission validée) |
| ✅ | D12 mobiles : n = 4, motif N = 7 → C/I ≈ 18,7 dB, plus petit motif valable (mission validée) |
| ✅ | D13 mobiles : un clic sur la carte déplace le téléphone et met à jour la cellule de service |
| ✅ | D14 IP : 192.168.10.77/26 → réseau 192.168.10.64, diffusion .127, 62 hôtes (mission « 50 machines » validée) |
| ✅ | D15 IP : un masque non contigu est refusé avec un message |
| ✅ | D16 IP : PC-A → serveur pas à pas : 4 étapes, paquet remis, table de routage de R2 affichée |
| ✅ | D17 IP : avec TTL = 2 le paquet est détruit par R2 ; TTL minimal 3 (mission validée) |
| ✅ | D18 IP : panne de masque, le serveur reste joignable (mission validée) |
| ✅ | D19 IP : même panne, PC-C est injoignable (échec ARP expliqué) |
| ✅ | D20 les 9 séries d’exercices sont réussies à 100 % avec les réponses calculées |
| ✅ | D21 « Ma progression » : 83 / 83 exercices réussis, 6 chapitres de plus, missions comptées |
| ✅ | D22 robot de liens : 85 adresses internes visitées, aucune ne mène à « page inexistante » |
| ✅ | D23 aucun texte « Simulation en cours de développement » ni « en préparation » sur les pages des modules |
| ✅ | D24 aucune erreur JavaScript pendant la série D |

---

## 3. Ouverture directe du fichier, sans Internet

Script ponctuel (Playwright, contexte **hors ligne**, adresse `file:///…/index.html`) :

| Vérification | Résultat observé |
|---|---|
| Les 9 laboratoires s’affichent avec leurs graphiques (8 à 19 éléments SVG chacun) | ✅ |
| Chapitre « Réseaux IP » marqué comme lu, puis actualisation → « 1 / 50 » dans Ma progression | ✅ |
| Erreurs JavaScript | ✅ aucune |

---

## 4. Contrastes de couleurs (formule WCAG 2)

| Couple de couleurs | Rapport |
|---|---|
| Texte blanc sur bouton principal (#0A78A0) | 4,99:1 |
| Liens (#0A78A0) sur blanc | 4,99:1 |
| Texte secondaire (#52627A) sur blanc | 6,20:1 |
| Texte principal sur fond gris clair | 14,43:1 |
| Graduations de l’oscilloscope sur bleu marine | 7,83:1 |
| Courbe cyan sur bleu marine | 9,46:1 |
| Liens du menu sur bleu marine | 11,06:1 |
| Messages de succès / d’erreur / d’avertissement | 5,24 / 5,36 / 6,24:1 |

Ajouts de la version 3 (schémas des leçons sur fond clair #F4F8FC, textes des cartes sur bleu marine) :

| Couple de couleurs | Rapport |
|---|---|
| Texte des schémas (#33445E) sur #F4F8FC | 9,24:1 |
| Texte « réseau » cyan foncé (#086585) sur #F4F8FC | 6,13:1 |
| Texte « hôte » ambre foncé (#8A5A00) sur #F4F8FC | 5,55:1 |
| Texte secondaire (#52627A) sur #F4F8FC | 5,81:1 |
| Libellés clairs (#DCE6F3) sur bleu marine | 13,31:1 |
| Ambre (#FFC14D) sur bleu marine (trajet du paquet, rayon lumineux) | 10,38:1 |

---

## 5. Revue visuelle et corrections effectuées

### Version 1
1. Explication de la phase absente dans le laboratoire des signaux (paramètre mal nommé). Corrigé (test A20).
2. Menu trop large entre 1001 et 1100 px et à 1280 px avec « Déconnexion ». Corrigé.
3. Pastilles des questions débordantes ou déformées dans « Mes défis ». Corrigé.
4. Logo du pied de page illisible sur fond sombre. Remplacé par `logo-on-dark.svg`.
5. Repère de décalage de phase masqué par son étiquette. Corrigé.
6. Laboratoire sur téléphone : commandes éloignées du graphique. Le graphique suit désormais les commandes et reste visible.

### Version 2 (nouvelles simulations)
1. **Tableau des bandes radio** : les longueurs d’onde, calculées avec la valeur exacte de c, affichaient « 9,993 km » au lieu de 10 km. Le tableau utilise maintenant c ≈ 3 × 10⁸ m/s (comme les définitions UIT), et la simulation garde la valeur exacte.
2. **Vitesse affichée « 299 800 000 m/s »** : remplacée par l’écriture scientifique « 2,998 × 10⁸ m/s ».
3. **Spectre de modulation** illisible (raies serrées sur 60 kHz, amplitudes FM trop petites) : l’échelle s’adapte désormais à la bande occupée et à la raie la plus haute.
4. **Signal modulé** trop petit sur une échelle fixe de ±5 V : l’échelle verticale s’adapte à l’amplitude maximale.
5. **Grille des valeurs calculées** avec des cases vides (8 valeurs sur 5 colonnes) : disposition sur 4 colonnes.
6. **Étiquettes coupées au bord des graphiques** (« 100 km », « dmax = … ») : elles s’alignent désormais vers l’intérieur.
7. **Bilan de liaison** trop étroit : colonne élargie.
8. **Portée maximale hors de l’échelle** avec les réglages initiaux de la propagation (333 km pour une échelle s’arrêtant à 100 km), ce qui rendait la mission 1 impossible sans autre réglage : réglages initiaux modifiés (Gt = 6 dBi, S = −90 dBm ; portée 66,6 km).

Erreurs dans les tests eux-mêmes, corrigées : valeur attendue au curseur (A26), limite d’envoi du faux service, et trois comparaisons de texte trop strictes dans la série C (format « +6,02 dB », valeurs collées à leur libellé).

### Version 3 (modules complets)
1. **Nombres d’hôtes arrondis** dans le calculateur IP et le tableau des préfixes (« 16 780 000 » au lieu de 16 777 214, « 65 530 » au lieu de 65 534) : la mise en forme gardait 4 chiffres significatifs. Les entiers sont maintenant affichés en entier.
2. **Ordre des blocs sur téléphone** (laboratoire IP) : l’encapsulation apparaissait avant le schéma du réseau. Corrigé (même règle pour le profil d’obstacle de la propagation).
3. **Étiquettes qui se chevauchent** : « commutateur » sur un lien (IP), texte de l’obstacle sur le triangle (propagation), « zénith » / « horizon » sur les graduations (antennes), « cône d’acceptance » coupé au bord (fibre). Repositionnés.
4. **Schéma du bilan de liaison** (leçon propagation) peu lisible : échelle en dBm ajoutée, barres reliées, sensibilité légendée séparément.
5. **Schéma de l’onde électromagnétique** : la perspective du champ B formait des crochets ; tracé corrigé avec des vecteurs de champ.
6. **Espacement manquant** entre le graphique et l’explication (chaîne de transmission). Corrigé.
7. **Barre « Leçon · Laboratoire · Défis » absente** des pages de chapitre : ajoutée (détecté par le test D3).
8. **Pages de leçon sans figure** : aucune — les 54 figures sont dessinées (test D3).

Erreurs dans les tests eux-mêmes, corrigées : deux valeurs attendues fausses dans les nouveaux tests de calcul (angle critique 80,57° et non 80,62° ; la fonction de polarisation renvoie un objet), un sélecteur de chiffres de progression, et une vérification de perte de paquet faite avant d’avoir avancé jusqu’à l’étape concernée.

---

## 6. Ce qui n’a PAS pu être vérifié

| Élément | Raison | Comment le vérifier |
|---|---|---|
| Envoi réel des e-mails (code et lien magique) | Aucun projet Supabase ni service SMTP disponible pendant le développement | README, section 6, étape 10 |
| Connexion contre un **vrai** projet Supabase | Idem : les échanges ont été testés contre une imitation des réponses documentées de Supabase | README, section 6, étape 10 |
| Exécution de `supabase/schema.sql` sur une vraie base | Pas de base Supabase disponible | Étape 3, puis vérifier la table dans « Table Editor » |
| Firefox et Safari (ordinateur, iPhone) | Seul Chromium était installé | Ouvrir le site publié sur ces navigateurs |
| Vrais téléphones (écran tactile, clavier virtuel) | Tests réalisés en simulant la taille d’écran | Essayer sur un téléphone Android et un iPhone |
| Lecteurs d’écran (NVDA, VoiceOver, TalkBack) | Non disponibles ; seuls les libellés, rôles et la navigation au clavier ont été contrôlés | Parcourir le site avec un lecteur d’écran |
| Relecture pédagogique par un enseignant (50 chapitres, 83 exercices) | Hors de portée des tests automatiques : les tests vérifient les calculs et le fonctionnement, pas la qualité pédagogique | Faire relire les leçons et les exercices |
| Validité des modèles face à des mesures réelles | Les modèles sont idéalisés (hypothèses affichées dans chaque laboratoire) ; ils ont été comparés à des valeurs de référence connues, pas à des mesures | Comparer avec des mesures de TP |
| Déploiement en ligne (Netlify ou autre) | Pas d’accès à un hébergeur depuis l’environnement | README, section 6, étape 1 |
