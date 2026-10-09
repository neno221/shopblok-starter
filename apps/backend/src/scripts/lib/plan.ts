import { MedusaError } from "@medusajs/framework/utils";

/**
 * The decisions the seeds make before they write anything: what is missing,
 * what has drifted. Pure functions over plain data, so "a second run makes no
 * changes" can be tested without a database.
 */

/** The items of `desired` whose key is not among `existingKeys`, in order. */
export function missingBy<T>(
  desired: readonly T[],
  existingKeys: Iterable<string>,
  key: (item: T) => string,
): T[] {
  const existing = new Set(existingKeys);

  return desired.filter((item) => !existing.has(key(item)));
}

export type StoreCurrency = { currency_code: string; is_default?: boolean };

export type StoreSnapshot = {
  default_sales_channel_id?: string | null;
  supported_currencies?: (StoreCurrency | null)[] | null;
  supported_locales?: ({ locale_code: string } | null)[] | null;
};

export type StoreTarget = {
  default_sales_channel_id: string;
  supported_currencies: StoreCurrency[];
  supported_locales: { locale_code: string }[];
};

function sameSet(a: Iterable<string>, b: Iterable<string>): boolean {
  const left = new Set(a);
  const right = new Set(b);

  return left.size === right.size && [...left].every((x) => right.has(x));
}

/**
 * Which parts of the store differ from the target. An empty list means the
 * store needs no update, and the seed doesn't call `updateStoresWorkflow`: it
 * replaces the store's currency and locale rows, so a no-op update would still
 * churn them.
 */
export function storeDrift(
  current: StoreSnapshot,
  target: StoreTarget,
): ("default_sales_channel" | "currencies" | "locales")[] {
  const drift: ReturnType<typeof storeDrift> = [];

  if (current.default_sales_channel_id !== target.default_sales_channel_id) {
    drift.push("default_sales_channel");
  }

  // A currency is its code plus whether it is the default.
  const currencyKey = (c: StoreCurrency) => `${c.currency_code}:${c.is_default ? "default" : ""}`;
  const present = (current.supported_currencies ?? []).filter((c): c is StoreCurrency =>
    Boolean(c),
  );

  if (!sameSet(present.map(currencyKey), target.supported_currencies.map(currencyKey))) {
    drift.push("currencies");
  }

  const locales = (current.supported_locales ?? []).flatMap((l) => (l ? [l.locale_code] : []));

  if (
    !sameSet(
      locales,
      target.supported_locales.map((l) => l.locale_code),
    )
  ) {
    drift.push("locales");
  }

  return drift;
}

/** Countries of a region that differ from the ones the seed wants. */
export function countryDrift(
  existing: readonly string[],
  desired: readonly string[],
): { missing: string[]; extra: string[] } {
  const have = new Set(existing.map((c) => c.toLowerCase()));
  const want = new Set(desired.map((c) => c.toLowerCase()));

  return {
    missing: [...want].filter((c) => !have.has(c)),
    extra: [...have].filter((c) => !want.has(c)),
  };
}

export type DesiredTranslation = {
  reference: string;
  reference_id: string;
  locale_code: string;
  translations: Record<string, string>;
};

export type ExistingTranslation = DesiredTranslation & { id: string };

export type TranslationPlan = {
  create: DesiredTranslation[];
  update: { id: string; translations: Record<string, string> }[];
};

/**
 * What `batchTranslationsWorkflow` has to do. The table's unique key is
 * `(reference_id, locale_code)`, so that pair identifies a translation. A row
 * is updated only when one of our fields is missing or different, and keeps
 * any other field somebody added in the admin. Nothing is ever deleted.
 */
export function planTranslations(
  existing: readonly ExistingTranslation[],
  desired: readonly DesiredTranslation[],
): TranslationPlan {
  const keyOf = (t: { reference_id: string; locale_code: string }) =>
    `${t.reference_id}|${t.locale_code}`;
  const byKey = new Map(existing.map((t) => [keyOf(t), t]));
  const seen = new Set<string>();
  const plan: TranslationPlan = { create: [], update: [] };

  for (const wanted of desired) {
    const key = keyOf(wanted);

    if (seen.has(key)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Duplicate translation for ${key}`);
    }

    seen.add(key);

    const current = byKey.get(key);

    if (!current) {
      plan.create.push(wanted);
      continue;
    }

    const stale = Object.entries(wanted.translations).some(
      ([field, value]) => current.translations?.[field] !== value,
    );

    if (stale) {
      plan.update.push({
        id: current.id,
        translations: { ...current.translations, ...wanted.translations },
      });
    }
  }

  return plan;
}

/**
 * `SEED_DEMO=false` or a `skip` / `--skip` argument turns the demo catalog off.
 * (`medusa exec` hands a script only its positional arguments, so a bare `--skip`
 * may never arrive; `skip` and the environment variable always do.)
 */
export function isDemoSkipped(
  args: readonly string[] | undefined,
  env: Record<string, string | undefined>,
): boolean {
  return (
    env.SEED_DEMO?.trim().toLowerCase() === "false" ||
    (args ?? []).some((arg) => arg === "skip" || arg === "--skip")
  );
}
