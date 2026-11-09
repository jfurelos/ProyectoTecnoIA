/**
 * ESPACIO · ARCHITECTURAL MATCHING PLATFORM
 * Coordinador principal de estado, cuentas de usuario, cesta, eventos, renderizado y reactividad.
 */

import { INITIAL_FURNITURE_DATA, ROOM_OPTIONS, STYLE_OPTIONS, PALETTE_OPTIONS } from './data/furnitureData.js';
import { FURNITURE_CATALOG_RAG } from './data/furnitureCatalogRAG.js';
import { getCatalogByLang } from './data/catalogs/index.js';
import { MatchingEngine } from './services/matchingEngine.js';
import { RagEngine } from './services/ragEngine.js';
import { CsvCatalogParser } from './services/csvParser.js';
import { StorageService } from './services/storage.js';
import { AuthService } from './services/authService.js';
import { DatabaseAdapter } from './services/dbAdapter.js';
import { CheckoutService } from './services/checkoutService.js';
import {
  LANGUAGE_IMAGES,
  UI_TRANSLATIONS,
  getRoomOptions,
  getStyleOptions,
  getPaletteOptions,
  getQuickSuggestions
} from './config/languages.js';

export { LANGUAGE_IMAGES, UI_TRANSLATIONS };

// ==========================================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================================================
class AppState {
  constructor() {
    // 1. Usuario actual
    this.currentUser = AuthService.getCurrentUser();

    // Idioma activo
    const savedLang = typeof localStorage !== 'undefined' ? (localStorage.getItem("espacio_language") || "es") : "es";
    this.currentLanguage = LANGUAGE_IMAGES[savedLang] ? savedLang : "es";

    // 2. Catálogo de Muebles según idioma (o CSV personalizado si se cargó)
    const savedCatalog = StorageService.getCatalog();
    this.isCustomCatalog = false;
    if (savedCatalog && (savedCatalog.isCustom || (!Array.isArray(savedCatalog) && Array.isArray(savedCatalog.items)))) {
      this.isCustomCatalog = true;
      this.catalog = savedCatalog.items;
      const initialImg = LANGUAGE_IMAGES[this.currentLanguage];
      this.catalog.forEach(item => { item.imageUrl = initialImg; });
    } else {
      this.catalog = getCatalogByLang(this.currentLanguage);
    }

    // 3. Motor RAG Semántico (Indexa el catálogo actual)
    this.ragEngine = new RagEngine(this.catalog);

    // 4. Descripción de Gustos en Lenguaje Natural (RAG)
    this.tasteDescription = (this.currentUser && this.currentUser.tasteDescription)
      ? this.currentUser.tasteDescription
      : StorageService.getTasteDescription() || "";

    // 5. Perfil del Usuario & Motor de Matching
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

    // 6. Filtros y Búsqueda del Feed
    this.filterCategory = "all";
    this.searchQuery = "";
    this.sortOption = "match-desc";

    // 7. Estado de Onboarding (Opción A)
    this.onboardingStep = 1;
    this.onboardingSelections = {
      room: this.matchingEngine.profile.room || "salón",
      style: this.matchingEngine.profile.preferredStyle || "Japandi",
      budget: this.matchingEngine.profile.budget || 4500,
      palette: this.matchingEngine.profile.preferredPalette || "terracota"
    };

    // 8. CSV Temporal para previsualización
    this.pendingCsvItems = null;

    // 9. Tema Activo
    this.theme = StorageService.getTheme() || "autumn-default";

    // 10. Estado del modal de autenticación y checkout
    this.authMode = "login"; // "login" o "register"
    this.selectedPaymentMethod = "Tarjeta Bancaria";
  }

  save() {
    if (this.isCustomCatalog) {
      StorageService.saveCatalog({ isCustom: true, items: this.catalog });
    } else {
      StorageService.saveCatalog(null);
    }
    StorageService.saveProfile(this.matchingEngine.profile);
    StorageService.saveTheme(this.theme);
    StorageService.saveTasteDescription(this.tasteDescription);

    // Sincronizar en la capa de datos híbrida (LocalStorage y Firestore si está activo)
    DatabaseAdapter.syncUserData(
      this.matchingEngine.profile,
      this.matchingEngine.profile.acceptedIds,
      this.matchingEngine.profile.rejectedIds,
      this.tasteDescription
    );
  }

  loadUser(user) {
    this.currentUser = user;
    if (user) {
      if (user.tasteDescription !== undefined) {
        this.tasteDescription = user.tasteDescription || "";
      }
      if (user.profile) {
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
    }
    this.save();
  }
}

const state = new AppState();

// ==========================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================================================
function initApp() {
  initTheme();
  initAuthSystem();
  initOnboarding();
  initToolbarAndFilters();
  initCestaDrawer();
  initCsvModal();
  initVisionModal();
  initCheckoutAndTicket();
  initLanguageSelector();
  updateUserHeaderDisplay();
  updateLivingProfileHud();
  updateVisionBannerDisplay();
  renderFeed();

  // Si no hay usuario y no se ha completado el onboarding previamente, mostrarlo al inicio (Opción A)
  if (!StorageService.isOnboardingCompleted() && !state.currentUser) {
    openOnboarding();
  } else {
    closeOnboarding();
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}

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
    const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
    const themeName = e.target.options[e.target.selectedIndex].text;
    showToast(typeof t.toastThemeUpdated === "function" ? t.toastThemeUpdated(themeName) : `Tema actualizado a: ${themeName}`);
  });
}

// ==========================================================================
// GESTIÓN DE IDIOMAS Y FOTOS DE MUEBLES (ES, CA, EN, ZH)
// ==========================================================================
function applyLanguage(lang) {
  if (!LANGUAGE_IMAGES[lang]) lang = "es";
  state.currentLanguage = lang;
  try {
    localStorage.setItem("espacio_language", lang);
  } catch (e) {
    // Si localStorage no está disponible en el entorno
  }

  document.documentElement.lang = lang;

  const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.es;
  if (t.docTitle) {
    document.title = t.docTitle;
  }

  // 1. Cargar el catálogo completo correspondiente al idioma si no es un catálogo CSV personalizado
  if (!state.isCustomCatalog) {
    state.catalog = getCatalogByLang(lang);
  } else {
    const targetImg = LANGUAGE_IMAGES[lang];
    state.catalog.forEach(item => {
      item.imageUrl = targetImg;
    });
  }

  // Actualizar motor RAG con el catálogo del idioma seleccionado
  state.ragEngine = new RagEngine(state.catalog);

  // 2. Actualizar estado visual de los botones del header
  document.querySelectorAll("#lang-selector-group .lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  // 3. Traducir todos los elementos marcados con data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (t[key] !== undefined) {
      el.textContent = t[key];
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (t[key] !== undefined) {
      el.placeholder = t[key];
    }
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    if (t[key] !== undefined) {
      el.title = t[key];
    }
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => {
    const key = el.getAttribute("data-i18n-aria");
    if (t[key] !== undefined) {
      el.setAttribute("aria-label", t[key]);
    }
  });

  const searchInput = document.getElementById("feed-search-input");
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;

  // Actualizar chips de sugerencias rápidas en auth y visión modal
  const suggestions = getQuickSuggestions(lang);
  document.querySelectorAll("#auth-taste-chips .taste-chip, #vision-modal-chips .taste-chip").forEach(chip => {
    const idx = Number(chip.getAttribute("data-chip-idx"));
    if (!isNaN(idx) && suggestions[idx]) {
      chip.textContent = suggestions[idx].chip;
      chip.setAttribute("data-text", suggestions[idx].text);
    }
  });

  // 4. Actualizar vistas dependientes del idioma de forma segura
  if (typeof updateAuthModalTabs === "function") updateAuthModalTabs();
  if (typeof updateUserHeaderDisplay === "function") updateUserHeaderDisplay();
  if (typeof renderRoomChoices === "function") renderRoomChoices();
  if (typeof renderStyleChoices === "function") renderStyleChoices();
  if (typeof renderPaletteChoices === "function") renderPaletteChoices();
  if (typeof updateOnboardingStepView === "function") updateOnboardingStepView();
  if (typeof updateLivingProfileHud === "function") updateLivingProfileHud();
  if (typeof updateVisionBannerDisplay === "function") updateVisionBannerDisplay();
  if (typeof renderFeed === "function") renderFeed();
  if (typeof updateCestaDrawerContent === "function") {
    updateCestaDrawerContent();
  }
}

function initLanguageSelector() {
  const container = document.getElementById("lang-selector-group");
  if (!container) return;

  // Aplicar idioma inicial guardado o por defecto
  applyLanguage(state.currentLanguage || "es");

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".lang-btn");
    if (!btn) return;
    const selectedLang = btn.dataset.lang;
    if (selectedLang && selectedLang !== state.currentLanguage) {
      applyLanguage(selectedLang);
      const t = UI_TRANSLATIONS[selectedLang];
      showToast(t ? t.toast : `Idioma: ${selectedLang}`);
    }
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

  // Click en chips de sugerencias del registro
  const regChips = document.querySelectorAll("#group-taste-description .taste-chip");
  regChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const tasteInput = document.getElementById("auth-taste-desc");
      if (tasteInput) {
        tasteInput.value = chip.getAttribute("data-text");
      }
    });
  });

  // Cerrar sesión
  if (dropdownBtnLogout) {
    dropdownBtnLogout.addEventListener("click", () => {
      const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
      AuthService.logout();
      state.currentUser = null;
      state.tasteDescription = "";
      state.matchingEngine = new MatchingEngine();
      state.save();
      updateUserHeaderDisplay();
      updateLivingProfileHud();
      updateVisionBannerDisplay();
      renderFeed();
      if (dropdown) dropdown.classList.remove("open");
      showToast(t.toastLogout);
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
      const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
      const usernameInput = document.getElementById("auth-username");
      const passwordInput = document.getElementById("auth-password");
      const confirmInput = document.getElementById("auth-confirm-password");
      const tasteInput = document.getElementById("auth-taste-desc");

      const username = usernameInput ? usernameInput.value : "";
      const password = passwordInput ? passwordInput.value : "";
      const confirmPassword = confirmInput ? confirmInput.value : "";
      const tasteDescription = tasteInput ? tasteInput.value : "";

      if (errorAlert) errorAlert.classList.remove("visible");

      if (state.authMode === "register") {
        const result = AuthService.register(username, password, confirmPassword, tasteDescription);
        if (!result.success) {
          showAuthError(result.error);
          return;
        }
        state.loadUser(result.user);
        closeAuthModal();
        updateUserHeaderDisplay();
        updateLivingProfileHud();
        updateVisionBannerDisplay();
        renderFeed();
        showToast(t.toastRegisterSuccess(result.user.username));
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
        updateVisionBannerDisplay();
        renderFeed();
        showToast(t.toastLoginSuccess(result.user.username));
      }
    });
  }

  function showAuthError(msg) {
    if (errorAlert) {
      errorAlert.textContent = msg;
      errorAlert.classList.add("visible");
    }
  }
}

function updateAuthModalTabs() {
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  const tabLog = document.getElementById("tab-login");
  const tabReg = document.getElementById("tab-register");
  const groupConfirm = document.getElementById("group-confirm-password");
  const groupTaste = document.getElementById("group-taste-description");
  const submitBtn = document.getElementById("btn-auth-submit");
  const switchPrompt = document.getElementById("auth-switch-prompt");
  const switchLnk = document.getElementById("auth-switch-link");
  const err = document.getElementById("auth-error-alert");

  if (err) err.classList.remove("visible");

  if (state.authMode === "register") {
    if (tabReg) tabReg.classList.add("active");
    if (tabLog) tabLog.classList.remove("active");
    if (groupConfirm) groupConfirm.style.display = "flex";
    if (groupTaste) groupTaste.style.display = "block";
    if (submitBtn) submitBtn.textContent = t.authBtnRegister;
    if (switchPrompt) switchPrompt.textContent = t.authSwitchHaveAccount;
    if (switchLnk) switchLnk.textContent = t.authSwitchLoginLink;
  } else {
    if (tabLog) tabLog.classList.add("active");
    if (tabReg) tabReg.classList.remove("active");
    if (groupConfirm) groupConfirm.style.display = "none";
    if (groupTaste) groupTaste.style.display = "none";
    if (submitBtn) submitBtn.textContent = t.authBtnLogin;
    if (switchPrompt) switchPrompt.textContent = t.authSwitchNoAccount;
    if (switchLnk) switchLnk.textContent = t.authSwitchRegisterLink;
  }
}

function updateUserHeaderDisplay() {
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  const displayName = document.getElementById("user-display-name");
  const avatarBadge = document.getElementById("user-avatar-badge");
  const dropdownName = document.getElementById("dropdown-user-name");
  const dropdownMeta = document.getElementById("dropdown-user-meta");
  const dropdownAuthText = document.getElementById("dropdown-auth-text");
  const dropdownBtnLogout = document.getElementById("dropdown-btn-logout");
  const cloudBadge = document.getElementById("cloud-status-badge");
  const cloudText = document.getElementById("cloud-status-text");

  // Estado de conexión a la nube / Firebase
  if (cloudBadge && cloudText) {
    const isCloud = DatabaseAdapter.isCloudMode();
    if (isCloud) {
      cloudBadge.classList.add("connected");
      cloudText.textContent = t.cloudFirebase || "Firebase Cloud";
    } else {
      cloudBadge.classList.remove("connected");
      cloudText.textContent = t.cloudLocalStorage || "Almacenamiento Local";
    }
  }

  if (state.currentUser) {
    const name = state.currentUser.username;
    if (displayName) displayName.textContent = name;
    if (avatarBadge) avatarBadge.textContent = name.charAt(0).toUpperCase();
    if (dropdownName) dropdownName.textContent = name;
    const roomOpts = getRoomOptions(state.currentLanguage);
    const userRoomId = (state.matchingEngine.profile.room || 'salón').toLowerCase();
    const roomObj = roomOpts.find(r => r.id.toLowerCase() === userRoomId);
    if (dropdownMeta) dropdownMeta.textContent = roomObj ? roomObj.label : (state.matchingEngine.profile.room || 'salón');
    if (dropdownAuthText) dropdownAuthText.textContent = t.userDropdownAuthSwitch;
    if (dropdownBtnLogout) dropdownBtnLogout.style.display = "flex";
  } else {
    if (displayName) displayName.textContent = t.userDisplayNameGuest;
    if (avatarBadge) avatarBadge.textContent = "👤";
    if (dropdownName) dropdownName.textContent = t.userDropdownNameGuest;
    if (dropdownMeta) dropdownMeta.textContent = t.userDropdownGuestDesc;
    if (dropdownAuthText) dropdownAuthText.textContent = t.userDropdownAuthLogin;
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
  const btnClose = document.getElementById("btn-close-onboarding");

  if (btnRestart) {
    btnRestart.addEventListener("click", () => {
      state.onboardingStep = 1;
      openOnboarding();
    });
  }

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      closeOnboarding();
    });
  }

  renderRoomChoices();
  renderStyleChoices();
  initBudgetStep();
  renderPaletteChoices();

  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      if (state.onboardingStep > 1) {
        state.onboardingStep--;
        updateOnboardingStepView();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      if (state.onboardingStep < 4) {
        state.onboardingStep++;
        updateOnboardingStepView();
      } else {
        completeOnboarding();
      }
    });
  }
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
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  const roomOptions = getRoomOptions(state.currentLanguage);

  grid.innerHTML = roomOptions.map(room => {
    const isSelected = state.onboardingSelections.room === room.id;
    return `
      <div class="choice-card ${isSelected ? 'selected' : ''}" data-room-id="${room.id}">
        <div class="technical-label" style="color: var(--autumn-terracotta); margin-bottom: 4px;">${t.onboardingRoomBadge}</div>
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
  const styleOptions = getStyleOptions(state.currentLanguage);

  grid.innerHTML = styleOptions.map(style => {
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
  const paletteOptions = getPaletteOptions(state.currentLanguage);

  grid.innerHTML = paletteOptions.map(pal => {
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
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  const stepText = document.getElementById("onboarding-step-text");
  const dots = document.querySelectorAll(".step-dot");
  const btnPrev = document.getElementById("btn-onboarding-prev");
  const btnNext = document.getElementById("btn-onboarding-next");
  const title = document.getElementById("onboarding-title");
  const subtitle = document.getElementById("onboarding-subtitle");

  if (stepText) stepText.textContent = t.onboardingStepIndicator(state.onboardingStep, 4);

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

  if (btnPrev) {
    btnPrev.style.visibility = state.onboardingStep === 1 ? "hidden" : "visible";
    btnPrev.textContent = t.onboardingBtnPrev;
  }
  if (btnNext) {
    btnNext.textContent = state.onboardingStep === 4 ? t.onboardingBtnFinish : t.onboardingBtnNext;
  }

  if (state.onboardingStep === 1) {
    title.textContent = t.onboardingStep1Title;
    subtitle.textContent = t.onboardingStep1Subtitle;
  } else if (state.onboardingStep === 2) {
    title.textContent = t.onboardingStep2Title;
    subtitle.textContent = t.onboardingStep2Subtitle;
  } else if (state.onboardingStep === 3) {
    title.textContent = t.onboardingStep3Title;
    subtitle.textContent = t.onboardingStep3Subtitle;
  } else if (state.onboardingStep === 4) {
    title.textContent = t.onboardingStep4Title;
    subtitle.textContent = t.onboardingStep4Subtitle;
  }
}

function completeOnboarding() {
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  state.matchingEngine.setFromOnboarding(state.onboardingSelections);
  StorageService.setOnboardingCompleted(true);
  state.save();
  closeOnboarding();
  updateLivingProfileHud();
  renderFeed();
  showToast(t.toastOnboardingCompleted);
}

// ==========================================================================
// LIVING PROFILE HUD (OPCIÓN C - APRENDIZAJE PROGRESIVO EN VIVO)
// ==========================================================================
function updateLivingProfileHud() {
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  const dna = state.matchingEngine.getSpaceDna();
  const styleOptions = getStyleOptions(state.currentLanguage);
  const paletteOptions = getPaletteOptions(state.currentLanguage);

  // 1. Desglose de Estilos
  const stylesContainer = document.getElementById("hud-style-bars");
  if (stylesContainer) {
    stylesContainer.innerHTML = dna.styles.map(s => {
      const matchOpt = styleOptions.find(opt => opt.id === s.name);
      const styleName = matchOpt ? matchOpt.label : s.name;
      return `
        <div class="hud-style-item" title="${t.affinityLabel} ${styleName}: ${s.percent}%">
          <div class="hud-style-label">
            <span>${styleName}</span>
            <span class="hud-style-percent">${s.percent}%</span>
          </div>
          <div class="hud-bar-track">
            <div class="hud-bar-fill" style="width: ${s.percent}%;"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  // 2. Muestras de Paleta
  const paletteContainer = document.getElementById("hud-palette-group");
  if (paletteContainer) {
    paletteContainer.innerHTML = dna.dominantPalettes.map(key => {
      const palObj = paletteOptions.find(p => p.id === key);
      const hex = palObj ? palObj.hex : "#c48b47";
      const label = palObj ? palObj.label : key;
      return `<div class="palette-swatch-circle" style="background-color: ${hex};" title="${label}"></div>`;
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
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  const grid = document.getElementById("furniture-grid");
  const statsText = document.getElementById("feed-stats-text");
  const roomTitle = document.getElementById("feed-room-title");
  if (!grid) return;

  const userRoom = state.matchingEngine.profile.room || "salón";
  const roomOpts = getRoomOptions(state.currentLanguage);
  const roomObj = roomOpts.find(r => r.id === userRoom);
  if (roomTitle) {
    roomTitle.textContent = `${t.roomTitlePrefix} ${roomObj ? roomObj.label : userRoom}`;
  }

  const rejectedSet = new Set(state.matchingEngine.profile.rejectedIds);
  const acceptedSet = new Set(state.matchingEngine.profile.acceptedIds);

  let items = state.catalog.filter(item => !rejectedSet.has(item.id));

  if (state.filterCategory !== "all") {
    items = items.filter(item => (item.categoryKey || item.category) === state.filterCategory || item.category === state.filterCategory);
  }

  if (state.searchQuery) {
    items = items.filter(item => {
      const text = `${item.name} ${item.style} ${item.color} ${item.category} ${item.materials.join(" ")} ${item.tags ? item.tags.join(" ") : ""}`.toLowerCase();
      return text.includes(state.searchQuery);
    });
  }

  const hasRagVision = Boolean(state.tasteDescription && state.tasteDescription.trim().length > 2);
  let scoredItems = [];

  if (hasRagVision) {
    const ragResults = state.ragEngine.searchAndRerank({
      userTasteDescription: state.tasteDescription,
      targetRoom: state.matchingEngine.profile.room,
      budgetTotal: state.matchingEngine.profile.budget,
      budgetSpent: state.matchingEngine.profile.spent,
      preferredStyle: state.matchingEngine.profile.preferredStyle,
      preferredPalette: state.matchingEngine.profile.preferredPalette,
      topK: 0,
      lang: state.currentLanguage
    });

    const itemMap = new Map(items.map(it => [it.id, it]));
    scoredItems = ragResults
      .filter(r => itemMap.has(r.id))
      .map(r => {
        const baseItem = itemMap.get(r.id);
        const matchReason = state.matchingEngine.generateMatchReason(baseItem, r.score, state.currentLanguage);
        return {
          ...baseItem,
          score: r.score,
          matchReason: r.matchReason || matchReason,
          semanticCosine: r.semanticCosine
        };
      });
  } else {
    scoredItems = items.map(item => {
      const score = state.matchingEngine.calculateScore(item);
      const matchReason = state.matchingEngine.generateMatchReason(item, score, state.currentLanguage);
      return { ...item, score, matchReason };
    });
  }

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
    statsText.textContent = hasRagVision
      ? t.statsTextRag(scoredItems.length)
      : t.statsTextStandard(scoredItems.length);
  }

  if (scoredItems.length === 0) {
    grid.innerHTML = `
      <div class="empty-feed-box">
        <h3 class="empty-feed-title">${t.emptyFeedTitle}</h3>
        <p class="empty-feed-desc">${t.emptyFeedDesc}</p>
        <button id="btn-reset-filters" class="btn btn-primary btn-sm">${t.emptyFeedResetBtn}</button>
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
              <span>★</span> ${item.score}% ${t.matchLabel}
            </span>
            <span class="room-badge">${item.category}</span>
          </div>
        </div>

        <!-- Contenido -->
        <div class="card-content">
          <!-- Motivo Explicable del Algoritmo -->
          <div class="match-reason-box">
            <div class="match-reason-text">
              <strong>${t.affinityLabel}</strong> ${item.matchReason}
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
              <span>${t.cotasLabel}</span>
              <span class="cota-val">${item.dimensions.width} × ${item.dimensions.height} × ${item.dimensions.depth} cm</span>
            </div>
            <div class="cota-line">
              <span>${t.cardStyleLabel}</span>
              <span class="cota-val">${item.style}</span>
            </div>
          </div>

          <!-- Etiquetas de Diseño Oficiales y Materiales -->
          <div class="card-tags-row">
            ${Array.isArray(item.tags) ? item.tags.map(tag => `<span class="material-tag" style="font-weight: 600; color: var(--autumn-terracotta); border-color: rgba(184,84,51,0.35); background: rgba(184,84,51,0.06);">${tag}</span>`).join("") : ""}
            ${item.materials.map(m => `<span class="material-tag">${m}</span>`).join("")}
            <span class="material-tag" style="color: var(--text-secondary);">${item.color}</span>
          </div>

          <!-- Acciones de Aceptar / Negar (Cesta) -->
          ${isAccepted ? `
            <div class="card-accepted-banner">
              <span>${t.addedBannerText}</span>
              <button class="btn-undo-accept" data-action="undo" data-id="${item.id}">${t.addedBannerUndo}</button>
            </div>
          ` : `
            <div class="card-actions-bar">
              <button class="btn-reject" data-action="reject" data-id="${item.id}" title="${t.btnRejectTitle}">
                <span>✕</span> ${t.btnReject}
              </button>
              <button class="btn-accept" data-action="accept" data-id="${item.id}" title="${t.btnAcceptTitle}">
                <span>✓</span> ${t.btnAccept}
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
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  state.matchingEngine.acceptItem(item);
  state.save();
  updateLivingProfileHud();
  renderFeed();

  showToast(t.toastAddedToCart(item.name, item.price), {
    undoText: t.toastUndoBtn,
    onUndo: () => handleUndoItem(item)
  });
}

function handleRejectItem(item) {
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  const card = document.getElementById(`card-${item.id}`);
  if (card) {
    card.classList.add("dismissing");
    setTimeout(() => {
      state.matchingEngine.rejectItem(item);
      state.save();
      updateLivingProfileHud();
      renderFeed();

      showToast(t.toastRejectedOffer, {
        undoText: t.toastUndoBtn,
        onUndo: () => handleUndoItem(item)
      });
    }, 240);
  } else {
    state.matchingEngine.rejectItem(item);
    state.save();
    updateLivingProfileHud();
    renderFeed();
    showToast(t.toastRejectedOffer, {
      undoText: t.toastUndoBtn,
      onUndo: () => handleUndoItem(item)
    });
  }
}

function handleUndoItem(item) {
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  state.matchingEngine.undoItemAction(item);
  state.save();
  updateLivingProfileHud();
  renderFeed();
  showToast(t.toastUndoAction(item.name));
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
      const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
      if (confirm(t.drawerClearConfirm)) {
        const acceptedIds = [...state.matchingEngine.profile.acceptedIds];
        acceptedIds.forEach(id => {
          const item = state.catalog.find(it => it.id === id);
          if (item) state.matchingEngine.undoItemAction(item);
        });
        state.save();
        updateLivingProfileHud();
        renderFeed();
        showToast(t.toastCartEmptied);
      }
    });
  }

  if (btnExport) {
    btnExport.addEventListener("click", exportCestaDossier);
  }
}

function updateCestaDrawerContent() {
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
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

  if (subtitle) subtitle.textContent = t.drawerSubtitle(acceptedItems.length);
  if (spentVal) spentVal.textContent = `${totalSpent.toLocaleString()} €`;
  if (remainingVal) {
    if (remaining >= 0) {
      remainingVal.textContent = t.drawerRemaining(remaining.toLocaleString());
      remainingVal.classList.remove("exceeded");
    } else {
      remainingVal.textContent = t.drawerExceeded(Math.abs(remaining).toLocaleString());
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
        <div class="drawer-empty-text">${t.drawerEmptyText}</div>
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
      <button class="btn-remove-drawer-item" data-id="${item.id}" title="${t.drawerRemoveTooltip}">✕</button>
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
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
  const acceptedIds = state.matchingEngine.profile.acceptedIds;
  const items = state.catalog.filter(it => acceptedIds.includes(it.id));
  if (items.length === 0) {
    alert(t.toastCartExportEmptyAlert);
    return;
  }

  const roomOpts = getRoomOptions(state.currentLanguage);
  const roomObj = roomOpts.find(r => r.id === state.matchingEngine.profile.room);
  const localizedRoom = roomObj ? roomObj.label : state.matchingEngine.profile.room;

  const styleOpts = getStyleOptions(state.currentLanguage);
  const styleObj = styleOpts.find(s => s.id === state.matchingEngine.profile.preferredStyle);
  const localizedStyle = styleObj ? styleObj.label : state.matchingEngine.profile.preferredStyle;

  const dossier = {
    documento: `ESPACIO · ${t.drawerExportBtn}`,
    fecha: new Date().toLocaleDateString(state.currentLanguage === "en" ? "en-US" : state.currentLanguage === "ca" ? "ca-ES" : state.currentLanguage === "zh" ? "zh-CN" : "es-ES"),
    usuario: state.currentUser ? state.currentUser.username : (t.userDropdownNameGuest || "Guest"),
    estancia: localizedRoom,
    estiloPrincipal: localizedStyle,
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
  showToast(t.toastCartExported);
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
    const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const result = CsvCatalogParser.parse(text);
        state.pendingCsvItems = result.items;
        btnConfirm.disabled = false;
        previewBox.classList.add("visible");
        statsSummary.textContent = typeof t.csvStatsSummary === "function"
          ? t.csvStatsSummary(result.items.length)
          : `✓ ${result.items.length} muebles analizados correctamente. Listos para ser cargados.`;
      } catch (err) {
        alert((t.csvErrorReading || "Error al leer el archivo CSV: ") + err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  if (btnConfirm) {
    btnConfirm.addEventListener("click", () => {
      if (state.pendingCsvItems && state.pendingCsvItems.length > 0) {
        state.isCustomCatalog = true;
        state.catalog = state.pendingCsvItems;
        state.ragEngine = new RagEngine(state.catalog);
        state.save();
        closeModal();
        renderFeed();
        updateLivingProfileHud();
        const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
        showToast(typeof t.csvLoadedToast === "function"
          ? t.csvLoadedToast(state.catalog.length)
          : `Catálogo personalizado cargado con ${state.catalog.length} muebles.`);
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
      const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
      if (confirm(t.csvRestoreConfirm)) {
        state.isCustomCatalog = false;
        state.catalog = getCatalogByLang(state.currentLanguage || "es");
        state.ragEngine = new RagEngine(state.catalog);
        state.save();
        closeModal();
        renderFeed();
        updateLivingProfileHud();
        showToast(t.csvRestoredToast);
      }
    });
  }
}

// ==========================================================================
// VISIÓN ARQUITECTÓNICA & GUSTOS EN LENGUAJE NATURAL (RAG)
// ==========================================================================
function initVisionModal() {
  const modal = document.getElementById("vision-modal-overlay");
  const btnClose = document.getElementById("btn-close-vision-modal");
  const btnCancel = document.getElementById("btn-cancel-vision");
  const btnSave = document.getElementById("btn-save-vision");
  const textarea = document.getElementById("vision-modal-textarea");
  const chips = document.querySelectorAll("#vision-modal-chips .taste-chip");

  const btnHeader = document.getElementById("btn-open-vision-header");
  const btnDropdown = document.getElementById("dropdown-btn-vision");
  const btnHud = document.getElementById("btn-edit-vision-hud");

  const openVisionModal = () => {
    if (textarea) textarea.value = state.tasteDescription || "";
    if (modal) modal.classList.add("open");
    const dropdown = document.getElementById("user-dropdown-menu");
    if (dropdown) dropdown.classList.remove("open");
  };

  const closeVisionModal = () => {
    if (modal) modal.classList.remove("open");
  };

  if (btnHeader) btnHeader.addEventListener("click", openVisionModal);
  if (btnDropdown) btnDropdown.addEventListener("click", openVisionModal);
  if (btnHud) btnHud.addEventListener("click", openVisionModal);
  if (btnClose) btnClose.addEventListener("click", closeVisionModal);
  if (btnCancel) btnCancel.addEventListener("click", closeVisionModal);

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      if (textarea) {
        textarea.value = chip.getAttribute("data-text");
      }
    });
  });

  if (btnSave) {
    btnSave.addEventListener("click", () => {
      const text = textarea ? textarea.value.trim() : "";
      state.tasteDescription = text;
      state.save();
      updateVisionBannerDisplay();
      renderFeed();
      closeVisionModal();
      const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
      showToast(text ? t.toastVisionUpdated : t.toastVisionCleared);
    });
  }
}

function updateVisionBannerDisplay() {
  const display = document.getElementById("hud-vision-desc-display");
  if (!display) return;
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;

  if (state.tasteDescription && state.tasteDescription.trim().length > 0) {
    display.textContent = `"${state.tasteDescription}"`;
    display.style.fontStyle = "italic";
    display.style.color = "var(--text-primary)";
  } else {
    display.textContent = t.hudVisionDefaultDesc;
    display.style.fontStyle = "normal";
    display.style.color = "var(--text-secondary)";
  }
}

// ==========================================================================
// PASARELA DE CHECKOUT Y TICKET ARQUITECTÓNICO
// ==========================================================================
function initCheckoutAndTicket() {
  const btnOpenCheckout = document.getElementById("btn-open-checkout");
  const checkoutModal = document.getElementById("checkout-modal-overlay");
  const btnCloseCheckout = document.getElementById("btn-close-checkout-modal");
  const btnCancelCheckout = document.getElementById("btn-cancel-checkout");
  const btnConfirmCheckout = document.getElementById("btn-confirm-checkout");
  const paymentCards = document.querySelectorAll("#checkout-payment-methods .payment-method-card");
  const cardFields = document.getElementById("checkout-card-fields");

  const ticketModal = document.getElementById("ticket-modal-overlay");
  const btnPrintTicket = document.getElementById("btn-print-ticket");
  const btnCloseTicketHeader = document.getElementById("btn-close-ticket-modal-header");
  const btnFinishTicket = document.getElementById("btn-finish-ticket");

  // Abrir Modal de Checkout
  if (btnOpenCheckout) {
    btnOpenCheckout.addEventListener("click", () => {
      const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
      const acceptedIds = state.matchingEngine.profile.acceptedIds;
      const acceptedItems = state.catalog.filter(it => acceptedIds.includes(it.id));

      if (acceptedItems.length === 0) {
        showToast(t.checkoutEmptyCartAlert);
        return;
      }

      // Cerrar Drawer
      const drawer = document.getElementById("project-drawer");
      const drawerOverlay = document.getElementById("project-drawer-overlay");
      if (drawer) drawer.classList.remove("open");
      if (drawerOverlay) drawerOverlay.classList.remove("open");

      // Calcular totales
      const totals = CheckoutService.calculateTotals(acceptedItems);
      const itemsCountEl = document.getElementById("checkout-items-count");
      const subtotalEl = document.getElementById("checkout-subtotal-val");
      const vatEl = document.getElementById("checkout-vat-val");
      const totalEl = document.getElementById("checkout-total-val");

      if (itemsCountEl) itemsCountEl.textContent = typeof t.drawerPiecesCount === "function" ? t.drawerPiecesCount(totals.count) : `${totals.count} piezas`;
      if (subtotalEl) subtotalEl.textContent = `${totals.subtotal.toLocaleString()} €`;
      if (vatEl) vatEl.textContent = `${totals.vat.toLocaleString()} €`;
      if (totalEl) totalEl.textContent = `${totals.total.toLocaleString()} €`;

      // Autorellenar nombre y email si hay usuario
      const nameInput = document.getElementById("checkout-client-name");
      const emailInput = document.getElementById("checkout-client-email");
      if (state.currentUser) {
        if (nameInput && !nameInput.value) nameInput.value = state.currentUser.username;
        if (emailInput && !emailInput.value) emailInput.value = state.currentUser.email || `${state.currentUser.username.toLowerCase()}@espacio-arq.local`;
      }

      if (checkoutModal) checkoutModal.classList.add("open");
    });
  }

  const closeCheckout = () => {
    if (checkoutModal) checkoutModal.classList.remove("open");
  };

  if (btnCloseCheckout) btnCloseCheckout.addEventListener("click", closeCheckout);
  if (btnCancelCheckout) btnCancelCheckout.addEventListener("click", closeCheckout);

  // Selector interactivo de métodos de pago
  paymentCards.forEach(card => {
    card.addEventListener("click", () => {
      paymentCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      state.selectedPaymentMethod = card.getAttribute("data-method");

      if (cardFields) {
        cardFields.style.display = state.selectedPaymentMethod === "Tarjeta Bancaria" ? "block" : "none";
      }
    });
  });

  // Confirmar Pago
  if (btnConfirmCheckout) {
    btnConfirmCheckout.addEventListener("click", async () => {
      const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;
      const nameInput = document.getElementById("checkout-client-name");
      const emailInput = document.getElementById("checkout-client-email");
      const addressInput = document.getElementById("checkout-client-address");
      const phoneInput = document.getElementById("checkout-client-phone");

      const clientName = nameInput ? nameInput.value.trim() : "";
      const email = emailInput ? emailInput.value.trim() : "";
      const address = addressInput ? addressInput.value.trim() : "";
      const phone = phoneInput ? phoneInput.value.trim() : "";

      if (!clientName) {
        alert(t.checkoutNameAlert);
        if (nameInput) nameInput.focus();
        return;
      }
      if (!address) {
        alert(t.checkoutAddressAlert);
        if (addressInput) addressInput.focus();
        return;
      }

      const acceptedIds = state.matchingEngine.profile.acceptedIds;
      const acceptedItems = state.catalog.filter(it => acceptedIds.includes(it.id));

      try {
        btnConfirmCheckout.disabled = true;
        btnConfirmCheckout.textContent = t.checkoutProcessingBtn || "Procesando...";

        const result = await CheckoutService.completeCheckout({
          clientName,
          email,
          address,
          phone,
          paymentMethod: state.selectedPaymentMethod,
          items: acceptedItems,
          matchingEngine: state.matchingEngine,
          currentUser: state.currentUser
        });

        state.save();
        closeCheckout();

        // Renderizar y abrir ticket de compra
        renderArchitecturalTicket(result.order);
        if (ticketModal) ticketModal.classList.add("open");

        // Actualizar vistas
        updateLivingProfileHud();
        renderFeed();
        showToast(t.toastPaymentSuccess);
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        btnConfirmCheckout.disabled = false;
        btnConfirmCheckout.innerHTML = `<span>✓</span><span>${t.checkoutConfirmBtn}</span>`;
      }
    });
  }

  // Acciones del modal de ticket
  const closeTicket = () => {
    if (ticketModal) ticketModal.classList.remove("open");
  };

  if (btnCloseTicketHeader) btnCloseTicketHeader.addEventListener("click", closeTicket);
  if (btnFinishTicket) btnFinishTicket.addEventListener("click", closeTicket);

  if (btnPrintTicket) {
    btnPrintTicket.addEventListener("click", () => {
      window.print();
    });
  }
}

function renderArchitecturalTicket(order) {
  const container = document.getElementById("ticket-render-container");
  if (!container) return;
  const t = UI_TRANSLATIONS[state.currentLanguage] || UI_TRANSLATIONS.es;

  const dateLocale = state.currentLanguage === "en" ? "en-US" : state.currentLanguage === "ca" ? "ca-ES" : state.currentLanguage === "zh" ? "zh-CN" : "es-ES";
  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString(dateLocale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : order.formattedDate;

  const methodKeys = {
    "Tarjeta Bancaria": t.paymentCard,
    "Transferencia Arquitectónica": t.paymentTransfer,
    "Bizum": t.paymentBizum,
    card: t.paymentCard,
    transfer: t.paymentTransfer,
    bizum: t.paymentBizum
  };
  const localizedMethod = methodKeys[order.payment.method] || order.payment.method;

  container.innerHTML = `
    <div class="architectural-ticket">
      <div class="ticket-header">
        <div>
          <div class="ticket-brand">ESPACIO</div>
          <div class="ticket-brand-sub">${t.ticketBrandSub}</div>
        </div>
        <div class="ticket-meta-block">
          <div>${t.ticketRefInvoice} <span class="ticket-ref-number">${order.orderId}</span></div>
          <div>${t.ticketDate} ${formattedDate}</div>
          <div>${t.ticketMethod} <strong>${localizedMethod}</strong></div>
        </div>
      </div>

      <div class="ticket-client-box">
        <div class="ticket-client-row">
          <span class="ticket-client-label">${t.ticketTitular}</span>
          <span>${order.client.name}</span>
        </div>
        <div class="ticket-client-row">
          <span class="ticket-client-label">${t.ticketEmail}</span>
          <span>${order.client.email}</span>
        </div>
        <div class="ticket-client-row">
          <span class="ticket-client-label">${t.ticketDelivery}</span>
          <span>${order.client.address}</span>
        </div>
        ${order.client.phone ? `
          <div class="ticket-client-row">
            <span class="ticket-client-label">${t.ticketPhone}</span>
            <span>${order.client.phone}</span>
          </div>
        ` : ''}
      </div>

      <table class="ticket-table">
        <thead>
          <tr>
            <th>${t.ticketColFurniture}</th>
            <th>${t.ticketColStyleCotas}</th>
            <th style="text-align: right;">${t.ticketColAmount}</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td>
                <strong>${item.name}</strong><br>
                <span style="color: var(--text-secondary); font-size: 11px;">${item.category} · ${item.materials[0]}</span>
              </td>
              <td style="color: var(--text-secondary);">
                ${item.style}<br>
                <span>${item.dimensions.width} × ${item.dimensions.height} × ${item.dimensions.depth} cm</span>
              </td>
              <td class="td-price">${item.price.toLocaleString()} €</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="ticket-totals-wrap">
        <div class="ticket-total-line">
          <span>${t.ticketBaseSubtotal}</span>
          <span>${order.totals.subtotal.toLocaleString()} €</span>
        </div>
        <div class="ticket-total-line">
          <span>${t.ticketVat}</span>
          <span>${order.totals.vat.toLocaleString()} €</span>
        </div>
        <div class="ticket-total-line final">
          <span>${t.ticketTotalFacturado}</span>
          <span>${order.totals.total.toLocaleString()} €</span>
        </div>
      </div>

      <div class="ticket-seal">
        <div>
          <span>${t.ticketSealDesc}</span>
        </div>
        <div class="ticket-seal-badge">
          ${t.ticketSealBadge}
        </div>
      </div>
    </div>
  `;
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
