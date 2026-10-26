import { z } from "zod";
import { Href } from "./content";

// The templates' contracts (D56, SPEC §9.3): what a page's template shows, besides the header and
// the footer, which the layout draws. A template's copy is the catalog's `templates` (D43); what
// only the page knows (a retry, a form's action) is a slot or a prop of its own.

/** The 404 page (`not-found`): somewhere to go from a page that does not exist. */
export const NotFoundPage = z.object({
  homeHref: Href,
  searchHref: Href.optional().describe("The search page, when the shop has one"),
});

/** The error page (`error`): it says nothing about the error, only what the visitor can do. */
export const ErrorPage = z.object({ homeHref: Href });

export type NotFoundPage = z.infer<typeof NotFoundPage>;
export type ErrorPage = z.infer<typeof ErrorPage>;
