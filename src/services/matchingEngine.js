/**
 * MOTOR DE MATCHING ARQUITECTÓNICO & APRENDIZAJE PROGRESIVO
 * Implementa el cálculo vectorial de afinidad y el recálculo dinámico en tiempo real.
 */

export class MatchingEngine {
  constructor(initialProfile = null) {
    const defaults = this.getDefaultProfile();
    this.profile = {
      ...defaults,
      ...(initialProfile || {})
    };
    if (!Array.isArray(this.profile.acceptedIds)) this.profile.acceptedIds = [];
    if (!Array.isArray(this.profile.rejectedIds)) this.profile.rejectedIds = [];
    if (!this.profile.styleWeights) this.profile.styleWeights = defaults.styleWeights;
    if (!this.profile.paletteWeights) this.profile.paletteWeights = defaults.paletteWeights;
    if (!this.profile.materialWeights) this.profile.materialWeights = defaults.materialWeights;
  }

  getDefaultProfile() {
    return {
      userName: "Arquitecto / Coleccionista",
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
      },
      acceptedIds: [],
      rejectedIds: []
    };
  }

  /**
   * Inicializa el perfil desde el Onboarding (Opción A)
   */
  setFromOnboarding({ room, style, budget, palette }) {
    this.profile.room = room;
    this.profile.preferredStyle = style;
    this.profile.budget = Number(budget) || 4500;
    this.profile.preferredPalette = palette;
    this.profile.spent = 0;
    this.profile.acceptedIds = [];
    this.profile.rejectedIds = [];

    // Resetear pesos vectoriales primarios
    const styles = ["Japandi", "Minimalismo Cálido", "Nórdico", "Mid-Century Modern", "Rústico Contemporáneo", "Industrial Sutil"];
    this.profile.styleWeights = {};
    styles.forEach(s => {
      this.profile.styleWeights[s] = s === style ? 1.0 : 0.35;
    });

    const palettes = ["terracota", "lino", "roble", "nogal", "oliva", "ocre", "caliza"];
    this.profile.paletteWeights = {};
    palettes.forEach(p => {
      this.profile.paletteWeights[p] = p === palette ? 1.0 : 0.35;
    });
  }

  /**
   * Refuerzo Positivo: Cuando el usuario Acepta un mueble
   */
  acceptItem(item) {
    if (!this.profile.acceptedIds.includes(item.id)) {
      this.profile.acceptedIds.push(item.id);
      this.profile.spent += item.price;
    }

    // Retirar de rechazados si estuviera
    this.profile.rejectedIds = this.profile.rejectedIds.filter(id => id !== item.id);

    // 1. Reforzar Estilo (+0.30)
    const styleKey = item.styleKey || item.style;
    if (this.profile.styleWeights[styleKey] !== undefined) {
      this.profile.styleWeights[styleKey] = Math.min(1.5, this.profile.styleWeights[styleKey] + 0.30);
    } else {
      this.profile.styleWeights[styleKey] = 0.8;
    }

    // 2. Reforzar Paleta (+0.25)
    if (item.paletteKey && this.profile.paletteWeights[item.paletteKey] !== undefined) {
      this.profile.paletteWeights[item.paletteKey] = Math.min(1.5, this.profile.paletteWeights[item.paletteKey] + 0.25);
    }

    // 3. Reforzar Materiales
    if (Array.isArray(item.materials)) {
      item.materials.forEach(mat => {
        this.profile.materialWeights[mat] = (this.profile.materialWeights[mat] || 0.4) + 0.2;
      });
    }
  }

  /**
   * Ajuste Negativo: Cuando el usuario Descarta/Niega un mueble
   */
  rejectItem(item) {
    if (!this.profile.rejectedIds.includes(item.id)) {
      this.profile.rejectedIds.push(item.id);
    }

    // Si estaba aceptado previamente, remover y ajustar gasto
    if (this.profile.acceptedIds.includes(item.id)) {
      this.profile.acceptedIds = this.profile.acceptedIds.filter(id => id !== item.id);
      this.profile.spent = Math.max(0, this.profile.spent - item.price);
    }

    // Atenuar peso del estilo (-0.18, mínimo 0.08)
    const styleKey = item.styleKey || item.style;
    if (this.profile.styleWeights[styleKey] !== undefined) {
      this.profile.styleWeights[styleKey] = Math.max(0.08, this.profile.styleWeights[styleKey] - 0.18);
    }

    // Atenuar peso de paleta (-0.15, mínimo 0.08)
    if (item.paletteKey && this.profile.paletteWeights[item.paletteKey] !== undefined) {
      this.profile.paletteWeights[item.paletteKey] = Math.max(0.08, this.profile.paletteWeights[item.paletteKey] - 0.15);
    }
  }

  /**
   * Deshacer acción sobre un mueble
   */
  undoItemAction(item) {
    const wasAccepted = this.profile.acceptedIds.includes(item.id);
    if (wasAccepted) {
      this.profile.acceptedIds = this.profile.acceptedIds.filter(id => id !== item.id);
      this.profile.spent = Math.max(0, this.profile.spent - item.price);
    }
    this.profile.rejectedIds = this.profile.rejectedIds.filter(id => id !== item.id);
  }

  /**
   * Calcula el Score de Coincidencia (0% - 99%) para un mueble específico
   */
  calculateScore(item) {
    // 1. Vector Estilo (35%)
    const styleKey = item.styleKey || item.style;
    const styleAffinity = this.profile.styleWeights[styleKey] || 0.3;
    const normStyle = Math.min(1.0, styleAffinity / 1.2);

    // 2. Vector Paleta / Color (25%)
    const paletteAffinity = (item.paletteKey && this.profile.paletteWeights[item.paletteKey]) || 0.35;
    const normPalette = Math.min(1.0, paletteAffinity / 1.2);

    // 3. Vector Presupuesto (25%)
    const remainingBudget = Math.max(0, this.profile.budget - this.profile.spent);
    let budgetScore = 0.5;
    if (this.profile.budget > 0) {
      if (item.price <= remainingBudget) {
        // Encaja en el dinero restante
        const ratio = item.price / (remainingBudget + 1);
        budgetScore = ratio <= 0.65 ? 0.95 : 0.8;
      } else if (item.price <= this.profile.budget) {
        // Excede lo que queda pero cabe en el presupuesto global
        budgetScore = 0.45;
      } else {
        // Supera el presupuesto total fijado
        budgetScore = 0.2;
      }
    }

    // 4. Vector Estancia / Espacio (15%)
    let roomScore = 0.7;
    const rKey = (item.roomKey || item.room || "").toLowerCase();
    const profRoom = (this.profile.roomKey || this.profile.room || "").toLowerCase();
    if (rKey) {
      roomScore = (rKey === profRoom) ? 1.0 : 0.6;
    }

    // Ponderación final compuesta
    const composite = (normStyle * 0.35) + (normPalette * 0.25) + (budgetScore * 0.25) + (roomScore * 0.15);
    
    // Normalizar a escala de porcentaje 52% - 98% para realismo arquitectónico
    const percentage = Math.round(50 + (composite * 48));
    return Math.min(99, Math.max(48, percentage));
  }

  /**
   * Genera el motivo explicable de recomendación ("Por qué te encaja")
   */
  generateMatchReason(item, score, lang = "es") {
    const reasons = [];
    const styleKey = item.styleKey || item.style;
    const styleW = this.profile.styleWeights[styleKey] || 0;
    const palW = (item.paletteKey && this.profile.paletteWeights[item.paletteKey]) || 0;
    const remaining = Math.max(0, this.profile.budget - this.profile.spent);
    const goodBudget = (item.price <= remaining && item.price <= this.profile.budget * 0.35);

    const roomDict = {
      salón: { es: "salón", ca: "saló", en: "living room", zh: "客厅" },
      comedor: { es: "comedor", ca: "menjador", en: "dining room", zh: "餐厅" },
      dormitorio: { es: "dormitorio", ca: "dormitori", en: "bedroom", zh: "卧室" },
      estudio: { es: "estudio", ca: "estudi", en: "home office", zh: "书房" }
    };
    const profRoomKey = (this.profile.roomKey || this.profile.room || "salón").toLowerCase();
    const fallbackRoom = (roomDict[profRoomKey] && roomDict[profRoomKey][lang]) || this.profile.room || "";
    const displayRoom = item.room || fallbackRoom;

    if (lang === "ca") {
      if (styleW >= 0.7) reasons.push(`Harmonitza amb la teva preferència ${item.style}`);
      if (palW >= 0.7) reasons.push(`gamma cromàtica en ${(item.color || '').toLowerCase()}`);
      if (goodBudget) reasons.push(`excel·lent equilibri de cost`);
      if (reasons.length >= 2) return reasons[0] + " i " + reasons[1] + ".";
      if (reasons.length === 1) return reasons[0] + ` per al teu ${displayRoom}.`;
      return `Peça clau amb cota arquitectònica proporcional per al teu ${displayRoom}.`;
    }

    if (lang === "en") {
      if (styleW >= 0.7) reasons.push(`Harmonizes with your ${item.style} preference`);
      if (palW >= 0.7) reasons.push(`palette in ${(item.color || '').toLowerCase()}`);
      if (goodBudget) reasons.push(`excellent cost balance`);
      if (reasons.length >= 2) return reasons[0] + " and " + reasons[1] + ".";
      if (reasons.length === 1) return reasons[0] + ` for your ${displayRoom}.`;
      return `Key piece with architectural dimensions proportional to your ${displayRoom}.`;
    }

    if (lang === "zh") {
      if (styleW >= 0.7) reasons.push(`契合您对${item.style}风格的偏好`);
      if (palW >= 0.7) reasons.push(`${item.color || ''}色调美学`);
      if (goodBudget) reasons.push(`极具造价优势`);
      if (reasons.length >= 2) return reasons[0] + "，且呈现" + reasons[1] + "。";
      if (reasons.length === 1) return reasons[0] + `，适配您的${displayRoom}。`;
      return `符合建筑尺度比例的关键家具单品，适配您的${displayRoom}。`;
    }

    // Por defecto Castellano
    if (styleW >= 0.7) reasons.push(`Armoniza con tu preferencia ${item.style}`);
    if (palW >= 0.7) reasons.push(`gama cromática en ${(item.color || '').toLowerCase()}`);
    if (goodBudget) reasons.push(`excelente equilibrio de coste`);
    if (reasons.length >= 2) return reasons[0] + " y " + reasons[1] + ".";
    if (reasons.length === 1) return reasons[0] + ` para tu ${displayRoom}.`;
    return `Pieza clave con cota arquitectónica proporcional a tu ${displayRoom}.`;
  }

  /**
   * Obtiene la síntesis del ADN del Espacio para el Living Profile HUD
   */
  getSpaceDna() {
    // Ordenar estilos por afinidad
    const sortedStyles = Object.entries(this.profile.styleWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const totalStyleWeight = sortedStyles.reduce((sum, item) => sum + item[1], 0) || 1;
    const styleDna = sortedStyles.map(([style, weight]) => ({
      name: style,
      percent: Math.round((weight / totalStyleWeight) * 100)
    }));

    // Obtener paleta dominante
    const sortedPalettes = Object.entries(this.profile.paletteWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key);

    return {
      styles: styleDna,
      dominantPalettes: sortedPalettes,
      budgetTotal: this.profile.budget,
      budgetSpent: this.profile.spent,
      budgetRemaining: Math.max(0, this.profile.budget - this.profile.spent),
      acceptedCount: this.profile.acceptedIds.length,
      rejectedCount: this.profile.rejectedIds.length
    };
  }
}
