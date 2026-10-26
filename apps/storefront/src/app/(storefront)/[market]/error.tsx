"use client";

import { Button } from "@shopblok/ui/atoms/button";
import { ErrorTemplate } from "@shopblok/ui/templates/error";
import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { useShellLinks } from "../../../components/shell/shell-context";
import { SHELL_PREFETCH } from "../../../lib/site";

// Shown inside the market's layout when a page throws while it renders, M0's case being Medusa or
// Payload's database down. D66 (T48): the `error` template, which says nothing about the error. In
// production a server error's message never reaches the browser (it would read "Minified React
// error #441"), only a digest that is also in the server log, beside the real message
// (`MedusaRequestError: Medusa at … did not answer`); a shopper can do nothing with either. "Try
// again" is the boundary's `retry()`, which renders the segment again. `unstable_rethrow` hands
// Next's own errors (`notFound()`, `redirect()`, a bail-out) back to Next, should one arrive here.
//
// D62: the words come from the layout's provider (`SHELL_MESSAGES`, `templates.error`), in the
// market's language; importing `catalogs` would put all four catalogs in every page's JavaScript.
// The home link is the layout's (`shell-context.tsx`): a client component reads no root param.
export default function MarketError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  unstable_rethrow(error);
  const t = useTranslations("templates.error");
  const copy = { title: t("title"), body: t("body"), retry: t("retry"), home: t("home") };
  const { home } = useShellLinks();
  return (
    <ErrorTemplate
      homeHref={home}
      copy={copy}
      prefetch={SHELL_PREFETCH}
      retry={
        <Button size="lg" data-slot="error-retry" onClick={() => retry()}>
          {copy.retry}
        </Button>
      }
    />
  );
}
