// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.4 `logoCloud`). Logos in rows that wrap and centre:
// the brands a shop sells or the press that wrote about it. Each picture is named by the brand
// (its `alt`), drawn 40 px tall at its own proportions; a logo with a link is a 44 px target that
// opens the brand's site in a new tab and says so. A server component.
import type { LogoCloudSection as LogoCloudSectionData } from "@shopblok/registry/contracts";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import NextImage from "next/image";

type LogoCloudSectionProps = LogoCloudSectionData & {
  copy: Pick<SectionsCopy, "newTab">;
  className?: string;
};

function LogoCloudSection({ settings, heading, logos, copy, className }: LogoCloudSectionProps) {
  return (
    <SectionFrame
      settings={settings}
      slot="logo-cloud-section"
      className={className}
      innerClassName="flex flex-col items-center gap-8"
    >
      {heading === undefined ? null : (
        <SectionHeading className="text-center text-lg md:text-xl">{heading}</SectionHeading>
      )}
      <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
        {logos.map((logo) => {
          const picture = (
            <NextImage
              src={logo.image.src}
              alt={logo.name}
              width={logo.image.width}
              height={logo.image.height}
              sizes="200px"
              className="h-10 w-auto max-w-48 object-contain"
            />
          );
          return (
            <li key={logo.id} data-slot="logo" className="flex min-w-0 items-center">
              {logo.href === undefined ? (
                picture
              ) : (
                <a
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 min-w-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
                >
                  {picture}
                  <VisuallyHidden> ({copy.newTab})</VisuallyHidden>
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </SectionFrame>
  );
}

export { LogoCloudSection };
export type { LogoCloudSectionProps };
