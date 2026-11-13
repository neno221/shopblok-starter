/**
 * The Meilisearch provider of Medusa's Search Module (D126; ADR 0002 decision 1, option B), on the
 * official `meilisearch` client.
 *
 * A definition that sets `provider_options.meilisearch.localized_field` (the product index, see
 * `src/search/product.ts`) is held as **one Meilisearch index per locale and version**:
 * `<physical name>__<locale>`, where the physical name is the one Medusa hands over (`index` on a
 * write, `physical_name` on a query: never the definition's own root, ADR 0002 "Found on the way"
 * 5). Each document carries every locale's texts under that key; the provider writes one copy per
 * locale, each into its locale's index, created with its settings on the locale's first write, and
 * removes the copy from a locale the document no longer has. A query names its locales in
 * `search_options.locales` (the `/store/search` middleware writes the request's, checked against
 * the store's); one locale searches its index, several are one federated search. A locale with no
 * index yet (added in the store after the last write) searches the default locale's index and logs
 * a warning, once per locale and process: the shop then shows the default texts, which is what an
 * untranslated language shows anyway (ADR 0002 decision 1). Any other definition is one plain
 * Meilisearch index.
 *
 * Writes are enqueued by Meilisearch and waited for in `waitForTask`, so the module can make a new
 * version live only once its documents are in.
 */
import type { Logger, SearchTypes } from "@medusajs/framework/types";
import { AbstractSearchProviderService, MedusaError } from "@medusajs/framework/utils";
// The client is an ES module and this backend is CommonJS: the types come in with
// `resolution-mode`, and the code through `import()` on first use (`client()`), which Node and
// Jest's ESM support (`--experimental-vm-modules`, set by the test scripts) both load.
import type {
  FederatedMultiSearchParams,
  Hit,
  Locale,
  Meilisearch,
  MultiSearchQuery,
  SearchParams,
  SearchResponse,
} from "meilisearch" with { "resolution-mode": "import" };

import { compileFilters, idsOnly } from "./filters";
import {
  isLocaleCode,
  localeIndexUid,
  meilisearchLanguage,
  MEILISEARCH_PROVIDER_ID,
  splitLocaleIndex,
} from "./locales";
import { indexOptionsOf, indexSettings, retrievablePaths } from "./settings";

type Definition = SearchTypes.ResolvedSearchIndexDefinition;
type Query = SearchTypes.ProviderSearchQuery;
type FacetRequest = Exclude<SearchTypes.SearchFacetRequest, string>;
type RangeRequest = Extract<FacetRequest, { type: "range" }>;

export type MeilisearchProviderOptions = {
  host: string;
  api_key: string;
};

type InjectedDependencies = { logger: Pick<Logger, "warn" | "info"> };

/** How long a write may take before `waitForTask` gives up on it (Meilisearch's default is 5 s). */
const TASK_TIMEOUT_MS = 120_000;
const PAGE = 1000;

/** Medusa's key for relevance in `pagination.order` (`SEARCH_SCORE_KEY` in its types). */
const SearchScoreKey = "_score";

const notAllowed = (message: string) =>
  new MedusaError(MedusaError.Types.NOT_ALLOWED, `Meilisearch: ${message}`);

/** The error code of a Meilisearch API answer (`index_not_found`, `invalid_search_filter`, ...). */
const codeOf = (error: unknown): string | undefined =>
  error instanceof Error && error.name === "MeilisearchApiError"
    ? ((error as { cause?: { code?: unknown } }).cause?.code as string | undefined)
    : undefined;

/** Medusa's range key when the caller gives none, as `search-postgres` writes it. */
const rangeKey = (range: RangeRequest["ranges"][number]) =>
  range.key ?? `${range.from ?? "*"}-${range.to ?? "*"}`;

export class MeilisearchSearchService extends AbstractSearchProviderService {
  static identifier = MEILISEARCH_PROVIDER_ID;

  protected readonly options_: MeilisearchProviderOptions;
  protected client_?: Promise<Meilisearch>;
  protected readonly logger_: InjectedDependencies["logger"];
  /** Indexes this process created or saw, so a write or a query doesn't ask about them again. */
  protected readonly knownIndexes_ = new Set<string>();
  /** The warnings already logged, so each is logged once per process. */
  protected readonly warned_ = new Set<string>();

  constructor({ logger }: InjectedDependencies, options: MeilisearchProviderOptions) {
    super();

    if (!options?.host?.trim() || !options.api_key?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The Meilisearch search provider needs `host` and `api_key` (MEILISEARCH_HOST, MEILISEARCH_API_KEY)",
      );
    }

    this.logger_ = logger;
    this.options_ = options;
  }

  /** The client, made on first use (see the import above). */
  protected client(): Promise<Meilisearch> {
    this.client_ ??= import("meilisearch").then(
      ({ Meilisearch }) =>
        new Meilisearch({ host: this.options_.host.trim(), apiKey: this.options_.api_key.trim() }),
    );

    return this.client_;
  }

  protected warnOnce(key: string, message: string) {
    if (!this.warned_.has(key)) {
      this.warned_.add(key);
      this.logger_.warn(`[Search] Meilisearch: ${message}`);
    }
  }

  // ---- Indexes ----------------------------------------------------------------------------------

  /**
   * Creates or updates an index through its settings, in one task: Meilisearch creates a missing
   * index when its settings are updated. Creating it first and configuring it second left a window
   * in which a search failed with "Attribute `sales_channel_ids` is not filterable" (ADR 0002,
   * "Found on the way" 6). The primary key comes with the first documents.
   */
  protected async applySettings(uid: string, definition: Definition, language?: string) {
    const client = await this.client();
    const task = await client
      .index(uid)
      .updateSettings(indexSettings(definition, language) as never)
      .waitTask({ timeout: TASK_TIMEOUT_MS });

    if (task.status !== "succeeded") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Meilisearch could not configure the index "${uid}": ${task.error?.message ?? task.status}`,
      );
    }

    this.knownIndexes_.add(uid);
  }

  /** The index of one locale, created with its language's settings on first use. */
  protected async ensureLocaleIndex(physicalName: string, definition: Definition, locale: string) {
    const uid = localeIndexUid(physicalName, locale);

    if (!this.knownIndexes_.has(uid)) {
      const language = meilisearchLanguage(locale);

      if (!language) {
        this.warnOnce(
          `language:${locale}`,
          `it has no language for ${locale}, so that locale's index is tokenised without a language hint`,
        );
      }

      await this.applySettings(uid, definition, language);
    }

    return uid;
  }

  async upsertIndex({ index }: { index: Definition }): Promise<SearchTypes.SearchTask> {
    const own = indexOptionsOf(index);

    if (own.localized) {
      // The default locale's index exists from the start, so a query always has an index to fall
      // back on; every other locale's appears with its first write.
      await this.ensureLocaleIndex(index.physical_name, index, own.default_locale!);
    } else {
      await this.applySettings(index.physical_name, index);
    }

    return { index: index.physical_name, status: "succeeded" };
  }

  /** Every Meilisearch index uid, all pages. */
  protected async allIndexUids(): Promise<string[]> {
    const client = await this.client();
    const uids: string[] = [];

    for (let offset = 0; ; offset += PAGE) {
      const { results, total } = await client.getRawIndexes({ limit: PAGE, offset });

      uids.push(...results.map((entry) => entry.uid));

      if (!results.length || offset + PAGE >= total) {
        return uids;
      }
    }
  }

  /** The Meilisearch indexes of a physical index: itself and the indexes of its locales. */
  protected async indexesOf(physicalName: string): Promise<string[]> {
    return (await this.allIndexUids()).filter(
      (uid) => uid === physicalName || splitLocaleIndex(uid).physical === physicalName,
    );
  }

  async deleteIndex({ index }: { index: string }): Promise<SearchTypes.SearchTask> {
    const client = await this.client();
    const uids = await this.indexesOf(index);

    await Promise.all(
      uids.map(async (uid) => {
        this.knownIndexes_.delete(uid);
        await client.deleteIndex(uid).waitTask({ timeout: TASK_TIMEOUT_MS });
      }),
    );

    return { index, status: "succeeded" };
  }

  async clearIndex({ index }: { index: string }): Promise<SearchTypes.SearchTask> {
    const client = await this.client();
    const tasks = await Promise.all(
      (await this.indexesOf(index)).map((uid) => client.index(uid).deleteAllDocuments()),
    );

    return this.taskOf(
      index,
      tasks.map((task) => task.taskUid),
    );
  }

  /**
   * One entry per physical index. The Search Module reads `document_count` to find an index that
   * lost its data: a localized index counts the documents of its largest locale (every document
   * has a copy in each store locale, so they are normally equal).
   */
  async listIndexes(): Promise<SearchTypes.SearchIndexInfo[]> {
    const [uids, stats] = await Promise.all([
      this.allIndexUids(),
      this.client().then((client) => client.getStats()),
    ]);
    const counts = new Map<string, number>();

    for (const uid of uids) {
      const { physical } = splitLocaleIndex(uid);
      const documents = stats.indexes[uid]?.numberOfDocuments ?? 0;

      counts.set(physical, Math.max(counts.get(physical) ?? 0, documents));
    }

    return [...counts].map(([name, document_count]) => ({
      name,
      provider: MeilisearchSearchService.identifier,
      document_count,
    }));
  }

  // ---- Documents --------------------------------------------------------------------------------

  protected taskOf(index: string, uids: number[]): SearchTypes.SearchTask {
    return uids.length
      ? { id: uids.join(","), index, status: "enqueued" }
      : { index, status: "succeeded" };
  }

  async upsertDocuments({
    index,
    definition,
    documents,
  }: {
    index: string;
    definition: Definition;
    documents: SearchTypes.SearchDocument[];
  }): Promise<SearchTypes.SearchTask> {
    const client = await this.client();
    const own = indexOptionsOf(definition);
    const primaryKey = definition.primary_key;

    if (!own.localized) {
      const task = await client.index(index).addDocuments(documents, { primaryKey });

      return this.taskOf(index, [task.taskUid]);
    }

    // B: one copy of each document per locale, with that locale's texts over the shared fields.
    const key = own.localized_field!;
    const byLocale = new Map<string, Record<string, unknown>[]>();
    const localesOf = new Map<string, Set<string>>();

    for (const { [key]: texts, ...shared } of documents) {
      const perLocale = (texts ?? { [own.default_locale!]: {} }) as Record<string, object>;
      const id = String(shared[primaryKey]);

      for (const [locale, localized] of Object.entries(perLocale)) {
        if (!isLocaleCode(locale)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Meilisearch: "${locale}" in ${key} of "${id}" is not a locale code`,
          );
        }

        byLocale.set(locale, [...(byLocale.get(locale) ?? []), { ...shared, ...localized }]);
        localesOf.set(id, (localesOf.get(id) ?? new Set()).add(locale));
      }
    }

    const tasks: number[] = [];

    for (const [locale, rows] of byLocale) {
      const uid = await this.ensureLocaleIndex(index, definition, locale);

      tasks.push((await client.index(uid).addDocuments(rows, { primaryKey })).taskUid);
    }

    // A locale a document no longer has (the store dropped it) must not keep its old copy.
    for (const uid of await this.indexesOf(index)) {
      const { locale } = splitLocaleIndex(uid);

      if (!locale) {
        continue;
      }

      const stale = [...localesOf].filter(([, locales]) => !locales.has(locale)).map(([id]) => id);

      if (stale.length) {
        tasks.push((await client.index(uid).deleteDocuments(stale)).taskUid);
      }
    }

    return this.taskOf(index, tasks);
  }

  async deleteDocuments({
    index,
    filters,
  }: SearchTypes.SearchDeleteDocumentsInput): Promise<SearchTypes.SearchTask> {
    const ids = idsOnly(filters as Record<string, unknown>, "id");
    const filter = ids ? undefined : compileFilters(filters as Record<string, unknown>);

    if (!ids && !filter) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Meilisearch: deleting from "${index}" needs filters that select documents`,
      );
    }

    const client = await this.client();
    const tasks = await Promise.all(
      (await this.indexesOf(index)).map((uid) =>
        ids
          ? client.index(uid).deleteDocuments(ids)
          : client.index(uid).deleteDocuments({ filter: filter! }),
      ),
    );

    return this.taskOf(
      index,
      tasks.map((task) => task.taskUid),
    );
  }

  async waitForTask(
    task: SearchTypes.SearchTask,
    options?: { timeout_ms?: number },
  ): Promise<SearchTypes.SearchTask> {
    const uids = (task.id ?? "").split(",").filter(Boolean).map(Number);

    try {
      const client = await this.client();
      const done = await client.tasks.waitForTasks(uids, {
        timeout: options?.timeout_ms ?? TASK_TIMEOUT_MS,
      });
      const failed = done.find((entry) => entry.status !== "succeeded");

      if (failed) {
        return {
          ...task,
          status: "failed",
          error: {
            message: failed.error?.message ?? `Meilisearch task ${failed.uid} ${failed.status}`,
            code: failed.error?.code,
          },
        };
      }
    } catch (error) {
      return { ...task, status: "failed", error: { message: (error as Error).message } };
    }

    return { ...task, status: "succeeded" };
  }

  // ---- Search -----------------------------------------------------------------------------------

  /** Whether an index exists. Only an existing one is remembered: a missing one may appear later. */
  protected async indexExists(uid: string): Promise<boolean> {
    if (this.knownIndexes_.has(uid)) {
      return true;
    }

    try {
      await (await this.client()).getRawIndex(uid);
    } catch (error) {
      if (codeOf(error) === "index_not_found") {
        return false;
      }

      throw error;
    }

    this.knownIndexes_.add(uid);

    return true;
  }

  /**
   * The index a locale is searched in: its own, or the default locale's while it has none (a
   * locale added in the store after the last write). A missing default index means the version
   * itself is gone (replaced by a newer one), which the Search Module answers by reading the live
   * version again when it gets a `NOT_FOUND`.
   */
  protected async localeTarget(definition: Definition, locale: string, defaultLocale: string) {
    const uid = localeIndexUid(definition.physical_name, locale);

    if (await this.indexExists(uid)) {
      return { uid, locale };
    }

    const fallback = localeIndexUid(definition.physical_name, defaultLocale);

    if (locale !== defaultLocale && (await this.indexExists(fallback))) {
      this.warnOnce(
        `fallback:${locale}`,
        `no index for ${locale} yet (it was added after the last write to "${definition.name}"), ` +
          `so its searches use ${defaultLocale}'s index until a product or translation is written, ` +
          `or the index is rebuilt`,
      );

      return { uid: fallback, locale: defaultLocale };
    }

    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Meilisearch has no index "${fallback}" for search index "${definition.name}"`,
    );
  }

  /** The Meilisearch indexes a query runs on, one per locale it asks for (deduplicated). */
  protected async targetsOf(input: Query): Promise<{ uid: string; locale?: string }[]> {
    const definition = input.index;
    const own = indexOptionsOf(definition);
    const locales = input.search_options?.locales ?? [];

    for (const locale of locales) {
      if (!isLocaleCode(locale)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Meilisearch: "${locale}" is not a locale code`,
        );
      }
    }

    if (!own.localized) {
      return [
        { uid: definition.physical_name, locale: locales.length === 1 ? locales[0] : undefined },
      ];
    }

    const asked = locales.length ? [...new Set(locales)] : [own.default_locale!];
    const targets = await Promise.all(
      asked.map((locale) => this.localeTarget(definition, locale, own.default_locale!)),
    );

    return [...new Map(targets.map((target) => [target.uid, target])).values()];
  }

  /** The parts of a Meilisearch query that do not depend on the index it runs on. */
  protected buildParams(input: Query): {
    params: SearchParams;
    highlightFields: string[];
    retrieve: string[];
    preTag: string;
    postTag: string;
  } {
    const { index, filters, search_options: options = {} } = input;
    const pagination = input.pagination ?? {};

    if (options.vector) {
      throw notAllowed("vector search is not supported");
    }

    if (pagination.cursor !== undefined) {
      throw notAllowed("cursor pagination is not supported; use skip and take");
    }

    if (options.match_strategy === "any") {
      // Meilisearch drops words until something matches ("last", "frequency"); none of its
      // strategies is "at least one term", and an approximation would answer differently.
      throw notAllowed('match_strategy "any" is not supported; use "all" or "last"');
    }

    const order = Object.entries(pagination.order ?? {});
    const scoreAt = order.findIndex(([path]) => path === SearchScoreKey);

    if (scoreAt !== -1 && scoreAt < order.length - 1) {
      // `sort` is the first ranking rule (an explicit order is the order), so relevance can only
      // break ties, never come before a field.
      throw notAllowed(`"${SearchScoreKey}" can only be the last key of pagination.order`);
    }

    const retrievable = new Set(retrievablePaths(index));
    const requested = input.attributes_to_retrieve.filter((path) => retrievable.has(path));
    const highlight = options.highlight;
    const searchable = Object.keys(index.fields).filter((path) => {
      const field = index.fields[path]!;

      return field.searchable === true || typeof field.searchable === "object";
    });
    const highlightFields = !highlight
      ? []
      : (highlight === true
          ? (options.attributes_to_search_on ?? searchable)
          : highlight.fields
        ).filter((path) => retrievable.has(path));
    const preTag = (typeof highlight === "object" && highlight.pre_tag) || "<em>";
    const postTag = (typeof highlight === "object" && highlight.post_tag) || "</em>";
    const snippet = typeof highlight === "object" ? highlight.snippet : undefined;
    const retrieve = [...new Set([index.primary_key, ...requested])];

    const params: SearchParams = {
      q: input.q ?? "",
      // A highlighted field is retrieved too (Meilisearch formats only what it returns), and taken
      // off the document again if it was not asked for.
      attributesToRetrieve: [...new Set([...retrieve, ...highlightFields])],
      matchingStrategy: options.match_strategy === "last" ? "last" : "all",
    };

    const filter = compileFilters(
      filters as Record<string, unknown> | undefined,
      index.primary_key,
    );

    if (filter) {
      params.filter = filter;
    }

    const sort = order
      .filter(([path]) => path !== SearchScoreKey)
      .map(([path, direction]) => `${path}:${direction.toLowerCase() === "desc" ? "desc" : "asc"}`);

    if (sort.length) {
      params.sort = sort;
    }

    if (options.attributes_to_search_on?.length) {
      params.attributesToSearchOn = options.attributes_to_search_on;
    }

    if (options.min_score !== undefined) {
      params.rankingScoreThreshold = options.min_score;
    }

    if (options.include_score) {
      params.showRankingScore = true;
    }

    if (options.distinct) {
      params.distinct = options.distinct;
    }

    if (highlightFields.length) {
      params.attributesToHighlight = highlightFields;
      params.highlightPreTag = preTag;
      params.highlightPostTag = postTag;
      params.showMatchesPosition = true;

      if (snippet) {
        params.attributesToCrop = highlightFields;
        params.cropLength = typeof snippet === "object" ? snippet.length : 10;
      }
    }

    // `typo_tolerance` per query is not mapped: Meilisearch decides typos per index, from the
    // definition's `settings.typo_tolerance` (Medusa calls the per-query option a preference).

    return { params, highlightFields, retrieve, preTag, postTag };
  }

  async search(input: Query): Promise<SearchTypes.SearchResult> {
    const { search_options: options = {} } = input;
    const pagination = input.pagination ?? {};
    const targets = await this.targetsOf(input);
    const built = this.buildParams(input);
    const facets = (options.facets ?? []).map((facet): FacetRequest =>
      typeof facet === "string" ? { field: facet, type: "value" } : facet,
    );
    const distributed = facets
      .filter((facet) => facet.type !== "range")
      .map((facet) => facet.field);
    const ranges = facets.filter((facet): facet is RangeRequest => facet.type === "range");
    const skip = pagination.skip ?? 0;
    const take = pagination.take ?? 20;

    try {
      const [response, rangeCounts] = await Promise.all([
        this.runQuery(targets, built.params, {
          primaryKey: input.index.primary_key,
          skip,
          take,
          facets: distributed,
          count: options.count,
        }),
        this.countRanges(targets, built.params, ranges, input.index.primary_key),
      ]);

      return this.toResult(input, response, { facets, rangeCounts, skip, take, ...built });
    } catch (error) {
      throw this.translateError(error, targets);
    }
  }

  /** A Meilisearch error as the Search Module expects it; a vanished index forgotten. */
  protected translateError(error: unknown, targets: { uid: string }[]): unknown {
    const code = codeOf(error);

    if (code === undefined) {
      return error;
    }

    if (code === "index_not_found") {
      targets.forEach(({ uid }) => this.knownIndexes_.delete(uid));

      return new MedusaError(MedusaError.Types.NOT_FOUND, (error as Error).message);
    }

    return code?.startsWith("invalid_")
      ? new MedusaError(MedusaError.Types.INVALID_DATA, `Meilisearch: ${(error as Error).message}`)
      : error;
  }

  /**
   * One locale: a plain search, paged by `page` and `hitsPerPage` when `skip` is a multiple of
   * `take`, so the count is exact (`totalHits`), as on `search-postgres`; `estimatedTotalHits`
   * otherwise, or when the caller asks for `estimated`. Several locales: one federated search over
   * their indexes, deduplicated by the primary key (`distinct`, which also makes the count and the
   * facets count a product once), with the facets merged.
   */
  protected async runQuery(
    targets: { uid: string; locale?: string }[],
    params: SearchParams,
    {
      primaryKey,
      skip,
      take,
      facets,
      count,
    }: { primaryKey: string; skip: number; take: number; facets: string[]; count?: string },
  ): Promise<SearchResponse> {
    const withLocale = (locale?: string): SearchParams => {
      const language = locale ? meilisearchLanguage(locale) : undefined;

      return language ? { ...params, locales: [language as Locale] } : params;
    };

    if (targets.length === 1) {
      const [{ uid, locale }] = targets as [{ uid: string; locale?: string }];
      const paged = count !== "estimated" && count !== "none" && take > 0 && skip % take === 0;
      const exactZero = take === 0 && count !== "estimated" && count !== "none";

      return (await this.client()).index(uid).search(params.q ?? "", {
        ...withLocale(locale),
        ...(facets.length ? { facets } : {}),
        ...(paged
          ? { page: skip / take + 1, hitsPerPage: take }
          : exactZero
            ? { page: 1, hitsPerPage: 0 }
            : { offset: skip, limit: take }),
      } as SearchParams) as Promise<SearchResponse>;
    }

    if (params.distinct) {
      throw notAllowed(
        "distinct cannot be combined with several locales (their merge is distinct by id)",
      );
    }

    const request: FederatedMultiSearchParams = {
      federation: {
        limit: take,
        offset: skip,
        distinct: primaryKey,
        ...(facets.length
          ? {
              facetsByIndex: Object.fromEntries(targets.map(({ uid }) => [uid, facets])),
              mergeFacets: {},
            }
          : {}),
      },
      queries: targets.map(({ uid, locale }) => {
        const { offset: _o, limit: _l, page: _p, hitsPerPage: _h, ...rest } = withLocale(locale);

        return { indexUid: uid, ...rest } as MultiSearchQuery;
      }),
    };

    return (await (await this.client()).multiSearch(request)) as unknown as SearchResponse;
  }

  /**
   * Range facets: Meilisearch has none, so each range is counted with its own query (the same text
   * and filters, the range added, no hits), all in one round trip. `from` is inclusive and `to`
   * exclusive, as on `search-postgres`.
   */
  protected async countRanges(
    targets: { uid: string; locale?: string }[],
    params: SearchParams,
    ranges: RangeRequest[],
    primaryKey: string,
  ): Promise<Map<string, number[]>> {
    const counts = new Map<string, number[]>();
    const asks = ranges.flatMap((facet) =>
      facet.ranges.map((range) => {
        const bounds = [
          range.from !== undefined ? `${facet.field} >= ${Number(range.from)}` : undefined,
          range.to !== undefined ? `${facet.field} < ${Number(range.to)}` : undefined,
        ].filter((clause): clause is string => clause !== undefined);

        if (
          [range.from, range.to].some(
            (bound) => bound !== undefined && !Number.isFinite(Number(bound)),
          )
        ) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Meilisearch: the range bounds of "${facet.field}" must be numbers`,
          );
        }

        const filter = [params.filter, ...bounds]
          .filter(Boolean)
          .map((clause) => `(${clause})`)
          .join(" AND ");

        return { field: facet.field, filter };
      }),
    );

    if (!asks.length) {
      return counts;
    }

    const base = {
      q: params.q,
      matchingStrategy: params.matchingStrategy,
      ...(params.attributesToSearchOn ? { attributesToSearchOn: params.attributesToSearchOn } : {}),
    };
    const client = await this.client();
    const totals = await Promise.all(
      asks.map(async ({ filter }) => {
        if (targets.length === 1) {
          const response = await client
            .index(targets[0]!.uid)
            .search(base.q ?? "", {
              ...base,
              ...(filter ? { filter } : {}),
              page: 1,
              hitsPerPage: 0,
            });

          return response.totalHits ?? 0;
        }

        const response = (await client.multiSearch({
          federation: { limit: 0, distinct: primaryKey },
          queries: targets.map(({ uid }) => ({
            indexUid: uid,
            ...base,
            ...(filter ? { filter } : {}),
          })),
        })) as unknown as SearchResponse;

        return response.estimatedTotalHits ?? 0;
      }),
    );

    asks.forEach(({ field }, i) => counts.set(field, [...(counts.get(field) ?? []), totals[i]!]));

    return counts;
  }

  protected toResult(
    input: Query,
    response: SearchResponse,
    context: {
      facets: FacetRequest[];
      rangeCounts: Map<string, number[]>;
      skip: number;
      take: number;
      highlightFields: string[];
      retrieve: string[];
      preTag: string;
    },
  ): SearchTypes.SearchResult {
    const options = input.search_options ?? {};
    const primaryKey = input.index.primary_key;
    const total =
      options.count === "none" ? null : (response.totalHits ?? response.estimatedTotalHits ?? null);
    const resultFacets: Record<string, SearchTypes.SearchFacetResult> = {};

    for (const facet of context.facets) {
      if (facet.type === "range") {
        const counts = context.rangeCounts.get(facet.field) ?? [];

        resultFacets[facet.field] = {
          type: "range",
          ranges: facet.ranges.map((range, i) => ({
            key: rangeKey(range),
            ...(range.from !== undefined ? { from: range.from } : {}),
            ...(range.to !== undefined ? { to: range.to } : {}),
            count: counts[i] ?? 0,
          })),
        };
      } else if (facet.type === "stats") {
        const stats = response.facetStats?.[facet.field];

        if (stats) {
          resultFacets[facet.field] = {
            type: "stats",
            min: stats.min,
            max: stats.max,
            count: total ?? 0,
          };
        }
      } else {
        const distribution = response.facetDistribution?.[facet.field] ?? {};
        const prefix = facet.query?.toLowerCase();
        const values = Object.entries(distribution)
          // A facet query keeps the values that start with it, as `search-postgres` does.
          .filter(([value]) => prefix === undefined || value.toLowerCase().startsWith(prefix))
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) =>
            facet.sort === "alpha"
              ? a.value.localeCompare(b.value)
              : b.count - a.count || a.value.localeCompare(b.value),
          );

        resultFacets[facet.field] = {
          type: "value",
          values: facet.limit === undefined ? values : values.slice(0, facet.limit),
        };
      }
    }

    return {
      hits: (response.hits as Hit[]).map((hit) => this.toHit(hit, primaryKey, options, context)),
      ...(Object.keys(resultFacets).length ? { facets: resultFacets } : {}),
      metadata: {
        skip: context.skip,
        take: context.take,
        count: total,
        processing_time_ms: response.processingTimeMs,
      },
    };
  }

  protected toHit(
    hit: Hit,
    primaryKey: string,
    options: SearchTypes.SearchOptions,
    context: { highlightFields: string[]; retrieve: string[]; preTag: string },
  ): SearchTypes.SearchHit {
    const { _formatted, _matchesPosition, _rankingScore, ..._rest } = hit;
    const document = Object.fromEntries(
      context.retrieve.filter((path) => path in hit).map((path) => [path, hit[path]]),
    );
    const highlights: Record<string, string[]> = {};

    for (const field of context.highlightFields) {
      const formatted = (_formatted as Record<string, unknown> | undefined)?.[field];

      if (!_matchesPosition || !(field in _matchesPosition) || formatted === undefined) {
        continue;
      }

      const values = (Array.isArray(formatted) ? formatted : [formatted])
        .filter((value): value is string => typeof value === "string")
        .filter((value) => value.includes(context.preTag));

      if (values.length) {
        highlights[field] = values;
      }
    }

    return {
      id: String(hit[primaryKey]),
      ...(options.include_score && _rankingScore !== undefined ? { score: _rankingScore } : {}),
      document,
      ...(Object.keys(highlights).length ? { highlights } : {}),
    };
  }
}

export default MeilisearchSearchService;
