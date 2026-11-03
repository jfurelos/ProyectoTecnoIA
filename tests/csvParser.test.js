import { describe, it, expect } from 'vitest';
import { CsvCatalogParser } from '../src/services/csvParser.js';

describe('CsvCatalogParser - Ingesta Universal de Catálogos CSV', () => {
  it('parsea un CSV delimitado por comas estándar con columnas de dimensiones', () => {
    const csv = `nombre,categoria,estancia,precio,estilo,color,ancho,alto,profundidad,materiales
Sofá Bauhaus,Asientos,salón,1200,Nórdico,Roble Claro,210,75,90,Roble macizo / Lino
Lámpara Zen,Iluminación,dormitorio,340,Japandi,Lino Natural,40,60,40,Papel washi / Bambú`;

    const result = CsvCatalogParser.parse(csv);
    expect(result.success).toBe(true);
    expect(result.items.length).toBe(2);

    const sofa = result.items[0];
    expect(sofa.name).toBe('Sofá Bauhaus');
    expect(sofa.category).toBe('Asientos');
    expect(sofa.price).toBe(1200);
    expect(sofa.dimensions.width).toBe(210);
    expect(sofa.dimensions.height).toBe(75);
    expect(sofa.dimensions.depth).toBe(90);
    expect(sofa.materials).toContain('Roble macizo');
  });

  it('parsea un CSV delimitado por punto y coma (formato Excel en español)', () => {
    const csv = `producto;categoria;espacio;pvp;estilo;tono;medidas;acabado
Mesa Monolito;Mesas;comedor;1450 €;Minimalismo Cálido;Caliza Crema;200x75x90;Mortero de cal
Aparador Arcos;Almacenaje;salón;1800;Mid-Century Modern;Nogal Ahumado;180x70x45;Nogal canaletto`;

    const result = CsvCatalogParser.parse(csv);
    expect(result.success).toBe(true);
    expect(result.items.length).toBe(2);

    const mesa = result.items[0];
    expect(mesa.name).toBe('Mesa Monolito');
    expect(mesa.price).toBe(1450);
    expect(mesa.dimensions.width).toBe(200);
    expect(mesa.dimensions.height).toBe(75);
    expect(mesa.dimensions.depth).toBe(90);
    expect(mesa.paletteKey).toBe('caliza');
  });

  it('infiere correctamente la paleta cromática a partir de color y estilo', () => {
    expect(CsvCatalogParser.inferPaletteKey('Terracota viva', 'Rústico')).toBe('terracota');
    expect(CsvCatalogParser.inferPaletteKey('Verde oliva seco', 'Orgánico')).toBe('oliva');
    expect(CsvCatalogParser.inferPaletteKey('Roble blanqueado', 'Nórdico')).toBe('roble');
    expect(CsvCatalogParser.inferPaletteKey('Nogal oscuro', 'Mid-century')).toBe('nogal');
    expect(CsvCatalogParser.inferPaletteKey('Piedra caliza', 'Minimalismo')).toBe('caliza');
  });

  it('lanza error informativo ante entradas vacías o sin filas de datos', () => {
    expect(() => CsvCatalogParser.parse('')).toThrow('vacío o no es válido');
    expect(() => CsvCatalogParser.parse('nombre,precio,estilo')).toThrow('al menos una cabecera y una fila');
  });
});

