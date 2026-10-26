import { AuthTemplate, authCopy } from "@shopblok/ui/templates/auth";
import type { Metadata } from "next";
import { signUp } from "../../../../lib/actions/auth";
import { authErrorsOf, authMetadata, authPageContext, param } from "../../../../lib/auth-page";
import { readFlash } from "../../../../lib/flash";
import { SHELL_PREFETCH } from "../../../../lib/site";

// D64 (T53): create an account. The form posts to `signUp`, which registers the identity, keeps the
// name for the account in the pending cookie and has Medusa e-mail the verification link (in the
// market's prefix), then goes on to `/verify` (the e-mail to check); a refusal comes back here in a
// flash, with what was typed but the password. Dynamic and blocking; `noindex`.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return authMetadata((auth) => auth.register.title);
}

export default async function RegisterPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, authPageContext()]);
  const { market, messages, hrefs } = page;
  const flash = await readFlash(hrefs.register, param(query.f));
  const typed = flash?.values ?? {};
  return (
    <AuthTemplate
      variant="default"
      screen={{
        kind: "register",
        values: {
          email: typed.email ?? "",
          firstName: typed.firstName ?? "",
          lastName: typed.lastName ?? "",
          phone: typed.phone ?? "",
        },
        loginHref: hrefs.login,
      }}
      copy={authCopy(messages)}
      locale={market.htmlLang}
      action={signUp.bind(null, market.key)}
      errors={authErrorsOf(flash)}
      prefetch={SHELL_PREFETCH}
    />
  );
}
