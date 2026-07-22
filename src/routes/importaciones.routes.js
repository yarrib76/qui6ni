import { Router } from 'express';
import { errores, importaciones } from '../controllers/importaciones.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const importacionesRouter = Router();

importacionesRouter.get('/', asyncHandler(importaciones));
importacionesRouter.get('/:id/errores', asyncHandler(errores));
