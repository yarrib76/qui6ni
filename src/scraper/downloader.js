import axios from 'axios';
import { env } from '../config/env.js';

export async function sleep(ms) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function downloadHtml(url) {
  let lastError;
  for (let attempt = 1; attempt <= env.scraper.maxRetries; attempt += 1) {
    try {
      const response = await axios.get(url, {
        timeout: env.scraper.timeoutMs,
        headers: {
          'User-Agent': env.scraper.userAgent,
          Accept: 'text/html,application/xhtml+xml'
        }
      });
      return response.data;
    } catch (error) {
      lastError = error;
      if (attempt < env.scraper.maxRetries) await sleep(env.scraper.requestDelayMs);
    }
  }
  throw lastError;
}
