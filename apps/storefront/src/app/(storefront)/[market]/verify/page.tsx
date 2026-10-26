import { AuthTemplate, authCopy } from "@shopblok/ui/templates/auth";
import type { Metadata } from "next";
import { connection } from "next/server";
import { sendVerificationAgain, signIn } from "../../../../lib/actions/auth";
import { authMetadata, authPageContext, param } from "../../../../lib/auth-page";
import { readFlash } from "../../../../lib/flash";
import { confirmVerification, pendingVerification } from "../../../../lib/medusa/customer";
import { SHELL_PREFETCH } from "../../../../lib/site";

// D64 (T53): the e-mail's verification. With `?code=` (the link T44's subscriber e-mails) the page
// only confirms the code and draws the sign-in with the address filled in and "verified, sign in":
// the link is a cross-site navigation, on which the `strict` pending cookie does not arrive, and
// the page holds no password, so the account is created by that sign-in (`completeLogin`). A code
// Medusa refuses is a link that no longer works. Without a code it is the e-mail to check, for the
// address this browser waits on, with "send a new link" (the token the login left in the pending
// cookie, never one from the form); with none, the sign-in. Dynamic and blocking; `noindex`.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return authMetadata((auth) => auth.checkEmail.title);
}

export default async function VerifyPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, authPageContext()]);
  const { market, messages, hrefs } = page;
  const shared = { copy: authCopy(messages), locale: market.htmlLang, prefetch: SHELL_PREFETCH };
  const code = param(query.code);
  if (code !== undefined && code !== "" && code.length <= 512) {
    const email = await confirmVerification(code);
    if (email === null)
      return (
        <AuthTemplate
          variant="default"
          screen={{ kind: "link-expired", link: "verify", restartHref: hrefs.login }}
          {...shared}
        />
      );
    return (
      <AuthTemplate
        variant="default"
        screen={{
          kind: "login",
          email,
          notice: "verified",
          registerHref: hrefs.register,
          forgotHref: hrefs.forgot,
        }}
        action={signIn.bind(null, market.key)}
        {...shared}
      />
    );
  }
  // The wait before another link counts from now: this request's, never a prerender's.
  await connection();
  const pending = await pendingVerification();
  const flash = await readFlash(hrefs.verify, param(query.f));
  if (pending === null)
    return (
      <AuthTemplate
        variant="default"
        screen={{
          kind: "login",
          email: "",
          registerHref: hrefs.register,
          forgotHref: hrefs.forgot,
        }}
        action={signIn.bind(null, market.key)}
        {...shared}
      />
    );
  return (
    <AuthTemplate
      variant="default"
      screen={{
        kind: "check-email",
        verification: { email: pending.email, resendInSeconds: pending.resendInSeconds },
        loginHref: hrefs.login,
      }}
      resendAction={sendVerificationAgain.bind(null, market.key)}
      verificationStatus={
        flash?.form !== undefined ? "error" : param(query.resent) === "1" ? "resent" : "sent"
      }
      {...shared}
    />
  );
}
