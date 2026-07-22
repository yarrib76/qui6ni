const MONTHS = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12
};

export function parseSpanishDate(value) {
  if (!value) return null;
  const numeric = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (numeric) {
    return toIsoDate(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));
  }

  const lowered = value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const long = lowered.match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/);
  if (long && MONTHS[long[2]]) {
    return toIsoDate(Number(long[3]), MONTHS[long[2]], Number(long[1]));
  }

  return null;
}

export function toIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function nowSql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function formatDurationMs(startMs) {
  return Date.now() - startMs;
}
