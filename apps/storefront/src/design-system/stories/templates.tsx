// Ours (T48, SETUP.md "The shell (T48)"; D56, D45, D51). The stories of the templates: a page's
// content between the header and the footer, which the layout draws. The live render is the page:
// the template inside the classic header and the multi-column footer of the commerce fixtures, so
// the picture is what a shopper sees, with the template's content from `pageFixtures[ctx.locale]`
// and its words from `catalogs[ctx.locale].templates`. The states draw the template alone. The DS
// frame is the page's `<main>`, so a template is drawn as a `div` here (`as="div"`) with an id of
// its own, which the live header's skip link targets. Every link is drawn with `prefetch={false}`.
import { commerceFixtures, fixtureNow, markets, pageFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import { Button } from "@shopblok/ui/atoms/button";
import { FooterMultiColumn } from "@shopblok/ui/organisms/footer/multi-column";
import { HeaderClassic } from "@shopblok/ui/organisms/header/classic";
import { AccountTemplate, accountCopy, type AccountErrors } from "@shopblok/ui/templates/account";
import { AuthTemplate, authCopy, type AuthErrors } from "@shopblok/ui/templates/auth";
import { CartTemplate, cartCopy } from "@shopblok/ui/templates/cart";
import {
  CheckoutTemplate,
  checkoutCopy,
  type CheckoutErrors,
} from "@shopblok/ui/templates/checkout";
import { CmsPageTemplate } from "@shopblok/ui/templates/cms-page";
import { ErrorTemplate } from "@shopblok/ui/templates/error";
import { HomeTemplate, homeCopy } from "@shopblok/ui/templates/home";
import { JournalTemplate, journalCopy } from "@shopblok/ui/templates/journal";
import { NotFoundTemplate } from "@shopblok/ui/templates/not-found";
import {
  OrderConfirmationTemplate,
  orderConfirmationCopy,
} from "@shopblok/ui/templates/order-confirmation";
import { OrderLookupTemplate, orderLookupCopy } from "@shopblok/ui/templates/order-lookup";
import { PostTemplate, postCopy } from "@shopblok/ui/templates/post";
import {
  ProductDetailTemplate,
  productDetailCopy,
  type ProductDetailIds,
} from "@shopblok/ui/templates/product-detail";
import { ProductListingTemplate, productListingCopy } from "@shopblok/ui/templates/product-listing";
import { SearchResultsTemplate, searchResultsCopy } from "@shopblok/ui/templates/search-results";
import type { ProductDetailPage, ProductListingPage } from "@shopblok/registry/contracts";
import type { ReactNode } from "react";
import type { DsContext, DsStory } from "../types";
import { hero, mediaWithText, richText } from "./sections";

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

/** A state's own ids, so two product pages on one DS page link nothing of each other's. */
const idsFor = (prefix: string): ProductDetailIds => ({
  form: `${prefix}-buy-box`,
  options: `${prefix}-buy-box-options`,
  button: `${prefix}-buy-box-add`,
  title: `${prefix}-title`,
  reviews: `${prefix}-reviews`,
});

type ProductDetailVariant = "default" | "chosen" | "long" | "no-related" | "rich";

/** The fixture's product page, changed for a state. */
function productDetailContent(ctx: DsContext, state: ProductDetailVariant): ProductDetailPage {
  const base = pageFixtures[ctx.locale].productDetail;
  const fixtures = commerceFixtures[ctx.locale];
  if (state === "chosen") {
    const { productPage } = fixtures;
    return {
      ...base,
      gallery: productPage.gallery.chosen,
      buyBox: productPage.buyBox.ready,
      sticky: productPage.sticky.ready,
    };
  }
  if (state === "long") {
    const title = fixtures.long.product.title;
    return {
      ...base,
      breadcrumbs: { ...base.breadcrumbs, current: title },
      gallery: { ...base.gallery, title },
      buyBox: { ...base.buyBox, product: { ...base.buyBox.product, title } },
      sticky: { ...base.sticky, title },
    };
  }
  if (state === "no-related") {
    const { related: _related, ...rest } = base;
    return rest;
  }
  if (state === "rich") {
    const sections = base.info.sections.map((section) =>
      section.id === "description" ? { ...section, blocks: [{ kind: "rich" as const }] } : section,
    );
    return { ...base, info: { sections } };
  }
  return base;
}

/**
 * An editor's rich description (T69), as the shop's Lexical renderer draws it: the fixture's own
 * words, as a paragraph, a heading under the section's, a list and a paragraph with a strong word.
 */
function richDescription(ctx: DsContext): ReactNode {
  const { sections } = pageFixtures[ctx.locale].productDetail.info;
  const paragraphs = sections.flatMap((section) =>
    section.id === "description"
      ? section.blocks.flatMap((block) => (block.kind === "text" ? block.paragraphs : []))
      : [],
  );
  const details = sections.find((section) => section.id === "details");
  const care = details?.blocks.flatMap((block) => (block.kind === "list" ? block.items : [])) ?? [];
  const [first, ...rest] = paragraphs;
  return (
    <>
      <p>{first}</p>
      <h3>{details?.title}</h3>
      <ul>
        {care.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {rest.map((paragraph) => (
        <p key={paragraph}>
          <strong>{paragraph}</strong>
        </p>
      ))}
    </>
  );
}

const productDetail = (ctx: DsContext, mainId: string, state: ProductDetailVariant) => {
  const content = productDetailContent(ctx, state);
  const href = content.buyBox.product.href;
  return (
    <ProductDetailTemplate
      {...content}
      copy={productDetailCopy(catalogs[ctx.locale])}
      locale={lang(ctx)}
      reviewsHrefFor={(n) => (n === 1 ? href : `${href}?reviews=${n}`)}
      ids={idsFor(mainId)}
      prefetch={false}
      as="div"
      mainId={mainId}
      {...(state === "rich" ? { slots: { richText: { description: richDescription(ctx) } } } : {})}
    />
  );
};

type ProductListingVariant = "default" | "no-filters" | "empty" | "content";

/** The fixture's listing page, changed for a state. */
function productListingContent(ctx: DsContext, state: ProductListingVariant): ProductListingPage {
  const base = pageFixtures[ctx.locale].productListing;
  const { listing } = commerceFixtures[ctx.locale];
  if (state === "no-filters") {
    const { filters: _filters, ...results } = base.results;
    return { ...base, results };
  }
  if (state === "empty") {
    const { filters: _filters, ...results } = base.results;
    return {
      ...base,
      results: {
        ...results,
        toolbar: { ...results.toolbar, count: 0 },
        grid: listing.grid.empty,
        page: { page: 1, pageCount: 1 },
      },
    };
  }
  if (state === "content") return pageFixtures[ctx.locale].productListingContent.page;
  return base;
}

/** A page of the listing: the first at its own address, the others by path (D59). */
const listingHrefFor = (base: string) => (n: number) => (n === 1 ? base : `${base}/page/${n}`);

const productListing = (ctx: DsContext, mainId: string, state: ProductListingVariant) => {
  const content = productListingContent(ctx, state);
  const base = content.breadcrumbs.trail.at(-1)?.href ?? "/";
  return (
    <ProductListingTemplate
      {...content}
      copy={productListingCopy(catalogs[ctx.locale])}
      locale={lang(ctx)}
      hrefFor={listingHrefFor(base)}
      prefetch={false}
      as="div"
      mainId={mainId}
      {...(state === "content"
        ? { slots: { intro: <p>{pageFixtures[ctx.locale].productListingContent.intro}</p> } }
        : {})}
    />
  );
};

const searchResults = (ctx: DsContext, mainId: string, empty: boolean) => {
  const base = pageFixtures[ctx.locale].searchResults;
  const { listing } = commerceFixtures[ctx.locale];
  const { filters: _filters, ...unfiltered } = base.results;
  const content = empty
    ? {
        ...base,
        results: {
          ...unfiltered,
          toolbar: { ...unfiltered.toolbar, count: 0 },
          grid: listing.grid.empty,
          page: { page: 1, pageCount: 1 },
        },
      }
    : base;
  const action = content.search.action;
  const query = encodeURIComponent(content.search.query);
  return (
    <SearchResultsTemplate
      {...content}
      copy={searchResultsCopy(catalogs[ctx.locale])}
      locale={lang(ctx)}
      hrefFor={(n) => (n === 1 ? `${action}?q=${query}` : `${action}?q=${query}&page=${n}`)}
      prefetch={false}
      as="div"
      mainId={mainId}
    />
  );
};

const home = (ctx: DsContext, mainId: string, variant: "default" | "bare") => {
  const { categories, newArrivals, ...base } = pageFixtures[ctx.locale].home;
  const content = variant === "bare" ? base : { ...base, categories, newArrivals };
  return (
    <HomeTemplate
      {...content}
      copy={homeCopy(catalogs[ctx.locale])}
      locale={lang(ctx)}
      prefetch={false}
      as="div"
      mainId={mainId}
    />
  );
};

const cart = (ctx: DsContext, mainId: string, state: "full" | "empty" | "error") => (
  <CartTemplate
    {...pageFixtures[ctx.locale].cart[state === "empty" ? "empty" : "full"]}
    {...(state === "error"
      ? { error: "rejected" as const, promoError: "invalid" as const, promoCode: "WELCOME5" }
      : {})}
    copy={cartCopy(catalogs[ctx.locale])}
    locale={lang(ctx)}
    prefetch={false}
    as="div"
    mainId={mainId}
  />
);

const checkout = (
  ctx: DsContext,
  mainId: string,
  step: "contact" | "delivery" | "review",
  errors?: CheckoutErrors,
) => (
  <CheckoutTemplate
    {...pageFixtures[ctx.locale].checkout[step]}
    copy={checkoutCopy(catalogs[ctx.locale])}
    locale={lang(ctx)}
    now={fixtureNow}
    {...(errors === undefined ? {} : { errors })}
    prefetch={false}
    as="div"
    mainId={mainId}
  />
);

/** The DS market's country's time zone (D65), as the shop's markets global seeds it. */
const timeZone = (ctx: DsContext) =>
  markets.countries.find((country) => country.code === ctx.fixture.market.country)?.timeZone;

const orderConfirmation = (ctx: DsContext, mainId: string) => (
  <OrderConfirmationTemplate
    {...pageFixtures[ctx.locale].orderConfirmation}
    copy={orderConfirmationCopy(catalogs[ctx.locale])}
    locale={lang(ctx)}
    timeZone={timeZone(ctx)}
    prefetch={false}
    as="div"
    mainId={mainId}
  />
);

type AuthScreen = keyof (typeof pageFixtures)["en"]["auth"];

const auth = (ctx: DsContext, mainId: string, screen: AuthScreen, errors?: AuthErrors) => (
  <AuthTemplate
    {...pageFixtures[ctx.locale].auth[screen]}
    copy={authCopy(catalogs[ctx.locale])}
    locale={lang(ctx)}
    {...(errors === undefined ? {} : { errors })}
    prefetch={false}
    as="div"
    mainId={mainId}
  />
);

type AccountScreen = keyof (typeof pageFixtures)["en"]["account"];

const account = (ctx: DsContext, mainId: string, screen: AccountScreen, errors?: AccountErrors) => (
  <AccountTemplate
    {...pageFixtures[ctx.locale].account[screen]}
    copy={accountCopy(catalogs[ctx.locale])}
    locale={lang(ctx)}
    timeZone={timeZone(ctx)}
    now={fixtureNow}
    {...(errors === undefined ? {} : { errors })}
    prefetch={false}
    as="div"
    mainId={mainId}
  />
);

type LookupScreen = keyof (typeof pageFixtures)["en"]["orderLookup"];

const orderLookup = (ctx: DsContext, mainId: string, screen: LookupScreen) => (
  <OrderLookupTemplate
    {...pageFixtures[ctx.locale].orderLookup[screen]}
    copy={orderLookupCopy(catalogs[ctx.locale])}
    locale={lang(ctx)}
    prefetch={false}
    as="div"
    mainId={mainId}
  />
);

type CmsPageState = "nested" | "top-level" | "hero";

/**
 * A CMS page (T65): "Our team" under "About us" with the sample rich text and a media with text;
 * the same page at the top level (no breadcrumbs); and a page that opens with a hero, which takes
 * the heading.
 */
function cmsPage(ctx: DsContext, mainId: string, state: CmsPageState) {
  const { breadcrumbs, ...fixture } = pageFixtures[ctx.locale].cmsPage;
  const copy = catalogs[ctx.locale].molecules.breadcrumbs;
  if (state === "hero") {
    return (
      <CmsPageTemplate {...fixture} heading="hero" copy={copy} as="div" mainId={mainId}>
        {hero(ctx, "section", undefined, 1)}
        {richText(ctx)}
      </CmsPageTemplate>
    );
  }
  return (
    <CmsPageTemplate
      {...fixture}
      {...(state === "nested" ? { breadcrumbs } : {})}
      copy={copy}
      as="div"
      mainId={mainId}
    >
      {richText(ctx)}
      {mediaWithText(ctx, "section", { surface: "muted" })}
    </CmsPageTemplate>
  );
}

type JournalState = "first" | "second" | "empty";

/** The journal's address in the DS market, and a later page's (`/journal/page/2`, D59). */
const journalHrefFor = (base: string) => (n: number) => (n === 1 ? base : `${base}/page/${n}`);

function journal(ctx: DsContext, mainId: string, state: JournalState) {
  const { first, empty } = pageFixtures[ctx.locale].journal;
  const base = `${commerceFixtures[ctx.locale].header.content.homeHref.replace(/\/$/, "")}/journal`;
  const fixture =
    state === "empty"
      ? empty
      : state === "second"
        ? { ...first, posts: first.posts.slice(2), page: { page: 2, pageCount: 2 } }
        : first;
  return (
    <JournalTemplate
      {...fixture}
      copy={journalCopy(catalogs[ctx.locale])}
      locale={lang(ctx)}
      timeZone={timeZone(ctx)}
      hrefFor={journalHrefFor(base)}
      prefetch={false}
      as="div"
      mainId={mainId}
    />
  );
}

function post(ctx: DsContext, mainId: string, which: "page" | "long") {
  const { body, ...fixtures } = pageFixtures[ctx.locale].post;
  return (
    <PostTemplate
      {...fixtures[which]}
      copy={postCopy(catalogs[ctx.locale])}
      locale={lang(ctx)}
      timeZone={timeZone(ctx)}
      as="div"
      mainId={mainId}
    >
      {body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </PostTemplate>
  );
}

const formsNote =
  "Every form is plain and posts without JavaScript (the shop's server actions redirect back). Each field has a visible label; an error is text beside its field, named in its `aria-describedby` before the hint, and a form's failure an alert at the top. A step just done is a polite status.";

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
  "templates/product-detail": {
    summary:
      "The product page: the breadcrumbs, the gallery beside the buy box from `md`, the information, the reviews and the related products. In a shop the buy box and the gallery follow `?variant=` through islands; the server draws this, the default choice.",
    a11y: [
      pageNote,
      "The product's name is the page's one `<h1>`, in the buy box; every section under it has an `<h2>`. The buy box's rating links to the reviews, and the sticky bar's button submits the buy box's form, so both add the same choice.",
      "One column below `md`, in reading order: the pictures, the buy box, the information, the reviews, the related products. From `md` the buy box sticks under the header while the pictures scroll, and its order in the page is unchanged.",
    ],
    live: (ctx) =>
      page(
        ctx,
        "template-product-detail",
        productDetail(ctx, "template-product-detail", "default"),
      ),
    states: [
      {
        id: "default",
        label: "Nothing chosen",
        description: "What the server renders: the buy box asks for a colour and a size.",
        render: (ctx) => productDetail(ctx, "template-product-detail-default", "default"),
      },
      {
        id: "chosen",
        label: "A variant chosen",
        description:
          "`?variant=` named a colour and a size: its picture first, its price, “Add to cart”.",
        render: (ctx) => productDetail(ctx, "template-product-detail-chosen", "chosen"),
      },
      {
        id: "long",
        label: "Long name",
        description: "The longest name the copy allows wraps in the breadcrumbs and the title.",
        render: (ctx) => productDetail(ctx, "template-product-detail-long", "long"),
      },
      {
        id: "no-related",
        label: "No related products",
        description: "A product alone in its category: no carousel.",
        render: (ctx) => productDetail(ctx, "template-product-detail-no-related", "no-related"),
      },
      {
        id: "rich",
        label: "The shop's description",
        description:
          "An editor's rich description replaces Medusa's plain one (T69): a heading under the section's, a list, a strong word, in the editor's text's look.",
        render: (ctx) => productDetail(ctx, "template-product-detail-rich", "rich"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/product-listing": {
    summary:
      "A listing page (a category, a collection, every product): the breadcrumbs, its name, the filters beside the products from `lg` (a drawer below it), the toolbar with the count and the sort, the grid and the pages, which are paths (`/page/2`). In a shop the listing island draws the results again for a URL with filters (D59); the server draws this, the first page.",
    a11y: [
      pageNote,
      "The page's name is its one `<h1>`; the filters' heading and the cards' titles are `<h2>`s. The filters are one GET form named by its heading, applied with one button, so ticking a box never reloads the page under the hand (WCAG 3.2.2).",
      "The pages and the chosen filters are links (`<a href>`), so a crawler and a visitor without JavaScript reach every page. Without JavaScript the filter and sort forms land on the search page, which applies them on the server.",
    ],
    live: (ctx) =>
      page(
        ctx,
        "template-product-listing",
        productListing(ctx, "template-product-listing", "default"),
      ),
    states: [
      {
        id: "default",
        label: "Filters chosen",
        description: "The first of two pages, two filters chosen, newest first.",
        render: (ctx) => productListing(ctx, "template-product-listing-default", "default"),
      },
      {
        id: "no-filters",
        label: "Nothing to filter",
        description:
          "No product has anything to filter by: no sidebar, and the grid takes the width.",
        render: (ctx) => productListing(ctx, "template-product-listing-no-filters", "no-filters"),
      },
      {
        id: "empty",
        label: "No products",
        description: "A category with no products yet: the empty state, and no pages.",
        render: (ctx) => productListing(ctx, "template-product-listing-empty", "empty"),
      },
      {
        id: "content",
        label: "A banner and an introduction",
        description:
          "The category's own content (T69): an editor's banner under the title (16:9 on a phone, 3:1 from `md`) and a few lines of introduction.",
        render: (ctx) => productListing(ctx, "template-product-listing-content", "content"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/home": {
    summary:
      "The home page: the hero (a line, the way into the shop and a picture), the top-level categories as tiles, the newest products as a carousel and a link to every product. The hero's words are the shop's; the rest is read from Medusa. A published CMS homepage replaces this template (T65).",
    a11y: [
      pageNote,
      "The hero's title is the page's one `<h1>`; the categories and the new arrivals each have an `<h2>` that names their section. A category tile is one link, its name and picture together; the picture is decoration (`alt=\"\"`), so the link's name is the category's.",
      "The hero's picture is preloaded (it is the first screen's largest). Below `md` the hero is one column, the words before the picture.",
    ],
    live: (ctx) => page(ctx, "template-home", home(ctx, "template-home", "default")),
    states: [
      {
        id: "default",
        label: "Default",
        description: "The hero, the categories, the new arrivals and the link to every product.",
        render: (ctx) => home(ctx, "template-home-default", "default"),
      },
      {
        id: "bare",
        label: "An empty shop",
        description:
          "No categories and no products yet: the hero and the link to every product only.",
        render: (ctx) => home(ctx, "template-home-bare", "bare"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/search-results": {
    summary:
      "The search page: the search field with the query, a heading that says what was searched, then the same results as a listing's, every filter and sort read on the server (it is dynamic). A listing's filter form lands here without JavaScript (D59).",
    a11y: [
      pageNote,
      "The search field is a `search` landmark with a GET form of its own, so a new query starts without the last one's filters. The heading says what was searched; the results are a listing's, with the same headings and forms.",
    ],
    live: (ctx) =>
      page(ctx, "template-search-results", searchResults(ctx, "template-search-results", false)),
    states: [
      {
        id: "default",
        label: "Results",
        description: "The query's results, by relevance.",
        render: (ctx) => searchResults(ctx, "template-search-results-default", false),
      },
      {
        id: "empty",
        label: "No results",
        description: "A query that finds nothing: the empty state, no filters and no pages.",
        render: (ctx) => searchResults(ctx, "template-search-results-empty", true),
      },
    ],
    statesLayout: "stack",
  },
  "templates/cart": {
    summary:
      "The cart page: the lines with their quantity and remove forms, the promotion codes, the subtotal, the discount and the total, and the way to the checkout. An empty cart is the way back to the shop.",
    a11y: [
      pageNote,
      "Every change is a plain form that posts without JavaScript (the shop's server actions redirect back to the page). A line's controls are named for the line with its options. The summary is a section named by its `<h2>`; its rows are one `<dl>`.",
      "An action's failure is said at the top in an alert, and a promotion code's beside its field.",
    ],
    live: (ctx) => page(ctx, "template-cart", cart(ctx, "template-cart", "full")),
    states: [
      {
        id: "default",
        label: "A cart",
        description: "Three lines with a promotion code applied.",
        render: (ctx) => cart(ctx, "template-cart-default", "full"),
      },
      {
        id: "empty",
        label: "Empty",
        description: "No line: the empty state and the way back to the shop.",
        render: (ctx) => cart(ctx, "template-cart-empty", "empty"),
      },
      {
        id: "error",
        label: "After a failed change",
        description: "Medusa refused a change, and a code that does not exist was typed.",
        render: (ctx) => cart(ctx, "template-cart-error", "error"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/checkout": {
    summary:
      "The checkout: CheckoutSteps with the order summary, and the current step as its own page and form: contact and address, delivery and payment (Pay later in M3), and the review that places the order.",
    a11y: [
      pageNote,
      "“Checkout” is the page's `<h1>` and the step's name its `<h2>`; the stepper marks the current step. Every step posts without JavaScript.",
      "The email field belongs to the address's form by its id, and the delivery options to the payment's, so each step sends one form. An error is text beside its field, and a step's failure an alert at the top.",
      "In the review each part's “Edit” link is named for its part (“Edit: Contact”), the visible word first.",
    ],
    live: (ctx) => page(ctx, "template-checkout", checkout(ctx, "template-checkout", "contact")),
    states: [
      {
        id: "contact",
        label: "Contact and address",
        description: "The email and the shipping address, typed.",
        render: (ctx) => checkout(ctx, "template-checkout-contact", "contact"),
      },
      {
        id: "contact-errors",
        label: "Contact with errors",
        description:
          "No email, and the address's first line missing, as the action hands them back.",
        render: (ctx) =>
          checkout(ctx, "template-checkout-contact-errors", "contact", {
            email: "required",
            address: { address1: "required" },
          }),
      },
      {
        id: "delivery",
        label: "Delivery and payment",
        description: "Every shipping option (one not available) and the system payment.",
        render: (ctx) => checkout(ctx, "template-checkout-delivery", "delivery"),
      },
      {
        id: "review",
        label: "Review",
        description: "What will be ordered, each part with its way back, and “Place order”.",
        render: (ctx) => checkout(ctx, "template-checkout-review", "review"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/order-confirmation": {
    summary:
      "The receipt: the thanks, the order's number, date and e-mail, where it goes, how it is delivered and paid, the summary with its lines open, its history, and the way back to the shop.",
    a11y: [
      pageNote,
      "The thanks is the page's `<h1>`; each part has an `<h2>`. The dates are in the market's time zone, so an order placed after midnight in Cyprus shows that day.",
    ],
    live: (ctx) =>
      page(
        ctx,
        "template-order-confirmation",
        orderConfirmation(ctx, "template-order-confirmation"),
      ),
    states: [
      {
        id: "default",
        label: "Placed",
        description: "The order placed and paid.",
        render: (ctx) => orderConfirmation(ctx, "template-order-confirmation-default"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/auth": {
    summary:
      "Signing in and up (D64): sign in, create an account, the e-mail to verify before the account exists, the password reset asked for and chosen, and a link that no longer works. One narrow column, one form per page.",
    a11y: [
      pageNote,
      formsNote,
      "The fields carry `autocomplete` (`username`, `current-password`, `new-password`, `given-name`), so a password manager fills them; the new password's rule is its hint.",
      "The reset answer says the same whether or not an account uses the address.",
    ],
    live: (ctx) => page(ctx, "template-auth", auth(ctx, "template-auth", "login")),
    states: [
      {
        id: "login",
        label: "Sign in",
        description: "After a wrong password: the form's alert.",
        render: (ctx) => auth(ctx, "template-auth-login", "login", { form: "credentials" }),
      },
      {
        id: "verified",
        label: "Verified",
        description: "Back from the e-mail's link: the address filled in and “verified, sign in”.",
        render: (ctx) => auth(ctx, "template-auth-verified", "verified"),
      },
      {
        id: "register",
        label: "Register",
        description: "No e-mail and a short password, as the action hands them back.",
        render: (ctx) =>
          auth(ctx, "template-auth-register", "register", {
            fields: { email: "required", password: "short" },
          }),
      },
      {
        id: "check-email",
        label: "Check your email",
        description: "The verification link sent, a new one in a while.",
        render: (ctx) => auth(ctx, "template-auth-check-email", "checkEmail"),
      },
      {
        id: "reset",
        label: "New password",
        description: "The reset link's page.",
        render: (ctx) => auth(ctx, "template-auth-reset", "reset"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/account": {
    summary:
      "The account: AccountNav beside the screen. The overview, the orders and one order, the address book and an address, the payment methods (none until M6), the returns and the profile.",
    a11y: [
      pageNote,
      formsNote,
      "AccountNav marks the page the customer is on (`aria-current`); “Sign out” is a form's button, never a link a prefetch could follow.",
      "The dates are in the market's time zone.",
    ],
    live: (ctx) => page(ctx, "template-account", account(ctx, "template-account", "overview")),
    states: [
      {
        id: "overview",
        label: "Overview",
        description: "The greeting, the two orders and the ways on.",
        render: (ctx) => account(ctx, "template-account-overview", "overview"),
      },
      {
        id: "order",
        label: "An order",
        description: "The placed order: where it goes, its history and its summary.",
        render: (ctx) => account(ctx, "template-account-order", "order"),
      },
      {
        id: "addresses",
        label: "Addresses",
        description: "The address book.",
        render: (ctx) => account(ctx, "template-account-addresses", "addresses"),
      },
      {
        id: "address",
        label: "An address",
        description: "An address to change, with the default checkbox.",
        render: (ctx) => account(ctx, "template-account-address", "address"),
      },
      {
        id: "return",
        label: "A return",
        description: "The delivered order's return form, filled in.",
        render: (ctx) => account(ctx, "template-account-return", "return"),
      },
      {
        id: "profile",
        label: "Profile",
        description: "The name and phone, the e-mail shown.",
        render: (ctx) =>
          account(ctx, "template-account-profile", "profile", {
            profile: { firstName: "required" },
          }),
      },
    ],
    statesLayout: "stack",
  },
  "templates/order-lookup": {
    summary:
      "The claim of a guest order: the receipt's number and the e-mail, for a signed-in customer; the sign-in for a visitor; the e-mail link's page that accepts or declines.",
    a11y: [
      pageNote,
      formsNote,
      "The claim's answer never says whether the details matched an order. Accept and decline are two buttons of one form, so a visit alone changes nothing.",
    ],
    live: (ctx) =>
      page(ctx, "template-order-lookup", orderLookup(ctx, "template-order-lookup", "lookup")),
    states: [
      {
        id: "sent",
        label: "Claim sent",
        description: "The details typed, and the status that the link went out.",
        render: (ctx) => orderLookup(ctx, "template-order-lookup-sent", "sent"),
      },
      {
        id: "sign-in",
        label: "Not signed in",
        description: "Claiming needs an account.",
        render: (ctx) => orderLookup(ctx, "template-order-lookup-sign-in", "signIn"),
      },
      {
        id: "transfer",
        label: "The e-mail's link",
        description: "Accept or decline.",
        render: (ctx) => orderLookup(ctx, "template-order-lookup-transfer", "transfer"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/cms-page": {
    summary:
      "A CMS page (an editor's, at its path under the market): the breadcrumbs of a page with parents, the title, then the page's blocks, each drawn by its section. The homepage is one when the site settings name it.",
    a11y: [
      pageNote,
      "The title is the page's one `<h1>`, and every block's heading an `<h2>`; a page that opens with a hero gives the hero the `<h1>` instead and draws no title, so there is still one.",
      'The breadcrumbs are a `navigation` landmark named by the catalog, Home first and the page itself last as text (`aria-current="page"`); a top-level page has none.',
    ],
    live: (ctx) => page(ctx, "template-cms-page", cmsPage(ctx, "template-cms-page", "nested")),
    states: [
      {
        id: "nested",
        label: "Under a parent",
        description: "The breadcrumbs, the title, a rich text and a media with text.",
        render: (ctx) => cmsPage(ctx, "template-cms-page-nested", "nested"),
      },
      {
        id: "top-level",
        label: "Top level",
        description: "A page with no parent: no breadcrumbs.",
        render: (ctx) => cmsPage(ctx, "template-cms-page-top-level", "top-level"),
      },
      {
        id: "hero",
        label: "Opening with a hero",
        description: "The hero's title is the page's heading; the page's own is not drawn.",
        render: (ctx) => cmsPage(ctx, "template-cms-page-hero", "hero"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/journal": {
    summary:
      "The journal: the shop's posts, newest first, a page at a time, each a card with its picture, its title, its date and author and its summary; later pages are addresses (`/journal/page/2`).",
    a11y: [
      pageNote,
      "The journal's name is the page's one `<h1>` and each post's title an `<h2>`, the card's only link; the picture beside it is decoration.",
      "Each date is a `<time>` with the instant, written in the market's time zone and language.",
      "The pager is a `navigation` landmark of links (SPEC §8.4), the current page marked `aria-current`.",
    ],
    live: (ctx) => page(ctx, "template-journal", journal(ctx, "template-journal", "first")),
    states: [
      {
        id: "first",
        label: "First page",
        description: "Four posts, the last without a picture, and the pager to page 2.",
        render: (ctx) => journal(ctx, "template-journal-first", "first"),
      },
      {
        id: "second",
        label: "A later page",
        description: "Page 2 of 2, by its path: two posts and the pager back.",
        render: (ctx) => journal(ctx, "template-journal-second", "second"),
      },
      {
        id: "empty",
        label: "No post yet",
        description: "What the journal says before the first post, with the way to the shop.",
        render: (ctx) => journal(ctx, "template-journal-empty", "empty"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/post": {
    summary:
      "A post of the journal: the breadcrumbs to the journal, the title, the date and the author, the summary as the lead, the hero picture and the editor's text in a reading column.",
    a11y: [
      pageNote,
      "The post is an `<article>`; its title is the page's one `<h1>` and the editor's headings start at h2.",
      "The date is a `<time>` with the instant, in the market's time zone; the hero picture has the editor's alternative text.",
      'The breadcrumbs are a `navigation` landmark: Home, the journal, and the post itself as text (`aria-current="page"`).',
    ],
    live: (ctx) => page(ctx, "template-post", post(ctx, "template-post", "page")),
    states: [
      {
        id: "post",
        label: "A post",
        description: "The picture, the lead and three paragraphs.",
        render: (ctx) => post(ctx, "template-post-post", "page"),
      },
      {
        id: "long",
        label: "Long title, no picture",
        description: "A title that wraps over several lines; no picture and no lead.",
        render: (ctx) => post(ctx, "template-post-long", "long"),
      },
    ],
    statesLayout: "stack",
  },
} satisfies Partial<Record<EntryId, DsStory>>;
