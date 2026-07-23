USE quini6;

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
