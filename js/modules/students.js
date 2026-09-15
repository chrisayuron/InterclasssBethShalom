/*
 * INVICTUS — Dominio de jugadores
 *
 * La colección histórica /students se mantiene como fuente única de jugadores.
 * Un jugador puede ser Estudiante o Profesor.
 * El ID es único para todos y conserva el formato BS001, BS002...
 */

export function formatStudentId(number) {
  if (!Number.isInteger(number) || number < 1 || number > 999) {
    throw new Error('El número debe estar entre 1 y 999.');
  }
  return `BS${String(number).padStart(3, '0')}`;
}

export function studentIdFromNumber(number) {
  return formatStudentId(Number(number));
}

export function nextStudentId(existingIds = []) {
  const numbers = existingIds
    .filter(id => /^BS\d{3}$/.test(id))
    .map(id => Number(id.slice(2)))
    .filter(Number.isInteger);

  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return formatStudentId(next);
}

import { groupForCourse } from './disciplines.js';

export function createStudent(data, existingIds = []) {
  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  const playerType = data.playerType === 'Profesor' ? 'Profesor' : 'Estudiante';

  if (!firstName || !lastName) {
    throw new Error('Los nombres y apellidos son obligatorios.');
  }

  let course = String(data.course || '').trim();
  let competitionGroup = String(data.competitionGroup || '').trim();

  if (playerType === 'Estudiante') {
    if (!course) throw new Error('Debes seleccionar el curso.');

    competitionGroup = groupForCourse(course);
    if (!competitionGroup) {
      throw new Error('No existe un grupo de competencia configurado para ese curso.');
    }
  } else {
    course = '';
    competitionGroup = competitionGroup || 'Profesores';
  }

  return {
    id: data.id || nextStudentId(existingIds),
    playerType,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    course,
    competitionGroup,
    photo: data.photo || '',
    active: data.active !== false,
    sports: Array.isArray(data.sports) ? data.sports : [],
    createdAt: data.createdAt || new Date().toISOString()
  };
}
