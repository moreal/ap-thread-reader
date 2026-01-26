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
  deps: ThreadCollectorDeps,
): Promise<Thread[]> {
  const startPost = await deps.fetchPost(startPostId);
  if (!startPost) {
    return [];
  }

  const authorId = startPost.authorId;
  const threads: Thread[] = [];

  async function collectThreads(currentPost: Post, currentThread: Thread): Promise<void> {
    // authorId를 전달하여 fetchReplies 단계에서 미리 필터링 (toPost 변환 전 최적화)
    const replies = await deps.fetchReplies(currentPost.id, authorId);
    // fetchReplies에서 이미 필터링되었지만, 안전하게 이중 체크
    const selfReplies = filterSelfReplies(replies, authorId);

    if (selfReplies.length === 0) {
      // 더 이상 self-reply가 없으면 현재 스레드를 결과에 추가
      threads.push(currentThread);
    } else {
      // 각 self-reply에 대해 재귀적으로 스레드 수집
      for (const reply of selfReplies) {
        await collectThreads(reply, [...currentThread, reply]);
      }
    }
  }

  await collectThreads(startPost, [startPost]);
  return threads;
}

/**
 * 주어진 포스트에서 시작하여 가장 긴 self-reply 스레드를 수집합니다.
 * 분기가 있을 경우 가장 긴 경로를 선택합니다.
 */
export async function getLongestThread(
  startPostId: PostId,
  deps: ThreadCollectorDeps,
): Promise<Thread> {
  const threads = await getPossibleThreads(startPostId, deps);

  if (threads.length === 0) {
    return [];
  }

  // 가장 긴 스레드 반환
  return threads.reduce((longest, current) =>
    current.length > longest.length ? current : longest,
  );
}
