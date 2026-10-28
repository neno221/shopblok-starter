import type { SeedModule } from "./types";

/**
 * The shop's home page (D80): created here with its title and slug in the seeded markets' four
 * languages; T65 gives it M3's home as blocks and T61 makes it `site-settings.homepage`.
 */
export const pagesSeed: SeedModule = {
  collection: "pages",
  documents: () => [
    {
      key: "home",
      publish: true,
      localized: {
        title: {
          en: { value: "Home" },
          el: { value: "Αρχική" },
          de: { value: "Startseite" },
          fr: { value: "Accueil" },
        },
        slug: {
          en: { value: "home" },
          el: { value: "arxiki" },
          de: { value: "startseite" },
          fr: { value: "accueil" },
        },
      },
    },
  ],
};
