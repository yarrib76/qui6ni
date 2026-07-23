import { runBacktest } from '../backtesting/backtestingEngine.js';

export function compareStrategies(rows, options = {}) {
  const strategies = normalizeStrategies(options.estrategias);
  const randomRuns = Math.min(Math.max(Number(options.simulacionesAleatorias) || 100, 1), 1000);
  const randomSummaries = Array.from({ length: randomRuns }, () =>
    runBacktest(rows, { ...options, estrategia: 'ALEATORIA' }).summary
  );
  const randomAverages = randomSummaries
    .map((summary) => summary.promedioAciertos)
    .sort((a, b) => a - b);
  const randomAverage =
    randomAverages.reduce((sum, value) => sum + value, 0) / Math.max(randomAverages.length, 1);

  const results = strategies.map((strategy) => {
    const backtest = runBacktest(rows, { ...options, estrategia: strategy });
    const percentile =
      randomAverages.filter((value) => value <= backtest.summary.promedioAciertos).length /
      Math.max(randomAverages.length, 1);
    return {
      estrategia: strategy,
      ...backtest.summary,
      diferenciaContraAleatoria: backtest.summary.promedioAciertos - randomAverage,
      percentilContraAleatoria: percentile
    };
  });

  results.sort(
    (a, b) =>
      b.promedioAciertos - a.promedioAciertos ||
      b.mejorAcierto - a.mejorAcierto ||
      a.estrategia.localeCompare(b.estrategia)
  );

  return {
    baselineAleatoria: {
      simulaciones: randomRuns,
      promedioPromedios: randomAverage,
      promedioMinimo: randomAverages[0] || 0,
      promedioMaximo: randomAverages[randomAverages.length - 1] || 0
    },
    ranking: results.map((result, index) => ({ ...result, ranking: index + 1 }))
  };
}

function normalizeStrategies(input) {
  const defaults = [
    'ALEATORIA',
    'BALANCEADA',
    'PONDERADA_FRECUENCIA',
    'MAS_FRECUENTES',
    'MENOS_FRECUENTES',
    'MAYOR_ZSCORE',
    'MAS_ATRASADOS'
  ];
  const strategies = Array.isArray(input) && input.length ? input : defaults;
  return [...new Set(strategies.filter(Boolean))];
}
