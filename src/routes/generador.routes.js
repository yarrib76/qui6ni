import { Router } from 'express';
import { cambiarEstado, generar, historial } from '../controllers/generador.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const generadorRouter = Router();

generadorRouter.post('/generar', asyncHandler(generar));
generadorRouter.get('/historial', asyncHandler(historial));
generadorRouter.patch('/:id/estado', asyncHandler(cambiarEstado));
