import { describe, it, expect, vi } from "vitest";
import { getPossibleThreads, getLongestThread, filterSelfReplies } from "./ThreadCollector";
import type { Post } from "@/domain/models";
import type { PostId } from "@/domain/values";
import { createPostIdFromString } from "@/domain/values";
import type { PostRepository } from "@/domain/ports";

// 테스트용 Mock Post 오버라이드 타입
interface MockPostOverrides {
  id?: string;
  authorId?: string;
  author?: { id: string; name: string; url: string | null } | null;
  content?: string;
  publishedAt?: string;
  inReplyTo?: string | null;
  url?: string | null;
}

// 테스트용 Mock Post 생성 헬퍼
function createMockPost(overrides: MockPostOverrides = {}): Post {
  return {
    id: createPostIdFromString(overrides.id ?? "https://example.com/posts/1"),
    authorId: overrides.authorId ?? "https://example.com/users/alice",
    author: overrides.author ?? null,
    content: overrides.content ?? "<p>Test content</p>",
    publishedAt: overrides.publishedAt ?? "2024-01-01T00:00:00Z",
    inReplyTo: overrides.inReplyTo ? createPostIdFromString(overrides.inReplyTo) : null,
    url: overrides.url ?? "https://example.com/@alice/1",
    summary: null,
    availableLanguages: [],
    contentLanguage: null,
    contentLanguageIsFallback: false,
  };
}

function createMockRepository(
  findByIdFn: (id: PostId) => Promise<Post | null>,
  findRepliesFn: (post: Post, authorFilter?: string) => Promise<Post[]>,
): PostRepository {
  return {
    findById: vi.fn(findByIdFn),
    findReplies: vi.fn(findRepliesFn),
  };
}

describe("filterSelfReplies", () => {
  it("작성자가 같은 답글만 반환해야 함", () => {
    const authorId = "https://example.com/users/alice";
    const replies: Post[] = [
      createMockPost({ id: "https://example.com/reply1", authorId }),
      createMockPost({
        id: "https://example.com/reply2",
        authorId: "https://example.com/users/bob",
      }),
      createMockPost({ id: "https://example.com/reply3", authorId }),
    ];

    const result = filterSelfReplies(replies, authorId);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id.href)).toEqual([
      "https://example.com/reply1",
      "https://example.com/reply3",
    ]);
  });

  it("self-reply가 없으면 빈 배열 반환", () => {
    const replies: Post[] = [createMockPost({ authorId: "https://example.com/users/bob" })];

    const result = filterSelfReplies(replies, "https://example.com/users/alice");

    expect(result).toHaveLength(0);
  });
});

describe("getPossibleThreads", () => {
  it("단일 포스트만 있을 때 길이 1의 스레드 반환", async () => {
    const post = createMockPost();
    const repository = createMockRepository(
      async () => post,
      async () => [],
    );

    const threads = await getPossibleThreads(post.id, repository);

    expect(threads).toHaveLength(1);
    expect(threads[0]).toHaveLength(1);
    expect(threads[0][0]).toEqual(post);
  });

  it("self-reply 체인을 따라가야 함", async () => {
    const alice = "https://example.com/users/alice";
    const postA = createMockPost({
      id: "https://example.com/A",
      authorId: alice,
    });
    const postB = createMockPost({
      id: "https://example.com/B",
      authorId: alice,
      inReplyTo: "https://example.com/A",
    });
    const postC = createMockPost({
      id: "https://example.com/C",
      authorId: alice,
      inReplyTo: "https://example.com/B",
    });

    const posts: Record<string, Post> = {
      "https://example.com/A": postA,
      "https://example.com/B": postB,
      "https://example.com/C": postC,
    };
    const replies: Record<string, Post[]> = {
      "https://example.com/A": [postB],
      "https://example.com/B": [postC],
      "https://example.com/C": [],
    };

    const repository = createMockRepository(
      async (id: PostId) => posts[id.href] || null,
      async (post: Post) => replies[post.id.href] || [],
    );

    const threads = await getPossibleThreads(
      createPostIdFromString("https://example.com/A"),
      repository,
    );

    expect(threads).toHaveLength(1);
    expect(threads[0]).toHaveLength(3);
    expect(threads[0].map((p) => p.id.href)).toEqual([
      "https://example.com/A",
      "https://example.com/B",
      "https://example.com/C",
    ]);
  });

  it("다른 사용자의 답글은 무시해야 함", async () => {
    const alice = "https://example.com/users/alice";
    const bob = "https://example.com/users/bob";
    const postA = createMockPost({
      id: "https://example.com/A",
      authorId: alice,
    });
    const postB = createMockPost({
      id: "https://example.com/B",
      authorId: bob,
      inReplyTo: "https://example.com/A",
    });

    const repository = createMockRepository(
      async () => postA,
      async () => [postB],
    );

    const threads = await getPossibleThreads(
      createPostIdFromString("https://example.com/A"),
      repository,
    );

    expect(threads).toHaveLength(1);
    expect(threads[0]).toHaveLength(1);
  });

  it("분기가 있을 때 여러 스레드 반환", async () => {
    const alice = "https://example.com/users/alice";
    const postA = createMockPost({
      id: "https://example.com/A",
      authorId: alice,
    });
    const postB = createMockPost({
      id: "https://example.com/B",
      authorId: alice,
      inReplyTo: "https://example.com/A",
    });
    const postC = createMockPost({
      id: "https://example.com/C",
      authorId: alice,
      inReplyTo: "https://example.com/A",
    });

    const posts: Record<string, Post> = {
      "https://example.com/A": postA,
      "https://example.com/B": postB,
      "https://example.com/C": postC,
    };
    const replies: Record<string, Post[]> = {
      "https://example.com/A": [postB, postC],
      "https://example.com/B": [],
      "https://example.com/C": [],
    };

    const repository = createMockRepository(
      async (id: PostId) => posts[id.href] || null,
      async (post: Post) => replies[post.id.href] || [],
    );

    const threads = await getPossibleThreads(
      createPostIdFromString("https://example.com/A"),
      repository,
    );

    expect(threads).toHaveLength(2);
    expect(threads[0].map((p) => p.id.href)).toEqual([
      "https://example.com/A",
      "https://example.com/B",
    ]);
    expect(threads[1].map((p) => p.id.href)).toEqual([
      "https://example.com/A",
      "https://example.com/C",
    ]);
  });

  it("포스트를 찾을 수 없으면 빈 배열 반환", async () => {
    const repository = createMockRepository(
      async () => null,
      async () => [],
    );

    const threads = await getPossibleThreads(
      createPostIdFromString("https://example.com/nonexistent"),
      repository,
    );

    expect(threads).toHaveLength(0);
  });
});

describe("getLongestThread", () => {
  it("분기가 있을 때 가장 긴 스레드 반환", async () => {
    const alice = "https://example.com/users/alice";
    const postA = createMockPost({
      id: "https://example.com/A",
      authorId: alice,
    });
    const postB = createMockPost({
      id: "https://example.com/B",
      authorId: alice,
      inReplyTo: "https://example.com/A",
    });
    const postC = createMockPost({
      id: "https://example.com/C",
      authorId: alice,
      inReplyTo: "https://example.com/B",
    });
    const postD = createMockPost({
      id: "https://example.com/D",
      authorId: alice,
      inReplyTo: "https://example.com/A",
    });

    const posts: Record<string, Post> = {
      "https://example.com/A": postA,
      "https://example.com/B": postB,
      "https://example.com/C": postC,
      "https://example.com/D": postD,
    };
    const replies: Record<string, Post[]> = {
      "https://example.com/A": [postB, postD],
      "https://example.com/B": [postC],
      "https://example.com/C": [],
      "https://example.com/D": [],
    };

    const repository = createMockRepository(
      async (id: PostId) => posts[id.href] || null,
      async (post: Post) => replies[post.id.href] || [],
    );

    const thread = await getLongestThread(
      createPostIdFromString("https://example.com/A"),
      repository,
    );

    // A -> B -> C (길이 3) vs A -> D (길이 2)
    expect(thread).not.toBeNull();
    expect(thread).toHaveLength(3);
    expect(thread!.map((p) => p.id.href)).toEqual([
      "https://example.com/A",
      "https://example.com/B",
      "https://example.com/C",
    ]);
  });

  it("포스트를 찾을 수 없으면 null 반환", async () => {
    const repository = createMockRepository(
      async () => null,
      async () => [],
    );

    const thread = await getLongestThread(
      createPostIdFromString("https://example.com/nonexistent"),
      repository,
    );

    expect(thread).toBeNull();
  });
});
