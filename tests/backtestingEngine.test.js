import { describe, expect, it } from 'vitest';
import { runBacktest } from '../src/backtesting/backtestingEngine.js';

const rows = Array.from({ length: 30 }, (_, index) => ({
  sorteoId: index + 1,
  fechaSorteo: `2026-01-${String((index % 28) + 1).padStart(2, '0')}`,
  numeroSorteo: index + 1,
  numero1: index % 46,
  numero2: (index + 1) % 46,
  numero3: (index + 2) % 46,
  numero4: (index + 3) % 46,
  numero5: (index + 4) % 46,
  numero6: (index + 5) % 46
}));

describe('backtestingEngine', () => {
  it('evalua sorteos usando solamente filas anteriores', () => {
    const result = runBacktest(rows, {
      estrategia: 'MAS_FRECUENTES',
      ventanaEntrenamiento: 10,
      combinacionesPorSorteo: 2
    });

    expect(result.details.length).toBeGreaterThan(0);
    expect(result.summary.jugadasGeneradas).toBe(result.details.length);
    expect(result.summary.sorteosEvaluados).toBeGreaterThan(0);
    expect(Object.keys(result.summary.distribucionAciertos)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
  });
});
