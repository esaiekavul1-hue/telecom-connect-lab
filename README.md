# TELECOM CONNECT LAB

**Apprendre · Simuler · Comprendre**
*Du réel au virtuel. De la théorie à la pratique.*

TELECOM CONNECT LAB est une plateforme éducative pour les étudiants en télécommunications. Elle complète les cours des enseignants avec des leçons illustrées, un laboratoire de simulation, des exercices corrigés et un suivi de progression.

Ce document s’adresse à une personne qui ne sait pas programmer. Chaque étape est décrite pas à pas.

---

## 1. Ce que contient le projet

| Espace | Contenu disponible |
|---|---|
| **Accueil** | Présentation, oscilloscope de démonstration réglable, parcours, grille des 9 modules avec leur avancement. |
| **Mes leçons** | **9 leçons complètes, 50 chapitres** : définitions, exemples guidés, formules expliquées avec leurs unités, 54 figures calculées (graphiques et schémas), résumé et erreurs fréquentes à la fin de chaque leçon. |
| **Mon laboratoire** | **9 simulations interactives** (graphiques SVG recalculés à chaque réglage, valeurs chiffrées, explication qui s’adapte, missions de vérification, encadré « limites du modèle »). |
| **Mes défis** | **83 exercices corrigés** (9 ou 10 par module : QCM, calculs, réponses courtes comme une adresse IP ou un octet en binaire), explication après chaque réponse, score, recommencement. |
| **Ma progression** | Tableau de bord calculé à partir de ce que l’étudiant a réellement fait, tableau par module, détail d’un module, prochaines étapes. |
| **Mon compte / Connexion** | Création de compte et connexion **sans mot de passe** (code ou lien reçu par e-mail), synchronisation entre appareils. *Nécessite une configuration : voir la section 6.* |

Chaque module relie ses trois parties : une barre « Leçon · Laboratoire · Défis » en haut de chaque page, et des liens en fin de leçon et de simulation.

| Module | Leçon | Simulation (missions) | Exercices | Ce que fait la simulation |
|---|---|---|---|---|
| Comprendre les signaux | 6 chapitres | ✅ (3) | 10 | Amplitude, fréquence, phase, fenêtre, curseur de lecture, phase sur un cercle. |
| Ondes électromagnétiques | 5 chapitres | ✅ (3) | 9 | λ = v/f, milieux (vide, câbles), bandes UIT, antennes λ/2, animation. |
| Antennes | 6 chapitres | ✅ (4) | 9 | Diagrammes polaires horizontal et vertical calculés (dipôle court, demi-onde, réseau de 1 à 8 éléments, dépointage, lobes de réseau), directivité intégrée numériquement, gain, ouverture à −3 dB, polarisation. Hypothèses affichées. |
| Propagation radio | 6 chapitres | ✅ (5) | 9 | Bilan de liaison, espace libre, réflexion sur le sol (deux rayons), **obstacle** (diffraction par une arête, zone de Fresnel, profil du trajet), pertes typiques (murs, végétation), horizon, limites des modèles. |
| Chaîne de transmission | 5 chapitres | ✅ (3) | 9 | Parcours en 7 étapes (source → codage → modulation → canal bruité → décision → décodage → message), bits faux surlignés, code à répétition, TEB théorique et mesuré. |
| Modulation | 6 chapitres | ✅ (4) | 9 | AM, FM (spectre de Bessel, Carson) et **numérique** ASK / FSK / PSK avec démodulation bit par bit et constellation. |
| Fibre optique | 5 chapitres | ✅ (3) | 9 | Trajet du rayon (Snell-Descartes, réflexion totale, cône d’acceptance), longueur, atténuation, épissures et connecteurs → puissance reçue, dispersion modale. |
| Réseaux mobiles | 5 chapitres | ✅ (3) | 9 | Carte hexagonale interactive (téléphone déplaçable), motifs de réutilisation, C/I, couverture, transfert intercellulaire, scénarios ville / rural / stade. |
| Réseaux IP | 6 chapitres | ✅ (4) | 10 | Calculateur IPv4 (réseau, diffusion, hôtes, binaire, sous-réseaux) et parcours pas à pas d’un paquet dans un réseau à 2 routeurs : passerelle, ARP, table de routage, TTL, encapsulation, pannes de configuration. |

Toutes les simulations sont des **modèles pédagogiques idéalisés** : chacune indique ses hypothèses et ses limites, et aucune n’est présentée comme un outil professionnel de dimensionnement. Le statut « Disponible » d’un module est calculé à partir des fichiers réellement chargés : un module dont une partie manquerait serait automatiquement affiché « Partiellement disponible ».

---

## 2. Ce qui fonctionne tout de suite, et ce qui demande une configuration

| Fonction | Sans configuration | Après configuration de Supabase (section 6) |
|---|---|---|
| Leçons, laboratoire, défis | ✅ Fonctionnent, même sans Internet | ✅ |
| Progression | ✅ Enregistrée **dans ce navigateur, sur cet appareil uniquement** | ✅ Enregistrée dans le compte et retrouvée sur les autres appareils |
| Création de compte, connexion par e-mail | ❌ Affichée comme « non configurée » (aucune fausse connexion) | ✅ Code à usage unique et lien magique envoyés par e-mail |
| Synchronisation entre appareils | ❌ | ✅ |

> La progression locale n’est **pas** une synchronisation : si vous changez d’appareil ou de navigateur sans compte, vous ne la retrouverez pas.

---

## 3. Ouvrir le site sur votre ordinateur

**Méthode la plus simple :**
1. Décompressez le fichier `TELECOM-CONNECT-LAB.zip` (clic droit → « Extraire tout »).
2. Ouvrez le dossier `telecom-connect-lab`.
3. Double-cliquez sur **`index.html`**. Le site s’ouvre dans votre navigateur (Chrome, Edge, Firefox, Safari récents).

Les leçons, le laboratoire, les défis et la progression fonctionnent ainsi, **même sans connexion Internet** : tous les fichiers nécessaires sont dans le dossier (aucune police ni bibliothèque n’est téléchargée).

**Pour tester la connexion par e-mail**, le site doit être publié sur une adresse web en `https://` (section 8). Un fichier ouvert par double-clic ne peut pas recevoir le lien magique.

---

## 4. Visite guidée pour tester

### Le laboratoire des signaux
1. Menu **Mon laboratoire** → **Ouvrir la simulation**.
2. Déplacez le curseur **Fréquence** : les cycles se resserrent, la période T affichée diminue, et le cadre « Ce qui se passe » explique le changement avec les valeurs réelles.
3. Tapez `250` dans le champ de fréquence : la période devient **4 ms** et le repère « T = 4 ms » apparaît sur le graphique.
4. Changez l’**Amplitude** : la hauteur change, la période reste la même.
5. Cochez **Afficher la référence φ = 0**, puis cliquez sur **π/2** : la courbe glisse vers la gauche ; le décalage Δt est affiché.
6. Survolez le graphique (ou cliquez dessus puis utilisez les flèches ← →) pour lire la valeur x(t) à un instant précis.
7. En bas, réalisez les **3 missions** avec le bouton « Vérifier mes réglages ».
8. **Réinitialiser** rétablit les valeurs de départ (A = 2 V, f = 100 Hz, φ = 0, fenêtre 20 ms).

### Les autres simulations (exemples d’essais rapides)
- **Ondes électromagnétiques** : cliquez sur « Radio FM 100 MHz » : λ ≈ 3 m. Choisissez « Câble coaxial, isolant polyéthylène plein » : la fréquence reste 100 MHz mais λ tombe à 1,98 m.
- **Antennes** : passez de 1 à 4 éléments : le diagramme horizontal se resserre et la directivité dépasse 6 dBi. Changez le déphasage : le lobe principal tourne. Avec un écartement de 1 λ, des lobes de réseau apparaissent.
- **Propagation** : choisissez « Arête unique » comme obstacle : avec le sommet sur la ligne directe, la perte est de 6 dB ; abaissez-le de quelques mètres et regardez la perte diminuer sur le profil (zone de Fresnel). Le modèle « Avec réflexion sur le sol » montre creux et bosses.
- **Chaîne de transmission** : cliquez sur les étapes 1 à 7. Baissez la puissance émise : des bits deviennent faux (en rouge) ; activez la répétition ×3 et voyez le décodeur les corriger.
- **Modulation** : en AM, poussez l’indice au-delà de 1 (surmodulation). Choisissez « Numérique », tapez un octet comme `11001010` et comparez ASK, FSK et PSK.
- **Fibre optique** : augmentez l’angle d’entrée au-delà de 14° : le rayon s’échappe de la fibre. Allongez la liaison : la puissance reçue descend par paliers (épissures, connecteurs).
- **Réseaux mobiles** : cliquez sur la carte pour déplacer le téléphone (ou utilisez les flèches du clavier après avoir cliqué sur la carte). Changez le motif N : les cellules de même lettre partagent les fréquences.
- **Réseaux IP** : tapez `192.168.10.77` et `/26` dans le calculateur. Puis, dans « Parcours d’un paquet », choisissez « Serveur » et cliquez sur « Étape suivante » : le paquet passe par R1 puis R2, la ligne choisie de la table de routage est surlignée et le TTL diminue. Essayez la panne « masque erroné ».

Chaque simulation se termine par 3 à 5 missions ; les missions réussies apparaissent dans « Ma progression ».

### Les exercices
1. Menu **Mes défis** → choisissez un module → **Commencer**.
2. Répondez, puis **Valider ma réponse** : la plateforme indique si la réponse est juste (+1 point) ou fausse (0 point), donne la bonne réponse et l’explication.
3. **Exercice suivant**, et à la fin **Voir mon résultat**.
4. **Recommencer la série** remet le score de la série à zéro (l’historique est conservé).

Pour les réponses numériques, la virgule et le point sont acceptés (`2,5` ou `2.5`) ; l’unité peut être recopiée (`20 ms`).

### La progression
1. Lisez un chapitre puis cliquez sur **Marquer comme lu et continuer**.
2. Ouvrez **Ma progression** : le chapitre, vos missions et vos résultats y figurent, avec les activités récentes et les prochaines étapes conseillées.
3. Actualisez la page (touche F5) : rien n’est perdu.

Le pourcentage d’un module = (chapitres lus + missions réussies + exercices réussis au moins une fois) ÷ (nombre de chapitres + de missions + d’exercices du module) ; par exemple 6 + 3 + 10 = 19 activités pour « Comprendre les signaux ». Le pourcentage général porte sur les 165 activités des 9 modules (50 chapitres, 32 missions, 83 exercices). Une réponse incorrecte ne compte pas.

Sans compte, un lien en bas de « Ma progression » permet d’effacer la progression enregistrée sur l’appareil.

---

## 5. Les fichiers importants

```
telecom-connect-lab/
├── index.html                 Page unique du site (structure, en-tête, pied de page)
├── style.css                  Apparence générale (couleurs, mise en page, mobile)
├── script.js                  Démarrage, navigation entre les pages, bouton Connexion/Déconnexion
├── config.js                  ★ Configuration PUBLIQUE à compléter pour la connexion (aucun secret)
├── README.md                  Ce guide
├── TEST-REPORT.md             Rapport des tests réellement effectués
├── assets/
│   ├── images/                Logo original (logo.svg, logo-on-dark.svg, logo-mark.svg, favicon.svg)
│   └── icons/icons.js         Icônes originales
├── core/
│   ├── plot.js                Dessin des graphiques (style oscilloscope, en SVG)
│   ├── plot-xy.js             Graphiques XY (échelles logarithmiques, spectres en raies)
│   ├── labkit.js              Éléments communs à toutes les simulations (commandes, missions…)
│   ├── store.js               Enregistrement de la progression
│   ├── sync.js                Synchronisation de la progression avec le compte
│   ├── validate.js            Vérification des saisies (e-mail, nom, code)
│   ├── utils.js               Petits outils (dates, notifications…)
│   └── exercise-kit.js        Correction commune des exercices (QCM, calcul avec tolérance, réponse courte)
├── auth/
│   ├── auth.js                Connexion sans mot de passe (Supabase Auth)
│   └── auth.css               Apparence des pages de connexion et du compte
├── modules/
│   ├── registry.js            Catalogue des 9 modules ; disponibilité calculée d’après les fichiers chargés
│   ├── signaux/
│   │   ├── signal-math.js     Formules : période, fréquence, phase, décalage…
│   │   ├── lesson.js          Contenu de la leçon (6 chapitres)
│   │   ├── simulation.js      Laboratoire interactif et missions
│   │   └── exercises.js       10 exercices et leur correction
│   ├── ondes-em/              wave-math.js : λ = v/f, bandes UIT
│   ├── antennes/              antenna-math.js : dipôles, facteur de réseau, directivité, polarisation
│   ├── propagation/           propagation-math.js : espace libre, deux rayons, diffraction, Fresnel
│   ├── chaine/                chain-math.js : bits, codage, bruit gaussien, TEB, Shannon
│   ├── modulation/            modulation-math.js : AM, FM (Bessel, Carson), ASK / FSK / PSK
│   ├── fibre/                 fiber-math.js : Snell-Descartes, ouverture numérique, bilan
│   ├── mobiles/               mobile-math.js : motifs hexagonaux, C/I, couverture
│   └── ip/                    ip-math.js : adresses, masques, routage, parcours d’un paquet
│                              (chaque dossier contient aussi simulation.js, lesson.js et exercises.js)
├── pages/                     Une page par espace (accueil, leçons, laboratoire, défis, progression, compte)
├── supabase/
│   ├── schema.sql             Table de progression + règles de sécurité (à exécuter une fois)
│   ├── email-template-magic-link.html      Modèle d’e-mail de connexion (avec code)
│   └── email-template-confirm-signup.html  Modèle d’e-mail de création de compte (avec code)
└── tests/                     Tests automatiques (pour les développeurs, section 11)
```

---

## 6. Activer la connexion par e-mail (sans mot de passe)

Le service choisi est **Supabase** : il gère les comptes, l’envoi des codes et des liens magiques, et la base de données. L’hébergeur **Netlify** sert à mettre le site en ligne. Les deux proposent une offre gratuite. Comptez environ 45 minutes.

> 🔒 **Ne mettez jamais dans le site (ni dans un message) :** le mot de passe de la base de données, la clé **secrète** (`sb_secret_…` ou `service_role`) et le mot de passe SMTP. Seules deux valeurs **publiques** vont dans `config.js`.

> Les menus de Supabase et Netlify évoluent de temps en temps. Si un intitulé diffère légèrement, cherchez le terme indiqué en gras.

### Étape 1 — Mettre le site en ligne pour obtenir son adresse
1. Créez un compte sur **netlify.com**.
2. **Add new project** → **Deploy manually** → faites glisser le dossier `telecom-connect-lab` (celui qui contient `index.html`).
3. Notez l’adresse obtenue, par exemple `https://telecom-connect-lab.netlify.app` (modifiable dans **Project configuration → Change project name**).

### Étape 2 — Créer le projet Supabase
1. Sur **supabase.com**, inscrivez-vous **avec l’adresse e-mail que vous utiliserez pour vos essais** (voir l’étape 10).
2. **New project** : donnez un nom, laissez Supabase générer le mot de passe de la base (gardez-le pour vous, il ne sert pas au site), choisissez la région proposée la plus proche, puis attendez environ 2 minutes.

### Étape 3 — Créer la table de progression
1. **SQL Editor** → **New query**.
2. Ouvrez `supabase/schema.sql` avec le Bloc-notes, copiez **tout**, collez dans Supabase, cliquez sur **Run** (« Success »).
3. Vérification : **Table Editor** affiche la table `progress`.

Ce fichier crée la table et des règles de sécurité : chaque utilisateur connecté ne peut lire et modifier **que sa propre progression**.

### Étape 4 — Activer l’e-mail
**Authentication → Sign In / Providers** : **Email** activé, **Confirm email** activé, **Allow new users to sign up** activé. Rien à régler pour les mots de passe : la plateforme ne les utilise jamais.

### Étape 5 — Mettre le code dans les e-mails
**Authentication → Emails → Templates** :
1. **Magic Link** : remplacez le contenu par celui de `supabase/email-template-magic-link.html` (sujet : *Votre code de connexion TELECOM CONNECT LAB*).
2. **Confirm signup** : remplacez le contenu par celui de `supabase/email-template-confirm-signup.html` (sujet : *Confirmez votre adresse — TELECOM CONNECT LAB*).
3. **Save** pour chacun.

`{{ .Token }}` est remplacé par le code à 6 chiffres, `{{ .ConfirmationURL }}` par le lien magique.

### Étape 6 — Déclarer l’adresse du site
**Authentication → URL Configuration** :
- **Site URL** : `https://telecom-connect-lab.netlify.app` (votre adresse de l’étape 1) ;
- **Redirect URLs** → **Add URL** : `https://telecom-connect-lab.netlify.app/**`

Le lien magique ne fonctionne que vers ces adresses.

### Étape 7 — Copier les deux valeurs publiques
1. Bouton **Connect** en haut du projet → copiez la **Project URL** (`https://abcdefgh.supabase.co`).
2. **Project Settings → API Keys** → copiez la **Publishable key** (commence par `sb_publishable_`). L’ancienne clé `anon` fonctionne aussi, mais Supabase prévoit de la retirer fin 2026. **Ne touchez pas à la Secret key.**

### Étape 8 — Remplir `config.js`
Clic droit sur `config.js` → **Ouvrir avec → Bloc-notes** (sur Mac : TextEdit en mode texte brut). Collez vos valeurs **entre les guillemets**, sans effacer les virgules :

```js
window.TCL_CONFIG = {
  supabaseUrl: 'https://abcdefgh.supabase.co',
  supabaseAnonKey: 'sb_publishable_xxxxxxxxxxxx',
  siteUrl: 'https://telecom-connect-lab.netlify.app'
};
```

Enregistrez.

### Étape 9 — Republier
Netlify → votre projet → **Deploys** → faites glisser à nouveau le dossier. Attendez **Published**.

### Étape 10 — Premier essai (avec votre propre adresse)
1. Sur le site publié : **Connexion → Créer un compte**, avec votre nom et l’adresse de votre compte Supabase.
2. Saisissez le code reçu (regardez aussi dans les courriers indésirables), ou cliquez sur le lien **depuis le même appareil**.
3. « Mon compte » affiche votre nom et « adresse vérifiée ». Dans **Table Editor → progress**, une ligne apparaît après votre première activité.

Sans l’étape 11, Supabase n’écrit **qu’aux membres de l’équipe du projet**, et seulement quelques e-mails par heure : faites vos premiers essais avec votre propre adresse, sans redemander de code trop souvent.

### Étape 11 — Ouvrir l’inscription à tous les étudiants (SMTP)
1. Créez un compte chez un fournisseur d’e-mails SMTP (par exemple Brevo, Resend, Postmark, Amazon SES, SendGrid ou ZeptoMail).
2. Vérifiez votre adresse d’expéditeur ou votre domaine (ex. `no-reply@votre-domaine.cd`).
3. Générez une **clé SMTP**. Chez Brevo : hôte `smtp-relay.brevo.com`, port `587`.
4. Supabase : **Authentication → Emails → SMTP Settings** → **Enable custom SMTP** : adresse d’expéditeur vérifiée, nom `TELECOM CONNECT LAB`, hôte, port, identifiant et clé SMTP. Cette clé reste dans Supabase.
5. **Authentication → Rate Limits** : augmentez le nombre d’e-mails par heure selon le nombre d’étudiants.

### Ce qui se passe en cas de problème
| Message affiché | Cause probable |
|---|---|
| « Connexion par e-mail non configurée » | `config.js` est vide ou incomplet. |
| « Le service d’envoi d’e-mails n’autorise pas encore cette adresse… » | Pas de SMTP personnalisé (étape 11), ou adresse d’essai différente de celle du compte Supabase. |
| « Trop de demandes rapprochées. Patientez… » | Un nouveau code ne peut être demandé qu’une fois par minute. |
| « Code incorrect ou expiré » | Code mal recopié, déjà utilisé ou remplacé par un code plus récent. |
| « La table « progress » est introuvable… » | L’étape 3 n’a pas été faite. |
| « Impossible de joindre le service de connexion » | Pas d’Internet, ou adresse Supabase erronée dans `config.js`. |
| Le lien de l’e-mail ouvre une page d’erreur ou l’accueil sans connexion | Adresse du site absente des **Redirect URLs** (étape 6), ou lien ouvert sur un autre appareil : utilisez plutôt le code. |

---

## 7. Comment la progression est enregistrée

- **Sans compte** : dans le navigateur (`localStorage`) de l’appareil utilisé. Elle survit à l’actualisation et à la fermeture du navigateur, mais reste sur cet appareil.
- **Avec un compte** : à chaque activité, la plateforme relit la version en ligne, la **fusionne** avec celle de l’appareil (rien n’est perdu), puis l’enregistre dans la table `progress`. Sur un autre appareil, il suffit de se connecter.
- **À la première connexion**, la progression faite sur l’appareil avant de se connecter est ajoutée au compte.
- **Hors ligne**, la progression reste sur l’appareil et sera envoyée au retour de la connexion (bouton « Réessayer » disponible).
- **À la déconnexion**, un dernier envoi est fait ; si tout est bien en ligne, la copie locale du compte est retirée de l’appareil (utile sur un ordinateur partagé).

Éléments enregistrés : chapitres lus et dernier chapitre ouvert (pour reprendre la lecture), missions réussies, réglages du laboratoire (repris à la visite suivante), réponses et tentatives aux exercices, séries terminées et scores, série en cours (pour la reprendre), journal des activités.

---

## 8. Mettre le site en ligne (déploiement)

Le site est composé uniquement de fichiers « statiques » : n’importe quel hébergement de site web convient, à condition d’utiliser **https**.

**Netlify (le plus simple, gratuit)** : voir les étapes 1 et 9 de la section 6. Avec un compte Netlify, chaque nouvelle version se publie en faisant glisser le dossier dans **Deploys** : l’adresse du site ne change pas.

**Autres possibilités :** GitHub Pages, Cloudflare Pages, Vercel, ou le serveur web de l’établissement (copier le contenu du dossier).

---

## 9. Fonctionnement hors ligne et limites

- **Hors ligne** : leçons, laboratoire, défis et progression locale fonctionnent dès lors que les fichiers sont sur l’appareil.
- **En ligne obligatoirement** : envoi des codes et liens par e-mail, vérification du code, synchronisation. La connexion réelle ne fonctionne **pas** hors ligne. Un utilisateur déjà connecté conserve sa session tant qu’elle est valable ; le site indique alors « Hors ligne ».
- Les simulations reposent sur des **modèles idéalisés** (sinusoïde parfaite, dipôles idéaux en espace libre, sol plan, arête mince, bruit gaussien, fibre à saut d’indice, cellules hexagonales régulières, petit réseau IPv4 statique). Chaque laboratoire détaille ses hypothèses dans l’encadré « Limites de cette simulation ». Elles servent à comprendre les phénomènes, pas à dimensionner un vrai réseau.

---

## 10. Choix de sécurité

- **Aucun mot de passe** n’est demandé ni stocké.
- L’utilisateur n’est considéré comme connecté que lorsque **Supabase** a vérifié le code (ou le lien) envoyé à son adresse et a délivré une session. Un simple format d’adresse valide ne suffit jamais.
- Les **jetons de session ne sont jamais écrits dans `localStorage`**. Ils sont gardés dans `sessionStorage` (propre à l’onglet, effacé à la fermeture du navigateur) : il faut donc se reconnecter après avoir fermé le navigateur. Pour aller plus loin (cookies sécurisés gérés par un serveur), il faudrait ajouter un serveur intermédiaire.
- Seule la clé **publique** se trouve dans le navigateur. Les règles de `schema.sql` empêchent un utilisateur de lire ou modifier la progression d’un autre.
- Tout le texte affiché provenant des utilisateurs (nom, adresse) est protégé contre l’injection de code.

---

## 11. Pour les développeurs : tests automatiques

Prérequis : Node.js 18 ou plus récent.

```bash
# Calculs, exercices, validation, fusion des progressions (aucune installation)
node tests/run-unit-tests.js

# Parcours complets dans Chromium, y compris la connexion sans mot de passe
# contre un FAUX service Supabase local (aucun e-mail réel n'est envoyé)
npm install playwright
npx playwright install chromium
node tests/e2e.js
```

`tests/mock-supabase-server.js` imite Supabase **uniquement pour les tests**. Pour un essai manuel local : `node tests/mock-supabase-server.js`, puis mettre `supabaseUrl: 'http://localhost:54321'` et la clé affichée dans `config.js`, servir le site avec `python -m http.server 8765` et lire les codes sur `http://localhost:54321/__test/outbox?email=VOTRE_ADRESSE`. Ne jamais l’utiliser en production.

### Ajouter un module ou modifier une partie
1. Dans `modules/<id>/` : `<nom>-math.js` (formules pures, testables avec Node), `simulation.js` (s’enregistre dans `TCL.labs['<id>']`, utilise `core/labkit.js`), `lesson.js` (`TCL.lessons['<id>']` : chapitres et figures) et `exercises.js` (`TCL.exercises['<id>']`, construit avec `core/exercise-kit.js` ; chaque bonne réponse est calculée, jamais recopiée).
2. Ajouter les balises `<script>` dans `index.html` dans l’ordre calculs → simulation → leçon → exercices, avant `modules/registry.js`.
3. Déclarer le module dans `modules/registry.js`. Il n’apparaît « Disponible » que si les trois parties sont réellement chargées ; les routes `#/lecons/<id>`, `#/laboratoire/<id>` et `#/defis/<id>` fonctionnent automatiquement.
4. Ajouter des tests dans `tests/run-unit-tests.js` ; `tests/e2e.js` (série D) parcourt automatiquement tous les modules déclarés.

---

## 12. État du projet

**Opérationnel et testé** (voir `TEST-REPORT.md`) :
- interface complète et adaptée au téléphone, navigation, fil d’Ariane, page introuvable ;
- **9 modules complets** : 50 chapitres de leçon, 9 simulations interactives (32 missions), 83 exercices dont toutes les bonnes réponses sont recalculées par les tests ;
- liens entre leçon, laboratoire et défis de chaque module, vérifiés par un robot qui suit tous les liens internes ;
- progression locale, tableau de bord par module, reprise des activités ;
- parcours de connexion sans mot de passe et synchronisation, testés contre un **faux** service Supabase local.

**Reste à faire de votre côté** (section 6) :
1. Mettre le site en ligne sur Netlify (étape 1).
2. Créer le projet Supabase et exécuter `supabase/schema.sql` (étapes 2 et 3).
3. Activer l’e-mail, mettre le code dans les modèles d’e-mail, déclarer l’adresse du site (étapes 4 à 6).
4. Copier l’adresse du projet et la clé **publique** dans `config.js`, puis republier (étapes 7 à 9).
5. Faire le premier essai avec votre adresse (étape 10), puis configurer un fournisseur SMTP pour écrire à tous les étudiants (étape 11).

Tant que ces étapes ne sont pas faites, **aucun e-mail n’est envoyé** et la plateforme l’indique clairement.

**Pistes d’amélioration :** relecture pédagogique des leçons par un enseignant, exercices supplémentaires générés avec des valeurs aléatoires, IPv6, modèles de propagation empiriques (Okumura-Hata), essais sur Firefox, Safari et de vrais téléphones.

**Non vérifié à ce jour :** l’envoi réel d’e-mails et la connexion avec un vrai projet Supabase (aucun projet ni clé n’étaient disponibles lors du développement).
