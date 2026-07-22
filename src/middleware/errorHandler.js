import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function errorHandler(error, req, res, next) {
  logger.error('Unhandled request error', {
    path: req.path,
    message: error.message
  });

  res.status(error.statusCode || 500).json({
    success: false,
    error: env.nodeEnv === 'development' ? error.message : 'Error interno del servidor'
  });
}
