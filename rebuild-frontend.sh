#!/bin/bash
echo "Rebuild frontend..."
docker compose up --build frontend
echo "Frontend rebuildé"