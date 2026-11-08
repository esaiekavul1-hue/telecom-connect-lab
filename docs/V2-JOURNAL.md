# TELECOM CONNECT LAB 2.0 — Journal de développement

Branche : `v2`. Point de retour de la V1 : tag `v1-baseline`. Rien n'a été publié.

## Lancer et tester

| Commande | Effet |
|---|---|
| `npm run dev` | Site et serveur local sur http://localhost:8080. Le code de connexion s'affiche dans le terminal. `admin@local.test` est administrateur. Aucune donnée n'atteint Supabase. |
| `npm test` | Calculs, moteur de maîtrise, SQL et RLS, passerelle IA. |
| `npm run test:e2e` | Parcours V1 dans Chromium. |
| `npm run test:e2e:v2` | Parcours V2 dans Chromium (serveur local). |
| `npm run build` | Régénère la banque SQL et le dossier `www`. |
| `npm run cap:sync` | `build` puis copie vers Android et iOS. |

## Architecture

JS sans étape de compilation, pour rester léger sur les téléphones modestes.

| Élément | Fichiers |
|---|---|
| Référentiel des 6 espaces | `core/curriculum.js` (seul fichier à modifier pour adapter un programme) |
| Moteur de maîtrise | `core/mastery.js` |
| API et données officielles | `core/platform.js` |
| Pages V2 | `pages/parcours.js`, `exams.js`, `assistant.js`, `dashboard.js`, `admin.js` |
| Serveur | `supabase/migrations/`, annulation dans `supabase/rollback/` |
| Banque de questions (jamais publiée) | `content/assessments/bank.js` → `supabase/seed/assessments.generated.sql` |
| Passerelle IA | `supabase/functions/ai-tutor/` |
| Serveur local et build | `tools/` |

Règle centrale : `public.progress` reste le carnet personnel, modifiable par l'étudiant.
Seules les fonctions SQL écrivent dans `competency_validations`, après correction serveur.

Les pages de cours restent librement accessibles : les prérequis ferment l'évaluation, pas l'apprentissage.

## État des fonctionnalités

### Opérationnel (vérifié par les tests, en local)
- Six espaces, cours, statuts, seuils configurables.
- Évaluations : QCM, numérique, texte, dépannage par QCM, variantes de paramètres, chronomètre serveur, tentatives limitées, délai, reprise, correction détaillée, remédiation, positionnement.
- Module complet Circuits électriques : leçon, laboratoire à solveur nodal, 9 exercices, évaluation.
- Mon espace, attestation interne, administration (comptes, évaluations, supervision, seuils, IA, incidents, audit).
- Hors ligne web par service worker ; contenus embarqués dans l'APK.

### Partiellement opérationnel
- Cours marqués « couverture partielle » : ils réunissent les modules existants sans couvrir tout l'intitulé.
- Administration des contenus : présentation et seuils uniquement. Leçons et laboratoires restent dans le code.
- Types d'évaluation : pas encore de TP virtuel noté par le serveur ni de résolution de problème à plusieurs étapes.
- Conflits de synchronisation : fusion automatique existante, sans écran de résolution.

### Nécessite une configuration externe (décision du fondateur)
Dans cet ordre, sur le projet Supabase existant :
1. Faire une sauvegarde de la base.
2. SQL Editor : exécuter `supabase/migrations/20261108000100_v2_core.sql`, puis `supabase/seed/assessments.generated.sql`.
3. Se désigner administrateur :
   `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'VOTRE_EMAIL');`
4. Assistant IA : créer une clé chez le fournisseur, puis `supabase functions deploy ai-tutor` et `supabase secrets set ANTHROPIC_API_KEY=… ALLOWED_ORIGINS=https://dainty-biscuit-3fc767.netlify.app,https://localhost,capacitor://localhost`.
   `AI_MODEL` choisit le modèle (défaut `claude-opus-5-5`, 4 $ / 20 $ par million de jetons ; `claude-haiku-5-5` : 0,10 $ / 0,50 $).
5. Publier `www` sur Netlify, reconstruire l'APK.

### Nécessite une validation scientifique
- Banque de questions (95 questions) et leçon Circuits : relecture par un enseignant avant tout usage à enjeu.
- Correspondance entre les cours proposés et les référentiels réels.

### Non encore développé
- Contenus : tous les cours « Programme à développer », dont tout le Master.
- Laboratoires demandés absents : électronique analogique et numérique, routage dynamique, IoT et embarqué.
- Rôle enseignant : le rôle existe, sans espace dédié.
- Partenariats et sponsors : aucun mécanisme, aucune publicité.

## Non vérifié à ce stade
- Migration sur le vrai projet Supabase : testée sur PostgreSQL WASM avec une reproduction de `auth.users`.
- Appel réel du fournisseur d'IA (pas de clé) : l'adaptateur `index.ts` n'a jamais été exécuté.
- CSP et application sur un vrai téléphone Android ou iPhone.

## Points d'attention
- La session est dans `localStorage` (correctif du fondateur, pour rester connecté sur Android).
- Ne pas réordonner les paramètres d'une question publiée : créer un nouvel identifiant (voir `bank.js`).
- Après la mise en ligne, le pourcentage d'entraînement des comptes existants baisse légèrement : 19 activités s'ajoutent.
- `script.js.bak` (présent avant la V2) n'est pas suivi par Git.

## Priorités suggérées
1. Validation du fondateur en mode local, puis activation serveur.
2. Module Électronique numérique, puis Électronique analogique.
3. TP virtuels notés par le serveur.
4. Laboratoires routage et IoT.
