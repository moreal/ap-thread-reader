# Language Parameter Support

This document describes the language parameter support added to ap-thread-reader.

## Overview

ActivityPub `Note` and `Article` objects can provide content in multiple languages through `contents` and `summaries` properties. Each entry in these arrays is a `LanguageString` with an associated language tag.

The `language` parameter allows users to request content in a specific language when available.

## Usage

### Web Interface

Add a `language` query parameter to the `/read` route:

```
/read?url=<post-url>&language=ja
/read?url=<post-url>&language=ko
/read?url=<post-url>&language=en
```

Example:
```
/read?url=https://mastodon.example/@user/123456789&language=ja
```

### CLI

Use the `-l` or `--language` option:

```bash
yarn cli -l ja https://mastodon.example/@user/123456789
yarn cli --language ko https://mastodon.example/@user/123456789
```

## Behavior

1. **Language Specified**: When a language parameter is provided (e.g., `ja`), the system will:
   - Search for content/summary in the specified language
   - If found, use that language-specific content
   - If not found, fall back to the first available language

2. **No Language Specified**: When no language parameter is provided:
   - Use the first available content/summary from the array
   - This is typically the default language set by the post author

3. **Single Language Posts**: For posts that only have content in a single language:
   - The language parameter is ignored
   - The available content is returned

## Implementation Details

The language parameter flows through the entire application stack:

1. **Route** (`/read`): Accepts `language` as a query parameter
2. **API Function** (`fetchThreadData`): Passes language to the use case
3. **Use Case** (`readThread`): Passes language to the repository
4. **Repository** (`ActivityPubPostRepository`): Extracts language-specific content from ActivityPub objects
5. **Domain Service** (`getLongestThread`): Propagates language through the thread collection

## Examples

### Post with Multiple Languages

If a post has content in English, Japanese, and Korean:

```typescript
{
  contents: [
    new LanguageString("Hello, world!", "en"),
    new LanguageString("こんにちは、世界！", "ja"),
    new LanguageString("안녕하세요, 세계!", "ko")
  ]
}
```

- Request with `?language=ja` → Returns "こんにちは、世界！"
- Request with `?language=ko` → Returns "안녕하세요, 세계!"
- Request with no language → Returns "Hello, world!" (first in array)
- Request with `?language=fr` → Returns "Hello, world!" (fallback to first)

## Testing

Tests are located in `src/infra/ActivityPubPostRepository.test.ts` and cover:

- Extracting content by specified language
- Falling back to first language when specified language is not available
- Handling posts without language information
- Extracting summaries by language
