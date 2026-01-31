import type { Post, Thread, Author } from "@/domain/models";
import type { AuthorId } from "@/domain/values";
import { createPostIdFromString } from "@/domain/values";

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
export function toSerializableThread(thread: Thread | readonly Post[]): SerializableThread {
  return [...thread].map(toSerializablePost);
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
 * 직렬화된 Thread를 Post 배열로 변환합니다.
 */
export function fromSerializableThread(thread: SerializableThread): Post[] {
  return thread.map(fromSerializablePost);
}
