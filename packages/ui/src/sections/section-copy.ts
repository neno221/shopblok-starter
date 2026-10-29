import type { Messages } from "@shopblok/i18n";

/**
 * The sections' fixed words (D43), from a whole catalog: `sections` (the video's play button and
 * its provider's note, the form's words), the newsletter's (NewsletterForm's), and the link and
 * rating atoms' that the sections draw. One object for every
 * section, so `RenderBlocks` builds it once per page.
 */
export type SectionsCopy = {
  newTab: string;
  rating: string;
  video: Messages["sections"]["video"];
  form: Messages["sections"]["form"];
  newsletter: Messages["molecules"]["newsletterForm"];
};

export function sectionsCopy(messages: Messages): SectionsCopy {
  return {
    newTab: messages.atoms.link.newTab,
    rating: messages.atoms.rating.label,
    video: messages.sections.video,
    form: messages.sections.form,
    newsletter: messages.molecules.newsletterForm,
  };
}
