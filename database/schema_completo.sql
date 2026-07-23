CREATE DATABASE IF NOT EXISTS quini6
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE quini6;

CREATE TABLE IF NOT EXISTS quini_modalidades (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_quini_modalidad_codigo (codigo)
);

INSERT INTO quini_modalidades (codigo, nombre)
VALUES
    ('TRADICIONAL', 'Primer Sorteo'),
    ('SEGUNDA', 'La Segunda')
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    activo = 1;

CREATE TABLE IF NOT EXISTS quini_sorteos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_sorteo INT UNSIGNED NOT NULL,
    fecha_sorteo DATE NOT NULL,
    url_origen VARCHAR(500) NULL,
    fecha_descarga DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_quini_sorteo_numero (numero_sorteo),
    INDEX idx_quini_sorteo_fecha (fecha_sorteo)
);

CREATE TABLE IF NOT EXISTS quini_jugadas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sorteo_id BIGINT UNSIGNED NOT NULL,
    modalidad_id SMALLINT UNSIGNED NOT NULL,
    numero_1 TINYINT UNSIGNED NOT NULL,
    numero_2 TINYINT UNSIGNED NOT NULL,
    numero_3 TINYINT UNSIGNED NOT NULL,
    numero_4 TINYINT UNSIGNED NOT NULL,
    numero_5 TINYINT UNSIGNED NOT NULL,
    numero_6 TINYINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_quini_jugada_sorteo_modalidad (sorteo_id, modalidad_id),
    INDEX idx_quini_jugada_modalidad (modalidad_id),
    CONSTRAINT fk_quini_jugada_sorteo
        FOREIGN KEY (sorteo_id)
        REFERENCES quini_sorteos(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_quini_jugada_modalidad
        FOREIGN KEY (modalidad_id)
        REFERENCES quini_modalidades(id)
);

CREATE TABLE IF NOT EXISTS quini_importaciones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    estado ENUM('EN_PROCESO', 'EXITOSA', 'ADVERTENCIA', 'FALLIDA') NOT NULL,
    sorteo_inicial INT UNSIGNED NULL,
    sorteo_final INT UNSIGNED NULL,
    sorteos_encontrados INT UNSIGNED NOT NULL DEFAULT 0,
    sorteos_procesados INT UNSIGNED NOT NULL DEFAULT 0,
    sorteos_insertados INT UNSIGNED NOT NULL DEFAULT 0,
    jugadas_insertadas INT UNSIGNED NOT NULL DEFAULT 0,
    registros_omitidos INT UNSIGNED NOT NULL DEFAULT 0,
    cantidad_errores INT UNSIGNED NOT NULL DEFAULT 0,
    detalle TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quini_importacion_estado (estado),
    INDEX idx_quini_importacion_fecha (fecha_inicio)
);

CREATE TABLE IF NOT EXISTS quini_importacion_errores (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    importacion_id BIGINT UNSIGNED NOT NULL,
    numero_sorteo INT UNSIGNED NULL,
    url VARCHAR(500) NULL,
    tipo_error VARCHAR(80) NOT NULL,
    descripcion TEXT NOT NULL,
    fragmento_html MEDIUMTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quini_importacion_error_importacion (importacion_id),
    CONSTRAINT fk_quini_importacion_error_importacion
        FOREIGN KEY (importacion_id)
        REFERENCES quini_importaciones(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quini_analisis (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(160) NULL,
    tipo_analisis ENUM(
        'FRECUENCIA',
        'EVOLUCION',
        'DISTRIBUCION',
        'PARES_TRIOS',
        'CALIDAD_DATOS',
        'RESUMEN'
    ) NOT NULL,
    modalidad_codigo VARCHAR(40) NULL,
    periodo_tipo ENUM(
        'TODO',
        'ULTIMO_ANIO',
        'ULTIMOS_ANIOS',
        'ULTIMOS_N_SORTEOS',
        'RANGO_FECHAS',
        'RANGO_SORTEOS'
    ) NOT NULL,
    fecha_desde DATE NULL,
    fecha_hasta DATE NULL,
    sorteo_desde INT UNSIGNED NULL,
    sorteo_hasta INT UNSIGNED NULL,
    ultimos_n_sorteos INT UNSIGNED NULL,
    cantidad_anios INT UNSIGNED NULL,
    sorteos_analizados INT UNSIGNED NOT NULL DEFAULT 0,
    jugadas_analizadas INT UNSIGNED NOT NULL DEFAULT 0,
    numero_minimo TINYINT UNSIGNED NOT NULL DEFAULT 0,
    numero_maximo TINYINT UNSIGNED NOT NULL DEFAULT 45,
    numeros_por_jugada TINYINT UNSIGNED NOT NULL DEFAULT 6,
    frecuencia_esperada_por_numero DECIMAL(12,4) NULL,
    algoritmo_version VARCHAR(40) NOT NULL DEFAULT 'estadistica-v1',
    parametros_json JSON NULL,
    resumen_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quini_analisis_tipo (tipo_analisis),
    INDEX idx_quini_analisis_modalidad (modalidad_codigo),
    INDEX idx_quini_analisis_periodo (periodo_tipo),
    INDEX idx_quini_analisis_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS quini_analisis_numeros (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    analisis_id BIGINT UNSIGNED NOT NULL,
    numero TINYINT UNSIGNED NOT NULL,
    apariciones INT UNSIGNED NOT NULL DEFAULT 0,
    frecuencia_observada DECIMAL(12,6) NULL,
    frecuencia_esperada DECIMAL(12,6) NULL,
    diferencia_absoluta DECIMAL(12,6) NULL,
    diferencia_porcentual DECIMAL(12,6) NULL,
    z_score DECIMAL(12,6) NULL,
    ranking_apariciones INT UNSIGNED NULL,
    ultima_aparicion_fecha DATE NULL,
    ultima_aparicion_sorteo INT UNSIGNED NULL,
    sorteos_desde_ultima_aparicion INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_quini_analisis_numero (analisis_id, numero),
    INDEX idx_quini_analisis_numeros_numero (numero),
    INDEX idx_quini_analisis_numeros_ranking (analisis_id, ranking_apariciones),
    CONSTRAINT fk_quini_analisis_numeros_analisis
        FOREIGN KEY (analisis_id)
        REFERENCES quini_analisis(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quini_analisis_distribuciones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    analisis_id BIGINT UNSIGNED NOT NULL,
    tipo_distribucion ENUM(
        'PAR_IMPAR',
        'DECENAS',
        'SUMA_TOTAL',
        'CONSECUTIVOS',
        'REPETIDOS_ANTERIOR'
    ) NOT NULL,
    clave VARCHAR(80) NOT NULL,
    valor_observado DECIMAL(12,6) NOT NULL,
    valor_esperado DECIMAL(12,6) NULL,
    diferencia_absoluta DECIMAL(12,6) NULL,
    diferencia_porcentual DECIMAL(12,6) NULL,
    cantidad_jugadas INT UNSIGNED NULL,
    detalle_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_quini_analisis_distribucion (analisis_id, tipo_distribucion, clave),
    INDEX idx_quini_analisis_distribuciones_tipo (tipo_distribucion),
    CONSTRAINT fk_quini_analisis_distribuciones_analisis
        FOREIGN KEY (analisis_id)
        REFERENCES quini_analisis(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quini_analisis_combinaciones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    analisis_id BIGINT UNSIGNED NOT NULL,
    tipo_combinacion ENUM('PAR', 'TRIO') NOT NULL,
    numeros VARCHAR(20) NOT NULL,
    apariciones INT UNSIGNED NOT NULL DEFAULT 0,
    frecuencia_observada DECIMAL(12,6) NULL,
    frecuencia_esperada DECIMAL(12,6) NULL,
    diferencia_absoluta DECIMAL(12,6) NULL,
    z_score DECIMAL(12,6) NULL,
    ranking_apariciones INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_quini_analisis_combinacion (analisis_id, tipo_combinacion, numeros),
    INDEX idx_quini_analisis_combinaciones_tipo (tipo_combinacion),
    INDEX idx_quini_analisis_combinaciones_ranking (analisis_id, ranking_apariciones),
    CONSTRAINT fk_quini_analisis_combinaciones_analisis
        FOREIGN KEY (analisis_id)
        REFERENCES quini_analisis(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quini_analisis_calidad (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    analisis_id BIGINT UNSIGNED NOT NULL,
    anio SMALLINT UNSIGNED NULL,
    modalidad_codigo VARCHAR(40) NULL,
    sorteos_detectados INT UNSIGNED NOT NULL DEFAULT 0,
    jugadas_detectadas INT UNSIGNED NOT NULL DEFAULT 0,
    sorteo_minimo INT UNSIGNED NULL,
    sorteo_maximo INT UNSIGNED NULL,
    fecha_minima DATE NULL,
    fecha_maxima DATE NULL,
    estado ENUM('COMPLETO', 'PARCIAL', 'SIN_DATOS', 'REVISAR') NOT NULL,
    observaciones TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quini_analisis_calidad_anio (anio),
    INDEX idx_quini_analisis_calidad_estado (estado),
    CONSTRAINT fk_quini_analisis_calidad_analisis
        FOREIGN KEY (analisis_id)
        REFERENCES quini_analisis(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quini_estrategias (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(60) NOT NULL,
    nombre VARCHAR(140) NOT NULL,
    descripcion TEXT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_quini_estrategia_codigo (codigo)
);

INSERT INTO quini_estrategias (codigo, nombre, descripcion)
VALUES
    ('ALEATORIA', 'Aleatoria pura', 'Selecciona seis numeros al azar sin ponderacion estadistica.'),
    ('MAS_FRECUENTES', 'Mas frecuentes', 'Selecciona numeros con mayor cantidad de apariciones en el periodo.'),
    ('MENOS_FRECUENTES', 'Menos frecuentes', 'Selecciona numeros con menor cantidad de apariciones en el periodo.'),
    ('MAYOR_ZSCORE', 'Mayor z-score', 'Selecciona numeros con mayor desvio positivo frente a la frecuencia esperada.'),
    ('MAS_ATRASADOS', 'Mas atrasados', 'Selecciona numeros con mayor cantidad de sorteos desde su ultima aparicion.'),
    ('BALANCEADA', 'Balanceada', 'Combina frecuencia, atraso, paridad y distribucion por decenas.'),
    ('PONDERADA_FRECUENCIA', 'Ponderada por frecuencia', 'Sortea numeros usando pesos derivados de frecuencia observada y z-score.')
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    descripcion = VALUES(descripcion),
    activo = 1;

CREATE TABLE IF NOT EXISTS quini_combinaciones_generadas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    estado ENUM('SIMULADA', 'CANDIDATA', 'SELECCIONADA', 'CONFIRMADA_COMO_REAL', 'ANULADA') NOT NULL DEFAULT 'SIMULADA',
    modalidad_codigo VARCHAR(40) NOT NULL,
    estrategia_codigo VARCHAR(60) NOT NULL,
    periodo_tipo ENUM(
        'TODO',
        'ULTIMO_ANIO',
        'ULTIMOS_ANIOS',
        'ULTIMOS_N_SORTEOS',
        'RANGO_FECHAS',
        'RANGO_SORTEOS'
    ) NOT NULL,
    fecha_desde DATE NULL,
    fecha_hasta DATE NULL,
    sorteo_desde INT UNSIGNED NULL,
    sorteo_hasta INT UNSIGNED NULL,
    ultimos_n_sorteos INT UNSIGNED NULL,
    cantidad_anios INT UNSIGNED NULL,
    numero_1 TINYINT UNSIGNED NOT NULL,
    numero_2 TINYINT UNSIGNED NOT NULL,
    numero_3 TINYINT UNSIGNED NOT NULL,
    numero_4 TINYINT UNSIGNED NOT NULL,
    numero_5 TINYINT UNSIGNED NOT NULL,
    numero_6 TINYINT UNSIGNED NOT NULL,
    score DECIMAL(12,6) NULL,
    explicacion TEXT NULL,
    observaciones TEXT NULL,
    parametros_json JSON NULL,
    metricas_json JSON NULL,
    analisis_id BIGINT UNSIGNED NULL,
    modelo_codigo VARCHAR(80) NULL,
    modelo_version VARCHAR(40) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_quini_combinaciones_estado (estado),
    INDEX idx_quini_combinaciones_modalidad (modalidad_codigo),
    INDEX idx_quini_combinaciones_estrategia (estrategia_codigo),
    INDEX idx_quini_combinaciones_created_at (created_at),
    CONSTRAINT fk_quini_combinaciones_analisis
        FOREIGN KEY (analisis_id)
        REFERENCES quini_analisis(id)
        ON DELETE SET NULL
);

ALTER TABLE quini_combinaciones_generadas
    MODIFY estado ENUM(
        'SIMULADA',
        'CANDIDATA',
        'SELECCIONADA',
        'CONFIRMADA_COMO_REAL',
        'ANULADA'
    ) NOT NULL DEFAULT 'SIMULADA';

SET @observaciones_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'quini_combinaciones_generadas'
      AND COLUMN_NAME = 'observaciones'
);

SET @add_observaciones_sql := IF(
    @observaciones_exists = 0,
    'ALTER TABLE quini_combinaciones_generadas ADD COLUMN observaciones TEXT NULL AFTER explicacion',
    'SELECT ''Column observaciones already exists'' AS message'
);

PREPARE add_observaciones_stmt FROM @add_observaciones_sql;
EXECUTE add_observaciones_stmt;
DEALLOCATE PREPARE add_observaciones_stmt;

CREATE TABLE IF NOT EXISTS quini_backtesting_corridas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(160) NULL,
    modalidad_codigo VARCHAR(40) NOT NULL,
    estrategia_codigo VARCHAR(60) NOT NULL,
    periodo_tipo ENUM(
        'TODO',
        'ULTIMO_ANIO',
        'ULTIMOS_ANIOS',
        'ULTIMOS_N_SORTEOS',
        'RANGO_FECHAS',
        'RANGO_SORTEOS'
    ) NOT NULL,
    fecha_desde DATE NULL,
    fecha_hasta DATE NULL,
    sorteo_desde INT UNSIGNED NULL,
    sorteo_hasta INT UNSIGNED NULL,
    ventana_entrenamiento INT UNSIGNED NOT NULL,
    combinaciones_por_sorteo INT UNSIGNED NOT NULL DEFAULT 1,
    sorteos_evaluados INT UNSIGNED NOT NULL DEFAULT 0,
    jugadas_generadas INT UNSIGNED NOT NULL DEFAULT 0,
    promedio_aciertos DECIMAL(12,6) NULL,
    mejor_acierto TINYINT UNSIGNED NULL,
    distribucion_aciertos_json JSON NULL,
    parametros_json JSON NULL,
    resumen_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quini_backtesting_modalidad (modalidad_codigo),
    INDEX idx_quini_backtesting_estrategia (estrategia_codigo),
    INDEX idx_quini_backtesting_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS quini_backtesting_detalles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    corrida_id BIGINT UNSIGNED NOT NULL,
    sorteo_id BIGINT UNSIGNED NOT NULL,
    numero_sorteo INT UNSIGNED NOT NULL,
    fecha_sorteo DATE NOT NULL,
    combinacion_index INT UNSIGNED NOT NULL,
    numero_1 TINYINT UNSIGNED NOT NULL,
    numero_2 TINYINT UNSIGNED NOT NULL,
    numero_3 TINYINT UNSIGNED NOT NULL,
    numero_4 TINYINT UNSIGNED NOT NULL,
    numero_5 TINYINT UNSIGNED NOT NULL,
    numero_6 TINYINT UNSIGNED NOT NULL,
    aciertos TINYINT UNSIGNED NOT NULL,
    numeros_acertados VARCHAR(40) NULL,
    numeros_sorteados VARCHAR(40) NOT NULL,
    score DECIMAL(12,6) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quini_backtesting_detalle_corrida (corrida_id),
    INDEX idx_quini_backtesting_detalle_sorteo (numero_sorteo),
    INDEX idx_quini_backtesting_detalle_aciertos (aciertos),
    CONSTRAINT fk_quini_backtesting_detalle_corrida
        FOREIGN KEY (corrida_id)
        REFERENCES quini_backtesting_corridas(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_quini_backtesting_detalle_sorteo
        FOREIGN KEY (sorteo_id)
        REFERENCES quini_sorteos(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quini_jugadas_reales (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    combinacion_id BIGINT UNSIGNED NULL,
    estado ENUM('PENDIENTE', 'EVALUADA', 'ANULADA') NOT NULL DEFAULT 'PENDIENTE',
    modalidad_codigo VARCHAR(40) NOT NULL,
    estrategia_codigo VARCHAR(60) NULL,
    sorteo_objetivo INT UNSIGNED NOT NULL,
    fecha_jugada DATE NOT NULL,
    importe DECIMAL(12,2) NULL,
    comprobante VARCHAR(160) NULL,
    agencia VARCHAR(160) NULL,
    numero_1 TINYINT UNSIGNED NOT NULL,
    numero_2 TINYINT UNSIGNED NOT NULL,
    numero_3 TINYINT UNSIGNED NOT NULL,
    numero_4 TINYINT UNSIGNED NOT NULL,
    numero_5 TINYINT UNSIGNED NOT NULL,
    numero_6 TINYINT UNSIGNED NOT NULL,
    resultado_sorteo_id BIGINT UNSIGNED NULL,
    aciertos TINYINT UNSIGNED NULL,
    numeros_acertados_json JSON NULL,
    evaluada_at DATETIME NULL,
    observaciones TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_quini_jugadas_reales_estado (estado),
    INDEX idx_quini_jugadas_reales_sorteo (sorteo_objetivo),
    INDEX idx_quini_jugadas_reales_modalidad (modalidad_codigo),
    INDEX idx_quini_jugadas_reales_fecha (fecha_jugada),
    CONSTRAINT fk_quini_jugadas_reales_combinacion
        FOREIGN KEY (combinacion_id)
        REFERENCES quini_combinaciones_generadas(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_quini_jugadas_reales_resultado_sorteo
        FOREIGN KEY (resultado_sorteo_id)
        REFERENCES quini_sorteos(id)
        ON DELETE SET NULL
);
