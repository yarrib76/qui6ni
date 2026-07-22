import { queryHistorico, getResumenCounts } from '../repositories/historico.repository.js';
import { getLastImportacion } from '../repositories/importaciones.repository.js';

export async function getHistorico(filters) {
  return queryHistorico(filters);
}

export async function getResumen() {
  const [counts, ultimaImportacion] = await Promise.all([getResumenCounts(), getLastImportacion()]);
  return {
    ...counts,
    ultimaImportacion,
    estadoUltimaActualizacion: ultimaImportacion?.estado || null
  };
}
