import type { Messages } from "@lingui/core";

export const messages: Messages = {
  // Home page
  "Thread Reader": "スレッドリーダー",
  "Read Fediverse threads as a single article":
    "Fediverseのスレッドを一つの記事として読む",
  "Enter a Mastodon or Fediverse post URL":
    "MastodonまたはFediverseの投稿URLを入力",
  "Read Thread": "スレッドを読む",
  "Please enter a URL": "URLを入力してください",
  "Please enter a valid HTTP or HTTPS URL":
    "有効なHTTPまたはHTTPS URLを入力してください",

  // Instructions
  "How to use": "使い方",
  "Find a thread on Mastodon or any Fediverse platform":
    "MastodonまたはFediverseでスレッドを見つける",
  "Copy the URL of the first post in the thread":
    "スレッドの最初の投稿のURLをコピー",
  'Paste it above and click "Read Thread"':
    '上に貼り付けて「スレッドを読む」をクリック',

  // Thread page
  "Loading thread...": "スレッドを読み込み中...",
  "No posts found in thread": "スレッドに投稿がありません",
  "Failed to fetch thread": "スレッドの取得に失敗しました",
  "View original": "元の投稿を見る",
  "← Back": "← 戻る",
  "Try another URL": "別のURLを試す",
  "{count} posts in this thread": "このスレッドには{count}件の投稿",

  // Errors
  "No URL provided": "URLが指定されていません",
  "Invalid URL": "無効なURLです",
};
