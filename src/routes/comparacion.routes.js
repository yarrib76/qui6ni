import { Router } from 'express';
import { comparar } from '../controllers/comparacion.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const comparacionRouter = Router();

comparacionRouter.post('/estrategias', asyncHandler(comparar));
