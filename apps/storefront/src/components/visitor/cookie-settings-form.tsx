import type { Messages } from "@shopblok/i18n";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { saveCookieSettings } from "../../lib/actions/consent";

// M7 D145 (T109): "Cookie settings" without scripts. Every "Cookie settings" link goes to the cookie
// policy at `#cookie-settings`; with scripts the consent island opens its dialog there, and without
// them the page draws this form at that fragment, in `<noscript>` (so a visitor with scripts never
// sees it). The two boxes start unticked (the page is prerendered, the same for everyone, so it
// cannot know the visitor's choice); saving posts to `saveCookieSettings`, which keeps the choice
// in the cookie, records it as the island's choices are (`consent-records`), and comes back to
// `#cookie-settings-saved`, where the "saved" line shows (`:target`, no script). The words are the
// banner's (`organisms.cookieConsent`).

type Words = Messages["organisms"]["cookieConsent"];

export function CookieSettingsForm({ market, words }: { market: string; words: Words }) {
  const box = "mt-1 size-5 shrink-0 accent-primary";
  return (
    <noscript>
      <section
        id="cookie-settings"
        aria-labelledby="cookie-settings-title"
        data-slot="cookie-settings-form"
        className="mx-auto w-full max-w-3xl min-w-0 scroll-mt-24 px-4 pb-12 md:px-6"
      >
        <h2 id="cookie-settings-title" className="text-xl font-semibold wrap-break-word">
          {words.dialogTitle}
        </h2>
        <p className="mt-2 text-sm leading-snug wrap-break-word text-muted-foreground">
          {words.dialogDescription}
        </p>
        <p
          id="cookie-settings-saved"
          role="status"
          className="mt-4 hidden rounded-md border border-border p-3 text-sm wrap-break-word target:block"
        >
          {words.saved}
        </p>
        <form action={saveCookieSettings.bind(null, market)} className="mt-4 flex flex-col gap-4">
          <p className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              checked
              disabled
              aria-describedby="cookie-necessary"
              className={box}
            />
            <span className="min-w-0 wrap-break-word">
              <span className="font-medium">{words.necessary}</span> ({words.alwaysOn})
              <span id="cookie-necessary" className="block text-sm text-muted-foreground">
                {words.necessaryDescription}
              </span>
            </span>
          </p>
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              name="analytics"
              aria-describedby="cookie-analytics"
              className={box}
            />
            <span className="min-w-0 wrap-break-word">
              <span className="font-medium">{words.analytics}</span>
              <span id="cookie-analytics" className="block text-sm text-muted-foreground">
                {words.analyticsDescription}
              </span>
            </span>
          </label>
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              name="marketing"
              aria-describedby="cookie-marketing"
              className={box}
            />
            <span className="min-w-0 wrap-break-word">
              <span className="font-medium">{words.marketing}</span>
              <span id="cookie-marketing" className="block text-sm text-muted-foreground">
                {words.marketingDescription}
              </span>
            </span>
          </label>
          <button type="submit" className={buttonVariants({ className: "min-h-11 self-start" })}>
            {words.save}
          </button>
        </form>
      </section>
    </noscript>
  );
}
