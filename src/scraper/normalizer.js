export const MODALIDADES = Object.freeze({
  TRADICIONAL: 'TRADICIONAL',
  SEGUNDA: 'SEGUNDA'
});

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeNumbers(values) {
  return values
    .map((value) => Number.parseInt(String(value).trim(), 10))
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b);
}

export function detectModalidad(text) {
  const normalized = normalizeText(text);
  if (normalized.includes('tradicional') && normalized.includes('primer sorteo')) {
    return MODALIDADES.TRADICIONAL;
  }
  if (
    normalized.includes('segunda') &&
    (normalized.includes('quini') || normalized.includes('tradicional'))
  ) {
    return MODALIDADES.SEGUNDA;
  }
  return null;
}
