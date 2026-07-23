import { compareStrategies } from '../comparison/strategyComparisonEngine.js';
import { getRowsForBacktesting } from '../repositories/backtesting.repository.js';

const VALID_MODALIDADES = new Set(['TRADICIONAL', 'SEGUNDA']);
const VALID_PERIODS = new Set(['TODO', 'ULTIMOS_N_SORTEOS', 'RANGO_FECHAS', 'RANGO_SORTEOS']);
const VALID_STRATEGIES = new Set([
  'ALEATORIA',
  'MAS_FRECUENTES',
  'MENOS_FRECUENTES',
  'MAYOR_ZSCORE',
  'MAS_ATRASADOS',
  'BALANCEADA',
  'PONDERADA_FRECUENCIA'
]);

export async function compararEstrategias(input) {
  const filters = normalizeComparisonInput(input);
  const rows = await getRowsForBacktesting(filters);
  return {
    filtros: filters,
    ...compareStrategies(rows, filters)
  };
}

function normalizeComparisonInput(input = {}) {
  const estrategias = Array.isArray(input.estrategias)
    ? input.estrategias.filter((strategy) => VALID_STRATEGIES.has(strategy))
    : [];
  return {
    modalidad: VALID_MODALIDADES.has(input.modalidad) ? input.modalidad : 'TRADICIONAL',
    periodoTipo: VALID_PERIODS.has(input.periodoTipo) ? input.periodoTipo : 'ULTIMOS_N_SORTEOS',
    ultimosNSorteos: Math.min(Math.max(Number(input.ultimosNSorteos) || 300, 20), 2000),
    fechaDesde: input.fechaDesde || null,
    fechaHasta: input.fechaHasta || null,
    sorteoDesde: input.sorteoDesde ? Number(input.sorteoDesde) : null,
    sorteoHasta: input.sorteoHasta ? Number(input.sorteoHasta) : null,
    ventanaEntrenamiento: Math.min(Math.max(Number(input.ventanaEntrenamiento) || 100, 10), 1000),
    combinacionesPorSorteo: Math.min(Math.max(Number(input.combinacionesPorSorteo) || 1, 1), 20),
    simulacionesAleatorias: Math.min(Math.max(Number(input.simulacionesAleatorias) || 100, 1), 1000),
    estrategias
  };
}
