// The design-system pages' own chrome (T22, D33). A developer tool: English only, so it is
// `catalogs.en.designSystem` and the other three catalogs have no such key (`Messages` does not
// have it). What the pages show of an entry (its sample content) is in the chosen locale and comes
// from @shopblok/fixtures; the components' own copy is in the four catalogs (`messages/`).
export const designSystem = {
  title: "Design system",
  skipToContent: "Skip to the content",
  navLabel: "Design system",
  overview: "Overview",
  overviewIntro:
    "Foundations and components of the Shopblok storefront, rendered from the shared tokens and fixtures. Pick a locale to see long strings and the market's currency formats.",
  // The registry's groups (`@shopblok/registry`, `GROUPS`); a group is listed once it has an entry.
  groups: {
    foundations: "Foundations",
    atoms: "Atoms",
    molecules: "Molecules",
    organisms: "Organisms",
    "headers-footers": "Headers and footers",
  },
  locale: {
    label: "Locale",
    current: "current",
  },
  sections: {
    liveRender: "Live render",
    states: "States",
    a11y: "Accessibility notes",
    props: "Props",
    viewports: "Viewports",
  },
  // The "Props" table: an entry's contract as JSON Schema (D41).
  props: {
    caption: "The props this entry shows, from its contract",
    name: "Prop",
    type: "Type",
    required: "Required",
    description: "Description",
    yes: "yes",
    no: "no",
  },
  viewports: {
    all: "All three",
    group: "Preview width",
    scaleNote: "Scaled to fit",
    title: "Preview at",
    openFrame: "Open the frame",
  },
  fixtures: {
    market: "Market",
    currency: "Currency",
  },
};
