USE quini6;

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
