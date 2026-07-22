#!/usr/bin/env bash
set -euo pipefail

# Usa este script cuando MySQL ya existe fuera de este docker-compose.
APP_DIR="${APP_DIR:-/c/Proyectos/Quini6}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.docker}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_DIR/docker-compose.yml}"
OVERRIDE_FILE="${OVERRIDE_FILE:-$APP_DIR/docker-compose.external-db.yml}"
PROJECT_NAME="${PROJECT_NAME:-quini6}"
NO_CACHE="${NO_CACHE:-0}"
DOCKER_BIN="${DOCKER_BIN:-docker}"

echo "==> Entrando a: $APP_DIR"
cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: No existe $ENV_FILE"
  echo "Crea el archivo con:"
  echo "  cp .env.docker.example .env.docker"
  echo "y configura DB_HOST, DB_PORT, DB_USER y DB_PASSWORD apuntando a tu MySQL existente."
  exit 1
fi

echo "==> Git pull..."
git pull

echo "==> Validando docker compose (solo app, DB externa)..."
$DOCKER_BIN compose \
  --project-name "$PROJECT_NAME" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  -f "$OVERRIDE_FILE" \
  config >/dev/null

if [[ "$NO_CACHE" == "1" ]]; then
  echo "==> Docker build app (no-cache)..."
  $DOCKER_BIN compose \
    --project-name "$PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    -f "$OVERRIDE_FILE" \
    build --no-cache app
else
  echo "==> Docker build app..."
  $DOCKER_BIN compose \
    --project-name "$PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    -f "$OVERRIDE_FILE" \
    build app
fi

echo "==> Levantando solo la app..."
$DOCKER_BIN compose \
  --project-name "$PROJECT_NAME" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  -f "$OVERRIDE_FILE" \
  up -d --no-deps app

echo "==> Estado:"
$DOCKER_BIN compose \
  --project-name "$PROJECT_NAME" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  -f "$OVERRIDE_FILE" \
  ps app

echo "==> Logs recientes de la app:"
$DOCKER_BIN compose \
  --project-name "$PROJECT_NAME" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  -f "$OVERRIDE_FILE" \
  logs --tail=80 app

echo "==> OK. Aplicacion disponible en el puerto definido por APP_PORT en .env.docker."
