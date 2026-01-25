import type { Thread } from "@/domain/types";
import { PostContent } from "./PostContent";

export interface ThreadViewProps {
  thread: Thread;
}

/**
 * 스레드의 모든 포스트를 렌더링합니다.
 */
export function ThreadView({ thread }: ThreadViewProps) {
  if (thread.length === 0) {
    return (
      <div className="thread-empty">
        <p>No posts in this thread.</p>
      </div>
    );
  }

  return (
    <article className="thread">
      {thread.map((post, index) => (
        <PostContent key={post.id} post={post} index={index} />
      ))}
    </article>
  );
}
