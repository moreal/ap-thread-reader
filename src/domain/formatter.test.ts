import { describe, it, expect } from "vitest";
import { formatPost, formatThread, formatThreadAsHtml } from "./formatter";
import type { Post, Thread } from "./types";
import { createPostIdFromString } from "./types";

// 테스트용 Mock Post 오버라이드 타입
interface MockPostOverrides {
  id?: string;
  authorId?: string;
  author?: { id: string; name: string; url: string | null } | null;
  content?: string;
  summary?: string | null;
  publishedAt?: string;
  inReplyTo?: string | null;
  url?: string | null;
}

function createMockPost(overrides: MockPostOverrides = {}): Post {
  return {
    id: createPostIdFromString(overrides.id ?? "https://example.com/posts/1"),
    authorId: overrides.authorId ?? "https://example.com/users/alice",
    author: overrides.author ?? null,
    content: overrides.content ?? "<p>Test content</p>",
    summary: overrides.summary ?? null,
    publishedAt: overrides.publishedAt ?? "2024-01-01T00:00:00Z",
    inReplyTo: overrides.inReplyTo ? createPostIdFromString(overrides.inReplyTo) : null,
    url: overrides.url ?? "https://example.com/@alice/1",
  };
}

describe("formatPost", () => {
  it("포스트의 콘텐츠를 반환해야 함", () => {
    const post = createMockPost({ content: "<p>Hello World</p>" });

    const result = formatPost(post);

    expect(result).toBe("<p>Hello World</p>");
  });

  it("메타데이터 포함 옵션이 있으면 시간과 URL을 포함해야 함", () => {
    const post = createMockPost({
      content: "<p>Hello</p>",
      publishedAt: "2024-01-01T12:00:00Z",
      url: "https://example.com/@alice/1",
    });

    const result = formatPost(post, { includeMetadata: true });

    expect(result).toContain("<p>Hello</p>");
    expect(result).toContain("2024-01-01T12:00:00Z");
    expect(result).toContain("https://example.com/@alice/1");
  });

  it("URL이 없으면 메타데이터에서 URL을 생략해야 함", () => {
    const post = createMockPost({
      content: "<p>Hello</p>",
      publishedAt: "2024-01-01T12:00:00Z",
      url: null,
    });

    const result = formatPost(post, { includeMetadata: true });

    expect(result).toContain("<p>Hello</p>");
    expect(result).toContain("2024-01-01T12:00:00Z");
  });
});

describe("formatThread", () => {
  it("스레드의 모든 포스트를 기본 구분자로 연결해야 함", () => {
    const thread: Thread = [
      createMockPost({ content: "<p>First</p>" }),
      createMockPost({ content: "<p>Second</p>" }),
      createMockPost({ content: "<p>Third</p>" }),
    ];

    const result = formatThread(thread);

    expect(result).toBe("<p>First</p>\n\n<p>Second</p>\n\n<p>Third</p>");
  });

  it("커스텀 구분자를 사용할 수 있어야 함", () => {
    const thread: Thread = [
      createMockPost({ content: "<p>First</p>" }),
      createMockPost({ content: "<p>Second</p>" }),
    ];

    const result = formatThread(thread, { separator: "<hr>" });

    expect(result).toBe("<p>First</p><hr><p>Second</p>");
  });

  it("빈 스레드는 빈 문자열을 반환해야 함", () => {
    const result = formatThread([]);

    expect(result).toBe("");
  });
});

describe("formatThreadAsHtml", () => {
  it("스레드를 HTML 구조로 포맷팅해야 함", () => {
    const thread: Thread = [
      createMockPost({ id: "https://example.com/post1", content: "<p>First</p>" }),
      createMockPost({ id: "https://example.com/post2", content: "<p>Second</p>" }),
    ];

    const result = formatThreadAsHtml(thread);

    expect(result).toContain('<article class="post"');
    expect(result).toContain("data-post-id");
    expect(result).toContain("<p>First</p>");
    expect(result).toContain("<p>Second</p>");
  });

  it("빈 스레드는 빈 문자열을 반환해야 함", () => {
    const result = formatThreadAsHtml([]);

    expect(result).toBe("");
  });
});
