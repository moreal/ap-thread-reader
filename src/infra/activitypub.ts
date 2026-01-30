import {
  lookupObject,
  Article,
  Note,
  isActor,
  getDocumentLoader,
  kvCache,
  MemoryKvStore,
  traverseCollection,
  LanguageString,
} from "@fedify/fedify";
import { Temporal } from "@js-temporal/polyfill";
import { Agent, setGlobalDispatcher } from "undici";
import type { Object as APObject, DocumentLoader, LookupObjectOptions } from "@fedify/fedify";
import type { Post, PostId, PostFetchFn, RepliesFetchFn, Author } from "@/domain/types";
import { createPostId } from "@/domain/types";
import { activitypubLogger } from "@/logging";

// Author 캐시 - 동일 작성자를 반복 fetch하지 않도록 캐싱
const authorCache = new Map<string, Author>();

// 전역 HTTP Agent 최적화 - Keep-Alive 연결 재사용
const agent = new Agent({
  keepAliveTimeout: 30_000, // 30초 동안 연결 유지
  keepAliveMaxTimeout: 60_000, // 최대 60초
  connections: 50, // 호스트당 최대 연결 수
  pipelining: 1,
});
setGlobalDispatcher(agent);

// 캐시된 DocumentLoader 설정
const kv = new MemoryKvStore();
const cachedDocumentLoader: DocumentLoader = kvCache({
  loader: getDocumentLoader(),
  kv,
  rules: [
    // JSON-LD 컨텍스트는 오래 캐싱 (30일)
    [new URLPattern("https://www.w3.org/*"), Temporal.Duration.from({ days: 30 })],
    [new URLPattern("https://w3id.org/*"), Temporal.Duration.from({ days: 30 })],
    // ActivityStreams 컨텍스트
    [new URLPattern("https://www.w3.org/ns/activitystreams"), Temporal.Duration.from({ days: 30 })],
    // 일반 ActivityPub 객체는 짧게 캐싱 (5분)
    [new URLPattern("*://*/*"), Temporal.Duration.from({ minutes: 5 })],
  ],
});

export const commonLookupObjectOptions = {
  documentLoader: cachedDocumentLoader,
  contextLoader: cachedDocumentLoader,
};

/**
 * Fedify Object를 도메인 Post로 변환합니다.
 */
export async function toPost(obj: APObject): Promise<Post | null> {
  if (!(obj instanceof Note) && !(obj instanceof Article)) {
    activitypubLogger.warn`Object is not a Note or Article: ${obj.constructor.name}`;
    return null;
  }

  if (!obj.id) {
    activitypubLogger.warn`Object has no id`;
    return null;
  }
  const id = createPostId(obj.id);

  const attributedTo = obj.attributionId;
  const authorId = attributedTo?.href;
  if (!authorId) {
    activitypubLogger.warn`Object has no attributedTo: ${id}`;
    return null;
  }

  // Fetch author information (with cache)
  let author: Author | null = authorCache.get(authorId) ?? null;
  if (!author) {
    try {
      const actor = await obj.getAttribution();
      if (actor && isActor(actor)) {
        const actorUrl = actor.url;
        author = {
          id: authorId,
          name: actor.name?.toString() ?? actor.preferredUsername?.toString() ?? authorId,
          url:
            actorUrl instanceof URL
              ? actorUrl.href
              : typeof actorUrl === "string"
                ? actorUrl
                : null,
        };
        authorCache.set(authorId, author);
      }
    } catch (error) {
      activitypubLogger.debug`Failed to fetch author for ${id}: ${error}`;
    }
  }

  const content = obj.content?.toString() ?? "";
  const summary = obj.summary?.toString() ?? null;
  const published = obj.published;
  const publishedAt = published?.toString() ?? new Date().toISOString();
  const inReplyTo = obj.replyTargetId ? createPostId(obj.replyTargetId) : null;
  const objUrl = obj.url;
  const url = objUrl instanceof URL ? objUrl.href : typeof objUrl === "string" ? objUrl : null;

  // Extract contentMap from contents array
  const contentMap: Record<string, string> = {};
  const contents = obj.contents;
  for (const item of contents) {
    if (item instanceof LanguageString) {
      const lang = item.language.toString();
      contentMap[lang] = item.toString();
    }
  }

  // Extract summaryMap from summaries array
  const summaryMap: Record<string, string> = {};
  const summaries = obj.summaries;
  for (const item of summaries) {
    if (item instanceof LanguageString) {
      const lang = item.language.toString();
      summaryMap[lang] = item.toString();
    }
  }

  return {
    id,
    authorId,
    author,
    content,
    summary,
    contentMap: Object.keys(contentMap).length > 0 ? contentMap : undefined,
    summaryMap: Object.keys(summaryMap).length > 0 ? summaryMap : undefined,
    publishedAt,
    inReplyTo,
    url,
    _apObjectRef: obj,
  };
}

/**
 * ActivityPub 객체를 조회합니다.
 */
export async function fetchPost(
  postId: PostId,
  options: LookupObjectOptions,
): Promise<Post | null> {
  activitypubLogger.debug`Fetching post: ${postId.toString()}`;

  try {
    const obj = await lookupObject(postId, options);
    if (!obj) {
      activitypubLogger.warn`Post not found: ${postId.toString()}`;
      return null;
    }

    if (isActor(obj)) {
      activitypubLogger.warn`Object is an Actor, not a Post: ${postId.toString()}`;
      return null;
    }

    const post = await toPost(obj as APObject);
    if (post) {
      activitypubLogger.debug`Successfully fetched post: ${postId.toString()}`;
    }
    return post;
  } catch (error) {
    activitypubLogger.error`Failed to fetch post ${postId.toString()}: ${error}`;
    return null;
  }
}

/**
 * APObject에서 직접 답글을 가져오는 내부 함수
 */
async function fetchRepliesFromObject(
  obj: Note | Article,
  options: LookupObjectOptions,
  authorFilter?: string,
): Promise<Post[]> {
  const postId = obj.id?.href ?? "unknown";

  const repliesCollection = await obj.getReplies();
  activitypubLogger.debug`Replies collection type: ${repliesCollection?.constructor.name ?? "null"}`;

  if (!repliesCollection) {
    activitypubLogger.debug`No replies collection for: ${postId}`;
    return [];
  }

  activitypubLogger.debug`Replies collection id: ${repliesCollection.id?.href ?? "no id"}`;

  const posts: Post[] = [];
  let itemCount = 0;

  const firstPage = await repliesCollection.getFirst(options);
  if (firstPage) {
    activitypubLogger.debug`Trying paginated replies for: ${postId.toString()}`;
    const pageItems: APObject[] = [];

    for await (const item of traverseCollection(firstPage)) {
      itemCount++;
      activitypubLogger.debug`Reply item ${itemCount}: ${item?.constructor.name ?? "null"}, id: ${item?.id?.href ?? "no id"}`;

      if (item instanceof Note || item instanceof Article) {
        if (authorFilter && item.attributionId?.href !== authorFilter) {
          // authorFilter가 있으면 toPost 변환 전에 미리 필터링
          activitypubLogger.debug`Skipping reply from different author: ${item.attributionId?.href}`;
          continue;
        }

        pageItems.push(item);
      }
    }
    // 병렬로 toPost 변환
    const results = await Promise.all(pageItems.map(toPost));
    for (const post of results) {
      if (post) {
        posts.push(post);
        activitypubLogger.debug`Converted reply to post: ${post.id.toString()}`;
      }
    }
  }

  activitypubLogger.debug`Found ${posts.length} replies for: ${postId} (iterated ${itemCount} items)`;
  return posts;
}

/**
 * Post 객체에서 답글 목록을 가져옵니다.
 * _apObjectRef가 있으면 재사용하여 lookupObject 호출을 스킵합니다.
 * @param post - 답글을 가져올 포스트 객체
 * @param authorFilter - 특정 작성자의 답글만 필터링 (optional)
 */
export async function fetchRepliesForPost(
  post: Post,
  options: LookupObjectOptions,
  authorFilter?: string,
): Promise<Post[]> {
  activitypubLogger.debug`Fetching replies for: ${post.id.toString()}`;

  try {
    // _apObjectRef가 있으면 재사용하여 lookupObject RTT 제거
    let obj: Note | Article | null = null;
    if (post._apObjectRef) {
      obj = post._apObjectRef;
    } else {
      // fallback: lookupObject로 다시 fetch
      const looked = await lookupObject(post.id, options);
      if (!looked) {
        activitypubLogger.warn`Post not found when fetching replies: ${post.id.toString()}`;
        return [];
      }
      if (!(looked instanceof Note) && !(looked instanceof Article)) {
        activitypubLogger.warn`Object is not a Note or Article: ${post.id.toString()}`;
        return [];
      }
      obj = looked;
    }

    return await fetchRepliesFromObject(obj, options, authorFilter);
  } catch (error) {
    activitypubLogger.error`Failed to fetch replies for ${post.id.toString()}: ${error}`;
    return [];
  }
}

/**
 * 포스트의 답글 목록을 가져옵니다 (레거시 - PostId 기반).
 * @param postId - 답글을 가져올 포스트의 ID
 * @param authorFilter - 특정 작성자의 답글만 필터링 (optional)
 */
export async function fetchReplies(
  postId: PostId,
  options: LookupObjectOptions,
  authorFilter?: string,
): Promise<Post[]> {
  activitypubLogger.debug`Fetching replies for: ${postId}`;

  try {
    const obj = await lookupObject(postId, options);
    if (!obj) {
      activitypubLogger.warn`Post not found when fetching replies: ${postId}`;
      return [];
    }

    if (!(obj instanceof Note) && !(obj instanceof Article)) {
      activitypubLogger.warn`Object is not a Note or Article: ${postId}`;
      return [];
    }

    return await fetchRepliesFromObject(obj, options, authorFilter);
  } catch (error) {
    activitypubLogger.error`Failed to fetch replies for ${postId}: ${error}`;
    return [];
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

/**
 * PostFetchFn 구현
 */
export const postFetcher: PostFetchFn = fetchPost;

/**
 * RepliesFetchFn 구현 (Post 객체 기반, lookupObject 재호출 방지)
 */
export const repliesFetcher: RepliesFetchFn = fetchRepliesForPost;
