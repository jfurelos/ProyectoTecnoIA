/**
 * SERVICIO DE PERSISTENCIA LOCAL (STORAGE)
 * Mantiene el estado del usuario, catálogo y preferencias entre sesiones.
 */

const STORAGE_KEYS = {
  PROFILE: "arch_furniture_profile",
  CATALOG: "arch_furniture_catalog",
  THEME: "arch_furniture_theme",
  ONBOARDING_DONE: "arch_furniture_onboarding_done"
};

export class StorageService {
  static saveProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn("No se pudo guardar el perfil en localStorage:", e);
    }
  }

  static getProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  static saveCatalog(items) {
    try {
      localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(items));
    } catch (e) {
      console.warn("No se pudo guardar el catálogo en localStorage:", e);
    }
  }

  static getCatalog() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATALOG);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  static saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {
      console.warn("No se pudo guardar el tema:", e);
    }
  }

  static getTheme() {
    try {
      return localStorage.getItem(STORAGE_KEYS.THEME) || "autumn-default";
    } catch (e) {
      return "autumn-default";
    }
  }

  static setOnboardingCompleted(completed = true) {
    try {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, completed ? "true" : "false");
    } catch (e) {
      console.warn("Error guardando estado onboarding:", e);
    }
  }

  static isOnboardingCompleted() {
    try {
      return localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === "true";
    } catch (e) {
      return false;
    }
  }

  static clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.CATALOG);
      localStorage.removeItem(STORAGE_KEYS.ONBOARDING_DONE);
    } catch (e) {
      console.warn("Error limpiando almacenamiento:", e);
    }
  }
}
