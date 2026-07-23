import {
  getAvailableRange,
  getRowsForAnalysis,
  listAnalysisSnapshots,
  saveAnalysisSnapshot
} from '../repositories/estadisticas.repository.js';
import { buildStatistics } from '../statistics/statisticsEngine.js';

const VALID_MODALIDADES = new Set(['AMBAS', 'TRADICIONAL', 'SEGUNDA']);
const VALID_PERIODS = new Set([
  'TODO',
  'ULTIMO_ANIO',
  'ULTIMOS_ANIOS',
  'ULTIMOS_N_SORTEOS',
  'RANGO_FECHAS',
  'RANGO_SORTEOS'
]);

export async function getRangoDisponible() {
  return getAvailableRange();
}

export async function analizarEstadisticas(input) {
  const filters = normalizeStatisticsFilters(input);
  const rows = await getRowsForAnalysis(filters);
  const stats = buildStatistics(rows);
  let analisisId = null;

  if (filters.guardar) {
    analisisId = await saveAnalysisSnapshot(filters, stats);
  }

  return {
    analisisId,
    filtros: filters,
    ...stats
  };
}

export async function getAnalisisGuardados(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
  const result = await listAnalysisSnapshots({ page, pageSize });
  return {
    data: result.rows,
    pagination: {
      page,
      pageSize,
      totalRecords: result.total,
      totalPages: Math.ceil(result.total / pageSize)
    }
  };
}

export function normalizeStatisticsFilters(input = {}) {
  const modalidad = VALID_MODALIDADES.has(input.modalidad) ? input.modalidad : 'TRADICIONAL';
  const periodoTipo = VALID_PERIODS.has(input.periodoTipo) ? input.periodoTipo : 'TODO';
  return {
    modalidad,
    periodoTipo,
    fechaDesde: input.fechaDesde || null,
    fechaHasta: input.fechaHasta || null,
    sorteoDesde: input.sorteoDesde ? Number(input.sorteoDesde) : null,
    sorteoHasta: input.sorteoHasta ? Number(input.sorteoHasta) : null,
    ultimosNSorteos: input.ultimosNSorteos ? Math.min(Math.max(Number(input.ultimosNSorteos), 1), 1000) : null,
    cantidadAnios: input.cantidadAnios ? Math.min(Math.max(Number(input.cantidadAnios), 1), 20) : null,
    guardar: Boolean(input.guardar),
    nombre: input.nombre ? String(input.nombre).slice(0, 160) : null
  };
}
