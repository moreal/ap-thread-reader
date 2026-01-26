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

/**
 * JSON 직렬화 가능한 Post 객체
 * API 응답/요청에 사용
 */
export interface SerializablePost {
  id: string;
  authorId: AuthorId;
  author: Author | null;
  content: string;
  publishedAt: string;
  inReplyTo: string | null;
  url: string | null;
}

/**
 * JSON 직렬화 가능한 Thread
 */
export type SerializableThread = SerializablePost[];

/**
 * Post를 직렬화 가능한 형태로 변환합니다.
 */
export function toSerializablePost(post: Post): SerializablePost {
  return {
    id: post.id.href,
    authorId: post.authorId,
    author: post.author,
    content: post.content,
    publishedAt: post.publishedAt,
    inReplyTo: post.inReplyTo?.href ?? null,
    url: post.url,
  };
}

/**
 * Thread를 직렬화 가능한 형태로 변환합니다.
 */
export function toSerializableThread(thread: Thread): SerializableThread {
  return thread.map(toSerializablePost);
}

/**
 * 직렬화된 Post를 Post로 변환합니다.
 */
export function fromSerializablePost(post: SerializablePost): Post {
  return {
    id: createPostIdFromString(post.id),
    authorId: post.authorId,
    author: post.author,
    content: post.content,
    publishedAt: post.publishedAt,
    inReplyTo: post.inReplyTo ? createPostIdFromString(post.inReplyTo) : null,
    url: post.url,
  };
}

/**
 * 직렬화된 Thread를 Thread로 변환합니다.
 */
export function fromSerializableThread(thread: SerializableThread): Thread {
  return thread.map(fromSerializablePost);
}
