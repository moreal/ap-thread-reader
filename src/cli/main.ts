import { getLongestThread } from "@/domain/thread";
import { formatThread } from "@/domain/formatter";
import { fetchPost, fetchReplies, isValidPostUrl } from "@/infra/activitypub";
import { setupLogging, cliLogger } from "@/logging";

export interface CliOptions {
  /** 메타데이터 출력 여부 */
  verbose?: boolean;
  /** 구분자 */
  separator?: string;
}

/**
 * CLI 메인 함수
 */
export async function main(args: string[], options: CliOptions = {}): Promise<number> {
  await setupLogging({ level: options.verbose ? "debug" : "info" });

  const url = args[0];

  if (!url) {
    console.error("Usage: yarn cli <url>");
    console.error("Example: yarn cli https://mastodon.social/@user/12345");
    return 1;
  }

  if (!isValidPostUrl(url)) {
    console.error(`Error: Invalid URL - ${url}`);
    console.error("Please provide a valid HTTP or HTTPS URL.");
    return 1;
  }

  cliLogger.debug`Fetching thread from: ${url}`;

  try {
    const thread = await getLongestThread(url, {
      fetchPost,
      fetchReplies,
    });

    if (thread.length === 0) {
      console.error("No posts found in thread.");
      return 1;
    }

    // 메타데이터는 stderr로 출력
    if (options.verbose) {
      console.error(`Found ${thread.length} post(s) in thread`);
      console.error(`Author: ${thread[0].authorId}`);
      console.error(`First post: ${thread[0].publishedAt}`);
      console.error(`Last post: ${thread[thread.length - 1].publishedAt}`);
      console.error("---");
    }

    // 본문은 stdout으로 출력
    const formatted = formatThread(thread, {
      separator: options.separator ?? "\n\n---\n\n",
      includeMetadata: options.verbose,
    });

    console.log(formatted);
    return 0;
  } catch (error) {
    cliLogger.error`Failed to fetch thread: ${error}`;
    console.error(`Error: Failed to fetch thread`);
    if (error instanceof Error) {
      console.error(error.message);
    }
    return 1;
  }
}

/**
 * CLI 인자 파싱
 */
export function parseArgs(args: string[]): {
  urls: string[];
  options: CliOptions;
} {
  const options: CliOptions = {};
  const urls: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-v" || arg === "--verbose") {
      options.verbose = true;
    } else if (arg === "-s" || arg === "--separator") {
      options.separator = args[++i];
    } else if (!arg.startsWith("-")) {
      urls.push(arg);
    }
  }

  return { urls, options };
}
