# Audit de sécurité et d'état — LaughTube

Date : 13 septembre 2026  
Périmètre : backend legacy PHP, Laravel v2, encodeur, frontend, Docker/LiveKit et configuration de déploiement.  
Référence : corrections du commit `5be0a66` et modifications présentes dans l'arbre de travail.

## Verdict

L'état est **nettement amélioré** par rapport à l'audit du 12 septembre. Les failles principales du backend Laravel sont maintenant corrigées et couvertes par des tests. Je classe néanmoins le projet **orange : pas encore prêt pour une mise en production complète** à cause d'un webhook legacy toujours non authentifié et de secrets de développement encore versionnés.

## 1. Corrections confirmées

Les points suivants sont corrigés dans le code actuel :

- **Contournement 2FA du login classique** : `/api/v2/login` émet maintenant un `2fa_pending` au lieu d'un token complet; le frontend transmet bien le `temp_token` à la vérification.
- **Vérification du token 2FA** : `PersonalAccessToken::findToken()` est utilisé correctement et le token est supprimé après réussite.
- **Désactivation 2FA sans mot de passe** : le mot de passe est maintenant obligatoire et vérifié.
- **Login/inscription sans limite** : throttling Laravel ajouté sur `/api/v2/login` et `/api/v2/register`.
- **Divulgation d'erreurs serveur** : les erreurs 5xx sont maintenant masquées en production avec une référence de log; les erreurs 401/422 normales restent correctement formatées.
- **Endpoint `/debug-ip`** : supprimé.
- **Confiance proxy** : `trustProxies('*')` remplacé par les plages privées Docker.
- **Suppression de compte** : réauthentification par mot de passe, soft-delete et révocation des tokens.
- **Fallback DB connu** : `changeme` supprimé du backend et de l'encodeur; l'absence de `DB_PASSWORD` provoque un arrêt.
- **Rate limiting legacy** : le fallback fichier verrouillé remplace la désactivation silencieuse d'APCu.
- **Ancien composant Settings** : supprimé, ce qui retire l'ancien flux 2FA et le `dangerouslySetInnerHTML` concerné.
- **Secrets Laravel production** : `docker-compose.yml` exige désormais les variables sensibles au lieu de valeurs par défaut en clair.

## 2. Points encore ouverts

### 2.1 Webhook Resend legacy non authentifié — élevé

**Fichier :** `backend/src/Controllers/ResendInboundWebhook.php:14-67`  
**Route :** `backend/public/index.php:799-801`

Le webhook Laravel vérifie maintenant la signature Svix, mais son équivalent PHP legacy reste public et accepte le payload sans `svix-id`, `svix-timestamp` ni `svix-signature`. L'URL `/api/webhooks/resend-inbound` peut donc encore recevoir de faux messages et déclencher des requêtes vers l'API Resend avec la clé serveur.

**Action :** appliquer exactement la validation Svix au backend legacy, ou supprimer cette route si elle n'est plus utilisée. Vérifier ensuite quel endpoint est réellement déclaré dans Resend.

### 2.2 Secret Resend manquant dans l'environnement Docker actuel — disponibilité élevée

`docker-compose.yml` transmet `RESEND_WEBHOOK_SECRET`, mais le `.env` racine présent dans cet environnement ne contient pas cette variable. Le code est correctement en « fermeture » : le webhook Laravel répondra 401 plutôt que d'accepter des requêtes non signées, mais aucun événement Resend ne sera traité.

**Action :** ajouter le vrai secret de signature Resend dans le `.env` de chaque environnement, sans le commiter, puis redémarrer/recharger Laravel. Ne pas confondre `RESEND_API_KEY` et `RESEND_WEBHOOK_SECRET`.

### 2.3 Secrets de développement encore versionnés — risque accepté, mais à contenir

**Fichiers :** `docker-compose.local.yml:13-24`, `docker/livekit/livekit.yaml:7`

La clé APP Laravel, le mot de passe PostgreSQL local, les clés LiveKit et une clé Resend restent en clair dans Git. Le commit indique que ce point est volontaire. Cela reste acceptable uniquement si ces valeurs sont strictement locales, sans réutilisation en production et sans accès réseau public; la clé Resend et les identifiants LiveKit doivent malgré tout être considérés comme exposés.

**Action recommandée :** remplacer ces valeurs par des variables `.env` locales non suivies et faire tourner les clés si elles ont déjà été utilisées hors développement.

### 2.4 Tokens Sanctum persistants dans `localStorage` — risque accepté

**Fichiers :** `laravel/config/sanctum.php:50`, `frontend/src/services/apiService.js:132-164`

Les tokens restent en `localStorage` et `sanctum.expiration` reste à `null`. Un token volé par XSS ou par une machine compromise reste donc utilisable jusqu'à révocation. Le commit précédent documente ce choix comme volontaire.

**Action recommandée :** à moyen terme, migrer vers un cookie `HttpOnly`/`Secure`/`SameSite`, définir une expiration et révoquer les tokens lors des opérations sensibles.

### 2.5 IP Cloudflare transmise sans validation d'origine — moyen à élevé selon le réseau

**Fichier :** `docker/nginx/default.conf:95,110,211`

Nginx transmet `X-CF-Connecting-IP` directement comme `REMOTE_ADDR`. Si l'origine Docker est accessible autrement que via Cloudflare, un client peut forger cet en-tête et contourner les limites basées sur l'IP. La restriction Laravel des proxies privés ne corrige pas le fait que Nginx fabrique lui-même cette valeur.

**Action :** limiter l'origine aux plages Cloudflare au niveau réseau, ou configurer le module `real_ip` avec les CIDR Cloudflare et utiliser l'adresse réelle validée. À défaut, transmettre `$remote_addr`.

### 2.6 Codes de secours 2FA non persistés — moyen

**Fichier :** `laravel/app/Http/Controllers/Api/TwoFactorController.php:49-57`

Les dix codes de secours sont générés et renvoyés au frontend, mais aucune colonne ou table ne les stocke et aucun endpoint ne les accepte. Ils ne peuvent donc pas servir à récupérer le compte.

**Action :** stocker uniquement des hashes de codes à usage unique, afficher les codes une seule fois et ajouter le chemin de vérification avec throttling.

### 2.7 Anti-abus insuffisant sur les fonctions publiques — moyen/faible

- `POST /api/v2/lives/{id}/join-public` crée des tokens LiveKit invités sans throttling dédié et autorise `canPublishData`.
- `POST /api/v2/ads/{id}/click` incrémente directement les clics sans limite ni déduplication.

Ces points permettent surtout du spam de signalisation LiveKit et de la fraude de statistiques, mais devraient être durcis avant une audience importante.

### 2.8 Deux backends toujours actifs — risque structurel

Les mêmes fonctions existent encore dans `backend/` et `laravel/`. La correction du webhook montre que les deux chemins doivent être audités séparément : sécuriser uniquement Laravel ne suffit pas si l'URL legacy reste accessible.

## 3. Vérifications exécutées

- PHPUnit Laravel : **25 tests, 80 assertions, OK**.
- Contrôles manuels backend : **5 vérifications, 5 succès**.
- Syntaxe PHP de `backend/` et `laravel/` : OK.
- Syntaxe Node de l'encodeur et du service frontend : OK.
- Les tests couvrent maintenant login/2FA, throttling, suppression de compte, erreurs API, webhook Laravel et suppression de `/debug-ip`.

## 4. État final par priorité

### À corriger avant production

1. Authentifier ou supprimer le webhook Resend legacy.
2. Ajouter `RESEND_WEBHOOK_SECRET` dans le `.env` de production et tester un vrai événement signé.
3. Vérifier que l'origine n'est accessible que via Cloudflare, ou corriger la gestion de l'IP réelle.

### Accepté mais à documenter

4. Secrets dans la configuration locale versionnée.
5. Tokens Sanctum dans `localStorage` sans expiration globale.

### Améliorations suivantes

6. Implémenter réellement les codes de secours 2FA.
7. Ajouter throttling/déduplication sur LiveKit public et les clics publicitaires.
8. Terminer la migration vers un seul backend.
