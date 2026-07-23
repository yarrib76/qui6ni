import {
  createRealPlayFromCombination,
  getGeneratedCombinationById,
  getPendingRealPlays,
  getResultForPlay,
  listRealPlays,
  markRealPlayEvaluated
} from '../repositories/jugadasReales.repository.js';

const VALID_STATES = new Set(['PENDIENTE', 'EVALUADA', 'ANULADA']);
const VALID_MODALITIES = new Set(['TRADICIONAL', 'SEGUNDA']);

export async function registrarJugadaRealDesdeCombinacion(combinacionId, input = {}) {
  const combination = await getGeneratedCombinationById(combinacionId);
  if (!combination) {
    throwHttpError('Combinacion no encontrada.', 404);
  }
  if (combination.estado !== 'SELECCIONADA') {
    throwHttpError('Solo se pueden registrar como reales las combinaciones seleccionadas.', 400);
  }
  if (!VALID_MODALITIES.has(combination.modalidad)) {
    throwHttpError('La jugada real debe corresponder a Primer Sorteo o La Segunda.', 400);
  }

  const normalized = normalizeRealPlayInput(input);
  const id = await createRealPlayFromCombination(combination, normalized);
  return { id, estado: 'PENDIENTE' };
}

export async function getJugadasReales(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 50, 1), 100);
  const estado = VALID_STATES.has(query.estado) ? query.estado : null;
  const modalidad = VALID_MODALITIES.has(query.modalidad) ? query.modalidad : null;
  const result = await listRealPlays({ page, pageSize, estado, modalidad });
  return {
    data: result.rows.map(normalizeRealPlayRow),
    pagination: {
      page,
      pageSize,
      totalRecords: result.total,
      totalPages: Math.ceil(result.total / pageSize)
    }
  };
}

export async function evaluarJugadasPendientes() {
  const pending = await getPendingRealPlays();
  const summary = {
    pendientes: pending.length,
    evaluadas: 0,
    sinResultado: 0
  };

  for (const play of pending) {
    const result = await getResultForPlay(play);
    if (!result) {
      summary.sinResultado += 1;
      continue;
    }

    const played = [
      play.numero1,
      play.numero2,
      play.numero3,
      play.numero4,
      play.numero5,
      play.numero6
    ].map(Number);
    const actual = new Set([
      result.numero1,
      result.numero2,
      result.numero3,
      result.numero4,
      result.numero5,
      result.numero6
    ].map(Number));
    const numerosAcertados = played.filter((number) => actual.has(number));

    await markRealPlayEvaluated(play.id, {
      sorteoId: result.sorteoId,
      aciertos: numerosAcertados.length,
      numerosAcertados
    });
    summary.evaluadas += 1;
  }

  return summary;
}

function normalizeRealPlayInput(input) {
  const sorteoObjetivo = Number(input.sorteoObjetivo);
  if (!Number.isInteger(sorteoObjetivo) || sorteoObjetivo <= 0) {
    throwHttpError('Sorteo objetivo invalido.', 400);
  }

  const fechaJugada = input.fechaJugada || new Date().toISOString().slice(0, 10);
  const importe = input.importe === null || input.importe === undefined || input.importe === ''
    ? null
    : Number(input.importe);
  if (importe !== null && (!Number.isFinite(importe) || importe < 0)) {
    throwHttpError('Importe invalido.', 400);
  }

  return {
    sorteoObjetivo,
    fechaJugada,
    importe,
    comprobante: cleanText(input.comprobante, 160),
    agencia: cleanText(input.agencia, 160),
    observaciones: cleanText(input.observaciones, 4000)
  };
}

function normalizeRealPlayRow(row) {
  return {
    ...row,
    numerosAcertados: parseJsonArray(row.numerosAcertados)
  };
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanText(value, maxLength) {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim().slice(0, maxLength) || null;
}

function throwHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}
