// Ours (T48, SETUP.md "The shell (T48)"; D56, D45, D51). The stories of the templates: a page's
// content between the header and the footer, which the layout draws. The live render is the page:
// the template inside the classic header and the multi-column footer of the commerce fixtures, so
// the picture is what a shopper sees, with the template's content from `pageFixtures[ctx.locale]`
// and its words from `catalogs[ctx.locale].templates`. The states draw the template alone. The DS
// frame is the page's `<main>`, so a template is drawn as a `div` here (`as="div"`) with an id of
// its own, which the live header's skip link targets. Every link is drawn with `prefetch={false}`.
import { commerceFixtures, pageFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import { Button } from "@shopblok/ui/atoms/button";
import { FooterMultiColumn } from "@shopblok/ui/organisms/footer/multi-column";
import { HeaderClassic } from "@shopblok/ui/organisms/header/classic";
import { ErrorTemplate } from "@shopblok/ui/templates/error";
import { NotFoundTemplate } from "@shopblok/ui/templates/not-found";
import type { ReactNode } from "react";
import type { DsContext, DsStory } from "../types";

const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

/** The page around a template: the fixtures' classic header and multi-column footer. */
function page(ctx: DsContext, mainId: string, content: ReactNode) {
  const { header, footer } = commerceFixtures[ctx.locale];
  const catalog = catalogs[ctx.locale];
  return (
    <div className="flex flex-col">
      <HeaderClassic
        {...header.content}
        copy={catalog.organisms}
        marketSwitcherCopy={catalog.molecules.marketSwitcher}
        locale={lang(ctx)}
        prefetch={false}
        mainId={mainId}
        sticky={false}
      />
      {content}
      <FooterMultiColumn
        {...footer.content}
        copy={catalog.organisms.footer}
        newsletterCopy={catalog.molecules.newsletterForm}
        marketSwitcherCopy={catalog.molecules.marketSwitcher}
        locale={lang(ctx)}
        prefetch={false}
      />
    </div>
  );
}

const notFound = (ctx: DsContext, mainId: string, over: { searchHref?: string | null } = {}) => {
  const { searchHref, ...fixture } = pageFixtures[ctx.locale].notFound;
  const search = over.searchHref === null ? undefined : (over.searchHref ?? searchHref);
  return (
    <NotFoundTemplate
      {...fixture}
      {...(search === undefined ? {} : { searchHref: search })}
      copy={catalogs[ctx.locale].templates.notFound}
      prefetch={false}
      as="div"
      mainId={mainId}
    />
  );
};

const error = (ctx: DsContext, mainId: string, retry: boolean) => (
  <ErrorTemplate
    {...pageFixtures[ctx.locale].error}
    copy={catalogs[ctx.locale].templates.error}
    {...(retry
      ? {
          retry: (
            <Button size="lg" data-slot="error-retry">
              {catalogs[ctx.locale].templates.error.retry}
            </Button>
          ),
        }
      : {})}
    prefetch={false}
    as="div"
    mainId={mainId}
  />
);

const pageNote =
  "The template is the page between the header and the footer: in a shop it is the page's one `<main>`, the skip link's target, with the page's only `<h1>`. The icon is decoration and hidden from assistive technology.";
const waysNote =
  "The ways on are links drawn as buttons, at least 44 px tall, in reading order: the first is the primary one. Long words wrap and are never cut.";

export const templateStories = {
  "templates/not-found": {
    summary:
      "The 404 page: “Page not found”, a sentence, and the home page and the search page as the ways on.",
    a11y: [
      pageNote,
      waysNote,
      "Next answers the page with the 404 status, so a crawler drops it; the words are the catalog's in the market's language.",
    ],
    live: (ctx) => page(ctx, "template-not-found", notFound(ctx, "template-not-found")),
    states: [
      {
        id: "default",
        label: "Default",
        description: "The home page and the search page.",
        render: (ctx) => notFound(ctx, "template-not-found-default"),
      },
      {
        id: "no-search",
        label: "Without search",
        description: "A shop with no search page: the home page is the only way on.",
        render: (ctx) => notFound(ctx, "template-not-found-no-search", { searchHref: null }),
      },
    ],
    statesLayout: "stack",
  },
  "templates/error": {
    summary:
      "The error page: “Something went wrong”, a sentence that says what to do, “Try again” and the home page.",
    a11y: [
      pageNote,
      waysNote,
      "The page says nothing about the error: a server error's message never reaches the browser, and its digest means nothing to a shopper. “Try again” is a button (the error boundary's retry), and the home page a link.",
    ],
    live: (ctx) => page(ctx, "template-error", error(ctx, "template-error", true)),
    states: [
      {
        id: "default",
        label: "With “Try again”",
        description: "The error boundary's retry, then the home page.",
        render: (ctx) => error(ctx, "template-error-default", true),
      },
      {
        id: "no-retry",
        label: "Without “Try again”",
        description: "Where nothing can be retried, the home page is the primary button.",
        render: (ctx) => error(ctx, "template-error-no-retry", false),
      },
    ],
    statesLayout: "stack",
  },
} satisfies Partial<Record<EntryId, DsStory>>;
