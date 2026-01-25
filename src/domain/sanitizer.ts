/**
 * HTML Sanitizer 함수의 시그니처
 * Context를 통해 주입되어 다양한 구현체로 교체 가능
 */
export type SanitizeHtmlFn = (html: string) => string;

/**
 * Sanitizer 설정 옵션
 */
export interface SanitizerOptions {
  /** 허용할 HTML 태그 목록 */
  allowedTags?: string[];
  /** 금지할 HTML 태그 목록 */
  forbiddenTags?: string[];
  /** 허용할 속성 목록 */
  allowedAttributes?: string[];
}

/**
 * 기본 허용 태그 목록
 */
export const DEFAULT_ALLOWED_TAGS = [
  "p",
  "br",
  "a",
  "span",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
];

/**
 * 기본 금지 태그 목록
 */
export const DEFAULT_FORBIDDEN_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "button",
];

/**
 * 기본 허용 속성 목록
 */
export const DEFAULT_ALLOWED_ATTRIBUTES = [
  "href",
  "rel",
  "target",
  "class",
  "title",
];

/**
 * No-op sanitizer: 입력을 그대로 반환
 * 테스트나 신뢰할 수 있는 소스에서만 사용
 */
export const noopSanitizer: SanitizeHtmlFn = (html: string) => html;
