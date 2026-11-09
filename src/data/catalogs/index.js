import { CATALOG_ES } from './catalog_es.js';
import { CATALOG_CA } from './catalog_ca.js';
import { CATALOG_EN } from './catalog_en.js';
import { CATALOG_ZH } from './catalog_zh.js';

export { CATALOG_ES, CATALOG_CA, CATALOG_EN, CATALOG_ZH };

export const CATALOGS_BY_LANG = {
  es: CATALOG_ES,
  ca: CATALOG_CA,
  en: CATALOG_EN,
  zh: CATALOG_ZH
};

export function getCatalogByLang(lang) {
  return CATALOGS_BY_LANG[lang] || CATALOGS_BY_LANG.es;
}
