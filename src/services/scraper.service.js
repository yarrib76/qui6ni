import { env } from '../config/env.js';
import { withTransaction } from '../config/database.js';
import { discoverHistoricalLinks } from '../scraper/discover.js';
import { downloadHtml, sleep } from '../scraper/downloader.js';
import { parseDrawHtml } from '../scraper/parser.js';
import { MODALIDADES } from '../scraper/normalizer.js';
import { getModalidadesByCodigo } from '../repositories/modalidades.repository.js';
import { insertJugada } from '../repositories/jugadas.repository.js';
import { getExistingDrawNumbers, upsertSorteo } from '../repositories/sorteos.repository.js';
import {
  addImportError,
  createImportacion,
  markStaleRunningImports,
  updateImportacion
} from '../repositories/importaciones.repository.js';
import { formatDurationMs, nowSql } from '../utils/dates.js';
import { logger } from '../utils/logger.js';

let running = false;
let state = {
  status: 'IDLE',
  importacionId: null,
  progress: {
    processed: 0,
    total: 0,
    inserted: 0,
    jugadasInserted: 0,
    skipped: 0,
    errors: 0
  },
  startedAt: null,
  finishedAt: null,
  message: null
};

export function getUpdateState() {
  return state;
}

export async function initializeImportState() {
  await markStaleRunningImports(env.importStaleMinutes);
}

function setState(patch) {
  state = {
    ...state,
    ...patch,
    progress: {
      ...state.progress,
      ...(patch.progress || {})
    }
  };
}

function eligibleLinks(links) {
  if (env.scraper.startDraw) {
    return links.filter((link) => {
      const match = link.url.match(/resultados-del-(\d{1,2})(\d{1,2})(\d{4})\.html/i);
      if (!match) return true;
      return Number(match[3]) >= env.scraper.startYear;
    });
  }
  return links.filter((link) => !link.year || link.year >= env.scraper.startYear);
}

async function saveDraw(draw) {
  const fechaDescarga = nowSql();
  return withTransaction(async (connection) => {
    const modalidades = await getModalidadesByCodigo(connection);
    const missing = [MODALIDADES.TRADICIONAL, MODALIDADES.SEGUNDA].filter(
      (codigo) => !modalidades[codigo]
    );
    if (missing.length) throw new Error(`Faltan modalidades en catalogo: ${missing.join(', ')}`);

    const sorteoId = await upsertSorteo(connection, draw, fechaDescarga);
    let jugadasInsertadas = 0;
    for (const codigo of [MODALIDADES.TRADICIONAL, MODALIDADES.SEGUNDA]) {
      jugadasInsertadas += await insertJugada(
        connection,
        sorteoId,
        modalidades[codigo].id,
        draw.jugadas[codigo]
      );
    }
    return { sorteoId, jugadasInsertadas };
  });
}

export async function startUpdate() {
  if (running) {
    const error = new Error('Ya hay una actualizacion en proceso.');
    error.statusCode = 409;
    throw error;
  }

  running = true;
  const startedMs = Date.now();
  const importacion = await createImportacion();
  setState({
    status: 'EN_PROCESO',
    importacionId: importacion.id,
    startedAt: importacion.fechaInicio,
    finishedAt: null,
    message: 'Actualizando historicos...',
    progress: {
      processed: 0,
      total: 0,
      inserted: 0,
      jugadasInserted: 0,
      skipped: 0,
      errors: 0
    }
  });

  runImport(importacion.id, startedMs).catch((error) => {
    logger.error('Importacion fallida', { message: error.message });
  });

  return getUpdateState();
}

async function runImport(importacionId, startedMs) {
  let finalStatus = 'EXITOSA';
  let sorteoInicial = null;
  let sorteoFinal = null;
  try {
    const existingDrawNumbers = await getExistingDrawNumbers();
    const links = eligibleLinks(await discoverHistoricalLinks());
    setState({ progress: { total: links.length } });
    await updateImportacion(importacionId, { sorteos_encontrados: links.length });

    for (const link of links) {
      try {
        await sleep(env.scraper.requestDelayMs);
        logger.info('Descargando sorteo', { url: link.url });
        const html = await downloadHtml(link.url);
        const draw = parseDrawHtml(html, link.url);
        setState({ progress: { processed: state.progress.processed + 1 } });
        if (existingDrawNumbers.has(draw.numeroSorteo)) {
          setState({ progress: { skipped: state.progress.skipped + 1 } });
          continue;
        }
        if (env.scraper.startDraw && draw.numeroSorteo < env.scraper.startDraw) {
          setState({ progress: { skipped: state.progress.skipped + 1 } });
          continue;
        }

        try {
          const result = await saveDraw(draw);
          existingDrawNumbers.add(draw.numeroSorteo);
          sorteoInicial =
            sorteoInicial === null ? draw.numeroSorteo : Math.min(sorteoInicial, draw.numeroSorteo);
          sorteoFinal =
            sorteoFinal === null ? draw.numeroSorteo : Math.max(sorteoFinal, draw.numeroSorteo);
          setState({
            progress: {
              inserted: state.progress.inserted + 1,
              jugadasInserted: state.progress.jugadasInserted + result.jugadasInsertadas
            }
          });
        } catch (error) {
          finalStatus = 'ADVERTENCIA';
          setState({
            progress: {
              errors: state.progress.errors + 1
            }
          });
          await addImportError(importacionId, {
            numeroSorteo: draw.numeroSorteo,
            url: draw.urlOrigen,
            tipoError: error.name || 'MYSQL_ERROR',
            descripcion: error.message
          });
        }
      } catch (error) {
        finalStatus = 'ADVERTENCIA';
        setState({
          progress: {
            processed: state.progress.processed + 1,
            errors: state.progress.errors + 1
          }
        });
        await addImportError(importacionId, {
          url: link.url,
          tipoError: error.name || 'SCRAPER_ERROR',
          descripcion: error.message
        });
      }
    }

    const detalle = JSON.stringify({
      durationMs: formatDurationMs(startedMs),
      message: 'Importacion finalizada'
    });
    await updateImportacion(importacionId, {
      fecha_fin: nowSql(),
      estado: finalStatus,
      sorteo_inicial: sorteoInicial,
      sorteo_final: sorteoFinal,
      sorteos_procesados: state.progress.processed,
      sorteos_insertados: state.progress.inserted,
      jugadas_insertadas: state.progress.jugadasInserted,
      registros_omitidos: state.progress.skipped,
      cantidad_errores: state.progress.errors,
      detalle
    });
    setState({ status: finalStatus, finishedAt: nowSql(), message: 'Importacion finalizada' });
  } catch (error) {
    await updateImportacion(importacionId, {
      fecha_fin: nowSql(),
      estado: 'FALLIDA',
      cantidad_errores: state.progress.errors + 1,
      detalle: error.message
    });
    setState({
      status: 'FALLIDA',
      finishedAt: nowSql(),
      message: error.message,
      progress: { errors: state.progress.errors + 1 }
    });
  } finally {
    running = false;
  }
}
