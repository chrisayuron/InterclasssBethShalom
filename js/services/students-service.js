/*
 * INVICTUS — Persistencia de estudiantes
 *
 * Firestore:
 * /students/{BS001}
 *
 * La fotografía es solamente una ruta/URL.
 * El archivo físico permanecerá en assets/students/.
 */

import { db } from '../firebase.js';

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const COLLECTION = 'students';

export async function getStudents() {
  console.info('[INVICTUS] Leyendo Firestore: /students');

  const snapshot = await getDocs(
    collection(db, COLLECTION)
  );

  console.info(
    `[INVICTUS] Estudiantes encontrados: ${snapshot.size}`
  );

  return snapshot.docs
    .map(item => item.data())
    .sort((a, b) =>
      String(a.id).localeCompare(
        String(b.id),
        'es',
        { numeric: true }
      )
    );
}

export async function saveStudent(student) {
  const reference = doc(
    db,
    COLLECTION,
    student.id
  );

  await setDoc(reference, {
    ...student,
    updatedAt: new Date().toISOString()
  });

  return student;
}

export async function deleteStudent(studentId) {
  await deleteDoc(
    doc(db, COLLECTION, studentId)
  );
}

export async function studentExists(studentId) {
  const students = await getStudents();

  return students.some(
    student => student.id === studentId
  );
}


export async function saveStudentsBatch(students) {
  if (!Array.isArray(students) || !students.length) {
    return;
  }

  if (students.length > 500) {
    throw new Error('Firestore permite hasta 500 operaciones por lote.');
  }

  const batch = writeBatch(db);

  students.forEach(student => {
    if (!student?.id) {
      throw new Error('Se encontró un estudiante sin ID.');
    }

    batch.set(
      doc(db, COLLECTION, student.id),
      {
        ...student,
        updatedAt: new Date().toISOString()
      }
    );
  });

  await batch.commit();
}
