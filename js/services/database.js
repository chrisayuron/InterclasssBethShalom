/*
 * INVICTUS — Servicio de datos
 *
 * La interfaz y los módulos de negocio no deben hablar directamente
 * con Firestore. Esta capa será reemplazada por las operaciones reales.
 */

const memoryStore = new Map();

export async function getCollection(name) {
  return memoryStore.get(name) || [];
}

export async function saveCollection(name, records) {
  memoryStore.set(name, [...records]);
  return [...records];
}

export async function createRecord(collection, record) {
  const current = await getCollection(collection);
  current.push(record);
  await saveCollection(collection, current);
  return record;
}
