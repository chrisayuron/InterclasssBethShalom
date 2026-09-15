/*
 * Herramientas de integridad de estudiantes.
 * No se ejecutan automáticamente.
 */

export function validateStudentIdentity(student) {
  const id = String(student?.id || '').trim();
  const firstName = String(student?.firstName || '').trim();
  const lastName = String(student?.lastName || '').trim();

  return {
    valid: Boolean(id && firstName && lastName),
    id,
    fullName: `${firstName} ${lastName}`.trim()
  };
}
