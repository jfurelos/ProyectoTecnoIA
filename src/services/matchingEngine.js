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
    if (this.profile.styleWeights[item.style] !== undefined) {
      this.profile.styleWeights[item.style] = Math.min(1.5, this.profile.styleWeights[item.style] + 0.30);
    } else {
      this.profile.styleWeights[item.style] = 0.8;
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
    if (this.profile.styleWeights[item.style] !== undefined) {
      this.profile.styleWeights[item.style] = Math.max(0.08, this.profile.styleWeights[item.style] - 0.18);
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
    const styleAffinity = this.profile.styleWeights[item.style] || 0.3;
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
    if (item.room) {
      roomScore = (item.room.toLowerCase() === this.profile.room.toLowerCase()) ? 1.0 : 0.6;
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
  generateMatchReason(item, score) {
    const reasons = [];

    // Motivo por Estilo
    const styleW = this.profile.styleWeights[item.style] || 0;
    if (styleW >= 0.7) {
      reasons.push(`Armoniza con tu preferencia ${item.style}`);
    }

    // Motivo por Color / Paleta
    const palW = (item.paletteKey && this.profile.paletteWeights[item.paletteKey]) || 0;
    if (palW >= 0.7) {
      reasons.push(`gama cromática en ${item.color.toLowerCase()}`);
    }

    // Motivo por Presupuesto
    const remaining = Math.max(0, this.profile.budget - this.profile.spent);
    if (item.price <= remaining && item.price <= this.profile.budget * 0.35) {
      reasons.push(`excelente equilibrio de coste`);
    }

    if (reasons.length >= 2) {
      return reasons[0] + " y " + reasons[1] + ".";
    } else if (reasons.length === 1) {
      return reasons[0] + ` para tu ${this.profile.room}.`;
    }

    return `Pieza clave con cota arquitectónica proporcional a tu ${this.profile.room}.`;
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
