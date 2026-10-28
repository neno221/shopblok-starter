import {
  parse,
  TYPE,
  type MessageFormatElement,
  type PluralElement,
} from "@formatjs/icu-messageformat-parser";

// The ICU side of the catalogs (D43) and of `ui-strings` (D77): a catalog's messages by their
// dotted path, the arguments of a message and the check that a translation keeps English's. The
// parser is `intl-messageformat`'s own (next-intl formats with it), so a message this accepts is
// one the page can format. A subpath of its own (`@shopblok/i18n/icu`), so code that only needs the
// catalogs does not bundle the parser.

/** What an argument is: `{name}`, `{n, number}`, `{count, plural, …}`, `<b>…</b>` and the rest. */
export type ArgumentKind =
  "argument" | "number" | "date" | "time" | "select" | "plural" | "selectordinal" | "tag";

const kinds: Partial<Record<TYPE, ArgumentKind>> = {
  [TYPE.argument]: "argument",
  [TYPE.number]: "number",
  [TYPE.date]: "date",
  [TYPE.time]: "time",
  [TYPE.select]: "select",
  [TYPE.plural]: "plural",
  [TYPE.tag]: "tag",
};

/** Every message of a catalog (or of one namespace of it), by its dotted path: `atoms.stock.low`. */
export function messagesOf(catalog: object, prefix = ""): Map<string, string> {
  const found = new Map<string, string>();
  for (const [key, value] of Object.entries(catalog)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "string") found.set(path, value);
    else for (const [child, text] of messagesOf(value as object, path)) found.set(child, text);
  }
  return found;
}

/** The arguments of parsed elements and their kinds, with those inside plurals, selects and tags. */
export function argumentsOf(
  elements: MessageFormatElement[],
  into = new Map<string, ArgumentKind>(),
): Map<string, ArgumentKind> {
  for (const element of elements) {
    const kind = kinds[element.type];
    if (kind !== undefined && "value" in element && typeof element.value === "string") {
      const ordinal = element.type === TYPE.plural && element.pluralType === "ordinal";
      into.set(element.value, ordinal ? "selectordinal" : kind);
    }
    if (element.type === TYPE.plural || element.type === TYPE.select)
      for (const option of Object.values(element.options)) argumentsOf(option.value, into);
    if (element.type === TYPE.tag) argumentsOf(element.children, into);
  }
  return into;
}

/** The plural elements of parsed elements, at any depth. */
export function pluralsOf(elements: MessageFormatElement[]): PluralElement[] {
  return elements.flatMap((element) => {
    if (element.type === TYPE.plural)
      return [element, ...Object.values(element.options).flatMap((o) => pluralsOf(o.value))];
    if (element.type === TYPE.select)
      return Object.values(element.options).flatMap((o) => pluralsOf(o.value));
    return element.type === TYPE.tag ? pluralsOf(element.children) : [];
  });
}

/** A message's arguments and their kinds. Throws the parser's error for a message that is not ICU. */
export function messageArguments(message: string): Map<string, ArgumentKind> {
  return argumentsOf(parse(message));
}

const label = (name: string, kind: ArgumentKind) =>
  kind === "tag" ? `<${name}>` : kind === "argument" ? `{${name}}` : `{${name}, ${kind}}`;

/** The arguments as an editor reads them: `{count, plural}, {name}, <link>`; empty for none. */
export function describeArguments(args: ReadonlyMap<string, ArgumentKind>): string {
  return [...args]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, kind]) => label(name, kind))
    .join(", ");
}

/** The parser's error as a sentence: its kind and where it is (`EXPECT_ARGUMENT_CLOSING_BRACE`). */
function parseProblem(error: unknown): string {
  const kind = error instanceof Error ? error.message : String(error);
  const offset = (error as { location?: { start?: { offset?: number } } }).location?.start?.offset;
  return `It is not a valid ICU message (${kind}${offset === undefined ? "" : ` at character ${offset + 1}`}).`;
}

/**
 * Why `value` may not stand in for the English `source` (D77), or `null` when it may: it must parse
 * as ICU and have exactly the source's arguments, each of the same kind, so a translation can never
 * drop `{count}`, invent `{total}` or turn a plural into a plain argument. A `source` that does not
 * parse checks the value's syntax only.
 */
export function messageProblem(value: string, source: string): string | null {
  let theirs: Map<string, ArgumentKind>;
  try {
    theirs = messageArguments(value);
  } catch (error) {
    return parseProblem(error);
  }
  let ours: Map<string, ArgumentKind>;
  try {
    ours = messageArguments(source);
  } catch {
    return null;
  }
  const missing = [...ours].filter(([name]) => !theirs.has(name));
  const unknown = [...theirs].filter(([name]) => !ours.has(name));
  const changed = [...ours].filter(([name, kind]) => theirs.has(name) && theirs.get(name) !== kind);
  if (missing.length === 0 && unknown.length === 0 && changed.length === 0) return null;
  const parts = [
    ...missing.map(([name, kind]) => `${label(name, kind)} is missing`),
    ...unknown.map(([name, kind]) => `${label(name, kind)} is not one of them`),
    ...changed.map(
      ([name, kind]) => `${label(name, theirs.get(name) ?? kind)} should be ${label(name, kind)}`,
    ),
  ];
  const expected = describeArguments(ours);
  return `It must use the English text's arguments (${expected === "" ? "none" : expected}): ${parts.join("; ")}.`;
}
