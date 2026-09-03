#!/bin/bash
# deploy.sh — à placer à la racine du dépôt, exécuté depuis /opt/Laugh_Tube sur le serveur
set -euo pipefail

echo "1) Backup avant tout changement..."
docker exec laughtube_postgres pg_dump -U laughtube_user laughtube \
  > /opt/Laugh_Tube/backup_pre_deploy_$(date +%Y%m%d_%H%M).sql

echo "2) Vérification qu'aucun fichier n'a été modifié à la main sur le serveur..."
if [ -n "$(git status --porcelain)" ]; then
  echo "ERREUR: des fichiers ont été modifiés directement sur le serveur."
  echo "Voir 'git status' / 'git diff' avant de continuer — ne PAS faire git reset --hard"
  echo "sans avoir d'abord sauvegardé ces changements (voir partie 1.2.a du rapport)."
  exit 1
fi

echo "3) Récupération du code..."
git pull

echo "4) Rebuild de TOUS les services applicatifs (jamais un seul au choix)..."
docker compose build backend laravel encoder
docker compose up -d backend laravel encoder
docker compose restart nginx

echo "5) Migrations Laravel..."
docker exec laughtube_laravel php artisan migrate --force

echo "6) Rebuild frontend..."
./rebuild-frontend.sh

echo "Déploiement terminé. Vérifier docker compose ps et les logs avant de considérer"
echo "le déploiement comme réussi :"
docker compose ps
