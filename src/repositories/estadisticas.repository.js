import { pool, withTransaction } from '../config/database.js';

const PERIOD_TYPES = new Set([
  'TODO',
  'ULTIMO_ANIO',
  'ULTIMOS_ANIOS',
  'ULTIMOS_N_SORTEOS',
  'RANGO_FECHAS',
  'RANGO_SORTEOS'
]);

function sanitizePeriodType(value) {
  return PERIOD_TYPES.has(value) ? value : 'TODO';
}

function buildWhere(filters) {
  const where = [];
  const values = [];

  if (filters.modalidad && filters.modalidad !== 'AMBAS') {
    where.push('m.codigo = ?');
    values.push(filters.modalidad);
  }
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

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values
  };
}

export async function getAvailableRange() {
  const [[row]] = await pool.query(
    `SELECT
       MIN(fecha_sorteo) AS fechaDesde,
       MAX(fecha_sorteo) AS fechaHasta,
       MIN(numero_sorteo) AS sorteoDesde,
       MAX(numero_sorteo) AS sorteoHasta
     FROM quini_sorteos`
  );
  return row;
}

export async function getRowsForAnalysis(filters) {
  const normalized = { ...filters, periodoTipo: sanitizePeriodType(filters.periodoTipo) };

  if (normalized.periodoTipo === 'ULTIMO_ANIO') {
    const [[row]] = await pool.query('SELECT DATE_SUB(MAX(fecha_sorteo), INTERVAL 1 YEAR) AS fechaDesde FROM quini_sorteos');
    normalized.fechaDesde = row.fechaDesde;
  }

  if (normalized.periodoTipo === 'ULTIMOS_ANIOS') {
    const years = Math.max(Number(normalized.cantidadAnios) || 2, 1);
    const [[row]] = await pool.query('SELECT DATE_SUB(MAX(fecha_sorteo), INTERVAL ? YEAR) AS fechaDesde FROM quini_sorteos', [years]);
    normalized.fechaDesde = row.fechaDesde;
  }

  const built = buildWhere(normalized);
  const limitLatestDraws =
    normalized.periodoTipo === 'ULTIMOS_N_SORTEOS'
      ? `INNER JOIN (
          SELECT numero_sorteo
          FROM quini_sorteos
          ORDER BY numero_sorteo DESC
          LIMIT ${Math.min(Math.max(Number(normalized.ultimosNSorteos) || 100, 1), 1000)}
        ) ultimos ON ultimos.numero_sorteo = s.numero_sorteo`
      : '';

  const [rows] = await pool.query(
    `SELECT
       s.numero_sorteo AS numeroSorteo,
       s.fecha_sorteo AS fechaSorteo,
       m.codigo AS modalidad,
       m.nombre AS modalidadNombre,
       j.numero_1 AS numero1,
       j.numero_2 AS numero2,
       j.numero_3 AS numero3,
       j.numero_4 AS numero4,
       j.numero_5 AS numero5,
       j.numero_6 AS numero6
     FROM quini_jugadas j
     INNER JOIN quini_sorteos s ON s.id = j.sorteo_id
     INNER JOIN quini_modalidades m ON m.id = j.modalidad_id
     ${limitLatestDraws}
     ${built.clause}
     ORDER BY s.fecha_sorteo ASC, s.numero_sorteo ASC,
       CASE m.codigo WHEN 'TRADICIONAL' THEN 1 WHEN 'SEGUNDA' THEN 2 ELSE 99 END ASC`,
    built.values
  );

  return rows;
}

export async function saveAnalysisSnapshot(filters, stats) {
  return withTransaction(async (connection) => {
    const [analysisResult] = await connection.query(
      `INSERT INTO quini_analisis (
         nombre, tipo_analisis, modalidad_codigo, periodo_tipo, fecha_desde, fecha_hasta,
         sorteo_desde, sorteo_hasta, ultimos_n_sorteos, cantidad_anios, sorteos_analizados,
         jugadas_analizadas, frecuencia_esperada_por_numero, parametros_json, resumen_json
       )
       VALUES (?, 'RESUMEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        filters.nombre || null,
        filters.modalidad || 'AMBAS',
        sanitizePeriodType(filters.periodoTipo),
        filters.fechaDesde || stats.summary.fechaDesde,
        filters.fechaHasta || stats.summary.fechaHasta,
        filters.sorteoDesde || null,
        filters.sorteoHasta || null,
        filters.ultimosNSorteos || null,
        filters.cantidadAnios || null,
        stats.summary.sorteosAnalizados,
        stats.summary.jugadasAnalizadas,
        stats.summary.frecuenciaEsperadaPorNumero,
        JSON.stringify(filters),
        JSON.stringify(stats.summary)
      ]
    );

    const analysisId = analysisResult.insertId;

    for (const metric of stats.frequencies) {
      await connection.query(
        `INSERT INTO quini_analisis_numeros (
           analisis_id, numero, apariciones, frecuencia_observada, frecuencia_esperada,
           diferencia_absoluta, diferencia_porcentual, z_score, ranking_apariciones,
           ultima_aparicion_fecha, ultima_aparicion_sorteo, sorteos_desde_ultima_aparicion
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          analysisId,
          metric.numero,
          metric.apariciones,
          metric.frecuenciaObservada,
          metric.frecuenciaEsperada,
          metric.diferenciaAbsoluta,
          metric.diferenciaPorcentual,
          metric.zScore,
          metric.rankingApariciones,
          metric.ultimaAparicionFecha,
          metric.ultimaAparicionSorteo,
          metric.sorteosDesdeUltimaAparicion
        ]
      );
    }

    for (const row of flattenDistributions(stats.distributions)) {
      await connection.query(
        `INSERT INTO quini_analisis_distribuciones (
           analisis_id, tipo_distribucion, clave, valor_observado, detalle_json
         )
         VALUES (?, ?, ?, ?, ?)`,
        [analysisId, row.tipo, row.clave, row.valor, JSON.stringify(row.detalle || null)]
      );
    }

    for (const combination of [
      ...stats.pairs.map((row) => ({ ...row, tipo: 'PAR' })),
      ...stats.trios.map((row) => ({ ...row, tipo: 'TRIO' }))
    ]) {
      await connection.query(
        `INSERT INTO quini_analisis_combinaciones (
           analisis_id, tipo_combinacion, numeros, apariciones, ranking_apariciones
         )
         VALUES (?, ?, ?, ?, ?)`,
        [
          analysisId,
          combination.tipo,
          combination.numeros,
          combination.apariciones,
          combination.rankingApariciones
        ]
      );
    }

    for (const quality of stats.quality) {
      await connection.query(
        `INSERT INTO quini_analisis_calidad (
           analisis_id, anio, modalidad_codigo, sorteos_detectados, jugadas_detectadas,
           sorteo_minimo, sorteo_maximo, fecha_minima, fecha_maxima, estado
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          analysisId,
          quality.anio,
          filters.modalidad || 'AMBAS',
          quality.sorteosDetectados,
          quality.jugadasDetectadas,
          quality.sorteoMinimo,
          quality.sorteoMaximo,
          quality.fechaMinima,
          quality.fechaMaxima,
          quality.estado
        ]
      );
    }

    return analysisId;
  });
}

export async function listAnalysisSnapshots({ page, pageSize }) {
  const offset = (page - 1) * pageSize;
  const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM quini_analisis');
  const [rows] = await pool.query(
    `SELECT id, nombre, tipo_analisis AS tipoAnalisis, modalidad_codigo AS modalidad,
       periodo_tipo AS periodoTipo, fecha_desde AS fechaDesde, fecha_hasta AS fechaHasta,
       sorteos_analizados AS sorteosAnalizados, jugadas_analizadas AS jugadasAnalizadas,
       created_at AS createdAt
     FROM quini_analisis
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );
  return { rows, total: countRow.total };
}

function flattenDistributions(distributions) {
  return [
    ...distributions.parity.map((row) => ({ tipo: 'PAR_IMPAR', ...row })),
    ...distributions.tens.map((row) => ({ tipo: 'DECENAS', ...row })),
    ...distributions.consecutive.map((row) => ({ tipo: 'CONSECUTIVOS', ...row })),
    ...distributions.repeatedPrevious.map((row) => ({ tipo: 'REPETIDOS_ANTERIOR', ...row })),
    {
      tipo: 'SUMA_TOTAL',
      clave: 'resumen',
      valor: distributions.sums.promedio,
      detalle: distributions.sums
    }
  ];
}
