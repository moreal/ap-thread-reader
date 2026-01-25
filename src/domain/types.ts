/**
 * 포스트의 고유 식별자 (ActivityPub URI)
 */
export type PostId = string;

/**
 * 작성자의 고유 식별자 (ActivityPub Actor URI)
 */
export type AuthorId = string;

/**
 * 작성자 정보
 */
export interface Author {
  /** 작성자의 고유 URI */
  id: AuthorId;

  /** 표시 이름 */
  name: string;

  /** 프로필 URL (브라우저에서 볼 수 있는 URL) */
  url: string | null;
}

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
}

/**
 * 스레드: 연결된 포스트들의 배열
 * - index 0: 루트 포스트
 * - index length-1: 마지막 답글
 */
export type Thread = Post[];

/**
 * 포스트를 fetch하는 함수의 타입
 * 의존성 주입을 위해 사용
 */
export type PostFetchFn = (postId: PostId) => Promise<Post | null>;

/**
 * 포스트의 답글 목록을 fetch하는 함수의 타입
 */
export type RepliesFetchFn = (postId: PostId) => Promise<Post[]>;

/**
 * 스레드 수집기 의존성
 */
export interface ThreadCollectorDeps {
  fetchPost: PostFetchFn;
  fetchReplies: RepliesFetchFn;
}
