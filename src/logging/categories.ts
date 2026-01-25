/**
 * 로그 카테고리 정의
 * 계층적 구조로 로그를 분류합니다.
 */

/** 루트 카테고리 */
export const ROOT_CATEGORY = "thread-reader";

/** 도메인 로직 관련 로그 */
export const DOMAIN_CATEGORY = `${ROOT_CATEGORY}.domain`;
export const DOMAIN_THREAD_CATEGORY = `${DOMAIN_CATEGORY}.thread`;
export const DOMAIN_FORMATTER_CATEGORY = `${DOMAIN_CATEGORY}.formatter`;

/** 인프라 관련 로그 */
export const INFRA_CATEGORY = `${ROOT_CATEGORY}.infra`;
export const INFRA_ACTIVITYPUB_CATEGORY = `${INFRA_CATEGORY}.activitypub`;
export const INFRA_SANITIZER_CATEGORY = `${INFRA_CATEGORY}.sanitizer`;

/** 웹 관련 로그 */
export const WEB_CATEGORY = `${ROOT_CATEGORY}.web`;
export const WEB_ROUTES_CATEGORY = `${WEB_CATEGORY}.routes`;
export const WEB_COMPONENTS_CATEGORY = `${WEB_CATEGORY}.components`;

/** CLI 관련 로그 */
export const CLI_CATEGORY = `${ROOT_CATEGORY}.cli`;

/**
 * 카테고리 이름을 배열로 파싱합니다.
 * @example "thread-reader.domain.thread" -> ["thread-reader", "domain", "thread"]
 */
export function parseCategory(category: string): string[] {
  return category.split(".");
}
