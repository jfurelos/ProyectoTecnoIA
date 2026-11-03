/**
 * MOTOR RAG (RETRIEVAL-AUGMENTED GENERATION) ARQUITECTÓNICO
 * Indexación vectorial semántica, cálculo de similitud coseno (TF-IDF / BM25 ponderado),
 * re-ranking con restricciones físicas y generador de explicabilidad contextual.
 */

// Stopwords en español para filtrado en el pipeline de vectorización
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

// Términos y conceptos arquitectónicos clave con multiplicador de relevancia
const ARCHITECTURAL_KEYWORD_BOOSTS = {
  // Estilos
  "japandi": 2.8,
  "zen": 2.5,
  "ryokan": 3.0,
  "wabisabi": 3.0,
  "minimalismo": 2.6,
  "nordico": 2.6,
  "escandinavo": 2.6,
  "midcentury": 2.6,
  "modernista": 2.4,
  "rustico": 2.5,
  "vernaculo": 2.8,
  "industrial": 2.5,
  "loft": 2.4,
  "bauhaus": 2.8,

  // Atmósferas y sensaciones
  "sereno": 2.2,
  "calido": 2.2,
  "calma": 2.2,
  "tenue": 2.4,
  "diafano": 2.3,
  "luminoso": 2.2,
  "acogedor": 2.0,
  "sobrio": 2.2,
  "organico": 2.3,
  "escultorico": 2.4,
  "tactil": 2.5,
  "flotante": 2.4,
  "suspendido": 2.3,

  // Materiales
  "roble": 2.5,
  "nogal": 2.5,
  "fresno": 2.4,
  "madera": 2.0,
  "maderas": 2.0,
  "lino": 2.5,
  "travertino": 2.8,
  "marmol": 2.5,
  "caliza": 2.6,
  "arcilla": 2.6,
  "terracota": 2.6,
  "boucle": 2.7,
  "cuero": 2.5,
  "acero": 2.4,
  "laton": 2.5,
  "washi": 2.8,
  "ceramica": 2.4,
  "gres": 2.4,
  "tatami": 2.9,

  // Estancias
  "salon": 2.0,
  "comedor": 2.0,
  "dormitorio": 2.0,
  "estudio": 2.0,
  "oficina": 2.0
};

export class RagEngine {
  constructor(catalog = []) {
    this.catalog = catalog;
    this.vocabulary = new Map(); // token -> termIndex
    this.idf = new Map(); // token -> idfScore
    this.documentVectors = new Map(); // itemId -> Map(token -> weight)
    this.documentNorms = new Map(); // itemId -> L2 norm
    this.documentTokens = new Map(); // itemId -> Array of unique meaningful tokens
    
    if (Array.isArray(catalog) && catalog.length > 0) {
      this.indexCatalog(catalog);
    }
  }

  /**
   * Normaliza y limpia una cadena textual (remueve diacríticos, puntuación y caracteres raros)
   */
  static normalizeText(text) {
    if (!text || typeof text !== "string") return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita tildes
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Tokeniza un texto extrayendo unigramas y bigramas relevantes
   */
  static tokenize(text) {
    const clean = RagEngine.normalizeText(text);
    if (!clean) return [];

    const words = clean.split(" ").filter(w => w.length > 2 && !SPANISH_STOPWORDS.has(w));
    const tokens = [...words];

    // Bigramas semánticos (ej: "roble claro", "luz tenue", "minimalismo calido")
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
    const docFrequency = new Map(); // token -> count of docs containing it

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
      // Fórmula estándar de IDF suavizado
      const idfValue = Math.log(1 + (N - count + 0.5) / (count + 0.5));
      this.idf.set(token, Math.max(0.2, idfValue));
    });

    // 3. Construir vectores TF-IDF ponderados y normalizados por L2
    docTermFreqs.forEach(({ id, tfMap, tokenCount }) => {
      const vector = new Map();
      let sumOfSquares = 0;

      tfMap.forEach((freq, token) => {
        const idfScore = this.idf.get(token) || 0.5;
        // Ponderación TF logarítmica
        const tfScore = 1 + Math.log(freq);
        // Multiplicador arquitectónico si aplica
        const boost = ARCHITECTURAL_KEYWORD_BOOSTS[token] || 
          (token.includes("_") ? 1.5 : 1.0);

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
   * Concatena y sintetiza el documento de contexto semántico de un mueble
   */
  buildFurnitureDocument(item) {
    const parts = [
      item.name || "",
      item.category || "",
      item.room || "",
      item.style || "",
      item.color || "",
      item.paletteKey || "",
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
      // Si el término existe en el IDF del catálogo, se usa; si no, valor base
      const idfScore = this.idf.get(token) || 1.2;
      const tfScore = 1 + Math.log(freq);
      const boost = ARCHITECTURAL_KEYWORD_BOOSTS[token] || 
        (token.includes("_") ? 1.5 : 1.0);

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
   * Ejecuta el pipeline RAG completo:
   * 1. Retrieval vectorial semántico
   * 2. Augmented Re-ranking con restricciones físicas y arquitectónicas
   * 3. Generación de explicación arquitectónica
   */
  searchAndRerank({
    userTasteDescription = "",
    targetRoom = null,
    budgetTotal = 4500,
    budgetSpent = 0,
    preferredStyle = null,
    preferredPalette = null,
    topK = 50
  }) {
    if (!this.catalog || this.catalog.length === 0) return [];

    const { vector: queryVector, norm: queryNorm, tokens: queryTokens } = this.vectorizeQuery(userTasteDescription);
    const hasQuery = queryTokens.length > 0;
    const remainingBudget = Math.max(0, budgetTotal - budgetSpent);

    const scoredItems = this.catalog.map(item => {
      // 1. Similitud Semántica RAG (Cosine Similarity)
      const semanticCosine = hasQuery 
        ? this.calculateCosineSimilarity(queryVector, queryNorm, item.id) 
        : 0.5;

      // 2. Score de Estancia Arquitectónica
      let roomScore = 0.7;
      if (targetRoom && item.room) {
        roomScore = (item.room.toLowerCase() === targetRoom.toLowerCase()) ? 1.0 : 0.55;
      }

      // 3. Score de Presupuesto
      let budgetScore = 0.5;
      if (budgetTotal > 0) {
        if (item.price <= remainingBudget) {
          const ratio = item.price / (remainingBudget + 1);
          budgetScore = ratio <= 0.65 ? 0.95 : 0.80;
        } else if (item.price <= budgetTotal) {
          budgetScore = 0.45;
        } else {
          budgetScore = 0.20;
        }
      }

      // 4. Score de Estilo y Paleta
      let styleScore = 0.6;
      if (preferredStyle && item.style) {
        styleScore = item.style.toLowerCase() === preferredStyle.toLowerCase() ? 1.0 : 0.6;
      }
      let paletteScore = 0.6;
      if (preferredPalette && item.paletteKey) {
        paletteScore = item.paletteKey.toLowerCase() === preferredPalette.toLowerCase() ? 1.0 : 0.6;
      }

      // 5. Ponderación Compuesta de Re-Ranking
      // Si el usuario proporcionó una descripción rica, el RAG semántico tiene mayor peso (45%)
      let composite = 0;
      if (hasQuery) {
        composite = (semanticCosine * 0.45) + (roomScore * 0.20) + (budgetScore * 0.20) + (styleScore * 0.10) + (paletteScore * 0.05);
      } else {
        composite = (styleScore * 0.35) + (paletteScore * 0.25) + (budgetScore * 0.25) + (roomScore * 0.15);
      }

      // Escalar a porcentaje realista (50% - 99%)
      const matchPercentage = Math.round(50 + (composite * 49));
      const clampedScore = Math.min(99, Math.max(50, matchPercentage));

      // 6. Generación Explicable RAG
      const explanation = this.generateRagExplanation({
        item,
        queryTokens,
        hasQuery,
        targetRoom,
        semanticCosine
      });

      return {
        ...item,
        score: clampedScore,
        semanticCosine: Number(semanticCosine.toFixed(3)),
        matchReason: explanation
      };
    });

    // Ordenar por score descendente
    scoredItems.sort((a, b) => b.score - a.score);

    return topK ? scoredItems.slice(0, topK) : scoredItems;
  }

  /**
   * Sintetiza la explicación contextual de por qué el mueble responde a la petición semántica
   */
  generateRagExplanation({ item, queryTokens, hasQuery, targetRoom, semanticCosine }) {
    if (hasQuery && queryTokens.length > 0) {
      // Buscar coincidencias directas de términos
      const docTokens = this.documentTokens.get(item.id) || [];
      const matches = queryTokens.filter(qt => !qt.includes("_") && docTokens.includes(qt));

      if (matches.length >= 2) {
        const readableTerms = matches.slice(0, 3).map(m => `"${m}"`).join(" y ");
        return `Conecta con tu visión de ${readableTerms} por sus materiales en ${item.materials[0].toLowerCase()} y estilo ${item.style}.`;
      } else if (matches.length === 1) {
        return `Responde semánticamente a tu búsqueda de "${matches[0]}" con un lenguaje ${item.style} y cotas equilibradas.`;
      } else if (semanticCosine > 0.4) {
        return `Alta afinidad semántica (${Math.round(semanticCosine * 100)}%) con la atmósfera de tu descripción para ${item.room || targetRoom}.`;
      }
    }

    // Fallback arquitectónico
    return `Armoniza con la estética ${item.style} y acabado en ${item.color.toLowerCase()} para ${item.room || 'tu espacio'}.`;
  }
}

