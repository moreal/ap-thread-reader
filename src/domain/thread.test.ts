import { describe, it, expect, vi } from "vitest";
import {
  getPossibleThreads,
  getLongestThread,
  filterSelfReplies,
} from "./thread";
import type { Post, PostId, ThreadCollectorDeps } from "./types";

// 테스트용 Mock Post 생성 헬퍼
function createMockPost(overrides: Partial<Post> = {}): Post {
  return {
    id: "https://example.com/posts/1",
    authorId: "https://example.com/users/alice",
    content: "<p>Test content</p>",
    publishedAt: "2024-01-01T00:00:00Z",
    inReplyTo: null,
    url: "https://example.com/@alice/1",
    ...overrides,
  };
}

describe("filterSelfReplies", () => {
  it("작성자가 같은 답글만 반환해야 함", () => {
    const authorId = "https://example.com/users/alice";
    const replies: Post[] = [
      createMockPost({ id: "reply1", authorId }),
      createMockPost({ id: "reply2", authorId: "https://example.com/users/bob" }),
      createMockPost({ id: "reply3", authorId }),
    ];

    const result = filterSelfReplies(replies, authorId);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(["reply1", "reply3"]);
  });

  it("self-reply가 없으면 빈 배열 반환", () => {
    const replies: Post[] = [
      createMockPost({ authorId: "https://example.com/users/bob" }),
    ];

    const result = filterSelfReplies(
      replies,
      "https://example.com/users/alice"
    );

    expect(result).toHaveLength(0);
  });
});

describe("getPossibleThreads", () => {
  it("단일 포스트만 있을 때 길이 1의 스레드 반환", async () => {
    const post = createMockPost();
    const deps: ThreadCollectorDeps = {
      fetchPost: vi.fn().mockResolvedValue(post),
      fetchReplies: vi.fn().mockResolvedValue([]),
    };

    const threads = await getPossibleThreads(post.id, deps);

    expect(threads).toHaveLength(1);
    expect(threads[0]).toHaveLength(1);
    expect(threads[0][0]).toEqual(post);
  });

  it("self-reply 체인을 따라가야 함", async () => {
    const alice = "https://example.com/users/alice";
    const postA = createMockPost({ id: "A", authorId: alice });
    const postB = createMockPost({ id: "B", authorId: alice, inReplyTo: "A" });
    const postC = createMockPost({ id: "C", authorId: alice, inReplyTo: "B" });

    const deps: ThreadCollectorDeps = {
      fetchPost: vi.fn().mockImplementation((id: PostId) => {
        const posts: Record<string, Post> = { A: postA, B: postB, C: postC };
        return Promise.resolve(posts[id] || null);
      }),
      fetchReplies: vi.fn().mockImplementation((id: PostId) => {
        const replies: Record<string, Post[]> = {
          A: [postB],
          B: [postC],
          C: [],
        };
        return Promise.resolve(replies[id] || []);
      }),
    };

    const threads = await getPossibleThreads("A", deps);

    expect(threads).toHaveLength(1);
    expect(threads[0]).toHaveLength(3);
    expect(threads[0].map((p) => p.id)).toEqual(["A", "B", "C"]);
  });

  it("다른 사용자의 답글은 무시해야 함", async () => {
    const alice = "https://example.com/users/alice";
    const bob = "https://example.com/users/bob";
    const postA = createMockPost({ id: "A", authorId: alice });
    const postB = createMockPost({ id: "B", authorId: bob, inReplyTo: "A" });

    const deps: ThreadCollectorDeps = {
      fetchPost: vi.fn().mockResolvedValue(postA),
      fetchReplies: vi.fn().mockResolvedValue([postB]),
    };

    const threads = await getPossibleThreads("A", deps);

    expect(threads).toHaveLength(1);
    expect(threads[0]).toHaveLength(1);
  });

  it("분기가 있을 때 여러 스레드 반환", async () => {
    const alice = "https://example.com/users/alice";
    const postA = createMockPost({ id: "A", authorId: alice });
    const postB = createMockPost({ id: "B", authorId: alice, inReplyTo: "A" });
    const postC = createMockPost({ id: "C", authorId: alice, inReplyTo: "A" });

    const deps: ThreadCollectorDeps = {
      fetchPost: vi.fn().mockImplementation((id: PostId) => {
        const posts: Record<string, Post> = { A: postA, B: postB, C: postC };
        return Promise.resolve(posts[id] || null);
      }),
      fetchReplies: vi.fn().mockImplementation((id: PostId) => {
        const replies: Record<string, Post[]> = {
          A: [postB, postC], // 두 개의 self-reply
          B: [],
          C: [],
        };
        return Promise.resolve(replies[id] || []);
      }),
    };

    const threads = await getPossibleThreads("A", deps);

    expect(threads).toHaveLength(2);
    expect(threads[0].map((p) => p.id)).toEqual(["A", "B"]);
    expect(threads[1].map((p) => p.id)).toEqual(["A", "C"]);
  });

  it("포스트를 찾을 수 없으면 빈 배열 반환", async () => {
    const deps: ThreadCollectorDeps = {
      fetchPost: vi.fn().mockResolvedValue(null),
      fetchReplies: vi.fn().mockResolvedValue([]),
    };

    const threads = await getPossibleThreads("nonexistent", deps);

    expect(threads).toHaveLength(0);
  });
});

describe("getLongestThread", () => {
  it("분기가 있을 때 가장 긴 스레드 반환", async () => {
    const alice = "https://example.com/users/alice";
    const postA = createMockPost({ id: "A", authorId: alice });
    const postB = createMockPost({ id: "B", authorId: alice, inReplyTo: "A" });
    const postC = createMockPost({ id: "C", authorId: alice, inReplyTo: "B" });
    const postD = createMockPost({ id: "D", authorId: alice, inReplyTo: "A" });

    const deps: ThreadCollectorDeps = {
      fetchPost: vi.fn().mockImplementation((id: PostId) => {
        const posts: Record<string, Post> = {
          A: postA,
          B: postB,
          C: postC,
          D: postD,
        };
        return Promise.resolve(posts[id] || null);
      }),
      fetchReplies: vi.fn().mockImplementation((id: PostId) => {
        const replies: Record<string, Post[]> = {
          A: [postB, postD], // 분기: B와 D 모두 self-reply
          B: [postC],
          C: [],
          D: [],
        };
        return Promise.resolve(replies[id] || []);
      }),
    };

    const thread = await getLongestThread("A", deps);

    // A -> B -> C (길이 3) vs A -> D (길이 2)
    expect(thread).toHaveLength(3);
    expect(thread.map((p) => p.id)).toEqual(["A", "B", "C"]);
  });

  it("포스트를 찾을 수 없으면 빈 배열 반환", async () => {
    const deps: ThreadCollectorDeps = {
      fetchPost: vi.fn().mockResolvedValue(null),
      fetchReplies: vi.fn().mockResolvedValue([]),
    };

    const thread = await getLongestThread("nonexistent", deps);

    expect(thread).toHaveLength(0);
  });
});
