// Ours (T67, SETUP.md "Forms (T67)"; SPEC §7.4 `newsletter`, D81). The newsletter signup as a band of
// a page: NewsletterForm (one email field, the consent sentence with the privacy link, the four
// states) inside the section's frame, narrow by default, under the editor's heading and line, or the
// catalog's when they are empty. It posts what the shop's server action takes (`action`), so it works
// before any script runs; the status, the address typed back and the spam trap (`hiddenFields`) are the
// caller's, as NewsletterForm's are. A server component; the shop draws it from an island that keeps
// the action's answer.
import type { NewsletterSection as NewsletterSectionData } from "@shopblok/registry/contracts";
import { NewsletterForm, type NewsletterFormProps } from "@shopblok/ui/molecules/newsletter-form";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";

type NewsletterSectionProps = NewsletterSectionData &
  Pick<NewsletterFormProps, "action" | "status" | "fieldName" | "hiddenFields" | "prefetch"> & {
    copy: Pick<SectionsCopy, "newsletter">;
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The form's `id`, for a link to it (the no-script answer scrolls back to it). */
    formId?: string;
    className?: string;
  };

function NewsletterSection({
  settings,
  heading,
  text,
  newsletter,
  copy,
  locale,
  formId,
  className,
  ...form
}: NewsletterSectionProps) {
  return (
    <SectionFrame
      settings={{ ...settings, container: settings?.container ?? "narrow" }}
      slot="newsletter-section"
      className={className}
    >
      <NewsletterForm
        id={formId}
        newsletter={newsletter}
        copy={{
          ...copy.newsletter,
          title: heading ?? copy.newsletter.title,
          description: text ?? copy.newsletter.description,
        }}
        locale={locale}
        headingLevel={2}
        {...form}
      />
    </SectionFrame>
  );
}

export { NewsletterSection };
export type { NewsletterSectionProps };
