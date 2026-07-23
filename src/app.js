import express from 'express';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { historicoRouter } from './routes/historico.routes.js';
import { importacionesRouter } from './routes/importaciones.routes.js';
import { estadisticasRouter } from './routes/estadisticas.routes.js';
import { generadorRouter } from './routes/generador.routes.js';
import { backtestingRouter } from './routes/backtesting.routes.js';
import { comparacionRouter } from './routes/comparacion.routes.js';
import { jugadasRealesRouter } from './routes/jugadasReales.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/historico', historicoRouter);
app.use('/api/importaciones', importacionesRouter);
app.use('/api/estadisticas', estadisticasRouter);
app.use('/api/generador', generadorRouter);
app.use('/api/backtesting', backtestingRouter);
app.use('/api/comparacion', comparacionRouter);
app.use('/api/jugadas-reales', jugadasRealesRouter);

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.use(errorHandler);
