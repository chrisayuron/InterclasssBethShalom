/*
 * INVICTUS — Contadores públicos
 *
 * El catálogo de disciplinas y categorías del torneo es oficial y
 * hardcodeado. Por eso estos valores NO se calculan desde /disciplines.
 *
 * Jugadores: /students donde active == true.
 * Deportes oficiales: 3.
 * Videojuegos oficiales: 4.
 * Categorías oficiales: 5 (se representa directamente en app.js).
 */

import { db } from '../firebase.js';
import {
  collection, query, where, getCountFromServer
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const OFFICIAL_COUNTERS = Object.freeze({
  sports: 3,
  videoGames: 4
});

async function countActiveStudents() {
  const q = query(collection(db, 'students'), where('active', '==', true));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

export async function getPublicCounters() {
  try {
    const players = await countActiveStudents();
    const counters = {
      players,
      sports: OFFICIAL_COUNTERS.sports,
      videoGames: OFFICIAL_COUNTERS.videoGames
    };

    console.log('[INVICTUS] Contadores públicos: jugadores desde Firestore; disciplinas desde catálogo oficial:', counters);
    return counters;
  } catch (error) {
    throw new Error(
      `No fue posible calcular el contador público de jugadores. ${error.message}`
    );
  }
}

/*
 * Se conserva por compatibilidad con la interfaz administrativa.
 * No escribe ni consulta una copia persistente de los contadores.
 */
export async function syncPublicCounters() {
  const counters = await getPublicCounters();
  console.log('[INVICTUS] Recalculo solicitado. Catálogo oficial aplicado:', counters);
  return counters;
}

export async function resetPublicCounters() {
  console.log('[INVICTUS] No se requiere reset de contadores: jugadores se deriva de /students y disciplinas/categorías son oficiales.');
}
