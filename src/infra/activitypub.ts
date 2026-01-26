import {
  lookupObject,
  Article,
  Note,
  isActor,
  Link,
  getDocumentLoader,
  kvCache,
  MemoryKvStore,
} from "@fedify/fedify";
import { Temporal } from "@js-temporal/polyfill";
import { Agent, setGlobalDispatcher } from "undici";
import type { Object as APObject, DocumentLoader } from "@fedify/fedify";
import type {
  Post,
  PostId,
  PostFetchFn,
  RepliesFetchFn,
  Author,
} from "@/domain/types";
import { createPostId } from "@/domain/types";
import { activitypubLogger } from "@/logging";

// 전역 HTTP Agent 최적화 - Keep-Alive 연결 재사용
const agent = new Agent({
  keepAliveTimeout: 30_000, // 30초 동안 연결 유지
  keepAliveMaxTimeout: 60_000, // 최대 60초
  connections: 50, // 호스트당 최대 연결 수
  pipelining: 1,
});
setGlobalDispatcher(agent);
setInterval(() => console.log(agent.stats), 1000);

// 캐시된 DocumentLoader 설정
const kv = new MemoryKvStore();
const cachedDocumentLoader: DocumentLoader = kvCache({
  loader: getDocumentLoader(),
  kv,
  rules: [
    // JSON-LD 컨텍스트는 오래 캐싱 (30일)
    [
      new URLPattern("https://www.w3.org/*"),
      Temporal.Duration.from({ days: 30 }),
    ],
    [
      new URLPattern("https://w3id.org/*"),
      Temporal.Duration.from({ days: 30 }),
    ],
    // ActivityStreams 컨텍스트
    [
      new URLPattern("https://www.w3.org/ns/activitystreams"),
      Temporal.Duration.from({ days: 30 }),
    ],
    // 일반 ActivityPub 객체는 짧게 캐싱 (5분)
    [new URLPattern("*://*/*"), Temporal.Duration.from({ minutes: 5 })],
  ],
});

const lookupOptions = {
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

  // Fetch author information
  let author: Author | null = null;
  try {
    const actor = await obj.getAttribution();
    if (actor && isActor(actor)) {
      const actorUrl = actor.url;
      author = {
        id: authorId,
        name:
          actor.name?.toString() ??
          actor.preferredUsername?.toString() ??
          authorId,
        url:
          actorUrl instanceof URL
            ? actorUrl.href
            : typeof actorUrl === "string"
              ? actorUrl
              : null,
      };
    }
  } catch (error) {
    activitypubLogger.debug`Failed to fetch author for ${id}: ${error}`;
  }

  const content = obj.content?.toString() ?? "";
  const published = obj.published;
  const publishedAt = published?.toString() ?? new Date().toISOString();
  const inReplyTo = obj.replyTargetId ? createPostId(obj.replyTargetId) : null;
  const objUrl = obj.url;
  const url =
    objUrl instanceof URL
      ? objUrl.href
      : typeof objUrl === "string"
        ? objUrl
        : null;

  return {
    id,
    authorId,
    author,
    content,
    publishedAt,
    inReplyTo,
    url,
  };
}

/**
 * ActivityPub 객체를 조회합니다.
 */
export async function fetchPost(postId: PostId): Promise<Post | null> {
  activitypubLogger.debug`Fetching post: ${postId}`;

  try {
    const obj = await lookupObject(postId, lookupOptions);
    if (!obj) {
      activitypubLogger.warn`Post not found: ${postId}`;
      return null;
    }

    if (isActor(obj)) {
      activitypubLogger.warn`Object is an Actor, not a Post: ${postId}`;
      return null;
    }

    const post = await toPost(obj as APObject);
    if (post) {
      activitypubLogger.debug`Successfully fetched post: ${postId}`;
    }
    return post;
  } catch (error) {
    activitypubLogger.error`Failed to fetch post ${postId}: ${error}`;
    return null;
  }
}

/**
 * CollectionPage를 순회하며 아이템을 수집합니다.
 */
async function* iterateCollectionPages(
  firstPage: Awaited<
    ReturnType<typeof import("@fedify/fedify").Collection.prototype.getFirst>
  >,
): AsyncGenerator<APObject> {
  let currentPage = firstPage;
  const seenUrls = new Set<string>();

  while (currentPage) {
    // Get items from current page
    try {
      for await (const item of currentPage.getItems()) {
        if (item && !(item instanceof Link)) {
          yield item;
        }
      }
    } catch (error) {
      activitypubLogger.debug`Error iterating page items: ${error}`;
      // Continue to try next page even if current page has errors
    }

    // Get next page
    const nextUrl = currentPage.nextId?.href;
    if (!nextUrl || seenUrls.has(nextUrl)) {
      break;
    }
    seenUrls.add(nextUrl);

    activitypubLogger.debug`Fetching next page: ${nextUrl}`;
    try {
      const nextObj = await lookupObject(nextUrl, lookupOptions);
      if (!nextObj || !("getItems" in nextObj)) {
        break;
      }
      currentPage = nextObj as typeof currentPage;
    } catch (error) {
      activitypubLogger.debug`Error fetching next page: ${error}`;
      break;
    }
  }
}

/**
 * 포스트의 답글 목록을 가져옵니다.
 * @param postId - 답글을 가져올 포스트의 ID
 * @param authorFilter - 특정 작성자의 답글만 필터링 (optional, toPost 변환 전에 필터링하여 성능 최적화)
 */
export async function fetchReplies(
  postId: PostId,
  authorFilter?: string,
): Promise<Post[]> {
  activitypubLogger.debug`Fetching replies for: ${postId}`;

  try {
    const obj = await lookupObject(postId, lookupOptions);
    if (!obj) {
      activitypubLogger.warn`Post not found when fetching replies: ${postId}`;
      return [];
    }

    if (!(obj instanceof Note) && !(obj instanceof Article)) {
      activitypubLogger.warn`Object is not a Note or Article: ${postId}`;
      return [];
    }

    const repliesCollection = await obj.getReplies();
    activitypubLogger.debug`Replies collection type: ${repliesCollection?.constructor.name ?? "null"}`;

    if (!repliesCollection) {
      activitypubLogger.debug`No replies collection for: ${postId}`;
      return [];
    }

    activitypubLogger.debug`Replies collection id: ${repliesCollection.id?.href ?? "no id"}`;

    const posts: Post[] = [];
    let itemCount = 0;

    // First, try to get items directly from the collection (inline items)
    try {
      for await (const item of repliesCollection.getItems()) {
        itemCount++;
        activitypubLogger.debug`Reply item ${itemCount}: ${item?.constructor.name ?? "null"}, id: ${item?.id?.href ?? "no id"}`;

        if (item instanceof Note || item instanceof Article) {
          // authorFilter가 있으면 toPost 변환 전에 미리 필터링
          if (authorFilter && item.attributionId?.href !== authorFilter) {
            activitypubLogger.debug`Skipping reply from different author: ${item.attributionId?.href}`;
            continue;
          }
          const post = await toPost(item);
          if (post) {
            posts.push(post);
            activitypubLogger.debug`Converted reply to post: ${post.id}`;
          }
        }
      }
    } catch (error) {
      activitypubLogger.debug`Error getting inline items, trying pagination: ${error}`;
    }

    // If no items found inline, try pagination
    if (posts.length === 0) {
      const firstPage = await repliesCollection.getFirst();
      if (firstPage) {
        activitypubLogger.debug`Trying paginated replies for: ${postId}`;
        for await (const item of iterateCollectionPages(firstPage)) {
          itemCount++;
          activitypubLogger.debug`Reply item ${itemCount}: ${item?.constructor.name ?? "null"}, id: ${item?.id?.href ?? "no id"}`;

          if (item instanceof Note || item instanceof Article) {
            // authorFilter가 있으면 toPost 변환 전에 미리 필터링
            if (authorFilter && item.attributionId?.href !== authorFilter) {
              activitypubLogger.debug`Skipping reply from different author: ${item.attributionId?.href}`;
              continue;
            }
            const post = await toPost(item);
            if (post) {
              posts.push(post);
              activitypubLogger.debug`Converted reply to post: ${post.id}`;
            }
          }
        }
      }
    }

    activitypubLogger.debug`Found ${posts.length} replies for: ${postId} (iterated ${itemCount} items)`;
    return posts;
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
 * RepliesFetchFn 구현
 */
export const repliesFetcher: RepliesFetchFn = fetchReplies;
