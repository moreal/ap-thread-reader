import DOMPurify from "dompurify";
import type { SanitizeHtmlFn, SanitizerOptions } from "@/domain/sanitizer";
import {
  DEFAULT_ALLOWED_TAGS,
  DEFAULT_ALLOWED_ATTRIBUTES,
  DEFAULT_FORBIDDEN_TAGS,
} from "@/domain/sanitizer";
import { sanitizerLogger } from "@/logging";

/**
 * DOMPurify 기반 HTML Sanitizer를 생성합니다.
 */
export function createDOMPurifySanitizer(
  options: SanitizerOptions = {}
): SanitizeHtmlFn {
  const allowedTags = options.allowedTags ?? DEFAULT_ALLOWED_TAGS;
  const forbiddenTags = options.forbiddenTags ?? DEFAULT_FORBIDDEN_TAGS;
  const allowedAttributes = options.allowedAttributes ?? DEFAULT_ALLOWED_ATTRIBUTES;

  return (html: string): string => {
    sanitizerLogger.debug`Sanitizing HTML content (length: ${html.length})`;

    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: allowedTags,
      FORBID_TAGS: forbiddenTags,
      ALLOWED_ATTR: allowedAttributes,
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
    });

    sanitizerLogger.debug`Sanitized HTML (length: ${clean.length})`;
    return clean;
  };
}

/**
 * 기본 설정의 DOMPurify Sanitizer
 */
export const defaultSanitizer: SanitizeHtmlFn = createDOMPurifySanitizer();
