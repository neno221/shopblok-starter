import { AuthTemplate, authCopy } from "@shopblok/ui/templates/auth";
import type { Metadata } from "next";
import { askPasswordReset } from "../../../../lib/actions/auth";
import { authErrorsOf, authMetadata, authPageContext, param } from "../../../../lib/auth-page";
import { readFlash } from "../../../../lib/flash";
import { SHELL_PREFETCH } from "../../../../lib/site";

// D64 (T53): ask for a password reset link. The form posts to `askPasswordReset`, which has Medusa
// e-mail the link (T44's subscriber, in the market's prefix) and comes back here with the address in
// a flash: the page then says a link is on its way if an account uses it, the same for any
// address. Dynamic and blocking; `noindex`.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return authMetadata((auth) => auth.forgot.title);
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, authPageContext()]);
  const { market, messages, hrefs } = page;
  const flash = await readFlash(hrefs.forgot, param(query.f));
  return (
    <AuthTemplate
      variant="default"
      screen={{
        kind: "forgot",
        email: flash?.values?.email ?? "",
        sent: flash?.form === "sent",
        loginHref: hrefs.login,
      }}
      copy={authCopy(messages)}
      locale={market.htmlLang}
      action={askPasswordReset.bind(null, market.key)}
      errors={authErrorsOf(flash)}
      prefetch={SHELL_PREFETCH}
    />
  );
}
