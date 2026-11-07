// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a). The logo cloud's
// `grid` member: the logos in equal cells of a ruled grid, two across on a phone, three from `md`,
// four from `lg`, each logo centred in its cell at the first member's size. A logo with a link
// makes its whole cell the 44 px target, which opens the brand's site in a new tab and says so. A
// server component.
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import NextImage from "next/image";
import type { LogoCloudSectionProps } from "./standard";

function LogoCloudGrid({ settings, heading, logos, copy, className }: LogoCloudSectionProps) {
  return (
    <SectionFrame
      data-variant="grid"
      settings={settings}
      slot="logo-cloud-section"
      className={className}
      innerClassName="flex flex-col gap-8"
    >
      {heading === undefined ? null : (
        <SectionHeading className="text-lg md:text-xl">{heading}</SectionHeading>
      )}
      <ul className="grid grid-cols-2 border-s border-t md:grid-cols-3 lg:grid-cols-4">
        {logos.map((logo) => {
          const picture = (
            <NextImage
              src={logo.image.src}
              alt={logo.name}
              width={logo.image.width}
              height={logo.image.height}
              sizes="200px"
              className="h-10 w-auto max-w-full object-contain"
            />
          );
          return (
            <li
              key={logo.id}
              data-slot="logo"
              className="flex min-h-28 min-w-0 items-stretch border-e border-b"
            >
              {logo.href === undefined ? (
                <span className="flex w-full items-center justify-center p-6">{picture}</span>
              ) : (
                <a
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center p-6 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
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

export { LogoCloudGrid };
