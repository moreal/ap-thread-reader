import { createServerFn } from "@tanstack/react-start";
import { getLongestThread } from "@/domain/thread";
import {
  commonLookupObjectOptions,
  fetchPost,
  isValidPostUrl,
  repliesFetcher,
} from "@/infra/activitypub";
import type { SerializableThread } from "@/domain/types";
import {
  createPostIdFromString,
  toSerializableThread,
  applyLanguageToSerializablePost,
} from "@/domain/types";

export interface ThreadResult {
  thread: SerializableThread | null;
  error: string | null;
}

interface FetchThreadDataInput {
  data: string;
  language?: string;
}

export const fetchThreadData = createServerFn({ method: "GET" })
  .inputValidator((input: FetchThreadDataInput) => input)
  .handler(async ({ data: input }): Promise<ThreadResult> => {
    if (!input.data || !isValidPostUrl(input.data)) {
      return { thread: null, error: "Invalid URL" };
    }

    try {
      const thread = await getLongestThread(
        createPostIdFromString(input.data),
        commonLookupObjectOptions,
        {
          fetchPost,
          fetchReplies: repliesFetcher,
        },
      );

      if (thread.length === 0) {
        return { thread: null, error: "No posts found in thread" };
      }

      let serializableThread = toSerializableThread(thread);

      // Apply language if specified
      if (input.language) {
        serializableThread = serializableThread.map((post) =>
          applyLanguageToSerializablePost(post, input.language),
        );
      }

      return { thread: serializableThread, error: null };
    } catch (error) {
      console.error("Failed to fetch thread:", error);
      return { thread: null, error: "Failed to fetch thread" };
    }
  });
