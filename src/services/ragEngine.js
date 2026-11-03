/**
 * MOTOR RAG (RETRIEVAL-AUGMENTED GENERATION) ARQUITECTÓNICO
 * Indexación vectorial semántica, cálculo de similitud coseno (TF-IDF / BM25 ponderado),
 * re-ranking con restricciones físicas y generador de explicabilidad contextual de autor.
 */

// Stopwords estándar en español
const SPANISH_STOPWORDS = new Set([
  "a", "al", "algo", "algunas", "algunos", "ante", "antes", "aqui", "asi",
  "bajo", "bien", "cada", "casi", "como", "con", "contra", "cual", "cuales",
  "cuando", "de", "del", "desde", "donde", "durante", "e", "el", "ella",
  "ellas", "ellos", "en", "entre", "era", "erais", "eran", "eras", "eres",
  "es", "esa", "esas", "ese", "eso", "esos", "esta", "estaba", "estado",
  "estais", "estamos", "estan", "estar", "estas", "este", "esto", "estos",
  "estoy", "fue", "fueron", "fui", "fuimos", "ha", "habeis", "habia",
  "habian", "habida", "habidas", "habido", "habidos", "habiendo", "habla",
  "hace", "haceis", "hacemos", "hacen", "hacer", "haces", "hacia", "hago",
  "han", "has", "hasta", "hay", "la", "las", "le", "les", "lo", "los", "mas",
  "me", "mi", "mis", "mucho", "muchos", "muy", "nada", "ni", "no", "nos",
  "nosotras", "nosotros", "nuestra", "nuestras", "nuestro", "nuestros", "o",
  "os", "otra", "otras", "otro", "otros", "para", "pero", "poco", "por",
  "porque", "que", "quien", "quienes", "se", "sea", "sean", "segun", "ser",
  "sera", "seran", "seria", "si", "sido", "siempre", "siendo", "sin", "sobre",
  "sois", "solamente", "solo", "somos", "son", "soy", "su", "sus", "suya",
  "suyas", "suyo", "suyos", "tambien", "tanto", "te", "tendra", "tendran",
  "tenemos", "tener", "tenga", "tengo", "tenia", "tenido", "ti", "tiene",
  "tienen", "toda", "todas", "todo", "todos", "tu", "tus", "un", "una",
  "unas", "uno", "unos", "va", "vais", "vamos", "van", "vaya", "vosotras",
  "vosotros", "vuestra", "vuestras", "vuestro", "vuestros", "y", "ya", "yo"
]);

// Palabras estructurales y de plantilla excluidas de la vectorización y de las explicaciones
export const STRUCTURAL_STOPWORDS = new Set([
  "estilo", "corriente", "categoria", "estancia", "habitacion", "mueble", "muebles",
  "pieza", "piezas", "dimensiones", "medidas", "cotas", "cm", "precio", "pvp",
  "color", "tono", "tonalidad", "tonos", "acabado", "acabados", "sensacion", "sensaciones",
  "vision", "detalle", "detalles", "tecnico", "tecnica", "arquitectura", "arquitectonico",
  "arquitectonica", "diseno", "combinacion", "combina", "ideal", "espacio", "espacios",
  "busco", "quiero", "gustaria", "deseo", "necesito", "proyecto", "para", "con", "sobre",
  "forma", "linea", "lineas", "elemento", "elementos", "ambiente", "ambientes", "tipo",
  "armoniza", "acordes", "adecuada", "adecuado", "excelente", "buena", "buen"
]);

// Multiplicador de relevancia para términos y conceptos arquitectónicos sustantivos
const ARCHITECTURAL_KEYWORD_BOOSTS = {
  // Corrientes y estilos
  "japandi": 3.2,
  "zen": 3.0,
  "ryokan": 3.2,
  "wabisabi": 3.2,
  "minimalismo": 2.8,
  "nordico": 2.8,
  "escandinavo": 2.8,
  "midcentury": 2.8,
  "modernista": 2.5,
  "rustico": 2.7,
  "vernaculo": 2.9,
  "industrial": 2.8,
  "loft": 2.6,
  "bauhaus": 3.0,
  "mediterraneo": 2.9,

  // Atmósferas y cualidades espaciales
  "sereno": 2.4,
  "calido": 2.4,
  "calma": 2.4,
  "tenue": 2.6,
  "diafano": 2.5,
  "luminoso": 2.4,
  "acogedor": 2.2,
  "sobrio": 2.4,
  "organico": 2.5,
  "escultorico": 2.6,
  "tactil": 2.7,
  "flotante": 2.6,
  "suspendido": 2.6,
  "poroso": 2.6,

  // Materiales nobles
  "roble": 2.8,
  "nogal": 2.8,
  "fresno": 2.6,
  "madera": 2.2,
  "maderas": 2.2,
  "lino": 2.8,
  "travertino": 3.0,
  "marmol": 2.8,
  "caliza": 2.9,
  "arcilla": 2.8,
  "terracota": 2.8,
  "boucle": 2.9,
  "cuero": 2.8,
  "acero": 2.6,
  "laton": 2.8,
  "washi": 3.0,
  "ceramica": 2.6,
  "gres": 2.6,
  "tatami": 3.2,
  "lana": 2.6
};

export class RagEngine {
  constructor(catalog = []) {
    this.catalog = catalog;
    this.vocabulary = new Map();
    this.idf = new Map();
    this.documentVectors = new Map();
    this.documentNorms = new Map();
    this.documentTokens = new Map();
    
    if (Array.isArray(catalog) && catalog.length > 0) {
      this.indexCatalog(catalog);
    }
  }

  /**
   * Normaliza y limpia una cadena textual
   */
  static normalizeText(text) {
    if (!text || typeof text !== "string") return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Tokeniza un texto excluyendo stopwords estándar y estructurales
   */
  static tokenize(text) {
    const clean = RagEngine.normalizeText(text);
    if (!clean) return [];

    const words = clean.split(" ").filter(w => 
      w.length > 2 && 
      !SPANISH_STOPWORDS.has(w) && 
      !STRUCTURAL_STOPWORDS.has(w)
    );
    const tokens = [...words];

    // Bigramas semánticos (ej: "roble claro", "luz tenue", "lana virgen")
    for (let i = 0; i < words.length - 1; i++) {
      tokens.push(`${words[i]}_${words[i + 1]}`);
    }

    return tokens;
  }

  /**
   * Indexa el catálogo completo de muebles para búsquedas vectoriales RAG
   */
  indexCatalog(catalog) {
    this.catalog = catalog;
    this.vocabulary.clear();
    this.idf.clear();
    this.documentVectors.clear();
    this.documentNorms.clear();
    this.documentTokens.clear();

    const N = catalog.length;
    if (N === 0) return;

    const docTermFreqs = [];
    const docFrequency = new Map();

    // 1. Extraer tokens y frecuencias por documento
    catalog.forEach(item => {
      const fullContext = this.buildFurnitureDocument(item);
      const tokens = RagEngine.tokenize(fullContext);
      const uniqueTokens = Array.from(new Set(tokens));
      this.documentTokens.set(item.id, uniqueTokens);

      const tfMap = new Map();
      tokens.forEach(token => {
        tfMap.set(token, (tfMap.get(token) || 0) + 1);
      });
      docTermFreqs.push({ id: item.id, tfMap, tokenCount: tokens.length });

      uniqueTokens.forEach(token => {
        docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
      });
    });

    // 2. Calcular IDF (Inverse Document Frequency)
    docFrequency.forEach((count, token) => {
      const idfValue = Math.log(1 + (N - count + 0.5) / (count + 0.5));
      this.idf.set(token, Math.max(0.25, idfValue));
    });

    // 3. Construir vectores TF-IDF ponderados y normalizados por L2
    docTermFreqs.forEach(({ id, tfMap }) => {
      const vector = new Map();
      let sumOfSquares = 0;

      tfMap.forEach((freq, token) => {
        const idfScore = this.idf.get(token) || 0.5;
        const tfScore = 1 + Math.log(freq);
        const boost = ARCHITECTURAL_KEYWORD_BOOSTS[token] || 
          (token.includes("_") ? 1.6 : 1.0);

        const weight = tfScore * idfScore * boost;
        vector.set(token, weight);
        sumOfSquares += weight * weight;
      });

      const norm = Math.sqrt(sumOfSquares) || 1;
      this.documentVectors.set(id, vector);
      this.documentNorms.set(id, norm);
    });
  }

  /**
   * Concatena el documento semántico dando peso primordial a las etiquetas y materiales
   */
  buildFurnitureDocument(item) {
    const tagsText = Array.isArray(item.tags) ? item.tags.join(" ") : "";
    const parts = [
      item.name || "",
      item.category || "",
      item.room || "",
      item.style || "",
      tagsText,
      tagsText, // Doble peso a las etiquetas oficiales
      Array.isArray(item.materials) ? item.materials.join(" ") : "",
      item.description || "",
      item.architecturalDetail || "",
      item.ragContext || ""
    ];
    return parts.join(" ");
  }

  /**
   * Vectoriza una consulta de texto natural en un vector unitario ponderado
   */
  vectorizeQuery(queryText) {
    const tokens = RagEngine.tokenize(queryText);
    const queryVector = new Map();
    if (tokens.length === 0) return { vector: queryVector, norm: 0, tokens: [] };

    const tfMap = new Map();
    tokens.forEach(t => tfMap.set(t, (tfMap.get(t) || 0) + 1));

    let sumOfSquares = 0;
    tfMap.forEach((freq, token) => {
      const idfScore = this.idf.get(token) || 1.3;
      const tfScore = 1 + Math.log(freq);
      const boost = ARCHITECTURAL_KEYWORD_BOOSTS[token] || 
        (token.includes("_") ? 1.6 : 1.0);

      const weight = tfScore * idfScore * boost;
      queryVector.set(token, weight);
      sumOfSquares += weight * weight;
    });

    const norm = Math.sqrt(sumOfSquares) || 1;
    return { vector: queryVector, norm, tokens };
  }

  /**
   * Calcula la Similitud Coseno directa entre la consulta y un mueble
   */
  calculateCosineSimilarity(queryVector, queryNorm, itemId) {
    const docVector = this.documentVectors.get(itemId);
    const docNorm = this.documentNorms.get(itemId);

    if (!docVector || !docNorm || queryNorm === 0) return 0;

    let dotProduct = 0;
    queryVector.forEach((qWeight, token) => {
      const docWeight = docVector.get(token);
      if (docWeight !== undefined) {
        dotProduct += qWeight * docWeight;
      }
    });

    const similarity = dotProduct / (queryNorm * docNorm);
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Ejecuta el pipeline RAG completo con amplio rango dinámico de porcentajes
   */
  searchAndRerank({
    userTasteDescription = "",
    targetRoom = null,
    budgetTotal = 4500,
    budgetSpent = 0,
    preferredStyle = null,
    preferredPalette = null,
    topK = 0
  }) {
    if (!this.catalog || this.catalog.length === 0) return [];

    const { vector: queryVector, norm: queryNorm, tokens: queryTokens } = this.vectorizeQuery(userTasteDescription);
    const hasQuery = queryTokens.length > 0;
    const remainingBudget = Math.max(0, budgetTotal - budgetSpent);

    const scoredItems = this.catalog.map(item => {
      let finalScore = 50;
      let semanticCosine = 0;

      if (hasQuery) {
        semanticCosine = this.calculateCosineSimilarity(queryVector, queryNorm, item.id);

        // CURVA DE DISPERSIÓN AMPLIA SEGÚN SIMILITUD COSENO
        // Rango de salida: 25% (nula afinidad) a 98% (afinidad excelente)
        let baseScore = 30;

        if (semanticCosine >= 0.40) {
          // Coincidencia semántica excelente
          baseScore = 88 + Math.round(Math.min(10, (semanticCosine - 0.40) * 20));
        } else if (semanticCosine >= 0.20) {
          // Coincidencia semántica alta
          const progress = (semanticCosine - 0.20) / 0.20; // 0 a 1
          baseScore = 70 + Math.round(progress * 17); // 70 a 87
        } else if (semanticCosine >= 0.08) {
          // Coincidencia semántica media
          const progress = (semanticCosine - 0.08) / 0.12; // 0 a 1
          baseScore = 52 + Math.round(progress * 17); // 52 a 69
        } else if (semanticCosine > 0.01) {
          // Coincidencia tangencial leve
          const progress = semanticCosine / 0.08;
          baseScore = 35 + Math.round(progress * 16); // 35 a 51
        } else {
          // Sin coincidencia semántica
          baseScore = 25 + Math.round(Math.random() * 8); // 25 a 33
        }

        // Modificadores físicos suaves (+/- 4%)
        let roomModifier = 0;
        if (targetRoom && item.room) {
          roomModifier = item.room.toLowerCase() === targetRoom.toLowerCase() ? 4 : -4;
        }

        let budgetModifier = 0;
        if (budgetTotal > 0) {
          if (item.price <= remainingBudget) {
            budgetModifier = 3;
          } else if (item.price > budgetTotal) {
            budgetModifier = -5;
          }
        }

        finalScore = Math.min(99, Math.max(20, baseScore + roomModifier + budgetModifier));
      } else {
        // Modo estándar sin consulta textual (basado en onboarding)
        let styleScore = 0.5;
        if (preferredStyle && item.style) {
          styleScore = item.style.toLowerCase() === preferredStyle.toLowerCase() ? 1.0 : 0.5;
        }
        let paletteScore = 0.5;
        if (preferredPalette && item.paletteKey) {
          paletteScore = item.paletteKey.toLowerCase() === preferredPalette.toLowerCase() ? 1.0 : 0.5;
        }
        let roomScore = (targetRoom && item.room && item.room.toLowerCase() === targetRoom.toLowerCase()) ? 1.0 : 0.6;
        let budgetScore = (budgetTotal > 0 && item.price <= remainingBudget) ? 0.9 : 0.5;

        const composite = (styleScore * 0.40) + (paletteScore * 0.25) + (roomScore * 0.20) + (budgetScore * 0.15);
        finalScore = Math.round(48 + (composite * 50));
      }

      // Explicación arquitectónica depurada
      const explanation = this.generateRagExplanation({
        item,
        queryTokens,
        hasQuery,
        targetRoom,
        semanticCosine
      });

      return {
        ...item,
        score: finalScore,
        semanticCosine: Number(semanticCosine.toFixed(3)),
        matchReason: explanation
      };
    });

    // Ordenación por score descendente
    scoredItems.sort((a, b) => b.score - a.score);

    return topK > 0 ? scoredItems.slice(0, topK) : scoredItems;
  }

  /**
   * Genera el motivo de matching priorizando etiquetas formales y términos sustantivos,
   * sin palabras de plantilla vacías.
   */
  generateRagExplanation({ item, queryTokens, hasQuery, targetRoom, semanticCosine }) {
    if (hasQuery && queryTokens.length > 0) {
      // 1. Detección de coincidencia directa con las etiquetas oficiales del mueble
      const itemTags = Array.isArray(item.tags) ? item.tags : [];
      const matchedTags = itemTags.filter(tag => {
        const normTag = RagEngine.normalizeText(tag);
        return queryTokens.some(qt => normTag.includes(qt) || qt.includes(normTag));
      });

      if (matchedTags.length >= 2) {
        return `Afinidad directa con tus preferencias en las etiquetas [${matchedTags.slice(0, 2).join("] y [")}].`;
      } else if (matchedTags.length === 1) {
        return `Coincide con tu búsqueda en la etiqueta [${matchedTags[0]}] con acabados en ${item.materials[0].toLowerCase()}.`;
      }

      // 2. Coincidencia con términos sustantivos significativos (materiales, atmósferas, luz)
      const docTokens = this.documentTokens.get(item.id) || [];
      const meaningfulMatches = queryTokens.filter(qt => 
        !qt.includes("_") && 
        !STRUCTURAL_STOPWORDS.has(qt) && 
        qt.length > 3 &&
        docTokens.includes(qt)
      );

      if (meaningfulMatches.length >= 2) {
        const terms = meaningfulMatches.slice(0, 2).map(m => `"${m}"`).join(" y ");
        return `Responde a tu búsqueda de ${terms} por sus materiales nobles en ${item.materials[0].toLowerCase()}.`;
      } else if (meaningfulMatches.length === 1) {
        return `Conecta con el concepto "${meaningfulMatches[0]}" mediante una volumetría sobria y cotas equilibradas.`;
      } else if (semanticCosine >= 0.35) {
        return `Excelente afinidad semántica (${Math.round(semanticCosine * 100)}%) con la atmósfera sensorial de tu visión.`;
      } else if (semanticCosine >= 0.12) {
        return `Afinidad complementaria con tu descripción; pieza de apoyo en ${item.materials[0].toLowerCase()}.`;
      } else {
        return `Contraste estético para equilibrar la composición de tu ${item.room || targetRoom || 'espacio'}.`;
      }
    }

    // Fallback arquitectónico sin consulta
    return `Armoniza con la estética ${item.style} y acabado en ${item.color.toLowerCase()} para ${item.room || 'tu espacio'}.`;
  }
}
