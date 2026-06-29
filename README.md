# 🎤 LaughTube — Tube à rire

> La plateforme québécoise 100% dédiée à l'humour.  
> Vidéos humoristiques, lives, battles et créateurs de talent réunis dans une seule application.

[![App Store](https://img.shields.io/badge/App_Store-Tube_à_rire-black?logo=apple)](https://apps.apple.com)
[![Laravel](https://img.shields.io/badge/Laravel-11-red?logo=laravel)](https://laravel.com)
[![Swift](https://img.shields.io/badge/Swift-5.9-orange?logo=swift)](https://swift.org)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)](https://docker.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://postgresql.org)

---

## 📋 Table des matières

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Déploiement](#déploiement)
- [API](#api)
- [Application iOS](#application-ios)
- [Auteur](#auteur)

---

## 🎯 Aperçu

LaughTube (Tube à rire) est une plateforme UGC (User Generated Content) québécoise dédiée exclusivement à l'humour. Les créateurs uploadent leurs propres vidéos humoristiques, organisent des battles en direct et font des lives pour leur audience.

**Disponible sur :**
- 🌐 Web : [laughtube.ca](https://www.laughtube.ca)
- 📱 iOS : App Store — "Tube à rire"

---

## ✨ Fonctionnalités

### Utilisateurs
- 📹 Upload et lecture de vidéos humoristiques
- 🔴 Lives en temps réel (LiveKit)
- ⚔️ Battle Rooms entre créateurs
- 🏆 Classement mensuel des meilleurs créateurs
- 🔔 Notifications en temps réel (push + in-app)
- 👤 Profil créateur avec statistiques
- ❤️ Likes, commentaires, réponses et mentions
- 🚫 Blocage d'utilisateurs
- 🚩 Signalement de contenu
- 🔐 Authentification 2FA (TOTP)
- 🌙 Thème Sombre / Clair / Système (iOS)

### Sécurité
- Authentification OAuth (Google, Apple)
- JWT via Laravel Sanctum
- 2FA avec Google Authenticator
- Zéro tolérance pour le contenu inapproprié
- CGU obligatoires à l'inscription

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Clients                           │
│         React SPA          iOS (SwiftUI)            │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────────┐
│                 Nginx (Reverse Proxy)               │
│              SSL / Cloudflare CDN                   │
└──────┬───────────────────────────┬──────────────────┘
       │                           │
┌──────▼──────┐           ┌───────▼──────┐
│   Backend   │           │   Laravel    │
│  (PHP 8.2)  │           │  API v2      │
│  Legacy API │           │  Sanctum     │
└──────┬──────┘           └───────┬──────┘
       │                          │
┌──────▼──────────────────────────▼──────┐
│           PostgreSQL 15                │
└──────────────────────┬─────────────────┘
                       │
┌──────────────────────▼─────────────────┐
│           Encoder (Node.js + FFmpeg)   │
│     Encodage vidéo asynchrone          │
└────────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────┐
│           LiveKit Server               │
│     Streaming temps réel (WebRTC)      │
└────────────────────────────────────────┘
```

---

## 🛠 Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend Web | React 18 + Vite + TailwindCSS |
| Backend API v1 | PHP 8.2 (Legacy) |
| Backend API v2 | Laravel 11 + Sanctum |
| Base de données | PostgreSQL 15 |
| Encodage vidéo | Node.js + FFmpeg |
| Streaming live | LiveKit (WebRTC) |
| App iOS | SwiftUI + AVFoundation |
| Reverse proxy | Nginx |
| Conteneurisation | Docker + Docker Compose |
| Hébergement | DigitalOcean (NYC3) |
| CDN / DNS | Cloudflare |
| Push notifications | APNs (Apple Push Notification) |
| Email | Resend |
| Auth OAuth | Google OAuth 2.0 + Sign in with Apple |
| Police | Poppins |

---

## 📁 Structure du projet

```
laugh-tube/
├── backend/              # API PHP legacy (v1)
│   ├── public/
│   └── src/
├── laravel/              # API Laravel (v2)
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   │   ├── AuthController.php
│   │   │   ├── VideoController.php
│   │   │   ├── CommentController.php
│   │   │   ├── BattleController.php
│   │   │   ├── LiveController.php
│   │   │   ├── BlockController.php
│   │   │   ├── TwoFactorController.php
│   │   │   └── ...
│   │   ├── Models/
│   │   └── Helpers/
│   │       ├── BlockHelper.php
│   │       └── NotificationHelper.php
│   ├── database/migrations/
│   └── routes/api.php
├── frontend/             # React SPA
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── services/
│   └── vite.config.js
├── encoder/              # Service d'encodage vidéo
│   └── index.js
├── docker/               # Configs Docker
│   ├── nginx/
│   │   └── default.conf
│   ├── livekit/
│   │   └── livekit.yaml
│   └── postgres/
├── docker-compose.yml
├── docker-compose.local.yml
├── dev.sh
└── rebuild-frontend.sh
```

---

## 🚀 Installation

### Prérequis

- Docker & Docker Compose
- Git
- Node.js 20+ (pour le développement local)

### 1. Cloner le repo

```bash
git clone https://github.com/Steve2370/laugh-tube.git
cd laugh-tube
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

### 3. Lancer en développement local

```bash
./dev.sh
```

### 4. Rebuilder le frontend

```bash
./rebuild-frontend.sh
```

---

## 🔧 Variables d'environnement

```env
# Base de données
DB_NAME=laughtube
DB_USER=laughtube_user
DB_PASSWORD=your_password

# Laravel
APP_KEY=base64:...
APP_ENV=production

# OAuth Google
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://www.laughtube.ca/api/v2/auth/google/callback

# LiveKit
LIVEKIT_HOST=livekit:7880
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret

# Encodeur
VIDEO_PRESET=fast
VIDEO_CRF=26
MAX_WORKERS=4
```

---

## 🌐 Déploiement

### Production (DigitalOcean)

```bash
ssh root@134.209.168.137
cd /opt/Laugh_Tube

# Pull et rebuild
git pull
docker compose build laravel && docker compose up -d laravel
docker compose restart nginx

# Migrations Laravel
docker exec laughtube_laravel php artisan migrate --force

# Rebuilder le frontend
./rebuild-frontend.sh
```

### Services Docker

| Container | Rôle | Port |
|-----------|------|------|
| `laughtube_postgres` | Base de données | 5432 (interne) |
| `laughtube_backend` | API PHP legacy | 9000 (interne) |
| `laughtube_laravel` | API Laravel v2 | interne |
| `laughtube_frontend_builder` | Build React | - |
| `laughtube_encoder` | Encodage FFmpeg | interne |
| `laughtube_livekit` | Streaming WebRTC | 7880-7882 |
| `laughtube_nginx` | Reverse proxy | 80, 443 |

### Backups automatiques

Des backups PostgreSQL sont créés automatiquement chaque nuit :

```bash
ls /opt/Laugh_Tube/backup_*.sql
```

---

## 📡 API

### Base URL

```
https://www.laughtube.ca/api/v2
```

### Authentification

```http
Authorization: Bearer {token}
```

### Endpoints principaux

#### Auth
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/register` | Créer un compte |
| POST | `/login` | Connexion |
| POST | `/logout` | Déconnexion |
| GET | `/auth/google` | OAuth Google |
| POST | `/auth/apple` | Sign in with Apple |
| POST | `/auth/2fa/verify-login` | Vérification 2FA |

#### Vidéos
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/videos` | Feed (filtré selon blocages) |
| GET | `/videos/trending` | Vidéos tendances |
| GET | `/videos/popular` | Vidéos populaires |
| GET | `/videos/recent` | Vidéos récentes |
| GET | `/videos/{id}` | Détail d'une vidéo |
| POST | `/videos/upload` | Upload vidéo |
| DELETE | `/videos/{id}` | Supprimer une vidéo |
| POST | `/videos/{id}/like` | Liker |
| POST | `/videos/{id}/comments` | Commenter |

#### Utilisateurs
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/me` | Profil connecté |
| PUT | `/profile` | Modifier profil |
| GET | `/users/{id}/profile` | Profil public |
| POST | `/users/{id}/block` | Bloquer |
| DELETE | `/users/{id}/unblock` | Débloquer |
| POST | `/users/{id}/subscribe` | S'abonner |

#### Lives & Battles
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/lives` | Liste des lives |
| POST | `/lives/start` | Démarrer un live |
| GET | `/battles` | Liste des battles |
| POST | `/users/{id}/challenge` | Défier un créateur |

---

## 📱 Application iOS

L'application iOS "Tube à rire" est développée en SwiftUI et disponible sur l'App Store.

### Fonctionnalités iOS
- Feed vidéo avec lecture intégrée
- Thème Sombre / Clair / Système
- Notifications push (APNs)
- Sign in with Apple + Google OAuth
- Authentification 2FA
- Battle Rooms en temps réel (LiveKit)
- Lives interactifs
- Blocage et signalement d'utilisateurs

### Tech iOS
- SwiftUI + MVVM
- AVFoundation (player vidéo)
- LiveKit SDK (WebRTC)
- Kingfisher (cache images)
- Lottie (animations)
- Pow (effets visuels)
- Keychain (tokens sécurisés)

---

## 👨‍💻 Auteur

**Brice Steve Tchagam Youatchui** (Leon Beltran)

- GitHub: [@Steve2370](https://github.com/Steve2370)
- Site: [laughtube.ca](https://www.laughtube.ca)
- Projet solo — Design, développement, déploiement et soumission App Store

---

## 📄 Licence

© 2026 LaughTube / Tube à rire. Tous droits réservés.

Ce projet est privé. Toute reproduction ou distribution sans autorisation est interdite.
