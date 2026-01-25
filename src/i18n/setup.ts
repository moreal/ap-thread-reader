import { i18n, type Messages } from "@lingui/core";

/** 지원되는 로케일 목록 */
export const SUPPORTED_LOCALES = ["en", "ko", "ja"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** 기본 로케일 */
export const DEFAULT_LOCALE: SupportedLocale = "en";

// Vite glob import for locale catalogs
const catalogs = import.meta.glob<{ messages: Messages }>(
  "./locales/*/messages.ts"
);

/**
 * 로케일의 메시지 카탈로그를 동적으로 로드합니다.
 */
export async function loadCatalog(
  locale: SupportedLocale
): Promise<Messages | null> {
  try {
    const path = `./locales/${locale}/messages.ts`;
    const loader = catalogs[path];
    if (!loader) {
      console.warn(`No catalog found for locale: ${locale}`);
      return null;
    }
    const catalog = await loader();
    return catalog.messages;
  } catch (error) {
    console.warn(`Failed to load catalog for locale: ${locale}`, error);
    return null;
  }
}

// locale 변경 콜백 리스너
type LocaleChangeCallback = (locale: SupportedLocale) => void;
const localeChangeListeners: Set<LocaleChangeCallback> = new Set();

export function onLocaleChange(callback: LocaleChangeCallback): () => void {
  localeChangeListeners.add(callback);
  return () => localeChangeListeners.delete(callback);
}

/**
 * 지정된 로케일을 활성화합니다.
 */
export async function activateLocale(locale: SupportedLocale): Promise<void> {
  const messages = await loadCatalog(locale);
  if (messages) {
    i18n.load(locale, messages);
    i18n.activate(locale);
    // 모든 리스너에게 알림
    localeChangeListeners.forEach((callback) => callback(locale));
  }
}

/**
 * 브라우저 또는 Accept-Language 헤더에서 로케일을 감지합니다.
 */
export function detectLocale(
  acceptLanguage?: string | null
): SupportedLocale {
  // Accept-Language 헤더에서 감지
  if (acceptLanguage) {
    for (const locale of SUPPORTED_LOCALES) {
      if (acceptLanguage.toLowerCase().includes(locale)) {
        return locale;
      }
    }
  }

  // 브라우저 환경에서 감지
  if (typeof navigator !== "undefined") {
    const browserLocale = navigator.language.split("-")[0];
    if (SUPPORTED_LOCALES.includes(browserLocale as SupportedLocale)) {
      return browserLocale as SupportedLocale;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * 로케일이 지원되는지 확인합니다.
 */
export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}
