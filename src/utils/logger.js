function write(level, message, meta) {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
  console[level](`[${new Date().toISOString()}] ${message}${suffix}`);
}

export const logger = {
  info: (message, meta) => write('log', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta)
};
