import { useLingui } from "@lingui/react";
import { activateLocale, SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n";

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
};

/**
 * 언어 변경 드롭다운 컴포넌트
 */
export function LocaleSwitcher() {
  const { i18n } = useLingui();
  const currentLocale = (i18n.locale || "en") as SupportedLocale;

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as SupportedLocale;
    await activateLocale(newLocale);
  };

  return (
    <div className="locale-switcher">
      <label htmlFor="locale-select" className="sr-only">
        Language
      </label>
      <select
        id="locale-select"
        value={currentLocale}
        onChange={handleChange}
        className="locale-select"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}
