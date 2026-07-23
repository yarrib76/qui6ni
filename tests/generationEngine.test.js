import { describe, expect, it } from 'vitest';
import { generateCombinations, STRATEGIES } from '../src/generator/generationEngine.js';

const rows = Array.from({ length: 30 }, (_, index) => ({
  fechaSorteo: `2026-01-${String((index % 28) + 1).padStart(2, '0')}`,
  numeroSorteo: index + 1,
  numero1: 1,
  numero2: 2,
  numero3: 3 + (index % 10),
  numero4: 14 + (index % 10),
  numero5: 25 + (index % 10),
  numero6: 36 + (index % 10)
}));

describe('generationEngine', () => {
  it('genera la cantidad solicitada con seis numeros unicos', () => {
    const combinations = generateCombinations(rows, {
      estrategia: STRATEGIES.ALEATORIA,
      cantidad: 3
    });

    expect(combinations).toHaveLength(3);
    for (const combination of combinations) {
      expect(combination.numeros).toHaveLength(6);
      expect(new Set(combination.numeros).size).toBe(6);
      expect(combination.numeros.every((number) => number >= 0 && number <= 45)).toBe(true);
    }
  });

  it('prioriza numeros frecuentes en MAS_FRECUENTES', () => {
    const [combination] = generateCombinations(rows, {
      estrategia: STRATEGIES.MAS_FRECUENTES,
      cantidad: 1
    });

    expect(combination.numeros).toContain(1);
    expect(combination.numeros).toContain(2);
  });

  it('genera una combinacion balanceada valida', () => {
    const [combination] = generateCombinations(rows, {
      estrategia: STRATEGIES.BALANCEADA,
      cantidad: 1
    });

    expect(combination.numeros).toHaveLength(6);
    expect(combination.explicacion).toMatch(/balanceada/);
  });

  it('evita variantes casi identicas dentro de una misma tanda', () => {
    const combinations = generateCombinations(rows, {
      estrategia: STRATEGIES.MAS_FRECUENTES,
      cantidad: 4
    });

    for (let index = 0; index < combinations.length; index += 1) {
      for (let next = index + 1; next < combinations.length; next += 1) {
        const current = new Set(combinations[index].numeros);
        const shared = combinations[next].numeros.filter((number) => current.has(number)).length;
        expect(shared).toBeLessThan(5);
      }
    }
  });
});
