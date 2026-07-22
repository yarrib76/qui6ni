import * as cheerio from 'cheerio';
import { parseSpanishDate } from '../utils/dates.js';
import { detectModalidad, normalizeNumbers } from './normalizer.js';
import { validateParsedDraw } from './validator.js';

function extractHeader($) {
  const text = $('body').text().replace(/\s+/g, ' ');
  const match = text.match(/Sorteo:\s*(\d+)\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (!match) return { numeroSorteo: null, fechaSorteo: null };
  return {
    numeroSorteo: Number.parseInt(match[1], 10),
    fechaSorteo: parseSpanishDate(match[2])
  };
}

function numbersAfterHeading($, heading) {
  const numbers = [];
  let current = $(heading).next();

  while (current.length && !/^h[1-6]$/i.test(current[0].tagName || '')) {
    if (current.is('ul, ol')) {
      current.find('li').each((_, item) => {
        const text = $(item).text().trim();
        if (/^\d{1,2}$/.test(text)) numbers.push(text);
      });
      if (numbers.length >= 6) break;
    }
    current = current.next();
  }

  return normalizeNumbers(numbers.slice(0, 6));
}

export function parseDrawHtml(html, url = null) {
  const $ = cheerio.load(html);
  const header = extractHeader($);
  const jugadas = {};

  $('h1,h2,h3,h4,h5,h6').each((_, heading) => {
    const modalidad = detectModalidad($(heading).text());
    if (modalidad && !jugadas[modalidad]) {
      jugadas[modalidad] = numbersAfterHeading($, heading);
    }
  });

  const draw = {
    numeroSorteo: header.numeroSorteo,
    fechaSorteo: header.fechaSorteo,
    urlOrigen: url,
    jugadas
  };

  const errors = validateParsedDraw(draw);
  if (errors.length) {
    const error = new Error(errors.join(' '));
    error.name = 'ParserValidationError';
    error.details = errors;
    throw error;
  }

  return draw;
}

export function discoverResultLinks(html, baseUrl, startYear) {
  const $ = cheerio.load(html);
  const links = new Map();

  $('a[href]').each((_, item) => {
    const label = $(item).text().trim();
    const href = $(item).attr('href');
    if (!/resultados-del-\d{1,2}\d{1,2}\d{4}\.html/i.test(href || label)) return;

    const absolute = new URL(href, baseUrl).toString();
    const dateMatch = `${label} ${href}`.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})|resultados-del-(\d{1,2})(\d{1,2})(\d{4})/i);
    const year = dateMatch ? Number(dateMatch[3] || dateMatch[6]) : null;
    if (year && year < startYear) return;
    links.set(absolute, { url: absolute, label, year });
  });

  return Array.from(links.values());
}

export function discoverYearArchiveLinks(html, baseUrl, startYear, endYear = new Date().getFullYear()) {
  const $ = cheerio.load(html);
  const links = new Map();

  $('a[href]').each((_, item) => {
    const label = $(item).text().trim();
    const href = $(item).attr('href');
    const textMatch = label.match(/\b(20\d{2})\b/);
    const hrefMatch = String(href || '').match(/\/(20\d{2})\/?$/);
    const year = Number((hrefMatch && hrefMatch[1]) || (textMatch && textMatch[1]));

    if (!year || year < startYear || year > endYear) return;

    const absolute = new URL(href || `/${year}/`, baseUrl).toString();
    if (!/\/20\d{2}\/?$/.test(new URL(absolute).pathname)) return;

    links.set(absolute, { url: absolute, year });
  });

  return Array.from(links.values()).sort((a, b) => b.year - a.year);
}
