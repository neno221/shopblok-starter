import { designSystemFixtures, type DesignSystemStrings } from "@shopblok/fixtures";

/**
 * The longest strings of the two locales that break layouts: German (about 30 % longer than
 * English) and Greek (another script, and Inter's Greek subset). Plan T21 step 5: every atom renders
 * a long German and a long Greek label.
 */
export const longLabels: readonly [locale: "de" | "el", strings: DesignSystemStrings][] = [
  ["de", designSystemFixtures.de.long],
  ["el", designSystemFixtures.el.long],
];

/** Classes that would cut a long label instead of wrapping it. */
export const CLIPPING_CLASSES =
  /(?:^|\s)(?:whitespace-nowrap|truncate|line-clamp-\d|text-ellipsis)(?:\s|$)/;
