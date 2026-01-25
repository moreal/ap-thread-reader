import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AppProviders } from "@/context/AppProviders";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content: "Read Fediverse threads as a single article",
      },
    ],
    links: [{ rel: "stylesheet", href: "/styles/typography.css" }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProviders>
          <Outlet />
        </AppProviders>
        <Scripts />
      </body>
    </html>
  );
}
