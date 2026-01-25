import type { Thread } from "@/domain/types";
import { PostContent } from "./PostContent";
import { Trans } from "@lingui/react";

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

  const firstPost = thread[0];

  return (
    <article className="thread">
      <header className="thread-meta">
        {firstPost.author && (
          firstPost.author.url ? (
            <a
              href={firstPost.author.url}
              target="_blank"
              rel="noopener noreferrer"
              className="author-link"
            >
              {firstPost.author.name}
            </a>
          ) : (
            <span className="author-name">{firstPost.author.name}</span>
          )
        )}
        <span className="meta-separator">·</span>
        <time dateTime={firstPost.publishedAt} className="post-time">
          {new Date(firstPost.publishedAt).toLocaleString()}
        </time>
        {firstPost.url && (
          <>
            <span className="meta-separator">·</span>
            <a
              href={firstPost.url}
              target="_blank"
              rel="noopener noreferrer"
              className="original-link"
            >
              <Trans id="Original" />
            </a>
          </>
        )}
      </header>
      {thread.map((post, index) => (
        <PostContent key={post.id} post={post} index={index} />
      ))}
    </article>
  );
}
