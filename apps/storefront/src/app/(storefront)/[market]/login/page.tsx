import { AuthTemplate, authCopy } from "@shopblok/ui/templates/auth";
import type { Metadata } from "next";
import { signIn } from "../../../../lib/actions/auth";
import { safeNext } from "../../../../lib/actions/auth-forms";
import { authErrorsOf, authMetadata, authPageContext, param } from "../../../../lib/auth-page";
import { readFlash } from "../../../../lib/flash";
import { SHELL_PREFETCH } from "../../../../lib/site";

// D64 (T53): sign in. The form posts to `signIn` (`lib/actions/auth-forms.ts`), which goes on to
// the account (or to the page `next` names), to the e-mail to check for an address not verified
// yet, or back here with the answer in a flash (`?f=`). `?notice=` says what led here (a sign-out,
// a new password). Dynamic and blocking (`instant = false`): the form is in the HTML, which a
// browser without scripts needs. `noindex`.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return authMetadata((auth) => auth.login.title);
}

const NOTICES = new Set(["signed-out", "password-reset"] as const);

export default async function LoginPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, authPageContext()]);
  const { market, messages, hrefs } = page;
  const flash = await readFlash(hrefs.login, param(query.f));
  const notice = param(query.notice) as "signed-out" | "password-reset" | undefined;
  const next = safeNext(flash?.values?.next ?? param(query.next), "");
  return (
    <AuthTemplate
      variant="default"
      screen={{
        kind: "login",
        email: flash?.values?.email ?? "",
        ...(notice !== undefined && NOTICES.has(notice) ? { notice } : {}),
        ...(next === "" ? {} : { next }),
        registerHref: hrefs.register,
        forgotHref: hrefs.forgot,
      }}
      copy={authCopy(messages)}
      locale={market.htmlLang}
      action={signIn.bind(null, market.key)}
      errors={authErrorsOf(flash)}
      prefetch={SHELL_PREFETCH}
    />
  );
}
