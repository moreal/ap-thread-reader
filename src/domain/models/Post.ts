import type { AuthorId, PostId } from "../values";
import type { Author } from "./Author";

/**
 * 도메인 Post 객체
 * ActivityPub의 Note/Article을 추상화한 내부 표현
 */
export interface Post {
  /** 포스트의 고유 URI */
  id: PostId;

  /** 작성자의 URI */
  authorId: AuthorId;

  /** 작성자 정보 */
  author: Author | null;

  /** HTML 형식의 본문 */
  content: string;

  /** 작성 시간 (ISO 8601) */
  publishedAt: string;

  /** 답글 대상 포스트의 URI (없으면 null) */
  inReplyTo: PostId | null;

  /** 원본 URL (사용자가 브라우저에서 볼 수 있는 URL) */
  url: string | null;

  /** 요약 또는 짧은 설명 (ActivityStreams summary 속성) */
  summary: string | null;

  /** contentMap에 있는 언어 목록 */
  availableLanguages: string[];

  /** 실제 표시된 콘텐츠의 언어 */
  contentLanguage: string | null;

  /** fallback 여부 (요청한 언어가 없어서 대체된 경우 true) */
  contentLanguageIsFallback: boolean;
}
