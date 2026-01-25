import { describe, it, expect } from "vitest";
import { noopSanitizer } from "./sanitizer";
import { createDOMPurifySanitizer, defaultSanitizer } from "@/infra/domPurifySanitizer";

describe("noopSanitizer", () => {
  it("입력을 그대로 반환해야 함", () => {
    const input = '<script>alert("xss")</script><p>Hello</p>';
    const result = noopSanitizer(input);
    expect(result).toBe(input);
  });
});

describe("createDOMPurifySanitizer", () => {
  it("스크립트 태그를 제거해야 함", () => {
    const sanitizer = createDOMPurifySanitizer();
    const input = '<script>alert("xss")</script><p>Hello</p>';
    const result = sanitizer(input);

    expect(result).not.toContain("<script>");
    expect(result).toContain("<p>Hello</p>");
  });

  it("허용된 태그는 유지해야 함", () => {
    const sanitizer = createDOMPurifySanitizer();
    const input = "<p>Hello <strong>World</strong></p>";
    const result = sanitizer(input);

    expect(result).toBe(input);
  });

  it("onclick 등의 이벤트 핸들러를 제거해야 함", () => {
    const sanitizer = createDOMPurifySanitizer();
    const input = '<a href="https://example.com" onclick="alert(1)">Link</a>';
    const result = sanitizer(input);

    expect(result).not.toContain("onclick");
    expect(result).toContain("href");
  });

  it("iframe을 제거해야 함", () => {
    const sanitizer = createDOMPurifySanitizer();
    const input = '<iframe src="https://evil.com"></iframe><p>Safe</p>';
    const result = sanitizer(input);

    expect(result).not.toContain("<iframe>");
    expect(result).toContain("<p>Safe</p>");
  });

  it("커스텀 허용 태그를 설정할 수 있어야 함", () => {
    const sanitizer = createDOMPurifySanitizer({
      allowedTags: ["p", "div"],
    });
    const input = "<p>Para</p><span>Span</span><div>Div</div>";
    const result = sanitizer(input);

    expect(result).toContain("<p>Para</p>");
    expect(result).toContain("<div>Div</div>");
    expect(result).not.toContain("<span>");
  });

  it("빈 문자열을 처리할 수 있어야 함", () => {
    const sanitizer = createDOMPurifySanitizer();
    const result = sanitizer("");

    expect(result).toBe("");
  });
});

describe("defaultSanitizer", () => {
  it("기본 sanitizer가 동작해야 함", () => {
    const input = '<script>alert("xss")</script><p>Hello</p>';
    const result = defaultSanitizer(input);

    expect(result).not.toContain("<script>");
    expect(result).toContain("<p>Hello</p>");
  });
});
