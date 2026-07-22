import dotenv from 'dotenv';

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 3306),
    database: process.env.DB_NAME || 'quini6',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10)
  },
  scraper: {
    baseUrl: process.env.SCRAPER_BASE_URL || 'https://www.quini-6.com.ar/',
    archivePath: process.env.SCRAPER_ARCHIVE_PATH || '/p/resultados-anteriores-del-quini-6.html',
    startYear: toInt(process.env.SCRAPER_START_YEAR, 2012),
    startDraw: process.env.SCRAPER_START_DRAW ? toInt(process.env.SCRAPER_START_DRAW, null) : null,
    requestDelayMs: toInt(process.env.SCRAPER_REQUEST_DELAY_MS, 1000),
    timeoutMs: toInt(process.env.SCRAPER_TIMEOUT_MS, 15000),
    maxRetries: toInt(process.env.SCRAPER_MAX_RETRIES, 3),
    userAgent: process.env.SCRAPER_USER_AGENT || 'Quini6HistoricoBot/1.0 (+local research project)'
  },
  importStaleMinutes: toInt(process.env.IMPORT_STALE_MINUTES, 120)
};
