import { AuthTemplate, authCopy } from "@shopblok/ui/templates/auth";
import type { Metadata } from "next";
import { z } from "zod";
import { saveNewPassword } from "../../../../lib/actions/auth";
import { authErrorsOf, authMetadata, authPageContext, param } from "../../../../lib/auth-page";
import { readFlash } from "../../../../lib/flash";
import { SHELL_PREFETCH } from "../../../../lib/site";

// D64 (T53): choose a new password, from the reset link T44's subscriber e-mails
// (`?token=…&email=…`). The form posts the token and the address in hidden fields to
// `saveNewPassword`, which goes on to the sign-in ("your password has been changed"); a token
// Medusa refuses comes back as `?expired=1`, a link that no longer works, as does a link without its
// token or address. Dynamic and blocking; `noindex`.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return authMetadata((auth) => auth.reset.title);
}

const link = z.object({
  token: z.string().min(1).max(2048),
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export default async function ResetPasswordPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, authPageContext()]);
  const { market, messages, context, hrefs } = page;
  const path = context.url("/reset-password");
  const flash = await readFlash(path, param(query.f));
  const shared = { copy: authCopy(messages), locale: market.htmlLang, prefetch: SHELL_PREFETCH };
  const parsed = link.safeParse({ token: param(query.token), email: param(query.email) });
  if (param(query.expired) === "1" || !parsed.success)
    return (
      <AuthTemplate
        variant="default"
        screen={{ kind: "link-expired", link: "reset", restartHref: hrefs.forgot }}
        {...shared}
      />
    );
  return (
    <AuthTemplate
      variant="default"
      screen={{ kind: "reset", ...parsed.data, loginHref: hrefs.login }}
      action={saveNewPassword.bind(null, market.key)}
      errors={authErrorsOf(flash)}
      {...shared}
    />
  );
}
