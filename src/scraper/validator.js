import { MODALIDADES } from './normalizer.js';

export function validateNumbers(numbers) {
  const errors = [];
  if (!Array.isArray(numbers) || numbers.length !== 6) {
    errors.push('La jugada debe contener exactamente seis numeros.');
    return errors;
  }

  const unique = new Set(numbers);
  if (unique.size !== numbers.length) {
    errors.push('La jugada contiene numeros repetidos.');
  }

  for (const number of numbers) {
    if (!Number.isInteger(number)) errors.push(`Numero invalido: ${number}.`);
    if (number < 0 || number > 45) errors.push(`Numero fuera de rango 0-45: ${number}.`);
  }

  return errors;
}

export function validateParsedDraw(draw) {
  const errors = [];
  if (!draw || typeof draw !== 'object') return ['No se pudo parsear el sorteo.'];
  if (!Number.isInteger(draw.numeroSorteo) || draw.numeroSorteo <= 0) {
    errors.push('Numero de sorteo invalido.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draw.fechaSorteo || '')) {
    errors.push('Fecha de sorteo invalida.');
  }

  for (const modalidad of [MODALIDADES.TRADICIONAL, MODALIDADES.SEGUNDA]) {
    const jugada = draw.jugadas?.[modalidad];
    if (!jugada) {
      errors.push(`Falta modalidad ${modalidad}.`);
    } else {
      errors.push(...validateNumbers(jugada).map((message) => `${modalidad}: ${message}`));
    }
  }

  return errors;
}
