# TELECOM CONNECT LAB 2.0 — Journal de développement

Branche : `v2`. Point de retour de la V1 : tag `v1-baseline`. Rien n'a été publié.

## Lancer et tester

| Commande | Effet |
|---|---|
| `npm run dev` | Site et serveur local sur http://localhost:8080. Le code de connexion s'affiche dans le terminal. `admin@local.test` est administrateur. Aucune donnée n'atteint Supabase. |
| `npm test` | Calculs, moteur de maîtrise, contenus des modules, SQL et RLS, passerelle IA. |
| `npm run test:e2e` | Parcours V1 dans Chromium. |
| `npm run test:e2e:v2` | Parcours V2 dans Chromium (serveur local). |
| `npm run test:e2e:catalogue` | Parcourt tout le catalogue dans Chromium, ordinateur et téléphone. |
| `node tests/run-netlify-tests.js` | Netlify Function de l'assistant : sécurité, quotas, délais, CORS. |
| `node tests/e2e-netlify.js` | Site « comme publié » : `www`, configuration de production, fonction sur `/functions/v1/ai-tutor` (Google simulé). |
| `npm run build` | Régénère la banque SQL et le dossier `www`. |
| `node tools/catalogue-report.js` | Régénère `docs/CATALOGUE.md`. |
| `npm run cap:sync` | `build` puis copie vers Android et iOS. |

## Espace public et parcours

| Question | Réponse |
|---|---|
| Qui voit quoi ? | `core/access.js` : `visitor` (démonstration), `student` (parcours du compte), `open` (aucune connexion configurée : tout reste local, comme en V1). |
| Où adapter un parcours ? | `core/curriculum.js` : cours, compétences d'entrée (`entry`). Puis `npm run build` et réexécution du fichier de seed : le serveur reçoit la même liste. |
| Quand le parcours est-il demandé ? | Seulement si le serveur confirme son absence. Coupure, panne ou profil en cours de chargement : jamais. |
| Écriture du parcours | `choose_initial_track` (une fois, un niveau d'études de Préparatoire à Master), `change_track` (libre entre niveaux d'études ; Monde professionnel sur approbation ou évaluations). Écriture directe refusée. |
| Monde professionnel | Inscription : demande (`request_pro`), examinée dans Administration > Accès professionnels (`admin_decide_pro`). Approuvé : tous les niveaux librement. Étudiant : après toutes les évaluations du plus haut niveau occupé. Anciens inscrits directs : droits conservés, statut « à vérifier ». |
| Corrigés et mémorisation | Corrigé détaillé d'une évaluation finale après réussite seulement ; jamais pour un positionnement. Nouvelle tentative : questions inédites d'abord, autre version des questions déjà vues, choix de QCM mélangés. Échecs répétés : attente de 30 min, puis 2 h, puis 24 h. |
| Service non activé | Le choix est conservé avec la progression du compte, puis transmis au profil dès l'activation, sans redemander. |
| Catalogue | Téléchargé après la connexion, seulement pour le parcours (`core/access.js`). Démonstration : `modules/decouverte/`, `pages/public.js`. |

## Architecture

JS sans étape de compilation, pour rester léger sur les téléphones modestes.

| Élément | Fichiers |
|---|---|
| Référentiel des 6 espaces | `core/curriculum.js` (seul fichier à modifier pour adapter un programme) |
| Moteur de maîtrise | `core/mastery.js` |
| Modules ajoutés | `modules/<id>/<id>.js`, un fichier sans DOM : calculs, leçon, laboratoire, exercices |
| Écriture des modules | `core/module-kit.js`, `core/lab-engine.js`, `core/schematic.js` |
| Registre scientifique | `docs/VERIFICATION-SCIENTIFIQUE.md` |
| API et données officielles | `core/platform.js` |
| Pages V2 | `pages/parcours.js`, `exams.js`, `assistant.js`, `dashboard.js`, `admin.js` |
| Serveur | `supabase/migrations/`, annulation dans `supabase/rollback/` |
| Banque de questions (jamais publiée) | `content/assessments/bank.js` → `supabase/seed/assessments.generated.sql` |
| Passerelle IA | `supabase/functions/ai-tutor/` |
| Serveur local et build | `tools/` |

Règle centrale : `public.progress` reste le carnet personnel, modifiable par l'étudiant.
Seules les fonctions SQL écrivent dans `competency_validations`, après correction serveur.

Un module d'évaluation doit exister dans `core/curriculum.js` et dans `content/assessments/`.

Les pages de cours restent librement accessibles : les prérequis ferment l'évaluation, pas l'apprentissage.

## État des fonctionnalités

### Opérationnel (vérifié par les tests, en local)
- Espace public de découverte : leçon, simulation et mini-défi réels, aperçu du suivi.
- Choix unique du parcours, spécialisations, reconnexion directe, profil retrouvé sur un autre appareil.
- Contenus filtrés selon le parcours ; évaluations et changements contrôlés par le serveur.
- Sessions conservées lors des coupures et des pannes du service.
- Six espaces, cours, statuts, seuils configurables.
- Évaluations : QCM, numérique, texte, dépannage par QCM, variantes de paramètres, chronomètre serveur, tentatives limitées, délai croissant, reprise, corrigé après réussite, remédiation, positionnement.
- Accès : inscription directe à son niveau d'études (Préparatoire à Master), changement libre sans perte de résultats, révisions recommandées et test de positionnement facultatif ; demandes professionnelles approuvées par l'administration.
- 40 modules dans les quatre domaines : leçon, laboratoire, exercices, évaluation serveur (`docs/CATALOGUE.md`).
- Assistant : présenté publiquement, interface et contexte de leçon ou de laboratoire prêts, indisponibilité affichée tant qu'aucun fournisseur n'est branché.
- Mon espace, attestation interne, administration (comptes, évaluations, supervision, seuils, IA, incidents, audit).
- Hors ligne web par service worker ; contenus embarqués dans l'APK.

### Partiellement opérationnel
- Cours marqués « couverture partielle » : ils réunissent les modules existants sans couvrir tout l'intitulé.
- Administration des contenus : présentation et seuils uniquement. Leçons et laboratoires restent dans le code.
- Types d'évaluation : pas de TP virtuel noté par le serveur. Les missions de laboratoire restent de l'entraînement, vérifié côté navigateur.
- Conflits de synchronisation : fusion automatique existante, sans écran de résolution.
- Filtrage par parcours : seules les évaluations sont contrôlées par le serveur. Leçons et laboratoires sont des fichiers statiques : l'interface les réserve, mais un fichier reste téléchargeable par son adresse.

### Nécessite une configuration externe (décision du fondateur)
Dans cet ordre, sur le projet Supabase existant :
1. Faire une sauvegarde de la base.
2. SQL Editor, chaque fichier une seule fois, en s'arrêtant à la première erreur :
   - Projet déjà équipé des migrations 1 à 3 et des évaluations (cas actuel) : `supabase/migrations/20261110000200_v2_access_hardening.sql` uniquement. Il reprend toutes les corrections de sécurité antérieures.
   - Nouveau projet : `20261108000100_v2_core.sql`, `20261108000200_v2_tracks.sql`, `20261110000100_v2_pro_access.sql`, `supabase/seed/assessments.generated.sql`, puis `20261110000200_v2_access_hardening.sql`.
   - Ne jamais rejouer seule une migration 1 à 3 : elle rétablirait d'anciennes règles. En cas de reprise, relancer ensuite `20261110000200_v2_access_hardening.sql`.
   - Annulation de la sécurisation : `supabase/rollback/20261110000200_v2_access_hardening.down.sql` (aucune donnée supprimée).
   - Choix du niveau d'études : `supabase/migrations/20261111000100_v2_level_choice.sql`, après la sécurisation et chaque fois que celle-ci est rejouée. Il remplace trois fonctions seulement : inscription directe de Préparatoire à Master, changement libre entre niveaux d'études, prérequis des niveaux inférieurs recommandés au lieu de bloquants. Le Monde professionnel reste soumis à l'approbation de l'administration. Annulation : `supabase/rollback/20261111000100_v2_level_choice.down.sql`, à exécuter avant toute annulation de la sécurisation.
   - Contrôle : `select pg_get_functiondef('public.choose_initial_track(text,text)'::regprocedure) like '%rank is not null%';` doit renvoyer `true`.
   - Limites de la progression : `supabase/migrations/20261112000100_v2_progress_limits.sql` (1 Mo maximum par progression, `TRUNCATE` retiré). Les lignes existantes ne sont pas contrôlées. Contrôle : `select count(*) from pg_constraint where conname = 'progress_data_size';` doit renvoyer `1`. Annulation : `supabase/rollback/20261112000100_v2_progress_limits.down.sql`.
3. Se désigner administrateur :
   `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'VOTRE_EMAIL');`
4. Assistant IA, offre gratuite Gemini uniquement : Netlify Function `netlify/functions/ai-tutor.mts` (même logique que `supabase/functions/ai-tutor/`), servie par le site sur `/functions/v1/ai-tutor`. Variables d'environnement Netlify : `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (facultatives : `ALLOWED_ORIGINS` pour un domaine personnalisé, `AI_MODEL`, `AI_FALLBACK_MODEL`). Le projet Google ne doit avoir aucune facturation. Une réponse doit arriver en moins de 9 s (limite Netlify de 10 s) ; sinon la demande est rendue à l'étudiant.
   Conditions Google de l'offre gratuite : 18 ans minimum, pas de données personnelles, contenus réutilisables par Google et relus par des personnes. L'interface fait confirmer ces points ; e-mails et téléphones sont masqués par la passerelle.
   Codes de connexion : SMTP Brevo à saisir uniquement dans Supabase (Authentication > Emails > SMTP Settings), modèles `supabase/email-template-*.html`. Test sur une adresse : `npm run auth:check -- adresse`, puis `npm run dev:reel`.
5. Publier sur Netlify : `netlify.toml` fixe le dossier `www`, la construction (`node tools/build-www.js`), la fonction et les en-têtes. Si l'adresse du site change, mettre à jour `siteUrl` dans `config.js` (liens de connexion, assistant de l'application mobile) et les adresses autorisées dans Supabase (Authentication > URL Configuration). Reconstruire ensuite l'APK.

### Nécessite une validation scientifique
- Leçons, laboratoires et 323 questions : relecture par un enseignant avant tout usage à enjeu.
- Correspondance entre les cours proposés et les référentiels réels.

### Non encore développé
- Rôle enseignant : le rôle existe, sans espace dédié.
- Partenariats et sponsors : aucun mécanisme, aucune publicité.

## Non vérifié à ce stade
- Migrations sur le vrai projet Supabase : testées sur PostgreSQL WASM avec une reproduction de `auth.users`.
- Appel réel du fournisseur d'IA (pas de clé) : l'adaptateur `index.ts` n'a jamais été exécuté.
- CSP et application sur un vrai téléphone Android ou iPhone.

## Points d'attention
- La session est dans `localStorage` (correctif du fondateur, pour rester connecté sur Android).
- Ne pas réordonner les paramètres d'une question publiée : créer un nouvel identifiant (voir `bank.js`).
- Le pourcentage de progression porte désormais sur les modules du parcours.
- Le premier choix de parcours est déclaratif : les prérequis de chaque évaluation restent contrôlés par le serveur.
- Les visiteurs V1 sans compte n'accèdent plus qu'à la démonstration ; leur progression locale rejoint le compte à l'inscription.
- `script.js.bak` (présent avant la V2) n'est pas suivi par Git.

## Priorités suggérées
1. Validation du fondateur en mode local.
2. Relecture scientifique par un enseignant, en commençant par les évaluations.
3. Activation serveur (dans l'ordre ci-dessus).
4. TP virtuels notés par le serveur ; activation de l'assistant dans une phase distincte.
