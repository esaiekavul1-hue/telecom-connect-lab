# Rapport de la mission finale — TELECOM CONNECT LAB 2.0

Branche locale `v2`. Rien n'a été publié, poussé vers GitHub, ni appliqué sur Supabase. Les applications mobiles n'ont pas été reconstruites.

**La plateforme n'est pas déclarée complète.** Les quatre domaines et les six parcours sont couverts par du contenu réel et testé, mais il manque une relecture par un enseignant, une validation sur le vrai service et les éléments listés en partie 10.

## 1. Inventaire des modules

| Situation | Modules |
|---|---|
| Conservés de la V1, 10 | signaux, ondes-em, antennes, propagation, chaine, modulation, fibre, mobiles, ip, circuits |
| Complétés par de nouveaux modules | signaux par fourier ; modulation par numerique et multiplexage ; mobiles par 5g ; ip par reseaux-info et sans-fil ; circuits par ac et analyse |
| Ajoutés en télécommunications, 8 | fourier, numerique, multiplexage, qualite, satellite, 5g, sans-fil, ingenierie |
| Ajoutés en électronique, 9 | ac, analyse, diodes, transistors, aop, logique, can, mesures, rf |
| Ajoutés en informatique, 7 | binaire, ordinateur, systemes, reseaux-info, donnees, cloud, maintenance |
| Ajoutés en IoT, 6 | iot-intro, iot-capteurs, iot-com, iot-mqtt, iot-energie, iot-projets |

Aucun module V1 n'a été supprimé ni simplifié.

Cours retirés de la structure : mathématiques, programmation, intelligence artificielle, cybersécurité avancée, recherche, optimisation, et les spécialisations `pro-cyber` et `pro-dev`. Ils étaient vides et hors des quatre domaines retenus. Il faudra les réintroduire si vous souhaitez ces thèmes. Aucun compte réel n'est concerné, la V2 n'étant pas déployée.

## 2. Leçons par parcours

Le détail complet est dans [CATALOGUE.md](CATALOGUE.md), généré à partir du contenu réellement chargé.

| Parcours | Cours | Modules enseignés |
|---|---|---|
| Préparatoire | 4 | circuits, signaux, binaire, ordinateur, iot-intro |
| Licence 1 | 7 | 11 modules, dont ac, analyse, diodes, mesures, fourier, systemes, iot-capteurs |
| Licence 2 | 7 | 13 modules, dont transistors, aop, logique, can, reseaux-info, iot-com |
| Licence 3 | 7 | 9 modules, dont numerique, multiplexage, qualite, sans-fil, donnees, iot-mqtt, iot-projets |
| Master | 6 | 5g, satellite, rf, ingenierie, cloud, iot-projets |
| Monde professionnel | 7 métiers | 22 modules au total, de 2 à 5 par métier, orientés installation, diagnostic et maintenance |

Total : 40 modules, 149 chapitres. Chaque nouvelle leçon comporte objectifs, prérequis, définitions, formules avec unités et conditions, schéma ou graphique, exemples résolus, applications, erreurs fréquentes, résumé et passage au laboratoire.

## 3. Laboratoires fonctionnels

44 laboratoires, dont 4 complémentaires (oscillateurs, multimètre, organisation des fichiers, routage dynamique), et 151 missions, listés dans [CATALOGUE.md](CATALOGUE.md). Chacun recalcule ses résultats à partir d'un modèle explicite, indique ses limites et se réinitialise.

Parmi les nouveautés : RLC et résonance, Thévenin, redresseur simulé dans le temps, polarisation et écrêtage d'un transistor, AOP réel et filtres, portes et compteur, repliement et quantification, oscilloscope virtuel avec localisation de panne, ligne et ROS, BER et Hamming, ALOHA et CDMA, cascade de bruit et œil, orbite et bilan, débit 3GPP et faisceau, plan Wi-Fi, Erlang, bits, mini-processeur pas à pas, ordonnanceur, diagnostic client-serveur, requêtes et transactions, consolidation, RAID, microcontrôleur simulé, capteur de température, LoRa, courtier MQTT simulé, autonomie, serre régulée sur 24 h.

## 4. Exercices, défis et évaluations

- 332 exercices corrigés, dont 240 ajoutés.
- 48 évaluations serveur et 323 questions à variantes numériques calculées par les modules : 40 évaluations de fin de module et 8 positionnements, dont 4 nouveaux.
- Les corrigés restent hors du site publié. Le contrôle de construction refuse tout fichier interdit dans `www`.
- Les règles existantes sont inchangées : tentatives, délais, prérequis, historique et correction serveur.
- **Limite :** les missions de laboratoire sont vérifiées dans le navigateur. Elles comptent pour l'entraînement, pas pour une validation officielle. Aucune évaluation pratique sécurisée n'est opérationnelle.

## 5. Vérification scientifique

Le registre complet est dans [VERIFICATION-SCIENTIFIQUE.md](VERIFICATION-SCIENTIFIQUE.md). Il sépare ce qui a été lu dans une source, ce qui a été établi par le calcul et testé, et ce qui relève du cours général.

Sources primaires réellement lues : 3GPP/ETSI TS 38.211, 38.306 et 38.101-1 ; ETSI EN 300 220-2 ; OASIS MQTT 3.1.1 ; RFC 9293, 1035, 9110, 2131, 792, 1918, 3629 ; NIST SP 800-145, IR 8259A et préfixes binaires ; CISA ; fiches Semtech SX1276, Espressif ESP32, Microchip ATmega328P, TI LM741 et LM7805, Vishay 1N4007 et 1N4733A, onsemi BC547 ; OSTEP. Wikipédia a servi de contrôle secondaire des formules.

Sources non obtenues : ITU-R P.525 (lien mort), Analog Devices MT-001 et MT-015 (délai dépassé), onsemi 2N7000, OWASP IoT Top 10. Le registre indique le traitement de chaque cas. MQTT 5.0 n'a été lu que partiellement.

## 6. Résultats des tests

Tous ces tests ont été réellement exécutés.

| Suite | Résultat |
|---|---|
| Calculs V1 (`run-unit-tests`) | 145 / 145 |
| Moteur, parcours, banque (`run-v2-unit-tests`) | 30 / 30 |
| Contenus et cas de référence (`run-content-tests`) | 237 / 237 |
| SQL, RLS, évaluations (PostgreSQL WASM local) | 50 / 50 |
| Passerelle IA (Deno, fournisseur simulé) | 10 / 10 |
| Navigateur V1 (`e2e.js`) | 133 / 133 |
| Navigateur V2, dont hors ligne (`e2e-v2.js`) | 92 / 92 |
| Catalogue complet, ordinateur et 360 px (`e2e-catalogue.js`) | 23 / 23 |

Tests adaptés : les compteurs tiennent compte des 40 modules. Certains contrôles V1 portent sur les 10 modules V1, les 30 autres étant parcourus par `e2e-catalogue.js`.

Défauts trouvés et corrigés pendant cette mission : blocage au rechargement d'un compte sans parcours ; téléchargement du catalogue entier au démarrage d'un étudiant ; fichiers du parcours parfois non conservés hors ligne ; trois schémas électroniques inexacts ; limite de courant ESP32 incorrecte.

## 7. Limites et vérifications restantes

- Aucun test contre le vrai Supabase : base locale et authentification simulée.
- Aucun appel réel à un fournisseur d'IA. L'assistant affiche son indisponibilité et aucune réponse n'est simulée.
- Aucun essai sur téléphone Android ou iPhone réel, ni sur matériel électronique réel.
- Les modèles sont idéalisés. Chaque laboratoire écrit ses limites.
- Les leçons et laboratoires restent des fichiers statiques : l'interface les réserve au parcours, mais un fichier reste accessible par son adresse. Seules les évaluations sont contrôlées par le serveur.
- Les règles radio varient selon les pays. Celles citées sont européennes, à vérifier pour la RDC.

## 8. Tester localement

1. `npm run dev`, puis ouvrir http://localhost:8080. Le code de connexion s'affiche dans le terminal, et les données s'effacent à l'arrêt.
2. Sans compte : consulter l'accueil, ses quatre domaines et la présentation de l'assistant.
3. Créer un compte, choisir Licence 1, ouvrir Mes leçons : 14 modules apparaissent (11 du parcours et 3 bases à consolider).
4. Essayer `#/laboratoire/iot-mqtt` : hors parcours. Avec un compte Master, essayer `#/laboratoire/5g`.
5. Exemples à manipuler : `#/laboratoire/logique`, `#/laboratoire/ordinateur`, `#/laboratoire/diodes`.
6. `admin@local.test` ouvre l'administration.

Tests : `npm test`, `npm run test:e2e`, `npm run test:e2e:v2`, `npm run test:e2e:catalogue`.

## 9. État Git

Branche `v2`, sans modification en attente, hormis `script.js.bak`, antérieur à la V2 et non suivi. Rien n'a été poussé.

```
docs: registre scientifique, journal et catalogue généré
fix: chargement limité au parcours dès le démarrage et conservation hors ligne
fix: reprise après attente du profil au rechargement ; tests adaptés au catalogue
feat: assistant visible et contextualisé, parcours complet du catalogue testé
feat: banques d'évaluation des 30 nouveaux modules et cas de référence
feat: domaines informatique et internet des objets
feat: modules télécommunications avancés
feat: socle du catalogue et domaine électronique
```

## 10. Contenu encore incomplet

- Relecture scientifique par un enseignant : aucune à ce jour, pour aucun module.
- Profondeur : les nouvelles leçons ont 3 à 4 chapitres, contre 5 à 6 en V1. Elles couvrent l'essentiel de chaque sujet, sans remplacer un cours universitaire complet. Le Master propose un module par cours.
- Évaluations pratiques notées par le serveur : non développées.
- 4G : traitée par ses principes partagés avec la 5G, sans module dédié. Les paramètres LTE ne sont pas confirmés par une source lue.
- Assistant IA : passerelle Gemini gratuite prête, à tester avec une vraie clé (`npm run ai:check`).
- Les 10 modules V1 n'ont pas fait l'objet d'une nouvelle revue de sources.
- Administration des contenus : présentation et seuils uniquement.

### Décisions du fondateur

1. Valider ou modifier la répartition des modules et les compétences d'entrée, dans `core/curriculum.js`.
2. Dire si le premier choix de parcours doit rester déclaratif ou exiger un test de positionnement.
3. Confirmer le retrait des cours hors des quatre domaines.
4. Autoriser, le moment venu, l'activation : sauvegarde, migrations 1, 2 et 3, `supabase/seed/assessments.generated.sql`, désignation de l'administrateur, publication et reconstruction des applications.
