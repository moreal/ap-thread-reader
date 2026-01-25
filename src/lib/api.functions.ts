import { createServerFn } from "@tanstack/react-start";
import { getLongestThread } from "@/domain/thread";
import { fetchPost, fetchReplies, isValidPostUrl } from "@/infra/activitypub";
import type { Thread } from "@/domain/types";

export interface ThreadResult {
  thread: Thread | null;
  error: string | null;
}

export const fetchThreadData = createServerFn({ method: "GET" })
  .inputValidator((url: string) => url)
  .handler(async ({ data: url }): Promise<ThreadResult> => {
    if (!url || !isValidPostUrl(url)) {
      return { thread: null, error: "Invalid URL" };
    }

    try {
      const thread = await getLongestThread(url, {
        fetchPost,
        fetchReplies,
      });

      if (thread.length === 0) {
        return { thread: null, error: "No posts found in thread" };
      }

      return { thread, error: null };
    } catch (error) {
      console.error("Failed to fetch thread:", error);
      return { thread: null, error: "Failed to fetch thread" };
    }
  });
