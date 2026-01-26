import { getLongestThread } from "@/domain/thread";
import { formatThread } from "@/domain/formatter";
import { fetchPost, fetchReplies } from "@/infra/activitypub";
import { setupLogging, cliLogger } from "@/logging";
import { createPostIdFromString } from "@/domain/types";
import { object, option, optional, argument } from "@optique/core/parser";
import { string, url } from "@optique/core/valueparser";
import { run } from "@optique/run";

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
    cliLogger.error("Usage: yarn cli <url>");
    cliLogger.error("Example: yarn cli https://mastodon.social/@user/12345");
    return 1;
  }

  cliLogger.debug(`Fetching thread from: {url}`, { url });

  try {
    const thread = await getLongestThread(createPostIdFromString(url), {
      fetchPost,
      fetchReplies,
    });

    if (thread.length === 0) {
      cliLogger.error("No posts found in thread.");
      return 1;
    }

    // 메타데이터는 stderr로 출력
    if (options.verbose) {
      cliLogger.error(`Found ${thread.length} post(s) in thread`);
      cliLogger.error(`Author: ${thread[0].authorId}`);
      cliLogger.error(`First post: ${thread[0].publishedAt}`);
      cliLogger.error(`Last post: ${thread[thread.length - 1].publishedAt}`);
      cliLogger.error("---");
    }

    // 본문은 stdout으로 출력
    const formatted = formatThread(thread, {
      separator: options.separator ?? "\n\n---\n\n",
      includeMetadata: options.verbose,
    });

    console.log(formatted);
    return 0;
  } catch (error) {
    cliLogger.error(`Failed to fetch thread: {error}`, { error });
    cliLogger.error(`Error: Failed to fetch thread`);
    if (error instanceof Error) {
      cliLogger.error(error.message);
    }
    return 1;
  }
}

/**
 * Optique CLI 파서
 */
const parser = object({
  verbose: option("-v", "--verbose"),
  separator: optional(option("-s", "--separator", string())),
  url: argument(url()),
});

/**
 * CLI 파싱 및 실행
 */
export function runCli() {
  return run(parser, {
    help: "both",
    programName: "ap-thread-reader",
    brief: [{ type: "text", text: "ActivityPub 스레드 리더" }],
  });
}
