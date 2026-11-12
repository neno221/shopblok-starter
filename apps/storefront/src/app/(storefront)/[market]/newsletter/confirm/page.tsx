import type { Messages } from "@shopblok/i18n";
import type { Metadata } from "next";
import {
  NewsletterConfirm,
  type ConfirmScreen,
} from "../../../../../components/newsletter/newsletter-confirm";
import { confirmNewsletter } from "../../../../../lib/actions/newsletter";
import { authPageContext, param } from "../../../../../lib/auth-page";
import { noindexMetadata } from "../../../../../lib/auth-page";
import { readConfirmation } from "../../../../../lib/newsletter/confirm";
import { MAX_TOKEN_LENGTH } from "../../../../../lib/newsletter/token";
import { SHELL_PREFETCH } from "../../../../../lib/site";

// D122 (T99): the newsletter's confirmation link. The page reads the token and shows the address
// with a "Confirm" button, whose form posts the token to `confirmNewsletter`; a GET (a mail
// scanner's, a prefetch) confirms nothing and writes nothing. The action redirects back here with
// `?state=` (done, used, expired; failed comes back with the token, to try again). The token is
// in the URL, so the page sends a referrer only to its own site. Dynamic and blocking; `noindex`.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await noindexMetadata((templates) => templates.newsletterConfirm.title)),
    // Never to another site; `no-referrer` would also make a form post's `Origin` `null`, which
    // Next refuses as a cross-site action (the confirmation without scripts).
    referrer: "same-origin",
  };
}

const STATES = new Set(["done", "used", "expired"]);

export default async function NewsletterConfirmPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, authPageContext()]);
  const { market, context, messages } = page;
  const state = param(query.state);
  const token = param(query.token);
  let screen: ConfirmScreen;
  if (state !== undefined && STATES.has(state)) {
    screen = { kind: state as "done" | "used" | "expired" };
  } else if (token === undefined || token === "" || token.length > MAX_TOKEN_LENGTH) {
    screen = { kind: "expired" };
  } else {
    const link = await readConfirmation(token);
    screen =
      link.kind === "valid"
        ? { kind: "confirm", email: link.claims.email, token, failed: state === "failed" }
        : { kind: link.kind };
  }
  return (
    <NewsletterConfirm
      screen={screen}
      copy={(messages as Messages).templates.newsletterConfirm}
      locale={market.htmlLang}
      action={confirmNewsletter.bind(null, market.key)}
      homeHref={context.url("/")}
      prefetch={SHELL_PREFETCH}
    />
  );
}
