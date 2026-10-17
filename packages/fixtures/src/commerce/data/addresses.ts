import type { Address } from "@shopblok/registry/contracts";

// What AddressForm's and AddressCard's stories need beyond the address book (`checkout.ts`'s four
// countries, T34): an address in each of the two seeded markets the book leaves out, one in a
// country no market seeds (a country added in settings, Principle 10), one in a country Google's
// format data does not list, and a form filled in with mistakes. The same in all four locales:
// names, streets and numbers are made up (the phone numbers are in the ranges Ofcom, ARCEP and
// the Japanese ministry keep for fiction), and a street is written in its own language.

export const gbAddress: Address = {
  id: "addr_gb",
  firstName: "Amelia",
  lastName: "Brooks",
  address1: "7 Orchard Row",
  city: "Manchester",
  postalCode: "M2 5BQ",
  countryCode: "gb",
  phone: "+44 161 496 0142",
};

export const frAddress: Address = {
  id: "addr_fr",
  firstName: "Camille",
  lastName: "Laurent",
  company: "Atelier Laurent",
  address1: "12 rue des Lilas",
  address2: "Bâtiment B",
  city: "Lyon",
  postalCode: "69003",
  countryCode: "fr",
  phone: "+33 4 65 71 00 42",
};

/** Japan: no seeded market sells there, so a shop that opens it gets this form from the data alone. */
export const jpAddress: Address = {
  id: "addr_jp",
  firstName: "Yuki",
  lastName: "Tanaka",
  address1: "1-2-3 Kita-Aoyama, Minato-ku",
  city: "Minato-ku",
  province: "Tokyo",
  postalCode: "107-0061",
  countryCode: "jp",
  phone: "+81 3 5555 0142",
};

/** The Canary Islands (`ic`, an exceptionally reserved code): Google's data has no format for it. */
export const genericAddress: Address = {
  id: "addr_ic",
  firstName: "Marta",
  lastName: "Suárez",
  address1: "Calle Triana 12",
  city: "Las Palmas",
  province: "Gran Canaria",
  postalCode: "35002",
  countryCode: "ic",
};

/** A US form with a state missing and a ZIP code of four digits: it keeps what was typed. */
export const mistakenValues = {
  firstName: "Jordan",
  lastName: "Ellis",
  address1: "482 Maple Avenue",
  city: "Brooklyn",
  postalCode: "1121",
  countryCode: "us",
} as const;
