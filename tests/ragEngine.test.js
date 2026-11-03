import { describe, it, expect, beforeEach } from 'vitest';
import { RagEngine } from '../src/services/ragEngine.js';

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
      description: 'Estructura rígida de perfilería oscura y sobre tapizado en piel.',
      architecturalDetail: 'Electrificación integrada sin cables visibles.',
      ragContext: 'Escritorio técnico sobrio loft industrial con perfiles de acero negro y cuero para estudio de arquitectura.'
    }
  ];

  let rag;

  beforeEach(() => {
    rag = new RagEngine(sampleCatalog);
  });

  it('normaliza y tokeniza texto correctamente eliminando acentos y stopwords', () => {
    const raw = '¡El salón está sereno con maderas clarísimas y luz tenue!';
    const normalized = RagEngine.normalizeText(raw);
    expect(normalized).toBe('el salon esta sereno con maderas clarisimas y luz tenue');

    const tokens = RagEngine.tokenize(raw);
    expect(tokens).toContain('salon');
    expect(tokens).toContain('sereno');
    expect(tokens).toContain('luz');
    expect(tokens).not.toContain('con'); // stopword
    expect(tokens).not.toContain('el'); // stopword
    expect(tokens).toContain('luz_tenue'); // bigrama semántico
  });

  it('calcula la similitud coseno alta para descripciones afines a un mueble zen/ryokan', () => {
    const query = 'Busco un salón sereno con luz tenue y maderas claras que me recuerde a un ryokan japonés';
    const { vector: qVec, norm: qNorm } = rag.vectorizeQuery(query);

    const simZen = rag.calculateCosineSimilarity(qVec, qNorm, 'furn-01');
    const simIndustrial = rag.calculateCosineSimilarity(qVec, qNorm, 'furn-03');

    expect(simZen).toBeGreaterThan(simIndustrial);
    expect(simZen).toBeGreaterThan(0.25);
  });

  it('realiza re-ranking y sitúa en primer lugar la pieza idónea con explicación contextual', () => {
    const results = rag.searchAndRerank({
      userTasteDescription: 'Salón zen inspirado en un ryokan con lino y roble sereno',
      targetRoom: 'salón',
      budgetTotal: 4500,
      budgetSpent: 0
    });

    expect(results.length).toBe(3);
    expect(results[0].id).toBe('furn-01');
    expect(results[0].score).toBeGreaterThanOrEqual(75);
    expect(results[0].matchReason).toBeTruthy();
    expect(typeof results[0].matchReason).toBe('string');
  });

  it('respeta las restricciones duras de presupuesto y estancia en el re-ranking', () => {
    // Si la estancia objetivo es 'estudio' y presupuesto es ajustado
    const results = rag.searchAndRerank({
      userTasteDescription: 'Mobiliario para trabajar con rigor técnico y cuero',
      targetRoom: 'estudio',
      budgetTotal: 1000,
      budgetSpent: 0
    });

    expect(results[0].id).toBe('furn-03');
    expect(results[0].room).toBe('estudio');
  });
});

