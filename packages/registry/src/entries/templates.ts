import {
  AccountPage,
  AuthPage,
  CartPage,
  CheckoutPage,
  CmsPage,
  ErrorPage,
  HomePage,
  JournalPage,
  NotFoundPage,
  OrderConfirmationPage,
  OrderLookupPage,
  PostPage,
  ProductDetailPage,
  ProductListingPage,
  SearchResultsPage,
} from "../contracts";
import {
  firstVariant,
  type Family,
  type VariantOf,
} from "../contracts/variants";
import type { EntryInput } from "../types";

// SPEC §9.3's templates (D56): a page's `<main>`, drawn in the DS inside the classic header and the
// multi-column footer so the picture is a page. M3 builds them task by task (T48 to T54); M5's
// sections compose the home and the CMS pages from them.

const template = <const Slug extends string>(
  slug: Slug,
  label: string,
  name: string,
  contract: EntryInput["contract"],
) =>
  ({
    id: `templates/${slug}`,
    group: "templates",
    kind: "template",
    label,
    component: { module: `@shopblok/ui/templates/${slug}`, name },
    contract,
  }) as const satisfies EntryInput;

/**
 * A template the `templates` global picks (D99, D101): the first member of its family, with the
 * family's first variant. Its id stays M3's, so its baselines do; it gains a thumbnail (D52). T83
 * to T86 add the other members (`templates/product-detail-grid`, family `product-detail`).
 */
const first = <const Slug extends string, const F extends Family>(
  slug: Slug,
  family: F,
  label: string,
  name: string,
  contract: EntryInput["contract"],
) =>
  ({
    ...template(slug, label, name, contract),
    family,
    variant: firstVariant(family),
  }) as const satisfies EntryInput;

/**
 * A later member of a template's family (D99, T83 to T86): its own id (`templates/<family's
 * slug>-<variant>`), its module in the family's folder and the family's contract.
 */
const member = <
  const Slug extends string,
  const F extends Family,
  const V extends VariantOf<F>,
>(
  slug: Slug,
  family: F,
  variant: V,
  label: string,
  name: string,
  contract: EntryInput["contract"],
) =>
  ({
    id: `templates/${slug}-${variant}`,
    group: "templates",
    kind: "template",
    label,
    component: { module: `@shopblok/ui/templates/${slug}/${variant}`, name },
    contract,
    family,
    variant,
  }) as const satisfies EntryInput;

/** T84: a listing layout (M5 plan §1a), a member of `product-listing`. */
const listing = <const V extends VariantOf<"product-listing">>(
  variant: V,
  label: string,
  name: string,
) =>
  member(
    "product-listing",
    "product-listing",
    variant,
    `Listing page · ${label}`,
    name,
    ProductListingPage,
  );

export const templates = [
  // T48: the two the shell needs.
  template("not-found", "Not found", "NotFoundTemplate", NotFoundPage),
  template("error", "Error", "ErrorTemplate", ErrorPage),
  // T49: the product page.
  first(
    "product-detail",
    "product-detail",
    "Product page",
    "ProductDetailTemplate",
    ProductDetailPage,
  ),
  // T50: the listing pages and the search page.
  first(
    "product-listing",
    "product-listing",
    "Listing page",
    "ProductListingTemplate",
    ProductListingPage,
  ),
  // T84: the listing's six other filter layouts, which the search page follows (D101).
  listing("top-bar", "Top bar", "ProductListingTopBar"),
  listing("drawer", "Drawer", "ProductListingDrawer"),
  listing("accordion", "Accordion", "ProductListingAccordion"),
  listing("chips", "Chips", "ProductListingChips"),
  listing("rail", "Rail", "ProductListingRail"),
  listing("inline", "Inline", "ProductListingInline"),
  template(
    "search-results",
    "Search results",
    "SearchResultsTemplate",
    SearchResultsPage,
  ),
  // T51: the home page.
  template("home", "Home page", "HomeTemplate", HomePage),
  // T52: the cart, the checkout and the receipt.
  first("cart", "cart", "Cart page", "CartTemplate", CartPage),
  first("checkout", "checkout", "Checkout", "CheckoutTemplate", CheckoutPage),
  first(
    "order-confirmation",
    "receipt",
    "Order confirmation",
    "OrderConfirmationTemplate",
    OrderConfirmationPage,
  ),
  // T53: signing in and up, the account and the claim of a guest order.
  template("auth", "Sign in and register", "AuthTemplate", AuthPage),
  template("account", "Account", "AccountTemplate", AccountPage),
  template(
    "order-lookup",
    "Order lookup",
    "OrderLookupTemplate",
    OrderLookupPage,
  ),
  // T65: the CMS pages (and the homepage when the site settings name one).
  template("cms-page", "CMS page", "CmsPageTemplate", CmsPage),
  // T66: the journal and its posts.
  template("journal", "Journal", "JournalTemplate", JournalPage),
  template("post", "Post", "PostTemplate", PostPage),
] as const satisfies readonly EntryInput[];
