USE quini6;

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
