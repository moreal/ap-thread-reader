import { getLogger } from "@logtape/logtape";
import {
  ROOT_CATEGORY,
  DOMAIN_THREAD_CATEGORY,
  DOMAIN_FORMATTER_CATEGORY,
  INFRA_ACTIVITYPUB_CATEGORY,
  INFRA_SANITIZER_CATEGORY,
  WEB_ROUTES_CATEGORY,
  WEB_COMPONENTS_CATEGORY,
  CLI_CATEGORY,
  parseCategory,
} from "./categories";

export * from "./categories";
export * from "./setup";

/** 루트 로거 */
export const rootLogger = getLogger(parseCategory(ROOT_CATEGORY));

/** 도메인 로거 */
export const threadLogger = getLogger(parseCategory(DOMAIN_THREAD_CATEGORY));
export const formatterLogger = getLogger(parseCategory(DOMAIN_FORMATTER_CATEGORY));

/** 인프라 로거 */
export const activitypubLogger = getLogger(parseCategory(INFRA_ACTIVITYPUB_CATEGORY));
export const sanitizerLogger = getLogger(parseCategory(INFRA_SANITIZER_CATEGORY));

/** 웹 로거 */
export const routesLogger = getLogger(parseCategory(WEB_ROUTES_CATEGORY));
export const componentsLogger = getLogger(parseCategory(WEB_COMPONENTS_CATEGORY));

/** CLI 로거 */
export const cliLogger = getLogger(parseCategory(CLI_CATEGORY));
