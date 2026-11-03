/**
 * SERVICIO DE AUTENTICACIÓN Y GESTIÓN DE CUENTAS DE USUARIO
 * Gestión de registro con validación anti-duplicidad, inicio de sesión y sincronización de Cesta.
 */

const STORAGE_USERS_KEY = "arch_furniture_users_db";
const STORAGE_CURRENT_USER_KEY = "arch_furniture_current_user_id";

export class AuthService {
  /**
   * Obtiene la lista completa de usuarios registrados
   */
  static getUsers() {
    try {
      const data = localStorage.getItem(STORAGE_USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error al leer base de datos de usuarios:", e);
      return [];
    }
  }

  /**
   * Guarda la lista de usuarios en localStorage
   */
  static saveUsers(users) {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error("Error al persistir usuarios:", e);
    }
  }

  /**
   * Obtiene el usuario activo actualmente
   */
  static getCurrentUser() {
    try {
      const currentId = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (!currentId) return null;
      const users = this.getUsers();
      return users.find(u => u.id === currentId) || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Registra una nueva cuenta comprobando duplicidad y requisitos
   */
  static register(username, password, confirmPassword, tasteDescription = "") {
    const cleanUsername = (username || "").trim();
    const cleanPassword = (password || "").trim();
    const cleanTasteDescription = (tasteDescription || "").trim();

    // 1. Validaciones de nombre de usuario
    if (!cleanUsername) {
      return { success: false, error: "El nombre de usuario es obligatorio." };
    }
    if (cleanUsername.length < 3) {
      return { success: false, error: "El nombre debe tener al menos 3 caracteres." };
    }
    if (!/^[a-zA-Z0-9_\sáéíóúÁÉÍÓÚñÑ]+$/.test(cleanUsername)) {
      return { success: false, error: "El nombre solo puede contener letras, números y espacios." };
    }

    // 2. Comprobación estricta de NO duplicidad (case-insensitive)
    const users = this.getUsers();
    const existing = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (existing) {
      return { 
        success: false, 
        error: `Ya existe una cuenta registrada con el nombre "${cleanUsername}". Por favor, elige otro o inicia sesión.` 
      };
    }

    // 3. Validaciones de contraseña
    if (!cleanPassword) {
      return { success: false, error: "La contraseña es obligatoria." };
    }
    if (cleanPassword.length < 4) {
      return { success: false, error: "La contraseña debe tener un mínimo de 4 caracteres." };
    }
    if (cleanPassword !== confirmPassword) {
      return { success: false, error: "Las contraseñas no coinciden." };
    }

    // 4. Crear nuevo usuario con su estado de perfil y cesta propia
    const newUser = {
      id: "usr-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      password: cleanPassword,
      tasteDescription: cleanTasteDescription,
      createdAt: new Date().toISOString(),
      profile: {
        userName: cleanUsername,
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
        },
        materialWeights: {
          "Lino belga": 0.8,
          "Roble macizo": 0.9,
          "Mármol travertino": 0.6,
          "Cerámica": 0.7
        }
      },
      cestaIds: [],
      rejectedIds: []
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setCurrentUserId(newUser.id);

    return { success: true, user: newUser };
  }

  /**
   * Inicia sesión con comprobación de credenciales
   */
  static login(username, password) {
    const cleanUsername = (username || "").trim();
    const cleanPassword = (password || "").trim();

    if (!cleanUsername || !cleanPassword) {
      return { success: false, error: "Por favor, completa usuario y contraseña." };
    }

    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());

    if (!user) {
      return { 
        success: false, 
        error: `No encontramos ninguna cuenta con el usuario "${cleanUsername}". Comprueba el nombre o regístrate.` 
      };
    }

    if (user.password !== cleanPassword) {
      return { success: false, error: "Contraseña incorrecta. Inténtalo de nuevo." };
    }

    this.setCurrentUserId(user.id);
    return { success: true, user };
  }

  /**
   * Cierra la sesión activa
   */
  static logout() {
    try {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Establece el ID de usuario activo
   */
  static setCurrentUserId(userId) {
    try {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, userId);
    } catch (e) {
      console.error("Error guardando sesión activa:", e);
    }
  }

  /**
   * Guarda los datos actualizados del usuario (perfil, cesta, rechazados, gustos RAG)
   */
  static syncCurrentUserData(profileData, cestaIds = [], rejectedIds = [], tasteDescription = null) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const users = this.getUsers();
    const index = users.findIndex(u => u.id === currentUser.id);

    if (index !== -1) {
      users[index].profile = { ...users[index].profile, ...profileData };
      users[index].cestaIds = [...cestaIds];
      users[index].rejectedIds = [...rejectedIds];
      if (tasteDescription !== null && tasteDescription !== undefined) {
        users[index].tasteDescription = tasteDescription;
      }
      this.saveUsers(users);
    }
  }
}
