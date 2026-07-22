export async function getModalidadesByCodigo(connection) {
  const [rows] = await connection.query('SELECT id, codigo, nombre FROM quini_modalidades WHERE activo = 1');
  return Object.fromEntries(rows.map((row) => [row.codigo, row]));
}
