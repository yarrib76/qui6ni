import { drawNumbers } from '../statistics/statisticsEngine.js';
import { generateCombinations } from '../generator/generationEngine.js';

export function runBacktest(rows, options = {}) {
  const sorted = [...rows].sort((a, b) => Number(a.numeroSorteo) - Number(b.numeroSorteo));
  const trainingWindow = Math.min(Math.max(Number(options.ventanaEntrenamiento) || 100, 1), 1000);
  const combinationsPerDraw = Math.min(Math.max(Number(options.combinacionesPorSorteo) || 1, 1), 20);
  const details = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const target = sorted[index];
    const trainingRows = sorted.slice(Math.max(0, index - trainingWindow), index);
    if (trainingRows.length < Math.min(trainingWindow, 10)) continue;

    const generated = generateCombinations(trainingRows, {
      estrategia: options.estrategia,
      cantidad: combinationsPerDraw,
      estado: 'SIMULADA'
    });
    const resultNumbers = drawNumbers(target);
    const resultSet = new Set(resultNumbers);

    generated.forEach((combination, combinationIndex) => {
      const hits = combination.numeros.filter((number) => resultSet.has(number));
      details.push({
        sorteoId: target.sorteoId,
        numeroSorteo: Number(target.numeroSorteo),
        fechaSorteo: target.fechaSorteo,
        combinacionIndex: combinationIndex + 1,
        numeros: combination.numeros,
        numerosSorteados: resultNumbers,
        aciertos: hits.length,
        numerosAcertados: hits,
        score: combination.score || null
      });
    });
  }

  return {
    summary: summarize(details),
    details
  };
}

export function summarize(details) {
  const distribution = Object.fromEntries(Array.from({ length: 7 }, (_, index) => [String(index), 0]));
  let totalHits = 0;
  let best = 0;

  for (const detail of details) {
    distribution[String(detail.aciertos)] += 1;
    totalHits += detail.aciertos;
    if (detail.aciertos > best) best = detail.aciertos;
  }

  return {
    sorteosEvaluados: new Set(details.map((detail) => detail.numeroSorteo)).size,
    jugadasGeneradas: details.length,
    promedioAciertos: details.length ? totalHits / details.length : 0,
    mejorAcierto: best,
    distribucionAciertos: distribution
  };
}
