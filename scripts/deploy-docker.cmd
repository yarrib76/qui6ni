@echo off
setlocal enabledelayedexpansion

REM Ajustar si el proyecto esta en otra carpeta.
if "%APP_DIR%"=="" set "APP_DIR=C:\Proyectos\Quini6"
if "%ENV_FILE%"=="" set "ENV_FILE=%APP_DIR%\.env.docker"
if "%COMPOSE_FILE%"=="" set "COMPOSE_FILE=%APP_DIR%\docker-compose.yml"
if "%PROJECT_NAME%"=="" set "PROJECT_NAME=quini6"
if "%NO_CACHE%"=="" set "NO_CACHE=0"

echo ==^> Entrando a: %APP_DIR%
cd /d "%APP_DIR%"
if errorlevel 1 exit /b 1

if not exist "%ENV_FILE%" (
  echo ERROR: No existe %ENV_FILE%
  echo Crea el archivo con:
  echo   copy .env.docker.example .env.docker
  echo y configura DB_PASSWORD y MYSQL_ROOT_PASSWORD.
  exit /b 1
)

echo ==^> Git pull...
git pull
if errorlevel 1 exit /b 1

echo ==^> Validando docker compose...
docker compose --project-name "%PROJECT_NAME%" --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" config >nul
if errorlevel 1 exit /b 1

if "%NO_CACHE%"=="1" (
  echo ==^> Docker build app ^(no-cache^)...
  docker compose --project-name "%PROJECT_NAME%" --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" build --no-cache app
) else (
  echo ==^> Docker build app...
  docker compose --project-name "%PROJECT_NAME%" --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" build app
)
if errorlevel 1 exit /b 1

echo ==^> Levantando servicios...
docker compose --project-name "%PROJECT_NAME%" --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" up -d
if errorlevel 1 exit /b 1

echo ==^> Estado de servicios:
docker compose --project-name "%PROJECT_NAME%" --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" ps

echo ==^> Logs recientes de la app:
docker compose --project-name "%PROJECT_NAME%" --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" logs --tail=80 app

echo ==^> OK. Aplicacion disponible en el puerto definido por APP_PORT en .env.docker.
endlocal
