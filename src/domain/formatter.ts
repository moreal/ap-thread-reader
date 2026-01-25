import type { Thread, Post } from "./types";

export interface FormatOptions {
  /** 포스트 사이 구분자 */
  separator?: string;
  /** 메타데이터(시간, 원본 링크) 포함 여부 */
  includeMetadata?: boolean;
}

const DEFAULT_OPTIONS: FormatOptions = {
  separator: "\n\n",
  includeMetadata: false,
};

/**
 * 개별 포스트를 문자열로 포맷팅합니다.
 */
export function formatPost(post: Post, options: FormatOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!opts.includeMetadata) {
    return post.content;
  }

  const parts = [post.content];
  parts.push(`\n<footer class="post-meta">`);
  parts.push(`<time datetime="${post.publishedAt}">${post.publishedAt}</time>`);

  if (post.url) {
    parts.push(
      ` | <a href="${post.url}" target="_blank" rel="noopener noreferrer">원본</a>`
    );
  }

  parts.push("</footer>");

  return parts.join("");
}

/**
 * 스레드를 문자열로 포맷팅합니다.
 */
export function formatThread(
  thread: Thread,
  options: FormatOptions = {}
): string {
  if (thread.length === 0) {
    return "";
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  return thread.map((post) => formatPost(post, options)).join(opts.separator);
}

/**
 * 스레드를 HTML로 포맷팅합니다 (프론트엔드용).
 */
export function formatThreadAsHtml(thread: Thread): string {
  if (thread.length === 0) {
    return "";
  }

  return thread
    .map(
      (post) => `<article class="post" data-post-id="${post.id}">
  <div class="post-content">${post.content}</div>
</article>`
    )
    .join("\n");
}
