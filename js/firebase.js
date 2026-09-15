/*
 * INVICTUS 2026 — Firebase
 * Conexión centralizada a Firebase / Firestore.
 *
 * Importante:
 * - Los datos se guardan en Firestore.
 * - Las fotografías se guardan en Firebase Storage cuando está disponible.
 * - Se conserva un fallback comprimido en Firestore para que una foto no
 *   desaparezca si Storage todavía no está habilitado en el proyecto.
 */

import { initializeApp } from
  'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';

import { getFirestore } from
  'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

import { getAuth } from
  'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

import { getStorage } from
  'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';

export const firebaseConfig = {
  apiKey: "AIzaSyDQdAK9ciB7izrOow_za9ShZEVRve9zykk",
  authDomain: "invictus-1e268.firebaseapp.com",
  projectId: "invictus-1e268",
  storageBucket: "invictus-1e268.firebasestorage.app",
  messagingSenderId: "932725849204",
  appId: "1:932725849204:web:b374e558613bdd50eba521"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

console.info(
  '[INVICTUS] Firebase inicializado:',
  firebaseConfig.projectId
);
