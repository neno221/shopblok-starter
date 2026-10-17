// Ours (T34, D48, SETUP.md "Cart, checkout and account molecules (T34)"). The part of Google's
// address metadata (libaddressinput's, as `lib-address` 0.7.0 ships it, one JSON file per country)
// that AddressForm uses: the field order, the required fields, the postal-code pattern and an
// example, and what the country calls its postal code, its province and its city. The script
// `scripts/address-formats.ts` writes every country's entry to `address-formats.json` with
// `compactAddressData`, and a test compares that file with the package, so the data cannot drift
// from the pinned version. No imports: the script runs this file under Node's type stripping.

/** What a country calls its postal code (Google's `zip_name_type`). */
export type PostalCodeName = "postal" | "zip" | "pin" | "eircode";

/** What a country calls its first-level division (Google's `state_name_type`). */
export type ProvinceName =
  | "area"
  | "county"
  | "department"
  | "district"
  | "do_si"
  | "emirate"
  | "island"
  | "oblast"
  | "parish"
  | "prefecture"
  | "province"
  | "region"
  | "state";

/** What a country calls its city or town (Google's `locality_name_type`). */
export type CityName = "city" | "district" | "post_town" | "suburb";

/** One country's file in `lib-address/countries/`, the fields read here. */
export type GoogleAddressData = {
  key: string;
  /** The order, in the country's own script: `%N` name, `%O` organisation, `%A` street lines, `%D` dependent locality, `%C` city, `%S` province, `%Z` postal code, `%X` sorting code, `%n` a new line. */
  fmt?: string;
  /** The order in Latin script, where it differs (Japan, China, Korea). */
  lfmt?: string;
  /** The required fields, as the letters of `fmt` (`ACSZ`). */
  require?: string;
  /** The postal code's pattern. */
  zip?: string;
  /** Examples of postal codes, comma-separated. */
  zipex?: string;
  /** The country's language, where Google gives one. */
  lang?: string;
  /** Written before the postal code (`CH-`). */
  postprefix?: string;
  zip_name_type?: PostalCodeName;
  state_name_type?: ProvinceName;
  locality_name_type?: CityName;
};

/** The entry `address-formats.json` keeps for a country: what is not Google's default. */
export type CountryAddressData = {
  fmt?: string;
  lfmt?: string;
  require?: string;
  zip?: string;
  /** The first example only: the one the error message shows. */
  zipex?: string;
  lang?: string;
  postprefix?: string;
  postalCodeName?: Exclude<PostalCodeName, "postal">;
  provinceName?: Exclude<ProvinceName, "province">;
  cityName?: Exclude<CityName, "city">;
};

/** Google's defaults, for a field a country's entry leaves out (libaddressinput's `ZZ` region). */
export const googleDefaults = {
  fmt: "%N%n%O%n%A%n%C",
  require: "AC",
  postalCodeName: "postal",
  provinceName: "province",
  cityName: "city",
} as const;

/** The entry for one country: Google's fields that AddressForm uses, without the defaults. */
export function compactAddressData(data: GoogleAddressData): CountryAddressData {
  const entry: CountryAddressData = {};
  if (data.fmt !== undefined && data.fmt !== googleDefaults.fmt) entry.fmt = data.fmt;
  if (data.lfmt !== undefined) entry.lfmt = data.lfmt;
  if (data.require !== undefined && data.require !== googleDefaults.require)
    entry.require = data.require;
  if (data.zip !== undefined) entry.zip = data.zip;
  const example = data.zipex?.split(",")[0]?.trim();
  if (example !== undefined && example !== "") entry.zipex = example;
  if (data.lang !== undefined) entry.lang = data.lang;
  if (data.postprefix !== undefined) entry.postprefix = data.postprefix;
  if (data.zip_name_type !== undefined && data.zip_name_type !== "postal")
    entry.postalCodeName = data.zip_name_type;
  if (data.state_name_type !== undefined && data.state_name_type !== "province")
    entry.provinceName = data.state_name_type;
  if (data.locality_name_type !== undefined && data.locality_name_type !== "city")
    entry.cityName = data.locality_name_type;
  return entry;
}

/** Every country's entry, keyed by its upper-case code, in code order. */
export function compactAll(countries: GoogleAddressData[]): Record<string, CountryAddressData> {
  return Object.fromEntries(
    [...countries]
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
      .map((data) => [data.key, compactAddressData(data)]),
  );
}

/** `address-formats.json`'s text: one country a line, so a data update reads as a diff by country. */
export function serializeAll(entries: Record<string, CountryAddressData>): string {
  const lines = Object.entries(entries).map(
    ([code, entry]) => `  ${JSON.stringify(code)}: ${JSON.stringify(entry)}`,
  );
  return `{\n${lines.join(",\n")}\n}\n`;
}
