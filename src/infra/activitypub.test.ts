import { describe, it, expect, vi, beforeEach } from "vitest";
import { isValidPostUrl } from "./activitypub";
import { createPostIdFromString } from "@/domain/types";

describe("isValidPostUrl", () => {
  it("유효한 HTTPS URL을 허용해야 함", () => {
    expect(isValidPostUrl("https://mastodon.social/@user/12345")).toBe(true);
  });

  it("유효한 HTTP URL을 허용해야 함", () => {
    expect(isValidPostUrl("http://example.com/posts/1")).toBe(true);
  });

  it("잘못된 URL을 거부해야 함", () => {
    expect(isValidPostUrl("not-a-url")).toBe(false);
  });

  it("빈 문자열을 거부해야 함", () => {
    expect(isValidPostUrl("")).toBe(false);
  });

  it("file:// 프로토콜을 거부해야 함", () => {
    expect(isValidPostUrl("file:///etc/passwd")).toBe(false);
  });

  it("javascript: 프로토콜을 거부해야 함", () => {
    expect(isValidPostUrl("javascript:alert(1)")).toBe(false);
  });

  it("ftp:// 프로토콜을 거부해야 함", () => {
    expect(isValidPostUrl("ftp://example.com/file")).toBe(false);
  });

  it("쿼리 파라미터가 있는 URL을 허용해야 함", () => {
    expect(isValidPostUrl("https://example.com/posts/1?format=json")).toBe(true);
  });
});

// fetchReplies 테스트는 Fedify 모듈을 모킹하여 수행
describe("fetchReplies", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("인라인 아이템이 있는 replies collection을 처리해야 함", async () => {
    // Mock Note 클래스와 인라인 아이템을 가진 collection
    const mockReplyNote = {
      id: { href: "https://example.com/reply/1" },
      attributionId: { href: "https://example.com/user/1" },
      content: { toString: () => "<p>Reply content</p>" },
      published: { toString: () => "2024-01-01T00:00:00Z" },
      replyTargetId: { href: "https://example.com/post/1" },
      url: new URL("https://example.com/reply/1"),
    };

    const mockRepliesCollection = {
      id: { href: "https://example.com/post/1#replies" },
      // getItems()가 직접 아이템을 반환 (인라인)
      getItems: async function* () {
        yield mockReplyNote;
      },
      // getFirst()는 null 반환 (페이지네이션 없음)
      getFirst: async () => null,
    };

    const mockPost = {
      id: { href: "https://example.com/post/1" },
      getReplies: async () => mockRepliesCollection,
    };

    // Fedify 모듈 모킹
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

    const { fetchReplies } = await import("./activitypub");
    const replies = await fetchReplies(createPostIdFromString("https://example.com/post/1"), {});

    expect(replies).toHaveLength(1);
    expect(replies[0].id.href).toBe("https://example.com/reply/1");
    expect(replies[0].content).toBe("<p>Reply content</p>");
  });

  it("페이지네이션된 replies collection을 처리해야 함", async () => {
    const mockReplyNote = {
      id: { href: "https://example.com/reply/1" },
      attributionId: { href: "https://example.com/user/1" },
      content: { toString: () => "<p>Paginated reply</p>" },
      published: { toString: () => "2024-01-01T00:00:00Z" },
      replyTargetId: { href: "https://example.com/post/1" },
      url: new URL("https://example.com/reply/1"),
    };

    const mockFirstPage = {
      getItems: async function* () {
        yield mockReplyNote;
      },
      nextId: null, // 다음 페이지 없음
    };

    const mockRepliesCollection = {
      id: { href: "https://example.com/post/1#replies" },
      // getItems()는 빈 결과 (인라인 아이템 없음)
      getItems: async function* () {
        // 아무것도 yield하지 않음
      },
      // getFirst()가 페이지 반환
      getFirst: async () => mockFirstPage,
    };

    const mockPost = {
      id: { href: "https://example.com/post/1" },
      getReplies: async () => mockRepliesCollection,
    };

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

    const { fetchReplies } = await import("./activitypub");
    const replies = await fetchReplies(createPostIdFromString("https://example.com/post/1"), {});

    expect(replies).toHaveLength(1);
    expect(replies[0].content).toBe("<p>Paginated reply</p>");
  });

  it("replies collection이 없으면 빈 배열을 반환해야 함", async () => {
    const mockPost = {
      id: { href: "https://example.com/post/1" },
      getReplies: async () => null,
    };

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

    const { fetchReplies } = await import("./activitypub");
    const replies = await fetchReplies(createPostIdFromString("https://example.com/post/1"), {});

    expect(replies).toHaveLength(0);
  });

  it("인라인과 페이지네이션 모두 비어있으면 빈 배열을 반환해야 함", async () => {
    const mockRepliesCollection = {
      id: { href: "https://example.com/post/1#replies" },
      getItems: async function* () {
        // 빈 인라인
      },
      getFirst: async () => null, // 페이지네이션도 없음
    };

    const mockPost = {
      id: { href: "https://example.com/post/1" },
      getReplies: async () => mockRepliesCollection,
    };

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

    const { fetchReplies } = await import("./activitypub");
    const replies = await fetchReplies(createPostIdFromString("https://example.com/post/1"), {});

    expect(replies).toHaveLength(0);
  });
});
