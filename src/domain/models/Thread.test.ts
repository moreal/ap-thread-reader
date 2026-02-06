import { describe, it, expect } from "vitest";
import { createThread, tryCreateThread } from "./Thread";
import type { Post } from "./Post";
import { createPostIdFromString } from "@/domain/values";

interface MockPostOverrides {
  id?: string;
  authorId?: string;
  content?: string;
}

function createMockPost(overrides: MockPostOverrides = {}): Post {
  return {
    id: createPostIdFromString(overrides.id ?? "https://example.com/posts/1"),
    authorId: overrides.authorId ?? "https://example.com/users/alice",
    author: null,
    content: overrides.content ?? "<p>Test content</p>",
    publishedAt: "2024-01-01T00:00:00Z",
    inReplyTo: null,
    url: "https://example.com/@alice/1",
    summary: null,
    availableLanguages: [],
    contentLanguage: null,
    contentLanguageIsFallback: false,
  };
}

describe("createThread", () => {
  it("유효한 포스트 배열로 Thread를 생성해야 함", () => {
    const posts = [
      createMockPost({ id: "https://example.com/1" }),
      createMockPost({ id: "https://example.com/2" }),
    ];

    const thread = createThread(posts);

    expect(thread).toHaveLength(2);
  });

  it("빈 배열이면 에러를 던져야 함", () => {
    expect(() => createThread([])).toThrow("Thread must contain at least one post");
  });

  it("작성자가 다른 포스트가 포함되면 에러를 던져야 함", () => {
    const posts = [
      createMockPost({ authorId: "https://example.com/users/alice" }),
      createMockPost({ authorId: "https://example.com/users/bob" }),
    ];

    expect(() => createThread(posts)).toThrow("All posts in a thread must have the same author");
  });
});

describe("tryCreateThread", () => {
  it("유효한 포스트 배열이면 Thread를 반환해야 함", () => {
    const posts = [createMockPost()];

    const thread = tryCreateThread(posts);

    expect(thread).not.toBeNull();
    expect(thread).toHaveLength(1);
  });

  it("빈 배열이면 null을 반환해야 함", () => {
    const thread = tryCreateThread([]);

    expect(thread).toBeNull();
  });

  it("작성자가 다른 포스트가 포함되면 null을 반환해야 함", () => {
    const posts = [
      createMockPost({ authorId: "https://example.com/users/alice" }),
      createMockPost({ authorId: "https://example.com/users/bob" }),
    ];

    const thread = tryCreateThread(posts);

    expect(thread).toBeNull();
  });
});
