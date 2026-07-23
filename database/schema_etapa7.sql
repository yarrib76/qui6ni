USE quini6;

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
