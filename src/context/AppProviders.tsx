import { type ReactNode, useEffect, useState } from "react";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import { SanitizerProvider } from "./SanitizerContext";
import {
  noopSanitizer,
  type SanitizeHtmlFn,
  DEFAULT_ALLOWED_TAGS,
  DEFAULT_FORBIDDEN_TAGS,
  DEFAULT_ALLOWED_ATTRIBUTES,
} from "@/domain/sanitizer";
import {
  activateLocale,
  detectLocale,
  onLocaleChange,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@/i18n";

export interface AppProvidersProps {
  children: ReactNode;
  locale?: SupportedLocale;
}

// 서버/클라이언트 모두 동일한 기본 locale로 시작
// Hydration 불일치 방지
i18n.load(DEFAULT_LOCALE, {});
i18n.activate(DEFAULT_LOCALE);

/**
 * 앱 전체 Provider 조합
 */
export function AppProviders({ children, locale }: AppProvidersProps) {
  // locale 변경 시 리렌더링을 위한 상태
  const [currentLocale, setCurrentLocale] = useState(DEFAULT_LOCALE);

  // SSR에서는 noopSanitizer 사용, 클라이언트에서 DOMPurify 동적 로드
  const [sanitizer, setSanitizer] = useState<SanitizeHtmlFn>(() => noopSanitizer);

  useEffect(() => {
    // Hydration 완료 후 클라이언트 locale로 전환
    const targetLocale = locale ?? detectLocale();
    activateLocale(targetLocale);

    // locale 변경 이벤트 구독
    const unsubscribe = onLocaleChange((newLocale) => {
      setCurrentLocale(newLocale);
    });

    return unsubscribe;
  }, [locale]);

  useEffect(() => {
    // 브라우저에서만 DOMPurify 로드
    import("dompurify").then((DOMPurify) => {
      setSanitizer(() => (html: string) =>
        DOMPurify.default.sanitize(html, {
          ALLOWED_TAGS: DEFAULT_ALLOWED_TAGS,
          FORBID_TAGS: DEFAULT_FORBIDDEN_TAGS,
          ALLOWED_ATTR: DEFAULT_ALLOWED_ATTRIBUTES,
          ALLOW_DATA_ATTR: false,
          ALLOW_ARIA_ATTR: false,
        })
      );
    });
  }, []);

  return (
    <I18nProvider i18n={i18n} key={currentLocale}>
      <SanitizerProvider sanitizer={sanitizer}>
        {children}
      </SanitizerProvider>
    </I18nProvider>
  );
}
