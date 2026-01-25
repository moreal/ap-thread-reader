import type { Post } from "@/domain/types";
import { useSanitizer } from "@/hooks/useSanitizer";
import { Trans } from "@lingui/react";

export interface PostContentProps {
  post: Post;
  index: number;
}

/**
 * 개별 포스트를 렌더링합니다.
 * HTML 콘텐츠는 sanitizer를 통해 정화됩니다.
 */
export function PostContent({ post, index }: PostContentProps) {
  const sanitize = useSanitizer();
  const sanitizedContent = sanitize(post.content);

  return (
    <section className="post" data-post-id={post.id} aria-label={`Post ${index + 1}`}>
      <div className="post-content" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
      <footer className="post-footer">
        <time dateTime={post.publishedAt} className="post-time">
          {new Date(post.publishedAt).toLocaleString()}
        </time>
        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="post-link">
            <Trans id="Original" />
          </a>
        )}
      </footer>
    </section>
  );
}
