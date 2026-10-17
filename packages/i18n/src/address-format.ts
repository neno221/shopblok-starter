// Ours (T34, D48, SETUP.md "Cart, checkout and account molecules (T34)"). A country's address form:
// which of Medusa's address fields it has, in which rows and order, which are required, the postal
// code's pattern and example, and what the country calls its postal code, province and city, from
// Google's address metadata (`address-formats.json`, `address-metadata.ts`). Every country Google
// lists, not only the seeded ones (Principle 10). A country it does not list gets a generic form
// (every field, the street and the city required), never an error. Read on the server: AddressForm
// passes the browser one country's format, not this module's 20 KB.
import data from "./address-formats.json";
import {
  googleDefaults,
  type CityName,
  type CountryAddressData,
  type PostalCodeName,
  type ProvinceName,
} from "./address-metadata";

export type { CityName, PostalCodeName, ProvinceName };

/** Medusa's address fields that a form can show (the contract's `Address`, without its flags). */
export type AddressFieldName =
  | "firstName"
  | "lastName"
  | "company"
  | "address1"
  | "address2"
  | "city"
  | "province"
  | "postalCode";

export type AddressFormat = {
  /** ISO 3166-1 alpha-2 in lower case, as Medusa and the `Address` contract have it. */
  countryCode: string;
  /** False when Google's data does not list the country: the form is the generic one. */
  known: boolean;
  /** The fields, a row a line of the country's format, in its order. */
  rows: AddressFieldName[][];
  /** The fields that must be filled: the name always, the rest per the country. */
  required: AddressFieldName[];
  /** When the form has a postal code: its pattern (for `<input pattern>`), an example, a prefix. */
  postalCode?: {
    /** Google's pattern, matching in either case (the attribute's check is case-sensitive). */
    pattern?: string;
    example?: string;
    /** Written before the code on an envelope (`CH-`): shown beside the field, not typed. */
    prefix?: string;
  };
  /** What the country calls these fields, for their labels. */
  names: { postalCode: PostalCodeName; province: ProvinceName; city: CityName };
};

const formats = data as Record<string, CountryAddressData>;

/** The generic form, for a country Google's data does not list: every field Medusa stores. */
const genericFormat = "%N%n%O%n%A%n%C%n%S %Z";

const fieldOf: Partial<Record<string, AddressFieldName[]>> = {
  N: ["firstName", "lastName"],
  O: ["company"],
  C: ["city"],
  S: ["province"],
  Z: ["postalCode"],
};

const requiredOf: Partial<Record<string, AddressFieldName>> = {
  A: "address1",
  C: "city",
  S: "province",
  Z: "postalCode",
};

/**
 * The rows of a Google format string. `%A` (the street lines) is two rows of its own, line 1 and
 * line 2, and what shares its line follows them. `%D` (a dependent locality) and `%X` (a sorting
 * code) are left out: Medusa's address has no field for them, and no country requires them (a
 * test). Literal text (`〒`, `CH-`) is the envelope's, not the form's.
 */
function rowsOf(format: string): AddressFieldName[][] {
  const rows: AddressFieldName[][] = [];
  for (const line of format.split("%n")) {
    let row: AddressFieldName[] = [];
    for (const [, code] of line.matchAll(/%([A-Z])/g)) {
      if (code === "A") {
        if (row.length > 0) rows.push(row);
        rows.push(["address1"], ["address2"]);
        row = [];
      } else {
        row.push(...(fieldOf[code ?? ""] ?? []));
      }
    }
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

/**
 * Google's postal-code pattern in a form an `<input pattern>` takes: a letter matches in either
 * case (a reader types "ec1y 8sy"; the server normalises it), checked to compile under the `v`
 * flag the attribute uses. `undefined` when it does not compile: the server's check is enough.
 */
export function postalCodePattern(pattern: string): string | undefined {
  let out = "";
  let inClass = false;
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] ?? "";
    if (char === "\\") {
      out += char + (pattern[index + 1] ?? "");
      index += 1;
    } else if (inClass) {
      if (char === "]") {
        inClass = false;
        out += char;
      } else if (
        /[A-Z]/.test(char) &&
        pattern[index + 1] === "-" &&
        /[A-Z]/.test(pattern[index + 2] ?? "")
      ) {
        const end = pattern[index + 2] ?? "";
        out += `${char}-${end}${char.toLowerCase()}-${end.toLowerCase()}`;
        index += 2;
      } else {
        out += /[A-Z]/.test(char) ? char + char.toLowerCase() : char;
      }
    } else if (char === "[") {
      inClass = true;
      out += char;
    } else {
      out += /[A-Z]/.test(char) ? `[${char}${char.toLowerCase()}]` : char;
    }
  }
  try {
    new RegExp(`^(?:${out})$`, "v");
    return out;
  } catch {
    return undefined;
  }
}

const baseLanguage = (tag: string | undefined) => tag?.split("-")[0]?.toLowerCase();

/**
 * The format string for a page in `language`: where Google gives a Latin-script order (Japan,
 * China, Korea), a page in another language than the country's uses it.
 */
function formatStringOf(entry: CountryAddressData | undefined, language?: string): string {
  if (entry === undefined) return genericFormat;
  return entry.lfmt !== undefined &&
    entry.lang !== undefined &&
    language !== undefined &&
    baseLanguage(language) !== baseLanguage(entry.lang)
    ? entry.lfmt
    : (entry.fmt ?? googleDefaults.fmt);
}

/**
 * The address form of `countryCode` (either case), for a page in `language` (an ISO 639-1 code or
 * a BCP 47 tag: `el-CY`). Where Google gives a Latin-script order (Japan, China, Korea), a page in
 * another language than the country's uses it.
 */
export function addressFormat(countryCode: string, language?: string): AddressFormat {
  const code = countryCode.toUpperCase();
  const entry = formats[code];
  const format = formatStringOf(entry, language);
  const rows = rowsOf(format);
  const fields = new Set(rows.flat());
  const required = new Set<AddressFieldName>(["firstName", "lastName"]);
  for (const letter of entry?.require ?? googleDefaults.require) {
    const field = requiredOf[letter];
    if (field !== undefined && fields.has(field)) required.add(field);
  }
  const result: AddressFormat = {
    countryCode: code.toLowerCase(),
    known: entry !== undefined,
    rows,
    required: rows.flat().filter((field) => required.has(field)),
    names: {
      postalCode: entry?.postalCodeName ?? googleDefaults.postalCodeName,
      province: entry?.provinceName ?? googleDefaults.provinceName,
      city: entry?.cityName ?? googleDefaults.cityName,
    },
  };
  if (fields.has("postalCode")) {
    const pattern = entry?.zip === undefined ? undefined : postalCodePattern(entry.zip);
    result.postalCode = {
      ...(pattern === undefined ? {} : { pattern }),
      ...(entry?.zipex === undefined ? {} : { example: entry.zipex }),
      ...(entry?.postprefix === undefined ? {} : { prefix: entry.postprefix }),
    };
  }
  return result;
}

/** Whether Google's data lists the country (either case). */
export function hasAddressFormat(countryCode: string): boolean {
  return formats[countryCode.toUpperCase()] !== undefined;
}

export type AddressLineKind = "name" | "company" | "street" | "locality";

/** One printed line of an address: its text, and what it holds (a card may set the name apart). */
export type AddressLine = { kind: AddressLineKind; text: string };

/** What `addressLines` reads: Medusa's address fields, each of which may be missing. */
export type AddressLinesInput = { countryCode: string } & Partial<
  Record<AddressFieldName, string | undefined>
>;

type FormatPart = { literal: string } | { code: string };

/** A line of a Google format string as literals and `%X` codes: `%C, %S %Z` is three codes and two literals. */
function partsOf(line: string): FormatPart[] {
  return line
    .split(/(%[A-Z])/)
    .filter((piece) => piece !== "")
    .map((piece) => (/^%[A-Z]$/.test(piece) ? { code: piece.slice(1) } : { literal: piece }));
}

function valueOf(code: string, address: AddressLinesInput): string {
  const text = (value: string | undefined) => value?.trim() ?? "";
  switch (code) {
    case "N":
      return [text(address.firstName), text(address.lastName)].filter(Boolean).join(" ");
    case "O":
      return text(address.company);
    case "A":
      return [text(address.address1), text(address.address2)].filter(Boolean).join("\n");
    case "C":
      return text(address.city);
    case "S":
      return text(address.province);
    case "Z":
      return text(address.postalCode);
    // `%D` (a dependent locality) and `%X` (a sorting code): Medusa's address has neither.
    default:
      return "";
  }
}

/**
 * An address as the lines an envelope has in its country's order, with Google's separators
 * (`%C, %S %Z` prints "Brooklyn, NY 11215") for a page in `language` (as in `addressFormat`). The
 * country's name and the phone are not here: the caller writes them in the page's language. A
 * field the address lacks takes its separator with it ("Brooklyn 11215", "São Paulo", "Zürich"
 * without the `CH-` prefix); a line that ends up empty is left out, and so is a line that is only
 * the country's name in capitals (`ÅLAND`), which the caller's country line says already.
 */
export function addressLines(address: AddressLinesInput, language?: string): AddressLine[] {
  const lines: AddressLine[] = [];
  const entry = formats[address.countryCode.toUpperCase()];
  for (const template of formatStringOf(entry, language).split("%n")) {
    const parts = partsOf(template);
    const codes = parts.flatMap((part) => ("code" in part ? [part.code] : []));
    if (codes.length === 0) continue;
    const kind: AddressLineKind = codes.includes("N")
      ? "name"
      : codes.includes("O")
        ? "company"
        : codes.includes("A")
          ? "street"
          : "locality";
    const texts = parts.map((part) =>
      "literal" in part ? part.literal : valueOf(part.code, address),
    );
    // An empty field goes with the literal before it, or after it when it comes first in the line.
    const dropped = new Set<number>();
    parts.forEach((part, index) => {
      if (!("code" in part) || texts[index] !== "") return;
      dropped.add(index);
      const before = parts[index - 1];
      const after = parts[index + 1];
      if (before !== undefined && "literal" in before) dropped.add(index - 1);
      else if (after !== undefined && "literal" in after) dropped.add(index + 1);
    });
    const text = texts.filter((_, index) => !dropped.has(index)).join("");
    for (const piece of text.split("\n")) {
      if (piece.trim() !== "") lines.push({ kind, text: piece.trim() });
    }
  }
  return lines;
}
