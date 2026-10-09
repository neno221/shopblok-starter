import {
  countryDrift,
  findRegion,
  isDemoSkipped,
  isDevelopmentEnv,
  missingBy,
  planTranslations,
  required,
  storeDrift,
  storeName,
  type DesiredTranslation,
  type ExistingTranslation,
  type StoreTarget,
} from "../plan";

describe("missingBy", () => {
  it("keeps the items whose key is not there yet, in order", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(missingBy(items, ["b"], (i) => i.id)).toEqual([{ id: "a" }, { id: "c" }]);
    expect(missingBy(items, [], (i) => i.id)).toEqual(items);
    expect(missingBy(items, new Set(["a", "b", "c", "d"]), (i) => i.id)).toEqual([]);
  });
});

describe("storeName", () => {
  const wanted = "Shopbloks Starter";
  const medusaDefault = "Medusa Store";

  it("renames the store Medusa created, and one with no name", () => {
    expect(storeName("Medusa Store", wanted, medusaDefault)).toBe(wanted);
    expect(storeName("", wanted, medusaDefault)).toBe(wanted);
    expect(storeName(null, wanted, medusaDefault)).toBe(wanted);
    expect(storeName(undefined, wanted, medusaDefault)).toBe(wanted);
  });

  it("keeps a name somebody chose, so a re-run does not undo an admin's rename", () => {
    expect(storeName("Acme Shop", wanted, medusaDefault)).toBe("Acme Shop");
    expect(storeName(wanted, wanted, medusaDefault)).toBe(wanted);
  });
});

describe("storeDrift", () => {
  const target: StoreTarget = {
    default_sales_channel_id: "sc_1",
    supported_currencies: [
      { currency_code: "eur", is_default: true },
      { currency_code: "usd", is_default: false },
    ],
    supported_locales: [{ locale_code: "en-US" }, { locale_code: "el-GR" }],
  };

  it("reports a store as Medusa creates it as drifted in every part", () => {
    const fresh = {
      default_sales_channel_id: "sc_1",
      supported_currencies: [{ currency_code: "eur", is_default: true }],
      supported_locales: [],
    };

    expect(storeDrift(fresh, target)).toEqual(["currencies", "locales"]);
    expect(storeDrift({ ...fresh, default_sales_channel_id: null }, target)).toEqual([
      "default_sales_channel",
      "currencies",
      "locales",
    ]);
  });

  it("reports nothing for a store that already matches, whatever the order", () => {
    const same = {
      default_sales_channel_id: "sc_1",
      supported_currencies: [{ currency_code: "usd" }, { currency_code: "eur", is_default: true }],
      supported_locales: [{ locale_code: "el-GR" }, { locale_code: "en-US" }],
    };

    expect(storeDrift(same, target)).toEqual([]);
  });

  it("notices a changed default currency, a missing currency and an extra locale", () => {
    const base = {
      default_sales_channel_id: "sc_1",
      supported_currencies: target.supported_currencies,
      supported_locales: target.supported_locales,
    };

    expect(
      storeDrift(
        {
          ...base,
          supported_currencies: [
            { currency_code: "eur", is_default: false },
            { currency_code: "usd", is_default: true },
          ],
        },
        target,
      ),
    ).toEqual(["currencies"]);
    expect(
      storeDrift(
        { ...base, supported_currencies: [{ currency_code: "eur", is_default: true }] },
        target,
      ),
    ).toEqual(["currencies"]);
    expect(
      storeDrift(
        { ...base, supported_locales: [...target.supported_locales, { locale_code: "fr-FR" }] },
        target,
      ),
    ).toEqual(["locales"]);
  });

  it("reports a name that is still Medusa's, and nothing once the store has the target name", () => {
    const named: StoreTarget = { ...target, name: "Shopbloks Starter" };
    const store = {
      name: "Medusa Store",
      default_sales_channel_id: "sc_1",
      supported_currencies: target.supported_currencies,
      supported_locales: target.supported_locales,
    };

    expect(storeDrift(store, named)).toEqual(["name"]);
    expect(storeDrift({ ...store, name: "Shopbloks Starter" }, named)).toEqual([]);
    // A target without a name leaves the name alone.
    expect(storeDrift(store, target)).toEqual([]);
  });

  it("ignores empty relation slots and missing lists", () => {
    expect(
      storeDrift(
        {
          default_sales_channel_id: "sc_1",
          supported_currencies: [null, ...target.supported_currencies],
          supported_locales: [null, ...target.supported_locales],
        },
        target,
      ),
    ).toEqual([]);
    expect(storeDrift({ default_sales_channel_id: "sc_1" }, target)).toEqual([
      "currencies",
      "locales",
    ]);
  });
});

describe("countryDrift", () => {
  it("compares countries without regard to case or order", () => {
    expect(countryDrift(["DE", "cy", "fr"], ["cy", "de", "fr"])).toEqual({
      missing: [],
      extra: [],
    });
    expect(countryDrift(["cy"], ["cy", "de"])).toEqual({ missing: ["de"], extra: [] });
    expect(countryDrift(["cy", "gr"], ["cy"])).toEqual({ missing: [], extra: ["gr"] });
  });
});

describe("findRegion", () => {
  const europe = {
    name: "Europe",
    countries: [{ iso_2: "cy" }, { iso_2: "DE" }, null, { iso_2: null }],
  };
  const us = { name: "United States", countries: [{ iso_2: "us" }] };
  const wantedEurope = { name: "Europe", countries: ["cy", "de", "fr"] };

  it("finds a region by its name", () => {
    expect(findRegion([us, europe], wantedEurope)).toBe(europe);
    expect(findRegion([{ name: "Europe" }], wantedEurope)).toEqual({ name: "Europe" });
  });

  it("finds a renamed region by a country it holds, whatever the case", () => {
    const renamed = { ...europe, name: "EU" };

    expect(findRegion([us, renamed], wantedEurope)).toBe(renamed);
    expect(findRegion([us, renamed], { name: "Germany", countries: ["de"] })).toBe(renamed);
  });

  it("finds nothing when neither the name nor a country matches", () => {
    expect(findRegion([us], wantedEurope)).toBeUndefined();
    expect(findRegion([], wantedEurope)).toBeUndefined();
    expect(findRegion([{ name: "Empty", countries: null }], wantedEurope)).toBeUndefined();
  });
});

describe("required", () => {
  it("returns a value that is there, including falsy ones", () => {
    expect(required("a", "x")).toBe("a");
    expect(required(0, "x")).toBe(0);
    expect(required("", "x")).toBe("");
  });

  it("names what is missing instead of a bare TypeError", () => {
    expect(() => required(undefined, 'The value "Navy" of "Color"')).toThrow(
      /The value "Navy" of "Color" is missing/,
    );
    expect(() => required(null, "Category")).toThrow(/Category is missing/);
  });
});

describe("isDevelopmentEnv", () => {
  it("accepts an unset NODE_ENV, development and test", () => {
    expect(isDevelopmentEnv(undefined)).toBe(true);
    expect(isDevelopmentEnv("")).toBe(true);
    expect(isDevelopmentEnv("development")).toBe(true);
    expect(isDevelopmentEnv("test")).toBe(true);
  });

  it("refuses production, staging and anything else", () => {
    expect(isDevelopmentEnv("production")).toBe(false);
    expect(isDevelopmentEnv("staging")).toBe(false);
    expect(isDevelopmentEnv("Development")).toBe(false);
  });
});

describe("planTranslations", () => {
  const wanted = (
    reference_id: string,
    locale_code: string,
    translations: Record<string, string>,
  ): DesiredTranslation => ({
    reference: "product",
    reference_id,
    locale_code,
    translations,
  });
  const stored = (id: string, t: DesiredTranslation): ExistingTranslation => ({ ...t, id });

  it("creates everything when nothing is stored", () => {
    const desired = [
      wanted("prod_1", "el-GR", { title: "A" }),
      wanted("prod_1", "de-DE", { title: "B" }),
    ];

    expect(planTranslations([], desired)).toEqual({ create: desired, update: [] });
  });

  it("makes no change for translations that are already stored", () => {
    const desired = [wanted("prod_1", "el-GR", { title: "A", description: "D" })];

    expect(planTranslations([stored("trans_1", desired[0])], desired)).toEqual({
      create: [],
      update: [],
    });
  });

  it("updates a row whose value changed, keeping fields added elsewhere", () => {
    const current = stored(
      "trans_1",
      wanted("prod_1", "el-GR", { title: "Old", material: "Cotton" }),
    );
    const plan = planTranslations([current], [wanted("prod_1", "el-GR", { title: "New" })]);

    expect(plan.create).toEqual([]);
    expect(plan.update).toEqual([
      { id: "trans_1", translations: { title: "New", material: "Cotton" } },
    ]);
  });

  it("updates a row that lacks one of the fields", () => {
    const current = stored("trans_1", wanted("prod_1", "el-GR", { title: "A" }));
    const plan = planTranslations(
      [current],
      [wanted("prod_1", "el-GR", { title: "A", description: "D" })],
    );

    expect(plan.update).toEqual([
      { id: "trans_1", translations: { title: "A", description: "D" } },
    ]);
  });

  it("identifies a translation by (reference_id, locale_code), as the table's unique index does", () => {
    const current = stored("trans_1", {
      ...wanted("prod_1", "el-GR", { title: "A" }),
      reference: "product_variant",
    });

    expect(planTranslations([current], [wanted("prod_1", "el-GR", { title: "A" })])).toEqual({
      create: [],
      update: [],
    });
    expect(
      planTranslations([current], [wanted("prod_1", "de-DE", { title: "A" })]).create,
    ).toHaveLength(1);
  });

  it("refuses two desired translations for the same row", () => {
    expect(() =>
      planTranslations(
        [],
        [wanted("prod_1", "el-GR", { title: "A" }), wanted("prod_1", "el-GR", { title: "B" })],
      ),
    ).toThrow("Duplicate translation for prod_1|el-GR");
  });
});

describe("isDemoSkipped", () => {
  it("skips on SEED_DEMO=false in any case, and on the skip argument", () => {
    expect(isDemoSkipped([], { SEED_DEMO: "false" })).toBe(true);
    expect(isDemoSkipped(undefined, { SEED_DEMO: " FALSE " })).toBe(true);
    expect(isDemoSkipped(["skip"], {})).toBe(true);
    expect(isDemoSkipped(["--skip"], {})).toBe(true);
  });

  it("runs otherwise", () => {
    expect(isDemoSkipped([], {})).toBe(false);
    expect(isDemoSkipped(undefined, { SEED_DEMO: "true" })).toBe(false);
    expect(isDemoSkipped(["other"], { SEED_DEMO: "" })).toBe(false);
  });
});
