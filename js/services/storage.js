/*
 * INVICTUS — Servicio de almacenamiento
 * Abstracción para fotografías.
 *
 * Por ahora devuelve la URL local seleccionada.
 * Firebase Storage se conectará aquí posteriormente.
 */

export async function preparePhoto(file) {
  if (!(file instanceof File)) return '';

  // Solo para previsualización local.
  return URL.createObjectURL(file);
}
