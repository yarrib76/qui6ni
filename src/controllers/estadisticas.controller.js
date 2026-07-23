import {
  analizarEstadisticas,
  getAnalisisGuardados,
  getRangoDisponible
} from '../services/estadisticas.service.js';

export async function rango(req, res) {
  res.json({ success: true, data: await getRangoDisponible() });
}

export async function analizar(req, res) {
  res.json({ success: true, data: await analizarEstadisticas(req.body) });
}

export async function guardados(req, res) {
  res.json({ success: true, ...(await getAnalisisGuardados(req.query)) });
}
