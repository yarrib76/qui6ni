import { pool, withTransaction } from '../config/database.js';

export async function getRowsForBacktesting(filters) {
  const where = ['m.codigo = ?'];
  const values = [filters.modalidad];

  if (filters.fechaDesde) {
    where.push('s.fecha_sorteo >= ?');
    values.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    where.push('s.fecha_sorteo <= ?');
    values.push(filters.fechaHasta);
  }
  if (filters.sorteoDesde) {
    where.push('s.numero_sorteo >= ?');
    values.push(Number(filters.sorteoDesde));
  }
  if (filters.sorteoHasta) {
    where.push('s.numero_sorteo <= ?');
    values.push(Number(filters.sorteoHasta));
  }

  const [rows] = await pool.query(
    `SELECT
       s.id AS sorteoId,
       s.numero_sorteo AS numeroSorteo,
       s.fecha_sorteo AS fechaSorteo,
       m.codigo AS modalidad,
       j.numero_1 AS numero1,
       j.numero_2 AS numero2,
       j.numero_3 AS numero3,
       j.numero_4 AS numero4,
       j.numero_5 AS numero5,
       j.numero_6 AS numero6
     FROM quini_jugadas j
     INNER JOIN quini_sorteos s ON s.id = j.sorteo_id
     INNER JOIN quini_modalidades m ON m.id = j.modalidad_id
     WHERE ${where.join(' AND ')}
     ORDER BY s.numero_sorteo ASC`,
    values
  );

  if (filters.periodoTipo === 'ULTIMOS_N_SORTEOS') {
    return rows.slice(-Math.min(Math.max(Number(filters.ultimosNSorteos) || 200, 1), 2000));
  }

  return rows;
}

export async function saveBacktestRun(filters, result) {
  return withTransaction(async (connection) => {
    const [runResult] = await connection.query(
      `INSERT INTO quini_backtesting_corridas (
         nombre, modalidad_codigo, estrategia_codigo, periodo_tipo, fecha_desde, fecha_hasta,
         sorteo_desde, sorteo_hasta, ventana_entrenamiento, combinaciones_por_sorteo,
         sorteos_evaluados, jugadas_generadas, promedio_aciertos, mejor_acierto,
         distribucion_aciertos_json, parametros_json, resumen_json
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        filters.nombre || null,
        filters.modalidad,
        filters.estrategia,
        filters.periodoTipo,
        filters.fechaDesde || null,
        filters.fechaHasta || null,
        filters.sorteoDesde || null,
        filters.sorteoHasta || null,
        filters.ventanaEntrenamiento,
        filters.combinacionesPorSorteo,
        result.summary.sorteosEvaluados,
        result.summary.jugadasGeneradas,
        result.summary.promedioAciertos,
        result.summary.mejorAcierto,
        JSON.stringify(result.summary.distribucionAciertos),
        JSON.stringify(filters),
        JSON.stringify(result.summary)
      ]
    );

    const runId = runResult.insertId;
    for (const detail of result.details) {
      await connection.query(
        `INSERT INTO quini_backtesting_detalles (
           corrida_id, sorteo_id, numero_sorteo, fecha_sorteo, combinacion_index,
           numero_1, numero_2, numero_3, numero_4, numero_5, numero_6,
           aciertos, numeros_acertados, numeros_sorteados, score
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          runId,
          detail.sorteoId,
          detail.numeroSorteo,
          detail.fechaSorteo,
          detail.combinacionIndex,
          ...detail.numeros,
          detail.aciertos,
          detail.numerosAcertados.map((number) => String(number).padStart(2, '0')).join('-'),
          detail.numerosSorteados.map((number) => String(number).padStart(2, '0')).join('-'),
          detail.score
        ]
      );
    }

    return runId;
  });
}

export async function listBacktestRuns({ page, pageSize }) {
  const offset = (page - 1) * pageSize;
  const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM quini_backtesting_corridas');
  const [rows] = await pool.query(
    `SELECT
       id, nombre, modalidad_codigo AS modalidad, estrategia_codigo AS estrategia,
       periodo_tipo AS periodoTipo, ventana_entrenamiento AS ventanaEntrenamiento,
       combinaciones_por_sorteo AS combinacionesPorSorteo, sorteos_evaluados AS sorteosEvaluados,
       jugadas_generadas AS jugadasGeneradas, promedio_aciertos AS promedioAciertos,
       mejor_acierto AS mejorAcierto, created_at AS createdAt
     FROM quini_backtesting_corridas
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );
  return { rows, total: countRow.total };
}
