import en from './en.js';
import fr from './fr.js';
import ar from './ar.js';

const STORAGE_KEY = 'filmix_language';
const translations = { en, fr, ar };
const FALLBACK_LANG = 'en';

let currentLang = 'en';

function detectBrowserLang() {
  const lang = (navigator.language || navigator.userLanguage || '').slice(0, 2).toLowerCase();
  if (lang === 'ar') return 'ar';
  if (lang === 'fr') return 'fr';
  return 'en';
}

export function t(key, params = {}) {
  const keys = key.split('.');
  let value = translations[currentLang];
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      value = undefined;
      break;
    }
  }
  if (value === undefined) {
    value = translations[FALLBACK_LANG];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
  }
  if (value === null || value === undefined) return key;
  if (params && Object.keys(params).length > 0) {
    return String(value).replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
  }
  return value;
}

function applyLang(lang) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = t(key);
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    el.title = t(key);
  });

  document.querySelectorAll('option[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  const playerModal = document.getElementById('playerModal');
  if (!playerModal?.classList.contains('open')) {
    document.title = t('doc.title');
  }
}

export function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyLang(lang);
  window.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang } }));
}

export function initI18n() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && translations[saved]) {
    currentLang = saved;
  } else {
    currentLang = detectBrowserLang();
  }
  applyLang(currentLang);
  window.t = t;
  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = currentLang;
  return currentLang;
}

export function getLang() {
  return currentLang;
}

export function getTmdbLang() {
  const map = { en: 'en-US', fr: 'fr-FR', ar: 'ar-SA' };
  return map[currentLang] || 'en-US';
}
