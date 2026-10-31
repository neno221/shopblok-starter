import en from "./json/en.json" with { type: "json" };

// The namespace `markets`: the panels read it with `useTranslation("markets")`, so no key can
// collide with Medusa's own `translation` namespace or another plugin's.
export default {
  en: {
    markets: en,
  },
};
