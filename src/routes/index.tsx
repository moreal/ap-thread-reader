import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Trans, useLingui } from "@lingui/react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { _: t } = useLingui();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError(t({ id: "Please enter a URL", message: "Please enter a URL" }));
      return;
    }

    if (!isValidUrl(url)) {
      setError(t({ id: "Please enter a valid HTTP or HTTPS URL", message: "Please enter a valid HTTP or HTTPS URL" }));
      return;
    }

    navigate({
      to: "/read",
      search: { url },
    });
  };

  return (
    <div className="container">
      <header className="header">
        <h1>
          <Trans id="Thread Reader" message="Thread Reader" />
        </h1>
        <p className="subtitle">
          <Trans id="Read Fediverse threads as a single article" message="Read Fediverse threads as a single article" />
        </p>
        <LocaleSwitcher />
      </header>

      <main className="home-content">
        <form onSubmit={handleSubmit} className="url-form">
          <div className="input-group">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t({ id: "Enter a Mastodon or Fediverse post URL", message: "Enter a Mastodon or Fediverse post URL" })}
              className="url-input"
              aria-label="Post URL"
            />
            <button type="submit" className="submit-button">
              <Trans id="Read Thread" message="Read Thread" />
            </button>
          </div>
          {error && <p className="error-message">{error}</p>}
        </form>

        <section className="instructions">
          <h2>
            <Trans id="How to use" message="How to use" />
          </h2>
          <ol>
            <li>
              <Trans id="Find a thread on Mastodon or any Fediverse platform" message="Find a thread on Mastodon or any Fediverse platform" />
            </li>
            <li>
              <Trans id="Copy the URL of the first post in the thread" message="Copy the URL of the first post in the thread" />
            </li>
            <li>
              <Trans id='Paste it above and click "Read Thread"' message='Paste it above and click "Read Thread"' />
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}
