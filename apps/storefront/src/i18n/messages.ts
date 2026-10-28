import { catalogs, DEFAULT_LOCALE, isLocale, type Locale, type Messages } from "@shopblok/i18n";
import { messageProblem, messagesOf } from "@shopblok/i18n/icu";
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

/** What `holder` has at `key`, as its own property; `undefined` when it has none. */
function own(holder: unknown, key: string): unknown {
  return isNamespace(holder) && Object.hasOwn(holder, key) ? holder[key] : undefined;
}

function valueAt(messages: Messages, keys: string[]): unknown {
  let held: unknown = messages;
  for (const key of keys) held = own(held, key);
  return held;
}

/**
 * A copy of `value` in which every message it lacks is the fallback's. A namespace is filled key by
 * key, so one missing line inside `"molecules.cartLineItem"` costs that line only.
 */
function fill(
  value: unknown,
  fallback: unknown,
  path: string,
  onFallback: ((path: string) => void) | undefined,
): unknown {
  if (value === undefined) {
    onFallback?.(path);
    return clone(fallback);
  }
  if (!isNamespace(value) || !isNamespace(fallback)) return clone(value);
  const filled: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(value), ...Object.keys(fallback)])) {
    filled[key] = fill(own(value, key), own(fallback, key), `${path}.${key}`, onFallback);
  }
  return filled;
}

export type PickOptions = {
  /** Read a message the catalog lacks from here (the English catalog) instead of throwing. */
  fallback?: Messages;
  /** Called with the dotted path of each message the fallback supplied. */
  onFallback?: (path: string) => void;
};

/**
 * The part of the request's messages a client island needs (D62). `NextIntlClientProvider` given no
 * `messages` sends the whole catalog to the browser, so every provider in this app gets
 * `pick(messages, [...])` instead, and a page ships the namespaces of the islands it renders, not
 * the four catalogs. A path names one message (`"templates.error.body"`) or a namespace
 * (`"molecules.cartLineItem"`); the result is a copy, so what a client component receives can never
 * be the catalog's own object.
 *
 * A path that holds nothing throws: a typo would otherwise ship an island with no text and no error
 * (`MessagePath` catches it at compile time for the English shape; this catches the other
 * catalogs, a `ui-strings` source in M4 and a path from a variable). That is right for a test and
 * for development, and wrong in the root layout, where a throw is a 500 for every page in that
 * language (PR 70 review, item 2): there `options.fallback` supplies the English message instead,
 * and `onFallback` says which (`pickShell`). A path the fallback lacks too still throws.
 */
export function pick(
  messages: Messages,
  paths: readonly MessagePath[],
  options: PickOptions = {},
): AbstractIntlMessages {
  const picked: Record<string, unknown> = {};
  for (const path of paths) {
    const keys = path.split(".");
    const held = valueAt(messages, keys);
    const spare = options.fallback === undefined ? undefined : valueAt(options.fallback, keys);
    if (held === undefined && spare === undefined) {
      throw new Error(`pick: there is no message at "${path}"`);
    }
    place(picked, keys, fill(held, spare, path, options.onFallback));
  }
  return picked as AbstractIntlMessages;
}

/**
 * What the market layout gives its provider: the client code that renders on every page and reads
 * the catalog itself. That is the error boundary's `error` template (`error.tsx`, T48); the header's
 * and the cookie banner's islands are given their words as props by the server. A page that renders
 * an island nests its own provider with its own `pick`.
 */
export const SHELL_MESSAGES = [
  "templates.error.title",
  "templates.error.body",
  "templates.error.retry",
  "templates.error.home",
] as const satisfies readonly MessagePath[];

const reported = new Set<string>();

/**
 * `SHELL_MESSAGES` of `messages` for the root layout's provider: where the catalog of `locale`
 * lacks a message, the English one, with one warning per language and path for the life of the
 * server. The layout cannot throw (a 500 on every page of the language, outside every error
 * boundary), and a shell line in English beats a key on the screen.
 */
export function pickShell(messages: Messages, locale: Locale): AbstractIntlMessages {
  return pick(messages, SHELL_MESSAGES, {
    fallback: catalogs[DEFAULT_LOCALE],
    onFallback: (path) => {
      const key = `${locale}:${path}`;
      if (reported.has(key)) return;
      reported.add(key);
      console.warn(
        `i18n: the ${locale} catalog has no message at "${path}"; the shell shows the English one`,
      );
    },
  });
}

// ---- ui-strings (D77) ------------------------------------------------------------------------

/** One `ui-strings` row as the loader reads it: the key and the value in the market's language. */
export type UiStringRow = { key: string; value?: string | null };

/** Edited messages that differ from the code's, by dotted path: what a language's read keeps. */
export type UiStringOverrides = Record<string, string>;

const flat = new Map<Locale, Map<string, string>>();

/**
 * The shop's messages of a code catalog by dotted path, the design-system chrome left out (it is
 * English only and no `ui-strings` key, D33). Worked out once per language and process.
 */
export function codeMessages(locale: Locale): ReadonlyMap<string, string> {
  let messages = flat.get(locale);
  if (messages === undefined) {
    const { designSystem: _chrome, ...shop } = catalogs[locale] as Messages & {
      designSystem?: unknown;
    };
    messages = messagesOf(shop);
    flat.set(locale, messages);
  }
  return messages;
}

/** The catalog a market language's copy starts from: its own, or English for one with none (D62). */
export const catalogLocale = (language: string): Locale =>
  isLocale(language) ? language : DEFAULT_LOCALE;

const skipped = new Set<string>();

/**
 * The rows of one language's `ui-strings` read that change what the page shows (D77): a value that
 * is set, differs from the code catalog's message and passes the ICU check against the code's
 * English. A key the code no longer has is ignored; a value that fails the check falls back to the
 * code, with one warning per language, key and value for the life of the server, so a broken
 * translation never reaches a page. The cached read keeps only these (usually none), so a request
 * parses nothing.
 */
export function uiStringOverrides(
  language: string,
  rows: readonly UiStringRow[],
  warn: (message: string) => void = console.warn,
): UiStringOverrides {
  const code = codeMessages(catalogLocale(language));
  const english = codeMessages(DEFAULT_LOCALE);
  const overrides: UiStringOverrides = {};
  for (const { key, value } of rows) {
    const source = english.get(key);
    if (source === undefined || value === undefined || value === null || value === "") continue;
    if (value === code.get(key)) continue;
    const problem = messageProblem(value, source);
    if (problem === null) {
      overrides[key] = value;
      continue;
    }
    const seen = `${language}:${key}:${value}`;
    if (skipped.has(seen)) continue;
    skipped.add(seen);
    warn(`ui-strings: the ${language} value of "${key}" is not used, the code's is. ${problem}`);
  }
  return overrides;
}

/**
 * The messages next-intl gets (D77): the code catalog with the edited values put in their place.
 * With none it is the catalog itself, as before `ui-strings`; otherwise a copy, so the catalog
 * every request shares is never changed.
 */
export function withOverrides(catalog: Messages, overrides: UiStringOverrides): Messages {
  const keys = Object.keys(overrides);
  if (keys.length === 0) return catalog;
  const merged = clone(catalog) as Record<string, unknown>;
  for (const key of keys) {
    const path = key.split(".");
    const last = path.pop();
    let holder: unknown = merged;
    for (const segment of path) holder = own(holder, segment);
    if (last !== undefined && isNamespace(holder) && typeof own(holder, last) === "string") {
      holder[last] = overrides[key];
    }
  }
  return merged as Messages;
}
