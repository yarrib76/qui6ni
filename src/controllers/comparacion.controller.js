import { compararEstrategias } from '../services/comparacion.service.js';

export async function comparar(req, res) {
  res.json({ success: true, data: await compararEstrategias(req.body) });
}
