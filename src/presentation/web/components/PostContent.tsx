import type { ReactNode } from "react";
import type { SerializablePost } from "@/application/dto";
import { useSanitizer } from "@/presentation/web/hooks/useSanitizer";

export interface PostContentProps {
  post: SerializablePost;
  index: number;
  children?: ReactNode;
}

/**
 * 개별 포스트를 렌더링합니다.
 * HTML 콘텐츠는 sanitizer를 통해 정화됩니다.
 */
export function PostContent({ post, index, children }: PostContentProps) {
  const sanitize = useSanitizer();
  const sanitizedContent = sanitize(post.content);

  return (
    <section className="post" data-post-id={post.id} aria-label={`Post ${index + 1}`}>
      {children}
      <div className="post-content" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
    </section>
  );
}
