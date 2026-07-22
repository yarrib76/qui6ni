import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { discoverResultLinks, discoverYearArchiveLinks, parseDrawHtml } from '../src/scraper/parser.js';
import { normalizeNumbers, detectModalidad } from '../src/scraper/normalizer.js';
import { validateNumbers } from '../src/scraper/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixture(name) {
  return readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

describe('parser Quini 6', () => {
  it('extrae sorteo, fecha y modalidades requeridas', () => {
    const draw = parseDrawHtml(fixture('sorteo-valido.html'), 'https://example.test/sorteo.html');

    expect(draw.numeroSorteo).toBe(3392);
    expect(draw.fechaSorteo).toBe('2026-07-19');
    expect(draw.jugadas.TRADICIONAL).toEqual([5, 17, 27, 28, 31, 45]);
    expect(draw.jugadas.SEGUNDA).toEqual([8, 21, 23, 33, 36, 41]);
    expect(draw.jugadas.REVANCHA).toBeUndefined();
  });

  it('rechaza sorteos incompletos', () => {
    expect(() => parseDrawHtml(fixture('sorteo-incompleto.html'))).toThrow(/Falta modalidad SEGUNDA/);
  });

  it('rechaza estructuras desconocidas', () => {
    expect(() => parseDrawHtml(fixture('estructura-desconocida.html'))).toThrow(/Numero de sorteo invalido/);
  });
});

describe('descubrimiento de historicos', () => {
  it('encuentra archivos anuales desde 2012', () => {
    const links = discoverYearArchiveLinks(fixture('archive-home.html'), 'https://www.quini-6.com.ar/', 2012);

    expect(links.map((link) => link.year)).toEqual([2026, 2025]);
  });

  it('encuentra links de sorteos dentro de una pagina anual', () => {
    const links = discoverResultLinks(fixture('archive-year.html'), 'https://www.quini-6.com.ar/2025/', 2012);

    expect(links.map((link) => link.url)).toEqual([
      'https://www.quini-6.com.ar/2025/12/resultados-del-31122025.html',
      'https://www.quini-6.com.ar/2025/12/resultados-del-28122025.html'
    ]);
  });
});

describe('normalizacion y validacion', () => {
  it('ordena numeros como enteros', () => {
    expect(normalizeNumbers(['17', '05', '45', '28', '31', '27'])).toEqual([
      5,
      17,
      27,
      28,
      31,
      45
    ]);
  });

  it('detecta numeros repetidos', () => {
    expect(validateNumbers([1, 2, 3, 4, 5, 5])).toContain('La jugada contiene numeros repetidos.');
  });

  it('detecta rango 0-45', () => {
    expect(validateNumbers([0, 1, 2, 3, 4, 46]).join(' ')).toMatch(/fuera de rango/);
  });

  it('detecta modalidades conocidas', () => {
    expect(detectModalidad('Tradicional Primer Sorteo')).toBe('TRADICIONAL');
    expect(detectModalidad('Tradicional la Segunda del Quini')).toBe('SEGUNDA');
  });
});
