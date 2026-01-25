import { createFileRoute, Link } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react";
import { ThreadView } from "@/components/ThreadView";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { fetchThreadData, type ThreadResult } from "@/lib/api.functions";

interface ReadSearchParams {
  url: string;
}

export const Route = createFileRoute("/read")({
  validateSearch: (search: Record<string, unknown>): ReadSearchParams => ({
    url: (search.url as string) || "",
  }),
  loaderDeps: ({ search }) => ({ url: search.url }),
  loader: async ({ deps }): Promise<ThreadResult> => {
    if (!deps.url) {
      return { thread: null, error: "No URL provided" };
    }
    return fetchThreadData({ data: deps.url });
  },
  pendingComponent: LoadingPage,
  component: ReadPage,
});

function LoadingPage() {
  return (
    <div className="container">
      <header className="header">
        <nav className="nav">
          <Link to="/" className="back-link">
            <Trans id="← Back" message="← Back" />
          </Link>
          <LocaleSwitcher />
        </nav>
        <h1>
          <Trans id="Thread Reader" message="Thread Reader" />
        </h1>
      </header>
      <main className="thread-content">
        <div className="thread-loading">
          <p>
            <Trans id="Loading thread..." message="Loading thread..." />
          </p>
        </div>
      </main>
    </div>
  );
}

function ReadPage() {
  const { thread, error } = Route.useLoaderData();
  const { _: t } = useLingui();

  return (
    <div className="container">
      <header className="header">
        <nav className="nav">
          <Link to="/" className="back-link">
            <Trans id="← Back" message="← Back" />
          </Link>
          <LocaleSwitcher />
        </nav>
        <h1>
          <Trans id="Thread Reader" message="Thread Reader" />
        </h1>
      </header>

      <main className="thread-content">
        {error && (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <Link to="/" className="retry-link">
              <Trans id="Try another URL" message="Try another URL" />
            </Link>
          </div>
        )}

        {thread && thread.length > 0 && (
          <>
            <div className="thread-meta">
              <p>
                {t({ id: "{count} posts in this thread", message: "{count} posts in this thread" }, { count: thread.length })}
              </p>
              {thread[0].url && (
                <a
                  href={thread[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="original-link"
                >
                  <Trans id="View original" message="View original" />
                </a>
              )}
            </div>
            <ThreadView thread={thread} />
          </>
        )}

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
