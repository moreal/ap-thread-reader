import {
  lookupObject,
  Article,
  Note,
  isActor,
  getDocumentLoader,
  kvCache,
  MemoryKvStore,
  traverseCollection,
} from "@fedify/fedify";
import { Temporal } from "@js-temporal/polyfill";
import { Agent, setGlobalDispatcher } from "undici";
import type { Object as APObject, DocumentLoader, LookupObjectOptions } from "@fedify/fedify";
import type { Post } from "@/domain/models";
import type { Author } from "@/domain/models";
import type { PostId } from "@/domain/values";
import { createPostId } from "@/domain/values";
import type { PostRepository } from "@/domain/ports";
import { activitypubLogger } from "@/logging";

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

const commonLookupObjectOptions: LookupObjectOptions = {
  documentLoader: cachedDocumentLoader,
  contextLoader: cachedDocumentLoader,
};

interface ExtractedContent {
  content: string;
  resolvedLanguage: string | null;
  isFallback: boolean;
}

/**
 * LanguageString 배열에서 특정 언어의 content를 추출합니다.
 * 지정된 언어가 없으면 첫 번째 항목을 반환합니다.
 */
function extractLanguageContent(
  contentValue: Note["content"] | Article["content"],
  contentsArray: Note["contents"] | Article["contents"],
  language?: string,
  allowEmpty = false,
): ExtractedContent {
  // contents 배열이 있는 경우
  if (contentsArray && contentsArray.length > 0) {
    // 언어가 지정된 경우, 해당 언어의 content 찾기
    if (language) {
      const languageContent = contentsArray.find((c) => {
        // LanguageString인 경우에만 language 속성이 있음
        if (typeof c !== "object" || !c || !("language" in c)) return false;
        const lang = c.language;
        if (!lang) return false;
        // LanguageTag의 toString()을 사용하여 언어 코드 비교
        return String(lang) === language;
      });
      if (languageContent) {
        return {
          content: String(languageContent.toString()),
          resolvedLanguage: language,
          isFallback: false,
        };
      }
    }
    // 언어를 찾지 못했거나 지정되지 않은 경우, 첫 번째 항목 반환
    const firstContent = contentsArray[0];
    if (firstContent) {
      const firstLang =
        typeof firstContent === "object" && firstContent && "language" in firstContent
          ? String(firstContent.language ?? "")
          : null;
      return {
        content: String(firstContent.toString()),
        resolvedLanguage: firstLang || null,
        isFallback: language != null,
      };
    }
  }
  // contents 배열이 없으면 단일 content 사용
  if (contentValue) {
    return {
      content: String(contentValue.toString()),
      resolvedLanguage: null,
      isFallback: language != null,
    };
  }
  // 정상적인 Note/Article에서는 도달할 수 없는 경로
  if (!allowEmpty) {
    activitypubLogger.error`No content or contents found in ActivityPub object`;
    throw new Error("No content or contents found in ActivityPub object");
  }
  return { content: "", resolvedLanguage: null, isFallback: false };
}

/**
 * contentsArray에서 사용 가능한 언어 목록을 추출합니다.
 */
function getAvailableLanguages(contentsArray: Note["contents"] | Article["contents"]): string[] {
  if (!contentsArray || contentsArray.length === 0) return [];
  const languages: string[] = [];
  for (const c of contentsArray) {
    if (typeof c === "object" && c && "language" in c && c.language) {
      languages.push(String(c.language));
    }
  }
  return languages;
}

/**
 * ActivityPub 기반 PostRepository 구현
 */
export class ActivityPubPostRepository implements PostRepository {
  /**
   * Fedify Object를 도메인 Post로 변환합니다.
   */
  private async toPost(obj: APObject, language?: string): Promise<Post | null> {
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

    let author: Author | null = null;
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
      }
    } catch (error) {
      activitypubLogger.debug`Failed to fetch author for ${id}: ${error}`;
    }

    const extracted = extractLanguageContent(obj.content, obj.contents, language);
    const published = obj.published;
    const publishedAt = published?.toString() ?? new Date().toISOString();
    const inReplyTo = obj.replyTargetId ? createPostId(obj.replyTargetId) : null;
    const objUrl = obj.url;
    const url = objUrl instanceof URL ? objUrl.href : typeof objUrl === "string" ? objUrl : null;
    const summaryExtracted = extractLanguageContent(obj.summary, obj.summaries, language, true);
    const summary = summaryExtracted.content || null;
    const availableLanguages = getAvailableLanguages(obj.contents);

    return {
      id,
      authorId,
      author,
      content: extracted.content,
      publishedAt,
      inReplyTo,
      url,
      summary,
      availableLanguages,
      contentLanguage: extracted.resolvedLanguage,
      contentLanguageIsFallback: extracted.isFallback,
    };
  }

  async findById(postId: PostId, language?: string): Promise<Post | null> {
    activitypubLogger.debug`Fetching post: ${postId.toString()}`;

    try {
      const obj = await lookupObject(postId, commonLookupObjectOptions);
      if (!obj) {
        activitypubLogger.warn`Post not found: ${postId.toString()}`;
        return null;
      }

      if (isActor(obj)) {
        activitypubLogger.warn`Object is an Actor, not a Post: ${postId.toString()}`;
        return null;
      }

      const post = await this.toPost(obj as APObject, language);
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
  private async fetchRepliesFromObject(
    obj: Note | Article,
    authorFilter?: string,
    language?: string,
  ): Promise<Post[]> {
    const postId = obj.id?.href ?? "unknown";

    const repliesCollection = await obj.getReplies();
    activitypubLogger.debug`Replies collection type: ${repliesCollection?.constructor.name ?? "null"}`;

    if (!repliesCollection) {
      activitypubLogger.debug`No replies collection for: ${postId}`;
      return [];
    }

    activitypubLogger.debug`Replies collection id: ${repliesCollection.id?.href ?? "no id"}`;

    const pageItems: APObject[] = [];
    let itemCount = 0;

    try {
      for await (const item of traverseCollection(repliesCollection, commonLookupObjectOptions)) {
        itemCount++;
        activitypubLogger.debug`Reply item ${itemCount}: ${item?.constructor.name ?? "null"}, id: ${item?.id?.href ?? "no id"}`;

        if (item instanceof Note || item instanceof Article) {
          if (authorFilter && item.attributionId?.href !== authorFilter) {
            activitypubLogger.debug`Skipping reply from different author: ${item.attributionId?.href}`;
            continue;
          }

          pageItems.push(item);
        }
      }
    } catch (error) {
      activitypubLogger.debug`Error during reply traversal for ${postId}, returning ${pageItems.length} items collected so far: ${error}`;
    }

    // 병렬로 toPost 변환
    const posts: Post[] = [];
    const results = await Promise.all(pageItems.map((item) => this.toPost(item, language)));
    for (const post of results) {
      if (post) {
        posts.push(post);
        activitypubLogger.debug`Converted reply to post: ${post.id.toString()}`;
      }
    }

    activitypubLogger.debug`Found ${posts.length} replies for: ${postId} (iterated ${itemCount} items)`;
    return posts;
  }

  async findReplies(post: Post, authorFilter?: string, language?: string): Promise<Post[]> {
    activitypubLogger.debug`Fetching replies for: ${post.id.toString()}`;

    try {
      const looked = await lookupObject(post.id, commonLookupObjectOptions);
      if (!looked) {
        activitypubLogger.warn`Post not found when fetching replies: ${post.id.toString()}`;
        return [];
      }
      if (!(looked instanceof Note) && !(looked instanceof Article)) {
        activitypubLogger.warn`Object is not a Note or Article: ${post.id.toString()}`;
        return [];
      }
      return await this.fetchRepliesFromObject(looked, authorFilter, language);
    } catch (error) {
      activitypubLogger.error`Failed to fetch replies for ${post.id.toString()}: ${error}`;
      return [];
    }
  }
}
