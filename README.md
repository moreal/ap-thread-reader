# ap-thread-reader

A web service that collects self-reply threads from Fediverse platforms (such as Mastodon) and renders them as a single continuous article.

Many Fediverse platforms impose character limits per post, leading users to write long-form content as chains of self-replies. ap-thread-reader fetches these threads via the ActivityPub protocol and presents them in a readable, unified view.

## Features

- Enter an ActivityPub post URL to collect and display a self-reply thread as one article
- Works with any ActivityPub-compliant server, not limited to Mastodon
- Supports both Note (short posts) and Article (long-form) types
- Automatically selects the longest thread when replies branch
- Multi-language support (English, Korean, Japanese)
- Available as both a web service and a CLI tool

## Tech Stack

| Category           | Technology                    |
| ------------------ | ----------------------------- |
| Language           | TypeScript                    |
| Runtime            | Node.js 24                    |
| ActivityPub Client | [Fedify](https://fedify.dev/) |
| Frontend           | React 19                      |
| Meta Framework     | TanStack Start                |
| Bundler            | Vite 7 (with Rolldown)        |
| Testing            | Vitest                        |
| Package Manager    | Yarn 4                        |
| i18n               | Lingui                        |
| Deployment         | Fly.io                        |

## Getting Started

### Prerequisites

- Node.js 24+
- Corepack enabled (`corepack enable`)

### Installation

```bash
yarn install
```

### Development

```bash
yarn dev
```

Open `http://localhost:3000` in your browser.

### Build

```bash
yarn build
```

### CLI

```bash
yarn cli https://mastodon.social/@user/123456789
yarn cli -v https://mastodon.social/@user/123456789
```

## Project Structure

```
src/
├── domain/          # Domain models and business logic
│   ├── models/      # Thread, Post, Author
│   ├── values/      # PostId, AuthorId (branded types)
│   ├── ports/       # PostRepository interface
│   └── services/    # ThreadCollector
├── application/     # Use cases (ReadThread)
├── infra/           # ActivityPub-based PostRepository implementation
├── presentation/
│   ├── web/         # React components, context, hooks
│   └── cli/         # CLI entry point
├── routes/          # TanStack Router file-based routing
├── i18n/            # Locale setup and translation catalogs
└── logging/         # LogTape logging configuration
```

## License

[AGPL-3.0](LICENSE)
