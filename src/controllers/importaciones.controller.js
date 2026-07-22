import { getImportacionErrores, getImportaciones } from '../services/importaciones.service.js';

export async function importaciones(req, res) {
  res.json({ success: true, ...(await getImportaciones(req.query)) });
}

export async function errores(req, res) {
  res.json({ success: true, data: await getImportacionErrores(req.params.id) });
}
