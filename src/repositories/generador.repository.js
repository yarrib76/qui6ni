import { pool, withTransaction } from '../config/database.js';

export async function saveGeneratedCombinations(filters, combinations) {
  return withTransaction(async (connection) => {
    const ids = [];
    for (const combination of combinations) {
      const [result] = await connection.query(
        `INSERT INTO quini_combinaciones_generadas (
           estado, modalidad_codigo, estrategia_codigo, periodo_tipo, fecha_desde, fecha_hasta,
           sorteo_desde, sorteo_hasta, ultimos_n_sorteos, cantidad_anios,
           numero_1, numero_2, numero_3, numero_4, numero_5, numero_6,
           score, explicacion, parametros_json, metricas_json, analisis_id
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          combination.estado || 'SIMULADA',
          filters.modalidad,
          combination.estrategia,
          filters.periodoTipo,
          filters.fechaDesde || null,
          filters.fechaHasta || null,
          filters.sorteoDesde || null,
          filters.sorteoHasta || null,
          filters.ultimosNSorteos || null,
          filters.cantidadAnios || null,
          ...combination.numeros,
          combination.score || null,
          combination.explicacion,
          JSON.stringify(filters),
          JSON.stringify(combination.metricas || []),
          filters.analisisId || null
        ]
      );
      ids.push(result.insertId);
    }
    return ids;
  });
}

export async function listGeneratedCombinations({ page, pageSize, estado, modalidad, estrategia }) {
  const offset = (page - 1) * pageSize;
  const filters = [];
  const values = [];
  if (estado) {
    filters.push('estado = ?');
    values.push(estado);
  }
  if (modalidad) {
    filters.push('modalidad_codigo = ?');
    values.push(modalidad);
  }
  if (estrategia) {
    filters.push('estrategia_codigo = ?');
    values.push(estrategia);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM quini_combinaciones_generadas ${where}`,
    values
  );
  const [rows] = await pool.query(
    `SELECT
       id, estado, modalidad_codigo AS modalidad, estrategia_codigo AS estrategia,
       periodo_tipo AS periodoTipo, numero_1 AS numero1, numero_2 AS numero2,
       numero_3 AS numero3, numero_4 AS numero4, numero_5 AS numero5,
       numero_6 AS numero6, score, explicacion, observaciones, created_at AS createdAt
     FROM quini_combinaciones_generadas
     ${where}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  return { rows, total: countRow.total };
}

export async function updateGeneratedCombinationState(id, { estado, observaciones }) {
  const [result] = await pool.query(
    `UPDATE quini_combinaciones_generadas
     SET estado = ?, observaciones = ?
     WHERE id = ?`,
    [estado, observaciones || null, id]
  );
  return result.affectedRows;
}
