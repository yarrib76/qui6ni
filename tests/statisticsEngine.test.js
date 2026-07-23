import { describe, expect, it } from 'vitest';
import {
  buildStatistics,
  calculateCombinations,
  calculateNumberFrequencies,
  expectedPerNumber
} from '../src/statistics/statisticsEngine.js';

const rows = [
  {
    fechaSorteo: '2026-01-01',
    numeroSorteo: 1,
    numero1: 1,
    numero2: 2,
    numero3: 3,
    numero4: 4,
    numero5: 5,
    numero6: 6
  },
  {
    fechaSorteo: '2026-01-05',
    numeroSorteo: 2,
    numero1: 1,
    numero2: 2,
    numero3: 10,
    numero4: 11,
    numero5: 12,
    numero6: 13
  },
  {
    fechaSorteo: '2026-01-09',
    numeroSorteo: 3,
    numero1: 1,
    numero2: 20,
    numero3: 21,
    numero4: 22,
    numero5: 23,
    numero6: 24
  }
];

describe('statisticsEngine', () => {
  it('calcula frecuencia esperada por numero para 46 bolillas', () => {
    expect(expectedPerNumber(46)).toBe(6);
  });

  it('calcula frecuencias y ranking de apariciones', () => {
    const frequencies = calculateNumberFrequencies(rows);
    const one = frequencies.find((metric) => metric.numero === 1);
    const two = frequencies.find((metric) => metric.numero === 2);
    const zero = frequencies.find((metric) => metric.numero === 0);

    expect(one.apariciones).toBe(3);
    expect(one.rankingApariciones).toBe(1);
    expect(two.apariciones).toBe(2);
    expect(zero.apariciones).toBe(0);
  });

  it('calcula pares frecuentes', () => {
    const pairs = calculateCombinations(rows, 2);
    expect(pairs[0]).toMatchObject({ numeros: '01-02', apariciones: 2, rankingApariciones: 1 });
  });

  it('construye resumen, distribuciones y calidad', () => {
    const stats = buildStatistics(rows);

    expect(stats.summary.jugadasAnalizadas).toBe(3);
    expect(stats.summary.sorteosAnalizados).toBe(3);
    expect(stats.summary.fechaDesde).toBe('2026-01-01');
    expect(stats.distributions.parity.length).toBeGreaterThan(0);
    expect(stats.quality[0]).toMatchObject({ anio: 2026, sorteosDetectados: 3 });
  });
});
