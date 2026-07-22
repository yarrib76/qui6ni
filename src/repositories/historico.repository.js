import { pool } from '../config/database.js';

const ORDER_COLUMNS = {
  year: 'YEAR(s.fecha_sorteo)',
  month: 'MONTH(s.fecha_sorteo)',
  fecha: 's.fecha_sorteo',
  numeroSorteo: 's.numero_sorteo',
  modalidad: 'm.codigo',
  fechaDescarga: 's.fecha_descarga'
};

function buildFilters(filters) {
  const where = [];
  const values = [];

  if (filters.year) {
    where.push('YEAR(s.fecha_sorteo) = ?');
    values.push(Number(filters.year));
  }
  if (filters.month) {
    where.push('MONTH(s.fecha_sorteo) = ?');
    values.push(Number(filters.month));
  }
  if (filters.modalidad) {
    where.push('m.codigo = ?');
    values.push(filters.modalidad);
  }
  if (filters.numeroSorteo) {
    where.push('s.numero_sorteo = ?');
    values.push(Number(filters.numeroSorteo));
  }
  if (filters.fechaDesde) {
    where.push('s.fecha_sorteo >= ?');
    values.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    where.push('s.fecha_sorteo <= ?');
    values.push(filters.fechaHasta);
  }
  if (filters.search) {
    where.push('(s.numero_sorteo LIKE ? OR m.nombre LIKE ? OR m.codigo LIKE ?)');
    const pattern = `%${filters.search}%`;
    values.push(pattern, pattern, pattern);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values
  };
}

export async function queryHistorico(filters) {
  const page = Math.max(Number(filters.page) || 1, 1);
  const maxPageSize = filters.all === '1' || filters.all === 'true' ? 5000 : 100;
  const pageSize = Math.min(Math.max(Number(filters.pageSize) || 25, 1), maxPageSize);
  const offset = (page - 1) * pageSize;
  const orderBy = ORDER_COLUMNS[filters.orderBy] || 's.fecha_sorteo';
  const orderDirection = String(filters.orderDirection).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const built = buildFilters(filters);

  const from = `FROM quini_jugadas j
    INNER JOIN quini_sorteos s ON s.id = j.sorteo_id
    INNER JOIN quini_modalidades m ON m.id = j.modalidad_id
    ${built.clause}`;

  const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total ${from}`, built.values);
  const [rows] = await pool.query(
    `SELECT
       YEAR(s.fecha_sorteo) AS anio,
       MONTH(s.fecha_sorteo) AS mes,
       s.fecha_sorteo AS fechaSorteo,
       s.numero_sorteo AS numeroSorteo,
       m.codigo AS modalidad,
       m.nombre AS modalidadNombre,
       j.numero_1 AS numero1,
       j.numero_2 AS numero2,
       j.numero_3 AS numero3,
       j.numero_4 AS numero4,
       j.numero_5 AS numero5,
       j.numero_6 AS numero6,
       s.url_origen AS urlOrigen,
       s.fecha_descarga AS fechaDescarga
     ${from}
     ORDER BY ${orderBy} ${orderDirection},
       s.numero_sorteo ${orderDirection},
       CASE m.codigo
         WHEN 'TRADICIONAL' THEN 1
         WHEN 'SEGUNDA' THEN 2
         ELSE 99
       END ASC
     LIMIT ? OFFSET ?`,
    [...built.values, pageSize, offset]
  );

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      totalRecords: countRow.total,
      totalPages: Math.ceil(countRow.total / pageSize)
    }
  };
}

export async function getResumenCounts() {
  const [[lastDraw]] = await pool.query(
    `SELECT numero_sorteo AS numeroSorteo, fecha_sorteo AS fechaSorteo
     FROM quini_sorteos
     ORDER BY numero_sorteo DESC
     LIMIT 1`
  );
  const [[sorteos]] = await pool.query('SELECT COUNT(*) AS total FROM quini_sorteos');
  const [[jugadas]] = await pool.query('SELECT COUNT(*) AS total FROM quini_jugadas');
  return {
    ultimoSorteo: lastDraw || null,
    totalSorteos: sorteos.total,
    totalJugadas: jugadas.total
  };
}
