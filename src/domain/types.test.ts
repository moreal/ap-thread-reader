import { describe, it, expect } from "vitest";
import { selectLanguageContent, applyLanguageToPost, applyLanguageToSerializablePost } from "./types";
import type { Post, SerializablePost } from "./types";

describe("selectLanguageContent", () => {
  it("언어 맵이 없으면 기본 콘텐츠를 반환해야 함", () => {
    const result = selectLanguageContent("default content", undefined, "en");
    expect(result).toBe("default content");
  });

  it("언어가 지정되지 않으면 기본 콘텐츠를 반환해야 함", () => {
    const contentMap = { en: "English content", ko: "한국어 콘텐츠" };
    const result = selectLanguageContent("default content", contentMap, undefined);
    expect(result).toBe("default content");
  });

  it("정확히 일치하는 언어가 있으면 해당 콘텐츠를 반환해야 함", () => {
    const contentMap = { en: "English content", ko: "한국어 콘텐츠", ja: "日本語コンテンツ" };
    const result = selectLanguageContent("default content", contentMap, "ko");
    expect(result).toBe("한국어 콘텐츠");
  });

  it("지역 코드가 있는 언어 태그에서 기본 언어를 사용해야 함", () => {
    const contentMap = { en: "English content", ko: "한국어 콘텐츠" };
    const result = selectLanguageContent("default content", contentMap, "en-US");
    expect(result).toBe("English content");
  });

  it("일치하는 언어가 없으면 기본 콘텐츠를 반환해야 함", () => {
    const contentMap = { en: "English content", ko: "한국어 콘텐츠" };
    const result = selectLanguageContent("default content", contentMap, "fr");
    expect(result).toBe("default content");
  });

  it("빈 문자열 언어는 기본 콘텐츠를 반환해야 함", () => {
    const contentMap = { en: "English content", ko: "한국어 콘텐츠" };
    const result = selectLanguageContent("default content", contentMap, "");
    expect(result).toBe("default content");
  });

  it("빈 contentMap이면 기본 콘텐츠를 반환해야 함", () => {
    const contentMap = {};
    const result = selectLanguageContent("default content", contentMap, "en");
    expect(result).toBe("default content");
  });
});

describe("applyLanguageToPost", () => {
  const basePost: Post = {
    id: new URL("https://example.com/post/1") as any,
    authorId: "https://example.com/user/1",
    author: { id: "https://example.com/user/1", name: "Test User", url: "https://example.com/@user" },
    content: "Default content",
    summary: "Default summary",
    contentMap: { en: "English content", ko: "한국어 콘텐츠" },
    summaryMap: { en: "English summary", ko: "한국어 요약" },
    publishedAt: "2024-01-01T00:00:00Z",
    inReplyTo: null,
    url: "https://example.com/post/1",
  };

  it("언어가 지정되지 않으면 원본 post를 반환해야 함", () => {
    const result = applyLanguageToPost(basePost, undefined);
    expect(result).toBe(basePost);
  });

  it("지정된 언어의 content와 summary를 적용해야 함", () => {
    const result = applyLanguageToPost(basePost, "ko");
    expect(result.content).toBe("한국어 콘텐츠");
    expect(result.summary).toBe("한국어 요약");
    expect(result.id).toBe(basePost.id);
    expect(result.author).toBe(basePost.author);
  });

  it("언어 맵에 없는 언어는 기본값을 사용해야 함", () => {
    const result = applyLanguageToPost(basePost, "fr");
    expect(result.content).toBe("Default content");
    expect(result.summary).toBe("Default summary");
  });

  it("summary가 null인 경우 처리해야 함", () => {
    const postWithoutSummary = { ...basePost, summary: null, summaryMap: undefined };
    const result = applyLanguageToPost(postWithoutSummary, "en");
    expect(result.summary).toBeNull();
  });
});

describe("applyLanguageToSerializablePost", () => {
  const basePost: SerializablePost = {
    id: "https://example.com/post/1",
    authorId: "https://example.com/user/1",
    author: { id: "https://example.com/user/1", name: "Test User", url: "https://example.com/@user" },
    content: "Default content",
    summary: "Default summary",
    contentMap: { en: "English content", ko: "한국어 콘텐츠" },
    summaryMap: { en: "English summary", ko: "한국어 요약" },
    publishedAt: "2024-01-01T00:00:00Z",
    inReplyTo: null,
    url: "https://example.com/post/1",
  };

  it("언어가 지정되지 않으면 원본 post를 반환해야 함", () => {
    const result = applyLanguageToSerializablePost(basePost, undefined);
    expect(result).toBe(basePost);
  });

  it("지정된 언어의 content와 summary를 적용해야 함", () => {
    const result = applyLanguageToSerializablePost(basePost, "en");
    expect(result.content).toBe("English content");
    expect(result.summary).toBe("English summary");
    expect(result.id).toBe(basePost.id);
    expect(result.author).toBe(basePost.author);
  });

  it("언어 맵에 없는 언어는 기본값을 사용해야 함", () => {
    const result = applyLanguageToSerializablePost(basePost, "ja");
    expect(result.content).toBe("Default content");
    expect(result.summary).toBe("Default summary");
  });
});
