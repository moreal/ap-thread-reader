import DOMPurify from "dompurify";
import type { SanitizeHtmlFn, SanitizerOptions } from "./types";
import { DEFAULT_ALLOWED_TAGS, DEFAULT_ALLOWED_ATTRIBUTES, DEFAULT_FORBIDDEN_TAGS } from "./types";

/**
 * DOMPurify 기반 HTML Sanitizer를 생성합니다.
 */
export function createDOMPurifySanitizer(options: SanitizerOptions = {}): SanitizeHtmlFn {
  const allowedTags = options.allowedTags ?? DEFAULT_ALLOWED_TAGS;
  const forbiddenTags = options.forbiddenTags ?? DEFAULT_FORBIDDEN_TAGS;
  const allowedAttributes = options.allowedAttributes ?? DEFAULT_ALLOWED_ATTRIBUTES;

  return (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: allowedTags,
      FORBID_TAGS: forbiddenTags,
      ALLOWED_ATTR: allowedAttributes,
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
    });
  };
}
