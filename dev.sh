#!/bin/bash
echo "Démarrage LaughTube en local..."
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.local.yml down && docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
echo "Dispo sur http://localhost"