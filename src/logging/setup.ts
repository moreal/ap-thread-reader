import { configure, getConsoleSink, reset } from "@logtape/logtape";
import { parseCategory, ROOT_CATEGORY } from "./categories";

let isConfigured = false;

/**
 * 로깅 시스템을 초기화합니다.
 * 애플리케이션 시작 시 한 번만 호출해야 합니다.
 */
export async function setupLogging(options?: {
  /** 최소 로그 레벨 */
  level?: "debug" | "info" | "warning" | "error";
  /** 콘솔 출력 비활성화 여부 */
  silent?: boolean;
}): Promise<void> {
  if (isConfigured) {
    return;
  }

  const { level = "info", silent = false } = options ?? {};

  await configure({
    sinks: {
      console: getConsoleSink(),
    },
    filters: {},
    loggers: [
      {
        category: parseCategory(ROOT_CATEGORY),
        sinks: silent ? [] : ["console"],
        lowestLevel: level,
      },
      // Suppress meta logger warning
      {
        category: ["logtape", "meta"],
        sinks: [],
        lowestLevel: "warning",
      },
    ],
  });

  isConfigured = true;
}

/**
 * 로깅 시스템을 정리합니다.
 * 테스트 등에서 리셋이 필요할 때 사용합니다.
 */
export async function teardownLogging(): Promise<void> {
  await reset();
  isConfigured = false;
}
