import {
  cambiarEstadoCombinacion,
  generarCombinaciones,
  getCombinacionesGeneradas
} from '../services/generador.service.js';

export async function generar(req, res) {
  res.json({ success: true, data: await generarCombinaciones(req.body) });
}

export async function historial(req, res) {
  res.json({ success: true, ...(await getCombinacionesGeneradas(req.query)) });
}

export async function cambiarEstado(req, res) {
  res.json({ success: true, data: await cambiarEstadoCombinacion(req.params.id, req.body) });
}
