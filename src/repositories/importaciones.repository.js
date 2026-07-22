import { pool } from '../config/database.js';
import { nowSql } from '../utils/dates.js';

export async function createImportacion() {
  const fechaInicio = nowSql();
  const [result] = await pool.query(
    `INSERT INTO quini_importaciones (fecha_inicio, estado)
     VALUES (?, 'EN_PROCESO')`,
    [fechaInicio]
  );
  return { id: result.insertId, fechaInicio };
}

export async function updateImportacion(id, data) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (!fields.length) return;
  values.push(id);
  await pool.query(`UPDATE quini_importaciones SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function addImportError(importacionId, error) {
  await pool.query(
    `INSERT INTO quini_importacion_errores
      (importacion_id, numero_sorteo, url, tipo_error, descripcion, fragmento_html)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      importacionId,
      error.numeroSorteo || null,
      error.url || null,
      error.tipoError || 'ERROR',
      String(error.descripcion || error.message || 'Error desconocido').slice(0, 4000),
      error.fragmentoHtml ? String(error.fragmentoHtml).slice(0, 50000) : null
    ]
  );
}

export async function markStaleRunningImports(staleMinutes) {
  await pool.query(
    `UPDATE quini_importaciones
     SET estado = 'FALLIDA',
         fecha_fin = COALESCE(fecha_fin, NOW()),
         detalle = CONCAT(COALESCE(detalle, ''), '\nMarcada como fallida al iniciar: importacion EN_PROCESO vencida.')
     WHERE estado = 'EN_PROCESO'
       AND fecha_inicio < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [staleMinutes]
  );
}

export async function getLastImportacion() {
  const [rows] = await pool.query(
    `SELECT *
     FROM quini_importaciones
     ORDER BY id DESC
     LIMIT 1`
  );
  return rows[0] || null;
}

export async function listImportaciones({ page, pageSize }) {
  const offset = (page - 1) * pageSize;
  const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM quini_importaciones');
  const [rows] = await pool.query(
    `SELECT *
     FROM quini_importaciones
     ORDER BY fecha_inicio DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );
  return { rows, total: countRow.total };
}

export async function listErrores(importacionId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM quini_importacion_errores
     WHERE importacion_id = ?
     ORDER BY id`,
    [importacionId]
  );
  return rows;
}
