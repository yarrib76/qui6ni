import { app } from './app.js';
import { env } from './config/env.js';
import { initializeImportState } from './services/scraper.service.js';
import { logger } from './utils/logger.js';

try {
  await initializeImportState();
} catch (error) {
  logger.warn('No se pudo inicializar el estado de importaciones', { message: error.message });
}

app.listen(env.port, () => {
  logger.info(`Quini 6 Historico escuchando en http://localhost:${env.port}`);
});
