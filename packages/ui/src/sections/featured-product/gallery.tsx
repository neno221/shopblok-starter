// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The featured product's
// `gallery` member: the product's pictures as a small gallery (the first large, up to four more in a
// row under it) beside its name, its price, the editor's words and the way to its page; on a phone
// the gallery is above them. The pictures are all drawn at once and nothing has to be pressed to see
// them, so it works without scripts and holds no state; each keeps its alternative text (the
// product's name, or the editor's for the editor's picture, which comes first). The contract refuses
// the member without its pictures. A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { FeaturedProductDetails } from "./parts";
import type { FeaturedProductSectionProps } from "./standard";

function FeaturedProductGallery({
  settings,
  heading,
  product,
  image,
  gallery,
  text,
  copy,
  locale,
  prefetch,
  className,
}: FeaturedProductSectionProps) {
  const [main = image, ...more] = gallery ?? [image];
  return (
    <SectionFrame
      data-variant="gallery"
      settings={settings}
      slot="featured-product-section"
      className={className}
      innerClassName="grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-12"
    >
      <div data-slot="featured-product-gallery" className="flex min-w-0 flex-col gap-3">
        <Image
          src={main.src}
          alt={main.alt}
          ratio="square"
          radius="xl"
          sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
          className="w-full"
        />
        {more.length === 0 ? null : (
          <ul className="grid grid-cols-4 gap-3">
            {more.slice(0, 4).map((picture, index) => (
              <li key={`${index} ${picture.src}`} className="min-w-0">
                <Image
                  src={picture.src}
                  alt={picture.alt}
                  ratio="square"
                  radius="lg"
                  sizes="(min-width: 1280px) 150px, (min-width: 768px) 12vw, 25vw"
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <FeaturedProductDetails
        heading={heading}
        product={product}
        text={text}
        copy={copy}
        locale={locale}
        prefetch={prefetch}
        className="md:sticky md:top-24"
      />
    </SectionFrame>
  );
}

export { FeaturedProductGallery };
