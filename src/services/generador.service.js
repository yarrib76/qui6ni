import { getRowsForAnalysis } from '../repositories/estadisticas.repository.js';
import {
  listGeneratedCombinations,
  saveGeneratedCombinations,
  updateGeneratedCombinationState
} from '../repositories/generador.repository.js';
import { generateCombinations, STRATEGIES } from '../generator/generationEngine.js';
import { normalizeStatisticsFilters } from './estadisticas.service.js';

const VALID_STATES = new Set(['SIMULADA', 'CANDIDATA']);
const VALID_MANAGEMENT_STATES = new Set(['SIMULADA', 'CANDIDATA', 'SELECCIONADA', 'ANULADA']);

export async function generarCombinaciones(input) {
  const filters = normalizeGeneratorInput(input);
  const rows = await getRowsForAnalysis(filters);
  const combinations = generateCombinations(rows, filters);
  const ids = filters.guardar ? await saveGeneratedCombinations(filters, combinations) : [];

  return {
    ids,
    filtros: filters,
    historicoUsado: {
      jugadas: rows.length,
      sorteos: new Set(rows.map((row) => Number(row.numeroSorteo))).size
    },
    combinaciones: combinations.map((combination, index) => ({
      id: ids[index] || null,
      ...combination
    }))
  };
}

export async function getCombinacionesGeneradas(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
  const result = await listGeneratedCombinations({
    page,
    pageSize,
    estado: query.estado || null,
    modalidad: query.modalidad || null,
    estrategia: query.estrategia || null
  });
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

export async function cambiarEstadoCombinacion(id, input = {}) {
  const estado = VALID_MANAGEMENT_STATES.has(input.estado) ? input.estado : null;
  if (!estado) {
    const error = new Error('Estado invalido.');
    error.statusCode = 400;
    throw error;
  }
  const affected = await updateGeneratedCombinationState(id, {
    estado,
    observaciones: input.observaciones ? String(input.observaciones).slice(0, 4000) : null
  });
  if (!affected) {
    const error = new Error('Combinacion no encontrada.');
    error.statusCode = 404;
    throw error;
  }
  return { id: Number(id), estado };
}

function normalizeGeneratorInput(input = {}) {
  const filters = normalizeStatisticsFilters(input);
  return {
    ...filters,
    estrategia: STRATEGIES[input.estrategia] || STRATEGIES.ALEATORIA,
    cantidad: Math.min(Math.max(Number(input.cantidad) || 1, 1), 20),
    estado: VALID_STATES.has(input.estado) ? input.estado : 'SIMULADA',
    guardar: input.guardar !== false
  };
}
