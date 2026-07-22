import { Router } from 'express';
import {
  actualizar,
  estadoActualizacion,
  historico,
  resumen
} from '../controllers/historico.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const historicoRouter = Router();

historicoRouter.get('/', asyncHandler(historico));
historicoRouter.get('/resumen', asyncHandler(resumen));
historicoRouter.post('/actualizar', asyncHandler(actualizar));
historicoRouter.get('/actualizacion/estado', asyncHandler(estadoActualizacion));
