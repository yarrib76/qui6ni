USE quini6;

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
