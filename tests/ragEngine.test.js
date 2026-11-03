import { describe, it, expect, beforeEach } from 'vitest';
import { RagEngine, STRUCTURAL_STOPWORDS } from '../src/services/ragEngine.js';

describe('RagEngine - Motor Semántico Vectorial Arquitectónico', () => {
  const sampleCatalog = [
    {
      id: 'furn-01',
      name: 'Sofá Kumo en Lino Crudo',
      category: 'Asientos',
      room: 'salón',
      price: 1850,
      style: 'Japandi',
      color: 'Lino Natural',
      paletteKey: 'lino',
      dimensions: { width: 240, height: 72, depth: 98 },
      materials: ['Lino belga', 'Roble macizo'],
      tags: ['Japandi', 'Lino Belga', 'Tatami'],
      description: 'Geometría horizontal baja con asiento suspendido inspirada en tatamis y ryokan tradicionales.',
      architecturalDetail: 'Perfil bajo de reposo zen con luz difusa.',
      ragContext: 'Sofá bajo zen ryokan japonés en lino crudo y roble claro para salón sereno y contemplativo.'
    },
    {
      id: 'furn-02',
      name: 'Mesa de Comedor Templo en Roble',
      category: 'Mesas',
      room: 'comedor',
      price: 1420,
      style: 'Nórdico',
      color: 'Roble Claro',
      paletteKey: 'roble',
      dimensions: { width: 220, height: 75, depth: 95 },
      materials: ['Roble macizo', 'Barniz biológico'],
      tags: ['Nórdico', 'Roble Macizo'],
      description: 'Sobre continuo de madera rubia y patas prismáticas a inglete.',
      architecturalDetail: 'Capacidad para 8 comensales con separación axial de 65cm.',
      ragContext: 'Mesa comedor diáfana en roble macizo nórdico con luz cenital para reuniones familiares.'
    },
    {
      id: 'furn-03',
      name: 'Escritorio Industrial Taller en Acero y Cuero',
      category: 'Mesas',
      room: 'estudio',
      price: 890,
      style: 'Industrial Sutil',
      color: 'Nogal Oscuro',
      paletteKey: 'nogal',
      dimensions: { width: 150, height: 75, depth: 75 },
      materials: ['Acero pavonado', 'Cuero vegetal', 'Nogal'],
      tags: ['Industrial Sutil', 'Acero Pavonado', 'Cuero Vegetal'],
      description: 'Estructura rígida de perfilería oscura y sobre tapizado en piel.',
      architecturalDetail: 'Electrificación integrada sin cables visibles.',
      ragContext: 'Escritorio técnico sobrio loft industrial con perfiles de acero negro y cuero para estudio de arquitectura.'
    }
  ];

  let rag;

  beforeEach(() => {
    rag = new RagEngine(sampleCatalog);
  });

  it('normaliza y tokeniza texto eliminando acentos, stopwords y palabras estructurales como "estilo"', () => {
    const raw = '¡Busco un estilo con categoria de muebles y piezas de arquitectura sereno con roble!';
    const tokens = RagEngine.tokenize(raw);

    // Debe contener términos sustantivos
    expect(tokens).toContain('sereno');
    expect(tokens).toContain('roble');

    // NUNCA debe contener palabras estructurales prohibidas
    expect(tokens).not.toContain('estilo');
    expect(tokens).not.toContain('categoria');
    expect(tokens).not.toContain('muebles');
    expect(tokens).not.toContain('piezas');
    expect(tokens).not.toContain('arquitectura');
    expect(tokens).not.toContain('busco');
  });

  it('calcula la similitud coseno alta para descripciones afines a un mueble zen/ryokan', () => {
    const query = 'Busco un salón sereno con luz tenue y maderas claras que me recuerde a un ryokan japonés';
    const { vector: qVec, norm: qNorm } = rag.vectorizeQuery(query);

    const simZen = rag.calculateCosineSimilarity(qVec, qNorm, 'furn-01');
    const simIndustrial = rag.calculateCosineSimilarity(qVec, qNorm, 'furn-03');

    expect(simZen).toBeGreaterThan(simIndustrial);
    expect(simZen).toBeGreaterThan(0.18);
    expect(simIndustrial).toBeLessThan(0.05);
  });

  it('proporciona amplia dispersión de porcentajes de matching evitando scores homogéneos', () => {
    const results = rag.searchAndRerank({
      userTasteDescription: 'Salón zen con tatami y lino japonés',
      targetRoom: 'salón',
      budgetTotal: 4500,
      budgetSpent: 0
    });

    const bestMatch = results.find(r => r.id === 'furn-01');
    const irrelevantMatch = results.find(r => r.id === 'furn-03');

    expect(bestMatch).toBeDefined();
    expect(irrelevantMatch).toBeDefined();

    // El mejor match debe superar holgadamente el 85%
    expect(bestMatch.score).toBeGreaterThanOrEqual(85);

    // La pieza no relacionada debe caer significativamente (menos de 55%)
    expect(irrelevantMatch.score).toBeLessThanOrEqual(55);

    // La dispersión debe ser clara (al menos 30 puntos de diferencia)
    expect(bestMatch.score - irrelevantMatch.score).toBeGreaterThanOrEqual(30);
  });

  it('la explicación nunca incluye la palabra "estilo" u otras palabras vacías entre comillas', () => {
    const results = rag.searchAndRerank({
      userTasteDescription: 'Quiero un estilo industrial con perfiles de acero y cuero para mi estudio',
      targetRoom: 'estudio',
      budgetTotal: 4500,
      budgetSpent: 0
    });

    results.forEach(res => {
      expect(res.matchReason).not.toMatch(/"estilo"/i);
      expect(res.matchReason).not.toMatch(/"categoria"/i);
      expect(res.matchReason).not.toMatch(/"espacio"/i);
    });

    const industrialItem = results.find(r => r.id === 'furn-03');
    expect(industrialItem.matchReason).toContain('Acero Pavonado');
  });
});
