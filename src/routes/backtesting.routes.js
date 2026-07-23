import { Router } from 'express';
import { corridas, ejecutar } from '../controllers/backtesting.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const backtestingRouter = Router();

backtestingRouter.post('/ejecutar', asyncHandler(ejecutar));
backtestingRouter.get('/corridas', asyncHandler(corridas));
