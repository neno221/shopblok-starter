import type { Messages } from "@shopblok/i18n";
import type { AbstractIntlMessages } from "next-intl";

/** A dotted path to a message or to a whole namespace of `Messages`: `"molecules.cartLineItem"`. */
type PathsOf<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : K | `${K}.${PathsOf<T[K]>}`;
    }[keyof T & string];

export type MessagePath = PathsOf<Messages>;

function isNamespace(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clone(value: unknown): unknown {
  return isNamespace(value)
    ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)]))
    : value;
}

/** Puts `value` at `keys` inside `target`, joining it with what an earlier path already put there. */
function place(target: Record<string, unknown>, keys: string[], value: unknown): void {
  const [key, ...rest] = keys;
  if (key === undefined) return;
  const held = target[key];
  if (rest.length === 0) {
    target[key] = isNamespace(held) && isNamespace(value) ? merge(held, value) : value;
    return;
  }
  const branch = isNamespace(held) ? held : {};
  target[key] = branch;
  place(branch, rest, value);
}

function merge(
  into: Record<string, unknown>,
  from: Record<string, unknown>,
): Record<string, unknown> {
  for (const [key, child] of Object.entries(from)) place(into, [key], child);
  return into;
}

/**
 * The part of the request's messages a client island needs (D62). `NextIntlClientProvider` given no
 * `messages` sends the whole catalog to the browser, so every provider in this app gets
 * `pick(messages, [...])` instead, and a page ships the namespaces of the islands it renders, not
 * the four catalogs. A path names one message (`"wiring.backendHint"`) or a namespace
 * (`"molecules.cartLineItem"`); the result is a copy, so what a client component receives can never
 * be the catalog's own object. A path that holds nothing throws: a typo would otherwise ship an
 * island with no text and no error (`MessagePath` catches it at compile time for the English shape;
 * this catches the other catalogs, a `ui-strings` source in M4 and a path from a variable).
 */
export function pick(messages: Messages, paths: readonly MessagePath[]): AbstractIntlMessages {
  const picked: Record<string, unknown> = {};
  for (const path of paths) {
    const keys = path.split(".");
    let held: unknown = messages;
    for (const key of keys) {
      if (!isNamespace(held) || !Object.hasOwn(held, key)) {
        throw new Error(`pick: there is no message at "${path}"`);
      }
      held = held[key];
    }
    place(picked, keys, clone(held));
  }
  return picked as AbstractIntlMessages;
}

/**
 * What the market layout gives its provider: the client code that renders on every page. Today that
 * is the error boundary's two lines (`error.tsx` reads them with `useTranslations("wiring")`); T48
 * adds the header's and the cookie banner's namespaces when it builds them. A page that renders an
 * island nests its own provider with its own `pick`.
 */
export const SHELL_MESSAGES = [
  "wiring.backendUnavailable",
  "wiring.backendHint",
] as const satisfies readonly MessagePath[];
