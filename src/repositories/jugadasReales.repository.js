import { pool, withTransaction } from '../config/database.js';

export async function getGeneratedCombinationById(id) {
  const [[row]] = await pool.query(
    `SELECT
       id, estado, modalidad_codigo AS modalidad, estrategia_codigo AS estrategia,
       numero_1 AS numero1, numero_2 AS numero2, numero_3 AS numero3,
       numero_4 AS numero4, numero_5 AS numero5, numero_6 AS numero6
     FROM quini_combinaciones_generadas
     WHERE id = ?`,
    [id]
  );
  return row || null;
}

export async function createRealPlayFromCombination(combination, input) {
  return withTransaction(async (connection) => {
    const [result] = await connection.query(
      `INSERT INTO quini_jugadas_reales (
         combinacion_id, estado, modalidad_codigo, estrategia_codigo, sorteo_objetivo,
         fecha_jugada, importe, comprobante, agencia,
         numero_1, numero_2, numero_3, numero_4, numero_5, numero_6, observaciones
       )
       VALUES (?, 'PENDIENTE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        combination.id,
        combination.modalidad,
        combination.estrategia,
        input.sorteoObjetivo,
        input.fechaJugada,
        input.importe,
        input.comprobante,
        input.agencia,
        combination.numero1,
        combination.numero2,
        combination.numero3,
        combination.numero4,
        combination.numero5,
        combination.numero6,
        input.observaciones
      ]
    );

    await connection.query(
      `UPDATE quini_combinaciones_generadas
       SET estado = 'CONFIRMADA_COMO_REAL'
       WHERE id = ?`,
      [combination.id]
    );

    return result.insertId;
  });
}

export async function listRealPlays({ page, pageSize, estado, modalidad }) {
  const offset = (page - 1) * pageSize;
  const filters = [];
  const values = [];

  if (estado) {
    filters.push('jr.estado = ?');
    values.push(estado);
  }
  if (modalidad) {
    filters.push('jr.modalidad_codigo = ?');
    values.push(modalidad);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM quini_jugadas_reales jr ${where}`,
    values
  );
  const [rows] = await pool.query(
    `SELECT
       jr.id, jr.combinacion_id AS combinacionId, jr.estado,
       jr.modalidad_codigo AS modalidad, jr.estrategia_codigo AS estrategia,
       jr.sorteo_objetivo AS sorteoObjetivo, jr.fecha_jugada AS fechaJugada,
       jr.importe, jr.comprobante, jr.agencia,
       jr.numero_1 AS numero1, jr.numero_2 AS numero2, jr.numero_3 AS numero3,
       jr.numero_4 AS numero4, jr.numero_5 AS numero5, jr.numero_6 AS numero6,
       jr.aciertos, jr.numeros_acertados_json AS numerosAcertados,
       jr.evaluada_at AS evaluadaAt, jr.observaciones, jr.created_at AS createdAt
     FROM quini_jugadas_reales jr
     ${where}
     ORDER BY jr.id DESC
     LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  return { rows, total: countRow.total };
}

export async function getPendingRealPlays() {
  const [rows] = await pool.query(
    `SELECT
       id, modalidad_codigo AS modalidad, sorteo_objetivo AS sorteoObjetivo,
       numero_1 AS numero1, numero_2 AS numero2, numero_3 AS numero3,
       numero_4 AS numero4, numero_5 AS numero5, numero_6 AS numero6
     FROM quini_jugadas_reales
     WHERE estado = 'PENDIENTE'
     ORDER BY id ASC`
  );
  return rows;
}

export async function getResultForPlay(play) {
  const [[row]] = await pool.query(
    `SELECT
       s.id AS sorteoId,
       j.numero_1 AS numero1, j.numero_2 AS numero2, j.numero_3 AS numero3,
       j.numero_4 AS numero4, j.numero_5 AS numero5, j.numero_6 AS numero6
     FROM quini_sorteos s
     INNER JOIN quini_jugadas j ON j.sorteo_id = s.id
     INNER JOIN quini_modalidades m ON m.id = j.modalidad_id
     WHERE s.numero_sorteo = ?
       AND m.codigo = ?
     LIMIT 1`,
    [play.sorteoObjetivo, play.modalidad]
  );
  return row || null;
}

export async function markRealPlayEvaluated(id, result) {
  const [updateResult] = await pool.query(
    `UPDATE quini_jugadas_reales
     SET estado = 'EVALUADA',
         resultado_sorteo_id = ?,
         aciertos = ?,
         numeros_acertados_json = ?,
         evaluada_at = NOW()
     WHERE id = ?`,
    [result.sorteoId, result.aciertos, JSON.stringify(result.numerosAcertados), id]
  );
  return updateResult.affectedRows;
}
