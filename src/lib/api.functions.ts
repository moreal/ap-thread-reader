import { createServerFn } from "@tanstack/react-start";
import { readThread, type ReadThreadResult } from "@/application/ReadThread";
import { ActivityPubPostRepository } from "@/infra/ActivityPubPostRepository";

const repository = new ActivityPubPostRepository();

export type { ReadThreadResult };

export const fetchThreadData = createServerFn({ method: "GET" })
  .inputValidator((url: string) => url)
  .handler(({ data: url }): Promise<ReadThreadResult> => readThread(url, repository));
