import { auth } from '../firebase.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged,
  setPersistence, browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
export const login = (email, password) =>
  setPersistence(auth, browserSessionPersistence)
    .then(() => signInWithEmailAndPassword(auth, email.trim(), password));
export const logout = () => signOut(auth);
export const watchAuth = callback => onAuthStateChanged(auth,callback);
export function firebaseAuthMessage(error) {
 switch(error?.code) {
  case 'auth/invalid-credential': return 'Correo o contraseña incorrectos.';
  case 'auth/user-disabled': return 'Este usuario está deshabilitado.';
  case 'auth/too-many-requests': return 'Demasiados intentos. Intenta nuevamente más tarde.';
  case 'auth/network-request-failed': return 'No fue posible conectarse con Firebase.';
  default: return 'No fue posible iniciar sesión. Verifica los datos e inténtalo nuevamente.';
 }
}
