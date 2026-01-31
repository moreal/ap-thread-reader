/**
 * 포스트의 고유 식별자 (ActivityPub URI)
 * Branded URL 타입으로 일반 URL과 구분됨
 */
declare const PostIdBrand: unique symbol;
export type PostId = URL & { readonly [PostIdBrand]: typeof PostIdBrand };

/**
 * URL을 PostId로 변환합니다.
 */
export function createPostId(url: URL): PostId {
  return url as PostId;
}

/**
 * 문자열을 PostId로 변환합니다.
 * @throws URL 파싱에 실패하면 에러를 던집니다.
 */
export function createPostIdFromString(urlString: string): PostId {
  return new URL(urlString) as PostId;
}

/**
 * 안전하게 문자열을 PostId로 변환합니다.
 * @returns 변환 실패시 null을 반환합니다.
 */
export function tryCreatePostId(urlString: string): PostId | null {
  try {
    return new URL(urlString) as PostId;
  } catch {
    return null;
  }
}

/**
 * URL이 유효한 ActivityPub 포스트 URL인지 검사합니다.
 */
export function isValidPostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // HTTP 또는 HTTPS 프로토콜만 허용
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
