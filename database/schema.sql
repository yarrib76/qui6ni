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
