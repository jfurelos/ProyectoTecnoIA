import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../src/services/authService.js';

// Setup de localStorage en entorno de test si no está presente
if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

describe('AuthService - Autenticación y Cuentas de Usuario', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('permite registrar un usuario con tasteDescription y perfil por defecto', () => {
    const res = AuthService.register(
      'Elena_Arq',
      'claveSegura123',
      'claveSegura123',
      'Minimalismo cálido con roble y lino'
    );

    expect(res.success).toBe(true);
    expect(res.user.username).toBe('Elena_Arq');
    expect(res.user.tasteDescription).toBe('Minimalismo cálido con roble y lino');
    expect(res.user.profile.room).toBe('salón');
    expect(Array.isArray(res.user.cestaIds)).toBe(true);
  });

  it('rechaza el registro si el nombre de usuario ya existe (case-insensitive)', () => {
    AuthService.register('CarlosArq', 'pass123', 'pass123');

    const duplicateRes = AuthService.register('carlosarq', 'otroPass456', 'otroPass456');
    expect(duplicateRes.success).toBe(false);
    expect(duplicateRes.error).toContain('Ya existe una cuenta registrada');
  });

  it('valida que las contraseñas coincidan y tengan longitud mínima', () => {
    const shortPassRes = AuthService.register('NuevoUser', '12', '12');
    expect(shortPassRes.success).toBe(false);
    expect(shortPassRes.error).toContain('mínimo de 4 caracteres');

    const mismatchRes = AuthService.register('NuevoUser', 'pass123', 'pass999');
    expect(mismatchRes.success).toBe(false);
    expect(mismatchRes.error).toContain('no coinciden');
  });

  it('permite iniciar sesión con credenciales correctas y rechaza con erróneas', () => {
    AuthService.register('MarcosDesign', 'secreto88', 'secreto88');

    const successLogin = AuthService.login('MarcosDesign', 'secreto88');
    expect(successLogin.success).toBe(true);
    expect(successLogin.user.username).toBe('MarcosDesign');

    const wrongPass = AuthService.login('MarcosDesign', 'passwordEquivocado');
    expect(wrongPass.success).toBe(false);
    expect(wrongPass.error).toContain('Contraseña incorrecta');

    const nonExistent = AuthService.login('UsuarioInexistente', 'clave123');
    expect(nonExistent.success).toBe(false);
    expect(nonExistent.error).toContain('No encontramos ninguna cuenta');
  });

  it('sincroniza los datos del usuario incluyendo la descripción de gustos RAG', () => {
    const reg = AuthService.register('SofiaEstudio', 'studio2026', 'studio2026');
    expect(reg.success).toBe(true);

    AuthService.syncCurrentUserData(
      { room: 'dormitorio', budget: 6000, spent: 1200 },
      ['rag-furn-001', 'rag-furn-002'],
      ['rag-furn-009'],
      'Espacio nórdico diáfano con techos altos'
    );

    const currentUser = AuthService.getCurrentUser();
    expect(currentUser.profile.room).toBe('dormitorio');
    expect(currentUser.profile.budget).toBe(6000);
    expect(currentUser.cestaIds).toEqual(['rag-furn-001', 'rag-furn-002']);
    expect(currentUser.tasteDescription).toBe('Espacio nórdico diáfano con techos altos');
  });
});

