import {
  evaluarJugadasPendientes,
  getJugadasReales,
  registrarJugadaRealDesdeCombinacion
} from '../services/jugadasReales.service.js';

export async function registrarDesdeCombinacion(req, res) {
  res.status(201).json({
    success: true,
    data: await registrarJugadaRealDesdeCombinacion(req.params.combinacionId, req.body)
  });
}

export async function listar(req, res) {
  res.json({ success: true, ...(await getJugadasReales(req.query)) });
}

export async function evaluarPendientes(req, res) {
  res.json({ success: true, data: await evaluarJugadasPendientes() });
}
