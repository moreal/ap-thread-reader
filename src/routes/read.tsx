import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { Trans } from "@lingui/react";
import { useEffect, useState } from "react";
import { ThreadView } from "@/components/ThreadView";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { fetchThreadData, type ThreadResult } from "@/lib/api.functions";

interface ReadSearchParams {
  url: string;
  ssr?: boolean;
}

interface LoaderResult extends ThreadResult {
  /** When true, data should be fetched on the client */
  pending?: boolean;
  url: string;
}

export const Route = createFileRoute("/read")({
  validateSearch: (search: Record<string, unknown>): ReadSearchParams => ({
    url: (search.url as string) || "",
    ssr: search.ssr === "true" || search.ssr === true,
  }),
  loaderDeps: ({ search }) => ({ url: search.url, ssr: search.ssr }),
  loader: async ({ deps }): Promise<LoaderResult> => {
    if (!deps.url) {
      return { thread: null, error: "No URL provided", url: deps.url };
    }

    // Only fetch on server when ssr=true
    if (deps.ssr) {
      const result = await fetchThreadData({ data: deps.url });
      return { ...result, url: deps.url };
    }

    // Otherwise, return pending state for client-side fetch
    return { thread: null, error: null, pending: true, url: deps.url };
  },
  head: ({ loaderData }) => {
    // Use summary from the first post in the thread if available
    if (loaderData?.thread && loaderData.thread.length > 0) {
      const firstPost = loaderData.thread[0];
      if (firstPost.summary) {
        return {
          meta: [
            {
              name: "description",
              content: firstPost.summary,
            },
          ],
        };
      }
    }
    // Return empty object if no summary is available (falls back to root meta tags)
    return {};
  },
  pendingComponent: LoadingPage,
  component: ReadPage,
});

function LoadingPage() {
  const location = useLocation();
  const fromIndex = (location.state as { fromIndex?: boolean })?.fromIndex;

  return (
    <div className="container">
      <header className="header header--compact">
        {fromIndex && (
          <Link to="/" className="back-link">
            <Trans id="← Back" message="← Back" />
          </Link>
        )}
        <Link to="/" className="header__title-link">
          <h1 className="header__title">
            <Trans id="Thread Reader" message="Thread Reader" />
          </h1>
        </Link>
        <LocaleSwitcher />
      </header>
      <main id="main-content" className="thread-content">
        <div className="thread-loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true" />
          <p>
            <Trans id="Loading thread..." message="Loading thread..." />
          </p>
        </div>
      </main>
    </div>
  );
}

function ReadPage() {
  const loaderData = Route.useLoaderData();
  const location = useLocation();
  const fromIndex = (location.state as { fromIndex?: boolean })?.fromIndex;
  const [data, setData] = useState<ThreadResult>({
    thread: loaderData.thread,
    error: loaderData.error,
  });
  const [loading, setLoading] = useState(loaderData.pending ?? false);

  useEffect(() => {
    if (loaderData.pending && loaderData.url) {
      setLoading(true);
      fetchThreadData({ data: loaderData.url })
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [loaderData.pending, loaderData.url]);

  // Sync with loader data when it changes (e.g., ssr=true case)
  useEffect(() => {
    if (!loaderData.pending) {
      setData({ thread: loaderData.thread, error: loaderData.error });
      setLoading(false);
    }
  }, [loaderData.pending, loaderData.thread, loaderData.error]);

  if (loading) {
    return <LoadingPage />;
  }

  const { thread, error } = data;

  return (
    <div className="container">
      <header className="header header--compact">
        {fromIndex && (
          <Link to="/" className="back-link">
            <Trans id="← Back" message="← Back" />
          </Link>
        )}
        <Link to="/" className="header__title-link">
          <h1 className="header__title">
            <Trans id="Thread Reader" message="Thread Reader" />
          </h1>
        </Link>
        <LocaleSwitcher />
      </header>

      <main id="main-content" className="thread-content">
        {error && (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <Link to="/" className="retry-link">
              <Trans id="Try another URL" message="Try another URL" />
            </Link>
          </div>
        )}

        {thread && thread.length > 0 && <ThreadView thread={thread} />}

        {thread && thread.length === 0 && !error && (
          <div className="thread-empty">
            <p>
              <Trans id="No posts found in thread" message="No posts found in thread" />
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
