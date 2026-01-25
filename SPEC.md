# ActivityPub 스레드 리더 (Thread Reader)

## 프로젝트 개요

ActivityPub 프로토콜을 활용하여 Mastodon 등의 Fediverse 플랫폼에서 작성된 스레드를 하나의 긴 글처럼 읽을 수 있게 해주는 웹 서비스입니다.

### 배경

- Mastodon에는 글자 수 제한(기본 500자)이 있어 Twitter처럼 긴 스레드로 글을 작성하는 경우가 있음
- ActivityPub 프로토콜 자체에는 길이 제한이 없으나 구현체마다 다름
- 스레드 형태의 글은 읽기 불편하므로 하나의 글처럼 연결하여 보여주고자 함

### 핵심 기능

- ActivityPub 포스트 URL을 입력받아 해당 포스트부터 시작하는 self-reply 스레드를 수집
- 수집된 스레드를 하나의 연속된 글처럼 렌더링
- Mastodon에 특화되지 않고 ActivityPub 표준을 따르는 모든 서버 지원

---

## 기술 스택

| 구분                   | 기술                                     |
| ---------------------- | ---------------------------------------- |
| 언어                   | TypeScript                               |
| 런타임                 | Node.js                                  |
| ActivityPub 클라이언트 | Fedify (`@fedify/fedify`)                |
| 프론트엔드             | React                                    |
| 메타프레임워크         | TanStack Start                           |
| 번들러                 | Vite (with Rolldown)                     |
| 테스트                 | Vitest                                   |
| 패키지 매니저          | Yarn (nodeLinker: pnpm)                  |
| 포매팅                 | oxfmt                                    |
| 린팅                   | ESLint + oxlint (병행)                   |
| HTML Sanitizer         | DOMPurify (Context로 주입)               |
| 다국어(i18n)           | Lingui (`@lingui/core`, `@lingui/react`) |
| 로깅                   | LogTape (`@logtape/logtape`)             |

---

## ActivityPub 개념 정리

### 관련 타입

Fedify에서 제공하는 Activity Vocabulary 타입을 사용합니다:

- **Note**: 짧은 글 (Mastodon의 일반 포스트)
- **Article**: 긴 글 (블로그 포스트 등)
- **Object**: Note와 Article의 공통 부모 타입

### 핵심 속성

```typescript
// ActivityPub Object의 주요 속성
interface ActivityPubObject {
  id: URL; // 포스트의 고유 URI
  attributedTo: URL | Actor; // 작성자 (Actor의 URI 또는 객체)
  content: string; // HTML 형식의 본문
  published: Temporal.Instant; // 작성 시간
  inReplyTo?: URL | Object; // 답글 대상 (부모 포스트)
  replies?: Collection; // 답글 컬렉션
}
```

### 스레드 탐지 로직

1. **시작점**: 사용자가 입력한 URL로 포스트 A를 fetch
2. **Self-reply 탐색**: A의 `replies` 컬렉션에서 `attributedTo`가 A의 작성자와 동일한 포스트 B를 찾음
3. **재귀**: B의 `replies`에서 동일한 조건의 포스트 C를 찾음
4. **종료**: 더 이상 self-reply가 없을 때까지 반복

> **참고**: Mastodon의 `replies` 컬렉션 첫 페이지에는 self-replies만 포함됨. 다른 구현체는 다를 수 있으므로 `attributedTo` 비교는 필수.

### Fedify 사용법

```typescript
import { lookupObject } from "@fedify/fedify/x/lookup";
import { Note, Article, Object as APObject } from "@fedify/fedify/vocab";

// 객체 조회
const object = await lookupObject("https://mastodon.social/@user/123456789");

// 타입 체크
if (object instanceof Note || object instanceof Article) {
  const content = object.content; // 본문
  const authorId = object.attributedToId; // 작성자 URI
  const replyToId = object.inReplyToId; // 답글 대상 URI

  // replies 컬렉션 접근 (비동기 dereference)
  const replies = await object.getReplies();
}
```

---

## 프로젝트 구조

```
thread-reader/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── app.config.ts
├── lingui.config.ts               # Lingui 설정
├── .yarnrc.yml                    # Yarn 설정 (nodeLinker: pnpm)
├── eslint.config.js               # ESLint 설정
├── oxlint.json                    # oxlint 설정
├── src/
│   ├── domain/                    # 도메인 로직 (순수 함수)
│   │   ├── types.ts               # 도메인 타입 정의
│   │   ├── thread.ts              # 스레드 수집 로직
│   │   ├── thread.test.ts         # 스레드 로직 테스트
│   │   ├── formatter.ts           # 출력 포맷팅
│   │   ├── formatter.test.ts      # 포맷터 테스트
│   │   ├── sanitizer.ts           # HTML Sanitizer 인터페이스 및 기본 구현
│   │   └── sanitizer.test.ts      # Sanitizer 테스트
│   ├── infra/                     # 인프라/외부 의존성
│   │   ├── activitypub.ts         # Fedify 기반 AP 클라이언트
│   │   └── activitypub.test.ts    # AP 클라이언트 테스트 (통합)
│   ├── context/                   # React Context & Providers
│   │   ├── SanitizerContext.tsx   # Sanitizer 주입용 Context
│   │   └── AppProviders.tsx       # 앱 전체 Provider 조합
│   ├── logging/                   # 로깅 설정
│   │   ├── categories.ts          # 로그 카테고리 정의
│   │   ├── setup.ts               # LogTape 설정
│   │   └── index.ts               # 로거 export
│   ├── i18n/                      # 다국어 지원
│   │   ├── setup.ts               # Lingui 설정 및 초기화
│   │   ├── locales/               # 번역 파일
│   │   │   ├── en/
│   │   │   │   └── messages.ts    # 영어 번역 (컴파일됨)
│   │   │   └── ko/
│   │   │       └── messages.ts    # 한국어 번역 (컴파일됨)
│   │   └── index.ts               # i18n export
│   ├── cli/                       # CLI 스크립트
│   │   └── main.ts                # CLI 진입점
│   ├── routes/                    # TanStack Start 라우트
│   │   ├── __root.tsx             # 루트 레이아웃
│   │   ├── index.tsx              # 홈페이지
│   │   └── read.tsx               # 스레드 읽기 페이지
│   ├── components/                # React 컴포넌트
│   │   ├── ThreadView.tsx         # 스레드 뷰어
│   │   ├── PostContent.tsx        # 개별 포스트 렌더링
│   │   └── LocaleSwitcher.tsx     # 언어 전환 컴포넌트
│   ├── hooks/                     # Custom Hooks
│   │   └── useSanitizer.ts        # Sanitizer 사용 hook
│   ├── styles/                    # CSS 스타일
│   │   └── typography.css         # 타이포그래피 스타일
│   ├── router.tsx                 # 라우터 설정
│   ├── client.tsx                 # 클라이언트 진입점
│   ├── server.ts                  # 서버 진입점
│   └── test/                      # 테스트 유틸리티
│       └── setup.ts               # Vitest 설정
└── scripts/
    └── cli.ts                     # CLI 실행 스크립트
```

---

## Phase 1: 도메인 로직 구현 (TDD)

### 1.1 타입 정의 (`src/domain/types.ts`)

```typescript
/**
 * 포스트의 고유 식별자 (ActivityPub URI)
 */
export type PostId = string;

/**
 * 작성자의 고유 식별자 (ActivityPub Actor URI)
 */
export type AuthorId = string;

/**
 * 도메인 Post 객체
 * ActivityPub의 Note/Article을 추상화한 내부 표현
 */
export interface Post {
  /** 포스트의 고유 URI */
  id: PostId;

  /** 작성자의 URI */
  authorId: AuthorId;

  /** HTML 형식의 본문 */
  content: string;

  /** 작성 시간 (ISO 8601) */
  publishedAt: string;

  /** 답글 대상 포스트의 URI (없으면 null) */
  inReplyTo: PostId | null;

  /** 원본 URL (사용자가 브라우저에서 볼 수 있는 URL) */
  url: string | null;
}

/**
 * 스레드: 연결된 포스트들의 배열
 * - index 0: 루트 포스트
 * - index length-1: 마지막 답글
 */
export type Thread = Post[];

/**
 * 포스트를 fetch하는 함수의 타입
 * 의존성 주입을 위해 사용
 */
export type PostFetchFn = (postId: PostId) => Promise<Post | null>;

/**
 * 포스트의 답글 목록을 fetch하는 함수의 타입
 */
export type RepliesFetchFn = (postId: PostId) => Promise<Post[]>;
```

### 1.2 스레드 수집 로직 (`src/domain/thread.ts`)

```typescript
import type { Post, PostId, Thread, PostFetchFn, RepliesFetchFn } from "./types";

export interface ThreadCollectorDeps {
  fetchPost: PostFetchFn;
  fetchReplies: RepliesFetchFn;
}

/**
 * 주어진 포스트에서 시작하는 가능한 self-reply 스레드들을 수집합니다.
 *
 * @param startPostId - 시작 포스트의 ID
 * @param deps - 의존성 (fetchPost, fetchReplies)
 * @returns 가능한 스레드들의 배열 (분기가 있을 경우 여러 개)
 *
 * @example
 * // 단일 스레드
 * // A -> B -> C (모두 같은 작성자의 self-reply)
 * // 결과: [[A, B, C]]
 *
 * @example
 * // 분기된 스레드
 * // A -> B -> C
 * //   -> D -> E (B와 D 모두 A에 대한 작성자의 self-reply)
 * // 결과: [[A, B, C], [A, D, E]]
 */
export async function getPossibleThreads(
  startPostId: PostId,
  deps: ThreadCollectorDeps,
): Promise<Thread[]> {
  // 구현 예정
}

/**
 * 주어진 포스트에서 시작하여 가장 긴 self-reply 스레드를 수집합니다.
 * 분기가 있을 경우 가장 긴 경로를 선택합니다.
 */
export async function getLongestThread(
  startPostId: PostId,
  deps: ThreadCollectorDeps,
): Promise<Thread> {
  // 구현 예정
}

/**
 * 답글 목록에서 특정 작성자의 self-reply만 필터링합니다.
 */
export function filterSelfReplies(replies: Post[], authorId: string): Post[] {
  return replies.filter((reply) => reply.authorId === authorId);
}
```

### 1.3 스레드 로직 테스트 (`src/domain/thread.test.ts`)

```typescript
import { describe, it, expect, vi } from "vitest";
import { getPossibleThreads, getLongestThread, filterSelfReplies } from "./thread";
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
    const replies: Post[] = [createMockPost({ authorId: "https://example.com/users/bob" })];

    const result = filterSelfReplies(replies, "https://example.com/users/alice");

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
        const posts: Record<string, Post> = { A: postA, B: postB, C: postC, D: postD };
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
});
```

### 1.4 포맷터 (`src/domain/formatter.ts`)

```typescript
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
 * 스레드를 문자열로 포맷팅합니다.
 */
export function formatThread(thread: Thread, options: FormatOptions = {}): string {
  // 구현 예정
}

/**
 * 개별 포스트를 문자열로 포맷팅합니다.
 */
export function formatPost(post: Post, options: FormatOptions = {}): string {
  // 구현 예정
}

/**
 * 스레드를 HTML로 포맷팅합니다 (프론트엔드용).
 */
export function formatThreadAsHtml(thread: Thread): string {
  // 구현 예정
}
```

### 1.5 HTML Sanitizer 인터페이스 (`src/domain/sanitizer.ts`)

XSS 공격 방지를 위한 Sanitizer 인터페이스를 정의합니다. 실제 구현은 외부에서 주입됩니다.

```typescript
/**
 * HTML Sanitizer 함수의 시그니처
 * Context를 통해 주입되어 다양한 구현체로 교체 가능
 */
export type SanitizeHtmlFn = (html: string) => string;

/**
 * Sanitizer 설정 옵션
 */
export interface SanitizerOptions {
  /** 허용할 HTML 태그 목록 */
  allowedTags?: string[];
  /** 허용할 속성 목록 */
  allowedAttrs?: string[];
  /** 금지할 태그 목록 */
  forbiddenTags?: string[];
  /** 금지할 속성 목록 */
  forbiddenAttrs?: string[];
}

/**
 * 기본 허용 태그 목록
 * ActivityPub 콘텐츠에서 일반적으로 사용되는 태그들
 */
export const DEFAULT_ALLOWED_TAGS = [
  // 텍스트 구조
  "p",
  "br",
  "span",
  "div",
  // 텍스트 포맷팅
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "mark",
  "code",
  "pre",
  // 링크
  "a",
  // 목록
  "ul",
  "ol",
  "li",
  // 인용
  "blockquote",
  // 미디어
  "img",
  "video",
  "audio",
  "source",
  // 기타
  "sup",
  "sub",
  "abbr",
] as const;

/**
 * 기본 허용 속성 목록
 */
export const DEFAULT_ALLOWED_ATTRS = [
  // 링크
  "href",
  "target",
  "rel",
  // 미디어
  "src",
  "alt",
  "title",
  "width",
  "height",
  "poster",
  "controls",
  "type",
  // 일반
  "class",
  "lang",
  "dir",
  // 접근성
  "aria-label",
  "aria-hidden",
] as const;

/**
 * 기본 금지 태그 목록
 */
export const DEFAULT_FORBIDDEN_TAGS = [
  "script",
  "style",
  "iframe",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "object",
  "embed",
  "applet",
  "frame",
  "frameset",
  "meta",
  "link",
  "base",
] as const;

/**
 * 기본 금지 속성 목록 (이벤트 핸들러 등)
 */
export const DEFAULT_FORBIDDEN_ATTRS = [
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onmouseout",
  "onkeydown",
  "onkeyup",
  "onsubmit",
  "onfocus",
  "onblur",
  "onchange",
  "oninput",
] as const;

/**
 * 아무것도 하지 않는 기본 sanitizer (테스트용)
 * 실제 환경에서는 DOMPurify 기반 구현체를 사용해야 함
 */
export const noopSanitizer: SanitizeHtmlFn = (html: string) => html;
```

### 1.6 Sanitizer Context (`src/context/SanitizerContext.tsx`)

```typescript
import * as React from 'react';
import type { SanitizeHtmlFn } from '../domain/sanitizer';
import { noopSanitizer } from '../domain/sanitizer';

interface SanitizerContextValue {
  sanitizeHtml: SanitizeHtmlFn;
}

const SanitizerContext = React.createContext<SanitizerContextValue>({
  sanitizeHtml: noopSanitizer,
});

export interface SanitizerProviderProps {
  children: React.ReactNode;
  sanitizer: SanitizeHtmlFn;
}

/**
 * Sanitizer를 Context로 제공하는 Provider
 * 앱 최상단에서 DOMPurify 기반 sanitizer를 주입
 */
export function SanitizerProvider({ children, sanitizer }: SanitizerProviderProps) {
  const value = React.useMemo(() => ({ sanitizeHtml: sanitizer }), [sanitizer]);

  return (
    <SanitizerContext.Provider value={value}>
      {children}
    </SanitizerContext.Provider>
  );
}

/**
 * Sanitizer를 사용하는 Custom Hook
 */
export function useSanitizer(): SanitizeHtmlFn {
  const { sanitizeHtml } = React.useContext(SanitizerContext);
  return sanitizeHtml;
}

export { SanitizerContext };
```

### 1.7 DOMPurify 기반 Sanitizer 구현 (`src/infra/domPurifySanitizer.ts`)

```typescript
import DOMPurify from "dompurify";
import type { SanitizeHtmlFn, SanitizerOptions } from "../domain/sanitizer";
import {
  DEFAULT_ALLOWED_TAGS,
  DEFAULT_ALLOWED_ATTRS,
  DEFAULT_FORBIDDEN_TAGS,
  DEFAULT_FORBIDDEN_ATTRS,
} from "../domain/sanitizer";

/**
 * DOMPurify 기반 Sanitizer 생성 함수
 * 브라우저 환경용
 */
export function createDOMPurifySanitizer(options: SanitizerOptions = {}): SanitizeHtmlFn {
  const config: DOMPurify.Config = {
    ALLOWED_TAGS: options.allowedTags ?? [...DEFAULT_ALLOWED_TAGS],
    ALLOWED_ATTR: options.allowedAttrs ?? [...DEFAULT_ALLOWED_ATTRS],
    FORBID_TAGS: options.forbiddenTags ?? [...DEFAULT_FORBIDDEN_TAGS],
    FORBID_ATTR: options.forbiddenAttrs ?? [...DEFAULT_FORBIDDEN_ATTRS],
    ALLOW_DATA_ATTR: false,
  };

  return (html: string): string => {
    return DOMPurify.sanitize(html, config);
  };
}

/**
 * 서버 사이드용 Sanitizer 생성 함수
 * JSDOM 기반 DOMPurify 사용
 */
export function createServerSanitizer(options: SanitizerOptions = {}): SanitizeHtmlFn {
  // 동적 import로 서버에서만 JSDOM 로드
  const { JSDOM } = require("jsdom");
  const window = new JSDOM("").window;
  const purify = DOMPurify(window);

  const config: DOMPurify.Config = {
    ALLOWED_TAGS: options.allowedTags ?? [...DEFAULT_ALLOWED_TAGS],
    ALLOWED_ATTR: options.allowedAttrs ?? [...DEFAULT_ALLOWED_ATTRS],
    FORBID_TAGS: options.forbiddenTags ?? [...DEFAULT_FORBIDDEN_TAGS],
    FORBID_ATTR: options.forbiddenAttrs ?? [...DEFAULT_FORBIDDEN_ATTRS],
    ALLOW_DATA_ATTR: false,
  };

  return (html: string): string => {
    return purify.sanitize(html, config);
  };
}
```

### 1.8 Sanitizer 테스트 (`src/domain/sanitizer.test.ts`)

```typescript
import { describe, it, expect } from "vitest";
import { createDOMPurifySanitizer } from "../infra/domPurifySanitizer";
import { DEFAULT_ALLOWED_TAGS, DEFAULT_ALLOWED_ATTRS, noopSanitizer } from "./sanitizer";

describe("noopSanitizer", () => {
  it("입력을 그대로 반환해야 함", () => {
    const input = '<script>alert("xss")</script>';
    expect(noopSanitizer(input)).toBe(input);
  });
});

describe("createDOMPurifySanitizer", () => {
  const sanitize = createDOMPurifySanitizer();

  it("허용된 태그는 유지해야 함", () => {
    const input = "<p>Hello <strong>World</strong></p>";
    expect(sanitize(input)).toBe("<p>Hello <strong>World</strong></p>");
  });

  it("script 태그를 제거해야 함", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitize(input)).toBe("<p>Hello</p>");
  });

  it("이벤트 핸들러 속성을 제거해야 함", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitize(input);
    expect(result).not.toContain("onerror");
  });

  it("href 속성은 유지해야 함", () => {
    const input = '<a href="https://example.com">Link</a>';
    expect(sanitize(input)).toContain('href="https://example.com"');
  });

  it("javascript: URL을 제거해야 함", () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitize(input);
    expect(result).not.toContain("javascript:");
  });

  it("style 태그를 제거해야 함", () => {
    const input = "<style>body { display: none; }</style><p>Text</p>";
    expect(sanitize(input)).toBe("<p>Text</p>");
  });

  it("iframe을 제거해야 함", () => {
    const input = '<iframe src="https://evil.com"></iframe><p>Text</p>';
    expect(sanitize(input)).toBe("<p>Text</p>");
  });

  it("data 속성을 제거해야 함", () => {
    const input = '<div data-evil="payload">Text</div>';
    const result = sanitize(input);
    expect(result).not.toContain("data-evil");
  });

  it("Mastodon 해시태그 링크를 유지해야 함", () => {
    const input = '<a href="https://mastodon.social/tags/test" class="hashtag">#test</a>';
    const result = sanitize(input);
    expect(result).toContain('class="hashtag"');
    expect(result).toContain('href="https://mastodon.social/tags/test"');
  });

  it("Mastodon 멘션 링크를 유지해야 함", () => {
    const input = '<a href="https://mastodon.social/@user" class="mention">@user</a>';
    const result = sanitize(input);
    expect(result).toContain('class="mention"');
  });

  it("이미지 태그를 유지해야 함", () => {
    const input = '<img src="https://example.com/image.png" alt="Image">';
    const result = sanitize(input);
    expect(result).toContain("<img");
    expect(result).toContain('src="https://example.com/image.png"');
    expect(result).toContain('alt="Image"');
  });
});

describe("DEFAULT_ALLOWED_TAGS", () => {
  it("필수 태그들이 포함되어 있어야 함", () => {
    expect(DEFAULT_ALLOWED_TAGS).toContain("p");
    expect(DEFAULT_ALLOWED_TAGS).toContain("a");
    expect(DEFAULT_ALLOWED_TAGS).toContain("img");
    expect(DEFAULT_ALLOWED_TAGS).toContain("br");
  });
});

describe("DEFAULT_ALLOWED_ATTRS", () => {
  it("필수 속성들이 포함되어 있어야 함", () => {
    expect(DEFAULT_ALLOWED_ATTRS).toContain("href");
    expect(DEFAULT_ALLOWED_ATTRS).toContain("src");
    expect(DEFAULT_ALLOWED_ATTRS).toContain("alt");
    expect(DEFAULT_ALLOWED_ATTRS).toContain("class");
  });
});
```

### 1.7 포맷터 테스트 (`src/domain/formatter.test.ts`)

```typescript
import { describe, it, expect } from "vitest";
import { formatThread, formatPost, formatThreadAsHtml } from "./formatter";
import type { Post, Thread } from "./types";

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

describe("formatPost", () => {
  it("기본 옵션으로 content 반환", () => {
    const post = createMockPost({ content: "<p>Hello</p>" });
    expect(formatPost(post)).toBe("<p>Hello</p>");
  });

  it("includeMetadata 옵션으로 메타데이터 포함", () => {
    const post = createMockPost({
      content: "<p>Hello</p>",
      publishedAt: "2024-01-01T12:00:00Z",
      url: "https://example.com/@alice/1",
    });
    const result = formatPost(post, { includeMetadata: true });
    expect(result).toContain("2024-01-01");
    expect(result).toContain("https://example.com/@alice/1");
  });
});

describe("formatThread", () => {
  it("단일 포스트 스레드 포맷팅", () => {
    const thread: Thread = [createMockPost({ content: "<p>Hello</p>" })];
    expect(formatThread(thread)).toBe("<p>Hello</p>");
  });

  it("여러 포스트를 구분자로 연결", () => {
    const thread: Thread = [
      createMockPost({ content: "<p>First</p>" }),
      createMockPost({ content: "<p>Second</p>" }),
    ];
    const result = formatThread(thread, { separator: "\n---\n" });
    expect(result).toBe("<p>First</p>\n---\n<p>Second</p>");
  });

  it("빈 스레드는 빈 문자열 반환", () => {
    expect(formatThread([])).toBe("");
  });
});

describe("formatThreadAsHtml", () => {
  it("각 포스트를 article 태그로 감싸야 함", () => {
    const thread: Thread = [
      createMockPost({ content: "<p>First</p>" }),
      createMockPost({ content: "<p>Second</p>" }),
    ];
    const result = formatThreadAsHtml(thread);
    expect(result).toContain("<article");
    expect(result).toContain("</article>");
  });
});
```

---

## Phase 1.5: 로깅 시스템 (LogTape)

### 로그 카테고리 정의 (`src/logging/categories.ts`)

LogTape의 계층적 카테고리 시스템을 활용하여 로그를 체계적으로 관리합니다.

```typescript
/**
 * 로그 카테고리 상수 정의
 * LogTape는 문자열 배열로 계층적 카테고리를 표현합니다.
 *
 * 카테고리 구조:
 * - ["thread-reader"]: 루트 카테고리
 * - ["thread-reader", "domain"]: 도메인 로직 관련
 * - ["thread-reader", "infra"]: 인프라/외부 연동 관련
 * - ["thread-reader", "web"]: 웹 서버/라우팅 관련
 */

/** 앱 루트 카테고리 */
export const ROOT_CATEGORY = ["thread-reader"] as const;

/**
 * 도메인 로직 카테고리
 * - thread: 스레드 수집 로직
 * - formatter: 출력 포맷팅
 * - sanitizer: HTML sanitize
 */
export const DOMAIN_CATEGORY = [...ROOT_CATEGORY, "domain"] as const;
export const DOMAIN_THREAD_CATEGORY = [...DOMAIN_CATEGORY, "thread"] as const;
export const DOMAIN_FORMATTER_CATEGORY = [...DOMAIN_CATEGORY, "formatter"] as const;
export const DOMAIN_SANITIZER_CATEGORY = [...DOMAIN_CATEGORY, "sanitizer"] as const;

/**
 * 인프라 카테고리
 * - activitypub: ActivityPub/Fedify 관련 요청
 * - http: 일반 HTTP 요청
 */
export const INFRA_CATEGORY = [...ROOT_CATEGORY, "infra"] as const;
export const INFRA_ACTIVITYPUB_CATEGORY = [...INFRA_CATEGORY, "activitypub"] as const;
export const INFRA_HTTP_CATEGORY = [...INFRA_CATEGORY, "http"] as const;

/**
 * 웹 서버 카테고리
 * - routes: 라우트 핸들러
 * - ssr: 서버 사이드 렌더링
 * - i18n: 다국어 처리
 */
export const WEB_CATEGORY = [...ROOT_CATEGORY, "web"] as const;
export const WEB_ROUTES_CATEGORY = [...WEB_CATEGORY, "routes"] as const;
export const WEB_SSR_CATEGORY = [...WEB_CATEGORY, "ssr"] as const;
export const WEB_I18N_CATEGORY = [...WEB_CATEGORY, "i18n"] as const;

/**
 * CLI 카테고리
 */
export const CLI_CATEGORY = [...ROOT_CATEGORY, "cli"] as const;
```

### 로그 카테고리 설명

| 카테고리                          | 용도          | 예시 로그                             |
| --------------------------------- | ------------- | ------------------------------------- |
| `thread-reader`                   | 앱 전체 루트  | 앱 시작/종료                          |
| `thread-reader.domain.thread`     | 스레드 수집   | "스레드 수집 시작", "self-reply 발견" |
| `thread-reader.domain.formatter`  | 포맷팅        | "스레드 포맷팅 완료"                  |
| `thread-reader.domain.sanitizer`  | HTML sanitize | "위험한 태그 제거됨"                  |
| `thread-reader.infra.activitypub` | AP 요청       | "객체 fetch", "replies 컬렉션 조회"   |
| `thread-reader.infra.http`        | HTTP 요청     | "요청 시작", "응답 수신"              |
| `thread-reader.web.routes`        | 라우트 처리   | "/read 요청 처리"                     |
| `thread-reader.web.ssr`           | SSR           | "서버 렌더링 시작"                    |
| `thread-reader.web.i18n`          | 다국어        | "로케일 변경: ko"                     |
| `thread-reader.cli`               | CLI           | "CLI 실행", "인자 파싱"               |

### 로깅 설정 (`src/logging/setup.ts`)

```typescript
import { configure, getConsoleSink, getLogger } from "@logtape/logtape";
import { ROOT_CATEGORY } from "./categories";

export interface LoggingConfig {
  /** 최소 로그 레벨 */
  level: "trace" | "debug" | "info" | "warning" | "error" | "fatal";
  /** 콘솔 출력 여부 */
  console: boolean;
  /** 개발 모드 (더 상세한 로그) */
  isDev: boolean;
}

const DEFAULT_CONFIG: LoggingConfig = {
  level: "info",
  console: true,
  isDev: process.env.NODE_ENV !== "production",
};

/**
 * LogTape 초기화
 * 앱 시작 시 한 번만 호출해야 함
 */
export async function setupLogging(config: Partial<LoggingConfig> = {}): Promise<void> {
  const { level, console: useConsole, isDev } = { ...DEFAULT_CONFIG, ...config };

  await configure({
    sinks: {
      console: getConsoleSink({
        formatter: isDev ? "pretty" : "json",
      }),
    },
    loggers: [
      {
        category: ROOT_CATEGORY,
        lowestLevel: isDev ? "debug" : level,
        sinks: useConsole ? ["console"] : [],
      },
    ],
  });
}

/**
 * 앱 종료 시 로깅 정리
 */
export async function teardownLogging(): Promise<void> {
  // LogTape 정리 로직 (필요시)
}
```

### 로거 export (`src/logging/index.ts`)

```typescript
import { getLogger } from "@logtape/logtape";
import {
  ROOT_CATEGORY,
  DOMAIN_THREAD_CATEGORY,
  DOMAIN_FORMATTER_CATEGORY,
  DOMAIN_SANITIZER_CATEGORY,
  INFRA_ACTIVITYPUB_CATEGORY,
  INFRA_HTTP_CATEGORY,
  WEB_ROUTES_CATEGORY,
  WEB_SSR_CATEGORY,
  WEB_I18N_CATEGORY,
  CLI_CATEGORY,
} from "./categories";

export { setupLogging, teardownLogging } from "./setup";
export * from "./categories";

// 미리 정의된 로거들
export const rootLogger = getLogger(ROOT_CATEGORY);
export const threadLogger = getLogger(DOMAIN_THREAD_CATEGORY);
export const formatterLogger = getLogger(DOMAIN_FORMATTER_CATEGORY);
export const sanitizerLogger = getLogger(DOMAIN_SANITIZER_CATEGORY);
export const activityPubLogger = getLogger(INFRA_ACTIVITYPUB_CATEGORY);
export const httpLogger = getLogger(INFRA_HTTP_CATEGORY);
export const routesLogger = getLogger(WEB_ROUTES_CATEGORY);
export const ssrLogger = getLogger(WEB_SSR_CATEGORY);
export const i18nLogger = getLogger(WEB_I18N_CATEGORY);
export const cliLogger = getLogger(CLI_CATEGORY);
```

### 사용 예시

```typescript
// src/domain/thread.ts
import { threadLogger } from "../logging";

export async function getPossibleThreads(
  startPostId: PostId,
  deps: ThreadCollectorDeps,
): Promise<Thread[]> {
  threadLogger.info`스레드 수집 시작: ${startPostId}`;

  const post = await deps.fetchPost(startPostId);
  if (!post) {
    threadLogger.warning`포스트를 찾을 수 없음: ${startPostId}`;
    return [];
  }

  threadLogger.debug`루트 포스트 로드됨: ${post.id}, 작성자: ${post.authorId}`;

  // ... 스레드 수집 로직

  threadLogger.info`스레드 수집 완료: ${threads.length}개 스레드 발견`;
  return threads;
}

// src/infra/activitypub.ts
import { activityPubLogger } from "../logging";

export const fetchPost: PostFetchFn = async (postId: PostId): Promise<Post | null> => {
  activityPubLogger.debug`ActivityPub 객체 fetch 시작: ${postId}`;

  try {
    const obj = await lookupObject(postId);
    activityPubLogger.debug`객체 fetch 성공: ${obj?.constructor.name}`;
    return toPost(obj);
  } catch (error) {
    activityPubLogger.error`객체 fetch 실패: ${postId}, 오류: ${error}`;
    return null;
  }
};
```

---

## Phase 1.6: 다국어 지원 (Lingui)

### Lingui 설정 (`lingui.config.ts`)

```typescript
import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  locales: ["en", "ko", "ja"],
  sourceLocale: "en",
  fallbackLocales: {
    default: "en",
  },
  catalogs: [
    {
      path: "<rootDir>/src/i18n/locales/{locale}/messages",
      include: ["src"],
      exclude: ["**/node_modules/**", "**/*.test.ts", "**/*.test.tsx"],
    },
  ],
  format: "po",
  compileNamespace: "ts",
};

export default config;
```

### i18n 설정 (`src/i18n/setup.ts`)

```typescript
import { i18n } from "@lingui/core";
import { i18nLogger } from "../logging";

// 지원하는 로케일 목록
export const SUPPORTED_LOCALES = ["en", "ko", "ja"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// 로케일 표시 이름
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
};

// 기본 로케일
export const DEFAULT_LOCALE: SupportedLocale = "en";

/**
 * 로케일에 해당하는 메시지 카탈로그를 동적으로 로드합니다.
 */
export async function loadCatalog(locale: SupportedLocale): Promise<void> {
  i18nLogger.debug`메시지 카탈로그 로드 시작: ${locale}`;

  try {
    const { messages } = await import(`./locales/${locale}/messages.ts`);
    i18n.load(locale, messages);
    i18nLogger.info`메시지 카탈로그 로드 완료: ${locale}`;
  } catch (error) {
    i18nLogger.error`메시지 카탈로그 로드 실패: ${locale}, ${error}`;
    throw error;
  }
}

/**
 * 로케일을 활성화합니다.
 */
export async function activateLocale(locale: SupportedLocale): Promise<void> {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    i18nLogger.warning`지원하지 않는 로케일: ${locale}, 기본값 사용: ${DEFAULT_LOCALE}`;
    locale = DEFAULT_LOCALE;
  }

  // 카탈로그가 로드되지 않았으면 로드
  if (!i18n.messages[locale]) {
    await loadCatalog(locale);
  }

  i18n.activate(locale);
  i18nLogger.info`로케일 활성화: ${locale}`;
}

/**
 * i18n 초기화 (앱 시작 시 호출)
 */
export async function setupI18n(initialLocale: SupportedLocale = DEFAULT_LOCALE): Promise<void> {
  await activateLocale(initialLocale);
}

/**
 * 브라우저 또는 요청에서 선호 로케일을 감지합니다.
 */
export function detectLocale(acceptLanguage?: string): SupportedLocale {
  if (!acceptLanguage) {
    if (typeof navigator !== "undefined") {
      acceptLanguage = navigator.language;
    }
  }

  if (acceptLanguage) {
    const preferred = acceptLanguage.split(",")[0].split("-")[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(preferred as SupportedLocale)) {
      return preferred as SupportedLocale;
    }
  }

  return DEFAULT_LOCALE;
}

export { i18n };
```

### i18n Provider 통합 (`src/i18n/index.ts`)

```typescript
export {
  i18n,
  setupI18n,
  activateLocale,
  loadCatalog,
  detectLocale,
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "./setup";
```

### 사용 예시 - 컴포넌트에서

```tsx
// src/components/LocaleSwitcher.tsx
import * as React from "react";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { SUPPORTED_LOCALES, LOCALE_NAMES, activateLocale, type SupportedLocale } from "../i18n";

export function LocaleSwitcher() {
  const { i18n } = useLingui();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as SupportedLocale;
    await activateLocale(newLocale);
  };

  return (
    <div className="locale-switcher">
      <label htmlFor="locale-select">
        <Trans>Language</Trans>
      </label>
      <select id="locale-select" value={i18n.locale} onChange={handleChange}>
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_NAMES[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}

// src/routes/index.tsx (홈페이지)
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react/macro";

function HomePage() {
  const { t } = useLingui();

  return (
    <main className="container">
      <header className="hero">
        <h1>
          <Trans>Thread Reader</Trans>
        </h1>
        <p className="subtitle">
          <Trans>Read Fediverse threads as a single article</Trans>
        </p>
      </header>

      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="url"
          placeholder={t`https://mastodon.social/@user/123456789`}
          // ...
        />
        <button type="submit">
          <Trans>Read</Trans>
        </button>
      </form>

      {error && (
        <p className="error-message">
          <Trans>Please enter a valid URL.</Trans>
        </p>
      )}
    </main>
  );
}
```

### 메시지 추출 및 번역 워크플로우

```bash
# 1. 소스에서 번역할 메시지 추출
yarn lingui extract

# 2. 번역 파일 편집 (src/i18n/locales/{locale}/messages.po)

# 3. 번역 파일 컴파일
yarn lingui compile
```

### 번역 파일 예시 (`src/i18n/locales/ko/messages.po`)

```po
msgid "Thread Reader"
msgstr "스레드 리더"

msgid "Read Fediverse threads as a single article"
msgstr "Fediverse의 스레드를 하나의 글처럼 읽으세요"

msgid "Read"
msgstr "읽기"

msgid "Please enter a valid URL."
msgstr "유효한 URL을 입력해주세요."

msgid "Language"
msgstr "언어"

msgid "Error"
msgstr "오류"

msgid "Post not found or inaccessible."
msgstr "포스트를 찾을 수 없거나 접근할 수 없습니다."

msgid "Back to home"
msgstr "처음으로 돌아가기"

msgid "View original"
msgstr "원본 보기"

msgid "Total {count} posts in this thread."
msgstr "총 {count}개의 포스트로 구성된 스레드입니다."
```

---

## Phase 2: 인프라 레이어 구현

### 2.1 ActivityPub 클라이언트 (`src/infra/activitypub.ts`)

```typescript
import { lookupObject } from "@fedify/fedify/x/lookup";
import {
  Note,
  Article,
  Object as APObject,
  Collection,
  OrderedCollection,
  CollectionPage,
  OrderedCollectionPage,
} from "@fedify/fedify/vocab";
import type { Post, PostId, PostFetchFn, RepliesFetchFn } from "../domain/types";

/**
 * ActivityPub Object를 도메인 Post로 변환합니다.
 */
export function toPost(obj: APObject): Post | null {
  if (!(obj instanceof Note) && !(obj instanceof Article)) {
    return null;
  }

  const id = obj.id?.href;
  if (!id) return null;

  // attributedTo는 URL이거나 Actor 객체일 수 있음
  const authorId = obj.attributedToId?.href;
  if (!authorId) return null;

  return {
    id,
    authorId,
    content: obj.content?.toString() ?? "",
    publishedAt: obj.published?.toString() ?? new Date().toISOString(),
    inReplyTo: obj.inReplyToId?.href ?? null,
    url: obj.url?.href ?? null,
  };
}

/**
 * ActivityPub 객체를 fetch합니다.
 */
export const fetchPost: PostFetchFn = async (postId: PostId): Promise<Post | null> => {
  try {
    const obj = await lookupObject(postId);
    if (!obj) return null;
    return toPost(obj);
  } catch (error) {
    console.error(`Failed to fetch post ${postId}:`, error);
    return null;
  }
};

/**
 * 포스트의 replies 컬렉션을 fetch합니다.
 */
export const fetchReplies: RepliesFetchFn = async (postId: PostId): Promise<Post[]> => {
  try {
    const obj = await lookupObject(postId);
    if (!obj || !(obj instanceof APObject)) return [];

    // replies 속성 접근 (비동기 dereference)
    const replies = await obj.getReplies();
    if (!replies) return [];

    const posts: Post[] = [];

    // Collection 또는 OrderedCollection 처리
    if (replies instanceof Collection || replies instanceof OrderedCollection) {
      // 첫 페이지 가져오기
      const firstPage = await replies.getFirst();
      if (firstPage) {
        await collectPostsFromPage(firstPage, posts);
      }

      // items가 직접 포함된 경우
      for await (const item of replies.getItems()) {
        const post = await processItem(item);
        if (post) posts.push(post);
      }
    }

    return posts;
  } catch (error) {
    console.error(`Failed to fetch replies for ${postId}:`, error);
    return [];
  }
};

/**
 * Collection Page에서 포스트들을 수집합니다.
 */
async function collectPostsFromPage(
  page: CollectionPage | OrderedCollectionPage,
  posts: Post[],
): Promise<void> {
  for await (const item of page.getItems()) {
    const post = await processItem(item);
    if (post) posts.push(post);
  }

  // 다음 페이지가 있으면 재귀 (제한적으로)
  const nextPage = await page.getNext();
  if (nextPage && posts.length < 100) {
    // 최대 100개 제한
    await collectPostsFromPage(nextPage, posts);
  }
}

/**
 * Collection item을 Post로 변환합니다.
 */
async function processItem(item: APObject | URL): Promise<Post | null> {
  if (item instanceof URL) {
    const fetched = await lookupObject(item.href);
    if (fetched && fetched instanceof APObject) {
      return toPost(fetched);
    }
    return null;
  }
  return toPost(item);
}

/**
 * URL이 유효한 ActivityPub 포스트 URL인지 확인합니다.
 */
export function isValidPostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
```

### 2.2 ActivityPub 클라이언트 테스트 (`src/infra/activitypub.test.ts`)

```typescript
import { describe, it, expect, vi } from "vitest";
import { toPost, isValidPostUrl } from "./activitypub";
import { Note, Article } from "@fedify/fedify/vocab";

describe("toPost", () => {
  it("Note를 Post로 변환해야 함", () => {
    const note = new Note({
      id: new URL("https://example.com/posts/1"),
      attributedTo: new URL("https://example.com/users/alice"),
      content: "<p>Hello World</p>",
      published: Temporal.Instant.from("2024-01-01T00:00:00Z"),
    });

    const post = toPost(note);

    expect(post).not.toBeNull();
    expect(post?.id).toBe("https://example.com/posts/1");
    expect(post?.authorId).toBe("https://example.com/users/alice");
    expect(post?.content).toBe("<p>Hello World</p>");
  });

  it("Article을 Post로 변환해야 함", () => {
    const article = new Article({
      id: new URL("https://example.com/articles/1"),
      attributedTo: new URL("https://example.com/users/alice"),
      content: "<p>Long article content</p>",
    });

    const post = toPost(article);

    expect(post).not.toBeNull();
    expect(post?.id).toBe("https://example.com/articles/1");
  });

  it("id가 없으면 null 반환", () => {
    const note = new Note({
      attributedTo: new URL("https://example.com/users/alice"),
      content: "<p>No ID</p>",
    });

    expect(toPost(note)).toBeNull();
  });
});

describe("isValidPostUrl", () => {
  it("HTTPS URL은 유효함", () => {
    expect(isValidPostUrl("https://mastodon.social/@user/123")).toBe(true);
  });

  it("HTTP URL은 유효함", () => {
    expect(isValidPostUrl("http://example.com/posts/1")).toBe(true);
  });

  it("잘못된 URL은 무효함", () => {
    expect(isValidPostUrl("not-a-url")).toBe(false);
    expect(isValidPostUrl("")).toBe(false);
  });
});
```

---

## Phase 3: CLI 구현

### 3.1 CLI 스크립트 (`src/cli/main.ts`)

```typescript
import { fetchPost, fetchReplies, isValidPostUrl } from "../infra/activitypub";
import { getLongestThread } from "../domain/thread";
import { formatThread } from "../domain/formatter";
import type { Thread } from "../domain/types";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npx ts-node src/cli/main.ts <post-url>");
    console.error("Example: npx ts-node src/cli/main.ts https://mastodon.social/@user/123456");
    process.exit(1);
  }

  const postUrl = args[0];

  // URL 검증
  if (!isValidPostUrl(postUrl)) {
    console.error(`Error: Invalid URL: ${postUrl}`);
    process.exit(1);
  }

  console.error(`Fetching thread starting from: ${postUrl}`);

  try {
    // 스레드 수집
    const thread = await getLongestThread(postUrl, {
      fetchPost,
      fetchReplies,
    });

    if (thread.length === 0) {
      console.error("Error: Could not fetch the post or it is not accessible.");
      process.exit(1);
    }

    console.error(`Found thread with ${thread.length} post(s)\n`);

    // 출력 (stdout으로 결과, stderr로 메타 정보)
    const output = formatThread(thread, {
      separator: "\n\n---\n\n",
      includeMetadata: true,
    });

    console.log(output);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
```

### 3.2 실행 스크립트 (`scripts/cli.ts`)

```bash
#!/usr/bin/env npx ts-node
// scripts/cli.ts
import '../src/cli/main';
```

### 3.3 package.json 스크립트 추가

```json
{
  "scripts": {
    "cli": "ts-node src/cli/main.ts",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start"
  }
}
```

---

## Phase 4: 프론트엔드 구현 (TanStack Start + React)

### 4.1 TanStack Start 설정

#### `app.config.ts`

```typescript
import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vite: {
    plugins: () => [tsConfigPaths()],
  },
});
```

#### `src/router.tsx`

```typescript
import { createRouter as createTanstackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  return createTanstackRouter({
    routeTree,
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
```

#### `src/client.tsx`

```typescript
/// <reference types="vinxi/types/client" />
import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/react-start/client';
import { createRouter } from './router';

const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);
```

#### `src/server.ts`

```typescript
/// <reference types="vinxi/types/server" />
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { getRouterManifest } from "@tanstack/react-start/router-manifest";
import { createRouter } from "./router";

export default createStartHandler({
  createRouter,
  getRouterManifest,
})(defaultStreamHandler);
```

### 4.2 App Providers (`src/context/AppProviders.tsx`)

```tsx
import * as React from "react";
import { I18nProvider } from "@lingui/react";
import { i18n } from "../i18n";
import { SanitizerProvider } from "./SanitizerContext";
import { createDOMPurifySanitizer } from "../infra/domPurifySanitizer";
import type { SanitizeHtmlFn } from "../domain/sanitizer";

interface AppProvidersProps {
  children: React.ReactNode;
  /** 커스텀 sanitizer (테스트용) */
  sanitizer?: SanitizeHtmlFn;
}

// 기본 sanitizer 인스턴스 (브라우저용)
const defaultSanitizer = createDOMPurifySanitizer();

/**
 * 앱 전체에 필요한 Provider들을 조합합니다.
 * - I18nProvider: 다국어 지원
 * - SanitizerProvider: HTML sanitizer 주입
 */
export function AppProviders({ children, sanitizer = defaultSanitizer }: AppProvidersProps) {
  return (
    <I18nProvider i18n={i18n}>
      <SanitizerProvider sanitizer={sanitizer}>{children}</SanitizerProvider>
    </I18nProvider>
  );
}
```

### 4.3 라우트 구현

#### `src/routes/__root.tsx`

```tsx
import * as React from "react";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@tanstack/react-router";
import { AppProviders } from "../context/AppProviders";
import { setupLogging } from "../logging";
import { setupI18n, detectLocale } from "../i18n";
import "../styles/typography.css";

// 앱 초기화 (서버/클라이언트 모두에서 실행)
let initialized = false;
async function initializeApp() {
  if (initialized) return;
  initialized = true;

  await setupLogging({ isDev: process.env.NODE_ENV !== "production" });
  const locale = detectLocale();
  await setupI18n(locale);
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    await initializeApp();
  },
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Thread Reader - ActivityPub Thread Viewer" },
      {
        name: "description",
        content: "Read Mastodon and Fediverse threads as a single, continuous article",
      },
    ],
    links: [{ rel: "icon", href: "/favicon.ico" }],
  }),
});

function RootComponent() {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProviders>
          <Outlet />
        </AppProviders>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

#### `src/routes/index.tsx`

```tsx
import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react/macro";
import { LocaleSwitcher } from "../components/LocaleSwitcher";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { t } = useLingui();
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError(t`Please enter a URL.`);
      return;
    }

    try {
      new URL(url);
      navigate({
        to: "/read",
        search: { url: url.trim() },
      });
    } catch {
      setError(t`Please enter a valid URL.`);
    }
  };

  return (
    <main className="container">
      <header className="hero">
        <LocaleSwitcher />
        <h1>
          <Trans>Thread Reader</Trans>
        </h1>
        <p className="subtitle">
          <Trans>Read Fediverse threads as a single article</Trans>
        </p>
      </header>

      <form onSubmit={handleSubmit} className="search-form">
        <label htmlFor="post-url" className="visually-hidden">
          <Trans>Post URL</Trans>
        </label>
        <input
          id="post-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t`https://mastodon.social/@user/123456789`}
          className="url-input"
          autoFocus
        />
        <button type="submit" className="submit-button">
          <Trans>Read</Trans>
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}

      <section className="instructions">
        <h2>
          <Trans>How to use</Trans>
        </h2>
        <ol>
          <li>
            <Trans>
              Copy the URL of the first post in a thread from Mastodon or other Fediverse services.
            </Trans>
          </li>
          <li>
            <Trans>Paste it in the input field above.</Trans>
          </li>
          <li>
            <Trans>Click "Read" to view the entire thread as a single article.</Trans>
          </li>
        </ol>
      </section>
    </main>
  );
}
```

#### `src/routes/read.tsx`

```tsx
import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trans, Plural } from "@lingui/react/macro";
import { fetchPost, fetchReplies, isValidPostUrl } from "../infra/activitypub";
import { getLongestThread } from "../domain/thread";
import { routesLogger } from "../logging";
import type { Thread } from "../domain/types";
import ThreadView from "../components/ThreadView";

interface ReadSearchParams {
  url: string;
}

export const Route = createFileRoute("/read")({
  validateSearch: (search: Record<string, unknown>): ReadSearchParams => {
    return {
      url: (search.url as string) || "",
    };
  },
  loaderDeps: ({ search: { url } }) => ({ url }),
  loader: async ({ deps: { url } }): Promise<{ thread: Thread; error: string | null }> => {
    routesLogger.info`/read 페이지 로드: ${url}`;

    if (!url || !isValidPostUrl(url)) {
      routesLogger.warning`유효하지 않은 URL: ${url}`;
      return { thread: [], error: "invalid_url" };
    }

    try {
      const thread = await getLongestThread(url, {
        fetchPost,
        fetchReplies,
      });

      if (thread.length === 0) {
        routesLogger.warning`스레드를 찾을 수 없음: ${url}`;
        return { thread: [], error: "not_found" };
      }

      routesLogger.info`스레드 로드 완료: ${thread.length}개 포스트`;
      return { thread, error: null };
    } catch (error) {
      routesLogger.error`스레드 로드 실패: ${error}`;
      return {
        thread: [],
        error: "unknown_error",
      };
    }
  },
  component: ReadPage,
});

function ReadPage() {
  const { url } = Route.useSearch();
  const { thread, error } = Route.useLoaderData();

  if (error) {
    return (
      <main className="container">
        <div className="error-container">
          <h1>
            <Trans>Error</Trans>
          </h1>
          <p>
            {error === "invalid_url" && <Trans>The URL is not valid.</Trans>}
            {error === "not_found" && <Trans>Post not found or inaccessible.</Trans>}
            {error === "unknown_error" && <Trans>An unknown error occurred.</Trans>}
          </p>
          <a href="/" className="back-link">
            ← <Trans>Back to home</Trans>
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="container article-container">
      <nav className="article-nav">
        <a href="/" className="back-link">
          ← <Trans>Read another thread</Trans>
        </a>
        <a href={url} target="_blank" rel="noopener noreferrer" className="original-link">
          <Trans>View original</Trans> ↗
        </a>
      </nav>

      <ThreadView thread={thread} />

      <footer className="article-footer">
        <p className="post-count">
          <Plural
            value={thread.length}
            one="This thread contains # post."
            other="This thread contains # posts."
          />
        </p>
      </footer>
    </main>
  );
}
```

### 4.3 컴포넌트

#### `src/components/ThreadView.tsx`

```tsx
import * as React from "react";
import type { Thread } from "../domain/types";
import PostContent from "./PostContent";

interface ThreadViewProps {
  thread: Thread;
}

export default function ThreadView({ thread }: ThreadViewProps) {
  if (thread.length === 0) {
    return <p>표시할 내용이 없습니다.</p>;
  }

  return (
    <article className="thread-article">
      {thread.map((post, index) => (
        <PostContent
          key={post.id}
          post={post}
          isFirst={index === 0}
          isLast={index === thread.length - 1}
        />
      ))}
    </article>
  );
}
```

#### `src/components/PostContent.tsx`

```tsx
import * as React from "react";
import type { Post } from "../domain/types";
import { useSanitizer } from "../context/SanitizerContext";
import { useLingui } from "@lingui/react";

interface PostContentProps {
  post: Post;
  isFirst: boolean;
  isLast: boolean;
}

export default function PostContent({ post, isFirst, isLast }: PostContentProps) {
  const { i18n } = useLingui();
  const sanitizeHtml = useSanitizer();

  const formattedDate = i18n.date(new Date(post.publishedAt), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Context에서 주입받은 sanitizer로 HTML sanitize
  const sanitizedContent = React.useMemo(
    () => sanitizeHtml(post.content),
    [sanitizeHtml, post.content],
  );

  return (
    <section
      className={`post-section ${isFirst ? "post-first" : ""} ${isLast ? "post-last" : ""}`}
      data-post-id={post.id}
    >
      <div className="post-content" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />

      <footer className="post-meta">
        <time dateTime={post.publishedAt}>{formattedDate}</time>
        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="post-link">
            원본
          </a>
        )}
      </footer>
    </section>
  );
}
```

### 4.4 스타일 (`src/styles/typography.css`)

```css
/* ==========================================================================
   CSS Variables
   ========================================================================== */

:root {
  /* Typography */
  --font-serif: "Noto Serif KR", "Georgia", "Times New Roman", serif;
  --font-sans: "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Font Sizes (modular scale ~1.25) */
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
  --leading-loose: 2;

  /* Colors */
  --color-text: #1a1a1a;
  --color-text-muted: #666;
  --color-text-light: #999;
  --color-background: #fafafa;
  --color-surface: #fff;
  --color-border: #e5e5e5;
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-error: #dc2626;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Layout */
  --max-width-prose: 65ch;
  --max-width-content: 42rem;
}

/* ==========================================================================
   Reset & Base
   ========================================================================== */

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
  background-color: var(--color-background);
}

/* ==========================================================================
   Layout
   ========================================================================== */

.container {
  max-width: var(--max-width-content);
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}

.article-container {
  background-color: var(--color-surface);
  min-height: 100vh;
  padding-top: var(--space-8);
  padding-bottom: var(--space-16);
}

/* ==========================================================================
   Hero Section (Home)
   ========================================================================== */

.hero {
  text-align: center;
  padding: var(--space-16) 0 var(--space-12);
}

.hero h1 {
  font-size: var(--text-3xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-4);
}

.subtitle {
  font-size: var(--text-xl);
  color: var(--color-text-muted);
}

/* ==========================================================================
   Search Form
   ========================================================================== */

.search-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 100%;
  margin-bottom: var(--space-8);
}

@media (min-width: 640px) {
  .search-form {
    flex-direction: row;
  }
}

.url-input {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  transition: border-color 0.15s ease;
}

.url-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.submit-button {
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: 600;
  color: white;
  background-color: var(--color-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.submit-button:hover {
  background-color: var(--color-primary-hover);
}

/* ==========================================================================
   Instructions
   ========================================================================== */

.instructions {
  padding: var(--space-6);
  background-color: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.instructions h2 {
  font-size: var(--text-xl);
  margin-bottom: var(--space-4);
}

.instructions ol {
  padding-left: var(--space-6);
}

.instructions li {
  margin-bottom: var(--space-2);
}

/* ==========================================================================
   Article Navigation
   ========================================================================== */

.article-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
}

.back-link,
.original-link {
  color: var(--color-primary);
  text-decoration: none;
}

.back-link:hover,
.original-link:hover {
  text-decoration: underline;
}

/* ==========================================================================
   Thread Article (Main Content)
   ========================================================================== */

.thread-article {
  font-family: var(--font-serif);
}

.post-section {
  margin-bottom: var(--space-8);
}

.post-section:not(.post-last) {
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

/* Post Content Typography */
.post-content {
  font-size: var(--text-lg);
  line-height: var(--leading-loose);
}

.post-content p {
  margin-bottom: var(--space-4);
  text-align: justify;
  word-break: keep-all;
}

.post-content p:last-child {
  margin-bottom: 0;
}

.post-content a {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.post-content a:hover {
  color: var(--color-primary-hover);
}

/* Embedded media */
.post-content img,
.post-content video {
  max-width: 100%;
  height: auto;
  margin: var(--space-4) 0;
  border-radius: 8px;
}

/* Hashtags and mentions */
.post-content .hashtag,
.post-content .mention {
  color: var(--color-primary);
  text-decoration: none;
}

/* ==========================================================================
   Post Meta
   ========================================================================== */

.post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text-light);
}

.post-link {
  color: var(--color-text-muted);
  text-decoration: none;
}

.post-link:hover {
  color: var(--color-primary);
}

/* ==========================================================================
   Article Footer
   ========================================================================== */

.article-footer {
  margin-top: var(--space-12);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.post-count {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* ==========================================================================
   Error States
   ========================================================================== */

.error-message {
  color: var(--color-error);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  margin-top: var(--space-2);
}

.error-container {
  text-align: center;
  padding: var(--space-16) 0;
}

.error-container h1 {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-4);
}

.error-container p {
  color: var(--color-text-muted);
  margin-bottom: var(--space-8);
}

/* ==========================================================================
   Utilities
   ========================================================================== */

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ==========================================================================
   Responsive
   ========================================================================== */

@media (max-width: 640px) {
  :root {
    --text-lg: 1rem;
    --text-xl: 1.125rem;
    --text-2xl: 1.25rem;
    --text-3xl: 1.5rem;
  }

  .container {
    padding: var(--space-4) var(--space-3);
  }

  .hero {
    padding: var(--space-8) 0 var(--space-6);
  }

  .post-content {
    text-align: left;
  }
}

/* ==========================================================================
   Print Styles
   ========================================================================== */

@media print {
  .article-nav,
  .back-link,
  .original-link,
  .post-link {
    display: none;
  }

  .post-section {
    page-break-inside: avoid;
  }

  body {
    font-size: 12pt;
    line-height: 1.5;
  }
}
```

---

## Phase 5: 패키지 및 설정 파일

### `package.json`

```json
{
  "name": "thread-reader",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "yarn@4.12.0",
  "scripts": {
    "dev": "vinxi dev",
    "build": "lingui compile && vinxi build",
    "start": "vinxi start",
    "cli": "tsx src/cli/main.ts",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/ && oxlint src/",
    "lint:fix": "eslint src/ --fix && oxlint src/ --fix",
    "format": "oxfmt --write src/",
    "format:check": "oxfmt --check src/",
    "i18n:extract": "lingui extract",
    "i18n:compile": "lingui compile"
  },
  "dependencies": {
    "@fedify/fedify": "^1.10.0",
    "@lingui/core": "^4.14.0",
    "@lingui/react": "^4.14.0",
    "@logtape/logtape": "^0.9.0",
    "@tanstack/react-router": "^1.95.0",
    "@tanstack/react-start": "^1.95.0",
    "dompurify": "^3.2.0",
    "isomorphic-dompurify": "^2.18.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "vinxi": "^0.5.0"
  },
  "devDependencies": {
    "@lingui/cli": "^4.14.0",
    "@lingui/macro": "^4.14.0",
    "@lingui/swc-plugin": "^4.0.0",
    "@lingui/vite-plugin": "^4.14.0",
    "@types/dompurify": "^3.0.5",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@vitejs/plugin-react-swc": "^3.7.0",
    "eslint": "^9.17.0",
    "@eslint/js": "^9.17.0",
    "typescript-eslint": "^8.18.0",
    "oxlint": "^0.15.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vite-tsconfig-paths": "^5.1.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0"
  }
}
```

### `.yarnrc.yml`

```yaml
nodeLinker: pnpm
```

### `lingui.config.ts`

```typescript
import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  locales: ["en", "ko", "ja"],
  sourceLocale: "en",
  fallbackLocales: {
    default: "en",
  },
  catalogs: [
    {
      path: "<rootDir>/src/i18n/locales/{locale}/messages",
      include: ["src"],
      exclude: ["**/node_modules/**", "**/*.test.ts", "**/*.test.tsx"],
    },
  ],
  format: "po",
  compileNamespace: "ts",
};

export default config;
```

### `eslint.config.js`

```javascript
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/", "node_modules/", ".vinxi/", ".output/"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
```

### `oxlint.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "eqeqeq": "error",
    "no-var": "error",
    "prefer-const": "error"
  },
  "ignorePatterns": ["dist/", "node_modules/", ".vinxi/", ".output/"]
}
```

### `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { lingui } from "@lingui/vite-plugin";

export default defineConfig({
  plugins: [
    react({
      plugins: [["@lingui/swc-plugin", {}]],
    }),
    lingui(),
    tsconfigPaths(),
  ],
  // Rolldown은 Vite 6+에서 실험적 지원
  // 안정화되면 아래 주석 해제
  // experimental: {
  //   rolldownDev: true,
  //   rolldownBuild: true,
  // },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"],
    },
  },
});
```

### `src/test/setup.ts`

```typescript
// Vitest 테스트 설정
import { afterEach } from "vitest";

// 각 테스트 후 정리 작업
afterEach(() => {
  // 필요한 정리 작업 추가
});
```

---

## 구현 순서 체크리스트

### Phase 1: 도메인 로직 (TDD)

- [ ] `src/domain/types.ts` - 타입 정의
- [ ] `src/domain/thread.test.ts` - 스레드 로직 테스트 작성 (실패하는 테스트)
- [ ] `src/domain/thread.ts` - 스레드 로직 구현 (테스트 통과)
- [ ] `src/domain/sanitizer.ts` - Sanitizer 인터페이스 및 기본 상수 정의
- [ ] `src/domain/sanitizer.test.ts` - Sanitizer 테스트 작성 (실패하는 테스트)
- [ ] `src/domain/formatter.test.ts` - 포맷터 테스트 작성 (실패하는 테스트)
- [ ] `src/domain/formatter.ts` - 포맷터 구현 (테스트 통과)

### Phase 1.5: 로깅 시스템

- [ ] `src/logging/categories.ts` - 로그 카테고리 정의
- [ ] `src/logging/setup.ts` - LogTape 설정
- [ ] `src/logging/index.ts` - 로거 export

### Phase 1.6: 다국어 지원

- [ ] `lingui.config.ts` - Lingui 설정
- [ ] `src/i18n/setup.ts` - i18n 초기화 로직
- [ ] `src/i18n/locales/en/messages.po` - 영어 번역
- [ ] `src/i18n/locales/ko/messages.po` - 한국어 번역

### Phase 2: 인프라 레이어

- [ ] `src/infra/activitypub.ts` - Fedify 기반 ActivityPub 클라이언트
- [ ] `src/infra/activitypub.test.ts` - 단위 테스트 (mock 사용)
- [ ] `src/infra/domPurifySanitizer.ts` - DOMPurify 기반 Sanitizer 구현

### Phase 3: Context & Providers

- [ ] `src/context/SanitizerContext.tsx` - Sanitizer 주입용 Context
- [ ] `src/context/AppProviders.tsx` - 앱 전체 Provider 조합

### Phase 4: CLI

- [ ] `src/cli/main.ts` - CLI 진입점
- [ ] 수동 테스트: 실제 Mastodon 스레드 URL로 테스트

### Phase 5: 프론트엔드

- [ ] TanStack Start 프로젝트 설정
- [ ] `src/routes/__root.tsx` - 루트 레이아웃 (I18nProvider, SanitizerProvider 포함)
- [ ] `src/routes/index.tsx` - 홈페이지
- [ ] `src/routes/read.tsx` - 스레드 읽기 페이지
- [ ] `src/components/ThreadView.tsx` - 스레드 뷰어
- [ ] `src/components/PostContent.tsx` - 포스트 콘텐츠 (useSanitizer 사용)
- [ ] `src/components/LocaleSwitcher.tsx` - 언어 전환 컴포넌트
- [ ] `src/styles/typography.css` - 타이포그래피 스타일

### Phase 6: 설정 및 마무리

- [ ] `.yarnrc.yml` - Yarn 설정 (nodeLinker: pnpm)
- [ ] `eslint.config.js` - ESLint 설정
- [ ] `oxlint.json` - oxlint 설정
- [ ] `yarn i18n:extract` - 번역 메시지 추출
- [ ] `yarn i18n:compile` - 번역 파일 컴파일
- [ ] 전체 통합 테스트
- [ ] README.md 작성
- [ ] 배포 설정 (선택사항)

---

## 주의사항 및 참고

### 보안 관련

1. **XSS 방지**: ActivityPub에서 가져온 HTML은 반드시 Context에서 주입받은 `sanitizeHtml`로 필터링해야 합니다. DOMPurify를 사용하여 안전한 태그와 속성만 허용합니다.

2. **허용 태그**: `p`, `br`, `a`, `strong`, `em`, `code`, `pre`, `blockquote`, `ul`, `ol`, `li`, `img` 등 콘텐츠 표시에 필요한 태그만 허용합니다.

3. **금지 요소**: `script`, `style`, `iframe`, `form`, `input` 태그와 `onerror`, `onclick` 등 이벤트 핸들러 속성은 반드시 제거합니다.

4. **서버/클라이언트 환경**: SSR에서는 `isomorphic-dompurify` 또는 JSDOM 기반 DOMPurify를 사용해야 합니다.

5. **의존성 주입**: Sanitizer는 Context를 통해 주입되므로 테스트 시 mock sanitizer로 쉽게 교체할 수 있습니다.

### 로깅 관련 (LogTape)

1. **계층적 카테고리**: LogTape는 `["app", "module", "submodule"]` 형태의 계층적 카테고리를 사용합니다. 상위 카테고리 로거 설정이 하위에 상속됩니다.

2. **로그 레벨**: `trace`, `debug`, `info`, `warning`, `error`, `fatal` 6단계를 지원합니다. 개발 환경에서는 `debug`, 프로덕션에서는 `info` 이상을 권장합니다.

3. **템플릿 리터럴**: LogTape는 템플릿 리터럴 문법을 지원합니다: `logger.info\`User ${userId} logged in\``

4. **라이브러리 친화적**: LogTape는 라이브러리에서 사용해도 애플리케이션 설정을 방해하지 않습니다. 설정이 없으면 로그가 출력되지 않습니다.

### 다국어 관련 (Lingui)

1. **메시지 추출**: `yarn i18n:extract` 명령으로 소스 코드에서 번역할 메시지를 추출합니다.

2. **매크로 사용**: `<Trans>` 컴포넌트와 `t` 매크로를 사용하여 JSX 및 문자열을 번역합니다.

3. **동적 로케일**: `activateLocale()` 함수로 런타임에 로케일을 변경할 수 있습니다.

4. **SSR 지원**: TanStack Start의 SSR에서도 Lingui가 정상 작동합니다. 요청 시점에 로케일을 감지하여 설정합니다.

5. **날짜/숫자 포맷**: `i18n.date()`, `i18n.number()` 메서드로 로케일에 맞는 포맷을 사용합니다.

### ActivityPub 관련

1. **Mastodon의 replies 컬렉션**: 첫 페이지에는 self-replies만 포함됩니다. 다른 서버 구현체는 다를 수 있으므로 항상 `attributedTo`를 확인해야 합니다.

2. **속도 제한**: ActivityPub 서버들은 요청 속도 제한이 있을 수 있습니다. 필요시 요청 간 딜레이를 추가하세요.

3. **Private/Followers-only 포스트**: `lookupObject`로 접근할 수 없을 수 있습니다. 에러 처리를 확실히 해주세요.

4. **인증된 Fetch**: 일부 서버(secure mode)는 서명된 요청만 허용합니다. Fedify의 authenticated fetch 옵션을 고려하세요.

### TDD 관련

1. 모든 도메인 로직은 **테스트 먼저** 작성합니다.
2. 외부 의존성(Fedify, Network, DOMPurify)은 **의존성 주입**으로 분리하여 테스트 가능하게 합니다.
3. 인프라 레이어 테스트는 **mock**을 사용하되, 통합 테스트도 별도로 진행합니다.
4. Sanitizer 테스트는 다양한 XSS 공격 벡터를 커버해야 합니다.
5. Context 테스트 시 `SanitizerProvider`로 mock sanitizer를 주입합니다.

### 개발 도구 관련

1. **Yarn + pnpm nodeLinker**: `yarn install` 후 `.pnp.cjs` 대신 `node_modules`가 pnpm 방식으로 생성됩니다. `.yarnrc.yml`에 `yarnPath`는 지정하지 않습니다.
2. **ESLint + oxlint 병행**: ESLint는 TypeScript 규칙, oxlint는 빠른 기본 린팅을 담당합니다.
3. **Vite + Rolldown**: Vite 6+에서 실험적으로 Rolldown 번들러를 사용할 수 있습니다. 안정화 전까지는 기본 esbuild/rollup을 사용합니다.
4. **Lingui + SWC**: `@vitejs/plugin-react-swc`와 `@lingui/swc-plugin`을 함께 사용합니다.

### 프론트엔드 관련

1. CSS만으로 스타일링 (외부 라이브러리 없음)
2. 한글 타이포그래피에 신경 쓰기 (word-break, text-align 등)
3. 접근성 고려 (semantic HTML, ARIA)
4. 모바일 반응형 디자인
5. 다국어 UI 지원 (영어, 한국어, 일본어)

---

## 테스트용 샘플 URL

개발 및 테스트 시 사용할 수 있는 샘플 스레드 URL들:

```
# Mastodon 공식 계정 예시 (실제 스레드 URL로 교체 필요)
https://mastodon.social/@Mastodon/[post-id]

# 한글 스레드 테스트용 (실제 URL로 교체)
https://mastodon.social/@[username]/[post-id]
```

> **참고**: 실제 테스트 시에는 public 포스트의 URL을 사용하세요.
