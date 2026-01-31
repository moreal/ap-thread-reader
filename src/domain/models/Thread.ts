import type { AuthorId } from "../values";
import type { Author } from "./Author";
import type { Post } from "./Post";
import { InvalidThreadError } from "../errors";

/**
 * 스레드: 연결된 포스트들의 배열 (branded type)
 * - index 0: 루트 포스트
 * - index length-1: 마지막 답글
 * - 불변식: non-empty, same-author
 */
declare const ThreadBrand: unique symbol;
export type Thread = readonly Post[] & { readonly [ThreadBrand]: typeof ThreadBrand };

/**
 * Thread를 생성합니다.
 * @throws InvalidThreadError - 빈 배열이거나 작성자가 다른 포스트가 포함된 경우
 */
export function createThread(posts: Post[]): Thread {
  if (posts.length === 0) {
    throw new InvalidThreadError("Thread must contain at least one post");
  }

  const authorId = posts[0].authorId;
  for (const post of posts) {
    if (post.authorId !== authorId) {
      throw new InvalidThreadError(
        `All posts in a thread must have the same author. Expected "${authorId}", got "${post.authorId}"`,
      );
    }
  }

  return posts as unknown as Thread;
}

/**
 * 안전하게 Thread를 생성합니다.
 * @returns 실패 시 null
 */
export function tryCreateThread(posts: Post[]): Thread | null {
  try {
    return createThread(posts);
  } catch {
    return null;
  }
}

/**
 * 스레드의 작성자 정보를 반환합니다.
 */
export function getThreadAuthor(thread: Thread): Author | null {
  return thread[0].author;
}

/**
 * 스레드의 작성자 ID를 반환합니다.
 */
export function getThreadAuthorId(thread: Thread): AuthorId {
  return thread[0].authorId;
}
