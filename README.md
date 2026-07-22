# Quini 6 Historico

Aplicacion web Node.js + Express + MySQL para la Etapa 1 del proyecto Quini 6: obtener, guardar y consultar resultados historicos de `TRADICIONAL` y `SEGUNDA`.

## Requisitos

- Node.js 20 o superior.
- MySQL 8 o compatible.
- Base de datos `quini6`.

## Instalacion

```bash
npm install
```

Crear la base y tablas ejecutando:

```bash
mysql -u TU_USUARIO -p < database/schema.sql
```

Copiar `.env.example` a `.env` y completar credenciales:

```env
DB_NAME=quini6
DB_USER=tu_usuario
DB_PASSWORD=tu_password
SCRAPER_BASE_URL=https://www.quini-6.com.ar/
SCRAPER_START_YEAR=2012
```

## Ejecucion

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Docker

Crear el archivo de entorno para Docker:

```bash
cp .env.docker.example .env.docker
```

Editar `.env.docker` y cambiar `MYSQL_ROOT_PASSWORD` y `DB_PASSWORD`.

Levantar aplicacion y MySQL:

```bash
docker compose --env-file .env.docker up -d --build
```

Abrir `http://localhost:3000`.

El primer arranque de MySQL ejecuta automaticamente `database/schema.sql` sobre el volumen nuevo `quini6_mysql_data`.

Para ver logs:

```bash
docker compose --env-file .env.docker logs -f app
```

Para detener:

```bash
docker compose --env-file .env.docker down
```

### Script de despliegue en servidor

En el servidor, clonar el repo y crear `.env.docker`:

En Windows/CMD, dentro de `C:\Proyectos\Quini6`:

```bat
copy .env.docker.example .env.docker
notepad .env.docker
scripts\deploy-docker.cmd
```

Si ya tenes MySQL en otro contenedor o instalado en el servidor, no levantes el MySQL de este compose. Configura `.env.docker` apuntando a esa base y usa:

```bat
scripts\deploy-docker-external-db.cmd
```

En ese caso, `.env.docker` debe tener por ejemplo:

```env
APP_PORT=3030
PORT=3000
DB_HOST=host.docker.internal
DB_PORT=3306
DB_NAME=quini6
DB_USER=tu_usuario
DB_PASSWORD=tu_password
```

Si tu MySQL esta en otro contenedor de Docker, `DB_HOST` debe ser el nombre del contenedor o servicio MySQL, y ambos contenedores deben compartir una red Docker.

En Linux o Git Bash:

```bash
cd /c/Proyectos/Quini6
cp .env.docker.example .env.docker
chmod +x scripts/deploy-docker.sh
./scripts/deploy-docker.sh
```

Editar `.env.docker` y cambiar passwords/puertos antes de levantar.

Si el repo esta en otra carpeta, Windows/CMD:

```bat
set APP_DIR=C:\Otra\Ruta\Quini6
scripts\deploy-docker.cmd
```

Si el repo esta en otra carpeta, Linux/Git Bash:

```bash
APP_DIR=/c/Proyectos/Quini6 ./scripts/deploy-docker.sh
```

Para forzar build sin cache:

```bash
NO_CACHE=1 ./scripts/deploy-docker.sh
```

Para migrar datos desde otro servidor MySQL:

```bash
mysqldump -h ORIGEN_HOST -u ORIGEN_USER -p quini6 > quini6.sql
docker compose --env-file .env.docker exec -T db sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < quini6.sql
```

## Pruebas

```bash
npm test
```

## Alcance

Incluye:

- Scraping incremental desde `https://www.quini-6.com.ar/`.
- Persistencia en MySQL con restricciones contra duplicados.
- Registro de importaciones y errores.
- API para historico, resumen, actualizacion e importaciones.
- Interfaz administrativa con DataTables y vista agrupada.

No incluye predicciones, estadisticas avanzadas, IA, jugadas reales, premios, autenticacion ni Docker.
