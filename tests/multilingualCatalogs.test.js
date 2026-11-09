import { describe, it, expect } from 'vitest';
import { getCatalogByLang, CATALOGS_BY_LANG } from '../src/data/catalogs/index.js';
import { UI_TRANSLATIONS, getRoomOptions, getStyleOptions, getPaletteOptions, getQuickSuggestions } from '../src/config/languages.js';
import { RagEngine } from '../src/services/ragEngine.js';
import { MatchingEngine } from '../src/services/matchingEngine.js';

describe('Multilingual Catalogs & Internationalization (ES, CA, EN, ZH)', () => {
  const supportedLangs = ['es', 'ca', 'en', 'zh'];

  it('provides complete 120-piece catalogs for all supported languages', () => {
    supportedLangs.forEach(lang => {
      const catalog = getCatalogByLang(lang);
      expect(catalog).toBeDefined();
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBe(120);

      // Verify unique IDs across 120 items
      const ids = new Set(catalog.map(item => item.id));
      expect(ids.size).toBe(120);
    });
  });

  it('assigns the correct localized furniture image URL to each catalog', () => {
    const expectedImages = {
      es: '/foto mueble.png',
      ca: '/foto moble.png',
      en: '/photo furniture.png',
      zh: '/jiājù zhàopiàn.png'
    };

    supportedLangs.forEach(lang => {
      const catalog = getCatalogByLang(lang);
      catalog.forEach(item => {
        expect(item.imageUrl).toBe(expectedImages[lang]);
      });
    });
  });

  it('maintains 4 to 6 tags per piece in all localized catalogs', () => {
    supportedLangs.forEach(lang => {
      const catalog = getCatalogByLang(lang);
      catalog.forEach(item => {
        expect(Array.isArray(item.tags)).toBe(true);
        expect(item.tags.length).toBeGreaterThanOrEqual(4);
        expect(item.tags.length).toBeLessThanOrEqual(6);
        expect(item.tags.every(t => typeof t === 'string' && t.trim().length > 0)).toBe(true);
      });
    });
  });

  it('properly localizes names, descriptions, categories, and architectural details across languages', () => {
    const catalogEs = getCatalogByLang('es');
    const catalogCa = getCatalogByLang('ca');
    const catalogEn = getCatalogByLang('en');
    const catalogZh = getCatalogByLang('zh');

    // First item: furn-001 (Kumo Low modular sofa)
    expect(catalogEs[0].name).toBe('Sofá Modular Kumo Low');
    expect(catalogCa[0].name).toBe('Sofà Modular Kumo Low');
    expect(catalogEn[0].name).toBe('Kumo Low Modular Sofa');
    expect(catalogZh[0].name).toBe('Kumo Low 模块化矮沙发');

    // Categories are localized
    expect(catalogEs[0].category).toBe('Asientos');
    expect(catalogCa[0].category).toBe('Seients');
    expect(catalogEn[0].category).toBe('Seating');
    expect(catalogZh[0].category).toBe('座椅');

    // Rooms are localized
    expect(catalogEs[0].room).toBe('salón');
    expect(catalogCa[0].room).toBe('saló');
    expect(catalogEn[0].room).toBe('living room');
    expect(catalogZh[0].room).toBe('客厅');

    // Chinese catalog contains Chinese characters in names and descriptions
    const hasChineseChars = catalogZh.every(item => /[\u4e00-\u9fa5]/.test(item.name) && /[\u4e00-\u9fa5]/.test(item.description));
    expect(hasChineseChars).toBe(true);
  });

  it('UI_TRANSLATIONS contains all critical keys across all 4 languages', () => {
    const criticalKeys = [
      'docTitle', 'brandTag', 'preferencesBtn', 'cestaBtn', 'hudTitle', 'hudSubtitle',
      'hudBudgetTitle', 'hudVisionTitle', 'searchPlaceholder', 'allCategory',
      'catAsientos', 'catMesas', 'catAlmacenaje', 'catIluminacion', 'catDormitorio', 'catAccesorios',
      'matchLabel', 'affinityLabel', 'cotasLabel', 'cardStyleLabel', 'btnReject', 'btnAccept',
      'drawerTitle', 'drawerCheckoutBtn', 'drawerExportBtn', 'drawerClearBtn',
      'onboardingStep1Title', 'onboardingBtnNext', 'onboardingBtnFinish',
      'authModalTitle', 'authBtnLogin', 'authBtnRegister',
      'csvModalTitle', 'csvConfirmBtn', 'csvRestoreBtn',
      'visionModalTitle', 'visionSaveBtn',
      'checkoutModalTitle', 'checkoutConfirmBtn',
      'ticketModalTitle', 'ticketBrandSub', 'ticketPrintBtn',
      'toast'
    ];

    supportedLangs.forEach(lang => {
      const trans = UI_TRANSLATIONS[lang];
      expect(trans).toBeDefined();
      criticalKeys.forEach(key => {
        expect(trans[key], `Missing key "${key}" in language "${lang}"`).toBeDefined();
        expect(typeof trans[key]).toBe('string');
        expect(trans[key].trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('localizes room, style, palette options and quick suggestions', () => {
    supportedLangs.forEach(lang => {
      const rooms = getRoomOptions(lang);
      expect(rooms.length).toBeGreaterThanOrEqual(4);
      rooms.forEach(r => {
        expect(r.id).toBeDefined();
        expect(r.label).toBeDefined();
        expect(r.desc).toBeDefined();
      });

      const styles = getStyleOptions(lang);
      expect(styles.length).toBeGreaterThanOrEqual(4);
      styles.forEach(s => {
        expect(s.id).toBeDefined();
        expect(s.label).toBeDefined();
        expect(s.desc).toBeDefined();
      });

      const palettes = getPaletteOptions(lang);
      expect(palettes.length).toBeGreaterThanOrEqual(4);
      palettes.forEach(p => {
        expect(p.id).toBeDefined();
        expect(p.label).toBeDefined();
        expect(p.hex).toBeDefined();
      });

      const suggestions = getQuickSuggestions(lang);
      expect(suggestions.length).toBeGreaterThanOrEqual(4);
      suggestions.forEach(s => {
        expect(s.chip).toBeDefined();
        expect(s.text).toBeDefined();
      });
    });
  });

  it('correctly indexes and calculates non-zero semantic cosine similarity in Chinese and English RAG', () => {
    const zhCatalog = getCatalogByLang('zh');
    const zhRag = new RagEngine(zhCatalog);
    expect(zhRag.vocabulary.size).toBeGreaterThan(100);

    const zhResults = zhRag.searchAndRerank({
      userTasteDescription: '暖调极简：白橡木、亚麻质感与漫射滤光',
      lang: 'zh'
    });
    expect(zhResults.length).toBe(120);
    const zhBest = zhResults[0];
    expect(zhBest.semanticCosine).toBeGreaterThan(0.15);
    expect(/[\u4e00-\u9fa5]/.test(zhBest.matchReason)).toBe(true);
    expect(zhBest.matchReason).not.toContain('Afinidad directa');
    expect(zhBest.matchReason).not.toContain('Armoniza con');

    const enCatalog = getCatalogByLang('en');
    const enRag = new RagEngine(enCatalog);
    expect(enRag.vocabulary.size).toBeGreaterThan(100);

    const enResults = enRag.searchAndRerank({
      userTasteDescription: 'Warm minimalism with bleached oak, linen, and soft filtered light',
      lang: 'en'
    });
    expect(enResults.length).toBe(120);
    const enBest = enResults[0];
    expect(enBest.semanticCosine).toBeGreaterThan(0.12);
    expect(enBest.matchReason).not.toContain('Afinidad directa');
    expect(enBest.matchReason).not.toContain('Armoniza con');

    const caCatalog = getCatalogByLang('ca');
    const caRag = new RagEngine(caCatalog);
    const caResults = caRag.searchAndRerank({
      userTasteDescription: 'Minimalisme càlid amb roure emblanquinat, lli i llum tènue tamisada',
      lang: 'ca'
    });
    const caBest = caResults[0];
    expect(caBest.matchReason).not.toContain('Afinidad directa');
    expect(caBest.matchReason).not.toContain('Armoniza con');
  });

  it('generates fully localized MatchingEngine explanations across all 4 languages', () => {
    const engine = new MatchingEngine();
    const itemEs = getCatalogByLang('es')[0];
    const itemCa = getCatalogByLang('ca')[0];
    const itemEn = getCatalogByLang('en')[0];
    const itemZh = getCatalogByLang('zh')[0];

    const reasonEs = engine.generateMatchReason(itemEs, 85, 'es');
    expect(reasonEs).toContain('Armoniza con tu preferencia');

    const reasonCa = engine.generateMatchReason(itemCa, 85, 'ca');
    expect(reasonCa).toContain('Harmonitza amb la teva preferència');

    const reasonEn = engine.generateMatchReason(itemEn, 85, 'en');
    expect(reasonEn).toContain('Harmonizes with your');

    const reasonZh = engine.generateMatchReason(itemZh, 85, 'zh');
    expect(reasonZh).toContain('契合您对');
  });
});
