/**
 * ADAPTADOR DE PERSISTENCIA HÍBRIDA (REPOSITORY PATTERN)
 * Unifica las operaciones de datos: opera contra Firebase Firestore & Auth cuando hay credenciales,
 * o contra el motor local optimizado (LocalStorage / AuthService) cuando se ejecuta sin conexión / localmente.
 */

import { isFirebaseConfigured, getFirebaseServices } from '../config/firebase.js';
import { AuthService } from './authService.js';
import { StorageService } from './storage.js';

const STORAGE_ORDERS_KEY = "arch_furniture_orders_db";

export class DatabaseAdapter {
  /**
   * Indica si la aplicación está operando en la nube con Firebase
   */
  static isCloudMode() {
    return isFirebaseConfigured();
  }

  /**
   * Obtiene el usuario actual
   */
  static async getCurrentUser() {
    if (this.isCloudMode()) {
      try {
        const { auth, db, isReady } = await getFirebaseServices();
        if (isReady && auth && auth.currentUser) {
          const { doc, getDoc } = await import("firebase/firestore");
          const userDocRef = doc(db, "users", auth.currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            return { id: auth.currentUser.uid, ...snap.data() };
          }
        }
      } catch (err) {
        console.warn("Fallo al obtener usuario en Firestore, usando local:", err);
      }
    }

    return AuthService.getCurrentUser();
  }

  /**
   * Registro de un nuevo usuario
   */
  static async register(username, password, confirmPassword, tasteDescription = "") {
    // Modo Cloud con Firebase
    if (this.isCloudMode()) {
      try {
        const { auth, db, isReady } = await getFirebaseServices();
        if (isReady && auth && db) {
          if (!password || password.length < 6) {
            return { success: false, error: "Firebase requiere contraseñas de al menos 6 caracteres." };
          }
          if (password !== confirmPassword) {
            return { success: false, error: "Las contraseñas no coinciden." };
          }

          const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
          const { doc, setDoc } = await import("firebase/firestore");

          // Si el username no es email, se forma un alias para Firebase Auth
          const email = username.includes("@") ? username : `${username.toLowerCase().replace(/\s+/g, '')}@espacio-arq.local`;
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: username });

          const defaultDoc = {
            uid: cred.user.uid,
            username,
            email,
            tasteDescription: tasteDescription || "",
            profile: {
              room: "salón",
              budget: 4500,
              spent: 0,
              preferredStyle: "Japandi",
              preferredPalette: "terracota",
              styleWeights: {
                "Japandi": 1.0,
                "Minimalismo Cálido": 0.7,
                "Nórdico": 0.6,
                "Mid-Century Modern": 0.4,
                "Rústico Contemporáneo": 0.3,
                "Industrial Sutil": 0.2
              },
              paletteWeights: {
                "terracota": 1.0,
                "lino": 0.8,
                "roble": 0.7,
                "nogal": 0.4,
                "oliva": 0.5,
                "ocre": 0.6,
                "caliza": 0.7
              }
            },
            cestaIds: [],
            rejectedIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await setDoc(doc(db, "users", cred.user.uid), defaultDoc);
          return { success: true, user: { id: cred.user.uid, ...defaultDoc } };
        }
      } catch (err) {
        console.warn("Error en registro Firebase, recurriendo a local:", err);
        return { success: false, error: err.message || "Error al registrar en Firebase." };
      }
    }

    // Modo Local
    return AuthService.register(username, password, confirmPassword, tasteDescription);
  }

  /**
   * Inicio de sesión
   */
  static async login(username, password) {
    if (this.isCloudMode()) {
      try {
        const { auth, db, isReady } = await getFirebaseServices();
        if (isReady && auth && db) {
          const { signInWithEmailAndPassword } = await import("firebase/auth");
          const { doc, getDoc } = await import("firebase/firestore");

          const email = username.includes("@") ? username : `${username.toLowerCase().replace(/\s+/g, '')}@espacio-arq.local`;
          const cred = await signInWithEmailAndPassword(auth, email, password);

          const snap = await getDoc(doc(db, "users", cred.user.uid));
          const userData = snap.exists() ? snap.data() : { uid: cred.user.uid, username };

          return { success: true, user: { id: cred.user.uid, ...userData } };
        }
      } catch (err) {
        return { success: false, error: "Credenciales inválidas en Firebase: " + (err.code || err.message) };
      }
    }

    // Modo Local
    return AuthService.login(username, password);
  }

  /**
   * Cierre de sesión
   */
  static async logout() {
    if (this.isCloudMode()) {
      try {
        const { auth, isReady } = await getFirebaseServices();
        if (isReady && auth) {
          const { signOut } = await import("firebase/auth");
          await signOut(auth);
        }
      } catch (e) {
        console.warn("Error al cerrar sesión en Firebase:", e);
      }
    }

    return AuthService.logout();
  }

  /**
   * Sincronización de datos del usuario activo (perfil, cesta, gustos RAG)
   */
  static async syncUserData(profileData, cestaIds = [], rejectedIds = [], tasteDescription = null) {
    const currentUser = AuthService.getCurrentUser();
    
    // Sincronizar en LocalStorage siempre para persistencia y offline
    AuthService.syncCurrentUserData(profileData, cestaIds, rejectedIds, tasteDescription);

    // Sincronizar en Firestore si está conectado
    if (this.isCloudMode()) {
      try {
        const { auth, db, isReady } = await getFirebaseServices();
        if (isReady && auth && auth.currentUser && db) {
          const { doc, updateDoc } = await import("firebase/firestore");
          const userDocRef = doc(db, "users", auth.currentUser.uid);
          
          const updatePayload = {
            profile: profileData,
            cestaIds: [...cestaIds],
            rejectedIds: [...rejectedIds],
            updatedAt: new Date().toISOString()
          };
          if (tasteDescription !== null) {
            updatePayload.tasteDescription = tasteDescription;
          }

          await updateDoc(userDocRef, updatePayload);
        }
      } catch (err) {
        console.warn("No se pudo sincronizar en Firestore:", err);
      }
    }
  }

  /**
   * Guarda un pedido completado (Checkout & Ticket)
   */
  static async saveOrder(order) {
    const orders = this.getLocalOrders();
    orders.unshift(order);
    try {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.warn("Error al guardar pedido localmente:", e);
    }

    if (this.isCloudMode()) {
      try {
        const { db, isReady } = await getFirebaseServices();
        if (isReady && db) {
          const { collection, addDoc } = await import("firebase/firestore");
          await addDoc(collection(db, "orders"), order);
        }
      } catch (err) {
        console.warn("No se pudo guardar el pedido en Firestore:", err);
      }
    }

    return order;
  }

  /**
   * Obtiene pedidos guardados localmente
   */
  static getLocalOrders() {
    try {
      const data = localStorage.getItem(STORAGE_ORDERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }
}

