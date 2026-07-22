#!/usr/bin/env bash
set -euo pipefail

# Ajusta APP_DIR si clonaste el repo en otra carpeta.
# En Git Bash sobre Windows podes usar:
#   APP_DIR=/c/Proyectos/Quini6 ./scripts/deploy-docker.sh
APP_DIR="${APP_DIR:-/c/Proyectos/Quini6}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.docker}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_DIR/docker-compose.yml}"
PROJECT_NAME="${PROJECT_NAME:-quini6}"
NO_CACHE="${NO_CACHE:-0}"

echo "==> Entrando a: $APP_DIR"
cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: No existe $ENV_FILE"
  echo "Crea el archivo con:"
  echo "  cp .env.docker.example .env.docker"
  echo "y configura DB_PASSWORD y MYSQL_ROOT_PASSWORD."
  exit 1
fi

echo "==> Git pull..."
git pull

DOCKER_BIN="${DOCKER_BIN:-docker}"
if command -v sudo >/dev/null 2>&1; then
  DOCKER_BIN="${DOCKER_BIN:-sudo docker}"
fi

echo "==> Validando docker compose..."
$DOCKER_BIN compose \
  --project-name "$PROJECT_NAME" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  config >/dev/null

if [[ "$NO_CACHE" == "1" ]]; then
  echo "==> Docker build app (no-cache)..."
  $DOCKER_BIN compose \
    --project-name "$PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    build --no-cache app
else
  echo "==> Docker build app..."
  $DOCKER_BIN compose \
    --project-name "$PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    build app
fi

echo "==> Levantando servicios..."
$DOCKER_BIN compose \
  --project-name "$PROJECT_NAME" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d

echo "==> Estado de servicios:"
$DOCKER_BIN compose \
  --project-name "$PROJECT_NAME" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  ps

echo "==> Logs recientes de la app:"
$DOCKER_BIN compose \
  --project-name "$PROJECT_NAME" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  logs --tail=80 app

echo "==> OK. Aplicacion disponible en el puerto definido por APP_PORT en .env.docker."
