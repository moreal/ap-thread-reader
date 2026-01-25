import type { Messages } from "@lingui/core";

export const messages: Messages = {
  // Home page
  "Thread Reader": "스레드 리더",
  "Read Fediverse threads as a single article":
    "페디버스 스레드를 하나의 글처럼 읽기",
  "Enter a Mastodon or Fediverse post URL":
    "Mastodon 또는 Fediverse 포스트 URL을 입력하세요",
  "Read Thread": "스레드 읽기",
  "Please enter a URL": "URL을 입력해주세요",
  "Please enter a valid HTTP or HTTPS URL":
    "올바른 HTTP 또는 HTTPS URL을 입력해주세요",

  // Instructions
  "How to use": "사용 방법",
  "Find a thread on Mastodon or any Fediverse platform":
    "Mastodon 또는 Fediverse 플랫폼에서 스레드를 찾으세요",
  "Copy the URL of the first post in the thread":
    "스레드의 첫 번째 포스트 URL을 복사하세요",
  'Paste it above and click "Read Thread"':
    '위에 붙여넣고 "스레드 읽기"를 클릭하세요',

  // Thread page
  "Loading thread...": "스레드를 불러오는 중...",
  "No posts found in thread": "스레드에서 포스트를 찾을 수 없습니다",
  "Failed to fetch thread": "스레드를 가져오지 못했습니다",
  "View original": "원본 보기",
  "← Back": "← 뒤로",
  "Try another URL": "다른 URL 시도",
  "{count} posts in this thread": "이 스레드에 {count}개의 포스트",

  // Errors
  "No URL provided": "URL이 제공되지 않았습니다",
  "Invalid URL": "잘못된 URL입니다",
};
