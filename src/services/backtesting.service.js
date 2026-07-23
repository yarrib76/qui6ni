import { runBacktest } from '../backtesting/backtestingEngine.js';
import {
  getRowsForBacktesting,
  listBacktestRuns,
  saveBacktestRun
} from '../repositories/backtesting.repository.js';

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

export async function ejecutarBacktesting(input) {
  const filters = normalizeBacktestingInput(input);
  const rows = await getRowsForBacktesting(filters);
  const result = runBacktest(rows, filters);
  const baseline =
    filters.compararAleatoria && filters.estrategia !== 'ALEATORIA'
      ? runRandomSimulations(rows, filters, result.summary.promedioAciertos)
      : null;
  const corridaId = filters.guardar ? await saveBacktestRun(filters, result) : null;
  return {
    corridaId,
    filtros: filters,
    summary: result.summary,
    baseline,
    details: result.details.slice(-200).reverse()
  };
}

export async function getBacktestingCorridas(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
  const result = await listBacktestRuns({ page, pageSize });
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

function normalizeBacktestingInput(input = {}) {
  return {
    modalidad: VALID_MODALIDADES.has(input.modalidad) ? input.modalidad : 'TRADICIONAL',
    estrategia: VALID_STRATEGIES.has(input.estrategia) ? input.estrategia : 'BALANCEADA',
    periodoTipo: VALID_PERIODS.has(input.periodoTipo) ? input.periodoTipo : 'ULTIMOS_N_SORTEOS',
    ultimosNSorteos: Math.min(Math.max(Number(input.ultimosNSorteos) || 300, 20), 2000),
    fechaDesde: input.fechaDesde || null,
    fechaHasta: input.fechaHasta || null,
    sorteoDesde: input.sorteoDesde ? Number(input.sorteoDesde) : null,
    sorteoHasta: input.sorteoHasta ? Number(input.sorteoHasta) : null,
    ventanaEntrenamiento: Math.min(Math.max(Number(input.ventanaEntrenamiento) || 100, 10), 1000),
    combinacionesPorSorteo: Math.min(Math.max(Number(input.combinacionesPorSorteo) || 1, 1), 20),
    compararAleatoria: input.compararAleatoria !== false,
    simulacionesAleatorias: Math.min(Math.max(Number(input.simulacionesAleatorias) || 100, 1), 1000),
    guardar: input.guardar !== false,
    nombre: input.nombre ? String(input.nombre).slice(0, 160) : null
  };
}

function runRandomSimulations(rows, filters, strategyAverage) {
  const simulations = [];
  for (let index = 0; index < filters.simulacionesAleatorias; index += 1) {
    const result = runBacktest(rows, { ...filters, estrategia: 'ALEATORIA' });
    simulations.push(result.summary);
  }

  const averages = simulations.map((summary) => summary.promedioAciertos).sort((a, b) => a - b);
  const bests = simulations.map((summary) => summary.mejorAcierto).sort((a, b) => a - b);
  const averageOfAverages = averages.reduce((sum, value) => sum + value, 0) / averages.length;
  const percentile = averages.filter((value) => value <= strategyAverage).length / averages.length;

  return {
    estrategia: 'ALEATORIA',
    simulaciones: simulations.length,
    promedioPromedios: averageOfAverages,
    promedioMinimo: averages[0],
    promedioMaximo: averages[averages.length - 1],
    mejorMinimo: bests[0],
    mejorMaximo: bests[bests.length - 1],
    percentilEstrategia: percentile,
    diferenciaPromedio: strategyAverage - averageOfAverages
  };
}
