import { describe, it, expect } from 'vitest';
import { FURNITURE_CATALOG_RAG } from '../src/data/furnitureCatalogRAG.js';

describe('Dataset Cardinality & Diversity - Catálogo de 120 Piezas con 4 a 6 Etiquetas', () => {
  it('el catálogo contiene exactamente 120 piezas únicas sin duplicidades', () => {
    expect(FURNITURE_CATALOG_RAG.length).toBe(120);

    const ids = new Set(FURNITURE_CATALOG_RAG.map(p => p.id));
    expect(ids.size).toBe(120);

    const names = new Set(FURNITURE_CATALOG_RAG.map(p => p.name.toLowerCase()));
    expect(names.size).toBe(120);
  });

  it('cada mueble tiene entre 4 y 6 etiquetas (mínimo 4, máximo 6)', () => {
    FURNITURE_CATALOG_RAG.forEach(piece => {
      expect(Array.isArray(piece.tags)).toBe(true);
      expect(piece.tags.length).toBeGreaterThanOrEqual(4);
      expect(piece.tags.length).toBeLessThanOrEqual(6);

      // Sin etiquetas repetidas dentro del mismo mueble
      const uniqueTags = new Set(piece.tags);
      expect(uniqueTags.size).toBe(piece.tags.length);
    });
  });

  it('distribución equilibrada en las 6 categorías arquitectónicas (20 por categoría)', () => {
    const categories = ['Asientos', 'Mesas', 'Almacenaje', 'Iluminación', 'Dormitorio', 'Accesorios'];
    categories.forEach(cat => {
      const count = FURNITURE_CATALOG_RAG.filter(p => p.category === cat).length;
      expect(count, `Categoría ${cat} debería tener 20 muebles`).toBe(20);
    });
  });

  it('todas las 120 piezas del dataset utilizan la imagen local foto mueble.png', () => {
    FURNITURE_CATALOG_RAG.forEach(piece => {
      expect(piece.imageUrl).toBe('/foto mueble.png');
    });
  });
});
