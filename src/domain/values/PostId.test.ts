import { describe, it, expect } from "vitest";
import { isValidPostUrl, createPostId, createPostIdFromString, tryCreatePostId } from "./PostId";

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

describe("createPostId", () => {
  it("URL을 PostId로 변환해야 함", () => {
    const url = new URL("https://example.com/posts/1");
    const postId = createPostId(url);
    expect(postId.href).toBe("https://example.com/posts/1");
  });
});

describe("createPostIdFromString", () => {
  it("문자열을 PostId로 변환해야 함", () => {
    const postId = createPostIdFromString("https://example.com/posts/1");
    expect(postId.href).toBe("https://example.com/posts/1");
  });

  it("잘못된 URL이면 에러를 던져야 함", () => {
    expect(() => createPostIdFromString("not-a-url")).toThrow();
  });
});

describe("tryCreatePostId", () => {
  it("유효한 URL이면 PostId를 반환해야 함", () => {
    const postId = tryCreatePostId("https://example.com/posts/1");
    expect(postId).not.toBeNull();
    expect(postId!.href).toBe("https://example.com/posts/1");
  });

  it("잘못된 URL이면 null을 반환해야 함", () => {
    const postId = tryCreatePostId("not-a-url");
    expect(postId).toBeNull();
  });
});
