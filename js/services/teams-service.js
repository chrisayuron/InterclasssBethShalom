/*
 * INVICTUS — Servicio de equipos
 * Los equipos pertenecen a una disciplina y a un grupo de competencia.
 */

import { db } from '../firebase.js';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const COLLECTION = 'teams';

export async function getTeams() {
  const snapshot = await getDocs(collection(db, COLLECTION));

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function saveTeam(team) {
  const id = String(team.id || '').trim().toUpperCase();

  if (!id) {
    throw new Error('El equipo debe tener un ID.');
  }

  const payload = {
    ...team,
    id,
    members: Array.isArray(team.members) ? [...new Set(team.members)] : [],
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, COLLECTION, id), payload, { merge: true });

  return payload;
}

export async function deleteTeam(id) {
  await deleteDoc(doc(db, COLLECTION, String(id).trim().toUpperCase()));
}
