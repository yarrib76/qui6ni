export async function insertJugada(connection, sorteoId, modalidadId, numbers) {
  const [result] = await connection.query(
    `INSERT INTO quini_jugadas (
       sorteo_id, modalidad_id, numero_1, numero_2, numero_3, numero_4, numero_5, numero_6
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       numero_1 = VALUES(numero_1),
       numero_2 = VALUES(numero_2),
       numero_3 = VALUES(numero_3),
       numero_4 = VALUES(numero_4),
       numero_5 = VALUES(numero_5),
       numero_6 = VALUES(numero_6)`,
    [sorteoId, modalidadId, ...numbers]
  );
  return result.affectedRows === 1 ? 1 : 0;
}
