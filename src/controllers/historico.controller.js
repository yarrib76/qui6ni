import { getHistorico, getResumen } from '../services/historico.service.js';
import { getUpdateState, startUpdate } from '../services/scraper.service.js';

const DATA_TABLE_COLUMNS = [
  'year',
  'month',
  'fecha',
  'numeroSorteo',
  'modalidad',
  'numero1',
  'numero2',
  'numero3',
  'numero4',
  'numero5',
  'numero6',
  'fechaDescarga'
];

function normalizeQuery(query) {
  const isDataTables = query.draw !== undefined;
  if (!isDataTables) return query;

  const order = Array.isArray(query.order) ? query.order[0] : query.order;
  const orderColumnIndex = order?.column ?? query['order[0][column]'] ?? 2;
  return {
    ...query,
    page: Math.floor((Number(query.start) || 0) / (Number(query.length) || 25)) + 1,
    pageSize: Number(query.length) || 25,
    search: query.search?.value || query['search[value]'] || query.search || '',
    orderBy: DATA_TABLE_COLUMNS[Number(orderColumnIndex)] || 'fecha',
    orderDirection: order?.dir || query['order[0][dir]'] || 'DESC'
  };
}

export async function historico(req, res) {
  const normalized = normalizeQuery(req.query);
  const result = await getHistorico(normalized);

  if (req.query.draw !== undefined) {
    res.json({
      draw: Number(req.query.draw),
      recordsTotal: result.pagination.totalRecords,
      recordsFiltered: result.pagination.totalRecords,
      data: result.data
    });
    return;
  }

  res.json({ success: true, ...result });
}

export async function resumen(req, res) {
  res.json({ success: true, data: await getResumen() });
}

export async function actualizar(req, res) {
  res.status(202).json({ success: true, data: await startUpdate() });
}

export async function estadoActualizacion(req, res) {
  res.json({ success: true, data: getUpdateState() });
}
