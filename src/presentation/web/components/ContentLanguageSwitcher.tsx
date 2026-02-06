import { Trans } from "@lingui/react";

export interface ContentLanguageSwitcherProps {
  availableLanguages: string[];
  currentLanguage?: string;
  onLanguageChange: (lang: string) => void;
}

/**
 * 콘텐츠 언어 선택 pill 버튼 컴포넌트.
 * 사용 가능한 언어가 2개 이상일 때만 렌더링됩니다.
 */
export function ContentLanguageSwitcher({
  availableLanguages,
  currentLanguage,
  onLanguageChange,
}: ContentLanguageSwitcherProps) {
  if (availableLanguages.length <= 1) {
    return null;
  }

  return (
    <div className="content-language-switcher">
      <span className="content-language-label">
        <Trans id="Content Language" message="Content Language" />
      </span>
      <div className="content-language-buttons">
        {availableLanguages.map((lang) => (
          <button
            key={lang}
            type="button"
            className={`content-language-btn${currentLanguage === lang ? " content-language-btn--active" : ""}`}
            onClick={() => onLanguageChange(lang)}
            aria-pressed={currentLanguage === lang}
          >
            {lang}
          </button>
        ))}
      </div>
    </div>
  );
}
