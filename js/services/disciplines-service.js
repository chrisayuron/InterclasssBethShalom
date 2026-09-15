/*
 * INVICTUS — Persistencia del catálogo de disciplinas
 */

import { db } from '../firebase.js';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const COLLECTION = 'disciplines';

export async function getDisciplines() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function saveDiscipline(discipline) {
  const id = String(discipline.id || '').trim().toUpperCase();
  if (!id) throw new Error('La disciplina debe tener un ID.');

  await setDoc(doc(db, COLLECTION, id), {
    ...discipline,
    id,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return { ...discipline, id };
}

export async function deleteDiscipline(id) {
  await deleteDoc(doc(db, COLLECTION, String(id).trim().toUpperCase()));
}
