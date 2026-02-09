import { createServerFn } from "@tanstack/react-start";
import { readThread, type ReadThreadResult } from "@/application/ReadThread";
import { ActivityPubPostRepository } from "@/infra/ActivityPubPostRepository";

export type { ReadThreadResult };

interface FetchThreadInput {
  url: string;
  language?: string;
}

export const fetchThreadData = createServerFn({ method: "GET" })
  .inputValidator((input: FetchThreadInput) => input)
  .handler(({ data }): Promise<ReadThreadResult> => {
    const repository = new ActivityPubPostRepository();
    return readThread(data.url, repository, data.language);
  });
