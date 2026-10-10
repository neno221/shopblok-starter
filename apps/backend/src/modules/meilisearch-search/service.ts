/**
 * S2 prototype (not for main, D13): the `meilisearch-search` provider of the Search Module.
 *
 * It does what S2 needs and no more: create an index with settings, upsert and delete
 * documents, and search with filters, facets, sort and pagination. Two ways to hold a
 * localised index, chosen per index definition in `settings.provider_options.meilisearch`:
 *
 * - `locale_mode: "fields"` (candidates A and A'): one Meilisearch index. Per-locale fields
 *   (A) are tied to a language by `localizedAttributes`, and a query that names a locale
 *   is limited to that locale's attributes. A single multilingual field (A') needs nothing.
 * - `locale_mode: "index_per_locale"` (candidate B): a document may carry the per-locale
 *   texts in `localized_field`; the provider writes one document per locale into the index
 *   `<physical name>__<locale>`, created on the first write, and a query picks the index
 *   from `search_options.locales`.
 *
 * Writes are enqueued and waited for through `waitForTask`, like a real deferred engine.
 */
import type { SearchTypes } from "@medusajs/framework/types";
import { AbstractSearchProviderService, MedusaError } from "@medusajs/framework/utils";

import { MeiliClient, MeiliError } from "./client";
import { compileFilters } from "./filters";
import { meiliLanguage } from "./locales";

type Options = { host: string; api_key?: string };

/** What a definition says to this provider, under `settings.provider_options.meilisearch`. */
export type MeiliIndexOptions = {
  locale_mode?: "fields" | "index_per_locale";
  default_locale?: string;
  /** Locales whose index is created at migration time (`index_per_locale`). */
  locales?: string[];
  /** `fields` mode: locale -> the attributes a query for that locale searches. */
  locale_attributes?: Record<string, string[]>;
  /** `fields` mode: locale -> attribute patterns for `localizedAttributes`. */
  locale_patterns?: Record<string, string[]>;
  /** `index_per_locale`: the document key that holds `{ [locale]: { ...texts } }`. */
  localized_field?: string;
};

const LOCALE_SEPARATOR = "__";

/**
 * A physical name is `<prefix>_<index>_v<version>`, and the index of one locale adds
 * `__<locale>`. The version is what makes the split unambiguous even when a prefix or an index
 * name holds `__` itself.
 */
function splitLocaleIndex(uid: string): { physical: string; locale?: string } {
  const match = /^(.+_v\d+)__([A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*)$/.exec(uid);

  return match ? { physical: match[1]!, locale: match[2]! } : { physical: uid };
}

type Def = SearchTypes.ResolvedSearchIndexDefinition;
type Field = SearchTypes.SearchFieldDefinition;

function ownOptions(definition: Def): MeiliIndexOptions {
  return (definition.settings.provider_options?.meilisearch ?? {}) as MeiliIndexOptions;
}

function flatten(fields: Record<string, Field>, prefix = ""): { path: string; field: Field }[] {
  return Object.entries(fields).flatMap(([name, field]) => {
    const path = prefix ? `${prefix}.${name}` : name;

    return field.type === "object" && field.fields
      ? flatten(field.fields, path)
      : [{ path, field }];
  });
}

const weightOf = (field: Field) =>
  typeof field.searchable === "object" ? (field.searchable.weight ?? 1) : 1;

export class MeilisearchSearchService extends AbstractSearchProviderService {
  static identifier = "meilisearch";

  protected client_: MeiliClient;
  protected logger_: { warn(message: string): void };
  /** Locale indexes known to exist, so a write doesn't ask for them every time. */
  protected knownLocaleIndexes_ = new Set<string>();

  constructor({ logger }: { logger: { warn(message: string): void } }, options: Options) {
    super();

    this.logger_ = logger;
    this.client_ = new MeiliClient(options.host, options.api_key);
  }

  // ---- Indexes -----------------------------------------------------------------------

  protected settingsFor(definition: Def, localeHint?: string) {
    const fields = flatten(definition.fields);
    const own = ownOptions(definition);
    const typo = definition.settings.typo_tolerance;

    const localized =
      own.locale_mode === "index_per_locale"
        ? localeHint
          ? [{ locales: [localeHint], attributePatterns: ["*"] }]
          : []
        : Object.entries(own.locale_patterns ?? {}).flatMap(([locale, attributePatterns]) => {
            const hint = meiliLanguage(locale);

            return hint ? [{ locales: [hint], attributePatterns }] : [];
          });

    return {
      searchableAttributes: fields
        .filter(({ field }) => field.searchable)
        .map((entry, order) => ({ ...entry, order }))
        .sort((a, b) => weightOf(b.field) - weightOf(a.field) || a.order - b.order)
        .map(({ path }) => path),
      filterableAttributes: fields
        .filter(({ field }) => field.filterable || field.facetable)
        .map(({ path }) => path),
      sortableAttributes: fields.filter(({ field }) => field.sortable).map(({ path }) => path),
      typoTolerance: { enabled: typo?.enabled ?? true },
      faceting: { maxValuesPerFacet: 200 },
      pagination: { maxTotalHits: 10_000 },
      localizedAttributes: localized,
    };
  }

  /**
   * Creates the index through its settings, in one task: Meilisearch creates an index that
   * does not exist when its settings are updated. Creating it first (`POST /indexes`) and
   * configuring it second leaves a window in which the index exists with no filterable
   * attributes, and a search that arrives then fails with a 400 (found with candidate B, which
   * creates the index of a new locale on its first write, while storefront searches run). The
   * primary key is passed with the first documents.
   */
  protected async ensureIndex(uid: string, _primaryKey: string, settings: object) {
    const updated = await this.client_.request<{ taskUid: number }>(
      "PATCH",
      `/indexes/${uid}/settings`,
      settings,
    );

    await this.client_.waitForTasks([updated.taskUid]);
  }

  protected localeIndex(physicalName: string, locale: string) {
    return `${physicalName}${LOCALE_SEPARATOR}${locale}`;
  }

  /** Every Meilisearch index that belongs to a physical name: itself and its locale indexes. */
  protected async indexesOf(physicalName: string): Promise<string[]> {
    const { results } = await this.client_.request<{ results: { uid: string }[] }>(
      "GET",
      "/indexes?limit=1000",
    );

    return results
      .map((entry) => entry.uid)
      .filter(
        (uid) => uid === physicalName || uid.startsWith(`${physicalName}${LOCALE_SEPARATOR}`),
      );
  }

  async upsertIndex({ index }: { index: Def }): Promise<SearchTypes.SearchTask> {
    const own = ownOptions(index);

    if (own.locale_mode === "index_per_locale") {
      for (const locale of own.locales ?? []) {
        await this.ensureLocaleIndex(index.physical_name, index, locale);
      }
    } else {
      await this.ensureIndex(index.physical_name, index.primary_key, this.settingsFor(index));
    }

    return { index: index.physical_name, status: "succeeded" };
  }

  /**
   * `physicalName` is the destination the Search Module hands to `upsertDocuments` as `index`: the
   * physical index of the version being filled during a reindex. It is not
   * `definition.physical_name`, which is the unversioned root; building locale indexes from that
   * one sends a reindex's documents to indexes that no search reads (found by T8, where the
   * reindexed candidate B held no documents under its active version).
   */
  protected async ensureLocaleIndex(physicalName: string, definition: Def, locale: string) {
    const uid = this.localeIndex(physicalName, locale);

    if (this.knownLocaleIndexes_.has(uid)) {
      return uid;
    }

    await this.ensureIndex(
      uid,
      definition.primary_key,
      this.settingsFor(definition, meiliLanguage(locale)),
    );
    this.knownLocaleIndexes_.add(uid);

    return uid;
  }

  async deleteIndex({ index }: { index: string }): Promise<SearchTypes.SearchTask> {
    const tasks: number[] = [];

    for (const uid of await this.indexesOf(index)) {
      const { taskUid } = await this.client_.request<{ taskUid: number }>(
        "DELETE",
        `/indexes/${uid}`,
      );

      tasks.push(taskUid);
      this.knownLocaleIndexes_.delete(uid);
    }

    await this.client_.waitForTasks(tasks);

    return { index, status: "succeeded" };
  }

  async clearIndex({ index }: { index: string }): Promise<SearchTypes.SearchTask> {
    const tasks: number[] = [];

    for (const uid of await this.indexesOf(index)) {
      const { taskUid } = await this.client_.request<{ taskUid: number }>(
        "DELETE",
        `/indexes/${uid}/documents`,
      );

      tasks.push(taskUid);
    }

    await this.client_.waitForTasks(tasks);

    return { index, status: "succeeded" };
  }

  async listIndexes(): Promise<SearchTypes.SearchIndexInfo[]> {
    const { results } = await this.client_.request<{ results: { uid: string }[] }>(
      "GET",
      "/indexes?limit=1000",
    );
    const { indexes: stats } = await this.client_.request<{
      indexes: Record<string, { numberOfDocuments: number }>;
    }>("GET", "/stats");
    const logical = new Map<string, number>();

    for (const { uid } of results) {
      const name = splitLocaleIndex(uid).physical;

      // A document of an `index_per_locale` index sits once per locale: count the largest.
      logical.set(name, Math.max(logical.get(name) ?? 0, stats[uid]?.numberOfDocuments ?? 0));
    }

    return [...logical].map(([name, document_count]) => ({
      name,
      provider: MeilisearchSearchService.identifier,
      document_count,
    }));
  }

  // ---- Documents ---------------------------------------------------------------------

  async upsertDocuments({
    index,
    definition,
    documents,
  }: {
    index: string;
    definition: Def;
    documents: SearchTypes.SearchDocument[];
  }): Promise<SearchTypes.SearchTask> {
    const own = ownOptions(definition);

    if (own.locale_mode !== "index_per_locale") {
      const { taskUid } = await this.client_.request<{ taskUid: number }>(
        "POST",
        `/indexes/${index}/documents?primaryKey=${definition.primary_key}`,
        documents,
      );

      return { id: String(taskUid), index, status: "enqueued" };
    }

    // Candidate B: one document per locale, each in its own index.
    const key = own.localized_field ?? "_locales";
    const defaultLocale = own.default_locale ?? "en-US";
    const byLocale = new Map<string, Record<string, unknown>[]>();
    const idsByLocale = new Map<string, Set<string>>();

    for (const { [key]: texts, ...base } of documents) {
      const perLocale = (texts ?? { [defaultLocale]: {} }) as Record<
        string,
        Record<string, unknown>
      >;

      for (const [locale, localized] of Object.entries(perLocale)) {
        byLocale.set(locale, [...(byLocale.get(locale) ?? []), { ...base, ...localized, locale }]);
      }

      for (const locale of Object.keys(perLocale)) {
        idsByLocale.set(locale, (idsByLocale.get(locale) ?? new Set()).add(base.id as string));
      }
    }

    const tasks: number[] = [];

    for (const [locale, rows] of byLocale) {
      const uid = await this.ensureLocaleIndex(index, definition, locale);
      const { taskUid } = await this.client_.request<{ taskUid: number }>(
        "POST",
        `/indexes/${uid}/documents?primaryKey=${definition.primary_key}`,
        rows,
      );

      tasks.push(taskUid);
    }

    // A locale the document no longer has (a deleted translation) must not keep its old copy.
    for (const uid of await this.indexesOf(index)) {
      const locale = splitLocaleIndex(uid).locale;

      if (!locale) {
        continue;
      }

      const stale = documents
        .map((document) => document.id)
        .filter((id) => !idsByLocale.get(locale)?.has(id));

      if (stale.length) {
        const { taskUid } = await this.client_.request<{ taskUid: number }>(
          "POST",
          `/indexes/${uid}/documents/delete-batch`,
          stale,
        );

        tasks.push(taskUid);
      }
    }

    return { id: tasks.join(","), index, status: "enqueued" };
  }

  async deleteDocuments({
    index,
    filters,
  }: SearchTypes.SearchDeleteDocumentsInput): Promise<SearchTypes.SearchTask> {
    const ids = (filters as Record<string, unknown>).id;
    const expression = compileFilters(filters as Record<string, any>);
    const tasks: number[] = [];

    for (const uid of await this.indexesOf(index)) {
      const request =
        Array.isArray(ids) && Object.keys(filters).length === 1
          ? this.client_.request<{ taskUid: number }>(
              "POST",
              `/indexes/${uid}/documents/delete-batch`,
              ids,
            )
          : this.client_.request<{ taskUid: number }>("POST", `/indexes/${uid}/documents/delete`, {
              filter: expression,
            });

      tasks.push((await request).taskUid);
    }

    return { id: tasks.join(","), index, status: "enqueued" };
  }

  async waitForTask(task: SearchTypes.SearchTask): Promise<SearchTypes.SearchTask> {
    const ids = (task.id ?? "")
      .split(",")
      .filter(Boolean)
      .map((id) => Number(id));

    try {
      await this.client_.waitForTasks(ids);
    } catch (error) {
      return {
        ...task,
        status: "failed",
        error: { message: (error as Error).message },
      };
    }

    return { ...task, status: "succeeded" };
  }

  // ---- Search ------------------------------------------------------------------------

  async search(input: SearchTypes.ProviderSearchQuery): Promise<SearchTypes.SearchResult> {
    const { index, q, filters, pagination, search_options: options = {} } = input;
    const own = ownOptions(index);

    if (options.highlight) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The meilisearch prototype does not support highlighting",
      );
    }

    if (options.vector) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The meilisearch prototype does not support vector search",
      );
    }

    const request: Record<string, unknown> = {
      q: q ?? "",
      offset: pagination.skip ?? 0,
      limit: pagination.take ?? 20,
      attributesToRetrieve: [...new Set(["id", ...input.attributes_to_retrieve])],
      matchingStrategy: options.match_strategy === "all" ? "all" : "last",
      showRankingScore: true,
    };

    const filter = compileFilters(filters as Record<string, any> | undefined);

    if (filter) {
      request.filter = filter;
    }

    const order = Object.entries(pagination.order ?? {}).filter(([path]) => path !== "_score");

    if (order.length) {
      request.sort = order.map(([path, direction]) => `${path}:${direction.toLowerCase()}`);
    }

    if (options.min_score !== undefined) {
      request.rankingScoreThreshold = options.min_score;
    }

    const facets = options.facets ?? [];

    if (facets.length) {
      request.facets = facets.map((facet) => (typeof facet === "string" ? facet : facet.field));
    }

    // ---- Where the locale goes ----
    let uid = index.physical_name;
    const locales = options.locales ?? [];

    if (own.locale_mode === "index_per_locale") {
      if (locales.length > 1) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "The meilisearch prototype searches one locale at a time with index_per_locale",
        );
      }

      uid = this.localeIndex(index.physical_name, locales[0] ?? own.default_locale ?? "en-US");
    } else if (locales.length) {
      const hints = locales.flatMap((locale) => meiliLanguage(locale) ?? []);

      if (hints.length) {
        request.locales = hints;
      } else {
        this.logger_.warn(
          `meilisearch: no language hint for ${locales.join(", ")}; searching without one`,
        );
      }

      const attributes = locales.flatMap((locale) => own.locale_attributes?.[locale] ?? []);

      if (attributes.length && !options.attributes_to_search_on?.length) {
        request.attributesToSearchOn = attributes;
      }
    }

    if (options.attributes_to_search_on?.length) {
      request.attributesToSearchOn = options.attributes_to_search_on;
    }

    let response: any;

    try {
      response = await this.client_.request("POST", `/indexes/${uid}/search`, request);
    } catch (error) {
      if (
        own.locale_mode === "index_per_locale" &&
        error instanceof MeiliError &&
        error.code === "index_not_found"
      ) {
        // A locale nothing was written for yet has no index: no hits, not an error.
        return { hits: [], metadata: { skip: pagination.skip ?? 0, take: pagination.take ?? 20, count: 0 } };
      }

      throw error;
    }

    const resultFacets: Record<string, SearchTypes.SearchFacetResult> = {};

    for (const facet of facets) {
      const request_ = typeof facet === "string" ? { field: facet, type: "value" as const } : facet;
      const distribution = response.facetDistribution?.[request_.field];

      if (request_.type === "stats") {
        const stats = response.facetStats?.[request_.field];

        if (stats) {
          resultFacets[request_.field] = {
            type: "stats",
            min: stats.min,
            max: stats.max,
            count: response.estimatedTotalHits ?? 0,
          };
        }

        continue;
      }

      if (request_.type === "range") {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "The meilisearch prototype does not support range facets",
        );
      }

      if (distribution) {
        resultFacets[request_.field] = {
          type: "value",
          values: Object.entries(distribution as Record<string, number>)
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
            .slice(0, "limit" in request_ ? request_.limit : undefined),
        };
      }
    }

    return {
      hits: (response.hits as Record<string, any>[]).map(
        ({ _rankingScore, _formatted, ...document }) => ({
          id: document.id as string,
          score: _rankingScore,
          document,
        }),
      ),
      facets: Object.keys(resultFacets).length ? resultFacets : undefined,
      metadata: {
        skip: pagination.skip ?? 0,
        take: pagination.take ?? 20,
        count: response.estimatedTotalHits ?? response.totalHits ?? null,
        processing_time_ms: response.processingTimeMs,
      },
    };
  }
}
