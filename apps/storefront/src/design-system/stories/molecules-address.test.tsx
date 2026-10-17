import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, countryName, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { AddressFormFields } from "@shopblok/ui/molecules/address-form-fields";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { addressMoleculeStories } from "./molecules-address";

// The two address molecules' stories (T34; D40): the states the story lists are there, each one
// shows what its description says in every locale, the client part gets props that serialize (a
// story renders on the server), the links do not prefetch, and the ids of the states side by side
// never collide.

type Id = keyof typeof addressMoleculeStories;
const FORM: Id = "molecules/address-form";
const CARD: Id = "molecules/address-card";

const story = (id: Id) => addressMoleculeStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
const live = (id: Id, locale: Locale) =>
  renderToStaticMarkup(story(id).live(createContext(locale)));
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const fixtures = (locale: Locale) => commerceFixtures[locale];
const catalog = (locale: Locale) => catalogs[locale].molecules;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string) => text.replace(/\s/g, " ");

const entities: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
};
const decode = (text: string) =>
  text.replace(/&(?:amp|lt|gt|quot|#x27);/g, (all) => entities[all] ?? all);
const text = (markup: string) =>
  plain(decode(markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")));

type Attributes = Record<string, string>;

/** The attributes of every `<tag …>` in the markup, in order (React writes `autoComplete`, `readOnly`…). */
function tags(markup: string, tag: string): Attributes[] {
  return [...markup.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, "g"))].map((match) =>
    Object.fromEntries(
      [...(match[1] ?? "").matchAll(/([\w:@-]+)(?:="([^"]*)")?/g)].map((pair) => [
        pair[1] ?? "",
        decode(pair[2] ?? ""),
      ]),
    ),
  );
}

/** The fields a form draws, in the page's order: its text inputs by name. */
const fields = (markup: string) =>
  tags(markup, "input").filter(
    (input) => input["type"] !== "hidden" && input["name"] !== undefined,
  );
const names = (markup: string) => fields(markup).map((input) => input["name"]);
const required = (markup: string) =>
  fields(markup)
    .filter((input) => input["required"] !== undefined)
    .map((input) => input["name"]);

/** Every field's `autocomplete` token (WCAG 1.3.5), by name, without a section. */
const TOKENS: Record<string, string> = {
  firstName: "given-name",
  lastName: "family-name",
  company: "organization",
  address1: "address-line1",
  address2: "address-line2",
  city: "address-level2",
  province: "address-level1",
  postalCode: "postal-code",
  countryCode: "country",
  phone: "tel",
};

/** What a server component hands to the client part inside it. */
function find(
  node: ReactNode,
  match: (element: ReactElement<Record<string, unknown>>) => boolean,
): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) {
    for (const child of node as ReactNode[]) {
      const found = find(child, match);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (!isValidElement<Record<string, unknown>>(node)) return undefined;
  if (match(node)) return node;
  return find(node.props["children"] as ReactNode, match);
}

function clientPartOf(node: ReactNode) {
  if (!isValidElement<Record<string, unknown>>(node) || typeof node.type !== "function")
    throw new Error("not a component element");
  // AddressForm is a server component with no hooks: calling it is what React does.
  const returned = (node.type as (props: Record<string, unknown>) => ReactNode)(node.props);
  const part = find(returned, (element) => element.type === AddressFormFields);
  if (part === undefined) throw new Error("the form hands over no client part");
  return part;
}

const cells = (id: Id, locale: Locale) => {
  const ctx = createContext(locale);
  const { states = [] } = story(id);
  return [ctx, story(id).live(ctx), ...states.map((each) => each.render(ctx))] as const;
};

describe("the address molecules' stories", () => {
  it("are one for each of the two entries, each with a summary and a11y notes", () => {
    expect(Object.keys(addressMoleculeStories).sort()).toEqual([CARD, FORM]);
    for (const [id, each] of Object.entries(addressMoleculeStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.a11y.length, id).toBeGreaterThan(0);
    }
  });

  it("have the states listed", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids(FORM)).toEqual([
      "empty",
      "edit",
      "cy",
      "us",
      "gb",
      "de",
      "fr",
      "ch",
      "jp",
      "ic",
      "errors",
      "errors-empty",
      "pending",
      "save-failed",
      "billing",
      "long",
    ]);
    expect(ids(CARD)).toEqual([
      "default",
      "cy",
      "us",
      "de",
      "ch",
      "gb",
      "fr",
      "jp",
      "ic",
      "long",
      "edit-only",
      "read-only",
      "removing",
    ]);
  });

  it("describe every state in a sentence", () => {
    for (const id of [FORM, CARD] as const)
      for (const part of story(id).states ?? [])
        expect(part.description?.trim(), `${id} ${part.id}`).toBeTruthy();
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(addressMoleculeStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(300);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(300);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
      }
    }
  });

  it.each(LOCALES)(
    "keep every id unique and every reference to one resolved when the states sit together, in %s",
    (locale) => {
      const ctx = createContext(locale);
      const markup = renderToStaticMarkup(
        <>
          {Object.values(addressMoleculeStories).map((each, index) => (
            <div key={index}>
              {each.live(ctx)}
              {(each.states ?? []).map((part) => (
                <div key={part.id}>{part.render(ctx)}</div>
              ))}
            </div>
          ))}
        </>,
      );
      const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
      expect(ids.length).toBeGreaterThan(150);
      expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
      for (const match of markup.matchAll(/ for="([^"]+)"/g)) expect(ids).toContain(match[1]);
      for (const match of markup.matchAll(/ aria-labelledby="([^"]+)"/g))
        expect(ids).toContain(match[1]);
      for (const match of markup.matchAll(/ aria-describedby="([^"]+)"/g))
        for (const id of (match[1] ?? "").split(" ")) expect(ids, id).toContain(id);
    },
  );

  it("give the client part props that serialize, and the links a prefetch of false", () => {
    for (const locale of LOCALES) {
      const [, ...formNodes] = cells(FORM, locale);
      for (const node of formNodes) {
        const server = node as ReactElement<Record<string, unknown>>;
        // The server component's own props, then what it hands to the client part.
        for (const props of [server.props, clientPartOf(node).props]) {
          expect(
            Object.values(props).filter((value) => typeof value === "function"),
            locale,
          ).toEqual([]);
          expect(JSON.parse(JSON.stringify(props)), locale).toEqual(props);
        }
        // The DS posts nothing: a URL, never a server action.
        expect(server.props["action"], locale).toBe("#");
      }
      const [, ...cardNodes] = cells(CARD, locale);
      for (const node of cardNodes) {
        const props = (node as ReactElement<Record<string, unknown>>).props;
        expect(JSON.parse(JSON.stringify(props)), locale).toEqual(props);
        expect(props["prefetch"], locale).toBe(false);
        expect(
          Object.values(props).filter((value) => typeof value === "function"),
          locale,
        ).toEqual([]);
      }
    }
  });
});

describe("AddressForm's states", () => {
  /** What the data gives each country: its fields in order, and the ones it requires. */
  const COUNTRIES: Record<string, { fields: string[]; required: string[]; selected: string }> = {
    cy: {
      fields: ["firstName", "lastName", "company", "address1", "address2", "postalCode", "city"],
      required: ["firstName", "lastName", "address1", "city"],
      selected: "cy",
    },
    us: {
      fields: [
        "firstName",
        "lastName",
        "company",
        "address1",
        "address2",
        "city",
        "province",
        "postalCode",
      ],
      required: ["firstName", "lastName", "address1", "city", "province", "postalCode"],
      selected: "us",
    },
    gb: {
      fields: ["firstName", "lastName", "company", "address1", "address2", "city", "postalCode"],
      required: ["firstName", "lastName", "address1", "city", "postalCode"],
      selected: "gb",
    },
    de: {
      fields: ["firstName", "lastName", "company", "address1", "address2", "postalCode", "city"],
      required: ["firstName", "lastName", "address1", "postalCode", "city"],
      selected: "de",
    },
    fr: {
      fields: ["company", "firstName", "lastName", "address1", "address2", "postalCode", "city"],
      required: ["firstName", "lastName", "address1", "postalCode", "city"],
      selected: "fr",
    },
    ch: {
      fields: ["company", "firstName", "lastName", "address1", "address2", "postalCode", "city"],
      required: ["firstName", "lastName", "address1", "postalCode", "city"],
      selected: "ch",
    },
    jp: {
      fields: [
        "firstName",
        "lastName",
        "company",
        "address1",
        "address2",
        "province",
        "postalCode",
      ],
      required: ["firstName", "lastName", "address1", "province", "postalCode"],
      selected: "jp",
    },
    ic: {
      fields: [
        "firstName",
        "lastName",
        "company",
        "address1",
        "address2",
        "city",
        "province",
        "postalCode",
      ],
      required: ["firstName", "lastName", "address1", "city"],
      selected: "ic",
    },
  };
  const selected = (markup: string) => markup.match(/value="(\w+)" selected=""/)?.[1];
  const options = (markup: string) =>
    [...markup.matchAll(/<option [^>]*value="(\w+)"/g)].map((match) => match[1]);

  it.each(LOCALES)(
    "draw each country's fields in its order, with its required ones, in %s",
    (locale) => {
      for (const [code, expected] of Object.entries(COUNTRIES)) {
        const markup = html(FORM, code, locale);
        expect(selected(markup), `${locale} ${code}`).toBe(expected.selected);
        expect(names(markup), `${locale} ${code}`).toEqual([...expected.fields, "phone"]);
        expect(required(markup), `${locale} ${code}`).toEqual(expected.required);
      }
    },
  );

  it.each(LOCALES)(
    "offer the region's six countries, and Japan or the unlisted one beside them, in %s",
    (locale) => {
      const region = fixtures(locale).markets.map((market) => market.country);
      expect(region).toEqual(["cy", "us", "gb", "de", "fr", "ch"]);
      for (const code of region) expect(options(html(FORM, code, locale)), code).toEqual(region);
      expect(options(html(FORM, "jp", locale))).toEqual([...region, "jp"]);
      expect(options(html(FORM, "ic", locale))).toEqual([...region, "ic"]);
      // Each option is named in the page's language.
      expect(text(html(FORM, "jp", locale))).toContain(countryName("jp", htmlLang(locale)));
    },
  );

  it.each(LOCALES)(
    "give a country with no data the generic form, not an error, in %s",
    (locale) => {
      const markup = html(FORM, "ic", locale);
      expect(selected(markup)).toBe("ic");
      const postal = fields(markup).find((input) => input["name"] === "postalCode");
      expect(postal?.["pattern"]).toBeUndefined();
      expect(postal?.["required"]).toBeUndefined();
      expect(markup).not.toContain('aria-invalid="true"');
      // Its values are the sample's.
      const { generic } = fixtures(locale).addressSamples;
      expect(markup).toContain(`name="address1" value="${generic.address1}"`);
    },
  );

  it.each(LOCALES)(
    "keep Switzerland's prefix beside the code and Japan's pattern, in %s",
    (locale) => {
      const ch = html(FORM, "ch", locale);
      expect(ch).toContain('data-slot="address-field-prefix">CH-</span>');
      expect(fields(ch).find((input) => input["name"] === "postalCode")?.["pattern"]).toBe(
        "\\d{4}",
      );
      const jp = html(FORM, "jp", locale);
      expect(jp).not.toContain("address-field-prefix");
      expect(fields(jp).find((input) => input["name"] === "postalCode")?.["pattern"]).toBe(
        "\\d{3}-?\\d{4}",
      );
    },
  );

  it.each(LOCALES)("give every field its autocomplete token in every state, in %s", (locale) => {
    for (const part of story(FORM).states ?? []) {
      const markup = html(FORM, part.id, locale);
      const section = part.id === "billing" ? "billing " : "";
      for (const input of fields(markup))
        expect(input["autoComplete"], `${locale} ${part.id} ${input["name"]}`).toBe(
          `${section}${TOKENS[input["name"] ?? ""]}`,
        );
      expect(tags(markup, "select")[0]?.["autoComplete"], `${locale} ${part.id}`).toBe(
        `${section}country`,
      );
    }
  });

  it.each(LOCALES)(
    "name the live render's form for shipping and prefix its tokens, in %s",
    (locale) => {
      const markup = live(FORM, locale);
      expect(markup).toContain(`aria-label="${catalog(locale).addressForm.label.shipping}"`);
      for (const input of fields(markup))
        expect(input["autoComplete"], input["name"]).toBe(
          `shipping ${TOKENS[input["name"] ?? ""]}`,
        );
      expect(fields(markup).every((input) => input["value"] === "")).toBe(true);
    },
  );

  it.each(LOCALES)("name the billing form and keep its tokens apart, in %s", (locale) => {
    const markup = html(FORM, "billing", locale);
    expect(markup).toContain(`aria-label="${catalog(locale).addressForm.label.billing}"`);
    expect(markup).not.toContain("shipping ");
  });

  it.each(LOCALES)("start with nothing typed in the empty state, in %s", (locale) => {
    const markup = html(FORM, "empty", locale);
    expect(fields(markup).every((input) => input["value"] === "")).toBe(true);
    expect(selected(markup)).toBe(createContext(locale).fixture.market.country);
    expect(markup).not.toContain('aria-invalid="true"');
    expect(markup).not.toContain('name="addressId"');
    expect(markup).toContain('data-status="idle"');
    expect(text(markup)).toContain(plain(catalog(locale).addressForm.requiredNote));
  });

  it.each(LOCALES)(
    "start the edit state on another country's address, with its id, in %s",
    (locale) => {
      const [, second] = fixtures(locale).addresses;
      const markup = html(FORM, "edit", locale);
      expect(second?.countryCode).not.toBe(createContext(locale).fixture.market.country);
      expect(selected(markup)).toBe(second?.countryCode);
      expect(markup).toContain(`<input type="hidden" name="addressId" value="${second?.id}"`);
      expect(markup).toContain(`name="address1" value="${second?.address1}"`);
    },
  );

  it.each(LOCALES)("show the errors with the values kept, in %s", (locale) => {
    const copy = catalog(locale).addressForm;
    const { mistaken } = fixtures(locale).addressSamples;
    const markup = html(FORM, "errors", locale);
    const invalid = fields(markup).filter((input) => input["aria-invalid"] === "true");
    expect(invalid.map((input) => input["name"])).toEqual(["province", "postalCode"]);
    // Each invalid field is described by an error that is in the page.
    for (const input of invalid) {
      const ids = (input["aria-describedby"] ?? "").split(" ");
      expect(
        ids.some((id) => markup.includes(`<p id="${id}" data-slot="address-field-error"`)),
      ).toBe(true);
    }
    // The postal code's error says what one looks like, in the page's words.
    expect(text(markup)).toContain(
      plain(formatMessage(copy.errors.postalCode.zip, { example: "95014" }, htmlLang(locale))),
    );
    expect(text(markup)).toContain(
      plain(formatMessage(copy.summary, { count: 2 }, htmlLang(locale))),
    );
    // What was typed stays.
    expect(markup).toContain(`name="postalCode" value="${mistaken.postalCode}"`);
    expect(markup).toContain(`name="address1" value="${mistaken.address1}"`);
    expect(markup).toContain(`name="province"`);
  });

  it.each(LOCALES)("count four required fields in the empty submit, in %s", (locale) => {
    const copy = catalog(locale).addressForm;
    const markup = html(FORM, "errors-empty", locale);
    const invalid = fields(markup).filter((input) => input["aria-invalid"] === "true");
    expect(invalid.map((input) => input["name"])).toEqual(
      ["firstName", "lastName", "address1", "city"].filter((name) => names(markup).includes(name)),
    );
    expect(invalid).toHaveLength(4);
    expect(text(markup)).toContain(
      plain(formatMessage(copy.summary, { count: 4 }, htmlLang(locale))),
    );
    expect(markup).toContain('role="status"');
  });

  it.each(LOCALES)("keep a saving form from submitting twice, in %s", (locale) => {
    const copy = catalog(locale).addressForm;
    const markup = html(FORM, "pending", locale);
    expect(markup).toContain('data-status="pending"');
    expect(markup).toMatch(/<button type="submit" disabled="" hidden=""/);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain(`>${copy.saving}</span>`);
    const button = tags(markup, "button").find((each) => each["data-slot"] === "button");
    expect(button?.["type"]).toBe("button");
    // Every field is read-only and keeps its value.
    expect(fields(markup).every((input) => input["readOnly"] !== undefined)).toBe(true);
    const own = fixtures(locale).addresses[0];
    expect(markup).toContain(`name="address1" value="${own?.address1}"`);
  });

  it.each(LOCALES)(
    "say when the address could not be saved, with nothing to blame, in %s",
    (locale) => {
      const copy = catalog(locale).addressForm;
      const markup = html(FORM, "save-failed", locale);
      expect(markup).toContain('data-status="error"');
      expect(text(markup)).toContain(plain(copy.error));
      expect(markup).not.toContain('aria-invalid="true"');
    },
  );

  it.each(LOCALES)(
    "let the long values scroll inside their fields and the long button wrap, in %s",
    (locale) => {
      const long = fixtures(locale).long.address;
      const markup = html(FORM, "long", locale);
      expect(markup).toContain(
        `name="address1" value="${decode(long.address1).replace(/&/g, "&amp;")}"`,
      );
      expect(markup).toContain(`value="${long.lastName}"`);
      expect(text(markup)).toContain(plain(createContext(locale).fixture.long.action));
      expect(markup).toContain("max-w-full");
      // The text fields are told they may scroll (the clipping check skips `data-truncate`).
      expect(fields(markup).every((input) => input["data-truncate"] !== undefined)).toBe(true);
      expect(fields(markup).filter((input) => input["aria-invalid"] === "true")).toHaveLength(2);
    },
  );
});

describe("AddressCard's states", () => {
  const book = (locale: Locale, code: string) =>
    [
      ...fixtures(locale).addresses,
      fixtures(locale).addressSamples.gb,
      fixtures(locale).addressSamples.fr,
      fixtures(locale).addressSamples.jp,
      fixtures(locale).addressSamples.generic,
    ].find((address) => address.countryCode === code);

  /** The `<address>`'s lines: kind and text. */
  const lines = (markup: string) =>
    [...markup.matchAll(/<span [^>]*data-kind="(\w+)"[^>]*>(.*?)<\/span>/g)].map(
      (match) => [match[1], plain(decode(match[2] ?? ""))] as const,
    );
  const marks = (markup: string) =>
    [...markup.matchAll(/data-slot="badge"[^>]*>(.*?)<\/span>/g)].map((match) =>
      plain(decode(match[1] ?? "")),
    );

  it.each(LOCALES)("show the default marks as words, in %s", (locale) => {
    const copy = catalog(locale).addressCard;
    expect(marks(html(CARD, "default", locale))).toEqual([
      plain(copy.defaultShipping),
      plain(copy.defaultBilling),
    ]);
    expect(marks(html(CARD, "gb", locale))).toEqual([plain(copy.defaultBilling)]);
    expect(marks(html(CARD, "fr", locale))).toEqual([plain(copy.defaultShipping)]);
    for (const code of ["cy", "us", "de", "ch", "jp", "ic", "edit-only", "removing"])
      expect(marks(html(CARD, code, locale)), code).toEqual([]);
    expect(marks(html(CARD, "long", locale))).toHaveLength(2);
    expect(marks(html(CARD, "read-only", locale))).toHaveLength(2);
  });

  it.each(LOCALES)("name the country and the person in every country's card, in %s", (locale) => {
    for (const code of ["cy", "us", "de", "ch", "gb", "fr", "jp", "ic"]) {
      const address = book(locale, code);
      const found = lines(html(CARD, code, locale));
      expect(found.find(([kind]) => kind === "name")?.[1], code).toBe(
        `${address?.firstName} ${address?.lastName}`,
      );
      expect(found.find(([kind]) => kind === "country")?.[1], code).toBe(
        plain(countryName(code, htmlLang(locale))),
      );
      expect(found.find(([kind]) => kind === "phone")?.[1] !== undefined, code).toBe(
        address?.phone !== undefined,
      );
    }
  });

  it("writes each country's line the way the country does", () => {
    const localities = (code: string) =>
      lines(html(CARD, code, "en"))
        .filter(([kind]) => kind === "locality")
        .map(([, line]) => line);
    expect(localities("us")).toEqual(["Brooklyn, NY 11215"]);
    expect(localities("de")).toEqual(["10969 Berlin"]);
    expect(localities("cy")).toEqual(["1065 Λευκωσία"]);
    expect(localities("ch")).toEqual(["CH-8001 Zürich"]);
    expect(localities("gb")).toEqual(["Manchester", "M2 5BQ"]);
    expect(localities("fr")).toEqual(["69003 Lyon"]);
    expect(localities("jp")).toEqual(["107-0061"]);
    expect(localities("ic")).toEqual(["Las Palmas", "Gran Canaria 35002"]);
  });

  it.each(LOCALES)(
    "give the edit link and the remove button a name for their address, in %s",
    (locale) => {
      const copy = catalog(locale).addressCard;
      const own = fixtures(locale).addresses[0];
      const who = { name: `${own?.firstName} ${own?.lastName}`, city: own?.city ?? "" };
      const markup = html(CARD, "default", locale);
      const link = tags(markup, "a").find((each) => each["data-slot"] === "address-card-edit");
      expect(link?.["href"]).toBe("#");
      expect(link?.["aria-label"]).toBe(
        plain(formatMessage(copy.editLabel, who, htmlLang(locale))),
      );
      const button = tags(markup, "button").find((each) => each["data-slot"] === "button");
      expect(button?.["aria-label"]).toBe(
        plain(formatMessage(copy.removeLabel, who, htmlLang(locale))),
      );
      expect(markup).toContain('action="#"');
      expect(markup).toContain(`name="addressId" value="${own?.id}"`);
    },
  );

  it.each(LOCALES)("leave out what a state does not have, in %s", (locale) => {
    const editOnly = html(CARD, "edit-only", locale);
    expect(editOnly).toContain('data-slot="address-card-edit"');
    expect(editOnly).not.toContain('data-slot="address-card-remove"');
    expect(editOnly).not.toContain('data-slot="address-card-status"');

    const readOnly = html(CARD, "read-only", locale);
    expect(readOnly).not.toContain('data-slot="address-card-actions"');
    expect(readOnly).not.toContain("<form");
    expect(readOnly).not.toContain("<a ");
    expect(readOnly).not.toContain("<button");
  });

  it.each(LOCALES)("keep a removing card from submitting twice and say so, in %s", (locale) => {
    const copy = catalog(locale).addressCard;
    const address = book(locale, "de");
    const who = { name: `${address?.firstName} ${address?.lastName}`, city: address?.city ?? "" };
    const markup = html(CARD, "removing", locale);
    expect(markup).toMatch(/<button type="submit" disabled="" hidden=""/);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-disabled="true"');
    const button = tags(markup, "button").find((each) => each["data-slot"] === "button");
    expect(button?.["type"]).toBe("button");
    expect(button?.["aria-label"]).toBe(
      plain(formatMessage(copy.removingLabel, who, htmlLang(locale))),
    );
    expect(text(markup)).toContain(plain(copy.removing));
    expect(text(markup)).toContain(plain(formatMessage(copy.removingLabel, who, htmlLang(locale))));
  });

  it.each(LOCALES)("wrap the long values inside the card, in %s", (locale) => {
    const long = fixtures(locale).long.address;
    const markup = html(CARD, "long", locale);
    expect(markup).toContain("wrap-anywhere");
    const found = lines(markup);
    expect(found.find(([kind]) => kind === "company")?.[1]).toBe(plain(long.company ?? ""));
    expect(found.some(([kind]) => kind === "street")).toBe(true);
    expect(markup).toContain("max-w-full");
    expect(markup).toContain("min-w-0");
  });
});
