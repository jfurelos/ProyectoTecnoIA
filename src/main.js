/**
 * ESPACIO · ARCHITECTURAL MATCHING PLATFORM
 * Coordinador principal de estado, cuentas de usuario, cesta, eventos, renderizado y reactividad.
 */

import { INITIAL_FURNITURE_DATA, ROOM_OPTIONS, STYLE_OPTIONS, PALETTE_OPTIONS } from './data/furnitureData.js';
import { MatchingEngine } from './services/matchingEngine.js';
import { CsvCatalogParser } from './services/csvParser.js';
import { StorageService } from './services/storage.js';
import { AuthService } from './services/authService.js';

// ==========================================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================================================
class AppState {
  constructor() {
    // 1. Usuario actual
    this.currentUser = AuthService.getCurrentUser();

    // 2. Catálogo de Muebles
    const savedCatalog = StorageService.getCatalog();
    this.catalog = savedCatalog && savedCatalog.length > 0 ? savedCatalog : [...INITIAL_FURNITURE_DATA];

    // 3. Perfil del Usuario & Motor de Matching
    let profileData = null;
    if (this.currentUser && this.currentUser.profile) {
      profileData = {
        ...this.currentUser.profile,
        acceptedIds: this.currentUser.cestaIds || [],
        rejectedIds: this.currentUser.rejectedIds || []
      };
    } else {
      profileData = StorageService.getProfile();
    }
    this.matchingEngine = new MatchingEngine(profileData);

    // 4. Filtros y Búsqueda del Feed
    this.filterCategory = "all";
    this.searchQuery = "";
    this.sortOption = "match-desc";

    // 5. Estado de Onboarding (Opción A)
    this.onboardingStep = 1;
    this.onboardingSelections = {
      room: this.matchingEngine.profile.room || "salón",
      style: this.matchingEngine.profile.preferredStyle || "Japandi",
      budget: this.matchingEngine.profile.budget || 4500,
      palette: this.matchingEngine.profile.preferredPalette || "terracota"
    };

    // 6. CSV Temporal para previsualización
    this.pendingCsvItems = null;

    // 7. Tema Activo
    this.theme = StorageService.getTheme() || "autumn-default";

    // 8. Estado del modal de autenticación
    this.authMode = "login"; // "login" o "register"
  }

  save() {
    StorageService.saveCatalog(this.catalog);
    StorageService.saveProfile(this.matchingEngine.profile);
    StorageService.saveTheme(this.theme);

    // Sincronizar en la cuenta del usuario si ha iniciado sesión
    if (this.currentUser) {
      AuthService.syncCurrentUserData(
        this.matchingEngine.profile,
        this.matchingEngine.profile.acceptedIds,
        this.matchingEngine.profile.rejectedIds
      );
    }
  }

  loadUser(user) {
    this.currentUser = user;
    if (user && user.profile) {
      this.matchingEngine = new MatchingEngine({
        ...user.profile,
        acceptedIds: user.cestaIds || [],
        rejectedIds: user.rejectedIds || []
      });
      this.onboardingSelections = {
        room: this.matchingEngine.profile.room || "salón",
        style: this.matchingEngine.profile.preferredStyle || "Japandi",
        budget: this.matchingEngine.profile.budget || 4500,
        palette: this.matchingEngine.profile.preferredPalette || "terracota"
      };
    }
    this.save();
  }
}

const state = new AppState();

// ==========================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initAuthSystem();
  initOnboarding();
  initToolbarAndFilters();
  initCestaDrawer();
  initCsvModal();
  updateUserHeaderDisplay();
  updateLivingProfileHud();
  renderFeed();

  // Si no hay usuario y no se ha completado el onboarding previamente, mostrarlo al inicio (Opción A)
  if (!StorageService.isOnboardingCompleted() && !state.currentUser) {
    openOnboarding();
  }
});

// ==========================================================================
// GESTIÓN DE TEMAS (DISEÑO FLEXIBLE ARQUITECTÓNICO)
// ==========================================================================
function initTheme() {
  const themeSelector = document.getElementById("theme-selector");
  if (!themeSelector) return;

  themeSelector.value = state.theme;
  document.documentElement.setAttribute("data-theme", state.theme);

  themeSelector.addEventListener("change", (e) => {
    state.theme = e.target.value;
    document.documentElement.setAttribute("data-theme", state.theme);
    state.save();
    showToast(`Tema actualizado a: ${e.target.options[e.target.selectedIndex].text}`);
  });
}

// ==========================================================================
// SISTEMA DE CUENTAS DE USUARIO & AUTENTICACIÓN
// ==========================================================================
function initAuthSystem() {
  const btnTrigger = document.getElementById("btn-user-trigger");
  const dropdown = document.getElementById("user-dropdown-menu");
  const modalOverlay = document.getElementById("auth-modal-overlay");
  const btnCloseModal = document.getElementById("btn-close-auth-modal");
  const dropdownBtnAuth = document.getElementById("dropdown-btn-auth");
  const dropdownBtnLogout = document.getElementById("dropdown-btn-logout");
  const dropdownBtnPrefs = document.getElementById("dropdown-btn-preferences");

  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const authForm = document.getElementById("auth-form");
  const switchLink = document.getElementById("auth-switch-link");
  const errorAlert = document.getElementById("auth-error-alert");

  // Alternar menú de usuario
  if (btnTrigger && dropdown) {
    btnTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", () => {
      dropdown.classList.remove("open");
    });

    dropdown.addEventListener("click", (e) => e.stopPropagation());
  }

  // Abrir modal de autenticación
  const openAuthModal = (mode = "login") => {
    state.authMode = mode;
    updateAuthModalTabs();
    if (errorAlert) {
      errorAlert.textContent = "";
      errorAlert.classList.remove("visible");
    }
    if (modalOverlay) modalOverlay.classList.add("open");
    if (dropdown) dropdown.classList.remove("open");
  };

  const closeAuthModal = () => {
    if (modalOverlay) modalOverlay.classList.remove("open");
  };

  if (dropdownBtnAuth) {
    dropdownBtnAuth.addEventListener("click", () => openAuthModal("login"));
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closeAuthModal);
  }

  if (dropdownBtnPrefs) {
    dropdownBtnPrefs.addEventListener("click", () => {
      if (dropdown) dropdown.classList.remove("open");
      state.onboardingStep = 1;
      openOnboarding();
    });
  }

  // Cerrar sesión
  if (dropdownBtnLogout) {
    dropdownBtnLogout.addEventListener("click", () => {
      AuthService.logout();
      state.currentUser = null;
      state.matchingEngine = new MatchingEngine();
      state.save();
      updateUserHeaderDisplay();
      updateLivingProfileHud();
      renderFeed();
      if (dropdown) dropdown.classList.remove("open");
      showToast("Has cerrado sesión. Navegando como invitado.");
    });
  }

  // Cambio de pestañas Login / Register
  if (tabLogin && tabRegister) {
    tabLogin.addEventListener("click", () => {
      state.authMode = "login";
      updateAuthModalTabs();
    });
    tabRegister.addEventListener("click", () => {
      state.authMode = "register";
      updateAuthModalTabs();
    });
  }

  if (switchLink) {
    switchLink.addEventListener("click", () => {
      state.authMode = state.authMode === "login" ? "register" : "login";
      updateAuthModalTabs();
    });
  }

  // Enviar formulario de autenticación
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById("auth-username");
      const passwordInput = document.getElementById("auth-password");
      const confirmInput = document.getElementById("auth-confirm-password");

      const username = usernameInput ? usernameInput.value : "";
      const password = passwordInput ? passwordInput.value : "";
      const confirmPassword = confirmInput ? confirmInput.value : "";

      if (errorAlert) errorAlert.classList.remove("visible");

      if (state.authMode === "register") {
        const result = AuthService.register(username, password, confirmPassword);
        if (!result.success) {
          showAuthError(result.error);
          return;
        }
        state.loadUser(result.user);
        closeAuthModal();
        updateUserHeaderDisplay();
        updateLivingProfileHud();
        renderFeed();
        showToast(`¡Cuenta creada con éxito! Bienvenido, ${result.user.username}.`);
        // Abrir onboarding para configurar preferencias del nuevo usuario
        openOnboarding();
      } else {
        const result = AuthService.login(username, password);
        if (!result.success) {
          showAuthError(result.error);
          return;
        }
        state.loadUser(result.user);
        closeAuthModal();
        updateUserHeaderDisplay();
        updateLivingProfileHud();
        renderFeed();
        showToast(`Sesión iniciada. Bienvenido de nuevo, ${result.user.username}.`);
      }
    });
  }

  function showAuthError(msg) {
    if (errorAlert) {
      errorAlert.textContent = msg;
      errorAlert.classList.add("visible");
    }
  }

  function updateAuthModalTabs() {
    const tabLog = document.getElementById("tab-login");
    const tabReg = document.getElementById("tab-register");
    const groupConfirm = document.getElementById("group-confirm-password");
    const submitBtn = document.getElementById("btn-auth-submit");
    const switchPrompt = document.getElementById("auth-switch-prompt");
    const switchLnk = document.getElementById("auth-switch-link");
    const err = document.getElementById("auth-error-alert");

    if (err) err.classList.remove("visible");

    if (state.authMode === "register") {
      if (tabReg) tabReg.classList.add("active");
      if (tabLog) tabLog.classList.remove("active");
      if (groupConfirm) groupConfirm.style.display = "flex";
      if (submitBtn) submitBtn.textContent = "Crear Cuenta de Usuario";
      if (switchPrompt) switchPrompt.textContent = "¿Ya tienes cuenta?";
      if (switchLnk) switchLnk.textContent = "Inicia sesión aquí";
    } else {
      if (tabLog) tabLog.classList.add("active");
      if (tabReg) tabReg.classList.remove("active");
      if (groupConfirm) groupConfirm.style.display = "none";
      if (submitBtn) submitBtn.textContent = "Iniciar Sesión";
      if (switchPrompt) switchPrompt.textContent = "¿No tienes cuenta todavía?";
      if (switchLnk) switchLnk.textContent = "Regístrate aquí";
    }
  }
}

function updateUserHeaderDisplay() {
  const displayName = document.getElementById("user-display-name");
  const avatarBadge = document.getElementById("user-avatar-badge");
  const dropdownName = document.getElementById("dropdown-user-name");
  const dropdownMeta = document.getElementById("dropdown-user-meta");
  const dropdownAuthText = document.getElementById("dropdown-auth-text");
  const dropdownBtnLogout = document.getElementById("dropdown-btn-logout");

  if (state.currentUser) {
    const name = state.currentUser.username;
    if (displayName) displayName.textContent = name;
    if (avatarBadge) avatarBadge.textContent = name.charAt(0).toUpperCase();
    if (dropdownName) dropdownName.textContent = name;
    if (dropdownMeta) dropdownMeta.textContent = `Cuenta activa · ${state.matchingEngine.profile.room || 'salón'}`;
    if (dropdownAuthText) dropdownAuthText.textContent = "Cambiar de Cuenta";
    if (dropdownBtnLogout) dropdownBtnLogout.style.display = "flex";
  } else {
    if (displayName) displayName.textContent = "Iniciar Sesión";
    if (avatarBadge) avatarBadge.textContent = "👤";
    if (dropdownName) dropdownName.textContent = "Modo Invitado";
    if (dropdownMeta) dropdownMeta.textContent = "Tus datos se guardan solo localmente";
    if (dropdownAuthText) dropdownAuthText.textContent = "Iniciar Sesión / Registrarse";
    if (dropdownBtnLogout) dropdownBtnLogout.style.display = "none";
  }
}

// ==========================================================================
// FLUJO DE ONBOARDING GUIADO (OPCIÓN A)
// ==========================================================================
function initOnboarding() {
  const btnRestart = document.getElementById("btn-restart-onboarding");
  const btnPrev = document.getElementById("btn-onboarding-prev");
  const btnNext = document.getElementById("btn-onboarding-next");

  if (btnRestart) {
    btnRestart.addEventListener("click", () => {
      state.onboardingStep = 1;
      openOnboarding();
    });
  }

  renderRoomChoices();
  renderStyleChoices();
  initBudgetStep();
  renderPaletteChoices();

  btnPrev.addEventListener("click", () => {
    if (state.onboardingStep > 1) {
      state.onboardingStep--;
      updateOnboardingStepView();
    }
  });

  btnNext.addEventListener("click", () => {
    if (state.onboardingStep < 4) {
      state.onboardingStep++;
      updateOnboardingStepView();
    } else {
      completeOnboarding();
    }
  });
}

function openOnboarding() {
  const overlay = document.getElementById("onboarding-overlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    state.onboardingStep = 1;
    updateOnboardingStepView();
  }
}

function closeOnboarding() {
  const overlay = document.getElementById("onboarding-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

function renderRoomChoices() {
  const grid = document.getElementById("room-choice-grid");
  if (!grid) return;

  grid.innerHTML = ROOM_OPTIONS.map(room => {
    const isSelected = state.onboardingSelections.room === room.id;
    return `
      <div class="choice-card ${isSelected ? 'selected' : ''}" data-room-id="${room.id}">
        <div class="technical-label" style="color: var(--autumn-terracotta); margin-bottom: 4px;">Estancia</div>
        <div class="choice-name">${room.label}</div>
        <div class="choice-desc">${room.desc}</div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".choice-card").forEach(card => {
    card.addEventListener("click", () => {
      grid.querySelectorAll(".choice-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      state.onboardingSelections.room = card.getAttribute("data-room-id");
    });
  });
}

function renderStyleChoices() {
  const grid = document.getElementById("style-choice-grid");
  if (!grid) return;

  grid.innerHTML = STYLE_OPTIONS.map(style => {
    const isSelected = state.onboardingSelections.style === style.id;
    return `
      <div class="choice-card moodboard-card ${isSelected ? 'selected' : ''}" data-style-id="${style.id}">
        <img src="${style.image}" alt="${style.label}" class="moodboard-img" loading="lazy">
        <div class="moodboard-content">
          <div class="choice-name">${style.label}</div>
          <div class="choice-desc">${style.desc}</div>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".choice-card").forEach(card => {
    card.addEventListener("click", () => {
      grid.querySelectorAll(".choice-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      state.onboardingSelections.style = card.getAttribute("data-style-id");
    });
  });
}

function initBudgetStep() {
  const presets = document.querySelectorAll(".budget-preset-card");
  const slider = document.getElementById("budget-slider");
  const display = document.getElementById("budget-slider-display");

  presets.forEach(preset => {
    preset.addEventListener("click", () => {
      presets.forEach(p => p.classList.remove("selected"));
      preset.classList.add("selected");
      const val = Number(preset.getAttribute("data-budget"));
      state.onboardingSelections.budget = val;
      if (slider) slider.value = val;
      if (display) display.textContent = `${val.toLocaleString()} €`;
    });
  });

  if (slider) {
    slider.addEventListener("input", (e) => {
      const val = Number(e.target.value);
      state.onboardingSelections.budget = val;
      if (display) display.textContent = `${val.toLocaleString()} €`;
      presets.forEach(p => {
        if (Number(p.getAttribute("data-budget")) === val) {
          p.classList.add("selected");
        } else {
          p.classList.remove("selected");
        }
      });
    });
  }
}

function renderPaletteChoices() {
  const grid = document.getElementById("palette-choice-grid");
  if (!grid) return;

  grid.innerHTML = PALETTE_OPTIONS.map(pal => {
    const isSelected = state.onboardingSelections.palette === pal.id;
    return `
      <div class="choice-card palette-choice-card ${isSelected ? 'selected' : ''}" data-palette-id="${pal.id}">
        <div class="palette-swatch-box" style="background-color: ${pal.hex};"></div>
        <div>
          <div class="choice-name" style="font-size: 1.1rem;">${pal.label}</div>
          <div class="choice-desc">${pal.desc}</div>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".choice-card").forEach(card => {
    card.addEventListener("click", () => {
      grid.querySelectorAll(".choice-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      state.onboardingSelections.palette = card.getAttribute("data-palette-id");
    });
  });
}

function updateOnboardingStepView() {
  const stepText = document.getElementById("onboarding-step-text");
  const dots = document.querySelectorAll(".step-dot");
  const btnPrev = document.getElementById("btn-onboarding-prev");
  const btnNext = document.getElementById("btn-onboarding-next");
  const title = document.getElementById("onboarding-title");
  const subtitle = document.getElementById("onboarding-subtitle");

  stepText.textContent = `Paso ${state.onboardingStep} de 4`;

  dots.forEach(dot => {
    const stepNum = Number(dot.getAttribute("data-step"));
    dot.classList.remove("active", "completed");
    if (stepNum === state.onboardingStep) {
      dot.classList.add("active");
    } else if (stepNum < state.onboardingStep) {
      dot.classList.add("completed");
    }
  });

  document.querySelectorAll(".step-content").forEach((content, idx) => {
    content.classList.toggle("active", idx + 1 === state.onboardingStep);
  });

  btnPrev.style.visibility = state.onboardingStep === 1 ? "hidden" : "visible";
  btnNext.textContent = state.onboardingStep === 4 ? "Generar mi Matching Arquitectónico" : "Siguiente paso";

  if (state.onboardingStep === 1) {
    title.textContent = "1. Selecciona la Estancia Principal";
    subtitle.textContent = "¿Qué espacio arquitectónico vamos a amueblar en este proyecto?";
  } else if (state.onboardingStep === 2) {
    title.textContent = "2. Estilo Base Arquitectónico";
    subtitle.textContent = "Elige la corriente de diseño que servirá de ancla para las recomendaciones.";
  } else if (state.onboardingStep === 3) {
    title.textContent = "3. Presupuesto Estimado del Proyecto";
    subtitle.textContent = "Ajustaremos las propuestas para mantener la armonía de costes.";
  } else if (state.onboardingStep === 4) {
    title.textContent = "4. Paleta Cromática & Materiales";
    subtitle.textContent = "Define la tonalidad dominante para crear una composición coherente.";
  }
}

function completeOnboarding() {
  state.matchingEngine.setFromOnboarding(state.onboardingSelections);
  StorageService.setOnboardingCompleted(true);
  state.save();
  closeOnboarding();
  updateLivingProfileHud();
  renderFeed();
  showToast("¡Matching inicial generado con éxito! El sistema irá refinando las sugerencias según interactúes.");
}

// ==========================================================================
// LIVING PROFILE HUD (OPCIÓN C - APRENDIZAJE PROGRESIVO EN VIVO)
// ==========================================================================
function updateLivingProfileHud() {
  const dna = state.matchingEngine.getSpaceDna();

  // 1. Desglose de Estilos
  const stylesContainer = document.getElementById("hud-style-bars");
  if (stylesContainer) {
    stylesContainer.innerHTML = dna.styles.map(s => `
      <div class="hud-style-item" title="Afinidad con estilo ${s.name}: ${s.percent}%">
        <div class="hud-style-label">
          <span>${s.name}</span>
          <span class="hud-style-percent">${s.percent}%</span>
        </div>
        <div class="hud-bar-track">
          <div class="hud-bar-fill" style="width: ${s.percent}%;"></div>
        </div>
      </div>
    `).join("");
  }

  // 2. Muestras de Paleta
  const paletteContainer = document.getElementById("hud-palette-group");
  if (paletteContainer) {
    paletteContainer.innerHTML = dna.dominantPalettes.map(key => {
      const palObj = PALETTE_OPTIONS.find(p => p.id === key);
      const hex = palObj ? palObj.hex : "#c48b47";
      const label = palObj ? palObj.label : key;
      return `<div class="palette-swatch-circle" style="background-color: ${hex};" title="Paleta activa: ${label}"></div>`;
    }).join("");
  }

  // 3. Monitor de Presupuesto
  const budgetText = document.getElementById("hud-budget-text");
  const budgetFill = document.getElementById("hud-budget-meter-fill");
  if (budgetText && budgetFill) {
    budgetText.textContent = `${dna.budgetSpent.toLocaleString()} € / ${dna.budgetTotal.toLocaleString()} €`;
    const percent = Math.min(100, Math.round((dna.budgetSpent / (dna.budgetTotal || 1)) * 100));
    budgetFill.style.width = `${percent}%`;

    budgetFill.classList.remove("warning", "danger");
    if (percent >= 90) {
      budgetFill.classList.add("danger");
    } else if (percent >= 70) {
      budgetFill.classList.add("warning");
    }
  }

  // 4. Badge Contador de la Cesta
  const projectBadge = document.getElementById("project-count-badge");
  if (projectBadge) {
    projectBadge.textContent = dna.acceptedCount;
  }

  // 5. Drawer de Cesta
  updateCestaDrawerContent();
}

// ==========================================================================
// FEED DE RECOMENDACIONES ARQUITECTÓNICO
// ==========================================================================
function initToolbarAndFilters() {
  const pills = document.querySelectorAll(".filter-pill");
  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      pills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      state.filterCategory = pill.getAttribute("data-category");
      renderFeed();
    });
  });

  const searchInput = document.getElementById("feed-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderFeed();
    });
  }

  const sortSelect = document.getElementById("feed-sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      state.sortOption = e.target.value;
      renderFeed();
    });
  }
}

function renderFeed() {
  const grid = document.getElementById("furniture-grid");
  const statsText = document.getElementById("feed-stats-text");
  const roomTitle = document.getElementById("feed-room-title");
  if (!grid) return;

  const userRoom = state.matchingEngine.profile.room || "salón";
  const roomObj = ROOM_OPTIONS.find(r => r.id === userRoom);
  if (roomTitle) {
    roomTitle.textContent = `Recomendaciones para tu ${roomObj ? roomObj.label : userRoom}`;
  }

  const rejectedSet = new Set(state.matchingEngine.profile.rejectedIds);
  const acceptedSet = new Set(state.matchingEngine.profile.acceptedIds);

  let items = state.catalog.filter(item => !rejectedSet.has(item.id));

  if (state.filterCategory !== "all") {
    items = items.filter(item => item.category === state.filterCategory);
  }

  if (state.searchQuery) {
    items = items.filter(item => {
      const text = `${item.name} ${item.style} ${item.color} ${item.category} ${item.materials.join(" ")}`.toLowerCase();
      return text.includes(state.searchQuery);
    });
  }

  const scoredItems = items.map(item => {
    const score = state.matchingEngine.calculateScore(item);
    const matchReason = state.matchingEngine.generateMatchReason(item, score);
    return { ...item, score, matchReason };
  });

  scoredItems.sort((a, b) => {
    if (state.sortOption === "match-desc") {
      return b.score - a.score;
    } else if (state.sortOption === "price-asc") {
      return a.price - b.price;
    } else if (state.sortOption === "price-desc") {
      return b.price - a.price;
    } else if (state.sortOption === "width-desc") {
      return (b.dimensions.width || 0) - (a.dimensions.width || 0);
    }
    return 0;
  });

  if (statsText) {
    statsText.textContent = `Mostrando ${scoredItems.length} recomendaciones afinadas a tu perfil arquitectónico`;
  }

  if (scoredItems.length === 0) {
    grid.innerHTML = `
      <div class="empty-feed-box">
        <h3 class="empty-feed-title">No hay piezas que coincidan con estos filtros</h3>
        <p class="empty-feed-desc">Has descartado varias opciones o los filtros actuales son muy estrictos. Prueba a restablecer los filtros o reactivar piezas descartadas.</p>
        <button id="btn-reset-filters" class="btn btn-primary btn-sm">Limpiar Filtros y Búsqueda</button>
      </div>
    `;
    const btnReset = document.getElementById("btn-reset-filters");
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        state.filterCategory = "all";
        state.searchQuery = "";
        const searchInput = document.getElementById("feed-search-input");
        if (searchInput) searchInput.value = "";
        document.querySelectorAll(".filter-pill").forEach(p => p.classList.toggle("active", p.getAttribute("data-category") === "all"));
        renderFeed();
      });
    }
    return;
  }

  grid.innerHTML = scoredItems.map(item => {
    const isAccepted = acceptedSet.has(item.id);
    return `
      <article class="furniture-card ${isAccepted ? 'is-accepted' : ''}" id="card-${item.id}">
        <!-- Media / Imagen -->
        <div class="card-media-wrap">
          <img src="${item.imageUrl}" alt="${item.name}" class="card-img" loading="lazy">
          <div class="card-badges-overlay">
            <span class="match-score-badge">
              <span>★</span> ${item.score}% Match
            </span>
            <span class="room-badge">${item.category}</span>
          </div>
        </div>

        <!-- Contenido -->
        <div class="card-content">
          <!-- Motivo Explicable del Algoritmo -->
          <div class="match-reason-box">
            <div class="match-reason-text">
              <strong>Afinidad:</strong> ${item.matchReason}
            </div>
          </div>

          <!-- Cabecera de Mueble -->
          <div class="card-header-row">
            <h3 class="card-title">${item.name}</h3>
            <span class="card-price">${item.price.toLocaleString()} €</span>
          </div>

          <p class="card-description">${item.description}</p>

          <!-- Cotas Técnicas (Dibujo Arquitectónico) -->
          <div class="technical-specs-box">
            <div class="cota-line">
              <span>Cotas (A × H × P):</span>
              <span class="cota-val">${item.dimensions.width} × ${item.dimensions.height} × ${item.dimensions.depth} cm</span>
            </div>
            <div class="cota-line">
              <span>Estilo:</span>
              <span class="cota-val">${item.style}</span>
            </div>
          </div>

          <!-- Etiquetas de Materiales -->
          <div class="card-tags-row">
            ${item.materials.map(m => `<span class="material-tag">${m}</span>`).join("")}
            <span class="material-tag" style="color: var(--autumn-terracotta); border-color: rgba(184,84,51,0.3);">${item.color}</span>
          </div>

          <!-- Acciones de Aceptar / Negar (Cesta) -->
          ${isAccepted ? `
            <div class="card-accepted-banner">
              <span>✓ Añadido a tu Cesta</span>
              <button class="btn-undo-accept" data-action="undo" data-id="${item.id}">Quitar de la Cesta</button>
            </div>
          ` : `
            <div class="card-actions-bar">
              <button class="btn-reject" data-action="reject" data-id="${item.id}" title="Descartar esta recomendación">
                <span>✕</span> Negar
              </button>
              <button class="btn-accept" data-action="accept" data-id="${item.id}" title="Aceptar oferta y añadir a la cesta">
                <span>✓</span> Aceptar Oferta
              </button>
            </div>
          `}
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      const item = state.catalog.find(it => it.id === id);
      if (!item) return;

      if (action === "accept") {
        handleAcceptItem(item);
      } else if (action === "reject") {
        handleRejectItem(item);
      } else if (action === "undo") {
        handleUndoItem(item);
      }
    });
  });
}

// ==========================================================================
// INTERACCIONES: ACEPTAR O NEGAR OFERTA (CESTA)
// ==========================================================================
function handleAcceptItem(item) {
  state.matchingEngine.acceptItem(item);
  state.save();
  updateLivingProfileHud();
  renderFeed();

  showToast(`"${item.name}" añadido a tu Cesta (+${item.price} €).`, {
    undoText: "Deshacer",
    onUndo: () => handleUndoItem(item)
  });
}

function handleRejectItem(item) {
  const card = document.getElementById(`card-${item.id}`);
  if (card) {
    card.classList.add("dismissing");
    setTimeout(() => {
      state.matchingEngine.rejectItem(item);
      state.save();
      updateLivingProfileHud();
      renderFeed();

      showToast(`Oferta descartada. El algoritmo atenuó este estilo.`, {
        undoText: "Deshacer",
        onUndo: () => handleUndoItem(item)
      });
    }, 240);
  } else {
    state.matchingEngine.rejectItem(item);
    state.save();
    updateLivingProfileHud();
    renderFeed();
  }
}

function handleUndoItem(item) {
  state.matchingEngine.undoItemAction(item);
  state.save();
  updateLivingProfileHud();
  renderFeed();
  showToast(`Acción deshecha para "${item.name}".`);
}

// ==========================================================================
// DRAWER LATERAL: "TU CESTA" (ANTES MI PROYECTO)
// ==========================================================================
function initCestaDrawer() {
  const overlay = document.getElementById("project-drawer-overlay");
  const drawer = document.getElementById("project-drawer");
  const btnToggle = document.getElementById("btn-toggle-project");
  const btnClose = document.getElementById("btn-close-drawer");
  const btnExport = document.getElementById("btn-export-project");
  const btnClear = document.getElementById("btn-clear-project");

  const openDrawer = () => {
    overlay.classList.add("open");
    drawer.classList.add("open");
  };

  const closeDrawer = () => {
    overlay.classList.remove("open");
    drawer.classList.remove("open");
  };

  if (btnToggle) btnToggle.addEventListener("click", openDrawer);
  if (btnClose) btnClose.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (confirm("¿Estás seguro de vaciar todos los muebles de tu cesta?")) {
        const acceptedIds = [...state.matchingEngine.profile.acceptedIds];
        acceptedIds.forEach(id => {
          const item = state.catalog.find(it => it.id === id);
          if (item) state.matchingEngine.undoItemAction(item);
        });
        state.save();
        updateLivingProfileHud();
        renderFeed();
        showToast("Cesta vaciada correctamente.");
      }
    });
  }

  if (btnExport) {
    btnExport.addEventListener("click", exportCestaDossier);
  }
}

function updateCestaDrawerContent() {
  const list = document.getElementById("drawer-items-list");
  const subtitle = document.getElementById("drawer-subtitle");
  const spentVal = document.getElementById("drawer-spent-val");
  const remainingVal = document.getElementById("drawer-remaining-val");
  const barFill = document.getElementById("drawer-budget-bar-fill");
  if (!list) return;

  const acceptedIds = state.matchingEngine.profile.acceptedIds;
  const acceptedItems = state.catalog.filter(it => acceptedIds.includes(it.id));

  const totalSpent = acceptedItems.reduce((sum, it) => sum + it.price, 0);
  const totalBudget = state.matchingEngine.profile.budget || 4500;
  const remaining = totalBudget - totalSpent;

  if (subtitle) subtitle.textContent = `${acceptedItems.length} muebles en la cesta`;
  if (spentVal) spentVal.textContent = `${totalSpent.toLocaleString()} €`;
  if (remainingVal) {
    if (remaining >= 0) {
      remainingVal.textContent = `Restante: ${remaining.toLocaleString()} €`;
      remainingVal.classList.remove("exceeded");
    } else {
      remainingVal.textContent = `Excedido por: ${Math.abs(remaining).toLocaleString()} €`;
      remainingVal.classList.add("exceeded");
    }
  }

  if (barFill) {
    const percent = Math.min(100, Math.round((totalSpent / totalBudget) * 100));
    barFill.style.width = `${percent}%`;
    barFill.style.backgroundColor = remaining < 0 ? "var(--color-danger)" : "var(--autumn-terracotta)";
  }

  if (acceptedItems.length === 0) {
    list.innerHTML = `
      <div class="drawer-empty-state">
        <div class="drawer-empty-icon">🧺</div>
        <div class="drawer-empty-text">Tu cesta está vacía.<br>Explora las recomendaciones y pulsa en "Aceptar Oferta" para ir añadiendo muebles a tu espacio.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = acceptedItems.map(item => `
    <div class="drawer-item-card">
      <img src="${item.imageUrl}" alt="${item.name}" class="drawer-item-img">
      <div class="drawer-item-info">
        <div class="drawer-item-title">${item.name}</div>
        <div class="drawer-item-cota">${item.dimensions.width} × ${item.dimensions.height} × ${item.dimensions.depth} cm · ${item.style}</div>
        <div class="drawer-item-price">${item.price.toLocaleString()} €</div>
      </div>
      <button class="btn-remove-drawer-item" data-id="${item.id}" title="Quitar de la cesta">✕</button>
    </div>
  `).join("");

  list.querySelectorAll(".btn-remove-drawer-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const item = state.catalog.find(it => it.id === id);
      if (item) handleUndoItem(item);
    });
  });
}

function exportCestaDossier() {
  const acceptedIds = state.matchingEngine.profile.acceptedIds;
  const items = state.catalog.filter(it => acceptedIds.includes(it.id));
  if (items.length === 0) {
    alert("Agrega al menos un mueble a tu cesta antes de exportar.");
    return;
  }

  const dossier = {
    documento: "ESPACIO · Resumen de Compra y Selección de Cesta",
    fecha: new Date().toLocaleDateString("es-ES"),
    usuario: state.currentUser ? state.currentUser.username : "Invitado",
    estancia: state.matchingEngine.profile.room,
    estiloPrincipal: state.matchingEngine.profile.preferredStyle,
    presupuestoAsignado: state.matchingEngine.profile.budget,
    totalCesta: items.reduce((acc, it) => acc + it.price, 0),
    articulosEnCesta: items.map(it => ({
      nombre: it.name,
      categoria: it.category,
      precio: it.price,
      estilo: it.style,
      color: it.color,
      cotasCm: it.dimensions,
      materiales: it.materials
    }))
  };

  const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resumen-cesta-${state.matchingEngine.profile.room}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Resumen de Cesta descargado con éxito.");
}

// ==========================================================================
// IMPORTADOR UNIVERSAL DE CSV
// ==========================================================================
function initCsvModal() {
  const modalOverlay = document.getElementById("csv-modal-overlay");
  const btnOpen = document.getElementById("btn-open-csv");
  const btnClose = document.getElementById("btn-close-csv-modal");
  const btnCancel = document.getElementById("btn-cancel-csv");
  const btnConfirm = document.getElementById("btn-confirm-csv");
  const dropzone = document.getElementById("csv-dropzone");
  const fileInput = document.getElementById("csv-file-input");
  const btnSample = document.getElementById("btn-download-sample-csv");
  const btnRestore = document.getElementById("btn-restore-default-catalog");
  const previewBox = document.getElementById("csv-preview-box");
  const statsSummary = document.getElementById("csv-stats-summary");

  const openModal = () => {
    state.pendingCsvItems = null;
    btnConfirm.disabled = true;
    previewBox.classList.remove("visible");
    modalOverlay.classList.add("open");
  };

  const closeModal = () => {
    modalOverlay.classList.remove("open");
  };

  if (btnOpen) btnOpen.addEventListener("click", openModal);
  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        processCsvFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        processCsvFile(e.target.files[0]);
      }
    });
  }

  function processCsvFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const result = CsvCatalogParser.parse(text);
        state.pendingCsvItems = result.items;
        btnConfirm.disabled = false;
        previewBox.classList.add("visible");
        statsSummary.textContent = `✓ ${result.items.length} muebles analizados correctamente. Listos para ser cargados.`;
      } catch (err) {
        alert("Error al leer el archivo CSV: " + err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  if (btnConfirm) {
    btnConfirm.addEventListener("click", () => {
      if (state.pendingCsvItems && state.pendingCsvItems.length > 0) {
        state.catalog = state.pendingCsvItems;
        state.save();
        closeModal();
        renderFeed();
        updateLivingProfileHud();
        showToast(`Catálogo personalizado cargado con ${state.catalog.length} muebles.`);
      }
    });
  }

  if (btnSample) {
    btnSample.addEventListener("click", () => {
      const sampleContent = CsvCatalogParser.generateSampleCsv();
      const blob = new Blob([sampleContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla_muebles_arquitectura.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (btnRestore) {
    btnRestore.addEventListener("click", () => {
      if (confirm("¿Deseas restaurar el catálogo predeterminado de 18 piezas arquitectónicas?")) {
        state.catalog = [...INITIAL_FURNITURE_DATA];
        state.save();
        closeModal();
        renderFeed();
        updateLivingProfileHud();
        showToast("Catálogo por defecto restaurado.");
      }
    });
  }
}

// ==========================================================================
// SISTEMA DE NOTIFICACIONES TOAST CON ACCIÓN "DESHACER"
// ==========================================================================
function showToast(message, options = {}) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-item";

  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);

  if (options.undoText && typeof options.onUndo === "function") {
    const undoBtn = document.createElement("button");
    undoBtn.className = "toast-btn-undo";
    undoBtn.textContent = options.undoText;
    undoBtn.addEventListener("click", () => {
      options.onUndo();
      toast.classList.add("exit");
      setTimeout(() => toast.remove(), 200);
    });
    toast.appendChild(undoBtn);
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("exit");
    setTimeout(() => toast.remove(), 200);
  }, 4200);
}
