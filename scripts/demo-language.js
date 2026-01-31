#!/usr/bin/env node
/**
 * Demonstration script for language parameter support
 * This shows how the language extraction works with mock ActivityPub data
 */

import { Note, LanguageString } from "@fedify/fedify";

console.log("=== Language Parameter Support Demo ===\n");

// Create a mock Note with multilingual content
const multilingualNote = new Note({
  id: new URL("https://example.com/note/1"),
  contents: [
    new LanguageString("Hello, world! This is an English post.", "en"),
    new LanguageString("こんにちは、世界！これは日本語の投稿です。", "ja"),
    new LanguageString("안녕하세요, 세계! 이것은 한국어 게시물입니다.", "ko"),
  ],
  summaries: [
    new LanguageString("English summary", "en"),
    new LanguageString("日本語の要約", "ja"),
    new LanguageString("한국어 요약", "ko"),
  ],
});

console.log("Created a multilingual ActivityPub Note with:");
console.log("- Content in: en, ja, ko");
console.log("- Summary in: en, ja, ko\n");

// Show how content is accessed
console.log("Default content (first in array):");
console.log("  →", multilingualNote.content.toString());
console.log("  Language:", multilingualNote.content.language.compact(), "\n");

console.log("All contents:");
for (const content of multilingualNote.contents) {
  console.log(`  [${content.language.compact()}]`, content.toString());
}

console.log("\nLanguage-specific extraction:");
const languages = ["en", "ja", "ko", "fr"];
for (const lang of languages) {
  const content = multilingualNote.contents.find(
    (c) => c.language.compact() === lang,
  );
  if (content) {
    console.log(`  [${lang}] ✓ ${content.toString().substring(0, 50)}...`);
  } else {
    console.log(`  [${lang}] ✗ Not available (would fall back to: ${multilingualNote.content.toString().substring(0, 30)}...)`);
  }
}

console.log("\n=== How to Use ===");
console.log("Web: /read?url=<post-url>&language=ja");
console.log("CLI: yarn cli -l ja <post-url>");
console.log("\nSee LANGUAGE_PARAMETER.md for full documentation.");
