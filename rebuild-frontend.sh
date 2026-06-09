#!/bin/bash
echo "Rebuild frontend..."
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build frontend
echo "Frontend rebuildé"