import { pool } from '../config/database.js';

export async function getLastDraw() {
  const [rows] = await pool.query(
    `SELECT id, numero_sorteo AS numeroSorteo, fecha_sorteo AS fechaSorteo
     FROM quini_sorteos
     ORDER BY numero_sorteo DESC
     LIMIT 1`
  );
  return rows[0] || null;
}

export async function upsertSorteo(connection, draw, fechaDescarga) {
  const [result] = await connection.query(
    `INSERT INTO quini_sorteos (numero_sorteo, fecha_sorteo, url_origen, fecha_descarga)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       fecha_sorteo = VALUES(fecha_sorteo),
       url_origen = VALUES(url_origen),
       fecha_descarga = VALUES(fecha_descarga)`,
    [draw.numeroSorteo, draw.fechaSorteo, draw.urlOrigen, fechaDescarga]
  );

  if (result.insertId) return result.insertId;

  const [rows] = await connection.query('SELECT id FROM quini_sorteos WHERE numero_sorteo = ?', [
    draw.numeroSorteo
  ]);
  return rows[0].id;
}

export async function getExistingDrawNumbers() {
  const [rows] = await pool.query('SELECT numero_sorteo AS numeroSorteo FROM quini_sorteos');
  return new Set(rows.map((row) => Number(row.numeroSorteo)));
}
