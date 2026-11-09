import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LANGUAGE_IMAGES, UI_TRANSLATIONS } from '../src/config/languages.js';

describe('Sincronización de Idiomas e Imágenes de Muebles', () => {
  it('define las 4 correspondencias de idioma requeridas', () => {
    expect(LANGUAGE_IMAGES.es).toBe('/foto mueble.png');
    expect(LANGUAGE_IMAGES.ca).toBe('/foto moble.png');
    expect(LANGUAGE_IMAGES.en).toBe('/photo furniture.png');
    expect(LANGUAGE_IMAGES.zh).toBe('/jiājù zhàopiàn.png');
  });

  it('los 4 archivos de imagen existen físicamente en la carpeta public/', () => {
    const publicDir = path.resolve(process.cwd(), 'public');
    
    const expectedFiles = [
      'foto mueble.png',
      'foto moble.png',
      'photo furniture.png',
      'jiājù zhàopiàn.png'
    ];

    expectedFiles.forEach(file => {
      const filePath = path.join(publicDir, file);
      expect(fs.existsSync(filePath), `Falta el archivo: ${file}`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(1000);
    });
  });

  it('las traducciones de UI cubren los 4 idiomas con placeholders válidos', () => {
    const langs = ['es', 'ca', 'en', 'zh'];
    langs.forEach(lang => {
      expect(UI_TRANSLATIONS[lang]).toBeDefined();
      expect(UI_TRANSLATIONS[lang].searchPlaceholder.length).toBeGreaterThan(10);
      expect(UI_TRANSLATIONS[lang].allCategory.length).toBeGreaterThan(3);
    });
  });
});
