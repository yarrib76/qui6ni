import { Router } from 'express';
import { analizar, guardados, rango } from '../controllers/estadisticas.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const estadisticasRouter = Router();

estadisticasRouter.get('/rango', asyncHandler(rango));
estadisticasRouter.post('/analizar', asyncHandler(analizar));
estadisticasRouter.get('/guardados', asyncHandler(guardados));
