import type { PostRepository } from "@/domain/ports";
import { tryCreatePostId, isValidPostUrl } from "@/domain/values";
import { getLongestThread } from "@/domain/services";
import { toSerializableThread, type SerializableThread } from "./dto";

export interface ReadThreadResult {
  thread: SerializableThread | null;
  error: string | null;
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
    return { thread: null, error: "Invalid URL" };
  }

  const postId = tryCreatePostId(url);
  if (!postId) {
    return { thread: null, error: "Invalid URL" };
  }

  try {
    const thread = await getLongestThread(postId, repository, language);

    if (!thread) {
      return { thread: null, error: "No posts found in thread" };
    }

    return { thread: toSerializableThread(thread), error: null };
  } catch (error) {
    console.error("Failed to fetch thread:", error);
    return { thread: null, error: "Failed to fetch thread" };
  }
}
