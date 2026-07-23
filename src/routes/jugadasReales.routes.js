import { Router } from 'express';
import { evaluarPendientes, listar, registrarDesdeCombinacion } from '../controllers/jugadasReales.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const jugadasRealesRouter = Router();

jugadasRealesRouter.get('/', asyncHandler(listar));
jugadasRealesRouter.post('/desde-combinacion/:combinacionId', asyncHandler(registrarDesdeCombinacion));
jugadasRealesRouter.post('/evaluar-pendientes', asyncHandler(evaluarPendientes));
