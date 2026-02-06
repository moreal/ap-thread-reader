import type { PostRepository } from "@/domain/ports";
import { tryCreatePostId, isValidPostUrl } from "@/domain/values";
import { getLongestThread } from "@/domain/services";
import { toSerializableThread, type SerializableThread } from "./dto";

export interface ReadThreadResult {
  thread: SerializableThread | null;
  error: string | null;
  availableContentLanguages: string[];
}

/**
 * 스레드 읽기 유스케이스
 * URL을 받아 스레드를 조회하고 직렬화된 결과를 반환합니다.
 */
export async function readThread(
  url: string,
  repository: PostRepository,
  language?: string,
): Promise<ReadThreadResult> {
  if (!url || !isValidPostUrl(url)) {
    return { thread: null, error: "Invalid URL", availableContentLanguages: [] };
  }

  const postId = tryCreatePostId(url);
  if (!postId) {
    return { thread: null, error: "Invalid URL", availableContentLanguages: [] };
  }

  try {
    const thread = await getLongestThread(postId, repository, language);

    if (!thread) {
      return { thread: null, error: "No posts found in thread", availableContentLanguages: [] };
    }

    const serialized = toSerializableThread(thread);

    // 스레드 전체의 사용 가능 언어를 union으로 계산
    const langSet = new Set<string>();
    for (const post of thread) {
      for (const lang of post.availableLanguages) {
        langSet.add(lang);
      }
    }

    return {
      thread: serialized,
      error: null,
      availableContentLanguages: [...langSet],
    };
  } catch (error) {
    console.error("Failed to fetch thread:", error);
    return { thread: null, error: "Failed to fetch thread", availableContentLanguages: [] };
  }
}
