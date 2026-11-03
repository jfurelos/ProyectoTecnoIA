/**
 * CONFIGURACIÓN DE FIREBASE (PLUG-AND-PLAY)
 * Detecta automáticamente si las variables de entorno están presentes y son válidas.
 * Si faltan o están vacías, expone funciones nulas seguras para evitar errores en tiempo de ejecución.
 */

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || ""
};

/**
 * Comprueba si Firebase cuenta con credenciales válidas
 */
export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes("tu_api_key") &&
    firebaseConfig.apiKey.length > 10
  );
}

let appInstance = null;
let authInstance = null;
let dbInstance = null;
let firebaseInitialized = false;

/**
 * Inicialización perezosa (lazy) de Firebase SDK
 */
export async function getFirebaseServices() {
  if (!isFirebaseConfigured()) {
    return { app: null, auth: null, db: null, isReady: false };
  }

  if (firebaseInitialized) {
    return { app: appInstance, auth: authInstance, db: dbInstance, isReady: true };
  }

  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getAuth } = await import("firebase/auth");
    const { getFirestore } = await import("firebase/firestore");

    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    firebaseInitialized = true;

    console.info("⚡ [ESPACIO] Firebase Firestore y Auth inicializados con éxito.");
    return { app: appInstance, auth: authInstance, db: dbInstance, isReady: true };
  } catch (error) {
    console.warn("⚠️ [ESPACIO] No se pudo inicializar Firebase. Operando en modo local fallback:", error);
    return { app: null, auth: null, db: null, isReady: false };
  }
}

export { firebaseConfig };

