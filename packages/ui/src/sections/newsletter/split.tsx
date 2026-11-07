// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D81). The
// newsletter's `split` member: the editor's picture beside the signup, the form on the end side
// from `md` and under the picture on a phone, on a card the picture shares an edge with. The form is
// the first member's NewsletterForm (one email field, the consent sentence with the privacy link,
// the four states), posting the shop's server action without a script. The contract refuses this
// member without a picture. A server component; the shop draws it from the same island as the
// first member.
import { Image } from "@shopblok/ui/atoms/image";
import { NewsletterForm } from "@shopblok/ui/molecules/newsletter-form";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import type { NewsletterSectionProps } from "./standard";

function NewsletterSplit({
  settings,
  heading,
  text,
  image,
  newsletter,
  copy,
  locale,
  formId,
  className,
  ...form
}: NewsletterSectionProps) {
  return (
    <SectionFrame
      data-variant="split"
      settings={settings}
      slot="newsletter-section"
      className={className}
    >
      <div className="grid grid-cols-1 overflow-hidden rounded-xl border bg-card text-card-foreground md:grid-cols-2">
        {image === undefined ? null : (
          <Image
            src={image.src}
            alt={image.alt}
            radius="none"
            sizes="(min-width: 1280px) 640px, (min-width: 768px) 50vw, 100vw"
            ratio="landscape"
            className="w-full md:aspect-auto md:h-full md:min-h-80"
            data-slot="newsletter-image"
          />
        )}
        <div className="flex min-w-0 items-center p-6 md:p-10">
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
        </div>
      </div>
    </SectionFrame>
  );
}

export { NewsletterSplit };
