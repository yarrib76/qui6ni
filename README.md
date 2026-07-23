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
- Analisis estadistico por modalidad y periodo.
- Frecuencia observada vs esperada por numero, diferencia porcentual y z-score.
- Distribuciones de pares/impares, decenas, suma total, consecutivos y repetidos.
- Pares y trios frecuentes.
- Calidad del historico por anio.
- Guardado opcional de snapshots de analisis para etapas futuras.
- Generador de combinaciones con estrategias estadisticas iniciales.
- Backtesting de estrategias usando solo sorteos anteriores al sorteo evaluado.
- Comparacion y ranking de estrategias bajo los mismos parametros.
- Gestion de jugadas candidatas generadas antes de confirmarlas como reales.

No incluye predicciones, estadisticas avanzadas, IA, jugadas reales, premios, autenticacion ni Docker.

## Etapa 2 - Analisis estadistico

Antes de usar el guardado de analisis, ejecutar:

```bash
mysql -u TU_USUARIO -p quini6 < database/schema_etapa2.sql
```

La pantalla `Analisis estadistico` permite analizar:

- Todo el historico.
- Ultimo anio.
- Ultimos N anios.
- Ultimos N sorteos.
- Rango de fechas.
- Rango de sorteos.

Los analisis pueden ejecutarse solo para consulta o guardarse como snapshot en:

- `quini_analisis`
- `quini_analisis_numeros`
- `quini_analisis_distribuciones`
- `quini_analisis_combinaciones`
- `quini_analisis_calidad`

## Etapa 3 - Generador de combinaciones

Antes de usar el guardado de combinaciones, ejecutar:

```bash
mysql -u TU_USUARIO -p quini6 < database/schema_etapa3.sql
```

La pantalla `Generador de combinaciones` permite elegir modalidad, periodo, cantidad y estrategia.

Estrategias incluidas:

- `ALEATORIA`: seleccion aleatoria pura.
- `MAS_FRECUENTES`: prioriza los numeros con mas apariciones del periodo.
- `MENOS_FRECUENTES`: prioriza los numeros con menos apariciones.
- `MAYOR_ZSCORE`: prioriza desvios positivos frente a lo esperado.
- `MAS_ATRASADOS`: prioriza numeros con mas sorteos desde su ultima aparicion.
- `BALANCEADA`: combina frecuencia, atraso, paridad y decenas.
- `PONDERADA_FRECUENCIA`: sorteo ponderado por frecuencia y z-score.

Cada combinacion se guarda como `SIMULADA` o `CANDIDATA`, no como jugada real.

Tablas usadas:

- `quini_estrategias`
- `quini_combinaciones_generadas`

## Etapa 4 - Backtesting

Antes de guardar corridas de backtesting, ejecutar:

```bash
mysql -u TU_USUARIO -p quini6 < database/schema_etapa4.sql
```

La pantalla `Backtesting` permite evaluar una estrategia contra sorteos historicos. Para cada sorteo evaluado, el sistema entrena/genera usando solo los sorteos anteriores dentro de la ventana de entrenamiento configurada.

Parametros principales:

- Modalidad.
- Estrategia.
- Periodo de prueba.
- Ventana de entrenamiento.
- Combinaciones por sorteo.

Resultados:

- Sorteos evaluados.
- Jugadas generadas.
- Promedio de aciertos.
- Mejor acierto.
- Distribucion de 0 a 6 aciertos.
- Detalle por sorteo.
- Comparacion contra multiples simulaciones aleatorias.

La comparacion aleatoria ejecuta N corridas con `ALEATORIA` usando los mismos parametros. Esto evita comparar contra una sola corrida aleatoria con suerte o mala suerte. El percentil indica que porcentaje de corridas aleatorias quedaron por debajo o igual que la estrategia evaluada.

Tablas usadas:

- `quini_backtesting_corridas`
- `quini_backtesting_detalles`

## Etapa 5 - Comparacion de estrategias

La pantalla `Comparacion de estrategias` ejecuta varias estrategias con los mismos parametros y las ordena por rendimiento.

Parametros:

- Modalidad.
- Periodo de prueba.
- Ventana de entrenamiento.
- Combinaciones por sorteo.
- Simulaciones aleatorias.
- Estrategias incluidas.

Resultados:

- Ranking por promedio de aciertos.
- Diferencia contra promedio aleatorio.
- Percentil contra aleatoria.
- Mejor acierto.
- Distribucion resumida de aciertos.

Esta etapa no agrega tablas nuevas por ahora; calcula bajo demanda usando el historico y el motor de backtesting.

## Etapa 6 - Jugadas candidatas

Antes de usar el estado `SELECCIONADA` y observaciones, ejecutar:

```bash
mysql -u TU_USUARIO -p quini6 < database/schema_etapa6.sql
```

La pantalla `Jugadas candidatas` permite gestionar combinaciones generadas:

- Filtrar por estado, modalidad y estrategia.
- Marcar como `CANDIDATA`.
- Marcar como `SELECCIONADA`.
- Volver a `SIMULADA`.
- Marcar como `ANULADA`.
- Registrar observaciones.

Esta etapa todavia no registra comprobantes ni apuestas reales. El estado `SELECCIONADA` indica que la combinacion queda preparada para una futura confirmacion como jugada real.

## Etapa 7 - Jugadas reales y aciertos

Antes de registrar jugadas reales, ejecutar:

```bash
mysql -u TU_USUARIO -p quini6 < database/schema_etapa7.sql
```

La pantalla `Jugadas reales` permite:

- Ver combinaciones `SELECCIONADA` listas para registrar.
- Registrar lo jugado en agencia indicando sorteo objetivo, fecha, importe, comprobante, agencia y observaciones.
- Dejar la jugada en estado `PENDIENTE`.
- Evaluar pendientes cuando el sorteo ya exista en el historico.
- Ver aciertos y numeros acertados.

Flujo:

1. En `Jugadas candidatas`, marcar una combinacion como `SELECCIONADA`.
2. Despues de jugarla en agencia, ir a `Jugadas reales` y usar `Registrar jugada`.
3. Cuando salga el sorteo, actualizar el historico.
4. En `Jugadas reales`, usar `Evaluar pendientes`.

Una jugada pendiente solo se evalua si ya existe en la base el sorteo objetivo con la misma modalidad.
