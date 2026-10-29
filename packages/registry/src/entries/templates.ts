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

export const templates = [
  // T48: the two the shell needs.
  template("not-found", "Not found", "NotFoundTemplate", NotFoundPage),
  template("error", "Error", "ErrorTemplate", ErrorPage),
  // T49: the product page.
  template("product-detail", "Product page", "ProductDetailTemplate", ProductDetailPage),
  // T50: the listing pages and the search page.
  template("product-listing", "Listing page", "ProductListingTemplate", ProductListingPage),
  template("search-results", "Search results", "SearchResultsTemplate", SearchResultsPage),
  // T51: the home page.
  template("home", "Home page", "HomeTemplate", HomePage),
  // T52: the cart, the checkout and the receipt.
  template("cart", "Cart page", "CartTemplate", CartPage),
  template("checkout", "Checkout", "CheckoutTemplate", CheckoutPage),
  template(
    "order-confirmation",
    "Order confirmation",
    "OrderConfirmationTemplate",
    OrderConfirmationPage,
  ),
  // T53: signing in and up, the account and the claim of a guest order.
  template("auth", "Sign in and register", "AuthTemplate", AuthPage),
  template("account", "Account", "AccountTemplate", AccountPage),
  template("order-lookup", "Order lookup", "OrderLookupTemplate", OrderLookupPage),
  // T65: the CMS pages (and the homepage when the site settings name one).
  template("cms-page", "CMS page", "CmsPageTemplate", CmsPage),
  // T66: the journal and its posts.
  template("journal", "Journal", "JournalTemplate", JournalPage),
  template("post", "Post", "PostTemplate", PostPage),
] as const satisfies readonly EntryInput[];
