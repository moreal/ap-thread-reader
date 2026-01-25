import { type ReactNode, useEffect, useState } from "react";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import { SanitizerProvider } from "./SanitizerContext";
import { defaultSanitizer } from "@/infra/domPurifySanitizer";
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

  return (
    <I18nProvider i18n={i18n} key={currentLocale}>
      <SanitizerProvider sanitizer={defaultSanitizer}>
        {children}
      </SanitizerProvider>
    </I18nProvider>
  );
}
