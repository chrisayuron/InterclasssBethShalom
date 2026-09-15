/*
 * INVICTUS — Sistema
 * Contador persistente de estudiantes y reinicio del entorno de pruebas.
 */

import { db } from '../firebase.js';

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const COUNTER_REF = doc(db, 'system', 'counters');

export async function getStudentCounter() {
  const snapshot = await getDoc(COUNTER_REF);

  if (!snapshot.exists()) {
    return 1;
  }

  const value = Number(snapshot.data().playerNextNumber ?? snapshot.data().studentNextNumber);

  return Number.isInteger(value) && value > 0 ? value : 1;
}

export async function setStudentCounter(nextNumber) {
  await setDoc(
    COUNTER_REF,
    {
      playerNextNumber: Number(nextNumber),
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

/*
 * Reserva atómicamente el siguiente número de jugador.
 * Si el contador no existe, el primer número es 1 (BS001).
 */
export async function reserveNextStudentNumber() {
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(COUNTER_REF);

    const stored = snapshot.exists()
      ? Number(snapshot.data().playerNextNumber ?? snapshot.data().studentNextNumber)
      : 1;

    const current = Number.isInteger(stored) && stored > 0 ? stored : 1;

    transaction.set(
      COUNTER_REF,
      {
        playerNextNumber: current + 1,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return current;
  });
}

/**
 * Reserva un rango contiguo de números de jugador en una sola transacción.
 * Esto evita ejecutar una transacción independiente por cada estudiante
 * durante una importación masiva y reduce drásticamente la contención del
 * contador /system/counters.
 */
export async function reserveStudentNumberRange(quantity) {
  const count = Number(quantity);

  if (!Number.isInteger(count) || count < 1) {
    throw new Error('La cantidad de estudiantes a reservar no es válida.');
  }

  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(COUNTER_REF);

    const stored = snapshot.exists()
      ? Number(snapshot.data().playerNextNumber ?? snapshot.data().studentNextNumber)
      : 1;

    const firstNumber = Number.isInteger(stored) && stored > 0 ? stored : 1;

    transaction.set(
      COUNTER_REF,
      {
        playerNextNumber: firstNumber + count,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return firstNumber;
  });
}

/*
 * Reserva atómicamente el siguiente número de disciplina.
 * Las disciplinas utilizan el formato DISC001, DISC002, ...
 */
export async function reserveNextDisciplineNumber() {
  const disciplineCounterRef = doc(db, 'system', 'disciplineCounter');

  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(disciplineCounterRef);

    const stored = snapshot.exists()
      ? Number(snapshot.data().disciplineNextNumber)
      : 1;

    const current = Number.isInteger(stored) && stored > 0 ? stored : 1;

    transaction.set(
      disciplineCounterRef,
      {
        disciplineNextNumber: current + 1,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return current;
  });
}

/*
 * Reserva atómicamente el siguiente número de equipo.
 * Los equipos utilizan el formato EQ001, EQ002, ...
 */
export async function reserveNextTeamNumber() {
  const teamCounterRef = doc(db, 'system', 'teamCounter');

  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(teamCounterRef);

    const stored = snapshot.exists()
      ? Number(snapshot.data().teamNextNumber)
      : 1;

    const current = Number.isInteger(stored) && stored > 0 ? stored : 1;

    transaction.set(
      teamCounterRef,
      {
        teamNextNumber: current + 1,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return current;
  });
}

/*
 * Reinicio exclusivo del entorno de pruebas.
 * Las colecciones se mantienen centralizadas aquí para poder ampliar
 * la lista cuando construyamos equipos, partidos, resultados, etc.
 */
export async function resetAllTestData() {
  // Colecciones de datos del torneo. Las reglas de Firestore ya contemplan
  // desde ahora estas colecciones, aunque algunas todavía estén por construir.
  // Si una colección no tiene documentos, getDocs() devuelve una lista vacía.
  const collections = [
    'students',
    'teams',
    'matches',
    'results',
    'standings',
    'statistics',
    'schedule'
  ];

  for (const collectionName of collections) {
    let snapshot;

    try {
      snapshot = await getDocs(
        collection(db, collectionName)
      );
    } catch (error) {
      throw new Error(
        `No fue posible acceder a la colección "${collectionName}". ` +
        `Verifica las reglas de Firestore. ${error.message}`
      );
    }

    let batch = writeBatch(db);
    let operations = 0;

    for (const item of snapshot.docs) {
      batch.delete(item.ref);
      operations++;

      if (operations === 500) {
        await batch.commit();
        batch = writeBatch(db);
        operations = 0;
      }
    }

    if (operations > 0) {
      await batch.commit();
    }
  }

  // Eliminar completamente el contador. El siguiente registro partirá
  // inequívocamente desde 1 (BS001).
  try {
    await deleteDoc(COUNTER_REF);
  } catch (error) {
    throw new Error(
      'No fue posible reiniciar el contador system/counters. ' +
      `Verifica las reglas de Firestore para system/counters. ${error.message}`
    );
  }

  const teamCounterRef = doc(db, 'system', 'teamCounter');

  try {
    await deleteDoc(teamCounterRef);
  } catch (error) {
    throw new Error(
      'No fue posible reiniciar el contador de equipos system/teamCounter. ' +
      `Verifica las reglas de Firestore. ${error.message}`
    );
  }

  const disciplineCounterRef = doc(db, 'system', 'disciplineCounter');

  try {
    await deleteDoc(disciplineCounterRef);
  } catch (error) {
    throw new Error(
      'No fue posible reiniciar el contador de disciplinas system/disciplineCounter. ' +
      `Verifica las reglas de Firestore. ${error.message}`
    );
  }

  const counterAfterReset = await getDoc(COUNTER_REF);
  if (counterAfterReset.exists()) {
    throw new Error(
      'No fue posible reiniciar completamente la numeración de estudiantes.'
    );
  }
}
