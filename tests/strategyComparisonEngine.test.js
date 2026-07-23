import { describe, expect, it } from 'vitest';
import { compareStrategies } from '../src/comparison/strategyComparisonEngine.js';

const rows = Array.from({ length: 40 }, (_, index) => ({
  sorteoId: index + 1,
  fechaSorteo: `2026-02-${String((index % 28) + 1).padStart(2, '0')}`,
  numeroSorteo: index + 1,
  numero1: index % 46,
  numero2: (index + 1) % 46,
  numero3: (index + 2) % 46,
  numero4: (index + 3) % 46,
  numero5: (index + 4) % 46,
  numero6: (index + 5) % 46
}));

describe('strategyComparisonEngine', () => {
  it('compara estrategias y devuelve ranking', () => {
    const result = compareStrategies(rows, {
      estrategias: ['ALEATORIA', 'BALANCEADA'],
      ventanaEntrenamiento: 10,
      combinacionesPorSorteo: 1,
      simulacionesAleatorias: 5
    });

    expect(result.baselineAleatoria.simulaciones).toBe(5);
    expect(result.ranking).toHaveLength(2);
    expect(result.ranking[0].ranking).toBe(1);
  });
});
