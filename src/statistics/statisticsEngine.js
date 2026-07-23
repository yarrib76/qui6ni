const NUMBER_MIN = 0;
const NUMBER_MAX = 45;
const NUMBERS_PER_DRAW = 6;
const TOTAL_NUMBERS = NUMBER_MAX - NUMBER_MIN + 1;

export const PERIOD_TYPES = Object.freeze({
  TODO: 'TODO',
  ULTIMO_ANIO: 'ULTIMO_ANIO',
  ULTIMOS_ANIOS: 'ULTIMOS_ANIOS',
  ULTIMOS_N_SORTEOS: 'ULTIMOS_N_SORTEOS',
  RANGO_FECHAS: 'RANGO_FECHAS',
  RANGO_SORTEOS: 'RANGO_SORTEOS'
});

export function drawNumbers(row) {
  return [row.numero1, row.numero2, row.numero3, row.numero4, row.numero5, row.numero6]
    .map((value) => Number(value))
    .sort((a, b) => a - b);
}

export function expectedPerNumber(drawCount) {
  return drawCount * (NUMBERS_PER_DRAW / TOTAL_NUMBERS);
}

export function zScore(observed, expected, drawCount) {
  if (!drawCount || expected <= 0) return 0;
  const p = NUMBERS_PER_DRAW / TOTAL_NUMBERS;
  const variance = drawCount * p * (1 - p);
  if (variance <= 0) return 0;
  return (observed - expected) / Math.sqrt(variance);
}

export function calculateNumberFrequencies(rows) {
  const counts = new Map();
  const lastAppearance = new Map();
  for (let number = NUMBER_MIN; number <= NUMBER_MAX; number += 1) counts.set(number, 0);

  const sortedRows = [...rows].sort((a, b) => {
    const dateDiff = String(a.fechaSorteo).localeCompare(String(b.fechaSorteo));
    return dateDiff || Number(a.numeroSorteo) - Number(b.numeroSorteo);
  });

  for (const row of sortedRows) {
    for (const number of drawNumbers(row)) {
      counts.set(number, counts.get(number) + 1);
      lastAppearance.set(number, {
        fechaSorteo: row.fechaSorteo,
        numeroSorteo: Number(row.numeroSorteo)
      });
    }
  }

  const drawCount = rows.length;
  const expected = expectedPerNumber(drawCount);
  const latestDrawNumber = Math.max(0, ...rows.map((row) => Number(row.numeroSorteo)));

  const metrics = Array.from(counts.entries()).map(([number, appearances]) => {
    const diff = appearances - expected;
    const last = lastAppearance.get(number);
    return {
      numero: number,
      apariciones: appearances,
      frecuenciaObservada: drawCount ? appearances / drawCount : 0,
      frecuenciaEsperada: expected,
      diferenciaAbsoluta: diff,
      diferenciaPorcentual: expected ? (diff / expected) * 100 : 0,
      zScore: zScore(appearances, expected, drawCount),
      ultimaAparicionFecha: last?.fechaSorteo || null,
      ultimaAparicionSorteo: last?.numeroSorteo || null,
      sorteosDesdeUltimaAparicion: last ? latestDrawNumber - last.numeroSorteo : null
    };
  });

  metrics
    .sort((a, b) => b.apariciones - a.apariciones || a.numero - b.numero)
    .forEach((metric, index) => {
      metric.rankingApariciones = index + 1;
    });

  return metrics.sort((a, b) => a.numero - b.numero);
}

export function calculateDistributions(rows) {
  const parity = new Map();
  const tens = new Map();
  const sums = [];
  const consecutive = new Map();
  const repeatedPrevious = new Map();
  let previousNumbers = null;

  for (const row of rows) {
    const numbers = drawNumbers(row);
    const even = numbers.filter((number) => number % 2 === 0).length;
    parity.set(`${even} pares / ${NUMBERS_PER_DRAW - even} impares`, (parity.get(`${even} pares / ${NUMBERS_PER_DRAW - even} impares`) || 0) + 1);

    for (const number of numbers) {
      const key = `${Math.floor(number / 10) * 10}-${Math.floor(number / 10) * 10 + 9}`;
      tens.set(key, (tens.get(key) || 0) + 1);
    }

    sums.push(numbers.reduce((total, number) => total + number, 0));

    let consecutiveCount = 0;
    for (let index = 1; index < numbers.length; index += 1) {
      if (numbers[index] === numbers[index - 1] + 1) consecutiveCount += 1;
    }
    consecutive.set(String(consecutiveCount), (consecutive.get(String(consecutiveCount)) || 0) + 1);

    if (previousNumbers) {
      const previous = new Set(previousNumbers);
      const repeated = numbers.filter((number) => previous.has(number)).length;
      repeatedPrevious.set(String(repeated), (repeatedPrevious.get(String(repeated)) || 0) + 1);
    }
    previousNumbers = numbers;
  }

  const averageSum = sums.length ? sums.reduce((total, value) => total + value, 0) / sums.length : 0;
  return {
    parity: mapToRows(parity),
    tens: mapToRows(tens),
    sums: {
      promedio: averageSum,
      minimo: sums.length ? Math.min(...sums) : 0,
      maximo: sums.length ? Math.max(...sums) : 0
    },
    consecutive: mapToRows(consecutive),
    repeatedPrevious: mapToRows(repeatedPrevious)
  };
}

export function calculateCombinations(rows, size) {
  const counts = new Map();
  for (const row of rows) {
    for (const combination of combinations(drawNumbers(row), size)) {
      const key = combination.map((number) => String(number).padStart(2, '0')).join('-');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([numeros, apariciones]) => ({ numeros, apariciones }))
    .sort((a, b) => b.apariciones - a.apariciones || a.numeros.localeCompare(b.numeros))
    .slice(0, 50)
    .map((row, index) => ({ ...row, rankingApariciones: index + 1 }));
}

export function calculateQuality(rows) {
  const years = new Map();
  for (const row of rows) {
    const year = Number(String(row.fechaSorteo).slice(0, 4));
    if (!years.has(year)) {
      years.set(year, {
        anio: year,
        sorteos: new Set(),
        jugadas: 0,
        fechaMinima: row.fechaSorteo,
        fechaMaxima: row.fechaSorteo
      });
    }
    const entry = years.get(year);
    entry.sorteos.add(Number(row.numeroSorteo));
    entry.jugadas += 1;
    if (String(row.fechaSorteo) < String(entry.fechaMinima)) entry.fechaMinima = row.fechaSorteo;
    if (String(row.fechaSorteo) > String(entry.fechaMaxima)) entry.fechaMaxima = row.fechaSorteo;
  }

  return Array.from(years.values())
    .map((entry) => {
      const sorteoMinimo = Math.min(...entry.sorteos);
      const sorteoMaximo = Math.max(...entry.sorteos);
      const detected = entry.sorteos.size;
      const expectedByRange = sorteoMaximo - sorteoMinimo + 1;
      const estado = detected === 0 ? 'SIN_DATOS' : detected < Math.max(20, expectedByRange * 0.75) ? 'PARCIAL' : 'COMPLETO';
      return {
        anio: entry.anio,
        sorteosDetectados: detected,
        jugadasDetectadas: entry.jugadas,
        sorteoMinimo,
        sorteoMaximo,
        fechaMinima: entry.fechaMinima,
        fechaMaxima: entry.fechaMaxima,
        estado
      };
    })
    .sort((a, b) => b.anio - a.anio);
}

export function buildStatistics(rows) {
  const frequencies = calculateNumberFrequencies(rows);
  const distributions = calculateDistributions(rows);
  const pairs = calculateCombinations(rows, 2);
  const trios = calculateCombinations(rows, 3);
  const quality = calculateQuality(rows);
  const drawCount = rows.length;
  const expected = expectedPerNumber(drawCount);
  const sortedByDeviation = [...frequencies].sort(
    (a, b) => Math.abs(b.zScore) - Math.abs(a.zScore) || a.numero - b.numero
  );

  return {
    summary: {
      jugadasAnalizadas: drawCount,
      sorteosAnalizados: new Set(rows.map((row) => Number(row.numeroSorteo))).size,
      fechaDesde: minValue(rows.map((row) => row.fechaSorteo)),
      fechaHasta: maxValue(rows.map((row) => row.fechaSorteo)),
      frecuenciaEsperadaPorNumero: expected,
      mayorDesviacion: sortedByDeviation[0] || null
    },
    frequencies,
    distributions,
    pairs,
    trios,
    quality
  };
}

function combinations(numbers, size, start = 0, prefix = [], output = []) {
  if (prefix.length === size) {
    output.push(prefix);
    return output;
  }
  for (let index = start; index <= numbers.length - (size - prefix.length); index += 1) {
    combinations(numbers, size, index + 1, [...prefix, numbers[index]], output);
  }
  return output;
}

function mapToRows(map) {
  return Array.from(map.entries())
    .map(([clave, valor]) => ({ clave, valor }))
    .sort((a, b) => b.valor - a.valor || a.clave.localeCompare(b.clave));
}

function minValue(values) {
  const filtered = values.filter(Boolean).sort();
  return filtered[0] || null;
}

function maxValue(values) {
  const filtered = values.filter(Boolean).sort();
  return filtered[filtered.length - 1] || null;
}
