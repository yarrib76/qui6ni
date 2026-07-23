import { calculateNumberFrequencies } from '../statistics/statisticsEngine.js';

export const STRATEGIES = Object.freeze({
  ALEATORIA: 'ALEATORIA',
  MAS_FRECUENTES: 'MAS_FRECUENTES',
  MENOS_FRECUENTES: 'MENOS_FRECUENTES',
  MAYOR_ZSCORE: 'MAYOR_ZSCORE',
  MAS_ATRASADOS: 'MAS_ATRASADOS',
  BALANCEADA: 'BALANCEADA',
  PONDERADA_FRECUENCIA: 'PONDERADA_FRECUENCIA'
});

const NUMBERS = Array.from({ length: 46 }, (_, index) => index);

export function generateCombinations(rows, options = {}) {
  const strategy = STRATEGIES[options.estrategia] || STRATEGIES.ALEATORIA;
  const count = Math.min(Math.max(Number(options.cantidad) || 1, 1), 20);
  const frequencies = calculateNumberFrequencies(rows);
  const output = [];
  const seen = new Set();
  let attempts = 0;
  let salt = 0;

  while (output.length < count && attempts < count * 200) {
    const result = generateOne(strategy, frequencies, salt);
    const key = result.numeros.join('-');
    attempts += 1;
    salt += 1;
    if (seen.has(key)) continue;
    if (isTooSimilar(result.numeros, output) && attempts < count * 150) continue;
    seen.add(key);
    output.push({
      ...result,
      estrategia: strategy,
      estado: options.estado || 'SIMULADA'
    });
  }

  return output;
}

function generateOne(strategy, frequencies, salt = 0) {
  if (strategy === STRATEGIES.ALEATORIA) return randomCombination(frequencies);
  if (strategy === STRATEGIES.MAS_FRECUENTES) return rankedCombination(frequencies, (a, b) => b.apariciones - a.apariciones || a.numero - b.numero, salt);
  if (strategy === STRATEGIES.MENOS_FRECUENTES) return rankedCombination(frequencies, (a, b) => a.apariciones - b.apariciones || a.numero - b.numero, salt);
  if (strategy === STRATEGIES.MAYOR_ZSCORE) return rankedCombination(frequencies, (a, b) => b.zScore - a.zScore || a.numero - b.numero, salt);
  if (strategy === STRATEGIES.MAS_ATRASADOS) {
    return rankedCombination(
      frequencies,
      (a, b) => (b.sorteosDesdeUltimaAparicion ?? 9999) - (a.sorteosDesdeUltimaAparicion ?? 9999) || a.numero - b.numero,
      salt
    );
  }
  if (strategy === STRATEGIES.BALANCEADA) return balancedCombination(frequencies, salt);
  if (strategy === STRATEGIES.PONDERADA_FRECUENCIA) return weightedCombination(frequencies);
  return randomCombination(frequencies);
}

function rankedCombination(frequencies, sorter, salt) {
  const ranked = [...frequencies].sort(sorter);
  const window = ranked.slice(0, Math.min(18 + salt * 2, ranked.length));
  const numbers = salt === 0
    ? window.slice(0, 6)
    : pickDiversifiedWindow(window, salt);
  const normalized = normalize(numbers.map((row) => row.numero));
  return explain(normalized, frequencies, `Seleccion basada en ranking estadistico de ${normalized.length} numeros.`);
}

function pickDiversifiedWindow(window, salt) {
  const selected = [];
  const used = new Set();
  const start = salt % Math.max(1, Math.min(6, window.length));
  const step = 3 + (salt % 4);

  for (let offset = 0; selected.length < 6 && offset < window.length * 2; offset += 1) {
    const row = window[(start + offset * step) % window.length];
    if (used.has(row.numero)) continue;
    used.add(row.numero);
    selected.push(row);
  }

  for (const row of window) {
    if (selected.length === 6) break;
    if (used.has(row.numero)) continue;
    used.add(row.numero);
    selected.push(row);
  }

  return selected;
}

function randomCombination(frequencies) {
  return explain(shuffle(NUMBERS).slice(0, 6).sort((a, b) => a - b), frequencies, 'Seleccion aleatoria pura.');
}

function balancedCombination(frequencies, salt) {
  const ranked = [...frequencies].sort((a, b) => compositeScore(b) - compositeScore(a) || a.numero - b.numero);
  const selected = [];
  const tensCount = new Map();
  let evenCount = 0;

  for (const row of ranked.slice(salt, ranked.length)) {
    const ten = Math.floor(row.numero / 10);
    const isEven = row.numero % 2 === 0;
    if ((tensCount.get(ten) || 0) >= 2) continue;
    if (isEven && evenCount >= 4) continue;
    if (!isEven && selected.length - evenCount >= 4) continue;
    selected.push(row.numero);
    tensCount.set(ten, (tensCount.get(ten) || 0) + 1);
    if (isEven) evenCount += 1;
    if (selected.length === 6) break;
  }

  if (selected.length < 6) {
    for (const row of ranked) {
      if (!selected.includes(row.numero)) selected.push(row.numero);
      if (selected.length === 6) break;
    }
  }

  return explain(normalize(selected), frequencies, 'Seleccion balanceada por puntaje, paridad y decenas.');
}

function weightedCombination(frequencies) {
  const selected = [];
  const candidates = frequencies.map((row) => ({
    ...row,
    weight: Math.max(0.1, row.apariciones + Math.max(row.zScore, 0) + 1)
  }));

  while (selected.length < 6) {
    const pick = weightedPick(candidates.filter((row) => !selected.includes(row.numero)));
    selected.push(pick.numero);
  }

  return explain(normalize(selected), frequencies, 'Seleccion aleatoria ponderada por frecuencia y z-score positivo.');
}

function weightedPick(rows) {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  let cursor = Math.random() * total;
  for (const row of rows) {
    cursor -= row.weight;
    if (cursor <= 0) return row;
  }
  return rows[rows.length - 1];
}

function explain(numbers, frequencies, text) {
  const byNumber = new Map(frequencies.map((row) => [row.numero, row]));
  const metrics = numbers.map((number) => byNumber.get(number)).filter(Boolean);
  const score = metrics.reduce((sum, row) => sum + row.apariciones + Math.max(row.zScore, 0), 0);
  return {
    numeros: numbers,
    score,
    explicacion: text,
    metricas: metrics
  };
}

function compositeScore(row) {
  return row.apariciones + Math.max(row.zScore, 0) + Math.min(row.sorteosDesdeUltimaAparicion || 0, 100) / 25;
}

function normalize(numbers) {
  return [...new Set(numbers)].slice(0, 6).sort((a, b) => a - b);
}

function isTooSimilar(numbers, combinations) {
  return combinations.some((combination) => {
    const current = new Set(combination.numeros);
    const shared = numbers.filter((number) => current.has(number)).length;
    return shared >= 5;
  });
}

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}
