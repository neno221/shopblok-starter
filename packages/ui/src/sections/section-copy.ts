import type { Messages } from "@shopblok/i18n";
import type { ProductCardCopy } from "@shopblok/ui/molecules/product-card/parts";

/** The words of the product cards the commerce sections draw, and of their carousel and grid. */
export type SectionProductsCopy = ProductCardCopy & {
  carousel: Messages["organisms"]["productCarousel"];
  grid: Messages["organisms"]["productGrid"];
};

/**
 * The sections' fixed words (D43), from a whole catalog: `sections` (the video's play button and
 * its provider's note, the commerce blocks' words, the form's words), the newsletter's
 * (NewsletterForm's), and the atoms', molecules' and organisms' that the sections draw (a link's
 * new-tab note, the stars, the cards, the countdown, the code to copy). One object for every
 * section, so `RenderBlocks` builds it once per page.
 */
export type SectionsCopy = {
  newTab: string;
  rating: string;
  video: Messages["sections"]["video"];
  products: SectionProductsCopy;
  countdown: Messages["molecules"]["countdownTimer"];
  copyCode: Messages["molecules"]["copyCodeChip"];
  productCollection: Messages["sections"]["productCollection"];
  featuredProduct: Messages["sections"]["featuredProduct"];
  promoBanner: Messages["sections"]["promoBanner"];
  comparison: Messages["sections"]["comparison"];
  collectionSpotlight: Messages["sections"]["collectionSpotlight"];
  form: Messages["sections"]["form"];
  newsletter: Messages["molecules"]["newsletterForm"];
};

export function sectionsCopy(messages: Messages): SectionsCopy {
  const { atoms, molecules, organisms, sections } = messages;
  return {
    newTab: atoms.link.newTab,
    rating: atoms.rating.label,
    video: sections.video,
    products: {
      card: molecules.productCard,
      priceBlock: molecules.priceBlock,
      carousel: organisms.productCarousel,
      grid: organisms.productGrid,
    },
    countdown: molecules.countdownTimer,
    copyCode: molecules.copyCodeChip,
    productCollection: sections.productCollection,
    featuredProduct: sections.featuredProduct,
    promoBanner: sections.promoBanner,
    comparison: sections.comparison,
    collectionSpotlight: sections.collectionSpotlight,
    form: sections.form,
    newsletter: molecules.newsletterForm,
  };
}
