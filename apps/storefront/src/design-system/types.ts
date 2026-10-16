import type { DesignSystemFixture } from "@shopblok/fixtures";
import type { Locale } from "@shopblok/i18n";
import type { ReactNode } from "react";

/** The groups of the navigation tree. A group with no entry is not listed (T22 step 1). */
export type DsGroupId = "foundations" | "atoms";

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
 * One page of the design system, and the bare frame the viewport switcher loads. M2's registry
 * (`@shopblok/registry`) replaces this manifest; until then a new entry is one object in
 * `entries.tsx`.
 */
export type DsEntry = {
  /**
   * The path below `/design-system/[locale]/`, `{group}/{slug}`: lowercase letters, digits and
   * hyphens. The frame is at `/design-system/[locale]/frame/{id}`.
   */
  id: string;
  group: DsGroupId;
  /** The navigation label and the page title. The chrome is English (D33). */
  label: string;
  /** One sentence under the title. */
  summary: string;
  /** What a keyboard or screen-reader user gets, and what to check. At least one note. */
  a11y: readonly string[];
  /** The live render: what the entry looks like with the locale's fixtures. */
  live: (ctx: DsContext) => ReactNode;
  /** The states matrix: every state on one frame (D34). Foundations have none. */
  states?: readonly DsState[];
};
