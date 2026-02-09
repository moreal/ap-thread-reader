import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPostIdFromString } from "@/domain/values";
import { LanguageString } from "@fedify/fedify";

function createCompleteMockPost(overrides: Record<string, unknown> = {}) {
  return {
    id: { href: "https://example.com/post/1" },
    attributionId: { href: "https://example.com/user/1" },
    content: { toString: () => "<p>Post content</p>" },
    contents: [],
    summary: null,
    summaries: [],
    published: { toString: () => "2024-01-01T00:00:00Z" },
    replyTargetId: null,
    url: new URL("https://example.com/post/1"),
    getAttribution: async () => null,
    getReplies: async () => null,
    ...overrides,
  };
}

describe("ActivityPubPostRepository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("replies collection의 첫 페이지에서 답글을 가져와야 함", async () => {
    const mockReplyNote = {
      id: { href: "https://example.com/reply/1" },
      attributionId: { href: "https://example.com/user/1" },
      content: { toString: () => "<p>Reply content</p>" },
      published: { toString: () => "2024-01-01T00:00:00Z" },
      replyTargetId: { href: "https://example.com/post/1" },
      url: new URL("https://example.com/reply/1"),
      getAttribution: async () => null,
    };

    const mockFirstPage = {
      getItems: async function* () {
        yield mockReplyNote;
      },
      getNext: async () => null,
    };

    const mockRepliesCollection = {
      id: { href: "https://example.com/post/1#replies" },
      getFirst: async () => mockFirstPage,
    };

    const mockPost = createCompleteMockPost({
      getReplies: async () => mockRepliesCollection,
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockReplyNote || obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();
    const post = await repository.findById(createPostIdFromString("https://example.com/post/1"));

    expect(post).not.toBeNull();
    if (post) {
      const replies = await repository.findReplies(post);
      expect(replies).toHaveLength(1);
      expect(replies[0].id.href).toBe("https://example.com/reply/1");
      expect(replies[0].content).toBe("<p>Reply content</p>");
    }
  });

  it("페이지네이션된 replies collection을 처리해야 함", async () => {
    const mockReplyNote = {
      id: { href: "https://example.com/reply/1" },
      attributionId: { href: "https://example.com/user/1" },
      content: { toString: () => "<p>Paginated reply</p>" },
      published: { toString: () => "2024-01-01T00:00:00Z" },
      replyTargetId: { href: "https://example.com/post/1" },
      url: new URL("https://example.com/reply/1"),
      getAttribution: async () => null,
    };

    const mockFirstPage = {
      getItems: async function* () {
        yield mockReplyNote;
      },
      getNext: async () => null,
    };

    const mockRepliesCollection = {
      id: { href: "https://example.com/post/1#replies" },
      getItems: async function* () {},
      getFirst: async () => mockFirstPage,
    };

    const mockPost = createCompleteMockPost({
      getReplies: async () => mockRepliesCollection,
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockReplyNote || obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();
    const post = await repository.findById(createPostIdFromString("https://example.com/post/1"));

    expect(post).not.toBeNull();
    if (post) {
      const replies = await repository.findReplies(post);
      expect(replies).toHaveLength(1);
      expect(replies[0].content).toBe("<p>Paginated reply</p>");
    }
  });

  it("reply traversal 중 fetch 에러가 발생해도 이미 수집된 답글을 반환해야 함", async () => {
    const mockReplyNote = {
      id: { href: "https://example.com/reply/1" },
      attributionId: { href: "https://example.com/user/1" },
      content: { toString: () => "<p>Successful reply</p>" },
      published: { toString: () => "2024-01-01T00:00:00Z" },
      replyTargetId: { href: "https://example.com/post/1" },
      url: new URL("https://example.com/reply/1"),
      getAttribution: async () => null,
    };

    // First page yields one item then the second page throws a fetch error
    const mockFirstPage = {
      getItems: async function* () {
        yield mockReplyNote;
      },
      getNext: async () => ({
        getItems: async function* () {
          throw new TypeError("fetch failed");
        },
        getNext: async () => null,
      }),
    };

    const mockRepliesCollection = {
      id: { href: "https://example.com/post/1#replies" },
      getFirst: async () => mockFirstPage,
    };

    const mockPost = createCompleteMockPost({
      getReplies: async () => mockRepliesCollection,
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockReplyNote || obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();
    const post = await repository.findById(createPostIdFromString("https://example.com/post/1"));

    expect(post).not.toBeNull();
    if (post) {
      const replies = await repository.findReplies(post);
      expect(replies).toHaveLength(1);
      expect(replies[0].id.href).toBe("https://example.com/reply/1");
      expect(replies[0].content).toBe("<p>Successful reply</p>");
    }
  });

  it("replies collection이 없으면 빈 배열을 반환해야 함", async () => {
    const mockPost = createCompleteMockPost({
      getReplies: async () => null,
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();
    const post = await repository.findById(createPostIdFromString("https://example.com/post/1"));

    expect(post).not.toBeNull();
    if (post) {
      const replies = await repository.findReplies(post);
      expect(replies).toHaveLength(0);
    }
  });

  it("인라인과 페이지네이션 모두 비어있으면 빈 배열을 반환해야 함", async () => {
    const mockRepliesCollection = {
      id: { href: "https://example.com/post/1#replies" },
      getItems: async function* () {},
      getFirst: async () => null,
    };

    const mockPost = createCompleteMockPost({
      getReplies: async () => mockRepliesCollection,
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();
    const post = await repository.findById(createPostIdFromString("https://example.com/post/1"));

    expect(post).not.toBeNull();
    if (post) {
      const replies = await repository.findReplies(post);
      expect(replies).toHaveLength(0);
    }
  });

  it("포스트에서 summary를 추출해야 함", async () => {
    const mockPost = createCompleteMockPost({
      summary: { toString: () => "This is a summary of the post" },
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();
    const post = await repository.findById(createPostIdFromString("https://example.com/post/1"));

    expect(post).not.toBeNull();
    expect(post?.summary).toBe("This is a summary of the post");
  });

  it("summary가 없으면 null이어야 함", async () => {
    const mockPost = createCompleteMockPost({
      summary: null,
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();
    const post = await repository.findById(createPostIdFromString("https://example.com/post/1"));

    expect(post).not.toBeNull();
    expect(post?.summary).toBeNull();
  });

  it("language 파라미터로 특정 언어의 content를 추출해야 함", async () => {
    const mockPost = createCompleteMockPost({
      content: null,
      contents: [
        new LanguageString("<p>Hello</p>", "en"),
        new LanguageString("<p>こんにちは</p>", "ja"),
        new LanguageString("<p>안녕하세요</p>", "ko"),
      ],
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();

    // 일본어 content 추출
    const jaPost = await repository.findById(
      createPostIdFromString("https://example.com/post/1"),
      "ja",
    );
    expect(jaPost).not.toBeNull();
    expect(jaPost?.content).toBe("<p>こんにちは</p>");

    // 한국어 content 추출
    const koPost = await repository.findById(
      createPostIdFromString("https://example.com/post/1"),
      "ko",
    );
    expect(koPost).not.toBeNull();
    expect(koPost?.content).toBe("<p>안녕하세요</p>");
  });

  it("language 파라미터가 없으면 첫 번째 content를 반환해야 함", async () => {
    const mockPost = createCompleteMockPost({
      content: null,
      contents: [
        new LanguageString("<p>Hello</p>", "en"),
        new LanguageString("<p>こんにちは</p>", "ja"),
      ],
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();
    const post = await repository.findById(createPostIdFromString("https://example.com/post/1"));

    expect(post).not.toBeNull();
    expect(post?.content).toBe("<p>Hello</p>");
  });

  it("지정된 언어가 없으면 첫 번째 content로 fallback해야 함", async () => {
    const mockPost = createCompleteMockPost({
      content: null,
      contents: [
        new LanguageString("<p>Hello</p>", "en"),
        new LanguageString("<p>こんにちは</p>", "ja"),
      ],
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();
    const post = await repository.findById(
      createPostIdFromString("https://example.com/post/1"),
      "fr", // 프랑스어는 없음
    );

    expect(post).not.toBeNull();
    expect(post?.content).toBe("<p>Hello</p>"); // 첫 번째로 fallback
  });

  it("language 파라미터로 특정 언어의 summary를 추출해야 함", async () => {
    const mockPost = createCompleteMockPost({
      summary: null,
      summaries: [
        new LanguageString("Summary in English", "en"),
        new LanguageString("日本語の要約", "ja"),
      ],
    });

    vi.doMock("@fedify/fedify", async (importOriginal) => {
      const original = await importOriginal<typeof import("@fedify/fedify")>();
      return {
        ...original,
        lookupObject: vi.fn().mockResolvedValue(mockPost),
        Note: class MockNote {
          static [Symbol.hasInstance](obj: unknown) {
            return obj === mockPost;
          }
        },
        Article: class MockArticle {
          static [Symbol.hasInstance]() {
            return false;
          }
        },
        isActor: () => false,
      };
    });

    const { ActivityPubPostRepository } = await import("./ActivityPubPostRepository");
    const repository = new ActivityPubPostRepository();
    const post = await repository.findById(
      createPostIdFromString("https://example.com/post/1"),
      "ja",
    );

    expect(post).not.toBeNull();
    expect(post?.summary).toBe("日本語の要約");
  });
});
