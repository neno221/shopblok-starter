import { Href, type SectionLink, type SectionSettings } from "@shopblok/registry/contracts";
import type { z } from "zod";
import { text } from "../../text";
import { resolveLink, type LinkValue } from "../link";
import type { ResolveContext } from "./sections";

// What the content blocks' resolver (`sections.ts`, T63) and the commerce blocks' (`commerce.ts`,
// T64) share: Payload's empty values as "the default", the section settings an editor set, text in
// paragraphs, a link field as a call to action, and the parse with a section's contract. `text` is
// the storefront's (`lib/text.ts`), passed on so both resolvers import their helpers from here.

export { text };

type Defined<T> = { [K in keyof T]: Exclude<T[K], null> };

/** Drops the nulls Payload stores for an empty field, so `undefined` means "the default". */
export function defined<T extends Record<string, unknown>>(
  value: T | null | undefined,
): Partial<Defined<T>> {
  if (value == null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, each]) => each !== null && each !== undefined && each !== ""),
  ) as Partial<Defined<T>>;
}

const SETTINGS = ["anchor", "spacing", "surface", "container", "visibility"] as const;

/** The settings an editor set, and only those: no key for the rest, so a section's own default holds. */
export function settingsOf(block: {
  sectionSettings?: Record<string, unknown> | null;
}): SectionSettings {
  const set = defined(block.sectionSettings);
  return Object.fromEntries(
    SETTINGS.flatMap((key) => (set[key] === undefined ? [] : [[key, set[key]]])),
  ) as SectionSettings;
}

/** A blank line ends a paragraph: LF or CRLF (a textarea sends CRLF), spaces on it allowed. */
export function paragraphs(value: string): string[] {
  return value
    .split(/\r?\n[^\S\r\n]*(?:\r?\n[^\S\r\n]*)+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");
}

/** A `link` field as a section's call to action, or none (nowhere to go, no label, not a page). */
export function sectionLink(
  value: LinkValue | null | undefined,
  context: ResolveContext,
): SectionLink | undefined {
  const resolved = resolveLink(value, context);
  const label = text(resolved?.label);
  // `mailto:` and `tel:` are links the field allows, but not a section's call to action (`Href`).
  if (resolved === null || label === undefined || !Href.safeParse(resolved.href).success)
    return undefined;
  return {
    label,
    href: resolved.href,
    ...(resolved.newTab ? { external: true } : {}),
    ...(resolved.appearance === null
      ? {}
      : { appearance: resolved.appearance as SectionLink["appearance"] }),
  };
}

/** The section's view model, parsed with its contract, or `undefined` when it does not parse. */
export function parsed<T extends z.ZodType>(
  contract: T,
  candidate: unknown,
): z.infer<T> | undefined {
  const result = contract.safeParse(candidate);
  return result.success ? result.data : undefined;
}
