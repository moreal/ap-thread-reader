import { LookupObjectOptions } from "@fedify/fedify";
import type { Post, PostId, Thread, ThreadCollectorDeps } from "./types";

export type { ThreadCollectorDeps };

/**
 * 답글 목록에서 특정 작성자의 self-reply만 필터링합니다.
 */
export function filterSelfReplies(replies: Post[], authorId: string): Post[] {
  return replies.filter((reply) => reply.authorId === authorId);
}

/**
 * 주어진 포스트에서 시작하는 가능한 self-reply 스레드들을 수집합니다.
 *
 * @param startPostId - 시작 포스트의 ID
 * @param deps - 의존성 (fetchPost, fetchReplies)
 * @returns 가능한 스레드들의 배열 (분기가 있을 경우 여러 개)
 *
 * @example
 * // 단일 스레드
 * // A -> B -> C (모두 같은 작성자의 self-reply)
 * // 결과: [[A, B, C]]
 *
 * @example
 * // 분기된 스레드
 * // A -> B -> C
 * //   -> D -> E (B와 D 모두 A에 대한 작성자의 self-reply)
 * // 결과: [[A, B, C], [A, D, E]]
 */
export async function getPossibleThreads(
  startPostId: PostId,
  options: LookupObjectOptions,
  deps: ThreadCollectorDeps,
): Promise<Thread[]> {
  const startPost = await deps.fetchPost(startPostId, {});
  if (!startPost) {
    return [];
  }

  const authorId = startPost.authorId;
  const threads: Thread[] = [];

  // 큐 기반 파이프라이닝: 다음 레벨 fetch를 즉시 시작
  interface QueueItem {
    post: Post;
    thread: Thread;
    repliesPromise: Promise<Post[]>;
  }

  // 초기 큐: startPost의 replies를 즉시 fetch 시작
  let queue: QueueItem[] = [
    {
      post: startPost,
      thread: [startPost],
      repliesPromise: deps.fetchReplies(startPost, options, authorId),
    },
  ];

  while (queue.length > 0) {
    const currentBatch = queue.splice(0);
    const nextQueue: QueueItem[] = [];

    await Promise.all(
      currentBatch.map(async (item) => {
        const replies = await item.repliesPromise;
        const selfReplies = filterSelfReplies(replies, authorId);

        if (selfReplies.length === 0) {
          threads.push(item.thread);
        } else {
          for (const reply of selfReplies) {
            // 다음 레벨 fetch를 즉시 시작 (파이프라이닝)
            nextQueue.push({
              post: reply,
              thread: [...item.thread, reply],
              repliesPromise: deps.fetchReplies(reply, options, authorId),
            });
          }
        }
      }),
    );

    queue = nextQueue;
  }

  return threads;
}

/**
 * 주어진 포스트에서 시작하여 가장 긴 self-reply 스레드를 수집합니다.
 * 분기가 있을 경우 가장 긴 경로를 선택합니다.
 */
export async function getLongestThread(
  startPostId: PostId,
  options: LookupObjectOptions,
  deps: ThreadCollectorDeps,
): Promise<Thread> {
  const threads = await getPossibleThreads(startPostId, options, deps);

  if (threads.length === 0) {
    return [];
  }

  // 가장 긴 스레드 반환
  return threads.reduce((longest, current) =>
    current.length > longest.length ? current : longest,
  );
}
