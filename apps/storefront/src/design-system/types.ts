import type { DesignSystemFixture } from "@shopblok/fixtures";
import type { Locale } from "@shopblok/i18n";
import type { RegistryEntry } from "@shopblok/registry";
import type { ReactNode } from "react";

/**
 * What an entry renders with: the page's locale, that locale's fixtures (its market, strings,
 * prices…) and a formatter for the market's currency. Built by `createContext`.
 */
export type DsContext = {
  locale: Locale;
  fixture: DesignSystemFixture;
  /** An amount in major units, in the market's currency and `<html lang>` formats (D33). */
  money: (amount: number) => string;
};

/** One state of an entry (hover, focus, disabled, invalid, long label…). */
export type DsState = {
  id: string;
  label: string;
  /** One line that says what makes this state different. */
  description?: string;
  render: (ctx: DsContext) => ReactNode;
};

/**
 * What the DS page says about a registry entry and how it renders it (D40): a story, in
 * `stories/`, keyed by the entry's id. The id, group, label and the rest are the registry's.
 */
export type DsStory = {
  /** One sentence under the title. */
  summary: string;
  /** What a keyboard or screen-reader user gets, and what to check. At least one note. */
  a11y: readonly string[];
  /** The live render: what the entry looks like with the locale's fixtures. */
  live: (ctx: DsContext) => ReactNode;
  /** The states matrix: every state on one frame (D34). Foundations have none. */
  states?: readonly DsState[];
  /**
   * How the states are laid out (T35). `grid` (the default) puts them side by side in cards of
   * 14rem or more; `stack` gives each state the frame's whole width, for an organism that spans the
   * page (a header follows the window's breakpoints, so it is drawn as wide as the window).
   */
  statesLayout?: "grid" | "stack";
};

/**
 * One page of the design system, and the bare frame the viewport switcher loads: a registry entry
 * with its story. Its page is at `/design-system/[locale]/{id}`, its frame at
 * `/design-system/[locale]/frame/{id}` and its preview at `/design-system/[locale]/preview/{id}`.
 */
export type DsEntry = RegistryEntry & DsStory;
