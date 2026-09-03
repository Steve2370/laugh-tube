# Audit complet — LaughTube

Date : 3 septembre 2026
Périmètre analysé : `backend/` (API PHP maison), `laravel/` (API v2 Laravel), `encoder/` (worker Node.js/ffmpeg), `frontend/` (Vite + React), `docker/` et fichiers de déploiement.

Ce document liste les failles de sécurité, les bugs et les pistes d'amélioration relevés en lisant le code source. Les éléments sont classés par sévérité pour t'aider à prioriser.

---

## Résumé exécutif

Le projet a de bonnes bases par endroits (requêtes SQL toutes paramétrées, validation des uploads de fichiers correcte, en-têtes de sécurité nginx bien configurés, protection anti-énumération sur le reset de mot de passe). Mais l'architecture repose sur **deux backends parallèles** (l'ancien framework PHP maison dans `backend/`, et une API Laravel plus récente dans `laravel/` exposée sous `/api/v2/`), et c'est précisément à la jonction des deux que se trouvent les problèmes les plus graves : une règle de validation appliquée d'un côté mais oubliée de l'autre, un contrôle de rôle présent dans un contrôleur mais absent dans l'autre.

Quatre failles sont critiques et exploitables à distance dès aujourd'hui :

1. **Exécution de commande à distance (RCE)** via le nom d'utilisateur, injecté dans une commande shell `ffmpeg` au moment de l'encodage vidéo.
2. **Contournement total du contrôle d'accès admin** sur l'API Laravel — n'importe quel utilisateur connecté peut appeler les routes `/api/v2/admin/*`.
3. **Secrets de production commités dans Git** (clé Laravel `APP_KEY`, secret OAuth Google, mot de passe PostgreSQL, clé/secret LiveKit) directement dans `docker-compose.yml`.
4. **Vérification 2FA cassée** : le `temp_token` n'est jamais vérifié et le code à 6 chiffres n'est protégé par aucune limitation de débit → brute force possible.

Le reste du document détaille chaque point avec fichier, ligne, impact et correctif recommandé.

---

## 1. Failles critiques

### 1.1 Exécution de commande à distance via le nom d'utilisateur (RCE)

**Où :** `encoder/encoder.js`, fonction `encodeVideo()`, commande `ffmpeg` construite par concaténation puis exécutée avec `child_process.exec()`.

```js
const encodeCmd = `ffmpeg -y -ignore_unknown -i "${inputPath}" -i "${watermarkPath}" \
    -filter_complex "... text='@${username}': ..." \
    ...`;
await execCommand(encodeCmd); // exec() => passe par /bin/sh -c
```

`username` provient de la table `users` (colonne renseignée à l'inscription ou lors d'une mise à jour de profil) et est inséré tel quel dans une chaîne shell exécutée via `exec()`.

Le problème : la validation du nom d'utilisateur **diffère entre les deux backends**.
- Côté ancien backend PHP (`backend/src/Validators/UsernameValidator.php`), le nom est restreint par la regex `/^[a-zA-Z0-9_-]+$/` — sûr.
- Côté API Laravel (`laravel/app/Http/Controllers/Api/AuthController.php::register`, ligne ~22, et `ProfileController.php::update`, ligne ~41), la règle est simplement `required|string|min:3|max:50` — **aucune restriction de caractères**.

Comme `/api/v2/register` est la route d'inscription utilisée par le frontend actuel, un utilisateur peut créer un compte avec un nom d'utilisateur contenant des guillemets, points-virgules, `$()`, backticks, etc. Dès qu'une de ses vidéos passe par l'encodeur, cette valeur casse la chaîne shell et permet d'exécuter des commandes arbitraires dans le conteneur `encoder` (qui a accès au volume d'uploads et à la base PostgreSQL avec les identifiants de connexion en variables d'environnement).

**Impact :** exécution de code arbitraire dans le conteneur d'encodage, exfiltration de la base de données, pivot vers les autres services du réseau Docker interne.

**Correctif recommandé :**
- Ne jamais construire de commande shell par concaténation. Utiliser `execFile`/`spawn` avec un tableau d'arguments (`spawn('ffmpeg', ['-y', '-i', inputPath, ...])`), ce qui élimine l'interprétation shell.
- Si le texte du filigrane doit rester dynamique, le passer via un fichier de sous-titres/filtre séparé plutôt que dans la ligne de commande, et échapper strictement tout ce qui reste interpolé.
- Aligner immédiatement la validation du username sur toutes les routes (Laravel **et** PHP) avec la même regex stricte (`^[a-zA-Z0-9_-]+$`), y compris sur la mise à jour de profil.

### 1.2 Contrôle d'accès admin absent sur l'API Laravel (`/api/v2/admin/*`)

**Où :** `laravel/routes/api.php`

```php
Route::middleware(['auth:sanctum'])->prefix('admin')->group(function () {
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
    Route::patch('/users/{id}/suspend', [AdminController::class, 'suspendUser']);
    ...
});
```

Le seul middleware appliqué est `auth:sanctum`, qui vérifie uniquement qu'on est connecté — **pas** qu'on a le rôle `admin`. J'ai vérifié `AdminController.php` en entier : aucune méthode ne teste `$request->user()->role`. Le seul contrôle de rôle présent dans tout le fichier concerne l'auto-protection contre la suppression d'un compte admin (`deleteUser`), pas l'accès aux endpoints eux-mêmes. Il n'existe non plus aucun alias de middleware `admin` déclaré dans `bootstrap/app.php`.

Concrètement, **n'importe quel compte utilisateur normal (`role = membre`)**, avec son propre token, peut aujourd'hui :
- lister tous les utilisateurs avec email, IP d'inscription, user-agent (`getUsers`) ;
- supprimer définitivement n'importe quel compte non-admin et toutes ses données (`deleteUser`) ;
- suspendre/restaurer des comptes (`suspendUser`, `unsuspendUser`, `restoreUser`) ;
- supprimer n'importe quelle vidéo (`deleteVideo`) ;
- lire et traiter les signalements et les messages de contact ;
- envoyer un message à un utilisateur **ou à tous les utilisateurs** (`sendMessageAll`) — vecteur de spam/phishing interne ;
- gérer les publicités (créer, activer/désactiver, supprimer).

Le même problème existe sur le sous-groupe `jokair/admin` (création de concours, validation d'entrées, calcul de classement), protégé uniquement par `auth:sanctum`.

**Impact :** prise de contrôle complète du panneau d'administration par n'importe quel compte enregistré. C'est la faille la plus grave après le RCE.

**Correctif recommandé :**
- Créer un middleware `EnsureIsAdmin` (vérifie `$request->user()->role === 'admin'`, sinon `abort(403)`), l'enregistrer comme alias dans `bootstrap/app.php`, et l'appliquer à **tous** les groupes `prefix('admin')`.
- Ajouter un test automatisé (Feature test Laravel) qui vérifie qu'un utilisateur non-admin reçoit bien un 403 sur chaque route admin, pour éviter une régression future.

### 1.3 Secrets de production en clair dans `docker-compose.yml` (commité dans Git)

**Où :** `docker-compose.yml` (fichier suivi par Git — confirmé via `git ls-files`).

Le fichier contient, en valeurs par défaut ou en dur :
- `POSTGRES_PASSWORD` / `DB_PASSWORD` avec un mot de passe réel en fallback (`${DB_PASSWORD:-...}`) ;
- `APP_KEY=base64:...` — la clé de chiffrement Laravel, en clair ;
- `GOOGLE_CLIENT_SECRET=GOCSPX-...` — le secret OAuth Google, écrit **deux fois** : une fois via `${GOOGLE_CLIENT_SECRET}` (correct), puis écrasé juste en dessous par la valeur réelle en dur (probablement oublié après un test) ;
- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` en clair, identiques à ceux de `docker/livekit/livekit.yaml`.

L'historique Git (`git log -- docker-compose.yml`) montre plusieurs allers-retours ("fix: use env variable for Google secret", "feat: restore docker-compose.yml with env variables"), ce qui signifie que ces secrets sont probablement présents dans plusieurs commits, même si le fichier actuel était nettoyé — **retirer la valeur du fichier aujourd'hui ne les efface pas de l'historique.**

Aggravant : LiveKit (WebRTC, utilisé pour les "Battles" en direct) expose ses ports `7880/7881/7882` directement sur l'hôte dans ce même fichier. Avec la clé/secret ci-dessus, n'importe qui ayant eu accès au dépôt peut forger des tokens LiveKit valides et rejoindre, écouter ou perturber n'importe quelle session live.

**Impact :** compromission totale si le dépôt est ou devient accessible à un tiers (collaborateur, fuite, dépôt rendu public par erreur) : usurpation de compte via forgeage de cookies/signatures Laravel, connexion illégitime avec Google OAuth, accès direct à la base de données, prise de contrôle des sessions live.

**Correctif recommandé (à faire sans attendre, indépendamment du reste) :**
1. **Faire tourner (régénérer) toutes ces valeurs** : `APP_KEY` (`php artisan key:generate`, ce qui invalide les sessions/cookies chiffrés existants — à anticiper), secret client Google (dans Google Cloud Console), mot de passe PostgreSQL, clé/secret LiveKit.
2. Retirer toute valeur par défaut sensible de `docker-compose.yml` — les variables doivent venir uniquement d'un fichier `.env` non commité (`env_file:`), sans fallback `:-valeur_réelle`.
3. Envisager de nettoyer l'historique Git (`git filter-repo` ou BFG) si le dépôt a pu être partagé ou poussé vers un remote accessible par d'autres personnes.
4. Vérifier `backend/.env` : `JWT_SECRET` y est encore la valeur d'exemple `votre_secret_jwt_tres_securise_changez_moi_...` — à changer pour une valeur aléatoire longue et unique (voir 1.4).

### 1.4 Secret JWT par défaut faible / non changé

**Où :** `backend/src/Services/TokenService.php`, constructeur :

```php
$this->secret = $secret ?? ($_ENV['JWT_SECRET'] ?? 'secret123');
```

Deux problèmes cumulés :
- Si la variable d'environnement `JWT_SECRET` n'est pas définie (erreur de configuration, conteneur mal démarré, etc.), le secret retombe sur la chaîne codée en dur `'secret123'` — trivialement devinable.
- Même quand elle est définie, la valeur actuelle dans `backend/.env` est littéralement le texte d'exemple `votre_secret_jwt_tres_securise_changez_moi_12345678`, jamais remplacé par une vraie valeur aléatoire.

**Impact :** si un attaquant devine ou trouve ce secret (les deux valeurs actuelles sont des placeholders bien identifiables), il peut forger un JWT valide pour n'importe quel `user_id` et n'importe quel rôle, y compris `admin` — contournement total de l'authentification du backend PHP.

**Correctif :** générer un secret aléatoire fort (`openssl rand -base64 64`), le stocker uniquement en variable d'environnement, et supprimer complètement le fallback `'secret123'` (faire échouer le démarrage de l'application si `JWT_SECRET` est absent, plutôt que de continuer avec une valeur par défaut).

### 1.5 Vérification 2FA à la connexion : `temp_token` jamais vérifié + pas de rate limiting

**Où :** `laravel/app/Http/Controllers/Api/TwoFactorController.php::verifyLogin`

```php
$request->validate([
    'code' => 'required|string|size:6',
    'temp_token' => 'required|string',
    'user_id' => 'required|integer',
]);
$user = User::find($request->user_id);
$tokenValid = $user->tokens()->where('name', '2fa_pending')->where('expires_at', '>', now())->exists();
...
if (!$this->google2fa->verifyKey($user->two_fa_secret, $request->code)) { ... }
```

`temp_token` est validé pour sa présence/son format, mais **sa valeur n'est jamais comparée à quoi que ce soit** — la variable n'est même pas relue après la validation. Le seul contrôle réel est `$tokenValid`, qui vérifie juste qu'un token nommé `2fa_pending` existe pour cet utilisateur, sans le faire correspondre à celui réellement émis pour la tentative de connexion en cours.

De plus, la route `POST /api/v2/auth/2fa/verify-login` n'est protégée par aucun throttle Laravel (le groupe `api` défini dans `bootstrap/app.php` n'applique pas de `throttle`), et je n'ai trouvé aucun appel à `RateLimitMiddleware` sur cette route.

**Impact :** un attaquant qui connaît déjà le mot de passe d'un compte (réutilisation de mot de passe, phishing, fuite de base tierce) peut initier une connexion pour déclencher l'état `2fa_pending`, puis **brute-forcer le code TOTP à 6 chiffres** (1 million de combinaisons) sans aucune limitation ni verrouillage, ce qui annule une bonne partie de la protection apportée par le 2FA.

**Correctif :**
- Générer un `temp_token` opaque et aléatoire lors du login, le stocker (hashé) côté serveur associé à la tentative, et le comparer explicitement lors de `verifyLogin`.
- Ajouter un throttle strict sur cette route (ex. 5 tentatives / 15 min par `user_id` + IP), verrouillage progressif après échecs répétés, comme c'est déjà fait pour le login classique côté PHP (`RateLimitMiddleware::checkLoginAttempts`).

---

## 2. Failles importantes (à corriger rapidement)

### 2.1 `AdminMiddleware` (backend PHP) s'appuie sur une vérification JWT allégée

**Où :** `backend/src/Middleware/AdminMiddleware.php`

```php
public function handle(): array {
    $user = AuthMiddleware::optionalAuth(); // méthode statique
    ...
}
```

`AdminMiddleware` reçoit une instance de `AuthMiddleware` dans son constructeur mais ne s'en sert jamais : il appelle la méthode **statique** `AuthMiddleware::optionalAuth()`, qui se contente de décoder et vérifier la signature du JWT, **sans** revérifier en base que l'utilisateur existe toujours, n'est pas supprimé (`deleted_at`), ou que la session (`session_id`) associée est toujours valide — contrairement à la méthode d'instance `handle()`, qui fait ces vérifications.

**Impact :** un token JWT admin émis avant une suppression de compte, une déconnexion forcée ou une révocation de session reste valide sur les routes admin jusqu'à son expiration naturelle (24h selon `JWT_EXPIRATION`).

**Correctif :** faire utiliser à `AdminMiddleware` l'instance injectée (`$this->authMiddleware->handleRequired()`) plutôt que la méthode statique allégée.

### 2.2 Rate limiting contournable par simple absence de cookie de session

**Où :** `backend/src/Middleware/RateLimitMiddleware.php::check()`

Quand APCu n'est pas disponible, le compteur retombe sur `$_SESSION`. Comme une session PHP se crée par cookie, il suffit qu'un client n'envoie pas de cookie (ou en efface un à chaque requête) pour obtenir un nouveau compteur à zéro à chaque tentative — la limite `api`/`upload`/`comment` devient inopérante face à un script un minimum sérieux. (Le rate limiting de connexion, `checkLoginAttempts`, est en base de données et n'a pas ce problème.)

**Correctif :** baser le rate limiting générique sur l'IP (déjà disponible via `SecurityHelper::getClientIp()`) dans un stockage partagé entre process (Redis/APCu obligatoire, pas de repli sur la session), pas sur un identifiant que le client contrôle.

### 2.3 Stockage du token JWT en `localStorage` côté frontend

**Où :** `frontend/src/contexts/AuthContext.jsx` (le token est dupliqué sous trois clés différentes : `access_token`, `authToken`, `token`).

Un token accessible en JavaScript peut être exfiltré par n'importe quelle faille XSS présente ailleurs dans l'application (aujourd'hui limitée, voir 2.4, mais le risque grandit avec le code). C'est un choix classique mais qui n'offre aucune protection en cas de XSS, contrairement à un cookie `httpOnly` + `SameSite=Strict`.

**Correctif (à moyen terme, implique de revoir le flux d'auth) :** migrer vers un cookie `httpOnly`, `Secure`, `SameSite=Strict` pour le token, avec un token CSRF séparé pour les requêtes qui modifient des données.

### 2.4 `dangerouslySetInnerHTML` pour le QR code 2FA

**Où :** `frontend/src/components/Settings.jsx` et `frontend/src/pages/Settings.jsx`, ligne ~283/315 : `dangerouslySetInnerHTML={{ __html: twoFASetupData.qr_code }}`.

Le contenu vient du serveur (généralement un SVG généré par une lib 2FA), donc le risque immédiat est faible, mais c'est un point d'injection HTML si jamais cette réponse pouvait un jour être influencée (cache empoisonné, dépendance compromise côté serveur, etc.). À défaut de retirer ce pattern, s'assurer que la génération du SVG côté serveur n'inclut jamais de donnée utilisateur non échappée.

---

## 3. Bugs fonctionnels

### 3.1 `AuthAide::optionalAuth()` est cassé et retourne toujours `null`

**Où :** `backend/src/Middleware/AuthAide.php`

```php
private static ?TokenService $tokenService = null; // jamais initialisé nulle part
...
$payload = self::$tokenService->validateToken($token); // appel sur null
```

`$tokenService` est déclaré mais n'est jamais assigné (aucun setter, aucune injection). Chaque appel lève une erreur PHP ("Call to a member function on null"), silencieusement avalée par le `catch (\Throwable $e)` de `optionalAuth()`, qui retourne donc toujours `null`.

Cette méthode est utilisée dans `UserController.php` ligne 371 — la fonctionnalité qui en dépend (probablement une personnalisation de réponse selon que l'utilisateur courant est connecté ou non) ne fonctionne donc jamais correctement : la requête est toujours traitée comme anonyme, même avec un token valide.

**Correctif :** soit supprimer cette classe redondante et utiliser `AuthMiddleware::optionalAuth()` (qui fonctionne, sans dépendance non initialisée), soit corriger l'injection du `TokenService`.

### 3.2 `backend/public/admin.php` est un fichier vide

Il ne contient que `<?php`. C'est un point d'entrée mort ou une fonctionnalité jamais terminée — à supprimer ou compléter selon l'intention d'origine, pour éviter la confusion avec le vrai panneau admin (celui de Laravel).

### 3.3 Trois clés `localStorage` différentes pour le même token

`access_token`, `authToken` et `token` sont écrits en parallèle à chaque connexion (`AuthContext.jsx`) et lus indifféremment ailleurs dans le code (`VideoCard.jsx`, `VideoPlayer.jsx`, tables admin...). Rien ne garantit que les trois soient toujours synchronisées (par exemple si une déconnexion n'efface qu'une des trois clés) — source probable de bugs d'état "connecté sur un écran, déconnecté sur un autre". À unifier sous une seule clé, idéalement via un module centralisé (`tokenStorage.js`) plutôt que des appels `localStorage` dispersés dans les composants.

### 3.4 Environnement de configuration incohérent

`backend/.env` contient `APP_ENV=development` et `APP_DEBUG=true`, alors que `VITE_API_URL` pointe vers `https://www.laughtube.ca` (domaine de production). Si ce fichier est effectivement celui utilisé en production, `APP_DEBUG=true` peut exposer des traces d'erreurs détaillées (chemins serveur, requêtes SQL, versions de librairies) aux utilisateurs finaux en cas d'exception non interceptée.

### 3.5 Traces de debug oubliées en production

`AuthMiddleware::handle()` (backend PHP) contient des `error_log()` verbeux à chaque requête authentifiée (`AUTHMIDDLEWARE token_extracted=...`, `user_not_found`, etc.). Ce n'est pas exploitable directement (ça part dans les logs serveur, pas dans la réponse HTTP), mais ça alourdit les logs en production et trahit du code de débogage non nettoyé — à repasser en logs de niveau `debug` désactivables.

### 3.6 Deux implémentations backend en parallèle

`backend/` (PHP maison) et `laravel/` (API v2) réimplémentent une bonne partie des mêmes fonctionnalités (auth, vidéos, commentaires, admin, 2FA...). C'est la cause racine de plusieurs failles ci-dessus : une règle de sécurité corrigée dans un backend ne l'est pas forcément dans l'autre (cas du username, du rate limiting, du contrôle admin). Tant que les deux coexistent, chaque futur correctif de sécurité doit être appliqué **deux fois**, ce qui est une source de risque récurrente plutôt qu'un bug ponctuel.

---

## 4. Pistes d'amélioration (au-delà des correctifs de sécurité)

- **Trancher entre les deux backends.** Migrer complètement vers Laravel (ou l'inverse) pour arrêter de maintenir deux surfaces de code en parallèle avec des niveaux de rigueur différents.
- **Exécution de commandes externes** : partout où `ffmpeg` (ou un autre binaire) est invoqué, utiliser `execFile`/`spawn` avec des arguments en tableau plutôt que des chaînes shell interpolées — même principe que 1.1, à généraliser en règle d'équipe.
- **Gestion des secrets** : sortir tous les secrets de `docker-compose.yml` et des fichiers `.env` versionnés, vers un vrai gestionnaire de secrets (Docker secrets, Vault, ou au minimum un `.env` non commité avec des permissions restreintes sur le serveur).
- **CI/CD** : ajouter un scan de dépendances (`npm audit`, `composer audit`) et un linter de sécurité (ex. `semgrep`) au pipeline, pour attraper ce type de régression avant qu'elle n'atteigne la production.
- **Tests de sécurité automatisés** : au minimum, un test Feature Laravel par route admin vérifiant le rejet des utilisateurs non-admin (voir 1.2), et un test vérifiant que l'inscription rejette les noms d'utilisateur avec caractères spéciaux (voir 1.1).
- **Nettoyage du code mort** : `AuthAide`, `backend/public/admin.php`, les `console.log` oubliés (8 fichiers dans `frontend/src`), et les `error_log` de debug (voir 3.1, 3.2, 3.5).
- **Uniformiser le stockage du token frontend** dans un seul endroit (voir 3.3), en vue d'une migration future vers un cookie `httpOnly`.
- **Documenter clairement** dans le `README` quelle API (`backend/` ou `laravel/`) est la source de vérité actuelle, pour éviter que de futurs correctifs ne soient appliqués au mauvais endroit.

---

## 5. Ce qui est déjà bien fait

Pour équilibrer : plusieurs points sont solides et méritent d'être maintenus tels quels.

- **Aucune injection SQL trouvée** : toutes les requêtes du backend PHP et du modèle Laravel passent par des requêtes paramétrées (`$1`, `$2`... ou le query builder Eloquent) ; la mise à jour du profil utilisateur restreint les colonnes modifiables via une liste blanche.
- **Upload de fichiers correctement validé** : extension + type MIME réel (via `finfo`) vérifiés, nom de fichier régénéré aléatoirement côté serveur (empêche la traversée de répertoire), taille plafonnée, vérification `is_uploaded_file`.
- **Configuration nginx solide** : en-têtes de sécurité (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), blocage de l'exécution PHP dans le dossier `/uploads/`, blocage de l'accès direct aux fichiers `.env/.git/.sql/.bak`, limitation de débit au niveau nginx sur les routes d'auth/upload.
- **CORS bien restreint** (liste blanche stricte d'origines, comparaison en mode strict) sur `backend/config/cors.php` et `laravel/config/cors.php`.
- **Anti-énumération** correctement implémentée sur la demande de réinitialisation de mot de passe (réponse identique que l'email existe ou non).
- **Génération de tokens/session** basée sur `random_bytes`/`random_int` cryptographiquement sûrs.
- **Fichiers `.env` non commités** (correctement listés dans `.gitignore`) — seul `docker-compose.yml` fait exception, ce qui rend le problème de la section 1.3 d'autant plus dommage vu le soin apporté ailleurs.

---

## 6. Plan d'action priorisé

1. **Aujourd'hui** : faire tourner tous les secrets listés en 1.3 (APP_KEY, secret Google, mot de passe DB, clés LiveKit, JWT_SECRET) et retirer les valeurs en dur de `docker-compose.yml`.
2. **Cette semaine** : ajouter le middleware de rôle admin sur toutes les routes `/api/v2/admin/*` et `/api/v2/jokair/admin/*` (1.2) ; corriger la construction de la commande ffmpeg dans l'encodeur pour éliminer le RCE (1.1) ; aligner la validation du username entre Laravel et PHP.
3. **Ce mois-ci** : corriger la vérification 2FA (1.5), le rate limiting basé sur session (2.2), le `AdminMiddleware` du backend PHP (2.1).
4. **En continu** : nettoyage du code mort (section 3), mise en place du scan de dépendances en CI, décision sur la fusion des deux backends.
