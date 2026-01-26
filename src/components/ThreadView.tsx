import type { SerializableThread } from "@/domain/types";
import { PostContent } from "./PostContent";

export interface ThreadViewProps {
  thread: SerializableThread;
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
        {firstPost.author &&
          (firstPost.author.url ? (
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
          ))}
        <span className="meta-separator">·</span>
        {firstPost.url ? (
          <a
            href={firstPost.url}
            target="_blank"
            rel="noopener noreferrer"
            className="post-time-link"
          >
            <time dateTime={firstPost.publishedAt}>
              {new Date(firstPost.publishedAt).toLocaleString()}
            </time>
          </a>
        ) : (
          <time dateTime={firstPost.publishedAt} className="post-time">
            {new Date(firstPost.publishedAt).toLocaleString()}
          </time>
        )}
      </header>
      {thread.map((post, index) => (
        <PostContent key={post.id} post={post} index={index} />
      ))}
    </article>
  );
}
