import { NotFoundTemplate } from "@shopblok/ui/templates/not-found";
import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { getShellData } from "../../../components/shell/shell-data";
import { SHELL_PREFETCH } from "../../../lib/site";

// Shown inside the market's layout when a page calls `notFound()`: a product that does not exist,
// or (T65) a path under the market that is no page (`[...slug]`). A URL that matches no route (an
// internal market key) gets `global-not-found`. D66 (T48): the `not-found` template, in the
// market's language, with links to the market's home and its search page.
// The tab's title is the template's heading in the market's language inside the layout's title
// template ("Page not found | Shopblok"); it was only the store's name (W6's review item 2, D112).
// Next reads the metadata of the `not-found` file that catches the 404 after the layouts'.
export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return { title: messages.templates.notFound.title };
}

export default async function MarketNotFound() {
  const [shell, messages] = await Promise.all([getShellData(), getMessages()]);
  return (
    <NotFoundTemplate
      homeHref={shell.url("/")}
      searchHref={shell.url("/search")}
      copy={messages.templates.notFound}
      prefetch={SHELL_PREFETCH}
    />
  );
}
